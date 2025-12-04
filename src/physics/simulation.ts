import * as THREE from 'three';
import {
  EnvironmentState,
  LaunchHandle,
  LaunchParameters,
  LaunchRecord,
  MaterialPalette,
  ProjectileState,
  TelemetrySample
} from './types';
import { dragForce, gravityForce, integrateSpin, magnusForce, integrateRotation, aerodynamicTorque } from './forces';
import { rk4Integrate } from './integrators';
import { MAX_TIME_STEP, MIN_TIME_STEP } from './constants';

const MAX_TRAIL_POINTS = 360;
const REST_THRESHOLD = 0.15; // Lower threshold for more accurate settling
const TELEMETRY_INTERVAL = 0.08;
const ROLLING_FRICTION_COEFF = 0.02; // Rolling friction coefficient
const GROUND_CONTACT_TOLERANCE = 0.005; // How close to ground counts as contact

interface ProjectileInstance {
  id: string;
  mesh: THREE.Object3D;
  trail: THREE.Line;
  positions: Float32Array;
  state: ProjectileState;
  environment: EnvironmentState;
  params: LaunchParameters;
  elapsed: number;
  telemetryTimer: number;
  samples: TelemetrySample[];
  summary?: LaunchRecord['summary'];
  isGrounded: boolean;
  active: boolean;
  colorHex: number;
}

// State space acceleration function following Equation (15)
// Returns total acceleration: a = F_gravity/m + F_drag/m + F_magnus/m
function totalAcceleration(state: ProjectileState, environment: EnvironmentState): THREE.Vector3 {
  const accel = new THREE.Vector3();
  // Forces are already returned as accelerations (F/m) from force functions
  accel.add(gravityForce(state, environment).multiplyScalar(1 / state.mass));
  accel.add(dragForce(state, environment)); // Already returns acceleration
  accel.add(magnusForce(state, environment)); // Already returns acceleration
  return accel;
}

export class SimulationEngine {
  private scene: THREE.Scene;
  private palette: MaterialPalette;
  private projectiles: ProjectileInstance[] = [];
  private records: LaunchRecord[] = [];
  private idCounter = 0;

  constructor(scene: THREE.Scene, palette: MaterialPalette) {
    this.scene = scene;
    this.palette = palette;
  }

  getActiveProjectiles(): Array<{ id: string; position: THREE.Vector3; color: number }> {
    return this.projectiles
      .filter(p => p.active)
      .map(p => ({ id: p.id, position: p.state.position.clone(), color: p.colorHex }));
  }

  launch(params: LaunchParameters): LaunchHandle {
    const id = `launch-${this.idCounter++}`;
    const mesh = params.projectile.meshFactory(this.palette);
    const launchPos = params.profile.launchPosition || new THREE.Vector3(0, 1.2, 0);
    mesh.position.copy(launchPos);
    this.scene.add(mesh);

    const positions = new Float32Array(MAX_TRAIL_POINTS * 3);
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const trailMaterial = new THREE.LineBasicMaterial({
      color: params.tint.getHex(),
      transparent: true,
      opacity: 0.65
    });
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    trail.frustumCulled = false;
    this.scene.add(trail);

    const state: ProjectileState = {
      position: mesh.position.clone(),
      velocity: new THREE.Vector3(),
      spin: params.profile.spinAxis.clone().multiplyScalar(params.profile.spinRate),
      rotation: new THREE.Quaternion(), // Identity quaternion (no rotation initially)
      mass: params.projectile.massKg,
      area: params.projectile.referenceArea,
      dragCoefficient: params.projectile.dragCoefficient,
      spinDamping: params.projectile.spinDamping,
      restitution: params.projectile.restitution,
      momentOfInertia: params.projectile.momentOfInertia.clone(),
      radius: params.projectile.radius
    };

    const envCopy: EnvironmentState = {
      gravity: params.environment.gravity,
      airDensity: params.environment.airDensity,
      windVector: params.environment.windVector.clone()
    };

    const samples: TelemetrySample[] = [];

    const instance: ProjectileInstance = {
      id,
      mesh,
      trail,
      positions,
      state,
      environment: envCopy,
      params,
      elapsed: 0,
      telemetryTimer: 0,
      samples,
      active: true,
      colorHex: params.tint.getHex(),
      isGrounded: false
    };
    this.projectiles.push(instance);

    const record: LaunchRecord = {
      id,
      color: `#${params.tint.getHexString()}`,
      profileLabel: params.profile.label,
      projectileLabel: params.projectile.label,
      samples
    };
    this.records.push(record);
    return { record, object: mesh };
  }

