// Règles « version HD » : à partir d'une adresse d'image réduite, propose les adresses probables de l'original,
// de la plus grande à la plus petite. Chaque proposition est ensuite vérifiée (elle doit exister et être plus grande).

const SIZE_PARAMS = ["w", "h", "width", "height", "resize", "size", "fit", "crop", "dpr", "q", "quality", "sz", "maxwidth", "maxheight", "imwidth", "tr"];
const IMG_EXT = /\.(jpe?g|png|webp|avif|gif|bmp|tiff?|heic|svg)(?=$|[?#])/i;

export function hdVariants(raw) {
  let u;
  try { u = new URL(raw); } catch (_) { return []; }
  if (!/^https?:$/.test(u.protocol)) return [];
  const out = [];
  const add = (x) => { if (x && x !== raw && !out.includes(x)) out.push(x); };
  const h = u.hostname, s = u.href;
  const re = (a, b) => s.replace(a, b);

  // Pinterest : 236x / 474x / 736x… → originals
  if (/(^|\.)pinimg\.com$/.test(h)) { add(re(/\/(\d+x\d*|\d+x)\//, "/originals/")); add(re(/\/(\d+x\d*|\d+x)\//, "/1200x/")); add(re(/\/(\d+x\d*|\d+x)\//, "/736x/")); }
  // X / Twitter
  if (h === "pbs.twimg.com") {
    if (u.pathname.startsWith("/media/")) { const v = new URL(s); v.searchParams.set("name", "orig"); add(v.href); v.searchParams.set("name", "4096x4096"); add(v.href); v.searchParams.set("name", "large"); add(v.href); }
    add(re(/_(normal|bigger|mini|\d+x\d+)(?=\.\w+$)/, ""));
  }
  // Google (Photos, Blogger, Play, avatars)
  if (/googleusercontent\.com$|ggpht\.com$|bp\.blogspot\.com$/.test(h)) {
    add(re(/=[swh]\d+[^/?#]*$/, "=s0")); add(re(/=[^/?#]*$/, "=s0")); add(re(/\/[swh]\d+(-[a-z0-9-]+)?\//i, "/s0/"));
  }
  // YouTube : miniature maximale
  if (/ytimg\.com$/.test(h)) {
    const m = s.match(/\/vi(?:_webp)?\/([\w-]{11})\//);
    if (m) for (const f of ["maxresdefault", "sddefault", "hq720", "hqdefault"]) add(`https://i.ytimg.com/vi/${m[1]}/${f}.jpg`);
  }
  // Wikimedia : /thumb/a/ab/Fichier.jpg/300px-Fichier.jpg → original
  if (h === "upload.wikimedia.org") add(re(/\/thumb(\/[0-9a-f]\/[0-9a-f]{2}\/[^/]+)\/[^/]+$/, "$1"));
  // Imgur : suffixe de taille (s, b, t, m, l, h)
  if (h === "i.imgur.com") add(re(/\/(\w{7})[sbtmlhg]\.(\w+)/, "/$1.$2"));
  // Cloudinary : on retire les transformations
  if (/cloudinary\.com$/.test(h)) add(re(/(\/(?:image|video)\/upload\/)(?:[a-z]{1,3}_[^/]+\/)+/, "$1"));
  // Wix
  if (h === "static.wixstatic.com") add(re(/(\/media\/[^/]+)\/v1\/.*$/, "$1"));
  // Behance
  if (/behance\.net$/.test(h)) for (const d of ["source", "fs", "max_3840", "max_1200", "1400"]) add(re(/\/project_modules\/[^/]+\//, `/project_modules/${d}/`));
  // Amazon : ._AC_SX300_.jpg → .jpg
  if (/media-amazon\.com$|images-amazon\.com$|ssl-images-amazon\.com$/.test(h)) add(re(/\._[^/]*_(?=\.\w+$)/, ""));
  // eBay
  if (h === "i.ebayimg.com") add(re(/\/s-l\d+\.(\w+)/, "/s-l1600.$1"));
  // Etsy
  if (/etsystatic\.com$/.test(h)) add(re(/\/il_\d+x[\dN]+\./, "/il_fullxfull."));
  // AliExpress / Alibaba
  if (/alicdn\.com$/.test(h)) add(re(/(\.(?:jpe?g|png|webp))_[^/]*$/i, "$1"));
  // Medium
  if (/medium\.com$/.test(h)) { add(re(/\/v2\/resize:[^/]+\//, "/v2/")); add(re(/\/max\/\d+\//, "/max/4800/")); }
  // Squarespace
  if (/squarespace-cdn\.com$|squarespace\.com$/.test(h)) { const v = new URL(s); v.searchParams.set("format", "2500w"); add(v.href); v.searchParams.delete("format"); add(v.href); }
  // Flickr
  if (/staticflickr\.com$/.test(h)) add(re(/(\/\d+_[0-9a-f]+)(_[a-z])?\.(jpe?g|png)$/, "$1_b.$3"));
  // Shopify : _300x300, _small, _grande…
  if (h === "cdn.shopify.com" || u.pathname.includes("/cdn/shop/")) {
    add(re(/_(?:\d+x\d*|x\d+|pico|icon|thumb|small|compact|medium|large|grande|1024x1024|2048x2048)(?:@\dx)?(?:_crop_\w+)?(?=\.\w+(\?|$))/, ""));
  }
  // Ghost
  add(re(/\/content\/images\/size\/[^/]+\//, "/content/images/"));
  // WordPress et générique : -300x200.jpg et -scaled.jpg → original
  add(re(/-\d{2,4}x\d{2,4}(?=\.(?:jpe?g|png|webp|gif|avif)(?:$|[?#]))/i, ""));
  add(re(/-\d{2,4}x\d{2,4}-scaled(?=\.\w+(?:$|[?#]))|-scaled(?=\.(?:jpe?g|png|webp)(?:$|[?#]))/i, ""));
  // Paramètres de taille dans l'adresse (imgix, Unsplash, WordPress Photon, Dribbble…)
  if ([...u.searchParams.keys()].some((k) => SIZE_PARAMS.includes(k.toLowerCase()))) {
    const v = new URL(out[0] || s);
    for (const k of [...v.searchParams.keys()]) if (SIZE_PARAMS.includes(k.toLowerCase())) v.searchParams.delete(k);
    add(v.href);
  }
  return out;
}

// Identité d'une image : sert à regrouper ses différentes tailles trouvées dans la page.
export function identity(url) {
  const best = hdVariants(url)[0] || url;
  try { const v = new URL(best); return v.origin + v.pathname.replace(/-\d{2,4}x\d{2,4}(?=\.\w+$)/, ""); } catch (_) { return best; }
}

export const looksLikeImage = (u) => IMG_EXT.test(u) || /pinimg|twimg|googleusercontent|ytimg|cloudinary|imgix|shopify|unsplash|wixstatic|media-amazon|ebayimg|staticflickr|behance|dribbble|cdninstagram|fbcdn/.test(u);
