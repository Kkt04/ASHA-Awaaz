import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  Plus, 
  ShieldCheck, 
  Activity,
  ArrowLeft,
  HeartPulse
} from 'lucide-react';
import { 
  LanguageCode, 
  AppScreen, 
  StructuredVisitData, 
  RiskEvaluation, 
  LocalVisitRecord 
} from './types';
import { getTranslation, generateSpokenSummaryForLang } from './i18n';
import { Header } from './components/Header';
import { VoiceRecorder } from './components/VoiceRecorder';
import { VisitCard } from './components/VisitCard';
import { RiskBanner } from './components/RiskBanner';
import { VoiceConfirmation } from './components/VoiceConfirmation';
import { PatientHistory } from './components/PatientHistory';
import { TotalRegisteredPatients } from './components/TotalRegisteredPatients';
import { FieldVisitRecords } from './components/FieldVisitRecords';
import { AuthenticatedDashboard } from './components/AuthenticatedDashboard';
import { DemoModeModal } from './components/DemoModeModal';
import { SignOutConfirmModal } from './components/SignOutConfirmModal';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { seedLocalDemoPatients, db } from './db/dexie';
import { extractVisitVoice, evaluateRisk, saveVisitRecord, syncPendingVisits } from './services/api';
import { voiceSynthesizer } from './services/speechSynthesis';
import { authService, WorkerUser } from './services/auth';

