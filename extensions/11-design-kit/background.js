import { addItem, activeBoard } from "./db.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "mb-img", title: "Ajouter au moodboard", contexts: ["image"] });
  chrome.contextMenus.create({ id: "mb-page", title: "Capturer la page dans le moodboard", contexts: ["page"] });
});

async function flash(ok) {
  await chrome.action.setBadgeBackgroundColor({ color: ok ? "#16a34a" : "#dc2626" });
  await chrome.action.setBadgeText({ text: ok ? "+1" : "!" });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2000);
}

// Pinterest affiche des vignettes : on tente l'original, puis la version 736 px.
function candidates(url) {
  if (/i\.pinimg\.com\/\d+x/.test(url)) return [url.replace(/\/\d+x(\d+)?\//, "/originals/"), url.replace(/\/\d+x(\d+)?\//, "/736x/"), url];
  return [url];
}

async function fetchImage(url) {
  for (const u of candidates(url)) {
    try {
      const res = await fetch(u);
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) continue;
      return { blob, src: u };
    } catch (_) { /* suivant */ }
  }
  throw new Error("Image inaccessible");
}

async function dims(blob) {
  try {
    const bmp = await createImageBitmap(blob);
    const d = { w: bmp.width, h: bmp.height };
    bmp.close();
    return d;
  } catch (_) {
    return { w: 0, h: 0 }; // SVG
  }
}

export async function addImage(url, page, title) {
  const { blob, src } = await fetchImage(url);
  const board = await activeBoard();
  await addItem({ board: board.id, blob, src, page, title, ...(await dims(blob)) });
}

async function addScreenshot(tab) {
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  const blob = await (await fetch(dataUrl)).blob();
  const board = await activeBoard();
  await addItem({ board: board.id, blob, src: tab.url, page: tab.url, title: tab.title, ...(await dims(blob)) });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === "mb-img") await addImage(info.srcUrl, info.pageUrl, tab?.title);
    if (info.menuItemId === "mb-page") await addScreenshot(tab);
    flash(true);
  } catch (_) {
    flash(false);
  }
});

// ---------- captures responsive (pleine page, plusieurs largeurs) ----------

async function ensureOffscreen() {
  const ctx = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (!ctx.length) await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["BLOBS"], justification: "Créer les captures" });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function responsive({ tabId, url, widths, retina }) {
  const target = { tabId };
  const host = new URL(url).hostname.replace(/^www\./, "");
  await chrome.debugger.attach(target, "1.3");
  try {
    await ensureOffscreen();
    for (const w of widths) {
      await chrome.debugger.sendCommand(target, "Emulation.setDeviceMetricsOverride",
        { width: w, height: 900, deviceScaleFactor: retina ? 2 : 1, mobile: w < 800 });
      await wait(900);
      const m = await chrome.debugger.sendCommand(target, "Page.getLayoutMetrics");
      const h = Math.min(Math.ceil((m.cssContentSize || m.contentSize).height), 14000);
      const { data } = await chrome.debugger.sendCommand(target, "Page.captureScreenshot",
        { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
      const { url: blobUrl } = await chrome.runtime.sendMessage({ target: "offscreen", cmd: "blob", data, type: "image/png" });
      await chrome.downloads.download({ url: blobUrl, filename: `Web Media/Captures/${host}/${host} ${w}px.png`, conflictAction: "uniquify" });
    }
    return { ok: true };
  } finally {
    await chrome.debugger.sendCommand(target, "Emulation.clearDeviceMetricsOverride").catch(() => {});
    chrome.debugger.detach(target).catch(() => {});
  }
}

// ---------- règle ----------

export async function toggleMeasure(tabId, cmd, cfg) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ["measure.js"] });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId }, args: [cmd, cfg || null], func: (c, g) => window.__aruzenMeasure(c, g),
  });
  return result;
}

chrome.commands.onCommand.addListener(async (cmd, tab) => {
  if (cmd === "measure" && tab?.id) toggleMeasure(tab.id, "toggle-measure").catch(() => {});
});

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.target === "offscreen") return;
  const done = (p) => { p.then((r) => reply(r || { ok: true }), (e) => reply({ ok: false, error: e.message })); return true; };
  if (m.cmd === "responsive") return done(responsive(m));
  if (m.cmd === "measure") return done(toggleMeasure(m.tabId, m.action, m.cfg));
  if (m.cmd === "capture-page") return done(chrome.tabs.get(m.tabId).then(addScreenshot));
  if (m.cmd === "add-image") return done(addImage(m.url, m.page, m.title));
});
