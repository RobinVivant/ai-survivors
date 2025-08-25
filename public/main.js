import {DEFAULT_CONFIG} from './config.js';
import {initStars, state} from './state.js';
import {draw, loadWave, showGameOver, showWaveIndicator, update} from './systems.js';
import {initPhysics} from './physics.js';

const AUDIO_STORE_KEY = 'ai_survivors_audio';
const clamp01 = (x) => Math.max(0, Math.min(1, x));
function loadAudioSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(AUDIO_STORE_KEY) || '{}');
    if (typeof s.master === 'number') state.audio.master = clamp01(s.master);
    if (typeof s.sfx === 'number') state.audio.sfx = clamp01(s.sfx);
    if (typeof s.music === 'number') state.audio.music = clamp01(s.music);
  } catch {}
}
function saveAudioSettings() {
  localStorage.setItem(AUDIO_STORE_KEY, JSON.stringify({
    master: state.audio.master, sfx: state.audio.sfx, music: state.audio.music
  }));
}
function updateAudioGains() {
  const n = state.audioNodes;
  if (!n || !state.audioContext) return;
  const t = state.audioContext.currentTime;
  n.masterGain && n.masterGain.gain.setValueAtTime(clamp01(state.audio.master), t);
  n.sfxGain && n.sfxGain.gain.setValueAtTime(clamp01(state.audio.sfx), t);
  n.musicGain && n.musicGain.gain.setValueAtTime(clamp01(state.audio.music), t);
}

function createDefaultPlayer() {
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    baseSpeed: 3.6,
    speed: 3.6,
    baseSize: 22,
    size: 22,
    hp: 60,
    maxHp: 60,
    weapons: state.cfg.weapons.length ? [0] : [],
    lastShotMap: {},
    velocity: {x: 0, y: 0},
    acceleration: 0.3,
    friction: 0.85,
    dash: {
      ready: true,
      duration: 240,
      cooldown: 800,
      lastUsed: 0,
      speed: 18,
      damage: 4,
      damageRadius: 26,
      baseDamageRadius: 26,
      startedAt: 0,
      activeUntil: 0
    },
    bulletRange: 450,
    bulletRangeMult: 1,
    coinMagnetRadius: 140,
    coinCollectRadius: 28,
    regenPerSec: 0,
    regenDelayMs: 4000,
    lastDamagedAt: performance.now(),
    lastRegenAt: 0,
    coinGainMult: 1,
    onKillHeal: 0,
    contactDamageBase: 0,
    contactThornsPercent: 0,
  };
}

function resetRunState() {
  state.currentWave = 0;
  state.score = 0;
  state.kills = 0;
  state.coins = 0;
  state.nextUpgradeAt = 20;
  state.scoreMultiplier = 1;
  state.upgradesTaken = 0;
  state.ownedUpgrades = [];
  state.wave = {
    queue: [],
    types: [],
    active: false,
    spawnCap: 12,
    spawnPerBurst: 8,
    cooldownMs: 300,
    nextAt: 0,
    clusterRadius: 60,
    durationMs: 30000,
    endAt: 0,
    lockSpawns: false,
    shopAt: 0,
  };
  state.activeEnemies.length = 0;
  state.bullets.length = 0;
  state.particles.length = 0;
  state.pickups.length = 0;
  state.player = createDefaultPlayer();
  initPhysics();
  state.hasStarted = false;
  state.gamePaused = true;
  if (state.dom.countdown) {
    state.dom.countdown.style.opacity = '0';
    state.dom.countdown.textContent = '';
  }
  if (state.dom.runFill) state.dom.runFill.style.width = '0%';
  window.__updateLoopRunning && window.__updateLoopRunning();
}

