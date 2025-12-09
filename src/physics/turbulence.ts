import * as THREE from 'three';
import { TURBULENCE_INTENSITY, TURBULENCE_SCALE } from './constants';

// Simple 3D Perlin-like noise for wind turbulence
class SimplexNoise {
  private seed: number;

  constructor(seed: number = Math.random()) {
    this.seed = seed;
  }

  // Hash function for pseudo-random values
  private hash(x: number, y: number, z: number, t: number): number {
    let h = this.seed;
    h = Math.sin(h + x * 374761393 + y * 668265263 + z * 1274126177 + t * 1138340171) * 43758.5453;
    return h - Math.floor(h);
  }

  // Interpolation function
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  // Smooth step function
  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  // 4D noise (including time)
  noise4D(x: number, y: number, z: number, t: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const ti = Math.floor(t);

    const xf = x - xi;
    const yf = y - yi;
    const zf = z - zi;
    const tf = t - ti;

    const u = this.smoothstep(xf);
    const v = this.smoothstep(yf);
    const w = this.smoothstep(zf);
    const s = this.smoothstep(tf);

    // Sample 16 corners of 4D hypercube
    const n0000 = this.hash(xi, yi, zi, ti);
    const n1000 = this.hash(xi + 1, yi, zi, ti);
    const n0100 = this.hash(xi, yi + 1, zi, ti);
    const n1100 = this.hash(xi + 1, yi + 1, zi, ti);
    const n0010 = this.hash(xi, yi, zi + 1, ti);
    const n1010 = this.hash(xi + 1, yi, zi + 1, ti);
    const n0110 = this.hash(xi, yi + 1, zi + 1, ti);
    const n1110 = this.hash(xi + 1, yi + 1, zi + 1, ti);

    const n0001 = this.hash(xi, yi, zi, ti + 1);
    const n1001 = this.hash(xi + 1, yi, zi, ti + 1);
    const n0101 = this.hash(xi, yi + 1, zi, ti + 1);
    const n1101 = this.hash(xi + 1, yi + 1, zi, ti + 1);
    const n0011 = this.hash(xi, yi, zi + 1, ti + 1);
    const n1011 = this.hash(xi + 1, yi, zi + 1, ti + 1);
    const n0111 = this.hash(xi, yi + 1, zi + 1, ti + 1);
    const n1111 = this.hash(xi + 1, yi + 1, zi + 1, ti + 1);

    // Interpolate
    const x00_0 = this.lerp(n0000, n1000, u);
    const x10_0 = this.lerp(n0100, n1100, u);
    const x01_0 = this.lerp(n0010, n1010, u);
    const x11_0 = this.lerp(n0110, n1110, u);

    const x00_1 = this.lerp(n0001, n1001, u);
    const x10_1 = this.lerp(n0101, n1101, u);
    const x01_1 = this.lerp(n0011, n1011, u);
    const x11_1 = this.lerp(n0111, n1111, u);

    const y0_0 = this.lerp(x00_0, x10_0, v);
    const y1_0 = this.lerp(x01_0, x11_0, v);
    const y0_1 = this.lerp(x00_1, x10_1, v);
    const y1_1 = this.lerp(x01_1, x11_1, v);

    const z_0 = this.lerp(y0_0, y1_0, w);
    const z_1 = this.lerp(y0_1, y1_1, w);

    return this.lerp(z_0, z_1, s) * 2 - 1; // Normalize to [-1, 1]
  }
}

export class TurbulenceField {
  private noiseX: SimplexNoise;
  private noiseY: SimplexNoise;
  private noiseZ: SimplexNoise;
  private time: number = 0;

  constructor() {
    this.noiseX = new SimplexNoise(Math.random());
    this.noiseY = new SimplexNoise(Math.random());
    this.noiseZ = new SimplexNoise(Math.random());
  }

  update(dt: number): void {
    this.time += dt * 0.5; // Slow down time evolution
  }

  // Get turbulent wind velocity at position
  getTurbulence(position: THREE.Vector3, baseWind: THREE.Vector3): THREE.Vector3 {
    const scale = TURBULENCE_SCALE;
    const x = position.x / scale;
    const y = position.y / scale;
    const z = position.z / scale;
    const t = this.time;

    // Sample noise at multiple frequencies (fractal noise)
    const turbX = 
      this.noiseX.noise4D(x, y, z, t) * 1.0 +
      this.noiseX.noise4D(x * 2, y * 2, z * 2, t * 2) * 0.5 +
      this.noiseX.noise4D(x * 4, y * 4, z * 4, t * 4) * 0.25;

    const turbY = 
      this.noiseY.noise4D(x, y, z, t) * 1.0 +
      this.noiseY.noise4D(x * 2, y * 2, z * 2, t * 2) * 0.5 +
      this.noiseY.noise4D(x * 4, y * 4, z * 4, t * 4) * 0.25;

    const turbZ = 
      this.noiseZ.noise4D(x, y, z, t) * 1.0 +
      this.noiseZ.noise4D(x * 2, y * 2, z * 2, t * 2) * 0.5 +
      this.noiseZ.noise4D(x * 4, y * 4, z * 4, t * 4) * 0.25;

    // Add ground layer effect (wind weaker near surface)
    const groundEffect = Math.min(1.0, position.y / 10.0);

    // Scale by base wind speed and turbulence intensity
    const baseSpeed = baseWind.length();
    const turbulence = new THREE.Vector3(
      turbX * baseSpeed * TURBULENCE_INTENSITY,
      turbY * baseSpeed * TURBULENCE_INTENSITY * 0.5, // Less vertical turbulence
      turbZ * baseSpeed * TURBULENCE_INTENSITY
    );

    return baseWind.clone().multiplyScalar(groundEffect).add(turbulence);
  }

  // Add gust effect (sudden wind increase)
  addGust(position: THREE.Vector3, time: number): THREE.Vector3 {
    // Periodic gusts every ~20 seconds
    const gustPeriod = 20.0;
    const gustPhase = (time % gustPeriod) / gustPeriod;
    
    // Gaussian-like gust profile
    const gustStrength = Math.exp(-Math.pow((gustPhase - 0.5) * 4, 2));
    
    // Gust direction varies with position
    const gustAngle = Math.sin(position.x * 0.1 + time * 0.3) * Math.PI;
    const gustDir = new THREE.Vector3(
      Math.cos(gustAngle),
      0,
      Math.sin(gustAngle)
    );
    
    return gustDir.multiplyScalar(gustStrength * 5.0); // Up to 5 m/s gust
  }
}
