/**
 * 3D models for the imaging elements (lenses, LEDs, illuminated objects, screens, pinhole plates),
 * in the same simplified lab-hardware style as render/elements.ts.
 */
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  ElementState, LED_SIZE, LENS_LENGTH, OBJECT_HEIGHT, OBJECT_POINTS, SCREEN_LENGTH,
} from '../game/elements';
import type { ImageResult } from '../game/level';
import type { ScreenHit } from '../physics/trace';
import { BEAM_HEIGHT, PALETTE, wavelengthToColor } from './color';
import { glow, indicatorColor, mats, mesh, post } from './parts';
import type { Quality } from './stage';

const Y = BEAM_HEIGHT;
const movable = (el: ElementState) => !!el.movable || !!el.placed;

/** Half-thickness of a lens at distance r from its centre (stronger lenses look more curved). */
function lensHalfThickness(r: number, R: number, focal: number): number {
  const thick = 0.13;
  const edge = 0.025;
  const k = Math.min(1.5, 2 / Math.max(0.8, Math.abs(focal)));
  const u = r / R;
  return focal > 0 ? edge + (thick - edge) * k * (1 - u * u) * 0.8 + 0.005 : edge + (thick - edge) * k * u * u * 0.8;
}

/** Round lens (biconvex or biconcave) in a round lens mount on a post. */
export function buildLens(el: ElementState, quality: Quality): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const R = (el.len ?? LENS_LENGTH) / 2;
  const f = el.focal ?? 2;
  // Lathe profile (radius, axial position), turned around the lens axis.
  const n = 20;
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) prof.push(new THREE.Vector2((R * i) / n, -lensHalfThickness((R * i) / n, R, f)));
  for (let i = n; i >= 0; i--) prof.push(new THREE.Vector2((R * i) / n, lensHalfThickness((R * i) / n, R, f)));
  const geo = new THREE.LatheGeometry(prof, 64);
  geo.rotateZ(-Math.PI / 2); // lathe axis (y) → local x = optical axis
  const mat = quality === 'low'
    ? new THREE.MeshStandardMaterial({ color: '#9feaff', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false })
    : new THREE.MeshPhysicalMaterial({
      color: '#e8faff', roughness: 0.02, transmission: 1, thickness: 0.25, ior: 1.5, transparent: true, envMapIntensity: 2,
      side: THREE.DoubleSide,
    });
  const glass = new THREE.Mesh(geo, mat);
  glass.position.y = Y;
  glass.renderOrder = 2;
  g.add(glass);
  // Subtle bright rim so the lens edge reads well against the dark lab.
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(R, 0.008, 6, 64),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#bff2ff').multiplyScalar(1.2), toneMapped: false, transparent: true, opacity: 0.8 }),
  );
  rim.rotation.y = Math.PI / 2;
  rim.position.y = Y;
  g.add(rim);

  // Round lens mount: an anodised ring around the edge, with a steel retaining ring and a top screw.
  const ringW = 0.09;
  const depth = 0.16;
  const ringProfile = [
    new THREE.Vector2(R, -depth / 2), new THREE.Vector2(R + ringW, -depth / 2),
    new THREE.Vector2(R + ringW, depth / 2), new THREE.Vector2(R, depth / 2), new THREE.Vector2(R, -depth / 2),
  ];
  const ringGeo = new THREE.LatheGeometry(ringProfile, 64);
  ringGeo.rotateZ(-Math.PI / 2);
  g.add(mesh(ringGeo, M.anodized, 0, Y, 0));
  const retain = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.012, 6, 64), M.steel);
  retain.rotation.y = Math.PI / 2;
  retain.position.set(depth / 2 + 0.005, Y, 0);
  g.add(retain);
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 10), M.steel, 0, Y + R + ringW + 0.03, 0));
  // + or − tag on top of the ring.
  const tag = new THREE.Mesh(new THREE.BoxGeometry(depth + 0.01, 0.02, 0.12), glow(f > 0 ? PALETTE.cyan : PALETTE.magenta, 1.4));
  tag.position.set(0, Y + R + ringW + 0.005, -0.12);
  g.add(tag);
  // Stub that joins the ring to the post.
  g.add(mesh(new THREE.BoxGeometry(depth, 0.08, 0.16), M.anodized, 0, Y - R - ringW - 0.03, 0));
  g.add(post(Y - R - ringW - 0.07, indicatorColor(movable(el))));
  // Focal points F on both sides of the lens (on the table, along the axis).
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), glow(PALETTE.magenta, 1.8));
    m.position.set(s * f, 0.06, 0);
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

