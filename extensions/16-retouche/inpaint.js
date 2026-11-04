// Remplissage d'après le contenu (worker) : PatchMatch multi-échelle avec vote pondéré (Wexler et al.).
// Entrée : { w, h, rgba (Uint8ClampedArray), mask (Uint8Array, 1 = à effacer) } ; sortie : rgba complété.

const R = 3;                 // demi-côté des patchs (7×7)
const MIN_SIDE = 36;         // taille du niveau le plus grossier

self.onmessage = (e) => {
  const { w, h, rgba, mask } = e.data;
  const out = inpaint(w, h, rgba, mask, (p) => self.postMessage({ progress: p }));
  self.postMessage({ done: true, rgba: out }, [out.buffer]);
};

function toFloat(w, h, rgba) {
  const f = new Float32Array(w * h * 3);
  for (let i = 0, j = 0; i < w * h; i++, j += 4) { f[i * 3] = rgba[j]; f[i * 3 + 1] = rgba[j + 1]; f[i * 3 + 2] = rgba[j + 2]; }
  return f;
}

function down(L) {
  const w = Math.max(1, L.w >> 1), h = Math.max(1, L.h >> 1);
  const img = new Float32Array(w * h * 3), mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, n = 0, m = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const sx = Math.min(L.w - 1, 2 * x + dx), sy = Math.min(L.h - 1, 2 * y + dy), s = sy * L.w + sx;
      if (L.mask[s]) { m = 1; continue; }
      r += L.img[s * 3]; g += L.img[s * 3 + 1]; b += L.img[s * 3 + 2]; n++;
    }
    const d = y * w + x;
    mask[d] = m;
    if (n) { img[d * 3] = r / n; img[d * 3 + 1] = g / n; img[d * 3 + 2] = b / n; }
  }
  return { w, h, img, mask };
}

// Remplissage initial du niveau grossier : on « pèle » le trou depuis ses bords.
function diffuse(L) {
  const { w, h, img } = L;
  const known = Uint8Array.from(L.mask, (m) => 1 - m);
  let left = known.reduce((a, k) => a + (1 - k), 0), guard = 0;
  while (left > 0 && guard++ < w + h) {
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (known[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const j = Y * w + X;
        if (known[j]) { r += img[j * 3]; g += img[j * 3 + 1]; b += img[j * 3 + 2]; n++; }
      }
      if (n) add.push([i, r / n, g / n, b / n]);
    }
    for (const [i, r, g, b] of add) { img[i * 3] = r; img[i * 3 + 1] = g; img[i * 3 + 2] = b; known[i] = 1; left--; }
    if (!add.length) break;
  }
}

function inpaint(W, H, rgba, mask0, progress) {
  const levels = [{ w: W, h: H, img: toFloat(W, H, rgba), mask: mask0 }];
  while (Math.min(levels.at(-1).w, levels.at(-1).h) > MIN_SIDE * 2 && levels.length < 8) levels.push(down(levels.at(-1)));
  diffuse(levels.at(-1));

  let nnf = null, prev = null;
  const steps = levels.length;
  for (let li = steps - 1; li >= 0; li--) {
    const L = levels[li];
    if (prev) {
      // L'image grossière complétée sert de départ dans le trou du niveau plus fin.
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
        const i = y * L.w + x;
        if (!L.mask[i]) continue;
        const j = Math.min(prev.h - 1, y >> 1) * prev.w + Math.min(prev.w - 1, x >> 1);
        L.img[i * 3] = prev.img[j * 3]; L.img[i * 3 + 1] = prev.img[j * 3 + 1]; L.img[i * 3 + 2] = prev.img[j * 3 + 2];
      }
    }
    nnf = solveLevel(L, nnf, prev, li === 0 ? 3 : Math.min(7, 3 + li), li === 0);
    prev = L;
    progress(Math.round(((steps - li) / steps) * 100));
  }
  const out = new Uint8ClampedArray(rgba);
  const img = levels[0].img;
  for (let i = 0; i < W * H; i++) if (mask0[i]) { out[i * 4] = img[i * 3]; out[i * 4 + 1] = img[i * 3 + 1]; out[i * 4 + 2] = img[i * 3 + 2]; out[i * 4 + 3] = 255; }
  return out;
}

