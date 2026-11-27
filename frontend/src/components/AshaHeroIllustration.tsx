import React from 'react';
import { ShieldCheck, Activity, Heart, Sparkles } from 'lucide-react';
import { LanguageCode } from '../types';
import { getTranslation } from '../i18n';

interface AshaHeroIllustrationProps {
  language?: LanguageCode;
  className?: string;
  variant?: 'landing' | 'compact' | 'dashboard';
}

export const AshaHeroIllustration: React.FC<AshaHeroIllustrationProps> = ({
  language = 'en',
  className = '',
  variant = 'landing'
}) => {
  const t = getTranslation(language);

  return (
    <div className={`relative w-full max-w-lg mx-auto select-none ${className}`}>
      {/* Decorative Warm Ambient Glow */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/20 via-amber-400/15 to-teal-400/10 rounded-3xl blur-2xl dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-teal-950/20 pointer-events-none" />

      {/* Main Container */}
      <div className="relative rounded-3xl bg-gradient-to-b from-white/95 to-emerald-50/70 dark:from-dark-card dark:to-dark-surface border border-emerald-100 dark:border-dark-border p-5 sm:p-6 shadow-elevated dark:shadow-darkcard overflow-hidden backdrop-blur-sm">
        
        {/* Top Badges Header */}
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-emerald-100/70 dark:border-dark-border">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
              <Activity className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span>{t.heroVisualTag || 'Community Health Visit'}</span>
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/60 dark:border-emerald-900">
              Maternal & Child Care
            </span>
          </div>
        </div>

        {/* Central Animated Illustration Area */}
        <div className="relative my-2 py-2 flex flex-col items-center justify-center">
          
          {/* Picture with Motion Preferences Fallback */}
          <div className="relative w-full flex items-center justify-center">
            <picture className="w-full flex items-center justify-center">
              {/* If user prefers reduced motion, show high-res static PNG */}
              <source
                media="(prefers-reduced-motion: reduce)"
                srcSet="/assets/asha-healthcare-worker.png"
                type="image/png"
              />
              {/* Default: Smooth animated GIF */}
              <img
                src="/assets/asha-healthcare-worker.gif"
                alt="Friendly ASHA community health worker reviewing maternal health records and interacting with an expectant mother"
                className="w-full max-h-[300px] sm:max-h-[340px] object-contain drop-shadow-md transition-transform duration-300 hover:scale-[1.02]"
                loading="eager"
                width={512}
                height={348}
              />
            </picture>

            {/* Subtle Floating Interactive Pill 1: ANC Checkup */}
            <div className="absolute top-2 left-0 sm:left-2 bg-white/90 dark:bg-dark-card/90 backdrop-blur-md rounded-2xl py-1.5 px-3 border border-emerald-200 dark:border-emerald-800 shadow-sm flex items-center space-x-2 text-xs font-bold text-gray-800 dark:text-white animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
              <span>ANC Checkup</span>
            </div>

            {/* Subtle Floating Interactive Pill 2: Voice Register */}
            <div className="absolute bottom-2 right-0 sm:right-2 bg-white/90 dark:bg-dark-card/90 backdrop-blur-md rounded-2xl py-1.5 px-3 border border-amber-200 dark:border-amber-800 shadow-sm flex items-center space-x-2 text-xs font-bold text-amber-900 dark:text-amber-300 animate-in fade-in">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Voice-to-Record</span>
            </div>
          </div>
        </div>

        {/* Bottom Feature Highlights Bar */}
        <div className="pt-3 border-t border-emerald-100/70 dark:border-dark-border grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-2 p-2 rounded-xl bg-white/80 dark:bg-dark-surface/60 border border-emerald-100/60 dark:border-dark-border">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-gray-700 dark:text-dark-muted">
              100% Offline Capable
            </span>
          </div>

          <div className="flex items-center space-x-2 p-2 rounded-xl bg-white/80 dark:bg-dark-surface/60 border border-emerald-100/60 dark:border-dark-border">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold text-gray-700 dark:text-dark-muted">
              4 Regional Languages
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
