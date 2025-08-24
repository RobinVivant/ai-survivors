#!/usr/bin/env bash
set -euo pipefail
mkdir -p dist
echo "Generating embedded assets..."
bun run scripts/generate-assets.ts
echo "Building web server binary..."
bun build --compile server/server.ts --outfile dist/ai-survivors
echo "Build complete: dist/ai-survivors"