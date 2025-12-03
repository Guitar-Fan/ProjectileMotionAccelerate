import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

export class LightingRig {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    RectAreaLightUniformsLib.init();
    this.buildLights();
  }

  private buildLights(): void {
    const hemi = new THREE.HemisphereLight('#1a324d', '#020409', 0.6);
    this.scene.add(hemi);

    const moon = new THREE.DirectionalLight('#8dd1ff', 2.1);
    moon.position.set(-40, 60, 20);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.near = 10;
    moon.shadow.camera.far = 200;
    moon.shadow.camera.left = -60;
    moon.shadow.camera.right = 60;
    moon.shadow.camera.top = 60;
    moon.shadow.camera.bottom = -60;
    this.scene.add(moon);

    const fill = new THREE.DirectionalLight('#f5b58a', 0.4);
    fill.position.set(30, 15, -20);
    this.scene.add(fill);

    const strip = new THREE.RectAreaLight('#69f0ff', 20, 8, 1.2);
    strip.position.set(0, 1.1, 0);
    strip.rotation.x = -Math.PI / 2;
    this.scene.add(strip);

  }
}
