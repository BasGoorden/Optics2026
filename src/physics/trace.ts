/**
 * 2D ray tracer for the table plane.
 *
 * The scene is a set of line segments (mirrors, absorbers, glass interfaces) and
 * circles (targets that absorb, sensors that the beam passes through).
 * Glass shapes must be convex and must not overlap; outside glass is air (n = 1).
 */
import { RefractiveIndex, fresnelReflectance, indexAt, reflect, refract } from './optics';
import { Vec2, add, cross, dot, scale, sub } from './vec';

export type SegmentKind = 'mirror' | 'absorber' | 'interface' | 'splitter';

export interface Segment {
  a: Vec2;
  b: Vec2;
  kind: SegmentKind;
  ownerId: string;
  /** For 'interface': unit normal pointing out of the glass. Otherwise any unit normal. */
  normal: Vec2;
  /** For 'interface': the glass material. */
  index?: RefractiveIndex;
  /** For 'splitter': fraction reflected (default 0.5). */
  reflectance?: number;
}

export interface Circle {
  c: Vec2;
  r: number;
  /** 'target' absorbs the beam; 'sensor' records the beam and lets it pass. */
  kind: 'target' | 'sensor';
  ownerId: string;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface OpticalScene {
  segments: Segment[];
  circles: Circle[];
  bounds: Bounds;
}

export interface BeamSource {
  origin: Vec2;
  /** Unit direction. */
  dir: Vec2;
  wavelength: number;
  intensity: number;
  ownerId: string;
}

export interface BeamSegment {
  from: Vec2;
  to: Vec2;
  wavelength: number;
  intensity: number;
  /** Refractive index of the medium this segment travels through. */
  n: number;
}

export type InteractionType = 'reflect' | 'refract' | 'tir' | 'split' | 'absorb' | 'target' | 'escape';

export interface Interaction {
  type: InteractionType;
  point: Vec2;
  ownerId: string | null;
  /** Beam intensity arriving here (1 = full laser power). */
  intensity: number;
  /** Unit normal on the incoming side of the surface (points against the incoming ray). */
  normal?: Vec2;
  /** Angle of incidence, radians from the normal. */
  thetaI?: number;
  /** Angle of refraction/reflection, radians from the normal. */
  thetaT?: number;
  n1?: number;
  n2?: number;
}

export interface TraceResult {
  segments: BeamSegment[];
  interactions: Interaction[];
  hitTargets: Set<string>;
  hitSensors: Set<string>;
}

const EPS = 1e-9;

/** Ray-segment intersection; returns distance t along the ray or null. */
export function intersectSegment(o: Vec2, d: Vec2, a: Vec2, b: Vec2): number | null {
  const e = sub(b, a);
  const denom = cross(d, e);
  if (Math.abs(denom) < EPS) return null;
  const ao = sub(a, o);
  const t = cross(ao, e) / denom;
  const u = cross(ao, d) / denom;
  if (t <= EPS || u < -1e-9 || u > 1 + 1e-9) return null;
  return t;
}

/** Ray-circle intersection; returns the nearest positive distance or null. */
export function intersectCircle(o: Vec2, d: Vec2, c: Vec2, r: number): number | null {
  const oc = sub(o, c);
  const b = dot(oc, d);
  const cc = dot(oc, oc) - r * r;
  const disc = b * b - cc;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const t1 = -b - s;
  if (t1 > EPS) return t1;
  const t2 = -b + s;
  return t2 > EPS ? t2 : null;
}

/** Does the segment p→q pass within r of c? */
function segmentTouchesCircle(p: Vec2, q: Vec2, c: Vec2, r: number): boolean {
  const pq = sub(q, p);
  const len2 = dot(pq, pq);
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(c, p), pq) / len2));
  const closest = add(p, scale(pq, t));
  const dx = closest.x - c.x;
  const dy = closest.y - c.y;
  return dx * dx + dy * dy <= r * r;
}

/** Distance along the ray to where it leaves the bounds. */
function exitDistance(o: Vec2, d: Vec2, b: Bounds): number {
  let t = Infinity;
  if (d.x > EPS) t = Math.min(t, (b.maxX - o.x) / d.x);
  if (d.x < -EPS) t = Math.min(t, (b.minX - o.x) / d.x);
  if (d.y > EPS) t = Math.min(t, (b.maxY - o.y) / d.y);
  if (d.y < -EPS) t = Math.min(t, (b.minY - o.y) / d.y);
  return Math.max(0, t);
}

export interface TraceOptions {
  /** Maximum surface interactions along one ray (stops infinite mirror loops). */
  maxInteractions?: number;
  /** Maximum beam segments in total, over all branches. */
  maxSegments?: number;
  /** Add weak Fresnel reflections at glass surfaces. */
  fresnel?: boolean;
  /** Branches weaker than this are not followed. */
  minIntensity?: number;
  /** Targets and sensors only count a beam at least this strong. */
  detectThreshold?: number;
}

