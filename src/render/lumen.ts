/** Lumen, the floating guide robot. */
import * as THREE from 'three';
import { PALETTE } from './color';

export class LumenBot {
  readonly group = new THREE.Group();
  private eyeMat: THREE.MeshBasicMaterial;
  private ringMat: THREE.MeshBasicMaterial;
  private ring: THREE.Mesh;
  private talking = 0;
  private home = new THREE.Vector3(-6.2, 1.5, -5.2);

  constructor() {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 40, 28),
      new THREE.MeshStandardMaterial({ color: '#e9f1ff', metalness: 0.35, roughness: 0.18 }),
    );
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.43, 40, 16, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.36, Math.PI * 0.3),
      new THREE.MeshStandardMaterial({ color: '#05070d', metalness: 0.6, roughness: 0.15 }),
    );
    visor.rotation.y = Math.PI / 2;
    this.eyeMat = new THREE.MeshBasicMaterial({ color: PALETTE.cyan.clone().multiplyScalar(3), toneMapped: false });
    for (const z of [-0.12, 0.12]) {
      const eye = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.07, 4, 8), this.eyeMat);
      eye.position.set(0.41, 0.04, z);
      eye.scale.set(0.5, 1, 1);
      this.group.add(eye);
    }
    this.ringMat = new THREE.MeshBasicMaterial({ color: PALETTE.cyan.clone().multiplyScalar(2), toneMapped: false });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.018, 8, 64), this.ringMat);
    this.ring.rotation.x = Math.PI / 2;
    const light = new THREE.PointLight(PALETTE.cyan, 3, 4);
    this.group.add(shell, visor, this.ring, light);
    this.group.position.copy(this.home);
  }

  talk(): void {
    this.talking = 1.5;
  }

  update(t: number, dt: number, camera: THREE.Camera): void {
    this.talking = Math.max(0, this.talking - dt);
    this.group.position.set(this.home.x, this.home.y + Math.sin(t * 1.6) * 0.12, this.home.z);
    // Face the camera (the eyes are on local +x).
    const toCam = camera.position.clone().sub(this.group.position);
    this.group.rotation.y = Math.atan2(-toCam.z, toCam.x);
    this.ring.rotation.z = t * 0.8;
    this.ring.rotation.y = Math.sin(t * 0.7) * 0.3;
    const blink = Math.sin(t * 0.9) > 0.985 ? 0.1 : 1;
    const k = (2.5 + (this.talking > 0 ? Math.abs(Math.sin(t * 14)) * 2 : 0)) * blink;
    this.eyeMat.color.copy(PALETTE.cyan).multiplyScalar(k);
  }
}
