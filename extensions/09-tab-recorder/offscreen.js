// Capture de l'onglet. H.264 en priorité : encodé par la puce du Mac, il ménage le processeur.
const TYPES = [
  ["video/mp4;codecs=avc1,mp4a.40.2", "mp4"],
  ["video/mp4", "mp4"],
  ["video/webm;codecs=vp8,opus", "webm"],
  ["video/webm", "webm"],
];
let recorder = null, stream = null, ctx = null, chunks = [], ext = "webm";

async function start({ streamId, audio, bitrate }) {
  const source = { chromeMediaSource: "tab", chromeMediaSourceId: streamId };
  stream = await navigator.mediaDevices.getUserMedia({
    audio: audio ? { mandatory: source } : false,
    video: { mandatory: { ...source, maxWidth: 1920, maxHeight: 1080, maxFrameRate: 30 } },
  });
  if (audio) {
    // Sans ça, l'onglet devient muet pendant la capture.
    ctx = new AudioContext();
    ctx.createMediaStreamSource(stream).connect(ctx.destination);
  }
  const [mimeType, e] = TYPES.find(([t]) => MediaRecorder.isTypeSupported(t)) || ["", "webm"];
  ext = e;
  chunks = [];
  recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate, audioBitsPerSecond: 160000 });
  recorder.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: recorder.mimeType });
    stream.getTracks().forEach((t) => t.stop());
    ctx?.close();
    chrome.runtime.sendMessage({ cmd: "saved", url: URL.createObjectURL(blob), ext });
    recorder = null;
  };
  // L'onglet fermé ou la capture coupée : on enregistre ce qu'on a.
  stream.getVideoTracks()[0].onended = () => recorder?.state === "recording" && recorder.stop();
  recorder.start(2000);
  return { ok: true, mime: mimeType };
}

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.target !== "offscreen") return;
  if (m.cmd === "start") { start(m).then(reply, (e) => reply({ ok: false, error: e.message })); return true; }
  if (m.cmd === "stop") { if (recorder?.state === "recording") recorder.stop(); reply({ ok: true }); }
});
