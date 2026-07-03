import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CONFIG, QUALITY_SIZES, SCENES, type Quality, type SceneId } from './config';
import { ParticleSystem } from './sim/ParticleSystem';
import { CenterStar } from './sim/CenterStar';
import { StateMachine } from './sim/StateMachine';
import { InputManager } from './input/InputManager';
import { HandTracker } from './input/HandTracker';
import { Overlay } from './ui/Overlay';
import { StartScreen } from './ui/StartScreen';
import { WebcamPanel } from './ui/WebcamPanel';

const app = document.getElementById('app')!;
const canvas = document.getElementById('scene') as HTMLCanvasElement;

if (!document.createElement('canvas').getContext('webgl2')) {
  const fatal = document.createElement('div');
  fatal.className = 'fatal';
  fatal.innerHTML =
    '<p>This experience needs WebGL2, which your browser or GPU doesn&rsquo;t provide.<br>' +
    'Try a recent version of Chrome, Firefox, Edge, or Safari.</p>';
  document.body.appendChild(fatal);
  throw new Error('WebGL2 unavailable');
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.background);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 60);
camera.position.set(0, 1.9, 5.2);
camera.lookAt(0, 0.2, 0);

function makeBallMesh(): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }),
  );
  m.visible = false;
  scene.add(m);
  return m;
}
const ballMeshes = [makeBallMesh(), makeBallMesh()];

const centerStar = new CenterStar();
scene.add(centerStar.mesh);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  CONFIG.bloom.strength,
  CONFIG.bloom.radius,
  CONFIG.bloom.threshold,
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

let particles: ParticleSystem;
let currentScene: SceneId = CONFIG.defaultScene;

function buildParticles(quality: Quality): void {
  if (particles) {
    scene.remove(particles.points);
    particles.dispose();
  }
  particles = new ParticleSystem(renderer, QUALITY_SIZES[quality], currentScene);
  particles.points.rotation.set(0, 0, 0);
  scene.add(particles.points);
  applyCameraForScene(currentScene);
}

function applyCameraForScene(id: SceneId): void {
  if (id === 'galaxy') camera.position.set(0, 3.4, 4.6);
  else if (id === 'ocean') camera.position.set(0, 1.0, 5.6);
  else camera.position.set(0, 1.9, 5.2);
  camera.lookAt(0, 0.2, 0);
}

function switchScene(id: SceneId): void {
  if (id === currentScene) return;
  currentScene = id;
  stateMachine.setScene(id);
  particles.reseed(id);
  particles.points.rotation.set(0, 0, 0);
  angularVel.set(0, CONFIG.autoSpin);
  applyCameraForScene(id);
  overlay.setScene(id);
  overlay.toast(`Scene: ${id}`);
}

const angularVel = new THREE.Vector2(0, CONFIG.autoSpin);

const stateMachine = new StateMachine();

const overlay = new Overlay();
app.appendChild(overlay.element);
currentScene = overlay.scene;
stateMachine.setScene(currentScene);
buildParticles(overlay.quality);
bloomPass.enabled = overlay.bloom;
bloomPass.strength = overlay.bloomStrength;

const input = new InputManager(canvas, camera);
const webcamPanel = new WebcamPanel(() => activeTracker);
app.appendChild(webcamPanel.element);

let activeTracker: HandTracker | null = null;

const startScreen = new StartScreen(
  async () => {
    const tracker = await HandTracker.create(camera);
    activeTracker = tracker;
    input.attachHands(tracker);
    overlay.toast('LEFT hand = the dial, RIGHT hand drags to spin. Press G to change scene.');
  },
  () => {
    overlay.toast('Mouse mode — hold left to gather the ball, right-drag to spin');
  },
);
app.appendChild(startScreen.element);

overlay.onQualityChange = (q) => buildParticles(q);
overlay.onBloomChange = (on) => {
  bloomPass.enabled = on;
};
overlay.onBloomStrengthChange = (v) => {
  bloomPass.strength = v;
};
overlay.onSceneChange = (id) => switchScene(id);
overlay.onRebuild = () => buildParticles(overlay.quality);

