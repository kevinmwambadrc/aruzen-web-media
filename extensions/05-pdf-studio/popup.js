import { activeTab, $, esc, isWebUrl, remember, persist, whatsNew } from "./shared/lib.js";

whatsNew([
  "Choix du format : PDF, ou image PNG / JPG / WEBP de la page entière",
  "Papier A4, A3, A5, Lettre ou Légal, échelle et pages à imprimer",
  "En-tête (titre, date) et numéros de page en option",
]);
const prefs = await remember(["out", "paper", "scale"]);
$("#out").value = prefs.out || "pdf";
$("#paper").value = prefs.paper || "A4";
$("#scale").value = prefs.scale || "1";
const syncOut = () => document.querySelectorAll(".pdfonly").forEach((r) => (r.hidden = $("#out").value !== "pdf"));
$("#out").onchange = syncOut;
syncOut();

const tab = await activeTab();
$("#ptitle").textContent = tab.title || tab.url;
const PDF = /\.pdf(\?|#|$)/i;

if (PDF.test(tab.url)) {
  $("#thispdf").innerHTML = `<button id="this" class="primary" style="width:100%">Télécharger ce PDF</button>`;
  $("#this").onclick = () => chrome.runtime.sendMessage({ cmd: "pdfs", urls: [tab.url] }).then(() => ($("#this").textContent = "Ajouté ✓"));
}

$("#print").onclick = async () => {
  $("#print").disabled = true;
  const out = $("#out").value;
  persist({ out, paper: $("#paper").value, scale: $("#scale").value });
  $("#pmsg").textContent = out === "pdf" ? "Création du PDF…" : "Capture de la page entière…";
  const r = await chrome.runtime.sendMessage({
    cmd: out === "pdf" ? "print" : "shot", format: out, tabId: tab.id, title: tab.title,
    landscape: $("#landscape").checked, background: $("#background").checked, margins: $("#margins").checked,
    paper: $("#paper").value, scale: Number($("#scale").value), pages: $("#pages").value.trim(), header: $("#header").checked,
  });
  $("#pmsg").innerHTML = r?.ok ? `<span class="ok">Enregistré dans Téléchargements › Web Media › ${out === "pdf" ? "PDF" : "Captures"}${r.note ? " · " + esc(r.note) : ""}</span>` : `<span class="err">${esc(r?.error || "Échec")}</span>`;
  $("#print").disabled = false;
};

let links = [];
if (isWebUrl(tab.url)) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const seen = new Map();
        for (const a of document.querySelectorAll("a[href]")) {
          const h = a.href;
          if (/\.pdf(\?|#|$)/i.test(h) && !seen.has(h)) seen.set(h, (a.textContent || "").trim().slice(0, 90));
        }
        return [...seen].map(([url, text]) => ({ url, text }));
      },
    });
    links = result || [];
  } catch (_) { links = []; }
}
$("#list").innerHTML = links.length ? links.map((l, i) => `
  <label class="item"><input type="checkbox" data-i="${i}"><span class="url" title="${esc(l.url)}">${esc(l.text || l.url.split("/").pop())}</span></label>`).join("")
  : `<div class="empty">Aucun lien PDF sur cette page</div>`;
$("#all").onchange = () => document.querySelectorAll("#list input").forEach((c) => (c.checked = $("#all").checked));
$("#dl").onclick = async () => {
  const urls = [...document.querySelectorAll("#list input:checked")].map((c) => links[c.dataset.i].url);
  if (!urls.length) return;
  await chrome.runtime.sendMessage({ cmd: "pdfs", urls });
  $("#dl").textContent = `${urls.length} PDF en cours ✓`;
};
