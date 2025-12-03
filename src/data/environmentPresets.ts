import * as THREE from 'three';
import { EnvironmentState } from '../physics/types';

export interface EnvironmentPreset extends EnvironmentState {
  id: string;
  label: string;
  description: string;
}

export const environmentPresets: EnvironmentPreset[] = [
  {
    id: 'lunar-night',
    label: 'Lunar Night Range',
    description: 'Low atmosphere density, subtle crosswind.',
    gravity: 9.81,
    airDensity: 0.92,
    windVector: new THREE.Vector3(2, 0, -1.5)
  },
  {
    id: 'damp-harbor',
    label: 'Damp Harbor Air',
    description: 'Dense sea-level air with mild onshore breeze.',
    gravity: 9.81,
    airDensity: 1.24,
    windVector: new THREE.Vector3(-3, 0, 1)
  },
  {
    id: 'thin-peak',
    label: 'High-Peak Lab',
    description: 'Thinner atmosphere and gusty winds.',
    gravity: 9.3,
    airDensity: 0.74,
    windVector: new THREE.Vector3(4, 0, 0)
  }
];
