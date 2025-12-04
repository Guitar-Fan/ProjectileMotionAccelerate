import './styles/global.css';
import * as THREE from 'three';
import { SceneComposer } from './scene/SceneComposer';
import { SimulationEngine } from './physics/simulation';
import { ControlsPanel } from './ui/ControlsPanel';
import { ForceLegend } from './ui/ForceLegend';
import { HUD } from './ui/HUD';
import { Timeline } from './instrumentation/Timeline';
import { Diagnostics } from './instrumentation/Diagnostics';
import { forceProfiles } from './data/forceProfiles';
import { projectileCatalog } from './data/projectileCatalog';
import { environmentPresets } from './data/environmentPresets';
import { EnvironmentState, LaunchRecord } from './physics/types';

const appRoot = document.getElementById('app');
const uiRoot = document.getElementById('ui-root');
const hudCanvas = document.getElementById('hud-layer') as HTMLCanvasElement;

if (!appRoot || !uiRoot || !hudCanvas) {
  throw new Error('Root containers missing');
}

const composer = new SceneComposer(appRoot);
const simulation = new SimulationEngine(composer.scene, composer.assets.palette);
let environment: EnvironmentState = environmentPresets[0];

const legendHost = document.createElement('div');
const controlsHost = document.createElement('div');
controlsHost.style.width = '280px';
uiRoot.appendChild(legendHost);
uiRoot.appendChild(controlsHost);

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
    const handle = simulation.launch({
      profile: force,
      projectile,
      environment: {
        gravity: env.gravity,
        airDensity: env.airDensity,
        windVector: env.windVector.clone()
      },
      tint: new THREE.Color(tint)
    });
    composer.setTrackingTarget(handle.object);
    activeRecord = handle.record;
  },
  onEnvironmentChange: (env) => {
    environment = env;
  },
  onForceHover: (profile) => legend.highlightById(profile.id)
});

const hud = new HUD(document.body);
const timeline = new Timeline(document.body);
const diagnostics = new Diagnostics(document.body);

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

  requestAnimationFrame(loop);
}

loop();
