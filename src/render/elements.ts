/**
 * 3D models for game elements, in a simplified "optics lab hardware" style (think Thorlabs):
 * black anodised mounts on steel posts on an optical breadboard. Each view mirrors one ElementState.
 * Physics does not depend on any of this: shapes only need to match the element's 2D footprint.
 */
import * as THREE from 'three';
import {
  DPRISM_LOCAL, ElementState, HALF_HEIGHT, LASER_SIZE, MIRROR_LENGTH, PRISM_LOCAL, RING_RADIUS, SPLITTER_LENGTH, TARGET_RADIUS, WALL_HEIGHT,
} from '../game/elements';
import type { ImageResult, PatternResult } from '../game/level';
import type { ScreenHit } from '../physics/trace';
import { bandName } from '../physics/colour';
import { deg2rad } from '../physics/vec';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { BEAM_HEIGHT, PALETTE, wavelengthToColor } from './color';
import {
  buildAperture, buildDichroic, buildFilter, buildGrating, buildLed, buildLens, buildObject, buildPolariser, buildScreen,
  buildSlits, buildSlm,
} from './imaging';
import { glow, indicatorColor, knob, mats, mesh, post } from './parts';
import type { Quality } from './stage';

export interface ElementView {
  el: ElementState;
  group: THREE.Group;
  /** Sync position/rotation from the element state. */
  sync(): void;
  setHover(on: boolean): void;
  /** For targets and rings: lit by the beam. */
  setLit?(on: boolean): void;
  /** For screens: show where rays land, and the image if it is sharp. */
  showScreen?(hits: ScreenHit[], image?: ImageResult, pattern?: PatternResult): void;
  update?(t: number, dt: number): void;
}

const Y = BEAM_HEIGHT;

export function isMovable(el: ElementState): boolean {
  return !!el.movable || !!el.placed;
}

export function glassMaterial(quality: Quality, n: number): THREE.Material {
  if (quality === 'low') {
    return new THREE.MeshStandardMaterial({
      color: '#9feaff', transparent: true, opacity: 0.25, metalness: 0.1, roughness: 0.05, depthWrite: false,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: '#d6f6ff', metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.6, ior: n,
    attenuationColor: new THREE.Color('#8fe3ff'), attenuationDistance: 4, transparent: true, opacity: 1,
    specularIntensity: 1, envMapIntensity: 1.6,
  });
}

/** Extrude a 2D table-plane polygon into a 3D prism standing on the table. */
export function extrudePolygon(points: { x: number; y: number }[], height: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, p.y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); // shape y → world -z, extrusion → +y
  return g;
}

export function makeView(el: ElementState, group: THREE.Group, extra: Partial<ElementView> = {}): ElementView {
  // Hover brightens the indicator rings (materials are shared, so they are not tinted).
  const indicators: THREE.MeshBasicMaterial[] = [];
  const interactive = isMovable(el) || !!el.rotatable;
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh && o.userData.indicator)) return;
    // Parts the player can neither move nor rotate get no indicator ring at all.
    if (!interactive) o.visible = false;
    indicators.push(o.material as THREE.MeshBasicMaterial);
  });
  const base = indicators.map((m) => m.color.clone());
  const view: ElementView = {
    el,
    group,
    sync() {
      group.position.set(el.x, 0, -el.y);
      group.rotation.y = deg2rad(el.rotation);
    },
    setHover(on) {
      indicators.forEach((m, i) => m.color.copy(base[i]).multiplyScalar(on ? 2.4 : 1));
    },
    ...extra,
  };
  group.userData.elementId = el.id;
  view.sync();
  return view;
}

/** HeNe-style laser tube in two V-mounts. */
function laserView(el: ElementState): ElementView {
  const M = mats();
  const g = new THREE.Group();
  const color = el.spectrum ? new THREE.Color(1, 1, 1) : wavelengthToColor(el.wavelength ?? 532);
  const L = LASER_SIZE.w;
  const tube = mesh(new THREE.CylinderGeometry(0.15, 0.15, L - 0.1, 28), M.anodized, -0.03, Y, 0);
  tube.rotation.z = Math.PI / 2;
  const band = mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.16, 28), M.warning, -0.15, Y, 0);
  band.rotation.z = Math.PI / 2;
  const bezel = mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.1, 24), M.steel, L / 2 - 0.05, Y, 0);
  bezel.rotation.z = Math.PI / 2;
  const cap = mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.06, 24), M.steelDark, -L / 2 + 0.01, Y, 0);
  cap.rotation.z = Math.PI / 2;
  const cable = mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 16, Math.PI), M.rubber, -L / 2 - 0.02, Y - 0.12, 0);
  cable.rotation.y = Math.PI / 2;
  const aperture = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), glow(color, 4));
  aperture.rotation.y = Math.PI / 2;
  aperture.position.set(L / 2 + 0.002, Y, 0);
  g.add(tube, band, bezel, cap, cable, aperture);
  // Two V-mount clamps on posts.
  const col = indicatorColor(isMovable(el));
  for (const x of [-0.25, 0.25]) {
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.12, 0.34), M.anodized, x, Y - 0.17, 0));
    g.add(post(Y - 0.23, col, x, 0));
  }
  return makeView(el, g, {
    update(t) {
      (aperture.material as THREE.MeshBasicMaterial).color.copy(color).multiplyScalar(3.5 + Math.sin(t * 6) * 0.6);
    },
  });
}

