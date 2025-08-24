#!/usr/bin/env bash
set -euo pipefail
mkdir -p dist
echo "Installing webview-bun..."
bun add --dev webview-bun >/dev/null 2>&1 || true
echo "Generating embedded assets..."
bun run scripts/generate-assets.ts
echo "Building desktop app binary..."
bun build --compile --minify server/desktop.ts --outfile dist/ai-survivors-desktop
echo "Build complete: dist/ai-survivors-desktop"