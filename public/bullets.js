import { state } from './state.js';
import { createTrailParticle } from './effects.js';

export function moveBullets(deltaTime){ 
  const timeMultiplier = deltaTime / 16.67;
  state.bullets.forEach(b => {
    if(b.homing > 0 && b.target && state.activeEnemies.includes(b.target)){
      const dx = b.target.x - b.x;
      const dy = b.target.y - b.y;
      const dist = Math.hypot(dx, dy);
      if(dist > 1){
        const targetAngle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(b.dy, b.dx);
        let angleDiff = targetAngle - currentAngle;
        while(angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while(angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        const newAngle = currentAngle + angleDiff * b.homing;
        const speed = Math.hypot(b.dx, b.dy);
        b.dx = Math.cos(newAngle) * speed;
        b.dy = Math.sin(newAngle) * speed;
      }
    } else if(b.homing > 0 && !b.target){
      let minDist = 200;
      state.activeEnemies.forEach(e => {
        const dist = Math.hypot(e.x - b.x, e.y - b.y);
        if(dist < minDist){
          minDist = dist;
          b.target = e;
        }
      });
    }
    if(b.bounces > 0 && b.bounceCount < b.bounces){
      if(b.x <= b.size || b.x >= window.innerWidth - b.size){
        b.dx = -b.dx;
        b.bounceCount++;
        createTrailParticle(b.x, b.y, b.color);
      }
      if(b.y <= b.size || b.y >= window.innerHeight - b.size){
        b.dy = -b.dy;
        b.bounceCount++;
        createTrailParticle(b.x, b.y, b.color);
      }
    }
    b.x += b.dx * timeMultiplier;
    b.y += b.dy * timeMultiplier;
    if (Math.random() < 0.1) {
      createTrailParticle(b.x, b.y, b.color);
    }
  });
}
