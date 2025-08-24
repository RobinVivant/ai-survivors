import {state} from './state.js';

export function draw() {
  state.dom.ctx.save();
  state.dom.ctx.translate(state.cameraShake.x, state.cameraShake.y);
  state.dom.ctx.globalCompositeOperation = 'source-over';
  state.dom.ctx.globalAlpha = 1;

  const gradient = state.dom.bgGradient;
  state.dom.ctx.fillStyle = gradient || (state.cfg.background || '#1a0d33');
  state.dom.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

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
      state.dom.ctx.restore();
      return;
    }

    state.dom.ctx.beginPath();
    state.dom.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    state.dom.ctx.fill();
    state.dom.ctx.restore();
  });
  state.dom.ctx.restore();

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

  // Pickups
  state.dom.ctx.save();
  state.dom.ctx.globalCompositeOperation = 'lighter';
  state.pickups.forEach(pu => {
    state.dom.ctx.save();
    const now = Date.now();
    const totalLife = (pu.expireAt && pu.spawnAt) ? (pu.expireAt - pu.spawnAt) : 20000;
    const timeLeft = pu.expireAt ? Math.max(0, pu.expireAt - now) : totalLife;
    const urgency = Math.max(0, Math.min(1, 1 - timeLeft / totalLife)); // 0 -> fresh, 1 -> expiring
    const speed = 0.004 + urgency * 0.06;
    const t = (now * speed + pu.x + pu.y) % (Math.PI * 2);
    const pulse = 1 + Math.sin(t) * (0.1 + 0.3 * urgency);
    const r = pu.size * pulse;
    state.dom.ctx.shadowBlur = 12 + 24 * urgency;
    state.dom.ctx.shadowColor = pu.color;
    state.dom.ctx.fillStyle = pu.color;
    state.dom.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    state.dom.ctx.lineWidth = 1 + urgency;
    state.dom.ctx.globalAlpha = 0.9 + 0.1 * urgency; // subtle glow boost near expiry
    if (pu.type === 'diamond') {
      state.dom.ctx.beginPath();
      state.dom.ctx.moveTo(pu.x, pu.y - r);
      state.dom.ctx.lineTo(pu.x + r, pu.y);
      state.dom.ctx.lineTo(pu.x, pu.y + r);
      state.dom.ctx.lineTo(pu.x - r, pu.y);
      state.dom.ctx.closePath();
      state.dom.ctx.fill();
      state.dom.ctx.stroke();
    } else {
      state.dom.ctx.beginPath();
      state.dom.ctx.arc(pu.x, pu.y, r, 0, Math.PI * 2);
      state.dom.ctx.fill();
      state.dom.ctx.stroke();
    }
    state.dom.ctx.restore();
  });
  state.dom.ctx.restore();

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


  state.activeEnemies.forEach(e => {
    state.dom.ctx.save();
    const timeSinceSpawn = Date.now() - e.spawnTime;
    if (timeSinceSpawn < 1000) {
      state.dom.ctx.globalAlpha = 0.5 + 0.5 * Math.sin(timeSinceSpawn * 0.01);
    }
    if (e.frozen) {
      state.dom.ctx.shadowBlur = 15;
      state.dom.ctx.shadowColor = '#66ccff';
    } else if (e.poisoned) {
      state.dom.ctx.shadowBlur = 15;
      state.dom.ctx.shadowColor = '#00ff00';
    } else if (e.enraged) {
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

    if (e.shieldActive && e.shieldHp > 0) {
      state.dom.ctx.strokeStyle = 'rgba(100,200,255,0.6)';
      state.dom.ctx.lineWidth = 2;
      state.dom.ctx.beginPath();
      state.dom.ctx.arc(e.x, e.y, e.size + 5, 0, Math.PI * 2);
      state.dom.ctx.stroke();
    }
    if (e.frozen) {
      state.dom.ctx.fillStyle = 'rgba(150,200,255,0.3)';
      state.dom.ctx.beginPath();
      state.dom.ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      state.dom.ctx.fill();
    }
    if (e.hp < e.maxHp) {
      const healthPercent = e.hp / e.maxHp;
      const barWidth = e.size * 3;
      const barHeight = 3;
      state.dom.ctx.fillStyle = 'rgba(255,0,0,0.7)';
      state.dom.ctx.fillRect(e.x - barWidth / 2, e.y - e.size - 8, barWidth, barHeight);
      state.dom.ctx.fillStyle = e.poisoned ? 'rgba(150,255,0,0.9)' : 'rgba(0,255,0,0.9)';
      state.dom.ctx.fillRect(e.x - barWidth / 2, e.y - e.size - 8, barWidth * healthPercent, barHeight);
    }
    if (e.specialAbility && !e.hasSplit && !e.enraged) {
      state.dom.ctx.fillStyle = 'rgba(255,255,255,0.8)';
      state.dom.ctx.font = '8px Orbitron';
      state.dom.ctx.textAlign = 'center';
      let icon = '';
      switch (e.specialAbility) {
        case 'shield':
          icon = '◈';
          break;
        case 'rage':
          icon = '!';
          break;
        case 'teleport':
          icon = '⚡';
          break;
        case 'split':
          icon = '✂';
          break;
      }
      state.dom.ctx.fillText(icon, e.x, e.y - e.size - 12);
    }
    state.dom.ctx.restore();
  });

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
