export class AudioService {
  private static instance: AudioService;
  private isMuted: boolean = false;
  private sounds: Record<string, HTMLAudioElement> = {};

  private constructor() {
    this.isMuted = localStorage.getItem('scriptia_muted') === 'true';
    // We will use synthesized short beeps using Web Audio API to avoid missing files!
  }

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('scriptia_muted', this.isMuted ? 'true' : 'false');
  }

  public getMuted() {
    return this.isMuted;
  }

  private playTone(frequency: number, type: OscillatorType, duration: number, vol: number = 0.1) {
    if (this.isMuted) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // ignore
    }
  }

  public playSummon() { this.playTone(440, 'sine', 0.5, 0.2); }
  public playAttack() { this.playTone(150, 'sawtooth', 0.2, 0.3); }
  public playGuard() { this.playTone(600, 'square', 0.3, 0.2); }
  public playDamage() { this.playTone(100, 'square', 0.5, 0.5); }
  public playDestroy() { this.playTone(50, 'sawtooth', 0.6, 0.6); }
  public playSpell() { this.playTone(800, 'sine', 0.4, 0.2); }
  public playEvolve() { this.playTone(880, 'sine', 0.8, 0.3); }
}

export const audioService = AudioService.getInstance();
