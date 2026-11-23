import { activeTab, $, esc, isWebUrl, whatsNew } from "./shared/lib.js";
import { scanBrand, scanSvgs } from "./scanners.js";
import { cluster, roles, hex } from "./color.js";
import { encodeAse } from "./ase.js";
import { listBoards, listItems, createBoard, activeBoard } from "./db.js";

whatsNew([
  "Copie des couleurs au format choisi : HEX, RGB, HSL, OKLCH ou CMJN",
  "Deux nouveaux exports de charte : SCSS et Tailwind",
]);

// ---------- formats de couleur ----------
function hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  }
  return `hsl(${Math.round((h * 60 + 360) % 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}
function oklch([r, g, b]) {
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  [r, g, b] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B), H = (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
  return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${C < 0.002 ? 0 : H.toFixed(1)})`;
}
function cmyk([r, g, b]) {
  const k = 1 - Math.max(r, g, b) / 255;
  if (k >= 1) return "C0 M0 J0 N100";
  const f = (c) => Math.round(((1 - c / 255 - k) / (1 - k)) * 100);
  return `C${f(r)} M${f(g)} J${f(b)} N${Math.round(k * 100)}`;
}
const COLOR_FMT = { hex: (c) => c.hex, rgb: (c) => `rgb(${c.rgb.join(" ")})`, hsl: (c) => hsl(c.rgb), oklch: (c) => oklch(c.rgb), cmyk: (c) => cmyk(c.rgb) };
const { cfmt = "hex" } = await chrome.storage.local.get("cfmt");
$("#cfmt").value = cfmt;
$("#cfmt").onchange = () => chrome.storage.local.set({ cfmt: $("#cfmt").value });
const asColor = (c) => COLOR_FMT[$("#cfmt").value](c);

const tab = await activeTab();
const web = isWebUrl(tab?.url);
const host = web ? new URL(tab.url).hostname.replace(/^www\./, "") : "";
$("#host").textContent = host;

const inPage = async (func) => {
  if (!web) return null;
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func });
    return result;
  } catch (_) {
    return null;
  }
};

function save(blob, filename) {
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename, conflictAction: "uniquify" });
}

async function copy(text, el) {
  await navigator.clipboard.writeText(text);
  el.classList.add("copied");
  setTimeout(() => el.classList.remove("copied"), 700);
}

// ---------- onglets : chaque outil ne s'exécute qu'à l'ouverture de son onglet ----------
const loaded = {};
const loaders = { charte: loadCharte, svg: loadSvg, mood: loadMood, mesure: loadMesure };
async function show(name) {
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
  document.querySelectorAll(".pane").forEach((p) => (p.hidden = p.id !== name));
  chrome.storage.local.set({ lastTab: name });
  if (!loaded[name]) { loaded[name] = true; await loaders[name](); }
}
$(".tabs").onclick = (e) => { const b = e.target.closest("button"); if (b) show(b.dataset.tab); };

// ---------- Charte ----------
let brand = null, palette = [];

async function loadCharte() {
  brand = await inPage(scanBrand);
  if (!brand) { $("#swatches").innerHTML = `<div class="empty">Ouvre un site web pour extraire sa charte.</div>`; return; }
  palette = cluster(brand.colors);
  const role = roles(palette);
  $("#swatches").innerHTML = palette.map((c) => `
    <button class="sw" data-hex="${c.hex}" title="${c.hex} · rgb(${c.rgb.join(", ")})">
      <i style="background:${c.hex}"></i><b>${c.hex}</b>
      <span>${role[c.hex] ? `<span class="role">${role[c.hex]}</span> · ` : ""}${c.pct < 1 ? "<1" : Math.round(c.pct)} %</span>
    </button>`).join("");
  $("#swatches").onclick = (e) => {
    const b = e.target.closest(".sw");
    if (b) copy(asColor(palette.find((c) => c.hex === b.dataset.hex)), b);
  };

  $("#varsBox").hidden = !brand.vars.length;
  $("#vars").innerHTML = brand.vars.map((v) => `<button class="var" data-v="${esc(v.name)}: ${esc(v.value)};" title="${esc(v.value)}"><i style="background:${hex(v.rgb)}"></i>${esc(v.name)}</button>`).join("");
  $("#vars").onclick = (e) => { const b = e.target.closest(".var"); if (b) copy(b.dataset.v, b); };

  const totalChars = brand.fonts.reduce((s, f) => s + f.chars, 0) || 1;
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
  $("#fonts").innerHTML = brand.fonts.length ? brand.fonts.map((f) => `
    <div class="item font"><div class="row"><b class="grow">${esc(f.name)}</b><span class="mut small">${Math.round((100 * f.chars) / totalChars)} % du texte</span></div>
      <div class="mut small">Graisses ${top(f.weights, 5).sort().join(", ")} · tailles ${top(f.sizes, 4).join(", ")}</div>
      <div class="row">
        <button class="mini" data-copy="font-family: ${esc(f.stack)};">Copier la pile CSS</button>
        <a class="mini" target="_blank" href="https://fonts.google.com/?query=${encodeURIComponent(f.name)}">Chercher la police ↗</a>
      </div></div>`).join("") : `<div class="empty">Aucun texte</div>`;
  $("#fonts").onclick = (e) => { const b = e.target.closest("[data-copy]"); if (b) copy(b.dataset.copy, b); };
}

