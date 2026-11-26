from fastapi import APIRouter, HTTPException
from app.schemas.extraction import ExtractionRequest, ExtractionResponse
from app.services.ai_extractor import ai_extractor_service
from app.services.risk_engine import clinical_risk_engine

router = APIRouter(prefix="/extract", tags=["AI Voice Extraction"])


@router.post("", response_model=ExtractionResponse)
async def extract_health_information(req: ExtractionRequest):
    """
    Extract structured clinical health record from spoken transcript.
    Uses Groq LLM when API key is configured, or instantaneous deterministic fallback engine.
    """
    if not req.transcript or len(req.transcript.strip()) < 2:
        raise HTTPException(status_code=400, detail="Transcript is too short to extract information.")

    response = await ai_extractor_service.extract(
        transcript=req.transcript,
        language=req.language,
        existing_data=None
    )
    return response
