import { safeName } from "./shared/dlqueue.js";

async function ensureOffscreen() {
  const ctx = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (!ctx.length) {
    await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["USER_MEDIA"], justification: "Enregistrer l'onglet" });
  }
}

async function setState(state) {
  await chrome.storage.session.set({ rec: state });
  await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
  await chrome.action.setBadgeText({ text: state ? "REC" : "" });
}

async function start({ tabId, title, audio, bitrate }) {
  const { rec } = await chrome.storage.session.get("rec");
  if (rec) return { ok: false, error: "Un enregistrement est déjà en cours" };
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  await ensureOffscreen();
  const r = await chrome.runtime.sendMessage({ target: "offscreen", cmd: "start", streamId, audio, bitrate });
  if (!r?.ok) return r || { ok: false, error: "Démarrage impossible" };
  await setState({ tabId, title, started: Date.now(), mime: r.mime });
  return { ok: true };
}

async function save(url, ext) {
  const { rec } = await chrome.storage.session.get("rec");
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ").replace(":", "h");
  const id = await chrome.downloads.download({
    url, conflictAction: "uniquify",
    filename: `Web Media/Enregistrements/${safeName(rec?.title, "Onglet")} ${stamp}.${ext}`,
  });
  await setState(null);
  // Le blob vit dans le document hors écran : on le ferme une fois le fichier écrit.
  const done = (d) => {
    if (d.id === id && d.state && d.state.current !== "in_progress") {
      chrome.downloads.onChanged.removeListener(done);
      chrome.offscreen.closeDocument().catch(() => {});
    }
  };
  chrome.downloads.onChanged.addListener(done);
}

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.target === "offscreen") return;
  if (m.cmd === "start") { start(m).then(reply, (e) => reply({ ok: false, error: e.message })); return true; }
  if (m.cmd === "stop") { chrome.runtime.sendMessage({ target: "offscreen", cmd: "stop" }).then(reply, () => { setState(null); reply({ ok: true }); }); return true; }
  if (m.cmd === "saved") { save(m.url, m.ext); }
});
