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

  // Equation (12): F_drag = -(1/2)CdρA|v|v
  // Return as acceleration: a = F/m
  const k = 0.5 * state.dragCoefficient * environment.airDensity * state.area / state.mass;
  return relativeVelocity.clone().multiplyScalar(-k * speed);
}

export function magnusForce(state: ProjectileState, environment: EnvironmentState): THREE.Vector3 {
  const relativeVelocity = tmp
    .copy(state.velocity)
    .sub(environment.windVector);
  if (relativeVelocity.lengthSq() === 0 || state.spin.lengthSq() === 0) {
    return new THREE.Vector3();
  }
  // Magnus force: F = (1/2)ρACL(ω × v)
  // Using spinDamping as a proxy for lift coefficient
  const speed = relativeVelocity.length();
  const clRho = 0.5 * environment.airDensity * state.area * state.spinDamping;
  const lift = new THREE.Vector3().crossVectors(state.spin, relativeVelocity);
  lift.multiplyScalar(clRho / state.mass);
  return lift;
}

export function integrateSpin(state: ProjectileState, dt: number): void {
  if (state.spin.lengthSq() === 0) return;
  const damping = Math.exp(-state.spinDamping * dt);
  state.spin.multiplyScalar(damping);
}

// Integrate rotation quaternion from angular velocity
export function integrateRotation(state: ProjectileState, dt: number): void {
  if (state.spin.lengthSq() === 0) return;
  
  // Convert angular velocity to quaternion derivative
  // dq/dt = (1/2) * ω * q where ω is angular velocity as quaternion
  const halfDt = dt * 0.5;
  const omega = new THREE.Quaternion(
    state.spin.x * halfDt,
    state.spin.y * halfDt,
    state.spin.z * halfDt,
    0
  );
  
  // q_new = q + dq/dt * dt = q + (1/2) * ω * q * dt
  const dq = omega.multiply(state.rotation);
  state.rotation.x += dq.x;
  state.rotation.y += dq.y;
  state.rotation.z += dq.z;
  state.rotation.w += dq.w;
  state.rotation.normalize();
}

// Calculate aerodynamic torque from drag
export function aerodynamicTorque(state: ProjectileState, environment: EnvironmentState): THREE.Vector3 {
  const relativeVelocity = tmp.copy(state.velocity).sub(environment.windVector);
  const speed = relativeVelocity.length();
  
  if (speed === 0 || state.spin.lengthSq() === 0) {
    return new THREE.Vector3();
  }
  
  // Torque from drag on spinning body: τ = -C_torque * ρ * r³ * ω * |v|
  const torqueCoeff = 0.1 * environment.airDensity * Math.pow(state.radius, 3) * speed;
  return state.spin.clone().multiplyScalar(-torqueCoeff);
}
