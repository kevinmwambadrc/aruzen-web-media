import { queueDownloads, nameFromUrl, hostOf } from "./shared/dlqueue.js";

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.cmd !== "links") return;
  const dir = "Web Media/Fichiers/" + hostOf(m.pageUrl) + "/";
  queueDownloads(m.urls.map((u) => ({ url: u, filename: dir + nameFromUrl(u, "fichier") }))).then(() => reply({ ok: true }));
  return true;
});
