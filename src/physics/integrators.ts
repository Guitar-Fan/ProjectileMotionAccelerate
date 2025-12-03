import * as THREE from 'three';
import { ProjectileState, EnvironmentState } from './types';

export type AccelerationFn = (state: ProjectileState, environment: EnvironmentState) => THREE.Vector3;

export function rk4Integrate(
  state: ProjectileState,
  environment: EnvironmentState,
  dt: number,
  accelerationFn: AccelerationFn
): void {
  const k1 = accelerationFn(state, environment);
  const vel1 = state.velocity.clone();

  const tempState = cloneState(state);

  // k2
  tempState.position.addScaledVector(vel1, dt * 0.5);
  tempState.velocity.addScaledVector(k1, dt * 0.5);
  const k2 = accelerationFn(tempState, environment);
  const vel2 = tempState.velocity.clone();

  // k3
  tempState.position.copy(state.position).addScaledVector(vel2, dt * 0.5);
  tempState.velocity.copy(state.velocity).addScaledVector(k2, dt * 0.5);
  const k3 = accelerationFn(tempState, environment);
  const vel3 = tempState.velocity.clone();

  // k4
  tempState.position.copy(state.position).addScaledVector(vel3, dt);
  tempState.velocity.copy(state.velocity).addScaledVector(k3, dt);
  const k4 = accelerationFn(tempState, environment);

  // Aggregate results
  const velocityDelta = k1.addScaledVector(k2, 2).addScaledVector(k3, 2).add(k4).multiplyScalar(dt / 6);
  state.velocity.add(velocityDelta);

  const positionDelta = vel1
    .addScaledVector(vel2, 2)
    .addScaledVector(vel3, 2)
    .add(tempState.velocity)
    .multiplyScalar(dt / 6);
  state.position.add(positionDelta);
}

function cloneState(state: ProjectileState): ProjectileState {
  return {
    position: state.position.clone(),
    velocity: state.velocity.clone(),
    spin: state.spin.clone(),
    mass: state.mass,
    area: state.area,
    dragCoefficient: state.dragCoefficient,
    spinDamping: state.spinDamping,
    restitution: state.restitution
  };
}
