from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class BloodPressure(BaseModel):
    systolic: Optional[int] = Field(None, ge=40, le=300, description="Systolic blood pressure in mmHg")
    diastolic: Optional[int] = Field(None, ge=30, le=200, description="Diastolic blood pressure in mmHg")


class Vitals(BaseModel):
    blood_pressure: Optional[BloodPressure] = None
    weight_kg: Optional[float] = Field(None, ge=1.0, le=250.0, description="Weight in kilograms")
    temperature_f: Optional[float] = Field(None, ge=85.0, le=115.0, description="Body temperature in Fahrenheit")
    pulse_bpm: Optional[int] = Field(None, ge=30, le=250, description="Heart rate in beats per minute")


class MedicineItem(BaseModel):
    name: str = Field(..., description="Medicine name (e.g. iron_tablet, calcium_tablet)")
    status: Literal["taken", "missed", "prescribed", "unknown"] = Field("taken")
    notes: Optional[str] = None


class StructuredVisitData(BaseModel):
    patient_name: Optional[str] = Field(None, description="Patient full or first name")
    category: Literal["pregnant_woman", "newborn", "child", "lactating_mother", "general", "unknown"] = Field(
        "unknown", description="Category of the patient"
    )
    patient_age: Optional[int] = Field(None, ge=0, le=120, description="Patient age in years")
    pregnancy_month: Optional[int] = Field(None, ge=1, le=10, description="Pregnancy duration in months (1-10)")
    newborn_age_days: Optional[int] = Field(None, ge=0, le=365, description="Newborn age in days")
    child_age_years: Optional[float] = Field(None, ge=0, le=18, description="Child age in years")
    vitals: Vitals = Field(default_factory=Vitals)
    symptoms: List[str] = Field(default_factory=list, description="List of normalized symptoms detected")
    medicines: List[MedicineItem] = Field(default_factory=list, description="Medicines reported")
    baby_movement: Optional[Literal["normal", "reduced", "none", "unknown"]] = Field("unknown")
    other_observations: Optional[str] = Field(None, description="Any other clinical notes or observations")
    missing_fields: List[str] = Field(default_factory=list, description="Critical fields that were not mentioned")
    uncertain_fields: List[str] = Field(default_factory=list, description="Fields that may have low confidence")
    original_transcript: str = Field("", description="Exact spoken transcript processed")
    confidence: float = Field(0.9, ge=0.0, le=1.0, description="Overall extraction confidence score")


class ExtractionRequest(BaseModel):
    transcript: str = Field(..., min_length=2, description="Spoken text to analyze")
    language: str = Field("hi", description="Spoken language code (hi, ta, hinglish)")
    existing_data: Optional[StructuredVisitData] = Field(None, description="Optional previous data for corrections")
    context: Optional[dict] = Field(default_factory=dict, description="Optional conversational context")


class ExtractionResponse(BaseModel):
    success: bool = True
    extracted: StructuredVisitData
    engine_used: Literal["groq_llm", "deterministic_fallback"]
    speech_summary_hi: str = Field("", description="Hindi summary for TTS read-back")
    speech_summary_ta: str = Field("", description="Tamil summary for TTS read-back")
    speech_summary_en: str = Field("", description="English summary for TTS read-back")


class CorrectionRequest(BaseModel):
    case_id: Optional[str] = Field(None, description="Existing visit/case ID")
    current_data: StructuredVisitData = Field(..., description="Current structured patient data")
    correction_text: str = Field(..., min_length=2, description="Spoken or typed correction")
    language: str = Field("hi", description="Spoken language code (hi, en, ta, bho)")


class CorrectionResponse(BaseModel):
    success: bool = True
    updated_data: StructuredVisitData
    fields_changed: List[str] = Field(default_factory=list, description="Fields that were changed")
    fields_unchanged: List[str] = Field(default_factory=list, description="Fields that remained unchanged")
    ambiguity_note: Optional[str] = None
    engine_used: str = "deterministic_fallback"
    speech_summary_hi: str = Field("", description="Hindi confirmation text")
    speech_summary_ta: str = Field("", description="Tamil confirmation text")
    speech_summary_en: str = Field("", description="English confirmation text")
    speech_summary_bho: Optional[str] = None
