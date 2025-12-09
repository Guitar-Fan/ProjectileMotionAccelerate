import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { AssetLibrary } from '../assets/proceduralTextures';
import { CameraRig } from './CameraRig';
import { LightingRig } from './LightingRig';
import { Environment } from './Environment';
import { Particles } from './Particles';

export class SceneComposer {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  readonly composer: EffectComposer;
  readonly cameraRig: CameraRig;
  readonly lighting: LightingRig;
  readonly lightingRig: LightingRig; // Alias for external access
  readonly environment: Environment;
  readonly particles: Particles;
  readonly assets: AssetLibrary;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.assets = new AssetLibrary();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.cameraRig = new CameraRig(this.renderer.domElement);
    this.environment = new Environment(this.scene, this.assets);
    this.lighting = new LightingRig(this.scene);
    this.lightingRig = this.lighting; // Provide alias for external access
    this.particles = new Particles(this.scene, this.assets);

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.cameraRig.camera);
    this.composer.addPass(renderPass);

    const ssao = new SSAOPass(this.scene, this.cameraRig.camera, container.clientWidth, container.clientHeight);
    ssao.kernelRadius = 16;
    ssao.minDistance = 0.001;
    ssao.maxDistance = 0.15;
    this.composer.addPass(ssao);

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.65,
      0.6,
      0.35
    );
    this.composer.addPass(bloom);

    const film = new FilmPass();
    this.composer.addPass(film);

    window.addEventListener('resize', () => this.handleResize());
  }

  update(delta: number): void {
    this.cameraRig.update(delta);
    this.particles.update(delta);
    this.composer.render();
  }

  setTrackingTarget(object: THREE.Object3D | null): void {
    this.cameraRig.setTarget(object);
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.cameraRig.resize(width, height);
  }
}
