import { activeTab, $, esc, remember, persist, whatsNew } from "./shared/lib.js";

whatsNew([
  "Choix du format : MP4 (H.264) ou WEBM (VP9)",
  "Définition jusqu'à la 4K et 60 images/s",
  "Pause / reprise pendant l'enregistrement",
]);

const tab = await activeTab();
let timer = 0;
const prefs = await remember(["rec_fmt", "rec_res", "rec_fps", "rec_bitrate"]);
for (const [id, k] of [["fmt", "rec_fmt"], ["res", "rec_res"], ["fps", "rec_fps"], ["bitrate", "rec_bitrate"]]) {
  if (prefs[k]) $("#" + id).value = prefs[k];
  $("#" + id).onchange = () => persist({ [k]: $("#" + id).value });
}
// Durée enregistrée hors pauses.
const elapsed = (rec) => Math.floor(((rec.paused || Date.now()) - rec.started - (rec.pausedTotal || 0)) / 1000);

async function refresh() {
  const { rec } = await chrome.storage.session.get("rec");
  clearInterval(timer);
  $("#opts").hidden = !!rec;
  $("#ttitle").textContent = rec ? "En cours : " + rec.title : tab.title;
  $("#toggle").textContent = rec ? "■ Arrêter et enregistrer" : "● Démarrer l'enregistrement";
  $("#pause").hidden = !rec;
  $("#pause").textContent = rec?.paused ? "▶ Reprendre" : "❚❚ Pause";
  const tick = () => {
    const s = rec ? elapsed(rec) : 0;
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
    : await chrome.runtime.sendMessage({ cmd: "start", tabId: tab.id, title: tab.title, audio: $("#audio").checked,
      bitrate: Number($("#bitrate").value), fmt: $("#fmt").value, width: Number($("#res").value), fps: Number($("#fps").value) });
  if (!r?.ok) $("#msg").innerHTML = `<span class="err">${esc(r?.error || "Impossible d'enregistrer cet onglet")}</span>`;
  $("#toggle").disabled = false;
};
$("#pause").onclick = () => chrome.runtime.sendMessage({ cmd: "pause" });
chrome.storage.session.onChanged.addListener(refresh);
refresh();
