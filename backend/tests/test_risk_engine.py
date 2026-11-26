import pytest
from app.services.risk_engine import clinical_risk_engine
from app.schemas.extraction import StructuredVisitData, Vitals, BloodPressure


def test_high_bp_pregnancy_danger():
    data = StructuredVisitData(
        patient_name="Sunita",
        category="pregnant_woman",
        pregnancy_month=7,
        vitals=Vitals(blood_pressure=BloodPressure(systolic=150, diastolic=100))
    )
    risk = clinical_risk_engine.evaluate(data)
    assert risk.is_high_risk is True
    assert any(flag.rule_name == "HIGH_BP_PREGNANCY" for flag in risk.danger_flags)
    assert risk.call_anm_phone is not None


def test_preeclampsia_swelling_plus_high_bp():
    data = StructuredVisitData(
        patient_name="Sunita",
        category="pregnant_woman",
        pregnancy_month=7,
        vitals=Vitals(blood_pressure=BloodPressure(systolic=150, diastolic=100)),
        symptoms=["swelling_in_feet"]
    )
    risk = clinical_risk_engine.evaluate(data)
    assert risk.is_high_risk is True
    assert any(flag.rule_name == "PREECLAMPSIA_WARNING" for flag in risk.danger_flags)


def test_newborn_fever_danger():
    data = StructuredVisitData(
        patient_name="Aarav",
        category="newborn",
        newborn_age_days=15,
        vitals=Vitals(temperature_f=101.5),
        symptoms=["fever"]
    )
    risk = clinical_risk_engine.evaluate(data)
    assert risk.is_high_risk is True
    assert any(flag.rule_name == "NEWBORN_FEVER_DANGER" for flag in risk.danger_flags)


def test_absent_fetal_movement_danger():
    data = StructuredVisitData(
        patient_name="Pooja",
        category="pregnant_woman",
        pregnancy_month=8,
        baby_movement="none"
    )
    risk = clinical_risk_engine.evaluate(data)
    assert risk.is_high_risk is True
    assert any(flag.rule_name == "FETAL_MOVEMENT_DANGER" for flag in risk.danger_flags)


def test_bleeding_pregnancy_danger():
    data = StructuredVisitData(
        patient_name="Rekha",
        category="pregnant_woman",
        pregnancy_month=6,
        symptoms=["bleeding"]
    )
    risk = clinical_risk_engine.evaluate(data)
    assert risk.is_high_risk is True
    assert any(flag.rule_name == "PREGNANCY_BLEEDING_DANGER" for flag in risk.danger_flags)


def test_normal_visit_no_danger():
    data = StructuredVisitData(
        patient_name="Meena",
        category="pregnant_woman",
        pregnancy_month=4,
        vitals=Vitals(blood_pressure=BloodPressure(systolic=118, diastolic=76), weight_kg=54.0),
        symptoms=[],
        baby_movement="normal"
    )
    risk = clinical_risk_engine.evaluate(data)
    assert risk.is_high_risk is False
    assert len(risk.danger_flags) == 0
    assert risk.spoken_warning_hi is None