function showOptionsMenu(fromMain = false) {
  const root = state.dom.upgradeOverlay;
  root.style.display = 'flex';
  root.innerHTML = `
    <div class="overlay-card">
      <h2 class="overlay-title">OPTIONS</h2>
      <div class="options-grid">
        <div class="option-row">
          <label>Master Volume</label>
          <input id="volMaster" type="range" min="0" max="100" value="${Math.round(state.audio.master*100)}">
        </div>
        <div class="option-row">
          <label>SFX Volume</label>
          <input id="volSfx" type="range" min="0" max="100" value="${Math.round(state.audio.sfx*100)}">
        </div>
        <div class="option-row">
          <label>Music Volume</label>
          <input id="volMusic" type="range" min="0" max="100" value="${Math.round(state.audio.music*100)}">
        </div>
      </div>
      <div style="display:flex; gap:8px; margin-top:12px;">
        <button class="upgrade-btn" id="btnTest">TEST SOUNDS</button>
        <button class="upgrade-btn primary" id="btnBack">${fromMain ? 'BACK' : 'CLOSE'}</button>
      </div>
    </div>
  `;
  const bind = (id, prop) => {
    const el = root.querySelector(id);
    el.oninput = () => {
      state.audio[prop] = clamp01((+el.value || 0) / 100);
      updateAudioGains();
      saveAudioSettings();
    };
  };
  bind('#volMaster', 'master');
  bind('#volSfx', 'sfx');
  bind('#volMusic', 'music');

  root.querySelector('#btnTest').onclick = () => {
    import('./audio.js').then(({playSound}) => {
      playSound('shoot'); setTimeout(() => playSound('hit'), 100);
      setTimeout(() => playSound('coin'), 220); setTimeout(() => playSound('upgrade'), 360);
    });
  };
  root.querySelector('#btnBack').onclick = () => {
    if (fromMain) showMainMenu();
    else {
      root.style.display = 'none';
      state.gamePaused = false;
      window.__updateLoopRunning && window.__updateLoopRunning();
    }
  };
}

