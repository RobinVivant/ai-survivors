export const state = {
  // core state
  keys: {},
  loading: true,
  gamePaused: false,
  player: null,
  cfg: {
    enemies: [],
    weapons: [],
    waves: [],
    upgrades: [],
    background: '#331a33',
  },

  // progression
  currentWave: 0,
  score: 0,
  kills: 0,
  coins: 0,
  nextUpgradeAt: 20,
  lastFrameTime: 0,
  scoreMultiplier: 1,
  upgradesTaken: 0,
  // wave spawner
  wave: {
    queue: [],
    types: [],
    active: false,
    spawnCap: 12,
    spawnPerBurst: 8,
    cooldownMs: 300,
    nextAt: 0,
    clusterRadius: 60,
    durationMs: 30000,
    endAt: 0
  },
  // runtime/lifecycle
  running: false,
  isVisible: true,
  isFocused: true,
  animationId: null,
  uiLastUpdate: 0,

  // entities and fx
  activeEnemies: [],
  bullets: [],
  particles: [],
  cameraShake: {x: 0, y: 0, intensity: 0, duration: 0},
  stars: [],

  // environment
  audioContext: null,
  dom: {
    canvas: null,
    ctx: null,
    uiDiv: null,
    upgradeOverlay: null,
    healthFill: null,
    waveIndicator: null,
    bgGradient: null, // cached background gradient
  },
};

export function initStars(count = 200) {
  state.stars = Array.from({length: count}, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: Math.random() * 2 + 0.5,
    speed: Math.random() * 0.5 + 0.1,
    opacity: Math.random() * 0.8 + 0.2,
  }));
}
