// Boutons de téléchargement au survol des vidéos.
// Léger : un balayage toutes les 2,5 s seulement quand l'onglet est visible, aucun observateur du DOM.
(() => {
  if (window.__aruzenWidget) return;
  window.__aruzenWidget = true;

  const seen = new WeakSet();
  let host = null, root = null, current = null, hideTimer = 0;

  chrome.storage.sync.get({ enabled: true, off: [] }, (s) => {
    if (s.enabled && !s.off.includes(location.hostname)) loop();
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
      button:hover{background:#ff5a1f}
      .toast{margin-top:6px;padding:6px 10px;border-radius:8px;background:rgba(17,17,20,.88);color:#fff;font:500 12px/1.3 system-ui;display:none;max-width:260px}
    </style>
    <div class="bar"><button data-k="video">⬇ Vidéo</button><button data-k="audio">♪ MP3</button></div>
    <div class="toast"></div>`;
    host.addEventListener("mouseenter", () => clearTimeout(hideTimer));
    host.addEventListener("mouseleave", hideSoon);
    root.querySelector(".bar").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      e.stopPropagation();
      e.preventDefault();
      send(b.dataset.k);
    });
    (document.body || document.documentElement).appendChild(host);
    addEventListener("scroll", () => (host.style.display = "none"), { passive: true });
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
    hideTimer = setTimeout(() => host && (host.style.display = "none"), 700);
  }

  function toast(text) {
    const t = root.querySelector(".toast");
    t.textContent = text;
    t.style.display = "block";
    setTimeout(() => (t.style.display = "none"), 3000);
  }

  function send(kind) {
    // La page (ou le cadre intégré) suffit : yt-dlp retrouve la vidéo sur plus de 1 800 sites.
    try {
      chrome.runtime.sendMessage({ cmd: "dl", kind, url: location.href }, (res) => {
        toast(res?.ok ? (kind === "audio" ? "MP3 ajouté aux téléchargements ✓" : "Vidéo ajoutée aux téléchargements ✓") : (res?.error || "Échec"));
      });
    } catch (_) {
      toast("Extension rechargée : actualise la page");
    }
  }
})();
