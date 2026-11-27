from fastapi import APIRouter, HTTPException
from app.schemas.extraction import (
    ExtractionRequest, 
    ExtractionResponse, 
    CorrectionRequest, 
    CorrectionResponse
)
from app.services.ai_extractor import ai_extractor_service

router = APIRouter(tags=["AI Voice Extraction & Correction"])


@router.post("/extract", response_model=ExtractionResponse)
@router.post("/extract/", response_model=ExtractionResponse)
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
        existing_data=req.existing_data
    )
    return response


@router.post("/correct", response_model=CorrectionResponse)
@router.post("/correct/", response_model=CorrectionResponse)
@router.post("/extract/correct", response_model=CorrectionResponse)
async def correct_health_information(req: CorrectionRequest):
    """
    Apply a spoken or typed correction to an existing visit's structured data.
    Updates only the corrected fields, preserves untouched data, and handles negative statements.
    """
    if not req.correction_text or len(req.correction_text.strip()) < 2:
        raise HTTPException(status_code=400, detail="Correction text is too short to process.")

    response = await ai_extractor_service.correct(
        current_data=req.current_data,
        correction_text=req.correction_text,
        language=req.language
    )
    return response
