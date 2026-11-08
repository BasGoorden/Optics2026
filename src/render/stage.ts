/**
 * The 3D stage: renderer, camera, post-processing, lab environment and the table.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import type { Bounds } from '../physics/trace';
import { PALETTE } from './color';
import { breadboardTexture } from './parts';

export type Quality = 'low' | 'medium' | 'high';

const DEFAULT_VIEW = { pos: new THREE.Vector3(0, 11, 9.8), target: new THREE.Vector3(0, 0.5, 0.6) };
const TOP_VIEW = { pos: new THREE.Vector3(0, 15, 0.01), target: new THREE.Vector3(0, 0, 0) };

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly labelRenderer: CSS2DRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  /** Everything belonging to the current level goes in here. */
  readonly levelRoot = new THREE.Group();
  quality: Quality = 'medium';
  topView = false;

  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private tableGroup = new THREE.Group();
  private dust!: THREE.Points;
  private clock = new THREE.Clock();
  private keyLight: THREE.DirectionalLight;
  private camTween: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; t: number } | null = null;
  private updaters: ((t: number, dt: number) => void)[] = [];

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'label-layer';
    container.appendChild(this.labelRenderer.domElement);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.copy(DEFAULT_VIEW.pos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(DEFAULT_VIEW.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 22;
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(78);
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: null as unknown as THREE.MOUSE };

    // Environment lighting for metal and glass reflections.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    this.scene.background = new THREE.Color('#03050b');
    this.scene.fog = new THREE.FogExp2('#03050b', 0.028);

    this.scene.add(new THREE.HemisphereLight('#5a7cff', '#0a0a14', 0.5));
    this.keyLight = new THREE.DirectionalLight('#cfe6ff', 1.4);
    this.keyLight.position.set(-6, 12, 6);
    this.keyLight.shadow.mapSize.set(2048, 2048);
    const sc = this.keyLight.shadow.camera;
    sc.left = -9; sc.right = 9; sc.top = 7; sc.bottom = -7; sc.near = 1; sc.far = 30;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);
    const rim = new THREE.PointLight(PALETTE.magenta, 30, 25);
    rim.position.set(8, 3, -7);
    this.scene.add(rim);
    const rim2 = new THREE.PointLight(PALETTE.cyan, 30, 25);
    rim2.position.set(-8, 3, -7);
    this.scene.add(rim2);

    this.buildLab();
    this.scene.add(this.tableGroup, this.levelRoot);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.3, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    window.addEventListener('resize', () => this.resize());
    this.setQuality(this.quality);
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /** Register a per-frame callback. */
  onFrame(fn: (t: number, dt: number) => void): void {
    this.updaters.push(fn);
  }

  setQuality(q: Quality): void {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(q === 'low' ? 1 : q === 'medium' ? Math.min(dpr, 1.5) : Math.min(dpr, 2));
    this.renderer.shadowMap.enabled = q === 'high';
    this.keyLight.castShadow = q === 'high';
    this.dust.visible = q !== 'low';
    this.renderer.shadowMap.needsUpdate = true;
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.Material) o.material.needsUpdate = true;
    });
    this.resize();
  }

  /** Build the table (and its glowing frame) to fit the level bounds. */
  buildTable(b: Bounds): void {
    this.tableGroup.traverse((o) => { if (o instanceof CSS2DObject) o.element.remove(); });
    this.tableGroup.clear();
    const w = b.maxX - b.minX;
    const d = b.maxY - b.minY;
    const cx = (b.minX + b.maxX) / 2;
    const cz = -(b.minY + b.maxY) / 2;

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.6, 0.4, d + 0.6),
      new THREE.MeshStandardMaterial({ color: '#121419', metalness: 0.6, roughness: 0.45 }),
    );
    top.position.set(cx, -0.2, cz);
    top.receiveShadow = true;
    top.name = 'table';
    this.tableGroup.add(top);

    // Optical breadboard surface: tapped holes on the 0.5 placement grid.
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ map: breadboardTexture(w, d), metalness: 0.5, roughness: 0.5 }),
    );
    board.rotation.x = -Math.PI / 2;
    board.position.set(cx, 0.002, cz);
    board.receiveShadow = true;
    this.tableGroup.add(board);
    // Faint lines every whole unit help reading coordinates.
    const pts: number[] = [];
    for (let x = Math.ceil(b.minX); x <= b.maxX; x++) pts.push(x, 0.004, -b.minY, x, 0.004, -b.maxY);
    for (let y = Math.ceil(b.minY); y <= b.maxY; y++) pts.push(b.minX, 0.004, -y, b.maxX, 0.004, -y);
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.tableGroup.add(new THREE.LineSegments(
      gridGeo, new THREE.LineBasicMaterial({ color: '#2a7f9e', transparent: true, opacity: 0.16 }),
    ));

    // Neon trim around the table edge.
    const trimMat = new THREE.MeshBasicMaterial({ color: PALETTE.cyan.clone().multiplyScalar(1.15), toneMapped: false });
    const t = 0.04;
    const edges: [number, number, number, number][] = [
      [cx, cz - d / 2 - 0.3, w + 0.6, t], [cx, cz + d / 2 + 0.3, w + 0.6, t],
      [cx - w / 2 - 0.3, cz, t, d + 0.6], [cx + w / 2 + 0.3, cz, t, d + 0.6],
    ];
    for (const [x, z, sx, sz] of edges) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.03, sz), trimMat);
      m.position.set(x, 0.005, z);
      this.tableGroup.add(m);
    }
    // Coordinate labels along the front and left edges (every 2 units).
    const label = (text: string, x: number, z: number) => {
      const div = document.createElement('div');
      div.className = 'axis-label';
      div.textContent = text;
      const o = new CSS2DObject(div);
      o.position.set(x, 0.02, z);
      this.tableGroup.add(o);
    };
    for (let x = Math.ceil(b.minX / 2) * 2; x <= b.maxX; x += 2) label(String(x), x, -b.minY + 0.55);
    for (let y = Math.ceil(b.minY / 2) * 2; y <= b.maxY; y += 2) label(String(y), b.minX - 0.6, -y);

    // Table legs / pedestal
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.4, 3, 6),
      new THREE.MeshStandardMaterial({ color: '#070a14', metalness: 0.8, roughness: 0.4 }),
    );
    ped.position.set(cx, -1.9, cz);
    this.tableGroup.add(ped);
  }

  private buildLab(): void {
    // Floor far below the table.
    const floorGrid = new THREE.GridHelper(120, 120, '#24104a', '#120a26');
    floorGrid.position.y = -3.4;
    this.scene.add(floorGrid);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: '#04050a', metalness: 0.9, roughness: 0.35 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.41;
    this.scene.add(floor);

    // Distant neon pillars.
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#080b16', metalness: 0.7, roughness: 0.5 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 22 + (i % 3) * 4;
      const h = 10 + (i % 4) * 4;
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, h, 1.2), pillarMat);
      p.position.set(Math.cos(a) * r, -3.4 + h / 2, Math.sin(a) * r);
      this.scene.add(p);
      const stripColor = (i % 2 ? PALETTE.magenta : PALETTE.cyan).clone().multiplyScalar(1.6);
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, h * 0.8, 0.08),
        new THREE.MeshBasicMaterial({ color: stripColor, toneMapped: false }),
      );
      strip.position.copy(p.position).add(new THREE.Vector3(-Math.cos(a) * 0.62, 0, -Math.sin(a) * 0.62));
      this.scene.add(strip);
    }

    // Floating dust motes.
    const n = 500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = Math.random() * 8 - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(
      g,
      new THREE.PointsMaterial({ color: '#6fd8ff', size: 0.04, transparent: true, opacity: 0.5, depthWrite: false }),
    );
    this.scene.add(this.dust);
  }

  toggleTopView(): void {
    this.setTopView(!this.topView);
  }

  setTopView(on: boolean): void {
    this.topView = on;
    const v = this.view(on);
    this.camTween = {
      from: this.camera.position.clone(), to: v.pos.clone(),
      tFrom: this.controls.target.clone(), tTo: v.target.clone(), t: 0,
    };
  }

  /** Camera views pulled back on narrow screens so the whole table fits. */
  private view(top: boolean): { pos: THREE.Vector3; target: THREE.Vector3 } {
    const v = top ? TOP_VIEW : DEFAULT_VIEW;
    const k = Math.max(1, 1.6 / Math.max(this.camera.aspect, 0.5));
    return { pos: v.target.clone().add(v.pos.clone().sub(v.target).multiplyScalar(k)), target: v.target.clone() };
  }

  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const first = this.camera.aspect === 1;
    this.camera.aspect = w / h;
    if (first) this.camera.position.copy(this.view(false).pos);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    const bloomScale = this.quality === 'low' ? 0.35 : this.quality === 'medium' ? 0.5 : 1;
    this.bloom.resolution.set(w * bloomScale, h * bloomScale);
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.elapsedTime;
    if (this.camTween) {
      const tw = this.camTween;
      tw.t = Math.min(1, tw.t + dt * 1.6);
      const e = 1 - Math.pow(1 - tw.t, 3);
      this.camera.position.lerpVectors(tw.from, tw.to, e);
      this.controls.target.lerpVectors(tw.tFrom, tw.tTo, e);
      if (tw.t >= 1) this.camTween = null;
    }
    this.controls.update();
    this.dust.rotation.y = t * 0.01;
    for (const fn of this.updaters) fn(t, dt);
    this.composer.render();
    this.labelRenderer.render(this.scene, this.camera);
  }
}
