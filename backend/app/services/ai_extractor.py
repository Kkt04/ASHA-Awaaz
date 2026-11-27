import json
import logging
import httpx
from typing import Optional, List, Tuple
from app.config import settings
from app.schemas.extraction import StructuredVisitData, ExtractionResponse, CorrectionResponse
from app.services.fallback_extractor import fallback_extractor

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are ASHA Awaaz AI, a specialized clinical voice assistant designed for ASHA healthcare workers in rural India.
Extract structured health information from spoken Hindi, Tamil, or Hinglish visit descriptions.

Output STRICT JSON conforming to this exact schema:
{
  "patient_name": "string or null",
  "category": "pregnant_woman" | "newborn" | "child" | "lactating_mother" | "general" | "unknown",
  "patient_age": integer (0-120) or null,
  "pregnancy_month": integer (1-10) or null,
  "newborn_age_days": integer (0-365) or null,
  "child_age_years": float or null,
  "vitals": {
    "blood_pressure": {
      "systolic": integer or null,
      "diastolic": integer or null
    },
    "weight_kg": float or null,
    "temperature_f": float or null,
    "pulse_bpm": integer or null
  },
  "symptoms": ["normalized_symptom_identifier"],
  "medicines": [
    {
      "name": "iron_tablet" | "calcium_tablet" | "paracetamol" | "other",
      "status": "taken" | "missed" | "prescribed" | "unknown"
    }
  ],
  "baby_movement": "normal" | "reduced" | "none" | "unknown",
  "other_observations": "string or null",
  "missing_fields": ["field_name"],
  "uncertain_fields": []
}

CRITICAL RULES:
1. NEVER hallucinate or invent clinical values. If a value is unmentioned, use null.
2. Standardize symptoms (e.g., 'pairon mein sujan' -> 'swelling_in_feet', 'bukhar' -> 'fever', 'chakkar' -> 'dizziness', 'khoon' -> 'bleeding').
3. Distinguish between medicine taken and medicine missed.
4. Output raw valid JSON ONLY without any markdown ticks or commentary.
"""

CORRECTION_PROMPT = """You are ASHA Awaaz AI. Your task is to apply a spoken or typed correction to an EXISTING structured healthcare record.

RULES:
1. Update ONLY the fields mentioned in the correction (e.g. if the user says 'Her age is 28, not 25', update only patient_age to 28).
2. If the user states a negative symptom (e.g. 'She does not have fever', 'No fever', 'bukhar nahi hai'), REMOVE that symptom from the symptoms array.
3. PRESERVE all existing unaffected fields exactly as they are.
4. Return a JSON object with:
   - "updated_data": the updated structured record
   - "fields_changed": array of field names that were updated
   - "fields_unchanged": array of field names preserved
   - "ambiguity_note": string if ambiguous, else null
