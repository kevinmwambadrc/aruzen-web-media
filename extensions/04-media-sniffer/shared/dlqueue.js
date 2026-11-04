// File d'attente pour chrome.downloads : 3 fichiers à la fois pour ne pas saturer le Mac.
// La file est gardée en storage.session pour survivre à la mise en veille du service worker.
const MAX = 3;
let chain = Promise.resolve();
const serial = (fn) => (chain = chain.then(fn, fn));

export function safeName(s, fallback = "fichier") {
  return String(s || "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || fallback;
}

export function nameFromUrl(url, fallback) {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    return safeName(last, fallback);
  } catch (_) {
    return safeName(fallback);
  }
}

export function hostOf(url) {
  try { return safeName(new URL(url).hostname.replace(/^www\./, ""), "site"); } catch (_) { return "site"; }
}

async function pump() {
  const { dlq = [] } = await chrome.storage.session.get("dlq");
  const mine = await chrome.downloads.search({ state: "in_progress" });
  let free = MAX - mine.filter((d) => d.byExtensionId === chrome.runtime.id).length;
  while (free > 0 && dlq.length) {
    const it = dlq.shift();
    free--;
    try {
      await chrome.downloads.download({ url: it.url, filename: it.filename, conflictAction: "uniquify" });
    } catch (_) { /* lien mort : on passe au suivant */ }
  }
  await chrome.storage.session.set({ dlq });
}

export function queueDownloads(items) {
  return serial(async () => {
    const { dlq = [] } = await chrome.storage.session.get("dlq");
    dlq.push(...items);
    await chrome.storage.session.set({ dlq });
    await pump();
  });
}

chrome.downloads.onChanged.addListener((d) => {
  if (d.state && d.state.current !== "in_progress") serial(pump);
});
