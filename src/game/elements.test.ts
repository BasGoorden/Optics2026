import { describe, expect, it } from 'vitest';
import { traceScene } from '../physics/trace';
import { buildOpticalScene, type ElementState } from './elements';

const bounds = { minX: -10, maxX: 10, minY: -10, maxY: 10 };
const laser: ElementState = { id: 'laser', kind: 'laser', x: -6, y: 0, rotation: 0 };

/** Direction of a segment as an angle in degrees. */
const angle = (s: { from: { x: number; y: number }; to: { x: number; y: number } }) =>
  (Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x) * 180) / Math.PI;

describe('cube beam splitter', () => {
  const trace = (rotation: number) => {
    const els = [laser, { id: 'cube', kind: 'splitter' as const, x: 0, y: 0, rotation }];
    const { scene, sources } = buildOpticalScene(els, bounds);
    return traceScene(scene, sources);
  };
  /** The two beams that leave the cube and run to the table edge. */
  const exits = (r: ReturnType<typeof trace>) =>
    r.segments.filter((s) => Math.abs(s.to.x) > 9.99 || Math.abs(s.to.y) > 9.99);

  it('at 45° passes half straight through and sends half out at exactly 90°, without shifting', () => {
    const out = exits(trace(45));
    expect(out).toHaveLength(2);
    const straight = out.find((s) => Math.abs(angle(s)) < 1e-6)!;
    const turned = out.find((s) => Math.abs(angle(s) - 90) < 1e-6)!;
    expect(straight.intensity).toBeCloseTo(0.5, 12);
    expect(turned.intensity).toBeCloseTo(0.5, 12);
    expect(straight.to.y).toBeCloseTo(0, 9); // no sideways shift at normal incidence
  });

  it('refracts at the faces when tilted: the straight beam is shifted but stays parallel', () => {
    const out = exits(trace(30));
    const straight = out.find((s) => Math.abs(angle(s)) < 1e-6);
    expect(straight).toBeDefined();
    expect(Math.abs(straight!.to.y)).toBeGreaterThan(0.01);
    // By symmetry the exit face is the mirror image of the entry face in the diagonal, so the two
    // refractions cancel in direction: the reflected beam still turns by exactly 2 × 30° = 60°…
    const turned = out.find((s) => s !== straight)!;
    expect(angle(turned)).toBeCloseTo(60, 9);
    // …but it is displaced compared with a thin plate, whose reflected beam would pass through the centre.
    const d = { x: Math.cos(Math.PI / 3), y: Math.sin(Math.PI / 3) };
    const offset = Math.abs(turned.to.x * d.y - turned.to.y * d.x); // distance of the beam line from the centre
    expect(offset).toBeGreaterThan(0.01);
  });

  it('has anti-reflection coated faces: no light is lost to stray reflections', () => {
    for (const rot of [45, 30, 60]) {
      const total = exits(trace(rot)).reduce((sum, s) => sum + s.intensity, 0);
      expect(total).toBeCloseTo(1, 12);
    }
  });
});
