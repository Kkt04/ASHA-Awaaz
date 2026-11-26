from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class PatientBase(BaseModel):
    name: str = Field(..., min_length=1)
    category: str = Field("pregnant_woman")
    age: Optional[int] = None
    village: Optional[str] = "Rampur"
    phone: Optional[str] = None
    worker_id: str = "ASHA_WORKER_001"


class PatientCreate(PatientBase):
    pass


class PatientResponse(PatientBase):
    patient_id: str
    total_visits: int = 0
    latest_risk_status: Optional[str] = "normal"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
