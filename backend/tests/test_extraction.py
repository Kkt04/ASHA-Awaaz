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


def test_age_correction_example_1():
    # Example 1 from spec: Sunita, age 25, pregnancy month 6
    # Correction: "No, her age is 28, not 25." -> Age becomes 28, pregnancy month 6 preserved
    initial = StructuredVisitData(
        patient_name="Sunita",
        category="pregnant_woman",
        patient_age=25,
        pregnancy_month=6,
        original_transcript="Sunita, age 25, 6 mahine pregnant"
    )
    
    updated, changed, unchanged, ambiguity = fallback_extractor.correct(
        initial,
        "No, her age is 28, not 25.",
        language="en"
    )
    
    assert updated.patient_name == "Sunita"
    assert updated.patient_age == 28
    assert updated.pregnancy_month == 6
    assert "patient_age" in changed
    assert "pregnancy_month" in unchanged


def test_bp_correction_example_2():
    # Example 2: BP 140/90 -> "Her blood pressure is 120 over 80."
    initial = StructuredVisitData(
        patient_name="Sunita",
        category="pregnant_woman",
        patient_age=28,
        pregnancy_month=6,
        vitals=Vitals(blood_pressure=BloodPressure(systolic=140, diastolic=90)),
        original_transcript="Sunita, BP 140/90"
    )
    
    updated, changed, unchanged, _ = fallback_extractor.correct(
        initial,
        "Her blood pressure is 120 over 80.",
        language="en"
    )
    
    assert updated.vitals.blood_pressure.systolic == 120
    assert updated.vitals.blood_pressure.diastolic == 80
    assert updated.patient_name == "Sunita"
    assert updated.patient_age == 28
    assert "blood_pressure" in changed


def test_symptom_removal_negation_example_3():
    # Example 3: Symptoms: fever and headache -> "She does not have fever. She only has a headache."
    initial = StructuredVisitData(
        patient_name="Meena",
        category="general",
        symptoms=["fever", "severe_headache"],
        original_transcript="Meena, fever and headache"
    )
    
    updated, changed, unchanged, _ = fallback_extractor.correct(
        initial,
        "She does not have fever. She only has a headache.",
        language="en"
    )
    
    assert "fever" not in updated.symptoms
    assert "severe_headache" in updated.symptoms
    assert "symptoms" in changed
    assert updated.patient_name == "Meena"


def test_multiple_rounds_of_correction():
    # Start with initial visit
    data = fallback_extractor.extract("Sunita, 25 saal, 6 mahine pregnant, BP 140 by 90, bukhar hai", language="hi")
    assert data.patient_age == 25
    assert data.vitals.blood_pressure.systolic == 140
    assert "fever" in data.symptoms

    # Round 1: Fix age
    round1, ch1, _, _ = fallback_extractor.correct(data, "No, her age is 28, not 25", language="en")
    assert round1.patient_age == 28
    assert round1.vitals.blood_pressure.systolic == 140
    assert "fever" in round1.symptoms

    # Round 2: Fix BP
    round2, ch2, _, _ = fallback_extractor.correct(round1, "Her blood pressure is 120 over 80", language="en")
    assert round2.patient_age == 28
    assert round2.vitals.blood_pressure.systolic == 120
    assert round2.vitals.blood_pressure.diastolic == 80
    assert "fever" in round2.symptoms

    # Round 3: Remove fever
    round3, ch3, _, _ = fallback_extractor.correct(round2, "She does not have fever. She only has a headache.", language="en")
    assert round3.patient_age == 28
    assert round3.vitals.blood_pressure.systolic == 120
    assert "fever" not in round3.symptoms
    assert "severe_headache" in round3.symptoms
    assert round3.patient_name == "Sunita"
    assert round3.pregnancy_month == 6


def test_missing_fields_detection():
    # Only mentions name and pregnancy, vitals missing
    transcript = "Sunita 6 mahine ki pregnant hai."
    data = fallback_extractor.extract(transcript, language="hi")
    
    assert "blood_pressure" in data.missing_fields
    assert "weight_kg" in data.missing_fields


def test_spoken_summaries_generation():
    transcript = "Sunita, 7 mahine ki pregnant hai, BP 150 by 100 hai, pairon mein sujan hai aur iron ki goli nahi li."
    data = fallback_extractor.extract(transcript, language="hi")
    hi_summary, ta_summary, en_summary = fallback_extractor.generate_spoken_summaries(data)
    
    assert "Sunita" in hi_summary
    assert "7 महीने की गर्भवती" in hi_summary
    assert "150 बाई 100" in hi_summary
    assert "क्या यह सही है?" in hi_summary
    assert "7 months pregnant" in en_summary
    assert "Is this information correct?" in en_summary
