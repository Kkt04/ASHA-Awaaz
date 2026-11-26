import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES, getTranslation } from '../i18n';
import { voiceSynthesizer } from '../services/speechSynthesis';

interface LanguageDropdownProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  currentLanguage,
  onLanguageChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = getTranslation(currentLanguage);

  // Close dropdown when tapping outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSelect = (lang: LanguageCode) => {
    if (lang === currentLanguage) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    onLanguageChange(lang);

    // Speak a single confirmation in the selected language
    let confirmMsg = 'Language set to English.';
    if (lang === 'hi') confirmMsg = 'भाषा हिंदी चुनी गई।';
    else if (lang === 'ta') confirmMsg = 'மொழி தமிழ் தேர்ந்தெடுக்கப்பட்டது.';
    else if (lang === 'bho') confirmMsg = 'भोजपुरी भाषा चुनल गइल।';

    voiceSynthesizer.speak(confirmMsg, lang);
  };

  const currentOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="touch-target min-h-[44px] flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white font-bold text-xs border border-white/25 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-300"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={t.switchLanguage}
      >
        <Globe className="w-4 h-4 text-emerald-200 flex-shrink-0" />
        <span className="font-extrabold tracking-wide">
          {currentOption.nativeLabel}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/80 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-1.5 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {t.switchLanguage} / भाषा चुनें
          </div>

          <div className="py-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLanguage;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-sm transition-colors touch-target ${
                    isSelected
                      ? 'bg-emerald-50 text-health-dark font-black'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100 font-medium'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{lang.nativeLabel}</span>
                      <span className="text-xs text-gray-500 font-normal">
                        ({lang.label})
                      </span>
                    </div>
                    {lang.speechEngineNote && (
                      <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {lang.speechEngineNote}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-health-primary text-white flex items-center justify-center flex-shrink-0 ml-2">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
