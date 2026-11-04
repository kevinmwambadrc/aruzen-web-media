import { allPages, projects, toMarkdown, download, siteOf, COLORS } from "./store.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
let shown = [];

async function filtered() {
  const project = $("#project").value;
  const q = $("#q").value.trim().toLowerCase();
  return (await allPages()).map((p) => ({
    ...p,
    highlights: p.highlights.filter((h) => (project === "*" || (h.project || "Général") === project)
      && (!q || (h.quote + " " + h.note + " " + p.title).toLowerCase().includes(q))),
  })).filter((p) => p.highlights.length);
}

async function render() {
  shown = await filtered();
  const n = shown.reduce((s, p) => s + p.highlights.length, 0);
  $("#count").textContent = `${n} citation(s) · ${shown.length} page(s)`;
  $("#list").innerHTML = shown.length ? shown.map((p) => `
    <section class="page">
      <div><h2><a href="${esc(p.url)}" target="_blank">${esc(p.title)}</a></h2>
      <div class="mut">${esc(siteOf(p.url))} · ${new Date(p.updated).toLocaleDateString("fr-FR")}</div></div>
      ${p.highlights.map((h) => `
        <div class="hl"><i style="background:${COLORS[h.color] || COLORS.jaune}"></i>
          <div><blockquote data-url="${esc(p.url)}" data-id="${h.id}" title="Ouvrir à cet endroit">${esc(h.quote)}</blockquote>
          ${h.note ? `<div class="note">${esc(h.note)}</div>` : ""}</div>
          <div class="acts"><button data-a="note" data-k="${esc(p.key)}" data-id="${h.id}">Note</button>
          <button data-a="del" data-k="${esc(p.key)}" data-id="${h.id}">Retirer</button></div>
        </div>`).join("")}
    </section>`).join("")
    : `<div class="empty">Aucune citation.<br>Sélectionne un texte sur une page, puis choisis une couleur dans la petite barre (ou ⌥⇧H).</div>`;
}

async function edit(key, id, fn) {
  const { [key]: list = [] } = await chrome.storage.local.get(key);
  const out = fn(list.slice(), list.findIndex((h) => h.id === id));
  await chrome.storage.local.set({ [key]: out });
  if (!out.length) chrome.runtime.sendMessage({ cmd: "hl-saved", url: key.slice(3), title: "", count: 0 });
}

$("#list").onclick = async (e) => {
  const b = e.target.closest("button[data-a]");
  if (b?.dataset.a === "del") await edit(b.dataset.k, b.dataset.id, (l, i) => (l.splice(i, 1), l));
  if (b?.dataset.a === "note") {
    // Édition sur place (les fenêtres prompt() ne s'ouvrent pas dans un panneau latéral).
    const box = b.closest(".hl").children[1];
    if (box.querySelector("textarea")) return;
    const { [b.dataset.k]: list = [] } = await chrome.storage.local.get(b.dataset.k);
    box.querySelector(".note")?.remove();
    box.insertAdjacentHTML("beforeend", `<div class="edit"><textarea rows="3" placeholder="Ta note…">${esc(list.find((h) => h.id === b.dataset.id)?.note)}</textarea>
      <button class="primary" data-a="save" data-k="${esc(b.dataset.k)}" data-id="${b.dataset.id}">Enregistrer</button></div>`);
    box.querySelector("textarea").focus();
  }
  if (b?.dataset.a === "save") {
    const n = b.parentElement.querySelector("textarea").value.trim();
    await edit(b.dataset.k, b.dataset.id, (l, i) => ((l[i] = { ...l[i], note: n }), l));
  }
  const q = e.target.closest("blockquote");
  if (q) {
    // Ouvre (ou retrouve) la page et fait défiler jusqu'au passage.
    const [tab] = await chrome.tabs.query({ url: q.dataset.url.split("#")[0] + "*" }).catch(() => []);
    const t = tab ? await chrome.tabs.update(tab.id, { active: true }) : await chrome.tabs.create({ url: q.dataset.url });
    setTimeout(() => chrome.tabs.sendMessage(t.id, { cmd: "scroll-to", id: q.dataset.id }).catch(() => {}), tab ? 100 : 2500);
  }
};

const label = () => ($("#project").value === "*" ? "" : $("#project").value);
$("#export").onclick = async () => download(toMarkdown(shown, label()), `Web Media/Recherche/${label() || "Carnet"} ${new Date().toISOString().slice(0, 10)}.md`);
$("#copy").onclick = async () => {
  await navigator.clipboard.writeText(toMarkdown(shown, label()));
  $("#copy").textContent = "Copié ✓ (colle dans Notion)";
  setTimeout(() => ($("#copy").textContent = "Copier en Markdown"), 2000);
};

const { list, active } = await projects();
$("#project").innerHTML = `<option value="*">Tous les projets</option>` + list.map((p) => `<option ${p === active ? "selected" : ""}>${esc(p)}</option>`).join("");
$("#project").onchange = render;
$("#q").oninput = render;
chrome.storage.onChanged.addListener((c, area) => { if (area === "local" && Object.keys(c).some((k) => k.startsWith("hl:"))) render(); });
render();
