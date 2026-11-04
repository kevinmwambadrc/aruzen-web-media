import { queueDownloads, nameFromUrl, hostOf } from "./shared/dlqueue.js";

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.cmd !== "images") return;
  const dir = "Web Media/Images/" + hostOf(m.pageUrl) + "/";
  const items = m.urls.map((u, i) => {
    let name = u.startsWith("data:") ? "image-" + (i + 1) : nameFromUrl(u, "image-" + (i + 1));
    if (!/\.(jpe?g|png|gif|webp|avif|svg|bmp|ico)$/i.test(name)) {
      const ext = (u.match(/^data:image\/(\w+)/) || u.match(/\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i) || [])[1] || "jpg";
      name += "." + ext.replace("svg+xml", "svg");
    }
    return { url: u, filename: dir + name };
  });
  queueDownloads(items).then(() => reply({ ok: true }));
  return true;
});
