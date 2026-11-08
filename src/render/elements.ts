/**
 * 3D meshes for game elements. Each view mirrors one ElementState.
 */
import * as THREE from 'three';
import {
  ElementState, LASER_SIZE, MIRROR_LENGTH, PRISM_LOCAL, RING_RADIUS, SPLITTER_LENGTH, TARGET_RADIUS,
} from '../game/elements';
import type { ImageResult } from '../game/level';
import type { ScreenHit } from '../physics/trace';
import { deg2rad } from '../physics/vec';
import { buildAperture, buildLed, buildLens, buildObject, buildScreen } from './imaging';
import { BEAM_HEIGHT, PALETTE, wavelengthToColor } from './color';
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
  showScreen?(hits: ScreenHit[], image?: ImageResult): void;
  update?(t: number, dt: number): void;
}

const metalDark = () => new THREE.MeshStandardMaterial({ color: '#4a5878', metalness: 0.75, roughness: 0.3 });
const glow = (c: THREE.Color, k = 2) => new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(k), toneMapped: false });

function glassMaterial(quality: Quality, n: number): THREE.Material {
  if (quality === 'low') {
    return new THREE.MeshStandardMaterial({
      color: '#7fe6ff', transparent: true, opacity: 0.22, metalness: 0.1, roughness: 0.05, depthWrite: false,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: '#bff4ff', metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.6, ior: n,
    attenuationColor: new THREE.Color('#6fd8ff'), attenuationDistance: 3, transparent: true, opacity: 1,
    specularIntensity: 1, envMapIntensity: 1.5,
  });
}

/** Extrude a 2D table-plane polygon into a 3D prism standing on the table. */
function extrudePolygon(points: { x: number; y: number }[], height: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, p.y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); // shape y → world -z, extrusion → +y
  return g;
}

function base(color: THREE.Color, radius = 0.32): THREE.Group {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.15, 0.08, 32), metalDark());
  disc.position.y = 0.04;
  disc.castShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.08, 0.015, 8, 48), glow(color, 1.8));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  g.add(disc, ring);
  return g;
}

function makeView(el: ElementState, group: THREE.Group, extra: Partial<ElementView> = {}): ElementView {
  const hoverables: THREE.MeshStandardMaterial[] = [];
  group.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) hoverables.push(o.material);
  });
  const view: ElementView = {
    el,
    group,
    sync() {
      group.position.set(el.x, 0, -el.y);
      group.rotation.y = deg2rad(el.rotation);
    },
    setHover(on) {
      for (const m of hoverables) m.emissive.set(on ? '#123848' : '#000000');
    },
    ...extra,
  };
  group.userData.elementId = el.id;
  view.sync();
  return view;
}

function laserView(el: ElementState): ElementView {
  const g = new THREE.Group();
  const color = wavelengthToColor(el.wavelength ?? 532);
  const body = new THREE.Mesh(new THREE.BoxGeometry(LASER_SIZE.w, 0.42, LASER_SIZE.h), metalDark());
  body.position.y = BEAM_HEIGHT;
  body.castShadow = true;
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.16, 24), metalDark());
  nose.rotation.z = Math.PI / 2;
  nose.position.set(LASER_SIZE.w / 2 + 0.06, BEAM_HEIGHT, 0);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), glow(color, 4));
  lens.rotation.y = Math.PI / 2;
  lens.position.set(LASER_SIZE.w / 2 + 0.145, BEAM_HEIGHT, 0);
  const stripeMat = glow(color, 2.5);
  for (const z of [-1, 1]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(LASER_SIZE.w * 0.8, 0.03, 0.01), stripeMat);
    s.position.set(-0.02, BEAM_HEIGHT + 0.1, (z * LASER_SIZE.h) / 2 + z * 0.005);
    g.add(s);
  }
  const foot = new THREE.Mesh(new THREE.BoxGeometry(LASER_SIZE.w * 0.7, 0.14, LASER_SIZE.h * 0.7), metalDark());
  foot.position.y = 0.07;
  g.add(body, nose, lens, foot);
  return makeView(el, g, {
    update(t) {
      (lens.material as THREE.MeshBasicMaterial).color.copy(color).multiplyScalar(3.5 + Math.sin(t * 6) * 0.6);
    },
  });
}

