import {state} from './state.js';
import {createParticles, createTrailParticle} from './effects.js';
import {playSound} from './audio.js';

export function handlePlayerMovement(deltaTime) {
  if ((state.keys.Space || state.keys.space) && state.player.dash.ready) {
    state.player.dash.ready = false;
    state.player.dash.lastUsed = Date.now();
    const dashSpeed = state.player.dash.speed || 15;
    let dashAngle;
    const movementSpeed = Math.hypot(state.player.velocity.x, state.player.velocity.y);
    if (movementSpeed > 0.1) {
      dashAngle = Math.atan2(state.player.velocity.y, state.player.velocity.x);
    } else if (state.activeEnemies.length > 0) {
      let nearestEnemy = state.activeEnemies[0];
      let minDistance = Math.hypot(nearestEnemy.x - state.player.x, nearestEnemy.y - state.player.y);
      state.activeEnemies.forEach(enemy => {
        const distance = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearestEnemy = enemy;
        }
      });
      dashAngle = Math.atan2(nearestEnemy.y - state.player.y, nearestEnemy.x - state.player.x);
    } else {
      dashAngle = 0;
    }
    state.player.velocity.x = Math.cos(dashAngle) * dashSpeed;
    state.player.velocity.y = Math.sin(dashAngle) * dashSpeed;
    const now = Date.now();
    state.player.dash.startedAt = now;
    state.player.dash.activeUntil = now + state.player.dash.duration;
    state.player.invulnerable = state.player.dash.activeUntil;
    createParticles(state.player.x, state.player.y, '#ffffff', 15, 'dash');
    playSound('dash');
  }

  if (!state.player.dash.ready && Date.now() - state.player.dash.lastUsed > state.player.dash.cooldown) {
    state.player.dash.ready = true;
  }

  let inputX = 0, inputY = 0;
  if (state.keys.ArrowUp || state.keys.KeyW || state.keys.w) inputY -= 1;
  if (state.keys.ArrowDown || state.keys.KeyS || state.keys.s) inputY += 1;
  if (state.keys.ArrowLeft || state.keys.KeyA || state.keys.a) inputX -= 1;
  if (state.keys.ArrowRight || state.keys.KeyD || state.keys.d) inputX += 1;
  if (inputX && inputY) {
    inputX *= 0.707;
    inputY *= 0.707;
  }
  const targetVelocityX = inputX * state.player.speed;
  const targetVelocityY = inputY * state.player.speed;
  state.player.velocity.x += (targetVelocityX - state.player.velocity.x) * state.player.acceleration;
  state.player.velocity.y += (targetVelocityY - state.player.velocity.y) * state.player.acceleration;
  if (!inputX && !inputY) {
    state.player.velocity.x *= state.player.friction;
    state.player.velocity.y *= state.player.friction;
  }
  const timeMultiplier = deltaTime / 16.67;
  state.player.x += state.player.velocity.x * timeMultiplier;
  state.player.y += state.player.velocity.y * timeMultiplier;
  const padding = state.player.size;
  state.player.x = Math.max(padding, Math.min(window.innerWidth - padding, state.player.x));
  state.player.y = Math.max(padding, Math.min(window.innerHeight - padding, state.player.y));
}

export function handleShooting(ts) {
  if (state.activeEnemies.length === 0) return;
  let nearestEnemy = null;
  let minDistance = Infinity;
  state.activeEnemies.forEach(enemy => {
    const distance = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);
    if (distance < minDistance) {
      minDistance = distance;
      nearestEnemy = enemy;
    }
  });
  if (!nearestEnemy) return;

  state.player.weapons.forEach(wi => {
    const w = state.cfg.weapons[wi];
    if (!w) return;
    const interval = 1000 / (w.fireRate || 1);
    if ((ts - (state.player.lastShotMap[wi] || 0)) < interval) return;
    state.player.lastShotMap[wi] = ts;

    const dx = nearestEnemy.x - state.player.x;
    const dy = nearestEnemy.y - state.player.y;
    const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * (w.spread || 0);
    const speed = w.bulletSpeed || w.speed || 5;
    const unit = state.rangeUnitPx || 500;
    const baseRangePx = (w.range ? w.range * unit : state.player.bulletRange);
    const maxDist = baseRangePx * (state.player.bulletRangeMult || 1);

    const bullet = {
      x: state.player.x,
      y: state.player.y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      size: (w.bulletSize || 3) + (state.player._bulletSizeBonusFromCoins || 0),
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
      target: null,
      travel: 0,
      maxDist,
    };

    state.bullets.push(bullet);

    if (w.splitShot > 0) {
      for (let i = 1; i <= w.splitShot; i++) {
        const splitAngle = angle + (Math.PI / 12) * (i % 2 === 0 ? i / 2 : -Math.ceil(i / 2));
        state.bullets.push({
          ...bullet,
          dx: Math.cos(splitAngle) * speed,
          dy: Math.sin(splitAngle) * speed,
          splitShot: 0,
          travel: 0,
          maxDist
        });
      }
    }

    createTrailParticle(state.player.x, state.player.y, bullet.color);
    playSound('shoot');
  });
}
