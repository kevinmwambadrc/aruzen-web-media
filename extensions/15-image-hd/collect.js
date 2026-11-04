// Exécuté dans la page (et ses cadres) : relève toutes les adresses d'image, y compris celles qui ne sont pas affichées.
// Renvoie des groupes { shown, w, h, cands: [{ u, w, from }] } ; la fonction doit rester autonome (pas d'import).
export function collect() {
  const IMG = /\.(jpe?g|png|webp|avif|gif|bmp|tiff?|heic)(?=$|[?#])/i;
  const CDN = /pinimg|twimg|googleusercontent|ggpht|ytimg|cloudinary|imgix|shopify|unsplash|wixstatic|media-amazon|ebayimg|staticflickr|behance|dribbble|squarespace-cdn|alicdn|etsystatic|wikimedia/;
  const abs = (u) => { try { const x = new URL(String(u).trim().replace(/&amp;/g, "&"), location.href); return /^https?:$/.test(x.protocol) ? x.href : null; } catch (_) { return null; } };
  const isImg = (u) => u && (IMG.test(u) || CDN.test(u));
  const groups = [];
  const loose = new Map(); // adresses trouvées hors éléments affichés

  const parseSrcset = (ss) => String(ss || "").split(/,\s+(?=\S)/).map((p) => {
    const [u, d = "1x"] = p.trim().split(/\s+/);
    const n = parseFloat(d) || 1;
    return { u: abs(u), w: /w$/.test(d) ? n : /x$/.test(d) ? n * 1000 : 0 };
  }).filter((c) => c.u);

  function fromElement(el, base = []) {
    const cands = [...base];
    for (const a of el.attributes) {
      const n = a.name.toLowerCase(), v = a.value;
      if (!v || n === "style" || n === "class" || n === "alt") continue;
      if (/srcset/.test(n)) cands.push(...parseSrcset(v).map((c) => ({ ...c, from: n })));
      else if (/^(src|data-|lazy|original|zoom|large|full|hires|big)/.test(n) || /src|url|image|img|zoom|full|large|orig|hires/.test(n)) {
        for (const part of v.split(/[\s,]+/)) { const u = abs(part); if (u && isImg(u)) cands.push({ u, w: /zoom|full|large|orig|hires|big|hd/.test(n) ? 5000 : 0, from: n }); }
      }
    }
    // Lien autour de l'image (visionneuses « lightbox ») : souvent l'image pleine taille.
    const link = el.closest("a[href]");
    if (link) { const u = abs(link.getAttribute("href")); if (u && IMG.test(u)) cands.push({ u, w: 6000, from: "lien" }); }
    return cands;
  }

  for (const img of document.images) {
    const shown = img.currentSrc || img.src;
    const base = shown ? [{ u: abs(shown), w: img.naturalWidth, from: "affichée" }] : [];
    const pic = img.closest("picture");
    if (pic) for (const s of pic.querySelectorAll("source")) base.push(...parseSrcset(s.srcset || s.dataset.srcset).map((c) => ({ ...c, from: "picture" })));
    const cands = fromElement(img, base.filter((c) => c.u));
    if (cands.length) groups.push({ shown: abs(shown) || cands[0].u, w: img.naturalWidth, h: img.naturalHeight, cands });
  }
  for (const el of document.querySelectorAll("image")) { const u = abs(el.getAttribute("href") || el.getAttribute("xlink:href")); if (u) loose.set(u, "svg"); }

  // Images de fond
  const all = document.body ? document.body.getElementsByTagName("*") : [];
  for (let k = 0; k < Math.min(all.length, 5000); k++) {
    const el = all[k];
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== "none") {
      for (const m of bg.matchAll(/url\(["']?(.*?)["']?\)/g)) {
        const u = abs(m[1]);
        if (u) groups.push({ shown: u, w: 0, h: 0, cands: fromElement(el, [{ u, w: 0, from: "fond" }]) });
      }
    } else if (el.tagName !== "IMG" && [...el.attributes].some((a) => /^data-(bg|background|src|image|img|zoom|full|large)/.test(a.name))) {
      const cands = fromElement(el);
      if (cands.length) groups.push({ shown: cands[0].u, w: 0, h: 0, cands });
    }
  }

  // Métadonnées
  for (const m of document.querySelectorAll('meta[property^="og:image"],meta[name^="twitter:image"],meta[itemprop=image],link[rel=image_src],link[rel=preload][as=image]')) {
    const u = abs(m.content || m.href);
    if (u && isImg(u)) loose.set(u, "métadonnées");
  }
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      (function walk(o) {
        if (!o) return;
        if (typeof o === "string") { const u = abs(o); if (u && isImg(u)) loose.set(u, "JSON-LD"); return; }
        if (typeof o === "object") for (const v of Object.values(o)) walk(v);
      })(JSON.parse(s.textContent));
    } catch (_) { /* JSON invalide */ }
  }
  // Code de la page : scripts en ligne et <noscript> (états JSON des sites modernes)
  let budget = 3000;
  for (const s of document.querySelectorAll("script:not([src]),noscript,template")) {
    const txt = (s.textContent || s.innerHTML || "").replace(/\\u002F/gi, "/").replace(/\\\//g, "/");
    for (const m of txt.matchAll(/https?:\/\/[^\s"'<>\\)]+/g)) {
      const u = abs(m[0]);
      if (u && isImg(u)) loose.set(u, "code de la page");
      if (--budget <= 0) break;
    }
    if (budget <= 0) break;
  }
  for (const [u, from] of loose) groups.push({ shown: u, w: 0, h: 0, cands: [{ u, w: 0, from }], loose: true });
  return { page: location.href, title: document.title, groups: groups.slice(0, 1500) };
}
