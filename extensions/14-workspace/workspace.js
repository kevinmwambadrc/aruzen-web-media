import { clients, tasks, saveTask, deleteTask, entries, addEntry, deleteEntry, prompts, fmtDur, today, iso } from "./store.js";
import { listDatabases, schema } from "./notion.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const set = (o) => chrome.storage.local.set(o);
let clientList = await clients();

document.querySelector(".seg").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  document.querySelectorAll(".seg button").forEach((x) => x.classList.toggle("on", x === b));
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== b.dataset.v));
  location.hash = b.dataset.v;
};
if (location.hash) document.querySelector(`.seg button[data-v="${location.hash.slice(1)}"]`)?.click();

const clientFilter = (el, all = true) => {
  el.innerHTML = (all ? `<option value="*">Tous les clients</option>` : "") + clientList.map((c) => `<option>${esc(c.name)}</option>`).join("");
};

// ---------- Tâches ----------
async function renderTasks() {
  const state = $("#fState").value, client = $("#fClient").value, t0 = today();
  const list = (await tasks()).filter((t) => (state === "all" || (state === "done") === !!t.done) && (client === "*" || t.client === client))
    .sort((a, b) => (a.due || "9").localeCompare(b.due || "9"));
  $("#tCount").textContent = `${list.length} tâche(s)`;
  $("#tBody").innerHTML = list.map((t) => `
    <tr class="${t.done ? "done" : ""}" data-id="${t.id}">
      <td><input type="checkbox" data-a="done" ${t.done ? "checked" : ""}></td>
      <td>${t.url ? `<a href="${esc(t.url)}" target="_blank">${esc(t.title)}</a>` : esc(t.title)}${t.quote ? `<div class="q">« ${esc(t.quote)} »</div>` : ""}${t.notes ? `<div class="q">${esc(t.notes)}</div>` : ""}</td>
      <td>${esc(t.client)}</td>
      <td><input type="date" data-a="due" value="${esc(t.due || "")}" class="${!t.done && t.due && t.due < t0 ? "late" : ""}"></td>
      <td>${t.notion ? `<a href="${esc(t.notion.url)}" target="_blank">Ouvrir</a>` : t.notionError ? `<span class="late" title="${esc(t.notionError)}">Échec</span>` : "—"}</td>
      <td><button class="x" data-a="del" title="Supprimer">✕</button></td>
    </tr>`).join("") || `<tr><td colspan="6" class="mut">Aucune tâche</td></tr>`;
}
$("#tBody").onchange = async (e) => {
  const tr = e.target.closest("tr");
  const t = (await tasks()).find((x) => x.id === tr?.dataset.id);
  if (!t) return;
  if (e.target.dataset.a === "done") { t.done = e.target.checked; t.doneAt = Date.now(); }
  if (e.target.dataset.a === "due") t.due = e.target.value;
  await saveTask(t);
  renderTasks();
};
$("#tBody").onclick = async (e) => {
  if (e.target.dataset.a !== "del") return;
  await deleteTask(e.target.closest("tr").dataset.id);
  renderTasks();
};
clientFilter($("#fClient"));
$("#fState").onchange = $("#fClient").onchange = renderTasks;

