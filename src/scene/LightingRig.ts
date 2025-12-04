import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

export class LightingRig {
  private scene: THREE.Scene;
  private isDayMode = false;
  private hemi!: THREE.HemisphereLight;
  private moon!: THREE.DirectionalLight;
  private fill!: THREE.DirectionalLight;
  private strip!: THREE.RectAreaLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    RectAreaLightUniformsLib.init();
    this.buildLights();
  }

  toggleDayNight(): void {
    this.isDayMode = !this.isDayMode;
    this.updateLighting();
  }

  private updateLighting(): void {
    if (this.isDayMode) {
      // Day mode - bright, warm lighting
      this.hemi.color.set('#87ceeb');
      this.hemi.groundColor.set('#8b7355');
      this.hemi.intensity = 1.5;
      this.moon.color.set('#fffaf0');
      this.moon.intensity = 2.8;
      this.fill.intensity = 1.2;
      this.strip.intensity = 25;
      this.scene.background = new THREE.Color('#87ceeb');
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.set('#a4c8e1');
        this.scene.fog.density = 0.008;
      }
    } else {
      // Night mode - dark, cool lighting
      this.hemi.color.set('#1a324d');
      this.hemi.groundColor.set('#020409');
      this.hemi.intensity = 2.2;
      this.moon.color.set('#8dd1ff');
      this.moon.intensity = 3.5;
      this.fill.intensity = 1.9;
      this.strip.intensity = 45;
      this.scene.background = new THREE.Color('#02040a');
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.set('#02040a');
        this.scene.fog.density = 0.015;
      }
    }
  }

  private buildLights(): void {
    this.hemi = new THREE.HemisphereLight('#1a324d', '#020409', 2.2);
    this.scene.add(this.hemi);

    this.moon = new THREE.DirectionalLight('#8dd1ff', 3.5);
    this.moon.position.set(-40, 60, 20);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    this.moon.shadow.camera.near = 10;
    this.moon.shadow.camera.far = 200;
    this.moon.shadow.camera.left = -60;
    this.moon.shadow.camera.right = 60;
    this.moon.shadow.camera.top = 60;
    this.moon.shadow.camera.bottom = -60;
    this.scene.add(this.moon);

    this.fill = new THREE.DirectionalLight('#f5b58a', 1.9);
    this.fill.position.set(30, 15, -20);
    this.scene.add(this.fill);

    this.strip = new THREE.RectAreaLight('#69f0ff', 45, 8, 1.2);
    this.strip.position.set(0, 1.1, 0);
    this.strip.rotation.x = -Math.PI / 2;
    this.scene.add(this.strip);
  }
}
