import * as THREE from 'three';
import type { HandLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { CONFIG } from '../config';
import { OneEuroFilter3 } from '../utils/OneEuroFilter';
import type { HandState } from './InputManager';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const WRIST = 0;
const MIDDLE_MCP = 9;
const PALM_POINTS = [0, 5, 9, 13, 17];
const FINGERS: Array<{ tip: number; pip: number }> = [
  { tip: 8, pip: 6 },
  { tip: 12, pip: 10 },
  { tip: 16, pip: 14 },
  { tip: 20, pip: 18 },
];

type Handedness = 'Left' | 'Right';

interface TrackedHand {
  filter: OneEuroFilter3;
  position: THREE.Vector3;
  speed: number;
  closedness: number;
  spread: number;
  lastSeen: number;
  baselineScale: number | null;
}

export class HandTracker {
  video: HTMLVideoElement;
  landmarks: NormalizedLandmark[][] = [];
  detectionFps = 0;

  private landmarker: HandLandmarker | null = null;
  private stream: MediaStream | null = null;
  private timer: number | null = null;
  private hands: Record<Handedness, TrackedHand> = {
    Left: this.newHand(),
    Right: this.newHand(),
  };
  private lastDetect = 0;
  private disposed = false;

  private constructor(private camera: THREE.PerspectiveCamera) {
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.style.display = 'none';
    document.body.appendChild(this.video);
  }

  private newHand(): TrackedHand {
    const { minCutoff, beta, dCutoff } = CONFIG.oneEuro;
    return {
      filter: new OneEuroFilter3(minCutoff, beta, dCutoff),
      position: new THREE.Vector3(0, 0.4, 0),
      speed: 0,
      closedness: 0,
      spread: 0.5,
      lastSeen: 0,
      baselineScale: null,
    };
  }

  static async create(camera: THREE.PerspectiveCamera): Promise<HandTracker> {
    const tracker = new HandTracker(camera);

    tracker.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    });
    tracker.video.srcObject = tracker.stream;
    await tracker.video.play();

    const vision = await import('@mediapipe/tasks-vision');
    const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
    try {
      tracker.landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 2,
      });
    } catch {
      tracker.landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numHands: 2,
      });
    }

    tracker.startLoop();
    return tracker;
  }

  private startLoop(): void {
    const interval = 1000 / CONFIG.detectHz;
    const tick = () => {
      if (this.disposed) return;
      if (!document.hidden) this.detect();
      this.timer = window.setTimeout(tick, interval);
    };
    tick();
  }

  private detect(): void {
    if (!this.landmarker || this.video.readyState < 2) return;
    const now = performance.now();
    if (now - this.lastDetect < 1) return;
    const result = this.landmarker.detectForVideo(this.video, now);
    if (this.lastDetect > 0) {
      this.detectionFps = this.detectionFps * 0.9 + (1000 / (now - this.lastDetect)) * 0.1;
    }
    this.lastDetect = now;
    this.landmarks = result.landmarks ?? [];

    const assigned = new Map<Handedness, { lm: NormalizedLandmark[]; score: number }>();
    const centroids: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < this.landmarks.length; i++) {
      const lm = this.landmarks[i];
      const cat = result.handedness?.[i]?.[0];
      if (!cat) continue;
      const label = (cat.categoryName === 'Left' ? 'Left' : 'Right') as Handedness;

      const c = centroid(lm);
      const isPhantom = centroids.some(
        (o) => Math.hypot(o.x - c.x, o.y - c.y) < CONFIG.phantomMinSeparation,
      );
      centroids.push(c);
      if (isPhantom) continue;

      const existing = assigned.get(label);
      if (!existing || cat.score > existing.score) {
        assigned.set(label, { lm, score: cat.score });
      }
    }

    for (const [label, det] of assigned) {
      this.updateHand(this.hands[label], det.lm, now);
    }
  }

  private updateHand(hand: TrackedHand, lm: NormalizedLandmark[], now: number): void {
    const dt = hand.lastSeen > 0 ? Math.max((now - hand.lastSeen) / 1000, 1e-3) : 1 / 30;
    const wasStale = now - hand.lastSeen > 300;
    hand.lastSeen = now;
    if (wasStale) hand.filter.reset();

    const c = centroid(lm);
    const nx = (1 - c.x) * 2 - 1;
    const ny = -(c.y * 2 - 1);

    const scale = dist2d(lm[WRIST], lm[MIDDLE_MCP]);
    if (hand.baselineScale === null) hand.baselineScale = scale;
    hand.baselineScale = hand.baselineScale * 0.995 + scale * 0.005;
    const depth = THREE.MathUtils.clamp(
      (scale / Math.max(hand.baselineScale, 1e-4) - 1) * CONFIG.handDepthRange,
      -CONFIG.handDepthRange,
      CONFIG.handDepthRange,
    );

    const [fx, fy, fz] = hand.filter.filter(nx, ny, depth, now);
    const world = this.unproject(fx, fy, fz);

    const instSpeed = wasStale ? 0 : world.distanceTo(hand.position) / dt;
    hand.speed = hand.speed * 0.85 + Math.min(instSpeed, 4) * 0.15;
    hand.position.copy(world);

    const wrist = lm[WRIST];
    let curlSum = 0;
    for (const f of FINGERS) {
      const ratio = dist2d(lm[f.tip], wrist) / Math.max(dist2d(lm[f.pip], wrist), 1e-4);
      const curl =
        1 -
        THREE.MathUtils.clamp(
          (ratio - CONFIG.fingerCurledRatio) /
            (CONFIG.fingerExtendedRatio - CONFIG.fingerCurledRatio),
          0,
          1,
        );
      curlSum += curl;
    }
    const rawClosed = curlSum / FINGERS.length;
    hand.closedness += (rawClosed - hand.closedness) * CONFIG.closednessSmoothing;

    let spreadSum = 0;
    for (let i = 0; i < FINGERS.length - 1; i++) {
      spreadSum += dist2d(lm[FINGERS[i].tip], lm[FINGERS[i + 1].tip]);
    }
    const spreadNorm = spreadSum / 3 / Math.max(scale, 1e-4);
    hand.spread = THREE.MathUtils.clamp((spreadNorm - 0.35) / 0.6, 0, 1);
  }

  private unproject(ndcX: number, ndcY: number, depth: number): THREE.Vector3 {
    const normal = new THREE.Vector3();
    this.camera.getWorldDirection(normal);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      normal.clone().negate(),
      new THREE.Vector3(0, 0.4, 0),
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hit = new THREE.Vector3(0, 0.4, 0);
    raycaster.ray.intersectPlane(plane, hit);
    hit.addScaledVector(normal, depth);
    return hit;
  }

  poll(): { left: HandState | null; right: HandState | null } {
    const leftLabel: Handedness = CONFIG.mirrorHandedness ? 'Right' : 'Left';
    const rightLabel: Handedness = CONFIG.mirrorHandedness ? 'Left' : 'Right';
    return {
      left: this.toState(this.hands[leftLabel]),
      right: this.toState(this.hands[rightLabel]),
    };
  }

  private toState(hand: TrackedHand): HandState | null {
    if (hand.lastSeen === 0) return null;
    const age = performance.now() - hand.lastSeen;
    if (age > CONFIG.trackingLostNeutralMs) return null;
    return {
      position: hand.position.clone(),
      closedness: age < 250 ? hand.closedness : 0,
      speed: hand.speed,
      opacity: age < 60 ? 1 : Math.max(1 - (age - 60) / CONFIG.trackingLostFadeMs, 0),
    };
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer !== null) clearTimeout(this.timer);
    this.landmarker?.close();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.video.remove();
  }
}

function centroid(lm: NormalizedLandmark[]): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const idx of PALM_POINTS) {
    x += lm[idx].x;
    y += lm[idx].y;
  }
  return { x: x / PALM_POINTS.length, y: y / PALM_POINTS.length };
}

function dist2d(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}
