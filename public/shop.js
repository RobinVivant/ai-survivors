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
  const base = r === 'legendary' ? 110 :
               r === 'epic'      ? 70  :
               r === 'rare'      ? 45  : 25;
  const waveDisc = 1 - Math.min(0.35, (state.currentWave || 0) * 0.035);
  return Math.max(5, Math.round(base * waveDisc));
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
      price: Math.max(10, w.price || 80),
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

  // Normalize and discount prices
  const waveDisc = 1 - Math.min(0.3, (state.currentWave || 0) * 0.03);
  offers.forEach(o => {
    if (o.kind === 'weapon') {
      o.price = Math.max(10, Math.round(o.price * waveDisc));
    }
    if (typeof o.price !== 'number') {
      o.price = 35; // safety fallback
    }
  });
  // Guarantee at least one affordable item
  if (state.coins > 0 && !offers.some(o => o.price <= state.coins) && offers.length) {
    const cheapest = offers.reduce((a, b) => (a.price < b.price ? a : b));
    cheapest.price = Math.max(5, state.coins);
    if (!/\[SALE\]/.test(cheapest.name)) cheapest.name += ' [SALE]';
  }

  // Overlay
  state.gamePaused = true;
  const root = state.dom.upgradeOverlay;
  root.style.display = 'flex';
  root.innerHTML = `
    <div class="overlay-card">
      <h2 class="overlay-title">SHOP</h2>
      <div class="overlay-subtitle">Wave ${state.currentWave + 1} cleared. Spend your coins.</div>
      <div id="shopCoins" class="overlay-subtitle">Coins: ${state.coins}</div>
      <div id="ownedPanel" class="owned-section"></div>
    </div>
  `;
  const card = root.querySelector('.overlay-card');
  const coinsEl = root.querySelector('#shopCoins');
  const ownedEl = root.querySelector('#ownedPanel');
  const renderOwned = () => {
    const weaponsHtml = state.player.weapons.map(i => {
      const w = state.cfg.weapons[i];
      if (!w) return '';
      const det = `DMG ${w.dmg || 1}, FR ${w.fireRate || 1}/s, SPD ${w.bulletSpeed || 5}` +
                  `${w.piercing ? ', Pierce ' + w.piercing : ''}` +
                  `${w.explosive ? ', Expl ' + w.explosive : ''}` +
                  `${w.homing ? ', Hom ' + w.homing : ''}`;
      return `<span class="owned-item" title="${det}">${w.name}${w.level ? ' L' + w.level : ''}</span>`;
    }).join(' ');
    const upgradesHtml = (state.ownedUpgrades || []).map(u =>
      `<span class="owned-item" title="${u.description || ''}">${u.name}</span>`
    ).join(' ');
    ownedEl.innerHTML = `
      <div class="owned-title">Owned Weapons</div>
      <div class="owned-list">${weaponsHtml || '<i>None</i>'}</div>
      <div class="owned-title" style="margin-top:8px;">Upgrades</div>
      <div class="owned-list">${upgradesHtml || '<i>None</i>'}</div>
    `;
  };
  renderOwned();

  const updateCoins = () => {
    coinsEl.textContent = `Coins: ${state.coins}`;
  };

  offers.forEach((o, idx) => {
    const btn = document.createElement('button');
    btn.className = 'upgrade-btn';
    btn.dataset.rarity = o.rarity || 'common';
  let detailText = '';
  if (o.kind === 'weapon') {
    const w = state.cfg.weapons[o.weaponIndex];
    if (w) {
      detailText =
        `DMG ${w.dmg || 1} • FR ${w.fireRate || 1}/s • SPD ${w.bulletSpeed || 5}` +
        `${w.bulletSize ? ' • Size ' + w.bulletSize : ''}` +
        `${w.range ? ' • RNG ' + Math.round(w.range * 400) + 'px' : ''}` +
        `${w.piercing ? ' • Pierce ' + w.piercing : ''}` +
        `${w.explosive ? ' • Expl ' + w.explosive : ''}` +
        `${w.homing ? ' • Hom ' + w.homing : ''}` +
        `${w.chain ? ' • Chain ' + w.chain : ''}` +
        `${w.splitShot ? ' • Split +' + w.splitShot : ''}` +
        `${w.poison ? ' • Poison ' + w.poison + 'ms' : ''}` +
        `${w.freeze ? ' • Freeze ' + w.freeze + 'ms' : ''}` +
        `${w.bounces ? ' • Bounce ' + w.bounces : ''}`;
    }
  } else if (o.kind === 'upgrade') {
    const eff = o.upgrade?.effect || {};
    const valStr = typeof eff.value === 'number' ? (eff.value > 0 ? '+' + eff.value : '' + eff.value) : (eff.value || '');
    detailText = eff.type ? `${eff.type.toUpperCase()} ${valStr}` : '';
  }

  btn.innerHTML = `
    <div class="upgrade-head">
      <div class="upgrade-name">[${idx + 1}] ${o.name}</div>
      <div class="upgrade-rarity">${(o.rarity || 'common').toUpperCase()} • ${o.price}c</div>
    </div>
    <div class="upgrade-desc">${o.description}</div>
    ${detailText ? `<div class="upgrade-desc" style="opacity:0.9;margin-top:6px">${detailText}</div>` : ''}
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
      renderOwned();
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
