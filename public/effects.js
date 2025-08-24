import {state} from './state.js';

const MAX_PARTICLES = 600;

export function createParticles(x, y, color, count = 8, type = 'explosion') {
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

export function createTrailParticle(x, y, color) {
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

export function createLightningEffect(x1, y1, x2, y2, color) {
  if (state.particles.length >= MAX_PARTICLES) return;
  state.particles.push({
    x: x1, y: y1, x2, y2,
    size: 2,
    life: 1,
    decay: 0.25,
    color,
    type: 'lightning'
  });
}

export function updateParticles(deltaTime) {
  const timeMultiplier = deltaTime / 16.67;
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += (typeof p.vx === 'number' ? p.vx : 0) * timeMultiplier;
    p.y += (typeof p.vy === 'number' ? p.vy : 0) * timeMultiplier;
    if (typeof p.vx === 'number') p.vx *= 0.98;
    if (typeof p.vy === 'number') p.vy *= 0.98;
    p.life -= (p.decay || 0.02) * timeMultiplier;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

export function addCameraShake(intensity, duration) {
  state.cameraShake.intensity = Math.max(state.cameraShake.intensity, intensity);
  state.cameraShake.duration = Math.max(state.cameraShake.duration, duration);
}

export function updateCameraShake() {
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
