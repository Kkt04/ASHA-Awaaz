import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertOctagon, 
  UserCheck, 
  Users, 
  ChevronRight, 
  ArrowRight,
  RotateCcw,
  Plus
} from 'lucide-react';
import { 
  LanguageCode, 
  AppScreen, 
  StructuredVisitData, 
  RiskEvaluation, 
  LocalVisitRecord 
} from './types';
import { getTranslation } from './utils/translations';
import { Header } from './components/Header';
import { LanguageSelector } from './components/LanguageSelector';
import { VoiceRecorder } from './components/VoiceRecorder';
import { VisitCard } from './components/VisitCard';
import { RiskBanner } from './components/RiskBanner';
import { VoiceConfirmation } from './components/VoiceConfirmation';
import { PatientHistory } from './components/PatientHistory';
import { DemoModeModal } from './components/DemoModeModal';
import { seedLocalDemoPatients, db } from './db/dexie';
import { extractVisitVoice, evaluateRisk, saveVisitRecord } from './services/api';
import { voiceSynthesizer } from './services/speechSynthesis';

export const App: React.FC = () => {
  const [language, setLanguage] = useState<LanguageCode>('hi');
  const [hasChosenLanguage, setHasChosenLanguage] = useState<boolean>(false);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  
  // Active workflow state
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [structuredData, setStructuredData] = useState<StructuredVisitData | null>(null);
  const [riskEvaluation, setRiskEvaluation] = useState<RiskEvaluation | null>(null);
  const [spokenSummary, setSpokenSummary] = useState<string>('');
  const [engineUsed, setEngineUsed] = useState<string>('groq_llm');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Home metrics
  const [totalVisits, setTotalVisits] = useState<number>(0);
  const [highRiskCount, setHighRiskCount] = useState<number>(0);
  const [recentVisits, setRecentVisits] = useState<LocalVisitRecord[]>([]);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);

  const t = getTranslation(language);

  useEffect(() => {
    // Check saved language
    const savedLang = localStorage.getItem('asha_language') as LanguageCode;
    if (savedLang) {
      setLanguage(savedLang);
      setHasChosenLanguage(true);
    }
    // Initialize DB with demo seed
    seedLocalDemoPatients().then(loadMetrics);
  }, []);

  const loadMetrics = async () => {
    try {
      const all = await db.visits.toArray();
      setTotalVisits(all.length);
      const highRisk = all.filter((v) => v.risk_evaluation?.is_high_risk).length;
      setHighRiskCount(highRisk);
      const recents = await db.visits.orderBy('created_at').reverse().limit(5).toArray();
      setRecentVisits(recents);
    } catch (e) {
      console.warn('Could not load metrics from db:', e);
    }
  };

  const handleLanguageSelect = (lang: LanguageCode) => {
    setLanguage(lang);
    localStorage.setItem('asha_language', lang);
    setHasChosenLanguage(true);
    setCurrentScreen('home');
  };

  const handleStartRecording = () => {
    setCurrentScreen('recording');
  };

  const handleFinishRecording = async (transcript: string) => {
    setCurrentTranscript(transcript);
    setIsProcessing(true);

    try {
      // 1. Extract health data via Groq API or deterministic fallback
      const extractionRes = await extractVisitVoice(transcript, language);
      setStructuredData(extractionRes.extracted);
      setEngineUsed(extractionRes.engine);

      // 2. Evaluate Clinical Danger Signs
      const risk = await evaluateRisk(extractionRes.extracted);
      setRiskEvaluation(risk);

      // 3. Generate summary text for TTS
      const summary =
        language === 'ta'
          ? extractionRes.summaryTa
          : language === 'en'
          ? extractionRes.summaryEn
          : extractionRes.summaryHi;
      setSpokenSummary(summary);

      // 4. Move to confirmation screen
      setCurrentScreen('confirmation');
    } catch (err) {
      console.error('Error processing transcript:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!structuredData || !riskEvaluation) return;

    try {
      await saveVisitRecord(
        structuredData,
        riskEvaluation,
        currentTranscript,
        language
      );
      voiceSynthesizer.speak(t.confirmAudio, language);
      await loadMetrics();
      setCurrentScreen('saved');
    } catch (e) {
      console.error('Error saving visit:', e);
    }
  };

  const handleCorrection = async (
    updatedData: StructuredVisitData,
    newSummary: string
  ) => {
    setStructuredData(updatedData);
    setSpokenSummary(newSummary);
    // Re-evaluate risk with corrected data
    const updatedRisk = await evaluateRisk(updatedData);
    setRiskEvaluation(updatedRisk);
  };

  // 1. First-time Language Selector Screen
  if (!hasChosenLanguage) {
    return <LanguageSelector onSelectLanguage={handleLanguageSelect} />;
  }

  return (
    <div className="min-h-screen bg-surface-warm flex flex-col font-sans">
      {/* Top Header */}
      <Header
        language={language}
        onLanguageChange={(newLang) => {
          setLanguage(newLang);
          localStorage.setItem('asha_language', newLang);
        }}
        onHomeClick={() => setCurrentScreen('home')}
      />

      {/* Main Screen Content */}
      <main className="flex-1 max-w-md w-full mx-auto pb-8">
        {/* ================= Screen: HOME ================= */}
        {currentScreen === 'home' && (
          <div className="p-4 space-y-5 text-center">
            {/* Top Greeting & Demo Mode Trigger */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-left">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t.workerGreeting}
                </span>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">
                  रामपुर उप-केन्द्र (कल्याणपुर)
                </h2>
              </div>

              {/* Prominent Demo Mode Button */}
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-health-dark text-xs font-extrabold border border-emerald-300 shadow-sm touch-target"
              >
                <Sparkles className="w-4 h-4 text-emerald-700 animate-spin" />
                <span>{t.demoModeBtn}</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 text-left">
              <div className="bg-white p-3 rounded-2xl border border-health-mintborder shadow-card">
                <span className="text-[11px] font-bold text-gray-500 block">
                  {t.totalVisits}
                </span>
                <span className="text-xl font-extrabold text-health-dark">
                  {totalVisits}
                </span>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-red-200 shadow-card">
                <span className="text-[11px] font-bold text-red-600 block">
                  {t.highRiskCases}
                </span>
                <span className="text-xl font-extrabold text-red-700">
                  {highRiskCount}
                </span>
              </div>

              <button
                onClick={() => setCurrentScreen('history')}
                className="bg-white p-3 rounded-2xl border border-emerald-200 shadow-card hover:bg-emerald-50 active:scale-[0.98] transition-all touch-target text-left"
              >
                <span className="text-[11px] font-bold text-emerald-700 block">
                  {t.patientHistory}
                </span>
                <span className="text-xs font-bold text-gray-800 flex items-center mt-1">
                  देखें <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </button>
            </div>

            {/* Huge Central Microphone Button */}
            <div className="py-6 flex flex-col items-center justify-center">
              <button
                onClick={handleStartRecording}
                className="w-40 h-40 rounded-full bg-health-dark hover:bg-health-primary active:scale-95 transition-all shadow-elevated text-white flex flex-col items-center justify-center space-y-2 border-4 border-emerald-300/60 touch-target group"
                aria-label="बोलकर विज़िट दर्ज करें"
              >
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Mic className="w-10 h-10 stroke-[2.5]" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-green-100">
                  टैप करें
                </span>
              </button>

              <h3 className="text-2xl font-black text-gray-900 mt-5 tracking-tight">
                {t.speakVisitButton}
              </h3>
              <p className="text-sm font-semibold text-gray-600 mt-1">
                "विज़िट के बारे में बोलिए..."
              </p>
            </div>

            {/* Example Prompt Bubble */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 text-left text-xs space-y-1">
              <span className="font-bold text-emerald-900 block">
                💡 ऐसे बोल सकते हैं:
              </span>
              <p className="text-gray-700 font-medium italic">
                "Sunita, 7 mahine ki pregnant hai, BP 150 by 100 hai, pairon mein sujan hai aur iron ki goli nahi li."
              </p>
            </div>

            {/* Recent Visits Section */}
            <div className="text-left pt-2">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-sm font-extrabold text-gray-800 uppercase tracking-wide">
                  {t.recentVisits}
                </h4>
                <button
                  onClick={() => setCurrentScreen('history')}
                  className="text-xs text-health-primary font-bold hover:underline"
                >
                  सभी देखें ({totalVisits})
                </button>
              </div>

              <div className="space-y-2">
                {recentVisits.length === 0 ? (
                  <p className="text-xs text-gray-500 py-3 text-center bg-white rounded-xl border border-gray-200">
                    अभी कोई विज़िट दर्ज नहीं है। ऊपर दिए गए माइक बटन पर टैप करें।
                  </p>
                ) : (
                  recentVisits.map((v) => {
                    const isDanger = v.risk_evaluation?.is_high_risk;
                    return (
                      <div
                        key={v.visit_id}
                        onClick={() => setCurrentScreen('history')}
                        className={`p-3 rounded-xl bg-white border shadow-sm flex items-center justify-between cursor-pointer hover:border-health-primary transition-colors touch-target ${
                          isDanger ? 'border-red-300 bg-red-50/20' : 'border-gray-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-gray-900 text-sm">
                              {v.patient_name}
                            </span>
                            {isDanger && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800">
                                खतरा ⚠️
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-500 line-clamp-1 italic">
                            "{v.original_transcript}"
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= Screen: RECORDING ================= */}
        {currentScreen === 'recording' && (
          <VoiceRecorder
            language={language}
            onFinishRecording={handleFinishRecording}
            onCancel={() => setCurrentScreen('home')}
            onSwitchToDemo={() => {
              setCurrentScreen('home');
              setIsDemoModalOpen(true);
            }}
          />
        )}

        {/* ================= Screen: CONFIRMATION & CARD ================= */}
        {currentScreen === 'confirmation' && structuredData && (
          <div className="p-4 space-y-4">
            {/* Clinical Risk Banner (shown prominently if high risk) */}
            {riskEvaluation && (
              <RiskBanner risk={riskEvaluation} language={language} />
            )}

            {/* Visit Data Card */}
            <VisitCard
              data={structuredData}
              language={language}
              engineUsed={engineUsed}
            />

            {/* Voice Confirmation Read-Back & Corrections */}
            <VoiceConfirmation
              data={structuredData}
              summaryText={spokenSummary}
              language={language}
              onConfirm={handleConfirmAndSave}
              onCorrectionMade={handleCorrection}
            />
          </div>
        )}

        {/* ================= Screen: SAVED ================= */}
        {currentScreen === 'saved' && (
          <div className="p-6 text-center space-y-6 max-w-sm mx-auto min-h-[75vh] flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-elevated border-4 border-emerald-300 animate-bounce">
              <CheckCircle2 className="w-16 h-16 stroke-[2.5]" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-gray-900">
                {t.recordSavedSuccess}
              </h2>
              <p className="text-sm font-semibold text-gray-600 mt-1">
                विज़िट सुरक्षित स्थानीय रूप से IndexedDB में दर्ज हो गई है।
              </p>
            </div>

            <div className="w-full space-y-3 pt-4">
              <button
                onClick={() => {
                  setStructuredData(null);
                  setCurrentTranscript('');
                  setRiskEvaluation(null);
                  setCurrentScreen('recording');
                }}
                className="w-full touch-target min-h-[56px] bg-health-dark hover:bg-health-primary text-white font-extrabold rounded-2xl shadow-md flex items-center justify-center space-x-2 text-base transition-all"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
                <span>अगली विज़िट दर्ज करें</span>
              </button>

              <button
                onClick={() => setCurrentScreen('history')}
                className="w-full touch-target min-h-[50px] bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-800 font-bold rounded-2xl flex items-center justify-center space-x-2 text-sm transition-all"
              >
                <span>मरीज़ों का इतिहास देखें</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= Screen: HISTORY ================= */}
        {currentScreen === 'history' && (
          <PatientHistory
            language={language}
            onBack={() => setCurrentScreen('home')}
          />
        )}
      </main>

      {/* Hackathon Demo Mode Modal */}
      <DemoModeModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onDemoCompleted={async () => {
          await loadMetrics();
          setCurrentScreen('history');
        }}
      />
    </div>
  );
};
