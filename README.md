
A gesture-controlled GPU particle simulator that runs entirely in your
browser. Just a webcam (or a mouse).

Inspired by David Katz's MediaPipe + Three.js particle sim featured on
[80 Level](https://80.lv/articles/impressive-particle-simulator-controlled-by-hand-gestures).


## Quick start

On Windows, just double-click **`start.bat`** — it installs dependencies on the
first run and opens the app in your browser. Otherwise:

```bash
npm install
npm run dev
```

Open the printed localhost URL. Video is processed on-device by
MediaPipe.

## Controls

Each hand is an independent continuous controller:

| Controllers | Hand | Mouse | Effect |
| --- | --- | --- | --- |
| Action controller | LEFT hand: open ↔ closed | Hold/release left button (wheel parks it) | Action depends on the scene (see below) |
| Rotate | Left hand: drag anywhere | Right-drag or Space-drag | Trackball with inertia, spin and tilt the whole field |
| Energy | Based on hand's speed | Cursor speed | Brightens the fastest particles |
| Colliders | (Additional Gesture mode. Press C key to swap back and forth) Based on both hands position | Cursor position | Collides with particles |

### Scenes (cycle with **G**, or pick in Settings)

| Scene | LEFT hand open | LEFT hand closed |
| --- | --- | --- |
| **nebula** | dispersed turbulent cloud | tight, dense, glowing ball |
| **galaxy** | a calm spiral disc around a bright simmering **sun** | a gravitational **collapse**. The sun extinguishes into a pitch-black **black hole** with a white-hot Fresnel photon ring, the disc contracts, and orbits speed up |
| **ocean** | glassy, gently rolling swells | a raging storm of steep, chaotic, white-capped waves |

Note: MediaPipe labels hands from the unmirrored camera frame, so roles are
mirror-corrected by default. if left/right feel swapped on your setup, flip
`mirrorHandedness` in `src/config.ts`.

Keyboard: `?` help · `S` settings · `H` hide HUD · `P` webcam panel ·
`R` reset particles · `Esc` menu.

## How it works

```
Webcam ──▶ MediaPipe HandLandmarker (30 Hz, off the render loop)
              │ 21 landmarks/hand
              ▼
        One Euro filter + gesture classifier (pinch/palm/fist, hysteresis)
              ▼
        InputManager ──▶ StateMachine (formation + palette targets, 1 s morph)
              ▼
        GPGPU sim: velocity & position live in float textures,
        ping-ponged through two fragment passes
        (formation spring + curl noise + force ball + damping)
              ▼
        THREE.Points (1 vertex per texel) ──▶ UnrealBloom ──▶ screen
```

## Tuning

Every constant like spring stiffness, damping, wave amplitude, palettes, bloom,
gesture thresholds, One Euro parameters, lives in
[`src/config.ts`](src/config.ts) with comments. Start there.

Quality tiers set the simulation texture size: low = 65k particles (256²),
med = 262k (512²), high = 1M (1024²). The app auto-drops a tier if the first
three seconds run under 45 fps.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, data flow, GPGPU pipeline, extension guide


## Troubleshooting
- **Low FPS** — drop quality in settings (`S`), disable bloom, or close other
  GPU-heavy tabs. Integrated GPUs are happiest at low/med.
- **Black screen** — the app requires WebGL2. Check `chrome://gpu` for
  blocklisted drivers.

## License

MIT. The simplex-noise GLSL is by Ian McEwan / Ashima Arts (public domain,
[webgl-noise](https://github.com/ashima/webgl-noise)).
