# 🌌 Nightfall Ballistics Lab

Nightfall Ballistics is a cinematic 3D projectile showcase that compares kicks, cannon shots, bat cracks, hand throws, and rail launches inside a dark, eye-friendly test range. Rendering is handled by Three.js with custom lighting/camera rigs, while all physics is authored from scratch (RK4 integrator, drag, lift, impulse curves, and environment modeling).

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open the URL Vite prints (default http://localhost:5173) to explore the lab. Launch projectiles via the control pane, or tap any sprite in the force legend to swap delivery methods.

## ✨ Highlights

- **Five delivery profiles** – cannon, soccer kick, ash bat, hand throw, rail launcher – each with bespoke impulse curves and spin behavior.
- **Five projectile archetypes** – from graphite sabot shells to plasma capsules – with unique mass/drag profiles and procedural materials (basalt, leather, copper, plasma, graphite).
- **Custom physics** – adaptive RK4 integration, quadratic drag, Magnus lift, configurable gravity/air density/wind, deterministic telemetry logging.
- **Cinematic scene** – moonlit ground plane, volumetric fog, particle embers, bloom/film passes, orbit/tracking camera rig.
- **Generated art assets** – SVG sprites for legend tiles plus Canvas-based textures for every surface (ground, shells, leather seams, plasma glow).
- **Live HUD + timeline** – altitude/speed/range readouts, sparkline stack of recent flights, FPS + active shot diagnostics.

## 🧱 Project Structure

```
ProjectileMotionAccelerate/
├── public/
│   ├── index.html             # Entry page & HUD layers
│   └── assets/sprites/*.svg   # Hand-authored force icons
├── src/
│   ├── assets/                # Procedural texture factory
│   ├── data/                  # Force & projectile catalogs
│   ├── physics/               # Types, forces, integrator, simulation
│   ├── scene/                 # Three.js scene/lighting/camera
│   ├── ui/                    # Controls panel, HUD, legend
│   ├── instrumentation/       # Timeline + diagnostics overlays
│   ├── styles/                # Global styling
│   └── main.ts                # Bootstrap + render loop
├── package.json               # Scripts & dependencies
├── tsconfig.json
└── vite.config.ts
```

## 🧠 Custom Physics Stack

- **Force Profiles:** Functions emit force vectors over time (kicking vs cannon vs rail) with unique spin axes. No third-party physics libs involved.
- **Projectile Definitions:** Mass, reference area, drag coefficient, spin damping, restitution, mesh factory (procedural geometry + textures).
- **Environment:** Gravity, air density, and wind vector controlled live through the console panel.
- **Simulation Engine:**
	- Adaptive RK4 integrator with sub-stepping (`MIN_TIME_STEP = 1/240 s`).
	- Gravity + drag + Magnus lift + user-selected impulses.
	- Trail geometry (360 points) + telemetry samples every 0.08 s.
	- Impact handling with restitution/friction for each projectile.

## 🖥️ Frontend Stack

- **Three.js r169** for rendering, SSAO, UnrealBloom, Film grain, RectArea lights.
- **Tweakpane** for the “Launch Console” UI.
- **Chroma.js** for palette mixing when tinting trails.
- **Vite + TypeScript** for fast iteration.

## 🔧 Useful Scripts

| Command       | Purpose                                |
| ------------- | -------------------------------------- |
| `npm run dev` | Start Vite dev server with HMR         |
| `npm run build` | Production build (Vite)              |
| `npm run preview` | Preview production build locally  |

## 📷 Scene + Assets

- **Lighting:** Hemisphere fill, moonlight directional shadows, copper fill, rail-side area light strips.
- **Camera:** OrbitControls for manual view, automated chase when a new projectile launches.
- **Procedural textures:** Canvas-generated basalt floor, brushed graphite, stitched leather, burnished copper, plasma glow.
- **Sprites:** `/public/assets/sprites/*.svg` were authored specifically for this experience (cannon, kick, bat, throw, rail).

## 🗺️ Extensibility Ideas

- Alternate camera choreography (split view, top-down radar).
- Atmospheric profiles tied to presets (storm, orbital, underwater).
- Target meshes with collision volumes.
- Export/import launch presets (JSON) and shareable telemetry.
- Audio layer synced to launch/impact events.

---

Enjoy exploring the darker, moodier side of projectile physics ✨