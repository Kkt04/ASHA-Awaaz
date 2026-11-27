import React, { useState, useEffect } from 'react';
import { ShieldCheck, Globe2, HeartHandshake, MessageCircle, Play, Pause } from 'lucide-react';
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
  const [convoStep, setConvoStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Conversational Turns definition mapped dynamically to localized strings
  const conversationTurns = [
    {
      id: 'asha-1',
      speaker: 'asha',
      speakerLabel: t.heroConvoSpeakerAsha || 'ASHA Worker',
      text: t.heroConvoAsha1,
      color: 'emerald',
      align: 'left'
    },
    {
      id: 'woman-1',
      speaker: 'woman',
      speakerLabel: t.heroConvoSpeakerWoman || 'Community Member',
      text: t.heroConvoWoman1,
      color: 'amber',
      align: 'right'
    },
    {
      id: 'asha-2',
      speaker: 'asha',
      speakerLabel: t.heroConvoSpeakerAsha || 'ASHA Worker',
      text: t.heroConvoAsha2,
      color: 'emerald',
      align: 'left'
    },
    {
      id: 'woman-2',
      speaker: 'woman',
      speakerLabel: t.heroConvoSpeakerWoman || 'Community Member',
      text: t.heroConvoWoman2,
      color: 'amber',
      align: 'right'
    }
  ];

  // Automatic sequential conversation loop
  useEffect(() => {
    if (variant !== 'landing' || !isPlaying) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const timer = setInterval(() => {
      setConvoStep((prev) => (prev + 1) % conversationTurns.length);
    }, 4200);

    return () => clearInterval(timer);
  }, [variant, isPlaying, conversationTurns.length]);

  const currentTurn = conversationTurns[convoStep] || conversationTurns[0];

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

  // Full prominent landing page illustration with animated conversation
  return (
    <div className={`relative w-full max-w-xl lg:max-w-2xl mx-auto select-none ${className}`}>
      {/* Decorative Soft Warm Ambient Glow (Mint, Sage, Peach, Cream) */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/15 via-amber-300/15 to-teal-400/10 rounded-3xl blur-2xl dark:from-emerald-950/30 dark:via-amber-950/15 dark:to-teal-950/20 pointer-events-none" />

      {/* Main Illustration Card Container */}
      <div className="relative rounded-3xl bg-gradient-to-b from-white/95 via-[#FCFDFB] to-emerald-50/60 dark:from-dark-card dark:via-dark-card dark:to-dark-surface border border-emerald-100/90 dark:border-dark-border p-4 sm:p-6 md:p-7 shadow-elevated dark:shadow-darkcard overflow-hidden backdrop-blur-sm">
        
        {/* Top Header: Clean Community Health Visit Badge & Story Status */}
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-emerald-100/70 dark:border-dark-border">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100/80 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
              <HeartHandshake className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              <span>Community Health Visit</span>
            </span>
          </div>

          {/* Stepper Dots & Play/Pause */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5">
              {conversationTurns.map((turn, idx) => (
                <button
                  key={turn.id}
                  type="button"
                  onClick={() => setConvoStep(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    convoStep === idx
                      ? turn.speaker === 'asha'
                        ? 'bg-emerald-600 w-5'
                        : 'bg-amber-600 w-5'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
                  }`}
                  aria-label={`Go to conversation step ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title={isPlaying ? 'Pause conversation' : 'Play conversation'}
              aria-label={isPlaying ? 'Pause conversation' : 'Play conversation'}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* ================= DYNAMIC SPEECH BUBBLE STAGE ================= */}
        {/* Positioned comfortably above the characters' faces so faces remain completely unobstructed */}
        <div className="min-h-[88px] sm:min-h-[96px] pt-3 pb-1 flex flex-col justify-center">
          <div
            key={`${currentTurn.id}-${language}`}
            className={`w-full max-w-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
              currentTurn.align === 'left' ? 'self-start mr-auto' : 'self-end ml-auto'
            }`}
          >
            <div
              className={`relative rounded-2xl p-3 sm:p-3.5 shadow-sm border transition-colors ${
                currentTurn.speaker === 'asha'
                  ? 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700/80 text-emerald-950 dark:text-emerald-100'
                  : 'bg-amber-50/95 dark:bg-amber-950/90 border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-100'
              }`}
            >
              {/* Speaker Header with Live Icon */}
              <div className="flex items-center justify-between pb-1 gap-2">
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1 ${
                      currentTurn.speaker === 'asha'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-amber-600 text-white shadow-xs'
                    }`}
                  >
                    <span>{currentTurn.speakerLabel}</span>
                  </span>
                </div>

                <span className="text-[10px] font-semibold text-gray-500 dark:text-dark-muted flex items-center">
                  <MessageCircle className="w-3 h-3 mr-1 inline opacity-60" />
                  <span>{convoStep + 1}/4</span>
                </span>
              </div>

              {/* Dynamic Localized Speech Text */}
              <p className="text-xs sm:text-sm font-semibold leading-relaxed pt-0.5">
                "{currentTurn.text}"
              </p>

              {/* Decorative Speech Tail pointing towards the respective speaker */}
              <div
                className={`absolute -bottom-2 w-3.5 h-3.5 transform rotate-45 border-b border-r ${
                  currentTurn.speaker === 'asha'
                    ? 'left-8 sm:left-12 bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700/80'
                    : 'right-8 sm:right-12 bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700/80'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Central Prominent Illustration */}
        <div className="relative pt-1 pb-2 flex flex-col items-center justify-center">
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
                className="w-full max-h-[300px] sm:max-h-[350px] object-contain drop-shadow-md transition-transform duration-300 hover:scale-[1.01]"
                loading="eager"
                width={540}
                height={360}
              />
            </picture>
          </div>

          {/* Subtitle Caption Reassuring Friendly Personal Interaction */}
          <p className="text-center text-[11px] text-gray-500 dark:text-dark-muted font-medium mt-2 italic">
            Friendly face-to-face community visit — listening, understanding, and supporting families at home.
          </p>
        </div>

        {/* Bottom Capabilities Bar: Accurate, Honest Descriptions */}
        <div className="pt-3 border-t border-emerald-100/70 dark:border-dark-border grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-2 p-2 rounded-xl bg-white/80 dark:bg-dark-surface/60 border border-emerald-100/60 dark:border-dark-border shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-gray-700 dark:text-dark-muted">
              Offline-friendly record keeping
            </span>
          </div>

          <div className="flex items-center space-x-2 p-2 rounded-xl bg-white/80 dark:bg-dark-surface/60 border border-emerald-100/60 dark:border-dark-border shadow-2xs">
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
