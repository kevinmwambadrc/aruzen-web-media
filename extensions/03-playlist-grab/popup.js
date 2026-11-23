import { native, activeTab, $, esc, fmtDur, isWebUrl, enqueue, renderProbe, remember, persist,
  formatPicker, isAudioFmt, AUDIO_QUALITIES, whatsNew } from "./shared/lib.js";
import { mountJobs } from "./shared/jobs.js";

whatsNew([
  "Choix du format pour toute la playlist : MP4, WEBM, MKV, MOV, AVI, GIF ou audio (MP3, M4A, AAC, OPUS, FLAC, WAV)",
  "Coche les éléments voulus directement dans la liste",
  "Qualités 4K et 360p, débit audio réglable ; ↻ relance un échec",
]);

const jobs = mountJobs($("#jobs"), { kinds: ["playlist"] });
const prefs = await remember(["pl_fmt", "pl_quality", "pl_aq"]);
$("#quality").value = prefs.pl_quality || "best";
$("#aq").innerHTML = AUDIO_QUALITIES.map((q) => `<option value="${q.v}">${q.l}</option>`).join("");
$("#aq").value = prefs.pl_aq || "0";
const picker = formatPicker($("#formats"), { value: prefs.pl_fmt || "mp4", onChange: toggle });
function toggle() {
  const f = picker.get(), audio = isAudioFmt(f);
  $("#qWrap").hidden = audio;
  $("#aqWrap").hidden = !audio || f === "flac" || f === "wav";
}
toggle();

const tab = await activeTab();
$("#url").value = isWebUrl(tab?.url) ? tab.url : "";

// Coches → « 1-3,7,9-12 »
function ranges(nums) {
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    out.push(j > i ? nums[i] + "-" + nums[j] : String(nums[i]));
    i = j;
  }
  return out.join(",");
}
function syncItems() {
  const boxes = [...document.querySelectorAll("#entries input")];
  const on = boxes.filter((c) => c.checked).map((c) => Number(c.dataset.n));
  $("#sel").textContent = boxes.length ? `${on.length} / ${boxes.length} coché(s)` : "";
  $("#items").value = on.length && on.length < boxes.length ? ranges(on) : "";
}

async function analyse() {
  const url = $("#url").value.trim();
  $("#entries").innerHTML = "";
  if (!isWebUrl(url)) { $("#info").innerHTML = `<div class="mut">Colle le lien d'une playlist.</div>`; return; }
  renderProbe($("#info"), null);
  const r = await native({ action: "probe", url, playlist: true });
  renderProbe($("#info"), r);
  if (r.ok && !r.playlist) $("#info").insertAdjacentHTML("beforeend", `<div class="mut small">Ce lien est une seule vidéo, pas une playlist.</div>`);
  $("#entries").innerHTML = (r.entries || []).map((e, i) =>
    `<label class="item"><input type="checkbox" data-n="${i + 1}" checked><span class="mut">${i + 1}</span><span class="url">${esc(e.title)}</span><span class="mut">${fmtDur(e.duration)}</span></label>`).join("");
  $("#all").checked = true;
  syncItems();
}

$("#entries").onchange = syncItems;
$("#all").onchange = () => { document.querySelectorAll("#entries input").forEach((c) => (c.checked = $("#all").checked)); syncItems(); };
$("#scan").onclick = analyse;
$("#folder").onclick = () => native({ action: "open_folder", kind: "playlist" });
$("#go").onclick = async () => {
  const f = picker.get(), audio = isAudioFmt(f), quality = $("#quality").value, aq = $("#aq").value;
  const boxes = document.querySelectorAll("#entries input");
  if (boxes.length && ![...boxes].some((c) => c.checked)) { $("#msg").innerHTML = `<span class="err">Coche au moins un élément.</span>`; return; }
  persist({ pl_fmt: f, pl_quality: quality, pl_aq: aq });
  const r = await enqueue({ kind: "playlist", url: $("#url").value.trim(), media: audio ? "audio" : "video",
    container: audio ? "mp4" : f, audio_format: audio ? f : "mp3", audio_quality: aq, quality, items: $("#items").value.trim() });
  $("#msg").innerHTML = r.ok ? `<span class="ok">Playlist ajoutée en ${esc(f.toUpperCase())}</span>` : `<span class="err">${esc(r.error)}</span>`;
  jobs.refresh();
};
analyse();