function showMainMenu() {
  state.gamePaused = true;
  const root = state.dom.upgradeOverlay;
  root.style.display = 'flex';
  root.innerHTML = `
    <div class="overlay-card">
      <h1 class="overlay-title">AI SURVIVORS</h1>
      <div class="overlay-subtitle">Top-down arena survivor</div>
      <button class="upgrade-btn primary" id="btnStart">START GAME</button>
      <button class="upgrade-btn" id="btnOptions">OPTIONS</button>
    </div>
  `;
  const start = root.querySelector('#btnStart');
  const opts = root.querySelector('#btnOptions');
  start.onclick = () => {
    resetRunState(); // always start a fresh run
    root.style.display = 'none';
    state.hasStarted = true;
    state.gamePaused = false;
    if (state.audioContext && state.audioContext.state === 'suspended') state.audioContext.resume();
    showWaveIndicator(1);
    loadWave();
    startLoop();
  };
  opts.onclick = () => showOptionsMenu(true);
}


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
    const ctx = state.audioContext;

    // Build master/compressor bus
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-24, ctx.currentTime);
    comp.knee.setValueAtTime(18, ctx.currentTime);
    comp.ratio.setValueAtTime(3, ctx.currentTime);
    comp.attack.setValueAtTime(0.003, ctx.currentTime);
    comp.release.setValueAtTime(0.25, ctx.currentTime);

    const master = ctx.createGain();
    const sfx = ctx.createGain();
    const music = ctx.createGain();

    sfx.connect(comp);
    music.connect(comp);
    comp.connect(master);
    master.connect(ctx.destination);

    state.audioNodes.compressor = comp;
    state.audioNodes.masterGain = master;
    state.audioNodes.sfxGain = sfx;
    state.audioNodes.musicGain = music;

    updateAudioGains();
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

    // Pause toggle (avoid if overlay is currently showing upgrades/victory/game over)
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (!state.hasStarted) return;
      const overlay = state.dom.upgradeOverlay;
      const overlayVisible = overlay && getComputedStyle(overlay).display !== 'none';
      const txt = overlayVisible ? (overlay.textContent || '') : '';
      const inBlockingOverlay =
        overlayVisible && (txt.includes('LEVEL UP') || txt.includes('VICTORY') || txt.includes('GAME OVER'));

      if (!inBlockingOverlay) {
        state.gamePaused = !state.gamePaused;
        if (state.gamePaused) {
          const ownedWeaponsHtml = state.player.weapons.map(i => {
            const w = state.cfg.weapons[i];
            if (!w) return '';
            const det = `DMG ${w.dmg || 1}, FR ${w.fireRate || 1}/s, SPD ${w.bulletSpeed || 5}` +
              `${w.bulletSize ? ', Size ' + w.bulletSize : ''}` +
              `${w.range ? ', RNG ' + Math.round(w.range * (state.rangeUnitPx || 500)) + 'px' : ''}` +
              `${w.piercing ? ', Pierce ' + w.piercing : ''}` +
              `${w.explosive ? ', Expl ' + w.explosive : ''}` +
              `${w.homing ? ', Hom ' + w.homing : ''}` +
              `${w.chain ? ', Chain ' + w.chain : ''}` +
              `${w.splitShot ? ', Split +' + w.splitShot : ''}` +
              `${w.poison ? ', Poison ' + w.poison + 'ms' : ''}` +
              `${w.freeze ? ', Freeze ' + w.freeze + 'ms' : ''}` +
              `${w.bounces ? ', Bounce ' + w.bounces : ''}` +
              `${w.contactDamage ? ', C-DMG ' + w.contactDamage : ''}` +
              `${w.contactDamage && w.range ? ', C-R ' + Math.round(w.range * (state.rangeUnitPx || 500)) + 'px' : ''}`;
            return `<span class="owned-item" title="${det}">${w.name}${w.level ? ' L' + w.level : ''} — ${det}</span>`;
          }).join(' ');

          const ownedUpgradesHtml = (state.ownedUpgrades || []).map(u => {
            const eff = u.effect || {};
            const valStr = typeof eff.value === 'number' ? (eff.value > 0 ? '+' + eff.value : '' + eff.value) : (eff.value || '');
            const detail = eff.type ? `${eff.type}${valStr ? ' ' + valStr : ''}` : (u.description || '');
            return `<span class="owned-item" title="${u.description || detail}">${u.name} — ${detail}</span>`;
          }).join(' ');
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
        <div style="display:flex; gap:8px; margin-top:12px;">
          <button class="upgrade-btn primary" id="btnResume">RESUME</button>
          <button class="upgrade-btn" id="btnQuit">QUIT TO MENU</button>
        </div>
      </div>
    `;
          state.dom.upgradeOverlay.style.display = 'flex';
          const root = state.dom.upgradeOverlay;
          const btnResume = root.querySelector('#btnResume');
          const btnQuit = root.querySelector('#btnQuit');
          btnResume.onclick = () => {
            state.gamePaused = false;
            root.style.display = 'none';
            window.__updateLoopRunning && window.__updateLoopRunning();
          };
          btnQuit.onclick = () => {
            stopLoop();
            resetRunState();
            showMainMenu();
          };
          // Hide countdown while paused
          if (state.dom.countdown) {
            state.dom.countdown.style.opacity = '0';
            state.dom.countdown.textContent = '';
          }
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
  loadAudioSettings();
  setupDOM();
  setupAudio();
  setupInput();
  initStars(200);

  const cfg = DEFAULT_CONFIG;
  state.cfg.enemies = Array.isArray(cfg.enemies) ? cfg.enemies : [];
  state.cfg.weapons = Array.isArray(cfg.weapons) ? cfg.weapons : [];
  state.cfg.waves = Array.isArray(cfg.waves) ? cfg.waves : [];
  state.cfg.upgrades = Array.isArray(cfg.upgrades) ? cfg.upgrades : [];
  state.cfg.background = typeof cfg.background === 'string' ? cfg.background : '#331a33';
  recomputeBackgroundGradient();

  state.player = createDefaultPlayer();

  initPhysics(); // NEW: Initialize physics after player is created

  state.loading = false;
  showMainMenu();
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