function mirrorView(el: ElementState): ElementView {
  const g = new THREE.Group();
  const fixed = !el.movable && !el.placed;
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(MIRROR_LENGTH, 0.55, 0.06),
    new THREE.MeshStandardMaterial({ color: '#dff4ff', metalness: 1, roughness: 0.03, envMapIntensity: 2.2 }),
  );
  plate.position.y = BEAM_HEIGHT + 0.03;
  plate.castShadow = true;
  const frameMat = glow(fixed ? PALETTE.amber : PALETTE.cyan, 1.6);
  for (const y of [0.04, 0.6]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(MIRROR_LENGTH + 0.04, 0.025, 0.08), frameMat);
    f.position.y = BEAM_HEIGHT - 0.275 + y;
    g.add(f);
  }
  g.add(plate, base(fixed ? PALETTE.amber : PALETTE.cyan, 0.24));
  return makeView(el, g);
}

/** Half-silvered plate: semi-transparent glass with a violet metallic sheen. */
function splitterView(el: ElementState): ElementView {
  const g = new THREE.Group();
  const fixed = !el.movable && !el.placed;
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(SPLITTER_LENGTH, 0.5, 0.04),
    new THREE.MeshPhysicalMaterial({
      color: '#d9c8ff', metalness: 0.6, roughness: 0.05, transparent: true, opacity: 0.55,
      iridescence: 1, iridescenceIOR: 1.6, envMapIntensity: 2, depthWrite: false,
    }),
  );
  plate.position.y = BEAM_HEIGHT + 0.03;
  plate.renderOrder = 2;
  const frameMat = glow(PALETTE.magenta, 1.4);
  for (const x of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.56, 0.07), frameMat);
    f.position.set((x * SPLITTER_LENGTH) / 2, BEAM_HEIGHT + 0.03, 0);
    g.add(f);
  }
  g.add(plate, base(fixed ? PALETTE.amber : PALETTE.magenta, 0.22));
  return makeView(el, g);
}

function glassView(el: ElementState, quality: Quality): ElementView {
  const g = new THREE.Group();
  const pts = el.kind === 'prism'
    ? PRISM_LOCAL
    : [
      { x: -(el.w ?? 1) / 2, y: -(el.h ?? 1) / 2 }, { x: (el.w ?? 1) / 2, y: -(el.h ?? 1) / 2 },
      { x: (el.w ?? 1) / 2, y: (el.h ?? 1) / 2 }, { x: -(el.w ?? 1) / 2, y: (el.h ?? 1) / 2 },
    ];
  const n = typeof el.index === 'number' ? el.index : 1.5;
  const geo = extrudePolygon(pts, 0.7);
  const mesh = new THREE.Mesh(geo, glassMaterial(quality, n));
  mesh.position.y = 0.01;
  mesh.renderOrder = 2;
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: PALETTE.cyan.clone().multiplyScalar(1.4), toneMapped: false, transparent: true, opacity: 0.9 }),
  );
  edges.position.y = 0.01;
  g.add(mesh, edges);
  const fixed = !el.movable && !el.placed;
  if (fixed) {
    // Amber corner markers show it is bolted down.
    for (const p of pts) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), glow(PALETTE.amber, 1.8));
      m.position.set(p.x * 0.85, 0.02, -p.y * 0.85);
      g.add(m);
    }
  }
  return makeView(el, g);
}

function wallView(el: ElementState): ElementView {
  const g = new THREE.Group();
  const w = el.w ?? 1;
  const h = el.h ?? 1;
  const H = el.height ?? 0.9;
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, H, h),
    new THREE.MeshStandardMaterial({ color: '#141824', metalness: 0.7, roughness: 0.55 }),
  );
  m.position.y = H / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(w, H, h)),
    new THREE.LineBasicMaterial({ color: PALETTE.red.clone().multiplyScalar(1.3), toneMapped: false }),
  );
  edges.position.y = H / 2;
  g.add(m, edges);
  return makeView(el, g);
}

