// Capture de l'onglet. H.264 en priorité : encodé par la puce du Mac, il ménage le processeur.
const TYPES = {
  mp4: [["video/mp4;codecs=avc1,mp4a.40.2", "mp4"], ["video/mp4", "mp4"]],
  webm: [["video/webm;codecs=vp9,opus", "webm"], ["video/webm;codecs=vp8,opus", "webm"], ["video/webm", "webm"]],
};
let recorder = null, stream = null, ctx = null, chunks = [], ext = "webm";

async function start({ streamId, audio, bitrate, fmt = "mp4", width = 1920, fps = 30 }) {
  const source = { chromeMediaSource: "tab", chromeMediaSourceId: streamId };
  stream = await navigator.mediaDevices.getUserMedia({
    audio: audio ? { mandatory: source } : false,
    video: { mandatory: { ...source, maxWidth: width, maxHeight: Math.round(width * 9 / 16), maxFrameRate: fps } },
  });
  if (audio) {
    // Sans ça, l'onglet devient muet pendant la capture.
    ctx = new AudioContext();
    ctx.createMediaStreamSource(stream).connect(ctx.destination);
  }
  // Format demandé d'abord, l'autre en secours si le Mac ne sait pas l'encoder.
  const order = fmt === "webm" ? [...TYPES.webm, ...TYPES.mp4] : [...TYPES.mp4, ...TYPES.webm];
  const [mimeType, e] = order.find(([t]) => MediaRecorder.isTypeSupported(t)) || ["", "webm"];
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
  stream.getVideoTracks()[0].onended = () => recorder && recorder.state !== "inactive" && recorder.stop();
  recorder.start(2000);
  return { ok: true, mime: mimeType };
}

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.target !== "offscreen") return;
  if (m.cmd === "start") { start(m).then(reply, (e) => reply({ ok: false, error: e.message })); return true; }
  if (m.cmd === "stop") { if (recorder && recorder.state !== "inactive") recorder.stop(); reply({ ok: true }); }
  if (m.cmd === "pause") { if (recorder?.state === "recording") recorder.pause(); reply({ ok: recorder?.state === "paused" }); }
  if (m.cmd === "resume") { if (recorder?.state === "paused") recorder.resume(); reply({ ok: recorder?.state === "recording" }); }
});
