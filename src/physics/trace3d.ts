/**
 * 3D ray tracer used only for *drawing* cones of light from LEDs and objects.
 *
 * Game goals are scored by the 2D tracer (trace.ts) in the plane of the optical axis. Every 2D
 * surface becomes a vertical surface here (lenses become round discs), so the in-plane rays of a
 * cone follow exactly the same paths as the 2D rays. Coordinates: x, y = table plane, h = height
 * relative to the optical axis.
 */
import { DEFAULT_ORDERS, gratingSin, inBand } from './colour';
import { indexAt } from './optics';
import type { Bounds, OpticalScene, Segment } from './trace';

export interface V3 {
  x: number;
  y: number;
  h: number;
}

export const v3 = (x: number, y: number, h: number): V3 => ({ x, y, h });
const add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, h: a.h + b.h });
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, h: a.h - b.h });
const scale = (a: V3, s: number): V3 => ({ x: a.x * s, y: a.y * s, h: a.h * s });
const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.h * b.h;
export const norm3 = (a: V3): V3 => scale(a, 1 / (Math.hypot(a.x, a.y, a.h) || 1));

export interface Source3 {
  origin: V3;
  dir: V3;
  wavelength: number;
  intensity: number;
}

export interface Segment3 {
  from: V3;
  to: V3;
  wavelength: number;
  intensity: number;
}

export interface Trace3Result {
  segments: Segment3[];
}

export interface Trace3Options {
  /** Height of the table surface relative to the axis (negative). Rays stop there. */
  floor: number;
  /** Rays stop above this height. */
  ceiling?: number;
  maxInteractions?: number;
  maxSegments?: number;
}

const EPS = 1e-9;

function reflect(d: V3, n: V3): V3 {
  return add(d, scale(n, -2 * dot(d, n)));
}

function refract(d: V3, n: V3, n1: number, n2: number): V3 | null {
  const eta = n1 / n2;
  const cosI = -dot(d, n);
  const k = 1 - eta * eta * (1 - cosI * cosI);
  if (k < 0) return null;
  return add(scale(d, eta), scale(n, eta * cosI - Math.sqrt(k)));
}

/** Distance to where the ray leaves the table area (x/y bounds, floor or ceiling). */
function exitDistance(o: V3, d: V3, b: Bounds, floor: number, ceiling: number): number {
  let t = Infinity;
  if (d.x > EPS) t = Math.min(t, (b.maxX - o.x) / d.x);
  if (d.x < -EPS) t = Math.min(t, (b.minX - o.x) / d.x);
  if (d.y > EPS) t = Math.min(t, (b.maxY - o.y) / d.y);
  if (d.y < -EPS) t = Math.min(t, (b.minY - o.y) / d.y);
  if (d.h < -EPS) t = Math.min(t, (floor - o.h) / d.h);
  if (d.h > EPS) t = Math.min(t, (ceiling - o.h) / d.h);
  return Math.max(0, t);
}

/** Intersection of a ray with the vertical surface built on segment s, or null. */
function hitSurface(o: V3, d: V3, s: Segment): number | null {
  const ex = s.b.x - s.a.x;
  const ey = s.b.y - s.a.y;
  // Plane normal (horizontal): perpendicular to the segment.
  const nx = -ey;
  const ny = ex;
  const denom = d.x * nx + d.y * ny;
  if (Math.abs(denom) < EPS) return null;
  const t = ((s.a.x - o.x) * nx + (s.a.y - o.y) * ny) / denom;
  if (t <= 1e-7) return null;
  const px = o.x + d.x * t;
  const py = o.y + d.y * t;
  const ph = o.h + d.h * t;
  const len2 = ex * ex + ey * ey;
  const u = ((px - s.a.x) * ex + (py - s.a.y) * ey) / len2;
  if (u < -1e-9 || u > 1 + 1e-9) return null;
  if (s.disk !== undefined) {
    const lateral = (u - 0.5) * Math.sqrt(len2);
    if (lateral * lateral + ph * ph > s.disk * s.disk) return null;
  } else if (ph < (s.hMin ?? -0.5) || ph > (s.hMax ?? 0.5)) {
    return null;
  }
  return t;
}

function hitSphere(o: V3, d: V3, c: V3, r: number): number | null {
  const oc = sub(o, c);
  const b = dot(oc, d);
  const disc = b * b - (dot(oc, oc) - r * r);
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  if (-b - s > EPS) return -b - s;
  return -b + s > EPS ? -b + s : null;
}

/** Ideal thin lens in 3D: slopes change by −(offset)/f in both directions across the lens. */
function thinLens3(d: V3, p: V3, s: Segment): V3 {
  const ex = s.b.x - s.a.x;
  const ey = s.b.y - s.a.y;
  const L = Math.hypot(ex, ey);
  const t = v3(ex / L, ey / L, 0);
  let axis = v3(s.normal.x, s.normal.y, 0);
  if (dot(d, axis) < 0) axis = scale(axis, -1);
  const c = v3((s.a.x + s.b.x) / 2, (s.a.y + s.b.y) / 2, 0);
  const off = sub(p, c);
  const hu = dot(off, t);
  const hv = off.h;
  const da = dot(d, axis);
  const f = s.focal ?? 1;
  const su = dot(d, t) / da - hu / f;
  const sv = d.h / da - hv / f;
  return norm3(add(axis, add(scale(t, su), v3(0, 0, sv))));
}

interface Ray3 {
  o: V3;
  d: V3;
  n: number;
  intensity: number;
  wavelength: number;
  lastSeg: number;
  depth: number;
}

