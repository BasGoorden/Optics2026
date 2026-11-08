/**
 * 3D models for the imaging elements (lenses, LEDs, illuminated objects, screens, pinhole plates),
 * in the same simplified lab-hardware style as render/elements.ts.
 */
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  ElementState, LED_SIZE, LENS_LENGTH, MIRROR_LENGTH, OBJECT_HEIGHT, OBJECT_POINTS, PLATE_LENGTH, SCREEN_LENGTH, SLM_PROGRAMS,
} from '../game/elements';
import type { ImageResult, PatternResult } from '../game/level';
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
export function buildScreen(el: ElementState): {
  group: THREE.Group; show(hits: ScreenHit[], image?: ImageResult, pattern?: PatternResult): void;
} {
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
  const patternGroup = new THREE.Group();
  g.add(patternGroup);

  return {
    group: g,
    show(hits, image, pattern) {
      spots.clear();
      imageArrow.clear();
      for (const c of [...patternGroup.children]) {
        patternGroup.remove(c);
        if (c instanceof THREE.Mesh) { (c.material as THREE.MeshBasicMaterial).map?.dispose(); c.geometry.dispose(); }
      }
      g.updateMatrixWorld();
      // Light that came through slits shows its diffraction pattern instead of a spot.
      const waveHit = hits.filter((h) => h.pattern).sort((a, b) => b.intensity - a.intensity)[0];
      if (waveHit) patternGroup.add(patternPlane(g, waveHit, len, H, pattern));
      for (const h of hits) {
        if (h.pattern) continue;
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

/**
 * Slit diffraction pattern on a screen: I(y) ∝ sinc²(π·a·y/(λL)) · cos²(π·d·y/(λL)) (double slit),
 * with a in µm, λ in nm (so 1000·a/λ is dimensionless). Optional faint reference ticks show the goal size.
 */
function patternPlane(screen: THREE.Group, hit: ScreenHit, len: number, H: number, goal?: PatternResult): THREE.Mesh {
  const p = hit.pattern!;
  const W = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, 64);
  const local = screen.worldToLocal(new THREE.Vector3(hit.point.x, Y, -hit.point.y));
  const centre = -local.z; // along the screen's own +y (= -z)
  const col = wavelengthToColor(hit.wavelength);
  for (let i = 0; i < W; i++) {
    const y = -len / 2 + ((i + 0.5) / W) * len - centre;
    const k = (Math.PI * 1000 * y) / (hit.wavelength * p.L);
    const b = k * p.width;
    const sinc = Math.abs(b) < 1e-9 ? 1 : Math.sin(b) / b;
    const twoSlit = p.count >= 2 ? Math.cos(k * p.sep) ** 2 : 1;
    const I = Math.min(1, sinc * sinc * twoSlit * Math.min(1, hit.intensity * 3 + 0.4));
    ctx.fillStyle = `rgb(${Math.round(255 * Math.min(1, col.r * I * 1.4))},${Math.round(255 * Math.min(1, col.g * I * 1.4))},${Math.round(255 * Math.min(1, col.b * I * 1.4))})`;
    ctx.fillRect(i, 0, 1, 64);
  }
  // Reference ticks for the goal size (spacing or central width), centred on the pattern.
  if (goal && Number.isFinite(goal.target)) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const step = goal.goal.spacing ? goal.target : goal.target / 2;
    for (let s = -8; s <= 8; s++) {
      if (!goal.goal.spacing && Math.abs(s) !== 1) continue;
      const y = centre + s * step;
      const i = Math.round(((y + len / 2) / len) * W);
      if (i >= 0 && i < W) {
        ctx.fillRect(i, 0, 2, 10);
        ctx.fillRect(i, 54, 2, 10);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const side = Math.sign(local.x) || -1;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(len, H * 0.9),
    // Opaque: the pattern is shown on a dark patch, like a screen in a darkened lab, so faint fringes stay visible.
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
  );
  // Plane in the screen's y–height plane (local z/y), facing the side the light comes from.
  plane.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
  if (side < 0) plane.scale.x = -1;
  plane.position.set(side * 0.025, Y, 0);
  return plane;
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

// ---------------------------------------------------------------------------------------------
// Colour and wave optics parts
// ---------------------------------------------------------------------------------------------

/** Round optic (filter, polariser) in a ring mount on a post; the disc lies across local x. */
function roundOptic(el: ElementState, discMat: THREE.Material, extra?: (g: THREE.Group, R: number) => void): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const R = PLATE_LENGTH / 2;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.03, 64), discMat);
  disc.rotation.z = Math.PI / 2;
  disc.position.y = Y;
  disc.renderOrder = 2;
  g.add(disc);
  const ringGeo = new THREE.LatheGeometry([
    new THREE.Vector2(R, -0.05), new THREE.Vector2(R + 0.06, -0.05), new THREE.Vector2(R + 0.06, 0.05),
    new THREE.Vector2(R, 0.05), new THREE.Vector2(R, -0.05),
  ], 64);
  ringGeo.rotateZ(-Math.PI / 2);
  g.add(mesh(ringGeo, M.anodized, 0, Y, 0));
  extra?.(g, R);
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.08, 0.16), M.anodized, 0, Y - R - 0.1, 0));
  g.add(post(Y - R - 0.14, indicatorColor(movable(el))));
  return g;
}

