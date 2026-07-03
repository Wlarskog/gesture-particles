import * as THREE from 'three';
import { MouseInput } from './MouseInput';
import type { HandTracker } from './HandTracker';

export interface HandState {
  position: THREE.Vector3;
  closedness: number;
  speed: number;
  opacity: number;
}

export interface ColliderState {
  position: THREE.Vector3;
  speed: number;
  opacity: number;
}

export type InteractionMode = 'dials' | 'collider';

export interface GestureFrame {
  mode: InteractionMode;
  modeToggled: boolean;
  gather: number;
  rotate: { dx: number; dy: number };
  colliders: ColliderState[];
  speed: number;
  leftActive: boolean;
  rightActive: boolean;
}

export type InputMode = 'mouse' | 'hand';

export class InputManager {
  mode: InputMode = 'mouse';
  interactionMode: InteractionMode = 'dials';
  readonly mouse: MouseInput;
  private hands: HandTracker | null = null;
  private prevRight: THREE.Vector3 | null = null;
  private heldGather = 0;
  private pendingToggle = false;

  constructor(canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera) {
    this.mouse = new MouseInput(canvas, camera);
  }

  attachHands(tracker: HandTracker): void {
    this.hands = tracker;
    this.mode = 'hand';
  }

  detachHands(): void {
    this.hands?.dispose();
    this.hands = null;
    this.mode = 'mouse';
  }

  toggleInteractionMode(): void {
    this.pendingToggle = true;
  }

  poll(): { frame: GestureFrame; usingHands: boolean } {
    const modeToggled = this.consumeToggles();

    if (this.hands) {
      const { left, right } = this.hands.poll();
      if (left || right) {
        return { frame: this.handFrame(left, right, modeToggled), usingHands: true };
      }
      this.prevRight = null;
    }
    return { frame: this.mouseFrame(modeToggled), usingHands: false };
  }

  private consumeToggles(): boolean {
    if (!this.pendingToggle) return false;
    this.pendingToggle = false;
    this.interactionMode = this.interactionMode === 'dials' ? 'collider' : 'dials';
    return true;
  }

  private handFrame(
    left: HandState | null,
    right: HandState | null,
    externalToggle: boolean,
  ): GestureFrame {
    const modeToggled = externalToggle;
    const speed = Math.max(left?.speed ?? 0, right?.speed ?? 0);

    if (this.interactionMode === 'collider') {
      const colliders: ColliderState[] = [];
      for (const hand of [left, right]) {
        if (hand) {
          colliders.push({
            position: hand.position.clone(),
            speed: hand.speed,
            opacity: hand.opacity,
          });
        }
      }
      this.prevRight = null;
      this.heldGather *= 0.95;
      return {
        mode: 'collider',
        modeToggled,
        gather: this.heldGather,
        rotate: { dx: 0, dy: 0 },
        colliders,
        speed,
        leftActive: !!left,
        rightActive: !!right,
      };
    }

    let gather = this.heldGather;
    if (left) {
      gather = left.closedness * left.opacity;
      this.heldGather = gather;
    } else {
      this.heldGather *= 0.97;
      gather = this.heldGather;
    }

    const rotate = { dx: 0, dy: 0 };
    if (right) {
      if (this.prevRight) {
        rotate.dx = right.position.x - this.prevRight.x;
        rotate.dy = right.position.y - this.prevRight.y;
      }
      this.prevRight = (this.prevRight ?? new THREE.Vector3()).copy(right.position);
    } else {
      this.prevRight = null;
    }

    return {
      mode: 'dials',
      modeToggled,
      gather,
      rotate,
      colliders: [],
      speed,
      leftActive: !!left,
      rightActive: !!right,
    };
  }

  private mouseFrame(modeToggled: boolean): GestureFrame {
    const { frame, pointerWorld } = this.mouse.poll();
    if (this.interactionMode === 'collider') {
      return {
        mode: 'collider',
        modeToggled,
        gather: 0,
        rotate: { dx: 0, dy: 0 },
        colliders: [{ position: pointerWorld.clone(), speed: frame.speed, opacity: 1 }],
        speed: frame.speed,
        leftActive: true,
        rightActive: true,
      };
    }
    return { ...frame, mode: 'dials', modeToggled, colliders: [] };
  }
}