  update(dt: number): void {
    // Speed up simulation by 1.5x
    const speedMultiplier = 1.5;
    const clamped = Math.min(dt * speedMultiplier, MAX_TIME_STEP);
    let accumulator = clamped;
    while (accumulator > 0) {
      const step = Math.min(accumulator, MIN_TIME_STEP);
      this.projectiles.forEach((projectile) => this.integrateProjectile(projectile, step));
      accumulator -= step;
    }
    this.projectiles = this.projectiles.filter((p) => p.active);
  }

  getLaunchRecords(): LaunchRecord[] {
    return this.records;
  }

  private integrateProjectile(projectile: ProjectileInstance, dt: number): void {
    if (!projectile.active) return;

    projectile.elapsed += dt;
    projectile.telemetryTimer += dt;

    if (projectile.elapsed <= projectile.params.profile.duration) {
      const force = projectile.params.profile.impulse(projectile.elapsed);
      if (force.lengthSq() > 0) {
        const acceleration = force.multiplyScalar(1 / projectile.state.mass);
        projectile.state.velocity.addScaledVector(acceleration, dt);
      }
      projectile.state.spin.addScaledVector(projectile.params.profile.spinAxis, projectile.params.profile.spinRate * dt);
    }

    // Check if object is on ground (within tolerance)
    const groundDistance = projectile.state.position.y - projectile.state.radius;
    projectile.isGrounded = groundDistance <= GROUND_CONTACT_TOLERANCE;
    
    // Apply ground contact forces if grounded
    if (projectile.isGrounded && projectile.state.velocity.y <= 0.1) {
      this.applyGroundContactForces(projectile, dt);
    }
    
    // RK4 integration following state space formulation (Equation 15)
    // Returns acceleration directly since forces already divided by mass
    rk4Integrate(projectile.state, projectile.environment, dt, totalAcceleration);
    
    // Update angular velocity with aerodynamic torque: dω/dt = τ/I
    const torque = aerodynamicTorque(projectile.state, projectile.environment);
    const angularAccel = new THREE.Vector3(
      torque.x / projectile.state.momentOfInertia.x,
      torque.y / projectile.state.momentOfInertia.y,
      torque.z / projectile.state.momentOfInertia.z
    );
    projectile.state.spin.addScaledVector(angularAccel, dt);
    
    integrateSpin(projectile.state, dt);
    integrateRotation(projectile.state, dt);

    // Prevent sinking below ground
    if (projectile.state.position.y < projectile.state.radius) {
      projectile.state.position.y = projectile.state.radius;
    }

    // 3D collision detection and response (for impacts)
    if (projectile.state.position.y <= projectile.state.radius && projectile.state.velocity.y < -0.1) {
      this.handleGroundCollision(projectile);
      if (Math.abs(projectile.state.velocity.y) < REST_THRESHOLD && projectile.state.velocity.length() < REST_THRESHOLD) {
        projectile.active = false;
        projectile.summary = this.buildSummary(projectile);
      }
    }

    projectile.mesh.position.copy(projectile.state.position);
    projectile.mesh.quaternion.copy(projectile.state.rotation);
    this.updateTrail(projectile);

    if (projectile.telemetryTimer >= TELEMETRY_INTERVAL) {
      projectile.telemetryTimer = 0;
      projectile.samples.push({
        time: projectile.elapsed,
        altitude: projectile.state.position.y,
        range: new THREE.Vector2(projectile.state.position.x, projectile.state.position.z).length(),
        speed: projectile.state.velocity.length(),
        velocityX: projectile.state.velocity.x,
        velocityY: projectile.state.velocity.y,
        velocityZ: projectile.state.velocity.z
      });
    }

    if (!projectile.active) {
      const record = this.records.find((r) => r.id === projectile.id);
      if (record) {
        record.summary = projectile.summary;
      }
      this.scene.remove(projectile.mesh);
      this.scene.remove(projectile.trail);
    }
  }

