import { native, activeTab, $, esc, isWebUrl, enqueue, renderProbe, remember, persist } from "./shared/lib.js";
import { mountJobs } from "./shared/jobs.js";

const jobs = mountJobs($("#jobs"), { kinds: ["video"] });
const prefs = await remember(["quality", "container"]);
$("#container").value = prefs.container || "mp4";

const tab = await activeTab();
$("#url").value = isWebUrl(tab?.url) ? tab.url : "";

async function analyse() {
  const url = $("#url").value.trim();
  if (!isWebUrl(url)) { $("#info").innerHTML = `<div class="mut">Colle le lien d'une vidéo.</div>`; return; }
  renderProbe($("#info"), null);
  const r = await native({ action: "probe", url });
  renderProbe($("#info"), r);
  const q = $("#quality");
  q.innerHTML = `<option value="best">Meilleure</option>` +
    (r.heights || []).filter((h) => h >= 144).map((h) => `<option value="${h}">${h}p</option>`).join("");
  if ([...q.options].some((o) => o.value === prefs.quality)) q.value = prefs.quality;
}

$("#url").addEventListener("change", analyse);
$("#folder").onclick = () => native({ action: "open_folder", kind: "video" });
$("#go").onclick = async () => {
  const quality = $("#quality").value, container = $("#container").value;
  persist({ quality, container });
  const r = await enqueue({ kind: "video", url: $("#url").value.trim(), quality, container });
  if (!r.ok) $("#info").insertAdjacentHTML("beforeend", `<div class="err small">${esc(r.error)}</div>`);
  jobs.refresh();
};
analyse();
