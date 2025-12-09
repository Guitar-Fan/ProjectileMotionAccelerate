import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private target: THREE.Object3D | null = null;
  private followOffset = new THREE.Vector3(-8, 4.5, 8);
  private desired = new THREE.Vector3();
  private lerpPosition = new THREE.Vector3();

  constructor(container: HTMLElement) {
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1200);
    this.camera.position.set(-8, 6, 10);
    this.camera.lookAt(0, 1.5, 0);
    this.controls = new OrbitControls(this.camera, container);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = false;
    this.controls.target.set(0, 1.5, 0);
  }

  setTarget(target: THREE.Object3D | null): void {
    this.target = target;
  }

  setSideView(): void {
    // Position camera for a "2D side view" (looking along Z axis)
    // We keep it perspective but flatten the angle
    this.target = null;
    this.camera.position.set(0, 1.5, 12); // Side view (Z-axis offset)
    this.camera.lookAt(0, 1.5, 0);
    this.controls.target.set(0, 1.5, 0);
    this.controls.update();
  }

  update(delta: number): void {
    if (this.target) {
      this.desired.copy(this.target.position).add(this.followOffset);
      this.lerpPosition.lerpVectors(this.camera.position, this.desired, 1 - Math.exp(-delta * 1.5));
      this.camera.position.copy(this.lerpPosition);
      this.controls.target.lerp(this.target.position, 1 - Math.exp(-delta * 3));
    }
    this.controls.update();
    this.camera.updateMatrixWorld();
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
