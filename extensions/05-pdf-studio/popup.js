import { activeTab, $, esc, isWebUrl } from "./shared/lib.js";

const tab = await activeTab();
$("#ptitle").textContent = tab.title || tab.url;
const PDF = /\.pdf(\?|#|$)/i;

if (PDF.test(tab.url)) {
  $("#thispdf").innerHTML = `<button id="this" class="primary" style="width:100%">Télécharger ce PDF</button>`;
  $("#this").onclick = () => chrome.runtime.sendMessage({ cmd: "pdfs", urls: [tab.url] }).then(() => ($("#this").textContent = "Ajouté ✓"));
}

$("#print").onclick = async () => {
  $("#print").disabled = true;
  $("#pmsg").textContent = "Création du PDF…";
  const r = await chrome.runtime.sendMessage({
    cmd: "print", tabId: tab.id, title: tab.title,
    landscape: $("#landscape").checked, background: $("#background").checked, margins: $("#margins").checked,
  });
  $("#pmsg").innerHTML = r?.ok ? `<span class="ok">Enregistré dans Téléchargements › Web Media › PDF</span>` : `<span class="err">${esc(r?.error || "Échec")}</span>`;
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
