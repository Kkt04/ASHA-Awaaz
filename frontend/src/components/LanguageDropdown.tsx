import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES, getTranslation } from '../i18n';
import { voiceSynthesizer } from '../services/speechSynthesis';

interface LanguageDropdownProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  variant?: 'header' | 'surface';
  className?: string;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  currentLanguage,
  onLanguageChange,
  variant = 'surface',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = getTranslation(currentLanguage);

  // Close dropdown when tapping outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelect = (lang: LanguageCode) => {
    if (lang === currentLanguage) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    onLanguageChange(lang);

    // Speak a single confirmation in the newly selected language
    let confirmMsg = 'Language set to English.';
    if (lang === 'hi') confirmMsg = 'भाषा हिंदी चुनी गई।';
    else if (lang === 'ta') confirmMsg = 'மொழி தமிழ் தேர்ந்தெடுக்கப்பட்டது.';
    else if (lang === 'bho') confirmMsg = 'भोजपुरी भाषा चुनल गइल।';

    voiceSynthesizer.speak(confirmMsg, lang);
  };

  const currentOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  // Trigger button styling based on container variant
  const triggerClasses =
    variant === 'header'
      ? 'bg-emerald-900/80 hover:bg-emerald-800 text-white border-emerald-700/80 dark:bg-dark-card dark:hover:bg-dark-surface dark:text-dark-text dark:border-dark-border shadow-sm'
      : 'bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-900 border-gray-300 dark:bg-dark-card dark:hover:bg-dark-surface dark:active:bg-dark-surface/90 dark:text-dark-text dark:border-dark-border shadow-sm';

  const globeIconClasses =
    variant === 'header'
      ? 'text-emerald-300 dark:text-emerald-400'
      : 'text-health-dark dark:text-emerald-400';

  const chevronClasses =
    variant === 'header'
      ? 'text-white/80 dark:text-dark-muted'
      : 'text-gray-600 dark:text-dark-muted';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`touch-target min-h-[44px] flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-health-primary dark:focus:ring-emerald-400 ${triggerClasses}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={t.switchLanguage}
      >
        <Globe className={`w-4 h-4 flex-shrink-0 ${globeIconClasses}`} />
        <span className="font-extrabold tracking-wide">
          {currentOption.nativeLabel}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${chevronClasses} ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-dark-card shadow-2xl dark:shadow-darkcard border border-gray-200 dark:border-dark-border py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header Section */}
          <div className="px-3.5 py-1.5 border-b border-gray-100 dark:border-dark-border text-[11px] font-bold text-gray-500 dark:text-dark-muted uppercase tracking-wider">
            {t.switchLanguage} / भाषा चुनें
          </div>

          {/* Language Options List */}
          <div className="py-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLanguage;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  role="menuitem"
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-sm transition-colors touch-target focus:outline-none focus:bg-gray-100 dark:focus:bg-dark-surface ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-health-dark dark:text-emerald-300 font-black'
                      : 'text-gray-900 dark:text-dark-text hover:bg-gray-100/70 dark:hover:bg-dark-surface active:bg-gray-100 dark:active:bg-dark-surface font-medium'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="text-base text-gray-900 dark:text-white font-bold">
                        {lang.nativeLabel}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-dark-muted font-normal">
                        ({lang.label})
                      </span>
                    </div>
                    {lang.speechEngineNote && (
                      <span className="text-[10px] text-gray-500 dark:text-dark-muted/80 font-mono mt-0.5">
                        {lang.speechEngineNote}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-health-primary dark:bg-emerald-500 text-white dark:text-dark-bg flex items-center justify-center flex-shrink-0 ml-2 shadow-sm">
                      <Check className="w-3.5 h-3.5 stroke-[3] text-white dark:text-dark-bg" />
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
