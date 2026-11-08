/**
 * Game elements and how they turn into optical geometry. Pure TypeScript (no Three.js),
 * so the same code drives the renderer, the game logic and the level tests.
 *
 * Coordinates: table plane, x to the right, y away from the player; rotation in degrees, CCW.
 */
import type { Band } from '../physics/colour';
import type { RefractiveIndex } from '../physics/optics';
import type { BeamSource, Bounds, Circle, OpticalScene, Segment } from '../physics/trace';
import { Source3, coneDirections, v3 } from '../physics/trace3d';
import { Vec2, add, deg2rad, fromAngle, normalize, perp, rotate, sub, vec } from '../physics/vec';

export type ElementKind =
  | 'laser' | 'led' | 'object' | 'mirror' | 'splitter' | 'block' | 'prism' | 'dprism' | 'lens' | 'aperture' | 'screen'
  | 'filter' | 'dichroic' | 'grating' | 'slits' | 'polariser' | 'slm'
  | 'target' | 'ring' | 'wall';

/**
 * Inventory item id. Standard items are listed in ITEM_DEFAULTS (game/level.ts); levels can define more
 * through their `templates` (e.g. 'filterR' = a filter that passes red).
 */
export type PlaceableKind = string;

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
  /** Inventory item it came from, when that differs from kind (e.g. 'dlens' is a lens with f < 0). */
  item?: PlaceableKind;
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
  /** Target: total power needed (fraction of one source; default 0.1). */
  minPower?: number;
  /** Lens: focal length (negative = diverging). */
  focal?: number;
  /** Lens/screen/aperture length, object height. */
  len?: number;
  /** Aperture: width of the opening. */
  gap?: number;
  /** LED/object: half-angle of the fan of rays (degrees) and number of rays per point. */
  spread?: number;
  rays?: number;
  /** Laser/LED: emit several wavelengths at once (e.g. WHITE). */
  spectrum?: number[];
  /** Filter: band that passes. Dichroic mirror: band that is reflected. */
  band?: Band;
  /** Grating line spacing, µm. */
  period?: number;
  /** Colour receivers: power needed per band, and bands that must stay dark. */
  needs?: { band: Band; min: number }[];
  forbid?: Band[];
  /** Laser polarisation angle (degrees); null = unpolarised. Polariser: transmission axis (degrees). */
  pol?: number | null;
  /** Slits: number of slits (1 or 2), slit width a and separation d, in µm. */
  slitCount?: number;
  slitWidth?: number;
  slitSep?: number;
  /** SLM program: index into SLM_PROGRAMS. */
  program?: number;
  /** Label shown in the inventory tray and selection panel (custom items). */
  label?: string;
}

export const MIRROR_LENGTH = 1.2;
export const SPLITTER_LENGTH = 1.0;
export const TARGET_RADIUS = 0.45;
export const RING_RADIUS = 0.25;
export const DEFAULT_GLASS_INDEX = 1.5;
export const DEFAULT_WAVELENGTH = 532;
/**
 * Height of the optical axis above the table. Physics is 2D in the plane of this axis; the 3D view
 * and the 3D cone rays use the vertical sizes below (all measured from the axis).
 */
export const AXIS_HEIGHT = 1.15;
export const WALL_HEIGHT = 1.6;
export const HALF_HEIGHT = {
  mirror: 0.23,
  splitter: 1 / Math.SQRT2 / 2,
  glass: 0.3,
  screen: 0.35,
  aperture: 0.3,
  laser: 0.15,
  led: 0.17,
};
export const LENS_LENGTH = 1.6;
export const SCREEN_LENGTH = 2.4;
export const OBJECT_HEIGHT = 1.2;
export const LED_SIZE = 0.4;

/**
 * Object points that emit rays, from base to tip (fraction of the object height). Each point has its own
 * colour (wavelength) so students can follow its rays and see whether the image is upside down.
 */
export const OBJECT_POINTS = [
  { name: 'base', f: -0.5, wl: 470 },
  { name: 'mid', f: 0, wl: 560 },
  { name: 'tip', f: 0.5, wl: 640 },
] as const;

export const objectGroup = (objectId: string, point: string) => `${objectId}:${point}`;

/** Right-angle prism (legs 1.2) with its centroid at the origin; right angle at top-left. */
export const PRISM_LOCAL: Vec2[] = [vec(-0.4, -0.8), vec(0.8, 0.4), vec(-0.4, 0.4)];

