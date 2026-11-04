import { native, activeTab, $, esc, isWebUrl, enqueue } from "./shared/lib.js";
import { mountJobs } from "./shared/jobs.js";

const jobs = mountJobs($("#jobs"), { kinds: ["file", "video"], limit: 4 });
const tab = await activeTab();
const fmtSize = (b) => (!b ? "" : b > 1e9 ? (b / 1e9).toFixed(1) + " Go" : b > 1e6 ? (b / 1e6).toFixed(1) + " Mo" : Math.round(b / 1e3) + " Ko");

async function render() {
  const key = "t" + tab.id;
  const { [key]: list = [] } = await chrome.storage.session.get(key);
  $("#list").innerHTML = list.length ? list.map((it, i) => `
    <div class="item"><span class="tag">${it.kind}</span>
      <span class="url" title="${esc(it.url)}">${esc(decodeURIComponent(it.url.split("?")[0].split("/").pop() || it.url))}</span>
      <span class="mut small">${fmtSize(it.size)}</span>
      <button class="mini" data-i="${i}" data-a="dl" title="Télécharger">⬇</button>
      <button class="mini" data-i="${i}" data-a="copy" title="Copier le lien">⧉</button></div>`).join("")
    : `<div class="empty">Rien pour l'instant</div>`;
  $("#list").onclick = async (e) => {
    const b = e.target.closest("button[data-a]");
    if (!b) return;
    const it = list[b.dataset.i];
    if (b.dataset.a === "copy") { await navigator.clipboard.writeText(it.url); b.textContent = "✓"; return; }
    b.disabled = true;
    const r = await chrome.runtime.sendMessage({ cmd: "grab", item: it, pageUrl: tab.url });
    b.textContent = r?.ok ? "✓" : "!";
    jobs.refresh();
  };
}

$("#page").onclick = async () => { if (isWebUrl(tab.url)) await enqueue({ kind: "video", url: tab.url }); jobs.refresh(); };
$("#folder").onclick = () => native({ action: "open_folder", kind: "file" });
chrome.storage.session.onChanged.addListener((c) => { if (c["t" + tab.id]) render(); });
render();
