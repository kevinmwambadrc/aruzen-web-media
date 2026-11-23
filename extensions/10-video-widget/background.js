import { enqueue } from "./shared/lib.js";

const AUDIO = ["mp3", "m4a", "aac", "opus", "flac", "wav"];

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.cmd !== "dl") return;
  chrome.storage.local.get({ quality: "best", vcodec: "compat", audio_quality: "0" }).then((p) => {
    const fmt = m.fmt || (m.kind === "audio" ? "mp3" : "mp4");
    const req = AUDIO.includes(fmt)
      ? { kind: "audio", url: m.url, audio_format: fmt, audio_quality: p.audio_quality }
      : { kind: "video", url: m.url, container: fmt, quality: p.quality, vcodec: p.vcodec };
    enqueue(req).then(reply);
  });
  return true;
});
