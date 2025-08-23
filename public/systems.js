import { state } from './state.js';

const MAX_PARTICLES = 600;

// --------------------------------------------------
// Particle system and visual effects
// --------------------------------------------------
function createParticles(x, y, color, count = 8, type = 'explosion') {
  if (state.particles.length >= MAX_PARTICLES) return;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = Math.random() * 4 + 2;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 4 + 2,
      life: 1,
      decay: Math.random() * 0.02 + 0.01,
      color,
      type
    });
  }
}

function createTrailParticle(x, y, color) {
  if (state.particles.length >= MAX_PARTICLES) return;
  state.particles.push({
    x: x + (Math.random() - 0.5) * 4,
    y: y + (Math.random() - 0.5) * 4,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    size: Math.random() * 3 + 1,
    life: 0.8,
    decay: 0.05,
    color,
    type: 'trail'
  });
}

function createLightningEffect(x1, y1, x2, y2, color) {
  state.particles.push({
    x: x1, y: y1, x2, y2,
    size: 2,
    life: 1,
    decay: 0.25,
    color,
    type: 'lightning'
  });
}

function updateParticles(deltaTime) {
  const timeMultiplier = deltaTime / 16.67; // normalize to 60fps
  
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += (typeof p.vx === 'number' ? p.vx : 0) * timeMultiplier;
    p.y += (typeof p.vy === 'number' ? p.vy : 0) * timeMultiplier;
    if (typeof p.vx === 'number') p.vx *= 0.98;
    if (typeof p.vy === 'number') p.vy *= 0.98;
    p.life -= (p.decay || 0.02) * timeMultiplier;
    
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

function addCameraShake(intensity, duration) {
  state.cameraShake.intensity = Math.max(state.cameraShake.intensity, intensity);
  state.cameraShake.duration = Math.max(state.cameraShake.duration, duration);
}

function updateCameraShake() {
  if (state.cameraShake.duration > 0) {
    state.cameraShake.x = (Math.random() - 0.5) * state.cameraShake.intensity;
    state.cameraShake.y = (Math.random() - 0.5) * state.cameraShake.intensity;
    state.cameraShake.duration--;
    state.cameraShake.intensity *= 0.9;
  } else {
    state.cameraShake.x = 0;
    state.cameraShake.y = 0;
    state.cameraShake.intensity = 0;
  }
}

// Simple sound effects using Web Audio API
function playSound(type, frequency = 440, duration = 0.1, volume = 0.1) {
  if (!state.audioContext) return;
  
  try {
    const oscillator = state.audioContext.createOscillator();
    const gainNode = state.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(state.audioContext.destination);
    
     switch(type) {
       case 'shoot':
         oscillator.frequency.setValueAtTime(800, state.audioContext.currentTime);
         oscillator.frequency.exponentialRampToValueAtTime(400, state.audioContext.currentTime + 0.05);
         gainNode.gain.setValueAtTime(0.05, state.audioContext.currentTime);
         gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.05);
         oscillator.type = 'square';
         duration = 0.05;
         break;
       case 'dash':
         oscillator.frequency.setValueAtTime(300, state.audioContext.currentTime);
         oscillator.frequency.exponentialRampToValueAtTime(600, state.audioContext.currentTime + 0.1);
         gainNode.gain.setValueAtTime(0.08, state.audioContext.currentTime);
         gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.1);
         oscillator.type = 'square';
         duration = 0.1;
         break;
      case 'hit':
        oscillator.frequency.setValueAtTime(200, state.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, state.audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, state.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.1);
        oscillator.type = 'sawtooth';
        duration = 0.1;
        break;
      case 'death':
        oscillator.frequency.setValueAtTime(150, state.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, state.audioContext.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.15, state.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.3);
        oscillator.type = 'sawtooth';
        duration = 0.3;
        break;
      case 'damage':
        oscillator.frequency.setValueAtTime(100, state.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.2, state.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.2);
        oscillator.type = 'triangle';
        duration = 0.2;
        break;
      case 'upgrade':
        oscillator.frequency.setValueAtTime(400, state.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, state.audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, state.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.2);
        oscillator.type = 'sine';
        duration = 0.2;
        break;
    }
    
    oscillator.start(state.audioContext.currentTime);
    oscillator.stop(state.audioContext.currentTime + duration);
  } catch (e) {
    console.log('Sound playback failed:', e);
  }
}

 function showWaveIndicator(waveNum) {
  state.dom.waveIndicator.textContent = `WAVE ${waveNum}`;
  state.dom.waveIndicator.style.opacity = '1';
  state.dom.waveIndicator.style.transform = 'translate(-50%, -50%) scale(1)';
  setTimeout(() => {
    state.dom.waveIndicator.style.opacity = '0';
    state.dom.waveIndicator.style.transform = 'translate(-50%, -50%) scale(0.5)';
  }, 2000);
}

