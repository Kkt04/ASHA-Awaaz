import { LanguageCode } from '../types';

class VoiceSynthesizer {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private activeUtterance: SpeechSynthesisUtterance | null = null; // Prevents Chromium garbage collection bug
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;
  private pendingTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
    }
  }

  private initVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        if (this.synth) {
          this.voices = this.synth.getVoices();
        }
      };
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public isSpeaking(): boolean {
    return Boolean(this.synth && (this.synth.speaking || this.synth.pending));
  }

  public speak(
    text: string,
    language: LanguageCode = 'en',
    onEnd?: () => void,
    onError?: (err: any) => void
  ) {
    if (!this.synth) {
      console.warn('SpeechSynthesis is not supported on this browser/device.');
      if (onEnd) onEnd();
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      if (onEnd) onEnd();
      return;
    }

    // Deduplication check: prevent speaking the exact same phrase twice within 1000ms
    const now = Date.now();
    if (trimmed === this.lastSpokenText && now - this.lastSpokenTime < 1000) {
      if (onEnd) onEnd();
      return;
    }
    this.lastSpokenText = trimmed;
    this.lastSpokenTime = now;

    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }

    // Cancel any previous speech
    try {
      this.synth.cancel();
    } catch {}

    // Resume synth if stuck in paused state (well-known Chromium bug)
    try {
      if (this.synth.paused) {
        this.synth.resume();
      }
    } catch {}

    // Small delay to let audio pipeline reset
    this.pendingTimeout = setTimeout(() => {
      if (!this.synth) {
        if (onEnd) onEnd();
        return;
      }

      // Re-check voices in case they loaded asynchronously
      if (this.voices.length === 0) {
        this.voices = this.synth.getVoices();
      }

      const utterance = new SpeechSynthesisUtterance(trimmed);
      this.activeUtterance = utterance; // Pin to instance to prevent GC mid-speech

      utterance.rate = 0.95; // Clear cadence for field healthcare workers
      utterance.pitch = 1.0;

      let langTag = 'en-IN';
      if (language === 'hi' || language === 'bho') {
        langTag = 'hi-IN';
      } else if (language === 'ta') {
        langTag = 'ta-IN';
      } else {
        langTag = 'en-IN';
      }
      utterance.lang = langTag;

      // Find the best voice matching language
      const matchedVoice =
        this.voices.find(
          (v) => v.lang.toLowerCase().replace('_', '-') === langTag.toLowerCase()
        ) ||
        this.voices.find((v) => v.lang.toLowerCase().startsWith(language === 'bho' ? 'hi' : language)) ||
        (language === 'en' ? this.voices.find((v) => v.lang.startsWith('en')) : undefined);

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onend = () => {
        this.activeUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        this.activeUtterance = null;
        // 'interrupted' or 'canceled' are normal when cancelled programmatically
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('Speech synthesis notice:', e.error);
        }
        if (onError) onError(e);
        if (onEnd) onEnd();
      };

      try {
        this.synth.speak(utterance);
        // Ensure paused state is resumed immediately if browser autoplay policy paused it
        if (this.synth.paused) {
          this.synth.resume();
        }
      } catch (err) {
        console.warn('Speech synthesis call exception:', err);
        this.activeUtterance = null;
        if (onEnd) onEnd();
      }
    }, 60);
  }

  public stop() {
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
    this.activeUtterance = null;
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
  }
}

export const voiceSynthesizer = new VoiceSynthesizer();
