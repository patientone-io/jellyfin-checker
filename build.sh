#!/bin/bash
set -e

build_target() {
  local target="$1"
  local src="src"
  local dist="dist/$target"

  rm -rf "$dist"
  mkdir -p "$dist"

  # Copy shared source files
  cp -r "$src"/* "$dist/"

  # Copy browser-specific manifest
  cp "$target/manifest.json" "$dist/manifest.json"

  echo "✅ Built $dist/"
  echo "   Load unpacked extension from: $dist"

  # Package into zip / xpi if zip tool is available
  if command -v zip >/dev/null 2>&1; then
    if [ "$target" = "chrome" ]; then
      local zip_file="dist/jellyfin-checker-chrome.zip"
      rm -f "$zip_file"
      (cd "$dist" && zip -q -r "../../$zip_file" . -x ".*" -x "screenshots/*" -x "*.svg")
      echo "📦 Packaged Chrome Web Store archive: $zip_file"
    elif [ "$target" = "firefox" ]; then
      local xpi_file="dist/jellyfin-checker-firefox.xpi"
      rm -f "$xpi_file"
      (cd "$dist" && zip -q -r "../../$xpi_file" . -x ".*" -x "screenshots/*" -x "*.svg")
      echo "📦 Packaged Firefox XPI addon: $xpi_file"
    fi
  fi
}

TARGET="${1:-all}"

case "$TARGET" in
  chrome)
    build_target "chrome"
    ;;
  firefox)
    build_target "firefox"
    ;;
  all)
    build_target "chrome"
    echo ""
    build_target "firefox"
    ;;
  *)
    echo "Usage: bash build.sh [chrome|firefox|all]"
    exit 1
    ;;
esac