/** Colour filter: tinted glass in a ring mount. */
export function buildFilter(el: ElementState): THREE.Group {
  const band = el.band ?? [500, 560];
  const c = wavelengthToColor((band[0] + band[1]) / 2);
  const mat = new THREE.MeshPhysicalMaterial({
    color: c, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0, emissive: c.clone().multiplyScalar(0.25),
    side: THREE.DoubleSide, depthWrite: false,
  });
  return roundOptic(el, mat);
}

/** Polariser: dark film in a rotation mount, with a line showing its transmission axis. */
export function buildPolariser(el: ElementState): THREE.Group {
  const mat = new THREE.MeshStandardMaterial({ color: '#2b2f3a', transparent: true, opacity: 0.7, roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide });
  return roundOptic(el, mat, (g, R) => {
    // The axis is measured from vertical, in the plane of the disc.
    const a = ((el.pol ?? 0) * Math.PI) / 180;
    for (const s of [-1, 1]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.035, R * 1.9, 0.02), glow(PALETTE.cyan, 1.6));
      line.position.set(s * 0.02, Y, 0);
      line.rotation.x = -a; // rotate within the disc (the y–z plane)
      g.add(line);
    }
    const div = document.createElement('div');
    div.className = 'pol-label';
    div.textContent = `${el.pol ?? 0}°`;
    const label = new CSS2DObject(div);
    label.position.set(0, Y + R + 0.2, 0);
    g.add(label);
  });
}

/** Dichroic mirror: a round coated glass disc in a ring mount, tinted by the colour it reflects. */
export function buildDichroic(el: ElementState): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const R = PLATE_LENGTH / 2;
  const band = el.band ?? [500, 560];
  const c = wavelengthToColor((band[0] + band[1]) / 2);
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, 0.03, 64),
    new THREE.MeshPhysicalMaterial({
      color: c, metalness: 0.6, roughness: 0.05, transparent: true, opacity: 0.6, iridescence: 1, iridescenceIOR: 1.5,
      emissive: c.clone().multiplyScalar(0.2), side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  disc.rotation.x = Math.PI / 2; // lies along local x like a mirror
  disc.position.y = Y;
  disc.renderOrder = 2;
  const ringGeo = new THREE.LatheGeometry([
    new THREE.Vector2(R, -0.04), new THREE.Vector2(R + 0.06, -0.04), new THREE.Vector2(R + 0.06, 0.04),
    new THREE.Vector2(R, 0.04), new THREE.Vector2(R, -0.04),
  ], 64);
  ringGeo.rotateX(Math.PI / 2);
  g.add(disc, mesh(ringGeo, M.anodized, 0, Y, 0));
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.1, 0.12), M.anodized, 0, Y - R - 0.1, 0));
  g.add(post(Y - R - 0.15, indicatorColor(movable(el))));
  return g;
}