// ---------- Feuille de temps ----------
function range() {
  const now = new Date(), p = $("#period").value;
  if (p === "week") { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [d.getTime(), Infinity]; }
  if (p === "month") return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), Infinity];
  if (p === "last") return [new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), new Date(now.getFullYear(), now.getMonth(), 1).getTime()];
  return [0, Infinity];
}
async function shownEntries() {
  const [a, b] = range(), c = $("#eClient").value;
  return (await entries()).filter((e) => e.start >= a && e.start < b && (c === "*" || e.client === c));
}
const money = (v, cur) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " " + cur;
async function renderTime() {
  const list = await shownEntries();
  const by = {};
  for (const e of list) by[e.client] = (by[e.client] || 0) + (e.end - e.start);
  const totalMs = Object.values(by).reduce((x, y) => x + y, 0);
  const rate = (c) => clientList.find((x) => x.name === c) || { rate: 0, currency: "USD" };
  $("#summary").innerHTML = Object.entries(by).sort((a, b) => b[1] - a[1]).map(([c, ms]) => {
    const r = rate(c);
    return `<div><span class="mut">${esc(c)}</span><b>${fmtDur(ms)}</b><span class="mut">${r.rate ? money((ms / 3600000) * r.rate, r.currency) : "tarif non défini"}</span></div>`;
  }).join("") + `<div class="total"><span class="mut">Total</span><b>${fmtDur(totalMs)}</b><span class="mut">${list.length} séance(s)</span></div>`;
  $("#eBody").innerHTML = list.map((e) => `
    <tr data-id="${e.id}"><td>${new Date(e.start).toLocaleDateString("fr-FR")} <span class="mut">${new Date(e.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span></td>
    <td>${esc(e.client)}</td><td>${esc(e.project)}</td><td>${esc(e.note)}</td><td>${fmtDur(e.end - e.start)}</td>
    <td><button class="x" title="Supprimer">✕</button></td></tr>`).join("") || `<tr><td colspan="6" class="mut">Aucun temps sur cette période</td></tr>`;
}
$("#eBody").onclick = async (e) => { if (e.target.closest(".x")) { await deleteEntry(e.target.closest("tr").dataset.id); renderTime(); } };
clientFilter($("#eClient"));
clientFilter($("#mClient"), false);
$("#mDate").value = today();
$("#period").onchange = $("#eClient").onchange = renderTime;
$("#mAdd").onclick = async () => {
  const m = $("#mDur").value.trim().match(/^(\d+)(?:[:h](\d{1,2}))?$/);
  if (!m) { $("#mDur").focus(); return; }
  const start = new Date(`${$("#mDate").value}T${$("#mStart").value || "09:00"}`).getTime();
  await addEntry({ client: $("#mClient").value, project: $("#mProject").value.trim(), note: $("#mNote").value.trim(), start, end: start + (Number(m[1]) * 60 + Number(m[2] || 0)) * 60000 });
  $("#mDur").value = $("#mNote").value = "";
  renderTime();
};
// CSV au format Excel français : séparateur « ; », virgule décimale, BOM UTF-8.
$("#csv").onclick = async () => {
  const list = await shownEntries();
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const num = (v) => v.toFixed(2).replace(".", ",");
  const rows = [["Date", "Client", "Projet", "Note", "Début", "Fin", "Heures", "Tarif", "Montant", "Devise"]];
  for (const e of list.slice().reverse()) {
    const r = clientList.find((x) => x.name === e.client) || { rate: 0, currency: "" };
    const h = (e.end - e.start) / 3600000;
    const t = (x) => new Date(x).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    rows.push([iso(new Date(e.start)), e.client, e.project, e.note, t(e.start), t(e.end), num(h), num(r.rate || 0), num(h * (r.rate || 0)), r.currency]);
  }
  const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  chrome.downloads.download({ url, filename: `Web Media/Temps/Feuille de temps ${$("#period").selectedOptions[0].text} ${today()}.csv`, conflictAction: "uniquify" });
};

// ---------- Prompts ----------
let plist = await prompts();
function renderPrompts() {
  $("#pEdit").innerHTML = plist.map((p, i) => `
    <div class="prompt" data-i="${i}">
      <div class="bar"><input data-f="category" value="${esc(p.category)}" placeholder="Catégorie" style="max-width:160px">
        <input data-f="title" value="${esc(p.title)}" placeholder="Titre"><button class="x" data-del="${i}" title="Supprimer">✕</button></div>
      <textarea data-f="text">${esc(p.text)}</textarea>
    </div>`).join("");
}
$("#pEdit").oninput = (e) => {
  const box = e.target.closest(".prompt");
  if (box && e.target.dataset.f) { plist[box.dataset.i][e.target.dataset.f] = e.target.value; set({ prompts: plist }); }
};
$("#pEdit").onclick = (e) => { const d = e.target.dataset.del; if (d !== undefined) { plist.splice(d, 1); set({ prompts: plist }); renderPrompts(); } };
$("#pAdd").onclick = () => { plist.unshift({ id: crypto.randomUUID(), category: "Divers", title: "Nouveau prompt", text: "" }); set({ prompts: plist }); renderPrompts(); };

// ---------- Réglages : Notion ----------
let { notion = {} } = await chrome.storage.local.get("notion");
let sch = null;
const FIELDS = [["title", "Titre de la tâche", ["title"]], ["client", "Client", ["select", "multi_select", "rich_text"]], ["due", "Échéance", ["date"]], ["url", "Lien de la page", ["url"]]];

