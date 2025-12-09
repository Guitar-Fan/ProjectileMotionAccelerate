import './styles/global.css';
import * as THREE from 'three';
import { SceneComposer } from './scene/SceneComposer';
import { SimulationEngine } from './physics/simulation';
import { ControlsPanel } from './ui/ControlsPanel';
import { ForceLegend } from './ui/ForceLegend';
import { HUD } from './ui/HUD';
import { Timeline } from './instrumentation/Timeline';
import { Diagnostics } from './instrumentation/Diagnostics';
import { MiniMap } from './instrumentation/MiniMap';
import { forceProfiles } from './data/forceProfiles';
import { projectileCatalog } from './data/projectileCatalog';
import { environmentPresets } from './data/environmentPresets';
import { EnvironmentState, LaunchRecord } from './physics/types';

import { InteractionManager } from './scene/InteractionManager';

const appRoot = document.getElementById('app');
const uiRoot = document.getElementById('ui-root');
const hudCanvas = document.getElementById('hud-layer') as HTMLCanvasElement;

if (!appRoot || !uiRoot || !hudCanvas) {
  throw new Error('Root containers missing');
}

const composer = new SceneComposer(appRoot);
const simulation = new SimulationEngine(composer.scene, composer.assets.palette);
let environment: EnvironmentState = environmentPresets[0];

// Interaction Manager for 3D Object Manipulation
const interactionManager = new InteractionManager(composer.scene, composer.cameraRig.camera, appRoot);

// Spawn initial preview object
let previewMesh = simulation.spawnPreview(projectileCatalog[1]); // Default ball
interactionManager.setTarget(previewMesh);

// Set camera to side view initially
composer.cameraRig.setSideView();

// Manual configuration state
let manualConfig: { impact: THREE.Vector3, impulse: THREE.Vector3 } | null = null;

interactionManager.onManualConfigChange = (impact, impulse) => {
  manualConfig = { impact, impulse };
};

// Top-right container for force icons
const legendHost = document.createElement('div');
uiRoot.appendChild(legendHost);

// Middle-right container for controls
const controlsContainer = document.createElement('div');
controlsContainer.style.cssText = `
  position: fixed;
  top: 50%;
  right: 1.5rem;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  z-index: 10;
`;
document.body.appendChild(controlsContainer);

const controlsHost = document.createElement('div');
controlsHost.style.width = '280px';
const dayNightHost = document.createElement('div');
dayNightHost.style.cssText = 'display: flex; justify-content: center;';
controlsContainer.appendChild(controlsHost);
controlsContainer.appendChild(dayNightHost);

// Add day/night toggle button
const dayNightBtn = document.createElement('button');
dayNightBtn.textContent = '☀️ Day / 🌙 Night';
dayNightBtn.style.cssText = `
  padding: 0.75rem 1.5rem;
  background: rgba(107, 242, 255, 0.15);
  border: 1px solid rgba(107, 242, 255, 0.3);
  border-radius: 0.75rem;
  color: #f5f7ff;
  font-family: "Space Grotesk", sans-serif;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
`;
dayNightBtn.onmouseover = () => {
  dayNightBtn.style.background = 'rgba(107, 242, 255, 0.25)';
  dayNightBtn.style.transform = 'translateY(-2px)';
};
dayNightBtn.onmouseout = () => {
  dayNightBtn.style.background = 'rgba(107, 242, 255, 0.15)';
  dayNightBtn.style.transform = 'translateY(0)';
};
dayNightBtn.onclick = () => composer.lightingRig.toggleDayNight();
dayNightHost.appendChild(dayNightBtn);

let controls: ControlsPanel;

const legend = new ForceLegend({
  container: legendHost,
  profiles: forceProfiles,
  onSelect: (profile) => controls.setForce(profile)
});

controls = new ControlsPanel(controlsHost, {
  forces: forceProfiles,
  projectiles: projectileCatalog,
  initialEnvironment: environment,
  onLaunch: ({ force, projectile, tint, environment: env }) => {
    environment = env;
    
    // Remove preview mesh before launch
    if (previewMesh) {
      composer.scene.remove(previewMesh);
    }

    const handle = simulation.launch({
      profile: force,
      projectile,
      environment: {
        gravity: env.gravity,
        airDensity: env.airDensity,
        windVector: env.windVector.clone()
      },
      tint: new THREE.Color(tint),
      manualConfig: manualConfig ? {
        impulseVector: manualConfig.impulse,
        applicationPoint: manualConfig.impact
      } : undefined
    });
    
    // Track camera
    composer.setTrackingTarget(handle.object);
    
    // Add to timeline
    timeline.addTrack(handle.record);
    
    // Reset manual config after launch
    manualConfig = null;
  },
  onProjectileChange: (proj) => {
    // Update preview mesh
    if (previewMesh) {
      composer.scene.remove(previewMesh);
    }
    previewMesh = simulation.spawnPreview(proj);
    interactionManager.setTarget(previewMesh);
  }
});

const hud = new HUD(document.body);
const timeline = new Timeline(document.body);
const diagnostics = new Diagnostics(document.body);
const minimap = new MiniMap(appRoot, composer.scene, composer.cameraRig.camera);

let activeRecord: LaunchRecord | undefined;

const clock = new THREE.Clock();

function drawHudBackdrop(): void {
  hudCanvas.width = window.innerWidth;
  hudCanvas.height = window.innerHeight;
  const ctx = hudCanvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
  ctx.strokeStyle = 'rgba(107, 242, 255, 0.12)';
  ctx.lineWidth = 1;
  const cx = hudCanvas.width * 0.5;
  const cy = hudCanvas.height * 0.65;
  for (let r = 60; r <= 240; r += 60) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

window.addEventListener('resize', drawHudBackdrop);
drawHudBackdrop();

function loop(): void {
  const delta = clock.getDelta();
  simulation.update(delta);
  composer.update(delta);

  const records = simulation.getLaunchRecords();
  const latestRecord = activeRecord ?? records[records.length - 1];
  const latestSample = latestRecord?.samples[latestRecord.samples.length - 1];
  hud.update(latestSample, latestRecord);
  timeline.update(records);
  diagnostics.update(delta, records);
  minimap.update(simulation.getActiveProjectiles());

  requestAnimationFrame(loop);
}

loop();
