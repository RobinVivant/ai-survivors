export class Vec2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  clone() { return new Vec2(this.x, this.y); }
  set(x, y) { this.x = x; this.y = y; return this; }
  copy(v) { this.x = v.x; this.y = v.y; return this; }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  scale(s) { this.x *= s; this.y *= s; return this; }
  dot(v) { return this.x * v.x + this.y * v.y; }
  len() { return Math.hypot(this.x, this.y); }
  len2() { return this.x * this.x + this.y * this.y; }
  normalize(eps = 1e-8) {
    const l = this.len();
    if (l < eps) return this.set(0, 0);
    return this.scale(1 / l);
  }
  static add(a, b) { return new Vec2(a.x + b.x, a.y + b.y); }
  static sub(a, b) { return new Vec2(a.x - b.x, a.y - b.y); }
  static scale(a, s) { return new Vec2(a.x * s, a.y * s); }
  static dot(a, b) { return a.x * b.x + a.y * b.y; }
}

export class Particle {
  constructor({
    position = new Vec2(),
    velocity = new Vec2(),
    mass = 1.0,
    radius = 0.0,
    pinned = false,
  } = {}) {
    this.x = position.clone();
    this.v = velocity.clone();
    this.m = mass;
    this.invM = pinned || mass <= 0 ? 0 : 1 / mass;
    this.r = radius;
    this.xp = this.x.clone();
    this.f = new Vec2(0, 0);
    this.w = this.invM;
  }
}

export class SpatialHash {
  constructor(cellSize = 64) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  _key(ix, iy) { return `${ix},${iy}`; }
  _cellIndex(x, y) { return [Math.floor(x / this.cellSize), Math.floor(y / this.cellSize)]; }
  clear() { this.cells.clear(); }
  insert(particle, index) {
    const [ix, iy] = this._cellIndex(particle.xp.x, particle.xp.y);
    const key = this._key(ix, iy);
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key).push(index);
  }
  queryNeighbors(particle) {
    const [ix, iy] = this._cellIndex(particle.xp.x, particle.xp.y);
    const results = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = this._key(ix + dx, iy + dy);
        if (this.cells.has(key)) results.push(...this.cells.get(key));
      }
    }
    return results;
  }
}

export class Constraint { projectLocal(world, dt) {} }

export class DistanceConstraint extends Constraint {
  constructor(i, j, restLength, stiffness = 1.0, compliance = 0.0) {
    super();
    this.i = i; this.j = j;
    this.L0 = restLength;
    this.stiffness = stiffness;
    this.compliance = compliance;
    this.lambda = 0.0;
  }
  projectLocal(world, dt) {
    const pi = world.particles[this.i];
    const pj = world.particles[this.j];
    const wi = pi.w, wj = pj.w;
    if (wi + wj === 0) return;
    const d = Vec2.sub(pi.xp, pj.xp);
    const dist = Math.max(d.len(), 1e-8);
    const n = Vec2.scale(d, 1.0 / dist);
    const C = dist - this.L0;
    const alpha = this.compliance / (dt * dt);
    const wSum = wi + wj;
    const dl = -(C + alpha * this.lambda) / (wSum + alpha);
    if (wi > 0) pi.xp.add(Vec2.scale(n, +dl * wi));
    if (wj > 0) pj.xp.add(Vec2.scale(n, -dl * wj));
    this.lambda += dl;
  }
}

export class PinConstraint extends Constraint {
  constructor(i, target, compliance = 0.0) {
    super();
    this.i = i;
    this.target = target.clone();
    this.compliance = compliance;
    this.lambdaX = 0.0;
    this.lambdaY = 0.0;
  }
  projectLocal(world, dt) {
    const p = world.particles[this.i];
    const w = p.w;
    if (w === 0) return;
    const alpha = this.compliance / (dt * dt);
    {
      const Cx = p.xp.x - this.target.x;
      const dlx = -(Cx + alpha * this.lambdaX) / (w + alpha);
      p.xp.x += dlx * w;
      this.lambdaX += dlx;
    }
    {
      const Cy = p.xp.y - this.target.y;
      const dly = -(Cy + alpha * this.lambdaY) / (w + alpha);
      p.xp.y += dly * w;
      this.lambdaY += dly;
    }
  }
}

export class HalfSpaceConstraint extends Constraint {
  constructor(i, normal = new Vec2(0, 1), offset = 0, compliance = 0.0) {
    super();
    this.i = i;
    this.n = normal.clone().normalize();
    this.offset = offset;
    this.compliance = compliance;
    this.lambda = 0.0;
  }
  projectLocal(world, dt) {
    const p = world.particles[this.i];
    const w = p.w;
    if (w === 0) return;
    const alpha = this.compliance / (dt * dt);
    const g = this.n.x * p.xp.x + this.n.y * p.xp.y - this.offset;
    if (g >= 0) { this.lambda = 0.0; return; }
    let dl = -(g + alpha * this.lambda) / (w + alpha);
    let newLambda = this.lambda + dl;
    if (newLambda < 0) { dl = -this.lambda; newLambda = 0; }
    if (w > 0) {
      p.xp.x += this.n.x * dl * w;
      p.xp.y += this.n.y * dl * w;
    }
    this.lambda = newLambda;
  }
}

