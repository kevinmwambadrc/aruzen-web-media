import { activeTab, $, esc, isWebUrl, remember, persist, whatsNew } from "./shared/lib.js";
import { IMAGE_FORMATS } from "./shared/convert.js";

whatsNew([
  "Filtre par type d'image : JPG, PNG, WEBP, GIF, SVG, AVIF…",
  "Conversion à l'enregistrement : PNG, JPG ou WEBP, qualité réglable",
  "Copie des liens cochés en un clic",
]);

const tab = await activeTab();
let images = [];

// Exécuté dans la page, une seule fois à l'ouverture de la popup.
function collect() {
  const out = new Map();
  const add = (u, w = 0, h = 0) => {
    if (!u || (u.startsWith("data:") && u.length < 300)) return;
    try { u = new URL(u, location.href).href; } catch (_) { return; }
    if (!/^(https?:|data:image\/)/.test(u)) return;
    const p = out.get(u);
    if (!p || w > p.w) out.set(u, { u, w, h });
  };
  const biggest = (srcset) => srcset.split(",").map((s) => s.trim().split(/\s+/))
    .sort((a, b) => (parseFloat(b[1]) || 1) - (parseFloat(a[1]) || 1))[0]?.[0];
  for (const i of document.images) {
    add(i.currentSrc || i.src, i.naturalWidth, i.naturalHeight);
    if (i.srcset) add(biggest(i.srcset));
  }
  for (const s of document.querySelectorAll("source[srcset]")) add(biggest(s.srcset));
  for (const m of document.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]')) add(m.content);
  const all = document.body ? document.body.getElementsByTagName("*") : [];
  for (let k = 0; k < Math.min(all.length, 4000); k++) {
    const bg = getComputedStyle(all[k]).backgroundImage;
    if (bg && bg !== "none") for (const m of bg.matchAll(/url\(["']?(.*?)["']?\)/g)) add(m[1]);
  }
  return [...out.values()].slice(0, 600);
}

if (isWebUrl(tab.url)) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collect });
    images = result || [];
  } catch (_) { images = []; }
}

const typeOf = (u) => u.startsWith("data:") ? (u.match(/^data:image\/(\w+)/)?.[1] || "?").replace("jpeg", "jpg").toUpperCase()
  : ((u.split(/[?#]/)[0].match(/\.(jpe?g|png|gif|webp|avif|svg|bmp|ico)$/i) || [])[1] || "AUTRE").replace(/jpeg/i, "jpg").toUpperCase();
let type = "Tout";
function renderTypes() {
  const counts = {};
  images.forEach((im) => (counts[typeOf(im.u)] = (counts[typeOf(im.u)] || 0) + 1));
  $("#types").innerHTML = ["Tout", ...Object.keys(counts).sort()].map((t) =>
    `<button class="chip ${t === type ? "on" : ""}" data-t="${t}">${t} ${t === "Tout" ? images.length : counts[t]}</button>`).join("");
}
$("#types").onclick = (e) => { const b = e.target.closest(".chip"); if (b) { type = b.dataset.t; renderTypes(); render(); } };

const prefs = await remember(["img_fmt", "img_q"]);
$("#fmt").innerHTML = IMAGE_FORMATS.map((f) => `<option value="${f.v}">${f.l}</option>`).join("");
$("#fmt").value = prefs.img_fmt || "";
$("#q").value = prefs.img_q || "0.95";
const syncQ = () => ($("#qWrap").hidden = !["jpeg", "webp"].includes($("#fmt").value));
$("#fmt").onchange = () => { syncQ(); persist({ img_fmt: $("#fmt").value }); };
$("#q").onchange = () => persist({ img_q: $("#q").value });
syncQ();

function render() {
  const min = Number($("#min").value);
  const shown = images.map((im, i) => ({ ...im, i }))
    .filter((im) => (!im.w || Math.max(im.w, im.h) >= min) && (type === "Tout" || typeOf(im.u) === type));
  $("#count").textContent = shown.length + " image(s)";
  $("#grid").innerHTML = shown.length ? shown.map((im) => `
    <label><img src="${esc(im.u)}" loading="lazy" alt=""><input type="checkbox" data-i="${im.i}">
    ${im.w ? `<span class="dim">${im.w}×${im.h}</span>` : ""}</label>`).join("")
    : `<div class="empty" style="grid-column:1/-1">Aucune image</div>`;
}
$("#min").onchange = render;
$("#all").onchange = () => document.querySelectorAll("#grid input").forEach((c) => (c.checked = $("#all").checked));
const checked = () => [...document.querySelectorAll("#grid input:checked")].map((c) => images[c.dataset.i].u);
$("#copy").onclick = async () => {
  const urls = checked();
  if (!urls.length) return;
  await navigator.clipboard.writeText(urls.join("\n"));
  $("#copy").textContent = "Copié ✓";
};
$("#dl").onclick = async () => {
  const urls = checked();
  if (!urls.length) return;
  const fmt = $("#fmt").value;
  const r = await chrome.runtime.sendMessage({ cmd: "images", urls, pageUrl: tab.url, fmt, quality: Number($("#q").value) });
  $("#dl").textContent = `${urls.length} image(s) en cours ✓`;
  if (r?.converted != null) $("#msg").textContent = `${r.converted} convertie(s) en ${fmt === "jpeg" ? "JPG" : fmt.toUpperCase()}.`;
};
renderTypes();
render();
