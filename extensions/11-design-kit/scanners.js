// Fonctions exécutées DANS la page via chrome.scripting : elles ne doivent rien utiliser de l'extérieur.

export function scanBrand() {
  const cols = new Map();
  const add = (c, w) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m || !(w > 0)) return;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    const a = p.length > 3 ? p[3] : 1;
    if (a < 0.15) return;
    const k = p.slice(0, 3).map(Math.round).join(",");
    cols.set(k, (cols.get(k) || 0) + w * a);
  };
  const vw = innerWidth, vh = Math.max(innerHeight, 1);
  for (const el of [document.documentElement, document.body]) if (el) add(getComputedStyle(el).backgroundColor, 120);

  const fonts = new Map();
  const els = document.body ? document.body.getElementsByTagName("*") : [];
  for (let i = 0, n = Math.min(els.length, 6000); i < n; i++) {
    const el = els[i];
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    const area = (Math.min(r.width, vw) * Math.min(r.height, 3000)) / (vw * vh);
    add(cs.backgroundColor, area * 100);
    for (const m of (cs.backgroundImage || "").matchAll(/rgba?\([^)]+\)/g)) add(m[0], area * 50);
    if (parseFloat(cs.borderTopWidth) > 0) add(cs.borderTopColor, (r.width + r.height) / 600);
    if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) {
      add(cs.fill, 0.4 + area * 20);
      if (cs.stroke !== "none") add(cs.stroke, 0.3);
    }
    let text = 0;
    for (const nd of el.childNodes) if (nd.nodeType === 3) text += nd.textContent.trim().length;
    if (!text) continue;
    add(cs.color, text * 0.04);
    const name = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    const f = fonts.get(name) || { name, stack: cs.fontFamily, chars: 0, weights: {}, sizes: {} };
    f.chars += text;
    f.weights[cs.fontWeight] = (f.weights[cs.fontWeight] || 0) + text;
    f.sizes[cs.fontSize] = (f.sizes[cs.fontSize] || 0) + text;
    fonts.set(name, f);
  }

  // Variables de couleur du site, converties en RVB par un pixel de canevas (gère hsl, oklch…).
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const toRgb = (v) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return d[3] > 30 ? [d[0], d[1], d[2]] : null;
  };
  const vars = [];
  const rs = getComputedStyle(document.documentElement);
  for (let i = 0; i < rs.length && vars.length < 60; i++) {
    const p = rs[i];
    if (!p.startsWith("--")) continue;
    const v = rs.getPropertyValue(p).trim();
    if (/^(#[0-9a-f]{3,8}$|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\()/i.test(v)) {
      const rgb = toRgb(v);
      if (rgb) vars.push({ name: p, value: v, rgb });
    }
  }
  return {
    host: location.hostname.replace(/^www\./, ""),
    colors: [...cols].map(([k, w]) => ({ rgb: k.split(",").map(Number), w })),
    fonts: [...fonts.values()].sort((a, b) => b.chars - a.chars).slice(0, 8),
    vars,
    google: [...document.querySelectorAll('link[href*="fonts.googleapis"]')].length > 0,
  };
}

