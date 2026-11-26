from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.schemas.patient import PatientResponse
from app.schemas.visit import VisitResponse
from app.database.mongodb import db_manager

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("", response_model=List[PatientResponse])
async def list_patients(
    worker_id: str = "ASHA_WORKER_001",
    search: Optional[str] = None
):
    patients_col = db_manager.get_collection("patients")
    cursor = patients_col.find({"worker_id": worker_id})
    patients = await cursor.to_list(length=100)
    
    if search:
        search_lower = search.strip().lower()
        patients = [p for p in patients if search_lower in p.get("name", "").lower()]
        
    return [PatientResponse(**p) for p in patients]


@router.get("/{patient_id}/history", response_model=List[VisitResponse])
async def get_patient_history(patient_id: str):
    visits_col = db_manager.get_collection("visits")
    cursor = visits_col.find({"patient_id": patient_id}).sort("created_at", -1)
    visits = await cursor.to_list(length=100)
    return [VisitResponse(**v) for v in visits]
