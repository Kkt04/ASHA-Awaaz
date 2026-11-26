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
    <div className="bg-white rounded-2xl shadow-card border border-health-mintborder p-5 text-left space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-health-mint text-health-dark flex items-center justify-center font-bold flex-shrink-0">
            <User className="w-5 h-5 text-health-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 leading-tight">
              {data.patient_name || (
                <span className="text-amber-700 italic">{t.nameNotRecorded}</span>
              )}
            </h3>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              {formatCategoryLabel(data.category, language)}
            </span>
          </div>
        </div>

        {/* Engine Badge */}
        <div className="text-right">
          <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
            <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
            {engineUsed === 'groq_llm' ? t.engineLabelGroq : t.engineLabelDeterministic}
          </span>
        </div>
      </div>

      {/* Primary Clinical Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pregnancy Duration / Age */}
        {data.category === 'pregnant_woman' && (
          <div className="bg-surface-warm p-3 rounded-xl border border-gray-200">
            <div className="text-xs font-semibold text-gray-600 flex items-center">
              <Baby className="w-4 h-4 mr-1 text-health-primary" />
              {t.pregnancyMonth}
            </div>
            <div className="text-lg font-bold text-gray-900 mt-1">
              {data.pregnancy_month ? `${data.pregnancy_month} ${t.months}` : t.notRecorded}
            </div>
          </div>
        )}

        {data.category === 'newborn' && (
          <div className="bg-surface-warm p-3 rounded-xl border border-gray-200">
            <div className="text-xs font-semibold text-gray-600 flex items-center">
              <Baby className="w-4 h-4 mr-1 text-health-primary" />
              {t.newbornAgeDays}
            </div>
            <div className="text-lg font-bold text-gray-900 mt-1">
              {data.newborn_age_days != null ? `${data.newborn_age_days} ${t.days}` : t.notRecorded}
            </div>
          </div>
        )}

        {data.category === 'child' && (
          <div className="bg-surface-warm p-3 rounded-xl border border-gray-200">
            <div className="text-xs font-semibold text-gray-600 flex items-center">
              <Baby className="w-4 h-4 mr-1 text-health-primary" />
              {t.childAgeYears}
            </div>
            <div className="text-lg font-bold text-gray-900 mt-1">
              {data.child_age_years != null ? `${data.child_age_years} ${t.years}` : t.notRecorded}
            </div>
          </div>
        )}

        {/* Blood Pressure */}
        <div
          className={`p-3 rounded-xl border ${
            isBpHigh
              ? 'bg-red-50 border-red-300 text-danger-deep'
              : 'bg-surface-warm border-gray-200 text-gray-900'
          }`}
        >
          <div className="text-xs font-semibold text-gray-600 flex items-center">
            <Activity
              className={`w-4 h-4 mr-1 ${isBpHigh ? 'text-red-600' : 'text-health-primary'}`}
            />
            {t.bloodPressure}
          </div>
          <div
            className={`text-lg font-bold mt-1 ${
              isBpHigh ? 'text-red-700' : 'text-gray-900'
            }`}
          >
            {data.vitals?.blood_pressure?.systolic
              ? `${data.vitals.blood_pressure.systolic}/${data.vitals.blood_pressure.diastolic} mmHg`
              : t.notRecorded}
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-surface-warm p-3 rounded-xl border border-gray-200">
          <div className="text-xs font-semibold text-gray-600 flex items-center">
            <Thermometer className="w-4 h-4 mr-1 text-health-primary" />
            {t.temperature}
          </div>
          <div className="text-lg font-bold text-gray-900 mt-1">
            {data.vitals?.temperature_f
              ? `${data.vitals.temperature_f}°F`
              : t.notRecorded}
          </div>
        </div>

        {/* Weight */}
        <div className="bg-surface-warm p-3 rounded-xl border border-gray-200">
          <div className="text-xs font-semibold text-gray-600 flex items-center">
            <Scale className="w-4 h-4 mr-1 text-health-primary" />
            {t.weight}
          </div>
          <div className="text-lg font-bold text-gray-900 mt-1">
            {data.vitals?.weight_kg
              ? `${data.vitals.weight_kg} kg`
              : t.notRecorded}
          </div>
        </div>
      </div>

      {/* Symptoms list */}
      <div className="bg-surface-warm p-3.5 rounded-xl border border-gray-200">
        <div className="text-xs font-semibold text-gray-600 mb-2">
          {t.symptoms}:
        </div>
        {data.symptoms && data.symptoms.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {data.symptoms.map((sym, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300"
              >
                ⚠️ {formatSymptomLabel(sym, language)}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-600">{t.noSpecificSymptoms}</span>
        )}
      </div>

      {/* Medicines list */}
      <div className="bg-surface-warm p-3.5 rounded-xl border border-gray-200">
        <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center">
          <Pill className="w-4 h-4 mr-1 text-health-primary" />
          {t.medicines}:
        </div>
        {data.medicines && data.medicines.length > 0 ? (
          <div className="space-y-1.5">
            {data.medicines.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs font-semibold p-1.5 bg-white rounded-lg border border-gray-200"
              >
                <span>
                  {formatMedicineLabel(m.name, language)}
                </span>
                {m.status === 'missed' ? (
                  <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded flex items-center">
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    {t.missed}
                  </span>
                ) : (
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {t.taken}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-600">{t.notRecorded}</span>
        )}
      </div>

      {/* Original Transcript audit */}
      <div className="pt-2 text-xs text-gray-500 border-t border-gray-100 italic">
        "{data.original_transcript}"
      </div>
    </div>
  );
};
