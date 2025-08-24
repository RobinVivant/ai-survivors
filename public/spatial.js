export function buildSpatialHash(entities, cellSize = 64) {
  const buckets = new Map();
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    const cx = Math.floor(e.x / cellSize);
    const cy = Math.floor(e.y / cellSize);
    const key = cx + ',' + cy;
    let arr = buckets.get(key);
    if (!arr) {
      arr = [];
      buckets.set(key, arr);
    }
    arr.push(e);
  }
  return {cellSize, buckets};
}

export function querySpatialHash(hash, x, y, radius = 0) {
  const {cellSize, buckets} = hash;
  const i0 = Math.floor((x - radius) / cellSize);
  const i1 = Math.floor((x + radius) / cellSize);
  const j0 = Math.floor((y - radius) / cellSize);
  const j1 = Math.floor((y + radius) / cellSize);
  const out = [];
  const seen = new Set();
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const key = i + ',' + j;
      const arr = buckets.get(key);
      if (!arr) continue;
      for (let k = 0; k < arr.length; k++) {
        const e = arr[k];
        if (!seen.has(e)) {
          seen.add(e);
          out.push(e);
        }
      }
    }
  }
  return out;
}
