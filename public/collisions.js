import {state} from './state.js';
import {addCameraShake, createLightningEffect, createParticles, createExplosionDisc} from './effects.js';
import {playSound} from './audio.js';
import {createEnemyInstance} from './enemies.js';
import {buildSpatialHash, querySpatialHash} from './spatial.js';

const ENEMY_AIR_GAP = 3.0; // small desired gap between enemies (px)

function applyKnockback(target, srcX, srcY, maxStrength = 14, radius = 80) {
  let dx = target.x - srcX;
  let dy = target.y - srcY;
  let dist = Math.hypot(dx, dy);
  if (dist < 1e-3) {
    const a = Math.random() * Math.PI * 2;
    dx = Math.cos(a);
    dy = Math.sin(a);
    dist = 1;
  }
  const rel = Math.max(0, Math.min(1, (radius - dist) / Math.max(1, radius)));
  const k = maxStrength * (0.25 + 0.45 * rel); // softer falloff, overall less knockback

  // Velocity impulse (px/frame); AVBD will pick this up next frame
  target.vx = (target.vx || 0) + (dx / dist) * k;
  target.vy = (target.vy || 0) + (dy / dist) * k;

  // Tag for “enemy as projectile” impact damage
  const now = Date.now();
  const stunMs = 100 + Math.round(5 * k); // softer stun scaling
  target.knockUntil = Math.max(target.knockUntil || 0, now + stunMs);
  const recoveryMs = 220;
  target.recoverUntil = Math.max(target.recoverUntil || 0, now + stunMs + recoveryMs);
  target._recoverDur = recoveryMs;
  target._impactUntil = now + 240;
  target._impactPower = Math.max(target._impactPower || 0, k); // carry some strength forward
}

function computeCoinDrop(e) {
  const points = Math.max(1, e.points || 1);
  const projectileBonus = e.projectile ? 0.2 : 0;
  const abilityBonus = ({shield: 0.4, rage: 0.3, teleport: 0.4, split: 0.3}[e.specialAbility] || 0);
  const behaviorBonus = (e.behavior === 'kamikaze' || e.behavior === 'sniper') ? 0.2 : 0;

  // Early-game boost: stronger on low waves, fades out by wave 5
  const w = state.currentWave || 0;
  const earlyFactor = 1 + Math.max(0, 5 - w) * 0.15; // w=0 -> 1.75x, w=2 -> 1.45x, w>=5 -> 1.0x

  const base = points * 0.12 + projectileBonus + abilityBonus + behaviorBonus;
  const variance = (Math.random() * 0.6 - 0.3);
  const raw = (base + variance) * earlyFactor;

  // Guarantee at least 1 coin for the first two waves
  const minClamp = (w <= 2) ? 1 : 0;
  return Math.max(minClamp, Math.round(raw));
}

function spawnHealthPack(x, y, amount = 5) {
  const ang = Math.random() * Math.PI * 2;
  const spd = Math.random() * 2 + 1;
  state.pickups.push({
    x, y,
    vx: Math.cos(ang) * spd,
    vy: Math.sin(ang) * spd,
    size: 7,
    type: 'heal',
    color: '#66ff88',
    value: amount,
    spawnAt: Date.now(),
    expireAt: Date.now() + 15000
  });
}

function spawnPickups(amount, x, y) {
  const denoms = [
    {type: 'lingo', value: 15, color: '#cc33ff', size: 9}, // highest value, most purple, largest
    {type: 'diamond', value: 7, color: '#66e0ff', size: 7},
    {type: 'coin', value: 1, color: '#ffdd55', size: 5},
  ];
  let remaining = Math.floor(amount);
  if (remaining <= 0) return;
  const items = [];
  for (const d of denoms) {
    while (remaining >= d.value && items.length < 20) {
      items.push(d);
      remaining -= d.value;
    }
  }
  if (!items.length) return;
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
      expireAt: Date.now() + 20000
    });
  });
}

