import { StructuredVisitData, RiskEvaluation, RiskFlag } from '../types';

export function evaluateRiskLocally(data: StructuredVisitData): RiskEvaluation {
  const flags: RiskFlag[] = [];
  const isPregnant = data.category === 'pregnant_woman' || data.pregnancy_month != null;
  const isNewborn = data.category === 'newborn' || (data.newborn_age_days != null && data.newborn_age_days <= 60);

  const bp = data.vitals?.blood_pressure;
  const sys = bp?.systolic;
  const dia = bp?.diastolic;
  const hasHighBp = Boolean((sys && sys >= 140) || (dia && dia >= 90));

  // 1. High BP in pregnancy
  if (isPregnant && hasHighBp) {
    flags.push({
      rule_name: 'HIGH_BP_PREGNANCY',
      severity: 'danger',
      message_en: `High Blood Pressure (${sys}/${dia} mmHg) in pregnancy`,
      message_hi: `गर्भावस्था में उच्च रक्तचाप (${sys}/${dia} mmHg)`,
      message_ta: `கர்ப்ப காலத்தில் உயர் இரத்த அழுத்தம் (${sys}/${dia} mmHg)`,
      action_required: 'Refer to Primary Health Centre (PHC) today for immediate evaluation.'
    });
  }

  // 2. Swelling + High BP (Preeclampsia)
  const hasSwelling = data.symptoms.includes('swelling_in_feet') || data.symptoms.some(s => s.includes('swelling'));
  if (isPregnant && hasHighBp && hasSwelling) {
    flags.push({
      rule_name: 'PREECLAMPSIA_WARNING',
      severity: 'danger',
      message_en: 'Preeclampsia Warning: Swelling combined with elevated Blood Pressure',
      message_hi: 'प्री-एक्लेम्पसिया चेतावनी: पैरों में सूजन और बढ़ा हुआ बीपी',
      message_ta: 'ப்ரீக்ளாம்சியா எச்சரிக்கை: கால் வீக்கத்துடன் உயர் இரத்த அழுத்தம்',
      action_required: 'Immediate medical evaluation required to prevent eclampsia.'
    });
  }

  // 3. Newborn Fever > 100.4°F
  const temp = data.vitals?.temperature_f;
  if (isNewborn && temp && temp >= 100.4) {
    flags.push({
      rule_name: 'NEWBORN_FEVER_DANGER',
      severity: 'danger',
      message_en: `Newborn High Fever (${temp}°F) - Risk of neonatal infection`,
      message_hi: `नवजात शिशु को तेज बुखार (${temp}°F) - संक्रमण का खतरा`,
      message_ta: `பிறந்த குழந்தைக்கு அதிக காய்ச்சல் (${temp}°F)`,
      action_required: 'Urgent referral to CHC / District Hospital. Keep baby warm.'
    });
  }

  // 4. Baby movement
  if (isPregnant && (data.baby_movement === 'none' || data.baby_movement === 'reduced')) {
    const isNone = data.baby_movement === 'none';
    flags.push({
      rule_name: 'FETAL_MOVEMENT_DANGER',
      severity: 'danger',
      message_en: isNone ? 'Absent baby movement reported' : 'Reduced baby movement reported',
      message_hi: isNone ? 'गर्भ में बच्चे की हलचल बंद' : 'बच्चे की हलचल कम',
      message_ta: isNone ? 'குழந்தை அசைவு இல்லை' : 'குழந்தை அசைவு குறைவு',
      action_required: 'Immediate fetal heart rate check and ultrasound required at PHC.'
    });
  }

  // 5. Bleeding in pregnancy
  if (isPregnant && data.symptoms.includes('bleeding')) {
    flags.push({
      rule_name: 'PREGNANCY_BLEEDING_DANGER',
      severity: 'danger',
      message_en: 'Bleeding reported during pregnancy - Obstetric Emergency',
      message_hi: 'गर्भावस्था में रक्तस्राव - गंभीर आपातकालीन स्थिति',
      message_ta: 'கர்ப்ப காலத்தில் ரத்தப்போக்கு - அவசர சிகிச்சை தேவை',
      action_required: 'Arrange 108 emergency transport immediately to FRU/District Hospital.'
    });
  }

  const isHighRisk = flags.length > 0;

  return {
    is_high_risk: isHighRisk,
    danger_flags: flags,
    emergency_action: isHighRisk ? 'खतरे के लक्षण। आज ही PHC/CHC भेजिए। एएनएम (ANM) से तुरंत संपर्क करें।' : null,
    call_anm_phone: '+91 98765 43210',
    spoken_warning_hi: isHighRisk ? 'सावधान! खतरे के लक्षण पाए गए हैं। तुरंत एएनएम दीदी या 108 एम्बुलेंस को कॉल करें और आज ही पीएचसी भेजें।' : null,
    spoken_warning_ta: isHighRisk ? 'எச்சரிக்கை! ஆபத்தான அறிகுறிகள் உள்ளன. உடனடியாக செவிலியரை அழைக்கவும் மற்றும் மருத்துவமனைக்கு அனுப்பவும்.' : null,
  };
}
