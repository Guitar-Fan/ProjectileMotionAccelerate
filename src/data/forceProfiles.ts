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
    description: 'Electromagnetic rails deliver a brutal 60 kN kick over 60 milliseconds.',
    duration: 0.06,
    impulse: (t) => impulseVector(60000 * easeImpulse(t, 0.06), 25, 15),
    spinAxis: new THREE.Vector3(0, 0, 1),
    spinRate: 6,
    launchElevation: 25,
    launchPosition: new THREE.Vector3(0, 1.2, 0),
    icon: '/assets/sprites/cannon.svg'
  },
  {
    id: 'kick',
    label: 'Midfield Kick',
    description: 'Biomeasured soccer kick with pronounced topspin and longer contact.',
    duration: 0.14,
    impulse: (t) => impulseVector(15000 * easeImpulse(t, 0.14), 35, 25),
    spinAxis: new THREE.Vector3(1, 0, 0),
    spinRate: -22,
    launchElevation: 35,
    launchPosition: new THREE.Vector3(-5, 1.2, 3),
    icon: '/assets/sprites/kick.svg'
  },
  {
    id: 'bat',
    label: 'Ash Bat Crank',
    description: 'Heavy bat slap-shot with sharp impulse and backspin lift.',
    duration: 0.085,
    impulse: (t) => impulseVector(20000 * easeImpulse(t, 0.085), 45, -30),
    spinAxis: new THREE.Vector3(0, 0, 1),
    spinRate: 32,
    launchElevation: 45,
    launchPosition: new THREE.Vector3(3, 1.2, -4),
    icon: '/assets/sprites/bat.svg'
  },
  {
    id: 'throw',
    label: 'Hand Throw',
    description: 'Human-scale throw with long impulse ramp and subtle pronation.',
    duration: 0.21,
    impulse: (t) => impulseVector(8000 * easeImpulse(t, 0.21), 50, 35),
    spinAxis: new THREE.Vector3(0.4, 0.2, 0).normalize(),
    spinRate: 18,
    launchElevation: 50,
    launchPosition: new THREE.Vector3(4, 1.5, 5),
    icon: '/assets/sprites/throw.svg'
  },
  {
    id: 'rail',
    label: 'Rail Launcher',
    description: 'Sustained linear motor push that continues downrange for the first 25 meters.',
    duration: 0.12,
    impulse: (t) => impulseVector(35000 * easeImpulse(t, 0.12), 30, -20),
    spinAxis: new THREE.Vector3(0, 1, 0),
    spinRate: 4,
    launchElevation: 30,
    launchPosition: new THREE.Vector3(-6, 1.2, -6),
    icon: '/assets/sprites/rail.svg'
  }
];
