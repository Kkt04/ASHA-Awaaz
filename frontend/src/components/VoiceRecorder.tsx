import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  X,
  AlertTriangle,
  Volume2,
  Sparkles,
  RotateCcw,
  Check,
  Edit3,
  HelpCircle,
  Radio,
  Settings
} from 'lucide-react';
import { LanguageCode } from '../types';
import { getTranslation } from '../i18n';
import { speechRecognitionManager, SpeechRecognitionErrorType } from '../services/speechRecognition';
import { audioMeter } from '../services/audioMeter';
import { voiceSynthesizer } from '../services/speechSynthesis';

interface VoiceRecorderProps {
  language: LanguageCode;
  onFinishRecording: (transcript: string) => void;
  onCancel: () => void;
  onSwitchToDemo: () => void;
}

type RecordingState =
  | 'requesting_permission'
  | 'listening'
  | 'speech_detected'
  | 'permission_denied'
  | 'device_error'
  | 'unsupported'
  | 'stopped';

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  language,
  onFinishRecording,
  onCancel,
  onSwitchToDemo,
}) => {
  const [recorderState, setRecorderState] = useState<RecordingState>('requesting_permission');
  const [transcript, setTranscript] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isLoudNoise, setIsLoudNoise] = useState<boolean>(false);
  const [isSpeakingLive, setIsSpeakingLive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isEditingTranscript, setIsEditingTranscript] = useState<boolean>(false);
  const [emptyWarning, setEmptyWarning] = useState<boolean>(false);
  const [silencePromptVisible, setSilencePromptVisible] = useState<boolean>(false);

  const timerRef = useRef<any>(null);
  const durationRef = useRef<number>(0);
  const transcriptRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(true);
  const t = getTranslation(language);

  // Localized UI strings for all 4 supported languages
  const uiText = {
    en: {
      requestingPerm: 'Requesting microphone permission...',
      readyToSpeak: 'Microphone is active. Speak patient details naturally...',
      speechActive: 'Voice detected — transcribing in real time',
      permDeniedTitle: 'Microphone Permission Denied',
      permDeniedDesc: 'Microphone access is blocked in your browser. Please tap the lock or camera icon in the address bar, set Microphone to "Allow", and retry.',
      grantRetryBtn: 'Allow Microphone & Retry',
      unsupportedTitle: 'Web Speech Not Supported',
      unsupportedDesc: 'This browser does not support Web Speech Recognition. For full voice features, please open in Google Chrome or Microsoft Edge.',
      deviceErrorTitle: 'Microphone Not Found',
      deviceErrorDesc: 'No audio capture device was detected on your system. Please plug in a microphone or headset and retry.',
      silenceNotice: 'Still listening... speak symptoms, vitals, or medicines, or tap a sample below.',
      emptyAlert: 'Please speak or enter visit details before submitting.',
      editMode: 'Edit text',
      doneEditing: 'Done editing',
      clearRetry: 'Restart Recording',
      finishBtn: 'Finish & Process Visit',
      cancelBtn: 'Cancel',
      useDemoBtn: 'Try Demo Mode',
      sampleHeader: 'Or tap an instant sample prompt:',
      sample1: 'Sunita, 7 months pregnant, BP 150/100, swelling in feet, missed iron tablets',
      sample2: 'Aarav, 15 days newborn baby, fever 101.5, not feeding properly, irritable'
    },
    hi: {
      requestingPerm: 'माइक्रोफ़ोन की अनुमति जांची जा रही है...',
      readyToSpeak: 'माइक चालू है। मरीज़ की समस्या, बीपी, लक्षण आराम से बोलिए...',
      speechActive: 'आवाज़ पहचान ली गई है — लाइव लिखा जा रहा है',
      permDeniedTitle: 'माइक्रोफ़ोन की अनुमति नहीं मिली',
      permDeniedDesc: 'ब्राउज़र में माइक ब्लॉक है। कृपया एड्रेस बार में ताले (lock) या कैमरे के निशान पर क्लिक करके Microphone को "Allow" करें।',
      grantRetryBtn: 'अनुमति दें और दोबारा प्रयास करें',
      unsupportedTitle: 'ब्राउज़र में वॉइस सपोर्ट नहीं है',
      unsupportedDesc: 'यह ब्राउज़र स्पीच रिकग्निशन सपोर्ट नहीं करता। कृपया Google Chrome या Microsoft Edge का उपयोग करें।',
      deviceErrorTitle: 'माइक्रोफ़ोन नहीं मिला',
      deviceErrorDesc: 'डिवाइस में माइक नहीं मिला। कृपया माइक या ईयरफोन लगाकर पुनः प्रयास करें।',
      silenceNotice: 'सुन रहे हैं... मरीज़ के लक्षण, बीपी या दवाइयाँ बोलिए, या नीचे दिया उदाहरण चुनें।',
      emptyAlert: 'कृपया विज़िट दर्ज करने से पहले कुछ बोलिए या लिखिए।',
      editMode: 'टेक्स्ट सुधारें',
      doneEditing: 'सुधार पूरा हुआ',
      clearRetry: 'दोबारा बोलें',
      finishBtn: 'रिकॉर्डिंग पूरी करें और सेव करें',
      cancelBtn: 'रद्द करें',
      useDemoBtn: 'डेमो मोड चलाएं',
      sampleHeader: 'या तुरंत जांच के लिए इस उदाहरण पर टैप करें:',
      sample1: 'सुनीता, 7 महीने की गर्भवती, बीपी 150/100, पैरों में सूजन, आयरन की गोली नहीं ली',
      sample2: 'आरव, 15 दिन का नवजात शिशु, बुखार 101.5, दूध नहीं पी रहा, चिड़चिड़ा है'
    },
    ta: {
      requestingPerm: 'மைக்ரோஃபோன் அனுமதி சரிபார்க்கப்படுகிறது...',
      readyToSpeak: 'மைக் தயாராக உள்ளது. வருகை விவரங்களை இயல்பாகப் பேசுங்கள்...',
      speechActive: 'குரல் கேட்கிறது — நேரடி உரை எழுதப்படுகிறது',
      permDeniedTitle: 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது',
      permDeniedDesc: 'உலாவியில் மைக் தடுக்கப்பட்டுள்ளது. முகவரிப் பட்டியில் உள்ள பூட்டு ஐகானைக் கிளிக் செய்து மைக்ரோஃபோனை "Allow" செய்யவும்.',
      grantRetryBtn: 'அனுமதி அளித்து மீண்டும் முயற்சிக்கவும்',
      unsupportedTitle: 'குரல் ஆதரவு இல்லை',
      unsupportedDesc: 'இந்த உலாவி பேச்சு அங்கீகாரத்தை ஆதரிக்கவில்லை. Google Chrome-ஐப் பயன்படுத்தவும்.',
      deviceErrorTitle: 'மைக்ரோஃபோன் கிடைக்கவில்லை',
      deviceErrorDesc: 'உங்கள் சாதனத்தில் மைக் கிடைக்கவில்லை. இயர்போனை இணைக்கவும்.',
      silenceNotice: 'கேட்டுக்கொண்டிருக்கிறது... அறிகுறிகள், பிபி அல்லது மருந்துகளைப் பேசுங்கள்.',
      emptyAlert: 'சமர்ப்பிப்பதற்கு முன் வருகை விவரங்களைப் பேசுங்கள் அல்லது தட்டச்சு செய்யுங்கள்.',
      editMode: 'திருத்து',
      doneEditing: 'முடிக்கப்பட்டது',
      clearRetry: 'மீண்டும் தொடங்கு',
      finishBtn: 'பதிவை முடித்து சமர்ப்பிக்கவும்',
      cancelBtn: 'ரத்து செய்',
      useDemoBtn: 'டெமோ பயன்முறை',
      sampleHeader: 'அல்லது மாதிரி வாக்கியத்தைத் தேர்ந்தெடுக்கவும்:',
      sample1: 'சுனிதா, 7 மாத கர்ப்பிணி, பிபி 150/100, கால்களில் வீக்கம், இரும்பு மாத்திரை தவறவிட்டது',
      sample2: 'ஆரவ், 15 நாட்கள் பிறந்த குழந்தை, காய்ச்சல் 101.5, சரியாக தாய்ப்பால் குடிக்கவில்லை'
    },
    bho: {
      requestingPerm: 'माइक्रोफोन के अनुमति जाँचल जा रहल बा...',
      readyToSpeak: 'माइक चालू बा। मरीज के परेशानी, बीपी, लक्षण आराम से बोलीं...',
      speechActive: 'आवाज पकड़ा गइल — लाइव लिखल जा रहल बा',
      permDeniedTitle: 'माइक्रोफोन के अनुमति नइखे मिलल',
      permDeniedDesc: 'ब्राउज़र में माइक ब्लॉक बा। कृपा क के एड्रेस बार में लॉक चाहे कैमरा वाला आइकन पर क्लिक कर के Microphone के "Allow" करीं।',
      grantRetryBtn: 'अनुमति दीं आ फेर से कोशिश करीं',
      unsupportedTitle: 'ब्राउज़र में आवाज सपोर्ट नइखे',
      unsupportedDesc: 'ई ब्राउज़र स्पीच रिकग्निशन सपोर्ट नइखे करत। कृपा क के Google Chrome भा Microsoft Edge खोलीं।',
      deviceErrorTitle: 'माइक्रोफोन नइखे मिलल',
      deviceErrorDesc: 'डिवाइस में माइक नइखे मिलल। कृपा क के ईयरफोन लगा के फेर से कोशिश करीं।',
      silenceNotice: 'सुनत बानी... मरीज के लक्षण, बीपी चाहे दवाई बोलीं, भा नीचे दिहल नमूना चुनीं।',
      emptyAlert: 'कृपा क के दर्ज करे से पहिले कुछ बोलीं चाहे लिखीं।',
      editMode: 'सुधारीं',
      doneEditing: 'सुधार पूरा',
      clearRetry: 'फेर से बोलीं',
      finishBtn: 'रिकॉर्डिंग पूरा करीं आ सेव करीं',
      cancelBtn: 'रद्द करीं',
      useDemoBtn: 'डेमो मोड चलाईं',
      sampleHeader: 'भा तुरंते जाँच खातिर एह नमूना पर टैप करीं:',
      sample1: 'सुनीता, 7 महीना के गर्भवती, बीपी 150/100, गोड़ में सूजन, आयरन के गोली ना लिहले',
      sample2: 'आरव, 15 दिन के लइका, बुखार 101.5, दूध नइखे पीयत, रोवत बा'
    }
  }[language] || {
    requestingPerm: 'Requesting microphone permission...',
    readyToSpeak: 'Microphone is active. Speak patient details naturally...',
    speechActive: 'Voice detected — transcribing in real time',
    permDeniedTitle: 'Microphone Permission Denied',
    permDeniedDesc: 'Microphone access is blocked in your browser. Please tap the lock or camera icon in the address bar, set Microphone to "Allow", and retry.',
    grantRetryBtn: 'Allow Microphone & Retry',
    unsupportedTitle: 'Web Speech Not Supported',
    unsupportedDesc: 'This browser does not support Web Speech Recognition. For full voice features, please open in Google Chrome or Microsoft Edge.',
    deviceErrorTitle: 'Microphone Not Found',
    deviceErrorDesc: 'No audio capture device was detected on your system. Please plug in a microphone or headset and retry.',
    silenceNotice: 'Still listening... speak symptoms, vitals, or medicines, or tap a sample below.',
    emptyAlert: 'Please speak or enter visit details before submitting.',
    editMode: 'Edit text',
    doneEditing: 'Done editing',
    clearRetry: 'Restart Recording',
    finishBtn: 'Finish & Process Visit',
    cancelBtn: 'Cancel',
    useDemoBtn: 'Try Demo Mode',
    sampleHeader: 'Or tap an instant sample prompt:',
    sample1: 'Sunita, 7 months pregnant, BP 150/100, swelling in feet, missed iron tablets',
    sample2: 'Aarav, 15 days newborn baby, fever 101.5, not feeding properly, irritable'
  };

  useEffect(() => {
    isMountedRef.current = true;
    startRecordingPipeline();

    // Start duration clock
    timerRef.current = setInterval(() => {
      setDuration((prev) => {
        const next = prev + 1;
        durationRef.current = next;
        return next;
      });
    }, 1000);

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      speechRecognitionManager.stop(false);
      audioMeter.stop();
      voiceSynthesizer.stop();
    };
  }, [language]);

  /**
   * Initializes microphone access, audio level meter, and speech recognition
   */
  const startRecordingPipeline = async () => {
    if (!isMountedRef.current) return;

    setRecorderState('requesting_permission');
    setEmptyWarning(false);
    setSilencePromptVisible(false);

    // 1. Check browser speech support
    if (!speechRecognitionManager.isSupported()) {
      setRecorderState('unsupported');
      setErrorMessage(uiText.unsupportedDesc);
      return;
    }

    // 2. Request mic access explicitly
    const permResult = await speechRecognitionManager.requestMicrophoneAccess();
    if (!isMountedRef.current) return;

    if (!permResult.ok) {
      if (permResult.error === 'not-allowed') {
        setRecorderState('permission_denied');
        setErrorMessage(permResult.message || uiText.permDeniedDesc);
      } else if (permResult.error === 'audio-capture') {
        setRecorderState('device_error');
        setErrorMessage(permResult.message || uiText.deviceErrorDesc);
      } else {
        setRecorderState('device_error');
        setErrorMessage(permResult.message || 'Microphone initialization failed.');
      }
      return;
    }

    // 3. Start Audio Meter (powers the live audio visualizer)
    await audioMeter.start(
      (volume, isLoud, isSpeaking) => {
        if (!isMountedRef.current) return;
        setAudioLevel(volume);
        setIsLoudNoise(isLoud);
        setIsSpeakingLive(isSpeaking);
      },
      (err) => {
        console.warn('AudioMeter visualizer notice:', err);
      }
    );

    // 4. Start Speech Recognition
    setRecorderState('listening');

    speechRecognitionManager.start(language, {
      onStart: () => {
        if (!isMountedRef.current) return;
        setRecorderState('listening');
      },
      onSpeechDetected: (hasSpeech) => {
        if (!isMountedRef.current) return;
        if (hasSpeech) {
          setRecorderState('speech_detected');
          setSilencePromptVisible(false);
        } else {
          setRecorderState('listening');
        }
      },
      onTranscriptChange: (text, isFinal) => {
        if (!isMountedRef.current) return;
        setTranscript(text);
        transcriptRef.current = text;
        setEmptyWarning(false);
        setSilencePromptVisible(false);

        if (text.trim().length > 0) {
          setRecorderState('speech_detected');
        }
      },
      onSilenceTimeout: () => {
        if (!isMountedRef.current) return;
        if (transcriptRef.current.trim().length === 0) {
          setSilencePromptVisible(true);
        }
      },
      onError: (errMessage, errorType) => {
        if (!isMountedRef.current) return;
        console.warn('SpeechRecognition error handled:', errorType, errMessage);

        if (errorType === 'not-allowed') {
          setRecorderState('permission_denied');
          setErrorMessage(uiText.permDeniedDesc);
        } else if (errorType === 'audio-capture') {
          setRecorderState('device_error');
          setErrorMessage(uiText.deviceErrorDesc);
        } else if (errorType === 'network') {
          // Keep whatever words were captured
          setErrorMessage(errMessage);
        }
      },
      onEnd: () => {
        if (!isMountedRef.current) return;
        // Natural end or user stopped
      },
    });
  };

  /**
   * Reset and restart session fresh
   */
  const handleClearAndRetry = () => {
    speechRecognitionManager.stop(false);
    audioMeter.stop();
    setTranscript('');
    transcriptRef.current = '';
    setDuration(0);
    durationRef.current = 0;
    setEmptyWarning(false);
    setSilencePromptVisible(false);
    setIsEditingTranscript(false);
    startRecordingPipeline();
  };

  /**
   * Complete recording and proceed to clinical extraction
   */
  const handleFinish = () => {
    const finalClean = (transcriptRef.current || transcript).trim();
    if (!finalClean) {
      setEmptyWarning(true);
      return;
    }

    speechRecognitionManager.stop(false);
    audioMeter.stop();
    voiceSynthesizer.stop();
    onFinishRecording(finalClean);
  };

  /**
   * Use one of the pre-set healthcare scenarios
   */
  const handleSelectSample = (sampleText: string) => {
    setTranscript(sampleText);
    transcriptRef.current = sampleText;
    speechRecognitionManager.stop(false);
    audioMeter.stop();
    onFinishRecording(sampleText);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Visual waveform bars computed from live volume
  const getWaveBarHeight = (multiplier: number) => {
    const base = 8;
    const dynamic = Math.min(48, Math.max(4, Math.round((audioLevel * multiplier) / 2)));
    return isSpeakingLive || audioLevel > 15 ? dynamic : base;
  };

  return (
    <div className="max-w-md mx-auto p-4 flex flex-col items-center justify-between min-h-[82vh]">
      {/* Top Header & Real-Time Status */}
      <div className="w-full text-center pt-1">
        {/* State Badge */}
        {recorderState === 'listening' && (
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>{t.listening}</span>
            <span className="text-gray-500 dark:text-dark-muted font-mono font-bold">({formatTime(duration)})</span>
          </div>
        )}

        {recorderState === 'speech_detected' && (
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 text-xs font-bold shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <Volume2 className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
            <span>{uiText.speechActive}</span>
            <span className="text-gray-500 dark:text-dark-muted font-mono font-bold">({formatTime(duration)})</span>
          </div>
        )}

        {recorderState === 'requesting_permission' && (
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs font-bold">
            <Settings className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            <span>{uiText.requestingPerm}</span>
          </div>
        )}

        {/* Ambient Noise Warning */}
        {isLoudNoise && (
          <div className="mt-2 flex items-center justify-center space-x-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 shadow-sm animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>{t.noiseWarning}</span>
          </div>
        )}

        {/* Empty Transcript Warning Alert */}
        {emptyWarning && (
          <div className="mt-2 flex items-center justify-center space-x-1.5 text-xs font-bold text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-950/60 px-3 py-2 rounded-lg border border-red-300 dark:border-red-800 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{uiText.emptyAlert}</span>
          </div>
        )}
      </div>

      {/* Central Visual Area: Interactive Waveform & Pulsing Mic */}
      {recorderState !== 'permission_denied' && recorderState !== 'device_error' && recorderState !== 'unsupported' ? (
        <div className="my-6 flex flex-col items-center justify-center relative w-full">
          {/* Pulsing ambient ripple */}
          <div
            className="absolute rounded-full bg-emerald-500/15 dark:bg-emerald-400/10 pointer-events-none transition-all duration-150"
            style={{
              width: `${130 + Math.min(100, audioLevel * 1.6)}px`,
              height: `${130 + Math.min(100, audioLevel * 1.6)}px`,
            }}
          />

          {/* Core Microphone Button */}
          <div
            className={`w-28 h-28 rounded-full text-white flex items-center justify-center shadow-elevated transition-transform duration-200 ${
              isSpeakingLive
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 scale-105 ring-4 ring-emerald-300/60'
                : 'bg-health-primary'
            }`}
          >
            <Mic className="w-12 h-12 stroke-[2.2]" />
          </div>

          {/* Real-time Audio Waveform Visualizer */}
          <div className="flex items-end justify-center space-x-1.5 mt-5 h-12 w-48">
            <div
              className="w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-75"
              style={{ height: `${getWaveBarHeight(0.6)}px` }}
            />
            <div
              className="w-1.5 rounded-full bg-teal-500 dark:bg-teal-400 transition-all duration-75"
              style={{ height: `${getWaveBarHeight(1.1)}px` }}
            />
            <div
              className="w-2 rounded-full bg-emerald-600 dark:bg-emerald-300 transition-all duration-75"
              style={{ height: `${getWaveBarHeight(1.8)}px` }}
            />
            <div
              className="w-2.5 rounded-full bg-emerald-600 dark:bg-emerald-200 transition-all duration-75"
              style={{ height: `${getWaveBarHeight(2.2)}px` }}
            />
            <div
              className="w-2 rounded-full bg-emerald-600 dark:bg-emerald-300 transition-all duration-75"
              style={{ height: `${getWaveBarHeight(1.8)}px` }}
            />
            <div
              className="w-1.5 rounded-full bg-teal-500 dark:bg-teal-400 transition-all duration-75"
              style={{ height: `${getWaveBarHeight(1.1)}px` }}
            />
            <div
              className="w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-75"
              style={{ height: `${getWaveBarHeight(0.6)}px` }}
            />
          </div>

          <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-dark-muted text-center max-w-xs">
            {isSpeakingLive ? uiText.speechActive : uiText.readyToSpeak}
          </p>

          {/* Gentle silence guidance if user hasn't spoken after a while */}
          {silencePromptVisible && !transcript && (
            <div className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800 animate-fadeIn">
              💡 {uiText.silenceNotice}
            </div>
          )}
        </div>
      ) : (
        /* Permission Denied / Device Error Screen */
        <div className="my-6 w-full bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-800 rounded-2xl p-5 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 flex items-center justify-center mx-auto">
            <MicOff className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-red-900 dark:text-red-200">
              {recorderState === 'permission_denied'
                ? uiText.permDeniedTitle
                : recorderState === 'unsupported'
                ? uiText.unsupportedTitle
                : uiText.deviceErrorTitle}
            </h3>
            <p className="text-xs text-red-800/80 dark:text-red-300/80 mt-1.5 leading-relaxed">
              {errorMessage || uiText.permDeniedDesc}
            </p>
          </div>

          <div className="pt-2 flex flex-col space-y-2">
            <button
              onClick={handleClearAndRetry}
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow flex items-center justify-center space-x-2 touch-target"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{uiText.grantRetryBtn}</span>
            </button>

            <button
              onClick={onSwitchToDemo}
              className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-dark-card border border-red-300 dark:border-red-700 text-red-900 dark:text-red-200 font-bold text-xs shadow-sm hover:bg-red-50 flex items-center justify-center space-x-2 touch-target"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{uiText.useDemoBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Transcript Display Box with Edit Capability */}
      <div className="w-full bg-white dark:bg-dark-card rounded-2xl p-4 shadow-card dark:shadow-darkcard border border-health-mintborder dark:border-dark-border mb-3 min-h-[120px] flex flex-col justify-between">
        <div className="text-xs font-bold uppercase text-gray-500 dark:text-dark-muted mb-1 flex items-center justify-between">
          <span className="flex items-center space-x-1">
            <span>{t.liveTranscriptHeader}</span>
            {transcript && (
              <span className="text-[10px] lowercase text-gray-400">
                ({transcript.trim().split(/\s+/).filter(Boolean).length} words)
              </span>
            )}
          </span>

          <div className="flex items-center space-x-2">
            {transcript && (
              <button
                onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center space-x-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingTranscript ? uiText.doneEditing : uiText.editMode}</span>
              </button>
            )}
            {isSpeakingLive && (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center text-[11px] font-bold">
                <Volume2 className="w-3.5 h-3.5 mr-0.5 animate-pulse" /> {t.liveTranscriptListening}
              </span>
            )}
          </div>
        </div>

        {isEditingTranscript ? (
          <textarea
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              transcriptRef.current = e.target.value;
              setEmptyWarning(false);
            }}
            rows={3}
            className="w-full p-2 text-base font-medium rounded-lg border border-emerald-400 dark:border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder={t.liveTranscriptPlaceholder}
          />
        ) : (
          <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-white leading-relaxed min-h-[50px]">
            {transcript ? (
              <span>{transcript}</span>
            ) : (
              <span className="text-gray-400 dark:text-gray-500 italic font-normal text-sm sm:text-base">
                {t.liveTranscriptPlaceholder}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Instant Healthcare Sample Prompts (For fast demonstration or noisy field tests) */}
      <div className="w-full bg-slate-50 dark:bg-dark-card/60 rounded-xl p-3 border border-slate-200 dark:border-dark-border mb-3 text-left">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase text-gray-600 dark:text-dark-muted flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{uiText.sampleHeader}</span>
          </span>
          <button
            onClick={onSwitchToDemo}
            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            {uiText.useDemoBtn} →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => handleSelectSample(uiText.sample1)}
            className="text-left p-2.5 bg-white dark:bg-dark-card rounded-lg border border-slate-200 dark:border-dark-border hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition-all text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-sm"
          >
            👩‍🍼 {uiText.sample1}
          </button>
          <button
            onClick={() => handleSelectSample(uiText.sample2)}
            className="text-left p-2.5 bg-white dark:bg-dark-card rounded-lg border border-slate-200 dark:border-dark-border hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition-all text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-sm"
          >
            👶 {uiText.sample2}
          </button>
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div className="w-full flex items-center space-x-2 sm:space-x-3 mt-auto pt-2">
        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="flex-1 touch-target min-h-[50px] rounded-xl border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-dark-card active:bg-gray-200 transition-all flex items-center justify-center space-x-1.5 text-xs sm:text-sm"
        >
          <X className="w-4 h-4" />
          <span>{uiText.cancelBtn}</span>
        </button>

        {/* Clear & Restart Recording Button */}
        <button
          onClick={handleClearAndRetry}
          title={uiText.clearRetry}
          className="touch-target min-h-[50px] px-3.5 rounded-xl border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-dark-card active:bg-gray-200 transition-all flex items-center justify-center space-x-1 text-xs"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">{uiText.clearRetry}</span>
        </button>

        {/* Finish & Process Visit Button */}
        <button
          onClick={handleFinish}
          className={`flex-[2] touch-target min-h-[50px] rounded-xl font-bold shadow-md transition-all flex items-center justify-center space-x-2 text-sm sm:text-base ${
            transcript.trim()
              ? 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white cursor-pointer ring-2 ring-emerald-500/50'
              : 'bg-emerald-700/60 text-white/80 cursor-pointer hover:bg-emerald-700'
          }`}
        >
          <Check className="w-5 h-5 stroke-[2.5]" />
          <span>{uiText.finishBtn}</span>
        </button>
      </div>
    </div>
  );
};
