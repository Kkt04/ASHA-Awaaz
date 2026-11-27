import { LanguageCode } from '../types';

export interface RecognitionCallbacks {
  onTranscriptChange: (transcript: string, isFinal: boolean) => void;
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

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): boolean {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return false;

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      return true;
    } catch (e) {
      console.warn('SpeechRecognition constructor error:', e);
      return false;
    }
  }

  public isSupported(): boolean {
    return Boolean(
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );
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

  public start(
    language: LanguageCode,
    callbacks: RecognitionCallbacks
  ) {
    if (!this.isSupported()) {
      callbacks.onError?.('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    // Clean up any lingering recognition before starting fresh
    this.stop();

    this.currentLanguage = language;
    this.currentCallbacks = callbacks;
    this.fullTranscript = '';

    const langCode =
      language === 'ta' ? 'ta-IN' : language === 'en' ? 'en-IN' : 'hi-IN';

    // Re-instantiate to avoid InvalidStateError in Chrome/WebKit
    this.initRecognition();

    if (!this.recognition) {
      callbacks.onError?.('Could not initialize speech recognition.');
      return;
    }

    this.recognition.lang = langCode;

    const resetSilenceTimer = () => {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      // 8 seconds of no speech detected
      this.silenceTimer = setTimeout(() => {
        if (this.isListening && this.fullTranscript.trim().length === 0) {
          callbacks.onSilenceTimeout?.();
        }
      }, 8000);
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      callbacks.onStart?.();
      resetSilenceTimer();
    };

    this.recognition.onresult = (event: any) => {
      resetSilenceTimer();
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          this.fullTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      callbacks.onTranscriptChange(
        (this.fullTranscript + interim).trim(),
        false
      );
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Speech recognition error event:', event.error);
      if (event.error === 'no-speech') {
        callbacks.onSilenceTimeout?.();
        return;
      }
      if (event.error === 'aborted') {
        // Normal when stopped programmatically
        return;
      }

      // Fatal errors: stop listening so onend does not loop endlessly
      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed' ||
        event.error === 'audio-capture'
      ) {
        this.isListening = false;
        if (this.restartTimeout) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = null;
        }
      }

      callbacks.onError?.(event.error);
    };

    this.recognition.onend = () => {
      // If recognition stopped unexpectedly while we were intentionally listening, auto-restart with a safety throttle
      if (this.isListening && this.currentCallbacks) {
        if (this.restartTimeout) clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (this.isListening && this.recognition) {
            try {
              this.recognition.start();
            } catch (err) {
              console.warn('Auto-restart recognition notice:', err);
            }
          }
        }, 200);
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
        // If already started, stop and retry once
        try {
          this.recognition.stop();
          setTimeout(() => {
            try {
              this.recognition.start();
            } catch {}
          }, 100);
        } catch {}
      } else {
        callbacks.onError?.(e.message || 'Could not start microphone');
      }
    }
  }

  public stop() {
    this.isListening = false;
    this.currentCallbacks = null;

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
      } catch (err) {
        try {
          this.recognition.abort();
        } catch {}
      }
    }
  }
}

export const speechRecognitionManager = new SpeechRecognitionManager();
