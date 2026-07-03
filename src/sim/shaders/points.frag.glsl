uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uEnergy;
uniform float uCoreGlow;
uniform vec3  uCoreColor;
uniform float uSpeedNorm;
uniform float uRadialColor;
uniform float uRadialRange;

varying float vSpeed;
varying float vSeed;
varying float vDist;
varying float vStar;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float alpha = 1.0 - smoothstep(0.05, 0.5, d);

  float tSpeed = clamp(vSpeed * uSpeedNorm * (0.9 + uEnergy * 0.8), 0.0, 1.0);
  float tRadial = 1.0 - clamp(vDist / uRadialRange, 0.0, 1.0);
  float t = mix(tSpeed, tRadial * tRadial, uRadialColor);
  vec3 col = t < 0.5
    ? mix(uColorA, uColorB, t * 2.0)
    : mix(uColorB, uColorC, (t - 0.5) * 2.0);

  col = mix(col, vec3(1.0), smoothstep(0.85, 1.35, vSpeed * uSpeedNorm * (1.0 + uEnergy)));

  col = mix(col, uCoreColor, uCoreGlow * (1.0 - smoothstep(0.0, 1.1, vDist)));

  col *= 1.0 + vStar * 1.1;

  gl_FragColor = vec4(col, alpha * 0.5);
}
