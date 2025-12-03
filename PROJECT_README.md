# Nightfall Ballistics — Deep Dive

Nightfall Ballistics is a web-native, cinematic projectile laboratory focused on contrasting different force inputs (kicks, cannons, bats, hand throws, rail launches) under varying atmospheres and projectile types. Everything runs in TypeScript on top of Vite and Three.js, while the physics core is completely custom.

## Feature Matrix

| Pillar | Details |
| --- | --- |
| Delivery Modes | Cannon, soccer kick, ash bat, hand throw, rail launcher – each with a bespoke impulse curve, duration, spin axis, and iconography. |
| Projectile Catalog | Graphite shell, stitched leather ball, cork-core baseball, tungsten dart, plasma capsule – each with unique mass, drag, spin damping, restitution, and mesh/texture pairing. |
| Custom Physics | Adaptive RK4 integrator, quadratic drag, Magnus lift, configurable gravity/air density/wind, impulse injection, per-shot telemetry logging. |
| Cinematic Rendering | PBR materials, moonlit lighting rig, bloom/film passes, procedural textures, orbit-to-chase camera rig. |
| Instrumentation | HUD with live altitude/speed/range, post-flight summary, sparkline timeline, FPS + active-shot diagnostics. |
| Generated Assets | SVG sprite set for forces and Canvas-generated materials (basalt, leather, copper, plasma, graphite) – no third-party art assets. |

## Runtime Stack

- **Vite + TypeScript** for bundling + DX.
- **Three.js** (+ SSAO, UnrealBloom, Film passes) for 3D scene management.
- **Tweakpane** for the Launch Console UI.
- **Chroma.js** for palette mixing when coloring trails.
- **No physics libraries** – integrator + forces authored in `/src/physics`.

## Key Directories

```
src/
├── assets/                 # Procedural texture factory + material palette
├── data/                   # Force profiles, projectile definitions, atmospheres
├── physics/                # Types, forces, constants, RK4 integrator, simulation engine
├── scene/                  # Camera/lighting/environment/particle systems
├── ui/                     # Tweakpane controls, sprite legend, HUD overlay
├── instrumentation/        # Timeline sparkline + diagnostics readout
├── styles/                 # Global styling + HUD/legend layout
└── main.ts                 # Bootstrap: wiring UI ↔ scene ↔ physics
```

## Physics Pipeline

1. **ForceProfile** – describes impulse vector over time, launch elevation, spin axis/rate, and icon.
2. **ProjectileDefinition** – mass, reference area, drag coefficient, spin damping, restitution, and a mesh factory fed the material palette.
3. **LaunchParameters** – combination of force + projectile + environment + tint color.
4. **SimulationEngine** – manages live projectiles, applies impulses, integrates via RK4 with adaptive sub-stepping, updates Three.js meshes/trails, and records telemetry samples every 0.08 s.
5. **Telemetry** – stored per launch (`LaunchRecord`) and piped to the HUD + timeline.

Equations in play:

\[
\vec{F}_{\text{total}} = \vec{F}_g + \vec{F}_d + \vec{F}_m + \vec{F}_{\text{impulse}}\
\vec{F}_d = -\tfrac{1}{2}\rho C_d A \lVert \vec{v}_{rel} \rVert \vec{v}_{rel}\
\vec{F}_m = S (\vec{\omega} \times \vec{v}_{rel})
\]

Where \(S\) is derived from the projectile’s spin damping coefficient.

## Rendering Stack

- **SceneComposer** – wraps renderer, EffectComposer, SSAO/Bloom/Film passes, environment, lighting, camera rig, and particle haze.
- **Environment** – procedural basalt ground plane, gradient sky, distant silhouette plane, volumetric fog.
- **LightingRig** – hemisphere fill + directional moonlight + copper fill + rail-side area lights.
- **CameraRig** – OrbitControls + chase offset; automatically locks onto the most recent projectile.
- **Particles** – slow-moving embers for depth cues near the runway.

## UI / Instrumentation

- **Force Legend** – clickable SVG tile set toggling delivery modes.
- **Launch Console (Tweakpane)** – select force/projectile, adjust gravity/air density/wind, launch button.
- **HUD** – altitude, speed, range, max height, flight time, impact speed.
- **Timeline Panel** – overlays the last five trajectories as sparklines.
- **Diagnostics** – FPS + active shot count.

## Running & Building

```bash
npm install       # install deps
npm run dev       # dev server @ http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve dist/ locally for smoke tests
```

## Extending the Lab

- **New force profiles:** add entries to `src/data/forceProfiles.ts` with a new impulse function and icon.
- **New projectile types:** create mesh factories (procedural geometry + palette) in `src/data/projectileCatalog.ts`.
- **Atmospheric presets:** add to `src/data/environmentPresets.ts` and expose via the console if needed.
- **Visual polish:** extend `SceneComposer` with additional post-processing passes, volumetric light shafts, or custom shaders.
- **Gameplay layers:** add targets, scoring, or replay export by tapping into `SimulationEngine.getLaunchRecords()`.

## Testing Ideas

- Inspect telemetry arrays via console (each `LaunchRecord` captures speed/altitude/time samples).
- Validate drag tuning by launching the same projectile under different air densities and ensuring range/flight time trends match expectations.
- Stress-test impulse durations by extending `duration` in a profile to confirm adaptive sub-stepping stays stable.

## License

MIT — see `LICENSE` (or include one) if you plan to distribute.

---

Questions or feature ideas? Drop them in the issue tracker and reference the module where you'd like to plug in. Happy launching.
