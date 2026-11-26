import React from 'react';
import { LanguageCode } from '../types';
import { voiceSynthesizer } from '../services/speechSynthesis';
import { HeartPulse, Check } from 'lucide-react';

interface LanguageSelectorProps {
  onSelectLanguage: (lang: LanguageCode) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onSelectLanguage }) => {
  const handleSelect = (lang: LanguageCode) => {
    onSelectLanguage(lang);
    if (lang === 'hi') {
      voiceSynthesizer.speak('नमस्ते! आशा आवाज़ में आपका स्वागत है।', 'hi');
    } else if (lang === 'ta') {
      voiceSynthesizer.speak('வணக்கம்! ஆஷா அவாஸ்-க்கு வரவேற்கிறோம்.', 'ta');
    } else {
      voiceSynthesizer.speak('Welcome to ASHA Awaaz. Voice-first healthcare register.', 'en');
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
      <div className="w-20 h-20 rounded-full bg-health-mint border-4 border-health-primary flex items-center justify-center text-health-primary mb-6 shadow-md">
        <HeartPulse className="w-10 h-10 stroke-[2.5]" />
      </div>

      <h1 className="text-3xl font-extrabold text-health-dark mb-1 tracking-tight">
        ASHA Awaaz
      </h1>
      <p className="text-lg font-bold text-health-primary mb-1">
        आशा आवाज़ • ஆஷா அவாஸ்
      </p>
      <p className="text-xs text-gray-600 mb-6 max-w-xs">
        Please select your language / भाषा चुनें / மொழியைத் தேர்ந்தெடுக்கவும்
      </p>

      {/* Three Large Language Buttons */}
      <div className="w-full space-y-3.5">
        <button
          onClick={() => handleSelect('hi')}
          className="w-full touch-target min-h-[68px] bg-white border-2 border-health-primary hover:border-health-dark active:scale-[0.98] transition-all rounded-2xl shadow-card flex items-center justify-between px-5 py-3.5 text-left group"
        >
          <div>
            <div className="text-2xl font-bold text-health-dark group-hover:text-health-primary">
              हिन्दी (Hindi)
            </div>
            <div className="text-xs font-medium text-gray-500">
              बोलकर विज़िट दर्ज करें
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-health-mint text-health-primary flex items-center justify-center font-bold text-base">
            अ
          </div>
        </button>

        <button
          onClick={() => handleSelect('ta')}
          className="w-full touch-target min-h-[68px] bg-white border-2 border-emerald-700 hover:border-emerald-900 active:scale-[0.98] transition-all rounded-2xl shadow-card flex items-center justify-between px-5 py-3.5 text-left group"
        >
          <div>
            <div className="text-2xl font-bold text-emerald-900 group-hover:text-emerald-700">
              தமிழ் (Tamil)
            </div>
            <div className="text-xs font-medium text-gray-500">
              குரல் வழி சுகாதார பதிவு
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base">
            அ
          </div>
        </button>

        <button
          onClick={() => handleSelect('en')}
          className="w-full touch-target min-h-[68px] bg-white border-2 border-blue-600 hover:border-blue-800 active:scale-[0.98] transition-all rounded-2xl shadow-card flex items-center justify-between px-5 py-3.5 text-left group"
        >
          <div>
            <div className="text-2xl font-bold text-blue-900 group-hover:text-blue-700">
              English
            </div>
            <div className="text-xs font-medium text-gray-500">
              Voice-First Health Register
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center font-bold text-base">
            En
          </div>
        </button>
      </div>

      <div className="mt-8 text-xs text-gray-500 bg-surface-muted/60 px-4 py-2 rounded-full">
        Wispr Flow Build for Bharat Hackathon Prototype
      </div>
    </div>
  );
};
