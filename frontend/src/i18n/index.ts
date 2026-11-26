import { LanguageCode, LanguageOption, TranslationSchema } from './types';
import { en } from './languages/en';
import { hi } from './languages/hi';
import { ta } from './languages/ta';
import { bho } from './languages/bho';

export * from './types';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    speechLang: 'en-IN',
    speechEngineNote: 'Indian English Speech Engine'
  },
  {
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिंदी',
    speechLang: 'hi-IN',
    speechEngineNote: 'Standard Hindi Recognition'
  },
  {
    code: 'ta',
    label: 'Tamil',
    nativeLabel: 'தமிழ்',
    speechLang: 'ta-IN',
    speechEngineNote: 'Standard Tamil Recognition'
  },
  {
    code: 'bho',
    label: 'Bhojpuri',
    nativeLabel: 'भोजपुरी',
    speechLang: 'hi-IN', // Browser Web Speech uses Hindi engine for Devanagari Bhojpuri
    speechEngineNote: 'Uses Hindi Speech Recognition Engine with Bhojpuri Lexicon'
  }
];

const TRANSLATIONS_REGISTRY: Record<string, TranslationSchema> = {
  en,
  hi,
  ta,
  bho
};

/**
 * Returns the translation schema for the requested language.
 * Always safely defaults to English if the language is unknown.
 */
export function getTranslation(code?: string): TranslationSchema {
  if (!code || !TRANSLATIONS_REGISTRY[code]) {
    return en;
  }
  return TRANSLATIONS_REGISTRY[code];
}

/**
 * Helper to dynamically format patient category label in active language
 */
export function formatCategoryLabel(category: string, langCode: LanguageCode): string {
  const t = getTranslation(langCode);
  return t.categories[category] || t.categories.unknown || category;
}

/**
 * Helper to dynamically format symptom label in active language
 */
export function formatSymptomLabel(symptomKey: string, langCode: LanguageCode): string {
  const t = getTranslation(langCode);
  return t.symptomsMap[symptomKey] || symptomKey;
}

/**
 * Helper to dynamically format medicine name in active language
 */
export function formatMedicineLabel(medKey: string, langCode: LanguageCode): string {
  const t = getTranslation(langCode);
  return t.medicinesMap[medKey] || medKey;
}

/**
 * Generates spoken summary in the selected language for voice read-back
 */
export function generateSpokenSummaryForLang(
  data: {
    patient_name?: string | null;
    category?: string;
    pregnancy_month?: number | null;
    newborn_age_days?: number | null;
    child_age_years?: number | null;
    vitals?: {
      blood_pressure?: { systolic?: number | null; diastolic?: number | null } | null;
      temperature_f?: number | null;
      weight_kg?: number | null;
    };
    symptoms?: string[];
    medicines?: Array<{ name: string; status: string }>;
  },
  langCode: LanguageCode
): string {
  const t = getTranslation(langCode);
  const name = data.patient_name || (langCode === 'en' ? 'Patient' : 'मरीज़');
  const parts: string[] = [name];

  if (data.category === 'pregnant_woman' && data.pregnancy_month) {
    if (langCode === 'en') parts.push(`${data.pregnancy_month} months pregnant`);
    else if (langCode === 'ta') parts.push(`${data.pregnancy_month} மாத கர்ப்பிணி`);
    else if (langCode === 'bho') parts.push(`${data.pregnancy_month} महीना के गर्भवती`);
    else parts.push(`${data.pregnancy_month} महीने की गर्भवती`);
  } else if (data.category === 'newborn' && data.newborn_age_days) {
    if (langCode === 'en') parts.push(`${data.newborn_age_days} days old newborn`);
    else if (langCode === 'ta') parts.push(`${data.newborn_age_days} நாட்கள் குழந்தை`);
    else if (langCode === 'bho') parts.push(`${data.newborn_age_days} दिन के नवजात`);
    else parts.push(`${data.newborn_age_days} दिन का नवजात`);
  } else if (data.category === 'child' && data.child_age_years) {
    if (langCode === 'en') parts.push(`${data.child_age_years} years old child`);
    else if (langCode === 'ta') parts.push(`${data.child_age_years} வயது குழந்தை`);
    else if (langCode === 'bho') parts.push(`${data.child_age_years} साल के लइका`);
    else parts.push(`${data.child_age_years} साल का बच्चा`);
  }

  if (data.vitals?.blood_pressure?.systolic) {
    const bp = data.vitals.blood_pressure;
    if (langCode === 'en') parts.push(`Blood pressure ${bp.systolic} over ${bp.diastolic}`);
    else if (langCode === 'ta') parts.push(`பிபி ${bp.systolic} / ${bp.diastolic}`);
    else if (langCode === 'bho') parts.push(`बीपी ${bp.systolic} बाई ${bp.diastolic}`);
    else parts.push(`बीपी ${bp.systolic} बाई ${bp.diastolic}`);
  }

  if (data.vitals?.temperature_f) {
    if (langCode === 'en') parts.push(`Fever ${data.vitals.temperature_f} degrees`);
    else if (langCode === 'ta') parts.push(`காய்ச்சல் ${data.vitals.temperature_f} டிகிரி`);
    else if (langCode === 'bho') parts.push(`बुखार ${data.vitals.temperature_f} डिग्री`);
    else parts.push(`बुखार ${data.vitals.temperature_f} डिग्री`);
  }

  if (data.vitals?.weight_kg) {
    if (langCode === 'en') parts.push(`Weight ${data.vitals.weight_kg} kg`);
    else if (langCode === 'ta') parts.push(`எடை ${data.vitals.weight_kg} கிலோ`);
    else if (langCode === 'bho') parts.push(`वजन ${data.vitals.weight_kg} किलो`);
    else parts.push(`वजन ${data.vitals.weight_kg} किलो`);
  }

  if (data.symptoms?.includes('swelling_in_feet')) {
    if (langCode === 'en') parts.push('Swelling in feet');
    else if (langCode === 'ta') parts.push('கால் வீக்கம்');
    else if (langCode === 'bho') parts.push('गोड़ में सूजन');
    else parts.push('पैरों में सूजन');
  }

  if (data.symptoms?.includes('bleeding')) {
    if (langCode === 'en') parts.push('Bleeding');
    else if (langCode === 'ta') parts.push('ரத்தப்போக்கு');
    else if (langCode === 'bho') parts.push('खून गिरल बा');
    else parts.push('रक्तस्राव');
  }

  if (data.medicines) {
    for (const med of data.medicines) {
      if (med.name === 'iron_tablet') {
        if (med.status === 'missed') {
          if (langCode === 'en') parts.push('Iron tablet missed');
          else if (langCode === 'ta') parts.push('அயர்ன் மாத்திரை சாப்பிடவில்லை');
          else if (langCode === 'bho') parts.push('आयरन के गोली ना लिहले बाड़ी');
          else parts.push('आयरन की गोली नहीं ली');
        } else {
          if (langCode === 'en') parts.push('Iron tablet taken');
          else if (langCode === 'ta') parts.push('அயர்ன் மாத்திரை உட்கொள்ளப்பட்டது');
          else if (langCode === 'bho') parts.push('आयरन के गोली लिहले बाड़ी');
          else parts.push('आयरन की गोली ली है');
        }
      }
    }
  }

  return `${parts.join(', ')}. ${t.confirmationQuestion}`;
}
