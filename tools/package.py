#!/usr/bin/python3
"""Crée dist/<extension>-<version>.zip pour chaque extension, plus dist/SHA256SUMS.txt.
Les ZIP sont reproductibles (ordre trié, date fixe, droits fixes) : le même code donne la même empreinte."""
import hashlib
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT_DIR = os.path.join(ROOT, "extensions")
DIST = os.path.join(ROOT, "dist")
SKIP = {".DS_Store", "README.md"}


def main():
    os.makedirs(DIST, exist_ok=True)
    sums = []
    for name in sorted(os.listdir(EXT_DIR)):
        path = os.path.join(EXT_DIR, name)
        if name.startswith("_") or not os.path.isdir(path):
            continue
        with open(os.path.join(path, "manifest.json"), encoding="utf-8") as f:
            version = json.load(f)["version"]
        out = os.path.join(DIST, "%s-%s.zip" % (name, version))
        files = []
        for base, dirs, names in os.walk(path):
            dirs.sort()
            files += [os.path.join(base, n) for n in names if n not in SKIP]
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
            for fp in sorted(files):
                info = zipfile.ZipInfo(os.path.relpath(fp, path), date_time=(2026, 1, 1, 0, 0, 0))
                info.external_attr = 0o644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                with open(fp, "rb") as f:
                    z.writestr(info, f.read())
        with open(out, "rb") as f:
            sums.append("%s  %s" % (hashlib.sha256(f.read()).hexdigest(), os.path.basename(out)))
    with open(os.path.join(DIST, "SHA256SUMS.txt"), "w") as f:
        f.write("\n".join(sums) + "\n")
    print("\n".join(sums))


if __name__ == "__main__":
    main()