function targetView(el: ElementState): ElementView {
  const g = new THREE.Group();
  const r = el.r ?? TARGET_RADIUS;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, BEAM_HEIGHT - 0.1, 20), metalDark());
  ped.position.y = (BEAM_HEIGHT - 0.1) / 2;
  const coreMat = new THREE.MeshBasicMaterial({ color: PALETTE.red.clone().multiplyScalar(0.7), toneMapped: false });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 2), coreMat);
  core.position.y = BEAM_HEIGHT;
  const ringMat = new THREE.MeshBasicMaterial({ color: PALETTE.red.clone().multiplyScalar(0.9), toneMapped: false });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(r * 0.75, 0.02, 8, 48), ringMat);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(r * 0.6, 0.015, 8, 48), ringMat);
  ring1.position.y = ring2.position.y = BEAM_HEIGHT;
  const floorRing = new THREE.Mesh(
    new THREE.RingGeometry(r - 0.03, r, 48),
    new THREE.MeshBasicMaterial({ color: PALETTE.red, transparent: true, opacity: 0.5, toneMapped: false }),
  );
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.y = 0.01;
  const light = new THREE.PointLight(PALETTE.green, 0, 3);
  light.position.y = BEAM_HEIGHT + 0.2;
  g.add(ped, core, ring1, ring2, floorRing, light);
  let lit = false;
  let level = 0;
  return makeView(el, g, {
    setLit(on) { lit = on; },
    update(t, dt) {
      level += ((lit ? 1 : 0) - level) * Math.min(1, dt * 8);
      const c = PALETTE.red.clone().lerp(PALETTE.green, level);
      coreMat.color.copy(c).multiplyScalar(0.7 + level * (3 + Math.sin(t * 8) * 0.6));
      ringMat.color.copy(c).multiplyScalar(0.9 + level * 2);
      (floorRing.material as THREE.MeshBasicMaterial).color.copy(c);
      const speed = 0.6 + level * 4;
      ring1.rotation.x = t * speed;
      ring1.rotation.y = t * speed * 0.7;
      ring2.rotation.y = -t * speed * 1.2;
      ring2.rotation.z = t * speed * 0.5;
      light.intensity = level * 4;
    },
  });
}

function ringView(el: ElementState): ElementView {
  const g = new THREE.Group();
  const r = el.r ?? RING_RADIUS;
  const mat = new THREE.MeshBasicMaterial({ color: PALETTE.gold.clone().multiplyScalar(0.8), toneMapped: false });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 8, 48), mat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = BEAM_HEIGHT;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), mat);
  gem.position.y = BEAM_HEIGHT + 0.32;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, BEAM_HEIGHT, 6),
    new THREE.MeshBasicMaterial({ color: '#6a5a20' }),
  );
  stem.position.set(r, BEAM_HEIGHT / 2, 0);
  g.add(halo, gem, stem);
  let lit = false;
  let level = 0;
  return makeView(el, g, {
    setLit(on) { lit = on; },
    update(t, dt) {
      level += ((lit ? 1 : 0) - level) * Math.min(1, dt * 6);
      mat.color.copy(PALETTE.gold).multiplyScalar(0.6 + level * 3);
      gem.rotation.y = t * (1 + level * 5);
      gem.position.y = BEAM_HEIGHT + 0.32 + Math.sin(t * 2) * 0.04;
      halo.scale.setScalar(1 + level * 0.12 * (1 + Math.sin(t * 10)) / 2);
    },
  });
}

export function createElementView(el: ElementState, quality: Quality): ElementView {
  switch (el.kind) {
    case 'laser': return laserView(el);
    case 'mirror': return mirrorView(el);
    case 'splitter': return splitterView(el);
    case 'lens': return makeView(el, buildLens(el, quality));
    case 'led': return makeView(el, buildLed(el));
    case 'object': return makeView(el, buildObject(el));
    case 'aperture': return makeView(el, buildAperture(el));
    case 'screen': {
      const s = buildScreen(el);
      return makeView(el, s.group, { showScreen: s.show });
    }
    case 'block':
    case 'prism': return glassView(el, quality);
    case 'wall': return wallView(el);
    case 'target': return targetView(el);
    case 'ring': return ringView(el);
  }
}