export function handleCollisions() {
  const CELL = 64;
  const enemyHash = buildSpatialHash(state.activeEnemies, CELL);

  const usingAVBD = !!(state.physics && state.physics.enabled);

  // Resolve enemy-enemy overlaps (disabled when AVBD is active)
  if (!usingAVBD) {
    state.activeEnemies.forEach(e => {
      const neighbors = querySpatialHash(enemyHash, e.x, e.y, e.size + 64);
      neighbors.forEach(o => {
        if (o === e) return;
        const dx = o.x - e.x;
        const dy = o.y - e.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const desired = (e.size || 0) + (o.size || 0) + ENEMY_AIR_GAP;
        if (dist < desired) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = desired - dist;

          const m1 = Math.max(1, (e.size || 1) * (e.size || 1));
          const m2 = Math.max(1, (o.size || 1) * (o.size || 1));
          const inv1 = 1 / m1;
          const inv2 = 1 / m2;
          const invSum = inv1 + inv2;

          const move1 = overlap * (inv1 / invSum);
          const move2 = overlap * (inv2 / invSum);

          e.x -= nx * move1;
          e.y -= ny * move1;
          o.x += nx * move2;
          o.y += ny * move2;
        }
      });
    });
  }

  // Player-enemy separation + contact damage
  const p = state.player;
  const playerNeighbors = querySpatialHash(enemyHash, p.x, p.y, p.size + CELL);
  const nowMs = Date.now();
  playerNeighbors.forEach(e => {
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const minDist = (e.size || 0) + (p.size || 0);
    const eps = usingAVBD ? 0.5 : 0; // allow touch damage with AVBD
    if (dist < minDist + eps) {
      if (!usingAVBD) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        // Separate with inertia (player heavier to avoid huge displacement)
        const mEnemy = Math.max(1, (e.size || 1) * (e.size || 1));
        const mPlayer = Math.max(1, (p.size || 1) * (p.size || 1) * 2); // player ~2x area-mass
        const invE = 1 / mEnemy;
        const invP = 1 / mPlayer;
        const invSum = invE + invP;
        const moveE = overlap * (invE / invSum);
        const moveP = overlap * (invP / invSum);

        e.x += nx * moveE;
        e.y += ny * moveE;
        p.x -= nx * moveP;
        p.y -= ny * moveP;
      }

      // Cue-ball style bump: strong knockback on body hits even without contact-damage upgrade
      {
        const baseRam = p.contactDamageBase || 0;
        const speed = Math.hypot(p.velocity.x || 0, p.velocity.y || 0);
        if (baseRam <= 0 && speed > 2.2 && nowMs - (e._lastBumpImpulseAt || 0) >= 120) {
          const sizeBoost = Math.max(0.9, (p.size || 1) / (p.baseSize || 22));
          const kb = Math.min(28, 4 + speed * 1.8 * sizeBoost);
          applyKnockback(e, p.x, p.y, kb, (p.size || 22) + 10);
          e._lastBumpImpulseAt = nowMs;
        }
      }

      // Contact damage to player, rate-limited and scaled by enemy size/inertia
      const tick = 350; // ms between contact hits per enemy
      if ((!p.invulnerable || nowMs > p.invulnerable) && nowMs - (e._lastContactToPlayerAt || 0) >= tick) {
        const base = e.damage || 1;
        const sizeFactor = 0.6 + (Math.min(24, e.size || 0) / 20); // ~0.6..1.8
        const contactDmg = Math.max(1, Math.round(base * sizeFactor));
        p.hp -= contactDmg;
        p.invulnerable = nowMs + 450; // brief i-frames for contact hits
        p.lastDamagedAt = performance.now();
        createParticles(p.x, p.y, '#ff4444', 6, 'damage');
        addCameraShake(2, 6);
        playSound('damage');
        e._lastContactToPlayerAt = nowMs;

        // Thorns reflect a portion of that hit back to the enemy
        const thornsPct = p.contactThornsPercent || 0;
        if (thornsPct > 0) {
          const reflect = Math.max(1, Math.round(contactDmg * thornsPct));
          e.hp -= reflect;
          createParticles(e.x, e.y, '#66ff88', 4, 'hit');
        }
      }

      // Player body/contact damage to enemy (ram), rate-limited
      const baseRam = p.contactDamageBase || 0;
      if (baseRam > 0 && nowMs - (e._lastRamHitAt || 0) >= 220) {
        const sizeScale = Math.max(0.75, (p.size || 1) / (p.baseSize || 22));
        const speedScale = 0.8 + Math.min(0.7, Math.hypot(p.velocity.x || 0, p.velocity.y || 0) / 12);
        const ramDmg = Math.max(1, Math.round(baseRam * sizeScale * speedScale));
        e.hp -= ramDmg;
        {
          const spd = Math.hypot(p.velocity.x || 0, p.velocity.y || 0);
          const knock = Math.min(30, 8 + spd * 2.2 * sizeScale);
          applyKnockback(e, p.x, p.y, knock, (p.size || 22) + 12);
        }
        createParticles(e.x, e.y, '#99ffcc', 5, 'hit');
        addCameraShake(1, 3);
        e._lastRamHitAt = nowMs;
      }
    }
  });

  // Dash damage aura (while invulnerable due to dash)
  if (state.player?.dash?.damage > 0 && Date.now() <= (state.player.dash.activeUntil || 0)) {
    const R = state.player.dash.damageRadius || (state.player.size + 10);
    const nearby = querySpatialHash(enemyHash, state.player.x, state.player.y, R + 64);
    nearby.forEach(e => {
      if (Math.hypot(e.x - state.player.x, e.y - state.player.y) < e.size + R) {
        if (e._dashHitAt !== state.player.dash.startedAt) {
          e._dashHitAt = state.player.dash.startedAt;
          e.hp -= state.player.dash.damage;
          const kbMax = Math.min(32, 10 + (state.player.dash.speed || 18) * 1.1);
          applyKnockback(e, state.player.x, state.player.y, kbMax, (state.player.dash.damageRadius || (state.player.size + 10)) + 8);
          createParticles(e.x, e.y, '#66ffff', 6, 'hit');
        }
      }
    });
  }

  // Melee/contact weapons aura knockback when they tick this frame
  {
    const now = Date.now();
    const unit = state.rangeUnitPx || 320;
    const player = state.player;
    if (player && Array.isArray(player.weapons) && player.weapons.length) {
      for (let idx = 0; idx < player.weapons.length; idx++) {
        const wi = player.weapons[idx];
        const w = state.cfg.weapons[wi];
        if (!w || !(w.contactDamage > 0)) continue;

        // Only apply on the exact frame the contact weapon ticked
        const last = player.lastShotMap[wi] || 0;
        if (now - last > 40) continue;

        const R = (w.range ? w.range * unit : (player.size + 8));
        const near = querySpatialHash(enemyHash, player.x, player.y, R + 64);
        near.forEach(e => {
          const d = Math.hypot(e.x - player.x, e.y - player.y);
          if (d <= R) {
            const spd = Math.hypot(player.velocity.x || 0, player.velocity.y || 0);
            const kbMax = Math.min(40, 10 + (w.contactDamage || 1) * 3 + Math.min(10, spd));
            applyKnockback(e, player.x, player.y, kbMax, R + 8);
          }
        });
      }
    }
  }
  // Only enemy projectiles hurt the player here; contact is handled above with separation and rate-limited hits
  if (!state.player.invulnerable || Date.now() > state.player.invulnerable) {
    state.bullets.forEach(b => {
      if (b.enemy && Math.hypot(state.player.x - b.x, state.player.y - b.y) < state.player.size + b.size) {
        state.player.hp -= b.dmg;
        state.player.invulnerable = Date.now() + 500;
        state.player.lastDamagedAt = performance.now();
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
          const centerX = e.x;
          const centerY = e.y;
          const kbMax = Math.max(8, Math.min(60, b.explosive * 0.4)); // reduced knockback

          // Primary target knockback
          applyKnockback(e, centerX, centerY, kbMax, b.explosive);

          const aoe = querySpatialHash(enemyHash, centerX, centerY, b.explosive);
          aoe.forEach(other => {
            if (other !== e) {
              const dist = Math.hypot(other.x - centerX, other.y - centerY);
              if (dist < b.explosive) {
                other.hp -= Math.ceil(b.dmg * 0.5);
                applyKnockback(other, centerX, centerY, kbMax, b.explosive);
                createParticles(other.x, other.y, '#ff6600', 4, 'explosion');
              }
            }
          });
          // Visible explosion disc (covers the whole blast radius)
          createExplosionDisc(centerX, centerY, b.explosive, b.color || '#ff6600');
          createParticles(centerX, centerY, '#ff6600', 12, 'explosion');
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
  {
    const now = Date.now();
    state.activeEnemies.forEach(src => {
      if ((src._impactUntil || 0) < now) return; // not “projectile” anymore
      const neighbors = querySpatialHash(enemyHash, src.x, src.y, (src.size || 0) + 64);
      neighbors.forEach(dst => {
        if (dst === src) return;
        const dx = dst.x - src.x;
        const dy = dst.y - src.y;
        const dist = Math.hypot(dx, dy) || 1;
        const minDist = (dst.size || 0) + (src.size || 0);
        if (dist <= minDist + (usingAVBD ? 0.5 : 0)) {
          // rate-limit so a single overlap doesn’t spam many hits
          if (now - (dst._lastHitFromEnemyAt || 0) < 120) return;

          const relV = Math.hypot((src.vx || 0) - (dst.vx || 0), (src.vy || 0) - (dst.vy || 0));
          const power = src._impactPower || 0;
          const dmg = Math.max(1, Math.round(power * (0.35 + Math.min(1, relV / 12))));
          dst.hp -= dmg;

          // shove the target and propagate a weaker impact for possible short chains
          const shove = Math.min(20, power * 0.7);
          dst.vx = (dst.vx || 0) + (dx / dist) * shove;
          dst.vy = (dst.vy || 0) + (dy / dist) * shove;
          dst._impactPower = Math.max(dst._impactPower || 0, power * 0.6);
          dst._impactUntil = now + 220;
          // Stun both participants proportionally to impulse magnitude
          const stunDst = 120 + Math.round(6 * shove);
          dst.knockUntil = Math.max(dst.knockUntil || 0, now + stunDst);
          const stunSrc = 80 + Math.round(4 * power);
          src.knockUntil = Math.max(src.knockUntil || 0, now + stunSrc);

          // keep some momentum on the source so short chains are more likely
          src._impactPower = power * 0.6;
          if (src._impactPower < 1) src._impactUntil = now;

          dst._lastHitFromEnemyAt = now;
          createParticles(dst.x, dst.y, '#ff9966', 5, 'hit');
          playSound('hit');
        }
      });
    });
  }
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const p = state.pickups[i];
    const dist = Math.hypot(p.x - state.player.x, p.y - state.player.y);
    // Small leniency so pulsing/diamond/nugget shapes don’t orbit forever at the edge
    const leniency = 4 + ((p.type === 'diamond' || p.type === 'nugget') ? 3 : 0);
    const touchR = (state.player.size || 0) + (p.size || 0);
    const baseCollectR = state.player.coinCollectRadius || 0;
    const collectR = Math.max(touchR, baseCollectR) + leniency;
    if (dist <= collectR) {
      if (p.type === 'heal') {
        if (state.player.hp >= state.player.maxHp) continue; // leave for later
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + (p.value || 5));
        createParticles(p.x, p.y, p.color || '#66ff66', 8, 'health');
        playSound('heal');
      } else {
        state.coins += p.value || 1;
        createParticles(p.x, p.y, p.color || '#ffdd55', 8, 'coin');
        playSound('coin');
      }
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
      const coinDrop = Math.ceil(computeCoinDrop(enemy) * (state.player.coinGainMult || 1));
      spawnPickups(coinDrop, enemy.x, enemy.y);
      createParticles(enemy.x, enemy.y, '#ffdd55', 10, 'coin');
      state.kills++;
      if (state.player.onKillHeal) {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.onKillHeal);
      }
      createParticles(enemy.x, enemy.y, enemy.color, 12, 'explosion');

      if (Math.random() < 0.05) {
        spawnHealthPack(enemy.x, enemy.y, 6);
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
    const sizeMagBonus = Math.max(0, (state.player.size - (state.player.baseSize || 22)) * 2);
    const magnetR = (state.player.coinMagnetRadius || 100) + sizeMagBonus;
    if (d < magnetR) {
      const pull = (magnetR - d) / magnetR * 0.4;
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
