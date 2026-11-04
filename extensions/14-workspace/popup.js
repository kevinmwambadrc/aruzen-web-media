import { activeTab, $, esc, isWebUrl } from "./shared/lib.js";
import { clients, tasks, saveTask, timer, startTimer, stopTimer, entries, prompts, fmtDur, today, dueChips, variables } from "./store.js";
import { insertAtCursor } from "./insert.js";

const tab = await activeTab();
const web = isWebUrl(tab?.url);
const clientList = await clients();
const { lastClient = clientList[0]?.name, lastProject = "", lastTab } = await chrome.storage.local.get(["lastClient", "lastProject", "lastTab"]);
const clientOptions = (sel) => clientList.map((c) => `<option ${c.name === sel ? "selected" : ""}>${esc(c.name)}</option>`).join("");

document.querySelector(".tabs").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
  document.querySelectorAll(".pane").forEach((p) => (p.hidden = p.id !== b.dataset.tab));
  chrome.storage.local.set({ lastTab: b.dataset.tab });
};
$("#open").onclick = () => chrome.runtime.openOptionsPage();
$("#settings").onclick = () => { chrome.tabs.create({ url: "workspace.html#reglages" }); window.close(); };

// ---------- Capture ----------
let quote = "";
if (web) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => String(getSelection()).trim() });
    quote = result || "";
  } catch (_) { quote = ""; }
}
$("#tTitle").value = quote ? quote.replace(/\s+/g, " ").slice(0, 90) : (web ? tab.title : "");
$("#selInfo").textContent = quote ? ` + le texte sélectionné (${quote.length} car.)` : "";
$("#tLink").parentElement.hidden = !web;
$("#tClient").innerHTML = clientOptions(lastClient);
$("#tDue").value = today();
$("#dueChips").innerHTML = dueChips().map(([l, d]) => `<button class="chip ${d === today() ? "on" : ""}" data-d="${d}">${l}</button>`).join("");
$("#dueChips").onclick = (e) => {
  const c = e.target.closest(".chip");
  if (!c) return;
  $("#tDue").value = c.dataset.d;
  document.querySelectorAll("#dueChips .chip").forEach((x) => x.classList.toggle("on", x === c));
};

