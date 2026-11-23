import { queueDownloads, safeName, nameFromUrl } from "./shared/dlqueue.js";

// Dimensions en pouces.
const PAPER = {
  A4: [8.27, 11.69], A3: [11.69, 16.54], A5: [5.83, 8.27], Letter: [8.5, 11], Legal: [8.5, 14],
};

async function ensureOffscreen() {
  const ctx = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (!ctx.length) {
    await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["BLOBS"], justification: "Créer le fichier PDF" });
  }
}

async function printPdf({ tabId, title, landscape, background, margins, paper = "A4", scale = 1, pages = "", header = false }) {
  const target = { tabId };
  await chrome.debugger.attach(target, "1.3");
  try {
    const m = margins || header ? 0.4 : 0;
    const [paperWidth, paperHeight] = PAPER[paper] || PAPER.A4;
    const small = `style="font-size:8px;width:100%;padding:0 0.4in;color:#666;display:flex;justify-content:space-between"`;
    const { data } = await chrome.debugger.sendCommand(target, "Page.printToPDF", {
      paperWidth, paperHeight, landscape, printBackground: background, preferCSSPageSize: false,
      scale: Math.min(2, Math.max(0.1, scale)), pageRanges: /^[\d\s,-]+$/.test(pages) ? pages : "",
      displayHeaderFooter: header,
      headerTemplate: `<div ${small}><span class="title"></span><span class="date"></span></div>`,
      footerTemplate: `<div ${small}><span class="url"></span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      marginTop: m, marginBottom: m, marginLeft: m, marginRight: m,
    });
    // Un PDF dépasse vite la limite des URL data: ; on passe par un blob du document hors écran.
    await ensureOffscreen();
    const { url } = await chrome.runtime.sendMessage({ target: "offscreen", cmd: "blob", data, type: "application/pdf" });
    await chrome.downloads.download({ url, filename: "Web Media/PDF/" + safeName(title, "page") + ".pdf", conflictAction: "uniquify" });
    return { ok: true };
  } finally {
    chrome.debugger.detach(target).catch(() => {});
  }
}

// Capture de la page entière en image (PNG, JPG ou WEBP).
const MAX_H = 16000;
async function shotPage({ tabId, title, format = "png" }) {
  const target = { tabId };
  await chrome.debugger.attach(target, "1.3");
  try {
    const { cssContentSize: size } = await chrome.debugger.sendCommand(target, "Page.getLayoutMetrics");
    const width = Math.ceil(size.width), height = Math.min(Math.ceil(size.height), MAX_H);
    const { data } = await chrome.debugger.sendCommand(target, "Page.captureScreenshot", {
      format, quality: format === "png" ? undefined : 92, captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 },
    });
    await ensureOffscreen();
    const { url } = await chrome.runtime.sendMessage({ target: "offscreen", cmd: "blob", data, type: "image/" + format });
    const ext = format === "jpeg" ? "jpg" : format;
    await chrome.downloads.download({ url, filename: "Web Media/Captures/" + safeName(title, "page") + "." + ext, conflictAction: "uniquify" });
    return { ok: true, note: height < size.height ? `coupée à ${MAX_H} px de haut` : `${width} × ${height} px` };
  } finally {
    chrome.debugger.detach(target).catch(() => {});
  }
}

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.target === "offscreen") return;
  if (m.cmd === "shot") {
    shotPage(m).then(reply, (e) => reply({ ok: false, error: e.message }));
    return true;
  }
  if (m.cmd === "print") {
    printPdf(m).then(reply, (e) => reply({ ok: false, error: e.message }));
    return true;
  }
  if (m.cmd === "pdfs") {
    queueDownloads(m.urls.map((u) => ({ url: u, filename: "Web Media/PDF/" + nameFromUrl(u, "document.pdf").replace(/(\.pdf)?$/i, ".pdf") })))
      .then(() => reply({ ok: true }));
    return true;
  }
});
