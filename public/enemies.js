import {state} from './state.js';
import {createParticles, createTrailParticle} from './effects.js';
import {playSound} from './audio.js';

// Flocking (boids) helpers
const FLOCK_BEHAVIORS = new Set(['chase', 'zigzag', 'kamikaze']);
const AIR_GAP_PX = 3.0;
function computeFlockVector(e, all) {
  const radius = Math.max(80, (e.size || 8) * 8);           // perception radius
  const sepDist = Math.max(12, (e.size || 8) * 2.2);        // desired separation

  let count = 0, sepX = 0, sepY = 0, velX = 0, velY = 0, cx = 0, cy = 0;
  let closestD2 = Infinity, closestDX = 0, closestDY = 0;

  for (const o of all) {
    if (o === e || o.name !== e.name) continue;             // only same kind
    const dx = o.x - e.x, dy = o.y - e.y;
    const d2 = dx*dx + dy*dy;
    if (d2 < closestD2) { closestD2 = d2; closestDX = dx; closestDY = dy; }
    if (d2 > radius * radius) continue;
    const d = Math.sqrt(d2) || 1;
    count++;
    cx += o.x; cy += o.y;
    velX += o.vx || 0; velY += o.vy || 0;
    const desired = (e.size || 8) + (o.size || 8) + AIR_GAP_PX;
    if (d < desired) {
      const s = (desired - d) / Math.max(1, desired);
      sepX -= (dx / d) * s * 1.4;
      sepY -= (dy / d) * s * 1.4;
    } else if (d < sepDist) {
      const s = (sepDist - d) / Math.max(1e-6, sepDist);
      sepX -= (dx / d) * s * 0.8;
      sepY -= (dy / d) * s * 0.8;
    }
  }

  const norm = (x, y) => {
    const l = Math.hypot(x, y);
    return l > 1e-6 ? { x: x / l, y: y / l, len: l } : { x: 0, y: 0, len: 0 };
  };

  // No nearby neighbors -> fly toward nearest same-type to group up
  if (!count) {
    if (isFinite(closestD2)) {
      const d = Math.sqrt(closestD2) || 1;
      const towards = { x: closestDX / d, y: closestDY / d };
      return { dir: towards, neighbors: 0, coh: towards, sep: {x:0,y:0}, sepDist, toCenterLen: d, radius };
    }
    return null;
  }

  const toCenterRaw = { x: (cx / count) - e.x, y: (cy / count) - e.y };
  const cohN = norm(toCenterRaw.x, toCenterRaw.y);          // cohesion (to local centroid)
  const sepN = norm(sepX, sepY);                            // separation
  const alignN = norm(velX, velY);                          // alignment

  const sepW = 1.25, alignW = 0.55, cohW = 0.5;
  let rx = sepN.x * sepW + alignN.x * alignW + cohN.x * cohW;
  let ry = sepN.y * sepW + alignN.y * alignW + cohN.y * cohW;
  const dirN = norm(rx, ry);

  return {
    dir: { x: dirN.x, y: dirN.y },
    neighbors: count,
    coh: { x: cohN.x, y: cohN.y },
    sep: { x: sepN.x, y: sepN.y },
    sepDist,
    toCenterLen: cohN.len,
    radius
  };
}

export function createEnemyInstance(name) {
  const def = state.cfg.enemies.find(e => e.name === name) || {
    name: 'Unknown',
    color: '#fff',
    speed: 1,
    hp: 10,
    points: 1
  };

  // Spawn anywhere in the viewport, but keep a minimum distance from the player
  let x, y;
  const s = Math.max(4, def.size || 8);
  const minDistance = Math.max(120, (state.player?.size || 22) + s + 40);
  let attempts = 0;
  do {
    x = s + Math.random() * (window.innerWidth - 2 * s);
    y = s + Math.random() * (window.innerHeight - 2 * s);
    attempts++;
  } while (Math.hypot(x - state.player.x, y - state.player.y) < minDistance && attempts < 20);

  const wave = Math.max(0, state.currentWave || 0);
  const hpScale = 1 + wave * 0.15;
  const speedScale = 1 + wave * 0.03;
  const pointsScale = 1 + wave * 0.25;

  return {
    ...def,
    x, y,
    size: Math.round((def.size || 8) * 1.7),
    speed: (def.speed || 1) * speedScale,
    hp: Math.ceil((def.hp || 10) * hpScale),
    maxHp: Math.ceil((def.hp || 10) * hpScale),
    points: Math.max(1, Math.ceil((def.points || 1) * pointsScale)),
    damage: def.damage || 1,
    spawnTime: Date.now(),
    splitLevel: 0,
    splittable: def.splittable || def.specialAbility === 'split',
    teleportCooldownMs: def.specialAbility === 'teleport' ? (def.teleportCooldownMs || 3000) : 0,
    nextTeleportAt: def.specialAbility === 'teleport' ? (Date.now() + 2000 + Math.random() * 1000) : 0,
  };
}

