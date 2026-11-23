// Conversion d'images au format choisi (PNG, JPG, WEBP) dans le service worker.
// Une image à la fois pour ménager le Mac ; les SVG et les échecs gardent leur format d'origine.
export const IMAGE_FORMATS = [
  { v: "", l: "Format d'origine" }, { v: "png", l: "PNG" }, { v: "jpeg", l: "JPG" }, { v: "webp", l: "WEBP" },
];

async function toDataUrl(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return `data:${blob.type};base64,${btoa(bin)}`;
}

export async function convertImage(url, fmt, quality = 0.92) {
  const src = await (await fetch(url, { referrerPolicy: "no-referrer" })).blob();
  if (/svg/.test(src.type)) throw new Error("SVG");
  const bmp = await createImageBitmap(src);
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const g = canvas.getContext("2d");
  if (fmt === "jpeg") { g.fillStyle = "#fff"; g.fillRect(0, 0, canvas.width, canvas.height); } // pas de transparence en JPG
  g.drawImage(bmp, 0, 0);
  bmp.close();
  return toDataUrl(await canvas.convertToBlob({ type: "image/" + fmt, quality }));
}

const extOf = (fmt) => (fmt === "jpeg" ? "jpg" : fmt);

// items : [{ url, filename }] ; renvoie le nombre converti.
export async function downloadConverted(items, fmt, quality) {
  let n = 0;
  for (const it of items) {
    let url = it.url, filename = it.filename;
    try {
      url = await convertImage(it.url, fmt, quality);
      filename = filename.replace(/\.(jpe?g|png|gif|webp|avif|bmp|ico|tiff?)$/i, "") + "." + extOf(fmt);
      n++;
    } catch (_) { /* format d'origine */ }
    try { await chrome.downloads.download({ url, filename, conflictAction: "uniquify" }); } catch (_) { /* lien mort */ }
  }
  return n;
}
