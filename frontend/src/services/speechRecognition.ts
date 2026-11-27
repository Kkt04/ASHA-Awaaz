import { LanguageCode } from '../types';

export type SpeechRecognitionErrorType =
  | 'not-allowed'
  | 'audio-capture'
  | 'no-speech'
  | 'network'
  | 'not-supported'
  | 'aborted'
  | 'language-not-supported'
  | 'unknown';

export interface RecognitionCallbacks {
  onTranscriptChange: (transcript: string, isFinal: boolean) => void;
  onSilenceTimeout?: () => void;
  onError?: (error: string, type?: SpeechRecognitionErrorType) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onSpeechDetected?: (hasSpeech: boolean) => void;
}

export class SpeechRecognitionManager {
  private recognition: any = null;
  private isListening = false;
  private isExplicitlyStopped = true;
  private currentLanguage: LanguageCode = 'hi';
  private currentCallbacks: RecognitionCallbacks | null = null;
  private baseAccumulatedText = '';
  private currentSessionFinal = '';
  private currentSessionInterim = '';
  private restartTimeout: any = null;
  private silenceTimer: any = null;

  /**
   * Check if the browser supports Web Speech Recognition
   */
  public isSupported(): boolean {
    return Boolean(
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );
  }

  /**
   * Check if running on Safari / WebKit engine
   */
  private isSafari(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }

  /**
   * Start voice recognition session for given language
   */
  public start(
    language: LanguageCode,
    callbacks: RecognitionCallbacks
  ) {
    if (!this.isSupported()) {
      callbacks.onError?.(
        'Speech recognition is not supported in this browser. Please open in Google Chrome, Microsoft Edge, or Safari.',
        'not-supported'
      );
      return;
    }

    // Stop previous instance cleanly
    this.stop(false);

    this.isExplicitlyStopped = false;
    this.currentLanguage = language;
    this.currentCallbacks = callbacks;
    this.baseAccumulatedText = '';
    this.currentSessionFinal = '';
    this.currentSessionInterim = '';

    this.spawnSession();
  }