// --------------------------------------------------
// Wave helpers
// --------------------------------------------------
function loadWave(){
  if(state.currentWave>=state.cfg.waves.length){
    showVictory();
    state.activeEnemies.length=0;
    return;
  }
  const names = state.cfg.waves[state.currentWave];
  state.activeEnemies = names.map(createEnemyInstance);
  updateUI();
}

 function showVictory() {
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
  
   // Victory particle explosion
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

function createEnemyInstance(name){
  const def = state.cfg.enemies.find(e=>e.name===name)||{name:'Unknown',color:'#fff',speed:1,hp:10,points:1};
  
  // Spawn enemies further from player to avoid instant collision
  let x, y;
  const minDistance = 100;
  let attempts = 0;
  
   do {
    const edge = Math.floor(Math.random() * 4);
    if(edge === 0) { // top
      x = Math.random() * window.innerWidth;
      y = -20;
    } else if(edge === 1) { // right
      x = window.innerWidth + 20;
      y = Math.random() * window.innerHeight;
    } else if(edge === 2) { // bottom
      x = Math.random() * window.innerWidth;
      y = window.innerHeight + 20;
    } else { // left
      x = -20;
      y = Math.random() * window.innerHeight;
    }
    attempts++;
  } while (Math.hypot(x - state.player.x, y - state.player.y) < minDistance && attempts < 10);
  
  return {
    ...def,
    x, y,
    size: def.size || 8,
    hp: def.hp || 10,
    maxHp: def.hp || 10,
    points: def.points || 1,
    damage: def.damage || 1,
    spawnTime: Date.now(),
    splitLevel: 0,
    splittable: def.splittable || def.specialAbility === 'split',
  };
}

// --------------------------------------------------
// Upgrade system
// --------------------------------------------------
function checkForUpgrade(){
  if(state.kills>=state.nextUpgradeAt){
    state.nextUpgradeAt+=10;
    presentUpgradeChoices();
  }
}

 function presentUpgradeChoices() {
   const choices = [];
   const ownedWeapons = state.player.weapons.map(wi => state.cfg.weapons[wi]);

   const aiPassivePool = (state.cfg.upgrades || [])
     .filter(u => u && u.effect && u.effect.type && u.effect.type !== 'weapon' && u.effect.type !== 'upgrade_weapon');
   
   // Option 1: Upgrade an existing weapon
   if (ownedWeapons.length > 0) {
     const weaponToUpgrade = ownedWeapons[Math.floor(Math.random() * ownedWeapons.length)];
     const currentLevel = weaponToUpgrade.level || 1;
     if (currentLevel < 5) { // Max level 5
       choices.push({
         name: `Upgrade ${weaponToUpgrade.name} (Lvl ${currentLevel + 1})`,
         description: getWeaponUpgradeDescription(weaponToUpgrade.name, currentLevel + 1),
         rarity: 'rare',
         effect: { type: 'upgrade_weapon', value: weaponToUpgrade.name }
       });
     }
   }

   // Option 2: Add a new weapon
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

   // Option 3: General passive upgrades
   const passiveUpgrades = [
     { name: "Hyper Speed", effect: { type: "speed", value: 0.5 }, description: "Greatly increase movement speed.", rarity: "common" },
     { name: "Full Heal", effect: { type: "health", value: state.player.maxHp }, description: "Restore all health.", rarity: "common" },
     { name: "Damage Core", effect: { type: "damage", value: 2 }, description: "+2 damage to all weapons.", rarity: "rare" },
     { name: "Overdrive", effect: { type: "firerate", value: 0.3 }, description: "Massively increase fire rate.", rarity: "rare" },
     { name: "Titanium Hull", effect: { type: "maxhealth", value: 10 }, description: "+10 max health.", rarity: "common" },
     { name: "Bullet Velocity", effect: { type: "bulletspeed", value: 1 }, description: "Bullets travel much faster.", rarity: "common" },
     ...aiPassivePool
   ];
   choices.push(passiveUpgrades[Math.floor(Math.random() * passiveUpgrades.length)]);

   // Ensure there are always 3 choices
   while (choices.length < 3) {
     choices.push(passiveUpgrades[Math.floor(Math.random() * passiveUpgrades.length)]);
   }

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
     case 'upgrade_weapon':
       const weaponToUpgrade = state.cfg.weapons.find(w => w.name === value);
       if (weaponToUpgrade) {
         weaponToUpgrade.level = (weaponToUpgrade.level || 1) + 1;
         // Apply specific upgrades based on level
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
         // Generic fallback for AI-defined weapons
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
     case 'speed':
       state.player.baseSpeed += value;
       state.player.speed = state.player.baseSpeed;
       break;
     case 'weapon':
       const idx = state.cfg.weapons.findIndex(w => w.name === value);
       if (idx !== -1 && !state.player.weapons.includes(idx)) {
         state.player.weapons.push(idx);
         state.cfg.weapons[idx].level = 1; // Initialize level
       }
       break;
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
 }

 function showGameOver() {
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

// --------------------------------------------------
// Update
// --------------------------------------------------
function update(ts, deltaTime){
  handlePlayerMovement(deltaTime);
  handleShooting(ts);
  moveEnemies(deltaTime);
  moveBullets(deltaTime);
  handleCollisions();
  cleanupEntities();
  updateParticles(deltaTime);
  updateCameraShake();
  maybeNextWave();
  checkForUpgrade();
  updateUI();
}

 function updateUI() {
  const healthPercent = Math.max(0, state.player.hp / state.player.maxHp) * 100;
  state.dom.healthFill.style.width = healthPercent + '%';

  const now = performance.now();
  if (state.uiLastUpdate && now - state.uiLastUpdate < 100) return; // ~10fps UI refresh
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

 function handlePlayerMovement(deltaTime){
   // Dash ability
   if ((state.keys.Space || state.keys.space) && state.player.dash.ready) {
     state.player.dash.ready = false;
     state.player.dash.lastUsed = Date.now();
     state.player.invulnerable = Date.now() + state.player.dash.duration;
     const dashSpeed = 15;
     
     // Dash in movement direction, or towards nearest enemy if not moving
     let dashAngle = 0;
     const movementSpeed = Math.hypot(state.player.velocity.x, state.player.velocity.y);
     
     if(movementSpeed > 0.1) {
       // Dash in current movement direction
       dashAngle = Math.atan2(state.player.velocity.y, state.player.velocity.x);
     } else if(state.activeEnemies.length > 0) {
       // Dash towards nearest enemy if not moving
       let nearestEnemy = state.activeEnemies[0];
       let minDistance = Math.hypot(nearestEnemy.x - state.player.x, nearestEnemy.y - state.player.y);
       
       state.activeEnemies.forEach(enemy => {
         const distance = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);
         if(distance < minDistance) {
           minDistance = distance;
           nearestEnemy = enemy;
         }
       });
       
       dashAngle = Math.atan2(nearestEnemy.y - state.player.y, nearestEnemy.x - state.player.x);
     } else {
       // Default dash forward (right)
       dashAngle = 0;
     }
     
     state.player.velocity.x = Math.cos(dashAngle) * dashSpeed;
     state.player.velocity.y = Math.sin(dashAngle) * dashSpeed;
     createParticles(state.player.x, state.player.y, '#ffffff', 15, 'dash');
     playSound('dash');
   }

   if (!state.player.dash.ready && Date.now() - state.player.dash.lastUsed > state.player.dash.cooldown) {
     state.player.dash.ready = true;
   }

   let inputX = 0, inputY = 0;
   
   // Use WASD or arrow keys
   if(state.keys.ArrowUp || state.keys.KeyW || state.keys.w) inputY -= 1;
   if(state.keys.ArrowDown || state.keys.KeyS || state.keys.s) inputY += 1;
   if(state.keys.ArrowLeft || state.keys.KeyA || state.keys.a) inputX -= 1;
   if(state.keys.ArrowRight || state.keys.KeyD || state.keys.d) inputX += 1;
   
   // Normalize diagonal movement
   if(inputX && inputY) {
     inputX *= 0.707;
     inputY *= 0.707;
   }
   
   // Apply acceleration-based movement for smoother feel
   const targetVelocityX = inputX * state.player.speed;
   const targetVelocityY = inputY * state.player.speed;
   
   state.player.velocity.x += (targetVelocityX - state.player.velocity.x) * state.player.acceleration;
   state.player.velocity.y += (targetVelocityY - state.player.velocity.y) * state.player.acceleration;
   
   // Apply friction when no input
   if (!inputX && !inputY) {
     state.player.velocity.x *= state.player.friction;
     state.player.velocity.y *= state.player.friction;
   }
   
   // Update position with frame-rate independence
   const timeMultiplier = deltaTime / 16.67; // normalize to 60fps
   state.player.x += state.player.velocity.x * timeMultiplier;
   state.player.y += state.player.velocity.y * timeMultiplier;
   
    // Keep player in bounds with slight padding for better feel
   const padding = state.player.size;
   state.player.x = Math.max(padding, Math.min(window.innerWidth - padding, state.player.x));
   state.player.y = Math.max(padding, Math.min(window.innerHeight - padding, state.player.y));
 }

 function handleShooting(ts){
   if(state.activeEnemies.length===0) return;
   
   // Find nearest enemy
   let nearestEnemy = null;
   let minDistance = Infinity;
   
   state.activeEnemies.forEach(enemy => {
     const distance = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);
     if(distance < minDistance) {
       minDistance = distance;
       nearestEnemy = enemy;
     }
   });
   
   if(!nearestEnemy) return;
   
   state.player.weapons.forEach(wi=>{
     const w=state.cfg.weapons[wi];
     if(!w) return;
     const interval = 1000/(w.fireRate||1);
     if((ts - (state.player.lastShotMap[wi]||0)) < interval) return;
     state.player.lastShotMap[wi]=ts;
     
     const dx = nearestEnemy.x - state.player.x;
     const dy = nearestEnemy.y - state.player.y;
     const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * (w.spread || 0);
     const speed = w.bulletSpeed || w.speed || 5;
     
     const bullet = {
       x: state.player.x,
       y: state.player.y,
       dx: Math.cos(angle) * speed,
       dy: Math.sin(angle) * speed,
       size: w.bulletSize || 3,
       color: w.bulletColor || '#00ffff',
       dmg: w.dmg || 1,
       piercing: w.piercing || 0,
       hitCount: 0,
       explosive: w.explosive || 0,
       homing: w.homing || 0,
       chain: w.chain || 0,
       chainCount: 0,
       poison: w.poison || 0,
       freeze: w.freeze || 0,
       bounces: w.bounces || 0,
       bounceCount: 0,
       splitShot: w.splitShot || 0,
       target: null // Homing will find a target
     };
     
     state.bullets.push(bullet);
     
     if(w.splitShot > 0){
       for(let i = 1; i <= w.splitShot; i++){
         const splitAngle = angle + (Math.PI / 12) * (i % 2 === 0 ? i/2 : -Math.ceil(i/2));
         state.bullets.push({
           ...bullet,
           dx: Math.cos(splitAngle) * speed,
           dy: Math.sin(splitAngle) * speed,
           splitShot: 0
         });
       }
     }
     
     createTrailParticle(state.player.x, state.player.y, bullet.color);
     playSound('shoot');
   });
 }

function moveEnemies(deltaTime){
  const timeMultiplier = deltaTime / 16.67; // normalize to 60fps
  
  state.activeEnemies.forEach(e=>{
    // Apply status effects
    if(e.frozen && Date.now() > e.frozen){
      e.speed = e.originalSpeed || e.speed;
      delete e.frozen;
      delete e.originalSpeed;
    }
    
    if(e.poisoned && Date.now() < e.poisoned){
      if(!e.lastPoisonTick || Date.now() - e.lastPoisonTick > 500){
        e.hp -= e.poisonDmg || 1;
        e.lastPoisonTick = Date.now();
        createParticles(e.x, e.y, '#00ff00', 3, 'poison');
      }
    }
    
    const dx = state.player.x - e.x;
    const dy = state.player.y - e.y;
    const dist = Math.hypot(dx, dy);
    
    // Different movement behaviors
    switch(e.behavior){
      case 'chase':
      default:
        if(dist > 1){
          const randomOffset = Math.sin(Date.now() * 0.001 + e.x) * 0.2;
          const moveSpeed = e.speed * timeMultiplier;
          e.x += (dx / dist) * moveSpeed + randomOffset;
          e.y += (dy / dist) * moveSpeed + randomOffset;
        }
        break;
        
      case 'zigzag':
        if(dist > 1){
          const zigzag = Math.sin(Date.now() * 0.005 + e.x) * 2;
          const moveSpeed = e.speed * timeMultiplier;
          e.x += (dx / dist) * moveSpeed + zigzag;
          e.y += (dy / dist) * moveSpeed + zigzag;
        }
        break;
        
      case 'orbit':
        const orbitRadius = 150;
        if(dist > orbitRadius){
          const moveSpeed = e.speed * timeMultiplier;
          e.x += (dx / dist) * moveSpeed;
          e.y += (dy / dist) * moveSpeed;
        } else {
          const orbitAngle = Math.atan2(dy, dx) + 0.02;
          const moveSpeed = e.speed * timeMultiplier;
          e.x = state.player.x + Math.cos(orbitAngle) * orbitRadius;
          e.y = state.player.y + Math.sin(orbitAngle) * orbitRadius;
        }
        break;
        
      case 'teleport':
         if(!e.lastTeleport || Date.now() - e.lastTeleport > 3000){
          if(Math.random() < 0.01){ // 1% chance per frame
            createParticles(e.x, e.y, e.color, 8, 'teleport');
            e.x = state.player.x + (Math.random() - 0.5) * 200;
            e.y = state.player.y + (Math.random() - 0.5) * 200;
            e.x = Math.max(20, Math.min(window.innerWidth - 20, e.x));
            e.y = Math.max(20, Math.min(window.innerHeight - 20, e.y));
            createParticles(e.x, e.y, e.color, 8, 'teleport');
            e.lastTeleport = Date.now();
          }
        }
        // Still move normally when not teleporting
        if(dist > 1){
          const moveSpeed = e.speed * timeMultiplier;
          e.x += (dx / dist) * moveSpeed;
          e.y += (dy / dist) * moveSpeed;
        }
        break;
        
      case 'sniper':
        // Stay at distance and shoot
        const sniperDist = 200;
        if(dist < sniperDist - 10){
          const moveSpeed = e.speed * timeMultiplier;
          e.x -= (dx / dist) * moveSpeed;
          e.y -= (dy / dist) * moveSpeed;
        } else if(dist > sniperDist + 10){
          const moveSpeed = e.speed * timeMultiplier;
          e.x += (dx / dist) * moveSpeed;
          e.y += (dy / dist) * moveSpeed;
        }
        break;
        
      case 'kamikaze':
        // Speed up as it gets closer
        if(dist > 1){
          const speedBoost = Math.max(1, 3 - dist/100);
          const moveSpeed = e.speed * speedBoost * timeMultiplier;
          e.x += (dx / dist) * moveSpeed;
          e.y += (dy / dist) * moveSpeed;
          
          // Visual effect when boosting
          if(speedBoost > 1.5){
            createTrailParticle(e.x, e.y, e.color);
          }
        }
        break;
    }
    
    // Enemy projectiles
    if(e.projectile && (!e.lastShot || Date.now() - e.lastShot > 2000)){
      const angle = Math.atan2(dy, dx);
      state.bullets.push({
        x: e.x,
        y: e.y,
        dx: Math.cos(angle) * 3,
        dy: Math.sin(angle) * 3,
        size: 4,
        color: e.color,
        dmg: e.damage || 1,
        enemy: true, // Mark as enemy bullet
        piercing: 0,
        hitCount: 0
      });
      e.lastShot = Date.now();
      playSound('shoot');
    }
    
    // Special abilities

    
    if(e.specialAbility === 'shield' && !e.shieldActive){
      e.shieldActive = true;
      e.shieldHp = 10;
    }
    
    if(e.specialAbility === 'rage' && e.hp < e.maxHp/3 && !e.enraged){
      e.enraged = true;
      e.speed *= 2;
      e.damage = (e.damage || 1) * 2;
      e.color = '#ff0000';
    }
  });
}

function moveBullets(deltaTime){ 
  const timeMultiplier = deltaTime / 16.67; // normalize to 60fps
  
  state.bullets.forEach(b => {
    // Homing behavior
    if(b.homing > 0 && b.target && state.activeEnemies.includes(b.target)){
      const dx = b.target.x - b.x;
      const dy = b.target.y - b.y;
      const dist = Math.hypot(dx, dy);
      if(dist > 1){
        const targetAngle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(b.dy, b.dx);
        let angleDiff = targetAngle - currentAngle;
        
        // Normalize angle difference
        while(angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while(angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Apply homing turn rate
        const newAngle = currentAngle + angleDiff * b.homing;
        const speed = Math.hypot(b.dx, b.dy);
        b.dx = Math.cos(newAngle) * speed;
        b.dy = Math.sin(newAngle) * speed;
      }
    } else if(b.homing > 0 && !b.target){
      // Find new target if lost
      let minDist = 200;
      state.activeEnemies.forEach(e => {
        const dist = Math.hypot(e.x - b.x, e.y - b.y);
        if(dist < minDist){
          minDist = dist;
          b.target = e;
        }
      });
    }
    
     // Bouncing behavior
    if(b.bounces > 0 && b.bounceCount < b.bounces){
      if(b.x <= b.size || b.x >= window.innerWidth - b.size){
        b.dx = -b.dx;
        b.bounceCount++;
        createParticles(b.x, b.y, b.color, 4, 'bounce');
      }
      if(b.y <= b.size || b.y >= window.innerHeight - b.size){
        b.dy = -b.dy;
        b.bounceCount++;
        createParticles(b.x, b.y, b.color, 4, 'bounce');
      }
    }
    
    b.x += b.dx * timeMultiplier;
    b.y += b.dy * timeMultiplier;
    
    if (Math.random() < 0.1) {
      createTrailParticle(b.x, b.y, b.color);
    }
  });
}

function handleCollisions(){
  // player damage from enemies with invincibility frames
  if (!state.player.invulnerable || Date.now() > state.player.invulnerable) {
    state.activeEnemies.forEach(e=>{
      if(Math.hypot(e.x-state.player.x,e.y-state.player.y)<state.player.size+e.size){
        const damage = e.damage || 1;
        state.player.hp -= damage;
        state.player.invulnerable = Date.now() + 500; // 0.5 second invincibility
        createParticles(state.player.x, state.player.y, '#ff4444', 8, 'damage');
        addCameraShake(3, 8);
        playSound('damage');
      }
    });
    
    // Enemy bullet hits player
    state.bullets.forEach(b => {
      if(b.enemy && Math.hypot(state.player.x-b.x,state.player.y-b.y)<state.player.size+b.size){
        state.player.hp -= b.dmg;
        state.player.invulnerable = Date.now() + 500;
        b._hit = true;
        createParticles(state.player.x, state.player.y, '#ff4444', 8, 'damage');
        addCameraShake(3, 8);
        playSound('damage');
      }
    });
  }
  
  // bullet hits with advanced effects
  state.bullets.forEach(b=>{
    if (b._hit || b.enemy) return; // Skip enemy bullets
    
    let hitEnemy = null;
    state.activeEnemies.forEach(e=>{
      if(Math.hypot(e.x-b.x,e.y-b.y)<e.size+b.size){
        // Handle shield first
        if(e.shieldActive && e.shieldHp > 0){
          const shieldDamage = Math.min(e.shieldHp, b.dmg);
          e.shieldHp -= shieldDamage;
          const remainingDamage = b.dmg - shieldDamage;
          if(remainingDamage > 0){
            e.hp -= remainingDamage;
          }
          if(e.shieldHp <= 0){
            e.shieldActive = false;
            createParticles(e.x, e.y, '#66ccff', 8, 'shieldbreak');
          }
        } else {
          e.hp -= b.dmg;
        }
        b.hitCount++;
        hitEnemy = e;
        
        // Apply status effects
        if(b.poison > 0){
          e.poisoned = Date.now() + b.poison;
          e.poisonDmg = Math.ceil(b.dmg * 0.3); // 30% damage per tick
        }
        
        if(b.freeze > 0){
          e.frozen = Date.now() + b.freeze;
          e.originalSpeed = e.originalSpeed || e.speed;
          e.speed = e.originalSpeed * 0.3; // Slow to 30% speed
        }
        
        // Explosive damage
        if(b.explosive > 0){
          state.activeEnemies.forEach(other => {
            if(other !== e){
              const dist = Math.hypot(other.x - e.x, other.y - e.y);
              if(dist < b.explosive){
                other.hp -= Math.ceil(b.dmg * 0.5); // 50% splash damage
                createParticles(other.x, other.y, '#ff6600', 4, 'explosion');
              }
            }
          });
          createParticles(e.x, e.y, '#ff6600', 12, 'explosion');
          addCameraShake(5, 10);
        }
        
        // Chain lightning
        if(b.chain > 0 && b.chainCount < b.chain){
          let nearestEnemy = null;
          let minDist = 100;
          state.activeEnemies.forEach(other => {
            if(other !== e && !other._chained){
              const dist = Math.hypot(other.x - e.x, other.y - e.y);
              if(dist < minDist){
                minDist = dist;
                nearestEnemy = other;
              }
            }
          });
          
          if(nearestEnemy){
            nearestEnemy._chained = true;
            const chainBullet = {
              ...b,
              x: e.x,
              y: e.y,
              dx: (nearestEnemy.x - e.x) / minDist * Math.hypot(b.dx, b.dy),
              dy: (nearestEnemy.y - e.y) / minDist * Math.hypot(b.dx, b.dy),
              chainCount: b.chainCount + 1,
              hitCount: 0,
              _hit: false
            };
            state.bullets.push(chainBullet);
            
            createLightningEffect(e.x, e.y, nearestEnemy.x, nearestEnemy.y, b.color);
          }
        }
        
        createParticles(e.x, e.y, e.color, 6, 'hit');
        addCameraShake(1, 3);
        playSound('hit');
        
        // Check if bullet should be destroyed or can pierce
        if (b.hitCount > b.piercing) {
          b._hit = true;
        }
      }
    });
    
    // Clean up chain markers
    if(hitEnemy){
      setTimeout(() => {
        state.activeEnemies.forEach(e => delete e._chained);
      }, 100);
    }
  });
}

function cleanupEntities(){
   for(let i=state.bullets.length-1;i>=0;i--){
    const b=state.bullets[i];
    // Don't remove bouncing bullets at edges unless they've used all bounces
    const outOfBounds = (b.x<-50||b.x>window.innerWidth+50||b.y<-50||b.y>window.innerHeight+50);
    const shouldRemove = b._hit || (outOfBounds && (!b.bounces || b.bounceCount >= b.bounces));
    if(shouldRemove) state.bullets.splice(i,1);
  }
  for(let i=state.activeEnemies.length-1;i>=0;i--){
    if(state.activeEnemies[i].hp<=0){
      const enemy = state.activeEnemies[i];
      const points = (enemy.points || 1) * state.scoreMultiplier;
      state.score += Math.floor(points);
      state.coins += Math.ceil(points / 2); // Earn coins based on enemy value
      state.kills++;
      createParticles(enemy.x, enemy.y, enemy.color, 12, 'explosion');
      
      // Chance to drop health
       if(Math.random() < 0.05){ // 5% chance
         createParticles(enemy.x, enemy.y, '#00ff00', 6, 'health');
         state.player.hp = Math.min(state.player.maxHp, state.player.hp + 5);
       }
       if (enemy.splittable && enemy.splitLevel < 3) {
        for (let j = 0; j < 2; j++) {
          const newEnemy = createEnemyInstance(enemy.name);
          newEnemy.x = enemy.x + (Math.random() - 0.5) * 20;
          newEnemy.y = enemy.y + (Math.random() - 0.5) * 20;
          newEnemy.size = Math.max(5, enemy.size * 0.7);
          newEnemy.hp = Math.ceil(enemy.maxHp * 0.6);
          newEnemy.maxHp = Math.ceil(enemy.maxHp * 0.6);
          newEnemy.splitLevel = enemy.splitLevel + 1;
          newEnemy.points = Math.ceil(enemy.points * 0.7);
          state.activeEnemies.push(newEnemy);
        }
      }
       addCameraShake(3, 8);
      playSound('death');
      state.activeEnemies.splice(i,1);
    }
  }
}

function maybeNextWave(){
  if(!state.activeEnemies.length && state.currentWave<state.cfg.waves.length){
    // Wave completion bonus
    const waveBonus = (state.currentWave + 1) * 50;
    state.score += waveBonus;
    state.coins += Math.ceil(waveBonus / 5);
    
    // Increase score multiplier every 3 waves
    if((state.currentWave + 1) % 3 === 0){
      state.scoreMultiplier += 0.5;
    }
    
    state.currentWave++;
    if (state.currentWave < state.cfg.waves.length) {
      showWaveIndicator(state.currentWave + 1);
    }
    loadWave();
  }
}

// --------------------------------------------------
// Draw
// --------------------------------------------------
function draw(){
  state.dom.ctx.save();
  state.dom.ctx.translate(state.cameraShake.x, state.cameraShake.y);
  
   // Background gradient
  const gradient = state.dom.bgGradient;
  state.dom.ctx.fillStyle = gradient || (state.cfg.background || '#1a0d33');
  state.dom.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  
  // Animated stars
  state.stars.forEach(star => {
    state.dom.ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
    state.dom.ctx.beginPath();
    state.dom.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    state.dom.ctx.fill();
    
     star.y += star.speed;
    if (star.y > window.innerHeight) {
      star.y = 0;
      star.x = Math.random() * window.innerWidth;
    }
  });
  
  // Draw particles
  state.dom.ctx.save();
  state.dom.ctx.globalCompositeOperation = 'lighter';
  state.particles.forEach(p => {
    state.dom.ctx.save();
    state.dom.ctx.globalAlpha = p.life;
    state.dom.ctx.fillStyle = p.color;
    
    if (p.type === 'explosion') {
      state.dom.ctx.shadowBlur = 10;
      state.dom.ctx.shadowColor = p.color;
    } else if (p.type === 'lightning') {
      state.dom.ctx.save();
      state.dom.ctx.globalAlpha = p.life * 0.8;
      state.dom.ctx.strokeStyle = p.color;
      state.dom.ctx.lineWidth = p.size || 2;
      state.dom.ctx.beginPath();
      state.dom.ctx.moveTo(p.x, p.y);
      state.dom.ctx.lineTo(p.x2, p.y2);
      state.dom.ctx.stroke();
      state.dom.ctx.restore();
      return;
    }
    
    state.dom.ctx.beginPath();
    state.dom.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    state.dom.ctx.fill();
    state.dom.ctx.restore();
  });
  state.dom.ctx.restore();
  
  // Draw bullets with glow
  state.dom.ctx.save();
  state.dom.ctx.globalCompositeOperation = 'lighter';
  state.bullets.forEach(b => {
    state.dom.ctx.save();
    state.dom.ctx.shadowBlur = 15;
    state.dom.ctx.shadowColor = b.color;
    state.dom.ctx.fillStyle = b.color;
    state.dom.ctx.beginPath();
    state.dom.ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    state.dom.ctx.fill();
    state.dom.ctx.restore();
  });
  state.dom.ctx.restore();
  
  // Draw player with pulsing glow
  const pulseIntensity = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
  state.dom.ctx.save();
  state.dom.ctx.shadowBlur = 20 * pulseIntensity;
  state.dom.ctx.shadowColor = '#ff4444';
  state.dom.ctx.fillStyle = '#ff4444';
  state.dom.ctx.strokeStyle = '#ffaaaa';
  state.dom.ctx.lineWidth = 2;
  state.dom.ctx.beginPath();
  state.dom.ctx.arc(state.player.x, state.player.y, state.player.size, 0, Math.PI * 2);
  state.dom.ctx.fill();
  state.dom.ctx.stroke();
  state.dom.ctx.restore();
  
  // Draw enemies with glow and status effects
  state.activeEnemies.forEach(e => {
    state.dom.ctx.save();
    
    // Flash effect when recently spawned
    const timeSinceSpawn = Date.now() - e.spawnTime;
    if (timeSinceSpawn < 1000) {
      state.dom.ctx.globalAlpha = 0.5 + 0.5 * Math.sin(timeSinceSpawn * 0.01);
    }
    
    // Status effect visuals
    if(e.frozen){
      state.dom.ctx.shadowBlur = 15;
      state.dom.ctx.shadowColor = '#66ccff';
    } else if(e.poisoned){
      state.dom.ctx.shadowBlur = 15;
      state.dom.ctx.shadowColor = '#00ff00';
    } else if(e.enraged){
      state.dom.ctx.shadowBlur = 20;
      state.dom.ctx.shadowColor = '#ff0000';
    } else {
      state.dom.ctx.shadowBlur = 10;
      state.dom.ctx.shadowColor = e.color;
    }
    
    state.dom.ctx.fillStyle = e.color;
    state.dom.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    state.dom.ctx.lineWidth = 1;
    state.dom.ctx.beginPath();
    state.dom.ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    state.dom.ctx.fill();
    state.dom.ctx.stroke();
    
    // Shield visual
    if(e.shieldActive && e.shieldHp > 0){
      state.dom.ctx.strokeStyle = 'rgba(100,200,255,0.6)';
      state.dom.ctx.lineWidth = 2;
      state.dom.ctx.beginPath();
      state.dom.ctx.arc(e.x, e.y, e.size + 5, 0, Math.PI * 2);
      state.dom.ctx.stroke();
    }
    
    // Frozen overlay
    if(e.frozen){
      state.dom.ctx.fillStyle = 'rgba(150,200,255,0.3)';
      state.dom.ctx.beginPath();
      state.dom.ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      state.dom.ctx.fill();
    }
    
    // Health bar for damaged enemies
    if (e.hp < e.maxHp) {
      const healthPercent = e.hp / e.maxHp;
      const barWidth = e.size * 3;
      const barHeight = 3;
      
      state.dom.ctx.fillStyle = 'rgba(255,0,0,0.7)';
      state.dom.ctx.fillRect(e.x - barWidth/2, e.y - e.size - 8, barWidth, barHeight);
      
      state.dom.ctx.fillStyle = e.poisoned ? 'rgba(150,255,0,0.9)' : 'rgba(0,255,0,0.9)';
      state.dom.ctx.fillRect(e.x - barWidth/2, e.y - e.size - 8, barWidth * healthPercent, barHeight);
    }
    
    // Special ability indicators
    if(e.specialAbility && !e.hasSplit && !e.enraged){
      state.dom.ctx.fillStyle = 'rgba(255,255,255,0.8)';
      state.dom.ctx.font = '8px Orbitron';
      state.dom.ctx.textAlign = 'center';
      let icon = '';
      switch(e.specialAbility){
        case 'shield': icon = '◈'; break;
        case 'rage': icon = '!'; break;
        case 'teleport': icon = '⚡'; break;
        case 'split': icon = '✂'; break;
      }
      state.dom.ctx.fillText(icon, e.x, e.y - e.size - 12);
    }
    
    state.dom.ctx.restore();
  });
  
   // Draw weapon cooldown indicators
  const weaponBarY = window.innerHeight - 40;
  const totalWidth = state.player.weapons.length * 80;
  const startX = (window.innerWidth - totalWidth) / 2;

  state.player.weapons.forEach((wi, index) => {
    const w = state.cfg.weapons[wi];
    if (!w) return;
    
    const barX = startX + index * 80;
    const barWidth = 60;
    const barHeight = 8;
    
    const interval = 1000 / (w.fireRate || 1);
    const timeSinceLastShot = Date.now() - (state.player.lastShotMap[wi] || 0);
    const cooldownPercent = Math.min(1, timeSinceLastShot / interval);
    
    // Background
    state.dom.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    state.dom.ctx.fillRect(barX, weaponBarY, barWidth, barHeight);
    
    // Cooldown fill
    state.dom.ctx.fillStyle = cooldownPercent >= 1 ? '#00ff00' : '#ffff00';
    state.dom.ctx.fillRect(barX, weaponBarY, barWidth * cooldownPercent, barHeight);
    
    // Weapon name
    state.dom.ctx.fillStyle = '#fff';
    state.dom.ctx.font = '10px Orbitron';
    state.dom.ctx.textAlign = 'center';
    state.dom.ctx.fillText(w.name || `W${index+1}`, barX + barWidth / 2, weaponBarY - 8);
  });
  
  // Player invulnerability flash
  if (state.player.invulnerable && Date.now() < state.player.invulnerable) {
    state.dom.ctx.save();
    state.dom.ctx.globalAlpha = 0.3;
    state.dom.ctx.fillStyle = '#ffffff';
    state.dom.ctx.beginPath();
    state.dom.ctx.arc(state.player.x, state.player.y, state.player.size + 5, 0, Math.PI * 2);
    state.dom.ctx.fill();
    state.dom.ctx.restore();
  }
  
  state.dom.ctx.restore();
}

export {
  update,
  draw,
  loadWave,
  showGameOver,
  showWaveIndicator,
};
