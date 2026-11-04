import { DEFAULT_NETWORKS, SETTINGS_KEYS, getLibrary, fill } from "./data.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const URL_RE = /https?:\/\/[^\s]+/g;
const TAG_RE = /(?:^|\s)#[\p{L}\p{N}_]+/gu;

let { brands, snippets, networks } = await getLibrary();
let { draft } = await chrome.storage.local.get("draft");
draft = { text: "", brand: brands[0]?.name, nets: null, ratios: {}, focal: [50, 50], image: null, campaign: "", ...draft };
let img = { url: "", w: 0, h: 0 }; // image chargée (URL objet, sans contamination du canevas)
let og = null, ogFor = "";

const brand = () => brands.find((b) => b.name === draft.brand) || brands[0];
const saveDraft = () => chrome.storage.local.set({ draft });
// Format choisi pour un réseau, ou son format par défaut s'il a été retiré dans les réglages.
const ratioOf = (n) => { const N = networks[n]; return [draft.ratios[n], N.def].find((r) => r && N.ratios[r]) || Object.keys(N.ratios)[0]; };

// ---------- comptage ----------
// X compte un lien pour 23 caractères et un emoji ou un idéogramme pour 2.
function xLength(t) {
  const noUrl = t.replace(URL_RE, "x".repeat(23));
  let n = 0;
  for (const ch of noUrl) n += /\p{Extended_Pictographic}|[ᄀ-ᇿ⺀-꓏가-힣豈-﫿︰-﹏＀-￯]/u.test(ch) ? 2 : 1;
  return n;
}
const length = (t, net) => (networks[net].weighted ? xLength(t) : [...t].length);

function checks(net, text) {
  const N = networks[net];
  const out = [];
  const len = length(text, net);
  const tags = (text.match(TAG_RE) || []).length;
  out.push(len > N.limit ? ["err", `${len} / ${N.limit} caractères : trop long de ${len - N.limit}`] : ["ok", `${len} / ${N.limit} caractères`]);
  if (N.fold && [...text].length > N.fold) out.push(["warn", `Coupé après ≈ ${N.fold} caractères (« voir plus ») : mets l'essentiel au début`]);
  if (tags < N.tags[0] || tags > N.tags[1]) out.push(["warn", `${tags} hashtag(s) ; conseillé : ${N.tags[0]} à ${N.tags[1]}`]);
  if (N.maxTags && tags > N.maxTags) out.push(["err", `Maximum ${N.maxTags} hashtags`]);
  if (net === "instagram" && URL_RE.test(text)) out.push(["warn", "Les liens ne sont pas cliquables dans une légende Instagram : mets-le en bio"]);
  URL_RE.lastIndex = 0;
  if (net === "instagram" && !img.url) out.push(["err", "Instagram exige une image ou une vidéo"]);
  return out;
}