/**
 * Round mirror (silvered on both faces, like the physics) in a ring mount, held by a kinematic
 * bracket with two adjuster knobs at the bottom.
 */
function mirrorView(el: ElementState): ElementView {
  const M = mats();
  const g = new THREE.Group();
  const R = MIRROR_LENGTH / 2;
  // Mirror disc: axis along local z (the mirror surface spans local x and height).
  const disc = mesh(new THREE.CylinderGeometry(R, R, 0.03, 72), [M.anodizedLight, M.mirror, M.mirror] as unknown as THREE.Material, 0, Y, 0);
  disc.rotation.x = Math.PI / 2;
  g.add(disc);
  // Ring mount around the edge.
  const ringW = 0.06;
  const depth = 0.08;
  const ringGeo = new THREE.LatheGeometry([
    new THREE.Vector2(R, -depth / 2), new THREE.Vector2(R + ringW, -depth / 2),
    new THREE.Vector2(R + ringW, depth / 2), new THREE.Vector2(R, depth / 2), new THREE.Vector2(R, -depth / 2),
  ], 72);
  ringGeo.rotateX(Math.PI / 2); // lathe axis (y) → local z
  g.add(mesh(ringGeo, M.anodized, 0, Y, 0));
  // Kinematic bracket under the ring, with two knobs on its side.
  const by = Y - R - ringW - 0.06;
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.12, 0.12), M.anodized, 0, by, 0));
  g.add(mesh(new THREE.BoxGeometry(0.12, 0.08, 0.1), M.anodizedLight, 0, by + 0.09, 0));
  g.add(knob(-0.17, by, -0.07), knob(0.17, by, -0.07));
  g.add(post(by - 0.06, indicatorColor(isMovable(el))));
  return makeView(el, g);
}

