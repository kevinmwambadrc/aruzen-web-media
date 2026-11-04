import { queueDownloads, safeName, nameFromUrl } from "./shared/dlqueue.js";

const A4 = { paperWidth: 8.27, paperHeight: 11.69 };

async function ensureOffscreen() {
  const ctx = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (!ctx.length) {
    await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["BLOBS"], justification: "Créer le fichier PDF" });
  }
}

async function printPdf({ tabId, title, landscape, background, margins }) {
  const target = { tabId };
  await chrome.debugger.attach(target, "1.3");
  try {
    const m = margins ? 0.4 : 0;
    const { data } = await chrome.debugger.sendCommand(target, "Page.printToPDF", {
      ...A4, landscape, printBackground: background, preferCSSPageSize: false,
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

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.target === "offscreen") return;
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
