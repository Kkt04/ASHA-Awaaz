import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Play, 
  Baby, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck,
  PhoneCall,
  Volume2
} from 'lucide-react';
import { DEMO_CASES, DemoCase, getDemoCasesForLanguage } from '../utils/demoCases';
import { LanguageCode, StructuredVisitData, RiskEvaluation } from '../types';
import { extractVisitVoice, evaluateRisk, saveVisitRecord } from '../services/api';
import { voiceSynthesizer } from '../services/speechSynthesis';
import { generateSpokenSummaryForLang, getTranslation } from '../i18n';

interface DemoModeModalProps {
  isOpen: boolean;
  language: LanguageCode;
  onClose: () => void;
  onDemoCompleted: (visitId: string) => void;
}

// Multilingual UI strings for the Demo Simulation modal
const DEMO_UI_TEXT: Record<LanguageCode, {
  modalTitle: string;
  modalSubtitle: string;
  selectPatientPrompt: string;
  startSimulationBtn: string;
  step1Title: string;
  step1Listening: string;
  step2Title: string;
  step2Waiting: string;
  step3Title: string;
  step4Confirmed: string;
  step5Title: string;
  step6Title: string;
  dangerAlert: string;
  normalStatus: string;
  patientLabel: string;
  bpLabel: string;
  symptomsLabel: string;
  notRecorded: string;
  finishBtn: string;
  callAnmBtn: string;
  simulatedGreeting: string;
  simulatedConfirm: string;
  simulatedSaved: string;
}> = {
  en: {
    modalTitle: 'Interactive Demo Mode',
    modalSubtitle: 'Experience the full voice workflow without microphone or API keys',
    selectPatientPrompt: 'Select a clinical scenario to test:',
    startSimulationBtn: 'Start Voice Simulation',
    step1Title: 'Voice Recognition (Simulated Speech):',
    step1Listening: 'Simulating spoken visit...',
    step2Title: 'AI Clinical Extraction (Structured Record):',
    step2Waiting: 'Extracting vitals and danger signs...',
    step3Title: 'Voice Readback & Confirmation:',
    step4Confirmed: 'Worker confirmed: "Yes, that is correct." (Saved)',
    step5Title: 'Clinical Risk Engine Evaluation:',
    step6Title: 'Offline Storage (IndexedDB Idempotent Save):',
    dangerAlert: '⚠️ High Risk Danger Sign',
    normalStatus: '✓ Normal Checkup',
    patientLabel: 'Patient:',
    bpLabel: 'Blood Pressure (BP):',
    symptomsLabel: 'Symptoms:',
    notRecorded: 'Not recorded',
    finishBtn: 'Complete Demo & View History',
    callAnmBtn: 'Call ANM Helpline',
    simulatedGreeting: 'Welcome, please speak about the visit.',
    simulatedConfirm: 'Yes, that is correct.',
    simulatedSaved: 'Record saved successfully.',
  },
  hi: {
    modalTitle: 'इंटरैक्टिव डेमो मोड',
    modalSubtitle: 'बिना माइक या API की के पूर्ण वॉइस फ्लो का परीक्षण करें',
    selectPatientPrompt: 'परीक्षण के लिए कोई भी काल्पनिक मरीज़ चुनें:',
    startSimulationBtn: 'डेमो सिमुलेशन शुरू करें',
    step1Title: 'आवाज़ पहचान (सिम्युलेटेड भाषण):',
    step1Listening: 'बोल रहे हैं...',
    step2Title: 'AI क्लिनिकल निष्कर्षण (Structured JSON):',
    step2Waiting: 'डेटा निष्कर्षण हो रहा है...',
    step3Title: 'बोलकर पुष्टि (Text-to-Speech & "हाँ"):',
    step4Confirmed: 'कार्यकर्ता ने कहा: "हाँ, सही है।" (Confirmed)',
    step5Title: 'क्लिनिकल रिस्क इंजन मूल्यांकन:',
    step6Title: 'ऑफ़लाइन सुरक्षित स्टोरेज (IndexedDB & Idempotent Save):',
    dangerAlert: '⚠️ खतरे का लक्षण',
    normalStatus: '✓ सामान्य विज़िट',
    patientLabel: 'मरीज़:',
    bpLabel: 'रक्तचाप (BP):',
    symptomsLabel: 'लक्षण:',
    notRecorded: 'दर्ज नहीं',
    finishBtn: 'डेमो समाप्त करें और हिस्ट्री देखें',
    callAnmBtn: 'एएनएम को कॉल करें',
    simulatedGreeting: 'नमस्ते, विज़िट के बारे में बोलिए।',
    simulatedConfirm: 'हाँ, सही है।',
    simulatedSaved: 'रिकॉर्ड सेव हो गया।',
  },
  ta: {
    modalTitle: 'செயல்முறை டெமோ முறை',
    modalSubtitle: 'மைக்ரோஃபோன் இல்லாமல் முழு குரல் பதிவை சோதிக்கவும்',
    selectPatientPrompt: 'பரிசோதிக்க ஒரு நோயாளி நிலையைத் தேர்ந்தெடுக்கவும்:',
    startSimulationBtn: 'குரல் உருவகப்படுத்துதலைத் தொடங்கவும்',
    step1Title: 'குரல் அறிதல் (உருவகப்படுத்தப்பட்ட பேச்சு):',
    step1Listening: 'பேசப்படுகிறது...',
    step2Title: 'AI மருத்துவ தரவு பிரித்தெடுத்தல்:',
    step2Waiting: 'மருத்துவ விவரங்கள் பெறப்படுகின்றன...',
    step3Title: 'குரல் வாசிப்பு மற்றும் உறுதிப்படுத்தல்:',
    step4Confirmed: 'பணியாளர் கூறினார்: "ஆம், சரியானது." (உறுதிப்படுத்தப்பட்டது)',
    step5Title: 'மருத்துவ ஆபத்து மதிப்பீடு:',
    step6Title: 'ஆஃப்லைன் சேமிப்பகம் (IndexedDB):',
    dangerAlert: '⚠️ ஆபத்தான அறிகுறி',
    normalStatus: '✓ இயல்பானது',
    patientLabel: 'நோயாளி:',
    bpLabel: 'இரத்த அழுத்தம் (BP):',
    symptomsLabel: 'அறிகுறிகள்:',
    notRecorded: 'பதிவாகவில்லை',
    finishBtn: 'டெமோ முடித்து வரலாற்றைக் காண்க',
    callAnmBtn: 'ANM அழைக்கவும்',
    simulatedGreeting: 'வணக்கம், வருகை விவரங்களைப் பேசுங்கள்.',
    simulatedConfirm: 'ஆம், சரியானது.',
    simulatedSaved: 'பதிவு வெற்றிகரமாக சேமிக்கப்பட்டது.',
  },
  bho: {
    modalTitle: 'इंटरैक्टिव डेमो मोड',
    modalSubtitle: 'बिना माइक भा API कुंजी के पूरा आवाज फ्लो टेस्ट करीं',
    selectPatientPrompt: 'जांच खातिर कवनो काल्पनिक मरीज चुनीं:',
    startSimulationBtn: 'डेमो सिमुलेशन शुरू करीं',
    step1Title: 'आवाज पहचान (सिम्युलेटेड बोली):',
    step1Listening: 'बोलल जा रहल बा...',
    step2Title: 'AI डेटा निष्कर्षण (Structured JSON):',
    step2Waiting: 'डेटा निकालल जा रहल बा...',
    step3Title: 'बोल के पुष्टि (Text-to-Speech & "हँ"):',
    step4Confirmed: 'कार्यकर्ता कहली: "हँ, एकदम सही बा।" (Confirmed)',
    step5Title: 'क्लिनिकल रिस्क इंजन जांच:',
    step6Title: 'ऑफलाइन सुरक्षित स्टोरेज (IndexedDB):',
    dangerAlert: '⚠️ खतरा के लक्षण',
    normalStatus: '✓ सामान्य जांच',
    patientLabel: 'मरीज:',
    bpLabel: 'रक्तचाप (BP):',
    symptomsLabel: 'लक्षण:',
    notRecorded: 'दर्ज नइखे',
    finishBtn: 'डेमो खतम करीं आ हिस्ट्री देखीं',
    callAnmBtn: 'एएनएम के फोन करीं',
    simulatedGreeting: 'प्रणाम, विज़िट के बारे में बोलीं।',
    simulatedConfirm: 'हँ, एकदम सही बा।',
    simulatedSaved: 'रिकॉर्ड सहेज लिहल गइल बा।',
  }
};

