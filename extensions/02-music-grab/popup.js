import { native, activeTab, $, esc, isWebUrl, enqueue, renderProbe, remember, persist,
  formatPicker, AUDIO_QUALITIES, playbackTime, whatsNew } from "./shared/lib.js";
import { mountJobs } from "./shared/jobs.js";

whatsNew([
  "Nouveau format AAC, en plus de MP3, M4A, OPUS, FLAC et WAV",
  "Débit au choix : meilleur, 320, 192 ou 128 kb/s",
  "Extrait : garde seulement un passage (⏱ = position de lecture)",
  "Pochette intégrée aussi en FLAC et OPUS ; ↻ relance un échec",
]);

const jobs = mountJobs($("#jobs"), { kinds: ["audio"] });
const prefs = await remember(["audio_format", "audio_quality"]);
$("#aq").innerHTML = AUDIO_QUALITIES.map((q) => `<option value="${q.v}">${q.l}</option>`).join("");
$("#aq").value = prefs.audio_quality || "0";
const lossless = (f) => f === "flac" || f === "wav";
const picker = formatPicker($("#formats"), { video: false, value: prefs.audio_format || "mp3",
  onChange: (f) => ($("#aqWrap").hidden = lossless(f)) });
$("#aqWrap").hidden = lossless(picker.get());

const tab = await activeTab();
$("#url").value = isWebUrl(tab?.url) ? tab.url : "";

let analysed = "";
async function analyse() {
  const url = $("#url").value.trim();
  if (url === analysed) return; // même lien : pas de nouvelle analyse (évite de faire sauter la fenêtre)
  analysed = url;
  if (!isWebUrl(url)) { $("#info").innerHTML = `<div class="mut">Colle le lien d'un morceau ou d'une vidéo.</div>`; return; }
  const info = $("#info");
  info.style.minHeight = info.offsetHeight + "px"; // hauteur stable pendant l'analyse
  renderProbe(info, null);
  const r = await native({ action: "probe", url });
  if (url !== analysed) return;
  renderProbe(info, r);
  info.style.minHeight = "";
}
async function setNow(field) {
  const t = await playbackTime(tab.id);
  if (t) $(field).value = t; else $("#msg").innerHTML = `<span class="mut">Rien en lecture sur la page.</span>`;
}
$("#startNow").onclick = () => setNow("#start");
$("#endNow").onclick = () => setNow("#end");
$("#clip0").onclick = () => { $("#start").value = ""; $("#end").value = ""; };
$("#url").addEventListener("change", analyse);
$("#folder").onclick = () => native({ action: "open_folder", kind: "audio" });
$("#go").onclick = async () => {
  const audio_format = picker.get(), audio_quality = $("#aq").value;
  persist({ audio_format, audio_quality });
  const r = await enqueue({ kind: "audio", url: $("#url").value.trim(), audio_format, audio_quality,
    start: $("#start").value.trim(), end: $("#end").value.trim() });
  $("#msg").innerHTML = r.ok ? `<span class="ok">Ajouté en ${esc(audio_format.toUpperCase())}</span>` : `<span class="err">${esc(r.error)}</span>`;
  jobs.refresh();
};
analyse();
