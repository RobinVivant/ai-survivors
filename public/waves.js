import {state} from './state.js';
import {createEnemyInstance} from './enemies.js';
import {showVictory, showWaveIndicator, updateUI} from './ui.js';
import {openShop} from './shop.js';

export function prepareWaveSpawner(names) {
  const w = state.currentWave || 0;
  const now = performance.now();

  state.wave.active = true;
  state.wave.types = Array.isArray(names) ? names.slice() : [];

  // Scaling
  state.wave.spawnCap = Math.min(32, 8 + w * 2);
  state.wave.spawnPerBurst = Math.min(12, 3 + Math.floor(w / 2));
  state.wave.cooldownMs = Math.max(120, 400 - w * 12);
  state.wave.clusterRadius = Math.min(160, 60 + w * 5);

  // Wave duration
  state.wave.durationMs = Math.min(60000, 25000 + w * 1500);
  state.wave.endAt = now + state.wave.durationMs;

  state.wave.nextAt = now;
}

export function updateWaveSpawner() {
  if (!state.wave.active) return;
  if (performance.now() < state.wave.nextAt) return;

  // Fill up to spawnCap
  const deficit = Math.max(0, (state.wave.spawnCap || 0) - state.activeEnemies.length);
  const toSpawn = Math.min(state.wave.spawnPerBurst || 0, deficit);
  if (toSpawn <= 0) {
    state.wave.nextAt = performance.now() + (state.wave.cooldownMs || 300);
    return;
  }

  // Spawn a clustered burst from a screen edge
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

  for (let i = 0; i < toSpawn; i++) {
    const r = state.wave.clusterRadius || 60;
    const rx = (Math.random() - 0.5) * r * 2;
    const ry = (Math.random() - 0.5) * r * 2;
    const names = state.wave.types;
    const name = names.length ? names[Math.floor(Math.random() * names.length)] : null;
    if (!name) break;
    const e = createEnemyInstance(name);
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
  const now = performance.now();
  if (state.wave.active && now >= state.wave.endAt) {
    // End the wave
    state.wave.active = false;

    // Wave reward
    const waveBonus = (state.currentWave + 1) * 50;
    state.score += waveBonus;
    state.coins += Math.ceil(waveBonus / 5);
    if ((state.currentWave + 1) % 3 === 0) {
      state.scoreMultiplier += 0.5;
    }

    // Clear remaining enemies (Brotato-style cleanup)
    state.activeEnemies.length = 0;

    // Final wave -> victory
    if (state.currentWave >= state.cfg.waves.length - 1) {
      showVictory();
      return;
    }

    // Open shop; on close, advance and start next wave
    openShop(() => {
      state.currentWave++;
      showWaveIndicator(state.currentWave + 1);
      loadWave();
    });
  }
}
