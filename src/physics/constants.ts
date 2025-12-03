import * as THREE from 'three';

export const DEFAULT_GRAVITY = 9.81;
export const DEFAULT_AIR_DENSITY = 1.2041; // kg/m^3 at 20°C at sea level
export const WIND_UPDATE_INTERVAL = 4; // seconds
export const MIN_TIME_STEP = 1 / 240;
export const MAX_TIME_STEP = 1 / 30;

export const WIND_NOISE_VECTOR = new THREE.Vector3(0.4, 0, 0.2);
