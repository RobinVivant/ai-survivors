import {state} from './state.js';
import {createEnemyInstance} from './enemies.js';
import {showVictory, showWaveIndicator, updateUI} from './ui.js';

export function prepareWaveSpawner(names) {
  const w = state.currentWave || 0;
  state.wave.spawnPerBurst = Math.min(12, 5 + Math.floor(w / 2));
  state.wave.cooldownMs = Math.max(160, 380 - w * 14);
  state.wave.clusterRadius = Math.min(160, 60 + w * 5);
  state.wave.queue = Array.isArray(names) ? [...names] : [];
  state.wave.nextAt = performance.now();
}

export function updateWaveSpawner() {
  if (!state.wave.queue || state.wave.queue.length === 0) return;
  if (performance.now() < state.wave.nextAt) return;

  const burst = Math.min(state.wave.spawnPerBurst || 8, state.wave.queue.length);
  const edge = Math.floor(Math.random() * 4);
  let cx, cy;
  if (edge === 0) {
    cx = Math.random() * window.innerWidth;
    cy = -20;
  } else if (edge === 1) {
    cx = window.innerWidth + 20;
    cy = Math.random() * window.innerHeight;
  } else if (edge === 2) {
    cx = Math.random() * window.innerWidth;
    cy = window.innerHeight + 20;
  } else {
    cx = -20;
    cy = Math.random() * window.innerHeight;
  }

  for (let i = 0; i < burst; i++) {
    const name = state.wave.queue.shift();
    const e = createEnemyInstance(name);
    const r = state.wave.clusterRadius || 60;
    const rx = (Math.random() - 0.5) * r * 2;
    const ry = (Math.random() - 0.5) * r * 2;
    e.x = Math.max(-20, Math.min(window.innerWidth + 20, cx + rx));
    e.y = Math.max(-20, Math.min(window.innerHeight + 20, cy + ry));
    state.activeEnemies.push(e);
  }

  state.wave.nextAt = performance.now() + (state.wave.cooldownMs || 300);
}

export function loadWave() {
  if (state.currentWave >= state.cfg.waves.length) {
    showVictory();
    state.activeEnemies.length = 0;
    return;
  }
  const names = state.cfg.waves[state.currentWave];
  state.activeEnemies.length = 0;
  prepareWaveSpawner(names);
  updateUI();
}

export function maybeNextWave() {
  if (state.wave.queue.length === 0 && !state.activeEnemies.length && state.currentWave < state.cfg.waves.length) {
    const waveBonus = (state.currentWave + 1) * 50;
    state.score += waveBonus;
    state.coins += Math.ceil(waveBonus / 5);
    if ((state.currentWave + 1) % 3 === 0) {
      state.scoreMultiplier += 0.5;
    }
    state.currentWave++;
    if (state.currentWave < state.cfg.waves.length) {
      showWaveIndicator(state.currentWave + 1);
    }
    loadWave();
  }
}
