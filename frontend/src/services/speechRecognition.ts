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
  private accumulatedFinalText = '';
  private currentInterimText = '';
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
   * Query current microphone permission state if Permission API is supported
   */
  public async checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return 'unsupported';
    }
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return result.state as 'granted' | 'denied' | 'prompt';
      }
    } catch {
      // Permission query not available for mic on this browser
    }
    return 'prompt';
  }

  /**
   * Explicitly request microphone access through getUserMedia
   * This triggers the browser prompt and surfaces permission state cleanly
   */
  public async requestMicrophoneAccess(): Promise<{ ok: boolean; error?: SpeechRecognitionErrorType; message?: string }> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return {
        ok: false,
        error: 'not-supported',
        message: 'Microphone device access is not supported by this browser.'
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      // Release tracks right away so SpeechRecognition / AudioMeter can bind cleanly
      stream.getTracks().forEach((track) => track.stop());
      return { ok: true };
    } catch (err: any) {
      const errorName = err?.name || '';
      console.warn('Microphone permission/access error:', errorName, err?.message);
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        return {
          ok: false,
          error: 'not-allowed',
          message: 'Microphone permission was denied. Please allow microphone access in your browser settings.'
        };
      }
      if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        return {
          ok: false,
          error: 'audio-capture',
          message: 'No microphone was found on this device. Please connect a microphone and try again.'
        };
      }
      return {
        ok: false,
        error: 'unknown',
        message: err?.message || 'Could not access microphone.'
      };
    }
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
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.',
        'not-supported'
      );
      return;
    }

    // Stop and cleanly tear down any previous recognition session
    this.stop(false);

    this.isExplicitlyStopped = false;
    this.currentLanguage = language;
    this.currentCallbacks = callbacks;
    this.accumulatedFinalText = '';
    this.currentInterimText = '';

    this.spawnSession();
  }

  /**
   * Spawns a fresh SpeechRecognition instance and hooks events
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

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Locale mapping:
      // Bhojpuri (bho) uses Hindi acoustic model (hi-IN)
      // Tamil -> ta-IN, English -> en-IN (Indian English), Hindi -> hi-IN
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
        // 12-second gentle silence alert (gives ASHA workers adequate time to articulate)
        this.silenceTimer = setTimeout(() => {
          if (this.isListening && !this.isExplicitlyStopped) {
            callbacks?.onSilenceTimeout?.();
          }
        }, 12000);
      };

      recognition.onstart = () => {
        this.isListening = true;
        callbacks?.onStart?.();
        resetSilenceTimer();
      };

      recognition.onspeechstart = () => {
        callbacks?.onSpeechDetected?.(true);
        resetSilenceTimer();
      };

      recognition.onspeechend = () => {
        callbacks?.onSpeechDetected?.(false);
      };

      recognition.onresult = (event: any) => {
        resetSilenceTimer();
        let sessionInterim = '';
        let sessionFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            const finalPiece = res[0].transcript.trim();
            if (finalPiece) {
              sessionFinal += finalPiece + ' ';
            }
          } else {
            sessionInterim += res[0].transcript;
          }
        }

        if (sessionFinal) {
          // Append final chunk cleanly without duplicate spaces
          this.accumulatedFinalText = (this.accumulatedFinalText + ' ' + sessionFinal).trim();
        }

        this.currentInterimText = sessionInterim;
        const combined = (this.accumulatedFinalText + (this.currentInterimText ? ' ' + this.currentInterimText : '')).trim();

        callbacks?.onTranscriptChange(combined, false);
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        console.warn('Speech recognition error event:', error, event.message);

        if (error === 'no-speech') {
          // Normal pause in speech; do not abort continuous session
          callbacks?.onSpeechDetected?.(false);
          callbacks?.onSilenceTimeout?.();
          return;
        }

        if (error === 'aborted') {
          // Expected when stopping or re-initializing
          return;
        }

        if (error === 'not-allowed') {
          this.isExplicitlyStopped = true;
          callbacks?.onError?.(
            'Microphone access denied. Please click the lock or camera icon in your address bar to allow microphone permissions.',
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
          // Fall back to en-IN or hi-IN if dialect code was refused
          console.warn(`Language ${langTag} refused, falling back to en-US / hi-IN`);
          try {
            recognition.lang = 'hi-IN';
            return;
          } catch {}
        }

        if (error === 'network') {
          callbacks?.onError?.(
            'Speech recognition network timeout. Words captured so far are saved.',
            'network'
          );
          return;
        }

        callbacks?.onError?.(event.message || `Speech recognition error: ${error}`, error);
      };

      recognition.onend = () => {
        this.isListening = false;
        if (this.silenceTimer) clearTimeout(this.silenceTimer);

        // If the session was NOT explicitly stopped by user, auto-reconnect
        // (Browser Web Speech API automatically terminates after ~10-15s idle connection)
        if (!this.isExplicitlyStopped && this.currentCallbacks) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (!this.isExplicitlyStopped) {
              this.spawnSession();
            }
          }, 150);
        } else {
          const finalClean = (this.accumulatedFinalText + ' ' + this.currentInterimText).trim();
          callbacks?.onTranscriptChange(finalClean, true);
          callbacks?.onEnd?.();
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn('Recognition start exception:', err);
      if (err?.name === 'InvalidStateError') {
        // Recognition was already starting; schedule a brief retry
        if (!this.isExplicitlyStopped) {
          setTimeout(() => this.spawnSession(), 200);
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
    const finalResult = (this.accumulatedFinalText + (this.currentInterimText ? ' ' + this.currentInterimText : '')).trim();
    this.accumulatedFinalText = finalResult;
    this.currentInterimText = '';

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
    this.accumulatedFinalText = '';
    this.currentInterimText = '';
    this.currentCallbacks = null;
  }

  /**
   * Get current transcript accumulated so far
   */
  public getTranscript(): string {
    return (this.accumulatedFinalText + (this.currentInterimText ? ' ' + this.currentInterimText : '')).trim();
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
}

export const speechRecognitionManager = new SpeechRecognitionManager();
