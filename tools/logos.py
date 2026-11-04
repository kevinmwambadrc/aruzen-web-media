#!/usr/bin/python3
"""Logos des 10 extensions : squircle en dégradé, reflet, pictogramme blanc posé sur une couche « verre ».
Écrit tools/logos/<extension>.svg puis les PNG 16/32/48/128 dans chaque extension (rendu Chrome sans interface)."""
import os
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "tools", "logos")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
MAGICK = "/opt/homebrew/bin/magick"

def superellipse(n=5, r=60, c=64, steps=160):
    """Contour « squircle » façon icône d'app (|x|^n + |y|^n = r^n)."""
    import math
    pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        ct, st = math.cos(t), math.sin(t)
        x = c + r * math.copysign(abs(ct) ** (2 / n), ct)
        y = c + r * math.copysign(abs(st) ** (2 / n), st)
        pts.append("%.2f %.2f" % (x, y))
    return "M" + " L".join(pts) + "Z"


SQUIRCLE = superellipse()
GLASS = 'fill="#fff" fill-opacity=".26" stroke="#fff" stroke-opacity=".55" stroke-width="1.5"'
W = 'fill="#fff"'

# (couleur claire, couleur foncée, pictogramme). {c} = couleur foncée, pour les découpes.
LOGOS = {
    "01-video-grab": ("#FF5C7A", "#C2124A", """
        <rect x="18" y="32" width="64" height="48" rx="13" {g}/>
        <path d="M58 46v40l34-20z" {w} stroke="#fff" stroke-width="12" stroke-linejoin="round"/>"""),
    "02-music-grab": ("#B66BFF", "#6223D6", """
        <circle cx="80" cy="66" r="32" {g}/>
        <circle cx="80" cy="66" r="7" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3"/>
        <path d="M58 88V32c6 10 16 13 26 16" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
        <ellipse cx="45" cy="89" rx="16" ry="12.5" transform="rotate(-24 45 89)" {w}/>"""),
    "03-playlist-grab": ("#4CC9FF", "#0563A8", """
        <rect x="36" y="24" width="56" height="34" rx="10" {g}/>
        <rect x="28" y="36" width="72" height="40" rx="11" {g}/>
        <rect x="20" y="50" width="88" height="52" rx="14" {w}/>
        <path d="M58 64v24l20-12z" fill="{c}" stroke="{c}" stroke-width="6" stroke-linejoin="round"/>"""),
    "04-media-sniffer": ("#FFC83D", "#D46A00", """
        <circle cx="64" cy="64" r="44" {g}/>
        <circle cx="64" cy="64" r="26" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.5"/>
        <path d="M64 64V20A44 44 0 0 1 102 42Z" {w} fill-opacity=".9"/>
        <circle cx="64" cy="64" r="8" {w}/>
        <circle cx="90" cy="84" r="6" {w}/>
        <circle cx="42" cy="44" r="4.5" {w}/>"""),
    "05-pdf-studio": ("#FF6B5E", "#B3161B", """
        <rect x="44" y="18" width="56" height="74" rx="11" transform="rotate(9 72 55)" {g}/>
        <path d="M38 24h32l20 20v48a12 12 0 0 1-12 12H38a12 12 0 0 1-12-12V36a12 12 0 0 1 12-12z" {w}/>
        <path d="M70 24v12a8 8 0 0 0 8 8h12" fill="{c}" fill-opacity=".25"/>
        <path d="M58 52v30M46 72l12 12 12-12" fill="none" stroke="{c}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>"""),
    "06-image-grab": ("#3DDC97", "#047A55", """
        <rect x="34" y="20" width="74" height="58" rx="12" transform="rotate(-10 71 49)" {g}/>
        <rect x="20" y="40" width="80" height="62" rx="13" {w}/>
        <path d="M30 92l20-24 14 15 10-10 18 19z" fill="{c}" stroke="{c}" stroke-width="5" stroke-linejoin="round"/>
        <circle cx="82" cy="58" r="7" fill="{c}"/>"""),
    "07-subtitles-grab": ("#2EE6C9", "#0A7468", """
        <path d="M44 20h52a14 14 0 0 1 14 14v30a14 14 0 0 1-14 14h-4v12l-14-12H44a14 14 0 0 1-14-14V34a14 14 0 0 1 14-14z" {g}/>
        <path d="M32 40h56a14 14 0 0 1 14 14v28a14 14 0 0 1-14 14H54l-18 14V96h-4a14 14 0 0 1-14-14V54a14 14 0 0 1 14-14z" {w}/>
        <path d="M34 62h22M64 62h22M34 76h40" fill="none" stroke="{c}" stroke-width="7" stroke-linecap="round"/>"""),
    "08-link-bulk": ("#8F96FF", "#3B2FC9", """
        <rect x="16" y="46" width="60" height="36" rx="18" transform="rotate(-45 46 64)" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="12"/>
        <rect x="52" y="46" width="60" height="36" rx="18" transform="rotate(-45 82 64)" fill="none" stroke="#fff" stroke-width="12"/>"""),
    "09-tab-recorder": ("#2B3140", "#0B0E15", """
        <circle cx="64" cy="64" r="46" fill="none" stroke="#FF3B47" stroke-opacity=".25" stroke-width="3"/>
        <circle cx="64" cy="64" r="34" fill="#fff" fill-opacity=".08" stroke="#fff" stroke-width="7"/>
        <circle cx="64" cy="64" r="20" fill="#FF3B47"/>
        <circle cx="58" cy="57" r="6" fill="#fff" fill-opacity=".45"/>"""),
    "10-video-widget": ("#FF8A3D", "#DB3A06", """
        <rect x="22" y="18" width="84" height="64" rx="17" {g}/>
        <path d="M64 30v46M46 60l18 18 18-18" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M30 86v4a12 12 0 0 0 12 12h44a12 12 0 0 0 12-12v-4" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round"/>"""),
    "11-design-kit": ("#FFC94D", "#F0216F", """
        <circle cx="38" cy="46" r="22" {g}/>
        <circle cx="90" cy="46" r="22" {g}/>
        <path d="M64 16 92 60c3 4 2 9-1 12L74 96H54L37 72c-3-3-4-8-1-12Z" {w}/>
        <path d="M64 30v30" fill="none" stroke="{c}" stroke-width="5" stroke-linecap="round"/>
        <circle cx="64" cy="66" r="7" fill="{c}"/>
        <rect x="50" y="100" width="28" height="12" rx="5" {w}/>"""),
    "12-research": ("#4FACFE", "#5B2BD9", """
        <rect x="20" y="18" width="64" height="82" rx="13" {g}/>
        <rect x="30" y="48" width="40" height="13" rx="4" fill="#FFE066"/>
        <path d="M34 36h36M34 54h30M34 72h18" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
        <circle cx="78" cy="76" r="19" fill="#fff" fill-opacity=".18" stroke="#fff" stroke-width="10"/>
        <path d="M92 90l12 12" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>"""),
    "13-social": ("#C6F432", "#1E9A4A", """
        <rect x="18" y="18" width="58" height="72" rx="12" {g}/>
        <circle cx="34" cy="34" r="6" fill="#fff" fill-opacity=".7"/>
        <path d="M28 52h34M28 62h24" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>
        <path d="M58 42h40a12 12 0 0 1 12 12v26a12 12 0 0 1-12 12H82l-15 13V92h-9a12 12 0 0 1-12-12V54a12 12 0 0 1 12-12z" {w}/>
        <path d="M78 81c-9-6-15-11-15-17a7.5 7.5 0 0 1 15-3 7.5 7.5 0 0 1 15 3c0 6-6 11-15 17z" fill="{c}"/>"""),
    "14-workspace": ("#F2C46D", "#8A5A12", """
        <rect x="16" y="20" width="58" height="76" rx="12" {g}/>
        <path d="M27 40l5 5 9-10M27 60l5 5 9-10" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M48 40h16M48 60h12" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="5" stroke-linecap="round"/>
        <rect x="72" y="38" width="12" height="9" rx="3" {w}/>
        <circle cx="78" cy="76" r="27" {w}/>
        <path d="M78 76V60M78 76l10 8" fill="none" stroke="{c}" stroke-width="6" stroke-linecap="round"/>
        <circle cx="78" cy="76" r="4" fill="{c}"/>"""),
    "15-image-hd": ("#5BE7F0", "#1D4ED8", """
        <rect x="32" y="16" width="78" height="60" rx="12" {g}/>
        <rect x="16" y="32" width="80" height="64" rx="13" {w}/>
        <path d="M24 88l21-25 13 14 10-10 20 21z" fill="{c}" stroke="{c}" stroke-width="5" stroke-linejoin="round"/>
        <circle cx="76" cy="50" r="7" fill="{c}"/>
        <circle cx="96" cy="94" r="21" {w}/>
        <path d="M88 102l16-16M93 85h12v12M87 91v12h12" fill="none" stroke="{c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>"""),
    "16-retouche": ("#FF8AD0", "#A3134F", """
        <rect x="16" y="20" width="84" height="66" rx="13" {g}/>
        <path d="M24 78l18-20 12 12 8-8 16 16z" fill="#fff" fill-opacity=".5"/>
        <g transform="rotate(-38 76 82)"><rect x="46" y="66" width="62" height="30" rx="9" {w}/>
          <rect x="46" y="66" width="22" height="30" rx="9" fill="{c}" fill-opacity=".35"/></g>
        <path d="M38 26l3.5 9 9 3.5-9 3.5-3.5 9-3.5-9-9-3.5 9-3.5z" {w}/>
        <path d="M100 26l2.2 5.8 5.8 2.2-5.8 2.2-2.2 5.8-2.2-5.8-5.8-2.2 5.8-2.2z" {w}/>"""),
}


