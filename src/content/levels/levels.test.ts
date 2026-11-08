import { describe, expect, it } from 'vitest';
import type { PlaceableKind } from '../../game/elements';
import { applySolution, canPlaceAt, evaluate, itemOf, makeItem } from '../../game/level';
import { LEVELS } from './index';

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

  it.runIf(level.par >= 2)('cannot be solved with a single element (no shortcuts)', () => {
    for (const kind of Object.keys(level.inventory) as PlaceableKind[]) {
      for (let x = level.bounds.minX; x <= level.bounds.maxX; x += 0.5) {
        for (let y = level.bounds.minY; y <= level.bounds.maxY; y += 0.5) {
          for (let rotation = -90; rotation < 180; rotation += 5) {
            const els = [...level.elements, { ...makeItem(level, kind, 'p'), x, y, rotation }];
            if (!canPlaceAt(els[els.length - 1], x, y, els, level.bounds)) continue;
            if (evaluate(level, els).solved) throw new Error(`${kind} at (${x}, ${y}) ${rotation}° solves it`);
          }
        }
      }
    }
  });

  it('has solutions that respect inventory and placement rules', () => {
    for (const sol of [level.solution, level.bonusSolution]) {
      const els = applySolution(level, sol);
      const placed = els.filter((e) => e.placed);
      for (const p of placed) {
        expect(canPlaceAt(p, p.x, p.y, els, level.bounds)).toBe(true);
        expect(placed.filter((q) => itemOf(q) === itemOf(p)).length).toBeLessThanOrEqual(level.inventory[itemOf(p)] ?? 0);
      }
      for (const id of Object.keys(sol.rotate ?? {})) {
        expect(level.elements.find((e) => e.id === id)?.rotatable).toBe(true);
      }
      for (const [id, m] of Object.entries(sol.move ?? {})) {
        const el = level.elements.find((e) => e.id === id)!;
        expect(el.movable).toBe(true);
        expect(canPlaceAt(el, m.x, m.y, els, level.bounds)).toBe(true);
        expect(Math.abs((m.x * 2) % 1) + Math.abs((m.y * 2) % 1)).toBe(0);
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