  /**
   * Switch recognition language on the fly without losing captured text
   */
  public setLanguage(language: LanguageCode) {
    if (this.currentLanguage === language) return;
    this.currentLanguage = language;

    if (this.isListening && !this.isExplicitlyStopped) {
      // Absorb current text into base before restarting with new language
      this.baseAccumulatedText = this.getFullTranscript();
      this.currentSessionFinal = '';
      this.currentSessionInterim = '';
      
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch {}
      }
      this.spawnSession();
    }
  }

  /**
   * Spawns a fresh SpeechRecognition instance
   */
  private spawnSession() {
    if (this.isExplicitlyStopped || !this.currentCallbacks) {
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      this.recognition = recognition;

      const safari = this.isSafari();
      // Safari WebKit has known issues with continuous=true; Chrome/Edge excel at continuous
      recognition.continuous = !safari;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Map language codes to BCP-47 speech tags
      // Bhojpuri (bho) maps to Indian Hindi acoustic model (hi-IN)
      const langTag =
        this.currentLanguage === 'ta'
          ? 'ta-IN'
          : this.currentLanguage === 'en'
          ? 'en-IN'
          : 'hi-IN';

      recognition.lang = langTag;

      const callbacks = this.currentCallbacks;

      const resetSilenceTimer = () => {
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
          if (this.isListening && !this.isExplicitlyStopped) {
            callbacks?.onSilenceTimeout?.();
          }
        }, 10000);
      };

      recognition.onstart = () => {
        this.isListening = true;
        callbacks?.onStart?.();
        resetSilenceTimer();
      };

      recognition.onaudiostart = () => {
        callbacks?.onSpeechDetected?.(true);
      };

      recognition.onsoundstart = () => {
        callbacks?.onSpeechDetected?.(true);
      };

      recognition.onspeechstart = () => {
        callbacks?.onSpeechDetected?.(true);
        resetSilenceTimer();
      };

      recognition.onspeechend = () => {
        callbacks?.onSpeechDetected?.(false);
      };

      recognition.onsoundend = () => {
        callbacks?.onSpeechDetected?.(false);
      };

      recognition.onresult = (event: any) => {
        resetSilenceTimer();
        callbacks?.onSpeechDetected?.(true);

        let sessionFinal = '';
        let sessionInterim = '';

        // Iterate through all results in the current session
        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            const piece = res[0].transcript.trim();
            if (piece) {
              sessionFinal += piece + ' ';
            }
          } else {
            sessionInterim += res[0].transcript;
          }
        }

        this.currentSessionFinal = sessionFinal.trim();
        this.currentSessionInterim = sessionInterim.trim();

        const combined = this.getFullTranscript();
        callbacks?.onTranscriptChange(combined, false);
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        console.warn('Speech recognition error event:', error, event.message);

        if (error === 'no-speech') {
          callbacks?.onSpeechDetected?.(false);
          callbacks?.onSilenceTimeout?.();
          return;
        }

        if (error === 'aborted') {
          return;
        }

        if (error === 'not-allowed') {
          this.isExplicitlyStopped = true;
          callbacks?.onError?.(
            'Microphone access is blocked. Please tap the lock or camera icon in your address bar and set Microphone to "Allow".',
            'not-allowed'
          );
          return;
        }

        if (error === 'audio-capture') {
          this.isExplicitlyStopped = true;
          callbacks?.onError?.(
            'No microphone detected or microphone is in use by another app.',
            'audio-capture'
          );
          return;
        }

        if (error === 'language-not-supported') {
          console.warn(`Language ${langTag} not supported, falling back to hi-IN / en-IN`);
          try {
            recognition.lang = 'hi-IN';
            return;
          } catch {}
        }

        if (error === 'network') {
          callbacks?.onError?.(
            'Speech recognition network timeout. Spoken words captured so far are preserved.',
            'network'
          );
          return;
        }

        callbacks?.onError?.(event.message || `Speech recognition error: ${error}`, error);
      };

      recognition.onend = () => {
        this.isListening = false;
        if (this.silenceTimer) clearTimeout(this.silenceTimer);

        // Absorb final results of this session into baseAccumulatedText
        if (this.currentSessionFinal) {
          this.baseAccumulatedText = (this.baseAccumulatedText + ' ' + this.currentSessionFinal).trim();
          this.currentSessionFinal = '';
        }

        // If not explicitly stopped by the user, automatically reconnect
        // (Chrome terminates continuous speech after ~10-15s idle, Safari terminates after each utterance)
        if (!this.isExplicitlyStopped && this.currentCallbacks) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (!this.isExplicitlyStopped) {
              this.spawnSession();
            }
          }, 120);
        } else {
          const finalClean = this.getFullTranscript();
          callbacks?.onTranscriptChange(finalClean, true);
          callbacks?.onEnd?.();
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn('Recognition start exception:', err);
      if (err?.name === 'InvalidStateError') {
        if (!this.isExplicitlyStopped) {
          setTimeout(() => this.spawnSession(), 150);
        }
      } else {
        this.currentCallbacks?.onError?.(err?.message || 'Could not start microphone', 'unknown');
      }
    }
  }

  /**
   * Stop listening and finalize transcript
   */
  public stop(triggerEndCallback: boolean = true): string {
    this.isExplicitlyStopped = true;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        try {
          this.recognition.abort();
        } catch {}
      }
      this.recognition = null;
    }

    this.isListening = false;
    const finalResult = this.getFullTranscript();
    this.baseAccumulatedText = finalResult;
    this.currentSessionFinal = '';
    this.currentSessionInterim = '';

    if (triggerEndCallback && this.currentCallbacks) {
      this.currentCallbacks.onTranscriptChange(finalResult, true);
      this.currentCallbacks.onEnd?.();
    }

    return finalResult;
  }

  /**
   * Cancel and abort recording without saving
   */
  public abort() {
    this.isExplicitlyStopped = true;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
    this.isListening = false;
    this.baseAccumulatedText = '';
    this.currentSessionFinal = '';
    this.currentSessionInterim = '';
    this.currentCallbacks = null;
  }

  /**
   * Assembles full transcript combining base, final, and interim pieces
   */
  public getFullTranscript(): string {
    const parts = [
      this.baseAccumulatedText,
      this.currentSessionFinal,
      this.currentSessionInterim,
    ].filter(Boolean);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
}

export const speechRecognitionManager = new SpeechRecognitionManager();
