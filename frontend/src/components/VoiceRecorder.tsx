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
  CheckCircle2,
  ArrowRight,
  Edit3
} from 'lucide-react';
import { LanguageCode } from '../types';
import { getTranslation } from '../i18n';
import { speechRecognitionManager } from '../services/speechRecognition';
import { audioMeter } from '../services/audioMeter';
import { voiceSynthesizer } from '../services/speechSynthesis';

interface VoiceRecorderProps {
  language: LanguageCode;
  onFinishRecording: (transcript: string) => void;
  onCancel: () => void;
  onSwitchToDemo: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  language,
  onFinishRecording,
  onCancel,
  onSwitchToDemo,
}) => {
  const [transcript, setTranscript] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(10);
  const [isLoudNoise, setIsLoudNoise] = useState<boolean>(false);
  const [isRecognitionSupported, setIsRecognitionSupported] = useState<boolean>(true);
  const [showManualFallback, setShowManualFallback] = useState<boolean>(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState<boolean>(false);
  const [emptyWarning, setEmptyWarning] = useState<boolean>(false);

  const timerRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const t = getTranslation(language);

  useEffect(() => {
    // 1. Spoken Audio Greeting (non-blocking, plays in parallel)
    const promptText =
      language === 'ta'
        ? 'வணக்கம், வருகை விவரங்களைப் பேசுங்கள்.'
        : language === 'en'
        ? 'Welcome, please speak about the visit.'
        : language === 'bho'
        ? 'प्रणाम, दौरा के बारे में बोलीं।'
        : 'नमस्ते, विज़िट के बारे में बोलिए।';

    voiceSynthesizer.speak(promptText, language);

    // 2. Start recording session immediately
    startRecordingSession();

    // 3. Duration Clock
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      speechRecognitionManager.stop();
      audioMeter.stop();
      voiceSynthesizer.stop();
    };
  }, [language]);

  const startRecordingSession = () => {
    const supported = speechRecognitionManager.isSupported();
    setIsRecognitionSupported(supported);

    if (!supported) {
      setShowManualFallback(true);
      return;
    }

    // Start Audio Level meter (reacts dynamically to user voice volume)
    audioMeter.start((level, isLoud) => {
      setAudioLevel(level);
      setIsLoudNoise(isLoud);
    });

    // Start Web Speech Recognition
    speechRecognitionManager.start(language, {
      onTranscriptChange: (text) => {
        setTranscript(text);
        transcriptRef.current = text;
        setEmptyWarning(false);
      },
      onSilenceTimeout: () => {
        // Gentle silence notice
      },
      onError: (err) => {
        console.warn('Speech recognition error event:', err);
        if (err === 'not-allowed') {
          setShowManualFallback(true);
        }
      },
    });
  };

  const handleRestart = () => {
    speechRecognitionManager.stop();
    audioMeter.stop();
    setTranscript('');
    transcriptRef.current = '';
    setDuration(0);
    setEmptyWarning(false);
    setIsEditingTranscript(false);
    startRecordingSession();
  };

  const handleStop = () => {
    const finalTranscript = (transcriptRef.current || transcript).trim();
    if (!finalTranscript) {
      setEmptyWarning(true);
      return;
    }

    speechRecognitionManager.stop();
    audioMeter.stop();
    voiceSynthesizer.stop();
    onFinishRecording(finalTranscript);
  };

  const handleUsePresetSample = (sample: string) => {
    setTranscript(sample);
    transcriptRef.current = sample;
    speechRecognitionManager.stop();
    audioMeter.stop();
    voiceSynthesizer.stop();
    onFinishRecording(sample);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).filter(Boolean).length : 0;

  // Localized action labels
  const labels = {
    en: {
      finishBtn: 'Finish & Process Visit',
      cancelBtn: 'Cancel',
      restartBtn: 'Start Over',
      demoBtn: 'Demo Mode',
      sampleHeader: 'Quick Test Scenarios (One Tap):',
      sample1: 'Sunita, 7 months pregnant, BP 150/100, swelling in feet, missed iron tablets',
      sample2: 'Aarav, 15 days newborn baby, fever 101.5, not feeding properly, irritable',
      emptyAlert: 'Please speak or enter visit details before submitting.',
      editToggle: 'Edit text',
      doneEditToggle: 'Done editing'
    },
    hi: {
      finishBtn: 'रिकॉर्डिंग पूरी करें और सेव करें',
      cancelBtn: 'रद्द करें',
      restartBtn: 'दोबारा बोलें',
      demoBtn: 'डेमो चलाएं',
      sampleHeader: 'तुरंत जांच के लिए उदाहरण पर टैप करें:',
      sample1: 'सुनीता, 7 महीने की गर्भवती, बीपी 150/100, पैरों में सूजन, आयरन की गोली नहीं ली',
      sample2: 'आरव, 15 दिन का नवजात शिशु, बुखार 101.5, दूध नहीं पी रहा, चिड़चिड़ा है',
      emptyAlert: 'कृपया विज़िट दर्ज करने से पहले कुछ बोलिए या उदाहरण चुनिए।',
      editToggle: 'सुधारें',
      doneEditToggle: 'सुधार पूरा'
    },
    ta: {
      finishBtn: 'பதிவை முடித்து சமர்ப்பிக்கவும்',
      cancelBtn: 'ரத்து செய்',
      restartBtn: 'மீண்டும் தொடங்கு',
      demoBtn: 'டெமோ',
      sampleHeader: 'மாதிரி வருகை வாக்கியங்கள்:',
      sample1: 'சுனிதா, 7 மாத கர்ப்பிணி, பிபி 150/100, கால்களில் வீக்கம், இரும்பு மாத்திரை தவறவிட்டது',
      sample2: 'ஆரவ், 15 நாட்கள் பிறந்த குழந்தை, காய்ச்சல் 101.5, சரியாக பால் குடிக்கவில்லை',
      emptyAlert: 'சமர்ப்பிப்பதற்கு முன் விவரங்களைப் பேசுங்கள்.',
      editToggle: 'திருத்து',
      doneEditToggle: 'முடிந்தது'
    },
    bho: {
      finishBtn: 'रिकॉर्डिंग पूरा करीं आ सेव करीं',
      cancelBtn: 'रद्द करीं',
      restartBtn: 'फेर से बोलीं',
      demoBtn: 'डेमो मोड',
      sampleHeader: 'तुरंत नमूना चुनीं:',
      sample1: 'सुनीता, 7 महीना के गर्भवती, बीपी 150/100, गोड़ में सूजन, आयरन के गोली ना लिहले',
      sample2: 'आरव, 15 दिन के लइका, बुखार 101.5, दूध नइखे पीयत, रोवत बा',
      emptyAlert: 'दर्ज करे से पहिले कुछ बोलीं भा नमूना चुनीं।',
      editToggle: 'सुधारीं',
      doneEditToggle: 'सुधार पूरा'
    }
  }[language] || {
    finishBtn: 'Finish & Process Visit',
    cancelBtn: 'Cancel',
    restartBtn: 'Start Over',
    demoBtn: 'Demo Mode',
    sampleHeader: 'Quick Test Scenarios (One Tap):',
    sample1: 'Sunita, 7 months pregnant, BP 150/100, swelling in feet, missed iron tablets',
    sample2: 'Aarav, 15 days newborn baby, fever 101.5, not feeding properly, irritable',
    emptyAlert: 'Please speak or enter visit details before submitting.',
    editToggle: 'Edit text',
    doneEditToggle: 'Done editing'
  };

  return (
    <div className="max-w-md mx-auto p-4 flex flex-col items-center justify-between min-h-[82vh]">
      {/* Top Status & Noise Alert */}
      <div className="w-full text-center pt-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-health-mint text-health-dark text-sm font-semibold mb-2 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
          <span>{t.listening}</span>
          <span className="text-gray-500 font-mono font-bold">({formatTime(duration)})</span>
        </div>

        {isLoudNoise && (
          <div className="mt-2 flex items-center justify-center space-x-1.5 text-xs font-semibold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{t.noiseWarning}</span>
          </div>
        )}

        {emptyWarning && (
          <div className="mt-2 flex items-center justify-center space-x-1.5 text-xs font-bold text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-950/70 px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-800 shadow-sm animate-shake">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{labels.emptyAlert}</span>
          </div>
        )}
      </div>

      {/* Central Pulsing Microphone Visual (Scales dynamically with ambient voice volume) */}
      <div className="my-6 flex flex-col items-center justify-center relative">
        <div
          className="absolute rounded-full bg-health-primary/25 dark:bg-emerald-500/20 pointer-events-none transition-all duration-150"
          style={{
            width: `${140 + Math.min(90, audioLevel * 1.4)}px`,
            height: `${140 + Math.min(90, audioLevel * 1.4)}px`,
          }}
        />
        <div className="w-32 h-32 rounded-full bg-health-primary text-white flex items-center justify-center shadow-elevated mic-pulse touch-target">
          <Mic className="w-14 h-14" />
        </div>
        <p className="mt-5 text-sm font-semibold text-gray-700 dark:text-dark-muted max-w-xs text-center">
          "Sunita, 7 mahine ki pregnant hai, BP 150 by 100 hai, pairon mein sujan hai..."
        </p>
      </div>

      {/* Live Transcript Display Box */}
      <div className="w-full bg-white dark:bg-dark-card rounded-2xl p-4 shadow-card dark:shadow-darkcard border border-health-mintborder dark:border-dark-border mb-3 min-h-[115px] flex flex-col justify-between">
        <div className="text-xs font-bold uppercase text-gray-500 dark:text-dark-muted mb-1 flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <span>{t.liveTranscriptHeader}</span>
            {wordCount > 0 && (
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                {wordCount} words
              </span>
            )}
          </span>

          <div className="flex items-center space-x-2">
            {transcript && (
              <button
                onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center space-x-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingTranscript ? labels.doneEditToggle : labels.editToggle}</span>
              </button>
            )}
            {transcript && (
              <span className="text-health-primary dark:text-emerald-400 flex items-center text-[11px] font-bold">
                <Volume2 className="w-3.5 h-3.5 mr-0.5" /> {t.liveTranscriptListening}
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
          <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-white leading-relaxed min-h-[48px]">
            {transcript || (
              <span className="text-gray-400 dark:text-gray-500 italic font-normal text-sm sm:text-base">
                {t.liveTranscriptPlaceholder}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Instant Healthcare Sample Prompts */}
      <div className="w-full bg-slate-50 dark:bg-dark-card/60 rounded-xl p-3 border border-slate-200 dark:border-dark-border mb-3 text-left">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase text-gray-600 dark:text-dark-muted flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{labels.sampleHeader}</span>
          </span>
          <button
            onClick={onSwitchToDemo}
            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            {labels.demoBtn} →
          </button>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          <button
            onClick={() => handleUsePresetSample(labels.sample1)}
            className="text-left p-2.5 bg-white dark:bg-dark-card rounded-lg border border-slate-200 dark:border-dark-border hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition-all text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-sm"
          >
            👉 "{labels.sample1}"
          </button>
          <button
            onClick={() => handleUsePresetSample(labels.sample2)}
            className="text-left p-2.5 bg-white dark:bg-dark-card rounded-lg border border-slate-200 dark:border-dark-border hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition-all text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-sm"
          >
            👉 "{labels.sample2}"
          </button>
        </div>
      </div>

      {/* Beautiful, High-Contrast Action Controls */}
      <div className="w-full flex flex-col space-y-2 mt-auto pt-1">
        {/* Primary Action Button: "Finish & Process Visit" */}
        <button
          onClick={handleStop}
          className={`w-full min-h-[52px] rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center space-x-2.5 shadow-md ${
            transcript.trim()
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-700/20 active:scale-[0.99] cursor-pointer'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm cursor-pointer'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-100 stroke-[2.2]" />
          <span>
            {labels.finishBtn}
            {wordCount > 0 ? ` (${wordCount} words)` : ''}
          </span>
          <ArrowRight className="w-4 h-4 ml-1 stroke-[2.2]" />
        </button>

        {/* Secondary Buttons Row */}
        <div className="w-full flex items-center space-x-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-3 rounded-xl border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-dark-card transition-all flex items-center justify-center space-x-1.5 text-xs touch-target"
          >
            <X className="w-4 h-4" />
            <span>{labels.cancelBtn}</span>
          </button>

          <button
            onClick={handleRestart}
            className="flex-1 py-2.5 px-3 rounded-xl border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-dark-card transition-all flex items-center justify-center space-x-1.5 text-xs touch-target"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{labels.restartBtn}</span>
          </button>

          <button
            onClick={onSwitchToDemo}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold hover:bg-emerald-100 transition-all flex items-center justify-center space-x-1.5 text-xs touch-target"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{labels.demoBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
