import { native, activeTab, $, esc, fmtDur, isWebUrl, enqueue, renderProbe, remember, persist } from "./shared/lib.js";
import { mountJobs } from "./shared/jobs.js";

const jobs = mountJobs($("#jobs"), { kinds: ["playlist"] });
const prefs = await remember(["pl_media", "pl_quality"]);
$("#media").value = prefs.pl_media || "video";
$("#quality").value = prefs.pl_quality || "best";
$("#media").onchange = () => { $("#quality").disabled = $("#media").value === "audio"; };
$("#media").onchange();

const tab = await activeTab();
$("#url").value = isWebUrl(tab?.url) ? tab.url : "";

async function analyse() {
  const url = $("#url").value.trim();
  $("#entries").innerHTML = "";
  if (!isWebUrl(url)) { $("#info").innerHTML = `<div class="mut">Colle le lien d'une playlist.</div>`; return; }
  renderProbe($("#info"), null);
  const r = await native({ action: "probe", url, playlist: true });
  renderProbe($("#info"), r);
  if (r.ok && !r.playlist) $("#info").insertAdjacentHTML("beforeend", `<div class="mut small">Ce lien est une seule vidéo, pas une playlist.</div>`);
  $("#entries").innerHTML = (r.entries || []).map((e, i) =>
    `<div class="item"><span class="mut">${i + 1}</span><span class="url">${esc(e.title)}</span><span class="mut">${fmtDur(e.duration)}</span></div>`).join("");
}

$("#scan").onclick = analyse;
$("#folder").onclick = () => native({ action: "open_folder", kind: "playlist" });
$("#go").onclick = async () => {
  const media = $("#media").value, quality = $("#quality").value;
  persist({ pl_media: media, pl_quality: quality });
  const r = await enqueue({ kind: "playlist", url: $("#url").value.trim(), media, quality, items: $("#items").value.trim() });
  if (!r.ok) $("#info").insertAdjacentHTML("beforeend", `<div class="err small">${esc(r.error)}</div>`);
  jobs.refresh();
};
analyse();
