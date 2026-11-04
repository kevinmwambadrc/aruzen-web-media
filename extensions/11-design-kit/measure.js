// Règle et grille injectées à la demande dans la page (aucun script permanent).
(() => {
  if (window.__aruzenMeasure) return;

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    *{box-sizing:border-box} .box{position:fixed;display:none}
    #m{background:rgba(246,178,107,.28)} #b{border:1px solid #2f80ed} #c{background:rgba(111,168,220,.30)}
    #pd{outline:1px dashed rgba(52,168,83,.9)} #sel{border:2px solid #ff3b7f}
    #tip,#hud{position:fixed;font:600 11px/1.35 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#fff;background:#111827;
      border-radius:6px;padding:5px 8px;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.3)}
    #tip{display:none} #tip span{color:#9ca3af;font-weight:500}
    #hud{right:12px;bottom:12px;display:none}
    #grid{position:fixed;inset:0;display:none}
    #grid .col{position:absolute;top:0;bottom:0;background:rgba(255,59,127,.10);border-left:1px solid rgba(255,59,127,.35);border-right:1px solid rgba(255,59,127,.35)}
    svg{position:fixed;inset:0;width:100vw;height:100vh;overflow:visible}
  </style>
  <div id="grid"></div>
  <div class="box" id="m"></div><div class="box" id="pd"></div><div class="box" id="c"></div><div class="box" id="b"></div>
  <div class="box" id="sel"></div><svg id="lines"></svg><div id="tip"></div>
  <div id="hud">Règle : survole · clic = repère · Échap = quitter</div>`;
  document.documentElement.appendChild(host);
  const $ = (id) => root.getElementById(id);

  let measuring = false, selected = null, hovered = null, raf = 0, grid = null;

  function place(el, x, y, w, h) {
    Object.assign(el.style, { display: "block", left: x + "px", top: y + "px", width: Math.max(0, w) + "px", height: Math.max(0, h) + "px" });
  }

  function hideBoxes() {
    for (const id of ["m", "pd", "c", "b", "sel", "tip"]) $(id).style.display = "none";
    $("lines").innerHTML = "";
  }

  // Écarts entre deux rectangles, à la manière d'Alt-survol dans Figma.
  function gaps(a, b) {
    const out = [];
    const midY = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2 || a.top + a.height / 2;
    const midX = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2 || a.left + a.width / 2;
    const yh = Math.max(a.top, b.top) < Math.min(a.bottom, b.bottom) ? midY : a.top + a.height / 2;
    const xv = Math.max(a.left, b.left) < Math.min(a.right, b.right) ? midX : a.left + a.width / 2;
    if (b.left >= a.right) out.push([a.right, yh, b.left, yh]);
    else if (b.right <= a.left) out.push([b.right, yh, a.left, yh]);
    else {
      if (a.left !== b.left) out.push([Math.min(a.left, b.left), yh, Math.max(a.left, b.left), yh]);
      if (a.right !== b.right) out.push([Math.min(a.right, b.right), yh, Math.max(a.right, b.right), yh]);
    }
    if (b.top >= a.bottom) out.push([xv, a.bottom, xv, b.top]);
    else if (b.bottom <= a.top) out.push([xv, b.bottom, xv, a.top]);
    else {
      if (a.top !== b.top) out.push([xv, Math.min(a.top, b.top), xv, Math.max(a.top, b.top)]);
      if (a.bottom !== b.bottom) out.push([xv, Math.min(a.bottom, b.bottom), xv, Math.max(a.bottom, b.bottom)]);
    }
    return out.filter(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1) >= 1);
  }

  function draw() {
    raf = 0;
    const el = hovered;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const n = (k) => parseFloat(cs[k]) || 0;
    const m = [n("marginTop"), n("marginRight"), n("marginBottom"), n("marginLeft")];
    const p = [n("paddingTop"), n("paddingRight"), n("paddingBottom"), n("paddingLeft")];
    const bw = [n("borderTopWidth"), n("borderRightWidth"), n("borderBottomWidth"), n("borderLeftWidth")];
    place($("m"), r.left - m[3], r.top - m[0], r.width + m[1] + m[3], r.height + m[0] + m[2]);
    place($("b"), r.left, r.top, r.width, r.height);
    place($("pd"), r.left + bw[3], r.top + bw[0], r.width - bw[1] - bw[3], r.height - bw[0] - bw[2]);
    place($("c"), r.left + bw[3] + p[3], r.top + bw[0] + p[0], r.width - bw[1] - bw[3] - p[1] - p[3], r.height - bw[0] - bw[2] - p[0] - p[2]);

    const font = cs.fontFamily.split(",")[0].replace(/["']/g, "");
    const pad = p.some(Boolean) ? ` · padding ${p.map(Math.round).join(" ")}` : "";
    $("tip").innerHTML = `${Math.round(r.width)} × ${Math.round(r.height)} <span>${el.tagName.toLowerCase()}${pad}</span><br>`
      + `<span>${font} ${cs.fontSize} / ${cs.lineHeight} · ${cs.fontWeight} · ${cs.color}</span>`;
    const tip = $("tip");
    tip.style.display = "block";
    const below = r.bottom + 8 + 40 < innerHeight;
    tip.style.left = Math.min(Math.max(4, r.left), innerWidth - tip.offsetWidth - 4) + "px";
    tip.style.top = (below ? r.bottom + 8 : Math.max(4, r.top - tip.offsetHeight - 8)) + "px";

    let svg = "";
    if (selected && selected !== el && document.contains(selected)) {
      const s = selected.getBoundingClientRect();
      place($("sel"), s.left, s.top, s.width, s.height);
      for (const [x1, y1, x2, y2] of gaps(s, r)) {
        const d = Math.round(Math.hypot(x2 - x1, y2 - y1));
        const lx = (x1 + x2) / 2, ly = (y1 + y2) / 2;
        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ff3b7f" stroke-width="1.5"/>`
          + `<rect x="${lx - 16}" y="${ly - 9}" width="32" height="18" rx="4" fill="#ff3b7f"/>`
          + `<text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="11" font-weight="700" font-family="system-ui" fill="#fff">${d}</text>`;
      }
    } else if (selected) {
      const s = selected.getBoundingClientRect();
      place($("sel"), s.left, s.top, s.width, s.height);
    }
    $("lines").innerHTML = svg;
  }

  const onMove = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === host) return;
    hovered = el;
    if (!raf) raf = requestAnimationFrame(draw);
  };
  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    selected = hovered === selected ? null : hovered;
    if (!selected) $("sel").style.display = "none";
    draw();
  };
  const onKey = (e) => { if (e.key === "Escape") stop(); };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(draw); };

  function start() {
    measuring = true;
    $("hud").style.display = "block";
    addEventListener("mousemove", onMove, true);
    addEventListener("click", onClick, true);
    addEventListener("keydown", onKey, true);
    addEventListener("scroll", onScroll, true);
  }
  function stop() {
    measuring = false;
    selected = hovered = null;
    hideBoxes();
    $("hud").style.display = "none";
    removeEventListener("mousemove", onMove, true);
    removeEventListener("click", onClick, true);
    removeEventListener("keydown", onKey, true);
    removeEventListener("scroll", onScroll, true);
  }

  function drawGrid() {
    const g = $("grid");
    if (!grid) { g.style.display = "none"; return; }
    const width = Math.min(innerWidth - 2 * grid.margin, grid.maxWidth);
    const left = (innerWidth - width) / 2;
    const col = (width - grid.gutter * (grid.columns - 1)) / grid.columns;
    g.innerHTML = Array.from({ length: grid.columns }, (_, i) =>
      `<div class="col" style="left:${left + i * (col + grid.gutter)}px;width:${col}px"></div>`).join("");
    g.style.backgroundImage = grid.baseline
      ? `repeating-linear-gradient(to bottom, transparent 0 ${grid.baseline - 1}px, rgba(47,128,237,.18) ${grid.baseline - 1}px ${grid.baseline}px)` : "none";
    g.style.display = "block";
  }
  addEventListener("resize", drawGrid);

  window.__aruzenMeasure = (cmd, cfg) => {
    if (cmd === "toggle-measure") measuring ? stop() : start();
    if (cmd === "grid") { grid = cfg; drawGrid(); }
    return { measuring, grid: !!grid };
  };
})();
