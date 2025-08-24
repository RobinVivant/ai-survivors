import {state} from './state.js';
import {applyUpgrade} from './upgrades.js';
import {createParticles} from './effects.js';
import {playSound} from './audio.js';

function pickRandom(arr, n) {
  const copy = arr.slice();
  const out = [];
  n = Math.min(n, copy.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function priceForUpgrade(upg) {
  const r = (upg.rarity || 'common').toLowerCase();
  switch (r) {
    case 'legendary': return 200;
    case 'epic': return 120;
    case 'rare': return 75;
    default: return 45;
  }
}

export function openShop(onClose) {
  // Build offers
  const offers = [];

  // Up to 2 unowned weapons
  const unowned = state.cfg.weapons
    .map((w, i) => ({w, i}))
    .filter(({i}) => !state.player.weapons.includes(i));
  pickRandom(unowned, 2).forEach(({w, i}) => {
    offers.push({
      kind: 'weapon',
      name: `Buy Weapon: ${w.name}`,
      description: w.description || '',
      price: Math.max(10, w.price || 100),
      weaponIndex: i,
      rarity: 'epic'
    });
  });

  // 3 passive upgrades (non-weapon)
  const passives = (state.cfg.upgrades || [])
    .filter(u => u && u.effect && u.effect.type && u.effect.type !== 'weapon' && u.effect.type !== 'upgrade_weapon');
  pickRandom(passives, 3).forEach(u => {
    offers.push({
      kind: 'upgrade',
      name: u.name,
      description: u.description || '',
      price: priceForUpgrade(u),
      upgrade: u,
      rarity: u.rarity || 'common'
    });
  });

  // Overlay
  state.gamePaused = true;
  const root = state.dom.upgradeOverlay;
  root.style.display = 'flex';
  root.innerHTML = `
    <div class="overlay-card">
      <h2 class="overlay-title">SHOP</h2>
      <div class="overlay-subtitle">Wave ${state.currentWave + 1} cleared. Spend your coins.</div>
      <div id="shopCoins" class="overlay-subtitle">Coins: ${state.coins}</div>
    </div>
  `;
  const card = root.querySelector('.overlay-card');
  const coinsEl = root.querySelector('#shopCoins');

  const updateCoins = () => {
    coinsEl.textContent = `Coins: ${state.coins}`;
  };

  offers.forEach((o, idx) => {
    const btn = document.createElement('button');
    btn.className = 'upgrade-btn';
    btn.dataset.rarity = o.rarity || 'common';
    btn.innerHTML = `
      <div class="upgrade-head">
        <div class="upgrade-name">[${idx + 1}] ${o.name}</div>
        <div class="upgrade-rarity">${(o.rarity || 'common').toUpperCase()} • ${o.price}c</div>
      </div>
      <div class="upgrade-desc">${o.description}</div>
    `;
    btn.onclick = () => {
      if (btn.disabled) return;
      if (state.coins < o.price) return;

      // Purchase
      state.coins -= o.price;
      updateCoins();

      if (o.kind === 'weapon') {
        const wi = o.weaponIndex;
        if (!state.player.weapons.includes(wi)) {
          state.player.weapons.push(wi);
          state.cfg.weapons[wi].level = 1;
        }
      } else if (o.kind === 'upgrade') {
        applyUpgrade(o.upgrade);
      }

      btn.disabled = true;
      btn.style.opacity = '0.6';
      playSound('upgrade');
      createParticles(window.innerWidth / 2, window.innerHeight / 2, '#00ffff', 12, 'explosion');
    };
    card.appendChild(btn);
  });

  // Start next wave
  const goBtn = document.createElement('button');
  goBtn.className = 'upgrade-btn primary';
  goBtn.textContent = 'START NEXT WAVE';
  goBtn.onclick = () => {
    state.gamePaused = false;
    root.style.display = 'none';
    playSound('upgrade');
    window.__updateLoopRunning && window.__updateLoopRunning();
    if (typeof onClose === 'function') onClose();
  };
  card.appendChild(goBtn);

  // Ensure loop is paused
  window.__updateLoopRunning && window.__updateLoopRunning();
}
