import * as THREE from 'three';
import starVert from './shaders/star.vert.glsl?raw';
import starFrag from './shaders/star.frag.glsl?raw';
import { CONFIG } from '../config';

export class CenterStar {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private time = 0;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: starVert,
      fragmentShader: starFrag,
      uniforms: {
        uCollapse: { value: 0 },
        uTime: { value: 0 },
        uEnergy: { value: 0 },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), this.material);
    const c = CONFIG.cloudCenter;
    this.mesh.position.set(c.x, c.y, c.z);
    this.mesh.visible = false;
  }

  update(dt: number, collapse: number, energy: number, visible: boolean): void {
    this.time += dt;
    this.mesh.visible = visible;
    if (!visible) return;
    this.material.uniforms.uCollapse.value = collapse;
    this.material.uniforms.uTime.value = this.time;
    this.material.uniforms.uEnergy.value = energy;
    const radius = THREE.MathUtils.lerp(CONFIG.galaxy.sunRadius, CONFIG.galaxy.holeRadius, collapse);
    this.mesh.scale.setScalar(radius * (1 + energy * 0.04));
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
