import { native, activeTab, $, esc, isWebUrl, enqueue, renderProbe } from "./shared/lib.js";
import { mountJobs } from "./shared/jobs.js";

const jobs = mountJobs($("#jobs"), { kinds: ["subs", "thumb"] });
const tab = await activeTab();
const url = isWebUrl(tab?.url) ? tab.url : "";
const PREFERRED = ["fr", "en"];

const r = url ? await native({ action: "probe", url }) : { ok: false, error: "Ouvre une page vidéo." };
renderProbe($("#info"), r);

const manual = r.subtitles || [];
const auto = (r.auto_subs || []).filter((l) => !manual.includes(l));
const chip = (l, isAuto) => `<button class="chip ${PREFERRED.includes(l) && (!isAuto || !manual.length) ? "on" : ""}" data-l="${esc(l)}">${esc(l)}${isAuto ? " · auto" : ""}</button>`;
$("#langs").innerHTML = manual.length || auto.length
  ? manual.map((l) => chip(l, false)).join("") + auto.filter((l) => PREFERRED.includes(l) || auto.length < 15).map((l) => chip(l, true)).join("")
  : `<span class="mut">Aucun sous-titre trouvé</span>`;
$("#langs").onclick = (e) => e.target.closest(".chip")?.classList.toggle("on");

$("#subs").onclick = async () => {
  const langs = [...document.querySelectorAll("#langs .chip.on")].map((c) => c.dataset.l);
  await enqueue({ kind: "subs", url, sub_langs: (langs.length ? langs : PREFERRED).join(",") });
  jobs.refresh();
};
$("#thumb").onclick = async () => { await enqueue({ kind: "thumb", url }); jobs.refresh(); };
$("#folder").onclick = () => native({ action: "open_folder", kind: "subs" });
