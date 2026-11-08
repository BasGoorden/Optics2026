/** Level definitions, evaluation and star scoring. Pure TypeScript. */
import type { Bounds, TraceResult } from '../physics/trace';
import { traceScene } from '../physics/trace';
import { deg2rad, distance, dot, fromAngle, vec } from '../physics/vec';
import {
  ElementState, OBJECT_HEIGHT, OBJECT_POINTS, PlaceableKind, buildOpticalScene, footprint, objectGroup,
} from './elements';

/** A screen on which an object must be imaged sharply. */
export interface ImageGoal {
  screen: string;
  object: string;
  /** Largest allowed blur (spot size on the screen, table units). */
  maxBlur: number;
  /** Required magnification range (e.g. min > 0 for an upright image). */
  magnification?: { min: number; max: number };
}

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
  /** Default properties for inventory items in this level (e.g. a lens's focal length). */
  templates?: Partial<Record<PlaceableKind, Partial<ElementState>>>;
  /** Images that must be sharp (in addition to lighting all targets). */
  images?: ImageGoal[];
  /** Number of placed elements for the second star. */
  par: number;
  /** Third star. All listed conditions must hold. */
  bonus: Bonus;
  /** Known solutions, used by tests (and as a debug aid). */
  solution: LevelSolution;
  bonusSolution: LevelSolution;
}

export interface Bonus {
  description: string;
  /** The beam must pass through all of these rings. */
  ringIds?: string[];
  /** Targets must receive at least this much power. */
  minPower?: Record<string, number>;
  /** All images must be at least this sharp. */
  maxBlur?: number;
  /** Image magnification (negative = upside down) must lie in this range. */
  magnification?: { min: number; max: number };
}

export interface LevelSolution {
  /** Items to place: `item` picks the inventory item (defaults to `kind`). */
  place: (Partial<ElementState> & { kind?: ElementState['kind']; item?: PlaceableKind; x: number; y: number; rotation: number })[];
  /** Rotations (degrees) to apply to existing elements by id. */
  rotate?: Record<string, number>;
  /** Moves to apply to existing movable elements by id. */
  move?: Record<string, { x: number; y: number }>;
}

export interface ImageResult {
  goal: ImageGoal;
  /** Every object point reached the screen with enough rays. */
  formed: boolean;
  /** Largest spot size over the object points. */
  blur: number;
  sharp: boolean;
  /** Image height / object height (negative = inverted). NaN if not formed. */
  magnification: number;
  /** Spot centres per object point (position along the screen). */
  spots: { point: string; pos: number; blur: number }[];
}

export interface Evaluation {
  trace: TraceResult;
  requiredTargets: string[];
  litTargets: string[];
  images: ImageResult[];
  solved: boolean;
  bonusMet: boolean;
  placedCount: number;
  stars: number;
}

export function requiredTargetIds(elements: ElementState[]): string[] {
  return elements.filter((e) => e.kind === 'target').map((e) => e.id);
}

/** Narrowest window containing `share` of the sorted values: returns its width and centre. */
function coreSpread(values: number[], share: number): { width: number; centre: number } {
  const v = [...values].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(v.length * share));
  let best = { width: Infinity, centre: 0 };
  for (let i = 0; i + k - 1 < v.length; i++) {
    const w = v[i + k - 1] - v[i];
    if (w < best.width) best = { width: w, centre: (v[i] + v[i + k - 1]) / 2 };
  }
  return best;
}

/** Fraction of an object point's rays that must land in the spot (the rest is stray light). */
const CORE_SHARE = 0.6;
/** An object point needs at least this many rays on the screen to count. */
const MIN_RAYS = 3;

