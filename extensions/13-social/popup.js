import { activeTab, $, esc, isWebUrl } from "./shared/lib.js";
import { getLibrary, fill, UTM_EXTRA } from "./data.js";
import { buildUtm, remember } from "./utm.js";
import { insertAtCursor } from "./insert.js";

const tab = await activeTab();
const web = isWebUrl(tab?.url);

document.querySelector(".tabs").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
  document.querySelectorAll(".pane").forEach((p) => (p.hidden = p.id !== b.dataset.tab));
  chrome.storage.local.set({ lastTab: b.dataset.tab });
};
$("#studio").onclick = async () => { await chrome.sidePanel.open({ windowId: tab.windowId }); window.close(); };
$("#settings").onclick = () => { chrome.runtime.openOptionsPage(); window.close(); };

// ---------- Légendes ----------
const { brands, snippets, networks } = await getLibrary();
const { lastBrand = brands[0]?.name } = await chrome.storage.local.get("lastBrand");
$("#brand").innerHTML = brands.map((b) => `<option ${b.name === lastBrand ? "selected" : ""}>${esc(b.name)}</option>`).join("");

function renderSnips() {
  const mine = snippets.filter((s) => s.brand === $("#brand").value || s.brand === "*");
  $("#snips").innerHTML = mine.map((s) => `
    <div class="item snip"><div class="row"><b class="grow">${s.kind === "hashtags" ? "#" : "✎"} ${esc(s.title)}</b>
      <button class="mini" data-a="ins" data-id="${s.id}">Insérer</button><button class="mini" data-a="copy" data-id="${s.id}">Copier</button></div>
      <div class="txt">${esc(s.text)}</div></div>`).join("") || `<div class="empty">Aucune légende pour cette marque</div>`;
}
$("#brand").onchange = () => { chrome.storage.local.set({ lastBrand: $("#brand").value }); renderSnips(); };
$("#snips").onclick = async (e) => {
  const b = e.target.closest("button[data-a]");
  if (!b) return;
  const text = await fill(snippets.find((s) => s.id === b.dataset.id).text);
  let done = false;
  if (b.dataset.a === "ins" && web) {
    try {
      const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: insertAtCursor, args: [text] });
      done = result;
    } catch (_) { done = false; }
  }
  if (!done) await navigator.clipboard.writeText(text);
  b.textContent = done ? "Inséré ✓" : "Copié, ⌘V ✓";
};
renderSnips();

// ---------- UTM ----------
// Canaux UTM : les réseaux des réglages, puis e-mail et imprimé.
const channels = [...Object.entries(networks).map(([k, N]) => [k, N.name, ...(N.utm || [k, "social"])]),
  ...Object.entries(UTM_EXTRA).map(([k, v]) => [k, ...v])];
let network = channels[0][0];
$("#uNet").innerHTML = channels.map(([k, name], i) => `<button class="chip ${i ? "" : "on"}" data-n="${esc(k)}">${esc(name)}</button>`).join("");
$("#uUrl").value = web ? tab.url.split("?utm_")[0] : "";
const { campaigns = [], utmHistory = [] } = await chrome.storage.local.get(["campaigns", "utmHistory"]);
$("#camps").innerHTML = campaigns.map((c) => `<option value="${esc(c)}">`).join("");

function link() {
  try {
    const [, , source, medium] = channels.find((c) => c[0] === network);
    return buildUtm($("#uUrl").value.trim(), { source, medium, campaign: $("#uCamp").value, content: $("#uContent").value });
  } catch (_) {
    return "";
  }
}
function renderLink() {
  const l = link();
  $("#uOut").textContent = l || "Saisis une adresse web valide";
  $("#uOut").classList.toggle("mut", !l);
}
$("#uNet").onclick = (e) => {
  const c = e.target.closest(".chip");
  if (!c) return;
  network = c.dataset.n;
  document.querySelectorAll("#uNet .chip").forEach((x) => x.classList.toggle("on", x === c));
  renderLink();
};
for (const id of ["#uUrl", "#uCamp", "#uContent"]) $(id).oninput = renderLink;
$("#uCopy").onclick = async () => {
  const l = link();
  if (!l) return;
  await navigator.clipboard.writeText(l);
  await remember(l, $("#uCamp").value);
  $("#uCopy").textContent = "Copié ✓ ({lien} des légendes mis à jour)";
};
$("#uHist").innerHTML = utmHistory.map((h) => `<div class="item hist" data-l="${esc(h.link)}" title="Copier">${esc(h.link)}</div>`).join("") || `<div class="empty">Aucun lien</div>`;
$("#uHist").onclick = (e) => { const i = e.target.closest(".hist"); if (i) { navigator.clipboard.writeText(i.dataset.l); i.classList.add("copied"); } };
renderLink();

const { lastTab } = await chrome.storage.local.get("lastTab");
if (lastTab) document.querySelector(`.tabs button[data-tab="${lastTab}"]`)?.click();
