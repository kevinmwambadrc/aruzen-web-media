import { enqueue } from "./shared/lib.js";
import { queueDownloads, nameFromUrl } from "./shared/dlqueue.js";

const EXT = /\.(mp4|m4v|webm|mov|mkv|mp3|m4a|aac|ogg|oga|opus|wav|flac|m3u8|mpd)(\?|#|$)/i;
// Morceaux de flux et lecteurs à segments : inutiles seuls.
const SKIP = /googlevideo\.com\/videoplayback|\.(ts|m4s|aac\?.*seg)(\?|$)|[?&](range|bytestart)=|\/(seg|frag|chunk)[-_]?\d/i;
const MAX_PER_TAB = 60;

function kindOf(url, ctype) {
  const ext = (url.match(EXT) || [])[1]?.toLowerCase();
  ctype = (ctype || "").toLowerCase();
  if (/mp2t|iso\.segment/.test(ctype)) return null;
  if (ext === "m3u8" || /mpegurl/.test(ctype)) return "HLS";
  if (ext === "mpd" || /dash\+xml/.test(ctype)) return "DASH";
  if (/^video\//.test(ctype) || /^(mp4|m4v|webm|mov|mkv)$/.test(ext)) return "VIDÉO";
  if (/^audio\//.test(ctype) || /^(mp3|m4a|aac|ogg|oga|opus|wav|flac)$/.test(ext)) return "AUDIO";
  return null;
}

let chain = Promise.resolve();
const serial = (fn) => (chain = chain.then(fn, fn));

async function setBadge(tabId, n) {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#f59e0b" });
    await chrome.action.setBadgeText({ tabId, text: n ? String(n) : "" });
  } catch (_) { /* onglet fermé */ }
}

chrome.webRequest.onResponseStarted.addListener((d) => {
  if (d.tabId < 0 || SKIP.test(d.url) || d.statusCode >= 400) return;
  const h = Object.fromEntries((d.responseHeaders || []).map((x) => [x.name.toLowerCase(), x.value]));
  const kind = kindOf(d.url, h["content-type"]);
  if (!kind) return;
  serial(async () => {
    const key = "t" + d.tabId;
    const { [key]: list = [] } = await chrome.storage.session.get(key);
    if (list.some((x) => x.url === d.url) || list.length >= MAX_PER_TAB) return;
    list.push({ url: d.url, kind, size: Number(h["content-length"]) || 0, ts: Date.now() });
    await chrome.storage.session.set({ [key]: list });
    setBadge(d.tabId, list.length);
  });
}, { urls: ["<all_urls>"], types: ["media", "xmlhttprequest", "other", "object"] }, ["responseHeaders"]);

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading" && info.url) serial(async () => {
    await chrome.storage.session.remove("t" + tabId);
    setBadge(tabId, 0);
  });
});
chrome.tabs.onRemoved.addListener((tabId) => serial(() => chrome.storage.session.remove("t" + tabId)));

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.cmd === "grab") {
    const it = m.item;
    if (it.kind === "HLS" || it.kind === "DASH") {
      // Les flux se reconstituent avec yt-dlp + ffmpeg.
      enqueue({ kind: "file", url: it.url, referer: m.pageUrl }).then(reply);
    } else {
      queueDownloads([{ url: it.url, filename: "Web Media/Fichiers/" + nameFromUrl(it.url, "media") }]).then(() => reply({ ok: true }));
    }
    return true;
  }
});