export function moveEnemies(deltaTime) {
  const timeMultiplier = deltaTime / 16.67;
  state.activeEnemies.forEach(e => {
    if (e.frozen && Date.now() > e.frozen) {
      e.speed = e.originalSpeed || e.speed;
      delete e.frozen;
      delete e.originalSpeed;
    }
    if (e.poisoned && Date.now() < e.poisoned) {
      if (!e.lastPoisonTick || Date.now() - e.lastPoisonTick > 500) {
        e.hp -= e.poisonDmg || 1;
        e.lastPoisonTick = Date.now();
        createParticles(e.x, e.y, '#00ff00', 3, 'poison');
      }
    }
    const now = Date.now();
    const stunned = e.knockUntil && now < e.knockUntil;
    if (e.poisoned && now < e.poisoned) {
      if (!e.lastPoisonTick || now - e.lastPoisonTick > 500) {
        e.hp -= e.poisonDmg || 1;
        e.lastPoisonTick = now;
        createParticles(e.x, e.y, '#00ff00', 3, 'poison');
      }
    }
    // Special ability: teleport (cooldown-gated)
    if (e.specialAbility === 'teleport' && now >= (e.nextTeleportAt || 0)) {
      if (Math.random() < 0.01) {
        createParticles(e.x, e.y, e.color, 8, 'teleport');
        e.x = state.player.x + (Math.random() - 0.5) * 200;
        e.y = state.player.y + (Math.random() - 0.5) * 200;
        e.x = Math.max(20, Math.min(window.innerWidth - 20, e.x));
        e.y = Math.max(20, Math.min(window.innerHeight - 20, e.y));
        createParticles(e.x, e.y, e.color, 8, 'teleport');
        e.nextTeleportAt = now + (e.teleportCooldownMs || 3000);
      }
    }

    const oldX = e.x;
    const oldY = e.y;

    const dx = state.player.x - e.x;
    const dy = state.player.y - e.y;
    const dist = Math.hypot(dx, dy);
    const flock = FLOCK_BEHAVIORS.has(e.behavior || 'chase') ? computeFlockVector(e, state.activeEnemies) : null;
    if (!stunned) {
      switch (e.behavior) {
        case 'chase':
        default:
          if (dist > 1) {
            const moveSpeed = e.speed * timeMultiplier;
            const toP = { x: dx / dist, y: dy / dist };
            const grp = flock ? flock.coh : { x: 0, y: 0 };
            let vx = toP.x * 0.5 + grp.x * 0.5;
            let vy = toP.y * 0.5 + grp.y * 0.5;
            const len = Math.hypot(vx, vy) || 1;
            vx /= len; vy /= len;
            const randomOffset = Math.sin(Date.now() * 0.001 + e.x) * 0.2;
            e.x += vx * moveSpeed + randomOffset;
            e.y += vy * moveSpeed + randomOffset;
            if (flock) {
              e.x += (flock.sep?.x || 0) * moveSpeed * 0.35;
              e.y += (flock.sep?.y || 0) * moveSpeed * 0.35;
            }
          }
          break;
        case 'zigzag':
          if (dist > 1) {
            const moveSpeed = e.speed * timeMultiplier;
            const toP = { x: dx / dist, y: dy / dist };
            const grp = flock ? flock.coh : { x: 0, y: 0 };
            let vx = toP.x * 0.5 + grp.x * 0.5;
            let vy = toP.y * 0.5 + grp.y * 0.5;
            const len = Math.hypot(vx, vy) || 1;
            vx /= len; vy /= len;
            const zigzag = Math.sin(Date.now() * 0.005 + e.x) * 2;
            e.x += vx * moveSpeed + zigzag;
            e.y += vy * moveSpeed + zigzag;
            if (flock) {
              e.x += (flock.sep?.x || 0) * moveSpeed * 0.35;
              e.y += (flock.sep?.y || 0) * moveSpeed * 0.35;
            }
          }
          break;
        case 'orbit':
          const orbitRadius = 150;
          if (dist > orbitRadius) {
            const moveSpeed = e.speed * timeMultiplier;
            e.x += (dx / dist) * moveSpeed;
            e.y += (dy / dist) * moveSpeed;
          } else {
            const orbitAngle = Math.atan2(dy, dx) + 0.02;
            e.x = state.player.x + Math.cos(orbitAngle) * orbitRadius;
            e.y = state.player.y + Math.sin(orbitAngle) * orbitRadius;
          }
          break;
        case 'teleport':
          if (now >= (e.nextTeleportAt || 0) && Math.random() < 0.01) {
            createParticles(e.x, e.y, e.color, 8, 'teleport');
            e.x = state.player.x + (Math.random() - 0.5) * 200;
            e.y = state.player.y + (Math.random() - 0.5) * 200;
            e.x = Math.max(20, Math.min(window.innerWidth - 20, e.x));
            e.y = Math.max(20, Math.min(window.innerHeight - 20, e.y));
            createParticles(e.x, e.y, e.color, 8, 'teleport');
            e.nextTeleportAt = now + (e.teleportCooldownMs || 3000);
          }
          if (dist > 1) {
            const moveSpeed = e.speed * timeMultiplier;
            e.x += (dx / dist) * moveSpeed;
            e.y += (dy / dist) * moveSpeed;
          }
          break;
        case 'sniper':
          const sniperDist = 200;
          if (dist < sniperDist - 10) {
            const moveSpeed = e.speed * timeMultiplier;
            e.x -= (dx / dist) * moveSpeed;
            e.y -= (dy / dist) * moveSpeed;
          } else if (dist > sniperDist + 10) {
            const moveSpeed = e.speed * timeMultiplier;
            e.x += (dx / dist) * moveSpeed;
            e.y += (dy / dist) * moveSpeed;
          }
          break;
        case 'kamikaze':
          if (dist > 1) {
            const speedBoost = 1 + Math.min(1.5, Math.max(0, (200 - dist) / 100));
            const moveSpeed = e.speed * speedBoost * timeMultiplier;
            const toP = { x: dx / dist, y: dy / dist };
            const grp = flock ? flock.coh : { x: 0, y: 0 };
            let vx = toP.x * 0.5 + grp.x * 0.5;
            let vy = toP.y * 0.5 + grp.y * 0.5;
            const len = Math.hypot(vx, vy) || 1;
            vx /= len; vy /= len;
            e.x += vx * moveSpeed;
            e.y += vy * moveSpeed;
            if (flock) {
              e.x += (flock.sep?.x || 0) * moveSpeed * 0.3;
              e.y += (flock.sep?.y || 0) * moveSpeed * 0.3;
            }
            if (speedBoost > 1.5) {
              createTrailParticle(e.x, e.y, e.color);
            }
          }
          break;
      }
    } else {
      // Inertial slide with mild damping while stunned
      const damp = Math.pow(0.985, timeMultiplier);
      e.x += (e.vx || 0) * timeMultiplier;
      e.y += (e.vy || 0) * timeMultiplier;
      e.vx = (e.vx || 0) * damp;
      e.vy = (e.vy || 0) * damp;
    }

    const dxStep = e.x - oldX;
    const dyStep = e.y - oldY;
    if (!stunned) {
      e.vx = dxStep / timeMultiplier;
      e.vy = dyStep / timeMultiplier;
    }

    if (e.projectile && (!e.lastShot || Date.now() - e.lastShot > 2400)) {
      const angle = Math.atan2(dy, dx);
      state.bullets.push({
        x: e.x,
        y: e.y,
        dx: Math.cos(angle) * 3,
        dy: Math.sin(angle) * 3,
        size: 4,
        color: e.color,
        dmg: e.damage || 1,
        enemy: true,
        piercing: 0,
        hitCount: 0
      });
      e.lastShot = Date.now();
      playSound('shoot');
    }

    if (e.specialAbility === 'shield' && !e.shieldActive) {
      e.shieldActive = true;
      e.shieldHp = 10;
    }
    if (e.specialAbility === 'rage' && e.hp < e.maxHp / 3 && !e.enraged) {
      e.enraged = true;
      e.speed *= 2;
      e.damage = (e.damage || 1) * 2;
      e.color = '#ff0000';
    }
    {
      const pad = e.size || 6;
      const bounce = 0.75;
      if (e.x < pad) { e.x = pad; e.vx = Math.abs(e.vx || 0) * bounce; }
      else if (e.x > window.innerWidth - pad) { e.x = window.innerWidth - pad; e.vx = -Math.abs(e.vx || 0) * bounce; }
      if (e.y < pad) { e.y = pad; e.vy = Math.abs(e.vy || 0) * bounce; }
      else if (e.y > window.innerHeight - pad) { e.y = window.innerHeight - pad; e.vy = -Math.abs(e.vy || 0) * bounce; }
    }
  });
}
