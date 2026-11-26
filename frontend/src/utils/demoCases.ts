export interface DemoCase {
  id: string;
  title: string;
  patientName: string;
  category: string;
  language: 'hi' | 'ta';
  transcript: string;
  simulatedAudioDurationSec: number;
  expectedRisk: 'danger' | 'normal';
  description: string;
}

export const DEMO_CASES: DemoCase[] = [
  {
    id: 'demo-sunita',
    title: 'सुनीता देवी (गर्भवती - हाई रिस्क BP)',
    patientName: 'Sunita Devi',
    category: 'pregnant_woman',
    language: 'hi',
    transcript: 'Sunita, 7 mahine ki pregnant hai, BP 150 by 100 hai, pairon mein sujan hai aur iron ki goli nahi li.',
    simulatedAudioDurationSec: 5,
    expectedRisk: 'danger',
    description: '7-महीने की गर्भवती, बीपी 150/100, पैरों में सूजन (प्री-एक्लेम्पसिया खतरा).'
  },
  {
    id: 'demo-aarav',
    title: 'आरव (15 दिन का नवजात - तेज बुखार)',
    patientName: 'Aarav Kumar',
    category: 'newborn',
    language: 'hi',
    transcript: 'Aarav, 15 din ka navjat shishu hai, bukhar 101.5 hai, doodh nahi pee raha.',
    simulatedAudioDurationSec: 4,
    expectedRisk: 'danger',
    description: '15 दिन का नवजात शिशु, 101.5°F तेज बुखार, दूध नहीं पी रहा (संक्रमण का खतरा).'
  },
  {
    id: 'demo-meena',
    title: 'मीना (3 वर्ष बच्ची - सामान्य रूटीन विज़िट)',
    patientName: 'Meena Kumari',
    category: 'child',
    language: 'hi',
    transcript: 'Meena, 3 saal ki bachi hai, vajan 14 kg hai, bukhar nahi hai, sab theek hai.',
    simulatedAudioDurationSec: 4,
    expectedRisk: 'normal',
    description: '3 वर्ष की बच्ची, 14 किलो वजन, सभी लक्षण सामान्य.'
  },
  {
    id: 'demo-sunita-tamil',
    title: 'சுனிதா (கர்ப்பிணி - உயர் இரத்த அழுத்தம்)',
    patientName: 'சுனிதா',
    category: 'pregnant_woman',
    language: 'ta',
    transcript: 'சுனிதா, 7 மாத கர்ப்பிணி, பிபி 150/100, கால் வீக்கம், அயர்ன் மாத்திரை சாப்பிடவில்லை.',
    simulatedAudioDurationSec: 5,
    expectedRisk: 'danger',
    description: '7 மாத கர்ப்பிணி, பிபி 150/100, கால் வீக்கம் (ப்ரீக்ளாம்சியா அபாயம்).'
  }
];
