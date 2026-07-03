uniform sampler2D uPositions;
uniform sampler2D uVelocities;
uniform float uPointSize;
uniform float uPixelRatio;

attribute vec2 ref;

varying float vSpeed;
varying float vSeed;
varying float vDist;
varying float vStar;

void main() {
  vec4 pos = texture2D(uPositions, ref);
  vec4 vel = texture2D(uVelocities, ref);

  vSpeed = length(vel.xyz);
  vSeed = fract(pos.w * 13.7);
  vDist = length(pos.xyz);
  vStar = step(0.985, fract(pos.w * 91.7));

  vec4 mv = modelViewMatrix * vec4(pos.xyz, 1.0);
  float size = uPointSize * uPixelRatio * (0.7 + 0.6 * vSeed) * (4.0 / max(-mv.z, 0.1));
  size *= 1.0 + vStar * 1.4;
  gl_PointSize = max(size, 1.0);
  gl_Position = projectionMatrix * mv;
}
