#!/usr/bin/python3
"""Prépare les extensions : copie du code commun, logos, clé fixe (identifiant stable)
et liste des identifiants autorisés pour l'hôte natif."""
import base64
import hashlib
import json
import os
import shutil
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT_DIR = os.path.join(ROOT, "extensions")
KEYS_DIR = os.path.join(ROOT, "tools", "keys")


def ext_key(name, current=None):
    """Clé RSA par extension : l'identifiant reste le même à chaque chargement.
    Les clés privées (tools/keys) ne sont jamais publiées : sans elles, on garde
    la clé publique déjà présente dans le manifest."""
    pem = os.path.join(KEYS_DIR, name + ".pem")
    if current and not os.path.exists(pem):
        der = base64.b64decode(current)
    else:
        os.makedirs(KEYS_DIR, exist_ok=True)
        if not os.path.exists(pem):
            subprocess.run(["openssl", "genrsa", "-out", pem, "2048"], check=True, capture_output=True)
        der = subprocess.run(["openssl", "rsa", "-in", pem, "-pubout", "-outform", "DER"],
                             check=True, capture_output=True).stdout
    ext_id = "".join(chr(ord("a") + int(c, 16)) for c in hashlib.sha256(der).hexdigest()[:32])
    return base64.b64encode(der).decode(), ext_id


def main():
    ids = {}
    shared = os.path.join(EXT_DIR, "_shared")
    for name in sorted(os.listdir(EXT_DIR)):
        path = os.path.join(EXT_DIR, name)
        if name.startswith("_") or not os.path.isdir(path):
            continue
        dest = os.path.join(path, "shared")
        shutil.rmtree(dest, ignore_errors=True)
        shutil.copytree(shared, dest)

        mpath = os.path.join(path, "manifest.json")
        with open(mpath, encoding="utf-8") as f:
            manifest = json.load(f)
        manifest["key"], ids[name] = ext_key(name, manifest.get("key"))
        with open(mpath, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print("%-20s %s" % (name, ids[name]))

    with open(os.path.join(ROOT, "host", "extension_ids.json"), "w") as f:
        json.dump(ids, f, indent=2)
    # Logos dessinés dans tools/logos.py
    subprocess.run(["/usr/bin/python3", os.path.join(ROOT, "tools", "logos.py")], check=True)


if __name__ == "__main__":
    main()
