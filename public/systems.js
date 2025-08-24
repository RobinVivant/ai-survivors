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
