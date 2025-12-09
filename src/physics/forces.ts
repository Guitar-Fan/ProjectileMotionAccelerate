import * as THREE from 'three';
import { EnvironmentState, ProjectileState } from './types';
import { 
  reynoldsNumber, 
  dragCoefficient as getDragCoefficient,
  magnusLiftCoefficient,
  airViscosity,
  airDensityAtAltitude,
  SEA_LEVEL_TEMP
} from './constants';

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

  // Calculate altitude-dependent air density
  const altitude = Math.max(0, state.position.y);
  const rho = airDensityAtAltitude(altitude, environment.airDensity);
  
  // Calculate Reynolds number and get Reynolds-dependent drag coefficient
  const diameter = state.radius * 2;
  const mu = airViscosity(SEA_LEVEL_TEMP);
  const re = reynoldsNumber(speed, diameter, rho, mu);
  const cd = getDragCoefficient(re, state.dragCoefficient);
  
  // Equation (12): F_drag = -(1/2)CdρA|v|v
  // Return as acceleration: a = F/m
  const k = 0.5 * cd * rho * state.area / state.mass;
  return relativeVelocity.clone().multiplyScalar(-k * speed);
}

export function magnusForce(state: ProjectileState, environment: EnvironmentState): THREE.Vector3 {
  const relativeVelocity = tmp
    .copy(state.velocity)
    .sub(environment.windVector);
  if (relativeVelocity.lengthSq() === 0 || state.spin.lengthSq() === 0) {
    return new THREE.Vector3();
  }
  
  const speed = relativeVelocity.length();
  const spinSpeed = state.spin.length();
  
  // Calculate altitude-dependent air density
  const altitude = Math.max(0, state.position.y);
  const rho = airDensityAtAltitude(altitude, environment.airDensity);
  
  // Calculate spin ratio: S = rω/v
  const spinRatio = (state.radius * spinSpeed) / (speed + 0.01); // Avoid division by zero
  
  // Get spin-ratio-dependent lift coefficient
  const cl = magnusLiftCoefficient(spinRatio);
  
  // Magnus force: F = (1/2)ρACL(ω × v)
  // Enhanced multiplier for visibility
  const clRho = 0.5 * rho * state.area * cl * 3.0;
  const lift = new THREE.Vector3().crossVectors(state.spin, relativeVelocity);
  lift.multiplyScalar(clRho / state.mass);
  return lift;
}

export function integrateSpin(state: ProjectileState, dt: number): void {
  if (state.spin.lengthSq() === 0) return;
  
  // Quadratic spin damping: dω/dt = -k*ω²
  const spinSpeed = state.spin.length();
  const quadraticDamping = state.spinDamping * spinSpeed * dt;
  const dampingFactor = 1 / (1 + quadraticDamping);
  state.spin.multiplyScalar(dampingFactor);
}

// Integrate rotation quaternion from angular velocity with gyroscopic effects
export function integrateRotation(state: ProjectileState, dt: number): void {
  if (state.spin.lengthSq() === 0) return;
  
  // Add gyroscopic precession for asymmetric objects
  // For simplicity, add small nutation based on moment of inertia differences
  const I = state.momentOfInertia;
  const inertiaDiff = Math.abs(I.x - I.y) + Math.abs(I.y - I.z) + Math.abs(I.z - I.x);
  if (inertiaDiff > 0.001) {
    // Add small precession perpendicular to spin axis
    const precessionRate = 0.1 * inertiaDiff;
    const perpendicular = new THREE.Vector3(
      state.spin.y - state.spin.z,
      state.spin.z - state.spin.x,
      state.spin.x - state.spin.y
    ).normalize();
    state.spin.addScaledVector(perpendicular, precessionRate * dt);
  }
  
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

// Calculate aerodynamic torque from drag and unsteady effects
export function aerodynamicTorque(state: ProjectileState, environment: EnvironmentState): THREE.Vector3 {
  const relativeVelocity = tmp.copy(state.velocity).sub(environment.windVector);
  const speed = relativeVelocity.length();
  
  if (speed === 0 || state.spin.lengthSq() === 0) {
    return new THREE.Vector3();
  }
  
  // Calculate altitude-dependent air density
  const altitude = Math.max(0, state.position.y);
  const rho = airDensityAtAltitude(altitude, environment.airDensity);
  
  const spinSpeed = state.spin.length();
  
  // Torque from drag on spinning body: τ = -C_torque * ρ * r³ * ω² (quadratic)
  const torqueCoeff = 0.15 * rho * Math.pow(state.radius, 3) * spinSpeed;
  const dragTorque = state.spin.clone().multiplyScalar(-torqueCoeff);
  
  // Add vortex shedding torque (perpendicular to velocity and spin)
  const vortexAxis = new THREE.Vector3().crossVectors(relativeVelocity, state.spin).normalize();
  const vortexMagnitude = 0.05 * rho * Math.pow(state.radius, 3) * speed;
  const vortexTorque = vortexAxis.multiplyScalar(vortexMagnitude);
  
  return dragTorque.add(vortexTorque);
}