window.addEventListener('keydown', (e) => {
  switch (e.key.toLowerCase()) {
    case 'h':
      overlay.toggleHud();
      break;
    case '?':
    case '/':
      overlay.toggleHelp();
      break;
    case 's':
      overlay.toggleSettings();
      break;
    case 'p':
      webcamPanel.toggle();
      break;
    case 'r':
      buildParticles(overlay.quality);
      break;
    case 'g': {
      const i = SCENES.indexOf(currentScene);
      switchScene(SCENES[(i + 1) % SCENES.length]);
      break;
    }
    case 'c':
      input.toggleInteractionMode();
      break;
    case 'escape':
      startScreen.show();
      break;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  particles.onResize();
});

let fps = 60;
let fpsSampleStart = performance.now();
let fpsFrames = 0;
let autoChecked = false;

function sampleFps(now: number): void {
  fpsFrames++;
  const elapsed = now - fpsSampleStart;
  if (elapsed >= 500) {
    fps = (fpsFrames / elapsed) * 1000;
    fpsFrames = 0;
    fpsSampleStart = now;
  }
  if (
    CONFIG.autoQuality &&
    !autoChecked &&
    now > CONFIG.fpsSampleSeconds * 1000 &&
    fps > 0 &&
    fps < CONFIG.fpsDowngradeBelow
  ) {
    autoChecked = true;
    const order: Quality[] = ['high', 'med', 'low'];
    const idx = order.indexOf(overlay.quality);
    if (idx < order.length - 1) {
      overlay.quality = order[idx + 1];
      buildParticles(overlay.quality);
      overlay.toast(`Dropped to ${overlay.quality} quality to keep things smooth`);
    }
  }
}

const clock = new THREE.Clock();

function frame(): void {
  requestAnimationFrame(frame);
  const dt = clock.getDelta();
  const now = performance.now();

  const { frame: gestures, usingHands } = input.poll();

  if (gestures.modeToggled) {
    overlay.toast(
      gestures.mode === 'collider'
        ? 'Collider mode — your hands are force balls. Press C to switch back.'
        : 'Dial mode — left hand is the dial, right hand rotates. Press C for collider.',
    );
  }

  particles.points.updateMatrixWorld();
  const localColliders = gestures.colliders.map((c) => ({
    ...c,
    position: particles.points.worldToLocal(c.position.clone()),
  }));

  const velUniforms = particles.velocityUniforms;
  stateMachine.update(dt, gestures, localColliders, velUniforms, particles.colorUniforms);

  for (let i = 0; i < ballMeshes.length; i++) {
    const c = gestures.colliders[i];
    const mesh = ballMeshes[i];
    if (gestures.mode === 'collider' && c) {
      mesh.visible = true;
      mesh.position.copy(c.position);
      (mesh.material as THREE.MeshBasicMaterial).opacity = c.opacity;
      const pulse = 1 + Math.sin(now * 0.004 + i * 2.1) * 0.08 + stateMachine.energy * 0.3;
      mesh.scale.setScalar(pulse);
    } else {
      mesh.visible = false;
    }
  }

  angularVel.y += -gestures.rotate.dx * CONFIG.rotateSensitivity;
  angularVel.x += gestures.rotate.dy * CONFIG.rotateSensitivity;
  angularVel.clampLength(0, CONFIG.rotateMaxSpeed);
  const decay = Math.exp(-CONFIG.rotateDamping * dt);
  angularVel.multiplyScalar(decay);
  if (angularVel.length() < CONFIG.autoSpin) angularVel.y = CONFIG.autoSpin;
  particles.points.rotation.y += angularVel.y * dt;
  particles.points.rotation.x = THREE.MathUtils.clamp(
    particles.points.rotation.x + angularVel.x * dt,
    -1.1,
    1.1,
  );

  particles.update(dt);
  centerStar.update(dt, stateMachine.dial, stateMachine.energy, currentScene === 'galaxy');
  webcamPanel.update();
  sampleFps(now);
  const baseMode = usingHands ? 'hand' : input.mode === 'hand' ? 'hand·lost' : 'mouse';
  overlay.update(
    fps,
    gestures.mode === 'collider' ? `${baseMode}·collide` : baseMode,
    stateMachine.label,
    stateMachine.accent,
    stateMachine.dial,
    gestures.leftActive,
    gestures.rightActive,
  );

  composer.render();
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) clock.getDelta();
});

frame();
