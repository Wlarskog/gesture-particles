import type { Quality, SceneId } from '../config';
import { ParamPanel } from './ParamPanel';
import { CONFIG, QUALITY_SIZES } from '../config';

interface OverlaySettings {
  quality: Quality;
  bloom: boolean;
  bloomStrength: number;
  scene: SceneId;
}

export class Overlay {
  readonly element: HTMLDivElement;
  onQualityChange: ((q: Quality) => void) | null = null;
  onBloomChange: ((on: boolean) => void) | null = null;
  onBloomStrengthChange: ((v: number) => void) | null = null;
  onSceneChange: ((s: SceneId) => void) | null = null;
  onRebuild: (() => void) | null = null;

  private fpsEl: HTMLElement;
  private countEl: HTMLElement;
  private modeEl: HTMLElement;
  private stateEl: HTMLElement;
  private gatherEl: HTMLElement;
  private gatherLabelEl: HTMLElement;
  private handsEl: HTMLElement;
  private helpEl: HTMLElement;
  private settingsEl: HTMLElement;
  private toastEl: HTMLElement;
  private toastTimer: number | null = null;
  private settings: OverlaySettings;

  constructor() {
    this.settings = this.loadSettings();

    this.element = document.createElement('div');
    this.element.className = 'overlay';
    this.element.innerHTML = `
      <div class="hud" data-role="hud">
        <div class="hud-row"><span class="hud-label">fps</span><span data-role="fps">--</span></div>
        <div class="hud-row"><span class="hud-label">particles</span><span data-role="count">--</span></div>
        <div class="hud-row"><span class="hud-label">input</span><span data-role="mode">mouse</span></div>
        <div class="hud-row"><span class="hud-label">state</span><span data-role="state" class="hud-state">drift</span></div>
        <div class="hud-row"><span class="hud-label" data-role="gather-label">ball</span><span data-role="gather">0%</span></div>
        <div class="hud-row"><span class="hud-label">hands</span><span data-role="hands">&ndash; / &ndash;</span></div>
        <div class="hud-keys">? help &middot; s settings &middot; p camera view</div>
      </div>
      <div class="panel help hidden" data-role="help">
        <h2>Help</h2>
        <table>
          <tr><td>&#128400; open hand / move</td><td>collide &amp; shove waves — the field calms as you open</td></tr>
          <tr><td>&#9994; close your hand / hold left</td><td>a smooth dial: the field gathers, heats, and rises into fire</td></tr>
          <tr><td>&#128406;&#128406; two open hands / hold right or space</td><td>gather a sphere between them; distance = size</td></tr>
          <tr><td>&#128400;&#128400; fling hands apart / release</td><td>burst the sphere</td></tr>
          <tr><td>finger spread</td><td>turbulence</td></tr>
          <tr><td>hand speed</td><td>energy, heat &amp; brightness</td></tr>
          <tr><td>1 / 2 / 3 &middot; 0</td><td>lock waves / sphere / fire &middot; unlock</td></tr>
          <tr><td>scroll wheel</td><td>ball radius</td></tr>
          <tr><td>h &middot; p &middot; r &middot; esc</td><td>hud &middot; camera view &middot; reset &middot; menu</td></tr>
        </table>
      </div>
      <div class="panel settings hidden" data-role="settings">
        <h2>Settings</h2>
        <div class="setting-row">
          <span>scene</span>
          <div class="seg" data-role="scene">
            <button data-scene="nebula">nebula</button>
            <button data-scene="galaxy">galaxy</button>
            <button data-scene="ocean">ocean</button>
          </div>
        </div>
        <div class="setting-row">
          <span>quality</span>
          <div class="seg" data-role="quality">
            <button data-q="low">low</button>
            <button data-q="med">med</button>
            <button data-q="high">high</button>
          </div>
        </div>
        <div class="setting-row">
          <span>bloom</span>
          <button class="toggle" data-role="bloom"></button>
        </div>
        <div class="setting-row">
          <span>bloom amount <em data-role="bloom-strength-value"></em></span>
          <input type="range" data-role="bloom-strength" min="0" max="2" step="0.05" />
        </div>
      </div>
      <div class="toast hidden" data-role="toast"></div>
    `;

    this.fpsEl = this.q('[data-role="fps"]');
    this.countEl = this.q('[data-role="count"]');
    this.modeEl = this.q('[data-role="mode"]');
    this.stateEl = this.q('[data-role="state"]');
    this.gatherEl = this.q('[data-role="gather"]');
    this.gatherLabelEl = this.q('[data-role="gather-label"]');
    this.handsEl = this.q('[data-role="hands"]');
    this.helpEl = this.q('[data-role="help"]');
    this.settingsEl = this.q('[data-role="settings"]');
    this.toastEl = this.q('[data-role="toast"]');

    for (const btn of this.element.querySelectorAll<HTMLButtonElement>('[data-q]')) {
      btn.addEventListener('click', () => {
        this.settings.quality = btn.dataset.q as Quality;
        this.saveSettings();
        this.syncSettingsUi();
        this.onQualityChange?.(this.settings.quality);
      });
    }
    this.q('[data-role="bloom"]').addEventListener('click', () => {
      this.settings.bloom = !this.settings.bloom;
      this.saveSettings();
      this.syncSettingsUi();
      this.onBloomChange?.(this.settings.bloom);
    });
    for (const btn of this.element.querySelectorAll<HTMLButtonElement>('[data-scene]')) {
      btn.addEventListener('click', () => {
        this.settings.scene = btn.dataset.scene as SceneId;
        this.saveSettings();
        this.syncSettingsUi();
        this.onSceneChange?.(this.settings.scene);
      });
    }
    this.q<HTMLInputElement>('[data-role="bloom-strength"]').addEventListener('input', (e) => {
      this.settings.bloomStrength = parseFloat((e.target as HTMLInputElement).value);
      this.saveSettings();
      this.syncSettingsUi();
      this.onBloomStrengthChange?.(this.settings.bloomStrength);
    });
    this.settingsEl.appendChild(new ParamPanel(() => this.onRebuild?.()).element);
    this.syncSettingsUi();
  }

