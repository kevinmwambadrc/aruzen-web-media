import { activeTab, $, esc, isWebUrl } from "./shared/lib.js";

const CATS = {
  Documents: "pdf|docx?|xlsx?|pptx?|odt|ods|odp|rtf|txt|csv|epub|pages|numbers|key",
  Archives: "zip|rar|7z|tar|gz|tgz|bz2|xz",
  Audio: "mp3|m4a|aac|wav|flac|ogg|opus",
  Vidéo: "mp4|m4v|mov|mkv|webm|avi",
  Images: "jpe?g|png|gif|webp|svg|psd|ai|eps|tiff?|heic",
  Apps: "dmg|pkg|exe|msi|apk|ipa|iso",
  Polices: "ttf|otf|woff2?",
};
const ALL = new RegExp("\\.(" + Object.values(CATS).join("|") + ")(\\?|#|$)", "i");
const catOf = (u) => Object.keys(CATS).find((c) => new RegExp("\\.(" + CATS[c] + ")(\\?|#|$)", "i").test(u));

const tab = await activeTab();
let links = [];
if (isWebUrl(tab.url)) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => [...document.querySelectorAll("a[href]")].map((a) => ({ url: a.href, text: (a.textContent || "").trim().slice(0, 80) })),
    });
    const seen = new Set();
    links = (result || []).filter((l) => ALL.test(l.url) && !seen.has(l.url) && seen.add(l.url)).map((l) => ({ ...l, cat: catOf(l.url) }));
  } catch (_) { links = []; }
}

let cat = "Tout";
const present = ["Tout", ...Object.keys(CATS).filter((c) => links.some((l) => l.cat === c))];
function renderCats() {
  $("#cats").innerHTML = present.map((c) => `<button class="chip ${c === cat ? "on" : ""}" data-c="${c}">${c} ${c === "Tout" ? links.length : links.filter((l) => l.cat === c).length}</button>`).join("");
}
function render() {
  const q = $("#filter").value.toLowerCase();
  const shown = links.map((l, i) => ({ ...l, i }))
    .filter((l) => (cat === "Tout" || l.cat === cat) && (!q || (l.url + " " + l.text).toLowerCase().includes(q)));
  $("#count").textContent = shown.length + " fichier(s)";
  $("#list").innerHTML = shown.length ? shown.map((l) => {
    const name = decodeURIComponent(l.url.split(/[?#]/)[0].split("/").pop());
    const ext = (name.match(/\.(\w+)$/) || [])[1] || "";
    return `<label class="item"><input type="checkbox" data-i="${l.i}"><span class="tag">${esc(ext.toUpperCase())}</span>
      <span class="url" title="${esc(l.url)}">${esc(l.text && l.text !== name ? l.text + " — " + name : name)}</span></label>`;
  }).join("") : `<div class="empty">Aucun fichier lié</div>`;
}
$("#cats").onclick = (e) => { const b = e.target.closest(".chip"); if (b) { cat = b.dataset.c; renderCats(); render(); } };
$("#filter").oninput = render;
$("#all").onchange = () => document.querySelectorAll("#list input").forEach((c) => (c.checked = $("#all").checked));
$("#dl").onclick = async () => {
  const urls = [...document.querySelectorAll("#list input:checked")].map((c) => links[c.dataset.i].url);
  if (!urls.length) return;
  await chrome.runtime.sendMessage({ cmd: "links", urls, pageUrl: tab.url });
  $("#dl").textContent = `${urls.length} en file ✓`;
};
renderCats();
render();
