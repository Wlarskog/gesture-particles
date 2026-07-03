import { CONFIG } from '../config';

interface Param {
  path: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

interface Group {
  title: string;
  params: Param[];
  open?: boolean;
}

const GROUPS: Group[] = [
  {
    title: 'Simulation',
    open: true,
    params: [
      { path: 'damping', label: 'damping', min: 0.9, max: 0.999, step: 0.001 },
      { path: 'maxSpeed', label: 'max speed', min: 1, max: 8, step: 0.1 },
      { path: 'pointSize', label: 'point size', min: 0.5, max: 5, step: 0.1 },
      { path: 'bloom.radius', label: 'bloom radius', min: 0, max: 1, step: 0.05 },
      { path: 'bloom.threshold', label: 'bloom threshold', min: 0, max: 1, step: 0.02 },
    ],
  },
  {
    title: 'Nebula (cloud ↔ ball)',
    params: [
      { path: 'cloudRadius', label: 'cloud radius', min: 0.5, max: 4, step: 0.05 },
      { path: 'ballRadiusTight', label: 'ball radius', min: 0.1, max: 1.5, step: 0.05 },
      { path: 'stiffnessCloud', label: 'stiffness · cloud', min: 0.5, max: 8, step: 0.1 },
      { path: 'stiffnessBall', label: 'stiffness · ball', min: 0.5, max: 8, step: 0.1 },
      { path: 'turbulenceCloud', label: 'turbulence · cloud', min: 0, max: 2, step: 0.05 },
      { path: 'turbulenceBall', label: 'turbulence · ball', min: 0, max: 2, step: 0.05 },
    ],
  },
  {
    title: 'Galaxy',
    params: [
      { path: 'galaxy.discRadius', label: 'disc radius', min: 1, max: 32, step: 0.1 },
      { path: 'galaxy.discRadiusCollapsed', label: 'disc radius · collapsed', min: 0.5, max: 6, step: 0.05 },
      { path: 'galaxy.orbitSpeed', label: 'orbit speed', min: 0.1, max: 3, step: 0.05 },
      { path: 'galaxy.orbitSpeedCollapsed', label: 'orbit speed · collapsed', min: 0.5, max: 5, step: 0.05 },
      { path: 'galaxy.orbitGain', label: 'orbit gain', min: 0.2, max: 5, step: 0.1 },
      { path: 'galaxy.flatten', label: 'flatten', min: 0.5, max: 12, step: 0.1 },
      { path: 'galaxy.flattenCollapsed', label: 'flatten · collapsed', min: 1, max: 16, step: 0.1 },
      { path: 'galaxy.bulge', label: 'bulge / central puff', min: 0, max: 1, step: 0.01 },
      { path: 'galaxy.discEdgeSoften', label: 'soften outer edge', min: 0, max: 1, step: 0.05 },
      { path: 'galaxy.armTwist', label: 'arm twist', min: 0.5, max: 6, step: 0.1 },
      { path: 'galaxy.armStrength', label: 'arm strength', min: 0, max: 2, step: 0.05 },
      { path: 'galaxy.stiffness', label: 'stiffness', min: 0.5, max: 12, step: 0.1 },
      { path: 'galaxy.stiffnessCollapsed', label: 'stiffness · collapsed', min: 0.5, max: 8, step: 0.1 },
      { path: 'galaxy.sunRadius', label: 'sun radius', min: 0.1, max: 0.8, step: 0.01 },
      { path: 'galaxy.holeRadius', label: 'hole radius', min: 0.1, max: 0.9, step: 0.01 },
      { path: 'galaxy.coreGlow', label: 'core glow', min: 0, max: 1.5, step: 0.02 },
    ],
  },
  {
    title: 'Ocean (calm ↔ storm)',
    params: [
      { path: 'ocean.waveAmpCalm', label: 'wave amp · calm', min: 0, max: 1, step: 0.02 },
      { path: 'ocean.waveAmpStorm', label: 'wave amp · storm', min: 0, max: 2, step: 0.05 },
      { path: 'ocean.waveFreqCalm', label: 'wave freq · calm', min: 0.2, max: 3, step: 0.05 },
      { path: 'ocean.waveFreqStorm', label: 'wave freq · storm', min: 0.5, max: 5, step: 0.05 },
      { path: 'ocean.turbulenceStorm', label: 'turbulence · storm', min: 0, max: 3, step: 0.05 },
      { path: 'ocean.stiffness', label: 'stiffness', min: 0.5, max: 8, step: 0.1 },
    ],
  },
  {
    title: 'Collider (press C)',
    params: [
      { path: 'ballRadius', label: 'collider radius', min: 0.3, max: 3, step: 0.05 },
      { path: 'palmRepelBase', label: 'repel strength', min: 0, max: 20, step: 0.5 },
      { path: 'palmRepelSpeedBoost', label: 'repel · speed boost', min: 0, max: 30, step: 0.5 },
      { path: 'collisionPush', label: 'collision push', min: 0, max: 3, step: 0.05 },
    ],
  },
  {
    title: 'Hand tracking',
    params: [
      { path: 'handDepthRange', label: 'hand depth range', min: 0, max: 3, step: 0.1 },
      { path: 'oneEuro.minCutoff', label: 'smoothing · min cutoff', min: 0.1, max: 4, step: 0.05 },
      { path: 'oneEuro.beta', label: 'smoothing · beta', min: 0, max: 0.2, step: 0.005 },
    ],
  },
];

function getPath(obj: Record<string, unknown>, path: string): number {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], obj) as number;
}
function setPath(obj: Record<string, unknown>, path: string, value: number): void {
  const keys = path.split('.');
  const last = keys.pop()!;
  const target = keys.reduce<Record<string, unknown>>(
    (o, k) => o[k] as Record<string, unknown>,
    obj,
  );
  target[last] = value;
}