/** Rainbow-sheen texture with fine lines, for gratings and SLMs. */
function linesTexture(lines: number, rainbow: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const gr = ctx.createLinearGradient(0, 0, 256, 0);
  if (rainbow) ['#ff4040', '#ffcc40', '#40ff80', '#40c8ff', '#8a5cff', '#ff4fd8'].forEach((s, i, a) => gr.addColorStop(i / (a.length - 1), s));
  else { gr.addColorStop(0, '#20242c'); gr.addColorStop(1, '#20242c'); }
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  for (let i = 0; i < lines; i++) ctx.fillRect((i * 256) / lines, 0, Math.max(1, 128 / lines), 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Transmission grating: a glass slide with a rainbow sheen, in a slide holder. */
export function buildGrating(el: ElementState): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const L = PLATE_LENGTH;
  const H = 0.8;
  const slide = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, H, L),
    new THREE.MeshPhysicalMaterial({ map: linesTexture(48, true), transparent: true, opacity: 0.75, roughness: 0.1, iridescence: 1, side: THREE.DoubleSide }),
  );
  slide.position.y = Y;
  slide.renderOrder = 2;
  g.add(slide);
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.06, L + 0.1), M.anodized, 0, Y - H / 2 - 0.03, 0));
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.08, H + 0.06, 0.05), M.anodized, 0, Y, s * (L / 2 + 0.03)));
  const div = document.createElement('div');
  div.className = 'pol-label';
  div.textContent = `d = ${el.period ?? 2} µm`;
  const label = new CSS2DObject(div);
  label.position.set(0, Y + H / 2 + 0.2, 0);
  g.add(label);
  g.add(post(Y - H / 2 - 0.06, indicatorColor(movable(el))));
  return g;
}

/** Slit plate: black plate with one or two tiny glowing slits in the middle. */
export function buildSlits(el: ElementState): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const len = el.len ?? PLATE_LENGTH * 2;
  const H = 0.6;
  g.add(mesh(new THREE.BoxGeometry(0.03, H, len), M.anodized, 0, Y, 0));
  const n = el.slitCount ?? 2;
  for (let i = 0; i < n; i++) {
    const z = n === 1 ? 0 : (i - 0.5) * 0.06;
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.035, H * 0.6, 0.012), glow(PALETTE.gold, 1.8));
    slit.position.set(0, Y, z);
    g.add(slit);
  }
  const div = document.createElement('div');
  div.className = 'pol-label';
  div.textContent = n >= 2 ? `d = ${el.slitSep ?? 20} µm` : `a = ${el.slitWidth ?? 5} µm`;
  const label = new CSS2DObject(div);
  label.position.set(0, Y + H / 2 + 0.2, 0);
  g.add(label);
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.05, len), M.anodized, 0, Y - H / 2 - 0.025, 0));
  const col = indicatorColor(movable(el));
  g.add(post(Y - H / 2 - 0.05, col, 0, -len / 4), post(Y - H / 2 - 0.05, col, 0, len / 4));
  return g;
}

/** Spatial light modulator: a device with a pixel display whose stripes show the programmed phase pattern. */
export function buildSlm(el: ElementState): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const L = MIRROR_LENGTH;
  const H = 0.8;
  const prog = SLM_PROGRAMS[el.program ?? 0] ?? SLM_PROGRAMS[0];
  // Device body behind the display (local −z side), display on the front.
  g.add(mesh(new THREE.BoxGeometry(L + 0.12, H + 0.12, 0.16), M.anodized, 0, Y, -0.1));
  const lines = prog.period ? Math.round(36 / prog.period) : 0;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(L, H),
    new THREE.MeshStandardMaterial({ map: linesTexture(lines, lines > 0), metalness: 0.7, roughness: 0.2, emissive: '#1a1030' }),
  );
  face.position.set(0, Y, 0.0);
  g.add(face);
  // Ribbon cable and a status LED.
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.02, 0.3), M.rubber, 0, Y - H / 2 - 0.02, -0.3));
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), glow(PALETTE.magenta, 3));
  led.position.set(L / 2 - 0.05, Y + H / 2 + 0.07, -0.03);
  g.add(led);
  const div = document.createElement('div');
  div.className = 'pol-label';
  div.textContent = `SLM: ${prog.name}`;
  const label = new CSS2DObject(div);
  label.position.set(0, Y + H / 2 + 0.28, 0);
  g.add(label);
  g.add(post(Y - H / 2 - 0.07, indicatorColor(movable(el))));
  return g;
}