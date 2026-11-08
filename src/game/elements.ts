/**
 * Game elements and how they turn into optical geometry. Pure TypeScript (no Three.js),
 * so the same code drives the renderer, the game logic and the level tests.
 *
 * Coordinates: table plane, x to the right, y away from the player; rotation in degrees, CCW.
 */
import type { RefractiveIndex } from '../physics/optics';
import type { BeamSource, Bounds, Circle, OpticalScene, Segment } from '../physics/trace';
import { Vec2, add, deg2rad, fromAngle, normalize, perp, rotate, sub, vec } from '../physics/vec';

export type ElementKind = 'laser' | 'mirror' | 'splitter' | 'block' | 'prism' | 'target' | 'ring' | 'wall';

/** Kinds the player can take from the inventory. */
export type PlaceableKind = 'mirror' | 'splitter' | 'block' | 'prism';

export interface ElementState {
  id: string;
  kind: ElementKind;
  x: number;
  y: number;
  /** Degrees, counter-clockwise. */
  rotation: number;
  /** Player can drag it. */
  movable?: boolean;
  /** Player can rotate it. */
  rotatable?: boolean;
  /** Placed by the player from the inventory (can be removed again). */
  placed?: boolean;
  /** Block/wall size. */
  w?: number;
  h?: number;
  /** Glass refractive index. */
  index?: RefractiveIndex;
  /** Laser wavelength in nm. */
  wavelength?: number;
  /** Wall: visual height (default 0.9). Physics is 2D, so this only changes the look. */
  height?: number;
  /** Splitter: fraction reflected (default 0.5). */
  reflectance?: number;
  /** Target/ring radius. */
  r?: number;
}

export const MIRROR_LENGTH = 1.2;
export const SPLITTER_LENGTH = 1.0;
export const TARGET_RADIUS = 0.45;
export const RING_RADIUS = 0.25;
export const DEFAULT_GLASS_INDEX = 1.5;
export const DEFAULT_WAVELENGTH = 532;

/** Right-angle prism (legs 1.2) with its centroid at the origin; right angle at top-left. */
export const PRISM_LOCAL: Vec2[] = [vec(-0.4, -0.8), vec(0.8, 0.4), vec(-0.4, 0.4)];

/** Laser body size (local x = beam direction). */
export const LASER_SIZE = { w: 0.9, h: 0.5 };

function toWorld(el: ElementState, p: Vec2): Vec2 {
  return add(vec(el.x, el.y), rotate(p, deg2rad(el.rotation)));
}

function rectLocal(w: number, h: number): Vec2[] {
  return [vec(-w / 2, -h / 2), vec(w / 2, -h / 2), vec(w / 2, h / 2), vec(-w / 2, h / 2)];
}

/** Polygon outline (world coordinates) of a block, wall, prism or laser body. */
export function elementPolygon(el: ElementState): Vec2[] | null {
  switch (el.kind) {
    case 'block':
    case 'wall':
      return rectLocal(el.w ?? 1, el.h ?? 1).map((p) => toWorld(el, p));
    case 'prism':
      return PRISM_LOCAL.map((p) => toWorld(el, p));
    case 'laser':
      return rectLocal(LASER_SIZE.w, LASER_SIZE.h).map((p) => toWorld(el, p));
    default:
      return null;
  }
}

/** Polygon edges with outward normals (works for convex polygons in any winding). */
function polygonSegments(
  poly: Vec2[], kind: Segment['kind'], ownerId: string, index?: RefractiveIndex,
): Segment[] {
  const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
  return poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length];
    let normal = normalize(perp(sub(b, a)));
    const mid = vec((a.x + b.x) / 2, (a.y + b.y) / 2);
    if ((mid.x - cx) * normal.x + (mid.y - cy) * normal.y < 0) normal = vec(-normal.x, -normal.y);
    return { a, b, kind, ownerId, normal, index };
  });
}

/** Mirror end points in world coordinates. Rotation 0 = mirror lies along +x. */
export function mirrorEnds(el: ElementState): [Vec2, Vec2] {
  const len = el.kind === 'splitter' ? SPLITTER_LENGTH : MIRROR_LENGTH;
  const half = rotate(vec(len / 2, 0), deg2rad(el.rotation));
  return [sub(vec(el.x, el.y), half), add(vec(el.x, el.y), half)];
}

export function laserSource(el: ElementState): BeamSource {
  const dir = fromAngle(deg2rad(el.rotation));
  return {
    origin: toWorld(el, vec(LASER_SIZE.w / 2 + 0.01, 0)),
    dir,
    wavelength: el.wavelength ?? DEFAULT_WAVELENGTH,
    intensity: 1,
    ownerId: el.id,
  };
}

export function buildOpticalScene(
  elements: ElementState[], bounds: Bounds,
): { scene: OpticalScene; sources: BeamSource[] } {
  const segments: Segment[] = [];
  const circles: Circle[] = [];
  const sources: BeamSource[] = [];

  for (const el of elements) {
    switch (el.kind) {
      case 'laser':
        sources.push(laserSource(el));
        segments.push(...polygonSegments(elementPolygon(el)!, 'absorber', el.id));
        break;
      case 'mirror': {
        const [a, b] = mirrorEnds(el);
        segments.push({ a, b, kind: 'mirror', ownerId: el.id, normal: normalize(perp(sub(b, a))) });
        break;
      }
      case 'splitter': {
        const [a, b] = mirrorEnds(el);
        segments.push({
          a, b, kind: 'splitter', ownerId: el.id, normal: normalize(perp(sub(b, a))), reflectance: el.reflectance ?? 0.5,
        });
        break;
      }
      case 'wall':
        segments.push(...polygonSegments(elementPolygon(el)!, 'absorber', el.id));
        break;
      case 'block':
      case 'prism':
        segments.push(
          ...polygonSegments(elementPolygon(el)!, 'interface', el.id, el.index ?? DEFAULT_GLASS_INDEX),
        );
        break;
      case 'target':
        circles.push({ c: vec(el.x, el.y), r: el.r ?? TARGET_RADIUS, kind: 'target', ownerId: el.id });
        break;
      case 'ring':
        circles.push({ c: vec(el.x, el.y), r: el.r ?? RING_RADIUS, kind: 'sensor', ownerId: el.id });
        break;
    }
  }
  return { scene: { segments, circles, bounds }, sources };
}

/** Rough footprint radius, used to stop elements being placed on top of each other. */
export function footprint(el: ElementState): number {
  switch (el.kind) {
    case 'mirror':
    case 'splitter': return 0.35;
    case 'prism': return 0.55;
    case 'block':
    case 'wall': return Math.min(el.w ?? 1, el.h ?? 1) / 2;
    case 'target': return el.r ?? TARGET_RADIUS;
    case 'ring': return 0.2;
    case 'laser': return 0.45;
  }
}
