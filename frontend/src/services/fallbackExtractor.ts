import { StructuredVisitData, BloodPressure, Vitals, MedicineItem } from '../types';

export function extractLocally(
  transcript: string,
  existingData?: StructuredVisitData
): StructuredVisitData {
  const text = transcript.trim();
  const lower = text.toLowerCase();

  const data: StructuredVisitData = existingData
    ? JSON.parse(JSON.stringify(existingData))
    : {
        category: 'unknown',
        vitals: {},
        symptoms: [],
        medicines: [],
        missing_fields: [],
        uncertain_fields: [],
        original_transcript: text,
      };

  data.original_transcript = text;

  // 1. Patient Name
  const cleaned = text.replace(/^(patient|marij|naam|name|shrimati|smt|selvi|thiru)\s*[:=]?\s*/i, '');
  const nameMatch = cleaned.match(/^([A-Z\u0900-\u097F\u0B80-\u0BFF][a-zA-Z\u0900-\u097F\u0B80-\u0BFF\s]{1,25}?)(?:,|\s+ko|\s+ka|\s+ki|\s+hai|\s+7|\s+\d|\s+pregnant|\s+navjat|\s+maruthu)/i);
  if (nameMatch) {
    const candidate = nameMatch[1].trim();
    if (!['namaste', 'visit', 'aaj', 'ek', 'ha', 'haan', 'nahi'].includes(candidate.toLowerCase())) {
      data.patient_name = candidate;
    }
  }

  // 2. Category
  if (/pregnant|garbhvati|garbhavastha|pregnancy|aurat|கர்ப்பிணி/i.test(lower)) {
    data.category = 'pregnant_woman';
  } else if (/newborn|navjat|navjaat|shishu|baby|பிறந்த\s*குழந்தை/i.test(lower)) {
    data.category = 'newborn';
  } else if (/child|bacha|bachi|balak|குழந்தை/i.test(lower)) {
    data.category = 'child';
  }

  // 3. Pregnancy Month
  const pMatch = lower.match(/(\d{1,2})\s*(?:mahine|mahina|month|months|வது\s*மாதம்|மாதம்|மாத)/);
  if (pMatch) {
    data.pregnancy_month = parseInt(pMatch[1], 10);
    if (data.category === 'unknown') data.category = 'pregnant_woman';
  }

  // 4. Newborn Days
  const nbMatch = lower.match(/(\d{1,3})\s*(?:din|days|naal|நாள்)/);
  if (nbMatch) {
    data.newborn_age_days = parseInt(nbMatch[1], 10);
    if (data.category === 'unknown') data.category = 'newborn';
  }

  // 5. Child Years
  const chMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:saal|varsh|years|வயது|ஆண்டு)/);
  if (chMatch) {
    data.child_age_years = parseFloat(chMatch[1]);
    if (data.category === 'unknown') data.category = 'child';
  }

  // 6. Blood Pressure
  const bpPatterns = [
    /(?:bp|blood\s*pressure|rakhtchaap|பிபி)?\s*[:=]?\s*(\d{2,3})\s*(?:\/|by|aur|and|bata|\s)\s*(\d{2,3})/,
    /(\d{2,3})\s*\/\s*(\d{2,3})/
  ];
  for (const pat of bpPatterns) {
    const match = lower.match(pat);
    if (match) {
      const s = parseInt(match[1], 10);
      const d = parseInt(match[2], 10);
      if (s >= 50 && s <= 260 && d >= 30 && d <= 160) {
        if (!data.vitals) data.vitals = {};
        data.vitals.blood_pressure = { systolic: s, diastolic: d };
        break;
      }
    }
  }

  // 7. Weight
  const wtMatch = lower.match(/(?:weight|vajan|wazan|எடை)?\s*[:=]?\s*(\d{1,3}(?:\.\d+)?)\s*(?:kg|kilo|kilogram|கிலோ)/);
  if (wtMatch) {
    if (!data.vitals) data.vitals = {};
    data.vitals.weight_kg = parseFloat(wtMatch[1]);
  }

  // 8. Temperature
  const tempMatch = lower.match(/(?:bukhar|fever|temperature|temp|காய்ச்சல்)\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:degree|f|fahrenheit)?/);
  if (tempMatch) {
    if (!data.vitals) data.vitals = {};
    data.vitals.temperature_f = parseFloat(tempMatch[1]);
  }

  // 9. Symptoms
  const symptomsSet = new Set(data.symptoms || []);
  if (/sujan|swelling|soojhan|வீக்கம்/i.test(lower)) symptomsSet.add('swelling_in_feet');
  if (/chakkar|dizziness|தலைசுற்றல்|மயக்கம்/i.test(lower)) symptomsSet.add('dizziness');
  if (/khoon|bleeding|ரத்தப்போக்கு/i.test(lower)) symptomsSet.add('bleeding');
  if (/bukhar|fever|காய்ச்சல்/i.test(lower)) symptomsSet.add('fever');
  if (/sar dard|sir dard|headache|தலைவலி/i.test(lower)) symptomsSet.add('severe_headache');
  if (/saans|breathing|மூச்சுத்திணறல்/i.test(lower)) symptomsSet.add('difficulty_breathing');
  if (/doodh nahi|poor feeding/i.test(lower)) symptomsSet.add('poor_feeding');
  data.symptoms = Array.from(symptomsSet);

  // 10. Baby Movement
  if (/halchal nahi|movement nahi|band|அசைவு இல்லை/i.test(lower)) {
    data.baby_movement = 'none';
  } else if (/halchal kam|movement kam|அசைவு குறைவு/i.test(lower)) {
    data.baby_movement = 'reduced';
  } else if (/halchal theek|movement normal|அசைவு நன்றாக/i.test(lower)) {
    data.baby_movement = 'normal';
  }

  // 11. Medicines
  const meds: MedicineItem[] = [...(data.medicines || [])];
  if (/iron|ifa|lal goli|அயர்ன்/i.test(lower)) {
    const isMissed = /nahi li|chhut|nahi khayi|nahi liya|சாப்பிடவில்லை|இல்லை/i.test(lower);
    const idx = meds.findIndex(m => m.name === 'iron_tablet');
    const item: MedicineItem = { name: 'iron_tablet', status: isMissed ? 'missed' : 'taken' };
    if (idx >= 0) meds[idx] = item;
    else meds.push(item);
  }
  if (/calcium|safed goli|கால்சியம்/i.test(lower)) {
    const isMissed = /calcium nahi|safed goli nahi/i.test(lower);
    const idx = meds.findIndex(m => m.name === 'calcium_tablet');
    const item: MedicineItem = { name: 'calcium_tablet', status: isMissed ? 'missed' : 'taken' };
    if (idx >= 0) meds[idx] = item;
    else meds.push(item);
  }
  data.medicines = meds;

  // 12. Missing fields calculation
  const missing: string[] = [];
  if (data.category === 'pregnant_woman') {
    if (!data.vitals?.blood_pressure?.systolic) missing.push('blood_pressure');
    if (!data.vitals?.weight_kg) missing.push('weight_kg');
    if (data.pregnancy_month == null) missing.push('pregnancy_month');
  } else if (data.category === 'newborn') {
    if (!data.vitals?.temperature_f) missing.push('temperature_f');
    if (!data.vitals?.weight_kg) missing.push('weight_kg');
    if (data.newborn_age_days == null) missing.push('newborn_age_days');
  }
  data.missing_fields = missing;
  data.confidence = 0.95;

  return data;
}

