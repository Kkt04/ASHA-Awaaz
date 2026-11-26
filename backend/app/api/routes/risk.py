from fastapi import APIRouter
from app.schemas.extraction import StructuredVisitData
from app.schemas.visit import RiskEvaluation
from app.services.risk_engine import clinical_risk_engine

router = APIRouter(prefix="/risk-check", tags=["Clinical Risk Engine"])


@router.post("", response_model=RiskEvaluation)
async def check_clinical_risk(data: StructuredVisitData):
    """
    Evaluates deterministic clinical danger signs for maternal and child healthcare.
    Returns danger flags, emergency referral recommendations, and ANM hotline contact.
    """
    return clinical_risk_engine.evaluate(data)