  private updateTrail(projectile: ProjectileInstance): void {
    const positions = projectile.positions;
    positions.copyWithin(3, 0, (MAX_TRAIL_POINTS - 1) * 3);
    positions[0] = projectile.state.position.x;
    positions[1] = projectile.state.position.y;
    positions[2] = projectile.state.position.z;
    const attr = projectile.trail.geometry.getAttribute('position');
    attr.needsUpdate = true;
  }

  private applyGroundContactForces(projectile: ProjectileInstance, dt: number): void {
    const state = projectile.state;
    
    // Keep object exactly on ground
    state.position.y = state.radius;
    
    // Cancel any downward velocity
    if (state.velocity.y < 0) {
      state.velocity.y = 0;
    }
    
    // Calculate contact point velocity including rotation
    const normal = new THREE.Vector3(0, 1, 0);
    const contactOffset = normal.clone().multiplyScalar(-state.radius);
    const rotationalVel = new THREE.Vector3().crossVectors(state.spin, contactOffset);
    const contactVel = state.velocity.clone().add(rotationalVel);
    
    // Get horizontal velocity
    const horizontalVel = new THREE.Vector3(contactVel.x, 0, contactVel.z);
    const speed = horizontalVel.length();
    
    if (speed > 0.01) {
      // Apply rolling friction: F_roll = μ_roll × N × v̂
      // Normal force N = mg (cancels gravity)
      const normalForce = state.mass * projectile.environment.gravity;
      const rollingFriction = horizontalVel.clone().normalize().multiplyScalar(
        -ROLLING_FRICTION_COEFF * normalForce
      );
      
      // Apply friction as acceleration: a = F/m
      const frictionAccel = rollingFriction.multiplyScalar(1 / state.mass);
      state.velocity.addScaledVector(frictionAccel, dt);
      
      // Apply torque from rolling friction: τ = r × F
      const rollingTorque = new THREE.Vector3().crossVectors(contactOffset, rollingFriction);
      const angularDecel = new THREE.Vector3(
        rollingTorque.x / state.momentOfInertia.x,
        rollingTorque.y / state.momentOfInertia.y,
        rollingTorque.z / state.momentOfInertia.z
      );
      state.spin.addScaledVector(angularDecel, dt);
    }
    
    // Apply damping to prevent perpetual rolling
    const dampingFactor = Math.exp(-2.0 * dt);
    if (speed < 0.5) {
      state.velocity.x *= dampingFactor;
      state.velocity.z *= dampingFactor;
      state.spin.multiplyScalar(dampingFactor);
    }
  }

