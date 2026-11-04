import { activeTab, $, esc, isWebUrl } from "./shared/lib.js";
import { projects, addProject, allPages, toMarkdown, download, norm, siteOf, COLORS } from "./store.js";

const tab = await activeTab();
const web = isWebUrl(tab?.url);

// ---------- onglets ----------
const loaded = {};
const loaders = { carnet: loadCarnet, sessions: loadSessions, veille: loadVeille };
async function show(name) {
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
  document.querySelectorAll(".pane").forEach((p) => (p.hidden = p.id !== name));
  chrome.storage.local.set({ lastTab: name });
  if (!loaded[name]) { loaded[name] = true; await loaders[name](); }
}
$(".tabs").onclick = (e) => { const b = e.target.closest("button"); if (b) show(b.dataset.tab); };

$("#panel").onclick = async () => { await chrome.sidePanel.open({ windowId: tab.windowId }); window.close(); };
$("#openTab").onclick = () => chrome.tabs.create({ url: "notebook.html" });

// ---------- Carnet ----------
async function loadCarnet() {
  const { list, active } = await projects();
  $("#project").innerHTML = list.map((p) => `<option ${p === active ? "selected" : ""}>${esc(p)}</option>`).join("");
  const { selectionBar = true } = await chrome.storage.local.get("selectionBar");
  $("#selBar").checked = selectionBar;
  const key = "hl:" + norm(tab.url);
  const { [key]: here = [] } = web ? await chrome.storage.local.get(key) : {};
  $("#here").innerHTML = here.length ? here.map((h) => `
    <div class="item hl"><i style="background:${COLORS[h.color] || COLORS.jaune}"></i>
      <div class="grow"><div class="q">${esc(h.quote)}</div>${h.note ? `<div class="meta">📝 ${esc(h.note)}</div>` : ""}</div></div>`).join("")
    : `<div class="empty">${web ? "Aucun passage surligné ici" : "Ouvre une page web"}</div>`;
}
$("#project").onchange = () => chrome.storage.local.set({ project: $("#project").value });
$("#selBar").onchange = () => chrome.storage.local.set({ selectionBar: $("#selBar").checked });
$("#addProject").onclick = () => { $("#newRow").hidden = false; $("#newName").focus(); };
$("#newOk").onclick = async () => {
  const n = $("#newName").value.trim();
  if (!n) return;
  await addProject(n);
  $("#newRow").hidden = true;
  $("#newName").value = "";
  loadCarnet();
};
$("#newName").onkeydown = (e) => e.key === "Enter" && $("#newOk").click();
$("#exportAll").onclick = async () => {
  const project = $("#project").value;
  const pages = (await allPages()).map((p) => ({ ...p, highlights: p.highlights.filter((h) => (h.project || "Général") === project) }))
    .filter((p) => p.highlights.length);
  download(toMarkdown(pages, project), `Web Media/Recherche/${project} ${new Date().toISOString().slice(0, 10)}.md`);
  $("#exportAll").textContent = `${pages.length} page(s) exportée(s) ✓`;
};