const base = () => `Web Media/Chartes/${host || "page"}/${host || "charte"}`;
$("#xAse").onclick = () => {
  if (!palette.length) return;
  const groups = [{ name: host, colors: palette.map((c) => ({ name: c.hex, rgb: c.rgb })) }];
  if (brand.vars.length) groups.push({ name: host + " · variables", colors: brand.vars.map((v) => ({ name: v.name.replace(/^--/, ""), rgb: v.rgb })) });
  save(encodeAse(groups), base() + ".ase");
};
$("#xCss").onclick = () => {
  if (!palette.length) return;
  const role = roles(palette);
  const lines = palette.map((c, i) => `  --couleur-${i + 1}: ${c.hex};${role[c.hex] ? ` /* ${role[c.hex]} */` : ""}`);
  brand.fonts.slice(0, 3).forEach((f, i) => lines.push(`  --police-${i + 1}: ${f.stack};`));
  save(new Blob([`/* Charte extraite de ${host} par Aruzen Design Kit */\n:root {\n${lines.join("\n")}\n}\n`], { type: "text/css" }), base() + ".css");
};
$("#xScss").onclick = () => {
  if (!palette.length) return;
  const role = roles(palette);
  const lines = palette.map((c, i) => `$couleur-${i + 1}: ${c.hex};${role[c.hex] ? ` // ${role[c.hex]}` : ""}`);
  brand.fonts.slice(0, 3).forEach((f, i) => lines.push(`$police-${i + 1}: ${f.stack};`));
  save(new Blob([`// Charte extraite de ${host} par Aruzen Design Kit\n${lines.join("\n")}\n`], { type: "text/x-scss" }), base() + ".scss");
};
$("#xTw").onclick = () => {
  if (!palette.length) return;
  const role = roles(palette);
  const key = (c, i) => (role[c.hex] ? role[c.hex].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "couleur-" + (i + 1));
  const colors = Object.fromEntries(palette.map((c, i) => [key(c, i), c.hex]));
  const fonts = Object.fromEntries(brand.fonts.slice(0, 3).map((f, i) => ["police-" + (i + 1), f.stack.split(",").map((x) => x.trim())]));
  const js = `// Charte extraite de ${host} par Aruzen Design Kit\n/** @type {import('tailwindcss').Config} */\nexport default {\n  theme: {\n    extend: ${JSON.stringify({ colors, fontFamily: fonts }, null, 2).replace(/\n/g, "\n    ")},\n  },\n};\n`;
  save(new Blob([js], { type: "text/javascript" }), base() + ".tailwind.config.js");
};
$("#xJson").onclick = () => {
  if (!palette.length) return;
  const data = { site: host, couleurs: palette.map((c) => ({ hex: c.hex, rgb: c.rgb, part: +c.pct.toFixed(1) })),
    variables: brand.vars, polices: brand.fonts.map((f) => ({ nom: f.name, pile: f.stack, graisses: Object.keys(f.weights), tailles: Object.keys(f.sizes) })) };
  save(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), base() + ".json");
};
// Planche vectorielle : s'ouvre directement dans Illustrator, nuances et textes éditables.
$("#xSvg").onclick = () => {
  if (!palette.length) return;
  const role = roles(palette);
  const cols = 5, cw = 150, ch = 190, pad = 40;
  const rows = Math.ceil(palette.length / cols);
  const fontsY = pad + 70 + rows * (ch + 20) + 20;
  const H = fontsY + 40 + brand.fonts.slice(0, 4).length * 60 + pad;
  const W = pad * 2 + cols * cw + (cols - 1) * 20;
  const sw = palette.map((c, i) => {
    const x = pad + (i % cols) * (cw + 20), y = pad + 70 + Math.floor(i / cols) * (ch + 20);
    return `<g><rect x="${x}" y="${y}" width="${cw}" height="120" rx="12" fill="${c.hex}" stroke="#00000014"/>
      <text x="${x}" y="${y + 144}" font-family="Helvetica, Arial" font-size="15" font-weight="700" fill="#111">${c.hex}</text>
      <text x="${x}" y="${y + 163}" font-family="Helvetica, Arial" font-size="11" fill="#666">RVB ${c.rgb.join(" ")}</text>
      <text x="${x}" y="${y + 180}" font-family="Helvetica, Arial" font-size="11" fill="#666">${role[c.hex] ? role[c.hex] + " · " : ""}${c.pct.toFixed(1)} %</text></g>`;
  }).join("\n");
  const fonts = brand.fonts.slice(0, 4).map((f, i) =>
    `<text x="${pad}" y="${fontsY + 40 + i * 60}" font-family="${esc(f.stack)}" font-size="30" fill="#111">${esc(f.name)}</text>
     <text x="${pad}" y="${fontsY + 60 + i * 60}" font-family="Helvetica, Arial" font-size="11" fill="#666">Graisses ${Object.keys(f.weights).sort().join(", ")}</text>`).join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="100%" height="100%" fill="#fff"/>
<text x="${pad}" y="${pad + 30}" font-family="Helvetica, Arial" font-size="26" font-weight="700" fill="#111">Charte · ${esc(host)}</text>
${sw}
<text x="${pad}" y="${fontsY}" font-family="Helvetica, Arial" font-size="13" font-weight="700" fill="#999">POLICES</text>
${fonts}
</svg>`;
  save(new Blob([svg], { type: "image/svg+xml" }), base() + " planche.svg");
};

// ---------- SVG ----------
let svgs = [];
const svgSrc = (s) => s.url || "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.code);

async function loadSvg() {
  svgs = (await inPage(scanSvgs)) || [];
  $("#svgCount").textContent = svgs.length ? `${svgs.length} SVG trouvé(s)` : "";
  $("#svgGrid").innerHTML = svgs.length ? svgs.map((s, i) => `
    <label title="${esc(s.name || s.kind)}${s.w ? ` · ${s.w}×${s.h}` : ""}"><img src="${esc(svgSrc(s))}" alt="" loading="lazy">
      <input type="checkbox" data-i="${i}"><span class="k">${s.kind}</span></label>`).join("")
    : `<div class="empty" style="grid-column:1/-1">Aucun SVG sur cette page</div>`;
}
$("#svgAll").onchange = () => document.querySelectorAll("#svgGrid input").forEach((c) => (c.checked = $("#svgAll").checked));
$("#svgGrid").ondblclick = async (e) => {
  const l = e.target.closest("label");
  if (!l) return;
  const s = svgs[l.querySelector("input").dataset.i];
  copy(s.code || (await (await fetch(s.url)).text()), l);
};
$("#svgDl").onclick = () => {
  const picked = [...document.querySelectorAll("#svgGrid input:checked")].map((c) => svgs[c.dataset.i]);
  const dir = `Web Media/SVG/${host}/`;
  const slug = (s, i) => (s.name || `${host}-${i + 1}`).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || `icone-${i + 1}`;
  picked.forEach((s, i) => {
    if (s.code) save(new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n` + s.code], { type: "image/svg+xml" }), dir + slug(s, i) + ".svg");
    else if (s.url.startsWith("data:")) save(new Blob([decodeURIComponent(s.url.split(",").slice(1).join(","))], { type: "image/svg+xml" }), dir + slug(s, i) + ".svg");
    else chrome.downloads.download({ url: s.url, filename: dir + slug(s, i) + ".svg", conflictAction: "uniquify" });
  });
  if (picked.length) $("#svgDl").textContent = `${picked.length} SVG enregistré(s) ✓`;
};

