// Extrait les lignes de texte d'une page HTML pour la veille (titres, paragraphes, listes, tableaux).
const BLOCKS = "h1,h2,h3,h4,h5,h6,p,li,td,th,dt,dd,blockquote,pre,figcaption,time,caption";

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.target !== "offscreen" || m.cmd !== "lines") return;
  const doc = new DOMParser().parseFromString(m.html, "text/html");
  doc.querySelectorAll("script,style,noscript,template,svg,iframe").forEach((n) => n.remove());
  let root = null;
  try { root = m.selector ? doc.querySelector(m.selector) : null; } catch (_) { root = null; }
  root ||= doc.querySelector("main, article, [role=main]") || doc.body;
  const clean = (s) => s.replace(/\s+/g, " ").trim();
  // Blocs « feuilles » seulement, pour ne pas compter deux fois un même texte.
  let lines = [...root.querySelectorAll(BLOCKS)].filter((el) => !el.querySelector(BLOCKS)).map((el) => clean(el.textContent));
  if (!lines.length) lines = (root.textContent || "").split(/\n+/).map(clean);
  lines = [...new Set(lines.filter((l) => l.length >= 3))].slice(0, 2000);
  reply({ lines });
});