// ---------- Sessions ----------
async function loadSessions() {
  const { sessions = [], hibernate = 0, project = "Général" } = await chrome.storage.local.get(["sessions", "hibernate", "project"]);
  $("#sName").value ||= `${project} · ${new Date().toLocaleDateString("fr-FR")}`;
  $("#hib").value = String(hibernate);
  $("#sList").innerHTML = sessions.length ? sessions.map((s) => `
    <div class="item"><div class="grow"><div class="title1">${esc(s.name)}</div>
      <div class="meta">${s.tabs.length} onglet(s) · ${new Date(s.created).toLocaleDateString("fr-FR")}</div></div>
      <button class="mini" data-a="open" data-id="${s.id}" title="Rouvrir dans une nouvelle fenêtre">Ouvrir</button>
      <button class="mini" data-a="del" data-id="${s.id}" title="Supprimer">✕</button></div>`).join("")
    : `<div class="empty">Aucune session enregistrée</div>`;
}
$("#sSave").onclick = async () => {
  const r = await chrome.runtime.sendMessage({ cmd: "save-session", name: $("#sName").value.trim() || "Session", windowId: tab.windowId });
  $("#sSave").textContent = `${r.count} onglet(s) sauvés ✓`;
  loadSessions();
};
$("#sList").onclick = async (e) => {
  const b = e.target.closest("button[data-a]");
  if (!b) return;
  if (b.dataset.a === "open") return chrome.runtime.sendMessage({ cmd: "open-session", id: b.dataset.id });
  const { sessions = [] } = await chrome.storage.local.get("sessions");
  await chrome.storage.local.set({ sessions: sessions.filter((s) => s.id !== b.dataset.id) });
  loadSessions();
};
$("#free").onclick = async () => {
  const r = await chrome.runtime.sendMessage({ cmd: "free-memory" });
  $("#freeMsg").textContent = `${r.count} onglet(s) endormi(s) ✓`;
};
$("#hib").onchange = () => chrome.storage.local.set({ hibernate: Number($("#hib").value) });

// ---------- Veille ----------
const ago = (t) => {
  if (!t) return "jamais";
  const m = Math.round((Date.now() - t) / 60000);
  return m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`;
};
async function loadVeille() {
  $("#wTitle").textContent = web ? tab.title : "Ouvre une page web à surveiller";
  $("#wAdd").disabled = !web;
  const { watches = [] } = await chrome.storage.local.get("watches");
  $("#wList").innerHTML = watches.map((w) => `
    <div class="item w ${w.changed ? "changed" : ""}">
      <div class="row"><div class="grow"><div class="title1">${w.changed ? "🔔 " : ""}${esc(w.title)}</div>
        <div class="meta">${esc(siteOf(w.url))}${w.selector ? " · " + esc(w.selector) : ""} · vérifié ${ago(w.lastCheck)}${w.error ? ` · <span class="err">${esc(w.error)}</span>` : ""}</div></div>
        <button class="mini" data-a="go" data-id="${w.id}" title="Ouvrir">↗</button>
        <button class="mini" data-a="check" data-id="${w.id}" title="Vérifier maintenant">↻</button>
        <button class="mini" data-a="del" data-id="${w.id}" title="Arrêter">✕</button></div>
      ${w.changed ? `<div class="chg">${(w.added || []).map((l) => "+ " + esc(l.slice(0, 140))).join("<br>") || `${w.removed} passage(s) retiré(s)`}</div>` : ""}
    </div>`).join("") || `<div class="empty">Aucune page surveillée</div>`;
}
$("#wAdd").onclick = async () => {
  $("#wAdd").disabled = true;
  $("#wMsg").textContent = "Première lecture de la page…";
  const r = await chrome.runtime.sendMessage({ cmd: "watch-add", url: tab.url, title: tab.title, every: Number($("#wEvery").value), selector: $("#wSel").value.trim() });
  $("#wMsg").innerHTML = r.ok ? `<span class="ok">Surveillée ✓ Tu seras prévenu à chaque changement.</span>` : `<span class="err">${esc(r.error)}</span>`;
  $("#wAdd").disabled = false;
  loadVeille();
};
$("#wList").onclick = async (e) => {
  const b = e.target.closest("button[data-a]");
  if (!b) return;
  const { watches = [] } = await chrome.storage.local.get("watches");
  const w = watches.find((x) => x.id === b.dataset.id);
  if (b.dataset.a === "go" && w) { chrome.tabs.create({ url: w.url }); await chrome.runtime.sendMessage({ cmd: "watch-seen", id: w.id }); }
  if (b.dataset.a === "check") { b.textContent = "…"; await chrome.runtime.sendMessage({ cmd: "watch-check", id: b.dataset.id }); }
  if (b.dataset.a === "del") await chrome.runtime.sendMessage({ cmd: "watch-del", id: b.dataset.id });
  loadVeille();
};

const { lastTab = "carnet" } = await chrome.storage.local.get("lastTab");
show(lastTab);
