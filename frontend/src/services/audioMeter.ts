export class AudioMeter {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private isRunning = false;
  private animationFrameId: number | null = null;

  public async start(
    onLevelChange: (volume: number, isLoudNoise: boolean, isSpeaking: boolean) => void,
    onError?: (err: any) => void
  ): Promise<boolean> {
    try {
      this.stop();

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx || !navigator.mediaDevices?.getUserMedia) {
        return false;
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new AudioCtx();
      
      // Handle suspended audio context (browser autoplay policies)
      if (this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch {
          // Will resume upon user touch
        }
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      this.isRunning = true;
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!this.isRunning || !this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i];
          sum += val;
          if (val > peak) peak = val;
        }

        const average = sum / dataArray.length;
        // Normalize 0-100 with a natural perceptual curve
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        
        // Human speech typically registers above ~12% volume on normalized scale
        const isSpeaking = normalized > 12;
        // Loud ambient noise threshold (e.g. noisy bazaar or traffic > 78%)
        const isLoud = normalized > 78;

        onLevelChange(normalized, isLoud, isSpeaking);

        this.animationFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
      return true;
    } catch (err) {
      console.warn('AudioMeter getUserMedia error:', err);
      onError?.(err);
      return false;
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.stream = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close().catch(() => {});
      } catch {}
      this.audioContext = null;
    }
    this.analyser = null;
    this.microphone = null;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}

export const audioMeter = new AudioMeter();
