import * as THREE from 'three';
import { EnvironmentState, ProjectileState } from './types';

const tmp = new THREE.Vector3();

export function gravityForce(state: ProjectileState, environment: EnvironmentState): THREE.Vector3 {
  return new THREE.Vector3(0, -state.mass * environment.gravity, 0);
}

export function dragForce(state: ProjectileState, environment: EnvironmentState): THREE.Vector3 {
  const relativeVelocity = tmp
    .copy(state.velocity)
    .sub(environment.windVector);
  const speed = relativeVelocity.length();

  if (speed === 0) {
    return new THREE.Vector3();
  }

  const dragMagnitude = 0.5 * environment.airDensity * state.dragCoefficient * state.area * speed * speed;
  return relativeVelocity.normalize().multiplyScalar(-dragMagnitude);
}

export function magnusForce(state: ProjectileState, environment: EnvironmentState): THREE.Vector3 {
  const relativeVelocity = tmp
    .copy(state.velocity)
    .sub(environment.windVector);
  if (relativeVelocity.lengthSq() === 0 || state.spin.lengthSq() === 0) {
    return new THREE.Vector3();
  }
  const lift = new THREE.Vector3().copy(state.spin).cross(relativeVelocity).multiplyScalar(0.5 * state.spinDamping);
  return lift;
}

export function integrateSpin(state: ProjectileState, dt: number): void {
  if (state.spin.lengthSq() === 0) return;
  const damping = Math.exp(-state.spinDamping * dt);
  state.spin.multiplyScalar(damping);
}
