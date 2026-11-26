from typing import Optional, List
from app.config import settings
from app.schemas.extraction import StructuredVisitData
from app.schemas.visit import RiskEvaluation, RiskFlag


class ClinicalRiskEngine:
    """
    Deterministic clinical danger sign rule evaluator.
    Designed for decision support for ASHA community health workers.
    """

    def __init__(self):
        self.bp_systolic_threshold = settings.DANGER_BP_SYSTOLIC
        self.bp_diastolic_threshold = settings.DANGER_BP_DIASTOLIC
        self.newborn_temp_threshold = settings.DANGER_NEWBORN_TEMP_F
        self.anm_phone = settings.ANM_DEFAULT_PHONE

    def evaluate(self, data: StructuredVisitData) -> RiskEvaluation:
        danger_flags: List[RiskFlag] = []
        is_pregnant = data.category in ["pregnant_woman", "unknown"] and (data.pregnancy_month is not None or data.category == "pregnant_woman")
        is_newborn = data.category == "newborn" or (data.newborn_age_days is not None and data.newborn_age_days <= 60)

        has_high_bp = False
        bp_systolic = None
        bp_diastolic = None

        if data.vitals and data.vitals.blood_pressure:
            bp_systolic = data.vitals.blood_pressure.systolic
            bp_diastolic = data.vitals.blood_pressure.diastolic
            if (bp_systolic and bp_systolic >= self.bp_systolic_threshold) or (bp_diastolic and bp_diastolic >= self.bp_diastolic_threshold):
                has_high_bp = True

        # Rule 1: High Blood Pressure in Pregnancy
        if is_pregnant and has_high_bp:
            danger_flags.append(RiskFlag(
                rule_name="HIGH_BP_PREGNANCY",
                severity="danger",
                message_en=f"High Blood Pressure ({bp_systolic}/{bp_diastolic} mmHg) in pregnancy",
                message_hi=f"गर्भावस्था में उच्च रक्तचाप ({bp_systolic}/{bp_diastolic} mmHg)",
                message_ta=f"கர்ப்ப காலத்தில் உயர் இரத்த அழுத்தம் ({bp_systolic}/{bp_diastolic} mmHg)",
                action_required="Refer to Primary Health Centre (PHC) today for immediate evaluation."
            ))

        # Rule 2: Swelling accompanied by High Blood Pressure (Preeclampsia risk)
        has_swelling = any("swelling" in s for s in data.symptoms)
        if is_pregnant and has_high_bp and has_swelling:
            danger_flags.append(RiskFlag(
                rule_name="PREECLAMPSIA_WARNING",
                severity="danger",
                message_en="Preeclampsia Warning: Swelling in limbs/feet combined with elevated Blood Pressure",
                message_hi="प्री-एक्लेम्पसिया चेतावनी: पैरों में सूजन और बढ़ा हुआ बीपी",
                message_ta="ப்ரீக்ளாம்சியா எச்சரிக்கை: கால் வீக்கத்துடன் உயர் இரத்த அழுத்தம்",
                action_required="Immediate medical attention required to prevent convulsions/complications."
            ))

        # Rule 3: Newborn Fever (> 100.4°F)
        if is_newborn and data.vitals and data.vitals.temperature_f and data.vitals.temperature_f >= self.newborn_temp_threshold:
            danger_flags.append(RiskFlag(
                rule_name="NEWBORN_FEVER_DANGER",
                severity="danger",
                message_en=f"Newborn High Fever ({data.vitals.temperature_f}°F) - Risk of neonatal sepsis",
                message_hi=f"नवजात शिशु को तेज बुखार ({data.vitals.temperature_f}°F) - संक्रमण का खतरा",
                message_ta=f"பிறந்த குழந்தைக்கு அதிக காய்ச்சல் ({data.vitals.temperature_f}°F)",
                action_required="Urgent referral to CHC / District Hospital. Keep baby warm and dry."
            ))

        # Rule 4: Absence or Reduction of Baby Movement
        if is_pregnant and data.baby_movement in ["none", "reduced"]:
            movement_text_en = "Absent fetal movement" if data.baby_movement == "none" else "Reduced fetal movement"
            movement_text_hi = "गर्भ में बच्चे की हलचल बंद" if data.baby_movement == "none" else "बच्चे की हलचल कम"
            movement_text_ta = "குழந்தை அசைவு இல்லை" if data.baby_movement == "none" else "குழந்தை அசைவு குறைவு"
            danger_flags.append(RiskFlag(
                rule_name="FETAL_MOVEMENT_DANGER",
                severity="danger",
                message_en=f"{movement_text_en} reported - possible fetal distress",
                message_hi=f"{movement_text_hi} - तुरंत जांच आवश्यक",
                message_ta=f"{movement_text_ta} - உடனடி பரிசோதனை தேவை",
                action_required="Urgent fetal heart rate check and ultrasound required at PHC."
            ))

        # Rule 5: Bleeding in Pregnancy
        has_bleeding = any(s in ["bleeding", "antepartum_hemorrhage"] for s in data.symptoms)
        if is_pregnant and has_bleeding:
            danger_flags.append(RiskFlag(
                rule_name="PREGNANCY_BLEEDING_DANGER",
                severity="danger",
                message_en="Antepartum Bleeding reported - Critical obstetrical emergency",
                message_hi="गर्भावस्था में रक्तस्राव - गंभीर आपातकालीन स्थिति",
                message_ta="கர்ப்ப காலத்தில் ரத்தப்போக்கு - அவசர சிகிச்சை தேவை",
                action_required="Arrange emergency transport (108) immediately to FRU/District Hospital."
            ))

        # Rule 6: Severe Headache / Visual Disturbance with High BP
        has_headache = any(s in ["severe_headache", "blurred_vision"] for s in data.symptoms)
        if is_pregnant and has_headache and has_high_bp:
            danger_flags.append(RiskFlag(
                rule_name="IMPENDING_ECLAMPSIA",
                severity="danger",
                message_en="Severe headache or visual disturbances with hypertension",
                message_hi="तेज सिरदर्द और बढ़ा हुआ बीपी - दौरे का खतरा",
                message_ta="கடும் தலைவலியுடன் உயர் இரத்த அழுத்தம்",
                action_required="High risk of eclampsia. Call 108 ambulance immediately."
            ))

        is_high_risk = len(danger_flags) > 0

        spoken_warning_hi = None
        spoken_warning_ta = None
        emergency_action = None

        if is_high_risk:
            spoken_warning_hi = "सावधान! खतरे के लक्षण पाए गए हैं। तुरंत एएनएम दीदी या 108 एम्बुलेंस को कॉल करें और आज ही पीएचसी भेजें।"
            spoken_warning_ta = "எச்சரிக்கை! ஆபத்தான அறிகுறிகள் உள்ளன. உடனடியாக செவிலியரை அழைக்கவும் மற்றும் மருத்துவமனைக்கு அனுப்பவும்."
            emergency_action = "खतरे के लक्षण। आज ही PHC/CHC भेजिए। एएनएम (ANM) से तुरंत संपर्क करें।"

        return RiskEvaluation(
            is_high_risk=is_high_risk,
            danger_flags=danger_flags,
            emergency_action=emergency_action,
            call_anm_phone=self.anm_phone,
            spoken_warning_hi=spoken_warning_hi,
            spoken_warning_ta=spoken_warning_ta
        )


clinical_risk_engine = ClinicalRiskEngine()
