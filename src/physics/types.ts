import * as THREE from 'three';

export interface ProjectileState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3; // Angular velocity (rad/s)
  rotation: THREE.Quaternion; // Orientation
  mass: number;
  area: number;
  dragCoefficient: number;
  spinDamping: number;
  restitution: number;
  momentOfInertia: THREE.Vector3; // Ix, Iy, Iz for principal axes
  radius: number; // Characteristic radius for torque calculations
}

export interface ProjectileDefinition {
  id: string;
  label: string;
  description: string;
  massKg: number;
  referenceArea: number;
  dragCoefficient: number;
  spinDamping: number;
  restitution: number;
  radius: number; // Characteristic radius (m)
  momentOfInertia: THREE.Vector3; // Ix, Iy, Iz (kg·m²)
  meshFactory: (palette: MaterialPalette) => THREE.Object3D;
}

export interface ForceProfile {
  id: string;
  label: string;
  description: string;
  duration: number;
  impulse: (t: number) => THREE.Vector3;
  spinAxis: THREE.Vector3;
  spinRate: number;
  launchElevation: number;
  launchPosition?: THREE.Vector3; // Optional starting position
  icon: string;
}

export interface EnvironmentState {
  gravity: number;
  windVector: THREE.Vector3;
  airDensity: number;
}

export interface ManualLaunchConfig {
  impulseVector: THREE.Vector3; // Total impulse (Force * time)
  applicationPoint: THREE.Vector3; // Offset from center of mass
}

export interface LaunchParameters {
  profile: ForceProfile;
  projectile: ProjectileDefinition;
  environment: EnvironmentState;
  tint: THREE.Color;
  manualConfig?: ManualLaunchConfig; // Optional override
}

export interface TelemetrySample {
  time: number;
  altitude: number;
  speed: number;
  range: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  positionX: number;
  positionZ: number;
}

export interface LaunchRecord {
  id: string;
  color: string;
  profileLabel: string;
  projectileLabel: string;
  samples: TelemetrySample[];
  summary?: {
    maxHeight: number;
    totalRange: number;
    flightTime: number;
    impactSpeed: number;
  };
}

export interface LaunchHandle {
  record: LaunchRecord;
  object: THREE.Object3D;
}

export interface MaterialPalette {
  leather: THREE.Texture;
  graphite: THREE.Texture;
  copper: THREE.Texture;
  plasma: THREE.Texture;
  basalt: THREE.Texture;
}
