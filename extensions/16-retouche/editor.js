const $ = (s) => document.querySelector(s);
const img = $("#img"), mask = $("#mask"), cur = $("#cursor");
const ictx = img.getContext("2d", { willReadFrequently: true }), mctx = mask.getContext("2d", { willReadFrequently: true }), cctx = cur.getContext("2d");
const MASK_COLOR = "#ff2d55";
let W = 0, H = 0, name = "image", original = null, tool = "brush", busy = false;
const history = [];

// ---------- ouverture ----------
async function openBlob(blob, label) {
  const bmp = await createImageBitmap(blob);
  W = bmp.width; H = bmp.height;
  for (const c of [img, mask, cur]) { c.width = W; c.height = H; }
  ictx.drawImage(bmp, 0, 0);
  bmp.close();
  original = ictx.getImageData(0, 0, W, H);
  history.length = 0;
  name = (label || "image").replace(/\.[a-z0-9]+$/i, "").replace(/[\\/:*?"<>|]+/g, " ").slice(0, 80) || "image";
  $("#size").value = Math.max(6, Math.min(200, Math.round(Math.max(W, H) / 60)));
  $("#wrap").hidden = false;
  $("#save").disabled = false;
  fit();
  sync();
  status(`${W} × ${H} px. Peins la zone à effacer.`);
}
async function openUrl(url) {
  status("Chargement de l'image…");
  try {
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    let label = "image";
    try { label = decodeURIComponent(new URL(url).pathname.split("/").pop()) || label; } catch (_) { /* adresse illisible */ }
    await openBlob(await r.blob(), label);
  } catch (e) {
    status("Impossible d'ouvrir cette image (" + e.message + "). Enregistre-la puis glisse le fichier ici.");
  }
}
$("#file").onchange = (e) => { const f = e.target.files[0]; if (f) openBlob(f, f.name); };
addEventListener("paste", (e) => { const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/")); if (f) openBlob(f, "collage"); });
const stage = $("#stage");
stage.ondragover = (e) => { e.preventDefault(); stage.classList.add("over"); };
stage.ondragleave = () => stage.classList.remove("over");
stage.ondrop = (e) => {
  e.preventDefault();
  stage.classList.remove("over");
  const f = e.dataTransfer.files[0];
  if (f) return openBlob(f, f.name);
  const u = e.dataTransfer.getData("text/uri-list");
  if (/^https?:/.test(u)) openUrl(u);
};

// ---------- affichage ----------
function fit() {
  if (!W) return;
  const z = $("#zoom").value;
  const box = stage.getBoundingClientRect();
  const scale = z === "fit" ? Math.min(1, (box.width - 32) / W, (box.height - 32) / H) : Number(z);
  Object.assign($("#wrap").style, { width: W * scale + "px", height: H * scale + "px" });
}
addEventListener("resize", fit);
$("#zoom").onchange = fit;
const status = (t) => ($("#status").textContent = t);
const hasMask = () => { const d = mctx.getImageData(0, 0, W, H).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return true; return false; };
function sync() {
  $("#undo").disabled = !history.length || busy;
  $("#apply").disabled = busy || !W;
  $("#sizeV").textContent = $("#size").value + " px";
}
$("#size").oninput = sync;

// ---------- sélection ----------
document.querySelector("#tools").onclick = (e) => { const b = e.target.closest("button"); if (b) setTool(b.dataset.t); };
function setTool(t) { tool = t; document.querySelectorAll("#tools button").forEach((b) => b.classList.toggle("on", b.dataset.t === t)); }
const pos = (e) => { const r = mask.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
let drag = null;
function stroke(a, b) {
  const s = Number($("#size").value);
  mctx.globalCompositeOperation = tool === "erase" ? "destination-out" : "source-over";
  mctx.strokeStyle = mctx.fillStyle = MASK_COLOR;
  mctx.lineWidth = s; mctx.lineCap = mctx.lineJoin = "round";
  mctx.beginPath(); mctx.moveTo(...a); mctx.lineTo(...b); mctx.stroke();
}
function drawCursor(p, rectFrom) {
  cctx.clearRect(0, 0, W, H);
  const k = W / mask.getBoundingClientRect().width;
  cctx.lineWidth = 1.5 * k;
  if (rectFrom) {
    cctx.setLineDash([6 * k, 4 * k]); cctx.strokeStyle = MASK_COLOR;
    cctx.strokeRect(rectFrom[0], rectFrom[1], p[0] - rectFrom[0], p[1] - rectFrom[1]);
    cctx.setLineDash([]);
  } else if (p && tool !== "rect") {
    const r = Number($("#size").value) / 2;
    cctx.strokeStyle = "#fff"; cctx.beginPath(); cctx.arc(p[0], p[1], r, 0, 7); cctx.stroke();
    cctx.strokeStyle = "#000"; cctx.beginPath(); cctx.arc(p[0], p[1], r + k, 0, 7); cctx.stroke();
  } else if (p) {
    cctx.strokeStyle = MASK_COLOR; cctx.beginPath(); cctx.moveTo(p[0] - 8 * k, p[1]); cctx.lineTo(p[0] + 8 * k, p[1]); cctx.moveTo(p[0], p[1] - 8 * k); cctx.lineTo(p[0], p[1] + 8 * k); cctx.stroke();
  }
}
mask.onpointerdown = (e) => {
  if (busy || !W) return;
  mask.setPointerCapture(e.pointerId);
  const p = pos(e);
  drag = { from: p, last: p };
  if (tool !== "rect") stroke(p, p);
};
mask.onpointermove = (e) => {
  const p = pos(e);
  if (drag && tool !== "rect") { stroke(drag.last, p); drag.last = p; }
  drawCursor(p, drag && tool === "rect" ? drag.from : null);
};
mask.onpointerup = (e) => {
  if (drag && tool === "rect") {
    const [x0, y0] = drag.from, [x1, y1] = pos(e);
    mctx.globalCompositeOperation = "source-over"; mctx.fillStyle = MASK_COLOR;
    mctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  }
  drag = null;
  drawCursor(pos(e));
};
mask.onpointerleave = () => { if (!drag) cctx.clearRect(0, 0, W, H); };
$("#clearMask").onclick = () => mctx.clearRect(0, 0, W, H);

// ---------- effacement ----------
const worker = new Worker("inpaint.js");
function runWorker(job) {
  return new Promise((resolve) => {
    worker.onmessage = (e) => {
      if (e.data.progress != null) status(`Reconstitution de la zone… ${e.data.progress} %`);
      if (e.data.done) resolve(e.data.rgba);
    };
    worker.postMessage(job, [job.rgba.buffer, job.mask.buffer]);
  });
}
async function apply() {
  if (busy || !W) return;
  const m = mctx.getImageData(0, 0, W, H).data;
  // Zone à traiter : la sélection agrandie de 2 px (bords lissés du filigrane), plus une marge de contexte.
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[(y * W + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return status("Peins d'abord la zone à effacer.");
  const margin = Math.max(48, Math.round(Math.max(x1 - x0, y1 - y0) * 0.9));
  const cx = Math.max(0, x0 - margin), cy = Math.max(0, y0 - margin);
  const cw = Math.min(W, x1 + margin + 1) - cx, ch = Math.min(H, y1 + margin + 1) - cy;
  const cm = new Uint8Array(cw * ch), grow = 2;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    if (m[((y + cy) * W + x + cx) * 4 + 3] <= 10) continue;
    for (let dy = -grow; dy <= grow; dy++) for (let dx = -grow; dx <= grow; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < cw && Y < ch) cm[Y * cw + X] = 1;
    }
  }
  busy = true; $("#wrap").classList.add("busy"); sync();
  history.push(ictx.getImageData(0, 0, W, H));
  if (history.length > 15) history.shift();
  const t0 = performance.now();
  const crop = ictx.getImageData(cx, cy, cw, ch);
  const out = await runWorker({ w: cw, h: ch, rgba: new Uint8ClampedArray(crop.data), mask: cm });
  ictx.putImageData(new ImageData(out, cw, ch), cx, cy);
  mctx.clearRect(0, 0, W, H);
  busy = false; $("#wrap").classList.remove("busy"); sync();
  status(`Zone effacée en ${((performance.now() - t0) / 1000).toFixed(1)} s. Si une trace reste, repeins-la et recommence ; ⌘Z pour annuler.`);
}
$("#apply").onclick = apply;
$("#undo").onclick = () => { const s = history.pop(); if (s) ictx.putImageData(s, 0, 0); sync(); };

// Avant / après : maintenir le bouton (ou la touche A) affiche l'original.
let saved = null;
const showOriginal = (on) => {
  if (!original || busy) return;
  if (on && !saved) { saved = ictx.getImageData(0, 0, W, H); ictx.putImageData(original, 0, 0); }
  if (!on && saved) { ictx.putImageData(saved, 0, 0); saved = null; }
};
$("#compare").onpointerdown = () => showOriginal(true);
$("#compare").onpointerup = $("#compare").onpointerleave = () => showOriginal(false);

// ---------- enregistrement ----------
$("#save").onclick = async () => {
  const fmt = $("#fmt").value;
  const blob = await new Promise((r) => img.toBlob(r, "image/" + fmt, 0.95));
  const url = URL.createObjectURL(blob);
  await chrome.downloads.download({ url, filename: `Web Media/Retouches/${name} retouche.${fmt === "jpeg" ? "jpg" : fmt}`, conflictAction: "uniquify" });
  status("Enregistrée dans Téléchargements › Web Media › Retouches.");
};

// ---------- raccourcis ----------
addEventListener("keydown", (e) => {
  if (e.target.matches("input,select")) return;
  if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); $("#undo").click(); }
  else if (e.key === "Enter") apply();
  else if (e.key === "b") setTool("brush");
  else if (e.key === "r") setTool("rect");
  else if (e.key === "e") setTool("erase");
  else if (e.key === "a") showOriginal(true);
  else if (e.key === "[" || e.key === "]") { $("#size").value = Number($("#size").value) * (e.key === "]" ? 1.25 : 0.8); sync(); }
});
addEventListener("keyup", (e) => { if (e.key === "a") showOriginal(false); });

// Image envoyée par clic droit.
const { pending } = await chrome.storage.session.get("pending");
if (pending) { await chrome.storage.session.remove("pending"); openUrl(pending.url); }
sync();