export function trace3d(scene: OpticalScene, sources: Source3[], opts: Trace3Options): Trace3Result {
  const ceiling = opts.ceiling ?? 4;
  const maxInteractions = opts.maxInteractions ?? 40;
  const maxSegments = opts.maxSegments ?? 8000;
  const result: Trace3Result = { segments: [] };
  const targets = scene.circles.filter((c) => c.kind === 'target');
  const queue: Ray3[] = sources.map((s) => ({
    o: s.origin, d: norm3(s.dir), n: 1, intensity: s.intensity, wavelength: s.wavelength, lastSeg: -1, depth: 0,
  }));

  while (queue.length && result.segments.length < maxSegments) {
    const ray = queue.pop()!;
    let { o, d, n, intensity } = ray;
    let lastSeg = ray.lastSeg;
    for (let step = ray.depth; step <= maxInteractions; step++) {
      let bestT = exitDistance(o, d, scene.bounds, opts.floor, ceiling);
      let bestSeg = -1;
      let hitTarget = false;
      scene.segments.forEach((s, i) => {
        if (i === lastSeg) return;
        const t = hitSurface(o, d, s);
        if (t !== null && t < bestT) {
          bestT = t;
          bestSeg = i;
          hitTarget = false;
        }
      });
      for (const c of targets) {
        const t = hitSphere(o, d, v3(c.c.x, c.c.y, 0), c.r);
        if (t !== null && t < bestT) {
          bestT = t;
          bestSeg = -1;
          hitTarget = true;
        }
      }
      const p = add(o, scale(d, bestT));
      result.segments.push({ from: o, to: p, wavelength: ray.wavelength, intensity });
      if (hitTarget || bestSeg < 0 || step === maxInteractions) break;

      const s = scene.segments[bestSeg];
      const n2d = v3(s.normal.x, s.normal.y, 0);
      const facing = dot(d, n2d) < 0 ? n2d : scale(n2d, -1);
      if (s.kind === 'absorber' || s.kind === 'screen') break;
      if (s.kind === 'mirror') {
        d = reflect(d, facing);
      } else if (s.kind === 'splitter') {
        const R = s.reflectance ?? 0.5;
        queue.push({ o: p, d: reflect(d, facing), n, intensity: intensity * R, wavelength: ray.wavelength, lastSeg: bestSeg, depth: step + 1 });
        intensity *= 1 - R;
      } else if (s.kind === 'lens') {
        d = thinLens3(d, p, s);
      } else if (s.kind === 'filter') {
        if (!(s.band && inBand(ray.wavelength, s.band))) break;
      } else if (s.kind === 'dichroic') {
        if (s.band && inBand(ray.wavelength, s.band)) d = reflect(d, facing);
      } else if (s.kind === 'polariser') {
        intensity *= 0.5; // drawing only: cones come from unpolarised sources
      } else if (s.kind === 'slits') {
        // pass straight through the opening
      } else if (s.kind === 'slm' || s.kind === 'grating') {
        if (s.kind === 'slm') d = reflect(d, facing);
        // 3D grating: only the component across the lines changes (by mλ/d); the height component is kept.
        const ex = s.b.x - s.a.x;
        const ey = s.b.y - s.a.y;
        const L = Math.hypot(ex, ey);
        const t = v3(ex / L, ey / L, 0);
        const axis = dot(d, n2d) >= 0 ? n2d : scale(n2d, -1);
        const st = dot(d, t);
        // The first existing order continues this ray; the others are spawned as new rays.
        const outs: { dir: V3; eff: number }[] = [];
        for (const o of s.orders ?? DEFAULT_ORDERS) {
          const sm = gratingSin(st, o.m, ray.wavelength, s.period ?? 2);
          if (sm === null) continue;
          const ax2 = 1 - sm * sm - d.h * d.h;
          if (ax2 <= 0) continue;
          outs.push({ dir: norm3(add(add(scale(axis, Math.sqrt(ax2)), scale(t, sm)), v3(0, 0, d.h))), eff: o.eff });
        }
        if (!outs.length) break;
        for (const o of outs.slice(1)) {
          queue.push({ o: p, d: o.dir, n, intensity: intensity * o.eff, wavelength: ray.wavelength, lastSeg: bestSeg, depth: step + 1 });
        }
        d = outs[0].dir;
        intensity *= outs[0].eff;
      } else {
        const glassN = indexAt(s.index ?? 1.5, ray.wavelength);
        const entering = dot(d, n2d) < 0;
        const n1 = n;
        const n2 = entering ? glassN : 1;
        const t = refract(d, facing, n1, n2);
        if (t === null) d = reflect(d, facing);
        else {
          d = norm3(t);
          n = n2;
        }
      }
      o = p;
      lastSeg = bestSeg;
    }
  }
  return result;
}

/**
 * Directions filling a cone of half-angle `spread` (degrees) around `axisDeg` in the table plane,
 * on rings of equal angular spacing (always including the axis and the in-plane edge rays).
 */
export function coneDirections(axisDeg: number, spread: number, rings = 4): V3[] {
  const a = (axisDeg * Math.PI) / 180;
  const axis = v3(Math.cos(a), Math.sin(a), 0);
  const side = v3(-Math.sin(a), Math.cos(a), 0);
  const up = v3(0, 0, 1);
  const out: V3[] = [axis];
  for (let k = 1; k <= rings; k++) {
    const th = ((spread * Math.PI) / 180) * (k / rings);
    const count = 6 * k;
    for (let j = 0; j < count; j++) {
      const ph = (2 * Math.PI * j) / count;
      const lat = add(scale(side, Math.cos(ph)), scale(up, Math.sin(ph)));
      out.push(norm3(add(scale(axis, Math.cos(th)), scale(lat, Math.sin(th)))));
    }
  }
  return out;
}
