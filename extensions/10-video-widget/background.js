import { enqueue } from "./shared/lib.js";

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.cmd !== "dl") return;
  chrome.storage.local.get({ quality: "best" }).then(({ quality }) =>
    enqueue({ kind: m.kind, url: m.url, quality }).then(reply));
  return true;
});