  private q<T extends HTMLElement = HTMLElement>(sel: string): T {
    return this.element.querySelector<T>(sel)!;
  }

  private loadSettings(): OverlaySettings {
    try {
      const raw = localStorage.getItem('gesture-particles.settings');
      if (raw)
        return {
          quality: CONFIG.defaultQuality,
          bloom: true,
          bloomStrength: CONFIG.bloom.strength,
          scene: CONFIG.defaultScene,
          ...JSON.parse(raw),
        };
    } catch {}
    return {
      quality: CONFIG.defaultQuality,
      bloom: true,
      bloomStrength: CONFIG.bloom.strength,
      scene: CONFIG.defaultScene,
    };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('gesture-particles.settings', JSON.stringify(this.settings));
    } catch {}
  }

  private syncSettingsUi(): void {
    for (const btn of this.element.querySelectorAll<HTMLButtonElement>('[data-q]')) {
      btn.classList.toggle('active', btn.dataset.q === this.settings.quality);
    }
    this.q('[data-role="bloom"]').classList.toggle('on', this.settings.bloom);
    for (const btn of this.element.querySelectorAll<HTMLButtonElement>('[data-scene]')) {
      btn.classList.toggle('active', btn.dataset.scene === this.settings.scene);
    }
    const [, intense] = CONFIG.sceneDialNames[this.settings.scene];
    this.gatherLabelEl.textContent = intense;
    const slider = this.q<HTMLInputElement>('[data-role="bloom-strength"]');
    slider.value = String(this.settings.bloomStrength);
    slider.disabled = !this.settings.bloom;
    this.q('[data-role="bloom-strength-value"]').textContent =
      this.settings.bloomStrength.toFixed(2);
  }

  get bloomStrength(): number {
    return this.settings.bloomStrength;
  }

  get scene(): SceneId {
    return this.settings.scene;
  }

  setScene(id: SceneId): void {
    this.settings.scene = id;
    this.saveSettings();
    this.syncSettingsUi();
  }

  get quality(): Quality {
    return this.settings.quality;
  }

  set quality(q: Quality) {
    this.settings.quality = q;
    this.saveSettings();
    this.syncSettingsUi();
  }

  get bloom(): boolean {
    return this.settings.bloom;
  }

  update(
    fps: number,
    mode: string,
    stateLabel: string,
    accent: string,
    gather: number,
    leftActive: boolean,
    rightActive: boolean,
  ): void {
    this.fpsEl.textContent = fps.toFixed(0);
    this.modeEl.textContent = mode;
    this.stateEl.textContent = stateLabel;
    this.stateEl.style.color = accent;
    this.gatherEl.textContent = `${Math.round(gather * 100)}%`;
    this.handsEl.textContent = `L ${leftActive ? '\u25cf' : '\u00b7'} / R ${rightActive ? '\u25cf' : '\u00b7'}`;
    this.countEl.textContent = formatCount(QUALITY_SIZES[this.settings.quality] ** 2);
  }

  toggleHud(): void {
    this.q('[data-role="hud"]').classList.toggle('hidden');
  }

  toggleHelp(): void {
    this.helpEl.classList.toggle('hidden');
    this.settingsEl.classList.add('hidden');
  }

  toggleSettings(): void {
    this.settingsEl.classList.toggle('hidden');
    this.helpEl.classList.add('hidden');
  }

  toast(message: string): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    if (this.toastTimer !== null) clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.add('hidden'), 4200);
  }
}

function formatCount(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}m` : `${Math.round(n / 1000)}k`;
}
