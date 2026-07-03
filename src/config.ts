export const QUALITY_SIZES = { low: 256, med: 512, high: 1024 } as const;
export type Quality = keyof typeof QUALITY_SIZES;

export const SCENES = ['nebula', 'galaxy', 'ocean'] as const;
export type SceneId = (typeof SCENES)[number];

export const CONFIG = {
  defaultQuality: 'med' as Quality,
  maxDelta: 1 / 30,
  damping: 0.965,
  maxSpeed: 4.2,

  cloudCenter: { x: 0, y: 0.4, z: 0 },
  cloudRadius: 2.3,
  ballRadiusTight: 0.45,
  stiffnessCloud: 2.0,
  stiffnessBall: 4.8,
  turbulenceCloud: 1.15,
  turbulenceBall: 0.22,
  gatherSmoothing: 5.0,

  rotateSensitivity: 2.4,
  rotateDamping: 1.4,
  rotateMaxSpeed: 3.0,
  autoSpin: 0.05,

  ballRadius: 1.25,
  ballRadiusMin: 0.5,
  ballRadiusMax: 2.4,
  palmRepelBase: 8.0,
  palmRepelSpeedBoost: 12.0,
  collisionPush: 0.9,

  energySmoothing: 3.0,
  colorSmoothing: 3.0,

  pointSize: 2.1,
  bloom: { strength: 0.65, radius: 0.45, threshold: 0.72 },
  background: 0x050508,

  defaultScene: 'nebula' as SceneId,
  scenePalettes: {
    nebula: {
      calm: ['#0a2740', '#17c3ff', '#b46bff'] as [string, string, string],
      intense: ['#062d12', '#4dff6a', '#f6ff8a'] as [string, string, string],
    },
    galaxy: {
      calm: ['#0d1233', '#a9c3f5', '#ffe9c0'] as [string, string, string],
      intense: ['#2a0d03', '#ff7a26', '#ffc46a'] as [string, string, string],
    },
    ocean: {
      calm: ['#03182e', '#1897d6', '#9fe8ff'] as [string, string, string],
      intense: ['#041220', '#2fd0c8', '#ffffff'] as [string, string, string],
    },
  },
  sceneDialNames: {
    nebula: ['cloud', 'ball'] as [string, string],
    galaxy: ['galaxy', 'collapse'] as [string, string],
    ocean: ['calm', 'storm'] as [string, string],
  },
  sceneAccents: {
    nebula: ['#17c3ff', '#4dff6a'] as [string, string],
    galaxy: ['#89b4ff', '#ffb066'] as [string, string],
    ocean: ['#1897d6', '#7df0e2'] as [string, string],
  },

  galaxy: {
    discRadius: 30.6,
    discRadiusCollapsed: 2.9,
    orbitSpeed: 0.8,
    orbitSpeedCollapsed: 2.6,
    orbitGain: 1.2,
    flatten: 4.6,
    flattenCollapsed: 8.5,
    bulge: 0.42,
    discEdgeSoften: 0.0,
    armTwist: 2.8,
    armStrength: 0.7,
    armStrengthCollapsed: 0.35,
    stiffness: 8.6,
    stiffnessCollapsed: 2.4,
    turbulence: 0.13,
    turbulenceCollapsed: 0.28,
    coreGlow: 0.72,
    coreGlowCollapsed: 1.0,
    coreColor: '#fff3e8',
    sunRadius: 0.30,
    holeRadius: 0.47,
  },

  ocean: {
    waveAmpCalm: 0.22,
    waveAmpStorm: 0.85,
    waveFreqCalm: 1.0,
    waveFreqStorm: 2.0,
    turbulenceCalm: 0.3,
    turbulenceStorm: 1.4,
    stiffness: 3.0,
    containRadius: 3.0,
  },

  detectHz: 30,
  mirrorHandedness: true,
  fingerExtendedRatio: 1.15,
  fingerCurledRatio: 0.85,
  closednessSmoothing: 0.25,
  phantomMinSeparation: 0.09,
  oneEuro: { minCutoff: 1.0, beta: 0.02, dCutoff: 1.0 },
  handDepthRange: 1.2,
  trackingLostFadeMs: 300,
  trackingLostNeutralMs: 1000,

  autoQuality: true,
  fpsSampleSeconds: 3,
  fpsDowngradeBelow: 45,
};
