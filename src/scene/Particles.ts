import * as THREE from 'three';

export class Particles {
  private group: THREE.Points;
  private velocities: Float32Array;

  constructor(scene: THREE.Scene) {
    const count = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = 0.4 + Math.random() * 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      this.velocities[i * 3] = 0;
      this.velocities[i * 3 + 1] = 0.05 + Math.random() * 0.12;
      this.velocities[i * 3 + 2] = 0;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: '#6bf2ff',
      size: 0.08,
      transparent: true,
      opacity: 0.85
    });
    this.group = new THREE.Points(geometry, material);
    scene.add(this.group);
  }

  update(dt: number): void {
    const positions = this.group.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      let y = positions.getY(i) + this.velocities[i * 3 + 1] * dt;
      if (y > 6) {
        y = 0.2;
      }
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
  }
}