/** Equilateral dispersing prism (side 1.4), centroid at the origin, apex towards +y. */
export const DPRISM_LOCAL: Vec2[] = [90, 210, 330].map((a) => vec(0.808 * Math.cos(deg2rad(a)), 0.808 * Math.sin(deg2rad(a))));
/** Dense flint glass: strong dispersion (Cauchy: n = A + B/λ², λ in µm). */
export const FLINT = { A: 1.62, B: 0.02 };
export const PLATE_LENGTH = 1.2;
/** Width of the (tiny) slit opening on the table, for ray tracing. The real slit sizes are in µm. */
export const SLIT_OPENING = 0.1;

/** SLM programs the player cycles through (Q/E). Blazed ramps send light into one order; binary gratings split it. */
export const SLM_PROGRAMS: { name: string; period?: number; orders: { m: number; eff: number }[] }[] = [
  { name: 'Flat (mirror)', orders: [{ m: 0, eff: 1 }] },
  { name: 'Ramp + 6 µm', period: 6, orders: [{ m: 1, eff: 0.95 }] },
  { name: 'Ramp + 3 µm', period: 3, orders: [{ m: 1, eff: 0.95 }] },
  { name: 'Ramp + 2 µm', period: 2, orders: [{ m: 1, eff: 0.95 }] },
  { name: 'Ramp − 6 µm', period: 6, orders: [{ m: -1, eff: 0.95 }] },
  { name: 'Ramp − 3 µm', period: 3, orders: [{ m: -1, eff: 0.95 }] },
  { name: 'Ramp − 2 µm', period: 2, orders: [{ m: -1, eff: 0.95 }] },
  { name: 'Split ± 3 µm', period: 3, orders: [{ m: 1, eff: 0.4 }, { m: -1, eff: 0.4 }] },
  { name: 'Split ± 2 µm', period: 2, orders: [{ m: 1, eff: 0.4 }, { m: -1, eff: 0.4 }] },
];

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
    case 'dprism':
      return DPRISM_LOCAL.map((p) => toWorld(el, p));
    case 'laser':
      return rectLocal(LASER_SIZE.w, LASER_SIZE.h).map((p) => toWorld(el, p));
    case 'led':
      return rectLocal(LED_SIZE, LED_SIZE).map((p) => toWorld(el, p));
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

/** Laser beam: one ray per wavelength (a white source has several), polarised at `pol` (default 0°). */
export function laserSources(el: ElementState): BeamSource[] {
  const dir = fromAngle(deg2rad(el.rotation));
  const wls = el.spectrum ?? [el.wavelength ?? DEFAULT_WAVELENGTH];
  return wls.map((wavelength) => ({
    origin: toWorld(el, vec(LASER_SIZE.w / 2 + 0.01, 0)),
    dir, wavelength, intensity: 1 / wls.length, ownerId: el.id, pol: el.pol === undefined ? 0 : el.pol,
  }));
}

/**
 * Ends of a plate-like element that stands across its own +x axis (lens, screen, aperture):
 * rotation 0 = the element lies along y and its optical axis points along +x.
 */
export function plateEnds(el: ElementState, len: number): [Vec2, Vec2] {
  const half = rotate(vec(0, len / 2), deg2rad(el.rotation));
  return [sub(vec(el.x, el.y), half), add(vec(el.x, el.y), half)];
}

/** Fan of rays from point `p` around direction `rotation` (degrees). */
function fan(
  p: Vec2, rotation: number, spread: number, rays: number, total: number, el: ElementState, group?: string,
): BeamSource[] {
  const out: BeamSource[] = [];
  const wls = el.spectrum ?? [el.wavelength ?? DEFAULT_WAVELENGTH];
  for (let i = 0; i < rays; i++) {
    const a = rays === 1 ? 0 : -spread + (2 * spread * i) / (rays - 1);
    for (const wavelength of wls) {
      out.push({
        origin: p, dir: fromAngle(deg2rad(rotation + a)), wavelength,
        intensity: total / rays / wls.length, ownerId: el.id, group, pol: null,
      });
    }
  }
  return out;
}

export function ledSources(el: ElementState): BeamSource[] {
  return fan(toWorld(el, vec(LED_SIZE / 2 + 0.02, 0)), el.rotation, el.spread ?? 10, el.rays ?? 15, 1, el);
}

export function objectSources(el: ElementState): BeamSource[] {
  const H = el.len ?? OBJECT_HEIGHT;
  return OBJECT_POINTS.flatMap((pt) =>
    fan(toWorld(el, vec(0, pt.f * H)), el.rotation, el.spread ?? 12, el.rays ?? 9, 1 / OBJECT_POINTS.length,
      { ...el, wavelength: pt.wl }, objectGroup(el.id, pt.name)));
}

