import {state} from './state.js';
import {addCameraShake, createLightningEffect, createParticles} from './effects.js';
import {playSound} from './audio.js';
import {createEnemyInstance} from './enemies.js';
import {buildSpatialHash, querySpatialHash} from './spatial.js';

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
      state.coins += Math.ceil(points / 2);
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
}
