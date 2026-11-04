import { collect } from "./collect.js";
import { hdVariants, identity } from "./hd.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const tabId = Number(new URLSearchParams(location.search).get("tab"));
let page = "", items = [];

// ---------- 1. relevé dans la page ----------
async function scan() {
  const frames = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: collect });
  const top = frames.find((f) => f.frameId === 0)?.result || frames[0]?.result || {};
  page = top.page || "";
  $("#page").textContent = top.title || page;
  document.title = "Image HD · " + (top.title || "page");
  // Regroupe les différentes tailles d'une même image.
  const byKey = new Map();
  for (const g of frames.flatMap((f) => f.result?.groups || [])) {
    const ranked = [...g.cands].sort((a, b) => b.w - a.w);
    const key = identity(ranked[0]?.u || g.shown);
    const cur = byKey.get(key);
    if (!cur) byKey.set(key, { ...g, cands: ranked });
    else {
      cur.cands.push(...ranked);
      if (cur.loose && !g.loose) Object.assign(cur, { shown: g.shown, loose: false });
      if (g.w > cur.w) Object.assign(cur, { w: g.w, h: g.h });
    }
  }
  // Les adresses trouvées seulement dans le code passent après les images visibles (et 300 au plus).
  const groups = [...byKey.values()].filter((g) => !/\.svg(\?|$)/i.test(g.shown));
  const ordered = [...groups.filter((g) => !g.loose), ...groups.filter((g) => g.loose).slice(0, 300)];
  items = ordered.map((g) => {
    const raw = [...new Map(g.cands.map((c) => [c.u, c])).values()].sort((a, b) => b.w - a.w);
    const urls = [...new Set([...raw.flatMap((c) => hdVariants(c.u)), ...raw.map((c) => c.u)])].slice(0, 8);
    const from = new Map(raw.map((c) => [c.u, c.from]));
    return { shown: g.shown, w: g.w, h: g.h, urls, from, best: null, done: false, sel: false };
  });
}

// ---------- 2. vérification des versions HD ----------
const cache = new Map();
function measure(url) {
  if (!cache.has(url)) {
    cache.set(url, new Promise((resolve) => {
      const im = new Image();
      const t = setTimeout(() => { im.src = ""; resolve(null); }, 20000);
      im.onload = () => { clearTimeout(t); resolve(im.naturalWidth > 1 ? { url, w: im.naturalWidth, h: im.naturalHeight } : null); };
      im.onerror = () => { clearTimeout(t); resolve(null); };
      im.referrerPolicy = "no-referrer";
      im.src = url;
    }));
  }
  return cache.get(url);
}

async function resolveItem(it) {
  const base = it.w ? { url: it.shown, w: it.w, h: it.h } : await measure(it.shown);
  it.base = base;
  let best = base;
  if (base && Math.max(base.w, base.h) < 48) { it.best = base; it.done = true; return; } // icône : inutile de chercher
  for (const u of it.urls) {
    const m = await measure(u);
    if (m && (!best || m.w * m.h > best.w * best.h)) best = m;
  }
  it.best = best;
  it.done = true;
}

async function verifyAll() {
  let done = 0, next = 0;
  const total = items.length;
  const progress = () => {
    $("#bar").style.width = (total ? (done / total) * 100 : 100) + "%";
    const better = items.filter(improved).length;
    $("#msg").textContent = done < total ? `Recherche des versions HD… ${done} / ${total}` : `${total} image(s) trouvée(s), dont ${better} en meilleure qualité que sur la page.`;
  };
  progress();
  const worker = async () => {
    while (next < items.length) {
      const it = items[next++];
      await resolveItem(it);
      done++;
      progress();
      renderSoon();
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
}

// ---------- 3. affichage ----------
const improved = (it) => it.best && it.base && it.best.url !== it.base.url && it.best.w * it.best.h > it.base.w * it.base.h * 1.15;
const visible = (it) => {
  const min = Number($("#min").value);
  const ref = it.best || it.base;
  if (it.done && !ref) return false; // image inaccessible
  if (ref && Math.max(ref.w, ref.h) < min) return false;
  if ($("#onlyHd").checked && !improved(it)) return false;
  return true;
};

let raf = 0;
const renderSoon = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); };
function render() {
  const shown = items.map((it, i) => [it, i]).filter(([it]) => visible(it));
  $("#grid").innerHTML = shown.map(([it, i]) => {
    const b = it.best, a = it.base;
    const badge = !it.done ? `<span class="badge wait">…</span>` : improved(it) ? `<span class="badge">HD ×${((b.w * b.h) / (a.w * a.h)).toFixed(1)}</span>` : `<span class="badge same">Déjà max.</span>`;
    const dims = !it.done ? "Vérification…" : improved(it) ? `<span class="mut">${a.w}×${a.h} →</span> <b>${b.w}×${b.h}</b>` : b ? `<b>${b.w}×${b.h}</b>` : "";
    const how = b && it.from.get(b.url) ? it.from.get(b.url) : improved(it) ? "règle du site" : "affichée";
    return `<div class="card ${it.sel ? "sel" : ""}" data-i="${i}">
      <div class="thumb" data-act="toggle"><img src="${esc((b || a)?.url || it.shown)}" loading="lazy" alt="" referrerpolicy="no-referrer">
        <input type="checkbox" ${it.sel ? "checked" : ""} data-act="toggle">${badge}</div>
      <div class="info"><div class="dims">${dims}</div><div class="src" title="${esc(b?.url || it.shown)}">Source : ${esc(how)}</div>
        <div class="acts"><button data-act="open">Ouvrir ↗</button><button data-act="copy">Copier le lien</button><button data-act="one">Télécharger</button></div></div>
    </div>`;
  }).join("") || `<div class="empty">${items.length ? "Aucune image avec ces filtres." : "Aucune image trouvée sur cette page."}</div>`;
  const n = items.filter((it) => it.sel && visible(it)).length;
  $("#dl").disabled = !n;
  $("#dl").textContent = n ? `Télécharger ${n} image(s) HD` : "Télécharger";
}

const download = async (list) => {
  await chrome.runtime.sendMessage({ cmd: "download", pageUrl: page, urls: list.map((it) => (it.best || it.base || { url: it.shown }).url) });
};
$("#grid").onclick = async (e) => {
  const act = e.target.closest("[data-act]")?.dataset.act, card = e.target.closest(".card");
  if (!act || !card) return;
  const it = items[card.dataset.i];
  const url = (it.best || it.base || { url: it.shown }).url;
  if (act === "toggle") { it.sel = !it.sel; render(); }
  if (act === "open") chrome.tabs.create({ url, active: false });
  if (act === "copy") { await navigator.clipboard.writeText(url); e.target.textContent = "Copié ✓"; }
  if (act === "one") { await download([it]); e.target.textContent = "Envoyé ✓"; }
};
$("#min").onchange = $("#onlyHd").onchange = render;
$("#all").onchange = () => { items.filter(visible).forEach((it) => (it.sel = $("#all").checked)); render(); };
$("#dl").onclick = async () => {
  const list = items.filter((it) => it.sel && visible(it));
  await download(list);
  $("#msg").textContent = `${list.length} image(s) envoyée(s) dans Téléchargements › Web Media › Images HD.`;
};

try {
  if (!tabId) throw new Error("onglet inconnu");
  await scan();
  render();
  await verifyAll();
} catch (e) {
  $("#msg").textContent = "Impossible d'analyser cette page (" + e.message + "). Les pages internes du navigateur et le Chrome Web Store sont protégés.";
}
