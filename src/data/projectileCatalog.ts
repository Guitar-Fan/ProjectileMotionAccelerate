import * as THREE from 'three';
import { MaterialPalette, ProjectileDefinition } from '../physics/types';

const emissiveBlue = new THREE.Color('#4dd0f9');

function makeShell(palette: MaterialPalette): THREE.Mesh {
  const geometry = new THREE.CapsuleGeometry(0.25, 0.9, 12, 24);
  const material = new THREE.MeshStandardMaterial({
    map: palette.graphite,
    metalness: 0.6,
    roughness: 0.25,
    envMapIntensity: 1.2
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

function makeLeatherBall(palette: MaterialPalette, radius: number): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    map: palette.leather,
    roughness: 0.8,
    metalness: 0.05
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

function makeDart(palette: MaterialPalette): THREE.Mesh {
  const body = new THREE.ConeGeometry(0.12, 1.4, 32);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    map: palette.copper,
    roughness: 0.35,
    metalness: 0.85
  });
  const bodyMesh = new THREE.Mesh(body, bodyMaterial);
  bodyMesh.castShadow = true;

  const finGeometry = new THREE.BoxGeometry(0.02, 0.5, 0.3);
  const finMaterial = new THREE.MeshStandardMaterial({ color: '#4a90ff', metalness: 0.8, roughness: 0.2 });
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeometry, finMaterial);
    fin.position.set(0, -0.5, 0);
    fin.rotation.y = (Math.PI / 2) * i;
    bodyMesh.add(fin);
  }
  return bodyMesh;
}

function makePlasma(palette: MaterialPalette): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.22, 64, 64);
  const material = new THREE.MeshPhysicalMaterial({
    map: palette.plasma,
    emissive: emissiveBlue,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    transmission: 0.5,
    thickness: 0.4,
    metalness: 0.2
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

export const projectileCatalog: ProjectileDefinition[] = [
  {
    id: 'shell',
    label: 'Graphite Shell',
    description: 'Streamlined sabot round optimized for hypersonic cannons.',
    massKg: 12,
    referenceArea: Math.PI * 0.25 * 0.25,
    dragCoefficient: 0.18,
    spinDamping: 0.4,
    restitution: 0.12,
    meshFactory: makeShell
  },
  {
    id: 'stratus',
    label: 'Stitched Leather Ball',
    description: 'Size 5 ball tuned for long air time kicks.',
    massKg: 0.45,
    referenceArea: Math.PI * 0.32 * 0.32,
    dragCoefficient: 0.32,
    spinDamping: 0.9,
    restitution: 0.6,
    meshFactory: (palette) => makeLeatherBall(palette, 0.32)
  },
  {
    id: 'slugger',
    label: 'Cork-Core Baseball',
    description: 'Professional game ball with leather cover and raised seams.',
    massKg: 0.145,
    referenceArea: Math.PI * 0.18 * 0.18,
    dragCoefficient: 0.35,
    spinDamping: 0.8,
    restitution: 0.53,
    meshFactory: (palette) => makeLeatherBall(palette, 0.18)
  },
  {
    id: 'dart',
    label: 'Tungsten Dart',
    description: 'Dense penetrator dart with stabilizing fins.',
    massKg: 4.2,
    referenceArea: Math.PI * 0.12 * 0.12,
    dragCoefficient: 0.12,
    spinDamping: 0.2,
    restitution: 0.08,
    meshFactory: makeDart
  },
  {
    id: 'plasma',
    label: 'Plasma Capsule',
    description: 'Iridescent capsule for rail launch experiments.',
    massKg: 2.6,
    referenceArea: Math.PI * 0.22 * 0.22,
    dragCoefficient: 0.28,
    spinDamping: 0.3,
    restitution: 0.35,
    meshFactory: makePlasma
  }
];
