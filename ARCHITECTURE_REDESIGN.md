# 🌌 Nightfall Ballistics — Architecture Plan

## Vision

Deliver a browser-hosted, high-fidelity 3D projectile showcase that compares how different delivery mechanisms (kick, cannon, bat, hand throw, rail launcher) shape trajectories for multiple projectile archetypes. The experience lives in a dark, cinematic “lunar training ground” that is easy on the eyes yet rich with volumetric lighting, particle haze, and cinematic camera work. All physics is authored in-house; external libraries are reserved for rendering, UI widgets, and math helpers.

## Technology Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Bundler | **Vite + TypeScript** | Fast DX, ES modules, HMR |
| Renderer | **Three.js r169** | Physically based shading, post-processing chain |
| UI | **Tweakpane** | Compact control surface, slider/linkable presets |
| State | Lightweight custom store | Keeps dependencies minimal |
| Physics | **Custom RK4 engine** | No third-party physics libraries |

## High-Level Modules

```
src/
├── main.ts                  # bootstrap
├── scene/                   # rendering + lighting
├── physics/                 # solvers, materials, integrators
├── data/                    # force & projectile catalogs
├── ui/                      # controls + HUD overlays
├── assets/                  # procedural textures & sprite exports
└── instrumentation/         # telemetry & diagnostics overlays
```

### Physics Core
- `physics/constants.ts` — global values (air density, gravity presets, integration bounds).
- `physics/state.ts` — vectors for position, velocity, spin, accumulated forces.
- `physics/forces.ts` — impulse curves for each delivery type, wind, drag, Magnus lift.
- `physics/integrators.ts` — RK4 integrator with adaptive sub-stepping for tight impulses.
- `physics/simulation.ts` — orchestrates per-projectile updates, handles spawning, lifetime, and collision with the ground plane.

### Scene Graph
- `scene/SceneComposer.ts` — ties renderer, composer, resize hooks.
- `scene/CameraRig.ts` — dual-camera system (orbit + tracking dolly) that eases between cinematic shots.
- `scene/LightingRig.ts` — moonlight directional + area lights near launch pad, volumetric fog, rect light strips along runway.
- `scene/Environment.ts` — procedurally tessellated basalt floor, distant silhouettes, animated particle embers for depth cues.
- `scene/Materials.ts` — reuses procedural textures (carbon fiber, burnished copper, stitched leather) mapped to projectile meshes.

### UI & HUD
- `ui/ControlsPanel.ts` — Tweakpane panel with tabs for Force, Projectile, Atmosphere, and Diagnostics.
- `ui/ForceLegend.ts` — uses the custom SVG sprites to show how each delivery method behaves; clicking a sprite loads the preset.
- `ui/HUD.ts` — floating overlay that renders range, apex, time aloft, impact energy, and live acceleration vector(s).

### Assets & Sprites
- `assets/proceduralTextures.ts` — generates gradient skybox, ground micro-detail, emissive runway strips, and projectile surface maps via dynamic canvas drawing (no external textures).
- `public/assets/sprites/*.svg` — hand-authored vector sprites for Cannon, Kick, Bat, Throw, Rail; used both inside the UI legend and as floating holographic billboards in-scene.

## Force & Projectile Catalog

### Delivery Profiles
Each profile implements:

```ts
interface ForceProfile {
  id: string;
  label: string;
  duration: number;      // seconds impulse is applied
  impulse: (t: number) => Vector3; // world-space N·s curve
  spinAxis: Vector3;
  spinRate: number;      // rad/s during impulse window
  launchElevation: number; // degrees relative to horizon
}
```

Profiles shipped:
1. **Orbital Cannon** — 60 ms, 18 kN impulse, minimal spin.
2. **Midfield Kick** — 140 ms, 4.5 kN impulse + topspin.
3. **Ash Bat Crank** — 85 ms, 6.2 kN impulse, backspin for lift.
4. **Hand Throw** — 210 ms ramp easing curve, human-scale impulse.
5. **Rail Launcher** — 120 ms ramp, sustained force that continues for first 25 m.

### Projectile Definitions

```ts
interface ProjectileDefinition {
  id: string;
  meshFactory: (assets: AssetLibrary) => THREE.Mesh;
  massKg: number;
  referenceArea: number;     // m² for drag
  dragCoefficient: number;
  spinDamping: number;
}
```

Included assets: graphite cannon shell, stitched leather ball, cork-cored baseball, tungsten dart, plasma capsule. Each uses a dedicated procedural texture with subtle normal mapping simulated via `THREE.CanvasTexture` height baking.

## Physics Model

- Air resistance via quadratic drag: $\vec{F}_d = -\frac{1}{2}\rho C_d A \|\vec{v}_{rel}\| \vec{v}_{rel}$.
- Optional lift from spin (Magnus): $\vec{F}_m = S \cdot (\vec{\omega} \times \vec{v}_{rel})$.
- Adaptive RK4 integrator to maintain stability when impulses are shorter than frame delta.
- Ground collision uses coefficient-of-restitution per projectile; glancing blows deflect laterally.
- Wind defined as layered noise field that updates every 4 seconds for subtle gusting.
- Telemetry pipeline emits discrete events (`apex`, `impact`, `stall`) to feed HUD + timeline graph.

## Rendering & Lighting

- Deferred-style post chain using Three.js `EffectComposer` with:
  - `SSAO`, `UnrealBloomPass`, `FilmPass` (grain) to keep the dark scene legible.
  - Custom `VelocityVectorPass` to draw motion streaks for currently highlighted projectile.
- Ground plane receives blended shadow maps from dual lights for softness.
- Camera rig transitions:
  1. Launch cam rotates tight around pad.
  2. Mid-flight cam tracks projectile with eased lag.
  3. Impact cam lifts to bird's-eye to show landing spread.

## UI Flow

1. **Select Delivery** from sprite legend (or randomize).
2. **Select Projectile**; preview updates mesh in the hangar bay while idle.
3. Adjust environment sliders (gravity, wind shear, humidity/density).
4. Press **Launch** → simulation spawns projectile, registers in Diagnostics timeline, locks camera to path.
5. HUD charts update in real-time; user can stack multiple launches for comparison (color-coded by profile).

## Telemetry & Diagnostics

- `instrumentation/Timeline.ts` draws sparkline graphs for altitude & velocity across multiple shots.
- `instrumentation/Diagnostics.ts` exposes frame time, RK4 sub-step counts, active force magnitudes.
- Data persisted in-memory (session) with export-to-JSON button for later review.

## Asset Creation Strategy

- **Sprites**: vector illustrations authored manually (SVG) with gradients + glow strokes to match the dark UI, ensuring compliance with “generate detailed images” requirement.
- **Environment textures**: procedural canvases producing tiling noise, brushed metal, and stitched leather; exported to `THREE.CanvasTexture` at runtime for zero binary dependencies.
- **Holographic signage**: simple plane geometries using the SVG sprites as `THREE.TextureLoader` inputs for in-world billboards.

## Next Steps

1. Scaffold Vite + TypeScript workspace focused on module layout above.
2. Build physics core with automated unit tests for each force profile + drag regime.
3. Integrate Three.js scene + UI, ensuring modular boundaries stay intact.
4. Populate SVG sprite set and procedural texture utilities.
5. Instrument diagnostics to prove physics accuracy.

This plan keeps the project fully JavaScript/TypeScript-based, honors the “custom physics” constraint, and delivers the visually rich, dark-toned scene requested by the user.
