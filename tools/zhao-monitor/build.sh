#!/usr/bin/env bash
# Build the "ZHAO Monitor" macOS app + DMG from source.
# Usage:
#   ./build.sh            # build into ./build/
#   ./build.sh --desktop  # also copy the .app and .dmg to ~/Desktop
#
# Requires: Xcode command line tools (swiftc, sips, iconutil, hdiutil, codesign).
set -euo pipefail
cd "$(dirname "$0")"

APP_NAME="ZHAO Monitor"
OUT="build"
rm -rf "$OUT" && mkdir -p "$OUT"
MODULE_CACHE="$OUT/module-cache"
mkdir -p "$MODULE_CACHE"

echo "==> icon"
swiftc -O -swift-version 5 -module-cache-path "$MODULE_CACHE" src/icongen.swift -o "$OUT/icongen"
"$OUT/icongen" "$OUT/icon_1024.png"
ICONSET="$OUT/icon.iconset"; mkdir -p "$ICONSET"
gen(){ sips -z "$1" "$1" "$OUT/icon_1024.png" --out "$ICONSET/$2" >/dev/null; }
gen 16 icon_16x16.png;   gen 32 icon_16x16@2x.png
gen 32 icon_32x32.png;   gen 64 icon_32x32@2x.png
gen 128 icon_128x128.png; gen 256 icon_128x128@2x.png
gen 256 icon_256x256.png; gen 512 icon_256x256@2x.png
gen 512 icon_512x512.png; cp "$OUT/icon_1024.png" "$ICONSET/icon_512x512@2x.png"
if iconutil -c icns "$ICONSET" -o "$OUT/AppIcon.icns"; then
  echo "    icon ok"
else
  sleep 0.5
  iconutil -c icns "$ICONSET" -o "$OUT/AppIcon.icns" || python3 - "$ICONSET" "$OUT/AppIcon.icns" <<'PY'
from pathlib import Path
import struct
import sys

iconset = Path(sys.argv[1])
output = Path(sys.argv[2])
items = [
    ("icp4", "icon_16x16.png"),
    ("icp5", "icon_32x32.png"),
    ("icp6", "icon_32x32@2x.png"),
    ("ic07", "icon_128x128.png"),
    ("ic08", "icon_256x256.png"),
    ("ic09", "icon_512x512.png"),
    ("ic10", "icon_512x512@2x.png"),
]
chunks = []
for chunk_type, filename in items:
    data = (iconset / filename).read_bytes()
    chunks.append(chunk_type.encode("ascii") + struct.pack(">I", len(data) + 8) + data)
payload = b"".join(chunks)
output.write_bytes(b"icns" + struct.pack(">I", len(payload) + 8) + payload)
print("    icon ok (manual icns)")
PY
fi

echo "==> compile"
swiftc -O -swift-version 5 -module-cache-path "$MODULE_CACHE" src/main.swift -o "$OUT/$APP_NAME" \
  -framework Cocoa -framework WebKit

echo "==> assemble bundle"
APP="$OUT/$APP_NAME.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$OUT/$APP_NAME" "$APP/Contents/MacOS/$APP_NAME"
cp src/dashboard.html "$APP/Contents/Resources/"
if [[ -f "$OUT/AppIcon.icns" ]]; then
  cp "$OUT/AppIcon.icns" "$APP/Contents/Resources/"
fi
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>ZHAO Monitor</string>
  <key>CFBundleDisplayName</key><string>部署监测 · ZHAO</string>
  <key>CFBundleExecutable</key><string>ZHAO Monitor</string>
  <key>CFBundleIdentifier</key><string>com.zhao.deploymonitor</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.2</string>
  <key>CFBundleVersion</key><string>3</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>LSApplicationCategoryType</key><string>public.app-category.developer-tools</string>
  <key>NSPrincipalClass</key><string>NSApplication</string>
</dict>
</plist>
PLIST

echo "==> sign (ad-hoc)"
codesign --force --deep --sign - "$APP"
codesign --verify "$APP" && echo "    signed ok"

echo "==> dmg"
STAGE="$OUT/stage"; rm -rf "$STAGE"; mkdir -p "$STAGE"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
if hdiutil create -volname "$APP_NAME" -srcfolder "$STAGE" -ov -format UDZO "$OUT/ZHAO-Monitor.dmg" >/dev/null; then
  echo "built: $OUT/ZHAO-Monitor.dmg"
else
  echo "dmg skipped: hdiutil create failed"
fi

if [[ "${1:-}" == "--desktop" ]]; then
  if [[ -f "$OUT/ZHAO-Monitor.dmg" ]]; then
    cp "$OUT/ZHAO-Monitor.dmg" "$HOME/Desktop/"
  fi
  rm -rf "$HOME/Desktop/$APP_NAME.app"; cp -R "$APP" "$HOME/Desktop/"
  echo "copied .app + .dmg to ~/Desktop"
fi
