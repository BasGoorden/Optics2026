import { describe, expect, it } from 'vitest';
import type { OpticalScene } from './trace';
import { traceScene } from './trace';
import { coneDirections, trace3d, v3 } from './trace3d';
import { fromAngle, deg2rad, vec } from './vec';

const bounds = { minX: -10, maxX: 10, minY: -10, maxY: 10 };
const opts = { floor: -5, ceiling: 5 };

/** Round lens on the line x = 0, radius 2, axis +x. */
const lensScene = (f: number): OpticalScene => ({
  bounds,
  segments: [{ a: vec(0, -2), b: vec(0, 2), kind: 'lens', ownerId: 'L', normal: vec(1, 0), focal: f, disk: 2 }],
  circles: [],
});

describe('3D tracer', () => {
  it('focuses a whole cone from a point onto the image point (1/f = 1/u + 1/v)', () => {
    const f = 2;
    const u = 3;
    const v = (u * f) / (u - f); // 6
    const sources = coneDirections(0, 15, 4).map((dir) => ({ origin: v3(-u, 0, 0), dir, wavelength: 532, intensity: 1 }));
    const r = trace3d(lensScene(f), sources, opts);
    const after = r.segments.filter((s) => s.from.x === 0);
    expect(after.length).toBe(sources.length);
    for (const s of after) {
      // Point on the ray at x = v.
      const t = (v - s.from.x) / (s.to.x - s.from.x);
      const y = s.from.y + t * (s.to.y - s.from.y);
      const h = s.from.h + t * (s.to.h - s.from.h);
      expect(Math.hypot(y, h)).toBeLessThan(1e-9);
    }
  });

  it('images an off-axis point upside down with magnification −v/u, in both directions', () => {
    const sources = coneDirections(0, 10, 3).map((dir) => ({ origin: v3(-3, 0.2, 0.4), dir, wavelength: 532, intensity: 1 }));
    const r = trace3d(lensScene(2), sources, opts);
    for (const s of r.segments.filter((q) => q.from.x === 0)) {
      const t = (6 - s.from.x) / (s.to.x - s.from.x);
      expect(s.from.y + t * (s.to.y - s.from.y)).toBeCloseTo(-0.4, 9);
      expect(s.from.h + t * (s.to.h - s.from.h)).toBeCloseTo(-0.8, 9);
    }
  });

  it('lets rays outside the round lens pass straight on', () => {
    const r = trace3d(lensScene(2), [{ origin: v3(-3, 0, 1.9), dir: v3(1, 0, 0.1), wavelength: 532, intensity: 1 }], opts);
    // Hits the plane at h = 2.2 > radius 2: no bending, so a single straight segment.
    expect(r.segments).toHaveLength(1);
  });

  it('matches the 2D tracer for rays in the plane of the axis', () => {
    const scene: OpticalScene = {
      bounds,
      segments: [
        { a: vec(4.5, -0.5), b: vec(5.5, 0.5), kind: 'mirror', ownerId: 'M', normal: { x: -Math.SQRT1_2, y: Math.SQRT1_2 }, hMin: -1, hMax: 1 },
        { a: vec(4, 3), b: vec(6, 3), kind: 'interface', ownerId: 'G', normal: vec(0, -1), index: 1.5, hMin: -1, hMax: 1 },
        { a: vec(6, 3), b: vec(6, 5), kind: 'interface', ownerId: 'G', normal: vec(1, 0), index: 1.5, hMin: -1, hMax: 1 },
        { a: vec(6, 5), b: vec(4, 5), kind: 'interface', ownerId: 'G', normal: vec(0, 1), index: 1.5, hMin: -1, hMax: 1 },
        { a: vec(4, 5), b: vec(4, 3), kind: 'interface', ownerId: 'G', normal: vec(-1, 0), index: 1.5, hMin: -1, hMax: 1 },
      ],
      circles: [],
    };
    const dir2 = fromAngle(deg2rad(3));
    const r2 = traceScene(scene, [{ origin: vec(0, 0), dir: dir2, wavelength: 532, intensity: 1, ownerId: 'L' }], { fresnel: false });
    const r3 = trace3d(scene, [{ origin: v3(0, 0, 0), dir: v3(dir2.x, dir2.y, 0), wavelength: 532, intensity: 1 }], opts);
    expect(r3.segments.length).toBe(r2.segments.length);
    r2.segments.forEach((s, i) => {
      expect(r3.segments[i].to.x).toBeCloseTo(s.to.x, 9);
      expect(r3.segments[i].to.y).toBeCloseTo(s.to.y, 9);
      expect(r3.segments[i].to.h).toBeCloseTo(0, 12);
    });
  });

  it('stops rays at the table surface', () => {
    const r = trace3d({ bounds, segments: [], circles: [] }, [{ origin: v3(0, 0, 0), dir: v3(1, 0, -1), wavelength: 532, intensity: 1 }], { floor: -1 });
    expect(r.segments[0].to.h).toBeCloseTo(-1, 12);
  });
});