interface Ray {
  o: Vec2;
  d: Vec2;
  /** Refractive index of the medium the ray is in. */
  n: number;
  intensity: number;
  wavelength: number;
  lastSeg: number;
  depth: number;
}

export function traceScene(
  scene: OpticalScene,
  sources: BeamSource[],
  options: TraceOptions = {},
): TraceResult {
  const maxInteractions = options.maxInteractions ?? 100;
  const maxSegments = options.maxSegments ?? 400;
  const fresnel = options.fresnel ?? true;
  const minIntensity = options.minIntensity ?? 0.02;
  const detect = options.detectThreshold ?? 0.1;
  const result: TraceResult = {
    segments: [],
    interactions: [],
    hitTargets: new Set(),
    hitSensors: new Set(),
  };

  // Main beams first (depth-first), so the strongest paths are traced before the limit.
  const queue: Ray[] = sources
    .map((s) => ({ o: s.origin, d: s.dir, n: 1, intensity: s.intensity, wavelength: s.wavelength, lastSeg: -1, depth: 0 }))
    .reverse();

  while (queue.length && result.segments.length < maxSegments) {
    const ray = queue.pop()!;
    let { o, d, n, intensity } = ray;
    let lastSeg = ray.lastSeg;
    const wl = ray.wavelength;
    const spawn = (r: Omit<Ray, 'wavelength'>) => {
      if (r.intensity >= minIntensity) queue.push({ ...r, wavelength: wl });
    };

    for (let step = ray.depth; step <= maxInteractions && result.segments.length < maxSegments; step++) {
      // Find the nearest thing the ray hits.
      let bestT = exitDistance(o, d, scene.bounds);
      let bestSeg = -1;
      let bestCircle = -1;

      scene.segments.forEach((s, i) => {
        if (i === lastSeg) return;
        const t = intersectSegment(o, d, s.a, s.b);
        if (t !== null && t < bestT) {
          bestT = t;
          bestSeg = i;
          bestCircle = -1;
        }
      });
      scene.circles.forEach((c, i) => {
        if (c.kind !== 'target') return;
        const t = intersectCircle(o, d, c.c, c.r);
        if (t !== null && t < bestT) {
          bestT = t;
          bestCircle = i;
          bestSeg = -1;
        }
      });

      const p = add(o, scale(d, bestT));
      result.segments.push({ from: o, to: p, wavelength: wl, intensity, n });

      if (intensity >= detect) {
        for (const c of scene.circles) {
          if (c.kind === 'sensor' && segmentTouchesCircle(o, p, c.c, c.r)) result.hitSensors.add(c.ownerId);
        }
      }

      if (bestCircle >= 0) {
        const c = scene.circles[bestCircle];
        if (intensity >= detect) result.hitTargets.add(c.ownerId);
        result.interactions.push({ type: 'target', point: p, ownerId: c.ownerId, intensity });
        break;
      }
      if (bestSeg < 0) {
        result.interactions.push({ type: 'escape', point: p, ownerId: null, intensity });
        break;
      }
      if (step === maxInteractions) break;

      const s = scene.segments[bestSeg];
      // Normal facing the incoming ray.
      const facing = dot(d, s.normal) < 0 ? s.normal : scale(s.normal, -1);
      const cosI = Math.min(1, -dot(d, facing));
      const thetaI = Math.acos(cosI);
      const base = { point: p, ownerId: s.ownerId, normal: facing, thetaI, intensity };

      if (s.kind === 'absorber') {
        result.interactions.push({ type: 'absorb', ...base });
        break;
      }

      if (s.kind === 'mirror') {
        d = reflect(d, facing);
        result.interactions.push({ type: 'reflect', ...base, thetaT: thetaI, n1: n, n2: n });
      } else if (s.kind === 'splitter') {
        // Thin half-silvered plate: part reflects, the rest goes straight on.
        const R = s.reflectance ?? 0.5;
        spawn({ o: p, d: reflect(d, facing), n, intensity: intensity * R, lastSeg: bestSeg, depth: step + 1 });
        result.interactions.push({ type: 'split', ...base, thetaT: thetaI, n1: n, n2: n });
        intensity *= 1 - R;
      } else {
        const glassN = indexAt(s.index ?? 1.5, wl);
        const entering = dot(d, s.normal) < 0;
        const n1 = n;
        const n2 = entering ? glassN : 1;
        const t = refract(d, facing, n1, n2);
        if (t === null) {
          d = reflect(d, facing);
          result.interactions.push({ type: 'tir', ...base, thetaT: thetaI, n1, n2 });
        } else {
          if (fresnel) {
            const R = fresnelReflectance(cosI, n1, n2);
            spawn({ o: p, d: reflect(d, facing), n: n1, intensity: intensity * R, lastSeg: bestSeg, depth: step + 1 });
            intensity *= 1 - R;
          }
          result.interactions.push({
            type: 'refract', ...base, thetaT: Math.acos(Math.min(1, -dot(t, facing))), n1, n2,
          });
          d = t;
          n = n2;
        }
      }
      o = p;
      lastSeg = bestSeg;
    }
  }
  return result;
}