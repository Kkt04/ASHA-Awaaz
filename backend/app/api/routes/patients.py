from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from app.schemas.patient import PatientResponse
from app.schemas.visit import VisitResponse
from app.schemas.auth import WorkerProfile
from app.database.mongodb import db_manager
from app.api.deps import get_current_worker

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("", response_model=List[PatientResponse])
async def list_patients(
    search: Optional[str] = None,
    current_worker: WorkerProfile = Depends(get_current_worker)
):
    """
    Lists patients owned exclusively by the authenticated health worker.
    Guarantees strict multi-tenant isolation.
    """
    patients_col = db_manager.get_collection("patients")
    cursor = patients_col.find({"worker_id": current_worker.worker_id})
    patients = await cursor.to_list(length=100)
    
    if search:
        search_lower = search.strip().lower()
        patients = [p for p in patients if search_lower in p.get("name", "").lower()]
        
    return [PatientResponse(**p) for p in patients]


@router.get("/{patient_id}/history", response_model=List[VisitResponse])
async def get_patient_history(
    patient_id: str,
    current_worker: WorkerProfile = Depends(get_current_worker)
):
    """
    Retrieves chronological timeline for a specific patient.
    Enforces ownership verification: workers can only view history for their own patients.
    """
    patients_col = db_manager.get_collection("patients")
    patient = await patients_col.find_one({
        "patient_id": patient_id,
        "worker_id": current_worker.worker_id
    })
    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found or you do not have permission to view this record."
        )

    visits_col = db_manager.get_collection("visits")
    cursor = visits_col.find({
        "patient_id": patient_id,
        "worker_id": current_worker.worker_id
    }).sort("created_at", -1)
    visits = await cursor.to_list(length=100)
    return [VisitResponse(**v) for v in visits]