/**
 * 3D cones of rays for drawing (LEDs and object points). Each cone has the same half-angle as the
 * element's 2D fan, so the in-plane slice of the cone matches the 2D rays used for scoring.
 */
export function coneSources(el: ElementState): Source3[] {
  const mk = (p: Vec2, wl: number, rings = 4) => coneDirections(el.rotation, el.spread ?? (el.kind === 'led' ? 10 : 12), rings)
    .map((dir) => ({ origin: v3(p.x, p.y, 0), dir, wavelength: wl, intensity: 1 }));
  if (el.kind === 'led') {
    const wls = el.spectrum ?? [el.wavelength ?? DEFAULT_WAVELENGTH];
    return wls.flatMap((wl) => mk(toWorld(el, vec(LED_SIZE / 2 + 0.02, 0)), wl, wls.length > 1 ? 3 : 4));
  }
  if (el.kind === 'object') {
    const H = el.len ?? OBJECT_HEIGHT;
    return OBJECT_POINTS.flatMap((pt) => mk(toWorld(el, vec(0, pt.f * H)), pt.wl));
  }
  return [];
}

export function buildOpticalScene(
  elements: ElementState[], bounds: Bounds,
): { scene: OpticalScene; sources: BeamSource[] } {
  const segments: Segment[] = [];
  const circles: Circle[] = [];
  const sources: BeamSource[] = [];

  for (const el of elements) {
    const first = segments.length;
    switch (el.kind) {
      case 'laser':
        sources.push(...laserSources(el));
        segments.push(...polygonSegments(elementPolygon(el)!, 'absorber', el.id));
        break;
      case 'mirror': {
        const [a, b] = mirrorEnds(el);
        segments.push({ a, b, kind: 'mirror', ownerId: el.id, normal: normalize(perp(sub(b, a))) });
        break;
      }
      case 'splitter': {
        // Cube beam splitter: a glass cube (anti-reflection coated faces) with the
        // half-reflecting layer on its diagonal. The diagonal lies along local x.
        const [a, b] = mirrorEnds(el);
        const h = SPLITTER_LENGTH / 2;
        const cube = [vec(-h, 0), vec(0, -h), vec(h, 0), vec(0, h)].map((p) => toWorld(el, p));
        segments.push(...polygonSegments(cube, 'interface', el.id, el.index ?? DEFAULT_GLASS_INDEX).map((s) => ({ ...s, ar: true })));
        segments.push({
          a, b, kind: 'splitter', ownerId: el.id, normal: normalize(perp(sub(b, a))), reflectance: el.reflectance ?? 0.5,
        });
        break;
      }
      case 'led':
        sources.push(...ledSources(el));
        segments.push(...polygonSegments(elementPolygon(el)!, 'absorber', el.id));
        break;
      case 'object':
        sources.push(...objectSources(el));
        break;
      case 'lens': {
        const [a, b] = plateEnds(el, el.len ?? LENS_LENGTH);
        segments.push({ a, b, kind: 'lens', ownerId: el.id, normal: fromAngle(deg2rad(el.rotation)), focal: el.focal ?? 2 });
        break;
      }
      case 'screen': {
        const [a, b] = plateEnds(el, el.len ?? SCREEN_LENGTH);
        segments.push({ a, b, kind: 'screen', ownerId: el.id, normal: fromAngle(deg2rad(el.rotation)) });
        break;
      }
      case 'aperture': {
        // A plate with an opening of width `gap` in the middle: two absorbing halves.
        const len = el.len ?? SCREEN_LENGTH;
        const g = (el.gap ?? 0.2) / 2;
        const normal = fromAngle(deg2rad(el.rotation));
        for (const [y0, y1] of [[-len / 2, -g], [g, len / 2]]) {
          segments.push({ a: toWorld(el, vec(0, y0)), b: toWorld(el, vec(0, y1)), kind: 'absorber', ownerId: el.id, normal });
        }
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
      case 'dprism':
        segments.push(...polygonSegments(elementPolygon(el)!, 'interface', el.id, el.index ?? FLINT));
        break;
      case 'filter':
      case 'grating':
      case 'polariser': {
        const [a, b] = plateEnds(el, el.len ?? PLATE_LENGTH);
        segments.push({
          a, b, kind: el.kind, ownerId: el.id, normal: fromAngle(deg2rad(el.rotation)),
          band: el.band, period: el.period, axis: el.pol ?? 0,
        });
        break;
      }
      case 'dichroic': {
        const [a, b] = mirrorEnds(el);
        segments.push({ a, b, kind: 'dichroic', ownerId: el.id, normal: normalize(perp(sub(b, a))), band: el.band });
        break;
      }
      case 'slm': {
        // Reflective, so it lies along its local x like a mirror; its program adds a grating.
        const [a, b] = mirrorEnds(el);
        const prog = SLM_PROGRAMS[el.program ?? 0] ?? SLM_PROGRAMS[0];
        segments.push({
          a, b, kind: 'slm', ownerId: el.id, normal: normalize(perp(sub(b, a))), period: prog.period ?? 1e9, orders: prog.orders,
        });
        break;
      }
      case 'slits': {
        // A plate with a tiny opening in the middle; light through it carries the slit pattern.
        const len = el.len ?? PLATE_LENGTH * 2;
        const g = SLIT_OPENING / 2;
        const normal = fromAngle(deg2rad(el.rotation));
        for (const [y0, y1] of [[-len / 2, -g], [g, len / 2]]) {
          segments.push({ a: toWorld(el, vec(0, y0)), b: toWorld(el, vec(0, y1)), kind: 'absorber', ownerId: el.id, normal });
        }
        segments.push({
          a: toWorld(el, vec(0, -g)), b: toWorld(el, vec(0, g)), kind: 'slits', ownerId: el.id, normal,
          slits: { count: el.slitCount ?? 2, width: el.slitWidth ?? 5, sep: el.slitSep ?? 20 },
        });
        break;
      }
      case 'target':
        circles.push({
          c: vec(el.x, el.y), r: el.r ?? TARGET_RADIUS, kind: 'target', ownerId: el.id, minPower: el.minPower,
          needs: el.needs, forbid: el.forbid,
        });
        break;
      case 'ring':
        circles.push({ c: vec(el.x, el.y), r: el.r ?? RING_RADIUS, kind: 'sensor', ownerId: el.id, needs: el.needs, forbid: el.forbid });
        break;
    }
    // Vertical size (for the 3D view and 3D cone rays; the 2D physics ignores it).
    const ext = verticalExtent(el);
    for (let i = first; i < segments.length; i++) Object.assign(segments[i], ext);
  }
  return { scene: { segments, circles, bounds }, sources };
}

/** Vertical size of an element's surfaces, relative to the optical axis (lenses are round discs). */
export function verticalExtent(el: ElementState): { hMin?: number; hMax?: number; disk?: number } {
  switch (el.kind) {
    case 'lens': return { disk: (el.len ?? LENS_LENGTH) / 2 };
    case 'mirror': return { disk: MIRROR_LENGTH / 2 };
    case 'splitter': return { hMin: -HALF_HEIGHT.splitter, hMax: HALF_HEIGHT.splitter };
    case 'block':
    case 'prism':
    case 'dprism': return { hMin: -HALF_HEIGHT.glass, hMax: HALF_HEIGHT.glass };
    case 'filter':
    case 'polariser':
    case 'dichroic': return { disk: PLATE_LENGTH / 2 };
    case 'grating':
    case 'slm': return { hMin: -0.4, hMax: 0.4 };
    case 'slits': return { hMin: -HALF_HEIGHT.aperture, hMax: HALF_HEIGHT.aperture };
    case 'screen': return { hMin: -HALF_HEIGHT.screen, hMax: HALF_HEIGHT.screen };
    case 'aperture': return { hMin: -HALF_HEIGHT.aperture, hMax: HALF_HEIGHT.aperture };
    case 'laser': return { hMin: -HALF_HEIGHT.laser, hMax: HALF_HEIGHT.laser };
    case 'led': return { hMin: -HALF_HEIGHT.led, hMax: HALF_HEIGHT.led };
    case 'wall': return { hMin: -AXIS_HEIGHT, hMax: (el.height ?? WALL_HEIGHT) - AXIS_HEIGHT };
    default: return {};
  }
}
/** Rough footprint radius, used to stop elements being placed on top of each other. */
export function footprint(el: ElementState): number {
  switch (el.kind) {
    case 'mirror':
    case 'splitter': return 0.35;
    case 'prism':
    case 'dprism': return 0.55;
    case 'dichroic':
    case 'slm': return 0.35;
    case 'filter':
    case 'grating':
    case 'polariser':
    case 'slits': return 0.3;
    case 'block':
    case 'wall': return Math.min(el.w ?? 1, el.h ?? 1) / 2;
    case 'target': return el.r ?? TARGET_RADIUS;
    case 'ring': return 0.2;
    case 'laser': return 0.45;
    case 'led':
    case 'object':
    case 'lens':
    case 'aperture':
    case 'screen': return 0.3;
  }
}
