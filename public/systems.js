import {state} from './state.js';
import {updateCameraShake, updateParticles} from './effects.js';
import {moveEnemies} from './enemies.js';
import {moveBullets} from './bullets.js';
import {handlePlayerMovement, handleShooting} from './player.js';
import {cleanupEntities, handleCollisions} from './collisions.js';
import {loadWave, maybeNextWave, updateWaveSpawner} from './waves.js';
import {showGameOver, showWaveIndicator, updateUI} from './ui.js';
import {draw} from './renderer.js';

function applyCoinSizeEffects() {
  if (!state.player) return;
  const coins = state.coins || 0;
  const baseSize = state.player.baseSize || state.player.size || 22;

  // Growth with diminishing returns
  const growth = Math.min(30, Math.floor(Math.sqrt(coins) * 0.9));
  state.player.size = baseSize + growth;

  // Speed penalty as you get bigger (min 60% of base speed)
  const speedMult = Math.max(0.6, 1 - growth * 0.008);
  state.player.speed = state.player.baseSpeed * speedMult;

  // Dash damage radius scales with size
  const baseDashR = state.player.dash.baseDamageRadius ?? state.player.dash.damageRadius ?? 26;
  state.player.dash.baseDamageRadius = baseDashR;
  state.player.dash.damageRadius = baseDashR + Math.floor(growth * 0.6);

  // Bullet size bonus from coins (used in player.js)
  state.player._bulletSizeBonusFromCoins = Math.max(0, Math.floor(growth * 0.2));
}

function update(ts, deltaTime) {
  applyCoinSizeEffects();
  updateWaveSpawner();
  handlePlayerMovement(deltaTime);
  handleShooting(ts);
  moveEnemies(deltaTime);
  moveBullets(deltaTime);
  handleCollisions();
  // Passive health regen (1 tick/sec)
  if (state.player?.regenPerSec > 0 && state.player.hp > 0 && state.player.hp < state.player.maxHp) {
    const now = performance.now();
    if (!state.player.lastRegenAt) state.player.lastRegenAt = now;
    if (now - state.player.lastRegenAt >= 1000) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.regenPerSec);
      state.player.lastRegenAt = now;
    }
  }
  cleanupEntities();
  updateParticles(deltaTime);
  updateCameraShake();
  maybeNextWave();
  updateUI();
}

export {
  update,
  draw,
  loadWave,
  showGameOver,
  showWaveIndicator,
};
