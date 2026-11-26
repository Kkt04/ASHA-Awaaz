export type LanguageCode = 'en' | 'hi' | 'ta' | 'bho';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  speechLang: string; // SpeechRecognition & SpeechSynthesis tag (e.g. en-IN, hi-IN, ta-IN)
  speechEngineNote?: string;
}

export interface TranslationSchema {
  // Brand & Header
  appName: string;
  appSubtitle: string;
  subCentreName: string;
  workerGreeting: string;
  online: string;
  offline: string;
  pendingSync: string;
  synced: string;
  switchLanguage: string;

  // Home Dashboard
  totalVisits: string;
  highRiskCases: string;
  todayVisits: string;
  patientHistory: string;
  recentVisits: string;
  viewAll: string;
  speakVisitButton: string;
  speakVisitSub: string;
  tapToRecord: string;
  demoModeBtn: string;
  examplePromptTitle: string;
  examplePromptText: string;
  noRecentVisits: string;

  // Voice Recording Screen
  listening: string;
  stopListening: string;
  cancel: string;
  liveTranscriptHeader: string;
  liveTranscriptListening: string;
  liveTranscriptPlaceholder: string;
  noiseWarning: string;
  noMicSupportTitle: string;
  noMicSupportDesc: string;
  presetPromptSample1: string;
  presetPromptSample2: string;

  // Visit Card & Patient Data Labels
  visitSummaryCard: string;
  patientName: string;
  nameNotRecorded: string;
  category: string;
  pregnantWoman: string;
  newborn: string;
  child: string;
  lactatingMother: string;
  generalPatient: string;
  pregnancyMonth: string;
  newbornAgeDays: string;
  childAgeYears: string;
  months: string;
  days: string;
  years: string;
  bloodPressure: string;
  temperature: string;
  weight: string;
  symptoms: string;
  medicines: string;
  ironTablet: string;
  calciumTablet: string;
  taken: string;
  missed: string;
  notRecorded: string;
  noSpecificSymptoms: string;
  originalTranscriptLabel: string;
  engineLabelGroq: string;
  engineLabelDeterministic: string;

  // Clinical Risk Banner
  dangerTitle: string;
  dangerSub: string;
  identifiedDangerSigns: string;
  callAnm: string;
  emergency108: string;
  disclaimer: string;
  normalStatusTitle: string;
  normalStatusDesc: string;

  // Confirmation Screen
  isThisCorrect: string;
  sayHaanToConfirm: string;
  confirmYes: string;
  correctField: string;
  replayAudio: string;
  readingRecord: string;
  listeningForReplyPrompt: string;
  confirmByButtonsPrompt: string;
  detectedSpeech: string;
  quickCorrectionTitle: string;
  bpNormalQuick: string;
  bpMildQuick: string;
  bpHigherQuick: string;

  // Saved Confirmation
  recordSavedSuccess: string;
  recordSavedDesc: string;
  nextVisitBtn: string;
  viewHistoryBtn: string;

  // Patient History Screen
  searchPatientVoice: string;
  allFilter: string;
  dangerFilter: string;
  pregnantFilter: string;
  newbornFilter: string;
  noRecordsFound: string;
  backToHome: string;
  backToList: string;
  visitDate: string;
  syncStatusLabel: string;
  syncStatusCloud: string;
  syncStatusPending: string;

  // Audio prompts & greetings
  welcomeAudio: string;
  promptAudio: string;
  confirmAudio: string;
  silenceAudio: string;
  confirmationQuestion: string;
  confirmedAnswer: string;

  // Category & Symptom dictionaries
  categories: Record<string, string>;
  symptomsMap: Record<string, string>;
  medicinesMap: Record<string, string>;
}