function solveLevel(L, coarseNnf, coarse, iters, finest) {
  const { w, h, img, mask } = L;
  // Zone cible : pixels dont le patch touche le trou ; sources : patchs entièrement connus.
  const near = new Uint8Array(w * h), valid = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!mask[y * w + x]) continue;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < w && Y < h) near[Y * w + X] = 1;
    }
  }
  const sources = [];
  for (let y = R; y < h - R; y++) for (let x = R; x < w - R; x++) if (!near[y * w + x]) { valid[y * w + x] = 1; sources.push(y * w + x); }
  if (!sources.length) return null; // rien à copier (trou trop grand pour ce niveau)
  const targets = [];
  for (let i = 0; i < w * h; i++) if (near[i]) targets.push(i);

  const nnf = new Int32Array(w * h).fill(-1);
  const cost = new Float64Array(w * h);
  const rnd = () => sources[(Math.random() * sources.length) | 0];
  for (const p of targets) {
    let q = -1;
    if (coarseNnf && coarse) {
      const px = p % w, py = (p / w) | 0;
      const cp = Math.min(coarse.h - 1, py >> 1) * coarse.w + Math.min(coarse.w - 1, px >> 1);
      const cq = coarseNnf[cp];
      if (cq >= 0) {
        const qx = 2 * (cq % coarse.w) + (px & 1), qy = 2 * ((cq / coarse.w) | 0) + (py & 1);
        if (qx < w && qy < h && valid[qy * w + qx]) q = qy * w + qx;
      }
    }
    nnf[p] = q >= 0 ? q : rnd();
  }

  const dist = (p, q, limit) => {
    const px = p % w, py = (p / w) | 0, qx = q % w, qy = (q / w) | 0;
    let d = 0;
    for (let dy = -R; dy <= R; dy++) {
      const Y = py + dy;
      if (Y < 0 || Y >= h) continue;
      for (let dx = -R; dx <= R; dx++) {
        const X = px + dx;
        if (X < 0 || X >= w) continue;
        const a = (Y * w + X) * 3, b = ((qy + dy) * w + qx + dx) * 3;
        const r = img[a] - img[b], g = img[a + 1] - img[b + 1], bl = img[a + 2] - img[b + 2];
        d += r * r + g * g + bl * bl;
      }
      if (d > limit) return d;
    }
    return d;
  };

  // Départ du niveau fin : chaque pixel du trou reprend le pixel source indiqué par la correspondance
  // héritée du niveau grossier. Le grain de la photo est ainsi présent dès le départ (sinon tout converge vers le flou).
  if (coarseNnf) for (const p of targets) if (mask[p]) { const q = nnf[p] * 3; img[p * 3] = img[q]; img[p * 3 + 1] = img[q + 1]; img[p * 3 + 2] = img[q + 2]; }

  const acc = new Float64Array(w * h * 4);
  for (let it = 0; it < iters; it++) {
    for (const p of targets) cost[p] = dist(p, nnf[p], Infinity);
    for (let pass = 0; pass < 2; pass++) {
      const order = (it + pass) % 2 ? targets.slice().reverse() : targets, s = (it + pass) % 2 ? 1 : -1;
      for (const p of order) {
        const px = p % w;
        // Propagation : le voisin déjà traité propose son correspondant décalé.
        for (const [np, off, row] of [[p + s, -s, true], [p + s * w, -s * w, false]]) {
          if (np < 0 || np >= w * h || nnf[np] < 0 || (row && ((np % w) - px) !== s)) continue;
          const q = nnf[np] + off;
          if (q >= 0 && q < w * h && valid[q] && q !== nnf[p]) {
            const d = dist(p, q, cost[p]);
            if (d < cost[p]) { cost[p] = d; nnf[p] = q; }
          }
        }
        // Recherche aléatoire autour du meilleur candidat, rayon divisé par deux à chaque essai.
        const bx = nnf[p] % w, by = (nnf[p] / w) | 0;
        for (let rad = Math.max(w, h); rad >= 1; rad >>= 1) {
          const x = Math.round(bx + (Math.random() * 2 - 1) * rad), y = Math.round(by + (Math.random() * 2 - 1) * rad);
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const q = y * w + x;
          if (!valid[q]) continue;
          const d = dist(p, q, cost[p]);
          if (d < cost[p]) { cost[p] = d; nnf[p] = q; }
        }
      }
    }
    if (finest && it === iters - 1) { pickBest(L, targets, nnf, cost); break; }
    // Vote : chaque pixel du trou devient la moyenne pondérée des patchs qui le recouvrent.
    acc.fill(0);
    const N = (2 * R + 1) ** 2 * 3;
    const sorted = targets.map((p) => cost[p] / N).sort((x, y) => x - y);
    const s2 = Math.max(4, sorted[(sorted.length * 0.25) | 0] || 0); // 25e centile : vote serré, sans flou
    for (const p of targets) {
      const q = nnf[p], wgt = Math.exp(-cost[p] / N / (2 * s2)) + 1e-9;
      const px = p % w, py = (p / w) | 0, qx = q % w, qy = (q / w) | 0;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const X = px + dx, Y = py + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const t = Y * w + X;
        if (!mask[t]) continue;
        const sI = ((qy + dy) * w + qx + dx) * 3;
        acc[t * 4] += img[sI] * wgt; acc[t * 4 + 1] += img[sI + 1] * wgt; acc[t * 4 + 2] += img[sI + 2] * wgt; acc[t * 4 + 3] += wgt;
      }
    }
    for (let t = 0; t < w * h; t++) if (mask[t] && acc[t * 4 + 3] > 0) {
      img[t * 3] = acc[t * 4] / acc[t * 4 + 3]; img[t * 3 + 1] = acc[t * 4 + 1] / acc[t * 4 + 3]; img[t * 3 + 2] = acc[t * 4 + 2] / acc[t * 4 + 3];
    }
  }
  return nnf;
}

// Dernière passe du niveau le plus fin : chaque pixel prend la valeur du patch qui lui ressemble le plus
// (la moyenne de tous les patchs lisserait le grain de la photo).
function pickBest(L, targets, nnf, cost) {
  const { w, h, img, mask } = L;
  const best = new Float64Array(w * h).fill(Infinity), src = new Int32Array(w * h).fill(-1);
  for (const p of targets) {
    const q = nnf[p], c = cost[p], px = p % w, py = (p / w) | 0, qx = q % w, qy = (q / w) | 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const X = px + dx, Y = py + dy;
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      const t = Y * w + X;
      // À coût égal, le patch centré le plus près du pixel l'emporte.
      const k = c * (1 + 0.02 * (Math.abs(dx) + Math.abs(dy)));
      if (mask[t] && k < best[t]) { best[t] = k; src[t] = (qy + dy) * w + qx + dx; }
    }
  }
  for (let t = 0; t < w * h; t++) if (src[t] >= 0) { const sI = src[t] * 3; img[t * 3] = img[sI]; img[t * 3 + 1] = img[sI + 1]; img[t * 3 + 2] = img[sI + 2]; }
}
