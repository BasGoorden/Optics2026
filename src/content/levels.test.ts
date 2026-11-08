import { describe, expect, it } from 'vitest';
import { applySolution, canPlaceAt, evaluate } from '../game/level';
import { LEVELS } from './levels';

describe.each(LEVELS.map((l) => [l.id, l] as const))('level %s', (_id, level) => {
  it('is unsolved at the start', () => {
    expect(evaluate(level, level.elements).solved).toBe(false);
  });

  it('is solved by its solution with 2 stars (and no bonus)', () => {
    const ev = evaluate(level, applySolution(level, level.solution));
    expect(ev.solved).toBe(true);
    expect(ev.bonusMet).toBe(false);
    expect(ev.stars).toBe(2);
  });

  it('gets 3 stars with its bonus solution', () => {
    const ev = evaluate(level, applySolution(level, level.bonusSolution));
    expect(ev.solved).toBe(true);
    expect(ev.stars).toBe(3);
  });

  it('has solutions that respect inventory and placement rules', () => {
    for (const sol of [level.solution, level.bonusSolution]) {
      const els = applySolution(level, sol);
      const placed = els.filter((e) => e.placed);
      for (const p of placed) {
        expect(canPlaceAt(p, p.x, p.y, els, level.bounds)).toBe(true);
        expect(placed.filter((q) => q.kind === p.kind).length).toBeLessThanOrEqual(level.inventory[p.kind as 'mirror'] ?? 0);
      }
      for (const id of Object.keys(sol.rotate ?? {})) {
        expect(level.elements.find((e) => e.id === id)?.rotatable).toBe(true);
      }
      // Reachable with the default 5° rotation step and 0.5 grid (no Shift needed).
      for (const r of [...placed.map((p) => p.rotation), ...Object.values(sol.rotate ?? {})]) {
        expect(Math.abs(r % 5)).toBe(0);
      }
      for (const p of placed) {
        expect(Math.abs((p.x * 2) % 1)).toBe(0);
        expect(Math.abs((p.y * 2) % 1)).toBe(0);
      }
    }
  });
});
