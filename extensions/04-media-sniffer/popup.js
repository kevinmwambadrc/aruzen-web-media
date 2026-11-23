import { native, activeTab, $, esc, isWebUrl, enqueue, fmtSize, remember, persist, whatsNew } from "./shared/lib.js";
import { mountJobs } from "./shared/jobs.js";

whatsNew([
  "Filtre par type : vidéo, audio ou flux",
  "Flux HLS/DASH reconstitués au format choisi : MP4, MKV, WEBM, MOV, MP3 ou M4A",
  "« Tout télécharger » et « Copier les liens » en un clic ; ↻ relance un échec",
]);

const jobs = mountJobs($("#jobs"), { kinds: ["file", "video", "audio"], limit: 4 });
const tab = await activeTab();
const { sniff_fmt = "mp4" } = await remember(["sniff_fmt"]);
$("#sfmt").value = sniff_fmt;
$("#sfmt").onchange = () => persist({ sniff_fmt: $("#sfmt").value });

const CATS = { Tout: () => true, Vidéo: (it) => it.kind === "VIDÉO", Audio: (it) => it.kind === "AUDIO", Flux: (it) => it.kind === "HLS" || it.kind === "DASH" };
let cat = "Tout", list = [];
const shown = () => list.map((it, i) => ({ ...it, i })).filter(CATS[cat]);

async function grab(it) {
  return chrome.runtime.sendMessage({ cmd: "grab", item: it, pageUrl: tab.url, fmt: $("#sfmt").value });
}

async function render() {
  const key = "t" + tab.id;
  ({ [key]: list = [] } = await chrome.storage.session.get(key));
  $("#cats").innerHTML = Object.keys(CATS).map((c) => {
    const n = list.filter(CATS[c]).length;
    return c === "Tout" || n ? `<button class="chip ${c === cat ? "on" : ""}" data-c="${c}">${c} ${n}</button>` : "";
  }).join("");
  const items = shown();
  $("#list").innerHTML = items.length ? items.map((it) => `
    <div class="item"><span class="tag">${it.kind}</span>
      <span class="url" title="${esc(it.url)}">${esc(decodeURIComponent(it.url.split("?")[0].split("/").pop() || it.url))}</span>
      <span class="mut small">${fmtSize(it.size)}</span>
      <button class="mini" data-i="${it.i}" data-a="dl" title="Télécharger">⬇</button>
      <button class="mini" data-i="${it.i}" data-a="copy" title="Copier le lien">⧉</button></div>`).join("")
    : `<div class="empty">Rien pour l'instant</div>`;
  $("#dlAll").disabled = !items.length;
  $("#copyAll").disabled = !items.length;
}

$("#cats").onclick = (e) => { const b = e.target.closest(".chip"); if (b) { cat = b.dataset.c; render(); } };
$("#list").onclick = async (e) => {
  const b = e.target.closest("button[data-a]");
  if (!b) return;
  const it = list[b.dataset.i];
  if (b.dataset.a === "copy") { await navigator.clipboard.writeText(it.url); b.textContent = "✓"; return; }
  b.disabled = true;
  const r = await grab(it);
  b.textContent = r?.ok ? "✓" : "!";
  jobs.refresh();
};
$("#dlAll").onclick = async () => {
  const items = shown();
  $("#dlAll").disabled = true;
  for (const it of items) await grab(it);
  $("#dlAll").textContent = `${items.length} envoyé(s) ✓`;
  jobs.refresh();
};
$("#copyAll").onclick = async () => {
  await navigator.clipboard.writeText(shown().map((it) => it.url).join("\n"));
  $("#copyAll").textContent = "Copié ✓";
};
$("#page").onclick = async () => {
  if (isWebUrl(tab.url)) {
    const f = $("#sfmt").value, audio = f === "mp3" || f === "m4a";
    await enqueue(audio ? { kind: "audio", url: tab.url, audio_format: f } : { kind: "video", url: tab.url, container: f });
  }
  jobs.refresh();
};
$("#folder").onclick = () => native({ action: "open_folder", kind: "file" });
chrome.storage.session.onChanged.addListener((c) => { if (c["t" + tab.id]) render(); });
render();
