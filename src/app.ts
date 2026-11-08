/** Game controller: ties together the session, 3D view, input, HUD and audio. */
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { audio } from './audio/audio';
import { TRACKS } from './audio/music';
import { LEVELS } from './content/levels';
import { TEXT } from './content/text';
import { AXIS_HEIGHT, ElementState, LED_SIZE, PlaceableKind, buildOpticalScene, coneSources } from './game/elements';
import { trace3d } from './physics/trace3d';
import { LevelSession } from './game/session';
import { deg2rad } from './physics/vec';
import { BeamRenderer } from './render/beams';
import { PALETTE } from './render/color';
import { ElementView, createElementView } from './render/elements';
import { LumenBot } from './render/lumen';
import { Stage } from './render/stage';
import { progress } from './save/progress';
import { Hud } from './ui/hud';

/** Grid snap for moving; Shift-drag uses the fine grid. */
const SNAP = 0.5;
const FINE_SNAP = 0.25;
/** Rotation step for Q/E, scroll and the handle; Shift gives 1°. */
const ROT_STEP = 5;
const snap = (v: number, fine = false) => {
  const s = fine ? FINE_SNAP : SNAP;
  return Math.round(v / s) * s;
};
const fmtDeg = (d: number) => `${Number.isInteger(d) ? d : d.toFixed(1)}°`;

export class App {
  private stage: Stage;
  private beams = new BeamRenderer();
  private lumen = new LumenBot();
  private hud: Hud;
  private session: LevelSession | null = null;
  private views = new Map<string, ElementView>();
  private gizmo = new THREE.Group();
  private handle: THREE.Mesh;
  private ghost: ElementView | null = null;

  private selectedId: string | null = null;
  private hoverId: string | null = null;
  private placingKind: PlaceableKind | null = null;
  private drag: 'move' | 'rotate' | null = null;
  private downAt: { x: number; y: number } | null = null;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  private litTargets = new Set<string>();
  private litRings = new Set<string>();
  private shownStars = 0;
  private completionTimer: number | null = null;

  constructor(container: HTMLElement) {
    this.stage = new Stage(container);
    const s = progress.settings();
    this.stage.setQuality(s.quality);
    audio.setMuted(s.muted);
    audio.setTrack(s.music);
    this.beams.overlayOn = s.overlay;
    this.stage.scene.add(this.beams.group, this.lumen.group, this.gizmo);
    this.stage.buildTable(LEVELS[0].bounds);

    // Selection gizmo: a ring on the table with a draggable rotation handle.
    const ringMat = new THREE.MeshBasicMaterial({ color: PALETTE.cyan.clone().multiplyScalar(1.8), toneMapped: false, transparent: true, opacity: 0.8 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.012, 6, 64), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    this.handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 12),
      new THREE.MeshBasicMaterial({ color: PALETTE.magenta.clone().multiplyScalar(2.5), toneMapped: false }),
    );
    this.handle.position.set(0.9, 0.05, 0);
    this.gizmo.add(ring, this.handle);
    this.gizmo.visible = false;

    this.hud = new Hud(container, {
      selectLevel: (id) => this.loadLevel(id),
      backToMenu: () => this.showMenu(),
      toggleOverlay: () => this.toggleOverlay(),
      hint: () => this.hint(),
      topView: () => { this.stage.toggleTopView(); this.syncToggles(); },
      toggleSound: () => this.toggleSound(),
      cycleMusic: () => {
        const i = TRACKS.findIndex((t) => t.id === progress.settings().music);
        const next = TRACKS[(i + 1) % TRACKS.length];
        progress.updateSettings({ music: next.id });
        audio.start();
        audio.setTrack(next.id);
        this.hud.toast(`♫ ${next.name}`);
        this.syncToggles();
      },
      reset: () => this.resetLevel(),
      pickInventory: (k) => this.startPlacing(k),
      changeSettings: (c) => {
        progress.updateSettings(c);
        if (c.quality) { this.stage.setQuality(c.quality); this.rebuildViews(); }
        if (c.music) { audio.start(); audio.setTrack(c.music); this.syncToggles(); }
        if (c.unlockAll !== undefined && !this.session) this.showMenu();
      },
      resetProgress: () => { progress.resetAll(); this.showMenu(); },
      next: () => this.nextLevel(),
    }, () => progress.settings());

