import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Mic, 
  Volume2, 
  RotateCcw, 
  Edit3, 
  Save, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { StructuredVisitData, LanguageCode, RiskEvaluation } from '../types';
import { getTranslation } from '../utils/translations';
import { voiceSynthesizer } from '../services/speechSynthesis';
import { speechRecognitionManager } from '../services/speechRecognition';
import { extractVisitVoice } from '../services/api';

interface VoiceConfirmationProps {
  data: StructuredVisitData;
  summaryText: string;
  language: LanguageCode;
  onConfirm: () => void;
  onCorrectionMade: (updatedData: StructuredVisitData, newSummary: string) => void;
}

export const VoiceConfirmation: React.FC<VoiceConfirmationProps> = ({
  data,
  summaryText,
  language,
  onConfirm,
  onCorrectionMade,
}) => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(true);
  const [isListeningForCorrection, setIsListeningForCorrection] = useState<boolean>(false);
  const [spokenReply, setSpokenReply] = useState<string>('');
  const [isProcessingCorrection, setIsProcessingCorrection] = useState<boolean>(false);
  const [promptCount, setPromptCount] = useState<number>(0);
  const t = getTranslation(language);

  useEffect(() => {
    // Read aloud the summary text
    readSummaryAloud();
    return () => {
      voiceSynthesizer.stop();
      speechRecognitionManager.stop();
    };
  }, [summaryText]);

  const readSummaryAloud = () => {
    setIsSpeaking(true);
    voiceSynthesizer.speak(summaryText, language, () => {
      setIsSpeaking(false);
      // Automatically listen for "Haan" or correction
      startListeningForReply();
    });
  };

  const startListeningForReply = () => {
    if (!speechRecognitionManager.isSupported()) return;
    setIsListeningForCorrection(true);

    speechRecognitionManager.start(language, {
      onTranscriptChange: (text, isFinal) => {
        setSpokenReply(text);
        const lower = text.toLowerCase().trim();

        // Check if user confirmed with "haan", "ha", "sahi hai", "theek hai", "yes", "ஆம்", "சரி"
        if (
          lower === 'haan' ||
          lower.startsWith('haan') ||
          lower.startsWith('ha ') ||
          lower === 'sahi hai' ||
          lower === 'theek hai' ||
          lower === 'yes' ||
          lower === 'ஆம்' ||
          lower === 'சரி'
        ) {
          speechRecognitionManager.stop();
          setIsListeningForCorrection(false);
          onConfirm();
          return;
        }

        // If user said "Nahi..." or a correction phrase and finished speaking
        if (isFinal && lower.length > 2) {
          handleVoiceCorrection(text);
        }
      },
      onSilenceTimeout: () => {
        setIsListeningForCorrection(false);
      },
      onError: () => {
        setIsListeningForCorrection(false);
      },
    });
  };

  const handleVoiceCorrection = async (correctionTranscript: string) => {
    setIsProcessingCorrection(true);
    speechRecognitionManager.stop();

    try {
      // Re-extract passing the existing data to preserve unchanged fields
      const res = await extractVisitVoice(correctionTranscript, language, data);
      onCorrectionMade(
        res.extracted,
        language === 'ta' ? res.summaryTa : res.summaryHi
      );
    } catch (e) {
      console.warn('Voice correction error:', e);
    } finally {
      setIsProcessingCorrection(false);
      setSpokenReply('');
    }
  };

  const handleQuickBpCorrection = (systolic: number, diastolic: number) => {
    const updated: StructuredVisitData = JSON.parse(JSON.stringify(data));
    if (!updated.vitals) updated.vitals = {};
    updated.vitals.blood_pressure = { systolic, diastolic };
    onCorrectionMade(
      updated,
      `${data.patient_name || 'मरीज़'}, बीपी ${systolic} बाई ${diastolic} अपडेट किया गया। क्या यह सही है?`
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-health-mintborder p-5 text-center space-y-4">
      {/* Voice Status Pill */}
      <div className="flex items-center justify-center space-x-2">
        {isSpeaking ? (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-xs font-bold animate-pulse">
            <Volume2 className="w-4 h-4 text-emerald-700" />
            <span>रिकॉर्ड सुनाया जा रहा है...</span>
          </div>
        ) : isListeningForCorrection ? (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-red-100 text-red-900 rounded-full text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            <span>पुष्टि के लिए "हाँ" बोलिए (या गलती सुधारें)</span>
          </div>
        ) : (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
            <span>नीचे दिए गए बटन से पुष्टि करें</span>
          </div>
        )}
      </div>

      {/* Spoken Text Banner */}
      <div className="bg-surface-warm p-4 rounded-xl border border-gray-200 text-left">
        <p className="text-sm font-semibold text-gray-800 leading-relaxed italic">
          "{summaryText}"
        </p>
      </div>

      {/* Live detected speech during confirmation */}
      {spokenReply && (
        <div className="text-xs font-medium text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
          सुना गया: "{spokenReply}"
        </div>
      )}

      {/* Re-play audio button */}
      <button
        onClick={readSummaryAloud}
        disabled={isSpeaking}
        className="text-xs text-health-primary font-bold hover:underline flex items-center justify-center mx-auto space-x-1 touch-target"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>फिर से सुनें (Re-play)</span>
      </button>

      {/* Main Action Buttons (min 48px touch targets) */}
      <div className="space-y-3 pt-2">
        <button
          onClick={onConfirm}
          className="w-full touch-target min-h-[56px] bg-health-dark hover:bg-health-primary active:scale-[0.98] transition-all text-white font-extrabold rounded-2xl shadow-elevated flex items-center justify-center space-x-2 text-lg"
        >
          <Check className="w-6 h-6 stroke-[3]" />
          <span>{t.confirmYes}</span>
        </button>

        {/* Voice Correction trigger */}
        <button
          onClick={() => {
            if (isListeningForCorrection) {
              speechRecognitionManager.stop();
              setIsListeningForCorrection(false);
            } else {
              startListeningForReply();
            }
          }}
          className="w-full touch-target min-h-[48px] bg-surface-warm hover:bg-surface-muted text-gray-800 font-bold rounded-xl border border-gray-300 flex items-center justify-center space-x-2 text-sm"
        >
          <Mic className="w-4 h-4 text-health-primary" />
          <span>बोलकर सुधारें ("Nahi, BP 140 by 90 hai")</span>
        </button>
      </div>

      {/* Rapid Fallback / Correction Chips */}
      <div className="pt-2 text-left border-t border-gray-100">
        <div className="text-[11px] font-bold text-gray-500 uppercase mb-2">
          त्वरित सुधार (Quick tap):
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleQuickBpCorrection(140, 90)}
            className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg border border-gray-300 touch-target"
          >
            BP 140/90
          </button>
          <button
            onClick={() => handleQuickBpCorrection(120, 80)}
            className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg border border-gray-300 touch-target"
          >
            BP 120/80
          </button>
          <button
            onClick={() => handleQuickBpCorrection(150, 100)}
            className="px-2.5 py-1 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-900 rounded-lg border border-red-300 touch-target"
          >
            BP 150/100 (खतरा)
          </button>
        </div>
      </div>
    </div>
  );
};
