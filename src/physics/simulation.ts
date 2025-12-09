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
import { MAX_TIME_STEP, MIN_TIME_STEP, ERROR_TOLERANCE } from './constants';
import { TurbulenceField } from './turbulence';

const MAX_TRAIL_POINTS = 360;
const REST_THRESHOLD = 0.15; // Lower threshold for more accurate settling
const TELEMETRY_INTERVAL = 0.08;
const ROLLING_FRICTION_COEFF = 0.02; // Rolling friction coefficient
const GROUND_CONTACT_TOLERANCE = 0.005; // How close to ground counts as contact

// Variable surface properties
interface SurfaceProperties {
  friction: number;
  restitution: number;
}

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
  private turbulence: TurbulenceField;
  private globalTime: number = 0;
  private surfaceProps: SurfaceProperties = {
    friction: 0.6, // Grass/dirt
    restitution: 0.5
  };

  constructor(scene: THREE.Scene, palette: MaterialPalette) {
    this.scene = scene;
    this.palette = palette;
    this.turbulence = new TurbulenceField();
  }

  getActiveProjectiles(): Array<{ id: string; position: THREE.Vector3; color: number }> {
    return this.projectiles
      .filter(p => p.active)
      .map(p => ({ id: p.id, position: p.state.position.clone(), color: p.colorHex }));
  }

  spawnPreview(projectileDef: any): THREE.Object3D {
    const mesh = projectileDef.meshFactory(this.palette);
    mesh.position.set(0, 1.5, 0); // Default spawn height
    this.scene.add(mesh);
    return mesh;
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

    // Apply manual configuration if present
    if (params.manualConfig) {
      // Linear velocity change: Δv = J / m
      const deltaV = params.manualConfig.impulseVector.clone().multiplyScalar(1 / state.mass);
      state.velocity.add(deltaV);

      // Angular velocity change: Δω = I⁻¹(r × J)
      // r is vector from COM to application point
      const r = params.manualConfig.applicationPoint;
      const torqueImpulse = new THREE.Vector3().crossVectors(r, params.manualConfig.impulseVector);
      
      const deltaOmega = new THREE.Vector3(
        torqueImpulse.x / state.momentOfInertia.x,
        torqueImpulse.y / state.momentOfInertia.y,
        torqueImpulse.z / state.momentOfInertia.z
      );
      state.spin.add(deltaOmega);
    }

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
    
    // Update turbulence field
    this.turbulence.update(clamped);
    this.globalTime += clamped;
    
    // Adaptive time stepping
    let accumulator = clamped;
    while (accumulator > 0) {
      // Calculate optimal timestep based on projectile velocities
      let minStep = MAX_TIME_STEP;
      this.projectiles.forEach(p => {
        if (p.active) {
          const speed = p.state.velocity.length();
          // Smaller steps for faster projectiles or near-ground collisions
          const velStep = speed > 50 ? MIN_TIME_STEP : MIN_TIME_STEP * 2;
          const heightStep = p.state.position.y < 2 * p.state.radius ? MIN_TIME_STEP : MAX_TIME_STEP;
          minStep = Math.min(minStep, velStep, heightStep);
        }
      });
      
      const step = Math.min(accumulator, minStep);
      this.projectiles.forEach((projectile) => this.integrateProjectile(projectile, step));
      accumulator -= step;
    }
    this.projectiles = this.projectiles.filter((p) => p.active);
  }

  getLaunchRecords(): LaunchRecord[] {
    return this.records;
  }

  setSurfaceType(type: 'grass' | 'concrete' | 'dirt' | 'ice'): void {
    switch (type) {
      case 'grass':
        this.surfaceProps = { friction: 0.6, restitution: 0.5 };
        break;
      case 'concrete':
        this.surfaceProps = { friction: 0.8, restitution: 0.7 };
        break;
      case 'dirt':
        this.surfaceProps = { friction: 0.7, restitution: 0.4 };
        break;
      case 'ice':
        this.surfaceProps = { friction: 0.1, restitution: 0.9 };
        break;
    }
  }

  private getGroundNormal(x: number, z: number): THREE.Vector3 {
    // Perturb normal to simulate grass/uneven ground (Physics Bump Mapping)
    // Use simple hash of position for determinism
    const scale = 0.8; // Scale of bumps
    const roughness = 0.15; // Magnitude of perturbation (increased for visibility)
    
    const nx = (Math.sin(x * scale) + Math.cos(z * scale * 1.3)) * roughness;
    const nz = (Math.cos(x * scale * 1.1) + Math.sin(z * scale * 0.9)) * roughness;
    
    return new THREE.Vector3(nx, 1, nz).normalize();
  }

  private integrateProjectile(projectile: ProjectileInstance, dt: number): void {
    if (!projectile.active) return;

    projectile.elapsed += dt;
    projectile.telemetryTimer += dt;

    // Only apply profile force if NOT manual config (manual is instantaneous impulse at t=0)
    if (!projectile.params.manualConfig && projectile.elapsed <= projectile.params.profile.duration) {
      const force = projectile.params.profile.impulse(projectile.elapsed);
      if (force.lengthSq() > 0) {
        const acceleration = force.multiplyScalar(1 / projectile.state.mass);
        projectile.state.velocity.addScaledVector(acceleration, dt);
      }
      projectile.state.spin.addScaledVector(projectile.params.profile.spinAxis, projectile.params.profile.spinRate * dt);
    }

    // Apply turbulent wind with gusts
    const baseWind = projectile.environment.windVector.clone();
    const turbulentWind = this.turbulence.getTurbulence(projectile.state.position, baseWind);
    const gust = this.turbulence.addGust(projectile.state.position, this.globalTime);
    projectile.environment.windVector = turbulentWind.add(gust);

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
    
    // Restore original wind after integration
    projectile.environment.windVector = baseWind;
    
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
        velocityZ: projectile.state.velocity.z,
        positionX: projectile.state.position.x,
        positionZ: projectile.state.position.z
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
    
    // Keep object exactly on ground (visual plane)
    state.position.y = state.radius;
    
    // Get local ground normal
    const normal = this.getGroundNormal(state.position.x, state.position.z);

    // Cancel velocity into the ground
    const vn = state.velocity.dot(normal);
    if (vn < 0) {
      state.velocity.addScaledVector(normal, -vn);
    }
    
    // Calculate contact point velocity including rotation
    const contactOffset = normal.clone().multiplyScalar(-state.radius);
    const rotationalVel = new THREE.Vector3().crossVectors(state.spin, contactOffset);
    const contactVel = state.velocity.clone().add(rotationalVel);
    
    // Get tangential velocity (velocity along the surface)
    const normalVel = normal.clone().multiplyScalar(contactVel.dot(normal));
    const tangentialVel = contactVel.clone().sub(normalVel);
    const speed = tangentialVel.length();
    
    if (speed > 0.01) {
      // Apply rolling friction: F_roll = μ_roll × N × v̂
      // Normal force N approx mg (ignoring slope for simple rolling friction magnitude)
      const normalForce = state.mass * projectile.environment.gravity;
      const rollingFriction = tangentialVel.clone().normalize().multiplyScalar(
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
      state.velocity.multiplyScalar(dampingFactor);
      state.spin.multiplyScalar(dampingFactor);
    }
  }

  private handleGroundCollision(projectile: ProjectileInstance): void {
    const state = projectile.state;
    
    // Get local ground normal (Physics Bump Mapping)
    const normal = this.getGroundNormal(state.position.x, state.position.z);
    
    // Contact point is at the bottom of the object relative to the normal
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
    
    // Velocity-dependent restitution (energy dissipation increases with impact speed)
    const impactSpeed = Math.abs(vn);
    const effectiveRestitution = state.restitution * Math.exp(-impactSpeed / 20.0);
    
    // Calculate normal impulse magnitude with velocity-dependent restitution
    // Jn = -(1 + e) * vn / (1/m + (r × n)·(I⁻¹(r × n)))
    const rCrossN = new THREE.Vector3().crossVectors(contactOffset, normal);
    const angularEffect = new THREE.Vector3(
      rCrossN.x / state.momentOfInertia.x,
      rCrossN.y / state.momentOfInertia.y,
      rCrossN.z / state.momentOfInertia.z
    );
    const rCrossAngular = new THREE.Vector3().crossVectors(contactOffset, angularEffect);
    const denominator = 1 / state.mass + rCrossAngular.dot(normal);
    const jn = -(1 + effectiveRestitution) * vn / denominator;
    
    // Calculate friction impulse (surface-dependent Coulomb friction)
    const frictionCoeff = this.surfaceProps.friction;
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
