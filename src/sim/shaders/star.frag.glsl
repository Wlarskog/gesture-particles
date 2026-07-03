uniform float uCollapse;
uniform float uTime;
uniform float uEnergy;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewDir);
  float facing = clamp(dot(n, v), 0.0, 1.0);

  float simmer =
    sin(uTime * 0.9 + n.x * 7.0) *
    sin(uTime * 0.7 + n.y * 6.0) *
    sin(uTime * 0.5 + n.z * 8.0);
  vec3 sunBody = mix(vec3(0.95, 0.42, 0.12), vec3(1.0, 0.85, 0.55), pow(facing, 0.7));
  vec3 sun = sunBody * (1.05 + 0.12 * simmer + 0.2 * uEnergy);
  sun += vec3(1.0, 0.6, 0.3) * pow(1.0 - facing, 2.0) * 0.45;

  float extinguish = smoothstep(0.0, 0.7, uCollapse);
  float ringOn = smoothstep(0.4, 1.0, uCollapse);

  vec3 col = sun * (1.0 - extinguish);

  float ring = pow(1.0 - facing, 4.5);
  col += vec3(1.0, 0.55, 0.2) * ring * 7.0 * ringOn;
  col += vec3(1.0, 0.93, 0.8) * pow(1.0 - facing, 9.0) * 5.0 * ringOn;
  col += vec3(1.0, 0.5, 0.22) * pow(1.0 - facing, 2.2) * 0.7 * ringOn;

  gl_FragColor = vec4(col, 1.0);
}
