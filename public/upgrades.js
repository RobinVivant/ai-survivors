import { state } from './state.js';
import { createParticles } from './effects.js';
import { playSound } from './audio.js';

export function checkForUpgrade(){
  if (state.kills >= state.nextUpgradeAt) {
    const upgradesSoFar = state.upgradesTaken || 0;
    const base = 18;
    const perUpgrade = 7;
    const waveFactor = Math.floor((state.currentWave || 0) / 2) * 4;
    const increment = base + upgradesSoFar * perUpgrade + waveFactor;
    state.nextUpgradeAt = state.kills + increment;
    presentUpgradeChoices();
  }
}

function presentUpgradeChoices() {
  const choices = [];
  const ownedWeapons = state.player.weapons.map(wi => state.cfg.weapons[wi]);

  const aiPassivePool = (state.cfg.upgrades || [])
    .filter(u => u && u.effect && u.effect.type && u.effect.type !== 'weapon' && u.effect.type !== 'upgrade_weapon');

  if (ownedWeapons.length > 0) {
    const upgradables = ownedWeapons.filter(w => (w.level || 1) < 5);
    if (upgradables.length > 0) {
      const weaponToUpgrade = upgradables[Math.floor(Math.random() * upgradables.length)];
      const currentLevel = weaponToUpgrade.level || 1;
      choices.push({
        name: `Upgrade ${weaponToUpgrade.name} (Lvl ${currentLevel + 1})`,
        description: getWeaponUpgradeDescription(weaponToUpgrade.name, currentLevel + 1),
        rarity: currentLevel >= 3 ? 'epic' : 'rare',
        effect: { type: 'upgrade_weapon', value: weaponToUpgrade.name }
      });
    }
  }

  const availableWeapons = state.cfg.weapons.filter(w => !state.player.weapons.includes(state.cfg.weapons.indexOf(w)));
  if (availableWeapons.length > 0) {
    const weaponToAdd = availableWeapons[Math.floor(Math.random() * availableWeapons.length)];
    choices.push({
      name: `New Weapon: ${weaponToAdd.name}`,
      description: `Adds the ${weaponToAdd.name} to your arsenal.`,
      rarity: 'epic',
      effect: { type: 'weapon', value: weaponToAdd.name }
    });
  }

  const passives = [
    { name: "Hyper Speed", effect: { type: "speed", value: 0.6 }, description: "Greatly increase movement speed.", rarity: "rare" },
    { name: "Full Heal", effect: { type: "health", value: state.player.maxHp }, description: "Restore all health.", rarity: "common" },
    { name: "Damage Core", effect: { type: "damage", value: 3 }, description: "+3 damage to all weapons.", rarity: "epic" },
    { name: "Overdrive", effect: { type: "firerate", value: 0.5 }, description: "Massively increase fire rate.", rarity: "epic" },
    { name: "Titanium Hull", effect: { type: "maxhealth", value: 15 }, description: "+15 max health.", rarity: "rare" },
    { name: "Bullet Velocity", effect: { type: "bulletspeed", value: 1.5 }, description: "Bullets travel much faster.", rarity: "common" },
    { name: "Piercing Matrix", effect: { type: "piercing", value: 1 }, description: "Bullets pierce +1 enemy.", rarity: "rare" },
    { name: "Homing Algorithm", effect: { type: "homing", value: 0.08 }, description: "Smoother bullet homing.", rarity: "epic" },
    { name: "Explosive Rounds", effect: { type: "explosive", value: 25 }, description: "Add explosion damage.", rarity: "epic" },
    ...aiPassivePool
  ];

  if (choices.length < 2) {
    const fallbackW = availableWeapons[0] || ownedWeapons[0];
    if (fallbackW && !choices.find(c => c.effect?.type === 'weapon')) {
      choices.push({
        name: `New Weapon: ${fallbackW.name}`,
        description: `Adds the ${fallbackW.name} to your arsenal.`,
        rarity: 'epic',
        effect: { type: 'weapon', value: fallbackW.name }
      });
    }
  }
  choices.push(passives[Math.floor(Math.random() * passives.length)]);
  while (choices.length < 3) {
    const cand = passives[Math.floor(Math.random() * passives.length)];
    if (!choices.some(c => c.name === cand.name)) choices.push(cand);
  }
  choices.splice(3);

  state.gamePaused = true;
  state.dom.upgradeOverlay.innerHTML = `
    <div class="overlay-card">
      <h2 class="overlay-title">LEVEL UP!</h2>
      <p class="overlay-subtitle">Select Your Upgrade</p>
    </div>
  `;
  state.dom.upgradeOverlay.style.display = 'flex';
  window.__updateLoopRunning && window.__updateLoopRunning();
  const card = state.dom.upgradeOverlay.querySelector('.overlay-card');

  const resumeGame = () => {
    state.gamePaused = false;
    state.dom.upgradeOverlay.style.display = 'none';
    createParticles(window.innerWidth / 2, window.innerHeight / 2, '#00ffff', 20, 'explosion');
    playSound('upgrade');
    window.__updateLoopRunning && window.__updateLoopRunning();
  };

  choices.forEach((upg, i) => {
    const btn = document.createElement('button');
    btn.className = 'upgrade-btn';
    btn.innerHTML = `
      <div class="upgrade-head">
        <div class="upgrade-name">[${i + 1}] ${upg.name}</div>
        <div class="upgrade-rarity">${(upg.rarity || 'common').toUpperCase()}</div>
      </div>
      <div class="upgrade-desc">${upg.description || ''}</div>
    `;
    btn.dataset.rarity = upg.rarity || 'common';
    btn.onclick = () => {
      applyUpgrade(upg);
      resumeGame();
      document.removeEventListener('keydown', handleKeyPress);
    };
    card.appendChild(btn);
  });

  const handleKeyPress = (e) => {
    if (!state.gamePaused) return;
    const key = parseInt(e.key);
    if (key >= 1 && key <= choices.length) {
      applyUpgrade(choices[key - 1]);
      resumeGame();
      document.removeEventListener('keydown', handleKeyPress);
    }
  };
  document.addEventListener('keydown', handleKeyPress);
}

