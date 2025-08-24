import {getAIConfigFromOpenRouter} from './openrouter.js';
import {initStars, state} from './state.js';
import {draw, loadWave, showGameOver, showWaveIndicator, update} from './systems.js';

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
  recomputeBackgroundGradient();
}

function recomputeBackgroundGradient() {
  if (!state.dom.ctx) return;
  const r = Math.hypot(window.innerWidth, window.innerHeight);
  const g = state.dom.ctx.createRadialGradient(
    window.innerWidth / 2, window.innerHeight / 2, 0,
    window.innerWidth / 2, window.innerHeight / 2, r
  );
  g.addColorStop(0, state.cfg.background || '#1a0d33');
  g.addColorStop(1, '#000011');
  state.dom.bgGradient = g;
}

function setupDOM() {
  state.dom.canvas = document.getElementById('gameCanvas');
  state.dom.ctx = state.dom.canvas.getContext('2d');
  state.dom.uiDiv = document.getElementById('ui');
  state.dom.upgradeOverlay = document.getElementById('upgradeOverlay');
  state.dom.healthFill = document.getElementById('healthFill');
  state.dom.waveIndicator = document.getElementById('waveIndicator');
  state.dom.runFill = document.getElementById('runFill');
  state.dom.countdown = document.getElementById('countdown');
  resizeCanvas();
}

function setupAudio() {
  try {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.log('Web Audio API not supported');
  }
}

function startLoop() {
  if (state.animationId) return;
  state.lastFrameTime = 0;
  state.animationId = requestAnimationFrame(gameLoop);
  state.running = true;
}

function stopLoop() {
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
    state.animationId = null;
  }
  state.running = false;
}

function updateLoopRunning() {
  if (!state.loading && !state.gamePaused && state.isVisible && state.isFocused) {
    startLoop();
  } else {
    stopLoop();
  }
}

// expose so systems.js can pause/resume
window.__updateLoopRunning = updateLoopRunning;

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
    const ownedWeaponsHtml = state.player.weapons.map(i => {
      const w = state.cfg.weapons[i];
      if (!w) return '';
      const det = `DMG ${w.dmg || 1}, FR ${w.fireRate || 1}/s, SPD ${w.bulletSpeed || 5}` +
                  `${w.piercing ? ', Pierce ' + w.piercing : ''}` +
                  `${w.explosive ? ', Expl ' + w.explosive : ''}` +
                  `${w.homing ? ', Hom ' + w.homing : ''}`;
      return `<span class="owned-item" title="${det}">${w.name}${w.level ? ' L' + w.level : ''}</span>`;
    }).join(' ');
    const ownedUpgradesHtml = (state.ownedUpgrades || []).map(u =>
      `<span class="owned-item" title="${u.description || ''}">${u.name}</span>`
    ).join(' ');
    state.dom.upgradeOverlay.innerHTML = `
      <div class="overlay-card">
        <h2 class="overlay-title">PAUSED</h2>
        <div class="overlay-subtitle">Press P or ESC to resume</div>
        <div class="overlay-hint">Controls: WASD or Arrow Keys to move, Space to dash</div>
        <div class="owned-section">
          <div class="owned-title">Owned Weapons</div>
          <div class="owned-list">${ownedWeaponsHtml || '<i>None</i>'}</div>
          <div class="owned-title" style="margin-top:8px;">Upgrades</div>
          <div class="owned-list">${ownedUpgradesHtml || '<i>None</i>'}</div>
        </div>
        <div class="overlay-tiny">Game auto-pauses during upgrades</div>
      </div>
    `;
          state.dom.upgradeOverlay.style.display = 'flex';
        } else {
          state.dom.upgradeOverlay.style.display = 'none';
        }
        window.__updateLoopRunning && window.__updateLoopRunning();
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
  document.addEventListener('visibilitychange', () => {
    state.isVisible = document.visibilityState === 'visible';
    window.__updateLoopRunning && window.__updateLoopRunning();
  });
  window.addEventListener('focus', () => {
    state.isFocused = true;
    window.__updateLoopRunning && window.__updateLoopRunning();
  });
  window.addEventListener('blur', () => {
    state.isFocused = false;
    window.__updateLoopRunning && window.__updateLoopRunning();
  });
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
  recomputeBackgroundGradient();

  state.player = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    baseSpeed: 3,
    speed: 3,
    size: 14,
    hp: 50,
    maxHp: 50,
    weapons: state.cfg.weapons.length ? [0] : [],
    lastShotMap: {},
    velocity: {x: 0, y: 0},
    acceleration: 0.3,
    friction: 0.85,
    dash: {ready: true, duration: 200, cooldown: 1000, lastUsed: 0, speed: 15, damage: 0, damageRadius: 24, startedAt: 0, activeUntil: 0},
    bulletRange: 700,         // px
    bulletRangeMult: 1,       // global multiplier from upgrades
    coinMagnetRadius: 120,    // px
    coinCollectRadius: 24,    // px
  };

  state.loading = false;
  showWaveIndicator(1);
  loadWave();
  startLoop();
}

function gameLoop(ts) {
  if (state.loading) {
    state.animationId = requestAnimationFrame(gameLoop);
    return;
  }
  if (state.player && state.player.hp <= 0) {
    showGameOver();
    draw();
    state.animationId = null;
    return;
  }

  const deltaTime = state.lastFrameTime ? (ts - state.lastFrameTime) : 16.67;
  state.lastFrameTime = ts;

  if (!state.gamePaused) {
    update(ts, deltaTime);
  }
  draw();
  if (!state.gamePaused && state.isVisible && state.isFocused) {
    state.animationId = requestAnimationFrame(gameLoop);
  } else {
    state.animationId = null;
  }
}

init();
