import { enqueue, pickUrl, remember, VIDEO_FORMATS, AUDIO_FORMATS, isAudioFmt } from "./shared/lib.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    const contexts = ["page", "link", "video", "frame"];
    chrome.contextMenus.create({ id: "video", title: "Télécharger la vidéo (Aruzen)", contexts });
    chrome.contextMenus.create({ id: "as", title: "Télécharger en…", contexts });
    for (const f of VIDEO_FORMATS) chrome.contextMenus.create({ id: "f:" + f.v, parentId: "as", title: f.l + " — " + f.hint, contexts });
    chrome.contextMenus.create({ id: "sep", parentId: "as", type: "separator", contexts });
    for (const f of AUDIO_FORMATS.slice(0, 3)) chrome.contextMenus.create({ id: "f:" + f.v, parentId: "as", title: "Audio " + f.l, contexts });
  });
});

async function download(url, fmt) {
  if (!url) return;
  const p = await remember(["quality", "container", "vcodec", "audio_quality", "embed_subs"]);
  const f = fmt || p.container || "mp4";
  if (isAudioFmt(f)) return enqueue({ kind: "audio", url, audio_format: f, audio_quality: p.audio_quality || "0" });
  return enqueue({ kind: "video", url, container: f, quality: p.quality || "best", vcodec: p.vcodec || "compat", embed_subs: !!p.embed_subs });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const id = String(info.menuItemId);
  download(pickUrl(info, tab), id.startsWith("f:") ? id.slice(2) : null);
});
chrome.commands.onCommand.addListener((cmd, tab) => cmd === "download-video" && download(pickUrl({}, tab)));
