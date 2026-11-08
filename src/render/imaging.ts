/**
 * 3D views for the imaging elements: lenses, LEDs, illuminated objects, screens and apertures.
 */
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  ElementState, LED_SIZE, LENS_LENGTH, OBJECT_HEIGHT, OBJECT_POINTS, SCREEN_LENGTH,
} from '../game/elements';
import type { ImageResult } from '../game/level';
import type { ScreenHit } from '../physics/trace';
import { BEAM_HEIGHT, PALETTE, wavelengthToColor } from './color';
import type { Quality } from './stage';


const metal = () => new THREE.MeshStandardMaterial({ color: '#4a5878', metalness: 0.75, roughness: 0.3 });
const glow = (c: THREE.Color, k = 2) => new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(k), toneMapped: false });

function extrude(points: { x: number; y: number }[], height: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, p.y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  return g;
}

function fixedColor(el: ElementState): THREE.Color {
  return !el.movable && !el.placed ? PALETTE.amber : PALETTE.cyan;
}

function foot(color: THREE.Color, w: number): THREE.Group {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, w), metal());
  plate.position.y = 0.03;
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.015, w + 0.02), glow(color, 1.6));
  strip.position.y = 0.065;
  g.add(plate, strip);
  return g;
}

/** Outline of a thin lens in local coordinates (axis = +x, lens along y). */
export function lensOutline(len: number, focal: number): { x: number; y: number }[] {
  const n = 16;
  const pts: { x: number; y: number }[] = [];
  const thick = 0.24;
  const edge = 0.05;
  // Stronger lenses (small |f|) look more curved.
  const k = Math.min(1.4, 2 / Math.max(0.8, Math.abs(focal)));
  const half = (y: number) => {
    const u = (2 * y) / len;
    return focal > 0 ? edge + (thick - edge) * k * (1 - u * u) * 0.8 + 0.01 : edge + (thick - edge) * k * u * u * 0.8;
  };
  for (let i = 0; i <= n; i++) {
    const y = -len / 2 + (len * i) / n;
    pts.push({ x: half(y), y });
  }
  for (let i = n; i >= 0; i--) {
    const y = -len / 2 + (len * i) / n;
    pts.push({ x: -half(y), y });
  }
  return pts;
}

export function buildLens(el: ElementState, quality: Quality): THREE.Group {
  const g = new THREE.Group();
  const len = el.len ?? LENS_LENGTH;
  const f = el.focal ?? 2;
  const geo = extrude(lensOutline(len, f), 0.62);
  const mat = quality === 'low'
    ? new THREE.MeshStandardMaterial({ color: '#9feaff', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false })
    : new THREE.MeshPhysicalMaterial({
      color: '#d8f6ff', roughness: 0.03, transmission: 1, thickness: 0.3, ior: 1.5, transparent: true, envMapIntensity: 1.6,
    });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.06;
  mesh.renderOrder = 2;
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 30),
    new THREE.LineBasicMaterial({ color: (f > 0 ? PALETTE.cyan : PALETTE.magenta).clone().multiplyScalar(1.4), toneMapped: false }),
  );
  edges.position.y = 0.06;
  // Clamps at both ends.
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.7, 0.08), metal());
    c.position.set(0, 0.36, -s * (len / 2 + 0.03));
    g.add(c);
  }
  g.add(mesh, edges, foot(fixedColor(el), len + 0.1));

  // Focal points F on both sides of the lens (on the table, along the axis).
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), glow(PALETTE.magenta, 1.8));
    m.position.set(s * f, 0.05, 0);
    g.add(m);
    const div = document.createElement('div');
    div.className = 'focal-label';
    div.textContent = 'F';
    const label = new CSS2DObject(div);
    label.position.set(s * f, 0.25, 0);
    g.add(label);
  }
  return g;
}

export function buildLed(el: ElementState): THREE.Group {
  const g = new THREE.Group();
  const color = wavelengthToColor(el.wavelength ?? 532);
  const body = new THREE.Mesh(new THREE.BoxGeometry(LED_SIZE, 0.36, LED_SIZE), metal());
  body.position.y = BEAM_HEIGHT - 0.05;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    glow(color, 3),
  );
  dome.rotation.z = -Math.PI / 2;
  dome.position.set(LED_SIZE / 2, BEAM_HEIGHT, 0);
  const light = new THREE.PointLight(color, 2, 2.5);
  light.position.set(LED_SIZE / 2 + 0.2, BEAM_HEIGHT, 0);
  g.add(body, dome, light);
  return g;
}

