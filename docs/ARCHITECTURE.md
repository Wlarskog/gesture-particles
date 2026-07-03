# Architecture — Gesture Particles

This document explains how the simulator is structured, how data flows through the
system, and where to look when extending or debugging it.

## High-level overview

Gesture Particles is a **browser-only** real-time app with three layers:

1. **Input** — webcam hand tracking (MediaPipe) or mouse fallback
2. **Simulation** — GPGPU particle physics on the GPU (Three.js + custom GLSL)
3. **Presentation** — point-sprite rendering, bloom post-processing, HTML overlay UI

There is no backend. All video processing happens on-device; nothing is uploaded.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Webcam /   │     │  InputManager    │     │  StateMachine       │
│  Mouse      │────▶│  (gestures,      │────▶│  (dial, scene,      │
│             │     │   trackball)     │     │   palette targets)  │
└─────────────┘     └──────────────────┘     └──────────┬──────────┘
                                                        │
                                                        ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Screen     │◀────│  THREE.Points +  │◀────│  ParticleSystem     │
│  (bloom)    │     │  CenterStar      │     │  (GPGPU ping-pong)  │
└─────────────┘     └──────────────────┘     └─────────────────────┘
```

## Directory layout

| Path | Role |
|------|------|
| `src/main.ts` | App bootstrap: renderer, post-processing, main loop, wiring |
| `src/config.ts` | **Single source of truth** for all tunables |
| `src/input/HandTracker.ts` | MediaPipe wrapper, 30 Hz off render thread |
| `src/input/InputManager.ts` | Unifies hand + mouse into gesture frame |
| `src/input/MouseInput.ts` | Mouse/trackball fallback |
| `src/sim/ParticleSystem.ts` | GPGPU sim + point mesh |
| `src/sim/StateMachine.ts` | Scene/dial interpolation, uniform updates |
| `src/sim/CenterStar.ts` | Galaxy sun / black hole mesh |
| `src/sim/shaders/*.glsl` | Velocity, position, point sprite, star shaders |
| `src/ui/*` | Overlay HUD, settings, start screen, webcam panel |
| `src/utils/OneEuroFilter.ts` | Jitter reduction on hand positions |

## Render loop (`main.ts`)

Each frame (~60 Hz):

1. **Poll input** — `InputManager.poll()` returns dial value, rotation delta, colliders, energy
2. **Update state** — `StateMachine.update()` eases dial/palette toward targets, writes sim uniforms
3. **Sim step** — `ParticleSystem.update(dt)` runs two GPU passes (velocity → position)
4. **Visuals** — center star, collider debug spheres, trackball rotation on the point cloud
5. **Post** — `EffectComposer` with UnrealBloom + OutputPass
6. **HUD** — overlay FPS, mode label, dial readout

Hand detection runs on a **separate 30 Hz timer** inside `HandTracker` so MediaPipe never blocks rendering.

## GPGPU simulation

`ParticleSystem` uses Three.js `GPUComputationRenderer`:

- Simulation grid: `size × size` texels → up to 1M particles (quality tier)
- Two float/half-float textures ping-pong: **velocity** and **position**
- Each texel = one particle; `THREE.Points` draws one vertex per texel

### Velocity pass (`velocity.frag.glsl`)

Per particle, the shader:

- Spring-pulls toward a **formation target** (cloud shell, galaxy disc, ocean surface)
- Adds **curl noise** for turbulent flow
- Applies scene-specific forces (orbital velocity, wave height, collapse)
- Optional hand **collider** repulsion (when collider mode enabled)
- Damps and clamps speed

### Position pass (`position.frag.glsl`)

Integrates velocity into position with clamped delta time.

### Rendering (`points.vert/frag.glsl`)

- Point size attenuates with depth
- Color from a 3-stop gradient keyed by particle speed
- Palette uniforms cross-fade as the left-hand dial moves

## Interaction model

Inspired by continuous dial controls (Verma-style):

| Input | Effect |
|-------|--------|
| Left hand openness | Continuous 0→1 dial (cloud ↔ ball, galaxy ↔ collapse, calm ↔ storm) |
| Right hand drag | Trackball rotation with inertia |
| Hand speed | Energy → brightens fastest particles |
| Mouse | Full fallback when camera unavailable |

`StateMachine` smooths dial and palette changes (~1 s morph) so scene switches and gesture changes feel fluid rather than snapping.

## Scenes

Three scenes share the same engine; switching **re-seeds** formation targets without resetting the texture layout:

- **nebula** — spherical cloud ↔ dense ball
- **galaxy** — spiral disc with central sun; dial triggers gravitational collapse into black hole
- **ocean** — horizontal wave sheet; dial intensifies storm

Scene-specific parameters live under `CONFIG.galaxy`, `CONFIG.ocean`, and palette entries in `config.ts`.

## Hand tracking details

MediaPipe `HandLandmarker` returns 21 landmarks per hand. Key design choices:

1. **Handedness keys** — tracks Left/Right labels, not detection index (avoids teleporting when index swaps)
2. **One Euro filter** — reduces jitter on 3D projected positions
3. **Continuous curl** — finger tip/PIP ratios map to 0..1 closedness (no discrete gesture classifier)
4. **Phantom rejection** — duplicate detections of one hand filtered by minimum separation
5. **`mirrorHandedness`** — corrects for selfie-mirror camera labeling

## Performance

| Tier | Grid | Particles |
|------|------|-----------|
| low | 256² | ~65k |
| med | 512² | ~262k |
| high | 1024² | ~1M |

Auto-quality drops a tier if FPS stays below 45 for the first 3 seconds (`CONFIG.autoQuality`).

Half-float render targets are used when `EXT_color_buffer_float` is unavailable.

## Build & deploy

- **Dev**: Vite dev server (`npm run dev`)
- **GitHub Pages**: `npm run build` → `dist/` with relative base `./`
- **Portfolio embed**: `npm run build:embed` → `dist/` with base `/games/gesture-particles/`

The GitHub Actions workflow in `.github/workflows/deploy.yml` builds and publishes to Pages on push to `main`.

## Extending the project

Common tasks:

- **New scene** — add to `SCENES` in `config.ts`, extend velocity shader formation branch, update `StateMachine` labels
- **New gesture** — extend `InputManager` frame struct; avoid blocking the render loop
- **Visual tweak** — start in `config.ts`; only touch shaders if behavior needs to change
- **Quality** — adjust `QUALITY_SIZES` or auto-downgrade thresholds

## Dependencies

| Package | Use |
|---------|-----|
| `three` | WebGL renderer, GPGPU, post-processing |
| `@mediapipe/tasks-vision` | Hand landmark detection (WASM + model from CDN) |
| `vite` | Dev server and production bundler (inlines GLSL via `?raw`) |

## License notes

Simulation GLSL includes public-domain simplex noise from [webgl-noise](https://github.com/ashima/webgl-noise). See `LICENSE`.