/** Cube beam splitter: a glass cube with a shimmering coated diagonal, on a small cube mount. */
function splitterView(el: ElementState, quality: Quality): ElementView {
  const M = mats();
  const g = new THREE.Group();
  const side = SPLITTER_LENGTH / Math.SQRT2;
  const glassMat = quality === 'low'
    ? new THREE.MeshStandardMaterial({ color: '#bfefff', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false })
    : new THREE.MeshPhysicalMaterial({
      color: '#e6f8ff', roughness: 0.02, transmission: 1, thickness: 0.4, ior: 1.5, transparent: true,
      emissive: '#0c2633', envMapIntensity: 2,
    });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(side, side, side), glassMat);
  cube.position.y = Y;
  cube.rotation.y = Math.PI / 4; // diagonal along local x = the splitter surface
  cube.renderOrder = 2;
  // The coated diagonal (where the beam splits), drawn as a faint glowing violet sheet.
  const coating = new THREE.Mesh(
    new THREE.PlaneGeometry(SPLITTER_LENGTH * 0.995, side * 0.995),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#c58cff').multiplyScalar(0.9), transparent: true, opacity: 0.55, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  );
  coating.position.y = Y;
  coating.renderOrder = 3;
  // Outline of the coated diagonal: shows as a violet diagonal across the top and bottom faces.
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(SPLITTER_LENGTH * 0.995, side * 0.995)),
    new THREE.LineBasicMaterial({ color: new THREE.Color('#d9a6ff').multiplyScalar(1.6), toneMapped: false }),
  );
  outline.position.y = Y;
  g.add(outline);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(side, side, side)),
    new THREE.LineBasicMaterial({ color: new THREE.Color('#c8f4ff').multiplyScalar(1.3), transparent: true, opacity: 0.9, toneMapped: false }),
  );
  edges.position.y = Y;
  edges.rotation.y = Math.PI / 4;
  // Only a thin platform underneath (to sit on the post); the top stays open so it reads as plain glass.
  const bottom = mesh(new THREE.BoxGeometry(side * 0.8, 0.04, side * 0.8), M.anodized, 0, Y - side / 2 - 0.02, 0);
  bottom.rotation.y = Math.PI / 4;
  g.add(cube, coating, edges, bottom, post(Y - side / 2 - 0.04, indicatorColor(isMovable(el))));
  return makeView(el, g);
}
/** Glass block or prism on a black platform. */
function glassView(el: ElementState, quality: Quality): ElementView {
  const M = mats();
  const g = new THREE.Group();
  const pts = el.kind === 'prism'
    ? PRISM_LOCAL
    : el.kind === 'dprism' ? DPRISM_LOCAL : [
      { x: -(el.w ?? 1) / 2, y: -(el.h ?? 1) / 2 }, { x: (el.w ?? 1) / 2, y: -(el.h ?? 1) / 2 },
      { x: (el.w ?? 1) / 2, y: (el.h ?? 1) / 2 }, { x: -(el.w ?? 1) / 2, y: (el.h ?? 1) / 2 },
    ];
  const n = typeof el.index === 'number' ? el.index : 1.5;
  const H = HALF_HEIGHT.glass * 2;
  const geo = extrudePolygon(pts, H);
  const glass = new THREE.Mesh(geo, glassMaterial(quality, n));
  glass.position.y = Y - H / 2;
  glass.renderOrder = 2;
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: '#b6f0ff', transparent: true, opacity: 0.7 }),
  );
  edges.position.y = Y - H / 2;
  // Platform under the glass, with posts every ~2 units along long pieces.
  const platform = mesh(extrudePolygon(pts, 0.05), M.anodized, 0, Y - H / 2 - 0.055, 0);
  g.add(glass, edges, platform);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const spanX = Math.max(...xs) - Math.min(...xs);
  const nPosts = Math.max(1, Math.round(spanX / 2.2));
  const col = indicatorColor(isMovable(el));
  const fixedOnly = !isMovable(el) && !el.rotatable;
  for (let i = 0; i < nPosts; i++) {
    const x = nPosts === 1 ? cx : Math.min(...xs) + (spanX * (i + 0.5)) / nPosts;
    const p = post(Y - H / 2 - 0.055, col, x, -cy);
    // Pieces that can't move or rotate get no indicator glow.
    if (fixedOnly) p.children.filter((c) => c.userData.indicator).forEach((c) => (c.visible = false));
    g.add(p);
  }
  return makeView(el, g);
}

/** Beam block / enclosure panel. */
function wallView(el: ElementState): ElementView {
  const M = mats();
  const g = new THREE.Group();
  const w = el.w ?? 1;
  const h = el.h ?? 1;
  const H = el.height ?? WALL_HEIGHT;
  g.add(mesh(new THREE.BoxGeometry(w, H, h), M.anodized, 0, H / 2, 0));
  // Thin red safety edge along the top.
  const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.001, h));
  const edge = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: PALETTE.red.clone().multiplyScalar(1.2), toneMapped: false }));
  edge.position.y = H + 0.002;
  g.add(edge);
  // Screw heads along the top.
  const long = Math.max(w, h);
  const along = w >= h ? 'x' : 'z';
  for (let s = -long / 2 + 0.4; s <= long / 2 - 0.3; s += 1) {
    const sc = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10), M.steel, along === 'x' ? s : 0, H + 0.01, along === 'z' ? s : 0);
    g.add(sc);
  }
  return makeView(el, g);
}