export function generateSpokenSummaries(data: StructuredVisitData): { hi: string; ta: string } {
  const name = data.patient_name || 'मरीज़';
  const partsHi: string[] = [name];

  if (data.category === 'pregnant_woman' && data.pregnancy_month) {
    partsHi.push(`${data.pregnancy_month} महीने की गर्भवती`);
  } else if (data.category === 'newborn' && data.newborn_age_days) {
    partsHi.push(`${data.newborn_age_days} दिन का नवजात`);
  }

  if (data.vitals?.blood_pressure?.systolic) {
    partsHi.push(`बीपी ${data.vitals.blood_pressure.systolic} बाई ${data.vitals.blood_pressure.diastolic}`);
  }
  if (data.vitals?.temperature_f) {
    partsHi.push(`बुखार ${data.vitals.temperature_f} डिग्री`);
  }
  if (data.vitals?.weight_kg) {
    partsHi.push(`वजन ${data.vitals.weight_kg} किलो`);
  }
  if (data.symptoms.includes('swelling_in_feet')) {
    partsHi.push('पैरों में सूजन');
  }
  if (data.symptoms.includes('bleeding')) {
    partsHi.push('रक्तस्राव');
  }
  for (const m of data.medicines) {
    if (m.name === 'iron_tablet') {
      partsHi.push(m.status === 'missed' ? 'आयरन की गोली नहीं ली' : 'आयरन की गोली ली है');
    }
  }

  const hi = partsHi.join(', ') + '। क्या यह सही है?';

  // Tamil
  const nameTa = data.patient_name || 'நோயாளி';
  const partsTa: string[] = [nameTa];
  if (data.category === 'pregnant_woman' && data.pregnancy_month) {
    partsTa.push(`${data.pregnancy_month} மாத கர்ப்பிணி`);
  }
  if (data.vitals?.blood_pressure?.systolic) {
    partsTa.push(`பிபி ${data.vitals.blood_pressure.systolic}/${data.vitals.blood_pressure.diastolic}`);
  }
  if (data.symptoms.includes('swelling_in_feet')) {
    partsTa.push('கால் வீக்கம்');
  }
  for (const m of data.medicines) {
    if (m.name === 'iron_tablet' && m.status === 'missed') {
      partsTa.push('அயர்ன் மாத்திரை சாப்பிடவில்லை');
    }
  }
  const ta = partsTa.join(', ') + '. இது சரியா?';

  return { hi, ta };
}