// ---------- Moodboard ----------
async function loadMood() {
  const current = await activeBoard();
  const boards = await listBoards();
  $("#board").innerHTML = boards.map((b) => `<option value="${b.id}" ${b.id === current.id ? "selected" : ""}>${esc(b.name)}</option>`).join("");
  const items = (await listItems(current.id)).slice(0, 8);
  $("#moodRecent").innerHTML = items.map((it) => `<img src="${URL.createObjectURL(it.blob)}" alt="">`).join("");
}
$("#board").onchange = async () => { await chrome.storage.local.set({ activeBoard: $("#board").value }); loadMood(); };
$("#newBoard").onclick = () => { $("#newRow").hidden = false; $("#newName").focus(); };
$("#newOk").onclick = async () => {
  const name = $("#newName").value.trim();
  if (!name) return;
  await createBoard(name);
  $("#newName").value = "";
  $("#newRow").hidden = true;
  loadMood();
};
$("#newName").onkeydown = (e) => e.key === "Enter" && $("#newOk").click();
$("#openBoard").onclick = () => chrome.tabs.create({ url: "board.html" });
$("#capPage").onclick = async () => {
  $("#capPage").disabled = true;
  const r = await chrome.runtime.sendMessage({ cmd: "capture-page", tabId: tab.id });
  $("#capPage").textContent = r?.ok ? "Capturée ✓" : "Capture impossible";
  loadMood();
};

