/** Colour helpers: wavelength bands, white light, and colour-aware detectors. Pure TypeScript. */

/** A wavelength band [from, to] in nm. */
export type Band = [number, number];

/** Wavelengths used for "white" light (blue → red). */
export const WHITE: number[] = [450, 490, 530, 570, 610, 650];

export const inBand = (wl: number, b: Band): boolean => wl >= b[0] && wl <= b[1];

/** Common colour bands. */
export const BANDS = {
  blue: [430, 480] as Band,
  cyan: [480, 510] as Band,
  green: [510, 550] as Band,
  yellow: [560, 590] as Band,
  orange: [590, 620] as Band,
  red: [620, 700] as Band,
};

/** Human name for a band, by its centre wavelength. */
export function bandName(b: Band): string {
  const c = (b[0] + b[1]) / 2;
  if (c < 480) return 'blue';
  if (c < 510) return 'cyan';
  if (c < 560) return 'green';
  if (c < 590) return 'yellow';
  if (c < 620) return 'orange';
  return 'red';
}

/** What a colour receiver needs: power in each listed band, and (almost) nothing in the forbidden bands. */
export interface ColourNeeds {
  needs?: { band: Band; min: number }[];
  forbid?: Band[];
  minPower?: number;
}

/** Largest stray power allowed in a forbidden band. */
export const FORBID_LIMIT = 0.01;

/** Is a receiver lit, given the power it received per wavelength? */
export function receiverLit(c: ColourNeeds, perWl: Map<number, number> | undefined, defaultMin: number): boolean {
  const entries = [...(perWl ?? new Map()).entries()];
  const total = entries.reduce((s, [, p]) => s + p, 0);
  const inB = (b: Band) => entries.filter(([wl]) => inBand(wl, b)).reduce((s, [, p]) => s + p, 0);
  if (c.forbid?.some((b) => inB(b) > FORBID_LIMIT)) return false;
  if (c.needs?.length) return c.needs.every((n) => inB(n.band) >= n.min - 1e-9);
  return total >= (c.minPower ?? defaultMin) - 1e-9;
}

/** Diffraction orders of a grating: order m and the fraction of the light that goes into it. */
export const DEFAULT_ORDERS = [
  { m: 0, eff: 0.2 },
  { m: 1, eff: 0.3 },
  { m: -1, eff: 0.3 },
  { m: 2, eff: 0.1 },
  { m: -2, eff: 0.1 },
];

/**
 * Grating equation for the component along the grating: sin θₘ = sin θᵢ + m·λ/d.
 * Returns null if the order does not exist (|sin θₘ| > 1).
 */
export function gratingSin(sinIn: number, m: number, wavelengthNm: number, periodUm: number): number | null {
  const s = sinIn + (m * wavelengthNm) / 1000 / periodUm;
  return Math.abs(s) >= 1 ? null : s;
}