export function analyseImage(goal: ImageGoal, elements: ElementState[], trace: TraceResult): ImageResult {
  const obj = elements.find((e) => e.id === goal.object);
  const scr = elements.find((e) => e.id === goal.screen);
  const spots: ImageResult['spots'] = [];
  let formed = !!obj && !!scr;
  for (const pt of OBJECT_POINTS) {
    const g = objectGroup(goal.object, pt.name);
    const hits = trace.screenHits.filter((h) => h.ownerId === goal.screen && h.group === g).map((h) => h.pos);
    if (hits.length < MIN_RAYS) {
      formed = false;
      continue;
    }
    const core = coreSpread(hits, CORE_SHARE);
    spots.push({ point: pt.name, pos: core.centre, blur: core.width });
  }
  const blur = formed ? Math.max(...spots.map((s) => s.blur)) : Infinity;
  let magnification = NaN;
  if (formed && obj && scr) {
    const tip = spots.find((s) => s.point === 'tip')!.pos;
    const baseP = spots.find((s) => s.point === 'base')!.pos;
    // Compare the "up" direction of the object with the screen's measuring direction.
    const objUp = fromAngle(deg2rad(obj.rotation + 90));
    const scrUp = fromAngle(deg2rad(scr.rotation + 90));
    const sign = Math.sign(dot(objUp, scrUp)) || 1;
    magnification = (sign * (tip - baseP)) / (obj.len ?? OBJECT_HEIGHT);
  }
  const m = goal.magnification;
  const magOk = !m || (magnification >= m.min && magnification <= m.max);
  return { goal, formed, blur, sharp: formed && blur <= goal.maxBlur && magOk, magnification, spots };
}

export function evaluate(level: LevelDef, elements: ElementState[]): Evaluation {
  const { scene, sources } = buildOpticalScene(elements, level.bounds);
  const trace = traceScene(scene, sources);
  const requiredTargets = requiredTargetIds(elements);
  const litTargets = requiredTargets.filter((id) => trace.hitTargets.has(id));
  const images = (level.images ?? []).map((g) => analyseImage(g, elements, trace));
  const goals = requiredTargets.length + images.length;
  const solved = goals > 0 && litTargets.length === requiredTargets.length && images.every((i) => i.sharp);

  const b = level.bonus;
  const bonusMet = (b.ringIds ?? []).every((id) => trace.hitSensors.has(id))
    && Object.entries(b.minPower ?? {}).every(([id, p]) => (trace.power.get(id) ?? 0) >= p - 1e-9)
    && (b.maxBlur === undefined || images.every((i) => i.blur <= b.maxBlur!))
    && (b.magnification === undefined || images.every((i) => i.magnification >= b.magnification!.min
      && i.magnification <= b.magnification!.max));

  const placedCount = elements.filter((e) => e.placed).length;
  const stars = solved ? 1 + (placedCount <= level.par ? 1 : 0) + (bonusMet ? 1 : 0) : 0;
  return { trace, requiredTargets, litTargets, images, solved, bonusMet, placedCount, stars };
}

/** Default properties of each inventory item. */
const ITEM_DEFAULTS: Record<PlaceableKind, Partial<ElementState> & { kind: ElementState['kind'] }> = {
  mirror: { kind: 'mirror' },
  splitter: { kind: 'splitter' },
  block: { kind: 'block', w: 1, h: 2, index: 1.5 },
  prism: { kind: 'prism' },
  lens: { kind: 'lens', focal: 2 },
  dlens: { kind: 'lens', focal: -2 },
  aperture: { kind: 'aperture', gap: 0.2 },
};

/** A new element for inventory item `item`, using the level's templates. */
export function makeItem(level: LevelDef, item: PlaceableKind, id: string): ElementState {
  return {
    id, x: 0, y: 0, rotation: 0, movable: true, rotatable: true, placed: true, item,
    ...ITEM_DEFAULTS[item],
    ...level.templates?.[item],
  };
}

/** The inventory item an element counts against. */
export const itemOf = (e: ElementState): PlaceableKind => e.item ?? (e.kind as PlaceableKind);

/** Apply a solution to a level's starting elements (for tests). */
export function applySolution(level: LevelDef, sol: LevelSolution): ElementState[] {
  const els = level.elements.map((e) => ({
    ...e, rotation: sol.rotate?.[e.id] ?? e.rotation, ...(sol.move?.[e.id] ?? {}),
  }));
  sol.place.forEach((p, i) => {
    const item = p.item ?? (p.kind as PlaceableKind);
    els.push({ ...makeItem(level, item, `sol-${i}`), ...p, item });
  });
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
