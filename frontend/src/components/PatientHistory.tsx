import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Mic, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  ArrowLeft,
  User,
  HeartPulse,
  Activity,
  Thermometer,
  Scale
} from 'lucide-react';
import { LocalVisitRecord, LanguageCode } from '../types';
import { db } from '../db/dexie';
import { getTranslation } from '../utils/translations';
import { speechRecognitionManager } from '../services/speechRecognition';
import { voiceSynthesizer } from '../services/speechSynthesis';

interface PatientHistoryProps {
  language: LanguageCode;
  onBack: () => void;
  onSelectVisit?: (visit: LocalVisitRecord) => void;
}

export const PatientHistory: React.FC<PatientHistoryProps> = ({
  language,
  onBack,
  onSelectVisit,
}) => {
  const [visits, setVisits] = useState<LocalVisitRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isVoiceSearching, setIsVoiceSearching] = useState<boolean>(false);
  const [selectedVisit, setSelectedVisit] = useState<LocalVisitRecord | null>(null);

  const t = getTranslation(language);

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = async () => {
    const list = await db.visits.orderBy('created_at').reverse().toArray();
    setVisits(list);
  };

  const handleVoiceSearch = () => {
    if (!speechRecognitionManager.isSupported()) return;

    if (isVoiceSearching) {
      speechRecognitionManager.stop();
      setIsVoiceSearching(false);
      return;
    }

    setIsVoiceSearching(true);
    voiceSynthesizer.speak('मरीज़ का नाम बोलिए', language, () => {
      speechRecognitionManager.start(language, {
        onTranscriptChange: (text, isFinal) => {
          // clean "ka record dikhao"
          const clean = text
            .replace(/(ka\s*record\s*dikhao|ka\s*parcha|ki\s*history|dikhao|dekho)/gi, '')
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
      return d.toLocaleDateString('hi-IN', {
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
          <span>सूची पर वापस जाएं</span>
        </button>

        {/* Visit Details Card */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-health-mintborder text-left space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {selectedVisit.patient_name}
              </h3>
              <p className="text-xs text-gray-500">
                विज़िट तिथि: {formatDate(selectedVisit.created_at)}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isDanger
                  ? 'bg-red-100 text-red-900 border border-red-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}
            >
              {isDanger ? '⚠️ खतरे का मामला' : '✓ सामान्य'}
            </span>
          </div>

          {/* Vitals Summary */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-surface-warm rounded-lg border border-gray-200">
              <span className="text-gray-500 block">बीपी:</span>
              <span className="font-bold text-gray-900 text-sm">
                {vData.vitals?.blood_pressure?.systolic
                  ? `${vData.vitals.blood_pressure.systolic}/${vData.vitals.blood_pressure.diastolic}`
                  : 'दर्ज नहीं'}
              </span>
            </div>
            <div className="p-2 bg-surface-warm rounded-lg border border-gray-200">
              <span className="text-gray-500 block">तापमान:</span>
              <span className="font-bold text-gray-900 text-sm">
                {vData.vitals?.temperature_f
                  ? `${vData.vitals.temperature_f}°F`
                  : 'दर्ज नहीं'}
              </span>
            </div>
          </div>

          {/* Symptoms */}
          <div className="text-xs">
            <span className="text-gray-500 block mb-1">लक्षण:</span>
            <div className="flex flex-wrap gap-1">
              {vData.symptoms && vData.symptoms.length > 0 ? (
                vData.symptoms.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold"
                  >
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-gray-600">कोई नहीं</span>
              )}
            </div>
          </div>

          {/* Original Transcript */}
          <div className="text-xs text-gray-600 bg-surface-warm p-3 rounded-lg border border-gray-200 italic">
            "{selectedVisit.original_transcript}"
          </div>

          {/* Sync Status */}
          <div className="pt-2 flex items-center justify-between text-xs text-gray-500">
            <span>सिंक स्थिति:</span>
            <span
              className={`font-bold ${
                selectedVisit.sync_status === 'synced'
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {selectedVisit.sync_status === 'synced'
                ? '✓ क्लाउड में सहेजा गया'
                : '⏳ सिंक बाकी (स्थानीय)'}
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
          className="flex items-center space-x-1.5 text-health-dark font-bold hover:underline touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>होम</span>
        </button>
        <h2 className="text-lg font-bold text-gray-900">
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
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-health-primary outline-none touch-target"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
        </div>

        <button
          onClick={handleVoiceSearch}
          className={`touch-target px-3 py-2.5 rounded-xl font-bold flex items-center space-x-1 shadow-sm transition-all ${
            isVoiceSearching
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-health-mint text-health-dark hover:bg-health-mintborder'
          }`}
          title="बोलकर खोजें"
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
              : 'bg-white text-gray-700 border-gray-200'
          }`}
        >
          सभी
        </button>
        <button
          onClick={() => setFilterCategory('danger')}
          className={`px-3 py-1.5 rounded-lg border touch-target ${
            filterCategory === 'danger'
              ? 'bg-danger-primary text-white border-danger-primary'
              : 'bg-white text-red-700 border-red-200'
          }`}
        >
          ⚠️ खतरे के मामले
        </button>
        <button
          onClick={() => setFilterCategory('pregnant')}
          className={`px-3 py-1.5 rounded-lg border touch-target ${
            filterCategory === 'pregnant'
              ? 'bg-health-dark text-white border-health-dark'
              : 'bg-white text-gray-700 border-gray-200'
          }`}
        >
          गर्भवती
        </button>
        <button
          onClick={() => setFilterCategory('newborn')}
          className={`px-3 py-1.5 rounded-lg border touch-target ${
            filterCategory === 'newborn'
              ? 'bg-health-dark text-white border-health-dark'
              : 'bg-white text-gray-700 border-gray-200'
          }`}
        >
          नवजात
        </button>
      </div>

      {/* Timeline Visit List */}
      <div className="space-y-2.5">
        {filteredVisits.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="font-medium text-sm">कोई रिकॉर्ड नहीं मिला।</p>
          </div>
        ) : (
          filteredVisits.map((v) => {
            const isDanger = v.risk_evaluation?.is_high_risk;
            return (
              <button
                key={v.visit_id}
                onClick={() => setSelectedVisit(v)}
                className={`w-full text-left p-4 rounded-2xl bg-white border transition-all shadow-card flex items-center justify-between touch-target ${
                  isDanger
                    ? 'border-red-300 hover:border-red-500 bg-red-50/30'
                    : 'border-health-mintborder hover:border-health-primary'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0 mt-0.5 ${
                      isDanger
                        ? 'bg-red-100 text-red-800'
                        : 'bg-health-mint text-health-dark'
                    }`}
                  >
                    {isDanger ? '⚠️' : '✓'}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base leading-tight">
                      {v.patient_name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center">
                      <Calendar className="w-3 h-3 mr-1 inline" />
                      {formatDate(v.created_at)}
                    </p>
                    <p className="text-xs text-gray-700 mt-1 line-clamp-1 italic">
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
