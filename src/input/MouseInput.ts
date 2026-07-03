import * as THREE from 'three';
import type { GestureFrame } from './InputManager';

type MouseFrame = Omit<GestureFrame, 'mode' | 'modeToggled' | 'colliders'>;

export class MouseInput {
  private gather = 0;
  private wheelGather = 0;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private ndc = new THREE.Vector2();
  private worldPos = new THREE.Vector3(0, 0.4, 0);
  private locked: 'cloud' | 'ball' | null = null;
  private leftDown = false;
  private rotateDown = false;
  private spaceDown = false;
  private lastPoll = performance.now();
  private lastClient = new THREE.Vector2();
  private dragDelta = new THREE.Vector2();
  private speed = 0;
  private lastMove = performance.now();

  constructor(
    canvas: HTMLCanvasElement,
    private camera: THREE.PerspectiveCamera,
  ) {
    canvas.addEventListener('pointermove', (e) => {
      const now = performance.now();
      const dx = e.clientX - this.lastClient.x;
      const dy = e.clientY - this.lastClient.y;
      this.lastClient.set(e.clientX, e.clientY);

      this.ndc.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      );
      const planeNormal = new THREE.Vector3();
      this.camera.getWorldDirection(planeNormal).negate();
      this.plane.setFromNormalAndCoplanarPoint(planeNormal, new THREE.Vector3(0, 0.4, 0));
      this.raycaster.setFromCamera(this.ndc, this.camera);
      this.raycaster.ray.intersectPlane(this.plane, this.worldPos);

      const dt = Math.max((now - this.lastMove) / 1000, 1e-3);
      const instSpeed = Math.hypot(dx, dy) / window.innerHeight / dt;
      this.speed = this.speed * 0.85 + Math.min(instSpeed * 2.5, 4) * 0.15;
      this.lastMove = now;

      if (this.rotateDown || this.spaceDown) {
        this.dragDelta.x += (dx / window.innerHeight) * 5;
        this.dragDelta.y += (-dy / window.innerHeight) * 5;
      }
    });
    canvas.addEventListener('pointerdown', (e) => {
      this.lastClient.set(e.clientX, e.clientY);
      if (e.pointerType === 'touch' || e.button === 0) this.leftDown = true;
      else if (e.button === 2) this.rotateDown = true;
    });
    window.addEventListener('pointerup', (e) => {
      if (e.button === 0 || e.pointerType === 'touch') this.leftDown = false;
      if (e.button === 2) this.rotateDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.wheelGather = THREE.MathUtils.clamp(
          this.wheelGather - Math.sign(e.deltaY) * 0.08,
          0,
          1,
        );
      },
      { passive: false },
    );
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') this.spaceDown = true;
      if (e.key === '1') this.locked = 'cloud';
      if (e.key === '2') this.locked = 'ball';
      if (e.key === '0') this.locked = null;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.spaceDown = false;
    });
    let lastTouchMid: THREE.Vector2 | null = null;
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        if (lastTouchMid) {
          this.dragDelta.x += ((mx - lastTouchMid.x) / window.innerHeight) * 5;
          this.dragDelta.y += ((-(my - lastTouchMid.y)) / window.innerHeight) * 5;
        }
        lastTouchMid = lastTouchMid ?? new THREE.Vector2();
        lastTouchMid.set(mx, my);
        this.leftDown = false;
      } else {
        lastTouchMid = null;
      }
    });
    canvas.addEventListener('touchend', () => {
      lastTouchMid = null;
    });
  }

  poll(): { frame: MouseFrame; pointerWorld: THREE.Vector3 } {
    const now = performance.now();
    const dt = Math.min((now - this.lastPoll) / 1000, 0.1);
    this.lastPoll = now;
    if (now - this.lastMove > 90) this.speed *= 0.9;

    const target =
      this.locked === 'ball' ? 1 : this.locked === 'cloud' ? 0 : this.leftDown ? 1 : this.wheelGather;
    const ramp = dt / 0.35;
    if (this.gather < target) this.gather = Math.min(this.gather + ramp, target);
    else if (this.gather > target) this.gather = Math.max(this.gather - ramp, target);

    const rotate = { dx: this.dragDelta.x, dy: this.dragDelta.y };
    this.dragDelta.set(0, 0);

    return {
      frame: {
        gather: this.gather,
        rotate,
        speed: this.speed,
        leftActive: true,
        rightActive: true,
      },
      pointerWorld: this.worldPos,
    };
  }
}
