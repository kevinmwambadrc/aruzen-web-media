import { native, activeTab, $, esc, isWebUrl, enqueue, renderProbe, remember, persist,
  formatPicker, isAudioFmt, AUDIO_QUALITIES, fmtSize, playbackTime, whatsNew } from "./shared/lib.js";
import { mountJobs } from "./shared/jobs.js";

whatsNew([
  "Choix du format : MP4, WEBM, MKV, MOV, AVI, GIF animé ou audio seul (MP3, M4A, AAC, OPUS, FLAC, WAV)",
  "Taille estimée pour chaque qualité, jusqu'à la 4K",
  "Extrait : télécharge seulement un passage (⏱ prend la position de lecture)",
  "Sous-titres intégrés à la vidéo, bouton ↻ pour relancer un échec",
  "Clic droit › « Télécharger en… » pour choisir le format sans ouvrir la fenêtre",
]);

const jobs = mountJobs($("#jobs"), { kinds: ["video", "audio"] });
const prefs = await remember(["quality", "container", "vcodec", "audio_quality", "embed_subs"]);
$("#aq").innerHTML = AUDIO_QUALITIES.map((q) => `<option value="${q.v}">${q.l}</option>`).join("");
$("#aq").value = prefs.audio_quality || "0";
$("#vcodec").value = prefs.vcodec || "compat";
$("#subs").checked = !!prefs.embed_subs;

let probe = null;
const picker = formatPicker($("#formats"), { value: prefs.container || "mp4", onChange: refreshOptions });

function refreshOptions() {
  const f = picker.get(), audio = isAudioFmt(f);
  $("#qWrap").hidden = audio;
  $("#aqWrap").hidden = !audio || f === "flac" || f === "wav";
  // Le codec ne se choisit que là où il change vraiment quelque chose.
  $("#codecWrap").hidden = audio || !["mp4", "mkv"].includes(f);
  $("#subsWrap").hidden = audio || !["mp4", "mkv", "webm", "mov"].includes(f);
  fillQualities();
  if (f === "gif" && !$("#start").value && !$("#end").value && (probe?.duration || 0) > 30) {
    $("#adv").open = true;
    $("#msg").innerHTML = `<span class="mut">Astuce : pour un GIF, choisis un extrait court (début / fin).</span>`;
  } else $("#msg").textContent = "";
}

function fillQualities() {
  const q = $("#quality"), keep = q.value || prefs.quality;
  const gif = picker.get() === "gif";
  const compat = $("#vcodec").value === "compat" && ["mp4", "mkv", "mov", "avi"].includes(picker.get());
  const heights = (probe?.heights || []).filter((h) => h >= 144 && (!gif || h <= 480));
  q.innerHTML = `<option value="best">Meilleure</option>` + heights.map((h) => {
    const label = h >= 2160 ? "4K" : h >= 1440 ? "1440p (2K)" : h + "p";
    const size = gif ? "" : fmtSize(probe?.sizes?.[h]);
    const note = compat && h > 1080 ? " · VP9/AV1" : "";
    return `<option value="${h}">${label}${size ? " · ~" + size : ""}${note}</option>`;
  }).join("");
  if ([...q.options].some((o) => o.value === keep)) q.value = keep;
}

const tab = await activeTab();
$("#url").value = isWebUrl(tab?.url) ? tab.url : "";

let analysed = "";
async function analyse() {
  const url = $("#url").value.trim();
  if (url === analysed) return; // même lien : pas de nouvelle analyse (évite de faire sauter la fenêtre)
  analysed = url;
  if (!isWebUrl(url)) { $("#info").innerHTML = `<div class="mut">Colle le lien d'une vidéo.</div>`; return; }
  const info = $("#info");
  info.style.minHeight = info.offsetHeight + "px"; // hauteur stable pendant l'analyse
  renderProbe(info, null);
  probe = await native({ action: "probe", url });
  if (url !== analysed) return;
  renderProbe(info, probe);
  info.style.minHeight = "";
  refreshOptions();
}

async function setNow(field) {
  const t = await playbackTime(tab.id);
  if (t) $(field).value = t;
  else $("#msg").innerHTML = `<span class="mut">Aucune vidéo en lecture sur la page.</span>`;
}
$("#startNow").onclick = () => setNow("#start");
$("#endNow").onclick = () => setNow("#end");
$("#clip0").onclick = () => { $("#start").value = ""; $("#end").value = ""; };
$("#vcodec").onchange = fillQualities;
$("#url").addEventListener("change", analyse);
$("#folder").onclick = () => native({ action: "open_folder", kind: isAudioFmt(picker.get()) ? "audio" : "video" });

$("#go").onclick = async () => {
  const f = picker.get(), audio = isAudioFmt(f);
  const opts = {
    container: audio ? prefs.container || "mp4" : f, quality: $("#quality").value, vcodec: $("#vcodec").value,
    audio_quality: $("#aq").value, embed_subs: $("#subs").checked,
  };
  persist({ ...opts, container: f });
  const req = { url: $("#url").value.trim(), start: $("#start").value.trim(), end: $("#end").value.trim() };
  const r = await enqueue(audio
    ? { kind: "audio", audio_format: f, audio_quality: opts.audio_quality, ...req }
    : { kind: "video", ...opts, ...req });
  $("#msg").innerHTML = r.ok ? `<span class="ok">Ajouté : ${esc(f.toUpperCase())}${req.start || req.end ? " (extrait)" : ""}</span>`
    : `<span class="err">${esc(r.error)}</span>`;
  jobs.refresh();
};
refreshOptions();
analyse();
