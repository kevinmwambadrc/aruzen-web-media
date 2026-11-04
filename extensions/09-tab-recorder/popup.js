import { activeTab, $, esc } from "./shared/lib.js";

const tab = await activeTab();
let timer = 0;

async function refresh() {
  const { rec } = await chrome.storage.session.get("rec");
  clearInterval(timer);
  $("#opts").hidden = !!rec;
  $("#ttitle").textContent = rec ? "En cours : " + rec.title : tab.title;
  $("#toggle").textContent = rec ? "■ Arrêter et enregistrer" : "● Démarrer l'enregistrement";
  const tick = () => {
    const s = rec ? Math.floor((Date.now() - rec.started) / 1000) : 0;
    $("#timer").textContent = (s >= 3600 ? Math.floor(s / 3600) + ":" : "") +
      String(Math.floor(s / 60) % 60).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  };
  tick();
  if (rec) timer = setInterval(tick, 1000);
  return rec;
}

$("#toggle").onclick = async () => {
  $("#toggle").disabled = true;
  const rec = (await chrome.storage.session.get("rec")).rec;
  const r = rec
    ? await chrome.runtime.sendMessage({ cmd: "stop" })
    : await chrome.runtime.sendMessage({ cmd: "start", tabId: tab.id, title: tab.title, audio: $("#audio").checked, bitrate: Number($("#bitrate").value) });
  if (!r?.ok) $("#msg").innerHTML = `<span class="err">${esc(r?.error || "Impossible d'enregistrer cet onglet")}</span>`;
  $("#toggle").disabled = false;
};
chrome.storage.session.onChanged.addListener(refresh);
refresh();
