import {state} from './state.js';
import {addCameraShake, createLightningEffect, createParticles} from './effects.js';
import {playSound} from './audio.js';
import {createEnemyInstance} from './enemies.js';
import {buildSpatialHash, querySpatialHash} from './spatial.js';

function computeCoinDrop(e) {
  const hpComponent = (e.maxHp || e.hp || 10) / 20;
  const speedComponent = (e.speed || 1) * 0.4;
  const projectileBonus = e.projectile ? 2 : 0;
  let abilityBonus = 0;
  switch (e.specialAbility) {
    case 'shield': abilityBonus = 2; break;
    case 'rage': abilityBonus = 1.5; break;
    case 'teleport': abilityBonus = 2; break;
    case 'split': abilityBonus = 1.5; break;
  }
  const behaviorBonus = (e.behavior === 'kamikaze' || e.behavior === 'sniper') ? 1 : 0;
  const base = hpComponent + speedComponent + projectileBonus + abilityBonus + behaviorBonus;
  return Math.max(1, Math.round(base));
}

function spawnPickups(amount, x, y) {
  const denoms = [
    {type: 'diamond', value: 10, color: '#66e0ff', size: 6},
    {type: 'lingo',   value: 5,  color: '#ff66cc', size: 5},
    {type: 'coin',    value: 1,  color: '#ffdd55', size: 4},
  ];
  let remaining = Math.max(1, Math.floor(amount));
  const items = [];
  for (const d of denoms) {
    while (remaining >= d.value && items.length < 20) {
      items.push(d);
      remaining -= d.value;
    }
  }
  if (!items.length) items.push(denoms[2]);
  items.forEach(d => {
    const ang = Math.random() * Math.PI * 2;
    const spd = Math.random() * 2 + 1;
    state.pickups.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      size: d.size,
      type: d.type,
      color: d.color,
      value: d.value,
      spawnAt: Date.now(),
      expireAt: Date.now() + 15000
    });
  });
}

export function handleCollisions() {
  const CELL = 64;
  const enemyHash = buildSpatialHash(state.activeEnemies, CELL);

  if (!state.player.invulnerable || Date.now() > state.player.invulnerable) {
    const playerCandidates = querySpatialHash(enemyHash, state.player.x, state.player.y, state.player.size + CELL);
    playerCandidates.forEach(e => {
      if (Math.hypot(e.x - state.player.x, e.y - state.player.y) < state.player.size + e.size) {
        const damage = e.damage || 1;
        state.player.hp -= damage;
        state.player.invulnerable = Date.now() + 500;
        createParticles(state.player.x, state.player.y, '#ff4444', 8, 'damage');
        addCameraShake(3, 8);
        playSound('damage');
      }
    });
    state.bullets.forEach(b => {
      if (b.enemy && Math.hypot(state.player.x - b.x, state.player.y - b.y) < state.player.size + b.size) {
        state.player.hp -= b.dmg;
        state.player.invulnerable = Date.now() + 500;
        b._hit = true;
        createParticles(state.player.x, state.player.y, '#ff4444', 8, 'damage');
        addCameraShake(3, 8);
        playSound('damage');
      }
    });
  }

  state.bullets.forEach(b => {
    if (b._hit || b.enemy) return;
    let hitEnemy = null;
    const candidates = querySpatialHash(enemyHash, b.x, b.y, (b.size || 3) + CELL);
    candidates.forEach(e => {
      if (Math.hypot(e.x - b.x, e.y - b.y) < e.size + b.size) {
        if (e.shieldActive && e.shieldHp > 0) {
          const shieldDamage = Math.min(e.shieldHp, b.dmg);
          e.shieldHp -= shieldDamage;
          const remainingDamage = b.dmg - shieldDamage;
          if (remainingDamage > 0) {
            e.hp -= remainingDamage;
          }
          if (e.shieldHp <= 0) {
            e.shieldActive = false;
            createParticles(e.x, e.y, '#66ccff', 8, 'shieldbreak');
          }
        } else {
          e.hp -= b.dmg;
        }
        b.hitCount++;
        hitEnemy = e;

        if (b.poison > 0) {
          e.poisoned = Date.now() + b.poison;
          e.poisonDmg = Math.ceil(b.dmg * 0.3);
        }
        if (b.freeze > 0) {
          e.frozen = Date.now() + b.freeze;
          e.originalSpeed = e.originalSpeed || e.speed;
          e.speed = e.originalSpeed * 0.3;
        }
        if (b.explosive > 0) {
          const aoe = querySpatialHash(enemyHash, e.x, e.y, b.explosive);
          aoe.forEach(other => {
            if (other !== e) {
              const dist = Math.hypot(other.x - e.x, other.y - e.y);
              if (dist < b.explosive) {
                other.hp -= Math.ceil(b.dmg * 0.5);
                createParticles(other.x, other.y, '#ff6600', 4, 'explosion');
              }
            }
          });
          createParticles(e.x, e.y, '#ff6600', 12, 'explosion');
          addCameraShake(5, 10);
        }
        if (b.chain > 0 && b.chainCount < b.chain) {
          let nearestEnemy = null;
          let minDist = 100;
          const chainCands = querySpatialHash(enemyHash, e.x, e.y, minDist);
          chainCands.forEach(other => {
            if (other !== e && !other._chained) {
              const dist = Math.hypot(other.x - e.x, other.y - e.y);
              if (dist < minDist) {
                minDist = dist;
                nearestEnemy = other;
              }
            }
          });
          if (nearestEnemy) {
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
        if (b.hitCount > b.piercing) {
          b._hit = true;
        }
      }
    });
    if (hitEnemy) {
      setTimeout(() => {
        state.activeEnemies.forEach(e => delete e._chained);
      }, 100);
    }
  });
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const p = state.pickups[i];
    const dist = Math.hypot(p.x - state.player.x, p.y - state.player.y);
    if (dist < state.player.size + p.size + 4) {
      state.coins += p.value || 1;
      createParticles(p.x, p.y, p.color || '#ffdd55', 8, 'coin');
      playSound('coin');
      state.pickups.splice(i, 1);
    }
  }
}

export function cleanupEntities() {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    const outOfBounds = (b.x < -50 || b.x > window.innerWidth + 50 || b.y < -50 || b.y > window.innerHeight + 50);
    const shouldRemove = b._hit || (outOfBounds && (!b.bounces || b.bounceCount >= b.bounces));
    if (shouldRemove) state.bullets.splice(i, 1);
  }
  for (let i = state.activeEnemies.length - 1; i >= 0; i--) {
    if (state.activeEnemies[i].hp <= 0) {
      const enemy = state.activeEnemies[i];
      const points = (enemy.points || 1) * state.scoreMultiplier;
      state.score += Math.floor(points);
      const coinDrop = computeCoinDrop(enemy);
      spawnPickups(coinDrop, enemy.x, enemy.y);
      createParticles(enemy.x, enemy.y, '#ffdd55', 10, 'coin');
      state.kills++;
      createParticles(enemy.x, enemy.y, enemy.color, 12, 'explosion');

      if (Math.random() < 0.05) {
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
      state.activeEnemies.splice(i, 1);
    }
  }
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const p = state.pickups[i];
    const dx = state.player.x - p.x;
    const dy = state.player.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 100) {
      const pull = (100 - d) / 100 * 0.4;
      p.vx += (dx / d) * pull;
      p.vy += (dy / d) * pull;
    }
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.x += p.vx;
    p.y += p.vy;
    if (p.expireAt && Date.now() > p.expireAt) {
      state.pickups.splice(i, 1);
    }
  }
}
