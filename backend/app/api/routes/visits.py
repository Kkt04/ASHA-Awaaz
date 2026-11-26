from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from app.schemas.visit import VisitCreate, VisitResponse
from app.schemas.auth import WorkerProfile
from app.database.mongodb import db_manager
from app.services.risk_engine import clinical_risk_engine
from app.api.deps import get_current_worker

router = APIRouter(prefix="/visits", tags=["Visits"])


@router.post("", response_model=VisitResponse)
async def create_visit(
    visit_in: VisitCreate,
    current_worker: WorkerProfile = Depends(get_current_worker)
):
    """
    Saves a confirmed visit record.
    Enforces user data isolation: overrides worker_id from verified JWT session.
    Guarantees idempotency on visit_id.
    """
    visits_col = db_manager.get_collection("visits")
    patients_col = db_manager.get_collection("patients")

    worker_id = current_worker.worker_id
    visit_id = visit_in.visit_id or f"VISIT_{uuid.uuid4().hex[:8].upper()}"
    
    # Check if this visit_id already exists (idempotency check)
    existing_visit = await visits_col.find_one({"visit_id": visit_id})
    if existing_visit:
        # Verify ownership
        if existing_visit.get("worker_id") and existing_visit.get("worker_id") != worker_id:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Cannot overwrite a visit record owned by another worker."
            )

        risk_eval = visit_in.risk_evaluation or clinical_risk_engine.evaluate(visit_in.structured_data)
        now = datetime.now(timezone.utc)
        update_data = {
            "patient_name": visit_in.patient_name.strip(),
            "original_transcript": visit_in.original_transcript,
            "language": visit_in.language,
            "structured_data": visit_in.structured_data.model_dump(),
            "risk_evaluation": risk_eval.model_dump() if risk_eval else None,
            "updated_at": now
        }
        await visits_col.update_one({"visit_id": visit_id}, {"$set": update_data})
        existing_visit.update(update_data)

        patient_id = existing_visit.get("patient_id")
        if patient_id:
            new_risk = "danger" if (risk_eval and risk_eval.is_high_risk) else "normal"
            await patients_col.update_one(
                {"patient_id": patient_id, "worker_id": worker_id},
                {"$set": {"latest_risk_status": new_risk, "updated_at": now}}
            )
        return VisitResponse(**existing_visit)

    # Evaluate risk if not provided
    risk_eval = visit_in.risk_evaluation
    if not risk_eval:
        risk_eval = clinical_risk_engine.evaluate(visit_in.structured_data)

    # Find or create patient under current worker's namespace
    patient_name = visit_in.patient_name.strip()
    patient = await patients_col.find_one({"name": patient_name, "worker_id": worker_id})
    now = datetime.now(timezone.utc)

    if not patient:
        patient_id = visit_in.patient_id or f"PAT_{uuid.uuid4().hex[:8].upper()}"
        patient_doc = {
            "_id": patient_id,
            "patient_id": patient_id,
            "worker_id": worker_id,
            "name": patient_name,
            "category": visit_in.structured_data.category or "general",
            "village": current_worker.village or "Rampur",
            "total_visits": 1,
            "latest_risk_status": "danger" if risk_eval.is_high_risk else "normal",
            "created_at": now,
            "updated_at": now
        }
        await patients_col.insert_one(patient_doc)
    else:
        patient_id = patient["patient_id"]
        new_total = patient.get("total_visits", 0) + 1
        new_risk = "danger" if risk_eval.is_high_risk else patient.get("latest_risk_status", "normal")
        await patients_col.update_one(
            {"patient_id": patient_id, "worker_id": worker_id},
            {"$set": {"total_visits": new_total, "latest_risk_status": new_risk, "updated_at": now}}
        )

    visit_doc = {
        "_id": visit_id,
        "visit_id": visit_id,
        "patient_id": patient_id,
        "patient_name": patient_name,
        "worker_id": worker_id,
        "original_transcript": visit_in.original_transcript,
        "language": visit_in.language,
        "structured_data": visit_in.structured_data.model_dump(),
        "risk_evaluation": risk_eval.model_dump() if risk_eval else None,
        "sync_status": "synced",
        "created_at": visit_in.recorded_at or now,
        "updated_at": now
    }

    await visits_col.insert_one(visit_doc)
    return VisitResponse(**visit_doc)


@router.get("", response_model=List[VisitResponse])
async def list_visits(
    patient_id: Optional[str] = None,
    limit: int = Query(50, le=100),
    current_worker: WorkerProfile = Depends(get_current_worker)
):
    """
    Lists past visit records belonging exclusively to the authenticated worker.
    """
    visits_col = db_manager.get_collection("visits")
    query = {"worker_id": current_worker.worker_id}
    if patient_id:
        query["patient_id"] = patient_id

    cursor = visits_col.find(query).sort("created_at", -1).limit(limit)
    items = await cursor.to_list(length=limit)
    return [VisitResponse(**item) for item in items]


@router.get("/{visit_id}", response_model=VisitResponse)
async def get_visit(
    visit_id: str,
    current_worker: WorkerProfile = Depends(get_current_worker)
):
    """
    Fetches individual visit by ID, verifying worker ownership.
    """
    visits_col = db_manager.get_collection("visits")
    visit = await visits_col.find_one({
        "visit_id": visit_id,
        "worker_id": current_worker.worker_id
    })
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or permission denied")
    return VisitResponse(**visit)


@router.put("/{visit_id}", response_model=VisitResponse)
async def update_visit(
    visit_id: str,
    visit_update: VisitCreate,
    current_worker: WorkerProfile = Depends(get_current_worker)
):
    """
    Updates an existing visit record owned by the authenticated worker.
    """
    visits_col = db_manager.get_collection("visits")
    existing = await visits_col.find_one({
        "visit_id": visit_id,
        "worker_id": current_worker.worker_id
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Visit not found or permission denied")

    risk_eval = visit_update.risk_evaluation or clinical_risk_engine.evaluate(visit_update.structured_data)
    now = datetime.now(timezone.utc)
    update_data = {
        "structured_data": visit_update.structured_data.model_dump(),
        "risk_evaluation": risk_eval.model_dump() if risk_eval else None,
        "original_transcript": visit_update.original_transcript,
        "updated_at": now
    }
    await visits_col.update_one({"visit_id": visit_id, "worker_id": current_worker.worker_id}, {"$set": update_data})
    existing.update(update_data)
    return VisitResponse(**existing)
