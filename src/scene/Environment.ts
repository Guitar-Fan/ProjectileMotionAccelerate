import * as THREE from 'three';
import { AssetLibrary } from '../assets/proceduralTextures';

export class Environment {
  private scene: THREE.Scene;
  private assets: AssetLibrary;

  constructor(scene: THREE.Scene, assets: AssetLibrary) {
    this.scene = scene;
    this.assets = assets;
    this.buildGround();
    this.buildBackdrop();
  }

  private buildGround(): void {
    const geometry = new THREE.CircleGeometry(120, 120);
    const material = new THREE.MeshStandardMaterial({
      map: this.assets.groundTexture,
      roughness: 0.95,
      metalness: 0.05
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  private buildBackdrop(): void {
    this.scene.background = this.assets.skyTexture;
    this.scene.fog = new THREE.FogExp2('#02040a', 0.015);

    const silhouetteGeometry = new THREE.PlaneGeometry(300, 60, 1, 1);
    const silhouetteMaterial = new THREE.MeshBasicMaterial({
      color: '#060910',
      transparent: true,
      opacity: 0.65
    });
    const plane = new THREE.Mesh(silhouetteGeometry, silhouetteMaterial);
    plane.position.set(0, 18, -120);
    this.scene.add(plane);
  }
}
