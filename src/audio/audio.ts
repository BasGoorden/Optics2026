/**
 * Synthesised sound effects and background music (WebAudio, no asset files).
 * Audio starts on the first user gesture, as browsers require.
 */
import { Music, TrackId } from './music';
type Wave = OscillatorType;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private muted = false;

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
  }

  /** Call from a user gesture. */
  start(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.5;
    this.sfx.connect(this.master);
    this.music = new Music(ctx, this.master);
    this.music.play(this.track);
    // Silence the game while its tab is hidden (stops background tabs from overlapping).
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  private music: Music | null = null;
  private track: TrackId = 'groove';

  /** Switch background music (works before audio has started, too). */
  setTrack(id: TrackId): void {
    this.track = id;
    this.music?.play(id);
  }

  private tone(freq: number, dur: number, opts: { type?: Wave; vol?: number; delay?: number; slide?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const o = ctx.createOscillator();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(freq * opts.slide, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(opts.vol ?? 0.3, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.sfx);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  click(): void { this.tone(900, 0.06, { type: 'square', vol: 0.06, slide: 0.6 }); }
  tick(): void { this.tone(1800, 0.025, { type: 'triangle', vol: 0.05 }); }
  place(): void {
    this.tone(320, 0.18, { type: 'triangle', vol: 0.25, slide: 0.5 });
    this.tone(1200, 0.08, { type: 'sine', vol: 0.08, delay: 0.02 });
  }
  pickup(): void { this.tone(500, 0.12, { type: 'triangle', vol: 0.15, slide: 1.6 }); }
  remove(): void { this.tone(600, 0.2, { type: 'sawtooth', vol: 0.08, slide: 0.3 }); }
  deny(): void { this.tone(140, 0.15, { type: 'square', vol: 0.08 }); }
  targetOn(): void {
    this.tone(660, 0.35, { vol: 0.2 });
    this.tone(990, 0.45, { vol: 0.15, delay: 0.07 });
  }
  targetOff(): void { this.tone(500, 0.25, { vol: 0.12, slide: 0.6 }); }
  bonus(): void {
    [1320, 1760, 2217].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.08, delay: i * 0.05 }));
  }
  hint(): void { this.tone(740, 0.3, { vol: 0.1 }); this.tone(1110, 0.3, { vol: 0.08, delay: 0.1 }); }
  talk(): void { this.tone(1400 + Math.random() * 500, 0.04, { type: 'sine', vol: 0.025 }); }
  complete(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.6, { type: 'triangle', vol: 0.18, delay: i * 0.11 }));
    this.tone(2093, 1.2, { vol: 0.06, delay: 0.45 });
  }
}

export const audio = new AudioEngine();
