import React from 'react';
import { AlertOctagon, PhoneCall, Ambulance, AlertCircle } from 'lucide-react';
import { RiskEvaluation, LanguageCode } from '../types';
import { getTranslation } from '../utils/translations';

interface RiskBannerProps {
  risk: RiskEvaluation;
  language: LanguageCode;
}

export const RiskBanner: React.FC<RiskBannerProps> = ({ risk, language }) => {
  const t = getTranslation(language);

  if (!risk.is_high_risk) {
    return (
      <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-left flex items-start space-x-3">
        <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center flex-shrink-0 font-bold mt-0.5">
          ✓
        </div>
        <div>
          <h4 className="font-bold text-emerald-900 text-base">
            सामान्य स्थिति (No High-Risk Danger Signs)
          </h4>
          <p className="text-xs text-emerald-800 mt-0.5">
            प्रोटोटाइप नैदानिक नियमों के अनुसार कोई गंभीर खतरे का संकेत नहीं मिला। नियमित फॉलो-अप जारी रखें।
          </p>
        </div>
      </div>
    );
  }

  const anmPhone = risk.call_anm_phone || '+91 98765 43210';

  return (
    <div className="bg-danger-light border-2 border-danger-primary rounded-2xl p-5 text-left space-y-4 danger-ring">
      {/* Danger Header */}
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-xl bg-danger-primary text-white flex items-center justify-center flex-shrink-0 shadow-md">
          <AlertOctagon className="w-7 h-7 stroke-[2.5]" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-danger-deep leading-tight">
            {t.dangerTitle}
          </h3>
          <p className="text-sm font-bold text-red-900 mt-0.5">
            {risk.emergency_action || t.dangerSub}
          </p>
        </div>
      </div>

      {/* Specific Danger Signs Triggered */}
      <div className="bg-white/80 rounded-xl p-3 border border-red-200 space-y-2">
        <div className="text-xs font-bold text-red-950 uppercase tracking-wide">
          पहचाने गए खतरे के संकेत:
        </div>
        <ul className="space-y-1.5">
          {risk.danger_flags.map((flag, idx) => (
            <li
              key={idx}
              className="text-sm font-bold text-danger-deep flex items-start space-x-2"
            >
              <span className="text-red-600 font-extrabold mt-0.5">⚠️</span>
              <span>{language === 'ta' ? flag.message_ta : flag.message_hi}</span>
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
          <span>108 एम्बुलेंस</span>
        </a>
      </div>

      {/* Clinical Protocol Disclaimer */}
      <div className="flex items-center space-x-1.5 text-[11px] text-red-800 pt-1">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          निर्णय समर्थन प्रणाली: यह क्लिनिकल प्रोटोकॉल पर आधारित सहायता है, डॉक्टर का विकल्प नहीं।
        </span>
      </div>
    </div>
  );
};
