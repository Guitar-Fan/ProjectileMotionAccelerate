# 🚀 Development Guide — Nightfall Ballistics

This guide covers day-to-day workflows for the new Vite + Three.js implementation. No Rust/WASM toolchain is required anymore; everything runs in TypeScript inside the browser.

## 1. Environment Setup

1. Ensure Node.js 18+ is installed (Codespaces already provides Node 22).
2. Install dependencies:
   ```bash
   npm install
   ```

## 2. Essential Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server with HMR (default http://localhost:5173). |
| `npm run build` | Production build (outputs to `dist/`). |
| `npm run preview` | Serves the production build locally for smoke testing. |

## 3. Editing Workflow

| Layer | Files | Notes |
| --- | --- | --- |
| Physics | `src/physics/*` | Update constants, forces, integrator, or `SimulationEngine` for new behaviors. |
| Catalog data | `src/data/forceProfiles.ts`, `projectileCatalog.ts`, `environmentPresets.ts` | Add new projectiles, forces, or atmospheric presets. |
| Assets | `src/assets/proceduralTextures.ts`, `public/assets/sprites/` | Extend procedural materials or add new SVG sprites. |
| Rendering | `src/scene/*` | Modify lighting, camera behavior, post-processing, or environment geometry. |
| UI | `src/ui/*`, `src/instrumentation/*`, `src/styles/global.css` | Adjust Tweakpane config, HUD styling, or diagnostics overlays. |
| Bootstrap | `src/main.ts` | Wire new modules together, add event listeners, or extend the render loop. |

Changes to TypeScript or CSS automatically trigger HMR when `npm run dev` is running.

## 4. Adding a New Force Profile

1. Create an SVG sprite in `public/assets/sprites/your-force.svg`.
2. Append a profile to `src/data/forceProfiles.ts`:
   ```ts
   {
     id: 'hammer',
     label: 'Hammer Toss',
     description: 'Long impulse with arcs of lift.',
     duration: 0.18,
     impulse: (t) => impulseVector(3600 * easeImpulse(t, 0.18), 42, 15),
     spinAxis: new THREE.Vector3(0, 0, 1),
     spinRate: 16,
     launchElevation: 42,
     icon: '/assets/sprites/hammer.svg'
   }
   ```
3. The legend + console will pick it up automatically.

## 5. Adding a New Projectile Type

1. Create a mesh factory in `src/data/projectileCatalog.ts` using the material palette.
2. Define mass, reference area, drag coefficient, spin damping, and restitution.
3. No extra wiring required—Tweakpane lists projectiles automatically.

## 6. Adjusting Physics

- **Integrator:** `src/physics/integrators.ts` contains the RK4 implementation.
- **Forces:** Modify drag/lift/gravity in `src/physics/forces.ts`.
- **Simulation loop:** `src/physics/simulation.ts` handles impulse injection, ground collisions, telemetry, and trail updates.
- **Environment:** Live sliders feed `EnvironmentState` objects straight into the simulation engine.

## 7. Rendering Tips

- SSAO/Bloom/Film passes configured in `SceneComposer`. Tune parameters there or add new passes.
- Camera tracking offset lives in `CameraRig`. Adjust the `followOffset` vector for different look angles.
- Lighting adjustments go through `LightingRig` (moon directional + copper fill + rail area lights).
- Particles/fog are in `Environment` + `Particles` modules.

## 8. UI/UX Enhancements

- Tweakpane styles come from `tweakpane/dist/tweakpane.css`. Override specifics inside `src/styles/global.css`.
- `HUD` + `Timeline` overlays live in `document.body`. Modify layout by editing their respective classes.
- `ControlsPanel.setForce` lets other widgets (like the legend) sync selection state.

## 9. Telemetry & Diagnostics

- Each launch pushes a `LaunchRecord` (samples + summary) into `SimulationEngine`.
- `Timeline` renders the last five trajectories. Use it to debug trends when tuning drag or impulses.
- `Diagnostics` shows FPS + active shots; helpful when experimenting with numerous simultaneous launches.

## 10. Deployment

1. Run `npm run build`.
2. Upload the `dist/` folder to any static host (GitHub Pages, Netlify, Vercel, etc.).
3. Because assets are relative, the app runs from any sub-path.

## 11. Troubleshooting

| Issue | Fix |
| --- | --- |
| Blank screen | Check browser console for Three.js/WebGL errors; ensure GPU support. |
| Tweakpane styles missing | Confirm `import 'tweakpane/dist/tweakpane.css';` exists in `src/main.ts`. |
| Visual glitches after resize | Call `composer.handleResize()` or refresh; ensure `window` resize listener hasn’t been removed. |
| Physics feels unstable | Lower impulse magnitudes or increase `MIN_TIME_STEP` (smaller dt) to improve stability. |

## 12. Testing Ideas

- **Regression snapshots:** Launch each force/profile combo and confirm telemetry ranges remain within expected bounds.
- **Performance:** Fire five projectiles in quick succession; FPS should remain near 60 on a modern laptop.
- **Lighting:** Toggle devtools “Sensors” to emulate low-end GPUs and verify bloom/film settings behave.

## 13. Style Guide

- Favor procedural textures (Canvas/Three.js) and self-authored SVGs over external art.
- Keep comments concise and focused on complex logic.
- Default to ASCII characters in source files unless there’s a strong reason not to.

Happy launching! If you add new delivery modes or projectiles, remember to include their documentation in `PROJECT_README.md` so the showcase catalog stays up to date.