/** An illuminated arrow lying across the table (its "height" is along local y). */
export function buildObject(el: ElementState): THREE.Group {
  const g = new THREE.Group();
  const H = el.len ?? OBJECT_HEIGHT;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, H - 0.2), glow(new THREE.Color('#ffffff'), 1.6));
  shaft.position.set(0, BEAM_HEIGHT, 0.1);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 16), glow(new THREE.Color('#ffffff'), 1.6));
  head.rotation.x = -Math.PI / 2;
  head.position.set(0, BEAM_HEIGHT, -H / 2 + 0.11);
  g.add(shaft, head);
  for (const pt of OBJECT_POINTS) {
    const c = wavelengthToColor(pt.wl);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glow(c, 3));
    dot.position.set(0.04, BEAM_HEIGHT, -pt.f * H);
    g.add(dot);
  }
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, BEAM_HEIGHT, 8), metal());
    post.position.set(0, BEAM_HEIGHT / 2, (s * H) / 3);
    g.add(post);
  }
  g.add(foot(fixedColor(el), H * 0.8));
  return g;
}

export function buildAperture(el: ElementState): THREE.Group {
  const g = new THREE.Group();
  const len = el.len ?? SCREEN_LENGTH;
  const gap = el.gap ?? 0.2;
  const part = (len - gap) / 2;
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, part), new THREE.MeshStandardMaterial({ color: '#1a1f2c', metalness: 0.6, roughness: 0.5 }));
    p.position.set(0, 0.4, -s * (gap / 2 + part / 2));
    p.castShadow = true;
    g.add(p);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.7, 0.02), glow(PALETTE.gold, 1.5));
    rim.position.set(0, 0.4, -s * (gap / 2 + 0.01));
    g.add(rim);
  }
  g.add(foot(fixedColor(el), len));
  return g;
}

/** Screen: a frosted panel that shows coloured spots where rays land, and the image once it's sharp. */
export function buildScreen(el: ElementState): { group: THREE.Group; show(hits: ScreenHit[], image?: ImageResult): void } {
  const g = new THREE.Group();
  const len = el.len ?? SCREEN_LENGTH;
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.8, len),
    new THREE.MeshStandardMaterial({ color: '#cfd9e6', roughness: 0.95, metalness: 0, emissive: '#1a2230' }),
  );
  panel.position.y = 0.45;
  panel.receiveShadow = true;
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.06, 0.82, len + 0.02)),
    new THREE.LineBasicMaterial({ color: PALETTE.cyan.clone().multiplyScalar(1.3), toneMapped: false }),
  );
  frame.position.y = 0.45;
  g.add(panel, frame, foot(fixedColor(el), len));

  const spots = new THREE.Group();
  g.add(spots);
  const tex = spotTexture();
  const imageArrow = new THREE.Group();
  g.add(imageArrow);

  return {
    group: g,
    show(hits, image) {
      spots.clear();
      imageArrow.clear();
      g.updateMatrixWorld();
      for (const h of hits) {
        // Spots on whichever face the light hits.
        const local = g.worldToLocal(new THREE.Vector3(h.point.x, BEAM_HEIGHT, -h.point.y));
        const side = Math.sign(local.x) || -1;
        const c = wavelengthToColor(h.wavelength);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: tex, color: c.multiplyScalar(1.5 + 4 * Math.min(1, h.intensity * 6)), blending: THREE.AdditiveBlending,
          depthWrite: false, toneMapped: false, transparent: true,
        }));
        sp.position.set(side * 0.035, BEAM_HEIGHT, local.z);
        sp.scale.setScalar(0.16);
        spots.add(sp);
      }
      if (image?.sharp) {
        const base = image.spots.find((s) => s.point === 'base');
        const tip = image.spots.find((s) => s.point === 'tip');
        if (base && tip) {
          // Draw the formed image as a glowing arrow on the screen (pos is measured along local +y → world -z).
          const side = hits.length ? Math.sign(g.worldToLocal(new THREE.Vector3(hits[0].point.x, 0, -hits[0].point.y)).x) || -1 : -1;
          const z0 = -base.pos;
          const z1 = -tip.pos;
          const lenA = Math.abs(z1 - z0);
          const dir = Math.sign(z1 - z0) || 1;
          const mat = glow(PALETTE.green, 2.2);
          const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, Math.max(0.01, lenA - 0.12)), mat);
          shaft.position.set(side * 0.045, BEAM_HEIGHT + 0.18, (z0 + z1) / 2 - dir * 0.06);
          const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 12), mat);
          head.rotation.x = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          head.position.set(side * 0.045, BEAM_HEIGHT + 0.18, z1 - dir * 0.07);
          imageArrow.add(shaft, head);
        }
      }
    },
  };
}

function spotTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d')!;
  const gr = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