async function renderTasks() {
  const open = (await tasks()).filter((t) => !t.done).sort((a, b) => (a.due || "9").localeCompare(b.due || "9")).slice(0, 6);
  const t0 = today();
  $("#tList").innerHTML = open.map((t) => `
    <label class="item task"><input type="checkbox" data-id="${t.id}">
      <div class="grow"><div class="title1">${esc(t.title)}</div>
      <div class="meta">${esc(t.client || "")}${t.due ? ` · <span class="${t.due < t0 ? "late" : ""}">${t.due === t0 ? "aujourd'hui" : new Date(t.due + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>` : ""}${t.notion ? " · Notion ✓" : ""}</div></div></label>`).join("")
    || `<div class="empty">Rien à faire 🎉</div>`;
}
$("#tList").onchange = async (e) => {
  const t = (await tasks()).find((x) => x.id === e.target.dataset.id);
  if (t) { t.done = true; t.doneAt = Date.now(); await saveTask(t); setTimeout(renderTasks, 300); }
};
$("#tAdd").onclick = async () => {
  const title = $("#tTitle").value.trim();
  if (!title) return;
  $("#tAdd").disabled = true;
  const attach = web && $("#tLink").checked;
  chrome.storage.local.set({ lastClient: $("#tClient").value });
  const r = await chrome.runtime.sendMessage({ cmd: "add-task", task: {
    title, client: $("#tClient").value, due: $("#tDue").value, notes: $("#tNotes").value.trim(),
    url: attach ? tab.url : "", quote: attach ? quote : "",
  } });
  $("#tMsg").innerHTML = r.ok ? `<span class="ok">Ajoutée ✓${r.task.notion ? " et envoyée dans Notion" : ""}</span>${r.warning ? `<br><span class="err">Notion : ${esc(r.warning)}</span>` : ""}`
    : `<span class="err">${esc(r.error)}</span>`;
  $("#tTitle").value = $("#tNotes").value = "";
  $("#tAdd").disabled = false;
  renderTasks();
};
renderTasks();

// ---------- Temps ----------
let tick = 0;
$("#cClient").innerHTML = clientOptions(lastClient);
$("#cProject").value = lastProject;
const all = await entries();
$("#projects").innerHTML = [...new Set(all.map((e) => e.project).filter(Boolean))].slice(0, 30).map((p) => `<option value="${esc(p)}">`).join("");

async function renderClock() {
  const t = await timer();
  clearInterval(tick);
  $("#startForm").hidden = !!t;
  $("#cToggle").textContent = t ? "■ Arrêter et enregistrer" : "▶ Démarrer";
  $("#clockFor").textContent = t ? `${t.client}${t.project ? " · " + t.project : ""}${t.note ? " — " + t.note : ""}` : "Chrono à l'arrêt";
  const draw = () => {
    const s = t ? Math.floor((Date.now() - t.start) / 1000) : 0;
    $("#clock").textContent = `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  draw();
  if (t) tick = setInterval(draw, 1000);
  renderToday();
}
async function renderToday() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const t = await timer();
  const rows = (await entries()).filter((e) => e.end >= start.getTime());
  if (t) rows.push({ client: t.client, start: t.start, end: Date.now() });
  const by = {};
  for (const e of rows) by[e.client] = (by[e.client] || 0) + (e.end - Math.max(e.start, start.getTime()));
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  $("#todayList").innerHTML = Object.keys(by).length
    ? Object.entries(by).sort((a, b) => b[1] - a[1]).map(([c, ms]) => `<div class="item"><span class="grow">${esc(c)}</span><b>${fmtDur(ms)}</b></div>`).join("")
      + `<div class="item"><span class="grow mut">Total</span><b>${fmtDur(total)}</b></div>`
    : `<div class="empty">Aucun temps aujourd'hui</div>`;
}
$("#cToggle").onclick = async () => {
  if (await timer()) await stopTimer();
  else {
    const c = { client: $("#cClient").value, project: $("#cProject").value.trim(), note: $("#cNote").value.trim() };
    chrome.storage.local.set({ lastClient: c.client, lastProject: c.project });
    await startTimer(c);
  }
  renderClock();
};
renderClock();

// ---------- Prompts ----------
const plist = await prompts();
let current = null;
function renderPrompts() {
  const q = $("#pSearch").value.toLowerCase();
  $("#pList").innerHTML = plist.filter((p) => !q || (p.title + p.text + p.category).toLowerCase().includes(q)).map((p) => `
    <div class="item pr" data-id="${p.id}"><div class="grow"><div class="cat">${esc(p.category)}</div><div class="title1">${esc(p.title)}</div></div><span class="mut">›</span></div>`).join("")
    || `<div class="empty">Aucun prompt</div>`;
}
function openPrompt(p) {
  current = p;
  $("#pList").hidden = $("#pSearch").hidden = true;
  $("#pForm").hidden = false;
  $("#pTitle").textContent = p.title;
  $("#pVars").innerHTML = variables(p.text).map((v) => `<label>${esc(v)}<textarea data-v="${esc(v)}" rows="1"></textarea></label>`).join("")
    || `<div class="mut small">Aucune variable : le prompt est prêt.</div>`;
  $("#pVars textarea")?.focus();
}
const filled = () => [...document.querySelectorAll("#pVars textarea")].reduce((t, el) => el.value.trim() ? t.split(`{${el.dataset.v}}`).join(el.value.trim()) : t, current.text);
$("#pList").onclick = (e) => { const i = e.target.closest(".pr"); if (i) openPrompt(plist.find((p) => p.id === i.dataset.id)); };
$("#pBack").onclick = () => { $("#pList").hidden = $("#pSearch").hidden = false; $("#pForm").hidden = true; };
$("#pSearch").oninput = renderPrompts;
$("#pCopy").onclick = async () => { await navigator.clipboard.writeText(filled()); $("#pCopy").textContent = "Copié ✓"; };
$("#pIns").onclick = async () => {
  let ok = false;
  if (web) {
    try { [{ result: ok }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: insertAtCursor, args: [filled()] }); } catch (_) { ok = false; }
  }
  if (!ok) await navigator.clipboard.writeText(filled());
  $("#pIns").textContent = ok ? "Inséré ✓" : "Copié, ⌘V ✓";
};
renderPrompts();

if (lastTab) document.querySelector(`.tabs button[data-tab="${lastTab}"]`)?.click();