"""


class AIExtractorService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL
        self.groq_url = "https://api.groq.com/openai/v1/chat/completions"

    async def extract(
        self,
        transcript: str,
        language: str = "hi",
        existing_data: Optional[StructuredVisitData] = None
    ) -> ExtractionResponse:
        # If no Groq API Key is configured, immediately use deterministic fallback
        if not self.api_key or self.api_key.strip() == "":
            logger.info("No Groq API key found. Using deterministic fallback extractor.")
            extracted = fallback_extractor.extract(transcript, language, existing_data)
            hi_sum, ta_sum, en_sum = fallback_extractor.generate_spoken_summaries(extracted)
            return ExtractionResponse(
                success=True,
                extracted=extracted,
                engine_used="deterministic_fallback",
                speech_summary_hi=hi_sum,
                speech_summary_ta=ta_sum,
                speech_summary_en=en_sum
            )

        # Attempt Groq LLM extraction
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                user_msg = f"Language: {language}\nSpoken Transcript: {transcript}"
                if existing_data:
                    user_msg += f"\nPrevious Record to update: {existing_data.model_dump_json()}"

                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_msg}
                    ],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"}
                }

                resp = await client.post(self.groq_url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed_json = json.loads(content)
                    parsed_json["original_transcript"] = transcript
                    extracted = StructuredVisitData.model_validate(parsed_json)
                    hi_sum, ta_sum, en_sum = fallback_extractor.generate_spoken_summaries(extracted)
                    return ExtractionResponse(
                        success=True,
                        extracted=extracted,
                        engine_used="groq_llm",
                        speech_summary_hi=hi_sum,
                        speech_summary_ta=ta_sum,
                        speech_summary_en=en_sum
                    )
                else:
                    logger.warning(f"Groq API error ({resp.status_code}): {resp.text}. Falling back.")
        except Exception as e:
            logger.error(f"Error calling Groq API: {e}. Falling back to deterministic engine.")

        # Fallback on any failure
        extracted = fallback_extractor.extract(transcript, language, existing_data)
        hi_sum, ta_sum, en_sum = fallback_extractor.generate_spoken_summaries(extracted)
        return ExtractionResponse(
            success=True,
            extracted=extracted,
            engine_used="deterministic_fallback",
            speech_summary_hi=hi_sum,
            speech_summary_ta=ta_sum,
            speech_summary_en=en_sum
        )

    async def correct(
        self,
        current_data: StructuredVisitData,
        correction_text: str,
        language: str = "hi"
    ) -> CorrectionResponse:
        # If no Groq API Key is configured, use deterministic fallback
        if not self.api_key or self.api_key.strip() == "":
            updated, changed, unchanged, ambiguity = fallback_extractor.correct(current_data, correction_text, language)
            hi_sum, ta_sum, en_sum = fallback_extractor.generate_spoken_summaries(updated)
            return CorrectionResponse(
                success=True,
                updated_data=updated,
                fields_changed=changed,
                fields_unchanged=unchanged,
                ambiguity_note=ambiguity,
                engine_used="deterministic_fallback",
                speech_summary_hi=hi_sum,
                speech_summary_ta=ta_sum,
                speech_summary_en=en_sum
            )

        # Attempt Groq LLM correction
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                user_msg = (
                    f"Language: {language}\n"
                    f"Existing Record:\n{current_data.model_dump_json()}\n\n"
                    f"Spoken Correction:\n{correction_text}"
                )

                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": CORRECTION_PROMPT},
                        {"role": "user", "content": user_msg}
                    ],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"}
                }

                resp = await client.post(self.groq_url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    parsed = json.loads(data["choices"][0]["message"]["content"])
                    updated_data = StructuredVisitData.model_validate(parsed.get("updated_data", current_data.model_dump()))
                    changed = parsed.get("fields_changed", [])
                    unchanged = parsed.get("fields_unchanged", [])
                    ambiguity = parsed.get("ambiguity_note")
                    hi_sum, ta_sum, en_sum = fallback_extractor.generate_spoken_summaries(updated_data)

                    return CorrectionResponse(
                        success=True,
                        updated_data=updated_data,
                        fields_changed=changed,
                        fields_unchanged=unchanged,
                        ambiguity_note=ambiguity,
                        engine_used="groq_llm",
                        speech_summary_hi=hi_sum,
                        speech_summary_ta=ta_sum,
                        speech_summary_en=en_sum
                    )
        except Exception as e:
            logger.error(f"Error in Groq correction: {e}. Falling back to deterministic engine.")

        # Fallback deterministic correction
        updated, changed, unchanged, ambiguity = fallback_extractor.correct(current_data, correction_text, language)
        hi_sum, ta_sum, en_sum = fallback_extractor.generate_spoken_summaries(updated)
        return CorrectionResponse(
            success=True,
            updated_data=updated,
            fields_changed=changed,
            fields_unchanged=unchanged,
            ambiguity_note=ambiguity,
            engine_used="deterministic_fallback",
            speech_summary_hi=hi_sum,
            speech_summary_ta=ta_sum,
            speech_summary_en=en_sum
        )


ai_extractor_service = AIExtractorService()
