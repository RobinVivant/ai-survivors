import {updateCameraShake, updateParticles} from './effects.js';
import {moveEnemies} from './enemies.js';
import {moveBullets} from './bullets.js';
import {handlePlayerMovement, handleShooting} from './player.js';
import {cleanupEntities, handleCollisions} from './collisions.js';
import {loadWave, maybeNextWave, updateWaveSpawner} from './waves.js';
import {showGameOver, showWaveIndicator, updateUI} from './ui.js';
import {draw} from './renderer.js';

function update(ts, deltaTime) {
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
