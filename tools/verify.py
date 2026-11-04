#!/usr/bin/python3
"""Vérifications avant publication : manifests valides, permissions connues, code commun identique
à extensions/_shared, aucune ressource distante chargée par les pages, aucun secret ni clé privée."""
import filecmp
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT_DIR = os.path.join(ROOT, "extensions")
KNOWN = {"nativeMessaging", "contextMenus", "storage", "unlimitedStorage", "activeTab", "webRequest", "downloads",
         "scripting", "offscreen", "tabCapture", "tabs", "alarms", "notifications", "sidePanel", "idle", "debugger"}
REMOTE = re.compile(r"""<(script|link|img|iframe)[^>]+(src|href)=["']https?://|@import\s+url\(["']?https?://|importScripts\(["']https?://""", re.I)
SECRET = re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|ntn_[A-Za-z0-9]{20,}|secret_[A-Za-z0-9]{30,}")
errors = []

for name in sorted(os.listdir(EXT_DIR)):
    path = os.path.join(EXT_DIR, name)
    if name.startswith("_") or not os.path.isdir(path):
        continue
    m = json.load(open(os.path.join(path, "manifest.json"), encoding="utf-8"))
    if m.get("manifest_version") != 3:
        errors.append("%s : manifest_version doit valoir 3" % name)
    for p in m.get("permissions", []):
        if p not in KNOWN:
            errors.append("%s : permission non documentée « %s »" % (name, p))
    if not os.path.exists(os.path.join(path, "README.md")):
        errors.append("%s : README.md manquant" % name)
    cmp = filecmp.dircmp(os.path.join(EXT_DIR, "_shared"), os.path.join(path, "shared"))
    if cmp.left_only or cmp.right_only or cmp.diff_files:
        errors.append("%s : shared/ diffère de _shared/ (lance tools/build.py)" % name)

for base, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in (".git", "dist", "node_modules")]
    for f in files:
        fp = os.path.join(base, f)
        rel = os.path.relpath(fp, ROOT)
        if f.endswith((".pem", ".crx", ".env")):
            errors.append("%s : fichier sensible" % rel)
        if not f.endswith((".js", ".html", ".css", ".py", ".sh", ".swift", ".json", ".md", ".yml")):
            continue
        text = open(fp, encoding="utf-8", errors="ignore").read()
        if SECRET.search(text):
            errors.append("%s : secret possible" % rel)
        if rel.startswith("extensions") and REMOTE.search(text):
            errors.append("%s : ressource distante chargée" % rel)

print("\n".join(errors) or "Tout est en ordre.")
sys.exit(1 if errors else 0)
