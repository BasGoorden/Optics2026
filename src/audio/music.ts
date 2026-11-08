/**
 * Generative background music. Each track has a chord progression, a groove and a melody
 * generator, so phrases vary while staying in key.
 * A look-ahead scheduler plays 16th-note steps on the WebAudio clock.
 */
export type TrackId = 'groove' | 'dream' | 'chip' | 'off';

export const TRACKS: { id: TrackId; name: string }[] = [
  { id: 'groove', name: 'Lab Groove' },
  { id: 'dream', name: 'Starlight' },
  { id: 'chip', name: 'Photon Pop' },
  { id: 'off', name: 'Music off' },
];

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

interface Style {
  bpm: number;
  root: number; // MIDI note of the key
  /** Chords as scale degrees (0 = I), with seventh flag. */
  progression: { deg: number; seventh?: boolean }[];
  /** Plays one 16th step. `bar`, `step` (0–15), `chord` = MIDI notes, `t` = start time. */
  play(m: Music, bar: number, step: number, chord: number[], t: number): void;
  swing?: number;
}

/** MIDI notes of the chord on scale degree `deg` (triad or seventh) in the given key. */
function chordNotes(root: number, deg: number, seventh = false): number[] {
  const idx = [0, 2, 4, ...(seventh ? [6] : [])];
  return idx.map((i) => {
    const k = deg + i;
    return root + MAJOR[k % 7] + 12 * Math.floor(k / 7);
  });
}

/** Note in the key: scale degree index (can be negative / > 7). */
function scaleNote(root: number, idx: number): number {
  const o = Math.floor(idx / 7);
  return root + MAJOR[((idx % 7) + 7) % 7] + 12 * o;
}

/** A melody motif: 16 slots, each null (rest) or a scale step relative to the chord root. */
type Motif = (number | null)[];

function makeMotif(rand: () => number, density: number): Motif {
  const m: Motif = new Array<number | null>(16).fill(null);
  let step = [0, 2, 4][Math.floor(rand() * 3)];
  for (let i = 0; i < 16; i += 2) {
    const strong = i % 4 === 0;
    if (rand() < (strong ? density + 0.25 : density)) {
      m[i] = step;
      // Mostly stepwise motion, sometimes a leap, staying near chord tones.
      const r = rand();
      step += r < 0.35 ? 1 : r < 0.7 ? -1 : r < 0.85 ? 2 : -2;
      step = Math.max(-2, Math.min(7, step));
    }
    if (rand() < density * 0.25) m[i + 1] = step;
  }
  if (!m.some((x) => x !== null)) m[0] = 0;
  return m;
}

function vary(m: Motif, rand: () => number): Motif {
  const v = [...m];
  const i = Math.floor(rand() * 8) * 2;
  v[i] = v[i] === null ? Math.floor(rand() * 5) : rand() < 0.5 ? null : (v[i] as number) + (rand() < 0.5 ? 1 : -1);
  return v;
}

export class Music {
  ctx: AudioContext;
  out: GainNode;
  private noise: AudioBuffer;
  private timer: number | null = null;
  private nextTime = 0;
  private stepIndex = 0;
  private style: Style | null = null;
  private motifs: Motif[] = [];
  private rand = Math.random;

  constructor(ctx: AudioContext, dest: AudioNode) {
    this.ctx = ctx;
    this.dest = dest;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  private dest: AudioNode;

  play(id: TrackId): void {
    this.stop();
    if (id === 'off') return;
    // Each track gets its own output bus, so the old track's notes can be faded out separately.
    this.out = this.ctx.createGain();
    this.out.connect(this.dest);
    this.style = STYLES[id];
    this.motifs = [];
    this.stepIndex = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.out.gain.setValueAtTime(0, this.ctx.currentTime);
    this.out.gain.linearRampToValueAtTime(0.16, this.ctx.currentTime + 1.5);
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  /** Stop scheduling and quickly fade out everything already playing (including long pad tails). */
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.style = null;
    const old = this.out;
    const now = this.ctx.currentTime;
    old.gain.cancelScheduledValues(now);
    old.gain.setValueAtTime(old.gain.value, now);
    old.gain.linearRampToValueAtTime(0, now + 0.15);
    window.setTimeout(() => old.disconnect(), 400);
  }

  private schedule(): void {
    const s = this.style;
    if (!s) return;
    const sixteenth = 60 / s.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const step = this.stepIndex % 16;
      const bar = Math.floor(this.stepIndex / 16);
      const c = s.progression[bar % s.progression.length];
      const chord = chordNotes(s.root, c.deg, c.seventh);
      const swing = s.swing && step % 2 === 1 ? sixteenth * s.swing : 0;
      s.play(this, bar, step, chord, this.nextTime + swing);
      this.nextTime += sixteenth;
      this.stepIndex++;
    }
  }

  /** Melody note for this bar/step: motifs are regenerated every 8 bars, in an A A' B A' form. */
  melody(bar: number, step: number, chord: number[], density: number, octave = 12): number | null {
    const phrase = Math.floor(bar / 8);
    if (!this.motifs[phrase]) {
      const a = makeMotif(this.rand, density);
      const b = makeMotif(this.rand, density);
      this.motifs[phrase] = a;
      this.motifs[phrase + 0.5] = b;
    }
    const a = this.motifs[phrase];
    const b = this.motifs[phrase + 0.5];
    const part = Math.floor((bar % 8) / 2); // 0..3
    const motif = part === 2 ? b : part === 3 || part === 1 ? vary(a, () => ((bar * 7 + step) % 10) / 10) : a;
    const v = motif[step];
    if (v === null || v === undefined) return null;
    // Map relative scale step onto the key, starting from the chord root.
    const style = this.style!;
    const rootIdx = MAJOR.indexOf((((chord[0] - style.root) % 12) + 12) % 12);
    return scaleNote(style.root, rootIdx + v) + octave;
  }

