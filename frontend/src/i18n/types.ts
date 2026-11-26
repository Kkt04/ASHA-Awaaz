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
  processing: string;
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

  // Theme & Navigation
  themeToggleLight: string;
  themeToggleDark: string;
  navHome: string;
  navHowItWorks: string;
  navFeatures: string;
  navImpact: string;
  navAbout: string;
  navLogin: string;
  navGetStarted: string;
  navDashboard: string;
  signOut: string;
  signOutConfirmTitle: string;
  signOutConfirmDesc: string;
  signOutPendingWarning: string;
  signOutConfirmBtn: string;
  signOutCancelBtn: string;
  signedOutToast: string;

  // Landing Page - Hero
  heroBadge: string;
  heroHeadline: string;
  heroHeadlineSub: string;
  heroSupportingText: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroVisualTag: string;
  heroCardPreviewTitle: string;
  heroCardPreviewSubtitle: string;
  heroCardPreviewDanger: string;

  // Landing Page - How It Works
  howItWorksBadge: string;
  howItWorksTitle: string;
  howItWorksSub: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;

  // Landing Page - Features
  featuresBadge: string;
  featuresTitle: string;
  featuresSub: string;
  feat1Title: string;
  feat1Desc: string;
  feat2Title: string;
  feat2Desc: string;
  feat3Title: string;
  feat3Desc: string;
  feat4Title: string;
  feat4Desc: string;
  feat5Title: string;
  feat5Desc: string;
  feat6Title: string;
  feat6Desc: string;

  // Landing Page - Impact
  impactBadge: string;
  impactTitle: string;
  impactSub: string;
  impactPoint1Title: string;
  impactPoint1Desc: string;
  impactPoint2Title: string;
  impactPoint2Desc: string;
  impactPoint3Title: string;
  impactPoint3Desc: string;

  // Landing Page - Final CTA & Footer
  finalCtaTitle: string;
  finalCtaSub: string;
  finalCtaButton: string;
  footerAboutText: string;
  footerNavTitle: string;
  footerLegalTitle: string;
  privacyPolicy: string;
  termsOfService: string;
  allRightsReserved: string;

  // Auth - Login
  loginSplitHeadline: string;
  loginSplitSub: string;
  loginTitle: string;
  loginSub: string;
  emailOrUsername: string;
  passwordLabel: string;
  showPassword: string;
  hidePassword: string;
  rememberMe: string;
  forgotPassword: string;
  loginButton: string;
  loggingIn: string;
  noAccountPrompt: string;
  signUpLink: string;
  quickDemoLogin: string;
  demoCredentialsNote: string;

  // Auth - Signup
  signupSplitHeadline: string;
  signupSplitSub: string;
  signupTitle: string;
  signupSub: string;
  fullNameLabel: string;
  roleLabel: string;
  roleAshaWorker: string;
  roleAnmNurse: string;
  roleSupervisor: string;
  confirmPasswordLabel: string;
  agreeTerms: string;
  signupButton: string;
  signingUp: string;
  alreadyHaveAccount: string;
  pwdWeak: string;
  pwdMedium: string;
  pwdStrong: string;
  pwdMismatchError: string;
  pwdLengthError: string;
}
