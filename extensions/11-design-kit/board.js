import { listBoards, listItems, addItem, deleteItem, createBoard, deleteBoard, saveBoard, activeBoard } from "./db.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
let board = null, items = [], urls = [];

async function render() {
  board = await activeBoard();
  const boards = await listBoards();
  $("#board").innerHTML = boards.map((b) => `<option value="${b.id}" ${b.id === board.id ? "selected" : ""}>${esc(b.name)}</option>`).join("");
  $("#title").textContent = board.name;
  document.title = board.name + " · Moodboard";
  items = await listItems(board.id);
  urls.forEach(URL.revokeObjectURL);
  urls = items.map((it) => URL.createObjectURL(it.blob));
  $("#count").textContent = items.length + " image(s)";
  const site = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (_) { return "fichier local"; } };
  $("#wall").innerHTML = items.map((it, i) => `
    <figure class="card"><img src="${urls[i]}" alt="" loading="lazy">
      <button class="x" data-id="${it.id}" title="Retirer">✕</button>
      <figcaption class="meta">${it.page ? `<a href="${esc(it.page)}" target="_blank" title="${esc(it.title || it.page)}">${esc(site(it.page))}</a>` : `<span>${esc(it.title || "Ajout manuel")}</span>`}
      ${it.w ? `<span>${it.w}×${it.h}</span>` : ""}</figcaption></figure>`).join("");
}

$("#wall").onclick = async (e) => {
  const b = e.target.closest(".x");
  if (b) { await deleteItem(b.dataset.id); render(); }
};
$("#board").onchange = async () => { await chrome.storage.local.set({ activeBoard: $("#board").value }); render(); };
$("#new").onclick = async () => { const n = prompt("Nom du nouveau tableau :"); if (n) { await createBoard(n.trim()); render(); } };
$("#rename").onclick = async () => { const n = prompt("Nouveau nom :", board.name); if (n) { await saveBoard({ ...board, name: n.trim() }); render(); } };
$("#del").onclick = async () => {
  if (!confirm(`Supprimer le tableau « ${board.name} » et ses ${items.length} image(s) ?`)) return;
  await deleteBoard(board.id);
  await chrome.storage.local.remove("activeBoard");
  render();
};
$("#pdf").onclick = () => window.print();
$("#files").onclick = () => {
  const dir = "Web Media/Moodboards/" + board.name.replace(/[\\/:*?"<>|]+/g, " ").trim() + "/";
  items.forEach((it, i) => {
    const ext = (it.blob.type.split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
    chrome.downloads.download({ url: urls[i], filename: `${dir}${String(i + 1).padStart(2, "0")}.${ext}`, conflictAction: "uniquify" });
  });
};

// Ajout depuis le Finder (glisser) ou le presse-papiers (⌘V).
async function addFiles(files) {
  for (const f of files) if (f.type.startsWith("image/")) {
    let d = { w: 0, h: 0 };
    try { const bmp = await createImageBitmap(f); d = { w: bmp.width, h: bmp.height }; bmp.close(); } catch (_) { /* SVG */ }
    await addItem({ board: board.id, blob: f, src: "", page: "", title: f.name || "Collé", ...d });
  }
  render();
}
addEventListener("dragover", (e) => { e.preventDefault(); $("#drop").classList.add("over"); });
addEventListener("dragleave", () => $("#drop").classList.remove("over"));
addEventListener("drop", async (e) => {
  e.preventDefault();
  $("#drop").classList.remove("over");
  if (e.dataTransfer.files.length) return addFiles(e.dataTransfer.files);
  const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
  if (/^https?:/.test(url)) {
    const r = await chrome.runtime.sendMessage({ cmd: "add-image", url, page: url, title: "" });
    if (r?.ok) render();
  }
});
addEventListener("paste", (e) => addFiles([...e.clipboardData.files]));
chrome.storage.onChanged.addListener((c) => c.activeBoard && render());
render();
