// Service worker : menus, index du carnet, sessions d'onglets, mise en veille des onglets et veille de pages.
const HL_COLORS = ["jaune", "vert", "bleu", "rose"];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "hl", title: "Surligner", contexts: ["selection"] });
  for (const c of HL_COLORS) chrome.contextMenus.create({ id: "hl-" + c, parentId: "hl", title: c[0].toUpperCase() + c.slice(1), contexts: ["selection"] });
  alarms();
});
// Recréées au démarrage : Chrome peut les perdre en se fermant.
function alarms() {
  chrome.alarms.create("veille", { periodInMinutes: 15 });
  chrome.alarms.create("hibernate", { periodInMinutes: 5 });
}
chrome.runtime.onStartup.addListener(alarms);

const highlight = (tabId, color) => chrome.tabs.sendMessage(tabId, { cmd: "highlight", color }).catch(() => {});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (String(info.menuItemId).startsWith("hl-")) highlight(tab.id, info.menuItemId.slice(3));
});
chrome.commands.onCommand.addListener((cmd, tab) => cmd === "highlight" && tab && highlight(tab.id, "jaune"));

// ---------- index des pages surlignées ----------
// Deux files séparées : une vérification de veille lente ne bloque pas le carnet.
let chain = Promise.resolve(), watchChain = Promise.resolve();
const serial = (fn) => (chain = chain.then(fn, fn));
const serialWatch = (fn) => (watchChain = watchChain.then(fn, fn));

function indexPage({ url, title, count }) {
  return serial(async () => {
    const { pages = {} } = await chrome.storage.local.get("pages");
    if (count) pages[url] = { title, updated: Date.now() };
    else delete pages[url];
    await chrome.storage.local.set({ pages });
  });
}

// ---------- sessions d'onglets ----------
async function saveSession(name, windowId) {
  const tabs = (await chrome.tabs.query({ windowId })).filter((t) => /^https?:|^file:/.test(t.url));
  const { sessions = [] } = await chrome.storage.local.get("sessions");
  sessions.unshift({ id: crypto.randomUUID(), name, created: Date.now(), tabs: tabs.map((t) => ({ url: t.url, title: t.title, pinned: t.pinned })) });
  await chrome.storage.local.set({ sessions });
  return { ok: true, count: tabs.length };
}

// Restaure la session : seul le premier onglet se charge, les autres attendent un clic (zéro mémoire).
async function openSession(id) {
  const { sessions = [] } = await chrome.storage.local.get("sessions");
  const s = sessions.find((x) => x.id === id);
  if (!s?.tabs.length) return { ok: false };
  const win = await chrome.windows.create({ url: s.tabs[0].url, focused: true });
  for (const t of s.tabs.slice(1)) {
    const tab = await chrome.tabs.create({ windowId: win.id, url: t.url, pinned: t.pinned, active: false });
    chrome.tabs.discard(tab.id).catch(() => {});
  }
  return { ok: true };
}

async function freeMemory(olderThanMin = 0) {
  const now = Date.now();
  const tabs = await chrome.tabs.query({ active: false, audible: false, discarded: false, pinned: false });
  let n = 0;
  for (const t of tabs) {
    if (olderThanMin && t.lastAccessed && now - t.lastAccessed < olderThanMin * 60000) continue;
    if (!/^https?:/.test(t.url || "")) continue;
    try { await chrome.tabs.discard(t.id); n++; } catch (_) { /* onglet protégé */ }
  }
  return { ok: true, count: n };
}

// ---------- veille de pages ----------
async function ensureOffscreen() {
  const ctx = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (!ctx.length) await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["DOM_PARSER"], justification: "Lire le texte des pages surveillées" });
}

async function snapshot(w) {
  const res = await fetch(w.url, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  await ensureOffscreen();
  const { lines } = await chrome.runtime.sendMessage({ target: "offscreen", cmd: "lines", html: await res.text(), selector: w.selector });
  return lines;
}

async function checkWatch(w) {
  try {
    const lines = await snapshot(w);
    w.lastCheck = Date.now();
    w.error = "";
    if (!w.lines) { w.lines = lines; return w; } // première lecture = référence
    const before = new Set(w.lines);
    const after = new Set(lines);
    const added = lines.filter((l) => !before.has(l));
    const removed = w.lines.filter((l) => !after.has(l)).length;
    if (added.length || removed > 2) {
      w.changed = true;
      w.changedAt = Date.now();
      w.added = added.slice(0, 8);
      w.removed = removed;
      chrome.notifications.create("w:" + w.id, {
        type: "basic", iconUrl: "icons/128.png", title: "Veille · " + w.title,
        message: added.length ? added.slice(0, 2).join("\n").slice(0, 180) : `${removed} passage(s) retiré(s)`,
      });
    }
    w.lines = lines;
  } catch (e) {
    w.lastCheck = Date.now();
    w.error = e.message;
  }
  return w;
}

function updateWatches(fn) {
  return serialWatch(async () => {
    const { watches = [] } = await chrome.storage.local.get("watches");
    const out = await fn(watches);
    await chrome.storage.local.set({ watches });
    const n = watches.filter((w) => w.changed).length;
    await chrome.action.setBadgeBackgroundColor({ color: "#6A3DE8" });
    await chrome.action.setBadgeText({ text: n ? String(n) : "" });
    return out;
  });
}

const checkDue = (force) => updateWatches(async (watches) => {
  const now = Date.now();
  // Une page à la fois, pour ne jamais charger le réseau ni le processeur.
  for (const w of watches) if (force === w.id || (!force && now - (w.lastCheck || 0) >= w.every * 60000)) await checkWatch(w);
  return { ok: true };
});

chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name === "veille") checkDue();
  if (a.name === "hibernate") {
    const { hibernate = 0 } = await chrome.storage.local.get("hibernate");
    if (hibernate) freeMemory(hibernate);
  }
});

chrome.notifications.onClicked.addListener(async (id) => {
  if (!id.startsWith("w:")) return;
  const { watches = [] } = await chrome.storage.local.get("watches");
  const w = watches.find((x) => x.id === id.slice(2));
  if (w) chrome.tabs.create({ url: w.url });
});

chrome.runtime.onMessage.addListener((m, sender, reply) => {
  if (m.target === "offscreen") return;
  const done = (p) => { p.then((r) => reply(r || { ok: true }), (e) => reply({ ok: false, error: e.message })); return true; };
  switch (m.cmd) {
    case "hl-saved": return done(indexPage(m));
    case "save-session": return done(saveSession(m.name, m.windowId));
    case "open-session": return done(openSession(m.id));
    case "free-memory": return done(freeMemory());
    case "watch-add": return done(updateWatches(async (ws) => {
      const w = { id: crypto.randomUUID(), url: m.url, title: m.title, every: m.every, selector: m.selector || "", created: Date.now() };
      ws.unshift(await checkWatch(w));
      return { ok: !w.error, error: w.error };
    }));
    case "watch-check": return done(checkDue(m.id));
    case "watch-seen": return done(updateWatches(async (ws) => { const w = ws.find((x) => x.id === m.id); if (w) w.changed = false; }));
    case "watch-del": return done(updateWatches(async (ws) => { const i = ws.findIndex((x) => x.id === m.id); if (i >= 0) ws.splice(i, 1); }));
  }
});
