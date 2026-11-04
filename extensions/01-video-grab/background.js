import { enqueue, pickUrl, remember } from "./shared/lib.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "video", title: "Télécharger la vidéo (Aruzen)", contexts: ["page", "link", "video", "frame"] });
});

async function download(url) {
  if (!url) return;
  const { quality = "best", container = "mp4" } = await remember(["quality", "container"]);
  enqueue({ kind: "video", url, quality, container });
}

chrome.contextMenus.onClicked.addListener((info, tab) => download(pickUrl(info, tab)));
chrome.commands.onCommand.addListener((cmd, tab) => cmd === "download-video" && download(pickUrl({}, tab)));
