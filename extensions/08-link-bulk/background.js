import { queueDownloads, nameFromUrl, hostOf, safeName } from "./shared/dlqueue.js";

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.cmd !== "links") return;
  const dir = "Web Media/Fichiers/" + (m.folder ? safeName(m.folder).replace(/^\.+/, "") || hostOf(m.pageUrl) : hostOf(m.pageUrl)) + "/";
  queueDownloads(m.urls.map((u) => ({ url: u, filename: dir + nameFromUrl(u, "fichier") }))).then(() => reply({ ok: true }));
  return true;
});
