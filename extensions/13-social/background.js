import { getLibrary, fill } from "./data.js";
import { insertAtCursor } from "./insert.js";

// Menu « Insérer » dans les champs de texte : une entrée par légende et groupe de hashtags.
let menuChain = Promise.resolve();
const buildMenus = () => (menuChain = menuChain.then(rebuild, rebuild));
async function rebuild() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: "studio-img", title: "Envoyer l'image au studio Social", contexts: ["image"] });
  chrome.contextMenus.create({ id: "ins", title: "Insérer (Aruzen Social)", contexts: ["editable"] });
  const { brands, snippets } = await getLibrary();
  for (const b of [...brands.map((x) => x.name), "*"]) {
    const mine = snippets.filter((s) => s.brand === b);
    if (!mine.length) continue;
    const parent = "b:" + b;
    chrome.contextMenus.create({ id: parent, parentId: "ins", title: b === "*" ? "Toutes marques" : b, contexts: ["editable"] });
    for (const s of mine) chrome.contextMenus.create({ id: "s:" + s.id, parentId: parent, title: (s.kind === "hashtags" ? "# " : "✎ ") + s.title, contexts: ["editable"] });
  }
}
chrome.runtime.onInstalled.addListener(buildMenus);
chrome.runtime.onStartup.addListener(buildMenus);
chrome.storage.onChanged.addListener((c, area) => { if (area === "local" && (c.snippets || c.brands)) buildMenus(); });

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "studio-img") {
    await chrome.storage.local.set({ studioImage: { url: info.srcUrl, at: Date.now() } });
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
    return;
  }
  if (!String(info.menuItemId).startsWith("s:")) return;
  const { snippets } = await getLibrary();
  const s = snippets.find((x) => "s:" + x.id === info.menuItemId);
  if (!s) return;
  chrome.scripting.executeScript({
    target: { tabId: tab.id, frameIds: [info.frameId || 0] }, func: insertAtCursor, args: [await fill(s.text)],
  });
});

// Le studio récupère les images du web en blob (évite les canevas « contaminés » à l'export).
chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.cmd === "og") {
    fetch(m.url).then((r) => r.text()).then((html) => {
      const meta = (p) => (html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']+)`, "i"))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${p}["']`, "i")) || [])[1];
      const title = meta("og:title") || (html.match(/<title[^>]*>([^<]*)/i) || [])[1] || "";
      let image = meta("og:image") || meta("twitter:image") || "";
      if (image) image = new URL(image, m.url).href;
      reply({ ok: true, title: title.trim(), description: (meta("og:description") || meta("description") || "").trim(), image, site: new URL(m.url).hostname.replace(/^www\./, "") });
    }, (e) => reply({ ok: false, error: e.message }));
    return true;
  }
});
