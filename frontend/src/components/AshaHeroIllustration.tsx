import React from 'react';
import { ShieldCheck, Activity, Users, Globe2, HeartHandshake } from 'lucide-react';
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

  // Compact variant for dashboard welcome card
  if (variant === 'dashboard') {
    return (
      <div className={`relative rounded-2xl bg-white/70 dark:bg-dark-surface/60 border border-emerald-100 dark:border-dark-border p-2 shadow-sm max-w-[220px] w-full flex flex-col items-center select-none ${className}`}>
        <picture className="w-full flex items-center justify-center">
          <source media="(prefers-reduced-motion: reduce)" srcSet="/assets/asha-healthcare-worker.png" type="image/png" />
          <img
            src="/assets/asha-healthcare-worker.gif"
            alt="ASHA worker visiting a woman for a friendly community health check"
            className="w-full h-auto max-h-[140px] object-contain drop-shadow-sm"
            loading="lazy"
            width={540}
            height={360}
          />
        </picture>
        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 mt-1">
          Community Health Visit
        </span>
      </div>
    );
  }

  // Full prominent landing page illustration
  return (
    <div className={`relative w-full max-w-xl lg:max-w-2xl mx-auto select-none ${className}`}>
      {/* Decorative Soft Warm Ambient Glow (Mint, Sage, Peach, Cream) */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/15 via-amber-300/15 to-teal-400/10 rounded-3xl blur-2xl dark:from-emerald-950/30 dark:via-amber-950/15 dark:to-teal-950/20 pointer-events-none" />

      {/* Main Illustration Card Container */}
      <div className="relative rounded-3xl bg-gradient-to-b from-white/95 via-[#FCFDFB] to-emerald-50/60 dark:from-dark-card dark:via-dark-card dark:to-dark-surface border border-emerald-100/90 dark:border-dark-border p-5 sm:p-7 shadow-elevated dark:shadow-darkcard overflow-hidden backdrop-blur-sm">
        
        {/* Top Header: Clean, Natural Community Care Message */}
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-emerald-100/70 dark:border-dark-border">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100/80 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
              <HeartHandshake className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              <span>Community Health Visit</span>
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span className="px-2.5 py-1 rounded-xl bg-surface-warm dark:bg-dark-surface border border-emerald-100 dark:border-dark-border">
              Friendly Care at Home
            </span>
          </div>
        </div>

        {/* Central Prominent Conversational Illustration */}
        <div className="relative my-3 py-2 flex flex-col items-center justify-center">
          
          <div className="relative w-full flex items-center justify-center">
            <picture className="w-full flex items-center justify-center">
              {/* Reduced-motion accessibility fallback */}
              <source
                media="(prefers-reduced-motion: reduce)"
                srcSet="/assets/asha-healthcare-worker.png"
                type="image/png"
              />
              {/* Subtle conversational animation */}
              <img
                src="/assets/asha-healthcare-worker.gif"
                alt="ASHA community health worker visiting a woman at her home for a friendly conversational health check"
                className="w-full max-h-[340px] sm:max-h-[400px] object-contain drop-shadow-md transition-transform duration-300 hover:scale-[1.01]"
                loading="eager"
                width={540}
                height={360}
              />
            </picture>
          </div>

          {/* Subtitle Caption Reassuring Friendly Personal Interaction */}
          <p className="text-center text-xs text-gray-500 dark:text-dark-muted font-medium mt-3 italic">
            A friendly face-to-face checkup — listening, understanding, and supporting families at home.
          </p>
        </div>

        {/* Bottom Capabilities Bar: Accurate, Non-Exaggerated Descriptions */}
        <div className="pt-3.5 border-t border-emerald-100/70 dark:border-dark-border grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-white/80 dark:bg-dark-surface/60 border border-emerald-100/60 dark:border-dark-border shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-gray-700 dark:text-dark-muted">
              Offline-friendly record keeping
            </span>
          </div>

          <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-white/80 dark:bg-dark-surface/60 border border-emerald-100/60 dark:border-dark-border shadow-2xs">
            <Globe2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-gray-700 dark:text-dark-muted">
              Multilingual voice assistance
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
