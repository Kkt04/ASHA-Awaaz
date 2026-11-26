import React from 'react';
import { AlertOctagon, PhoneCall, Ambulance, AlertCircle } from 'lucide-react';
import { RiskEvaluation, LanguageCode } from '../types';
import { getTranslation } from '../i18n';

interface RiskBannerProps {
  risk: RiskEvaluation;
  language: LanguageCode;
}

export const RiskBanner: React.FC<RiskBannerProps> = ({ risk, language }) => {
  const t = getTranslation(language);

  if (!risk.is_high_risk) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 text-left flex items-start space-x-3">
        <div className="w-8 h-8 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-center justify-center flex-shrink-0 font-bold mt-0.5">
          ✓
        </div>
        <div>
          <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-base">
            {t.normalStatusTitle}
          </h4>
          <p className="text-xs text-emerald-800 dark:text-emerald-300/80 mt-0.5">
            {t.normalStatusDesc}
          </p>
        </div>
      </div>
    );
  }

  const anmPhone = risk.call_anm_phone || '+91 98765 43210';

  const getFlagMessage = (flag: any) => {
    if (language === 'ta') return flag.message_ta || flag.message_en;
    if (language === 'hi' || language === 'bho') return flag.message_hi || flag.message_en;
    return flag.message_en;
  };

  return (
    <div className="bg-danger-light dark:bg-red-950/50 border-2 border-danger-primary dark:border-red-600 rounded-2xl p-5 text-left space-y-4 danger-ring">
      {/* Danger Header */}
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-xl bg-danger-primary text-white flex items-center justify-center flex-shrink-0 shadow-md">
          <AlertOctagon className="w-7 h-7 stroke-[2.5]" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-danger-deep dark:text-red-200 leading-tight">
            {t.dangerTitle}
          </h3>
          <p className="text-sm font-bold text-red-900 dark:text-red-300 mt-0.5">
            {t.dangerSub}
          </p>
        </div>
      </div>

      {/* Specific Danger Signs Triggered */}
      <div className="bg-white/80 dark:bg-dark-card rounded-xl p-3 border border-red-200 dark:border-red-900/60 space-y-2">
        <div className="text-xs font-bold text-red-950 dark:text-red-300 uppercase tracking-wide">
          {t.identifiedDangerSigns}
        </div>
        <ul className="space-y-1.5">
          {risk.danger_flags.map((flag, idx) => (
            <li
              key={idx}
              className="text-sm font-bold text-danger-deep dark:text-red-300 flex items-start space-x-2"
            >
              <span className="text-red-600 dark:text-red-400 font-extrabold mt-0.5">⚠️</span>
              <span>{getFlagMessage(flag)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Emergency Action Buttons (min 48px touch targets) */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <a
          href={`tel:${anmPhone}`}
          className="touch-target min-h-[50px] bg-danger-deep hover:bg-danger-primary active:scale-[0.98] transition-all text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 text-sm"
        >
          <PhoneCall className="w-4 h-4 fill-current" />
          <span>{t.callAnm}</span>
        </a>

        <a
          href="tel:108"
          className="touch-target min-h-[50px] bg-red-800 hover:bg-red-900 active:scale-[0.98] transition-all text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 text-sm"
        >
          <Ambulance className="w-4 h-4" />
          <span>{t.emergency108}</span>
        </a>
      </div>

      {/* Clinical Protocol Disclaimer */}
      <div className="flex items-center space-x-1.5 text-[11px] text-red-800 pt-1">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{t.disclaimer}</span>
      </div>
    </div>
  );
};
