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

// ---------- v2 : formats de sortie ----------
export const VIDEO_FORMATS = [
  { v: "mp4", l: "MP4", hint: "universel : téléphone, TV, réseaux" },
  { v: "webm", l: "WEBM", hint: "web, léger (VP9 + Opus)" },
  { v: "mkv", l: "MKV", hint: "garde toutes les pistes" },
  { v: "mov", l: "MOV", hint: "Apple, Final Cut, Premiere" },
  { v: "avi", l: "AVI", hint: "anciens lecteurs et TV" },
  { v: "gif", l: "GIF", hint: "animation 480 px sans son — idéal avec un extrait" },
];
export const AUDIO_FORMATS = [
  { v: "mp3", l: "MP3", hint: "universel, avec pochette" },
  { v: "m4a", l: "M4A", hint: "Apple, sans perte de temps" },
  { v: "aac", l: "AAC", hint: "léger, compatible" },
  { v: "opus", l: "OPUS", hint: "le plus léger à qualité égale" },
  { v: "flac", l: "FLAC", hint: "sans perte" },
  { v: "wav", l: "WAV", hint: "brut, pour le montage" },
];
export const AUDIO_QUALITIES = [
  { v: "0", l: "Meilleure" }, { v: "320K", l: "320 kb/s" }, { v: "192K", l: "192 kb/s" }, { v: "128K", l: "128 kb/s" },
];
export const isAudioFmt = (f) => AUDIO_FORMATS.some((a) => a.v === f);

// Puces de choix du format (vidéo et/ou audio) ; renvoie { get, set }.
export function formatPicker(el, { video = true, audio = true, value = "mp4", onChange } = {}) {
  const group = (title, list) => `<div class="fmtgroup"><span class="mut small">${title}</span><div class="chips">${
    list.map((f) => `<button type="button" class="chip" data-f="${f.v}" title="${esc(f.hint)}">${f.l}</button>`).join("")}</div></div>`;
  el.innerHTML = (video ? group("Vidéo", VIDEO_FORMATS) : "") + (audio ? group(video ? "Audio seul" : "Audio", AUDIO_FORMATS) : "") +
    `<div class="mut small fmthint"></div>`;
  let cur = value;
  const set = (v) => {
    if (!el.querySelector(`[data-f="${v}"]`)) v = el.querySelector("[data-f]").dataset.f;
    cur = v;
    el.querySelectorAll("[data-f]").forEach((b) => b.classList.toggle("on", b.dataset.f === v));
    const f = [...VIDEO_FORMATS, ...AUDIO_FORMATS].find((x) => x.v === v);
    el.querySelector(".fmthint").textContent = f ? f.l + " : " + f.hint : "";
  };
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]");
    if (b) { set(b.dataset.f); onChange?.(cur); }
  });
  set(value);
  return { get: () => cur, set };
}

export function fmtSize(b) {
  if (!b) return "";
  return b > 1e9 ? (b / 1e9).toFixed(1) + " Go" : b > 1e6 ? Math.round(b / 1e6) + " Mo" : Math.max(1, Math.round(b / 1e3)) + " Ko";
}

// Lit la position de lecture de la vidéo principale de l'onglet (pour les extraits).
export async function playbackTime(tabId) {
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        const v = [...document.querySelectorAll("video")].sort((a, b) =>
          (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
        return v && v.duration ? v.currentTime : null;
      },
    });
    const t = res.map((r) => r.result).find((x) => x != null);
    if (t == null) return "";
    const s = Math.floor(t), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s % 60).padStart(2, "0");
  } catch (_) {
    return "";
  }
}

// Carte « Nouveau » affichée une fois après la mise à jour.
export async function whatsNew(items) {
  const version = chrome.runtime.getManifest().version;
  const { seenVersion } = await chrome.storage.local.get("seenVersion");
  if (seenVersion === version || !items?.length) return;
  const card = document.createElement("div");
  card.className = "card news";
  card.innerHTML = `<div class="row"><b class="grow">Nouveau dans la v${esc(version)}</b><button class="mini" title="Compris">✕</button></div>
    <ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  card.querySelector("button").onclick = () => { card.remove(); chrome.storage.local.set({ seenVersion: version }); };
  document.querySelector("main")?.prepend(card);
}
