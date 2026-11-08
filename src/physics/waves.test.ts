import { describe, expect, it } from 'vitest';
import { buildOpticalScene, SLM_PROGRAMS, type ElementState } from '../game/elements';
import { patternSize } from '../game/level';
import { traceScene } from './trace';

const bounds = { minX: -10, maxX: 10, minY: -10, maxY: 10 };
const run = (els: ElementState[]) => {
  const { scene, sources } = buildOpticalScene(els, bounds);
  return traceScene(scene, sources);
};
const laser = (extra: Partial<ElementState> = {}): ElementState => ({ id: 'laser', kind: 'laser', x: -8, y: 0, rotation: 0, ...extra });
const pol = (id: string, x: number, angle: number): ElementState => ({ id, kind: 'polariser', x, y: 0, rotation: 0, pol: angle });
const target: ElementState = { id: 'T', kind: 'target', x: 8, y: 0, rotation: 0, minPower: 0.01 };

describe('polarisers', () => {
  it("follow Malus's law: I = I₀·cos²θ", () => {
    for (const a of [0, 30, 45, 60, 90]) {
      const r = run([laser(), pol('P', 0, a), target]);
      expect(r.power.get('T') ?? 0).toBeCloseTo(Math.cos((a * Math.PI) / 180) ** 2, 9);
    }
  });

  it('halve unpolarised light', () => {
    const r = run([laser({ pol: null }), pol('P', 0, 70), target]);
    expect(r.power.get('T')).toBeCloseTo(0.5, 12);
  });

  it('crossed polarisers block everything, but a 45° one in between lets 1/4 through', () => {
    expect(run([laser(), pol('A', -2, 0), pol('B', 2, 90), target]).power.get('T') ?? 0).toBeCloseTo(0, 12);
    const r = run([laser(), pol('A', -2, 0), pol('M', 0, 45), pol('B', 2, 90), target]);
    expect(r.power.get('T')).toBeCloseTo(0.25, 12);
  });
});

describe('slits', () => {
  it('give the textbook pattern sizes', () => {
    // Double slit: Δy = λL/d. Single slit: central band W = 2λL/a.
    expect(patternSize({ count: 2, width: 5, sep: 20, L: 7.5 }, 532)).toBeCloseTo((532e-9 * 7.5) / 20e-6, 12);
    expect(patternSize({ count: 1, width: 10, sep: 0, L: 8 }, 650)).toBeCloseTo((2 * 650e-9 * 8) / 10e-6, 12);
  });

  it('pass the beam through their opening and record the distance to the screen', () => {
    const r = run([
      laser(),
      { id: 'S', kind: 'slits', x: -4, y: 0, rotation: 0, slitCount: 2, slitSep: 20, slitWidth: 5 },
      { id: 'scr', kind: 'screen', x: 3.5, y: 0, rotation: 0 },
    ]);
    const hit = r.screenHits[0];
    expect(hit.pattern).toMatchObject({ count: 2, sep: 20 });
    expect(hit.pattern!.L).toBeCloseTo(7.5, 9);
  });

  it('block the beam when it misses the opening', () => {
    const r = run([
      laser(),
      { id: 'S', kind: 'slits', x: -4, y: 0.5, rotation: 0 },
      { id: 'scr', kind: 'screen', x: 3.5, y: 0, rotation: 0 },
    ]);
    expect(r.screenHits).toHaveLength(0);
  });
});

describe('spatial light modulator', () => {
  const slmScene = (program: number) => run([
    { id: 'laser', kind: 'laser', x: -6, y: 0, rotation: 0 },
    // Mirror-like SLM at 45°: flat program reflects the beam straight up (+y).
    { id: 'slm', kind: 'slm', x: 0, y: 0, rotation: -45, program },
  ]);
  const angles = (r: ReturnType<typeof run>) => r.segments
    .filter((s) => Math.abs(s.from.x) < 1e-9 && Math.abs(s.from.y) < 1e-9)
    .map((s) => (Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x) * 180) / Math.PI);

  it('acts as a mirror with the flat program', () => {
    const a = angles(slmScene(0));
    expect(a).toHaveLength(1);
    expect(Math.abs(Math.abs(a[0]) - 90)).toBeLessThan(1e-6);
  });

  it('steers the beam by asin(λ/Λ) with a phase ramp (head-on), and splits it with a binary grating', () => {
    const idx = SLM_PROGRAMS.findIndex((p) => p.name.startsWith('Ramp + 3'));
    // SLM facing the laser head-on: the flat program would send the beam straight back (180°).
    const r = run([
      { id: 'laser', kind: 'laser', x: -6, y: 0, rotation: 0 },
      { id: 'slm', kind: 'slm', x: 0, y: 0, rotation: 90, program: idx },
    ]);
    const a = angles(r);
    expect(a).toHaveLength(1);
    const deflection = 180 - Math.abs(a[0]);
    expect(deflection).toBeCloseTo((Math.asin(0.532 / 3) * 180) / Math.PI, 6);
    const split = angles(slmScene(SLM_PROGRAMS.findIndex((p) => p.name.startsWith('Split ± 3'))));
    expect(split).toHaveLength(2);
  });
});
