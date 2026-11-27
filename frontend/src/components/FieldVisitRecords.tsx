import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Mic, 
  Calendar, 
  ChevronRight, 
  ArrowLeft, 
  Home, 
  PhoneCall, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Activity, 
  Cloud, 
  RefreshCw, 
  Heart, 
  Baby, 
  User, 
  Clock, 
  CheckCheck,
  ShieldAlert
} from 'lucide-react';
import { LocalVisitRecord, LanguageCode } from '../types';
import { db } from '../db/dexie';
import { authService } from '../services/auth';
import { getTranslation, formatSymptomLabel } from '../i18n';
import { speechRecognitionManager } from '../services/speechRecognition';
import { voiceSynthesizer } from '../services/speechSynthesis';

interface FieldVisitRecordsProps {
  language: LanguageCode;
  workerId?: string;
  onBackToHome: () => void;
  onSelectPatient?: (patientId: string) => void;
  initialVisitId?: string;
  initialFilter?: string;
}

export const FieldVisitRecords: React.FC<FieldVisitRecordsProps> = ({
  language,
  workerId,
  onBackToHome,
  onSelectPatient,
  initialVisitId,
  initialFilter = 'all'
}) => {
  const [visits, setVisits] = useState<LocalVisitRecord[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<LocalVisitRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>(initialFilter);
  const [isVoiceSearching, setIsVoiceSearching] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const t = getTranslation(language);
  const activeWorkerId = workerId || authService.getUser()?.worker_id || 'ASHA_WORKER_001';

  useEffect(() => {
    loadVisits();
  }, [activeWorkerId]);

  const loadVisits = async () => {
    setIsLoading(true);
    try {
      const list = await db.visits
        .where('worker_id')
        .equals(activeWorkerId)
        .reverse()
        .sortBy('created_at');

      setVisits(list);

      if (initialVisitId) {
        const found = list.find((v) => v.visit_id === initialVisitId);
        if (found) setSelectedVisit(found);
      }
    } catch (err) {
      console.error('Error loading visits:', err);
    } finally {
      setIsLoading(false);
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
        ? 'Please speak the patient name or visit detail.'
        : language === 'ta'
        ? 'விசிட் குறிப்பை கூறவும்.'
        : language === 'bho'
        ? 'मरीज के नाम भा दौरा बोलीं।'
        : 'मरीज़ का नाम या दौरा बोलिए।';

    voiceSynthesizer.speak(searchPrompt, language, () => {
      speechRecognitionManager.start(language, {
        onTranscriptChange: (text, isFinal) => {
          const clean = text
            .replace(/(ka\s*visit|ka\s*parcha|ki\s*history|dikhao|dekho|show|search|find)/gi, '')
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
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      term === '' ||
      v.patient_name.toLowerCase().includes(term) ||
      v.visit_id.toLowerCase().includes(term) ||
      v.original_transcript.toLowerCase().includes(term);

    const matchesCategory =
      filterCategory === 'all' ||
      (filterCategory === 'danger' && v.risk_evaluation?.is_high_risk) ||
      (filterCategory === 'pregnant' && v.structured_data?.category === 'pregnant_woman') ||
      (filterCategory === 'newborn' && v.structured_data?.category === 'newborn') ||
      (filterCategory === 'general' && v.structured_data?.category !== 'pregnant_woman' && v.structured_data?.category !== 'newborn');

    return matchesSearch && matchesCategory;
  });

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const locale = language === 'ta' ? 'ta-IN' : language === 'en' ? 'en-IN' : 'hi-IN';
      return d.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Metrics summary
  const totalVisitsCount = visits.length;
  const highRiskCount = visits.filter(v => v.risk_evaluation?.is_high_risk).length;
  const normalCount = totalVisitsCount - highRiskCount;
  const pendingSyncCount = visits.filter(v => v.sync_status === 'pending').length;

  // ================= SUB-VIEW: VISIT DETAILS =================
  if (selectedVisit) {
    const isDanger = selectedVisit.risk_evaluation?.is_high_risk;
    const vData = selectedVisit.structured_data;
    const isSynced = selectedVisit.sync_status === 'synced';

    return (
      <div className="max-w-3xl mx-auto space-y-6 text-left animate-in fade-in pb-12">
        {/* TWO CLEAR TOP NAVIGATION ACTIONS */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-dark-border">
          <button
            type="button"
            onClick={() => setSelectedVisit(null)}
            className="flex items-center space-x-2 text-xs sm:text-sm font-bold text-health-dark dark:text-emerald-400 hover:text-health-primary bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 py-2 px-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-all touch-target"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>← Back to Visit Records</span>
          </button>

          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-gray-900 bg-white dark:bg-dark-card hover:bg-gray-100 dark:hover:bg-dark-surface py-2 px-3.5 rounded-xl border border-gray-300 dark:border-dark-border shadow-sm transition-all touch-target"
          >
            <Home className="w-4 h-4" />
            <span>Dashboard Home</span>
          </button>
        </div>

        {/* Visit Record Header Card */}
        <div className={`p-6 rounded-3xl border transition-all shadow-sm ${
          isDanger
            ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900'
            : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  {selectedVisit.patient_name}
                </h2>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-border">
                  {selectedVisit.visit_id}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isDanger
                    ? 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100 border border-red-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300'
                }`}>
                  {isDanger ? '⚠️ High Risk Case' : '✓ Normal Encounter'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-dark-muted mt-2">
                <span className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                  Visit Date: <strong className="text-gray-800 dark:text-white ml-1">{formatDate(selectedVisit.created_at)} at {formatTime(selectedVisit.created_at)}</strong>
                </span>
                <span className="capitalize">
                  Category: <strong className="text-gray-800 dark:text-white">{vData.category.replace('_', ' ')}</strong>
                </span>
                {selectedVisit.patient_id && (
                  <span>
                    Linked Patient: <strong className="text-gray-800 dark:text-white font-mono">{selectedVisit.patient_id}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 border ${
                isSynced
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              }`}>
                {isSynced ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Cloud className="w-4 h-4 text-blue-600" />}
                <span>{isSynced ? 'Cloud Synced' : 'Saved Locally'}</span>
              </span>
            </div>
          </div>

          {/* High Risk Clinical Warning Banner */}
          {isDanger && (
            <div className="mt-5 p-4 rounded-2xl bg-red-100/90 dark:bg-red-950/70 border border-red-300 dark:border-red-800 text-xs text-red-900 dark:text-red-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-extrabold flex items-center space-x-1.5 text-sm">
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                  <span>Clinical Risk Protocol Triggered</span>
                </div>
                {selectedVisit.risk_evaluation?.call_anm_phone && (
                  <a
                    href={`tel:${selectedVisit.risk_evaluation.call_anm_phone}`}
                    className="py-1 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm touch-target"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call ANM Directly</span>
                  </a>
                )}
              </div>

              <div className="space-y-1 pt-1">
                {selectedVisit.risk_evaluation?.danger_flags?.map((flag, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-white/70 dark:bg-black/30 border border-red-200 dark:border-red-900">
                    <p className="font-bold text-red-950 dark:text-red-100">
                      {language === 'hi' ? flag.message_hi : language === 'ta' ? flag.message_ta : flag.message_en}
                    </p>
                    <p className="text-[11px] text-red-800 dark:text-red-300 mt-0.5">
                      Required Action: {flag.action_required}
                    </p>
                  </div>
                ))}
              </div>

              {selectedVisit.risk_evaluation?.emergency_action && (
                <p className="text-[11px] font-extrabold text-red-900 dark:text-red-100 pt-1">
                  Emergency Directive: {selectedVisit.risk_evaluation.emergency_action}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Clinical Vitals Grid */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            Clinical Vitals Recorded
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 dark:text-dark-muted block">Blood Pressure</span>
              <span className="text-xl font-black text-gray-900 dark:text-white mt-1 block">
                {vData.vitals?.blood_pressure?.systolic
                  ? `${vData.vitals.blood_pressure.systolic}/${vData.vitals.blood_pressure.diastolic}`
                  : 'Not Recorded'}
              </span>
              <span className="text-[10px] text-gray-400">mmHg</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 dark:text-dark-muted block">Temperature</span>
              <span className="text-xl font-black text-gray-900 dark:text-white mt-1 block">
                {vData.vitals?.temperature_f ? `${vData.vitals.temperature_f}°` : 'Not Recorded'}
              </span>
              <span className="text-[10px] text-gray-400">Fahrenheit</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 dark:text-dark-muted block">Body Weight</span>
              <span className="text-xl font-black text-gray-900 dark:text-white mt-1 block">
                {vData.vitals?.weight_kg ? `${vData.vitals.weight_kg}` : 'Not Recorded'}
              </span>
              <span className="text-[10px] text-gray-400">Kilograms</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 dark:text-dark-muted block">Pulse / Heart</span>
              <span className="text-xl font-black text-gray-900 dark:text-white mt-1 block">
                {vData.vitals?.pulse_bpm ? `${vData.vitals.pulse_bpm}` : 'Normal'}
              </span>
              <span className="text-[10px] text-gray-400">BPM</span>
            </div>
          </div>
        </div>

        {/* Symptoms & Observations */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            Observed Symptoms & Observations
          </h3>
          <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm space-y-3">
            <div>
              <span className="text-xs text-gray-500 dark:text-dark-muted block mb-1.5 font-semibold">
                Reported Clinical Symptoms:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {vData.symptoms && vData.symptoms.length > 0 ? (
                  vData.symptoms.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-bold text-xs border border-amber-300 dark:border-amber-800"
                    >
                      {formatSymptomLabel(s, language)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-600 dark:text-dark-muted">
                    No specific distress symptoms reported during encounter.
                  </span>
                )}
              </div>
            </div>

            {/* Medicines Adherence */}
            {vData.medicines && vData.medicines.length > 0 && (
              <div className="pt-2 border-t border-gray-100 dark:border-dark-border">
                <span className="text-xs text-gray-500 dark:text-dark-muted block mb-1.5 font-semibold">
                  Medication Tracking:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {vData.medicines.map((m, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-900 dark:text-white capitalize">
                        {m.name.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'taken'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.status === 'missed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {m.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Spoken Encounter Audio Transcript */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            Original Spoken Encounter Transcript
          </h3>
          <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed">
            "{selectedVisit.original_transcript}"
          </div>
        </div>
      </div>
    );
  }

  // ================= MAIN VIEW: FIELD VISIT RECORDS LIST =================
  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left animate-in fade-in pb-12">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-dark-border">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
              <FileText className="w-5 h-5 text-health-primary dark:text-emerald-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              Field Visit Records
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {visits.length} Encounters
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-dark-muted mt-1">
            Review and manage recorded community health visits and clinical encounter notes.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToHome}
          className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-gray-900 bg-white dark:bg-dark-card hover:bg-gray-100 dark:hover:bg-dark-surface py-2 px-3.5 rounded-xl border border-gray-300 dark:border-dark-border shadow-sm transition-all self-start sm:self-auto touch-target"
        >
          <Home className="w-4 h-4" />
          <span>Dashboard Home</span>
        </button>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm">
          <span className="text-[11px] font-bold text-gray-500 dark:text-dark-muted uppercase tracking-wider block">
            Total Visits
          </span>
          <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1 block">
            {totalVisitsCount}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-dark-muted">
            All documented encounters
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900 shadow-sm">
          <span className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider block">
            High Risk Cases
          </span>
          <span className="text-xl sm:text-2xl font-black text-red-900 dark:text-red-200 mt-1 block">
            {highRiskCount}
          </span>
          <span className="text-[10px] text-red-600 dark:text-red-300">
            Clinical danger flags
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
            Routine Visits
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1 block">
            {normalCount}
          </span>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
            Stable checkups
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 shadow-sm">
          <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider block">
            Pending Sync
          </span>
          <span className="text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-200 mt-1 block">
            {pendingSyncCount}
          </span>
          <span className="text-[10px] text-blue-700 dark:text-blue-400">
            Awaiting network upload
          </span>
        </div>
      </div>

      {/* Search Input with Voice Search Button */}
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by patient name, visit ID (VISIT_xxx) or clinical symptoms..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-2xl text-sm font-medium focus:ring-2 focus:ring-health-primary text-gray-900 dark:text-white outline-none shadow-sm touch-target"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-4" />
        </div>

        <button
          onClick={handleVoiceSearch}
          className={`touch-target px-4 py-3 rounded-2xl font-bold flex items-center space-x-1.5 shadow-sm transition-all ${
            isVoiceSearching
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-200'
          }`}
          title="Search by Voice"
        >
          <Mic className="w-5 h-5" />
          <span className="hidden sm:inline text-xs">Voice Search</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
        <button
          type="button"
          onClick={() => setFilterCategory('all')}
          className={`px-3.5 py-2 rounded-xl border transition-all touch-target shrink-0 ${
            filterCategory === 'all'
              ? 'bg-health-dark text-white border-health-dark shadow-sm'
              : 'bg-white dark:bg-dark-card text-gray-700 dark:text-dark-muted border-gray-200 dark:border-dark-border hover:bg-gray-50'
          }`}
        >
          All Visits ({visits.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('danger')}
          className={`px-3.5 py-2 rounded-xl border transition-all touch-target shrink-0 ${
            filterCategory === 'danger'
              ? 'bg-red-600 text-white border-red-600 shadow-sm'
              : 'bg-white dark:bg-dark-card text-red-700 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50'
          }`}
        >
          ⚠️ High Risk / Danger ({highRiskCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('pregnant')}
          className={`px-3.5 py-2 rounded-xl border transition-all touch-target shrink-0 ${
            filterCategory === 'pregnant'
              ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
              : 'bg-white dark:bg-dark-card text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-900 hover:bg-pink-50'
          }`}
        >
          Maternal ANC ({visits.filter(v => v.structured_data?.category === 'pregnant_woman').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('newborn')}
          className={`px-3.5 py-2 rounded-xl border transition-all touch-target shrink-0 ${
            filterCategory === 'newborn'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white dark:bg-dark-card text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50'
          }`}
        >
          Newborn PNC ({visits.filter(v => v.structured_data?.category === 'newborn').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('general')}
          className={`px-3.5 py-2 rounded-xl border transition-all touch-target shrink-0 ${
            filterCategory === 'general'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white dark:bg-dark-card text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900 hover:bg-amber-50'
          }`}
        >
          General Care ({visits.filter(v => v.structured_data?.category !== 'pregnant_woman' && v.structured_data?.category !== 'newborn').length})
        </button>
      </div>

      {/* Field Visit Cards List */}
      {isLoading ? (
        <div className="py-12 text-center space-y-3 bg-white dark:bg-dark-card rounded-3xl border border-gray-200 dark:border-dark-border">
          <Activity className="w-8 h-8 text-health-primary animate-spin mx-auto" />
          <p className="text-xs font-bold text-gray-600 dark:text-dark-muted">
            Loading field visit records...
          </p>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border space-y-3">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
            {searchTerm ? 'No visit records found matching your search.' : 'No field visits recorded yet.'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-dark-muted max-w-sm mx-auto">
            {searchTerm
              ? 'Try searching by patient name, visit ID, or transcript terms.'
              : 'Use the voice recording tool on the home dashboard to document your first patient encounter.'}
          </p>
          {searchTerm && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setFilterCategory('all'); }}
              className="mt-2 text-xs font-bold text-health-primary hover:underline"
            >
              Clear filters and search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVisits.map((visit) => {
            const isDanger = visit.risk_evaluation?.is_high_risk;
            const vData = visit.structured_data;
            const isSynced = visit.sync_status === 'synced';

            return (
              <div
                key={visit.visit_id}
                onClick={() => setSelectedVisit(visit)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 touch-target ${
                  isDanger
                    ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900 hover:border-red-400'
                    : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border hover:border-health-primary dark:hover:border-emerald-500'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 dark:border-dark-border gap-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                      isDanger
                        ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-health-primary dark:text-emerald-400'
                    }`}>
                      {isDanger ? '⚠️' : '✓'}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
                          {visit.patient_name}
                        </h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-gray-300">
                          {visit.visit_id}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-dark-muted flex items-center mt-0.5">
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        {formatDate(visit.created_at)} at {formatTime(visit.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      isDanger
                        ? 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-200'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    }`}>
                      {isDanger ? '⚠️ High Risk' : '✓ Normal'}
                    </span>
                    <span className={`text-[10px] font-semibold flex items-center ${
                      isSynced ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {isSynced ? 'Cloud Synced' : 'Local'}
                    </span>
                  </div>
                </div>

                {/* Vitals & Summary Preview */}
                <div className="pt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Category: <strong className="capitalize">{vData.category.replace('_', ' ')}</strong>
                    </span>

                    {vData.vitals?.blood_pressure?.systolic && (
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        BP: <strong className="text-gray-900 dark:text-white">{vData.vitals.blood_pressure.systolic}/{vData.vitals.blood_pressure.diastolic}</strong>
                      </span>
                    )}

                    {vData.vitals?.temperature_f && (
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Temp: <strong className="text-gray-900 dark:text-white">{vData.vitals.temperature_f}°F</strong>
                      </span>
                    )}

                    {vData.vitals?.weight_kg && (
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Weight: <strong className="text-gray-900 dark:text-white">{vData.vitals.weight_kg} kg</strong>
                      </span>
                    )}
                  </div>

                  {/* Transcript quote */}
                  <p className="text-xs text-gray-600 dark:text-gray-300 italic line-clamp-2 bg-gray-50/70 dark:bg-dark-surface/50 p-2.5 rounded-xl border border-gray-100 dark:border-dark-border">
                    "{visit.original_transcript}"
                  </p>
                </div>

                {/* Card Footer Action */}
                <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-dark-border flex items-center justify-between text-xs font-bold text-health-primary dark:text-emerald-400">
                  <span>View Full Encounter Details</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
