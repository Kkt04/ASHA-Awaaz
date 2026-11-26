import React from 'react';
import { 
  User, 
  Activity, 
  Thermometer, 
  Scale, 
  Pill, 
  Baby, 
  Sparkles,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { StructuredVisitData, LanguageCode } from '../types';
import { 
  getTranslation, 
  formatCategoryLabel, 
  formatSymptomLabel, 
  formatMedicineLabel 
} from '../i18n';

interface VisitCardProps {
  data: StructuredVisitData;
  language: LanguageCode;
  engineUsed?: string;
  onEditField?: (field: string) => void;
}

export const VisitCard: React.FC<VisitCardProps> = ({
  data,
  language,
  engineUsed = 'groq_llm',
  onEditField,
}) => {
  const t = getTranslation(language);

  const isBpHigh = Boolean(
    data.vitals?.blood_pressure?.systolic &&
    data.vitals.blood_pressure.systolic >= 140
  );

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-darkcard border border-health-mintborder dark:border-dark-border p-5 text-left space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-dark-border">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-health-mint dark:bg-emerald-950 text-health-dark dark:text-emerald-300 flex items-center justify-center font-bold flex-shrink-0">
            <User className="w-5 h-5 text-health-primary dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {data.patient_name || (
                <span className="text-amber-700 dark:text-amber-400 italic">{t.nameNotRecorded}</span>
              )}
            </h3>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
              {formatCategoryLabel(data.category, language)}
            </span>
          </div>
        </div>

        {/* Engine Badge */}
        <div className="text-right">
          <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
            <Sparkles className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
            {engineUsed === 'groq_llm' ? t.engineLabelGroq : t.engineLabelDeterministic}
          </span>
        </div>
      </div>

      {/* Primary Clinical Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pregnancy Duration / Age */}
        {data.category === 'pregnant_woman' && (
          <div className="bg-surface-warm dark:bg-dark-surface p-3 rounded-xl border border-gray-200 dark:border-dark-border">
            <div className="text-xs font-semibold text-gray-600 dark:text-dark-muted flex items-center">
              <Baby className="w-4 h-4 mr-1 text-health-primary dark:text-emerald-400" />
              {t.pregnancyMonth}
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
              {data.pregnancy_month ? `${data.pregnancy_month} ${t.months}` : t.notRecorded}
            </div>
          </div>
        )}

        {data.category === 'newborn' && (
          <div className="bg-surface-warm dark:bg-dark-surface p-3 rounded-xl border border-gray-200 dark:border-dark-border">
            <div className="text-xs font-semibold text-gray-600 dark:text-dark-muted flex items-center">
              <Baby className="w-4 h-4 mr-1 text-health-primary dark:text-emerald-400" />
              {t.newbornAgeDays}
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
              {data.newborn_age_days != null ? `${data.newborn_age_days} ${t.days}` : t.notRecorded}
            </div>
          </div>
        )}

        {data.category === 'child' && (
          <div className="bg-surface-warm dark:bg-dark-surface p-3 rounded-xl border border-gray-200 dark:border-dark-border">
            <div className="text-xs font-semibold text-gray-600 dark:text-dark-muted flex items-center">
              <Baby className="w-4 h-4 mr-1 text-health-primary dark:text-emerald-400" />
              {t.childAgeYears}
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
              {data.child_age_years != null ? `${data.child_age_years} ${t.years}` : t.notRecorded}
            </div>
          </div>
        )}

        {/* Blood Pressure */}
        <div
          className={`p-3 rounded-xl border ${
            isBpHigh
              ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-900 text-danger-deep dark:text-red-300'
              : 'bg-surface-warm dark:bg-dark-surface border-gray-200 dark:border-dark-border text-gray-900 dark:text-white'
          }`}
        >
          <div className="text-xs font-semibold text-gray-600 dark:text-dark-muted flex items-center">
            <Activity
              className={`w-4 h-4 mr-1 ${isBpHigh ? 'text-red-600 dark:text-red-400' : 'text-health-primary dark:text-emerald-400'}`}
            />
            {t.bloodPressure}
          </div>
          <div
            className={`text-lg font-bold mt-1 ${
              isBpHigh ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'
            }`}
          >
            {data.vitals?.blood_pressure?.systolic
              ? `${data.vitals.blood_pressure.systolic}/${data.vitals.blood_pressure.diastolic} mmHg`
              : t.notRecorded}
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-surface-warm dark:bg-dark-surface p-3 rounded-xl border border-gray-200 dark:border-dark-border">
          <div className="text-xs font-semibold text-gray-600 dark:text-dark-muted flex items-center">
            <Thermometer className="w-4 h-4 mr-1 text-health-primary dark:text-emerald-400" />
            {t.temperature}
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
            {data.vitals?.temperature_f
              ? `${data.vitals.temperature_f}°F`
              : t.notRecorded}
          </div>
        </div>

        {/* Weight */}
        <div className="bg-surface-warm dark:bg-dark-surface p-3 rounded-xl border border-gray-200 dark:border-dark-border">
          <div className="text-xs font-semibold text-gray-600 dark:text-dark-muted flex items-center">
            <Scale className="w-4 h-4 mr-1 text-health-primary dark:text-emerald-400" />
            {t.weight}
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
            {data.vitals?.weight_kg
              ? `${data.vitals.weight_kg} kg`
              : t.notRecorded}
          </div>
        </div>
      </div>

      {/* Symptoms list */}
      <div className="bg-surface-warm dark:bg-dark-surface p-3.5 rounded-xl border border-gray-200 dark:border-dark-border">
        <div className="text-xs font-semibold text-gray-600 dark:text-dark-muted mb-2">
          {t.symptoms}:
        </div>
        {data.symptoms && data.symptoms.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {data.symptoms.map((sym, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
              >
                ⚠️ {formatSymptomLabel(sym, language)}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-600 dark:text-dark-muted">{t.noSpecificSymptoms}</span>
        )}
      </div>

      {/* Medicines list */}
      <div className="bg-surface-warm dark:bg-dark-surface p-3.5 rounded-xl border border-gray-200 dark:border-dark-border">
        <div className="text-xs font-semibold text-gray-600 dark:text-dark-muted mb-2 flex items-center">
          <Pill className="w-4 h-4 mr-1 text-health-primary dark:text-emerald-400" />
          {t.medicines}:
        </div>
        {data.medicines && data.medicines.length > 0 ? (
          <div className="space-y-1.5">
            {data.medicines.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs font-semibold p-1.5 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border"
              >
                <span className="text-gray-900 dark:text-white">
                  {formatMedicineLabel(m.name, language)}
                </span>
                {m.status === 'missed' ? (
                  <span className="text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded flex items-center">
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    {t.missed}
                  </span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {t.taken}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-600 dark:text-dark-muted">{t.notRecorded}</span>
        )}
      </div>

      {/* Original Transcript audit */}
      <div className="pt-2 text-xs text-gray-500 dark:text-dark-muted border-t border-gray-100 dark:border-dark-border italic">
        "{data.original_transcript}"
      </div>
    </div>
  );
};
