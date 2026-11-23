import { native, activeTab, $, isWebUrl, remember, persist, formatPicker, AUDIO_QUALITIES, whatsNew } from "./shared/lib.js";
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

whatsNew([
  "Menu ▾ au survol des vidéos : MP4, WEBM, MKV, MOV, AVI, GIF, MP3, M4A, OPUS, FLAC, WAV",
  "Format par défaut des boutons ⬇ et ♪ réglable ici",
  "Qualité 1440p / 360p, codec et débit audio au choix ; bouton ↻ pour relancer un échec",
  "Comptes connectés : stories et vidéos privées via ta session Edge, Chrome, Safari…",
]);

const { quality = "best", vcodec = "compat", audio_quality = "0" } = await remember(["quality", "vcodec", "audio_quality"]);
$("#quality").value = quality;
$("#vcodec").value = vcodec;
$("#aq").innerHTML = AUDIO_QUALITIES.map((q) => `<option value="${q.v}">${q.l}</option>`).join("");
$("#aq").value = audio_quality;
$("#quality").onchange = () => persist({ quality: $("#quality").value });
$("#vcodec").onchange = () => persist({ vcodec: $("#vcodec").value });
$("#aq").onchange = () => persist({ audio_quality: $("#aq").value });
const fm = await chrome.storage.sync.get({ wfmt: "mp4", wafmt: "mp3" });
formatPicker($("#vfmt"), { audio: false, value: fm.wfmt, onChange: (v) => chrome.storage.sync.set({ wfmt: v }) });
formatPicker($("#afmt"), { video: false, value: fm.wafmt, onChange: (v) => chrome.storage.sync.set({ wafmt: v }) });

const st = await native({ action: "settings" });
if (st.ok) {
  $("#par").value = String(st.settings.max_parallel);
  $("#low").checked = st.settings.low_priority;
  $("#cookies").value = st.settings.cookies_browser || "";
}
$("#cookies").onchange = () => native({ action: "settings", set: { cookies_browser: $("#cookies").value } });
$("#par").onchange = () => native({ action: "settings", set: { max_parallel: Number($("#par").value) } });
$("#low").onchange = () => native({ action: "settings", set: { low_priority: $("#low").checked } });

$("#folder").onclick = () => native({ action: "open_folder", kind: "" });
$("#clear").onclick = async () => { await native({ action: "clear" }); jobs.refresh(); };
