from typing import List, Optional, Literal, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.extraction import StructuredVisitData


class RiskFlag(BaseModel):
    rule_name: str
    severity: Literal["danger", "warning", "info"]
    message_en: str
    message_hi: str
    message_ta: str
    action_required: str


class RiskEvaluation(BaseModel):
    is_high_risk: bool = False
    danger_flags: List[RiskFlag] = Field(default_factory=list)
    emergency_action: Optional[str] = None
    call_anm_phone: Optional[str] = None
    spoken_warning_hi: Optional[str] = None
    spoken_warning_ta: Optional[str] = None


class VisitCreate(BaseModel):
    visit_id: Optional[str] = None
    patient_id: Optional[str] = None
    patient_name: str
    worker_id: str = "ASHA_WORKER_001"
    original_transcript: str
    language: str = "hi"
    structured_data: StructuredVisitData
    risk_evaluation: Optional[RiskEvaluation] = None
    sync_status: Literal["synced", "pending", "failed"] = "synced"
    recorded_at: Optional[datetime] = None


class VisitResponse(BaseModel):
    visit_id: str
    patient_id: str
    patient_name: str
    worker_id: str
    original_transcript: str
    language: str
    structured_data: StructuredVisitData
    risk_evaluation: Optional[RiskEvaluation] = None
    sync_status: str
    created_at: datetime
    updated_at: datetime


class BatchSyncRequest(BaseModel):
    visits: List[VisitCreate]
    worker_id: str = "ASHA_WORKER_001"


class BatchSyncResponse(BaseModel):
    synced_count: int
    duplicates_skipped: int
    failed_count: int
    synced_ids: List[str]
    errors: List[Dict[str, Any]] = Field(default_factory=list)
