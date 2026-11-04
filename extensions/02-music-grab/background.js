import { enqueue, pickUrl, remember } from "./shared/lib.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "audio", title: "Télécharger la musique (Aruzen)", contexts: ["page", "link", "video", "audio", "frame"] });
});

async function download(url) {
  if (!url) return;
  const { audio_format = "mp3" } = await remember(["audio_format"]);
  enqueue({ kind: "audio", url, audio_format });
}

chrome.contextMenus.onClicked.addListener((info, tab) => download(pickUrl(info, tab)));
chrome.commands.onCommand.addListener((cmd, tab) => cmd === "download-audio" && download(pickUrl({}, tab)));
