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
  X,
  Plus
} from 'lucide-react';
import { StructuredVisitData, LanguageCode } from '../types';
import { getTranslation, formatSymptomLabel } from '../i18n';
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

// Distinct voice interaction states (Part 3 state machine)
export type ConfirmationStep = 
  | 'speaking_question'      // 5. Speaking confirmation question aloud ("Is this information correct? Please say yes or no.")
  | 'listening_yes_no'       // 6. Listening strictly for YES or NO voice response
  | 'correction_window_open' // 7. Correction window open: all fields editable + voice dictation
  | 'applying_corrections'   // 8. Applying corrections to existing draft
  | 'information_confirmed'  // 9 & 10. Information confirmed & ready to submit ("Submit Entry" button shown)
  | 'saving_entry';          // 11. Saving visit record to database

export const VoiceConfirmation: React.FC<VoiceConfirmationProps> = ({
  data,
  summaryText,
  language,
  onConfirm,
  onCorrectionMade,
  isSaving = false,
}) => {
  const [step, setStep] = useState<ConfirmationStep>('speaking_question');
  const [isListeningForSpeech, setIsListeningForSpeech] = useState<boolean>(false);
  const [isVoiceSynthesizing, setIsVoiceSynthesizing] = useState<boolean>(false);
  const [heardResponse, setHeardResponse] = useState<string>('');

  // Editable fields state for the correction window
  const [editName, setEditName] = useState<string>(data.patient_name || '');
  const [editAge, setEditAge] = useState<string>(data.patient_age != null ? String(data.patient_age) : '');
  const [editSystolic, setEditSystolic] = useState<string>(data.vitals?.blood_pressure?.systolic ? String(data.vitals.blood_pressure.systolic) : '');
  const [editDiastolic, setEditDiastolic] = useState<string>(data.vitals?.blood_pressure?.diastolic ? String(data.vitals.blood_pressure.diastolic) : '');
  const [editTemp, setEditTemp] = useState<string>(data.vitals?.temperature_f ? String(data.vitals.temperature_f) : '');
  const [editSymptoms, setEditSymptoms] = useState<string[]>(data.symptoms || []);
  const [newSymptomInput, setNewSymptomInput] = useState<string>('');
  const [spokenCorrectionInput, setSpokenCorrectionInput] = useState<string>('');
  const [isRecordingCorrectionSpeech, setIsRecordingCorrectionSpeech] = useState<boolean>(false);

  const [successNotice, setSuccessNotice] = useState<string>('');
  const [errorNotice, setErrorNotice] = useState<string>('');

  const isSubmittingEntryRef = useRef<boolean>(false);
  const t = getTranslation(language);

  // Exact multilingual prompt strings specified in requirements
  const strings = {
    en: {
      confirmQuestionSpoken: 'Is this information correct? Please say yes or no.',
      yesConfirmedSpoken: 'Yes, the information is confirmed. You can now submit the entry.',
      noCorrectionSpoken: "Okay. Let's correct the information.",
      submitEntryBtn: 'Submit Entry',
      savingEntryBtn: 'Saving Case...',
      yesBtn: 'Yes, Information is Correct',
      noBtn: 'No, Correct Information',
      saveCorrectionsBtn: 'Save Corrections',
      savingCorrections: 'Saving Corrections...',
      speakingPrompt: 'Speaking confirmation question...',
      listeningYesNoPrompt: 'Listening: Please say "Yes" or "No"',
      correctionWindowHeader: 'Edit Patient Visit Details',
      correctionWindowDesc: 'Directly modify the fields below or dictate corrections by voice:',
      dictateCorrection: 'Dictate correction by voice',
      listeningDictation: 'Listening to correction... Speak now',
      confirmedBadge: 'Information Confirmed • Ready to Submit',
      nameLabel: 'Patient Name',
      ageLabel: 'Age',
      bpLabel: 'Blood Pressure (Systolic / Diastolic)',
      tempLabel: 'Temperature (°F)',
      symptomsLabel: 'Symptoms',
      replayBtn: 'Listen to Question Again',
      cancelCorrection: 'Cancel'
    },
    hi: {
      confirmQuestionSpoken: 'क्या यह जानकारी सही है? कृपया हाँ या नहीं बोलिए।',
      yesConfirmedSpoken: 'जानकारी की पुष्टि हो गई है। अब आप विज़िट दर्ज कर सकते हैं।',
      noCorrectionSpoken: 'ठीक है, चलिए जानकारी सुधारते हैं।',
      submitEntryBtn: 'विज़िट दर्ज करें (Submit Entry)',
      savingEntryBtn: 'केस दर्ज हो रहा है...',
      yesBtn: 'हाँ, जानकारी सही है',
      noBtn: 'नहीं, जानकारी सुधारें',
      saveCorrectionsBtn: 'सुधार सेव करें (Save Corrections)',
      savingCorrections: 'सुधार सेव हो रहा है...',
      speakingPrompt: 'सवाल बोल रहे हैं...',
      listeningYesNoPrompt: 'सुन रहे हैं: कृपया "हाँ" या "नहीं" बोलिए',
      correctionWindowHeader: 'मरीज़ की जानकारी सुधारें',
      correctionWindowDesc: 'नीचे दिए गए विवरण बदलें या बोलकर सुधार दर्ज करें:',
      dictateCorrection: 'बोलकर सुधारें',
      listeningDictation: 'सुधार सुन रहे हैं... अब बोलिए',
      confirmedBadge: 'जानकारी पुष्ट • दर्ज करने के लिए तैयार',
      nameLabel: 'मरीज़ का नाम',
      ageLabel: 'उम्र',
      bpLabel: 'रक्तचाप (BP)',
      tempLabel: 'तापमान (°F)',
      symptomsLabel: 'लक्षण',
      replayBtn: 'सवाल दोबारा सुनें',
      cancelCorrection: 'रद्द करें'
    },
    ta: {
      confirmQuestionSpoken: 'இந்த தகவல் சரியா? ஆம் அல்லது இல்லை என்று சொல்லவும்.',
      yesConfirmedSpoken: 'தகவல் உறுதிப்படுத்தப்பட்டது. இப்போது பதிவைச் சமர்ப்பிக்கலாம்.',
      noCorrectionSpoken: 'சரி, தகவலைத் திருத்துவோம்.',
      submitEntryBtn: 'பதிவைச் சமர்ப்பிக்கவும் (Submit Entry)',
      savingEntryBtn: 'சேமிக்கப்படுகிறது...',
      yesBtn: 'ஆம், தகவல் சரி',
      noBtn: 'இல்லை, தகவலைத் திருத்து',
      saveCorrectionsBtn: 'திருத்தங்களைச் சேமிக்கவும் (Save Corrections)',
      savingCorrections: 'சேமிக்கப்படுகிறது...',
      speakingPrompt: 'கேள்வி கேட்கப்படுகிறது...',
      listeningYesNoPrompt: 'கேட்கிறது: "ஆம்" அல்லது "இல்லை" என்று கூறவும்',
      correctionWindowHeader: 'வருகை விவரங்களைத் திருத்தவும்',
      correctionWindowDesc: 'கீழே உள்ள விவரங்களை நேரடியாக மாற்றவும் அல்லது பேசவும்:',
      dictateCorrection: 'பேசித் திருத்தவும்',
      listeningDictation: 'திருத்தத்தைக் கேட்கிறது... பேசுங்கள்',
      confirmedBadge: 'தகவல் உறுதிப்படுத்தப்பட்டது • சமர்ப்பிக்கத் தயார்',
      nameLabel: 'நோயாளி பெயர்',
      ageLabel: 'வயது',
      bpLabel: 'இரத்த அழுத்தம் (BP)',
      tempLabel: 'உடல் வெப்பநிலை (°F)',
      symptomsLabel: 'அறிகுறிகள்',
      replayBtn: 'கேள்வியை மீண்டும் கேளுங்கள்',
      cancelCorrection: 'ரத்து செய்'
    },
    bho: {
      confirmQuestionSpoken: 'का ई जानकारी ठीक बा? कृपया हाँ भा ना बोलीं।',
      yesConfirmedSpoken: 'जानकारी पुष्ट हो गइल। अब रउआ विज़िट दर्ज कर सकत बानी।',
      noCorrectionSpoken: 'ठीक बा, चलीं जानकारी सुधारल जाव।',
      submitEntryBtn: 'विज़िट दर्ज करीं (Submit Entry)',
      savingEntryBtn: 'दर्ज हो रहल बा...',
      yesBtn: 'हाँ, जानकारी सही बा',
      noBtn: 'ना, जानकारी सुधारीं',
      saveCorrectionsBtn: 'सुधार सेव करीं (Save Corrections)',
      savingCorrections: 'सेव हो रहल बा...',
      speakingPrompt: 'सवाल बोलल जा रहल बा...',
      listeningYesNoPrompt: 'सुनत बानी: कृपया "हाँ" भा "ना" बोलीं',
      correctionWindowHeader: 'मरीज़ के जानकारी सुधारीं',
      correctionWindowDesc: 'नीचे के विवरण बदलीं भा बोल के सुधारीं:',
      dictateCorrection: 'बोल के सुधारीं',
      listeningDictation: 'सुधार सुनत बानी... अब बोलीं',
      confirmedBadge: 'जानकारी पुष्ट • दर्ज करे खातिर तइयार',
      nameLabel: 'मरीज़ के नाम',
      ageLabel: 'उमिर',
      bpLabel: 'बीपी (BP)',
      tempLabel: 'बुखार/तापमान (°F)',
      symptomsLabel: 'लक्षण',
      replayBtn: 'सवाल फेर से सुनीं',
      cancelCorrection: 'पाछे जाईं'
    }
  }[language] || {
    confirmQuestionSpoken: 'Is this information correct? Please say yes or no.',
    yesConfirmedSpoken: 'Yes, the information is confirmed. You can now submit the entry.',
    noCorrectionSpoken: "Okay. Let's correct the information.",
    submitEntryBtn: 'Submit Entry',
    savingEntryBtn: 'Saving Case...',
    yesBtn: 'Yes, Information is Correct',
    noBtn: 'No, Correct Information',
    saveCorrectionsBtn: 'Save Corrections',
    savingCorrections: 'Saving Corrections...',
    speakingPrompt: 'Speaking confirmation question...',
    listeningYesNoPrompt: 'Listening: Please say "Yes" or "No"',
    correctionWindowHeader: 'Edit Patient Visit Details',
    correctionWindowDesc: 'Directly modify the fields below or dictate corrections by voice:',
    dictateCorrection: 'Dictate correction by voice',
    listeningDictation: 'Listening to correction... Speak now',
    confirmedBadge: 'Information Confirmed • Ready to Submit',
    nameLabel: 'Patient Name',
    ageLabel: 'Age',
    bpLabel: 'Blood Pressure (Systolic / Diastolic)',
    tempLabel: 'Temperature (°F)',
    symptomsLabel: 'Symptoms',
    replayBtn: 'Listen to Question Again',
    cancelCorrection: 'Cancel'
  };

  // Sync state whenever external data changes
  useEffect(() => {
    setEditName(data.patient_name || '');
    setEditAge(data.patient_age != null ? String(data.patient_age) : '');
    setEditSystolic(data.vitals?.blood_pressure?.systolic ? String(data.vitals.blood_pressure.systolic) : '');
    setEditDiastolic(data.vitals?.blood_pressure?.diastolic ? String(data.vitals.blood_pressure.diastolic) : '');
    setEditTemp(data.vitals?.temperature_f ? String(data.vitals.temperature_f) : '');
    setEditSymptoms(data.symptoms || []);
  }, [data]);

  // Initial sequence: Speak Question -> Finish Speaking -> Start Listening for YES/NO
  useEffect(() => {
    speakConfirmationQuestion();

    return () => {
      voiceSynthesizer.stop();
      speechRecognitionManager.stop();
    };
  }, [summaryText]);

  /**
   * SEQUENCE STEP 1: Speak Confirmation Question using Speech Synthesis
   * "Is this information correct? Please say yes or no." (in selected language)
   */
  const speakConfirmationQuestion = () => {
    // 1. Stop any speech recognition to prevent the mic from hearing the speaker
    speechRecognitionManager.stop();
    setIsListeningForSpeech(false);
    setIsVoiceSynthesizing(true);
    setStep('speaking_question');
    setSuccessNotice('');
    setErrorNotice('');
    setHeardResponse('');

    const fullQuestion = strings.confirmQuestionSpoken;

    voiceSynthesizer.speak(
      fullQuestion,
      language,
      () => {
        // 2. TTS Finished speaking -> Transition to listening for YES or NO
        setIsVoiceSynthesizing(false);
        startListeningForYesNo();
      },
      (err) => {
        console.warn('TTS question event:', err);
        setIsVoiceSynthesizing(false);
        startListeningForYesNo();
      }
    );
  };

  /**
   * SEQUENCE STEP 2: Listen strictly for YES or NO
   */
  const startListeningForYesNo = () => {
    if (!speechRecognitionManager.isSupported() || isSaving) {
      setStep('listening_yes_no');
      return;
    }

    setStep('listening_yes_no');
    setIsListeningForSpeech(true);

    speechRecognitionManager.start(language, {
      onTranscriptChange: (text) => {
        const lower = text.toLowerCase().trim();
        setHeardResponse(text);

        // 1. Detect YES response
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
          handleYesAffirmation();
          return;
        }

        // 2. Detect NO response
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
          handleNoNegation();
          return;
        }
      },
      onSilenceTimeout: () => {
        // Stay ready in listening_yes_no
      },
      onError: (err) => {
        console.warn('Yes/No recognition event:', err);
      },
      onEnd: () => {
        setIsListeningForSpeech(false);
      }
    });
  };

  /**
   * YES RESPONSE:
   * - Stops listening
   * - Speaks: "Yes, the information is confirmed. You can now submit the entry."
   * - Displays "Submit Entry" button
   * - Does NOT modify extracted information
   * - Does NOT automatically save visit
   */
  const handleYesAffirmation = () => {
    speechRecognitionManager.stop();
    setIsListeningForSpeech(false);
    setStep('information_confirmed');
    setSuccessNotice(strings.yesConfirmedSpoken);

    // Speak confirmation aloud
    setIsVoiceSynthesizing(true);
    voiceSynthesizer.speak(strings.yesConfirmedSpoken, language, () => {
      setIsVoiceSynthesizing(false);
    });
  };

  /**
   * NO RESPONSE:
   * - Stops listening
   * - Speaks: "Okay. Let's correct the information."
   * - Opens the correction window with all patient fields editable
   */
  const handleNoNegation = () => {
    speechRecognitionManager.stop();
    setIsListeningForSpeech(false);
    setStep('correction_window_open');
    setSuccessNotice('');
    setErrorNotice('');

    // Speak: "Okay. Let's correct the information."
    setIsVoiceSynthesizing(true);
    voiceSynthesizer.speak(strings.noCorrectionSpoken, language, () => {
      setIsVoiceSynthesizing(false);
    });
  };

  /**
   * Listen to voice dictation inside the correction window
   */
  const toggleCorrectionDictation = () => {
    if (isRecordingCorrectionSpeech) {
      speechRecognitionManager.stop();
      setIsRecordingCorrectionSpeech(false);
      return;
    }

    voiceSynthesizer.stop();
    setIsRecordingCorrectionSpeech(true);

    speechRecognitionManager.start(language, {
      onTranscriptChange: (text) => {
        setSpokenCorrectionInput(text);
      },
      onEnd: () => {
        setIsRecordingCorrectionSpeech(false);
      },
      onError: () => {
        setIsRecordingCorrectionSpeech(false);
      }
    });
  };

  /**
   * SAVE CORRECTIONS:
   * Updates existing draft, speaks confirmation question again, and waits for YES/NO.
   */
  const handleSaveCorrections = async () => {
    setStep('applying_corrections');
    speechRecognitionManager.stop();
    voiceSynthesizer.stop();
    setIsRecordingCorrectionSpeech(false);

    try {
      let updatedDraft: StructuredVisitData = JSON.parse(JSON.stringify(data));
      const fieldsChanged: string[] = [];

      // 1. Apply manual field inputs
      if (editName.trim() && editName.trim() !== data.patient_name) {
        updatedDraft.patient_name = editName.trim();
        fieldsChanged.push('patient_name');
      }

      const parsedAge = parseInt(editAge.trim(), 10);
      if (!isNaN(parsedAge) && parsedAge !== data.patient_age) {
        updatedDraft.patient_age = parsedAge;
        fieldsChanged.push('patient_age');
      }

      const sys = parseInt(editSystolic.trim(), 10);
      const dia = parseInt(editDiastolic.trim(), 10);
      if (!isNaN(sys) || !isNaN(dia)) {
        if (!updatedDraft.vitals) updatedDraft.vitals = {};
        updatedDraft.vitals.blood_pressure = {
          systolic: !isNaN(sys) ? sys : (updatedDraft.vitals.blood_pressure?.systolic || 120),
          diastolic: !isNaN(dia) ? dia : (updatedDraft.vitals.blood_pressure?.diastolic || 80)
        };
        fieldsChanged.push('blood_pressure');
      }

      const temp = parseFloat(editTemp.trim());
      if (!isNaN(temp)) {
        if (!updatedDraft.vitals) updatedDraft.vitals = {};
        updatedDraft.vitals.temperature_f = temp;
        fieldsChanged.push('temperature_f');
      }

      // Symptoms
      if (JSON.stringify(editSymptoms) !== JSON.stringify(data.symptoms)) {
        updatedDraft.symptoms = editSymptoms;
        fieldsChanged.push('symptoms');
      }

      // 2. Apply any spoken correction text if provided
      if (spokenCorrectionInput.trim()) {
        const correctResult = await correctVisitVoice(spokenCorrectionInput.trim(), language, updatedDraft);
        if (correctResult.success && correctResult.updated) {
          updatedDraft = correctResult.updated;
          correctResult.fieldsChanged.forEach((f) => {
            if (!fieldsChanged.includes(f)) fieldsChanged.push(f);
          });
        }
      }

      // 3. Notify parent component with updated draft
      onCorrectionMade(updatedDraft, summaryText, fieldsChanged);

      // 4. Return to confirmation sequence and speak confirmation question again
      setSpokenCorrectionInput('');
      setSuccessNotice(`✓ Changes saved (${fieldsChanged.join(', ') || 'details updated'}).`);
      speakConfirmationQuestion();
    } catch (err: any) {
      console.error('Error saving corrections:', err);
      setErrorNotice(err?.message || 'Failed to save corrections. Please retry.');
      setStep('correction_window_open');
    }
  };

  /**
   * SUBMIT ENTRY:
   * Saves the confirmed patient visit. Only triggered by explicit click.
   */
  const handleSubmitEntry = () => {
    if (isSubmittingEntryRef.current || isSaving) return;
    isSubmittingEntryRef.current = true;
    voiceSynthesizer.stop();
    speechRecognitionManager.stop();
    setStep('saving_entry');
    onConfirm();
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-darkcard border border-health-mintborder dark:border-dark-border p-5 text-center space-y-4">
      {/* Top Header / Voice Status Pill */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center space-x-2 mx-auto">
          {step === 'information_confirmed' ? (
            <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 rounded-full text-xs font-bold border border-emerald-300 dark:border-emerald-700 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{strings.confirmedBadge}</span>
            </div>
          ) : isVoiceSynthesizing ? (
            <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 rounded-full text-xs font-bold animate-pulse">
              <Volume2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>{strings.speakingPrompt}</span>
            </div>
          ) : isListeningForSpeech ? (
            <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-200 rounded-full text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <span>{strings.listeningYesNoPrompt}</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-muted rounded-full text-xs font-semibold">
              <span>{strings.confirmQuestionSpoken}</span>
            </div>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 p-3 rounded-xl border border-emerald-300 dark:border-emerald-700 text-left flex items-start space-x-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorNotice && (
        <div className="bg-red-50 dark:bg-red-950/60 p-3 rounded-xl border border-red-300 dark:border-red-700 text-left flex items-start space-x-2 text-xs font-bold text-red-900 dark:text-red-200 animate-shake">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CONFIRMATION VIEW (Question asked aloud, waiting for YES or NO)       */}
      {/* ========================================================================= */}
      {(step === 'speaking_question' || step === 'listening_yes_no') && (
        <>
          {/* Spoken Confirmation Question Box */}
          <div className="bg-surface-warm dark:bg-dark-surface p-4 rounded-xl border border-gray-200 dark:border-dark-border text-left space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center space-x-1.5">
                <Volume2 className="w-4 h-4" />
                <span>Spoken Confirmation Question:</span>
              </span>
              <button
                type="button"
                onClick={speakConfirmationQuestion}
                disabled={isVoiceSynthesizing}
                className="text-[11px] text-health-primary dark:text-emerald-400 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{strings.replayBtn}</span>
              </button>
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-white leading-relaxed">
              "{strings.confirmQuestionSpoken}"
            </p>
            {heardResponse && (
              <p className="text-xs text-gray-500 dark:text-dark-muted font-medium pt-1">
                Heard: <span className="font-bold text-emerald-700 dark:text-emerald-400">"{heardResponse}"</span>
              </p>
            )}
          </div>

          {/* YES / NO Interactive Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* 1. YES Button */}
            <button
              type="button"
              onClick={handleYesAffirmation}
              disabled={isSaving || isVoiceSynthesizing}
              className="w-full touch-target min-h-[54px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all text-white font-extrabold rounded-2xl shadow-md flex items-center justify-center space-x-2 text-base sm:text-lg cursor-pointer"
            >
              <Check className="w-6 h-6 stroke-[3]" />
              <span>{strings.yesBtn}</span>
            </button>

            {/* 2. NO Button */}
            <button
              type="button"
              onClick={handleNoNegation}
              disabled={isSaving || isVoiceSynthesizing}
              className="w-full touch-target min-h-[50px] bg-white dark:bg-dark-card border-2 border-amber-400 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 active:scale-[0.98] text-amber-900 dark:text-amber-300 font-bold rounded-2xl shadow-sm flex items-center justify-center space-x-2 text-sm sm:text-base transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>{strings.noBtn}</span>
            </button>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. CORRECTION WINDOW OPEN (All fields editable form + voice dictation)    */}
      {/* ========================================================================= */}
      {(step === 'correction_window_open' || step === 'applying_corrections') && (
        <div className="space-y-4 pt-1 text-left animate-in fade-in duration-200">
          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-800/80">
              <span className="font-extrabold text-sm text-amber-900 dark:text-amber-200 flex items-center space-x-1.5">
                <Edit3 className="w-4 h-4 text-amber-600" />
                <span>{strings.correctionWindowHeader}</span>
              </span>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                Draft Mode
              </span>
            </div>

            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              {strings.correctionWindowDesc}
            </p>

            {/* Editable Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {strings.nameLabel}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Age */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {strings.ageLabel} (Years)
                </label>
                <input
                  type="number"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  placeholder="e.g. 28"
                  className="w-full p-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* BP Systolic / Diastolic */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {strings.bpLabel}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={editSystolic}
                    onChange={(e) => setEditSystolic(e.target.value)}
                    placeholder="120"
                    className="w-1/2 p-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                  />
                  <span className="font-bold text-gray-400">/</span>
                  <input
                    type="number"
                    value={editDiastolic}
                    onChange={(e) => setEditDiastolic(e.target.value)}
                    placeholder="80"
                    className="w-1/2 p-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                  />
                </div>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {strings.tempLabel}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editTemp}
                  onChange={(e) => setEditTemp(e.target.value)}
                  placeholder="98.6"
                  className="w-full p-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Symptoms Tags */}
            <div className="pt-1">
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {strings.symptomsLabel}
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {editSymptoms.map((sym) => (
                  <span
                    key={sym}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-semibold"
                  >
                    <span>{formatSymptomLabel(sym, language)}</span>
                    <button
                      type="button"
                      onClick={() => setEditSymptoms(editSymptoms.filter((s) => s !== sym))}
                      className="hover:text-red-600 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newSymptomInput}
                  onChange={(e) => setNewSymptomInput(e.target.value)}
                  placeholder="Add symptom (e.g. fever, swelling)"
                  className="flex-1 p-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSymptomInput.trim() && !editSymptoms.includes(newSymptomInput.trim().toLowerCase())) {
                      setEditSymptoms([...editSymptoms, newSymptomInput.trim().toLowerCase()]);
                      setNewSymptomInput('');
                    }
                  }}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Voice Dictation Option */}
            <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>{strings.dictateCorrection}</span>
                </span>
                <button
                  type="button"
                  onClick={toggleCorrectionDictation}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                    isRecordingCorrectionSpeech
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  {isRecordingCorrectionSpeech ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isRecordingCorrectionSpeech ? 'Stop' : 'Speak'}</span>
                </button>
              </div>

              <input
                type="text"
                value={spokenCorrectionInput}
                onChange={(e) => setSpokenCorrectionInput(e.target.value)}
                placeholder='e.g. "Her age is 28, not 25" or "No fever, only headache"'
                className="w-full p-2.5 text-xs font-medium rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {isRecordingCorrectionSpeech && (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-bold flex items-center space-x-1 mt-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping inline-block" />
                  <span>{strings.listeningDictation}</span>
                </p>
              )}
            </div>
          </div>

          {/* Action Row: Save Corrections Button */}
          <div className="flex items-center space-x-2.5 pt-1">
            <button
              type="button"
              onClick={handleSaveCorrections}
              disabled={step === 'applying_corrections'}
              className="flex-1 touch-target min-h-[48px] bg-amber-600 hover:bg-amber-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white font-black rounded-xl shadow-md flex items-center justify-center space-x-2 text-sm cursor-pointer"
            >
              {step === 'applying_corrections' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{strings.savingCorrections}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>{strings.saveCorrectionsBtn}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={speakConfirmationQuestion}
              disabled={step === 'applying_corrections'}
              className="py-2.5 px-4 rounded-xl border border-gray-300 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-surface text-gray-700 dark:text-gray-300 font-bold text-xs transition-all touch-target cursor-pointer"
            >
              <span>{strings.cancelCorrection}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CONFIRMED VIEW (Primary "SUBMIT ENTRY" Button)                          */}
      {/* ========================================================================= */}
      {(step === 'information_confirmed' || step === 'saving_entry') && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-700 text-left">
            <div className="flex items-center space-x-2 mb-2 text-emerald-900 dark:text-emerald-300 font-black text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Confirmed Visit Record</span>
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed italic">
              "{summaryText}"
            </p>
          </div>

          {/* Primary Action Button: "SUBMIT ENTRY" (Only this saves the visit) */}
          <button
            type="button"
            onClick={handleSubmitEntry}
            disabled={isSaving || step === 'saving_entry'}
            className="w-full touch-target min-h-[56px] bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all text-white font-black rounded-2xl shadow-xl flex items-center justify-center space-x-3 text-lg cursor-pointer"
          >
            {isSaving || step === 'saving_entry' ? (
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

          {/* Option to re-open correction window if needed */}
          <button
            type="button"
            onClick={handleNoNegation}
            disabled={isSaving || step === 'saving_entry'}
            className="text-xs text-gray-500 dark:text-dark-muted font-bold hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline flex items-center justify-center mx-auto space-x-1.5 touch-target cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Need to change anything? Edit details</span>
          </button>
        </div>
      )}
    </div>
  );
};
