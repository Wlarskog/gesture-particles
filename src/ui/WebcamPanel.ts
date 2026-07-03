import type { HandTracker } from '../input/HandTracker';

const CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export class WebcamPanel {
  readonly element: HTMLDivElement;
  visible = false;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(private tracker: () => HandTracker | null) {
    this.element = document.createElement('div');
    this.element.className = 'webcam-panel hidden';
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.element.appendChild(this.canvas);
    const label = document.createElement('div');
    label.className = 'webcam-label';
    label.textContent = 'hand tracking';
    this.element.appendChild(label);
    this.ctx = this.canvas.getContext('2d')!;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.element.classList.toggle('hidden', !this.visible);
  }

  update(): void {
    if (!this.visible) return;
    const tracker = this.tracker();
    const ctx = this.ctx;
    const { width: w, height: h } = this.canvas;

    ctx.fillStyle = '#0a0a0e';
    ctx.fillRect(0, 0, w, h);

    if (!tracker) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '16px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('camera off — mouse mode', w / 2, h / 2);
      return;
    }

    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    if (tracker.video.readyState >= 2) ctx.drawImage(tracker.video, 0, 0, w, h);
    ctx.restore();

    for (const lm of tracker.landmarks) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const [a, b] of CONNECTIONS) {
        ctx.moveTo((1 - lm[a].x) * w, lm[a].y * h);
        ctx.lineTo((1 - lm[b].x) * w, lm[b].y * h);
      }
      ctx.stroke();
      ctx.fillStyle = '#17c3ff';
      for (const p of lm) {
        ctx.beginPath();
        ctx.arc((1 - p.x) * w, p.y * h, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '13px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`detect ${tracker.detectionFps.toFixed(0)} hz`, 12, h - 12);
  }
}
