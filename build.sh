#!/bin/bash
set -e

if [ $# -eq 0 ]; then
  echo "Usage: bash build.sh <chrome|firefox>"
  exit 1
fi

BROWSER="$1"
SRC="src"
DIST="dist/$BROWSER"

case "$BROWSER" in
  chrome|firefox)
    ;;
  *)
    echo "Unknown browser: $BROWSER. Use 'chrome' or 'firefox'."
    exit 1
    ;;
esac

rm -rf "$DIST"
mkdir -p "$DIST"

# Copy shared source files
cp -r "$SRC"/* "$DIST/"

# Copy browser-specific manifest
cp "$BROWSER/manifest.json" "$DIST/manifest.json"

echo "✅ Built $DIST/"
echo "   Load unpacked extension from: $DIST"
