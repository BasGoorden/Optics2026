import { describe, expect, it } from 'vitest';
import { BANDS, WHITE, receiverLit } from './colour';
import { indexAt } from './optics';
import { OpticalScene, traceScene } from './trace';
import { trace3d, v3 } from './trace3d';
import { vec } from './vec';

const bounds = { minX: -10, maxX: 10, minY: -10, maxY: 10 };
const white = (x: number, y: number) =>
  WHITE.map((wl) => ({ origin: vec(x, y), dir: vec(1, 0), wavelength: wl, intensity: 1 / WHITE.length, ownerId: 'L' }));

describe('colour', () => {
  it('a filter passes only its band', () => {
    const scene: OpticalScene = {
      bounds,
      segments: [{ a: vec(0, -1), b: vec(0, 1), kind: 'filter', ownerId: 'F', normal: vec(1, 0), band: BANDS.green }],
      circles: [{ c: vec(5, 0), r: 0.3, kind: 'target', ownerId: 'T', minPower: 0.01 }],
    };
    const r = traceScene(scene, white(-5, 0));
    const perWl = r.powerByWl.get('T')!;
    expect([...perWl.keys()]).toEqual([530]);
    expect(perWl.get(530)).toBeCloseTo(1 / 6, 12);
  });

  it('a dichroic mirror reflects its band and transmits the rest', () => {
    const scene: OpticalScene = {
      bounds,
      segments: [{ a: vec(-0.5, -0.5), b: vec(0.5, 0.5), kind: 'dichroic', ownerId: 'D', normal: vec(-Math.SQRT1_2, Math.SQRT1_2), band: BANDS.green }],
      circles: [
        { c: vec(0, 5), r: 0.3, kind: 'target', ownerId: 'up', minPower: 0.01 },
        { c: vec(5, 0), r: 0.3, kind: 'target', ownerId: 'on', minPower: 0.01 },
      ],
    };
    const r = traceScene(scene, white(-5, 0));
    expect([...r.powerByWl.get('up')!.keys()]).toEqual([530]);
    expect(r.powerByWl.get('on')!.has(530)).toBe(false);
    expect(r.powerByWl.get('on')!.size).toBe(5);
  });

  it('a grating sends first orders to d·sin θ = m·λ', () => {
    const d = 2; // µm
    const scene: OpticalScene = {
      bounds,
      segments: [{ a: vec(0, -1), b: vec(0, 1), kind: 'grating', ownerId: 'G', normal: vec(1, 0), period: d }],
      circles: [],
    };
    for (const wl of [450, 650]) {
      const r = traceScene(scene, [{ origin: vec(-5, 0), dir: vec(1, 0), wavelength: wl, intensity: 1, ownerId: 'L' }]);
      const out = r.segments.filter((s) => s.from.x === 0);
      const sines = out.map((s) => (s.to.y - s.from.y) / Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y)).sort((a, b) => a - b);
      // Orders −2, −1, 0, 1, 2
      expect(sines).toHaveLength(5);
      sines.forEach((sn, i) => expect(sn).toBeCloseTo(((i - 2) * wl) / 1000 / d, 9));
      expect(out.reduce((s, q) => s + q.intensity, 0)).toBeCloseTo(1, 12);
    }
  });

  it('the 3D grating matches the 2D one in the plane', () => {
    const scene: OpticalScene = {
      bounds,
      segments: [{ a: vec(0, -1), b: vec(0, 1), kind: 'grating', ownerId: 'G', normal: vec(1, 0), period: 2, hMin: -1, hMax: 1 }],
      circles: [],
    };
    const r3 = trace3d(scene, [{ origin: v3(-5, 0, 0), dir: v3(1, 0, 0), wavelength: 650, intensity: 1 }], { floor: -5 });
    const sines = r3.segments.filter((s) => s.from.x === 0)
      .map((s) => (s.to.y - s.from.y) / Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y, s.to.h - s.from.h)).sort((a, b) => a - b);
    sines.forEach((sn, i) => expect(sn).toBeCloseTo(((i - 2) * 650) / 1000 / 2, 9));
  });

  it('dense flint glass bends blue more than red (dispersion)', () => {
    const flint = { A: 1.62, B: 0.02 };
    expect(indexAt(flint, 450)).toBeGreaterThan(indexAt(flint, 650) + 0.03);
  });

  it('colour receivers need their bands and reject forbidden light', () => {
    const per = new Map([[530, 0.2], [650, 0.2]]);
    expect(receiverLit({ needs: [{ band: BANDS.green, min: 0.1 }, { band: BANDS.red, min: 0.1 }] }, per, 0.1)).toBe(true);
    expect(receiverLit({ needs: [{ band: BANDS.green, min: 0.1 }], forbid: [BANDS.red] }, per, 0.1)).toBe(false);
    expect(receiverLit({ needs: [{ band: BANDS.blue, min: 0.1 }] }, per, 0.1)).toBe(false);
  });
});
