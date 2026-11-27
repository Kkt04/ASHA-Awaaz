import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  AlertTriangle,
  Volume2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Edit3,
  Globe,
  Radio,
  Play
} from 'lucide-react';
import { LanguageCode } from '../types';
import { getTranslation, SUPPORTED_LANGUAGES } from '../i18n';
import { speechRecognitionManager, SpeechRecognitionErrorType } from '../services/speechRecognition';

interface VoiceRecorderProps {
  language: LanguageCode;
  onFinishRecording: (transcript: string) => void;
  onCancel: () => void;
  onSwitchToDemo: () => void;
}

type RecordingStatus =
  | 'idle'
  | 'listening'
  | 'speech_detected'
  | 'permission_denied'
  | 'device_error'
  | 'unsupported';

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  language: initialLanguage,
  onFinishRecording,
  onCancel,
  onSwitchToDemo,
}) => {
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>(initialLanguage);
  const [status, setStatus] = useState<RecordingStatus>('listening');
  const [transcript, setTranscript] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isEditingTranscript, setIsEditingTranscript] = useState<boolean>(false);
  const [showEmptyWarning, setShowEmptyWarning] = useState<boolean>(false);
  const [silencePrompt, setSilencePrompt] = useState<boolean>(false);
  const [soundwaveLevel, setSoundwaveLevel] = useState<number>(1);

  const timerRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const waveAnimRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const t = getTranslation(activeLanguage);

  // Localized copy
  const localized = {
    en: {
      listeningBadge: 'Listening to your microphone...',
      voiceDetectedBadge: 'Spoken voice captured in real time',
      tapToStart: 'Tap microphone to start speaking',
      tapToPause: 'Tap to pause / finish',
      tipPrompt: 'Speak naturally: patient name, symptoms, vitals, or medicines.',
      permBlockedTitle: 'Microphone Permission Needed',
      permBlockedDesc: 'Please allow microphone access in your browser address bar to record your voice.',
      allowRetryBtn: 'Allow Microphone & Try Again',
      unsupportedTitle: 'Browser Speech Not Supported',
      unsupportedDesc: 'This browser does not support speech recognition. Please use Google Chrome or Microsoft Edge.',
      emptyError: 'Please speak or enter visit details before submitting.',
      editToggle: 'Edit text',
      doneEditToggle: 'Done editing',
      sampleSectionTitle: 'Quick One-Tap Health Scenarios',
      sample1: 'Sunita, 7 months pregnant, BP 150/100, swelling in feet, missed iron tablets',
      sample2: 'Aarav, 15 days newborn baby, fever 101.5, not feeding properly, irritable',
      finishPrimary: 'Review & Process Visit',
      cancelBtn: 'Cancel',
      restartBtn: 'Start Over',
      demoBtn: 'Demo Mode'
    },
    hi: {
      listeningBadge: 'माइक चालू है... आवाज़ सुन रहे हैं',
      voiceDetectedBadge: 'आवाज़ रिकॉर्ड हो रही है — लाइव ट्रांसक्रिप्ट',
      tapToStart: 'बोलना शुरू करने के लिए माइक पर टैप करें',
      tapToPause: 'रोकने के लिए टैप करें',
      tipPrompt: 'मरीज़ का नाम, लक्षण, बीपी या दवाइयाँ आराम से बोलिए।',
      permBlockedTitle: 'माइक की अनुमति ज़रूरी है',
      permBlockedDesc: 'कृपया ब्राउज़र के एड्रेस बार में लॉक/कैमरा आइकन पर क्लिक करके Microphone को "Allow" करें।',
      allowRetryBtn: 'अनुमति दें और दोबारा प्रयास करें',
      unsupportedTitle: 'वॉइस सपोर्ट उपलब्ध नहीं है',
      unsupportedDesc: 'यह ब्राउज़र स्पीच रिकग्निशन सपोर्ट नहीं करता। कृपया Google Chrome इस्तेमाल करें।',
      emptyError: 'कृपया विज़िट दर्ज करने से पहले कुछ बोलिए या उदाहरण चुनिए।',
      editToggle: 'सुधारें',
      doneEditToggle: 'सुधार पूरा',
      sampleSectionTitle: 'तुरंत जांच के लिए उदाहरण:',
      sample1: 'सुनीता, 7 महीने की गर्भवती, बीपी 150/100, पैरों में सूजन, आयरन की गोली नहीं ली',
      sample2: 'आरव, 15 दिन का नवजात शिशु, बुखार 101.5, दूध नहीं पी रहा, चिड़चिड़ा है',
      finishPrimary: 'विज़िट की जांच और पुष्टि करें',
      cancelBtn: 'रद्द करें',
      restartBtn: 'दोबारा बोलें',
      demoBtn: 'डेमो मोड'
    },
    ta: {
      listeningBadge: 'மைக் கேட்கிறது... பேசுங்கள்',
      voiceDetectedBadge: 'குரல் பதிவு செய்யப்படுகிறது',
      tapToStart: 'பேசத் தொடங்க மைக் மீது தொடவும்',
      tapToPause: 'நிறுத்த தொடவும்',
      tipPrompt: 'நோயாளி பெயர், அறிகுறிகள், பிபி அல்லது மருந்துகளைப் பேசுங்கள்.',
      permBlockedTitle: 'மைக்ரோஃபோன் அனுமதி தேவை',
      permBlockedDesc: 'முகவரிப் பட்டியில் உள்ள பூட்டு ஐகானைக் கிளிக் செய்து மைக்ரோஃபோனை "Allow" செய்யவும்.',
      allowRetryBtn: 'மீண்டும் முயற்சிக்கவும்',
      unsupportedTitle: 'குரல் ஆதரவு இல்லை',
      unsupportedDesc: 'Google Chrome உலாவியைப் பயன்படுத்தவும்.',
      emptyError: 'சமர்ப்பிப்பதற்கு முன் விவரங்களைப் பேசுங்கள்.',
      editToggle: 'திருத்து',
      doneEditToggle: 'முடிந்தது',
      sampleSectionTitle: 'மாதிரி வருகை வாக்கியங்கள்:',
      sample1: 'சுனிதா, 7 மாத கர்ப்பிணி, பிபி 150/100, கால்களில் வீக்கம், இரும்பு மாத்திரை தவறவிட்டது',
      sample2: 'ஆரவ், 15 நாட்கள் பிறந்த குழந்தை, காய்ச்சல் 101.5, சரியாக பால் குடிக்கவில்லை',
      finishPrimary: 'விவரங்களைச் சரிபார்த்து சமர்ப்பிக்கவும்',
      cancelBtn: 'ரத்து செய்',
      restartBtn: 'மீண்டும் தொடங்கு',
      demoBtn: 'டெமோ'
    },
    bho: {
      listeningBadge: 'माइक चालू बा... सुनत बानी',
      voiceDetectedBadge: 'आवाज लाइव पकड़ल जा रहल बा',
      tapToStart: 'बोले खातिर माइक पर टैप करीं',
      tapToPause: 'रोके खातिर टैप करीं',
      tipPrompt: 'मरीज के नाम, लक्षण, बीपी चाहे दवाई आराम से बोलीं।',
      permBlockedTitle: 'माइक के अनुमति चाहीं',
      permBlockedDesc: 'एड्रेस बार में लॉक आइकन पर क्लिक कर के Microphone के "Allow" करीं।',
      allowRetryBtn: 'अनुमति दीं आ फेर कोशिश करीं',
      unsupportedTitle: 'आवाज सपोर्ट नइखे',
      unsupportedDesc: 'कृपा क के Google Chrome भा Microsoft Edge खोलीं।',
      emptyError: 'दर्ज करे से पहिले कुछ बोलीं भा नमूना चुनीं।',
      editToggle: 'सुधारीं',
      doneEditToggle: 'सुधार पूरा',
      sampleSectionTitle: 'तुरंत नमूना चुनीं:',
      sample1: 'सुनीता, 7 महीना के गर्भवती, बीपी 150/100, गोड़ में सूजन, आयरन के गोली ना लिहले',
      sample2: 'आरव, 15 दिन के लइका, बुखार 101.5, दूध नइखे पीयत, रोवत बा',
      finishPrimary: 'जांच करीं आ आगे बढ़ीं',
      cancelBtn: 'रद्द करीं',
      restartBtn: 'फेर से बोलीं',
      demoBtn: 'डेमो मोड'
    }
  }[activeLanguage] || {
    listeningBadge: 'Listening to your microphone...',
    voiceDetectedBadge: 'Spoken voice captured in real time',
    tapToStart: 'Tap microphone to start speaking',
    tapToPause: 'Tap to pause / finish',
    tipPrompt: 'Speak naturally: patient name, symptoms, vitals, or medicines.',
    permBlockedTitle: 'Microphone Permission Needed',
    permBlockedDesc: 'Please allow microphone access in your browser address bar to record your voice.',
    allowRetryBtn: 'Allow Microphone & Try Again',
    unsupportedTitle: 'Browser Speech Not Supported',
    unsupportedDesc: 'This browser does not support speech recognition. Please use Google Chrome or Microsoft Edge.',
    emptyError: 'Please speak or enter visit details before submitting.',
    editToggle: 'Edit text',
    doneEditToggle: 'Done editing',
    sampleSectionTitle: 'Quick One-Tap Health Scenarios',
    sample1: 'Sunita, 7 months pregnant, BP 150/100, swelling in feet, missed iron tablets',
    sample2: 'Aarav, 15 days newborn baby, fever 101.5, not feeding properly, irritable',
    finishPrimary: 'Review & Process Visit',
    cancelBtn: 'Cancel',
    restartBtn: 'Start Over',
    demoBtn: 'Demo Mode'
  };

  useEffect(() => {
    isMountedRef.current = true;
    startVoiceEngine(activeLanguage);

    // Duration timer
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    // Smooth soundwave visualizer animation
    const animateSoundwaves = () => {
      if (!isMountedRef.current) return;
      setSoundwaveLevel((prev) => (prev % 6) + 1);
      waveAnimRef.current = setTimeout(animateSoundwaves, 180);
    };
    waveAnimRef.current = setTimeout(animateSoundwaves, 180);

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveAnimRef.current) clearTimeout(waveAnimRef.current);
      speechRecognitionManager.stop(false);
    };
  }, []);

  /**
   * Starts Speech Recognition natively without competing getUserMedia locks
   */
  const startVoiceEngine = (lang: LanguageCode) => {
    if (!speechRecognitionManager.isSupported()) {
      setStatus('unsupported');
      setErrorMessage(localized.unsupportedDesc);
      return;
    }

    setStatus('listening');
    setShowEmptyWarning(false);
    setSilencePrompt(false);

    speechRecognitionManager.start(lang, {
      onStart: () => {
        if (!isMountedRef.current) return;
        setStatus('listening');
      },
      onSpeechDetected: (detected) => {
        if (!isMountedRef.current) return;
        setIsSpeaking(detected);
        if (detected) {
          setStatus('speech_detected');
          setSilencePrompt(false);
        }
      },
      onTranscriptChange: (text) => {
        if (!isMountedRef.current) return;
        setTranscript(text);
        transcriptRef.current = text;
        setShowEmptyWarning(false);
        setSilencePrompt(false);
        if (text.trim().length > 0) {
          setStatus('speech_detected');
        }
      },
      onSilenceTimeout: () => {
        if (!isMountedRef.current) return;
        if (transcriptRef.current.trim().length === 0) {
          setSilencePrompt(true);
        }
      },
      onError: (errText, errorType) => {
        if (!isMountedRef.current) return;
        console.warn('SpeechRecognition error handled:', errorType, errText);

        if (errorType === 'not-allowed') {
          setStatus('permission_denied');
          setErrorMessage(localized.permBlockedDesc);
        } else if (errorType === 'audio-capture') {
          setStatus('device_error');
          setErrorMessage(errText);
        } else if (errorType === 'not-supported') {
          setStatus('unsupported');
          setErrorMessage(errText);
        }
      },
      onEnd: () => {
        if (!isMountedRef.current) return;
      },
    });
  };

  /**
   * Direct user gesture click on the microphone orb
   */
  const handleMicClick = () => {
    if (status === 'listening' || status === 'speech_detected') {
      // If already listening, clicking toggles or keeps recording alive
      setIsSpeaking(true);
    } else {
      startVoiceEngine(activeLanguage);
    }
  };

  /**
   * One-click language switcher right inside the recording view
   */
  const handleSwitchLanguage = (lang: LanguageCode) => {
    setActiveLanguage(lang);
    speechRecognitionManager.setLanguage(lang);
  };

  /**
   * Clear transcript and restart fresh
   */
  const handleRestart = () => {
    speechRecognitionManager.stop(false);
    setTranscript('');
    transcriptRef.current = '';
    setDuration(0);
    setShowEmptyWarning(false);
    setSilencePrompt(false);
    setIsEditingTranscript(false);
    startVoiceEngine(activeLanguage);
  };

  /**
   * Submit and process visit recording
   */
  const handleFinish = () => {
    const finalClean = (transcriptRef.current || transcript).trim();
    if (!finalClean) {
      setShowEmptyWarning(true);
      return;
    }

    speechRecognitionManager.stop(false);
    onFinishRecording(finalClean);
  };

  /**
   * Instant health sample selection
   */
  const handleSelectSample = (sampleText: string) => {
    setTranscript(sampleText);
    transcriptRef.current = sampleText;
    speechRecognitionManager.stop(false);
    onFinishRecording(sampleText);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="max-w-lg mx-auto p-3 sm:p-4 flex flex-col items-center justify-between min-h-[84vh]">
      {/* 1. Header with Language Quick-Switcher & Status */}
      <div className="w-full flex flex-col items-center pt-1 space-y-2.5">
        {/* Language Pills Switcher */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-dark-card rounded-full border border-slate-200 dark:border-dark-border shadow-sm">
          <Globe className="w-3.5 h-3.5 text-gray-400 ml-2 mr-1" />
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => handleSwitchLanguage(l.code as LanguageCode)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activeLanguage === l.code
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-dark-muted hover:text-emerald-700 dark:hover:text-emerald-400'
              }`}
            >
              {l.nativeLabel}
            </button>
          ))}
        </div>

        {/* Live Audio / Speech Status Badge */}
        {status === 'speech_detected' ? (
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold shadow-sm animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
            <span>{localized.voiceDetectedBadge}</span>
            <span className="text-gray-500 dark:text-dark-muted font-mono font-bold">({formatTime(duration)})</span>
          </div>
        ) : status === 'listening' ? (
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <span>{localized.listeningBadge}</span>
            <span className="text-gray-500 dark:text-dark-muted font-mono font-bold">({formatTime(duration)})</span>
          </div>
        ) : null}

        {/* Empty Submission Warning Alert */}
        {showEmptyWarning && (
          <div className="w-full flex items-center justify-center space-x-2 text-xs font-bold text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/70 px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-800 shadow-sm animate-shake">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{localized.emptyError}</span>
          </div>
        )}
      </div>

      {/* 2. Hero Interactive Microphone & Animated Waveform */}
      {status !== 'permission_denied' && status !== 'device_error' && status !== 'unsupported' ? (
        <div className="my-5 flex flex-col items-center justify-center relative w-full">
          {/* Subtle pulsating outer ripple ring */}
          <div
            className={`absolute rounded-full pointer-events-none transition-all duration-300 ${
              isSpeaking
                ? 'w-44 h-44 bg-emerald-500/20 dark:bg-emerald-400/15 animate-ping'
                : 'w-36 h-36 bg-emerald-500/10 dark:bg-emerald-400/10 animate-pulse'
            }`}
          />

          {/* Central Touch Target Microphone Orb */}
          <button
            onClick={handleMicClick}
            type="button"
            aria-label="Toggle Microphone"
            className={`w-28 h-28 rounded-full text-white flex items-center justify-center shadow-elevated transition-all duration-200 transform active:scale-95 cursor-pointer touch-target ${
              isSpeaking
                ? 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-500 ring-4 ring-emerald-300/80 shadow-emerald-600/30'
                : 'bg-emerald-600 hover:bg-emerald-700 ring-4 ring-emerald-100 dark:ring-emerald-950 shadow-emerald-800/20'
            }`}
          >
            <Mic className={`w-12 h-12 stroke-[2.2] ${isSpeaking ? 'animate-bounce' : ''}`} />
          </button>

          {/* Dynamic 9-Bar Soundwave Graphic */}
          <div className="flex items-end justify-center space-x-1.5 mt-4 h-10 w-44">
            {[18, 28, 38, 26, 42, 32, 22, 34, 20].map((baseH, idx) => {
              const activeH = Math.min(42, Math.max(8, (baseH * ((soundwaveLevel + idx) % 5 + 2)) / 5));
              const height = isSpeaking || status === 'speech_detected' ? activeH : 8;
              return (
                <div
                  key={idx}
                  className={`w-1.5 rounded-full transition-all duration-150 ${
                    isSpeaking
                      ? 'bg-emerald-500 dark:bg-emerald-400'
                      : 'bg-emerald-300/70 dark:bg-emerald-800'
                  }`}
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>

          <p className="mt-2 text-xs font-semibold text-gray-600 dark:text-dark-muted text-center max-w-xs">
            {isSpeaking ? localized.voiceDetectedBadge : localized.tipPrompt}
          </p>

          {/* Silence Tip Prompt if user hasn't spoken */}
          {silencePrompt && !transcript && (
            <div className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800 animate-fadeIn">
              💡 {localized.tipPrompt}
            </div>
          )}
        </div>
      ) : (
        /* Explicit Permission / Device Error Card */
        <div className="my-5 w-full bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-800 rounded-2xl p-5 text-center space-y-3 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 flex items-center justify-center mx-auto">
            <MicOff className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-red-950 dark:text-red-200">
              {status === 'permission_denied'
                ? localized.permBlockedTitle
                : localized.unsupportedTitle}
            </h3>
            <p className="text-xs text-red-800/90 dark:text-red-300/90 mt-1 leading-relaxed max-w-sm mx-auto">
              {errorMessage || localized.permBlockedDesc}
            </p>
          </div>

          <div className="pt-2 flex flex-col space-y-2 max-w-xs mx-auto">
            <button
              onClick={handleRestart}
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-2 touch-target"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{localized.allowRetryBtn}</span>
            </button>

            <button
              onClick={onSwitchToDemo}
              className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-dark-card border border-red-300 dark:border-red-700 text-red-900 dark:text-red-200 font-bold text-xs shadow-sm hover:bg-red-50 flex items-center justify-center space-x-2 touch-target"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{localized.demoBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Live Transcript Display Box */}
      <div className="w-full bg-white dark:bg-dark-card rounded-2xl p-4 shadow-card dark:shadow-darkcard border border-health-mintborder dark:border-dark-border mb-3 min-h-[125px] flex flex-col justify-between">
        <div className="text-xs font-bold uppercase text-gray-500 dark:text-dark-muted mb-1 flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <span>{t.liveTranscriptHeader}</span>
            {wordCount > 0 && (
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                {wordCount} words
              </span>
            )}
          </span>

          {transcript && (
            <button
              onClick={() => setIsEditingTranscript(!isEditingTranscript)}
              className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditingTranscript ? localized.doneEditToggle : localized.editToggle}</span>
            </button>
          )}
        </div>

        {isEditingTranscript ? (
          <textarea
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              transcriptRef.current = e.target.value;
              setShowEmptyWarning(false);
            }}
            rows={3}
            className="w-full p-2.5 text-base font-medium rounded-xl border border-emerald-400 dark:border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder={t.liveTranscriptPlaceholder}
          />
        ) : (
          <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-white leading-relaxed min-h-[52px]">
            {transcript ? (
              <span className="selection:bg-emerald-200">{transcript}</span>
            ) : (
              <span className="text-gray-400 dark:text-gray-500 italic font-normal text-sm sm:text-base">
                {t.liveTranscriptPlaceholder}
              </span>
            )}
          </p>
        )}
      </div>

      {/* 4. One-Tap Instant Health Scenarios */}
      <div className="w-full bg-slate-50 dark:bg-dark-card/50 rounded-2xl p-3 border border-slate-200 dark:border-dark-border mb-3 text-left shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-dark-muted flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{localized.sampleSectionTitle}</span>
          </span>
          <button
            onClick={onSwitchToDemo}
            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            {localized.demoBtn} →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => handleSelectSample(localized.sample1)}
            className="text-left p-2.5 bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-dark-border hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition-all text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-sm group"
          >
            <span className="mr-1.5">🤰</span>
            <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
              {localized.sample1}
            </span>
          </button>
          <button
            onClick={() => handleSelectSample(localized.sample2)}
            className="text-left p-2.5 bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-dark-border hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition-all text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-sm group"
          >
            <span className="mr-1.5">👶</span>
            <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
              {localized.sample2}
            </span>
          </button>
        </div>
      </div>

      {/* 5. GORGEOUS, REDESIGNED ACTION BUTTONS */}
      <div className="w-full flex flex-col space-y-2 mt-auto pt-1">
        {/* Primary Action Button: "Review & Process Visit" */}
        <button
          onClick={handleFinish}
          type="button"
          className={`w-full min-h-[54px] rounded-2xl font-black text-base tracking-wide shadow-md transition-all duration-200 flex items-center justify-center space-x-2.5 touch-target ${
            transcript.trim()
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] text-white shadow-emerald-700/25 ring-2 ring-emerald-500/40 cursor-pointer'
              : 'bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 cursor-pointer'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-200 stroke-[2.5]" />
          <span>
            {localized.finishPrimary}
            {wordCount > 0 ? ` (${wordCount} words)` : ''}
          </span>
          <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
        </button>

        {/* Secondary Utility Controls */}
        <div className="w-full flex items-center justify-between space-x-2 pt-0.5">
          {/* Cancel */}
          <button
            onClick={onCancel}
            type="button"
            className="flex-1 py-2.5 px-3 rounded-xl border border-gray-300 dark:border-dark-border text-gray-600 dark:text-dark-muted font-bold hover:bg-gray-100 dark:hover:bg-dark-card transition-all flex items-center justify-center space-x-1.5 text-xs touch-target"
          >
            <X className="w-4 h-4" />
            <span>{localized.cancelBtn}</span>
          </button>

          {/* Restart Recording */}
          <button
            onClick={handleRestart}
            type="button"
            className="flex-1 py-2.5 px-3 rounded-xl border border-gray-300 dark:border-dark-border text-gray-600 dark:text-dark-muted font-bold hover:bg-gray-100 dark:hover:bg-dark-card transition-all flex items-center justify-center space-x-1.5 text-xs touch-target"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{localized.restartBtn}</span>
          </button>

          {/* Demo Mode Button */}
          <button
            onClick={onSwitchToDemo}
            type="button"
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold hover:bg-emerald-100 transition-all flex items-center justify-center space-x-1.5 text-xs touch-target"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{localized.demoBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
