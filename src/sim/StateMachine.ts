import * as THREE from 'three';
import { CONFIG, type SceneId } from '../config';
import type { ColliderState, GestureFrame } from '../input/InputManager';

const SCENE_INDEX: Record<SceneId, number> = { nebula: 0, galaxy: 1, ocean: 2 };
const lerp = THREE.MathUtils.lerp;

export class StateMachine {
  scene: SceneId = CONFIG.defaultScene;
  energy = 0;
  dial = 0;

  private colorA = new THREE.Color();
  private colorB = new THREE.Color();
  private colorC = new THREE.Color();
  private target = new THREE.Color();
  private tmp = new THREE.Color();
  private coreGlow = 0;
  private ballInit = false;
  private ball2Init = false;
  private vel = new THREE.Vector3();

  constructor() {
    const calm = CONFIG.scenePalettes[this.scene].calm;
    this.colorA.set(calm[0]);
    this.colorB.set(calm[1]);
    this.colorC.set(calm[2]);
  }

  setScene(scene: SceneId): void {
    this.scene = scene;
  }

  get label(): string {
    const [calm, intense] = CONFIG.sceneDialNames[this.scene];
    return this.dial > 0.5 ? intense : calm;
  }

  get accent(): string {
    const [calm, intense] = CONFIG.sceneAccents[this.scene];
    return this.dial > 0.5 ? intense : calm;
  }

  update(
    dt: number,
    frame: GestureFrame,
    colliders: ColliderState[],
    velUniforms: Record<string, THREE.IUniform>,
    colorUniforms: Record<string, THREE.IUniform>,
  ): void {
    const gk = Math.min(dt * CONFIG.gatherSmoothing, 1);
    this.dial += (frame.gather - this.dial) * gk;
    const d = this.dial;

    const ek = Math.min(dt * CONFIG.energySmoothing, 1);
    this.energy += (Math.min(frame.speed * 1.6, 1) - this.energy) * ek;

    velUniforms.uScene.value = SCENE_INDEX[this.scene];
    let coreGlowTarget = 0;
    let speedNorm = 1;
    let radialColor = 0;

    switch (this.scene) {
      case 'nebula': {
        velUniforms.uTargetRadius.value = lerp(CONFIG.cloudRadius, CONFIG.ballRadiusTight, d);
        velUniforms.uStiffness.value = lerp(CONFIG.stiffnessCloud, CONFIG.stiffnessBall, d);
        velUniforms.uTurbulence.value =
          lerp(CONFIG.turbulenceCloud, CONFIG.turbulenceBall, d) + 0.25 * this.energy;
        break;
      }
      case 'galaxy': {
        const g = CONFIG.galaxy;
        velUniforms.uDiscRadius.value = lerp(g.discRadius, g.discRadiusCollapsed, d);
        velUniforms.uOrbitSpeed.value = lerp(g.orbitSpeed, g.orbitSpeedCollapsed, d);
        velUniforms.uStiffness.value = lerp(g.stiffness, g.stiffnessCollapsed, d);
        velUniforms.uFlatten.value = lerp(g.flatten, g.flattenCollapsed, d);
        velUniforms.uArmStrength.value = lerp(g.armStrength, g.armStrengthCollapsed, d);
        velUniforms.uTurbulence.value =
          lerp(g.turbulence, g.turbulenceCollapsed, d) + 0.15 * this.energy;
        velUniforms.uInnerEdge.value = lerp(0.004, g.holeRadius * 0.98, d);
        velUniforms.uKepler.value = d;
        velUniforms.uArmTwist.value = g.armTwist;
        velUniforms.uOrbitGain.value = g.orbitGain;
        velUniforms.uBulge.value = g.bulge;
        velUniforms.uDiscEdgeSoft.value = g.discEdgeSoften;
        speedNorm = lerp(1, 0.38, d);
        radialColor = 1 - d;
        coreGlowTarget = lerp(g.coreGlow, g.coreGlowCollapsed, d);
        break;
      }
      case 'ocean': {
        const o = CONFIG.ocean;
        velUniforms.uWaveAmp.value = lerp(o.waveAmpCalm, o.waveAmpStorm, d) * (1 + 0.3 * this.energy);
        velUniforms.uWaveFreq.value = lerp(o.waveFreqCalm, o.waveFreqStorm, d);
        velUniforms.uStiffness.value = o.stiffness;
        velUniforms.uTurbulence.value =
          lerp(o.turbulenceCalm, o.turbulenceStorm, d) + 0.3 * this.energy;
        break;
      }
    }

    this.driveCollider(dt, colliders[0], velUniforms, 'uBall', 'uBallPrev', 'uBallStrength', 'uBallPush', 'ballInit');
    this.driveCollider(dt, colliders[1], velUniforms, 'uBall2', 'uBall2Prev', 'uBall2Strength', 'uBall2Push', 'ball2Init');
    velUniforms.uBall2Active.value = colliders[1] ? 1 : 0;

    const pal = CONFIG.scenePalettes[this.scene];
    const ck = Math.min(dt * CONFIG.colorSmoothing, 1);
    this.rampStop(this.colorA, pal.calm[0], pal.intense[0], d, ck);
    this.rampStop(this.colorB, pal.calm[1], pal.intense[1], d, ck);
    this.rampStop(this.colorC, pal.calm[2], pal.intense[2], d, ck);
    this.coreGlow += (coreGlowTarget - this.coreGlow) * ck;

    (colorUniforms.uColorA.value as THREE.Color).copy(this.colorA);
    (colorUniforms.uColorB.value as THREE.Color).copy(this.colorB);
    (colorUniforms.uColorC.value as THREE.Color).copy(this.colorC);
    colorUniforms.uEnergy.value = this.energy;
    colorUniforms.uCoreGlow.value = this.coreGlow;
    colorUniforms.uSpeedNorm.value = speedNorm;
    colorUniforms.uRadialColor.value = radialColor;
  }

  private rampStop(current: THREE.Color, calm: string, intense: string, d: number, k: number): void {
    this.target.set(calm).lerp(this.tmp.set(intense), d);
    current.lerp(this.target, k);
  }

  private driveCollider(
    dt: number,
    collider: ColliderState | undefined,
    vel: Record<string, THREE.IUniform>,
    posKey: string,
    prevKey: string,
    strengthKey: string,
    pushKey: string,
    initKey: 'ballInit' | 'ball2Init',
  ): void {
    const pos = vel[posKey].value as THREE.Vector3;
    const prev = vel[prevKey].value as THREE.Vector3;
    const push = vel[pushKey].value as THREE.Vector3;

    if (!collider) {
      vel[strengthKey].value = 0;
      push.set(0, 0, 0);
      prev.copy(pos);
      this[initKey] = false;
      return;
    }

    if (!this[initKey]) {
      pos.copy(collider.position);
      prev.copy(collider.position);
      this[initKey] = true;
    } else {
      prev.copy(pos);
      pos.lerp(collider.position, Math.min(dt * 18, 1));
    }

    vel[strengthKey].value =
      (CONFIG.palmRepelBase + CONFIG.palmRepelSpeedBoost * this.energy) * collider.opacity;

    this.vel.copy(pos).sub(prev).divideScalar(Math.max(dt, 1e-3));
    push.copy(this.vel).clampLength(0, 6).multiplyScalar(CONFIG.collisionPush * collider.opacity);
  }
}