export const DemoModeModal: React.FC<DemoModeModalProps> = ({
  isOpen,
  language,
  onClose,
  onDemoCompleted,
}) => {
  const availableCases = getDemoCasesForLanguage(language);
  const [selectedCase, setSelectedCase] = useState<DemoCase>(() => availableCases[0]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [displayedTranscript, setDisplayedTranscript] = useState<string>('');
  const [extractedData, setExtractedData] = useState<StructuredVisitData | null>(null);
  const [riskEval, setRiskEval] = useState<RiskEvaluation | null>(null);

  const hasSavedDemoRef = useRef<boolean>(false);
  const currentDemoCaseIdRef = useRef<string>('');
  const typeIntervalRef = useRef<any>(null);

  const ui = DEMO_UI_TEXT[language] || DEMO_UI_TEXT.en;

  // Whenever language changes or modal opens, update selected case to match the active language
  useEffect(() => {
    if (isOpen) {
      const casesForLang = getDemoCasesForLanguage(language);
      setSelectedCase(casesForLang[0] || DEMO_CASES[0]);
      setIsRunning(false);
      setCurrentStep(0);
      setDisplayedTranscript('');
      setExtractedData(null);
      setRiskEval(null);
    }
  }, [language, isOpen]);

  // Clean up timers and audio when unmounting
  useEffect(() => {
    return () => {
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
      voiceSynthesizer.stop();
    };
  }, []);

  if (!isOpen) return null;

  const runAutomatedDemo = async (demoCase: DemoCase) => {
    setIsRunning(true);
    setCurrentStep(1); // Step 1: Listening animation
    setDisplayedTranscript('');
    setExtractedData(null);
    setRiskEval(null);
    hasSavedDemoRef.current = false;
    currentDemoCaseIdRef.current = `CASE_DEMO_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Speak initial greeting in the user's SELECTED language
    voiceSynthesizer.speak(ui.simulatedGreeting, language);

    // Simulate speech typing in real-time
    const fullText = demoCase.transcript;
    let charIdx = 0;
    if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);

    typeIntervalRef.current = setInterval(() => {
      charIdx += 3;
      setDisplayedTranscript(fullText.slice(0, charIdx));
      if (charIdx >= fullText.length) {
        clearInterval(typeIntervalRef.current);
        proceedToExtraction(demoCase);
      }
    }, 75);
  };

  const proceedToExtraction = async (demoCase: DemoCase) => {
    setCurrentStep(2); // Step 2: Extraction
    // Extract structured clinical data in user's selected language
    const res = await extractVisitVoice(demoCase.transcript, language);
    setExtractedData(res.extracted);

    // Evaluate risk rules
    const risk = await evaluateRisk(res.extracted);
    setRiskEval(risk);

    // Move to Step 3: Confirmation readback
    setTimeout(() => {
      setCurrentStep(3);
      const summaryToSpeak =
        language === 'ta'
          ? res.summaryTa
          : language === 'en'
          ? res.summaryEn
          : language === 'bho'
          ? generateSpokenSummaryForLang(res.extracted, 'bho')
          : res.summaryHi;

      // Speak readback summary in user's SELECTED language
      voiceSynthesizer.speak(summaryToSpeak, language, () => {
        // Step 4: Worker verbal confirmation
        setTimeout(async () => {
          setCurrentStep(4);
          voiceSynthesizer.speak(ui.simulatedConfirm, language, async () => {
            // Step 5: Save record idempotently
            if (hasSavedDemoRef.current) return;
            hasSavedDemoRef.current = true;

            setCurrentStep(5);
            await saveVisitRecord(
              res.extracted,
              risk,
              demoCase.transcript,
              language,
              currentDemoCaseIdRef.current
            );

            voiceSynthesizer.speak(ui.simulatedSaved, language);

            setTimeout(() => {
              setCurrentStep(6); // Step 6: Complete
            }, 1000);
          });
        }, 800);
      });
    }, 1200);
  };

  const handleFinish = () => {
    voiceSynthesizer.stop();
    setIsRunning(false);
    onClose();
    onDemoCompleted('demo');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-dark-card rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-emerald-100 dark:border-dark-border text-left relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-dark-border">
          <div className="flex items-center space-x-2 text-health-dark dark:text-emerald-400">
            <Sparkles className="w-6 h-6 text-emerald-600 animate-pulse" />
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {ui.modalTitle}
              </h3>
              <p className="text-xs text-gray-500 dark:text-dark-muted font-medium">
                {ui.modalSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              voiceSynthesizer.stop();
              onClose();
            }}
            className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 touch-target"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Not running: Case Selector */}
        {!isRunning ? (
          <div className="py-4 space-y-4">
            <p className="text-xs text-gray-600 dark:text-dark-muted font-semibold">
              {ui.selectPatientPrompt}
            </p>

            <div className="space-y-2.5">
              {availableCases.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedCase(item)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedCase.id === item.id
                      ? 'border-health-primary bg-emerald-50/60 dark:bg-emerald-950/40 shadow-sm'
                      : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-dark-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {item.title}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        item.expectedRisk === 'danger'
                          ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {item.expectedRisk === 'danger' ? ui.dangerAlert : ui.normalStatus}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-dark-muted">{item.description}</p>
                  <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-300 font-mono bg-gray-50 dark:bg-dark-surface p-2 rounded-xl border border-gray-100 dark:border-dark-border italic">
                    "{item.transcript}"
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => runAutomatedDemo(selectedCase)}
              className="w-full touch-target min-h-[54px] mt-4 bg-health-dark hover:bg-health-primary text-white font-extrabold rounded-2xl shadow-elevated flex items-center justify-center space-x-2 text-base transition-all active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{ui.startSimulationBtn}</span>
            </button>
          </div>
        ) : (
          /* Running: Step-by-Step Simulated Walkthrough */
          <div className="py-4 space-y-4">
            {/* Step 1: Listening & Live Transcript */}
            <div
              className={`p-3.5 rounded-2xl border ${
                currentStep >= 1
                  ? 'border-health-primary bg-emerald-50/40 dark:bg-emerald-950/30'
                  : 'border-gray-200 dark:border-dark-border opacity-50'
              }`}
            >
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>{ui.step1Title}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white italic min-h-[44px]">
                "{displayedTranscript || ui.step1Listening}"
              </p>
            </div>

            {/* Step 2: Extraction & Risk check */}
            <div
              className={`p-3.5 rounded-2xl border ${
                currentStep >= 2
                  ? 'border-health-primary bg-emerald-50/40 dark:bg-emerald-950/30'
                  : 'border-gray-200 dark:border-dark-border opacity-50'
              }`}
            >
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>{ui.step2Title}</span>
              </div>
              {extractedData ? (
                <div className="text-xs space-y-1 bg-white dark:bg-dark-surface p-2.5 rounded-xl border border-emerald-200 dark:border-dark-border">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-dark-muted">{ui.patientLabel}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{extractedData.patient_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-dark-muted">{ui.bpLabel}</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {extractedData.vitals?.blood_pressure?.systolic
                        ? `${extractedData.vitals.blood_pressure.systolic}/${extractedData.vitals.blood_pressure.diastolic} mmHg`
                        : ui.notRecorded}
                    </span>
                  </div>
                  {extractedData.symptoms && extractedData.symptoms.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-dark-muted">{ui.symptomsLabel}</span>
                      <span className="font-bold text-amber-700 dark:text-amber-300">
                        {extractedData.symptoms.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-dark-muted">{ui.step2Waiting}</p>
              )}
            </div>

            {/* Step 3 & 4: Voice Confirmation */}
            <div
              className={`p-3.5 rounded-2xl border ${
                currentStep >= 3
                  ? 'border-health-primary bg-emerald-50/40 dark:bg-emerald-950/30'
                  : 'border-gray-200 dark:border-dark-border opacity-50'
              }`}
            >
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>{ui.step3Title}</span>
              </div>
              <div className="text-xs text-gray-700 dark:text-dark-text bg-white dark:bg-dark-surface p-2 rounded-xl border border-emerald-200 dark:border-dark-border">
                {currentStep >= 4 ? (
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                    {ui.step4Confirmed}
                  </span>
                ) : (
                  <span className="flex items-center text-gray-500 dark:text-dark-muted">
                    <Volume2 className="w-4 h-4 mr-1 animate-pulse text-emerald-600" />
                    Audio readback in progress...
                  </span>
                )}
              </div>
            </div>

            {/* Step 5 & 6: Saved & Risk Alert */}
            {currentStep >= 5 && riskEval && (
              <div
                className={`p-3.5 rounded-2xl border animate-in slide-in-from-bottom-2 ${
                  riskEval.is_high_risk
                    ? 'border-red-300 dark:border-red-900 bg-red-50/60 dark:bg-red-950/40 text-danger-deep dark:text-red-300'
                    : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold">
                    {riskEval.is_high_risk ? (
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span>
                      {riskEval.is_high_risk ? ui.dangerAlert : ui.normalStatus}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-dark-surface border border-current">
                    IndexedDB ✓
                  </span>
                </div>

                {riskEval.is_high_risk && (
                  <div className="mt-2 pt-2 border-t border-red-200/60 dark:border-red-900/60 flex items-center justify-between">
                    <span className="text-[11px] font-semibold">1-Tap Emergency Hotline:</span>
                    <a
                      href="tel:+919876543210"
                      className="py-1 px-2.5 rounded-lg bg-red-600 text-white font-bold text-xs flex items-center space-x-1 shadow-sm"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>{ui.callAnmBtn}</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Step 6 Complete: Dismiss Button */}
            {currentStep >= 6 && (
              <button
                type="button"
                onClick={handleFinish}
                className="w-full touch-target min-h-[50px] mt-3 bg-health-primary hover:bg-health-dark text-white font-bold rounded-2xl shadow-md flex items-center justify-center space-x-2 text-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span>{ui.finishBtn}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