// ---------- Mesure ----------
async function loadMesure() {
  const { grid } = await chrome.storage.local.get("grid");
  if (grid) { $("#gCols").value = grid.columns; $("#gGut").value = grid.gutter; $("#gMax").value = grid.maxWidth; $("#gMar").value = grid.margin; $("#gBase").value = grid.baseline; }
  if (!web) return;
  const st = await chrome.runtime.sendMessage({ cmd: "measure", tabId: tab.id, action: "status" });
  $("#ruler").textContent = st?.measuring ? "Couper la règle" : "Activer la règle (⌥⇧R)";
  $("#gridBtn").textContent = st?.grid ? "Masquer la grille" : "Afficher la grille";
}
$("#ruler").onclick = async () => {
  if (!web) return;
  await chrome.runtime.sendMessage({ cmd: "measure", tabId: tab.id, action: "toggle-measure" });
  window.close();
};
$("#gridBtn").onclick = async () => {
  if (!web) return;
  const on = $("#gridBtn").textContent.startsWith("Afficher");
  const cfg = { columns: +$("#gCols").value || 12, gutter: +$("#gGut").value || 0, maxWidth: +$("#gMax").value || 1200,
    margin: +$("#gMar").value || 0, baseline: +$("#gBase").value || 0 };
  chrome.storage.local.set({ grid: cfg });
  await chrome.runtime.sendMessage({ cmd: "measure", tabId: tab.id, action: "grid", cfg: on ? cfg : null });
  $("#gridBtn").textContent = on ? "Masquer la grille" : "Afficher la grille";
};
$("#shoot").onclick = async () => {
  if (!web) return;
  const widths = [...document.querySelectorAll("#widths input:checked")].map((c) => +c.value);
  if (!widths.length) return;
  $("#shoot").disabled = true;
  $("#shootMsg").textContent = "Capture en cours… (Chrome affiche un bandeau de débogage pendant quelques secondes)";
  const r = await chrome.runtime.sendMessage({ cmd: "responsive", tabId: tab.id, url: tab.url, widths, retina: $("#retina").checked });
  $("#shootMsg").innerHTML = r?.ok ? `<span class="ok">Enregistré dans Web Media › Captures › ${esc(host)}</span>` : `<span class="err">${esc(r?.error || "Échec")}</span>`;
  $("#shoot").disabled = false;
};

const { lastTab = "charte" } = await chrome.storage.local.get("lastTab");
show(lastTab);