  private handleGroundCollision(projectile: ProjectileInstance): void {
    const state = projectile.state;
    
    // Surface normal (ground is flat, normal points up)
    const normal = new THREE.Vector3(0, 1, 0);
    
    // Contact point is at the bottom of the object
    const contactOffset = normal.clone().multiplyScalar(-state.radius);
    
    // Calculate velocity at contact point: v_contact = v_center + ω × r_contact
    const rotationalVel = new THREE.Vector3().crossVectors(state.spin, contactOffset);
    const contactVel = state.velocity.clone().add(rotationalVel);
    
    // Decompose contact velocity into normal and tangential components
    const vn = contactVel.dot(normal);
    
    // Only process collision if moving into the ground
    if (vn >= -0.01) {
      state.position.y = state.radius;
      return;
    }
    
    const normalVel = normal.clone().multiplyScalar(vn);
    const tangentialVel = contactVel.clone().sub(normalVel);
    const tangentialSpeed = tangentialVel.length();
    
    // Calculate normal impulse magnitude with restitution
    // Jn = -(1 + e) * vn / (1/m + (r × n)·(I⁻¹(r × n)))
    const rCrossN = new THREE.Vector3().crossVectors(contactOffset, normal);
    const angularEffect = new THREE.Vector3(
      rCrossN.x / state.momentOfInertia.x,
      rCrossN.y / state.momentOfInertia.y,
      rCrossN.z / state.momentOfInertia.z
    );
    const rCrossAngular = new THREE.Vector3().crossVectors(contactOffset, angularEffect);
    const denominator = 1 / state.mass + rCrossAngular.dot(normal);
    const jn = -(1 + state.restitution) * vn / denominator;
    
    // Calculate friction impulse (Coulomb friction with friction coefficient)
    const frictionCoeff = 0.6;
    const maxFriction = frictionCoeff * Math.abs(jn);
    
    let jt = 0;
    if (tangentialSpeed > 0.01) {
      // Calculate tangential impulse needed to stop sliding
      const tangentDir = tangentialVel.clone().normalize();
      const rCrossT = new THREE.Vector3().crossVectors(contactOffset, tangentDir);
      const angularEffectT = new THREE.Vector3(
        rCrossT.x / state.momentOfInertia.x,
        rCrossT.y / state.momentOfInertia.y,
        rCrossT.z / state.momentOfInertia.z
      );
      const rCrossAngularT = new THREE.Vector3().crossVectors(contactOffset, angularEffectT);
      const denominatorT = 1 / state.mass + rCrossAngularT.dot(tangentDir);
      jt = -tangentialSpeed / denominatorT;
      
      // Clamp friction impulse by Coulomb's law
      jt = Math.max(-maxFriction, Math.min(maxFriction, jt));
    }
    
    // Apply normal impulse
    const normalImpulse = normal.clone().multiplyScalar(jn);
    state.velocity.addScaledVector(normalImpulse, 1 / state.mass);
    
    const normalTorque = new THREE.Vector3().crossVectors(contactOffset, normalImpulse);
    state.spin.add(new THREE.Vector3(
      normalTorque.x / state.momentOfInertia.x,
      normalTorque.y / state.momentOfInertia.y,
      normalTorque.z / state.momentOfInertia.z
    ));
    
    // Apply friction impulse
    if (tangentialSpeed > 0.01) {
      const tangentDir = tangentialVel.clone().normalize();
      const frictionImpulse = tangentDir.multiplyScalar(jt);
      state.velocity.addScaledVector(frictionImpulse, 1 / state.mass);
      
      const frictionTorque = new THREE.Vector3().crossVectors(contactOffset, frictionImpulse);
      state.spin.add(new THREE.Vector3(
        frictionTorque.x / state.momentOfInertia.x,
        frictionTorque.y / state.momentOfInertia.y,
        frictionTorque.z / state.momentOfInertia.z
      ));
    }
    
    // Place object at surface after collision response
    state.position.y = state.radius;
  }

  private buildSummary(projectile: ProjectileInstance): LaunchRecord['summary'] {
    const apex = projectile.samples.reduce((max, sample) => Math.max(max, sample.altitude), 0);
    const range = projectile.samples.reduce((max, sample) => Math.max(max, sample.range), 0);
    const flightTime = projectile.samples.length ? projectile.samples[projectile.samples.length - 1].time : projectile.elapsed;
    const impactSpeed = projectile.state.velocity.length();
    return {
      maxHeight: apex,
      totalRange: range,
      flightTime,
      impactSpeed
    };
  }
}
