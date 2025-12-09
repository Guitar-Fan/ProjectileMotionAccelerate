import * as THREE from 'three';

export const DEFAULT_GRAVITY = 9.81; // m/s² (standard Earth gravity)
export const DEFAULT_AIR_DENSITY = 1.2041; // kg/m³ at 20°C at sea level
export const SEA_LEVEL_TEMP = 293.15; // K (20°C)
export const SCALE_HEIGHT = 8500; // m (atmospheric scale height)
export const AIR_VISCOSITY = 1.81e-5; // Pa·s (dynamic viscosity at 20°C)
export const WIND_UPDATE_INTERVAL = 4; // seconds
// Adaptive timesteps for accuracy
export const MIN_TIME_STEP = 0.005;
export const MAX_TIME_STEP = 0.02;
export const ERROR_TOLERANCE = 0.001; // For adaptive stepping

export const WIND_NOISE_VECTOR = new THREE.Vector3(0.4, 0, 0.2);
export const TURBULENCE_INTENSITY = 0.15; // 15% turbulence
export const TURBULENCE_SCALE = 10.0; // meters

// Atmospheric model: density decreases exponentially with altitude
export function airDensityAtAltitude(altitude: number, seaLevelDensity: number = DEFAULT_AIR_DENSITY): number {
  return seaLevelDensity * Math.exp(-altitude / SCALE_HEIGHT);
}

// Temperature-dependent air viscosity (Sutherland's law)
export function airViscosity(temperature: number): number {
  const T0 = 291.15; // K
  const mu0 = 1.827e-5; // Pa·s
  const C = 120; // K (Sutherland's constant)
  return mu0 * Math.pow(temperature / T0, 1.5) * (T0 + C) / (temperature + C);
}

// Reynolds number calculation
export function reynoldsNumber(velocity: number, diameter: number, density: number, viscosity: number): number {
  return (density * velocity * diameter) / viscosity;
}

// Reynolds-dependent drag coefficient for spheres
export function dragCoefficient(re: number, baseCd: number): number {
  if (re < 1) {
    // Stokes flow
    return 24 / re;
  } else if (re < 1000) {
    // Transition regime
    return 24 / re * (1 + 0.15 * Math.pow(re, 0.687));
  } else if (re < 300000) {
    // Subcritical regime
    return baseCd;
  } else if (re < 500000) {
    // Drag crisis (smooth transition)
    const t = (re - 300000) / 200000;
    return baseCd * (1 - 0.6 * t);
  } else {
    // Supercritical regime
    return baseCd * 0.4;
  }
}

// Magnus lift coefficient based on spin ratio
export function magnusLiftCoefficient(spinRatio: number): number {
  // Spin ratio S = rω/v
  // CL peaks around S = 0.3-0.5
  if (spinRatio < 0.1) {
    return 0.5 * spinRatio / 0.1;
  } else if (spinRatio < 0.5) {
    return 0.5;
  } else {
    // Decreases after optimal spin ratio
    return 0.5 * Math.exp(-(spinRatio - 0.5) / 0.3);
  }
}

// Energy conservation (Equation 11): E = (1/2)m(vx² + vy²) + mgy
export function mechanicalEnergy(state: { velocity: THREE.Vector3; position: THREE.Vector3; mass: number }, gravity: number): number {
  const kineticEnergy = 0.5 * state.mass * state.velocity.lengthSq();
  const potentialEnergy = state.mass * gravity * state.position.y;
  return kineticEnergy + potentialEnergy;
}
