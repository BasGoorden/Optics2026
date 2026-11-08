/** State of the level being played: elements, inventory and evaluation. Pure TypeScript. */
import { ElementState, PlaceableKind } from './elements';
import { Evaluation, LevelDef, canPlaceAt, evaluate } from './level';

let nextId = 1;

export class LevelSession {
  elements: ElementState[] = [];
  evaluation!: Evaluation;
  hintsShown = 0;

  constructor(readonly level: LevelDef) {
    this.reset();
  }

  reset(): void {
    this.elements = this.level.elements.map((e) => ({ ...e }));
    this.hintsShown = 0;
    this.reevaluate();
  }

  get(id: string): ElementState | undefined {
    return this.elements.find((e) => e.id === id);
  }

  remaining(kind: PlaceableKind): number {
    const used = this.elements.filter((e) => e.placed && e.kind === kind).length;
    return (this.level.inventory[kind] ?? 0) - used;
  }

  canPlace(el: ElementState, x: number, y: number): boolean {
    return canPlaceAt(el, x, y, this.elements, this.level.bounds);
  }

  /** Default size/rotation for a newly placed element. */
  template(kind: PlaceableKind): ElementState {
    return {
      id: `p${nextId++}`, kind, x: 0, y: 0, rotation: 0, movable: true, rotatable: true, placed: true,
      ...(kind === 'block' ? { w: 1, h: 2, index: 1.5 } : {}),
    };
  }

  place(el: ElementState): boolean {
    if (this.remaining(el.kind as PlaceableKind) <= 0 || !this.canPlace(el, el.x, el.y)) return false;
    this.elements.push(el);
    this.reevaluate();
    return true;
  }

  move(id: string, x: number, y: number): boolean {
    const el = this.get(id);
    if (!el || !el.movable || !this.canPlace(el, x, y)) return false;
    if (el.x === x && el.y === y) return false;
    el.x = x;
    el.y = y;
    this.reevaluate();
    return true;
  }

  rotate(id: string, rotation: number): boolean {
    const el = this.get(id);
    if (!el || !el.rotatable) return false;
    const r = normalizeAngle(rotation);
    if (Math.abs(el.rotation - r) < 1e-9) return false;
    el.rotation = r;
    this.reevaluate();
    return true;
  }

  remove(id: string): boolean {
    const i = this.elements.findIndex((e) => e.id === id && e.placed);
    if (i < 0) return false;
    this.elements.splice(i, 1);
    this.reevaluate();
    return true;
  }

  reevaluate(): void {
    this.evaluation = evaluate(this.level, this.elements);
  }
}

/** Normalise to (-180, 180], rounded to 0.01°. */
export function normalizeAngle(deg: number): number {
  let r = ((deg % 360) + 360) % 360;
  if (r > 180) r -= 360;
  return Math.round(r * 100) / 100;
}
