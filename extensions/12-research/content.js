// Surligneur : crée, restaure et modifie les passages surlignés de la page.
// Léger : une seule lecture du stockage au chargement ; rien d'autre tant que la page n'a pas de surlignage.
(() => {
  if (window.__aruzenHL) return;
  window.__aruzenHL = true;

  const COLORS = { jaune: "#ffe066", vert: "#b2f2bb", bleu: "#a5d8ff", rose: "#fcc2d7" };
  const norm = (u) => {
    try {
      const x = new URL(u);
      x.hash = "";
      for (const k of [...x.searchParams.keys()]) if (/^(utm_|fbclid|gclid|mc_|igsh)/.test(k)) x.searchParams.delete(k);
      return x.href;
    } catch (_) {
      return u;
    }
  };
  let key = "hl:" + norm(location.href);
  let list = [];

  // ---------- index du texte de la page ----------
  function textIndex() {
    const nodes = [];
    let text = "";
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|TEMPLATE)$/.test(p.tagName) || p.closest("[data-aruzen-ui]")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    for (let n; (n = walker.nextNode());) {
      nodes.push({ node: n, start: text.length });
      text += n.data;
    }
    return { nodes, text };
  }

  // Position d'une borne de sélection dans le texte global.
  function toGlobal(idx, container, offset, isStart) {
    if (container.nodeType === 3) {
      const e = idx.nodes.find((x) => x.node === container);
      return e ? e.start + offset : -1;
    }
    const r = document.createRange();
    r.setStart(container, offset);
    if (isStart) {
      const e = idx.nodes.find((x) => r.comparePoint(x.node, 0) >= 0);
      return e ? e.start : -1;
    }
    let last = null;
    for (const x of idx.nodes) { if (r.comparePoint(x.node, x.node.length) <= 0) last = x; else break; }
    return last ? last.start + last.node.length : -1;
  }

  function wrap(idx, s, e, h) {
    for (const entry of idx.nodes) {
      const len = entry.node.data.length;
      if (entry.start + len <= s || entry.start >= e) continue;
      let node = entry.node;
      const a = Math.max(s, entry.start) - entry.start;
      const b = Math.min(e, entry.start + len) - entry.start;
      if (!node.data.slice(a, b).trim()) continue;
      if (b < node.data.length) node.splitText(b);
      if (a > 0) node = node.splitText(a);
      const mark = document.createElement("mark");
      mark.className = "aruzen-hl";
      mark.dataset.id = h.id;
      mark.style.cssText = `background:${COLORS[h.color] || COLORS.jaune};color:inherit;border-radius:2px;padding:0;cursor:pointer`;
      if (h.note) mark.title = h.note;
      node.parentNode.insertBefore(mark, node);
      mark.appendChild(node);
    }
  }

  // Retrouve un passage : texte exact, départagé par les 40 caractères avant et après.
  function locate(idx, h) {
    let best = -1, bestScore = -1;
    for (let i = idx.text.indexOf(h.quote); i !== -1; i = idx.text.indexOf(h.quote, i + 1)) {
      let score = 0;
      const pre = idx.text.slice(Math.max(0, i - h.prefix.length), i);
      const suf = idx.text.slice(i + h.quote.length, i + h.quote.length + h.suffix.length);
      while (score < pre.length && pre[pre.length - 1 - score] === h.prefix[h.prefix.length - 1 - score]) score++;
      let s2 = 0;
      while (s2 < suf.length && suf[s2] === h.suffix[s2]) s2++;
      if (score + s2 > bestScore) { bestScore = score + s2; best = i; }
    }
    return best;
  }

  function restore() {
    const missing = list.filter((h) => !document.querySelector(`mark.aruzen-hl[data-id="${h.id}"]`));
    if (!missing.length) return 0;
    let found = 0;
    for (const h of missing) {
      const idx = textIndex();
      const at = locate(idx, h);
      if (at >= 0) { wrap(idx, at, at + h.quote.length, h); found++; }
    }
    return missing.length - found;
  }

  async function save() {
    await chrome.storage.local.set({ [key]: list });
    chrome.runtime.sendMessage({ cmd: "hl-saved", url: key.slice(3), title: document.title, count: list.length }).catch(() => {});
  }

  async function create(color = "jaune") {
    const sel = getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return null;
    const r = sel.getRangeAt(0);
    const idx = textIndex();
    const s = toGlobal(idx, r.startContainer, r.startOffset, true);
    const e = toGlobal(idx, r.endContainer, r.endOffset, false);
    if (s < 0 || e <= s) return null;
    const quote = idx.text.slice(s, e);
    if (!quote.trim()) return null;
    const { project = "Général" } = await chrome.storage.local.get("project");
    const h = {
      id: crypto.randomUUID(), quote, prefix: idx.text.slice(Math.max(0, s - 40), s), suffix: idx.text.slice(e, e + 40),
      color, note: "", project, created: Date.now(),
    };
    wrap(idx, s, e, h);
    sel.removeAllRanges();
    list.push(h);
    await save();
    return h;
  }

  function marks(id) { return document.querySelectorAll(`mark.aruzen-hl[data-id="${id}"]`); }

  function unwrap(id) {
    for (const m of marks(id)) {
      const parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    }
  }

  // ---------- petite barre flottante (sélection et clic sur un surlignage) ----------
  let bar = null, barRoot = null, target = null;
  function ensureBar() {
    if (bar) return;
    bar = document.createElement("div");
    bar.dataset.aruzenUi = "";
    bar.style.cssText = "position:absolute;z-index:2147483647;display:none";
    barRoot = bar.attachShadow({ mode: "closed" });
    barRoot.innerHTML = `<style>
      .b{display:flex;gap:4px;align-items:center;padding:5px;border-radius:10px;background:#111827;box-shadow:0 6px 20px rgba(0,0,0,.3);font:600 12px system-ui}
      .c{all:unset;width:18px;height:18px;border-radius:50%;cursor:pointer;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.5)}
      .t{all:unset;color:#fff;padding:2px 7px;border-radius:6px;cursor:pointer} .t:hover{background:#374151}
    </style><div class="b">
      ${Object.entries(COLORS).map(([k, v]) => `<button class="c" data-c="${k}" title="${k}" style="background:${v}"></button>`).join("")}
      <button class="t" data-a="note">Note</button><button class="t" data-a="del" hidden>Retirer</button></div>`;
    barRoot.addEventListener("mousedown", (e) => e.preventDefault());
    barRoot.addEventListener("click", onBar);
    document.documentElement.appendChild(bar);
  }
  function showBar(rect, forMark) {
    ensureBar();
    target = forMark;
    barRoot.querySelector('[data-a="del"]').hidden = !forMark;
    bar.style.display = "block";
    bar.style.left = Math.max(4, rect.left + scrollX + rect.width / 2 - 90) + "px";
    bar.style.top = Math.max(4, rect.top + scrollY - 40) + "px";
  }
  const hideBar = () => { if (bar) bar.style.display = "none"; target = null; };

  async function onBar(e) {
    const b = e.target.closest("button");
    if (!b) return;
    if (target) {
      const h = list.find((x) => x.id === target);
      if (!h) return hideBar();
      if (b.dataset.c) { h.color = b.dataset.c; marks(h.id).forEach((m) => (m.style.background = COLORS[h.color])); }
      if (b.dataset.a === "note") { const n = prompt("Note sur ce passage :", h.note || ""); if (n !== null) { h.note = n.trim(); marks(h.id).forEach((m) => (m.title = h.note)); } }
      if (b.dataset.a === "del") { unwrap(h.id); list = list.filter((x) => x.id !== h.id); }
      await save();
    } else {
      const h = await create(b.dataset.c || "jaune");
      if (h && b.dataset.a === "note") { const n = prompt("Note sur ce passage :", ""); if (n) { h.note = n.trim(); marks(h.id).forEach((m) => (m.title = h.note)); await save(); } }
    }
    hideBar();
  }

  let selectionBar = true;
  document.addEventListener("mouseup", (e) => {
    if (bar && e.composedPath().includes(bar)) return;
    const m = e.target.closest && e.target.closest("mark.aruzen-hl");
    if (m && getSelection().isCollapsed) return showBar(m.getBoundingClientRect(), m.dataset.id);
    setTimeout(() => {
      const sel = getSelection();
      if (selectionBar && sel.rangeCount && !sel.isCollapsed && sel.toString().trim().length > 2) showBar(sel.getRangeAt(0).getBoundingClientRect(), null);
      else hideBar();
    }, 0);
  });

  chrome.runtime.onMessage.addListener((m, _s, reply) => {
    if (m.cmd === "highlight") create(m.color).then((h) => reply({ ok: !!h }));
    else if (m.cmd === "scroll-to") { const el = marks(m.id)[0]; el?.scrollIntoView({ behavior: "smooth", block: "center" }); reply({ ok: !!el }); }
    else if (m.cmd === "reload-hl") load().then(() => reply({ ok: true }));
    else return;
    return true;
  });

  async function load() {
    key = "hl:" + norm(location.href);
    const s = await chrome.storage.local.get([key, "selectionBar"]);
    selectionBar = s.selectionBar !== false;
    const fresh = s[key] || [];
    for (const h of list) if (!fresh.some((x) => x.id === h.id)) unwrap(h.id);
    list = fresh;
    if (list.length && restore()) setTimeout(restore, 2500); // contenu chargé après coup
  }
  load();
  // Modifs faites depuis le carnet (note, suppression) : appliquées aussitôt.
  chrome.storage.onChanged.addListener((c, area) => { if (area === "local" && (c[key] || c.selectionBar)) load(); });
  // Sites à navigation interne (YouTube, Notion…) : l'adresse change sans rechargement.
  let lastUrl = location.href;
  const onNav = () => { if (location.href !== lastUrl) { lastUrl = location.href; list = []; load(); } };
  if (window.navigation) navigation.addEventListener("navigatesuccess", onNav);
  else setInterval(onNav, 3000);
})();
