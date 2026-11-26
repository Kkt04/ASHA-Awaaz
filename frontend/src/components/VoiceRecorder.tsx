import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, X, AlertTriangle, Volume2, Sparkles } from 'lucide-react';
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
  const [manualText, setManualText] = useState<string>('');
  const [showManualFallback, setShowManualFallback] = useState<boolean>(false);
  
  const timerRef = useRef<any>(null);
  const hasSpokenRef = useRef<boolean>(false);
  const t = getTranslation(language);

  useEffect(() => {
    // 1. Initial Spoken Greeting (strictly run once per recording session)
    if (!hasSpokenRef.current) {
      hasSpokenRef.current = true;
      const promptText =
        language === 'ta'
          ? 'வணக்கம், வருகை விவரங்களைப் பேசுங்கள்.'
          : language === 'en'
          ? 'Welcome, please speak about the visit.'
          : 'नमस्ते, विज़िट के बारे में बोलिए।';

      voiceSynthesizer.speak(promptText, language, () => {
        startRecordingSession();
      });
    }

    // 2. Timer
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      speechRecognitionManager.stop();
      audioMeter.stop();
      voiceSynthesizer.stop();
    };
  }, []);

  const startRecordingSession = () => {
    const supported = speechRecognitionManager.isSupported();
    setIsRecognitionSupported(supported);

    if (!supported) {
      setShowManualFallback(true);
      return;
    }

    // Start Audio Level meter
    audioMeter.start((level, isLoud) => {
      setAudioLevel(level);
      setIsLoudNoise(isLoud);
    });

    // Start Web Speech Recognition
    speechRecognitionManager.start(language, {
      onTranscriptChange: (text) => {
        setTranscript(text);
      },
      onSilenceTimeout: () => {
        // 6-second silence handler
        voiceSynthesizer.speak(t.silenceAudio, language);
      },
      onError: (err) => {
        console.warn('Speech recognition error:', err);
        setShowManualFallback(true);
      },
    });
  };

  const handleStop = () => {
    speechRecognitionManager.stop();
    audioMeter.stop();
    const finalTranscript = transcript.trim() || manualText.trim();
    if (finalTranscript) {
      onFinishRecording(finalTranscript);
    } else {
      // If empty transcript, fall back or prompt
      voiceSynthesizer.speak(t.silenceAudio, language);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleUsePresetSample = (sample: string) => {
    setTranscript(sample);
    onFinishRecording(sample);
  };

  return (
    <div className="max-w-md mx-auto p-4 flex flex-col items-center justify-between min-h-[82vh]">
      {/* Top Status & Noise Alert */}
      <div className="w-full text-center pt-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-health-mint text-health-dark text-sm font-semibold mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
          <span>{t.listening}</span>
          <span className="text-gray-500 font-mono">({formatTime(duration)})</span>
        </div>

        {isLoudNoise && (
          <div className="mt-2 flex items-center justify-center space-x-1.5 text-xs font-semibold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{t.noiseWarning}</span>
          </div>
        )}
      </div>

      {/* Central Pulsing Microphone Visual */}
      <div className="my-8 flex flex-col items-center justify-center relative">
        {/* Pulsing ring scales with ambient volume */}
        <div
          className="absolute rounded-full bg-health-primary/20 pointer-events-none transition-all duration-150"
          style={{
            width: `${140 + audioLevel * 1.2}px`,
            height: `${140 + audioLevel * 1.2}px`,
          }}
        />
        <div
          className="w-32 h-32 rounded-full bg-health-primary text-white flex items-center justify-center shadow-elevated mic-pulse touch-target"
        >
          <Mic className="w-14 h-14" />
        </div>
        <p className="mt-6 text-base font-semibold text-gray-700 max-w-xs text-center">
          "Sunita, 7 mahine ki pregnant hai, BP 150 by 100 hai, pairon mein sujan hai..."
        </p>
      </div>

      {/* Live Transcript Display Box */}
      <div className="w-full bg-white rounded-2xl p-4 shadow-card border border-health-mintborder mb-4 min-h-[110px] flex flex-col justify-between">
        <div className="text-xs font-bold uppercase text-gray-500 mb-1 flex items-center justify-between">
          <span>{t.liveTranscriptHeader}</span>
          {transcript && (
            <span className="text-health-primary flex items-center text-[11px]">
              <Volume2 className="w-3.5 h-3.5 mr-0.5" /> {t.liveTranscriptListening}
            </span>
          )}
        </div>
        <p className="text-lg font-medium text-gray-900 leading-relaxed min-h-[48px]">
          {transcript || (
            <span className="text-gray-400 italic">
              {t.liveTranscriptPlaceholder}
            </span>
          )}
        </p>
      </div>

      {/* Fallback / Preset Samples if in testing or device without mic */}
      {showManualFallback && (
        <div className="w-full bg-amber-50 p-3 rounded-xl border border-amber-200 mb-4 text-left text-xs">
          <p className="font-bold text-amber-900 mb-1">
            {t.noMicSupportTitle}
          </p>
          <p className="text-gray-700 mb-2">
            {t.noMicSupportDesc}
          </p>
          <div className="space-y-1.5">
            <button
              onClick={() =>
                handleUsePresetSample(
                  'Sunita, 7 mahine ki pregnant hai, BP 150 by 100 hai, pairon mein sujan hai aur iron ki goli nahi li.'
                )
              }
              className="w-full text-left p-2 bg-white rounded border border-amber-200 hover:bg-amber-100 font-medium text-gray-800 touch-target"
            >
              {t.presetPromptSample1}
            </button>
            <button
              onClick={() =>
                handleUsePresetSample(
                  'Aarav, 15 din ka navjat shishu hai, bukhar 101.5 hai, doodh nahi pee raha.'
                )
              }
              className="w-full text-left p-2 bg-white rounded border border-amber-200 hover:bg-amber-100 font-medium text-gray-800 touch-target"
            >
              {t.presetPromptSample2}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Action Buttons (Large min 48px touch targets) */}
      <div className="w-full flex space-x-3 mt-auto">
        <button
          onClick={onCancel}
          className="flex-1 touch-target min-h-[54px] rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-100 active:bg-gray-200 transition-all flex items-center justify-center space-x-2"
        >
          <X className="w-5 h-5" />
          <span>{t.cancel}</span>
        </button>

        <button
          onClick={handleStop}
          className="flex-[2] touch-target min-h-[54px] rounded-xl bg-health-dark hover:bg-health-primary active:bg-health-dark text-white font-bold shadow-md transition-all flex items-center justify-center space-x-2 text-lg"
        >
          <Square className="w-5 h-5 fill-current" />
          <span>{t.stopListening}</span>
        </button>
      </div>
    </div>
  );
};
