import pytest
from app.services.fallback_extractor import fallback_extractor
from app.schemas.extraction import StructuredVisitData, Vitals, BloodPressure


def test_hindi_hinglish_sample_extraction():
    transcript = "Sunita, 7 mahine ki pregnant hai, BP 150 by 100 hai, pairon mein sujan hai aur iron ki goli nahi li."
    data = fallback_extractor.extract(transcript, language="hi")
    
    assert data.patient_name == "Sunita"
    assert data.category == "pregnant_woman"
    assert data.pregnancy_month == 7
    assert data.vitals.blood_pressure is not None
    assert data.vitals.blood_pressure.systolic == 150
    assert data.vitals.blood_pressure.diastolic == 100
    assert "swelling_in_feet" in data.symptoms
    
    iron_med = next((m for m in data.medicines if m.name == "iron_tablet"), None)
    assert iron_med is not None
    assert iron_med.status == "missed"


def test_tamil_sample_extraction():
    transcript = "சுனிதா, 7 மாத கர்ப்பிணி, பிபி 150/100, கால் வீக்கம், அயர்ன் மாத்திரை சாப்பிடவில்லை"
    data = fallback_extractor.extract(transcript, language="ta")
    
    assert data.patient_name == "சுனிதா"
    assert data.category == "pregnant_woman"
    assert data.pregnancy_month == 7
    assert data.vitals.blood_pressure is not None
    assert data.vitals.blood_pressure.systolic == 150
    assert data.vitals.blood_pressure.diastolic == 100
    assert "swelling_in_feet" in data.symptoms
    
    iron_med = next((m for m in data.medicines if m.name == "iron_tablet"), None)
    assert iron_med is not None
    assert iron_med.status == "missed"


def test_newborn_extraction():
    transcript = "Aarav, 15 din ka navjat shishu hai, bukhar 101.5 hai, doodh nahi pee raha."
    data = fallback_extractor.extract(transcript, language="hi")
    
    assert data.patient_name == "Aarav"
    assert data.category == "newborn"
    assert data.newborn_age_days == 15
    assert data.vitals.temperature_f == 101.5
    assert "fever" in data.symptoms


def test_child_extraction():
    transcript = "Meena, 3 saal ki bachi hai, vajan 14 kg hai, bukhar nahi hai, theek hai."
    data = fallback_extractor.extract(transcript, language="hi")
    
    assert data.patient_name == "Meena"
    assert data.category == "child"
    assert data.child_age_years == 3.0
    assert data.vitals.weight_kg == 14.0


def test_voice_correction_single_field():
    initial_transcript = "Sunita, 7 mahine ki pregnant hai, BP 150 by 100 hai, pairon mein sujan hai."
    initial_data = fallback_extractor.extract(initial_transcript, language="hi")
    assert initial_data.vitals.blood_pressure.systolic == 150
    assert initial_data.pregnancy_month == 7

    # Correction: only change BP
    correction_transcript = "Nahi, BP 140 by 90 hai."
    updated_data = fallback_extractor.extract(correction_transcript, language="hi", existing_data=initial_data)
    
    assert updated_data.vitals.blood_pressure.systolic == 140
    assert updated_data.vitals.blood_pressure.diastolic == 90
    # Other fields must remain preserved!
    assert updated_data.patient_name == "Sunita"
    assert updated_data.pregnancy_month == 7
    assert "swelling_in_feet" in updated_data.symptoms


def test_missing_fields_detection():
    # Only mentions name and pregnancy, vitals missing
    transcript = "Sunita 6 mahine ki pregnant hai."
    data = fallback_extractor.extract(transcript, language="hi")
    
    assert "blood_pressure" in data.missing_fields
    assert "weight_kg" in data.missing_fields


def test_spoken_summaries_generation():
    transcript = "Sunita, 7 mahine ki pregnant hai, BP 150 by 100 hai, pairon mein sujan hai aur iron ki goli nahi li."
    data = fallback_extractor.extract(transcript, language="hi")
    hi_summary, ta_summary = fallback_extractor.generate_spoken_summaries(data)
    
    assert "Sunita" in hi_summary
    assert "7 महीने की गर्भवती" in hi_summary
    assert "150 बाई 100" in hi_summary
    assert "क्या यह सही है?" in hi_summary
