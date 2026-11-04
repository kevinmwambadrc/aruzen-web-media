import { queueDownloads, hostOf } from "./shared/dlqueue.js";
import { hdVariants } from "./hd.js";
import { fileName } from "./names.js";

// Un clic sur l'icône ouvre la page de résultats pour l'onglet courant.
const openResults = (tab) => chrome.tabs.create({ url: `results.html?tab=${tab.id}`, index: tab.index + 1 });
chrome.action.onClicked.addListener(openResults);

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "hd-one", title: "Télécharger cette image en HD", contexts: ["image"] });
  chrome.contextMenus.create({ id: "hd-page", title: "Chercher toutes les images HD de la page", contexts: ["page", "image", "link"] });
});

// Cherche, autour de l'image cliquée, les autres tailles déclarées par la page (srcset, data-*, lien parent).
function around(src) {
  const abs = (u) => { try { return new URL(u, location.href).href; } catch (_) { return null; } };
  const img = [...document.images].find((i) => i.currentSrc === src || i.src === src);
  if (!img) return [];
  const out = [];
  const pic = img.closest("picture");
  const sets = [img.srcset, img.dataset.srcset, ...(pic ? [...pic.querySelectorAll("source")].map((s) => s.srcset || s.dataset.srcset) : [])];
  for (const ss of sets) for (const p of String(ss || "").split(/,\s+(?=\S)/)) { const u = abs(p.trim().split(/\s+/)[0]); if (u) out.push(u); }
  for (const a of img.attributes) if (/^data-|zoom|full|large|orig|hires/.test(a.name) && /^(https?:)?\/\/|^\//.test(a.value)) out.push(abs(a.value));
  const link = img.closest("a[href]");
  if (link && /\.(jpe?g|png|webp|avif|gif)(\?|$)/i.test(link.href)) out.push(link.href);
  return out.filter(Boolean);
}

async function measure(url) {
  try {
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok || !/^image\//.test(r.headers.get("content-type") || "image/")) return null;
    const bmp = await createImageBitmap(await r.blob());
    const res = { url, w: bmp.width, h: bmp.height };
    bmp.close();
    return res;
  } catch (_) { return null; }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "hd-page") return openResults(tab);
  if (info.menuItemId !== "hd-one" || !info.srcUrl) return;
  let found = [];
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [info.frameId || 0] }, func: around, args: [info.srcUrl] });
    found = result || [];
  } catch (_) { /* page protégée : on garde l'adresse seule */ }
  const urls = [...new Set([...found.flatMap((u) => [...hdVariants(u), u]), ...hdVariants(info.srcUrl), info.srcUrl])].slice(0, 10);
  chrome.action.setBadgeBackgroundColor({ color: "#0ea5e9" });
  chrome.action.setBadgeText({ text: "…", tabId: tab.id });
  let best = null;
  for (const u of urls) {
    const m = await measure(u);
    if (m && (!best || m.w * m.h > best.w * best.h)) best = m;
  }
  const pick = best || { url: info.srcUrl, w: 0, h: 0 };
  await queueDownloads([{ url: pick.url, filename: `Web Media/Images HD/${hostOf(info.pageUrl)}/${fileName(pick.url)}` }]);
  chrome.action.setBadgeText({ text: pick.w ? String(Math.round(Math.max(pick.w, pick.h) / 100) / 10) + "k" : "✓", tabId: tab.id });
  setTimeout(() => chrome.action.setBadgeText({ text: "", tabId: tab.id }), 4000);
});

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.cmd !== "download") return;
  const dir = `Web Media/Images HD/${hostOf(m.pageUrl)}/`;
  queueDownloads(m.urls.map((u, i) => ({ url: u, filename: dir + fileName(u, i) }))).then(() => reply({ ok: true }));
  return true;
});
