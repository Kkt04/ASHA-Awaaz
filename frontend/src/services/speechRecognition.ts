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

  constructor() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
    }
  }

  public isSupported(): boolean {
    return Boolean(
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );
  }

  public start(
    language: LanguageCode,
    callbacks: RecognitionCallbacks
  ) {
    if (!this.recognition) {
      callbacks.onError?.('Speech recognition is not supported in this browser.');
      return;
    }

    this.currentLanguage = language;
    const langCode = language === 'ta' ? 'ta-IN' : language === 'en' ? 'en-IN' : 'hi-IN';
    this.recognition.lang = langCode;

    let fullTranscript = '';

    const resetSilenceTimer = () => {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      // If 6 seconds of no speech detected
      this.silenceTimer = setTimeout(() => {
        if (this.isListening && fullTranscript.trim().length === 0) {
          callbacks.onSilenceTimeout?.();
        }
      }, 6000);
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
          fullTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      callbacks.onTranscriptChange(
        (fullTranscript + interim).trim(),
        false
      );
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Speech recognition error event:', event.error);
      if (event.error === 'no-speech') {
        callbacks.onSilenceTimeout?.();
      } else {
        callbacks.onError?.(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      callbacks.onTranscriptChange(fullTranscript.trim(), true);
      callbacks.onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (e: any) {
      console.warn('Recognition start exception:', e);
      if (e.name !== 'InvalidStateError') {
        callbacks.onError?.(e.message || 'Could not start microphone');
      }
    }
  }

  public stop() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('Recognition stop error:', err);
      }
    }
    this.isListening = false;
  }
}

export const speechRecognitionManager = new SpeechRecognitionManager();
