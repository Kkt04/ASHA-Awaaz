import React from 'react';
import { Mic, Heart, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { LanguageCode } from '../types';
import { getTranslation } from '../i18n';

interface AshaHeroIllustrationProps {
  language?: LanguageCode;
  className?: string;
}

export const AshaHeroIllustration: React.FC<AshaHeroIllustrationProps> = ({
  language = 'en',
  className = '',
}) => {
  const t = getTranslation(language);

  return (
    <div className={`relative w-full max-w-lg mx-auto select-none ${className}`}>
      {/* Decorative Background Glow */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/20 via-teal-400/10 to-amber-400/10 rounded-3xl blur-2xl dark:from-emerald-900/30 dark:via-teal-800/20 dark:to-emerald-950/20" />

      {/* Main Illustration Container */}
      <div className="relative rounded-3xl bg-gradient-to-b from-white to-emerald-50/50 dark:from-dark-card dark:to-dark-surface border border-emerald-100 dark:border-dark-border p-6 shadow-elevated dark:shadow-darkcard overflow-hidden">
        
        {/* Top Badges / Script Indicator */}
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-emerald-100/70 dark:border-dark-border">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
              <Activity className="w-3.5 h-3.5 mr-1 animate-pulse" />
              {t.heroVisualTag || 'Voice Health Register'}
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            <span>En</span>
            <span>•</span>
            <span>हिं</span>
            <span>•</span>
            <span>த</span>
            <span>•</span>
            <span>भोज</span>
          </div>
        </div>

        {/* Central Graphic Area */}
        <div className="relative my-4 py-3 flex flex-col items-center justify-center">
          
          {/* Animated Audio Soundwaves Waveform */}
          <div className="flex items-center justify-center gap-1.5 mb-5 h-12 w-full px-4">
            <span className="w-1.5 bg-emerald-400 dark:bg-emerald-500 rounded-full h-4 animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full h-8 animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 bg-emerald-600 dark:bg-emerald-300 rounded-full h-11 animate-bounce"></span>
            <span className="w-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full h-9 animate-bounce [animation-delay:-0.2s]"></span>
            <span className="w-1.5 bg-emerald-400 dark:bg-emerald-500 rounded-full h-6 animate-bounce [animation-delay:-0.35s]"></span>
            <span className="w-1.5 bg-emerald-600 dark:bg-emerald-300 rounded-full h-10 animate-bounce [animation-delay:-0.1s]"></span>
            <span className="w-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full h-7 animate-bounce [animation-delay:-0.25s]"></span>
            <span className="w-1.5 bg-emerald-400 dark:bg-emerald-500 rounded-full h-4 animate-bounce [animation-delay:-0.4s]"></span>
          </div>

          {/* Central ASHA Worker & Mobile Register SVG Artwork */}
          <svg
            viewBox="0 0 360 220"
            className="w-full h-auto drop-shadow-sm"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background Rural Village House & Tree contours */}
            <path
              d="M20 180H340"
              stroke="#A7D7B5"
              strokeWidth="2"
              strokeDasharray="4 4"
              className="dark:stroke-emerald-900"
            />
            <path
              d="M30 180V120L70 90L110 120V180"
              stroke="#C8E6C9"
              strokeWidth="2"
              fill="#F4FBF6"
              className="dark:stroke-emerald-900 dark:fill-dark-surface"
            />
            <rect x="55" y="140" width="28" height="40" rx="3" fill="#81C784" className="dark:fill-emerald-800" />
            
            {/* Soft Green Landscape Mound */}
            <ellipse cx="280" cy="190" rx="70" ry="30" fill="#E8F5E9" className="dark:fill-emerald-950/40" />

            {/* Mother and Child Figure (Left) */}
            <g transform="translate(85, 55)">
              {/* Mother head & saree veil */}
              <circle cx="45" cy="35" r="14" fill="#B08968" />
              <path
                d="M32 32C32 20 40 16 52 18C60 20 62 28 62 38C62 55 58 75 58 95H28C28 75 26 50 32 32Z"
                fill="#E65100"
                opacity="0.85"
              />
              <circle cx="50" cy="35" r="2.5" fill="#D84315" /> {/* Bindi */}
              {/* Mother arms cradling baby */}
              <path
                d="M35 55C40 65 52 65 58 55C62 65 58 75 48 78C38 78 32 68 35 55Z"
                fill="#C98B64"
              />
              {/* Baby in lap */}
              <circle cx="47" cy="62" r="9" fill="#D6A284" />
              <path
                d="M40 70C40 65 54 65 54 70C54 76 50 82 47 82C44 82 40 76 40 70Z"
                fill="#FFE082"
              />
            </g>

            {/* ASHA Health Worker Figure (Center-Right) */}
            <g transform="translate(195, 40)">
              {/* ASHA Saree Dupatta / Healthcare Uniform in Deep Green & Soft Mint */}
              <circle cx="50" cy="32" r="15" fill="#A47551" />
              <path
                d="M35 30C35 15 45 10 58 12C68 15 70 25 70 36C70 55 68 85 68 115H28C28 85 28 55 35 30Z"
                fill="#2E7D32"
              />
              {/* Saree Border Accent (Muted Saffron / Teal) */}
              <path
                d="M40 38L62 75"
                stroke="#FFB74D"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* ID Badge on Lanyard */}
              <rect x="44" y="60" width="12" height="15" rx="2" fill="#FFFFFF" stroke="#2E7D32" strokeWidth="1" />
              <line x1="46" y1="64" x2="54" y2="64" stroke="#2E7D32" strokeWidth="1.5" />
              <line x1="46" y1="68" x2="52" y2="68" stroke="#757575" strokeWidth="1" />

              {/* Hand holding Smartphone with glowing screen */}
              <path
                d="M30 65C22 70 12 75 6 78"
                stroke="#A47551"
                strokeWidth="7"
                strokeLinecap="round"
              />
              
              {/* Smartphone device */}
              <rect
                x="-12"
                y="52"
                width="28"
                height="48"
                rx="5"
                fill="#1C2826"
                stroke="#4CAF50"
                strokeWidth="1.5"
                className="dark:stroke-emerald-400"
              />
              {/* Phone screen glowing green */}
              <rect x="-9" y="56" width="22" height="38" rx="3" fill="#E8F5E9" className="dark:fill-emerald-950" />
              {/* Mic pulse ring on phone */}
              <circle cx="2" cy="74" r="7" fill="#2E7D32" className="animate-ping opacity-60" />
              <circle cx="2" cy="74" r="5" fill="#2E7D32" />
            </g>

            {/* Connecting Spoken Soundwave Arc */}
            <path
              d="M140 100 Q 160 85, 185 105"
              stroke="#2E7D32"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="2 3"
              className="dark:stroke-emerald-400"
            />
          </svg>

          {/* Floating Live Clinical Record Card (High-Impact Realistic Preview) */}
          <div className="w-full mt-2 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-200 dark:border-dark-border shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-800 dark:text-emerald-300">
                  <Heart className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {t.heroCardPreviewTitle || 'Sunita Devi (7th Month ANC)'}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-dark-muted font-medium">
                    {t.heroCardPreviewSubtitle || 'BP: 150/100 mmHg • Swelling in feet'}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3 mr-1" />
                IndexedDB
              </span>
            </div>

            {/* Clinical Danger Sign Alert Tag */}
            <div className="mt-2.5 flex items-center gap-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl px-2.5 py-1.5 text-xs text-danger-deep dark:text-red-300 font-semibold">
              <AlertTriangle className="w-4 h-4 text-danger-primary dark:text-red-400 shrink-0" />
              <span className="truncate">
                {t.heroCardPreviewDanger || 'High Risk Alert: Preeclampsia signs detected'}
              </span>
            </div>
          </div>

        </div>

        {/* Bottom Voice Prompt Indicator */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-dark-muted pt-2 border-t border-emerald-100/60 dark:border-dark-border">
          <span className="flex items-center">
            <Mic className="w-3.5 h-3.5 mr-1 text-health-primary" />
            "सुनीता, 7 महीने की प्रेग्नेंट हैं, बीपी 150/100..."
          </span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            0 Typing Required
          </span>
        </div>

      </div>
    </div>
  );
};
