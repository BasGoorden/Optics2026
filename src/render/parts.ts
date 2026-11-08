/**
 * Shared "lab hardware" for element models: materials and Thorlabs-style mounting parts
 * (base plate, post holder, steel post), simplified for the game.
 */
import * as THREE from 'three';
import { PALETTE } from './color';

let cache: Record<string, THREE.Material> | null = null;

/** Shared materials (do not modify per element). */
export function mats() {
  cache ??= {
    anodized: new THREE.MeshStandardMaterial({ color: '#16181d', metalness: 0.55, roughness: 0.42 }),
    anodizedLight: new THREE.MeshStandardMaterial({ color: '#2a2e37', metalness: 0.5, roughness: 0.45 }),
    steel: new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 1, roughness: 0.22 }),
    steelDark: new THREE.MeshStandardMaterial({ color: '#7d838d', metalness: 1, roughness: 0.3 }),
    mirror: new THREE.MeshStandardMaterial({ color: '#eef6ff', metalness: 1, roughness: 0.02, envMapIntensity: 2.4 }),
    card: new THREE.MeshStandardMaterial({ color: '#e9edf2', roughness: 0.95, metalness: 0, emissive: '#20262f' }),
    warning: new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: 0.5, metalness: 0.1 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#0b0c0e', roughness: 0.85, metalness: 0 }),
  };
  return cache as {
    anodized: THREE.MeshStandardMaterial;
    anodizedLight: THREE.MeshStandardMaterial;
    steel: THREE.MeshStandardMaterial;
    steelDark: THREE.MeshStandardMaterial;
    mirror: THREE.MeshStandardMaterial;
    card: THREE.MeshStandardMaterial;
    warning: THREE.MeshStandardMaterial;
    rubber: THREE.MeshStandardMaterial;
  };
}

export const glow = (c: THREE.Color, k = 2) =>
  new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(k), toneMapped: false });

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Indicator colour: cyan = the player can move it, amber = bolted down. */
export function indicatorColor(movable: boolean): THREE.Color {
  return movable ? PALETTE.cyan : PALETTE.amber;
}

/**
 * Post assembly standing on the table: base plate, post holder with thumbscrew, steel post up to `top`,
 * and a glowing indicator ring around the holder foot (used for hover feedback too).
 */
export function post(top: number, color: THREE.Color, x = 0, z = 0): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  // Base plate with a slot, like a BA1 base.
  g.add(mesh(new THREE.BoxGeometry(0.26, 0.035, 0.46), M.anodized, 0, 0.018, 0));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.038, 0.28), M.rubber, 0, 0.02, 0));
  // Post holder.
  const holderH = Math.min(0.18, Math.max(0.06, top - 0.1));
  g.add(mesh(new THREE.CylinderGeometry(0.075, 0.08, holderH, 20), M.anodized, 0, 0.035 + holderH / 2, 0));
  const screw = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.07, 10), M.anodizedLight, 0.1, 0.035 + holderH * 0.7, 0);
  screw.rotation.z = Math.PI / 2;
  g.add(screw);
  // Steel post.
  const postBottom = 0.035 + holderH * 0.4;
  if (top > postBottom) {
    g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, top - postBottom, 16), M.steel, 0, (top + postBottom) / 2, 0));
  }
  // Indicator ring.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 40), glow(color, 1.6));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.045;
  ring.userData.indicator = true;
  g.add(ring);
  return g;
}

/** A small knurled adjuster knob pointing along local -z (behind a mount). */
export function knob(x: number, y: number, z: number): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const shaft = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), M.steelDark, 0, 0, 0);
  shaft.rotation.x = Math.PI / 2;
  const head = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 14), M.anodized, 0, 0, -0.07);
  head.rotation.x = Math.PI / 2;
  g.add(shaft, head);
  g.position.set(x, y, z);
  return g;
}

/** Breadboard top texture: black anodised surface with a tapped-hole grid every `pitch` units. */
export function breadboardTexture(widthUnits: number, depthUnits: number, pitch = 0.5): THREE.CanvasTexture {
  const px = 64;
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#15171c';
  ctx.fillRect(0, 0, px, px);
  // Subtle brushed noise.
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`;
    ctx.fillRect(Math.random() * px, Math.random() * px, Math.random() * 20, 1);
  }
  // Hole at the cell centre (corners of the cell are grid points: hole drawn at the corner via 4 quarters).
  const r = px * 0.13;
  for (const [cx, cy] of [[0, 0], [px, 0], [0, px], [px, px]]) {
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.4);
    gr.addColorStop(0, '#020203');
    gr.addColorStop(0.7, '#050608');
    gr.addColorStop(0.72, '#3a3f49');
    gr.addColorStop(1, 'rgba(21,23,28,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(widthUnits / pitch, depthUnits / pitch);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