export const App: React.FC = () => {
  // Global Language state (Default to English as required)
  const [language, setLanguage] = useState<LanguageCode>('en');

  // Authentication & Current User State
  const [currentUser, setCurrentUser] = useState<WorkerUser | null>(() => authService.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticated());

  // Screen Routing: default to 'landing' for public visitors, or 'home' if logged in
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(() => {
    return authService.isAuthenticated() ? 'home' : 'landing';
  });

  // Active visit recording and confirmation state
  const [currentCaseId, setCurrentCaseId] = useState<string>('');
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [structuredData, setStructuredData] = useState<StructuredVisitData | null>(null);
  const [riskEvaluation, setRiskEvaluation] = useState<RiskEvaluation | null>(null);
  const [spokenSummary, setSpokenSummary] = useState<string>('');
  const [engineUsed, setEngineUsed] = useState<string>('groq_llm');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const isSavingRef = React.useRef<boolean>(false);

  // Home metrics & Modals
  const [allVisits, setAllVisits] = useState<LocalVisitRecord[]>([]);
  const [totalVisits, setTotalVisits] = useState<number>(0);
  const [highRiskCount, setHighRiskCount] = useState<number>(0);
  const [recentVisits, setRecentVisits] = useState<LocalVisitRecord[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [historyContextTitle, setHistoryContextTitle] = useState<string | undefined>(undefined);
  const [selectedHistoryVisitId, setSelectedHistoryVisitId] = useState<string | undefined>(undefined);
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>(undefined);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = getTranslation(language);

  // Initialize Theme preference on launch (Default to 'light' as specified)
  useEffect(() => {
    const savedTheme = localStorage.getItem('asha_theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Initialize Language preference & restore active authenticated session
  useEffect(() => {
    const savedLang = localStorage.getItem('asha_language') as LanguageCode;
    if (savedLang && ['en', 'hi', 'ta', 'bho'].includes(savedLang)) {
      setLanguage(savedLang);
    } else {
      setLanguage('en');
      localStorage.setItem('asha_language', 'en');
    }

    // Restore authenticated session from localStorage
    const token = authService.getToken();
    const cachedUser = authService.getUser();
    if (token && cachedUser) {
      setCurrentUser(cachedUser);
      setIsAuthenticated(true);
      setCurrentScreen('home');

      // Verify session with backend to ensure token validity
      authService.fetchProfile().then((freshUser) => {
        if (freshUser) {
          setCurrentUser(freshUser);
        } else {
          // Token expired or invalid
          setIsAuthenticated(false);
          setCurrentUser(null);
          setCurrentScreen('landing');
        }
      });
    }
  }, []);

  // Isolate data loading whenever the logged-in user changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.worker_id === 'ASHA_WORKER_001') {
        // Seed demo patients exclusively for the demo account
        seedLocalDemoPatients('ASHA_WORKER_001').then(() => loadMetrics(currentUser.worker_id));
      } else {
        // Newly registered users start with an isolated, empty dashboard
        loadMetrics(currentUser.worker_id);
      }
    } else {
      setTotalVisits(0);
      setHighRiskCount(0);
      setRecentVisits([]);
      setPendingSyncCount(0);
    }
  }, [currentUser]);

  const loadMetrics = async (targetWorkerId?: string) => {
    try {
      const workerId = targetWorkerId || currentUser?.worker_id;
      if (!workerId) {
        setAllVisits([]);
        setTotalVisits(0);
        setHighRiskCount(0);
        setRecentVisits([]);
        setPendingSyncCount(0);
        return;
      }

      // Query only records belonging to the authenticated worker
      const userVisits = await db.visits.where('worker_id').equals(workerId).reverse().sortBy('created_at');
      setAllVisits(userVisits);
      setTotalVisits(userVisits.length);
      const highRisk = userVisits.filter((v) => v.risk_evaluation?.is_high_risk).length;
      setHighRiskCount(highRisk);
      setRecentVisits(userVisits.slice(0, 5));
      const pending = await db.visits
        .where('worker_id')
        .equals(workerId)
        .filter((v) => v.sync_status === 'pending')
        .count();
      setPendingSyncCount(pending);
    } catch (e) {
      console.warn('Could not load metrics from db:', e);
    }
  };

  /**
   * Instant Global Language Switching
   */
  const handleLanguageChange = (newLang: LanguageCode) => {
    setLanguage(newLang);
    localStorage.setItem('asha_language', newLang);

    if (structuredData) {
      const newSummary = generateSpokenSummaryForLang(structuredData, newLang);
      setSpokenSummary(newSummary);
    }
  };

  /**
   * Authentication Handlers
   */
  const handleLoginSuccess = (user: WorkerUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentScreen('home');
    loadMetrics();
    showToast(`Welcome back, ${user.name}`);
  };

  const handleSignupSuccess = (user: WorkerUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentScreen('home');
    loadMetrics();
    showToast(`Account created for ${user.name}`);
  };

  const handleConfirmSignOut = async () => {
    setIsSignOutModalOpen(false);
    await authService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setTotalVisits(0);
    setHighRiskCount(0);
    setRecentVisits([]);
    setPendingSyncCount(0);
    setCurrentScreen('landing');
    showToast(t.signedOutToast);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  /**
   * Visit Recording Handlers
   */
  const handleStartRecording = () => {
    // Generate ONE unique case ID when starting a new case
    const newCaseId = `CASE_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setCurrentCaseId(newCaseId);
    setCurrentTranscript('');
    setStructuredData(null);
    setRiskEvaluation(null);
    setSpokenSummary('');
    setIsSaving(false);
    isSavingRef.current = false;
    setCurrentScreen('recording');
  };

  const handleStartRecordingForPatient = (patient: { name: string; patient_id: string; category?: string }) => {
    const newCaseId = `CASE_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setCurrentCaseId(newCaseId);
    setCurrentTranscript('');
    setStructuredData({
      patient_name: patient.name,
      category: (patient.category as any) || 'pregnant_woman',
      vitals: {},
      symptoms: [],
      medicines: [],
      missing_fields: [],
      uncertain_fields: [],
      original_transcript: ''
    });
    setRiskEvaluation(null);
    setSpokenSummary('');
    setIsSaving(false);
    isSavingRef.current = false;
    setCurrentScreen('recording');
    showToast(`Recording new visit for ${patient.name}`);
  };

  const handleFinishRecording = async (transcript: string) => {
    const clean = transcript.trim();
    if (!clean) {
      console.warn('Cannot process empty transcript');
      return;
    }

    setCurrentTranscript(clean);
    setIsProcessing(true);

    try {
      // 1. Extract clinical information via Groq LLM or deterministic fallback
      const extractionRes = await extractVisitVoice(transcript, language);
      setStructuredData(extractionRes.extracted);
      setEngineUsed(extractionRes.engine);

      // 2. Evaluate clinical danger rules (updates risk status, does NOT create a record)
      const risk = await evaluateRisk(extractionRes.extracted);
      setRiskEvaluation(risk);

      // 3. Generate summary in current selected language
      const summary = generateSpokenSummaryForLang(extractionRes.extracted, language);
      setSpokenSummary(summary);

      setCurrentScreen('confirmation');
    } catch (err) {
      console.error('Error processing visit recording:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!structuredData || !riskEvaluation) return;
    // Idempotency guard: prevent duplicate submissions from rapid clicks or multiple voice triggers
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const caseIdToSave = currentCaseId || `CASE_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await saveVisitRecord(
        structuredData,
        riskEvaluation,
        currentTranscript,
        language,
        caseIdToSave,
        currentUser?.worker_id
      );
      await loadMetrics(currentUser?.worker_id);

      voiceSynthesizer.speak(t.confirmAudio, language);
      showToast('Case recorded successfully.');
      setCurrentScreen('saved');
    } catch (err) {
      console.error('Error saving visit record:', err);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  const handleCorrection = async (
    updatedData: StructuredVisitData,
    newSummary: string
  ) => {
    setStructuredData(updatedData);
    setSpokenSummary(newSummary);
    // Re-evaluate risk for the SAME case
    try {
      const updatedRisk = await evaluateRisk(updatedData);
      setRiskEvaluation(updatedRisk);
    } catch {
      // local fallback
    }
  };

  // ================= 1. PUBLIC LANDING PAGE =================
  if (currentScreen === 'landing') {
    return (
      <>
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-health-dark text-white font-semibold text-sm shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
        <LandingPage
          language={language}
          onLanguageChange={handleLanguageChange}
          onNavigateLogin={() => setCurrentScreen('login')}
          onNavigateSignup={() => setCurrentScreen('signup')}
          onNavigateApp={() => setCurrentScreen('home')}
          isAuthenticated={isAuthenticated}
        />
      </>
    );
  }

  // ================= 2. SPLIT-SCREEN LOGIN PAGE =================
  if (currentScreen === 'login') {
    return (
      <LoginPage
        language={language}
        onLanguageChange={handleLanguageChange}
        onLoginSuccess={handleLoginSuccess}
        onNavigateSignup={() => setCurrentScreen('signup')}
        onNavigateHome={() => setCurrentScreen('landing')}
      />
    );
  }

  // ================= 3. SPLIT-SCREEN SIGNUP PAGE =================
  if (currentScreen === 'signup') {
    return (
      <SignupPage
        language={language}
        onLanguageChange={handleLanguageChange}
        onSignupSuccess={handleSignupSuccess}
        onNavigateLogin={() => setCurrentScreen('login')}
        onNavigateHome={() => setCurrentScreen('landing')}
      />
    );
  }

  // ================= 4. AUTHENTICATED REGISTER / DASHBOARD APPLICATION =================
  return (
    <div className="min-h-screen bg-surface-warm dark:bg-dark-bg text-gray-900 dark:text-dark-text flex flex-col transition-colors duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-health-dark text-white font-semibold text-sm shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Authenticated Sticky Header */}
      <Header
        language={language}
        onLanguageChange={handleLanguageChange}
        onHomeClick={() => setCurrentScreen('home')}
        onLandingClick={() => setCurrentScreen('landing')}
        user={currentUser}
        onRequestSignOut={() => setIsSignOutModalOpen(true)}
      />

      {/* Processing Spinner Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl p-6 flex flex-col items-center space-y-4 shadow-elevated max-w-xs text-center">
            <div className="w-14 h-14 rounded-full bg-health-mint dark:bg-emerald-950 flex items-center justify-center text-health-primary dark:text-emerald-400">
              <Sparkles className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-base">
                {t.processing || 'Processing voice visit...'}
              </h4>
              <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">
                Extracting clinical vitals & danger signs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto pb-12 transition-all ${
        currentScreen === 'home' || currentScreen === 'patients' || currentScreen === 'visits' ? 'max-w-5xl px-4 sm:px-6 pt-2' : 'max-w-2xl px-4 pt-2'
      }`}>
        
        {/* ================= Screen: HOME DASHBOARD ================= */}
        {currentScreen === 'home' && (
          <AuthenticatedDashboard
            language={language}
            currentUser={currentUser}
            visits={allVisits}
            pendingSyncCount={pendingSyncCount}
            onStartRecording={handleStartRecording}
            onViewPatients={() => {
              setSelectedPatientId(undefined);
              setCurrentScreen('patients');
            }}
            onViewVisits={(filter) => {
              setHistoryFilter(filter || 'all');
              setSelectedHistoryVisitId(undefined);
              setCurrentScreen('visits');
            }}
            onSelectVisit={(visitId) => {
              setSelectedHistoryVisitId(visitId);
              setCurrentScreen('visits');
            }}
            onOpenDemoModal={() => setIsDemoModalOpen(true)}
            onSyncNow={async () => {
              const res = await syncPendingVisits();
              if (res.synced > 0) {
                showToast(`Synced ${res.synced} record(s) to cloud.`);
              } else {
                showToast('Records are up to date.');
              }
              await loadMetrics(currentUser?.worker_id);
            }}
          />
        )}

        {/* ================= Screen: TOTAL REGISTERED PATIENTS ================= */}
        {currentScreen === 'patients' && (
          <TotalRegisteredPatients
            language={language}
            workerId={currentUser?.worker_id}
            initialPatientId={selectedPatientId}
            onBackToHome={() => {
              setSelectedPatientId(undefined);
              setCurrentScreen('home');
            }}
            onRecordVisitForPatient={handleStartRecordingForPatient}
            onSelectVisitDetail={(visitId) => {
              setSelectedHistoryVisitId(visitId);
              setCurrentScreen('visits');
            }}
          />
        )}

        {/* ================= Screen: FIELD VISIT RECORDS ================= */}
        {(currentScreen === 'visits' || currentScreen === 'history') && (
          <FieldVisitRecords
            language={language}
            workerId={currentUser?.worker_id}
            initialFilter={historyFilter}
            initialVisitId={selectedHistoryVisitId}
            onBackToHome={() => {
              setSelectedHistoryVisitId(undefined);
              setHistoryFilter('all');
              setCurrentScreen('home');
            }}
            onSelectPatient={(patientId) => {
              setSelectedPatientId(patientId);
              setCurrentScreen('patients');
            }}
          />
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
            {/* Clinical Risk Banner */}
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
              isSaving={isSaving}
            />
          </div>
        )}

        {/* ================= Screen: SAVED ================= */}
        {currentScreen === 'saved' && (
          <div className="p-6 text-center space-y-6 max-w-sm mx-auto min-h-[75vh] flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-elevated border-4 border-emerald-300 dark:border-emerald-700 animate-bounce">
              <CheckCircle2 className="w-16 h-16 stroke-[2.5]" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                Case recorded successfully.
              </h2>
              <p className="text-sm font-semibold text-gray-600 dark:text-dark-muted mt-1">
                {t.recordSavedDesc}
              </p>
            </div>

            <div className="w-full space-y-3 pt-4">
              <button
                onClick={handleStartRecording}
                className="w-full touch-target min-h-[56px] bg-health-dark hover:bg-health-primary text-white font-extrabold rounded-2xl shadow-md flex items-center justify-center space-x-2 text-base transition-all"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
                <span>{t.nextVisitBtn}</span>
              </button>

              <button
                onClick={() => setCurrentScreen('visits')}
                className="w-full touch-target min-h-[50px] bg-white dark:bg-dark-card border-2 border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface text-gray-800 dark:text-gray-200 font-bold rounded-2xl flex items-center justify-center space-x-2 text-sm transition-all"
              >
                <span>View Field Visit Records</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Hackathon Demo Mode Modal */}
      <DemoModeModal
        isOpen={isDemoModalOpen}
        language={language}
        onClose={() => setIsDemoModalOpen(false)}
        onDemoCompleted={async () => {
          await loadMetrics(currentUser?.worker_id);
          setCurrentScreen('visits');
        }}
      />

      {/* Sign Out Confirmation Modal */}
      <SignOutConfirmModal
        isOpen={isSignOutModalOpen}
        pendingSyncCount={pendingSyncCount}
        language={language}
        onCancel={() => setIsSignOutModalOpen(false)}
        onConfirm={handleConfirmSignOut}
      />

    </div>
  );
};