export class CircleContactConstraint extends Constraint {
  constructor(i, j, compliance = 0.0) {
    super();
    this.i = i; this.j = j;
    this.compliance = compliance;
    this.lambda = 0.0;
  }
  projectLocal(world, dt) {
    const pi = world.particles[this.i];
    const pj = world.particles[this.j];
    const wi = pi.w, wj = pj.w;
    if (wi + wj === 0) return;
    const alpha = this.compliance / (dt * dt);
    const d = Vec2.sub(pi.xp, pj.xp);
    const dist = Math.max(d.len(), 1e-8);
    const n = Vec2.scale(d, 1.0 / dist);
    const minDist = (pi.r || 0) + (pj.r || 0);
    const g = dist - minDist;
    if (g >= 0) { this.lambda = 0.0; return; }
    const wSum = wi + wj;
    let dl = -(g + alpha * this.lambda) / (wSum + alpha);
    let newLambda = this.lambda + dl;
    if (newLambda < 0) { dl = -this.lambda; newLambda = 0; }
    if (wi > 0) pi.xp.add(Vec2.scale(n, +dl * wi));
    if (wj > 0) pj.xp.add(Vec2.scale(n, -dl * wj));
    this.lambda = newLambda;
  }
}

export class AVBDSolver {
  constructor({
    iterations = 5,
    substeps = 1,
    gravity = new Vec2(0, 0),
    collisionCompliance = 0.0,
    cellSize = 64,
  } = {}) {
    this.iterations = iterations;
    this.substeps = substeps;
    this.gravity = gravity.clone();
    this.collisionCompliance = collisionCompliance;
    this.particles = [];
    this.constraints = [];
    this.grid = new SpatialHash(cellSize);
    this.timeAccumulator = 0;
    this.maxSubstepsPerFrame = 8;
    this.hardDt = 1 / 60;
  }
  addParticle(opts) { const p = new Particle(opts); this.particles.push(p); return this.particles.length - 1; }
  addConstraint(c) { this.constraints.push(c); return this.constraints.length - 1; }
  linkDistanceChain(indices, restLength, stiffness = 1.0, compliance = 0.0) {
    for (let k = 0; k + 1 < indices.length; k++) {
      this.addConstraint(new DistanceConstraint(indices[k], indices[k + 1], restLength, stiffness, compliance));
    }
  }
  clearForces() { for (const p of this.particles) p.f.set(0, 0); }
  applyForces(dt) {
    for (const p of this.particles) {
      if (p.w === 0) continue;
      p.v.x += dt * (p.f.x * p.w + this.gravity.x);
      p.v.y += dt * (p.f.y * p.w + this.gravity.y);
    }
  }
  predictPositions(dt) {
    for (const p of this.particles) {
      p.xp.x = p.x.x + dt * p.v.x;
      p.xp.y = p.x.y + dt * p.v.y;
    }
  }
  buildBroadPhase() {
    this.grid.clear();
    for (let i = 0; i < this.particles.length; i++) {
      this.grid.insert(this.particles[i], i);
    }
  }
  generateContacts() {
    const contacts = [];
    for (let i = 0; i < this.particles.length; i++) {
      const pi = this.particles[i];
      if (!pi || pi.r <= 0) continue;
      const neigh = this.grid.queryNeighbors(pi);
      for (const j of neigh) {
        if (j <= i) continue;
        const pj = this.particles[j];
        if (!pj || pj.r <= 0) continue;
        const dx = pi.xp.x - pj.xp.x, dy = pi.xp.y - pj.xp.y;
        const rsum = (pi.r || 0) + (pj.r || 0);
        if (dx * dx + dy * dy < rsum * rsum) {
          contacts.push(new CircleContactConstraint(i, j, this.collisionCompliance));
        }
      }
    }
    return contacts;
  }
  projectConstraints(dt) {
    const dynamicContacts = this.constraints.concat(this.generateContacts());
    for (let it = 0; it < this.iterations; it++) {
      for (let k = 0; k < dynamicContacts.length; k++) dynamicContacts[k].projectLocal(this, dt);
    }
  }
  updateVelocities(dt) {
    for (const p of this.particles) {
      const vx = (p.xp.x - p.x.x) / dt;
      const vy = (p.xp.y - p.x.y) / dt;
      p.v.set(vx, vy);
      p.x.copy(p.xp);
    }
  }
  step(dt) {
    this.applyForces(dt);
    this.predictPositions(dt);
    this.buildBroadPhase();
    this.projectConstraints(dt);
    this.updateVelocities(dt);
    this.clearForces();
  }
  advance(frameDelta) {
    this.timeAccumulator += frameDelta;
    const dt = this.hardDt;
    let steps = 0;
    while (this.timeAccumulator >= dt && steps < this.maxSubstepsPerFrame) {
      const subDt = dt / this.substeps;
      for (let s = 0; s < this.substeps; s++) this.step(subDt);
      this.timeAccumulator -= dt;
      steps++;
    }
  }
}

export class AVBDWorld {
  constructor(config = {}) { this.solver = new AVBDSolver(config); }
  addParticle(opts) { return this.solver.addParticle(opts); }
  addConstraint(c) { return this.solver.addConstraint(c); }
  addDistance(i, j, rest, stiffness = 1.0, compliance = 0.0) {
    return this.addConstraint(new DistanceConstraint(i, j, rest, stiffness, compliance));
  }
  addPin(i, target, compliance = 0.0) { return this.addConstraint(new PinConstraint(i, target, compliance)); }
  addGround(i, normal = new Vec2(0, -1), height = 0, compliance = 0.0) {
    return this.addConstraint(new HalfSpaceConstraint(i, normal, height, compliance));
  }
  update(dt) { this.solver.advance(dt); }
  get particles() { return this.solver.particles; }
  get constraints() { return this.solver.constraints; }
}