// ---------- rendu du texte ----------
// Liens et hashtags repérés sur le texte brut, puis échappés morceau par morceau.
function rich(t) {
  let out = "", last = 0;
  for (const m of t.matchAll(/(https?:\/\/[^\s]+)|(^|\s)(#[\p{L}\p{N}_]+)/gu)) {
    out += esc(t.slice(last, m.index));
    out += m[1] ? `<a>${esc(m[1])}</a>` : esc(m[2]) + `<span class="h">${esc(m[3])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(t.slice(last));
}
function folded(t, fold, more = "… voir plus") {
  const chars = [...t];
  if (!fold || chars.length <= fold) return rich(t);
  let cut = chars.slice(0, fold).join("");
  cut = cut.slice(0, Math.max(cut.lastIndexOf(" "), fold * 0.7)).trimEnd();
  return rich(cut) + `<span class="more">${more}</span>`;
}

const ratioCss = (r) => { const [a, b] = r.split(":").map(parseFloat); return `${a} / ${b}`; };
// Même cadrage que l'export : le point focal est centré, sans sortir de l'image.
function pos(r) {
  if (!img.w) return "50% 50%";
  const [a, b] = r.split(":").map(parseFloat);
  const box = a / b, pic = img.w / img.h;
  const axis = (f, size, win) => (size - win > 0 ? (Math.min(Math.max(f * size - win / 2, 0), size - win) / (size - win)) * 100 : 50);
  return pic > box
    ? `${axis(draft.focal[0] / 100, pic, box)}% 50%`
    : `50% ${axis(draft.focal[1] / 100, 1 / pic, 1 / box)}%`;
}
const imageBox = (r) => img.url ? `<div class="img" style="aspect-ratio:${ratioCss(r)}"><img src="${img.url}" style="object-position:${pos(r)}" alt=""></div>` : "";
const linkCard = () => (!img.url && og?.ok) ? `<div class="card">${og.image ? `<div class="img" style="aspect-ratio:1.91/1"><img src="${esc(og.image)}" alt=""></div>` : ""}
  <div class="meta"><b>${esc(og.title)}</b>${esc(og.site)}</div></div>` : "";

function mock(net, ratio) {
  const b = brand();
  const av = `<div class="av" style="background:${esc(b.color)}">${esc(b.initials)}</div>`;
  const t = draft.text;
  const head = (sub) => `<div class="hd">${av}<div><div class="nm">${esc(b.name)}</div><div class="sub">${sub}</div></div></div>`;
  const N = networks[net];
  switch (N.look) {
    case "linkedin":
      return `<div class="mock">${head("1 234 abonnés · À l'instant · 🌐")}<div class="tx">${folded(t, N.fold, "…plus")}</div>
        ${imageBox(ratio)}${linkCard()}<div class="ft"><span>👍 J'aime</span><span>💬 Commenter</span><span>🔁 Republier</span><span>➤ Envoyer</span></div></div>`;
    case "facebook":
      return `<div class="mock">${head("À l'instant · 🌐")}<div class="tx">${folded(t, N.fold, "… Voir plus")}</div>
        ${imageBox(ratio)}${linkCard()}<div class="ft"><span>👍 J'aime</span><span>💬 Commenter</span><span>↗ Partager</span></div></div>`;
    case "instagram":
      return `<div class="mock ig">${head(esc(b.name.toLowerCase().replace(/\s+/g, "")))}
        ${imageBox(ratio) || `<div class="img" style="aspect-ratio:${ratioCss(ratio)};display:grid;place-items:center;color:#9ca3af">Image requise</div>`}
        <div class="acts">♡ 💬 ➤</div><div class="tx"><b>${esc(b.name.toLowerCase().replace(/\s+/g, ""))}</b> ${folded(t, N.fold, "… plus")}</div></div>`;
    case "x":
      return `<div class="mock x">${av}<div><div><span class="nm">${esc(b.name)}</span> <span class="sub">@${esc(b.name.toLowerCase().replace(/\s+/g, ""))} · 1 min</span></div>
        <div class="tx">${rich(t)}</div>${imageBox(ratio)}${linkCard()}</div></div>`;
    case "whatsapp":
      if (ratio === "9:16") {
        return `<div class="mock wa"><div class="img" style="aspect-ratio:9/16">${img.url ? `<img src="${img.url}" style="object-position:${pos("9:16")}" alt="">` : ""}</div>
          <div class="bar0"></div><div class="safe" style="top:0;height:13%"></div><div class="safe" style="bottom:0;height:18%"></div>
          ${t ? `<div class="cap">${rich(t)}</div>` : ""}</div>`;
      }
      return `<div class="mock wachat"><div class="bub">${imageBox(ratio)}${linkCard()}<div class="tx">${rich(t)}</div></div></div>`;
    default: // réseau ajouté dans les réglages
      return `<div class="mock">${head("À l'instant")}<div class="tx">${folded(t, N.fold, "… plus")}</div>${imageBox(ratio)}${linkCard()}</div>`;
  }
}

function activeNets() {
  return Object.keys(networks).filter((n) => (draft.nets ? draft.nets[n] : brand().networks.includes(n)));
}

function renderPreviews() {
  $("#previews").innerHTML = activeNets().map((n) => {
    const N = networks[n];
    const ratio = ratioOf(n);
    return `<article class="pv" data-n="${n}">
      <div class="top"><b>${N.name}</b><span class="grow"></span>
        <select data-ratio="${n}">${Object.keys(N.ratios).map((r) => `<option ${r === ratio ? "selected" : ""}>${r}</option>`).join("")}</select>
        <button class="ghost" data-copy="${n}">Copier le texte</button></div>
      ${mock(n, ratio)}
      <div class="checks">${checks(n, draft.text).map(([k, m]) => `<span class="${k}">${k === "ok" ? "✓" : k === "warn" ? "⚠" : "✕"} ${esc(m)}</span>`).join("")}</div>
    </article>`;
  }).join("") || `<p class="mut">Coche au moins un réseau.</p>`;
}

function renderStats() {
  const t = draft.text;
  $("#stats").textContent = `${[...t].length} caractères · ${(t.match(TAG_RE) || []).length} hashtag(s) · ${t ? t.split("\n").length : 0} ligne(s)`;
}

function renderComposer() {
  $("#brand").innerHTML = brands.map((b) => `<option ${b.name === draft.brand ? "selected" : ""}>${esc(b.name)}</option>`).join("");
  const mine = snippets.filter((s) => s.brand === draft.brand || s.brand === "*");
  $("#snip").innerHTML = `<option value="">＋ Insérer…</option>` + mine.map((s) => `<option value="${s.id}">${s.kind === "hashtags" ? "#" : "✎"} ${esc(s.title)}</option>`).join("");
  const nets = activeNets();
  $("#nets").innerHTML = Object.entries(networks).map(([k, N]) => `<label><input type="checkbox" data-net="${k}" ${nets.includes(k) ? "checked" : ""}> ${N.name}</label>`).join("");
  $("#text").value = draft.text;
  $("#campaign").value = draft.campaign || "";
}

function render() { renderStats(); renderPreviews(); }

// Aperçu de lien quand le texte contient une adresse et qu'il n'y a pas d'image.
let ogTimer = 0;
function maybeOg() {
  const u = (draft.text.match(URL_RE) || [])[0] || "";
  if (u === ogFor) return;
  ogFor = u;
  og = null;
  clearTimeout(ogTimer);
  if (!u) return render();
  ogTimer = setTimeout(async () => {
    og = await chrome.runtime.sendMessage({ cmd: "og", url: u });
    render();
  }, 600);
}

// ---------- image ----------
async function loadImage(src) {
  if (!src) { img = { url: "", w: 0, h: 0 }; showImage(); return render(); }
  try {
    const blob = await (await fetch(src)).blob();
    if (img.url) URL.revokeObjectURL(img.url);
    const url = URL.createObjectURL(blob);
    const el = new Image();
    el.src = url;
    await el.decode();
    img = { url, w: el.naturalWidth, h: el.naturalHeight };
  } catch (_) {
    img = { url: "", w: 0, h: 0 };
    $("#exportMsg").textContent = "Image inaccessible.";
  }
  showImage();
  render();
}
function showImage() {
  $("#imgWrap").hidden = $("#imgBar").hidden = !img.url;
  $("#dropHint").hidden = !!img.url;
  $("#src").src = img.url || "";
  Object.assign($("#focal").style, { left: draft.focal[0] + "%", top: draft.focal[1] + "%" });
}
async function setImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const data = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
  draft.image = data;
  draft.focal = [50, 50];
  saveDraft();
  loadImage(data);
}

$("#imgWrap").onclick = (e) => {
  const r = $("#src").getBoundingClientRect();
  draft.focal = [Math.round(((e.clientX - r.left) / r.width) * 100), Math.round(((e.clientY - r.top) / r.height) * 100)];
  saveDraft();
  showImage();
  renderPreviews();
};
$("#file").onchange = (e) => setImageFile(e.target.files[0]);
$("#clearImg").onclick = () => { draft.image = null; saveDraft(); loadImage(null); };
addEventListener("paste", (e) => { const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/")); if (f) { e.preventDefault(); setImageFile(f); } });
$("#drop").ondragover = (e) => { e.preventDefault(); $("#drop").classList.add("over"); };
$("#drop").ondragleave = () => $("#drop").classList.remove("over");
$("#drop").ondrop = (e) => {
  e.preventDefault();
  $("#drop").classList.remove("over");
  if (e.dataTransfer.files.length) return setImageFile(e.dataTransfer.files[0]);
  const u = e.dataTransfer.getData("text/uri-list");
  if (/^https?:/.test(u)) { draft.image = u; saveDraft(); loadImage(u); }
};

// ---------- recadrages ----------
async function crop(net, ratio) {
  const [w, h] = networks[net].ratios[ratio];
  const el = new Image();
  el.src = img.url;
  await el.decode();
  const scale = Math.max(w / img.w, h / img.h);
  const sw = w / scale, sh = h / scale;
  const sx = Math.min(Math.max((draft.focal[0] / 100) * img.w - sw / 2, 0), img.w - sw);
  const sy = Math.min(Math.max((draft.focal[1] / 100) * img.h - sh / 2, 0), img.h - sh);
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(el, sx, sy, sw, sh, 0, 0, w, h);
  return c.convertToBlob({ type: "image/jpeg", quality: 0.92 });
}
$("#export").onclick = async () => {
  const folder = "Web Media/Social/" + ((draft.campaign || "").replace(/[\\/:*?"<>|]+/g, " ").trim() || new Date().toISOString().slice(0, 10)) + "/";
  const nets = activeNets();
  let n = 0;
  if (img.url) {
    for (const net of nets) {
      const ratio = ratioOf(net);
      const [w, h] = networks[net].ratios[ratio];
      const url = URL.createObjectURL(await crop(net, ratio));
      await chrome.downloads.download({ url, filename: `${folder}${networks[net].name} ${ratio.replace(":", "x")} ${w}x${h}.jpg`, conflictAction: "uniquify" });
      n++;
    }
  }
  if (draft.text) {
    const url = URL.createObjectURL(new Blob([draft.text], { type: "text/plain" }));
    await chrome.downloads.download({ url, filename: folder + "texte.txt", conflictAction: "uniquify" });
  }
  $("#exportMsg").textContent = img.url || draft.text ? `${n} image(s)${draft.text ? " + le texte" : ""} dans Téléchargements › ${folder.slice(0, -1)}` : "Rien à exporter.";
};

// ---------- événements du compositeur ----------
$("#text").oninput = () => { draft.text = $("#text").value; saveDraft(); render(); maybeOg(); };
$("#brand").onchange = () => { draft.brand = $("#brand").value; draft.nets = null; saveDraft(); renderComposer(); render(); };
$("#campaign").oninput = () => { draft.campaign = $("#campaign").value; saveDraft(); };
$("#nets").onchange = (e) => {
  const n = e.target.dataset.net;
  if (!n) return;
  draft.nets = Object.fromEntries(Object.keys(networks).map((k) => [k, activeNets().includes(k)]));
  draft.nets[n] = e.target.checked;
  saveDraft();
  renderPreviews();
};
$("#snip").onchange = async () => {
  const s = snippets.find((x) => x.id === $("#snip").value);
  $("#snip").value = "";
  if (!s) return;
  const ta = $("#text");
  const add = await fill(s.text);
  const at = ta.selectionStart ?? ta.value.length;
  const sep = s.kind === "hashtags" && at && !/\s$/.test(ta.value.slice(0, at)) ? "\n\n" : "";
  ta.setRangeText(sep + add, at, ta.selectionEnd ?? at, "end");
  ta.dispatchEvent(new Event("input"));
  ta.focus();
};
$("#previews").onchange = (e) => {
  const n = e.target.dataset.ratio;
  if (n) { draft.ratios[n] = e.target.value; saveDraft(); renderPreviews(); }
};
$("#previews").onclick = async (e) => {
  const b = e.target.closest("[data-copy]");
  if (!b) return;
  await navigator.clipboard.writeText(draft.text);
  b.textContent = "Copié ✓";
  setTimeout(() => (b.textContent = "Copier le texte"), 1500);
};

// Image envoyée par clic droit depuis une page.
chrome.storage.onChanged.addListener((c, area) => {
  if (area !== "local") return;
  if (c.studioImage?.newValue) { draft.image = c.studioImage.newValue.url; draft.focal = [50, 50]; saveDraft(); loadImage(draft.image); }
});

// ---------- bibliothèque ----------
document.querySelector(".seg").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  document.querySelectorAll(".seg button").forEach((x) => x.classList.toggle("on", x === b));
  $("#post").hidden = b.dataset.v !== "post";
  $("#lib").hidden = b.dataset.v !== "lib";
  if (b.dataset.v === "lib") renderLib();
  history.replaceState(null, "", b.dataset.v === "lib" ? "#reglages" : location.pathname);
};

// Formats écrits « 1:1 1080x1080, 4:5 1080x1350 » ; le premier est le format par défaut.
const fmtRatios = (N) => Object.entries(N.ratios).sort(([a], [b]) => (b === N.def) - (a === N.def)).map(([r, [w, h]]) => `${r} ${w}x${h}`).join(", ");
function parseRatios(text) {
  const out = {};
  for (const part of text.split(/[,;\n]+/)) {
    const m = part.trim().match(/^(\d+(?:[.,]\d+)?:\d+(?:[.,]\d+)?)\s+(\d+)\s*[x×*]\s*(\d+)$/i);
    if (m) out[m[1].replace(",", ".")] = [Number(m[2]), Number(m[3])];
  }
  return Object.keys(out).length ? out : null;
}

function renderNets() {
  $("#netEdit").innerHTML = Object.entries(networks).map(([k, N]) => `
    <div class="netrow" data-k="${esc(k)}">
      <div class="r"><input data-f="name" value="${esc(N.name)}" placeholder="Nom du réseau">
        <label>Limite <input data-f="limit" type="number" min="1" value="${N.limit}"></label>
        <label>« Voir plus » après <input data-f="fold" type="number" min="0" value="${N.fold}" title="0 = jamais coupé"></label>
        <label>Hashtags <input data-f="tag0" type="number" min="0" value="${N.tags[0]}"> à <input data-f="tag1" type="number" min="0" value="${N.tags[1]}"></label>
        <button class="ghost" data-del-net="${esc(k)}" title="Supprimer ce réseau">✕</button></div>
      <div class="r"><label class="grow">Formats d'image <input data-f="ratios" value="${esc(fmtRatios(N))}" placeholder="1:1 1080x1080, 9:16 1080x1920"></label>
        <label>Source UTM <input data-f="utm0" value="${esc(N.utm?.[0] ?? k)}" size="10"></label>
        <label>Support <input data-f="utm1" value="${esc(N.utm?.[1] ?? "social")}" size="9"></label></div>
    </div>`).join("");
}

function renderLib() {
  renderNets();
  $("#brands").innerHTML = brands.map((b, i) => `
    <div class="brandrow" data-i="${i}">
      <input data-f="name" value="${esc(b.name)}" placeholder="Nom"><input data-f="initials" value="${esc(b.initials)}" maxlength="3" placeholder="Init.">
      <input data-f="color" type="color" value="${esc(b.color)}"><button class="ghost" data-del-brand="${i}" title="Supprimer">✕</button>
      <div class="nets">${Object.entries(networks).map(([k, N]) => `<label><input type="checkbox" data-bnet="${k}" ${b.networks.includes(k) ? "checked" : ""}> ${N.name}</label>`).join("")}</div>
    </div>`).join("");
  const opts = (sel) => [...brands.map((b) => b.name), "*"].map((n) => `<option value="${esc(n)}" ${n === sel ? "selected" : ""}>${n === "*" ? "Toutes marques" : esc(n)}</option>`).join("");
  $("#snips").innerHTML = snippets.map((s, i) => `
    <div class="sniprow" data-i="${i}">
      <div class="r"><select data-f="brand">${opts(s.brand)}</select>
        <select data-f="kind"><option ${s.kind === "légende" ? "selected" : ""}>légende</option><option ${s.kind === "hashtags" ? "selected" : ""}>hashtags</option></select>
        <input data-f="title" value="${esc(s.title)}" placeholder="Titre"><button class="ghost" data-del-snip="${i}" title="Supprimer">✕</button></div>
      <textarea data-f="text">${esc(s.text)}</textarea>
    </div>`).join("");
}
const persistLib = () => chrome.storage.local.set({ brands, snippets, networks });
$("#netEdit").onchange = (e) => {
  const row = e.target.closest(".netrow"), f = e.target.dataset.f;
  if (!row || !f) return;
  const N = networks[row.dataset.k], v = e.target.value;
  if (f === "name") {
    N.name = v.trim() || N.name;
    // Réseau ajouté : la source UTM suit le nom tant qu'elle n'a pas été changée à la main.
    if (N.utm?.[0] === row.dataset.k) { N.utm[0] = N.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, ""); renderNets(); }
  }
  else if (f === "limit" || f === "fold") N[f] = Math.max(0, Number(v) || 0) || (f === "limit" ? N.limit : 0);
  else if (f === "tag0" || f === "tag1") N.tags[f === "tag0" ? 0 : 1] = Math.max(0, Number(v) || 0);
  else if (f === "utm0" || f === "utm1") { N.utm ||= [row.dataset.k, "social"]; N.utm[f === "utm0" ? 0 : 1] = v.trim(); }
  else if (f === "ratios") {
    const r = parseRatios(v);
    if (r) { N.ratios = r; N.def = Object.keys(r)[0]; } else e.target.value = fmtRatios(N); // saisie illisible : on remet l'ancienne valeur
  }
  persistLib();
  renderComposer();
};
$("#addNet").onclick = () => {
  const k = "n" + Date.now().toString(36);
  networks[k] = { name: "Nouveau réseau", look: "generic", limit: 2000, fold: 0, tags: [0, 5], def: "1:1", utm: [k, "social"], ratios: { "1:1": [1080, 1080] } };
  persistLib(); renderLib(); renderComposer();
};
$("#resetNets").onclick = () => {
  if (!confirm("Remettre la liste des réseaux d'origine ? Les réseaux ajoutés seront retirés.")) return;
  networks = structuredClone(DEFAULT_NETWORKS);
  persistLib(); renderLib(); renderComposer();
};
$("#brands").oninput = $("#brands").onchange = (e) => {
  const row = e.target.closest(".brandrow");
  if (!row) return;
  const b = brands[row.dataset.i];
  if (e.target.dataset.f) b[e.target.dataset.f] = e.target.value;
  if (e.target.dataset.bnet) b.networks = [...row.querySelectorAll("[data-bnet]:checked")].map((x) => x.dataset.bnet);
  persistLib();
};
$("#snips").oninput = $("#snips").onchange = (e) => {
  const row = e.target.closest(".sniprow");
  if (row && e.target.dataset.f) { snippets[row.dataset.i][e.target.dataset.f] = e.target.value; persistLib(); }
};
$("#lib").onclick = (e) => {
  const db = e.target.dataset.delBrand, ds = e.target.dataset.delSnip, dn = e.target.dataset.delNet;
  if (dn !== undefined) {
    if (Object.keys(networks).length < 2 || !confirm(`Supprimer le réseau « ${networks[dn].name} » ?`)) return;
    delete networks[dn];
    persistLib(); renderLib(); renderComposer(); render();
  }
  if (db !== undefined) { brands.splice(db, 1); persistLib(); renderLib(); }
  if (ds !== undefined) { snippets.splice(ds, 1); persistLib(); renderLib(); }
};
$("#addBrand").onclick = () => { brands.push({ name: "Nouvelle marque", initials: "NM", color: "#2ba84a", networks: ["facebook", "instagram"] }); persistLib(); renderLib(); };
$("#addSnip").onclick = () => { snippets.unshift({ id: crypto.randomUUID(), brand: draft.brand, kind: "légende", title: "Nouvelle légende", text: "" }); persistLib(); renderLib(); };
$("#exportSettings").onclick = async () => {
  const data = await chrome.storage.local.get(SETTINGS_KEYS);
  const url = URL.createObjectURL(new Blob([JSON.stringify({ app: "aruzen-social", version: 1, ...data }, null, 2)], { type: "application/json" }));
  await chrome.downloads.download({ url, filename: `Web Media/Réglages/Social ${new Date().toISOString().slice(0, 10)}.json`, conflictAction: "uniquify" });
  $("#ioMsg").textContent = "Enregistré dans Téléchargements › Web Media › Réglages.";
};
$("#importSettings").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== "aruzen-social") throw new Error("ce fichier ne vient pas d'Aruzen Social");
    const keep = Object.fromEntries(SETTINGS_KEYS.filter((k) => data[k]).map((k) => [k, data[k]]));
    if (!confirm(`Remplacer tes réglages actuels par ceux de « ${file.name} » ?`)) return;
    await chrome.storage.local.set(keep);
    ({ brands, snippets, networks } = await getLibrary());
    renderLib(); renderComposer(); render();
    $("#ioMsg").textContent = "Réglages importés ✓";
  } catch (err) {
    $("#ioMsg").textContent = "Import impossible : " + err.message;
  }
};

chrome.storage.onChanged.addListener((c, area) => {
  if (area === "local" && (c.brands || c.snippets || c.networks)) {
    brands = c.brands?.newValue || brands;
    snippets = c.snippets?.newValue || snippets;
    networks = c.networks?.newValue || networks;
    if ($("#lib").hidden) { renderComposer(); render(); }
  }
});

renderComposer();
render();
maybeOg();
if (location.hash === "#reglages") document.querySelector('.seg button[data-v="lib"]').click();
if (draft.image) loadImage(draft.image);
