import * as THREE from 'three';

export const DEFAULT_GRAVITY = 9.81; // m/s² (standard Earth gravity)
export const DEFAULT_AIR_DENSITY = 1.2041; // kg/m³ at 20°C at sea level
export const WIND_UPDATE_INTERVAL = 4; // seconds
// Increased timesteps for faster simulation
export const MIN_TIME_STEP = 0.01;
export const MAX_TIME_STEP = 0.02;

export const WIND_NOISE_VECTOR = new THREE.Vector3(0.4, 0, 0.2);

// Energy conservation (Equation 11): E = (1/2)m(vx² + vy²) + mgy
export function mechanicalEnergy(state: { velocity: THREE.Vector3; position: THREE.Vector3; mass: number }, gravity: number): number {
  const kineticEnergy = 0.5 * state.mass * state.velocity.lengthSq();
  const potentialEnergy = state.mass * gravity * state.position.y;
  return kineticEnergy + potentialEnergy;
}