function getWeaponUpgradeDescription(weaponName, level) {
  const descriptions = {
    'Machine Gun': [
      'Level 2: Increased fire rate.',
      'Level 3: Shoots two bullets at once.',
      'Level 4: Bullets now pierce one enemy.',
      'Level 5: Ultimate: Fires a spray of bullets in a cone.'
    ],
    'Shotgun': [
      'Level 2: Fires more pellets.',
      'Level 3: Increased range.',
      'Level 4: Pellets now bounce off walls.',
      'Level 5: Ultimate: Fires a devastating, short-range blast.'
    ],
    'Rocket Launcher': [
      'Level 2: Increased explosion radius.',
      'Level 3: Faster rockets.',
      'Level 4: Rockets now home in on enemies.',
      'Level 5: Ultimate: Fires a cluster of mini-rockets.'
    ]
  };
  return descriptions[weaponName]?.[level - 2] || 'Max level reached.';
}

function applyUpgrade(upg) {
  const { type, value } = upg.effect || {};
  switch (type) {
    case 'upgrade_weapon': {
      const weaponToUpgrade = state.cfg.weapons.find(w => w.name === value);
      if (weaponToUpgrade) {
        weaponToUpgrade.level = (weaponToUpgrade.level || 1) + 1;
        switch (weaponToUpgrade.name) {
          case 'Machine Gun':
            if (weaponToUpgrade.level === 2) weaponToUpgrade.fireRate *= 1.5;
            if (weaponToUpgrade.level === 3) weaponToUpgrade.splitShot = 1;
            if (weaponToUpgrade.level === 4) weaponToUpgrade.piercing = 1;
            if (weaponToUpgrade.level === 5) weaponToUpgrade.spread = 0.5;
            break;
          case 'Shotgun':
            if (weaponToUpgrade.level === 2) weaponToUpgrade.splitShot = (weaponToUpgrade.splitShot || 4) + 2;
            if (weaponToUpgrade.level === 3) weaponToUpgrade.range *= 1.5;
            if (weaponToUpgrade.level === 4) weaponToUpgrade.bounces = 1;
            if (weaponToUpgrade.level === 5) { weaponToUpgrade.dmg *= 2; weaponToUpgrade.range *= 0.5; }
            break;
          case 'Rocket Launcher':
            if (weaponToUpgrade.level === 2) weaponToUpgrade.explosive *= 1.5;
            if (weaponToUpgrade.level === 3) weaponToUpgrade.bulletSpeed *= 1.5;
            if (weaponToUpgrade.level === 4) weaponToUpgrade.homing = 0.1;
            if (weaponToUpgrade.level === 5) { weaponToUpgrade.splitShot = 4; weaponToUpgrade.dmg *= 0.5; }
            break;
        }
        if (!['Machine Gun', 'Shotgun', 'Rocket Launcher'].includes(weaponToUpgrade.name)) {
          switch (weaponToUpgrade.level) {
            case 2:
              weaponToUpgrade.fireRate = (weaponToUpgrade.fireRate || 1) * 1.25;
              break;
            case 3:
              weaponToUpgrade.dmg = (weaponToUpgrade.dmg || 1) + 1;
              break;
            case 4:
              weaponToUpgrade.piercing = Math.max(1, (weaponToUpgrade.piercing || 0) + 1);
              break;
            case 5:
              weaponToUpgrade.homing = Math.max(0.05, (weaponToUpgrade.homing || 0) + 0.05);
              break;
          }
        }
      }
      break;
    }
    case 'speed':
      state.player.baseSpeed += value;
      state.player.speed = state.player.baseSpeed;
      break;
    case 'weapon': {
      const idx = state.cfg.weapons.findIndex(w => w.name === value);
      if (idx !== -1 && !state.player.weapons.includes(idx)) {
        state.player.weapons.push(idx);
        state.cfg.weapons[idx].level = 1;
      }
      break;
    }
    case 'damage':
      state.player.weapons.forEach(wi => { state.cfg.weapons[wi].dmg = (state.cfg.weapons[wi].dmg || 1) + value; });
      break;
    case 'firerate':
      state.player.weapons.forEach(wi => { state.cfg.weapons[wi].fireRate = (state.cfg.weapons[wi].fireRate || 1) + value; });
      break;
    case 'bulletspeed':
      state.player.weapons.forEach(wi => { state.cfg.weapons[wi].bulletSpeed = (state.cfg.weapons[wi].bulletSpeed || 4) + value; });
      break;
    case 'health':
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + value);
      break;
    case 'maxhealth':
      state.player.maxHp += value;
      state.player.hp += value;
      break;
    case 'piercing':
      state.player.weapons.forEach(wi => {
        const w = state.cfg.weapons[wi];
        w.piercing = (w.piercing || 0) + value;
      });
      break;
    case 'homing':
      state.player.weapons.forEach(wi => {
        const w = state.cfg.weapons[wi];
        w.homing = (w.homing || 0) + value;
      });
      break;
    case 'explosive':
      state.player.weapons.forEach(wi => {
        const w = state.cfg.weapons[wi];
        w.explosive = (w.explosive || 0) + value;
      });
      break;
    default:
      break;
  }
  state.upgradesTaken = (state.upgradesTaken || 0) + 1;
}
