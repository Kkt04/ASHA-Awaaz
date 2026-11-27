import { LanguageCode } from '../types';

export interface RecognitionCallbacks {
  onTranscriptChange: (transcript: string, isFinal: boolean) => void;
  onAudioStart?: () => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onAudioEnd?: () => void;
  onSilenceTimeout?: () => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export class SpeechRecognitionManager {
  private recognition: any = null;
  private isListening = false;
  private silenceTimer: any = null;
  private currentLanguage: LanguageCode = 'hi';
  private fullTranscript = '';
  private currentCallbacks: RecognitionCallbacks | null = null;
  private restartTimeout: any = null;

  public isSupported(): boolean {
    return Boolean(
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public static async requestMicrophonePermission(): Promise<{ granted: boolean; error?: string }> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return { granted: false, error: 'mediaDevices_unavailable' };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release test stream tracks immediately
      stream.getTracks().forEach((track) => {
        try { track.stop(); } catch {}
      });
      return { granted: true };
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        return { granted: false, error: 'not-allowed' };
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return { granted: false, error: 'no-device' };
      }
      return { granted: false, error: name || 'permission_error' };
    }
  }

  private cleanPreviousInstance() {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.recognition) {
      // Nullify all listeners so old asynchronous events never clash with the new session
      this.recognition.onstart = null;
      this.recognition.onaudiostart = null;
      this.recognition.onspeechstart = null;
      this.recognition.onspeechend = null;
      this.recognition.onaudioend = null;
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;

      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
  }

  public start(
    language: LanguageCode,
    callbacks: RecognitionCallbacks
  ) {
    if (!this.isSupported()) {
      callbacks.onError?.('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    // Clean up any previous recognition instance thoroughly
    this.cleanPreviousInstance();

    this.isListening = true;
    this.currentLanguage = language;
    this.currentCallbacks = callbacks;
    this.fullTranscript = '';

    const langCode =
      language === 'ta' ? 'ta-IN' : language === 'en' ? 'en-IN' : 'hi-IN';

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = langCode;
    } catch (e: any) {
      this.isListening = false;
      callbacks.onError?.(e?.message || 'Could not initialize speech recognition');
      return;
    }

    const resetSilenceTimer = () => {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        if (this.isListening && this.fullTranscript.trim().length === 0) {
          callbacks.onSilenceTimeout?.();
        }
      }, 10000);
    };

    // 1. Session started
    this.recognition.onstart = () => {
      this.isListening = true;
      callbacks.onStart?.();
      resetSilenceTimer();
    };

    // 2. Audio capturing has physically begun (Hardware microphone is live)
    this.recognition.onaudiostart = () => {
      callbacks.onAudioStart?.();
    };

    // 3. User started speaking (Human speech detected in audio stream)
    this.recognition.onspeechstart = () => {
      callbacks.onSpeechStart?.();
      resetSilenceTimer();
    };

    // 4. User stopped speaking
    this.recognition.onspeechend = () => {
      callbacks.onSpeechEnd?.();
    };

    // 5. Audio capturing ended
    this.recognition.onaudioend = () => {
      callbacks.onAudioEnd?.();
    };

    // 6. Speech transcribed into text
    this.recognition.onresult = (event: any) => {
      resetSilenceTimer();

      let finalTrans = '';
      let interimTrans = '';

      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTrans += item[0].transcript + ' ';
        } else {
          interimTrans += item[0].transcript;
        }
      }

      this.fullTranscript = finalTrans;
      const combined = (finalTrans + interimTrans).trim();

      callbacks.onTranscriptChange(
        combined,
        interimTrans.length === 0 && finalTrans.length > 0
      );
    };

    // 7. Error handling
    this.recognition.onerror = (event: any) => {
      console.warn('Speech recognition event notice:', event.error);
      const err = event.error;

      if (err === 'no-speech') {
        callbacks.onSilenceTimeout?.();
        return;
      }
      if (err === 'aborted') {
        return;
      }

      // Fatal errors: stop listening immediately to avoid infinite restart loop
      if (
        err === 'not-allowed' ||
        err === 'service-not-allowed' ||
        err === 'audio-capture'
      ) {
        this.isListening = false;
        if (this.restartTimeout) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = null;
        }
      }

      callbacks.onError?.(err);
    };

    // 8. Session end
    this.recognition.onend = () => {
      if (this.isListening && this.currentCallbacks) {
        // If we are supposed to be listening (e.g. continuous mode paused between sentences), restart cleanly
        if (this.restartTimeout) clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (this.isListening && this.recognition) {
            try {
              this.recognition.start();
            } catch (err) {
              console.warn('Recognition auto-resume notice:', err);
            }
          }
        }, 150);
      } else {
        this.isListening = false;
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        callbacks.onTranscriptChange(this.fullTranscript.trim(), true);
        callbacks.onEnd?.();
      }
    };

    try {
      this.recognition.start();
    } catch (e: any) {
      console.warn('Recognition start exception:', e);
      if (e.name === 'InvalidStateError') {
        // Already started or busy, retry after short delay
        setTimeout(() => {
          if (this.isListening && this.recognition) {
            try { this.recognition.start(); } catch {}
          }
        }, 200);
      } else {
        this.isListening = false;
        callbacks.onError?.(e?.message || 'Could not start microphone');
      }
    }
  }

  public stop() {
    this.isListening = false;
    this.currentCallbacks = null;
    this.cleanPreviousInstance();
  }
}

export const speechRecognitionManager = new SpeechRecognitionManager();
