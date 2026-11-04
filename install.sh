#!/bin/zsh
# Installe l'hôte natif (yt-dlp) pour Chrome et Edge, et le widget de barre de menus.
set -e
ROOT="${0:A:h}"
APP_DIR="$HOME/Library/Application Support/AruzenWebMedia"
HOST_NAME="com.aruzen.webmedia"

mkdir -p "$APP_DIR"
cp "$ROOT/host/media_helper.py" "$APP_DIR/media_helper.py"
chmod +x "$APP_DIR/media_helper.py"

ORIGINS=$(/usr/bin/python3 -c "
import json; ids = json.load(open('$ROOT/host/extension_ids.json'))
print(json.dumps(['chrome-extension://%s/' % i for i in ids.values()]))")

for BROWSER_DIR in "Google/Chrome" "Microsoft Edge"; do
  DIR="$HOME/Library/Application Support/$BROWSER_DIR/NativeMessagingHosts"
  mkdir -p "$DIR"
  cat > "$DIR/$HOST_NAME.json" <<JSON
{
  "name": "$HOST_NAME",
  "description": "Aruzen Web Media (yt-dlp)",
  "path": "$APP_DIR/media_helper.py",
  "type": "stdio",
  "allowed_origins": $ORIGINS
}
JSON
  echo "Hôte natif enregistré : $DIR"
done

if [ -d "$ROOT/widget/Aruzen Web Media.app" ]; then
  mkdir -p "$HOME/Applications"
  rm -rf "$HOME/Applications/Aruzen Web Media.app"
  cp -R "$ROOT/widget/Aruzen Web Media.app" "$HOME/Applications/"
  echo "Widget installé : ~/Applications/Aruzen Web Media.app"
fi

/usr/bin/python3 "$APP_DIR/media_helper.py" --settings >/dev/null
echo "Terminé. Dossier des téléchargements : ~/Downloads/Web Media"
