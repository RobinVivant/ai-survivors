import {state} from './state.js';
import {AVBDWorld, Vec2} from './avbd2d.js';

const PHYS_CFG = {iterations: 9, substeps: 2, gravity: new Vec2(0, 0), collisionCompliance: 2e-5, cellSize: 64};
const massFromSize = s => Math.max(1, (s || 8) * (s || 8) * 0.2); // pseudo area

export function initPhysics() {
  state.physics = {
    enabled: true,
    world: new AVBDWorld(PHYS_CFG),
    idxPlayer: -1,
    idxEnemies: [],
    lastEnemyCount: 0,
  };
}

function computeCellSize() {
  const sizes = [];
  if (state.player?.size) sizes.push(state.player.size);
  for (const e of state.activeEnemies) if (e?.size) sizes.push(e.size);
  const avgR = sizes.length ? (sizes.reduce((a, s) => a + s, 0) / sizes.length) : 12;
  // Aim for ~diameter, snapped to 8px; clamp to a sensible range
  const raw = avgR * 2.5;
  const snapped = Math.round(Math.max(32, Math.min(96, raw)) / 8) * 8;
  return snapped;
}

function rebuildWorld() {
  if (!state.player) return;
  const cfg = {
    ...PHYS_CFG,
    cellSize: computeCellSize(),
    contactSkin: -1.5, // negative => enforce ~1.5px air gap
    velocityDamping: 0.98,   // mild internal damping to calm piles
  };
  const w = new AVBDWorld(cfg);

  // Player
  const pIdx = w.addParticle({
    position: new Vec2(state.player.x, state.player.y),
    velocity: new Vec2((state.player.velocity?.x || 0) * 60, (state.player.velocity?.y || 0) * 60),
    mass: massFromSize(state.player.size || 22),
    radius: state.player.size || 22,
  });

  // Enemies
  const eIdx = [];
  for (const e of state.activeEnemies) {
    const idx = w.addParticle({
      position: new Vec2(e.x, e.y),
      velocity: new Vec2((e.vx || 0) * 60, (e.vy || 0) * 60),
      mass: massFromSize(e.size || 10),
      radius: e.size || 8,
    });
    eIdx.push(idx);
  }

  state.physics.world = w;
  state.physics.idxPlayer = pIdx;
  state.physics.idxEnemies = eIdx;
  state.physics.lastEnemyCount = state.activeEnemies.length;
}

function ensureWorld() {
  if (!state.physics?.world || state.physics.lastEnemyCount !== state.activeEnemies.length) {
    rebuildWorld();
    return;
  }
  // Keep radii in sync
  const w = state.physics.world;
  const p = w.particles[state.physics.idxPlayer];
  if (p) p.r = state.player.size || p.r;
  for (let i = 0; i < state.physics.idxEnemies.length; i++) {
    const e = state.activeEnemies[i];
    const pi = w.particles[state.physics.idxEnemies[i]];
    if (e && pi) pi.r = e.size || pi.r;
  }
}

export function updatePhysics(deltaMs) {
  if (!state.physics?.enabled || !state.player) return;
  ensureWorld();
  const w = state.physics.world;
  if (!w) return;

  // State -> world
  const p = w.particles[state.physics.idxPlayer];
  if (p) {
    p.x.set(state.player.x, state.player.y);
    p.v.set((state.player.velocity?.x || 0) * 60, (state.player.velocity?.y || 0) * 60);
    p.r = state.player.size || p.r;
    const m = massFromSize(state.player.size || 22);
    p.m = m;
    p.invM = 1 / m;
    p.w = p.invM;
  }
  for (let i = 0; i < state.physics.idxEnemies.length; i++) {
    const idx = state.physics.idxEnemies[i];
    const e = state.activeEnemies[i];
    const pi = w.particles[idx];
    if (!e || !pi) continue;
    pi.x.set(e.x, e.y);
    pi.v.set((e.vx || 0) * 60, (e.vy || 0) * 60);
    pi.r = e.size || pi.r;
    const m = massFromSize(e.size || 10);
    pi.m = m;
    pi.invM = 1 / m;
    pi.w = pi.invM;
  }

  // Step physics (seconds)
  const dt = Math.max(0.001, Math.min(deltaMs / 1000, 0.05));
  w.update(dt);

  // World -> state (clamp to screen)
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  if (p) {
    const pad = state.player.size || 22;
    state.player.x = clamp(p.x.x, pad, window.innerWidth - pad);
    state.player.y = clamp(p.x.y, pad, window.innerHeight - pad);
  }
  for (let i = 0; i < state.physics.idxEnemies.length; i++) {
    const idx = state.physics.idxEnemies[i];
    const e = state.activeEnemies[i];
    const pi = w.particles[idx];
    if (!e || !pi) continue;
    const pad = e.size || 6;
    e.x = clamp(pi.x.x, -20, window.innerWidth + 20);
    e.y = clamp(pi.x.y, -20, window.innerHeight + 20);
  }
}
