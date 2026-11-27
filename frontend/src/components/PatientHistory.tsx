import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Mic, 
  Calendar, 
  ChevronRight, 
  ArrowLeft,
  User
} from 'lucide-react';
import { LocalVisitRecord, LanguageCode } from '../types';
import { db } from '../db/dexie';
import { authService } from '../services/auth';
import { getTranslation, formatSymptomLabel } from '../i18n';
import { speechRecognitionManager } from '../services/speechRecognition';
import { voiceSynthesizer } from '../services/speechSynthesis';

interface PatientHistoryProps {
  language: LanguageCode;
  workerId?: string;
  onBack: () => void;
  onSelectVisit?: (visit: LocalVisitRecord) => void;
  initialFilter?: string;
  initialVisitId?: string;
}

export const PatientHistory: React.FC<PatientHistoryProps> = ({
  language,
  workerId,
  onBack,
  onSelectVisit,
  initialFilter = 'all',
  initialVisitId,
}) => {
  const [visits, setVisits] = useState<LocalVisitRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>(initialFilter);
  const [isVoiceSearching, setIsVoiceSearching] = useState<boolean>(false);
  const [selectedVisit, setSelectedVisit] = useState<LocalVisitRecord | null>(null);

  const t = getTranslation(language);
  const activeWorkerId = workerId || authService.getUser()?.worker_id || 'ASHA_WORKER_001';

  useEffect(() => {
    loadVisits();
  }, [activeWorkerId]);

  const loadVisits = async () => {
    // Strictly isolate patient history to the authenticated health worker
    const list = await db.visits
      .where('worker_id')
      .equals(activeWorkerId)
      .reverse()
      .sortBy('created_at');
    setVisits(list);

    if (initialVisitId) {
      const match = list.find((v) => v.visit_id === initialVisitId);
      if (match) setSelectedVisit(match);
    }
  };

  const handleVoiceSearch = () => {
    if (!speechRecognitionManager.isSupported()) return;

    if (isVoiceSearching) {
      speechRecognitionManager.stop();
      setIsVoiceSearching(false);
      return;
    }

    setIsVoiceSearching(true);
    const searchPrompt =
      language === 'en'
        ? 'Please speak the patient name.'
        : language === 'ta'
        ? 'நோயாளி பெயரை கூறவும்.'
        : language === 'bho'
        ? 'मरीज के नाम बोलीं।'
        : 'मरीज़ का नाम बोलिए।';

    voiceSynthesizer.speak(searchPrompt, language, () => {
      speechRecognitionManager.start(language, {
        onTranscriptChange: (text, isFinal) => {
          // Clean common auxiliary search phrases
          const clean = text
            .replace(/(ka\s*record\s*dikhao|ka\s*parcha|ki\s*history|dikhao|dekho|show\s*record\s*of|search|find)/gi, '')
            .trim();
          setSearchTerm(clean);
          if (isFinal) {
            speechRecognitionManager.stop();
            setIsVoiceSearching(false);
          }
        },
        onError: () => {
          setIsVoiceSearching(false);
        },
      });
    });
  };

  const filteredVisits = visits.filter((v) => {
    const matchesSearch =
      searchTerm === '' ||
      v.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.original_transcript.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      filterCategory === 'all' ||
      (filterCategory === 'danger' && v.risk_evaluation?.is_high_risk) ||
      (filterCategory === 'pregnant' && v.structured_data?.category === 'pregnant_woman') ||
      (filterCategory === 'newborn' && v.structured_data?.category === 'newborn');

    return matchesSearch && matchesCategory;
  });

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const locale =
        language === 'ta'
          ? 'ta-IN'
          : language === 'en'
          ? 'en-IN'
          : 'hi-IN';
      return d.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  if (selectedVisit) {
    const isDanger = selectedVisit.risk_evaluation?.is_high_risk;
    const vData = selectedVisit.structured_data;

    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Back Button */}
        <button
          onClick={() => setSelectedVisit(null)}
          className="flex items-center space-x-2 text-health-dark font-bold hover:underline touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t.backToList}</span>
        </button>

        {/* Visit Details Card */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card dark:shadow-darkcard border border-health-mintborder dark:border-dark-border text-left space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-dark-border">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedVisit.patient_name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-dark-muted">
                {t.visitDate}: {formatDate(selectedVisit.created_at)}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isDanger
                  ? 'bg-red-100 dark:bg-red-950/80 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
              }`}
            >
              {isDanger ? `⚠️ ${t.highRiskCases}` : `✓ ${t.normalStatusTitle}`}
            </span>
          </div>

          {/* Vitals Summary */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-surface-warm dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
              <span className="text-gray-500 dark:text-dark-muted block">{t.bloodPressure}:</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm">
                {vData.vitals?.blood_pressure?.systolic
                  ? `${vData.vitals.blood_pressure.systolic}/${vData.vitals.blood_pressure.diastolic}`
                  : t.notRecorded}
              </span>
            </div>
            <div className="p-2 bg-surface-warm dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
              <span className="text-gray-500 dark:text-dark-muted block">{t.temperature}:</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm">
                {vData.vitals?.temperature_f
                  ? `${vData.vitals.temperature_f}°F`
                  : t.notRecorded}
              </span>
            </div>
          </div>

          {/* Symptoms */}
          <div className="text-xs">
            <span className="text-gray-500 dark:text-dark-muted block mb-1">{t.symptoms}:</span>
            <div className="flex flex-wrap gap-1">
              {vData.symptoms && vData.symptoms.length > 0 ? (
                vData.symptoms.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 rounded font-semibold border border-amber-300 dark:border-amber-800"
                  >
                    {formatSymptomLabel(s, language)}
                  </span>
                ))
              ) : (
                <span className="text-gray-600 dark:text-dark-muted">{t.noSpecificSymptoms}</span>
              )}
            </div>
          </div>

          {/* Original Transcript */}
          <div className="text-xs text-gray-600 dark:text-gray-300 bg-surface-warm dark:bg-dark-surface p-3 rounded-lg border border-gray-200 dark:border-dark-border italic">
            "{selectedVisit.original_transcript}"
          </div>

          {/* Sync Status */}
          <div className="pt-2 flex items-center justify-between text-xs text-gray-500 dark:text-dark-muted border-t border-gray-100 dark:border-dark-border">
            <span>{t.syncStatusLabel}</span>
            <span
              className={`font-bold ${
                selectedVisit.sync_status === 'synced'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {selectedVisit.sync_status === 'synced'
                ? t.syncStatusCloud
                : t.syncStatusPending}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 text-left">
      {/* Top Header & Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 text-health-dark dark:text-emerald-400 font-bold hover:underline touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t.backToHome}</span>
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {t.patientHistory} ({visits.length})
        </h2>
      </div>

      {/* Search Input with Voice Search Button */}
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchPatientVoice}
            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-health-primary text-gray-900 dark:text-white outline-none touch-target"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
        </div>

        <button
          onClick={handleVoiceSearch}
          className={`touch-target px-3 py-2.5 rounded-xl font-bold flex items-center space-x-1 shadow-sm transition-all ${
            isVoiceSearching
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-health-mint dark:bg-emerald-950 text-health-dark dark:text-emerald-300 hover:bg-health-mintborder'
          }`}
          title="Search by Voice"
        >
          <Mic className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex space-x-1.5 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-lg border touch-target ${
            filterCategory === 'all'
              ? 'bg-health-dark text-white border-health-dark'
              : 'bg-white dark:bg-dark-card text-gray-700 dark:text-dark-muted border-gray-200 dark:border-dark-border'
          }`}
        >
          {t.allFilter}
        </button>
        <button
          onClick={() => setFilterCategory('danger')}
          className={`px-3 py-1.5 rounded-lg border touch-target ${
            filterCategory === 'danger'
              ? 'bg-danger-primary text-white border-danger-primary'
              : 'bg-white dark:bg-dark-card text-red-700 dark:text-red-400 border-red-200 dark:border-red-900'
          }`}
        >
          {t.dangerFilter}
        </button>
        <button
          onClick={() => setFilterCategory('pregnant')}
          className={`px-3 py-1.5 rounded-lg border touch-target ${
            filterCategory === 'pregnant'
              ? 'bg-health-dark text-white border-health-dark'
              : 'bg-white dark:bg-dark-card text-gray-700 dark:text-dark-muted border-gray-200 dark:border-dark-border'
          }`}
        >
          {t.pregnantFilter}
        </button>
        <button
          onClick={() => setFilterCategory('newborn')}
          className={`px-3 py-1.5 rounded-lg border touch-target ${
            filterCategory === 'newborn'
              ? 'bg-health-dark text-white border-health-dark'
              : 'bg-white dark:bg-dark-card text-gray-700 dark:text-dark-muted border-gray-200 dark:border-dark-border'
          }`}
        >
          {t.newbornFilter}
        </button>
      </div>

      {/* Timeline Visit List */}
      <div className="space-y-2.5">
        {filteredVisits.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-dark-muted bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border">
            <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="font-medium text-sm">{t.noRecordsFound}</p>
          </div>
        ) : (
          filteredVisits.map((v) => {
            const isDanger = v.risk_evaluation?.is_high_risk;
            return (
              <button
                key={v.visit_id}
                onClick={() => setSelectedVisit(v)}
                className={`w-full text-left p-4 rounded-2xl bg-white dark:bg-dark-card border transition-all shadow-card dark:shadow-darkcard flex items-center justify-between touch-target ${
                  isDanger
                    ? 'border-red-300 dark:border-red-900 hover:border-red-500 bg-red-50/30 dark:bg-red-950/20'
                    : 'border-health-mintborder dark:border-dark-border hover:border-health-primary'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0 mt-0.5 ${
                      isDanger
                        ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                        : 'bg-health-mint dark:bg-emerald-950 text-health-dark dark:text-emerald-300'
                    }`}
                  >
                    {isDanger ? '⚠️' : '✓'}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                      {v.patient_name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-dark-muted mt-0.5 flex items-center">
                      <Calendar className="w-3 h-3 mr-1 inline" />
                      {formatDate(v.created_at)}
                    </p>
                    <p className="text-xs text-gray-700 dark:text-dark-muted mt-1 line-clamp-1 italic">
                      "{v.original_transcript}"
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