/** Mounted LED: finned heat sink, collimation tube and a glowing emitter. */
export function buildLed(el: ElementState): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const color = wavelengthToColor(el.wavelength ?? 532);
  const L = LED_SIZE;
  const body = mesh(new THREE.CylinderGeometry(0.12, 0.12, L * 0.9, 20), M.anodized, -0.02, Y, 0);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  for (let i = 0; i < 5; i++) {
    const fin = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.018, 24), M.anodizedLight, -L / 2 + 0.04 + i * 0.05, Y, 0);
    fin.rotation.z = Math.PI / 2;
    g.add(fin);
  }
  const nose = mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.08, 20), M.steel, L / 2 - 0.02, Y, 0);
  nose.rotation.z = Math.PI / 2;
  const emitter = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), glow(color, 3.5));
  emitter.rotation.y = Math.PI / 2;
  emitter.position.set(L / 2 + 0.021, Y, 0);
  const cable = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), M.rubber, -L / 2 - 0.05, Y - 0.12, 0);
  cable.rotation.z = 0.6;
  const light = new THREE.PointLight(color, 2, 2.5);
  light.position.set(L / 2 + 0.2, Y, 0);
  g.add(nose, emitter, cable, light, post(Y - 0.17, indicatorColor(movable(el))));
  return g;
}

/** Back-lit target slide: a black frame holding a glowing arrow (its "height" lies along local y). */
export function buildObject(el: ElementState): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const H = el.len ?? OBJECT_HEIGHT;
  const frameH = 0.5;
  // Frame (open window), plate thickness along x.
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.06, H + 0.3), M.anodized, -0.03, Y + frameH / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.06, H + 0.3), M.anodized, -0.03, Y - frameH / 2, 0));
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.06, frameH + 0.06, 0.06), M.anodized, -0.03, Y, s * (H / 2 + 0.12)));
  // Diffuser behind the arrow.
  const diffuser = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, frameH - 0.04, H + 0.2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#9fb6d6').multiplyScalar(0.5), toneMapped: false }),
  );
  diffuser.position.set(-0.05, Y, 0);
  g.add(diffuser);
  // The arrow itself.
  const white = glow(new THREE.Color('#ffffff'), 1.6);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, H - 0.2), white);
  shaft.position.set(0, Y, 0.1);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 16), white);
  head.rotation.x = -Math.PI / 2;
  head.position.set(0, Y, -H / 2 + 0.11);
  g.add(shaft, head);
  for (const pt of OBJECT_POINTS) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), glow(wavelengthToColor(pt.wl), 3));
    dot.position.set(0.035, Y, -pt.f * H);
    g.add(dot);
  }
  g.add(post(Y - frameH / 2 - 0.03, indicatorColor(movable(el))));
  return g;
}

/** Slit / pinhole plate: a black plate with a gold-edged opening, on two posts. */
export function buildAperture(el: ElementState): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const len = el.len ?? SCREEN_LENGTH;
  const gap = el.gap ?? 0.2;
  const part = (len - gap) / 2;
  const H = 0.6;
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(0.04, H, part), M.anodized, 0, Y, -s * (gap / 2 + part / 2)));
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.05, H, 0.015), glow(PALETTE.gold, 1.4));
    rim.position.set(0, Y, -s * (gap / 2 + 0.008));
    g.add(rim);
  }
  // Bottom rail joining both halves.
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.05, len), M.anodized, 0, Y - H / 2 - 0.025, 0));
  const col = indicatorColor(movable(el));
  const postZ = Math.min(len / 4, 1.2);
  g.add(post(Y - H / 2 - 0.05, col, 0, -postZ), post(Y - H / 2 - 0.05, col, 0, postZ));
  return g;
}

/** Screen: a white card in a holder. Shows coloured spots where rays land, and the image once it's sharp. */
export function buildScreen(el: ElementState): { group: THREE.Group; show(hits: ScreenHit[], image?: ImageResult): void } {
  const M = mats();
  const g = new THREE.Group();
  const len = el.len ?? SCREEN_LENGTH;
  const H = 0.7;
  g.add(mesh(new THREE.BoxGeometry(0.03, H, len), M.card, 0, Y, 0));
  // Holder: bottom clamp rail and two posts.
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.07, len + 0.04), M.anodized, 0, Y - H / 2 - 0.01, 0));
  const col = indicatorColor(movable(el));
  g.add(post(Y - H / 2 - 0.045, col, 0, -len / 3), post(Y - H / 2 - 0.045, col, 0, len / 3));

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
        const local = g.worldToLocal(new THREE.Vector3(h.point.x, Y, -h.point.y));
        const side = Math.sign(local.x) || -1;
        const c = wavelengthToColor(h.wavelength);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: tex, color: c.multiplyScalar(1.5 + 4 * Math.min(1, h.intensity * 6)), blending: THREE.AdditiveBlending,
          depthWrite: false, toneMapped: false, transparent: true,
        }));
        sp.position.set(side * 0.03, Y, local.z);
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
          shaft.position.set(side * 0.04, Y + 0.2, (z0 + z1) / 2 - dir * 0.06);
          const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 12), mat);
          head.rotation.x = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          head.position.set(side * 0.04, Y + 0.2, z1 - dir * 0.07);
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
