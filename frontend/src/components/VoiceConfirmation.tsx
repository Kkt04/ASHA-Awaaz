import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  Mic, 
  MicOff,
  Volume2, 
  RotateCcw, 
  Edit3, 
  Save, 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { StructuredVisitData, LanguageCode } from '../types';
import { getTranslation } from '../i18n';
import { voiceSynthesizer } from '../services/speechSynthesis';
import { speechRecognitionManager } from '../services/speechRecognition';
import { correctVisitVoice } from '../services/api';

interface VoiceConfirmationProps {
  data: StructuredVisitData;
  summaryText: string;
  language: LanguageCode;
  onConfirm: () => void;
  onCorrectionMade: (updatedData: StructuredVisitData, newSummary: string, fieldsChanged?: string[]) => void;
  isSaving?: boolean;
}

export const VoiceConfirmation: React.FC<VoiceConfirmationProps> = ({
  data,
  summaryText,
  language,
  onConfirm,
  onCorrectionMade,
  isSaving = false,
}) => {
  const [mode, setMode] = useState<'confirming' | 'correcting'>('confirming');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [correctionInput, setCorrectionInput] = useState<string>('');
  const [isProcessingCorrection, setIsProcessingCorrection] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string>('');
  const [errorNotice, setErrorNotice] = useState<string>('');

  const hasTriggeredConfirmRef = useRef<boolean>(false);
  const isSubmittingCorrectionRef = useRef<boolean>(false);
  const t = getTranslation(language);

  // Localized conversation strings
  const strings = {
    en: {
      confirmQuestion: 'Is this information correct?',
      askCorrection: 'Which information should I correct? Speak or type below.',
      whichInfoPrompt: 'Which information should I correct?',
      submitCorrection: 'Submit Correction',
      submitting: 'Updating Details...',
      correctionPlaceholder: 'e.g. "Her age is 28, not 25" or "She does not have fever, only headache"',
      correctionSavedNotice: 'Information updated successfully! Is everything correct now?',
      yesCorrectBtn: 'Yes, Information is Correct',
      noCorrectBtn: 'No, Correct Information',
      listeningPrompt: 'Listening for your answer ("Yes" or "No")...',
      listeningCorrectionPrompt: 'Listening to your correction... Speak now',
      tapToSpeak: 'Tap to speak correction',
      reRecord: 'Re-speak',
      cancelCorrection: 'Back to Confirmation',
      quickBpTip: 'Quick correction: Say "BP 120/80" or "Age 28"'
    },
    hi: {
      confirmQuestion: 'क्या यह जानकारी सही है?',
      askCorrection: 'कौन सी जानकारी सुधारनी है? बोलिए या नीचे लिखिए।',
      whichInfoPrompt: 'कौन सी जानकारी सुधारनी है?',
      submitCorrection: 'सुधार लागू करें',
      submitting: 'सुधार दर्ज हो रहा है...',
      correctionPlaceholder: 'जैसे: "उम्र 25 नहीं 28 है" या "बुखार नहीं है, सिर्फ सिर दर्द है"',
      correctionSavedNotice: 'जानकारी सफलतापूर्वक अपडेट हो गई! क्या अब सब सही है?',
      yesCorrectBtn: 'हाँ, जानकारी सही है',
      noCorrectBtn: 'नहीं, जानकारी सुधारें',
      listeningPrompt: 'जवाब सुन रहे हैं ("हाँ" या "नहीं")...',
      listeningCorrectionPrompt: 'सुधार सुन रहे हैं... अब बोलिए',
      tapToSpeak: 'सुधार बोलने के लिए टैप करें',
      reRecord: 'दोबारा बोलें',
      cancelCorrection: 'वापस जाएं',
      quickBpTip: 'सुझाव: "बीपी 120 बाई 80" या "उम्र 28 साल" बोलें'
    },
    ta: {
      confirmQuestion: 'இந்த தகவல் சரியா?',
      askCorrection: 'எந்த தகவலை திருத்த வேண்டும்? பேசுங்கள் அல்லது எழுதுங்கள்.',
      whichInfoPrompt: 'எந்த தகவலை திருத்த வேண்டும்?',
      submitCorrection: 'திருத்தத்தை சமர்ப்பிக்கவும்',
      submitting: 'புதுப்பிக்கப்படுகிறது...',
      correctionPlaceholder: 'எ.கா: "வயது 28, 25 அல்ல" அல்லது "காய்ச்சல் இல்லை, தலைவலி மட்டுமே"',
      correctionSavedNotice: 'தகவல் வெற்றிகரமாக புதுப்பிக்கப்பட்டது! இப்போது எல்லாம் சரியா?',
      yesCorrectBtn: 'ஆம், தகவல் சரி',
      noCorrectBtn: 'இல்லை, தகவலைத் திருத்து',
      listeningPrompt: 'பதிலை கேட்கிறது ("ஆம்" அல்லது "இல்லை")...',
      listeningCorrectionPrompt: 'திருத்தத்தைக் கேட்கிறது... பேசுங்கள்',
      tapToSpeak: 'திருத்தத்தை பேச தொடவும்',
      reRecord: 'மீண்டும் பேசு',
      cancelCorrection: 'ரத்து செய்',
      quickBpTip: 'குறிப்பு: "பிபி 120/80" அல்லது "வயது 28" என்று கூறவும்'
    },
    bho: {
      confirmQuestion: 'का ई जानकारी ठीक बा?',
      askCorrection: 'कवन जानकारी सुधारे के बा? बोलीं भा नीचे लिखीं।',
      whichInfoPrompt: 'कवन जानकारी सुधारे के बा?',
      submitCorrection: 'सुधार दर्ज करीं',
      submitting: 'सुधारल जा रहल बा...',
      correctionPlaceholder: 'जैसे: "उमिर 25 ना 28 ह" भा "बुखार नइखे, खाली माथा बथा बा"',
      correctionSavedNotice: 'जानकारी सुधर गइल! का अब सब ठीक बा?',
      yesCorrectBtn: 'हाँ, जानकारी सही बा',
      noCorrectBtn: 'ना, जानकारी सुधारीं',
      listeningPrompt: 'जवाब सुनत बानी ("हाँ" भा "ना")...',
      listeningCorrectionPrompt: 'सुधार सुनत बानी... अब बोलीं',
      tapToSpeak: 'सुधार बोले खातिर टैप करीं',
      reRecord: 'फेर बोलीं',
      cancelCorrection: 'पाछे जाईं',
      quickBpTip: 'सुझाव: "बीपी 120 बाई 80" भा "उमिर 28 साल" बोलीं'
    }
  }[language] || {
    confirmQuestion: 'Is this information correct?',
    askCorrection: 'Which information should I correct? Speak or type below.',
    whichInfoPrompt: 'Which information should I correct?',
    submitCorrection: 'Submit Correction',
    submitting: 'Updating Details...',
    correctionPlaceholder: 'e.g. "Her age is 28, not 25" or "She does not have fever, only headache"',
    correctionSavedNotice: 'Information updated successfully! Is everything correct now?',
    yesCorrectBtn: 'Yes, Information is Correct',
    noCorrectBtn: 'No, Correct Information',
    listeningPrompt: 'Listening for your answer ("Yes" or "No")...',
    listeningCorrectionPrompt: 'Listening to your correction... Speak now',
    tapToSpeak: 'Tap to speak correction',
    reRecord: 'Re-speak',
    cancelCorrection: 'Back to Confirmation',
    quickBpTip: 'Quick correction: Say "BP 120/80" or "Age 28"'
  };

  useEffect(() => {
    hasTriggeredConfirmRef.current = false;
    readSummaryAloud();

    return () => {
      voiceSynthesizer.stop();
      speechRecognitionManager.stop();
    };
  }, [summaryText]);

  /**
   * Speak the extracted summary and ask "Is this information correct?"
   */
  const readSummaryAloud = () => {
    setIsSpeaking(true);
    setSuccessNotice('');
    setErrorNotice('');
    voiceSynthesizer.speak(summaryText, language, () => {
      setIsSpeaking(false);
      startListeningForYesNo();
    });
  };

  /**
   * Listen for user saying YES (confirm) or NO (enter correction mode)
   */
  const startListeningForYesNo = () => {
    if (!speechRecognitionManager.isSupported() || hasTriggeredConfirmRef.current || isSaving) return;
    setIsListening(true);

    speechRecognitionManager.start(language, {
      onTranscriptChange: (text, isFinal) => {
        const lower = text.toLowerCase().trim();

        // 1. Check for Affirmation (YES)
        const isYes =
          lower === 'haan' ||
          lower.startsWith('haan') ||
          lower.startsWith('ha ') ||
          lower === 'sahi hai' ||
          lower === 'theek hai' ||
          lower === 'yes' ||
          lower.startsWith('yes') ||
          lower === 'confirm' ||
          lower === 'correct' ||
          lower === 'right' ||
          lower === 'okay' ||
          lower === 'ok' ||
          lower === 'ஆம்' ||
          lower === 'சரி' ||
          lower === 'ठीक बा';

        if (isYes) {
          handleConfirmAction();
          return;
        }

        // 2. Check for Negation (NO)
        const isNo =
          lower === 'nahi' ||
          lower.startsWith('nahi') ||
          lower === 'no' ||
          lower.startsWith('no ') ||
          lower === 'galat' ||
          lower.includes('galat hai') ||
          lower === 'illai' ||
          lower.startsWith('illai') ||
          lower === 'na' ||
          lower.includes('sudhar') ||
          lower.includes('change') ||
          lower.includes('correct');

        if (isNo) {
          speechRecognitionManager.stop();
          enterCorrectionMode();
          return;
        }

        // 3. If user directly speaks a correction phrase (e.g. "Age 28 hai" or "No fever")
        if (isFinal && lower.length > 3) {
          enterCorrectionMode(text);
        }
      },
      onSilenceTimeout: () => {
        setIsListening(false);
      },
      onError: () => {
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
  };

  /**
   * Enter Correction Mode: Ask what information to correct and listen for the correction
   */
  const enterCorrectionMode = (initialText: string = '') => {
    hasTriggeredConfirmRef.current = false;
    setMode('correcting');
    setCorrectionInput(initialText);
    setSuccessNotice('');
    setErrorNotice('');
    setIsSpeaking(true);

    // Speak "Which information should I correct?"
    voiceSynthesizer.speak(strings.whichInfoPrompt, language, () => {
      setIsSpeaking(false);
      startListeningForCorrection();
    });
  };

  /**
   * Listen to the user articulating the correction
   */
  const startListeningForCorrection = () => {
    if (!speechRecognitionManager.isSupported() || isSaving) return;
    setIsListening(true);

    speechRecognitionManager.start(language, {
      onTranscriptChange: (text) => {
        setCorrectionInput(text);
      },
      onSilenceTimeout: () => {
        setIsListening(false);
      },
      onError: () => {
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
  };

  /**
   * Submit Correction: Sends to backend/local engine and updates state
   */
  const handleSubmitCorrection = async () => {
    const textToSubmit = correctionInput.trim();
    if (!textToSubmit || isSubmittingCorrectionRef.current || isProcessingCorrection) return;

    isSubmittingCorrectionRef.current = true;
    setIsProcessingCorrection(true);
    speechRecognitionManager.stop();
    voiceSynthesizer.stop();
    setIsListening(false);
    setErrorNotice('');

    try {
      const result = await correctVisitVoice(textToSubmit, language, data);

      if (result.success && result.updated) {
        // Pass updated data to parent App component
        const newSummary =
          language === 'ta'
            ? result.summaryTa
            : language === 'en'
            ? result.summaryEn
            : result.summaryHi;

        onCorrectionMade(result.updated, newSummary, result.fieldsChanged);

        // Transition back to confirmation with success notice
        setMode('confirming');
        setCorrectionInput('');
        const changedDesc = result.fieldsChanged.length > 0 ? `(${result.fieldsChanged.join(', ')})` : '';
        setSuccessNotice(`✓ ${strings.correctionSavedNotice} ${changedDesc}`);

        // Read updated confirmation prompt aloud: "I've updated the information. Is everything correct now?"
        setIsSpeaking(true);
        const reconfirmPrompt = `${strings.correctionSavedNotice} ${strings.confirmQuestion}`;
        voiceSynthesizer.speak(reconfirmPrompt, language, () => {
          setIsSpeaking(false);
          startListeningForYesNo();
        });
      } else {
        setErrorNotice('Could not apply correction. Please try speaking or typing again.');
      }
    } catch (err: any) {
      console.error('Error submitting correction:', err);
      setErrorNotice(err?.message || 'Failed to submit correction. Please retry.');
    } finally {
      setIsProcessingCorrection(false);
      isSubmittingCorrectionRef.current = false;
    }
  };

  /**
   * Final Confirm & Save
   */
  const handleConfirmAction = () => {
    if (hasTriggeredConfirmRef.current || isSaving) return;
    hasTriggeredConfirmRef.current = true;
    voiceSynthesizer.stop();
    speechRecognitionManager.stop();
    setIsListening(false);
    onConfirm();
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-darkcard border border-health-mintborder dark:border-dark-border p-5 text-center space-y-4">
      {/* Top Header / Voice Status Pill */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center space-x-2 mx-auto">
          {isSpeaking ? (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 rounded-full text-xs font-bold animate-pulse">
              <Volume2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>{t.readingRecord}</span>
            </div>
          ) : isListening ? (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-200 rounded-full text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <span>
                {mode === 'correcting' ? strings.listeningCorrectionPrompt : strings.listeningPrompt}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-muted rounded-full text-xs font-semibold">
              <span>{strings.confirmQuestion}</span>
            </div>
          )}
        </div>
      </div>

      {/* Success / Change Alert */}
      {successNotice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 p-3 rounded-xl border border-emerald-300 dark:border-emerald-700 text-left flex items-start space-x-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorNotice && (
        <div className="bg-red-50 dark:bg-red-950/60 p-3 rounded-xl border border-red-300 dark:border-red-700 text-left flex items-start space-x-2 text-xs font-bold text-red-900 dark:text-red-200 animate-shake">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* MODE 1: CONFIRMATION VIEW ("Is this information correct?") */}
      {mode === 'confirming' && (
        <>
          {/* Read aloud Summary Text Card */}
          <div className="bg-surface-warm dark:bg-dark-surface p-4 rounded-xl border border-gray-200 dark:border-dark-border text-left">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed italic">
              "{summaryText}"
            </p>
          </div>

          {/* Re-play audio button */}
          <button
            onClick={readSummaryAloud}
            disabled={isSpeaking}
            className="text-xs text-health-primary dark:text-emerald-400 font-bold hover:underline flex items-center justify-center mx-auto space-x-1.5 touch-target"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.replayAudio}</span>
          </button>

          {/* Primary YES / NO Confirmation Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* 1. YES (Confirm & Save) */}
            <button
              onClick={handleConfirmAction}
              disabled={isSaving || isProcessingCorrection}
              className="w-full touch-target min-h-[54px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all text-white font-extrabold rounded-2xl shadow-md flex items-center justify-center space-x-2 text-base sm:text-lg cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  <span>Saving Case...</span>
                </>
              ) : (
                <>
                  <Check className="w-6 h-6 stroke-[3]" />
                  <span>{strings.yesCorrectBtn}</span>
                </>
              )}
            </button>

            {/* 2. NO (Enter Correction Mode) */}
            <button
              onClick={() => enterCorrectionMode()}
              disabled={isSaving}
              className="w-full touch-target min-h-[46px] bg-white dark:bg-dark-card hover:bg-amber-50 dark:hover:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold rounded-xl flex items-center justify-center space-x-2 text-sm transition-all shadow-sm cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-amber-600" />
              <span>{strings.noCorrectBtn}</span>
            </button>
          </div>
        </>
      )}

      {/* MODE 2: ACTIVE CORRECTION VIEW ("Which information should I correct?") */}
      {mode === 'correcting' && (
        <div className="space-y-3 text-left pt-1 animate-fadeIn">
          {/* Header Question */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center space-x-1.5">
              <Edit3 className="w-4 h-4 text-emerald-600" />
              <span>{strings.whichInfoPrompt}</span>
            </h4>
            <button
              onClick={() => {
                setMode('confirming');
                speechRecognitionManager.stop();
                setIsListening(false);
              }}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-dark-muted flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>{strings.cancelCorrection}</span>
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-dark-muted">
            {strings.askCorrection}
          </p>

          {/* Editable Correction Textarea */}
          <div className="relative">
            <textarea
              value={correctionInput}
              onChange={(e) => setCorrectionInput(e.target.value)}
              placeholder={strings.correctionPlaceholder}
              rows={3}
              className="w-full p-3 text-sm font-medium rounded-xl border-2 border-emerald-400 dark:border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
            {isListening && (
              <div className="absolute right-3 bottom-3 flex items-center space-x-1 text-[11px] font-bold text-red-600 bg-white/90 dark:bg-dark-card/90 px-2 py-0.5 rounded-full border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                <span>Listening...</span>
              </div>
            )}
          </div>

          {/* COMPACT, CLEARLY VISIBLE "SUBMIT CORRECTION" BUTTON & MIC CONTROLS */}
          <div className="flex items-center justify-between space-x-2 pt-1">
            {/* Mic Toggle Button to Re-speak */}
            <button
              onClick={() => {
                if (isListening) {
                  speechRecognitionManager.stop();
                  setIsListening(false);
                } else {
                  startListeningForCorrection();
                }
              }}
              type="button"
              title={strings.reRecord}
              className={`p-2.5 rounded-xl border font-bold text-xs flex items-center space-x-1.5 transition-all touch-target ${
                isListening
                  ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-dark-surface border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-muted'
              }`}
            >
              <Mic className="w-4 h-4 text-emerald-600" />
              <span className="text-xs">{isListening ? 'Stop' : strings.reRecord}</span>
            </button>

            {/* Compact Submit Correction Button */}
            <button
              onClick={handleSubmitCorrection}
              disabled={!correctionInput.trim() || isProcessingCorrection}
              type="button"
              className="flex-1 min-h-[44px] px-4 rounded-xl font-bold text-sm shadow-sm transition-all duration-200 flex items-center justify-center space-x-2 touch-target bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isProcessingCorrection ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                  <span>{strings.submitting}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{strings.submitCorrection}</span>
                </>
              )}
            </button>
          </div>

          <div className="text-[11px] text-gray-500 dark:text-dark-muted pt-0.5 italic">
            💡 {strings.quickBpTip}
          </div>
        </div>
      )}
    </div>
  );
};
