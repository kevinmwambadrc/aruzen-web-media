// Couleurs : conversion, regroupement des teintes proches (ΔE Lab) et rôles probables.
export const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

function lab([r, g, b]) {
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
  const y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
  const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const chroma = ([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
export const lightness = (rgb) => lab(rgb)[0];

// Fusionne les teintes quasi identiques ; la plus présente donne sa valeur au groupe.
export function cluster(colors, threshold = 5, max = 20) {
  const groups = [];
  for (const c of [...colors].sort((a, b) => b.w - a.w)) {
    const l = lab(c.rgb);
    const g = groups.find((x) => dist(x.lab, l) < threshold);
    if (g) g.w += c.w;
    else groups.push({ rgb: c.rgb, lab: l, w: c.w });
  }
  const total = groups.reduce((s, g) => s + g.w, 0) || 1;
  return groups.sort((a, b) => b.w - a.w).slice(0, max).map((g) => ({ rgb: g.rgb, hex: hex(g.rgb), pct: (100 * g.w) / total }));
}

// Fond = la plus étendue ; texte = la plus contrastée avec le fond ; accent = la plus vive.
export function roles(palette) {
  if (!palette.length) return {};
  const bg = palette[0];
  const text = palette.slice(1).filter((c) => chroma(c.rgb) < 0.25)
    .sort((a, b) => Math.abs(lightness(b.rgb) - lightness(bg.rgb)) - Math.abs(lightness(a.rgb) - lightness(bg.rgb)))[0];
  const accent = palette.filter((c) => c !== bg && chroma(c.rgb) > 0.3).sort((a, b) => b.pct * chroma(b.rgb) - a.pct * chroma(a.rgb))[0];
  return { [bg.hex]: "Fond", ...(text && { [text.hex]: "Texte" }), ...(accent && { [accent.hex]: "Accent" }) };
}
