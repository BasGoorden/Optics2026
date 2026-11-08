/** Level definitions, evaluation and star scoring. Pure TypeScript. */
import type { Bounds, TraceResult } from '../physics/trace';
import { traceScene } from '../physics/trace';
import { distance, vec } from '../physics/vec';
import { ElementState, PlaceableKind, buildOpticalScene, footprint } from './elements';

export interface LevelDef {
  id: string;
  chapter: number;
  title: string;
  /** Lumen's intro lines. */
  intro: string[];
  /** Up to three hints, from gentle to direct. */
  hints: string[];
  /** Shown after solving. */
  explanation: { title: string; body: string; deeper: string };
  bounds: Bounds;
  elements: ElementState[];
  inventory: Partial<Record<PlaceableKind, number>>;
  /** Number of placed elements for the second star. */
  par: number;
  /** Third star: the beam must pass through all of these rings. */
  bonus: { description: string; ringIds: string[] };
  /** Known solutions, used by tests (and as a debug aid). */
  solution: LevelSolution;
  bonusSolution: LevelSolution;
}

export interface LevelSolution {
  place: Omit<ElementState, 'id'>[];
  /** Rotations (degrees) to apply to existing elements by id. */
  rotate?: Record<string, number>;
}

export interface Evaluation {
  trace: TraceResult;
  requiredTargets: string[];
  litTargets: string[];
  solved: boolean;
  bonusMet: boolean;
  placedCount: number;
  stars: number;
}

export function requiredTargetIds(elements: ElementState[]): string[] {
  return elements.filter((e) => e.kind === 'target').map((e) => e.id);
}

export function evaluate(level: LevelDef, elements: ElementState[]): Evaluation {
  const { scene, sources } = buildOpticalScene(elements, level.bounds);
  const trace = traceScene(scene, sources);
  const requiredTargets = requiredTargetIds(elements);
  const litTargets = requiredTargets.filter((id) => trace.hitTargets.has(id));
  const solved = requiredTargets.length > 0 && litTargets.length === requiredTargets.length;
  const bonusMet = level.bonus.ringIds.every((id) => trace.hitSensors.has(id));
  const placedCount = elements.filter((e) => e.placed).length;
  const stars = solved ? 1 + (placedCount <= level.par ? 1 : 0) + (bonusMet ? 1 : 0) : 0;
  return { trace, requiredTargets, litTargets, solved, bonusMet, placedCount, stars };
}

/** Apply a solution to a level's starting elements (for tests). */
export function applySolution(level: LevelDef, sol: LevelSolution): ElementState[] {
  const els = level.elements.map((e) => ({ ...e, rotation: sol.rotate?.[e.id] ?? e.rotation }));
  sol.place.forEach((p, i) => els.push({ ...p, id: `sol-${i}`, placed: true, movable: true, rotatable: true }));
  return els;
}

/** Is (x, y) free for `el` (inside the table and not on top of another element)? */
export function canPlaceAt(
  el: ElementState, x: number, y: number, others: ElementState[], bounds: Bounds,
): boolean {
  const r = footprint(el);
  if (x - r < bounds.minX || x + r > bounds.maxX || y - r < bounds.minY || y + r > bounds.maxY) return false;
  return others.every(
    (o) => o.id === el.id || distance(vec(o.x, o.y), vec(x, y)) >= footprint(o) + r - 0.05,
  );
}