/** Receiver: an integrating-sphere detector that glows green when lit. */
function targetView(el: ElementState): ElementView {
  const M = mats();
  const g = new THREE.Group();
  const r = el.r ?? TARGET_RADIUS;
  const R = Math.max(0.1, Math.min(0.26, r * 0.62));
  const sphere = mesh(new THREE.SphereGeometry(R, 32, 20), M.anodizedLight, 0, Y, 0);
  g.add(sphere);
  // Port flanges on four sides.
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const f = mesh(new THREE.CylinderGeometry(R * 0.38, R * 0.38, R * 0.3, 16), M.anodized, Math.cos(a) * R * 0.95, Y, Math.sin(a) * R * 0.95);
    f.rotation.z = Math.PI / 2;
    f.rotation.y = -a;
    g.add(f);
  }
  const statusMat = new THREE.MeshBasicMaterial({ color: PALETTE.red.clone(), toneMapped: false });
  const band = new THREE.Mesh(new THREE.TorusGeometry(R * 1.02, R * 0.07, 8, 48), statusMat);
  band.rotation.x = Math.PI / 2;
  band.position.y = Y;
  const ports: THREE.Mesh[] = [];
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(R * 0.26, 16), statusMat);
    p.position.set(Math.cos(a) * R * 1.11, Y, Math.sin(a) * R * 1.11);
    p.lookAt(new THREE.Vector3(Math.cos(a) * 5, Y, Math.sin(a) * 5));
    ports.push(p);
  }
  // Faint circle on the table showing the receiver's catch area.
  const area = new THREE.Mesh(
    new THREE.RingGeometry(r - 0.02, r, 48),
    new THREE.MeshBasicMaterial({ color: PALETTE.red, transparent: true, opacity: 0.35, toneMapped: false }),
  );
  area.rotation.x = -Math.PI / 2;
  area.position.y = 0.006;
  const light = new THREE.PointLight(PALETTE.green, 0, 3);
  light.position.y = Y + 0.3;
  // Colour receivers: a coloured dot for each colour they need, and a small label.
  const needs = el.needs ?? [];
  needs.forEach((n, i) => {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glow(wavelengthToColor((n.band[0] + n.band[1]) / 2), 2.5));
    dot.position.set((i - (needs.length - 1) / 2) * 0.16, Y + R + 0.1, 0);
    g.add(dot);
  });
  if (needs.length || el.forbid?.length) {
    const div = document.createElement('div');
    div.className = 'pol-label';
    div.textContent = needs.map((n) => bandName(n.band)).join(' + ') + (el.forbid?.length ? ' only' : '');
    const label = new CSS2DObject(div);
    label.position.set(0, Y + R + 0.35, 0);
    g.add(label);
  }
  g.add(band, ...ports, area, light, post(Y - R, indicatorColor(false)));
  // Receivers never move: hide the indicator ring.
  g.traverse((o) => { if (o.userData.indicator) o.visible = false; });
  let lit = false;
  let level = 0;
  return makeView(el, g, {
    setLit(on) { lit = on; },
    update(t, dt) {
      level += ((lit ? 1 : 0) - level) * Math.min(1, dt * 8);
      const c = PALETTE.red.clone().lerp(PALETTE.green, level);
      statusMat.color.copy(c).multiplyScalar(0.9 + level * (2.5 + Math.sin(t * 8) * 0.5));
      (area.material as THREE.MeshBasicMaterial).color.copy(c);
      light.intensity = level * 4;
    },
  });
}

/** Bonus ring: a golden alignment ring on a thin rod. */
function ringView(el: ElementState): ElementView {
  const M = mats();
  const g = new THREE.Group();
  const r = el.r ?? RING_RADIUS;
  const mat = new THREE.MeshBasicMaterial({ color: PALETTE.gold.clone().multiplyScalar(0.8), toneMapped: false });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(r, 0.02, 8, 48), mat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = Y;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), mat);
  gem.position.y = Y + 0.3;
  const rod = mesh(new THREE.CylinderGeometry(0.012, 0.012, Y, 8), M.steel, r + 0.02, Y / 2, 0);
  const foot = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 12), M.anodized, r + 0.02, 0.015, 0);
  g.add(halo, gem, rod, foot);
  let lit = false;
  let level = 0;
  return makeView(el, g, {
    setLit(on) { lit = on; },
    update(t, dt) {
      level += ((lit ? 1 : 0) - level) * Math.min(1, dt * 6);
      mat.color.copy(PALETTE.gold).multiplyScalar(0.6 + level * 3);
      gem.rotation.y = t * (1 + level * 5);
      gem.position.y = Y + 0.3 + Math.sin(t * 2) * 0.04;
      halo.scale.setScalar(1 + level * 0.12 * (1 + Math.sin(t * 10)) / 2);
    },
  });
}

export function createElementView(el: ElementState, quality: Quality): ElementView {
  switch (el.kind) {
    case 'laser': return laserView(el);
    case 'mirror': return mirrorView(el);
    case 'splitter': return splitterView(el, quality);
    case 'lens': return makeView(el, buildLens(el, quality));
    case 'led': return makeView(el, buildLed(el));
    case 'object': return makeView(el, buildObject(el));
    case 'aperture': return makeView(el, buildAperture(el));
    case 'screen': {
      const s = buildScreen(el);
      return makeView(el, s.group, { showScreen: s.show });
    }
    case 'block':
    case 'prism':
    case 'dprism': return glassView(el, quality);
    case 'filter': return makeView(el, buildFilter(el));
    case 'polariser': return makeView(el, buildPolariser(el));
    case 'dichroic': return makeView(el, buildDichroic(el));
    case 'grating': return makeView(el, buildGrating(el));
    case 'slits': return makeView(el, buildSlits(el));
    case 'slm': return makeView(el, buildSlm(el));
    case 'wall': return wallView(el);
    case 'target': return targetView(el);
    case 'ring': return ringView(el);
  }
}
