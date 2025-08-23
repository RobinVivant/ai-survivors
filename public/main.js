import { getAIConfigFromOpenRouter } from './openrouter.js';
import { state, initStars } from './state.js';
import { update, draw, loadWave, showGameOver, showWaveIndicator } from './systems.js';

function resizeCanvas() {
  if (!state.dom.canvas || !state.dom.ctx) return;
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  state.dom.canvas.width = Math.floor(window.innerWidth * dpr);
  state.dom.canvas.height = Math.floor(window.innerHeight * dpr);
  state.dom.canvas.style.width = window.innerWidth + 'px';
  state.dom.canvas.style.height = window.innerHeight + 'px';
  state.dom.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state.stars && state.stars.length) {
    initStars(state.stars.length);
  }
}

function setupDOM() {
  state.dom.canvas = document.getElementById('gameCanvas');
  state.dom.ctx = state.dom.canvas.getContext('2d');
  state.dom.uiDiv = document.getElementById('ui');
  state.dom.upgradeOverlay = document.getElementById('upgradeOverlay');
  state.dom.healthFill = document.getElementById('healthFill');
  state.dom.waveIndicator = document.getElementById('waveIndicator');
  resizeCanvas();
}

function setupAudio() {
  try {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.log('Web Audio API not supported');
  }
}

function setupInput() {
  window.addEventListener('keydown', e => {
    state.keys[e.key] = true;
    state.keys[e.code] = true;

    // Pause toggle (avoid if overlay is for upgrades/victory/game over)
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      const html = state.dom.upgradeOverlay.innerHTML || '';
      const inUpgradeMenu =
        html.includes('upgrade-btn') ||
        html.includes('LEVEL UP') ||
        html.includes('VICTORY') ||
        html.includes('GAME OVER');

      if (!inUpgradeMenu) {
        state.gamePaused = !state.gamePaused;
        if (state.gamePaused) {
          state.dom.upgradeOverlay.innerHTML = `
            <div style="text-align: center; border: 2px solid #00ffff; padding: 40px; border-radius: 15px; background: rgba(0,255,255,0.1); box-shadow: 0 0 40px rgba(0,255,255,0.5);">
              <h2 style="font-size: 36px; margin-bottom: 20px; color: #00ffff; text-shadow: 0 0 20px #00ffff;">PAUSED</h2>
              <div style="font-size: 18px; margin-bottom: 20px;">Press P or ESC to resume</div>
              <div style="font-size: 14px; opacity: 0.8; margin-bottom: 10px;">Controls: WASD or Arrow Keys to move, Space to dash</div>
              <div style="font-size: 12px; opacity: 0.6;">Game auto-pauses during upgrades</div>
            </div>
          `;
          state.dom.upgradeOverlay.style.display = 'flex';
        } else {
          state.dom.upgradeOverlay.style.display = 'none';
        }
      }
    }

    // Resume audio on first interaction
    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }
  });

  window.addEventListener('pointerdown', () => {
    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }
  });

  window.addEventListener('keyup', e => {
    state.keys[e.key] = false;
    state.keys[e.code] = false;
  });

  window.addEventListener('resize', resizeCanvas);
}

async function init() {
  setupDOM();
  setupAudio();
  setupInput();
  initStars(200);

  const cfg = await getAIConfigFromOpenRouter();
  state.cfg.enemies = Array.isArray(cfg.enemies) ? cfg.enemies : [];
  state.cfg.weapons = Array.isArray(cfg.weapons) ? cfg.weapons : [];
  state.cfg.waves = Array.isArray(cfg.waves) ? cfg.waves : [];
  state.cfg.upgrades = Array.isArray(cfg.upgrades) ? cfg.upgrades : [];
  state.cfg.background = typeof cfg.background === 'string' ? cfg.background : '#331a33';

  state.player = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    baseSpeed: 3,
    speed: 3,
    size: 10,
    hp: 50,
    maxHp: 50,
    weapons: state.cfg.weapons.length ? [0] : [],
    lastShotMap: {},
    velocity: { x: 0, y: 0 },
    acceleration: 0.3,
    friction: 0.85,
    dash: { ready: true, duration: 200, cooldown: 1000, lastUsed: 0 },
  };

  state.loading = false;
  showWaveIndicator(1);
  loadWave();
  requestAnimationFrame(gameLoop);
}

function gameLoop(ts) {
  if (state.loading) {
    requestAnimationFrame(gameLoop);
    return;
  }
  if (state.player && state.player.hp <= 0) {
    showGameOver();
    draw();
    return;
  }

  const deltaTime = state.lastFrameTime ? (ts - state.lastFrameTime) : 16.67;
  state.lastFrameTime = ts;

  if (!state.gamePaused) {
    update(ts, deltaTime);
  }
  draw();
  requestAnimationFrame(gameLoop);
}

init();
