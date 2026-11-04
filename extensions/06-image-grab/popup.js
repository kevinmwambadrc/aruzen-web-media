import { activeTab, $, esc, isWebUrl } from "./shared/lib.js";

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

function render() {
  const min = Number($("#min").value);
  const shown = images.map((im, i) => ({ ...im, i })).filter((im) => !im.w || Math.max(im.w, im.h) >= min);
  $("#count").textContent = shown.length + " image(s)";
  $("#grid").innerHTML = shown.length ? shown.map((im) => `
    <label><img src="${esc(im.u)}" loading="lazy" alt=""><input type="checkbox" data-i="${im.i}">
    ${im.w ? `<span class="dim">${im.w}×${im.h}</span>` : ""}</label>`).join("")
    : `<div class="empty" style="grid-column:1/-1">Aucune image</div>`;
}
$("#min").onchange = render;
$("#all").onchange = () => document.querySelectorAll("#grid input").forEach((c) => (c.checked = $("#all").checked));
$("#dl").onclick = async () => {
  const urls = [...document.querySelectorAll("#grid input:checked")].map((c) => images[c.dataset.i].u);
  if (!urls.length) return;
  await chrome.runtime.sendMessage({ cmd: "images", urls, pageUrl: tab.url });
  $("#dl").textContent = `${urls.length} image(s) en cours ✓`;
};
render();