    this.stage.onFrame((t, dt) => {
      for (const v of this.views.values()) v.update?.(t, dt);
      this.ghost?.update?.(t, dt);
      this.beams.update(t);
      this.lumen.update(t, dt, this.stage.camera);
      if (this.hud.talking) this.lumen.talk();
    });

    // Browsers only allow audio after a user gesture: start on the first click anywhere.
    window.addEventListener('pointerdown', () => audio.start(), { capture: true });
    this.bindInput(this.stage.renderer.domElement);
    this.showMenu();
  }

  // ---------------- Levels ----------------

  private showMenu(): void {
    this.clearLevel();
    this.session = null;
    this.hud.showMenu((id) => progress.stars(id));
    this.stage.setTopView(false);
  }

  private loadLevel(id: string): void {
    const level = LEVELS.find((l) => l.id === id);
    if (!level) return;
    this.clearLevel();
    this.session = new LevelSession(level);
    this.stage.buildTable(level.bounds);
    this.hud.enterLevel(level);
    this.shownStars = 0;
    this.litTargets.clear();
    this.litRings.clear();
    this.refresh(true);
    this.syncToggles();
    this.hud.say(level.intro);
    progress.markIntroSeen(level.id);
  }

  private nextLevel(): void {
    if (!this.session) return;
    const i = LEVELS.findIndex((l) => l.id === this.session!.level.id);
    const next = LEVELS[i + 1];
    if (next) this.loadLevel(next.id);
    else { this.showMenu(); this.hud.say([TEXT.allDone]); }
  }

  private resetLevel(): void {
    if (!this.session) return;
    this.cancelPlacing();
    this.select(null);
    this.session.reset();
    this.shownStars = 0;
    this.refresh();
  }

  private clearLevel(): void {
    this.cancelPlacing();
    this.select(null);
    for (const v of this.views.values()) this.removeView(v);
    this.views.clear();
    this.beams.show({ segments: [], interactions: [], hitTargets: new Set(), hitSensors: new Set(), power: new Map(), screenHits: [] });
    this.beams.showCones([]);
    if (this.completionTimer) clearTimeout(this.completionTimer);
  }

  private rebuildViews(): void {
    for (const v of this.views.values()) this.removeView(v);
    this.views.clear();
    if (this.session) this.refresh(true);
  }

  /** Remove a view from the scene, including any HTML labels (CSS2D) inside it. */
  private removeView(v: ElementView): void {
    this.stage.levelRoot.remove(v.group);
    v.group.traverse((o) => { if (o instanceof CSS2DObject) o.element.remove(); });
  }

  // ---------------- Refresh ----------------

  /** Sync everything with the session after a change. */
  private refresh(silent = false): void {
    const s = this.session;
    if (!s) return;
    const ids = new Set(s.elements.map((e) => e.id));
    for (const [id, v] of this.views) {
      if (!ids.has(id)) { this.removeView(v); this.views.delete(id); }
    }
    for (const el of s.elements) {
      let v = this.views.get(el.id);
      if (!v) {
        v = createElementView(el, this.stage.quality);
        this.views.set(el.id, v);
        this.stage.levelRoot.add(v.group);
        v.group.traverse((o) => { o.castShadow = o instanceof THREE.Mesh && o.castShadow; });
      }
      v.sync();
    }

    const ev = s.evaluation;
    this.beams.show(ev.trace);
    // 3D cones of light from LEDs and objects (drawing only; goals use the 2D in-plane rays).
    const cones = s.elements.flatMap((e) => coneSources(e));
    this.beams.showCones(cones.length
      ? trace3d(buildOpticalScene(s.elements, s.level.bounds).scene, cones, { floor: -AXIS_HEIGHT }).segments
      : []);
    const lit = new Set(ev.litTargets);
    for (const el of s.elements) {
      if (el.kind === 'target') this.views.get(el.id)?.setLit?.(lit.has(el.id));
      if (el.kind === 'ring') this.views.get(el.id)?.setLit?.(ev.trace.hitSensors.has(el.id));
    }
    if (!silent) {
      if ([...lit].some((id) => !this.litTargets.has(id))) audio.targetOn();
      else if ([...this.litTargets].some((id) => !lit.has(id))) audio.targetOff();
      if ([...ev.trace.hitSensors].some((id) => !this.litRings.has(id))) audio.bonus();
    }
    this.litTargets = lit;
    this.litRings = new Set(ev.trace.hitSensors);

    this.hud.setGoals(s.level, ev, s.elements);
    for (const el of s.elements) {
      if (el.kind !== 'screen') continue;
      const image = ev.images.find((i) => i.goal.screen === el.id);
      this.views.get(el.id)?.showScreen?.(ev.trace.screenHits.filter((h) => h.ownerId === el.id), image);
    }
    this.hud.setInventory(s.level, (k) => s.remaining(k), this.placingKind);
    this.hud.setPhysics(this.beams.overlayOn, ev.trace.interactions, this.lensInfo());
    this.updateSelectionUi();
    this.scheduleCompletionCheck();
  }

  private scheduleCompletionCheck(): void {
    if (this.completionTimer) clearTimeout(this.completionTimer);
    const s = this.session;
    if (!s || !s.evaluation.solved || this.drag) return;
    this.completionTimer = window.setTimeout(() => {
      const ev = s.evaluation;
      if (this.session !== s || !ev.solved || this.drag || ev.stars <= this.shownStars) return;
      this.shownStars = ev.stars;
      const newBest = progress.recordStars(s.level.id, ev.stars);
      const idx = LEVELS.findIndex((l) => l.id === s.level.id);
      audio.complete();
      this.cancelPlacing();
      this.hud.showComplete(s.level, ev.stars, newBest, idx < LEVELS.length - 1,
        TEXT.solved[Math.floor(Math.random() * TEXT.solved.length)]);
    }, 650);
  }

  // ---------------- Selection & placing ----------------

  private select(id: string | null): void {
    this.selectedId = id;
    this.updateSelectionUi();
  }

  private updateSelectionUi(): void {
    const el = this.selectedId ? this.session?.get(this.selectedId) : undefined;
    if (!el) {
      this.selectedId = null;
      this.gizmo.visible = false;
      this.hud.setSelection(null);
      return;
    }
    this.gizmo.visible = !!el.rotatable || !!el.movable;
    this.handle.visible = !!el.rotatable;
    this.gizmo.position.set(el.x, 0, -el.y);
    this.gizmo.rotation.y = deg2rad(el.rotation);
    const name = TEXT.elementNames[el.kind];
    const parts = [`<b>${name}</b>`, `<span class="coords">(${el.x}, ${el.y})</span>`];
    if (el.rotatable) parts.push(`<span class="angle">${fmtDeg(el.rotation)}</span>`);
    if (el.kind === 'lens') parts.push(`f = ${(el.focal ?? 2).toFixed(1)}` + ((el.focal ?? 2) > 0 ? ' (converging)' : ' (diverging)'));
    if (el.kind === 'block' || el.kind === 'prism') parts.push(`n = ${typeof el.index === 'number' ? el.index.toFixed(2) : '1.50'}`);
    const tips: string[] = [];
    if (el.movable) tips.push('drag to move (Shift: fine)');
    if (el.rotatable) tips.push('Q/E or scroll: rotate 5° · hold Shift: 1° steps');
    if (el.placed) tips.push('right-click to remove');
    this.hud.setSelection(`${parts.join(' · ')}<small>${tips.join(' · ')}</small>`);
  }

  private startPlacing(kind: PlaceableKind): void {
    if (!this.session || this.session.remaining(kind) <= 0) return;
    audio.start();
    audio.pickup();
    this.cancelPlacing();
    this.select(null);
    this.placingKind = kind;
    const tmpl = this.session.template(kind);
    this.ghost = createElementView(tmpl, 'low');
    this.ghost.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
        const m = (o.material as THREE.Material).clone();
        m.transparent = true;
        m.opacity = 0.45;
        m.depthWrite = false;
        o.material = m;
      }
    });
    this.ghost.group.visible = false;
    this.stage.scene.add(this.ghost.group);
    this.hud.setInventory(this.session.level, (k) => this.session!.remaining(k), kind);
  }

  private cancelPlacing(): void {
    if (this.ghost) {
      this.stage.scene.remove(this.ghost.group);
      this.ghost.group.traverse((o) => { if (o instanceof CSS2DObject) o.element.remove(); });
    }
    this.ghost = null;
    if (this.placingKind && this.session) {
      this.placingKind = null;
      this.hud.setInventory(this.session.level, (k) => this.session!.remaining(k), null);
    }
    this.placingKind = null;
    this.updateSelectionUi();
  }

  private rotateSelected(delta: number): void {
    const el = this.selectedId ? this.session?.get(this.selectedId) : undefined;
    if (!el || !el.rotatable) return;
    const step = Math.abs(delta);
    const target = step > 1 ? Math.round((el.rotation + delta) / step) * step : el.rotation + delta;
    if (this.session!.rotate(el.id, target)) { audio.tick(); this.refresh(); }
  }

  // ---------------- Input ----------------

  private bindInput(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const id = this.pick(e);
      if (id && this.session?.get(id)?.placed) {
        this.session.remove(id);
        if (this.selectedId === id) this.select(null);
        audio.remove();
        this.refresh();
      } else if (this.placingKind) {
        this.cancelPlacing();
      }
    });
    canvas.addEventListener('wheel', (e) => {
      const id = this.pick(e);
      const el = id ? this.session?.get(id) : undefined;
      if (!el?.rotatable) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      this.select(el.id);
      const dir = (e.deltaY || e.deltaX) > 0 ? -1 : 1;
      this.rotateSelected(dir * (e.shiftKey ? 1 : ROT_STEP));
    }, { capture: true, passive: false });

    window.addEventListener('keydown', (e) => {
      audio.start();
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const k = e.key.toLowerCase();
      if ((k === ' ' || k === 'enter') && this.hud.talking) { e.preventDefault(); this.hud.advance(); return; }
      if (k === 'escape') {
        if (this.placingKind) this.cancelPlacing();
        else if (this.hud.modalOpen) this.hud.hideModal();
        else this.select(null);
        return;
      }
      if (!this.session || this.hud.modalOpen) return;
      if (k === 'q') this.rotateSelected(e.shiftKey ? 1 : ROT_STEP);
      else if (k === 'e') this.rotateSelected(e.shiftKey ? -1 : -ROT_STEP);
      else if (k === 'f') this.toggleOverlay();
      else if (k === 'h') this.hint();
      else if (k === 't') { this.stage.toggleTopView(); this.syncToggles(); }
      else if (k === 'm') this.toggleSound();
      else if ((k === 'delete' || k === 'backspace') && this.selectedId) {
        if (this.session.remove(this.selectedId)) { audio.remove(); this.select(null); this.refresh(); }
      }
    });
  }

  private setPointer(e: MouseEvent): void {
    const r = (e.target as HTMLElement).getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.stage.camera);
  }

  /** Element id under the pointer. */
  private pick(e: MouseEvent): string | null {
    this.setPointer(e);
    const hits = this.raycaster.intersectObjects(this.stage.levelRoot.children, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && o.userData.elementId === undefined) o = o.parent;
      if (o) return o.userData.elementId as string;
    }
    return null;
  }

  /** Point on the table (physics coordinates) under the pointer. */
  private tablePoint(e: MouseEvent): { x: number; y: number } | null {
    this.setPointer(e);
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.plane, p) ? { x: p.x, y: -p.z } : null;
  }

  private onDown(e: PointerEvent): void {
    audio.start();
    if (e.button !== 0 || !this.session || this.hud.modalOpen) return;

    if (this.placingKind && this.ghost) {
      const p = this.tablePoint(e);
      if (!p) return;
      const el: ElementState = { ...this.session.template(this.placingKind), x: snap(p.x), y: snap(p.y) };
      if (this.session.place(el)) {
        audio.place();
        this.cancelPlacing();
        this.select(el.id);
        this.refresh();
      } else {
        audio.deny();
      }
      return;
    }

    this.setPointer(e);
    if (this.gizmo.visible && this.handle.visible && this.raycaster.intersectObject(this.handle).length) {
      this.drag = 'rotate';
      this.stage.controls.enabled = false;
      return;
    }

    const id = this.pick(e);
    const el = id ? this.session.get(id) : undefined;
    if (el && (el.movable || el.rotatable)) {
      this.select(el.id);
      audio.click();
      if (el.movable) {
        this.drag = 'move';
        this.stage.controls.enabled = false;
      }
      return;
    }
    this.downAt = { x: e.clientX, y: e.clientY };
  }

  private onMove(e: PointerEvent): void {
    if (!this.session) return;
    const canvas = this.stage.renderer.domElement;

    if (this.placingKind && this.ghost) {
      const p = this.tablePoint(e);
      if (!p) return;
      const x = snap(p.x);
      const y = snap(p.y);
      this.ghost.el.x = x;
      this.ghost.el.y = y;
      this.ghost.sync();
      this.ghost.group.visible = true;
      const ok = this.session.canPlace(this.ghost.el, x, y) && this.session.remaining(this.placingKind) > 0;
      this.ghost.group.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          (o.material as THREE.Material).opacity = ok ? 0.5 : 0.15;
        }
      });
      canvas.style.cursor = ok ? 'copy' : 'not-allowed';
      this.hud.setSelection(`<b>Place ${TEXT.elementNames[this.placingKind]}</b> · <span class="coords">(${x}, ${y})</span><small>click to place · Esc or right-click to cancel</small>`);
      return;
    }

    if (this.drag === 'move' && this.selectedId) {
      const p = this.tablePoint(e);
      if (p && this.session.move(this.selectedId, snap(p.x, e.shiftKey), snap(p.y, e.shiftKey))) {
        audio.tick();
        this.refresh();
      }
      return;
    }
    if (this.drag === 'rotate' && this.selectedId) {
      const p = this.tablePoint(e);
      const el = this.session.get(this.selectedId);
      if (p && el) {
        const raw = (Math.atan2(p.y - el.y, p.x - el.x) * 180) / Math.PI;
        const step = e.shiftKey ? 1 : ROT_STEP;
        if (this.session.rotate(el.id, Math.round(raw / step) * step)) { audio.tick(); this.refresh(); }
      }
      return;
    }

    // Hover feedback.
    const id = this.pick(e);
    const el = id ? this.session.get(id) : undefined;
    const interactive = el && (el.movable || el.rotatable) ? el.id : null;
    if (interactive !== this.hoverId) {
      if (this.hoverId) this.views.get(this.hoverId)?.setHover(false);
      if (interactive) this.views.get(interactive)?.setHover(true);
      this.hoverId = interactive;
    }
    this.setPointer(e);
    const onHandle = this.gizmo.visible && this.handle.visible && this.raycaster.intersectObject(this.handle).length > 0;
    canvas.style.cursor = onHandle ? 'alias' : el?.movable ? 'grab' : el?.rotatable ? 'pointer' : 'default';
  }

  private onUp(e: PointerEvent): void {
    const was = this.drag;
    this.drag = null;
    this.stage.controls.enabled = true;
    if (was) this.scheduleCompletionCheck();
    // A click (not a camera drag) on empty space deselects.
    if (this.downAt && Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) < 5) this.select(null);
    this.downAt = null;
  }

  /**
   * Physics-panel summary for each lens: the lens equation for the first light source in front of it
   * (an object or LED), with object distance u, image distance v and magnification m.
   */
  private lensInfo(): string {
    const s = this.session;
    if (!s) return '';
    const lenses = s.elements.filter((e) => e.kind === 'lens');
    if (!lenses.length) return '';
    const src = s.elements.find((e) => e.kind === 'object' || e.kind === 'led');
    const rows = lenses.map((L, i) => {
      const f = L.focal ?? 2;
      let eq = `<code>1/f = 1/u + 1/v</code>`;
      if (src && i === 0) {
        const axis = { x: Math.cos(deg2rad(L.rotation)), y: Math.sin(deg2rad(L.rotation)) };
        // LEDs emit from the front of their housing, objects from their own position.
        const off = src.kind === 'led' ? LED_SIZE / 2 + 0.02 : 0;
        const sx = src.x + off * Math.cos(deg2rad(src.rotation));
        const sy = src.y + off * Math.sin(deg2rad(src.rotation));
        const u = Math.abs((L.x - sx) * axis.x + (L.y - sy) * axis.y);
        if (u > 1e-6) {
          const inv = 1 / f - 1 / u;
          if (Math.abs(inv) < 1e-9) {
            eq += `<code>u = ${u.toFixed(2)} = f → v = ∞ (parallel rays)</code>`;
          } else {
            const v = 1 / inv;
            eq += `<code>1/${f.toFixed(2)} = 1/${u.toFixed(2)} + 1/v → v = ${v.toFixed(2)}</code>`;
            eq += `<code>m = −v/u = ${(-v / u).toFixed(2)}${v < 0 ? ' (virtual image)' : ''}</code>`;
          }
        }
      }
      return `<li><b>Lens ${i + 1}: f = ${f.toFixed(2)}</b>${eq}</li>`;
    });
    return `<ol class="lens-info">${rows.join('')}</ol>`;
  }

  /** Dev helper: screen position (CSS px) of a table point. */
  debugScreen(x: number, y: number): { x: number; y: number } {
    const v = new THREE.Vector3(x, 0, -y).project(this.stage.camera);
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  // ---------------- Toggles ----------------

  private toggleOverlay(): void {
    const on = !this.beams.overlayOn;
    this.beams.setOverlay(on);
    progress.updateSettings({ overlay: on });
    if (this.session) this.hud.setPhysics(on, this.session.evaluation.trace.interactions, this.lensInfo());
    this.syncToggles();
  }

  private toggleSound(): void {
    const muted = !progress.settings().muted;
    progress.updateSettings({ muted });
    audio.setMuted(muted);
    this.syncToggles();
  }

  private syncToggles(): void {
    this.hud.setToggles({ overlay: this.beams.overlayOn, sound: !progress.settings().muted, topView: this.stage.topView });
  }

  private hint(): void {
    const s = this.session;
    if (!s) return;
    audio.hint();
    if (s.hintsShown >= s.level.hints.length) {
      this.hud.say([TEXT.noMoreHints, ...s.level.hints]);
      return;
    }
    s.hintsShown++;
    this.hud.say([`Hint ${s.hintsShown}/${s.level.hints.length}: ${s.level.hints[s.hintsShown - 1]}`]);
  }
}
