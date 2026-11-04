#!/bin/zsh
# Compile le widget en application de barre de menus (sans icône dans le Dock).
set -e
cd "${0:A:h}"
APP="Aruzen Web Media.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
swiftc -O -parse-as-library -o "$APP/Contents/MacOS/AruzenWebMedia" MediaWidget.swift
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Aruzen Web Media</string>
  <key>CFBundleIdentifier</key><string>com.aruzen.webmedia.widget</string>
  <key>CFBundleExecutable</key><string>AruzenWebMedia</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>LSUIElement</key><true/>
</dict></plist>
PLIST
codesign --force --sign - "$APP"
echo "OK : $PWD/$APP"