export function scanSvgs() {
  const NS = "http://www.w3.org/2000/svg";
  const out = [];
  const seen = new Set();
  const push = (o) => {
    const key = o.code || o.url;
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(o);
  };
  const clean = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 60);
  const SHAPES = new Set(["svg", "g", "path", "circle", "rect", "ellipse", "line", "polyline", "polygon", "text", "tspan", "use"]);
  const DEFAULTS = { "stroke-linecap": "butt", "stroke-linejoin": "miter", "fill-rule": "nonzero", opacity: "1", "fill-opacity": "1", "stroke-opacity": "1" };
  const PROPS = ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "fill-rule", "opacity", "fill-opacity", "stroke-opacity"];

  for (const svg of document.querySelectorAll("svg")) {
    if (svg.parentElement && svg.parentElement.closest("svg")) continue;
    const r = svg.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) {
      // Feuille de sprites : chaque <symbol> devient une icône.
      for (const sym of svg.querySelectorAll("symbol[id]")) {
        const vb = sym.getAttribute("viewBox");
        push({ kind: "sprite", name: clean(sym.id), code: `<svg xmlns="${NS}"${vb ? ` viewBox="${vb}"` : ""}>${sym.innerHTML}</svg>` });
      }
      continue;
    }
    const clone = svg.cloneNode(true);
    const orig = [svg, ...svg.querySelectorAll("*")];
    const copy = [clone, ...clone.querySelectorAll("*")];
    // Les styles CSS du site sont recopiés en attributs : le fichier s'ouvre tel qu'affiché.
    orig.forEach((el, i) => {
      const t = copy[i];
      if (!t || !SHAPES.has(el.tagName.toLowerCase())) return;
      const cs = getComputedStyle(el);
      for (const p of PROPS) {
        const attr = t.getAttribute(p);
        if (attr) {
          if (/currentcolor/i.test(attr)) t.setAttribute(p, cs.color);
          continue;
        }
        const v = cs.getPropertyValue(p).trim();
        if (!v || DEFAULTS[p] === v || (p === "stroke-width" && cs.stroke === "none")) continue;
        t.setAttribute(p, /currentcolor/i.test(v) ? cs.color : v);
      }
      t.removeAttribute("class");
    });
    // Attributs propres au site, inutiles dans Illustrator.
    for (const el of [clone, ...clone.querySelectorAll("*")]) {
      for (const a of [...el.attributes]) {
        if (/^(data-|aria-|on)|^(role|focusable|tabindex|class)$/.test(a.name)) el.removeAttribute(a.name);
      }
    }
    clone.removeAttribute("display");
    clone.removeAttribute("overflow");
    for (const u of clone.querySelectorAll("use")) {
      const id = (u.getAttribute("href") || u.getAttribute("xlink:href") || "").replace(/^#/, "");
      const target = id && document.getElementById(id);
      if (!target) continue;
      const g = document.createElementNS(NS, "g");
      for (const p of ["fill", "stroke", "transform"]) if (u.getAttribute(p)) g.setAttribute(p, u.getAttribute(p));
      g.innerHTML = target.innerHTML;
      if (!clone.getAttribute("viewBox") && target.getAttribute("viewBox")) clone.setAttribute("viewBox", target.getAttribute("viewBox"));
      u.replaceWith(g);
    }
    if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${Math.round(r.width)} ${Math.round(r.height)}`);
    clone.setAttribute("width", Math.round(r.width));
    clone.setAttribute("height", Math.round(r.height));
    clone.setAttribute("xmlns", NS);
    clone.removeAttribute("style");
    const name = svg.getAttribute("aria-label") || svg.querySelector("title")?.textContent || svg.id
      || svg.closest("a,button")?.getAttribute("aria-label") || "";
    push({ kind: "inline", name: clean(name), w: Math.round(r.width), h: Math.round(r.height), code: new XMLSerializer().serializeToString(clone) });
  }

  const isSvg = (u) => /\.svg(\?|#|$)/i.test(u) || u.startsWith("data:image/svg");
  for (const img of document.images) {
    const u = img.currentSrc || img.src;
    if (u && isSvg(u)) push({ kind: "fichier", name: clean(img.alt), url: u, w: img.naturalWidth, h: img.naturalHeight });
  }
  for (const o of document.querySelectorAll('object[type="image/svg+xml"], embed[src$=".svg"]')) push({ kind: "fichier", name: "", url: o.data || o.src });
  const all = document.body ? document.body.getElementsByTagName("*") : [];
  for (let i = 0, n = Math.min(all.length, 3000); i < n; i++) {
    const bg = getComputedStyle(all[i]).backgroundImage;
    if (bg && bg !== "none") for (const m of bg.matchAll(/url\(["']?(.*?)["']?\)/g)) if (isSvg(m[1])) push({ kind: "fond", name: "", url: new URL(m[1], location.href).href });
  }
  return out.slice(0, 300);
}
