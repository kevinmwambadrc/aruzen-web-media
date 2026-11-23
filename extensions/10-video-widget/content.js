// Boutons de téléchargement au survol des vidéos.
// Léger : un balayage toutes les 2,5 s seulement quand l'onglet est visible, aucun observateur du DOM.
(() => {
  if (window.__aruzenWidget) return;
  window.__aruzenWidget = true;

  const seen = new WeakSet();
  let host = null, root = null, current = null, hideTimer = 0;
  const FORMATS = [
    ["mp4", "MP4", "Vidéo universelle"], ["webm", "WEBM", "Vidéo web légère"], ["mkv", "MKV", "Toutes les pistes"],
    ["mov", "MOV", "Apple / montage"], ["avi", "AVI", "Anciens lecteurs"], ["gif", "GIF", "Animation sans son"],
    ["mp3", "MP3", "Audio universel"], ["m4a", "M4A", "Audio Apple"], ["opus", "OPUS", "Audio léger"],
    ["flac", "FLAC", "Audio sans perte"], ["wav", "WAV", "Audio pour le montage"],
  ];
  const AUDIO = ["mp3", "m4a", "aac", "opus", "flac", "wav"];
  let vfmt = "mp4", afmt = "mp3";

  chrome.storage.sync.get({ enabled: true, off: [], wfmt: "mp4", wafmt: "mp3" }, (s) => {
    vfmt = s.wfmt; afmt = s.wafmt;
    if (s.enabled && !s.off.includes(location.hostname)) loop();
  });
  chrome.storage.onChanged.addListener((c) => {
    if (c.wfmt) vfmt = c.wfmt.newValue;
    if (c.wafmt) afmt = c.wafmt.newValue;
    if (root) label();
  });

  function loop() {
    if (document.visibilityState === "visible") scan();
    setTimeout(loop, 2500);
  }

  function scan() {
    for (const v of document.getElementsByTagName("video")) {
      if (seen.has(v)) continue;
      seen.add(v);
      const zone = v.closest("#movie_player, .html5-video-player") || v.parentElement || v;
      zone.addEventListener("mouseenter", () => show(v));
      zone.addEventListener("mouseleave", hideSoon);
    }
  }

  function build() {
    host = document.createElement("div");
    host.style.cssText = "position:fixed;z-index:2147483647;top:0;left:0;display:none";
    root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `<style>
      .bar{display:flex;gap:6px;font:600 12px/1 -apple-system,BlinkMacSystemFont,system-ui,sans-serif}
      button{all:unset;cursor:pointer;padding:7px 10px;border-radius:8px;background:rgba(17,17,20,.82);color:#fff;
        backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 2px 10px rgba(0,0,0,.3)}
      button:hover,button.on{background:#ff5a1f}
      .menu{display:none;margin-top:6px;padding:5px;border-radius:10px;background:rgba(17,17,20,.92);color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.4);
        backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);width:230px;font:500 12px/1.2 -apple-system,system-ui,sans-serif}
      .menu.open{display:grid;grid-template-columns:1fr 1fr;gap:3px}
      .menu button{display:grid;gap:2px;padding:6px 8px;background:transparent;box-shadow:none;border-radius:7px}
      .menu b{font-weight:700}.menu span{opacity:.65;font-size:10px}
      .menu .t{grid-column:1/-1;opacity:.6;font-size:10px;padding:3px 6px 1px;text-transform:uppercase;letter-spacing:.05em}
      .toast{margin-top:6px;padding:6px 10px;border-radius:8px;background:rgba(17,17,20,.88);color:#fff;font:500 12px/1.3 system-ui;display:none;max-width:260px}
    </style>
    <div class="bar"><button data-k="v" id="bv"></button><button data-k="menu" title="Choisir le format">▾</button><button data-k="a" id="ba"></button></div>
    <div class="menu"><div class="t">Vidéo</div>${FORMATS.filter((f) => !AUDIO.includes(f[0])).map(item).join("")}
      <div class="t">Audio seul</div>${FORMATS.filter((f) => AUDIO.includes(f[0])).map(item).join("")}</div>
    <div class="toast"></div>`;
    label();
    host.addEventListener("mouseenter", () => clearTimeout(hideTimer));
    host.addEventListener("mouseleave", hideSoon);
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      e.stopPropagation();
      e.preventDefault();
      const menu = root.querySelector(".menu");
      if (b.dataset.k === "menu") { menu.classList.toggle("open"); return; }
      menu.classList.remove("open");
      send(b.dataset.f || (b.dataset.k === "a" ? afmt : vfmt));
    });
    (document.body || document.documentElement).appendChild(host);
    addEventListener("scroll", () => (host.style.display = "none"), { passive: true });
  }

  function item(f) {
    return `<button data-f="${f[0]}"><b>${f[1]}</b><span>${f[2]}</span></button>`;
  }

  function label() {
    root.getElementById("bv").textContent = "⬇ " + vfmt.toUpperCase();
    root.getElementById("ba").textContent = "♪ " + afmt.toUpperCase();
  }

  function show(v) {
    const r = v.getBoundingClientRect();
    if (r.width < 200 || r.height < 110) return;
    if (!host) build();
    clearTimeout(hideTimer);
    current = v;
    host.style.top = Math.max(4, r.top + 10) + "px";
    host.style.left = Math.max(4, r.left + 10) + "px";
    host.style.display = "block";
  }

  function hideSoon() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!host) return;
      host.style.display = "none";
      root.querySelector(".menu").classList.remove("open");
    }, 700);
  }

  function toast(text) {
    const t = root.querySelector(".toast");
    t.textContent = text;
    t.style.display = "block";
    setTimeout(() => (t.style.display = "none"), 3000);
  }

  function send(fmt) {
    // La page (ou le cadre intégré) suffit : yt-dlp retrouve la vidéo sur plus de 1 800 sites.
    try {
      chrome.runtime.sendMessage({ cmd: "dl", fmt, url: location.href }, (res) => {
        toast(res?.ok ? fmt.toUpperCase() + " ajouté aux téléchargements ✓" : (res?.error || "Échec"));
      });
    } catch (_) {
      toast("Extension rechargée : actualise la page");
    }
  }
})();
