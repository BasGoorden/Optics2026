/**
 * Core optics laws. Pure functions, no rendering.
 *
 * Conventions: `d` is the unit direction of the incoming ray, `n` is the unit
 * surface normal pointing *against* the incoming ray (dot(d, n) < 0).
 */
import { Vec2, add, dot, scale } from './vec';

/** Law of reflection: angle of incidence = angle of reflection. */
export function reflect(d: Vec2, n: Vec2): Vec2 {
  return add(d, scale(n, -2 * dot(d, n)));
}

/**
 * Snell's law in vector form: n1 sin θ1 = n2 sin θ2.
 * Returns the refracted unit direction, or null on total internal reflection.
 */
export function refract(d: Vec2, n: Vec2, n1: number, n2: number): Vec2 | null {
  const eta = n1 / n2;
  const cosI = -dot(d, n);
  const k = 1 - eta * eta * (1 - cosI * cosI);
  if (k < 0) return null;
  return add(scale(d, eta), scale(n, eta * cosI - Math.sqrt(k)));
}

/** Refraction angle (radians) for incidence angle θ1, or null for total internal reflection. */
export function snellAngle(theta1: number, n1: number, n2: number): number | null {
  const s = (n1 / n2) * Math.sin(theta1);
  return Math.abs(s) > 1 ? null : Math.asin(s);
}

/** Critical angle (radians) going from n1 into n2, or null if none exists (n1 <= n2). */
export function criticalAngle(n1: number, n2: number): number | null {
  return n1 <= n2 ? null : Math.asin(n2 / n1);
}

/** Fresnel reflectance for unpolarised light. `cosI` = cos of incidence angle. */
export function fresnelReflectance(cosI: number, n1: number, n2: number): number {
  const sinT = (n1 / n2) * Math.sqrt(Math.max(0, 1 - cosI * cosI));
  if (sinT >= 1) return 1;
  const cosT = Math.sqrt(1 - sinT * sinT);
  const rs = (n1 * cosI - n2 * cosT) / (n1 * cosI + n2 * cosT);
  const rp = (n1 * cosT - n2 * cosI) / (n1 * cosT + n2 * cosI);
  return (rs * rs + rp * rp) / 2;
}

/** A material's refractive index: constant, or Cauchy's equation n(λ) = A + B/λ² (λ in µm). */
export type RefractiveIndex = number | { A: number; B: number };

export function indexAt(index: RefractiveIndex, wavelengthNm: number): number {
  if (typeof index === 'number') return index;
  const um = wavelengthNm / 1000;
  return index.A + index.B / (um * um);
}
