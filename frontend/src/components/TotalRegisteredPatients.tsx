import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Mic, 
  User, 
  Calendar, 
  ChevronRight, 
  ArrowLeft, 
  Home, 
  Phone, 
  AlertTriangle, 
  CheckCircle2, 
  Heart, 
  Baby, 
  Users, 
  Plus, 
  Activity, 
  ClipboardList,
  Sparkles
} from 'lucide-react';
import { LocalPatientRecord, LocalVisitRecord, LanguageCode } from '../types';
import { db, syncPatientsAndVisits } from '../db/dexie';
import { authService } from '../services/auth';
import { getTranslation, formatSymptomLabel } from '../i18n';
import { speechRecognitionManager } from '../services/speechRecognition';
import { voiceSynthesizer } from '../services/speechSynthesis';

interface TotalRegisteredPatientsProps {
  language: LanguageCode;
  workerId?: string;
  onBackToHome: () => void;
  onRecordVisitForPatient?: (patient: LocalPatientRecord) => void;
  onSelectVisitDetail?: (visitId: string) => void;
  initialPatientId?: string;
}

export const TotalRegisteredPatients: React.FC<TotalRegisteredPatientsProps> = ({
  language,
  workerId,
  onBackToHome,
  onRecordVisitForPatient,
  onSelectVisitDetail,
  initialPatientId
}) => {
  const [patients, setPatients] = useState<LocalPatientRecord[]>([]);
  const [visits, setVisits] = useState<LocalVisitRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<LocalPatientRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isVoiceSearching, setIsVoiceSearching] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const t = getTranslation(language);
  const activeWorkerId = workerId || authService.getUser()?.worker_id || 'ASHA_WORKER_001';

  useEffect(() => {
    loadData();
  }, [activeWorkerId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Sync patient-visit links and update visit counts accurately
      await syncPatientsAndVisits(activeWorkerId);

      const patientList = await db.patients
        .where('worker_id')
        .equals(activeWorkerId)
        .reverse()
        .sortBy('updated_at');

      const visitList = await db.visits
        .where('worker_id')
        .equals(activeWorkerId)
        .reverse()
        .sortBy('created_at');

      setPatients(patientList);
      setVisits(visitList);

      if (initialPatientId) {
        const found = patientList.find(p => p.patient_id === initialPatientId);
        if (found) setSelectedPatient(found);
      }
    } catch (err) {
      console.error('Error loading patients:', err);
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
        ? 'Please speak the patient name.'
        : language === 'ta'
        ? 'நோயாளி பெயரை கூறவும்.'
        : language === 'bho'
        ? 'मरीज के नाम बोलीं।'
        : 'मरीज़ का नाम बोलिए।';

    let hasStarted = false;
    const triggerStart = () => {
      if (hasStarted) return;
      hasStarted = true;
      speechRecognitionManager.start(language, {
        onTranscriptChange: (text, isFinal) => {
          const clean = text
            .replace(/(ka\s*record\s*dikhao|ka\s*parcha|ki\s*history|dikhao|dekho|show\s*record\s*of|search|find|patient)/gi, '')
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
        onEnd: () => {
          setIsVoiceSearching(false);
        },
      });
    };

    voiceSynthesizer.speak(searchPrompt, language, triggerStart);
    setTimeout(triggerStart, 850);
  };

  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      term === '' ||
      p.name.toLowerCase().includes(term) ||
      p.patient_id.toLowerCase().includes(term) ||
      (p.village && p.village.toLowerCase().includes(term));

    const matchesCategory =
      filterCategory === 'all' ||
      (filterCategory === 'attention' && p.latest_risk_status === 'danger') ||
      (filterCategory === 'pregnant' && p.category === 'pregnant_woman') ||
      (filterCategory === 'newborn' && p.category === 'newborn') ||
      (filterCategory === 'child' && p.category === 'child');

    return matchesSearch && matchesCategory;
  });

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
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

  // ================= SUB-VIEW: PATIENT PROFILE =================
  if (selectedPatient) {
    // Visits specifically belonging to this patient
    const patientVisits = visits.filter(
      (v) =>
        v.patient_id === selectedPatient.patient_id ||
        v.patient_name.trim().toLowerCase() === selectedPatient.name.trim().toLowerCase()
    );

    const isHighRisk = selectedPatient.latest_risk_status === 'danger';
    const latestVisit = patientVisits[0];

    return (
      <div className="max-w-3xl mx-auto space-y-6 text-left animate-in fade-in pb-12">
        {/* TWO CLEAR TOP NAVIGATION ACTIONS */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-dark-border">
          <button
            type="button"
            onClick={() => setSelectedPatient(null)}
            className="flex items-center space-x-2 text-xs sm:text-sm font-bold text-health-dark dark:text-emerald-400 hover:text-health-primary bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 py-2 px-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-all touch-target"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>← Back to Patients List</span>
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

        {/* Patient Profile Card Header */}
        <div className={`p-6 rounded-3xl border transition-all shadow-sm ${
          isHighRisk
            ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900'
            : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                isHighRisk
                  ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-health-primary dark:text-emerald-400'
              }`}>
                {selectedPatient.category === 'pregnant_woman' ? (
                  <Heart className="w-7 h-7 text-pink-600 fill-pink-500/20" />
                ) : selectedPatient.category === 'newborn' ? (
                  <Baby className="w-7 h-7 text-indigo-600" />
                ) : (
                  <User className="w-7 h-7" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                    {selectedPatient.name}
                  </h2>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-border">
                    {selectedPatient.patient_id}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isHighRisk
                      ? 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100 border border-red-300'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300'
                  }`}>
                    {isHighRisk ? '⚠️ High Attention' : '✓ Normal Status'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-dark-muted mt-2">
                  <span>Village: <strong className="text-gray-800 dark:text-white">{selectedPatient.village || 'Rampur'}</strong></span>
                  {selectedPatient.age !== undefined && (
                    <span>Age: <strong className="text-gray-800 dark:text-white">{selectedPatient.age === 0 ? 'Newborn' : `${selectedPatient.age} yrs`}</strong></span>
                  )}
                  <span>Category: <strong className="text-gray-800 dark:text-white capitalize">{selectedPatient.category.replace('_', ' ')}</strong></span>
                  <span>Registered: <strong className="text-gray-800 dark:text-white">{formatDate(selectedPatient.created_at)}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0">
              {selectedPatient.phone && (
                <a
                  href={`tel:${selectedPatient.phone}`}
                  className="py-2.5 px-4 rounded-xl bg-white dark:bg-dark-card hover:bg-gray-50 border border-gray-300 dark:border-dark-border text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center space-x-1.5 shadow-sm touch-target"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Call {selectedPatient.phone}</span>
                </a>
              )}

              {onRecordVisitForPatient && (
                <button
                  type="button"
                  onClick={() => onRecordVisitForPatient(selectedPatient)}
                  className="py-2.5 px-4 rounded-xl bg-health-dark hover:bg-health-primary text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-md touch-target transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Record Visit</span>
                </button>
              )}
            </div>
          </div>

          {/* Clinical Alert if High Risk */}
          {isHighRisk && latestVisit?.risk_evaluation?.danger_flags && (
            <div className="mt-4 p-3.5 rounded-2xl bg-red-100/80 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-xs text-red-900 dark:text-red-200 space-y-1">
              <div className="font-extrabold flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Active Clinical Alert:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {latestVisit.risk_evaluation.danger_flags.map(f => language === 'hi' ? f.message_hi : language === 'ta' ? f.message_ta : f.message_en).join(' • ')}
              </p>
              {latestVisit.risk_evaluation.emergency_action && (
                <p className="text-[11px] font-bold text-red-800 dark:text-red-300 pt-0.5">
                  Action Required: {latestVisit.risk_evaluation.emergency_action}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Clinical Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm">
            <span className="text-[11px] font-bold text-gray-500 dark:text-dark-muted uppercase tracking-wider block">
              Total Encounters
            </span>
            <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 block">
              {patientVisits.length}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-dark-muted">
              Field visits documented
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm">
            <span className="text-[11px] font-bold text-gray-500 dark:text-dark-muted uppercase tracking-wider block">
              Latest Recorded BP
            </span>
            <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 block">
              {latestVisit?.structured_data?.vitals?.blood_pressure?.systolic
                ? `${latestVisit.structured_data.vitals.blood_pressure.systolic}/${latestVisit.structured_data.vitals.blood_pressure.diastolic}`
                : 'Not Recorded'}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-dark-muted">
              {latestVisit ? `Recorded ${formatDate(latestVisit.created_at)}` : 'No readings'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm">
            <span className="text-[11px] font-bold text-gray-500 dark:text-dark-muted uppercase tracking-wider block">
              Next Clinical Follow-up
            </span>
            <span className="text-base font-extrabold text-amber-700 dark:text-amber-400 mt-1 block">
              {isHighRisk ? 'Within 48 Hours' : 'Routine 14 Days'}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-dark-muted">
              {isHighRisk ? 'Urgent maternal follow-up' : 'Scheduled wellness check'}
            </span>
          </div>
        </div>

        {/* Complete Visit History Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center">
              <ClipboardList className="w-4 h-4 mr-1.5 text-health-primary" />
              <span>Complete Visit History ({patientVisits.length})</span>
            </h3>
            <span className="text-xs text-gray-500 dark:text-dark-muted">
              Ordered chronologically
            </span>
          </div>

          {patientVisits.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border space-y-2">
              <User className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-sm font-bold text-gray-800 dark:text-white">
                No visits recorded for this patient yet.
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-muted">
                Tap 'Record Visit' above to document your first encounter with {selectedPatient.name}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {patientVisits.map((v, idx) => {
                const isVisitDanger = v.risk_evaluation?.is_high_risk;
                const vData = v.structured_data;

                return (
                  <div
                    key={v.visit_id || idx}
                    className={`p-4 rounded-2xl border transition-all text-left ${
                      isVisitDanger
                        ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
                        : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-gray-100 dark:border-dark-border gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-gray-300">
                          {v.visit_id}
                        </span>
                        <span className="text-xs font-semibold text-gray-500 dark:text-dark-muted flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1" />
                          {formatDate(v.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isVisitDanger
                            ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                        }`}>
                          {isVisitDanger ? '⚠️ High Risk Visit' : '✓ Routine Checkup'}
                        </span>
                        <span className={`text-[10px] font-semibold ${
                          v.sync_status === 'synced' ? 'text-emerald-600' : 'text-blue-600'
                        }`}>
                          {v.sync_status === 'synced' ? 'Cloud Synced' : 'Local'}
                        </span>
                      </div>
                    </div>

                    {/* Vitals Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 text-xs">
                      <div className="p-2 rounded-xl bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border">
                        <span className="text-[10px] text-gray-500 dark:text-dark-muted block">Blood Pressure:</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {vData.vitals?.blood_pressure?.systolic
                            ? `${vData.vitals.blood_pressure.systolic}/${vData.vitals.blood_pressure.diastolic} mmHg`
                            : 'Not Recorded'}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border">
                        <span className="text-[10px] text-gray-500 dark:text-dark-muted block">Temperature:</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {vData.vitals?.temperature_f ? `${vData.vitals.temperature_f}°F` : 'Not Recorded'}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border">
                        <span className="text-[10px] text-gray-500 dark:text-dark-muted block">Weight:</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {vData.vitals?.weight_kg ? `${vData.vitals.weight_kg} kg` : 'Not Recorded'}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border">
                        <span className="text-[10px] text-gray-500 dark:text-dark-muted block">Medicines:</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {vData.medicines && vData.medicines.length > 0
                            ? vData.medicines.map(m => m.name.replace('_', ' ')).join(', ')
                            : 'None recorded'}
                        </span>
                      </div>
                    </div>

                    {/* Spoken Transcript Preview */}
                    <p className="text-xs text-gray-600 dark:text-gray-300 italic bg-gray-50/70 dark:bg-dark-surface/50 p-2.5 rounded-xl border border-gray-100 dark:border-dark-border">
                      "{v.original_transcript}"
                    </p>

                    {onSelectVisitDetail && (
                      <div className="pt-2 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectVisitDetail(v.visit_id)}
                          className="text-xs font-bold text-health-primary hover:underline inline-flex items-center"
                        >
                          <span>Open Full Clinical Encounter</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= MAIN VIEW: TOTAL REGISTERED PATIENTS LIST =================
  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left animate-in fade-in pb-12">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-dark-border">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
              <Users className="w-5 h-5 text-health-primary dark:text-emerald-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              Total Registered Patients
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {patients.length} Unique
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-dark-muted mt-1">
            Official community registry of individual patients under Rampur Sub-Centre.
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

      {/* Search Input with Voice Search Button */}
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by patient name, patient ID (PAT_xxx) or village..."
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
          All Patients ({patients.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('attention')}
          className={`px-3.5 py-2 rounded-xl border transition-all touch-target shrink-0 ${
            filterCategory === 'attention'
              ? 'bg-red-600 text-white border-red-600 shadow-sm'
              : 'bg-white dark:bg-dark-card text-red-700 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50'
          }`}
        >
          ⚠️ High Attention ({patients.filter(p => p.latest_risk_status === 'danger').length})
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
          Maternal ANC ({patients.filter(p => p.category === 'pregnant_woman').length})
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
          Newborn PNC ({patients.filter(p => p.category === 'newborn').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('child')}
          className={`px-3.5 py-2 rounded-xl border transition-all touch-target shrink-0 ${
            filterCategory === 'child'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white dark:bg-dark-card text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900 hover:bg-amber-50'
          }`}
        >
          Children ({patients.filter(p => p.category === 'child').length})
        </button>
      </div>

      {/* Patient Cards Grid */}
      {isLoading ? (
        <div className="py-12 text-center space-y-3 bg-white dark:bg-dark-card rounded-3xl border border-gray-200 dark:border-dark-border">
          <Activity className="w-8 h-8 text-health-primary animate-spin mx-auto" />
          <p className="text-xs font-bold text-gray-600 dark:text-dark-muted">
            Loading registered patient registry...
          </p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border space-y-3">
          <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
            {searchTerm ? 'No registered patients found matching your search.' : 'No registered patients in your sub-centre yet.'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-dark-muted max-w-sm mx-auto">
            {searchTerm
              ? 'Try searching by full name or patient identifier (e.g., PAT_001).'
              : 'When you record field visits, unique patient profiles are created and tracked automatically.'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPatients.map((patient) => {
            const isHighRisk = patient.latest_risk_status === 'danger';

            return (
              <div
                key={patient.patient_id}
                onClick={() => setSelectedPatient(patient)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 touch-target ${
                  isHighRisk
                    ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900 hover:border-red-400'
                    : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border hover:border-health-primary dark:hover:border-emerald-500'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                        isHighRisk
                          ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-health-primary dark:text-emerald-400'
                      }`}>
                        {patient.category === 'pregnant_woman' ? (
                          <Heart className="w-5 h-5 text-pink-600 fill-pink-500/20" />
                        ) : patient.category === 'newborn' ? (
                          <Baby className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
                          {patient.name}
                        </h3>
                        <span className="text-[11px] font-mono text-gray-500 dark:text-dark-muted">
                          {patient.patient_id} • {patient.village || 'Rampur'}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                      isHighRisk
                        ? 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-200'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    }`}>
                      {isHighRisk ? '⚠️ High Attention' : '✓ Normal'}
                    </span>
                  </div>

                  {/* Demographic & Category details */}
                  <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-dark-border flex flex-wrap items-center justify-between text-xs text-gray-600 dark:text-dark-muted gap-2">
                    <span className="font-semibold capitalize text-gray-800 dark:text-gray-200">
                      {patient.category.replace('_', ' ')}
                      {patient.age !== undefined && ` • ${patient.age === 0 ? 'Newborn' : `${patient.age} yrs`}`}
                    </span>

                    <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-gray-300 font-bold text-[11px]">
                      {patient.total_visits || 1} {patient.total_visits === 1 ? 'Visit' : 'Visits'} Recorded
                    </span>
                  </div>
                </div>

                {/* Card Footer Action */}
                <div className="mt-4 pt-2.5 border-t border-gray-100 dark:border-dark-border flex items-center justify-between text-xs font-bold text-health-primary dark:text-emerald-400">
                  <span>View Patient Profile & History</span>
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
