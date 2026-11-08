import { describe, expect, it } from 'vitest';
import { criticalAngle, fresnelReflectance, indexAt, reflect, refract, snellAngle } from './optics';
import { OpticalScene, traceScene } from './trace';
import { deg2rad, fromAngle, normalize, rad2deg, vec } from './vec';

const close = (a: number, b: number, eps = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('optics laws', () => {
  it('reflects about the normal', () => {
    const r = reflect(normalize(vec(1, -1)), vec(0, 1));
    close(r.x, Math.SQRT1_2);
    close(r.y, Math.SQRT1_2);
  });

  it('obeys Snell\'s law', () => {
    const theta1 = deg2rad(45);
    const d = vec(Math.sin(theta1), -Math.cos(theta1)); // going down into a surface with normal +y
    const t = refract(d, vec(0, 1), 1, 1.5)!;
    const theta2 = Math.asin(t.x);
    close(1 * Math.sin(theta1), 1.5 * Math.sin(theta2));
    close(Math.hypot(t.x, t.y), 1);
    close(theta2, snellAngle(theta1, 1, 1.5)!);
  });

  it('returns null beyond the critical angle', () => {
    close(rad2deg(criticalAngle(1.5, 1)!), 41.8103148958, 1e-6);
    expect(criticalAngle(1, 1.5)).toBeNull();
    const d = fromAngle(deg2rad(-90 + 45)); // 45° incidence from glass
    expect(refract(d, vec(0, 1), 1.5, 1)).toBeNull();
  });

  it('computes Fresnel reflectance at normal incidence', () => {
    close(fresnelReflectance(1, 1, 1.5), 0.04, 1e-12);
    expect(fresnelReflectance(Math.cos(deg2rad(60)), 1.5, 1)).toBe(1);
  });

  it('evaluates Cauchy dispersion (blue bends more than red)', () => {
    const bk7 = { A: 1.5046, B: 0.0042 };
    expect(indexAt(bk7, 450)).toBeGreaterThan(indexAt(bk7, 650));
    expect(indexAt(1.33, 500)).toBe(1.33);
  });
});

describe('tracer', () => {
  const bounds = { minX: -10, maxX: 10, minY: -10, maxY: 10 };
  const src = (x: number, y: number, deg: number) => ({
    origin: vec(x, y), dir: fromAngle(deg2rad(deg)), wavelength: 532, intensity: 1, ownerId: 'L',
  });

  it('stops at bounds', () => {
    const r = traceScene({ segments: [], circles: [], bounds }, [src(0, 0, 0)]);
    expect(r.segments).toHaveLength(1);
    close(r.segments[0].to.x, 10);
  });

  it('reflects off a 45° mirror into a target', () => {
    const scene: OpticalScene = {
      bounds,
      segments: [{ a: vec(4.5, -0.5), b: vec(5.5, 0.5), kind: 'mirror', ownerId: 'M', normal: normalize(vec(-1, 1)) }],
      circles: [{ c: vec(5, 5), r: 0.3, kind: 'target', ownerId: 'T' }],
    };
    const r = traceScene(scene, [src(0, 0, 0)]);
    expect(r.hitTargets.has('T')).toBe(true);
    expect(r.interactions[0].type).toBe('reflect');
  });

  it('shifts but does not turn a beam through a tilted slab', () => {
    const c = Math.cos(deg2rad(30));
    const s = Math.sin(deg2rad(30));
    // Slab 2 thick, tilted 30°, centred at origin. Edges listed with outward normals.
    const rot = (x: number, y: number) => vec(x * c - y * s, x * s + y * c);
    const p = [rot(-1, -3), rot(1, -3), rot(1, 3), rot(-1, 3)];
    const segs = p.map((a, i) => {
      const b = p[(i + 1) % 4];
      const mid = vec((a.x + b.x) / 2, (a.y + b.y) / 2);
      return { a, b, kind: 'interface' as const, ownerId: 'G', normal: normalize(mid), index: 1.5 };
    });
    const r = traceScene({ bounds, segments: segs, circles: [] }, [src(-8, 0, 0)]);
    const last = r.segments[r.segments.length - 1];
    const dir = normalize(vec(last.to.x - last.from.x, last.to.y - last.from.y));
    close(dir.x, 1, 1e-9);
    // d = t sin(θ1−θ2)/cos θ2 with θ1 = 30°
    const t2 = Math.asin(Math.sin(deg2rad(30)) / 1.5);
    const expected = (2 * Math.sin(deg2rad(30) - t2)) / Math.cos(t2);
    close(Math.abs(last.to.y), expected, 1e-9);
    expect(r.segments[1].n).toBe(1.5);
  });

  it('passes through sensors and records them', () => {
    const r = traceScene(
      { bounds, segments: [], circles: [{ c: vec(3, 0.1), r: 0.2, kind: 'sensor', ownerId: 'S' }] },
      [src(0, 0, 0)],
    );
    expect(r.hitSensors.has('S')).toBe(true);
    close(r.segments[0].to.x, 10);
  });

  it('stops after the interaction limit between parallel mirrors', () => {
    const scene: OpticalScene = {
      bounds,
      segments: [
        { a: vec(-1, 1), b: vec(1, 1), kind: 'mirror', ownerId: 'A', normal: vec(0, -1) },
        { a: vec(-1, -1), b: vec(1, -1), kind: 'mirror', ownerId: 'B', normal: vec(0, 1) },
      ],
      circles: [],
    };
    const r = traceScene(scene, [src(0, 0, 90)], { maxInteractions: 20 });
    expect(r.segments.length).toBeLessThanOrEqual(21);
  });
});
