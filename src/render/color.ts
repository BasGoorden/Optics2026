import * as THREE from 'three';

/** Approximate visible-spectrum colour for a wavelength in nm (380–780). */
export function wavelengthToColor(nm: number): THREE.Color {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm <= 780) { r = 1; }
  // Fade at the edges of human vision.
  let f = 1;
  if (nm < 420) f = 0.3 + (0.7 * (nm - 380)) / 40;
  else if (nm > 700) f = 0.3 + (0.7 * (780 - nm)) / 80;
  return new THREE.Color(r * f, g * f, b * f);
}

/** Converts physics table coordinates to world space (y on the table maps to -z). */
export function tableToWorld(x: number, y: number, height = 0): THREE.Vector3 {
  return new THREE.Vector3(x, height, -y);
}

export const BEAM_HEIGHT = 0.35;

export const PALETTE = {
  cyan: new THREE.Color('#38e8ff'),
  magenta: new THREE.Color('#ff3df2'),
  amber: new THREE.Color('#ffae3d'),
  green: new THREE.Color('#4dff9a'),
  red: new THREE.Color('#ff4d6a'),
  gold: new THREE.Color('#ffd84d'),
};
