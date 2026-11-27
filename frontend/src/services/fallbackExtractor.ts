import { StructuredVisitData, BloodPressure, Vitals, MedicineItem, LanguageCode } from '../types';

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

  // 3. Patient Age
  const ageMatch = lower.match(/(?:age|umar|umra|வயது)\s*[:=]?\s*(\d{1,3})/) || lower.match(/(\d{1,3})\s*(?:saal|years|year|varsh|ஆண்டு)/);
  if (ageMatch) {
    const a = parseInt(ageMatch[1], 10);
    if (a >= 1 && a <= 120) {
      if (data.category === 'child' && a <= 18) {
        data.child_age_years = a;
      } else {
        data.patient_age = a;
      }
    }
  }

  // 4. Pregnancy Month
  const pMatch = lower.match(/(\d{1,2})\s*(?:mahine|mahina|month|months|வது\s*மாதம்|மாதம்|மாத)/);
  if (pMatch) {
    data.pregnancy_month = parseInt(pMatch[1], 10);
    if (data.category === 'unknown') data.category = 'pregnant_woman';
  }

  // 5. Newborn Days
  const nbMatch = lower.match(/(\d{1,3})\s*(?:din|days|naal|நாள்)/);
  if (nbMatch) {
    data.newborn_age_days = parseInt(nbMatch[1], 10);
    if (data.category === 'unknown') data.category = 'newborn';
  }

  // 6. Child Years
  const chMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:saal|varsh|years|வயது|ஆண்டு)/);
  if (chMatch) {
    data.child_age_years = parseFloat(chMatch[1]);
    if (data.category === 'unknown') data.category = 'child';
  }

  // 7. Blood Pressure
  const bpPatterns = [
    /(?:bp|blood\s*pressure|rakhtchaap|பிபி)?\s*[:=]?\s*(\d{2,3})\s*(?:\/|by|over|aur|and|bata|\s)\s*(\d{2,3})/,
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

  // 8. Weight
  const wtMatch = lower.match(/(?:weight|vajan|wazan|எடை)?\s*[:=]?\s*(\d{1,3}(?:\.\d+)?)\s*(?:kg|kilo|kilogram|கிலோ)/);
  if (wtMatch) {
    if (!data.vitals) data.vitals = {};
    data.vitals.weight_kg = parseFloat(wtMatch[1]);
  }

  // 9. Temperature
  const tempMatch = lower.match(/(?:bukhar|fever|temperature|temp|காய்ச்சல்)\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:degree|f|fahrenheit)?/);
  if (tempMatch) {
    if (!data.vitals) data.vitals = {};
    data.vitals.temperature_f = parseFloat(tempMatch[1]);
  }

  // 10. Symptoms
  const symptomsSet = new Set(data.symptoms || []);
  if (/sujan|swelling|soojhan|வீக்கம்|गोड़ में सूजन|सूजन/i.test(lower)) symptomsSet.add('swelling_in_feet');
  if (/chakkar|dizziness|தலைசுற்றல்|மயக்கம்|माथ घूमत|माथा घूमे/i.test(lower)) symptomsSet.add('dizziness');
  if (/khoon|bleeding|ரத்தப்போக்கு|खून गिरल|रक्तस्राव/i.test(lower)) symptomsSet.add('bleeding');
  if (/bukhar|fever|காய்ச்சல்|तावे/i.test(lower)) symptomsSet.add('fever');
  if (/sar dard|sir dard|headache|தலைவலி|माथ बथा|माथा में दर्द/i.test(lower)) symptomsSet.add('severe_headache');
  if (/saans|breathing|மூச்சுத்திணறல்|सांस फूले/i.test(lower)) symptomsSet.add('difficulty_breathing');
  if (/doodh nahi|poor feeding|दूध ना/i.test(lower)) symptomsSet.add('poor_feeding');
  data.symptoms = Array.from(symptomsSet);

  // 11. Baby Movement
  if (/halchal nahi|movement nahi|band|அசைவு இல்லை|हलचल बंद/i.test(lower)) {
    data.baby_movement = 'none';
  } else if (/halchal kam|movement kam|அசைவு குறைவு|हलचल कम/i.test(lower)) {
    data.baby_movement = 'reduced';
  } else if (/halchal theek|movement normal|அசைவு நன்றாக|हलचल ठीक/i.test(lower)) {
    data.baby_movement = 'normal';
  }

  // 12. Medicines
  const meds: MedicineItem[] = [...(data.medicines || [])];
  if (/iron|ifa|lal goli|அயர்ன்|आयरन|लाल गोली/i.test(lower)) {
    const isMissed = /nahi li|chhut|nahi khayi|nahi liya|சாப்பிடவில்லை|இல்லை|ना लिहले|छूट|ना खइले/i.test(lower);
    const idx = meds.findIndex(m => m.name === 'iron_tablet');
    if (idx >= 0) {
      meds[idx].status = isMissed ? 'missed' : 'taken';
    } else {
      meds.push({ name: 'iron_tablet', status: isMissed ? 'missed' : 'taken' });
    }
  }
  data.medicines = meds;

  return data;
}

