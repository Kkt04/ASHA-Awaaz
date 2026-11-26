import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Play, 
  Baby, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  PhoneCall
} from 'lucide-react';
import { DEMO_CASES, DemoCase } from '../utils/demoCases';
import { LanguageCode, StructuredVisitData, RiskEvaluation } from '../types';
import { extractVisitVoice, evaluateRisk, saveVisitRecord } from '../services/api';
import { voiceSynthesizer } from '../services/speechSynthesis';

interface DemoModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDemoCompleted: (visitId: string) => void;
}

export const DemoModeModal: React.FC<DemoModeModalProps> = ({
  isOpen,
  onClose,
  onDemoCompleted,
}) => {
  const [selectedCase, setSelectedCase] = useState<DemoCase>(DEMO_CASES[0]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [displayedTranscript, setDisplayedTranscript] = useState<string>('');
  const [extractedData, setExtractedData] = useState<StructuredVisitData | null>(null);
  const [riskEval, setRiskEval] = useState<RiskEvaluation | null>(null);

  if (!isOpen) return null;

  const runAutomatedDemo = async (demoCase: DemoCase) => {
    setIsRunning(true);
    setCurrentStep(1); // Step 1: Listening animation
    setDisplayedTranscript('');
    setExtractedData(null);
    setRiskEval(null);

    // Speak initial prompt
    voiceSynthesizer.speak(
      demoCase.language === 'ta'
        ? 'வணக்கம், வருகை விவரங்களைப் பேசுங்கள்.'
        : 'नमस्ते, विज़िट के बारे में बोलिए।',
      demoCase.language
    );

    // Simulate speech typing in real-time
    const fullText = demoCase.transcript;
    let charIdx = 0;
    const typeInterval = setInterval(() => {
      charIdx += 3;
      setDisplayedTranscript(fullText.slice(0, charIdx));
      if (charIdx >= fullText.length) {
        clearInterval(typeInterval);
        proceedToExtraction(demoCase);
      }
    }, 80);
  };

  const proceedToExtraction = async (demoCase: DemoCase) => {
    setCurrentStep(2); // Step 2: Extraction
    // Extract structured data
    const res = await extractVisitVoice(demoCase.transcript, demoCase.language);
    setExtractedData(res.extracted);

    // Evaluate risk
    const risk = await evaluateRisk(res.extracted);
    setRiskEval(risk);

    // Move to Step 3: Confirmation read-aloud
    setTimeout(() => {
      setCurrentStep(3);
      const summaryToSpeak = demoCase.language === 'ta' ? res.summaryTa : res.summaryHi;
      voiceSynthesizer.speak(summaryToSpeak, demoCase.language, () => {
        // Step 4: Simulated "Haan" confirmation
        setTimeout(async () => {
          setCurrentStep(4);
          voiceSynthesizer.speak('हाँ, सही है।', demoCase.language, async () => {
            // Step 5: Save record
            setCurrentStep(5);
            const saved = await saveVisitRecord(
              res.extracted,
              risk,
              demoCase.transcript,
              demoCase.language
            );
            voiceSynthesizer.speak('रिकॉर्ड सेव हो गया।', demoCase.language);

            setTimeout(() => {
              setCurrentStep(6); // Step 6: Complete
            }, 1000);
          });
        }, 1000);
      });
    }, 1200);
  };

  const handleFinish = () => {
    setIsRunning(false);
    onClose();
    onDemoCompleted('demo');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-health-mintborder text-left relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2 text-health-dark">
            <Sparkles className="w-6 h-6 text-emerald-600 animate-pulse" />
            <div>
              <h3 className="text-xl font-bold">हैकथॉन डेमो मोड</h3>
              <p className="text-xs text-gray-500 font-medium">
                बिना माइक या API की के पूर्ण फ्लो का परीक्षण
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              voiceSynthesizer.stop();
              onClose();
            }}
            className="p-1 rounded-full text-gray-400 hover:text-gray-700 touch-target"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Not running: Case Selector */}
        {!isRunning ? (
          <div className="py-4 space-y-4">
            <p className="text-xs text-gray-600 font-semibold">
              परीक्षण के लिए कोई भी काल्पनिक मरीज़ चुनें:
            </p>

            <div className="space-y-2.5">
              {DEMO_CASES.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedCase(item)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedCase.id === item.id
                      ? 'border-health-primary bg-emerald-50/60 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900 text-sm">
                      {item.title}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        item.expectedRisk === 'danger'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.expectedRisk === 'danger' ? '⚠️ खतरे का लक्षण' : '✓ सामान्य'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{item.description}</p>
                  <div className="mt-2 text-[11px] text-gray-500 font-mono bg-white p-2 rounded border border-gray-100 italic">
                    "{item.transcript}"
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => runAutomatedDemo(selectedCase)}
              className="w-full touch-target min-h-[54px] mt-4 bg-health-dark hover:bg-health-primary text-white font-extrabold rounded-2xl shadow-elevated flex items-center justify-center space-x-2 text-base transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>डेमो सिमुलेशन शुरू करें</span>
            </button>
          </div>
        ) : (
          /* Running: Step-by-Step Simulated Walkthrough */
          <div className="py-4 space-y-4">
            {/* Step 1: Listening & Live Transcript */}
            <div
              className={`p-3.5 rounded-2xl border ${
                currentStep >= 1 ? 'border-health-primary bg-emerald-50/30' : 'border-gray-200 opacity-50'
              }`}
            >
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>आवाज़ पहचान (सिम्युलेटेड भाषण):</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 italic min-h-[44px]">
                "{displayedTranscript || 'बोल रहे हैं...'}"
              </p>
            </div>

            {/* Step 2: Extraction & Risk check */}
            <div
              className={`p-3.5 rounded-2xl border ${
                currentStep >= 2 ? 'border-health-primary bg-emerald-50/30' : 'border-gray-200 opacity-50'
              }`}
            >
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>AI डेटा निष्कर्षण (Structured JSON):</span>
              </div>
              {extractedData ? (
                <div className="text-xs space-y-1 bg-white p-2 rounded-lg border border-emerald-200">
                  <div className="flex justify-between">
                    <span className="text-gray-500">मरीज़:</span>
                    <span className="font-bold text-gray-900">{extractedData.patient_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">रक्तचाप (BP):</span>
                    <span className="font-bold text-gray-900">
                      {extractedData.vitals?.blood_pressure?.systolic
                        ? `${extractedData.vitals.blood_pressure.systolic}/${extractedData.vitals.blood_pressure.diastolic} mmHg`
                        : 'दर्ज नहीं'}
                    </span>
                  </div>
                  {extractedData.symptoms?.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">लक्षण:</span>
                      <span className="font-bold text-amber-800">
                        {extractedData.symptoms.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">निष्कर्षण की प्रतीक्षा...</p>
              )}
            </div>

            {/* Step 3 & 4: Voice Confirmation */}
            <div
              className={`p-3.5 rounded-2xl border ${
                currentStep >= 3 ? 'border-health-primary bg-emerald-50/30' : 'border-gray-200 opacity-50'
              }`}
            >
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>बोलकर पुष्टि (Text-to-Speech & "हाँ"):</span>
              </div>
              <div className="text-xs text-gray-700 bg-white p-2 rounded-lg border border-emerald-200">
                {currentStep >= 4 ? (
                  <span className="font-bold text-emerald-800 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                    कार्यकर्ता ने कहा: "हाँ, सही है।" (Confirmed)
                  </span>
                ) : (
                  <span>आवाज़ पढ़कर सुनाई जा रही है...</span>
                )}
              </div>
            </div>

            {/* Step 5: Risk Alert & Call ANM (if danger) */}
            {riskEval && riskEval.is_high_risk && (
              <div className="p-3.5 rounded-2xl bg-red-50 border-2 border-red-500 text-left space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-red-900">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>खतरे का संकेत मिला (Danger Warning)!</span>
                </div>
                <p className="text-xs font-semibold text-red-800">
                  {riskEval.emergency_action}
                </p>
                <div className="inline-flex items-center space-x-1 text-xs bg-red-700 text-white px-3 py-1 rounded-lg font-bold">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call ANM: {riskEval.call_anm_phone}</span>
                </div>
              </div>
            )}

            {/* Step 6: Saved Locally */}
            {currentStep >= 6 && (
              <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-400 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
                <h4 className="font-bold text-emerald-950 text-base">
                  रिकॉर्ड IndexedDB में सुरक्षित सहेज लिया गया!
                </h4>
                <p className="text-xs text-emerald-800">
                  इंटरनेट वापस आने पर बैकएंड के साथ अपने आप सिंक होगा।
                </p>
                <button
                  onClick={handleFinish}
                  className="w-full touch-target min-h-[48px] bg-emerald-800 text-white font-bold rounded-xl shadow-md text-sm mt-2"
                >
                  डेमो समाप्त करें और इतिहास देखें
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
