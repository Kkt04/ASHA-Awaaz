import { LanguageCode } from '../types';

class VoiceSynthesizer {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;
  private pendingTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (this.synth) {
      this.voices = this.synth.getVoices();
    }
  }

  public speak(
    text: string,
    language: LanguageCode = 'hi',
    onEnd?: () => void,
    onError?: (err: any) => void
  ) {
    if (!this.synth) {
      console.warn('SpeechSynthesis is not supported on this device/browser.');
      if (onEnd) onEnd();
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) return;

    // Deduplication check: prevent speaking the exact same instruction twice within 1500ms
    const now = Date.now();
    if (trimmed === this.lastSpokenText && now - this.lastSpokenTime < 1500) {
      return;
    }
    this.lastSpokenText = trimmed;
    this.lastSpokenTime = now;

    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }

    // Cancel any active speech cleanly
    this.synth.cancel();

    // Small delay to let browser audio queue settle before starting new utterance
    this.pendingTimeout = setTimeout(() => {
      if (!this.synth) return;

      const utterance = new SpeechSynthesisUtterance(trimmed);
      utterance.rate = 0.95; // Clear cadence for field use
      utterance.pitch = 1.0;

      let langTag = 'hi-IN';
      if (language === 'ta') {
        langTag = 'ta-IN';
      } else if (language === 'en') {
        langTag = 'en-IN';
      }
      utterance.lang = langTag;

      // Pick best matching voice
      const matchedVoice =
        this.voices.find(
          (v) => v.lang.toLowerCase().replace('_', '-') === langTag.toLowerCase()
        ) ||
        this.voices.find((v) => v.lang.startsWith(language)) ||
        (language === 'en' ? this.voices.find((v) => v.lang.startsWith('en')) : undefined);

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onend = () => {
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        // 'interrupted' or 'canceled' are normal when user navigates or stops
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('Speech synthesis event error:', e);
        }
        if (onError) onError(e);
        if (onEnd) onEnd();
      };

      try {
        this.synth.speak(utterance);
      } catch (err) {
        console.error('Failed to trigger speech synthesis:', err);
        if (onEnd) onEnd();
      }
    }, 40);
  }

  public stop() {
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
    if (this.synth) {
      this.synth.cancel();
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }
}

export const voiceSynthesizer = new VoiceSynthesizer();