/**
 * Intelligent deterministic clinical correction processor
 * Updates only the relevant fields, handles negative statements / symptom removals,
 * preserves all untouched information, and returns changed field metadata.
 */
export function correctLocally(
  currentData: StructuredVisitData,
  correctionText: string,
  language: LanguageCode = 'hi'
): {
  updated: StructuredVisitData;
  fieldsChanged: string[];
  fieldsUnchanged: string[];
  ambiguityNote?: string | null;
} {
  const data: StructuredVisitData = JSON.parse(JSON.stringify(currentData));
  const text = correctionText.trim();
  const lower = text.toLowerCase();
  const fieldsChanged: string[] = [];

  // 1. Correct Patient Age
  // Examples: "No, her age is 28, not 25", "Age 28", "28 saal", "umar 28", "வயது 28"
  let ageMatch: number | null = null;
  const p1 = lower.match(/(?:her\s*age\s*is|his\s*age\s*is|patient\s*age\s*is|age\s*is|age|umar|umra|வயது)\s*[:=]?\s*(\d{1,3})/);
  const p2 = lower.match(/(?:not|\bno\b|\bnahi\b)\s*\d{1,3}\s*[,.]?\s*(?:age\s*is\s*)?(\d{1,3})/);
  const p3 = lower.match(/(\d{1,3})\s*(?:saal|years|year)?\s*[,.]?\s*(?:not|\bnahi\b)/);
  const p4 = lower.match(/(\d{1,3})\s*(?:saal|years|year|varsh|ஆண்டு)/);

  if (p1) ageMatch = parseInt(p1[1], 10);
  else if (p2) ageMatch = parseInt(p2[1], 10);
  else if (p3) ageMatch = parseInt(p3[1], 10);
  else if (p4) ageMatch = parseInt(p4[1], 10);

  if (ageMatch != null && ageMatch >= 1 && ageMatch <= 120) {
    if (data.category === 'child' && ageMatch <= 18) {
      data.child_age_years = ageMatch;
      fieldsChanged.push('child_age_years');
    } else {
      data.patient_age = ageMatch;
      fieldsChanged.push('patient_age');
    }
  }

  // 2. Correct Blood Pressure
  // Examples: "Her blood pressure is 120 over 80", "BP 120 by 80", "120/80"
  const bpMatch =
    lower.match(/(?:bp|blood\s*pressure|rakhtchaap|பிபி)?\s*[:=]?\s*(\d{2,3})\s*(?:\/|by|over|aur|and|bata|\s)\s*(\d{2,3})/) ||
    lower.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (bpMatch) {
    const s = parseInt(bpMatch[1], 10);
    const d = parseInt(bpMatch[2], 10);
    if (s >= 50 && s <= 260 && d >= 30 && d <= 160) {
      if (!data.vitals) data.vitals = {};
      data.vitals.blood_pressure = { systolic: s, diastolic: d };
      fieldsChanged.push('blood_pressure');
    }
  }

  // 3. Correct Temperature
  const tempMatch = lower.match(/(?:bukhar|fever|temperature|temp|காய்ச்சல்)\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:degree|f|fahrenheit)?/);
  if (tempMatch) {
    if (!data.vitals) data.vitals = {};
    data.vitals.temperature_f = parseFloat(tempMatch[1]);
    fieldsChanged.push('temperature_f');
  }

  // 4. Correct Weight
  const wtMatch = lower.match(/(?:weight|vajan|wazan|எடை)?\s*[:=]?\s*(\d{1,3}(?:\.\d+)?)\s*(?:kg|kilo|kilogram|கிலோ)/);
  if (wtMatch) {
    if (!data.vitals) data.vitals = {};
    data.vitals.weight_kg = parseFloat(wtMatch[1]);
    fieldsChanged.push('weight_kg');
  }

  // 5. Correct Symptoms (Negation & Addition)
  const symptomKeywords: Record<string, string[]> = {
    fever: ['fever', 'bukhar', 'taap', 'shareer garam', 'காய்ச்சல்'],
    severe_headache: ['headache', 'sar dard', 'sir dard', 'matha batha', 'தலைவலி'],
    swelling_in_feet: ['swelling in feet', 'pairon mein sujan', 'paon mein sujan', 'sujan', 'soojhan', 'swelling', 'வீக்கம்', 'கால் வீக்கம்'],
    dizziness: ['dizziness', 'chakkar', 'math ghoomat', 'தலைசுற்றல்'],
    bleeding: ['bleeding', 'khoon', 'raktsrav', 'ரத்தப்போக்கு'],
    difficulty_breathing: ['saans phoolna', 'breathing difficulty', 'மூச்சுத்திணறல்'],
    abdominal_pain: ['pet dard', 'abdominal pain', 'வயிறு வலி']
  };

  let currentSymptoms = [...(data.symptoms || [])];
  let symptomsModified = false;

  // Detect Negation
  for (const [sym, kwList] of Object.entries(symptomKeywords)) {
    for (const kw of kwList) {
      const negRegex = new RegExp(`(?:no\\b|not\\b|does\\s*not\\s*have|doesn\'t\\s*have|not\\s*having|illai|bina|without)\\s+(?:\\w+\\s+)?${kw}|${kw}\\s+(?:nahi\\b|nahi\\s*hai|naikhe|illai|nill)`, 'i');
      if (negRegex.test(lower)) {
        if (currentSymptoms.includes(sym)) {
          currentSymptoms = currentSymptoms.filter(s => s !== sym);
          symptomsModified = true;
        }
        break;
      }
    }
  }

  // Detect Positive Addition
  for (const [sym, kwList] of Object.entries(symptomKeywords)) {
    for (const kw of kwList) {
      if (lower.includes(kw)) {
        const negRegex = new RegExp(`(?:no\\b|not\\b|does\\s*not\\s*have|doesn\'t\\s*have|not\\s*having|illai|bina|without)\\s+(?:\\w+\\s+)?${kw}|${kw}\\s+(?:nahi\\b|nahi\\s*hai|naikhe|illai|nill)`, 'i');
        if (!negRegex.test(lower)) {
          if (!currentSymptoms.includes(sym)) {
            currentSymptoms.push(sym);
            symptomsModified = true;
          }
          break;
        }
      }
    }
  }

  if (symptomsModified) {
    data.symptoms = currentSymptoms.sort();
    fieldsChanged.push('symptoms');
  }

  // 6. Correct Patient Name
  if (/\b(name|naam|peyar|பெயர்)\b/i.test(lower)) {
    const nameMatch = text.match(/(?:her\s*name\s*is|his\s*name\s*is|name\s*is|naam\s*hai|naam|பெயர்)\s*[:=]?\s*([A-Za-z\u0900-\u097F\u0B80-\u0BFF]+)/i);
    const nameAlt = text.match(/(?:name|naam)\s+not\s+[A-Za-z]+\s*[,.]?\s*([A-Za-z\u0900-\u097F\u0B80-\u0BFF]+)/i);
    const candidate = (nameMatch ? nameMatch[1] : nameAlt ? nameAlt[1] : '').trim();
    if (candidate && !['nahi', 'not', 'is', 'hai', 'aur', 'and', 'fever', 'bukhar'].includes(candidate.toLowerCase())) {
      data.patient_name = candidate;
      fieldsChanged.push('patient_name');
    }
  }

  // 7. Correct Pregnancy Month
  const pMonthMatch = lower.match(/(\d{1,2})\s*(?:mahine|mahina|month|months|வது\s*மாதம்|மாதம்)/);
  if (pMonthMatch && data.category === 'pregnant_woman') {
    data.pregnancy_month = parseInt(pMonthMatch[1], 10);
    fieldsChanged.push('pregnancy_month');
  }

  // 8. Correct Newborn Days
  const nbDaysMatch = lower.match(/(\d{1,3})\s*(?:din|days|naal|நாள்)/);
  if (nbDaysMatch && data.category === 'newborn') {
    data.newborn_age_days = parseInt(nbDaysMatch[1], 10);
    fieldsChanged.push('newborn_age_days');
  }

  // 9. Correct Medicines
  if (/iron|ifa|lal goli|अயர்ன்|आयरन/i.test(lower)) {
    const isMissed = /nahi|missed|chhut|illai|no/i.test(lower);
    const existingMed = data.medicines.find(m => m.name === 'iron_tablet');
    if (existingMed) {
      existingMed.status = isMissed ? 'missed' : 'taken';
    } else {
      data.medicines.push({ name: 'iron_tablet', status: isMissed ? 'missed' : 'taken' });
    }
    fieldsChanged.push('medicines');
  }

  const allFields = [
    'patient_name', 'category', 'patient_age', 'pregnancy_month',
    'newborn_age_days', 'child_age_years', 'blood_pressure',
    'temperature_f', 'weight_kg', 'symptoms', 'medicines'
  ];
  const fieldsUnchanged = allFields.filter(f => !fieldsChanged.includes(f));

  let ambiguityNote: string | null = null;
  if (fieldsChanged.length === 0) {
    ambiguityNote = 'Could not determine what to update. Please specify clearly (e.g. "Age is 28" or "BP is 120/80").';
  }

  data.original_transcript = `${currentData.original_transcript} [Correction: ${text}]`;

  return {
    updated: data,
    fieldsChanged,
    fieldsUnchanged,
    ambiguityNote
  };
}

