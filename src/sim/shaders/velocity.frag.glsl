uniform float uTime;
uniform float uDelta;
uniform float uScene;

uniform vec3  uCenter;
uniform float uTargetRadius;
uniform float uStiffness;
uniform float uTurbulence;

uniform float uDiscRadius;
uniform float uOrbitSpeed;
uniform float uOrbitGain;
uniform float uFlatten;
uniform float uBulge;
uniform float uArmTwist;
uniform float uArmStrength;
uniform float uInnerEdge;
uniform float uKepler;

uniform float uDiscEdgeSoft;

uniform float uWaveAmp;
uniform float uWaveFreq;
uniform float uContainRadius;

uniform vec3  uBall;
uniform vec3  uBallPrev;
uniform float uBallStrength;
uniform float uBallRadius;
uniform vec3  uBallPush;
uniform vec3  uBall2;
uniform vec3  uBall2Prev;
uniform float uBall2Strength;
uniform vec3  uBall2Push;
uniform float uBall2Active;

uniform float uDamping;
uniform float uMaxSpeed;

vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

vec3 snoise3(vec3 p) {
  return vec3(
    snoise(p),
    snoise(p + vec3(123.4, 57.1, 91.2)),
    snoise(p + vec3(419.2, 371.9, 27.5))
  );
}

vec3 curlNoise(vec3 p) {
  const float e = 0.12;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);

  vec3 x0 = snoise3(p - dx); vec3 x1 = snoise3(p + dx);
  vec3 y0 = snoise3(p - dy); vec3 y1 = snoise3(p + dy);
  vec3 z0 = snoise3(p - dz); vec3 z1 = snoise3(p + dz);

  float x = (y1.z - y0.z) - (z1.y - z0.y);
  float y = (z1.x - z0.x) - (x1.z - x0.z);
  float z = (x1.y - x0.y) - (y1.x - y0.x);
  return normalize(vec3(x, y, z) / (2.0 * e) + 1e-6);
}

vec3 nebulaForce(vec3 p, float seed) {
  float radiusFrac = pow(max(fract(seed * 7.31), 0.02), 0.3333);
  vec3 d = p - uCenter;
  float len = max(length(d), 1e-4);
  vec3 target = uCenter + (d / len) * (uTargetRadius * radiusFrac);
  return (target - p) * uStiffness;
}

vec3 galaxyForce(vec3 p, vec3 v, float seed) {
  vec2 xz = p.xz;
  float r = max(length(xz), 1e-3);
  vec2 rHat = xz / r;
  vec2 tHat = vec2(-rHat.y, rHat.x);

  float u1 = max(fract(seed * 7.31), 0.001);

  float rawR = -log(1.0 - 0.985 * u1) / 3.2;
  float edgeScatter = fract(seed * 51.3) * smoothstep(0.7, 1.0, rawR);
  float rFrac = clamp(rawR - uDiscEdgeSoft * edgeScatter * 0.6, 0.006, 1.0);
  float targetR = uDiscRadius * rFrac;
  bool isBulge = rFrac < 0.14;
  float centralPuff = uBulge * smoothstep(0.5, 0.0, rFrac / 0.25);
  float thickness = 0.05 + 0.09 * rFrac + centralPuff;
  float ringTarget = uInnerEdge * (1.0 + 2.3 * u1);
  targetR = mix(targetR, ringTarget, uKepler);
  targetR = max(targetR, uInnerEdge);
  thickness = mix(thickness, 0.03, uKepler);

  vec2 fXZ = -rHat * (r - targetR) * uStiffness;

  float vTan = dot(v.xz, tHat);
  fXZ += -rHat * (vTan * vTan / max(r, 0.15)) * uKepler;

  fXZ += -rHat * uKepler * 1.5 / max(r, 0.4);

  float vFlat = uOrbitSpeed * r / (r + 0.5);
  float vKep = min(uOrbitSpeed * 1.35 / sqrt(max(r, 0.12)), uOrbitSpeed * 2.4);
  float vOrb = mix(vFlat, vKep, uKepler);
  fXZ += (tHat * vOrb - v.xz) * uOrbitGain;

  if (!isBulge) {
    float theta = atan(xz.y, xz.x);
    float phase = theta - uArmTwist * log(r + 0.3);
    float armWave = sin(2.0 * phase) + 0.55 * sin(4.0 * phase + 1.7);
    float armFade = smoothstep(0.4, 1.0, r);
    fXZ += tHat * armWave * uArmStrength * 0.8 * armFade;
  }

  float fY = -p.y * uFlatten / max(thickness, 0.03) * 0.25;
  return vec3(fXZ.x, fY, fXZ.y);
}

float waveHeight(vec2 xz) {
  float h = 0.0;
  h += sin(xz.x * 1.3 * uWaveFreq + uTime * 0.8) * 0.35;
  h += sin(xz.y * 1.7 * uWaveFreq - uTime * 0.6) * 0.30;
  h += snoise(vec3(xz * 0.5 * uWaveFreq, uTime * 0.15)) * 0.6;
  return h * uWaveAmp;
}

vec3 oceanForce(vec3 p) {
  vec3 target = vec3(p.x, waveHeight(p.xz), p.z);
  vec3 f = (target - p) * uStiffness;
  float r = length(p.xz);
  if (r > uContainRadius) {
    f.xz += (-p.xz / r) * (r - uContainRadius) * 2.5;
  }
  return f;
}

vec3 capsuleForce(vec3 p, vec3 a, vec3 b, float strength, vec3 push) {
  vec3 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  vec3 closest = a + ab * t;
  vec3 d = p - closest;
  float dist = length(d);
  if (dist >= uBallRadius) return vec3(0.0);
  float fall = 1.0 - smoothstep(0.0, uBallRadius, dist);
  return (d / max(dist, 1e-4)) * strength * fall + push * fall;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 posData = texture2D(texturePosition, uv);
  vec4 velData = texture2D(textureVelocity, uv);
  vec3 p = posData.xyz;
  vec3 v = velData.xyz;
  float seed = posData.w;

  vec3 f;
  if (uScene < 0.5) f = nebulaForce(p, seed);
  else if (uScene < 1.5) f = galaxyForce(p, v, seed);
  else f = oceanForce(p);

  float turb = uTurbulence * (0.7 + 0.6 * seed);
  f += curlNoise(p * 0.9 + uTime * 0.12) * turb;

  f += capsuleForce(p, uBallPrev, uBall, uBallStrength, uBallPush);
  if (uBall2Active > 0.5) {
    f += capsuleForce(p, uBall2Prev, uBall2, uBall2Strength, uBall2Push);
  }

  v += f * uDelta;
  v *= uDamping;
  float spd = length(v);
  if (spd > uMaxSpeed) v = (v / spd) * uMaxSpeed;

  gl_FragColor = vec4(v, velData.w);
}
