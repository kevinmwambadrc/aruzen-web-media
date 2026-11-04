// Liste des téléchargements en cours : interroge l'hôte toutes les secondes
// seulement s'il y a une tâche active, sinon toutes les 5 s (popup ouverte uniquement).
import { native, esc } from "./lib.js";

const LABEL = { queued: "En attente", starting: "Démarrage", running: "En cours", done: "Terminé", error: "Erreur", cancelled: "Annulé" };
const ICON = { video: "🎬", audio: "🎵", playlist: "📃", subs: "💬", thumb: "🖼", file: "📦" };
const ACTIVE = ["queued", "starting", "running"];

function row(j) {
  const active = ACTIVE.includes(j.status);
  const detail = j.status === "error" ? `<span class="err">${esc(j.error)}</span>`
    : j.status === "running" ? [Math.round(j.percent) + " %", j.item, j.speed, j.eta && "reste " + j.eta].filter(Boolean).map(esc).join(" · ")
    : LABEL[j.status] || j.status;
  return `<div class="job ${j.status}">
    <div class="row"><span>${ICON[j.kind] || "⬇"}</span><span class="grow title1">${esc(j.title)}</span>
      ${active ? `<button class="mini" data-act="cancel" data-id="${esc(j.id)}" title="Annuler">✕</button>`
               : j.status === "done" ? `<button class="mini" data-act="reveal" data-id="${esc(j.id)}" title="Afficher dans le Finder">↗</button>` : ""}
    </div>
    ${active ? `<div class="bar"><i style="width:${Math.max(2, j.percent || 0)}%"></i></div>` : ""}
    <div class="mut small">${detail}</div></div>`;
}

export function mountJobs(el, { kinds = null, limit = 6 } = {}) {
  let timer = 0;
  async function tick() {
    clearTimeout(timer);
    const res = await native({ action: "jobs", limit: 40 });
    if (!res.ok) { el.innerHTML = ""; return; }
    const jobs = res.jobs.filter((j) => !kinds || kinds.includes(j.kind)).slice(0, limit);
    el.innerHTML = jobs.length ? jobs.map(row).join("") : `<div class="empty">Aucun téléchargement pour l'instant</div>`;
    timer = setTimeout(tick, jobs.some((j) => ACTIVE.includes(j.status)) ? 1000 : 5000);
  }
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    await native({ action: b.dataset.act, id: b.dataset.id });
    tick();
  });
  tick();
  return { refresh: tick };
}