export function generateSpokenSummaries(data: StructuredVisitData): {
  hi: string;
  ta: string;
  en: string;
} {
  // Hindi
  const nameHi = data.patient_name || 'मरीज़';
  const partsHi: string[] = [nameHi];
  if (data.patient_age) {
    partsHi.push(`उम्र ${data.patient_age} साल`);
  }
  if (data.category === 'pregnant_woman' && data.pregnancy_month) {
    partsHi.push(`${data.pregnancy_month} महीने की गर्भवती`);
  } else if (data.category === 'newborn' && data.newborn_age_days) {
    partsHi.push(`${data.newborn_age_days} दिन का नवजात`);
  } else if (data.category === 'child' && data.child_age_years) {
    partsHi.push(`${data.child_age_years} साल का बच्चा`);
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
  if (data.symptoms?.includes('swelling_in_feet')) {
    partsHi.push('पैरों में सूजन');
  }
  if (data.symptoms?.includes('severe_headache')) {
    partsHi.push('सिर में दर्द');
  }
  if (data.symptoms?.includes('fever')) {
    partsHi.push('बुखार');
  }
  for (const m of data.medicines || []) {
    if (m.name === 'iron_tablet') {
      partsHi.push(m.status === 'missed' ? 'आयरन की गोली नहीं ली' : 'आयरन की गोली ली है');
    }
  }

  const hi = partsHi.join(', ') + '। क्या यह सही है?';

  // Tamil
  const nameTa = data.patient_name || 'நோயாளி';
  const partsTa: string[] = [nameTa];
  if (data.patient_age) {
    partsTa.push(`வயது ${data.patient_age}`);
  }
  if (data.category === 'pregnant_woman' && data.pregnancy_month) {
    partsTa.push(`${data.pregnancy_month} மாத கர்ப்பிணி`);
  } else if (data.category === 'newborn' && data.newborn_age_days) {
    partsTa.push(`${data.newborn_age_days} நாட்கள் குழந்தை`);
  }
  if (data.vitals?.blood_pressure?.systolic) {
    partsTa.push(`பிபி ${data.vitals.blood_pressure.systolic}/${data.vitals.blood_pressure.diastolic}`);
  }
  if (data.symptoms?.includes('swelling_in_feet')) {
    partsTa.push('கால் வீக்கம்');
  }
  if (data.symptoms?.includes('severe_headache')) {
    partsTa.push('தலைவலி');
  }
  if (data.symptoms?.includes('fever')) {
    partsTa.push('காய்ச்சல்');
  }
  for (const m of data.medicines || []) {
    if (m.name === 'iron_tablet' && m.status === 'missed') {
      partsTa.push('அயர்ன் மாத்திரை சாப்பிடவில்லை');
    }
  }
  const ta = partsTa.join(', ') + '. இது சரியா?';

  // English
  const nameEn = data.patient_name || 'Patient';
  const partsEn: string[] = [nameEn];
  if (data.patient_age) {
    partsEn.push(`Age ${data.patient_age} years`);
  }
  if (data.category === 'pregnant_woman' && data.pregnancy_month) {
    partsEn.push(`${data.pregnancy_month} months pregnant`);
  } else if (data.category === 'newborn' && data.newborn_age_days) {
    partsEn.push(`${data.newborn_age_days} days old newborn`);
  } else if (data.category === 'child' && data.child_age_years) {
    partsEn.push(`${data.child_age_years} years old child`);
  }

  if (data.vitals?.blood_pressure?.systolic) {
    partsEn.push(`BP ${data.vitals.blood_pressure.systolic} over ${data.vitals.blood_pressure.diastolic}`);
  }
  if (data.vitals?.temperature_f) {
    partsEn.push(`Fever ${data.vitals.temperature_f} degrees`);
  }
  if (data.vitals?.weight_kg) {
    partsEn.push(`Weight ${data.vitals.weight_kg} kg`);
  }
  if (data.symptoms?.includes('swelling_in_feet')) {
    partsEn.push('Swelling in feet');
  }
  if (data.symptoms?.includes('severe_headache')) {
    partsEn.push('Headache');
  }
  if (data.symptoms?.includes('fever')) {
    partsEn.push('Fever');
  }
  for (const m of data.medicines || []) {
    if (m.name === 'iron_tablet') {
      partsEn.push(m.status === 'missed' ? 'Iron tablet missed' : 'Iron tablet taken');
    }
  }
  const en = partsEn.join(', ') + '. Is this information correct?';

  return { hi, ta, en };
}