const STORAGE_KEY = 'gesture-particles.params';

export class ParamPanel {
  readonly element: HTMLDetailsElement;
  private defaults: Record<string, number> = {};
  onRebuild: (() => void) | null = null;

  constructor(onRebuild?: () => void) {
    this.onRebuild = onRebuild ?? null;
    for (const g of GROUPS) {
      for (const p of g.params) this.defaults[p.path] = getPath(CONFIG as never, p.path);
    }
    this.applyStored();

    this.element = document.createElement('details') as HTMLDetailsElement;
    this.element.className = 'param-root';
    this.element.innerHTML = `<summary>Parameters (live)</summary>`;

    const body = document.createElement('div');
    body.className = 'param-body';

    for (const g of GROUPS) {
      const grp = document.createElement('details');
      grp.className = 'param-group';
      if (g.open) grp.open = true;
      grp.innerHTML = `<summary>${g.title}</summary>`;
      for (const p of g.params) grp.appendChild(this.row(p));
      body.appendChild(grp);
    }

    const hint = document.createElement('p');
    hint.className = 'param-hint';
    hint.textContent =
      'Most changes are instant. Radius/layout changes fully apply on Rebuild (or press R).';
    body.appendChild(hint);

    const rebuild = document.createElement('button');
    rebuild.className = 'param-reset';
    rebuild.textContent = 'Rebuild layout';
    rebuild.addEventListener('click', () => this.onRebuild?.());
    body.appendChild(rebuild);

    const reset = document.createElement('button');
    reset.className = 'param-reset';
    reset.textContent = 'Reset all to defaults';
    reset.addEventListener('click', () => this.resetAll());
    body.appendChild(reset);

    this.element.appendChild(body);
  }

  private row(p: Param): HTMLElement {
    const row = document.createElement('label');
    row.className = 'param-row';
    const value = getPath(CONFIG as never, p.path);
    row.innerHTML = `
      <span class="param-label">${p.label}</span>
      <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${value}" />
      <span class="param-value">${fmt(value)}</span>
    `;
    const input = row.querySelector('input')!;
    const out = row.querySelector('.param-value')!;
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      setPath(CONFIG as never, p.path, v);
      out.textContent = fmt(v);
      this.persist(p.path, v);
    });
    return row;
  }

  private persist(path: string, value: number): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const obj = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      obj[path] = value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {}
  }

  private applyStored(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw) as Record<string, number>;
      for (const [path, v] of Object.entries(obj)) {
        if (path in this.defaults) setPath(CONFIG as never, path, v);
      }
    } catch {}
  }

  private resetAll(): void {
    for (const [path, v] of Object.entries(this.defaults)) setPath(CONFIG as never, path, v);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    for (const row of this.element.querySelectorAll<HTMLElement>('.param-row')) {
      const input = row.querySelector('input')!;
      const out = row.querySelector('.param-value')!;
      const label = row.querySelector('.param-label')!.textContent;
      const param = GROUPS.flatMap((g) => g.params).find((p) => p.label === label);
      if (!param) continue;
      const v = this.defaults[param.path];
      input.value = String(v);
      out.textContent = fmt(v);
    }
  }
}

function fmt(v: number): string {
  return Math.abs(v) < 1 ? v.toFixed(v < 0.01 ? 3 : 2) : v.toFixed(v < 10 ? 2 : 1);
}
