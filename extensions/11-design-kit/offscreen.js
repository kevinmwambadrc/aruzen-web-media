// Transforme une capture (base64) en blob téléchargeable par le service worker.
chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.target !== "offscreen" || m.cmd !== "blob") return;
  const bin = atob(m.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  reply({ url: URL.createObjectURL(new Blob([bytes], { type: m.type })) });
});
