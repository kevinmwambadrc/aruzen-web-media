import { native, activeTab, $, isWebUrl, remember, persist } from "./shared/lib.js";
import { mountJobs } from "./shared/jobs.js";

const jobs = mountJobs($("#jobs"), { limit: 8 });
const tab = await activeTab();
const site = isWebUrl(tab?.url) ? new URL(tab.url).hostname : "";
const s = await chrome.storage.sync.get({ enabled: true, off: [] });

$("#enabled").checked = s.enabled;
$("#enabled").onchange = () => chrome.storage.sync.set({ enabled: $("#enabled").checked });

function siteLabel() {
  $("#site").hidden = !site;
  $("#site").textContent = s.off.includes(site) ? "Réactiver sur ce site" : "Masquer sur ce site";
}
$("#site").onclick = async () => {
  s.off = s.off.includes(site) ? s.off.filter((h) => h !== site) : [...s.off, site];
  await chrome.storage.sync.set({ off: s.off });
  siteLabel();
};
siteLabel();

const { quality = "best" } = await remember(["quality"]);
$("#quality").value = quality;
$("#quality").onchange = () => persist({ quality: $("#quality").value });

const st = await native({ action: "settings" });
if (st.ok) {
  $("#par").value = String(st.settings.max_parallel);
  $("#low").checked = st.settings.low_priority;
}
$("#par").onchange = () => native({ action: "settings", set: { max_parallel: Number($("#par").value) } });
$("#low").onchange = () => native({ action: "settings", set: { low_priority: $("#low").checked } });

$("#folder").onclick = () => native({ action: "open_folder", kind: "" });
$("#clear").onclick = async () => { await native({ action: "clear" }); jobs.refresh(); };
