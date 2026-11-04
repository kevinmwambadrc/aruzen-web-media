import { nameFromUrl } from "./shared/dlqueue.js";

// Nom de fichier lisible avec la bonne extension (les adresses de CDN n'en ont souvent pas).
export function fileName(url, i = 0) {
  let name = nameFromUrl(url, "image-" + (i + 1)).replace(/=s0$/, "");
  if (!/\.(jpe?g|png|gif|webp|avif|svg|bmp|tiff?|heic)$/i.test(name)) {
    let ext = "jpg";
    try {
      const q = new URL(url).searchParams;
      ext = (q.get("format") || q.get("fm") || q.get("ext") || "").replace(/\d+w$/, "") || (url.match(/\.(jpe?g|png|gif|webp|avif)/i) || [])[1] || "jpg";
    } catch (_) { /* adresse illisible */ }
    if (name.length > 80) name = "image-" + (i + 1);
    name += "." + ext.toLowerCase();
  }
  return name;
}
