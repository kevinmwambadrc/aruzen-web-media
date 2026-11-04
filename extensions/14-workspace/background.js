import { prompts, saveTask, timer, stopTimer, startTimer, fmtDur, today } from "./store.js";
import { createTask } from "./notion.js";
import { insertAtCursor } from "./insert.js";

// ---------- menus ----------
let menuChain = Promise.resolve();
const buildMenus = () => (menuChain = menuChain.then(rebuild, rebuild));
async function rebuild() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: "task", title: "Ajouter aux tâches (Aruzen)", contexts: ["page", "selection", "link", "image"] });
  chrome.contextMenus.create({ id: "pr", title: "Prompt (Aruzen)", contexts: ["editable"] });
  const list = await prompts();
  for (const cat of [...new Set(list.map((p) => p.category || "Divers"))]) {
    chrome.contextMenus.create({ id: "c:" + cat, parentId: "pr", title: cat, contexts: ["editable"] });
    for (const p of list.filter((x) => (x.category || "Divers") === cat)) chrome.contextMenus.create({ id: "p:" + p.id, parentId: "c:" + cat, title: p.title, contexts: ["editable"] });
  }
}
chrome.runtime.onInstalled.addListener(() => { buildMenus(); setup(); });
chrome.runtime.onStartup.addListener(() => { buildMenus(); setup(); });
chrome.storage.onChanged.addListener((c, area) => {
  if (area !== "local") return;
  if (c.prompts) buildMenus();
  if (c.timer) badge();
});

// ---------- tâches ----------
export async function addTask(task) {
  const t = { id: crypto.randomUUID(), done: false, created: Date.now(), notion: null, ...task };
  await saveTask(t);
  const { notion } = await chrome.storage.local.get("notion");
  if (notion?.token && notion?.dbId) {
    try {
      t.notion = await createTask(notion, t);
      await saveTask(t);
    } catch (e) {
      t.notionError = e.message;
      await saveTask(t);
      return { ok: true, task: t, warning: e.message };
    }
  }
  return { ok: true, task: t };
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "task") {
    const { lastClient = "" } = await chrome.storage.local.get("lastClient");
    const quote = (info.selectionText || "").trim();
    const r = await addTask({ title: quote ? quote.slice(0, 90) : tab.title, url: info.linkUrl || info.srcUrl || info.pageUrl, quote, client: lastClient, due: today() });
    chrome.notifications.create({ type: "basic", iconUrl: "icons/128.png", title: "Tâche ajoutée" + (r.task.notion ? " (et dans Notion)" : ""), message: r.task.title + (r.warning ? "\nNotion : " + r.warning : "") });
    return;
  }
  if (String(info.menuItemId).startsWith("p:")) {
    const p = (await prompts()).find((x) => "p:" + x.id === info.menuItemId);
    if (p) chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [info.frameId || 0] }, func: insertAtCursor, args: [p.text] });
  }
});

// ---------- chronomètre ----------
function setup() {
  chrome.alarms.create("tick", { periodInMinutes: 1 });
  chrome.idle.setDetectionInterval(600);
  badge();
}

async function badge() {
  const t = await timer();
  await chrome.action.setBadgeBackgroundColor({ color: "#16a34a" });
  await chrome.action.setBadgeText({ text: t ? fmtDur(Date.now() - t.start, true) : "" });
  await chrome.action.setTitle({ title: t ? `Chrono : ${t.client}${t.project ? " · " + t.project : ""}` : "Aruzen · Workspace" });
}
chrome.alarms.onAlarm.addListener((a) => a.name === "tick" && badge());

// Mac verrouillé ou inactif 10 min : le chrono s'arrête à l'heure réelle de départ.
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === "active") return;
  const { idleStop = true } = await chrome.storage.local.get("idleStop");
  const t = await timer();
  if (!idleStop || !t) return;
  await stopTimer(Date.now() - (state === "idle" ? 600000 : 0));
  chrome.notifications.create({ type: "basic", iconUrl: "icons/128.png", title: "Chrono arrêté", message: `${t.client} : arrêté pour inactivité, le temps est enregistré.` });
});

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "toggle-timer") return;
  if (await timer()) return stopTimer();
  const { lastClient = "Interne", lastProject = "" } = await chrome.storage.local.get(["lastClient", "lastProject"]);
  startTimer({ client: lastClient, project: lastProject, note: "" });
});

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.cmd === "add-task") { addTask(m.task).then(reply, (e) => reply({ ok: false, error: e.message })); return true; }
});
