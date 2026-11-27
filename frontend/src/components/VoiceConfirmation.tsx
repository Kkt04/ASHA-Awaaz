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
  // Modes:
  // 1. 'confirming': asks "Is this information correct?" (YES confirms to final review; NO opens correction)
  // 2. 'correcting': captures user voice/text correction and provides "Submit Correction" button
  // 3. 'confirmed': information confirmed, displays primary "Submit Entry" button to save
  const [mode, setMode] = useState<'confirming' | 'correcting' | 'confirmed'>('confirming');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [correctionInput, setCorrectionInput] = useState<string>('');
  const [isProcessingCorrection, setIsProcessingCorrection] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string>('');
  const [errorNotice, setErrorNotice] = useState<string>('');

  const isSubmittingCorrectionRef = useRef<boolean>(false);
  const isSubmittingEntryRef = useRef<boolean>(false);
  const t = getTranslation(language);

  // Localized conversation strings
  const strings = {
    en: {
      confirmQuestion: 'Is this information correct?',
      confirmedNotice: 'Information confirmed! You can now submit the entry.',
      submitEntryBtn: 'Submit Entry',
      savingEntryBtn: 'Saving Case...',
      yesCorrectBtn: 'Yes, Information is Correct',
      noCorrectBtn: 'No, Correct Information',
      whichInfoPrompt: 'Which information should I correct?',
      askCorrection: 'Which information should I correct? Speak or type below.',
      submitCorrection: 'Submit Correction',
      submittingCorrection: 'Updating Details...',
      correctionPlaceholder: 'e.g. "Her age is 28, not 25" or "She does not have fever, only headache"',
      correctionSavedNotice: "I've updated the information. Is everything correct now?",
      listeningPrompt: 'Listening for answer ("Yes" or "No")...',
      listeningCorrectionPrompt: 'Listening to your correction... Speak now',
      tapToSpeak: 'Tap to speak correction',
      reRecord: 'Re-speak',
      cancelCorrection: 'Back to Confirmation',
      editConfirmed: 'Need to make changes? Edit details',
      confirmedBadge: 'Confirmed & Ready to Submit'
    },
    hi: {
      confirmQuestion: 'क्या यह जानकारी सही है?',
      confirmedNotice: 'जानकारी की पुष्टि हो गई है। अब आप विज़िट दर्ज कर सकते हैं।',
      submitEntryBtn: 'विज़िट दर्ज करें (Submit Entry)',
      savingEntryBtn: 'केस दर्ज हो रहा है...',
      yesCorrectBtn: 'हाँ, जानकारी सही है',
      noCorrectBtn: 'नहीं, जानकारी सुधारें',
      whichInfoPrompt: 'कौन सी जानकारी सुधारनी है?',
      askCorrection: 'कौन सी जानकारी सुधारनी है? बोलिए या नीचे लिखिए।',
      submitCorrection: 'सुधार लागू करें',
      submittingCorrection: 'सुधार दर्ज हो रहा है...',
      correctionPlaceholder: 'जैसे: "उम्र 25 नहीं 28 है" या "बुखार नहीं है, सिर्फ सिर दर्द है"',
      correctionSavedNotice: 'जानकारी अपडेट हो गई है। क्या अब सब सही है?',
      listeningPrompt: 'जवाब सुन रहे हैं ("हाँ" या "नहीं")...',
      listeningCorrectionPrompt: 'सुधार सुन रहे हैं... अब बोलिए',
      tapToSpeak: 'सुधार बोलने के लिए टैप करें',
      reRecord: 'दोबारा बोलें',
      cancelCorrection: 'वापस जाएं',
      editConfirmed: 'कुछ बदलना है? सुधार करें',
      confirmedBadge: 'पुष्ट किया गया • दर्ज करने के लिए तैयार'
    },
    ta: {
      confirmQuestion: 'இந்த தகவல் சரியா?',
      confirmedNotice: 'தகவல் உறுதிப்படுத்தப்பட்டது. இப்போது பதிவைச் சமர்ப்பிக்கலாம்.',
      submitEntryBtn: 'பதிவைச் சமர்ப்பிக்கவும் (Submit Entry)',
      savingEntryBtn: 'சேமிக்கப்படுகிறது...',
      yesCorrectBtn: 'ஆம், தகவல் சரி',
      noCorrectBtn: 'இல்லை, தகவலைத் திருத்து',
      whichInfoPrompt: 'எந்த தகவலை திருத்த வேண்டும்?',
      askCorrection: 'எந்த தகவலை திருத்த வேண்டும்? பேசுங்கள் அல்லது எழுதுங்கள்.',
      submitCorrection: 'திருத்தத்தை சமர்ப்பிக்கவும்',
      submittingCorrection: 'புதுப்பிக்கப்படுகிறது...',
      correctionPlaceholder: 'எ.கா: "வயது 28, 25 அல்ல" அல்லது "காய்ச்சல் இல்லை, தலைவலி மட்டுமே"',
      correctionSavedNotice: 'தகவல் புதுப்பிக்கப்பட்டது. இப்போது எல்லாம் சரியா?',
      listeningPrompt: 'பதிலை கேட்கிறது ("ஆம்" அல்லது "இல்லை")...',
      listeningCorrectionPrompt: 'திருத்தத்தைக் கேட்கிறது... பேசுங்கள்',
      tapToSpeak: 'திருத்தத்தை பேச தொடவும்',
      reRecord: 'மீண்டும் பேசு',
      cancelCorrection: 'ரத்து செய்',
      editConfirmed: 'மாற்ற வேண்டுமா? திருத்து',
      confirmedBadge: 'உறுதிப்படுத்தப்பட்டது • சமர்ப்பிக்கத் தயார்'
    },
    bho: {
      confirmQuestion: 'का ई जानकारी ठीक बा?',
      confirmedNotice: 'जानकारी पुष्ट हो गइल। अब रउआ विज़िट दर्ज कर सकत बानी।',
      submitEntryBtn: 'विज़िट दर्ज करीं (Submit Entry)',
      savingEntryBtn: 'दर्ज हो रहल बा...',
      yesCorrectBtn: 'हाँ, जानकारी सही बा',
      noCorrectBtn: 'ना, जानकारी सुधारीं',
      whichInfoPrompt: 'कवन जानकारी सुधारे के बा?',
      askCorrection: 'कवन जानकारी सुधारे के बा? बोलीं भा नीचे लिखीं।',
      submitCorrection: 'सुधार दर्ज करीं',
      submittingCorrection: 'सुधारल जा रहल बा...',
      correctionPlaceholder: 'जैसे: "उमिर 25 ना 28 ह" भा "बुखार नइखे, खाली माथा बथा बा"',
      correctionSavedNotice: 'जानकारी सुधर गइल। का अब सब ठीक बा?',
      listeningPrompt: 'जवाब सुनत बानी ("हाँ" भा "ना")...',
      listeningCorrectionPrompt: 'सुधार सुनत बानी... अब बोलीं',
      tapToSpeak: 'सुधार बोले खातिर टैप करीं',
      reRecord: 'फेर बोलीं',
      cancelCorrection: 'पाछे जाईं',
      editConfirmed: 'बदले के बा? सुधार करीं',
      confirmedBadge: 'पुष्ट भइल • दर्ज करे खातिर तइयार'
    }
  }[language] || {
    confirmQuestion: 'Is this information correct?',
    confirmedNotice: 'Information confirmed! You can now submit the entry.',
    submitEntryBtn: 'Submit Entry',
    savingEntryBtn: 'Saving Case...',
    yesCorrectBtn: 'Yes, Information is Correct',
    noCorrectBtn: 'No, Correct Information',
    whichInfoPrompt: 'Which information should I correct?',
    askCorrection: 'Which information should I correct? Speak or type below.',
    submitCorrection: 'Submit Correction',
    submittingCorrection: 'Updating Details...',
    correctionPlaceholder: 'e.g. "Her age is 28, not 25" or "She does not have fever, only headache"',
    correctionSavedNotice: "I've updated the information. Is everything correct now?",
    listeningPrompt: 'Listening for answer ("Yes" or "No")...',
    listeningCorrectionPrompt: 'Listening to your correction... Speak now',
    tapToSpeak: 'Tap to speak correction',
    reRecord: 'Re-speak',
    cancelCorrection: 'Back to Confirmation',
    editConfirmed: 'Need to make changes? Edit details',
    confirmedBadge: 'Confirmed & Ready to Submit'
  };

  useEffect(() => {
    // When summaryText or patient details change initially or after correction,
    // read the summary aloud and ask for confirmation
    if (mode === 'confirming') {
      readSummaryAloud();
    }

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
   * Listen strictly for YES (confirm) or NO (enter correction mode).
   * Does NOT treat ambient noise or random phrases as corrections!
   */
  const startListeningForYesNo = () => {
    if (!speechRecognitionManager.isSupported() || mode !== 'confirming' || isSaving) return;
    setIsListening(true);

    speechRecognitionManager.start(language, {
      onTranscriptChange: (text) => {
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
          lower === 'हाँ' ||
          lower === 'ठीक बा' ||
          lower.includes('sahi');

        if (isYes) {
          handleSayYes();
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
          lower.startsWith('na ') ||
          lower === 'नहीं' ||
          lower === 'ना' ||
          lower === 'नाहीं' ||
          lower.includes('sudhar') ||
          lower.includes('change') ||
          lower.includes('correct');

        if (isNo) {
          speechRecognitionManager.stop();
          handleSayNo();
          return;
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
   * PATH A: User confirms YES
   * - Does NOT modify extracted information
   * - Does NOT run another AI extraction/correction
   * - Does NOT save visit automatically
   * - Speaks confirmation and shows "Submit Entry" button
   */
  const handleSayYes = () => {
    speechRecognitionManager.stop();
    voiceSynthesizer.stop();
    setIsListening(false);
    setMode('confirmed');
    setSuccessNotice(strings.confirmedNotice);
    setErrorNotice('');

    // Speak: "Okay! The information is confirmed. You can now submit the entry."
    setIsSpeaking(true);
    voiceSynthesizer.speak(strings.confirmedNotice, language, () => {
      setIsSpeaking(false);
    });
  };

  /**
   * PATH B: User says NO
   * - Asks which information is incorrect
   * - Opens correction interface
   */
  const handleSayNo = (initialText: string = '') => {
    speechRecognitionManager.stop();
    voiceSynthesizer.stop();
    setIsListening(false);
    setMode('correcting');
    setCorrectionInput(initialText);
    setSuccessNotice('');
    setErrorNotice('');

    // Speak: "Which information should I correct?"
    setIsSpeaking(true);
    voiceSynthesizer.speak(strings.whichInfoPrompt, language, () => {
      setIsSpeaking(false);
      startListeningForCorrection();
    });
  };

  /**
   * Listen to the user speaking their correction
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
   * SUBMIT CORRECTION:
   * Process and apply the user's explicitly provided correction.
   * Updates only relevant fields, preserves all unrelated fields.
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
        // Pass updated structured data to parent App component
        const newSummary =
          language === 'ta'
            ? result.summaryTa
            : language === 'en'
            ? result.summaryEn
            : result.summaryHi;

        onCorrectionMade(result.updated, newSummary, result.fieldsChanged);

        // Transition back to 'confirming' mode with update notice
        setMode('confirming');
        setCorrectionInput('');
        const changedDesc = result.fieldsChanged.length > 0 ? `(${result.fieldsChanged.join(', ')})` : '';
        setSuccessNotice(`✓ ${strings.correctionSavedNotice} ${changedDesc}`);

        // Read confirmation prompt aloud: "I've updated the information. Is everything correct now?"
        setIsSpeaking(true);
        const reconfirmPrompt = `${strings.correctionSavedNotice}`;
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
   * SUBMIT ENTRY:
   * Saves the confirmed patient visit. Only triggered when user explicitly clicks Submit Entry.
   */
  const handleSubmitEntry = () => {
    if (isSubmittingEntryRef.current || isSaving) return;
    isSubmittingEntryRef.current = true;
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
          {mode === 'confirmed' ? (
            <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 rounded-full text-xs font-bold border border-emerald-300 dark:border-emerald-700 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{strings.confirmedBadge}</span>
            </div>
          ) : isSpeaking ? (
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

      {/* ========================================================================= */}
      {/* MODE 1: CONFIRMING VIEW ("Is this information correct?")                  */}
      {/* ========================================================================= */}
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
            type="button"
            onClick={readSummaryAloud}
            disabled={isSpeaking}
            className="text-xs text-health-primary dark:text-emerald-400 font-bold hover:underline flex items-center justify-center mx-auto space-x-1.5 touch-target"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.replayAudio}</span>
          </button>

          {/* Primary YES / NO Confirmation Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* 1. YES: Confirms info, DOES NOT save immediately */}
            <button
              type="button"
              onClick={handleSayYes}
              disabled={isSaving || isProcessingCorrection}
              className="w-full touch-target min-h-[54px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all text-white font-extrabold rounded-2xl shadow-md flex items-center justify-center space-x-2 text-base sm:text-lg cursor-pointer"
            >
              <Check className="w-6 h-6 stroke-[3]" />
              <span>{strings.yesCorrectBtn}</span>
            </button>

            {/* 2. NO: Opens Correction Interface */}
            <button
              type="button"
              onClick={() => handleSayNo()}
              disabled={isSaving || isProcessingCorrection}
              className="w-full touch-target min-h-[50px] bg-white dark:bg-dark-card border-2 border-amber-400 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 active:scale-[0.98] text-amber-900 dark:text-amber-300 font-bold rounded-2xl shadow-sm flex items-center justify-center space-x-2 text-sm sm:text-base transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>{strings.noCorrectBtn}</span>
            </button>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: CORRECTING VIEW (Capture correction & "Submit Correction" button)  */}
      {/* ========================================================================= */}
      {mode === 'correcting' && (
        <div className="space-y-3.5 pt-1 text-left animate-in fade-in duration-200">
          <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-3.5">
            <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200 font-bold text-xs sm:text-sm mb-1.5">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{strings.askCorrection}</span>
            </div>

            {/* Editable Correction Textarea */}
            <div className="relative mt-2">
              <textarea
                value={correctionInput}
                onChange={(e) => setCorrectionInput(e.target.value)}
                placeholder={strings.correctionPlaceholder}
                rows={3}
                className="w-full p-3 pr-11 text-xs sm:text-sm font-medium rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
              />

              {/* Dictate / Re-speak Mic Button */}
              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    speechRecognitionManager.stop();
                    setIsListening(false);
                  } else {
                    startListeningForCorrection();
                  }
                }}
                title={isListening ? 'Stop listening' : 'Speak correction'}
                className={`absolute right-2.5 top-2.5 p-2 rounded-lg transition-all touch-target cursor-pointer ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-800 dark:text-amber-200'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {/* Voice status cue while speaking correction */}
            {isListening && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-bold flex items-center space-x-1 mt-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping inline-block" />
                <span>{strings.listeningCorrectionPrompt}</span>
              </p>
            )}
          </div>

          {/* Action Row: Compact "Submit Correction" + "Cancel" */}
          <div className="flex items-center space-x-2.5 pt-1">
            {/* 1. Small, Neat "Submit Correction" Button */}
            <button
              type="button"
              onClick={handleSubmitCorrection}
              disabled={!correctionInput.trim() || isProcessingCorrection}
              className="flex-1 touch-target min-h-[46px] bg-amber-600 hover:bg-amber-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white font-black rounded-xl shadow-md flex items-center justify-center space-x-2 text-sm cursor-pointer"
            >
              {isProcessingCorrection ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{strings.submittingCorrection}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{strings.submitCorrection}</span>
                </>
              )}
            </button>

            {/* 2. Cancel / Back to Confirmation */}
            <button
              type="button"
              onClick={() => {
                speechRecognitionManager.stop();
                voiceSynthesizer.stop();
                setIsListening(false);
                setMode('confirming');
              }}
              disabled={isProcessingCorrection}
              className="py-2.5 px-4 rounded-xl border border-gray-300 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-surface text-gray-700 dark:text-gray-300 font-bold text-xs transition-all touch-target cursor-pointer"
            >
              <span>{strings.cancelCorrection}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: CONFIRMED VIEW (Primary "Submit Entry" Button)                     */}
      {/* ========================================================================= */}
      {mode === 'confirmed' && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          {/* Confirmed Summary Card */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-700 text-left">
            <div className="flex items-center space-x-2 mb-2 text-emerald-900 dark:text-emerald-300 font-black text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Final Verified Clinical Record</span>
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed italic">
              "{summaryText}"
            </p>
          </div>

          {/* Primary Action Button: "SUBMIT ENTRY" (Saves the case) */}
          <button
            type="button"
            onClick={handleSubmitEntry}
            disabled={isSaving}
            className="w-full touch-target min-h-[56px] bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all text-white font-black rounded-2xl shadow-xl flex items-center justify-center space-x-3 text-lg cursor-pointer"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                <span>{strings.savingEntryBtn}</span>
              </>
            ) : (
              <>
                <Save className="w-6 h-6 stroke-[2.5]" />
                <span>{strings.submitEntryBtn}</span>
                <ArrowRight className="w-5 h-5 ml-1 stroke-[2.5]" />
              </>
            )}
          </button>

          {/* Secondary Option: Edit Details / Make Correction if needed */}
          <button
            type="button"
            onClick={() => handleSayNo()}
            disabled={isSaving}
            className="text-xs text-gray-500 dark:text-dark-muted font-bold hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline flex items-center justify-center mx-auto space-x-1.5 touch-target"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{strings.editConfirmed}</span>
          </button>
        </div>
      )}
    </div>
  );
};
