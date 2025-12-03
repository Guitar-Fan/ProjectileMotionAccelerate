import * as THREE from 'three';
import { ForceProfile } from '../physics/types';

const DEG2RAD = Math.PI / 180;

function impulseVector(strength: number, elevation: number, azimuth = 0): THREE.Vector3 {
  const elevRad = elevation * DEG2RAD;
  const azimuthRad = azimuth * DEG2RAD;
  const dir = new THREE.Vector3(
    Math.cos(elevRad) * Math.cos(azimuthRad),
    Math.sin(elevRad),
    Math.cos(elevRad) * Math.sin(azimuthRad)
  );
  return dir.multiplyScalar(strength);
}

function easeImpulse(t: number, duration: number): number {
  const x = Math.min(t / duration, 1);
  return Math.sin(x * Math.PI);
}

export const forceProfiles: ForceProfile[] = [
  {
    id: 'cannon',
    label: 'Orbital Cannon',
    description: 'Electromagnetic rails deliver a brutal 18 kN kick over 60 milliseconds.',
    duration: 0.06,
    impulse: (t) => impulseVector(18000 * easeImpulse(t, 0.06), 12),
    spinAxis: new THREE.Vector3(0, 0, 1),
    spinRate: 6,
    launchElevation: 12,
    icon: '/assets/sprites/cannon.svg'
  },
  {
    id: 'kick',
    label: 'Midfield Kick',
    description: 'Biomeasured soccer kick with pronounced topspin and longer contact.',
    duration: 0.14,
    impulse: (t) => impulseVector(4500 * easeImpulse(t, 0.14), 16, 8),
    spinAxis: new THREE.Vector3(1, 0, 0),
    spinRate: -22,
    launchElevation: 16,
    icon: '/assets/sprites/kick.svg'
  },
  {
    id: 'bat',
    label: 'Ash Bat Crank',
    description: 'Heavy bat slap-shot with sharp impulse and backspin lift.',
    duration: 0.085,
    impulse: (t) => impulseVector(6200 * easeImpulse(t, 0.085), 24, -6),
    spinAxis: new THREE.Vector3(0, 0, 1),
    spinRate: 32,
    launchElevation: 24,
    icon: '/assets/sprites/bat.svg'
  },
  {
    id: 'throw',
    label: 'Hand Throw',
    description: 'Human-scale throw with long impulse ramp and subtle pronation.',
    duration: 0.21,
    impulse: (t) => impulseVector(2100 * easeImpulse(t, 0.21), 35, 4),
    spinAxis: new THREE.Vector3(0.4, 0.2, 0).normalize(),
    spinRate: 18,
    launchElevation: 35,
    icon: '/assets/sprites/throw.svg'
  },
  {
    id: 'rail',
    label: 'Rail Launcher',
    description: 'Sustained linear motor push that continues downrange for the first 25 meters.',
    duration: 0.12,
    impulse: (t) => impulseVector(9000 * easeImpulse(t, 0.12), 8, 0),
    spinAxis: new THREE.Vector3(0, 1, 0),
    spinRate: 4,
    launchElevation: 8,
    icon: '/assets/sprites/rail.svg'
  }
];