  // ---------- Instruments ----------

  tone(midi: number, t: number, dur: number, o: { type?: OscillatorType; vol?: number; attack?: number; cutoff?: number; detune?: number } = {}): void {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.cutoff ?? 4000;
    const vol = o.vol ?? 0.3;
    const a = o.attack ?? 0.005;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + 0.02));
    f.connect(g).connect(this.out);
    for (const det of o.detune ? [-o.detune, o.detune] : [0]) {
      const osc = ctx.createOscillator();
      osc.type = o.type ?? 'triangle';
      osc.frequency.value = mtof(midi);
      osc.detune.value = det;
      osc.connect(f);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }

  kick(t: number, vol = 0.8): void {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.3);
  }

  noiseHit(t: number, dur: number, freq: number, type: BiquadFilterType, vol: number): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
}

const STYLES: Record<Exclude<TrackId, 'off'>, Style> = {
  // Upbeat synth-pop: I–V–vi–IV with arpeggios, bass and a light beat.
  groove: {
    bpm: 108,
    root: 60,
    swing: 0.12,
    progression: [{ deg: 0 }, { deg: 4 }, { deg: 5 }, { deg: 3 }, { deg: 0 }, { deg: 4 }, { deg: 3 }, { deg: 4 }],
    play(m, bar, step, chord, t) {
      const beat = 60 / 108;
      if (step % 4 === 0) m.kick(t, 0.5);
      if (step === 4 || step === 12) m.noiseHit(t, 0.12, 1800, 'bandpass', 0.18);
      if (step % 2 === 1) m.noiseHit(t, 0.04, 8000, 'highpass', 0.06);
      // Bass: root on 1, octave bounce.
      if ([0, 6, 8, 11, 14].includes(step)) m.tone(chord[0] - 24 + (step === 6 || step === 14 ? 12 : 0), t, beat * 0.4, { type: 'triangle', vol: 0.45, cutoff: 900 });
      // Arpeggio.
      if (step % 2 === 0) {
        const arp = [0, 1, 2, 1, 2, 0, 1, 2];
        m.tone(chord[arp[(step / 2) % 8]] + 12, t, beat * 0.3, { type: 'square', vol: 0.06, cutoff: 2200 });
      }
      // Melody (after an 4-bar intro).
      if (bar >= 4) {
        const n = m.melody(bar, step, chord, 0.45, 12);
        if (n !== null) m.tone(n, t, beat * 0.45, { type: 'triangle', vol: 0.2, cutoff: 3500 });
      }
    },
  },
  // Dreamy: slow maj7 pads with a bell melody, no drums.
  dream: {
    bpm: 72,
    root: 62,
    progression: [{ deg: 0, seventh: true }, { deg: 5, seventh: true }, { deg: 3, seventh: true }, { deg: 4 }],
    play(m, bar, step, chord, t) {
      const beat = 60 / 72;
      if (step === 0) {
        for (const n of chord) m.tone(n, t, beat * 4.2, { type: 'sawtooth', vol: 0.05, attack: 1.2, cutoff: 900, detune: 8 });
        m.tone(chord[0] - 24, t, beat * 4, { type: 'sine', vol: 0.3, attack: 0.3 });
      }
      // Gentle broken-chord ripple.
      if (step % 4 === 2) m.tone(chord[(step / 4 + bar) % chord.length | 0] + 12, t, beat * 1.5, { type: 'sine', vol: 0.07 });
      const n = m.melody(bar, step, chord, 0.3, 12);
      if (n !== null && step % 2 === 0) {
        m.tone(n, t, beat * 1.6, { type: 'sine', vol: 0.16 });
        m.tone(n + 12, t, beat * 0.8, { type: 'sine', vol: 0.03 }); // bell shimmer
      }
    },
  },
  // Bouncy chiptune: fast square arps, pulse bass, noise hats.
  chip: {
    bpm: 132,
    root: 65,
    progression: [{ deg: 0 }, { deg: 5 }, { deg: 1 }, { deg: 4 }],
    play(m, bar, step, chord, t) {
      const beat = 60 / 132;
      if (step % 4 === 0) m.kick(t, 0.45);
      if (step % 4 === 2) m.noiseHit(t, 0.03, 9000, 'highpass', 0.07);
      if (step === 4 || step === 12) m.noiseHit(t, 0.08, 3000, 'bandpass', 0.15);
      if (step % 2 === 0) m.tone(chord[0] - 24 + (step % 4 === 2 ? 12 : 0), t, beat * 0.25, { type: 'square', vol: 0.12, cutoff: 1200 });
      m.tone(chord[step % 3] + 12, t, beat * 0.12, { type: 'square', vol: 0.035, cutoff: 3000 });
      const n = m.melody(bar, step, chord, 0.55, 12);
      if (n !== null) m.tone(n + (bar % 8 >= 4 ? 12 : 0), t, beat * 0.35, { type: 'square', vol: 0.09, cutoff: 3500 });
    },
  },
};