def svg(light, dark, glyph):
    glyph = glyph.replace("{g}", GLASS).replace("{w}", W).replace("{c}", dark)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{light}"/><stop offset="1" stop-color="{dark}"/></linearGradient>
    <linearGradient id="hi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3.5" stdDeviation="3.5" flood-color="#000" flood-opacity=".28"/></filter>
    <clipPath id="sq"><path d="{SQUIRCLE}"/></clipPath>
  </defs>
  <path d="{SQUIRCLE}" fill="url(#bg)"/>
  <g clip-path="url(#sq)" filter="url(#sh)">{glyph}
  </g>
  <path d="{SQUIRCLE}" fill="url(#hi)"/>
  <path d="{SQUIRCLE}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="1.5"/>
</svg>
"""


def render(svg_path, png_path, size=512):
    html = f'<html><body style="margin:0;background:transparent"><img src="file://{svg_path}" width="{size}" height="{size}"></body></html>'
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
        f.write(html)
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
                    "--default-background-color=00000000", f"--window-size={size},{size}",
                    f"--screenshot={png_path}", "file://" + f.name],
                   check=True, capture_output=True)
    os.remove(f.name)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, (light, dark, glyph) in LOGOS.items():
        path = os.path.join(OUT, name + ".svg")
        with open(path, "w") as f:
            f.write(svg(light, dark, glyph))
        big = os.path.join(OUT, name + ".png")
        render(path, big)
        icons = os.path.join(ROOT, "extensions", name, "icons")
        os.makedirs(icons, exist_ok=True)
        for s in (16, 32, 48, 128):
            subprocess.run([MAGICK, big, "-filter", "Lanczos", "-resize", f"{s}x{s}", os.path.join(icons, f"{s}.png")], check=True)
        print("ok", name)


if __name__ == "__main__":
    main()
