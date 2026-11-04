// Outils communs aux extensions Aruzen Web Media (copiés dans chaque extension par tools/build.py).
export const HOST = "com.aruzen.webmedia";

export function native(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendNativeMessage(HOST, msg, (res) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, native: false, error: "Hôte Aruzen absent : lance install.sh" });
      } else {
        resolve(res || { ok: false, error: "Réponse vide" });
      }
    });
  });
}

export async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export const $ = (sel, root = document) => root.querySelector(sel);

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export const isWebUrl = (u) => /^https?:\/\//i.test(u || "");

export function fmtDur(sec) {
  if (!sec && sec !== 0) return "";
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0");
}

// Lien le plus pertinent d'un clic droit : lien, cadre intégré, page, puis source du média.
export function pickUrl(info = {}, tab) {
  return [info.linkUrl, info.frameUrl, info.pageUrl, info.srcUrl, tab?.url].find(isWebUrl);
}

// Envoie un téléchargement à la file d'attente et l'indique sur l'icône.
export async function enqueue(req) {
  const res = await native({ action: "download", ...req });
  try {
    await chrome.action.setBadgeBackgroundColor({ color: res.ok ? "#16a34a" : "#dc2626" });
    await chrome.action.setBadgeText({ text: res.ok ? "+1" : "!" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2500);
  } catch (_) { /* pas d'icône dans ce contexte */ }
  return res;
}

export function hostMissing(res) {
  return res && res.native === false
    ? `<div class="card err">L'hôte Aruzen n'est pas installé.<br>Lance <b>install.sh</b> dans le dossier « Aruzen Web Media ».</div>`
    : "";
}

// Carte d'aperçu d'un résultat d'analyse yt-dlp.
export function renderProbe(el, r) {
  if (!r) { el.innerHTML = `<div class="mut">Analyse…</div>`; return; }
  if (!r.ok) {
    el.innerHTML = hostMissing(r) || `<div class="mut">Aucun média reconnu sur cette page.</div><div class="err small">${esc(r.error)}</div>`;
    return;
  }
  const meta = [r.uploader, r.playlist ? `${r.count} éléments` : fmtDur(r.duration), r.extractor].filter(Boolean).join(" · ");
  el.innerHTML = `<div class="media">${r.thumbnail ? `<img src="${esc(r.thumbnail)}" alt="">` : `<div class="ph"></div>`}
    <div><div class="title">${esc(r.title)}</div><div class="mut">${esc(meta)}</div></div></div>`;
}

export async function remember(keys) {
  return chrome.storage.local.get(keys);
}

export function persist(obj) {
  return chrome.storage.local.set(obj);
}
