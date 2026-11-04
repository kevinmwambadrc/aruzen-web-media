import { native, activeTab, $, esc, isWebUrl, enqueue, renderProbe, remember, persist } from "./shared/lib.js";
import { mountJobs } from "./shared/jobs.js";

const jobs = mountJobs($("#jobs"), { kinds: ["audio"] });
const prefs = await remember(["audio_format"]);
$("#fmt").value = prefs.audio_format || "mp3";

const tab = await activeTab();
$("#url").value = isWebUrl(tab?.url) ? tab.url : "";

async function analyse() {
  const url = $("#url").value.trim();
  if (!isWebUrl(url)) { $("#info").innerHTML = `<div class="mut">Colle le lien d'un morceau ou d'une vidéo.</div>`; return; }
  renderProbe($("#info"), null);
  renderProbe($("#info"), await native({ action: "probe", url }));
}

$("#url").addEventListener("change", analyse);
$("#folder").onclick = () => native({ action: "open_folder", kind: "audio" });
$("#go").onclick = async () => {
  const audio_format = $("#fmt").value;
  persist({ audio_format });
  const r = await enqueue({ kind: "audio", url: $("#url").value.trim(), audio_format });
  if (!r.ok) $("#info").insertAdjacentHTML("beforeend", `<div class="err small">${esc(r.error)}</div>`);
  jobs.refresh();
};
analyse();
