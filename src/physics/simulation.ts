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
import { dragForce, gravityForce, integrateSpin, magnusForce } from './forces';
import { rk4Integrate } from './integrators';
import { MAX_TIME_STEP, MIN_TIME_STEP } from './constants';

const MAX_TRAIL_POINTS = 360;
const REST_THRESHOLD = 0.4;
const TELEMETRY_INTERVAL = 0.08;

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
  active: boolean;
  colorHex: number;
}

function totalForce(state: ProjectileState, environment: EnvironmentState): THREE.Vector3 {
  const force = new THREE.Vector3();
  force.add(gravityForce(state, environment));
  force.add(dragForce(state, environment));
  force.add(magnusForce(state, environment));
  return force;
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

  launch(params: LaunchParameters): LaunchHandle {
    const id = `launch-${this.idCounter++}`;
    const mesh = params.projectile.meshFactory(this.palette);
    mesh.position.set(0, 1.2, 0);
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
      mass: params.projectile.massKg,
      area: params.projectile.referenceArea,
      dragCoefficient: params.projectile.dragCoefficient,
      spinDamping: params.projectile.spinDamping,
      restitution: params.projectile.restitution
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
      colorHex: params.tint.getHex()
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
    const clamped = Math.min(dt, MAX_TIME_STEP);
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

    rk4Integrate(projectile.state, projectile.environment, dt, (state, environment) =>
      totalForce(state, environment).multiplyScalar(1 / state.mass)
    );
    integrateSpin(projectile.state, dt);

    if (projectile.state.position.y <= 0.05) {
      projectile.state.position.y = 0.05;
      projectile.state.velocity.y *= -projectile.state.restitution;
      projectile.state.velocity.x *= 0.62;
      projectile.state.velocity.z *= 0.62;
      if (Math.abs(projectile.state.velocity.y) < REST_THRESHOLD && projectile.state.velocity.length() < REST_THRESHOLD) {
        projectile.active = false;
        projectile.summary = this.buildSummary(projectile);
      }
    }

    projectile.mesh.position.copy(projectile.state.position);
    this.updateTrail(projectile);

    if (projectile.telemetryTimer >= TELEMETRY_INTERVAL) {
      projectile.telemetryTimer = 0;
      projectile.samples.push({
        time: projectile.elapsed,
        altitude: projectile.state.position.y,
        range: new THREE.Vector2(projectile.state.position.x, projectile.state.position.z).length(),
        speed: projectile.state.velocity.length()
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
