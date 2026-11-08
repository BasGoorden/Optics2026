/**
 * Glowing laser beams, hit sparks and the physics overlay (normals + angle labels).
 */
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { Interaction, TraceResult } from '../physics/trace';
import { rad2deg } from '../physics/vec';
import { BEAM_HEIGHT, wavelengthToColor } from './color';

const UP = new THREE.Vector3(0, 1, 0);
const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);

function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const fmt = (rad: number | undefined) => `${rad2deg(rad ?? 0).toFixed(1)}°`;

export class BeamRenderer {
  readonly group = new THREE.Group();
  private beams = new THREE.Group();
  private sparks = new THREE.Group();
  private overlay = new THREE.Group();
  private spriteTex = glowTexture();
  private sparkSprites: THREE.Sprite[] = [];
  overlayOn = false;
  private last: TraceResult | null = null;

  constructor() {
    this.group.add(this.beams, this.sparks, this.overlay);
  }

  setOverlay(on: boolean): void {
    this.overlayOn = on;
    if (this.last) this.buildOverlay(this.last);
  }

  show(trace: TraceResult): void {
    this.last = trace;
    this.disposeChildren(this.beams);
    this.sparks.clear();
    this.sparkSprites = [];

    for (const s of trace.segments) {
      const a = new THREE.Vector3(s.from.x, BEAM_HEIGHT, -s.from.y);
      const b = new THREE.Vector3(s.to.x, BEAM_HEIGHT, -s.to.y);
      const len = a.distanceTo(b);
      if (len < 1e-4) continue;
      const color = wavelengthToColor(s.wavelength);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const q = new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize());
      // Inside glass the beam looks a little softer.
      const inGlass = s.n > 1.0001;
      const core = new THREE.Mesh(
        unitCylinder,
        new THREE.MeshBasicMaterial({
          color: color.clone().lerp(new THREE.Color(1, 1, 1), 0.45).multiplyScalar(inGlass ? 1.6 : 2.2),
          toneMapped: false,
        }),
      );
      core.scale.set(0.018, len, 0.018);
      const halo = new THREE.Mesh(
        unitCylinder,
        new THREE.MeshBasicMaterial({
          color: color.clone().multiplyScalar(1.1), transparent: true, opacity: inGlass ? 0.18 : 0.28,
          blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
        }),
      );
      halo.scale.set(0.06, len, 0.06);
      for (const m of [core, halo]) {
        m.position.copy(mid);
        m.quaternion.copy(q);
        this.beams.add(m);
      }
    }

    for (const it of trace.interactions) {
      if (it.type === 'escape') continue;
      const color = it.type === 'absorb' ? new THREE.Color('#ff6040') : wavelengthToColor(trace.segments[0]?.wavelength ?? 532);
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.spriteTex, color: color.multiplyScalar(2.5), blending: THREE.AdditiveBlending,
          depthWrite: false, toneMapped: false, transparent: true,
        }),
      );
      sp.position.set(it.point.x, BEAM_HEIGHT, -it.point.y);
      sp.scale.setScalar(0.35);
      this.sparks.add(sp);
      this.sparkSprites.push(sp);
    }
    this.buildOverlay(trace);
  }

  update(t: number): void {
    this.sparkSprites.forEach((s, i) => s.scale.setScalar(0.3 + 0.08 * Math.sin(t * 9 + i * 1.7)));
  }

  private buildOverlay(trace: TraceResult): void {
    this.disposeChildren(this.overlay);
    if (!this.overlayOn) return;
    const lineMat = new THREE.LineDashedMaterial({
      color: '#ffffff', dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0.7, toneMapped: false,
    });
    for (const it of trace.interactions) {
      if (!it.normal || (it.type !== 'reflect' && it.type !== 'refract' && it.type !== 'tir')) continue;
      const p = new THREE.Vector3(it.point.x, BEAM_HEIGHT + 0.01, -it.point.y);
      const nrm = new THREE.Vector3(it.normal.x, 0, -it.normal.y);
      const g = new THREE.BufferGeometry().setFromPoints([
        p.clone().addScaledVector(nrm, 0.9), p.clone().addScaledVector(nrm, -0.9),
      ]);
      const line = new THREE.Line(g, lineMat);
      line.computeLineDistances();
      this.overlay.add(line);

      const div = document.createElement('div');
      div.className = `phys-label phys-${it.type}`;
      div.innerHTML = labelHtml(it);
      const label = new CSS2DObject(div);
      label.position.copy(p).addScaledVector(nrm, 0.55).add(new THREE.Vector3(0, 0.35, 0));
      this.overlay.add(label);
    }
  }

  private disposeChildren(g: THREE.Group): void {
    for (const c of [...g.children]) {
      g.remove(c);
      if (c instanceof CSS2DObject) c.element.remove();
      if (c instanceof THREE.Mesh || c instanceof THREE.Line) {
        if (c.geometry !== unitCylinder) c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      }
    }
  }
}

function labelHtml(it: Interaction): string {
  if (it.type === 'reflect') return `<b>θᵢ</b> ${fmt(it.thetaI)} <span>=</span> <b>θᵣ</b> ${fmt(it.thetaT)}`;
  if (it.type === 'tir') {
    const crit = it.n1 && it.n2 ? Math.asin(it.n2 / it.n1) : 0;
    return `<b>TIR</b> θ ${fmt(it.thetaI)} &gt; θc ${fmt(crit)}`;
  }
  return `<b>θ₁</b> ${fmt(it.thetaI)} → <b>θ₂</b> ${fmt(it.thetaT)}<br><small>n ${it.n1?.toFixed(2)} → ${it.n2?.toFixed(2)}</small>`;
}
