import { LanguageCode } from '../types';

export interface DemoCase {
  id: string;
  title: string;
  patientName: string;
  category: string;
  language: LanguageCode;
  transcript: string;
  simulatedAudioDurationSec: number;
  expectedRisk: 'danger' | 'normal';
  description: string;
}

export const DEMO_CASES: DemoCase[] = [
  // ================= ENGLISH CASES =================
  {
    id: 'demo-sunita-en',
    title: 'Sunita Devi (7th Month Pregnant - High Risk BP)',
    patientName: 'Sunita Devi',
    category: 'pregnant_woman',
    language: 'en',
    transcript: 'Sunita is 7 months pregnant, BP is 150 by 100, severe swelling in feet and missed iron tablets.',
    simulatedAudioDurationSec: 5,
    expectedRisk: 'danger',
    description: '7 months pregnant, BP 150/100, swelling in feet (Preeclampsia danger sign detected).'
  },
  {
    id: 'demo-aarav-en',
    title: 'Aarav Kumar (15-Day Newborn - High Fever)',
    patientName: 'Aarav Kumar',
    category: 'newborn',
    language: 'en',
    transcript: 'Aarav is a 15-day-old newborn, fever is 101.5 degrees, refusing to feed and very irritable.',
    simulatedAudioDurationSec: 4,
    expectedRisk: 'danger',
    description: '15-day-old newborn with high fever 101.5°F, feeding refusal (Neonatal danger sign).'
  },
  {
    id: 'demo-meena-en',
    title: 'Meena Kumari (3-Year Child - Routine Visit)',
    patientName: 'Meena Kumari',
    category: 'child',
    language: 'en',
    transcript: 'Meena is a 3-year-old child, weight is 14 kg, no fever or cough, all routine checkups normal.',
    simulatedAudioDurationSec: 4,
    expectedRisk: 'normal',
    description: '3-year-old routine checkup, 14 kg weight, normal growth & immunization.'
  },

  // ================= HINDI CASES =================
  {
    id: 'demo-sunita-hi',
    title: 'सुनीता देवी (7 महीने गर्भवती - हाई रिस्क BP)',
    patientName: 'सुनीता देवी',
    category: 'pregnant_woman',
    language: 'hi',
    transcript: 'सुनीता, 7 महीने की प्रेग्नेंट हैं, बीपी 150/100 है, पैरों में सूजन है और आयरन की गोली नहीं ली।',
    simulatedAudioDurationSec: 5,
    expectedRisk: 'danger',
    description: '7-महीने की गर्भवती, बीपी 150/100, पैरों में सूजन (प्री-एक्लेम्पसिया खतरा).'
  },
  {
    id: 'demo-aarav-hi',
    title: 'आरव कुमार (15 दिन का नवजात - तेज बुखार)',
    patientName: 'आरव कुमार',
    category: 'newborn',
    language: 'hi',
    transcript: 'आरव, 15 दिन का नवजात शिशु है, बुखार 101.5 है, दूध नहीं पी रहा है।',
    simulatedAudioDurationSec: 4,
    expectedRisk: 'danger',
    description: '15 दिन का नवजात शिशु, 101.5°F तेज बुखार, दूध नहीं पी रहा (संक्रमण का खतरा).'
  },
  {
    id: 'demo-meena-hi',
    title: 'मीना कुमारी (3 वर्ष बच्ची - सामान्य रूटीन विज़िट)',
    patientName: 'मीना कुमारी',
    category: 'child',
    language: 'hi',
    transcript: 'मीना, 3 साल की बच्ची है, वजन 14 किलो है, बुखार नहीं है, सब सामान्य है।',
    simulatedAudioDurationSec: 4,
    expectedRisk: 'normal',
    description: '3 वर्ष की बच्ची, 14 किलो वजन, सभी लक्षण सामान्य.'
  },

  // ================= TAMIL CASES =================
  {
    id: 'demo-sunita-ta',
    title: 'சுனிதா தேவி (7 மாத கர்ப்பிணி - உயர் இரத்த அழுத்தம்)',
    patientName: 'சுனிதா தேவி',
    category: 'pregnant_woman',
    language: 'ta',
    transcript: 'சுனிதா, 7 மாத கர்ப்பிணி, பிபி 150/100, கால் வீக்கம், அயர்ன் மாத்திரை சாப்பிடவில்லை.',
    simulatedAudioDurationSec: 5,
    expectedRisk: 'danger',
    description: '7 மாத கர்ப்பிணி, பிபி 150/100, கால் வீக்கம் (ப்ரீக்ளாம்சியா அபாயம்).'
  },
  {
    id: 'demo-aarav-ta',
    title: 'ஆரவ் குமார் (15 நாள் பச்சிளம் குழந்தை - காய்ச்சல்)',
    patientName: 'ஆரவ் குமார்',
    category: 'newborn',
    language: 'ta',
    transcript: 'ஆரவ், 15 நாள் பச்சிளம் குழந்தை, காய்ச்சல் 101.5 டிகிரி, தாய்ப்பால் குடிக்கவில்லை.',
    simulatedAudioDurationSec: 4,
    expectedRisk: 'danger',
    description: '15 நாள் பச்சிளம் குழந்தை, 101.5°F காய்ச்சல், பால் குடிக்கவில்லை (அபாய எச்சரிக்கை).'
  },
  {
    id: 'demo-meena-ta',
    title: 'மீனா குமாரி (3 வயது பெண் குழந்தை - வழக்கமான பரிசோதனை)',
    patientName: 'மீனா குமாரி',
    category: 'child',
    language: 'ta',
    transcript: 'மீனா, 3 வயது குழந்தை, எடை 14 கிலோ, காய்ச்சல் இல்லை, அனைத்தும் நலம்.',
    simulatedAudioDurationSec: 4,
    expectedRisk: 'normal',
    description: '3 வயது குழந்தை, 14 கிலோ எடை, அனைத்து வழக்கமான வளர்ச்சி இயல்பானது.'
  },

  // ================= BHOJPURI CASES =================
  {
    id: 'demo-sunita-bho',
    title: 'सुनीता देवी (7 महीना गर्भवती - हाई रिस्क BP)',
    patientName: 'सुनीता देवी',
    category: 'pregnant_woman',
    language: 'bho',
    transcript: 'सुनीता, सात महीना के गर्भवती बाड़ी, बीपी 150/100 बा, गोड़ में सूजन बा आ आयरन के गोली ना लिहले बाड़ी।',
    simulatedAudioDurationSec: 5,
    expectedRisk: 'danger',
    description: '7 महीना के गर्भवती, बीपी 150/100, गोड़ में सूजन (प्री-एक्लेम्पसिया खतरा).'
  },
  {
    id: 'demo-aarav-bho',
    title: 'आरव कुमार (15 दिन के नवजात - तेज बुखार)',
    patientName: 'आरव कुमार',
    category: 'newborn',
    language: 'bho',
    transcript: 'आरव, 15 दिन के नवजात लइका ह, बुखार 101.5 बा, दूध नइखे पीयत।',
    simulatedAudioDurationSec: 4,
    expectedRisk: 'danger',
    description: '15 दिन के नवजात शिशु, 101.5°F तेज बुखार, दूध नइखे पीयत (खतरा बा).'
  },
  {
    id: 'demo-meena-bho',
    title: 'मीना कुमारी (3 बरीस के लइकी - सामान्य जांच)',
    patientName: 'मीना कुमारी',
    category: 'child',
    language: 'bho',
    transcript: 'मीना, 3 बरीस के लइकी बिया, वजन 14 किलो बा, बुखार नइखे, सब ठीक बा।',
    simulatedAudioDurationSec: 4,
    expectedRisk: 'normal',
    description: '3 बरीस के लइकी, 14 किलो वजन, सब जांच सामान्य बा.'
  }
];

export function getDemoCasesForLanguage(lang: LanguageCode): DemoCase[] {
  const matches = DEMO_CASES.filter((c) => c.language === lang);
  if (matches.length > 0) return matches;
  // Fallback to English, then Hindi
  const enMatches = DEMO_CASES.filter((c) => c.language === 'en');
  return enMatches.length > 0 ? enMatches : DEMO_CASES;
}
