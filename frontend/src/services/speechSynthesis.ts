import { LanguageCode } from '../types';

class VoiceSynthesizer {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];

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

    this.synth.cancel(); // Stop any pending speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower, clear cadence for rural workers
    utterance.pitch = 1.0;

    const langTag = language === 'ta' ? 'ta-IN' : 'hi-IN';
    utterance.lang = langTag;

    // Pick best matching voice
    const matchedVoice = this.voices.find(
      (v) => v.lang.toLowerCase().replace('_', '-') === langTag.toLowerCase()
    ) || this.voices.find(v => v.lang.startsWith(language));

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis event error:', e);
      if (onError) onError(e);
      if (onEnd) onEnd();
    };

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.error('Failed to trigger speech synthesis:', err);
      if (onEnd) onEnd();
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }
}

export const voiceSynthesizer = new VoiceSynthesizer();
