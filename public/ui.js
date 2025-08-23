import { state } from './state.js';
import { createParticles } from './effects.js';

export function showWaveIndicator(waveNum) {
  state.dom.waveIndicator.textContent = `WAVE ${waveNum}`;
  state.dom.waveIndicator.style.opacity = '1';
  state.dom.waveIndicator.style.transform = 'translate(-50%, -50%) scale(1)';
  setTimeout(() => {
    state.dom.waveIndicator.style.opacity = '0';
    state.dom.waveIndicator.style.transform = 'translate(-50%, -50%) scale(0.5)';
  }, 2000);
}

export function updateUI() {
  const healthPercent = Math.max(0, state.player.hp / state.player.maxHp) * 100;
  state.dom.healthFill.style.width = healthPercent + '%';

  const now = performance.now();
  if (state.uiLastUpdate && now - state.uiLastUpdate < 100) return;
  state.uiLastUpdate = now;

  const nextUpgradeKills = state.nextUpgradeAt - state.kills;
  state.dom.uiDiv.innerHTML = `
    <div>Wave: ${state.currentWave + 1} / ${state.cfg.waves.length}</div>
    <div>Score: ${state.score} ${state.scoreMultiplier > 1 ? `(x${state.scoreMultiplier})` : ''}</div>
    <div>Coins: ${state.coins}</div>
    <div>Kills: ${state.kills} ${nextUpgradeKills > 0 ? `(${nextUpgradeKills} to LvlUp)` : ''}</div>
    <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">Weapons: ${state.player.weapons.map(i => state.cfg.weapons[i]?.name || '').join(', ')}</div>
    ${state.gamePaused ? '<div style="color: #ffff00; font-weight: bold; margin-top: 8px;">PAUSED</div>' : ''}
  `;
}

export function showVictory() {
  state.gamePaused = true;
  window.__updateLoopRunning && window.__updateLoopRunning();
  state.dom.upgradeOverlay.innerHTML = `
    <div class="overlay-card">
      <h1 class="overlay-title">VICTORY!</h1>
      <div class="overlay-subtitle">All Waves Cleared!</div>
      <div class="overlay-subtitle">Final Score: ${state.score}</div>
      <div class="overlay-subtitle">Total Kills: ${state.kills}</div>
      <button class="upgrade-btn primary" onclick="location.reload()">PLAY AGAIN</button>
    </div>
  `;
  state.dom.upgradeOverlay.style.display = 'flex';

  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      createParticles(
        Math.random() * window.innerWidth, 
        Math.random() * window.innerHeight, 
        `hsl(${Math.random() * 360}, 70%, 60%)`, 
        8, 
        'explosion'
      );
    }, i * 100);
  }
}

export function showGameOver() {
  state.gamePaused = true;
  window.__updateLoopRunning && window.__updateLoopRunning();
  state.dom.upgradeOverlay.innerHTML = `
    <div class="overlay-card">
      <h1 class="overlay-title">GAME OVER</h1>
      <div class="overlay-subtitle">Final Score: ${state.score}</div>
      <div class="overlay-subtitle">Kills: ${state.kills}</div>
      <div class="overlay-subtitle">Wave Reached: ${state.currentWave + 1}</div>
      <button class="upgrade-btn primary" onclick="location.reload()">RETRY</button>
    </div>
  `;
  state.dom.upgradeOverlay.style.display = 'flex';
}