function renderMap(map) {
  $("#nMap").innerHTML = FIELDS.map(([k, label, types]) => `<label>${label}
    <select data-k="${k}"><option value="">— ne pas remplir —</option>${sch.props.filter((p) => types.includes(p.type)).map((p) => `<option ${map[k] === p.name ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>`).join("");
}
async function loadSchema() {
  sch = await schema(notion.token, $("#nDb").value);
  renderMap(notion.dbId === $("#nDb").value && notion.map ? notion.map : sch.guess);
}
async function connect() {
  $("#nMsg").textContent = "Connexion…";
  try {
    const dbs = await listDatabases(notion.token);
    if (!dbs.length) throw new Error("Aucune base partagée avec l'intégration (étape 2).");
    $("#nDb").innerHTML = dbs.map((d) => `<option value="${d.id}" ${d.id === notion.dbId ? "selected" : ""}>${esc(d.title)}</option>`).join("");
    $("#nDbBox").hidden = false;
    await loadSchema();
    $("#nMsg").textContent = notion.dbId ? `Connecté à « ${notion.dbTitle} ».` : "Choisis la base et vérifie les correspondances.";
  } catch (e) {
    $("#nMsg").innerHTML = `<span class="late">${esc(e.message)}</span>`;
  }
}
$("#nConnect").onclick = () => { notion.token = $("#nToken").value.trim(); if (notion.token) connect(); };
$("#nDb").onchange = loadSchema;
$("#nSave").onclick = async () => {
  const map = Object.fromEntries([...document.querySelectorAll("#nMap select")].map((s) => [s.dataset.k, s.value]));
  notion = { token: notion.token, dbId: $("#nDb").value, dbTitle: $("#nDb").selectedOptions[0].text, props: sch.props, map };
  await set({ notion });
  $("#nMsg").innerHTML = `Enregistré ✓ Les nouvelles tâches iront dans « ${esc(notion.dbTitle)} ».`;
};
$("#nOff").onclick = async () => { notion = {}; await set({ notion }); $("#nToken").value = ""; $("#nDbBox").hidden = true; $("#nMsg").textContent = "Notion déconnecté : les tâches restent dans le Workspace."; };
if (notion.token) { $("#nToken").value = notion.token; connect(); }

// ---------- Réglages : clients ----------
function renderClients() {
  $("#cBody").innerHTML = clientList.map((c, i) => `<tr data-i="${i}">
    <td><input data-f="name" value="${esc(c.name)}"></td><td><input data-f="rate" type="number" min="0" step="0.5" value="${c.rate}"></td>
    <td><input data-f="currency" list="currencies" value="${esc(c.currency)}" size="6" placeholder="USD"></td>
    <td><button class="x" data-del="${i}">✕</button></td></tr>`).join("");
}
$("#cBody").onchange = (e) => {
  const tr = e.target.closest("tr");
  const c = clientList[tr.dataset.i];
  const f = e.target.dataset.f;
  c[f] = f === "rate" ? Number(e.target.value) || 0 : f === "currency" ? e.target.value.trim().toUpperCase() : e.target.value;
  set({ clients: clientList });
};
$("#cBody").onclick = (e) => { const d = e.target.dataset.del; if (d !== undefined) { clientList.splice(d, 1); set({ clients: clientList }); renderClients(); } };
$("#cAdd").onclick = () => { clientList.push({ name: "Nouveau client", rate: 0, currency: "USD" }); set({ clients: clientList }); renderClients(); };
const { idleStop = true } = await chrome.storage.local.get("idleStop");
$("#idleStop").checked = idleStop;
$("#idleStop").onchange = () => set({ idleStop: $("#idleStop").checked });

// ---------- Réglages : sauvegarde ----------
const SETTINGS_KEYS = ["clients", "prompts", "idleStop"];
$("#exportSettings").onclick = async () => {
  const data = await chrome.storage.local.get(SETTINGS_KEYS);
  const url = URL.createObjectURL(new Blob([JSON.stringify({ app: "aruzen-workspace", version: 1, ...data }, null, 2)], { type: "application/json" }));
  await chrome.downloads.download({ url, filename: `Web Media/Réglages/Workspace ${today()}.json`, conflictAction: "uniquify" });
  $("#ioMsg").textContent = "Enregistré dans Téléchargements › Web Media › Réglages.";
};
$("#importSettings").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== "aruzen-workspace") throw new Error("ce fichier ne vient pas d'Aruzen Workspace");
    if (!confirm(`Remplacer tes clients et tes prompts par ceux de « ${file.name} » ?`)) return;
    await set(Object.fromEntries(SETTINGS_KEYS.filter((k) => k in data).map((k) => [k, data[k]])));
    clientList = await clients();
    plist = await prompts();
    $("#idleStop").checked = data.idleStop ?? true;
    renderClients(); renderPrompts();
    [["#fClient", true], ["#eClient", true], ["#mClient", false]].forEach(([s, all]) => clientFilter($(s), all));
    $("#ioMsg").textContent = "Réglages importés ✓";
  } catch (err) {
    $("#ioMsg").textContent = "Import impossible : " + err.message;
  }
};

chrome.storage.onChanged.addListener((c, area) => {
  if (area !== "local") return;
  if (c.tasks) renderTasks();
  if (c.entries) renderTime();
  if (c.clients) { clientList = c.clients.newValue; }
});

renderTasks();
renderTime();
renderPrompts();
renderClients();
