# AI Survivors 👾
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Made with Bun](https://img.shields.io/badge/Made%20with-Bun-000?logo=bun&logoColor=fff)](https://bun.sh)

Fast, demoscene-styled, top-down arena survivor built with vanilla JS, Canvas2D, and Bun — runs in the browser or as a tiny desktop app. ⚡️🎮 All static assets can be embedded into a single binary for distribution. 📦

- ⚙️ Engine: Bun (server + compile)
- 🖥️ Desktop: webview-bun (WebKit-based WebView)
- 🎨 Rendering: Canvas 2D
- 🧪 Physics: Lightweight XPBD/AVBD circle solver with contact skin + damping (public/avbd2d.js)
- 🧰 Content: Editable config (enemies, weapons, waves, upgrades) in public/config.js

## Features ✨
- 🔫 Modular weapons: piercing, homing, explosive, chain, bounces, split shots…
- 🧟 Enemy behaviors: chase, zigzag, orbit, sniper, kamikaze; abilities like shield, rage, teleport, split
- 🧮 Lightweight AVBD circle physics for smooth separation and contact
- 🔁 Live-reload dev server that watches public/ and refreshes automatically
- 📦 Single-binary server build with embedded assets
- 🖥️ Desktop app (WebView) — no browser required

## Table of Contents
- Features
- Quick Start
- Available Scripts
- Project Layout
- Development Workflow
- Controls
- Gameplay Overview
- Troubleshooting
- Contributing
- License
- Acknowledgements

## Quick Start

Prereqs:
- Bun v1.1+ (https://bun.sh)
- macOS/Linux. Windows: WSL recommended for dev/CLI tooling. Desktop build on native Windows is not supported by webview-bun.

Clone and run:

```bash
git clone https://github.com/your-org/ai-survivors.git
cd ai-survivors
bun install
```

Dev (live reload, watches public/):
```bash
bun run dev
# opens http://localhost:3000 (default)
```

Server (embedded assets, no file watching):
```bash
bun run server
# or: PORT=8080 bun run server
```

Build single-file web server binary:
```bash
bash scripts/build.sh
# Outputs: dist/ai-survivors

# Run the compiled server
./dist/ai-survivors
# or: PORT=8080 ./dist/ai-survivors
```

Build desktop app (WebView window, no browser required):
```bash
# macOS/Linux
bash scripts/build-desktop.sh
# Outputs: dist/ai-survivors-desktop

./dist/ai-survivors-desktop
```

## Available Scripts
- bun run dev — start dev server with live reload; serves from public/ (ignores embedded assets)
- bun run server — regenerate embedded assets, then start server (serves embedded assets, falls back to filesystem)
- bun run build:web — build single-file server binary (dist/ai-survivors)
- bun run build:desktop — build desktop WebView app (dist/ai-survivors-desktop)
- bun run desktop — run desktop app from source (spawns embedded server + WebView)

Linux desktop build requirements (WebKitGTK) 🔧:
- Ubuntu/Debian: sudo apt-get install -y libwebkit2gtk-4.0-37 libgtk-3-0 libglib2.0-0
- Fedora: sudo dnf install webkit2gtk3 gtk3

Note: script will run `bun add --dev webview-bun` if needed.

## Controls

- 🕹️ Move: WASD or Arrow Keys
- ⚡ Dash: Space (i-frames; deals damage if upgraded)
- ⚙️ Options: Main Menu → Options to adjust Master/SFX/Music volume (saved locally)
- ⏸️ Pause: P or ESC
- The game auto-pauses for Upgrades/Shop overlays.

## Gameplay Overview

- ⏱️ Waves: Timed runs with an on-screen timer and a progress bar
- 🤖 Enemies: Multiple behaviors (chase, zigzag, orbit, sniper, kamikaze) + abilities (shield, rage, teleport, split)
- 🔫 Weapons: Spread, piercing, homing, explosive, chain, bounces, split shots, contact damage…
- ⬆️ Upgrades: Between-wave Shop and level-ups; passives like speed, regen, magnet, thorns, contact damage, range
- 💰 Pickups: Coins (various denominations) and occasional health packs
- 🧪 Physics: Circle-based AVBD/PBD constraints for separation and collision response

## Project Layout

```
public/                # Frontend code & static assets (embedded during build)
  index.html
  main.js              # App bootstrap, loop, input
  renderer.js          # Canvas2D rendering
  systems.js           # Game systems orchestration
  physics.js           # AVBD integration (public/avbd2d.js)
  avbd2d.js            # Vec2, solver, constraints, spatial hash
  collisions.js        # Bullet/enemy/player collision logic
  enemies.js           # AI behaviors and movement
  bullets.js           # Bullet motion + homing/bounces
  effects.js           # Particles & camera shake
  waves.js             # Wave spawner controller
  shop.js              # Between-wave shop
  upgrades.js          # Upgrade application & UI
  state.js             # Global state + DOM refs
  config.js            # Default enemies/weapons/waves/upgrades
  styles.css

server/
  server.ts            # Dev/compiled server; SPA fallback; dev: serves public/ w/ live reload; prod: serves embedded assets.ts
  desktop.ts           # Embedded HTTP server + WebView launcher

scripts/
  generate-assets.ts   # Embeds everything in /public into server/assets.ts
  build.sh             # Compile server to single binary
  build-desktop.sh     # Build desktop app (webview-bun)

dist/                  # Build outputs
```

## Development Workflow
- Use bun run dev for development:
  - Serves files directly from public/ with Cache-Control: no-store
  - Injects a tiny WebSocket client and auto-reloads the page when files in public/ change
  - No need to run scripts/generate-assets.ts in dev
- Use bun run server when you want to test embedded assets (what builds ship):
  - Automatically runs scripts/generate-assets.ts, then starts the server
  - Serves embedded assets (falls back to filesystem if missing)
- Builds:
  - bun run build:web produces a single binary (dist/ai-survivors) that serves embedded assets
  - bun run build:desktop embeds the server and launches a WebView app (dist/ai-survivors-desktop)
- Environment variables:
  - PORT: override server port (default 3000)
  - WEBVIEW_HOST: desktop app internal host (default 127.0.0.1)

## Configuration and Modding

- Edit public/config.js
  - enemies: colors, size, hp, behaviors, special abilities
  - weapons: damage, fireRate, bulletSpeed/Size, spread, range, piercing, homing, explosive, chain, bounces, splitShot, contactDamage
  - waves: arrays of enemy names per wave
  - upgrades: passive and weapon-related upgrades
  - background: CSS color for background gradient

- Range units: state.rangeUnitPx defines how range multipliers map to pixels (default 320).
- Physics: public/physics.js toggles and synchronizes AVBD world; AVBD parameters in PHYS_CFG.
- Renderer: public/renderer.js controls glow, particles, HUD polish.

## Physics Notes (AVBD/PBD) 🧪

Overview
- Tiny position-based dynamics solver with XPBD-style compliance for stable circle contacts.
- New: contactSkin (px) and velocityDamping in the solver reduce jitter in dense crowds; broadphase cell size is chosen dynamically from average entity radii.
- AVBD runs separation; collisions.js handles damage, bullets, pickups, etc.

Files and roles
- public/avbd2d.js: Vec2, Particle, SpatialHash, constraints (Distance, Pin, HalfSpace, CircleContact), AVBDSolver.
- public/physics.js: Bridges state ↔ physics world each frame and clamps positions to screen.
- public/collisions.js: Damage and effects; when AVBD is enabled, it skips its own enemy–enemy pushout.

Pipeline (per solver step)
1) applyForces: v += dt * (f * invM + gravity)
2) predictPositions: xp = x + v * dt
3) buildBroadPhase: SpatialHash fills 3×3 neighbor cells
4) projectConstraints:
   - Static constraints (if any) + dynamic CircleContact constraints generated from broadphase
   - Iterate this.iterations times; XPBD compliance used for stability
5) updateVelocities: v = (xp − x) / dt; optionally scale by velocityDamping; then x = xp
6) clearForces

Units and time
- dt is seconds. The solver’s advance() accumulates real time and integrates in fixed 1/60s steps (max 8 per frame).
- Game velocities are maintained in px/frame; public/physics.js scales to px/s (×60) when syncing into the world.

Mass and inverse mass
- massFromSize(s) ≈ s² · 0.2 (pseudo-area). invM = 0 pins a particle (pinned=true).
- Constraints distribute corrections using inverse masses (w = invM) so heavier objects move less.

Contacts and compliance
- CircleContact keeps centers at least r_i + r_j − contactSkin apart (contactSkin in px; default 0.5).
- collisionCompliance in PHYS_CFG controls softness:
  - 0 → rigid contacts (crisp separation)
  - Small >0 (e.g., 1e-6 … 1e-4) → slight give, helps reduce jitter in dense piles
- velocityDamping (default 0.98) scales velocities after projection to calm stacks; set 1.0 to disable.
- Lambda caching (per-constraint impulses) improves convergence across iterations.

Broadphase
- Spatial hash cellSize is chosen dynamically each rebuild (≈ avg radius × 2.5; clamped 32–96px). Override via PHYS_CFG.cellSize.
- Neighbors checked in a 3×3 cell window.

Integration with gameplay
- With AVBD enabled, enemies don’t get extra pushout from collisions.js; the solver handles separation.
- Player contact damage still uses proximity checks in collisions.js (with a small epsilon when AVBD is on).
- Bullet hits, shields, explosions, and all damage accounting remain in collisions.js.

Boundaries
- We clamp positions to the screen after each physics update (simple and robust for UI-sized worlds).
- HalfSpaceConstraint exists for walls/ground if you ever want physically enforced borders.

Tuning (public/physics.js → PHYS_CFG)
- iterations: default 9 (6–10 typical) for crisp separation
- substeps: default 2; increase if very fast objects tunnel
- collisionCompliance: default 2e-5; 0 for rigid, 1e-6 … 5e-5 to reduce jitter in dense piles
- contactSkin: default 0.5px; small gap to reduce jitter/tunneling in dense crowds (0 disables)
- velocityDamping: default 0.98; mild internal damping to calm piles (1 disables)
- cellSize: chosen dynamically from average radii (≈ 2.5× avg R; clamped 32–96px); can be overridden
- Performance scales with (constraints + contacts) × iterations per step; broadphase keeps contact pairs manageable.

Disabling AVBD (debug/fallback)
- In DevTools: state.physics.enabled = false; or temporarily comment out updatePhysics(...) in public/systems.js.
- When disabled, collisions.js applies its legacy overlap resolution for enemies.

## Troubleshooting

- Error: Cannot find module "./assets" (server/assets.ts)
  - Run: `bun run scripts/generate-assets.ts`
- bun: command not found
  - Install Bun: https://bun.sh
- Desktop app fails to start on Linux
  - Install WebKitGTK: see “Linux desktop build requirements”
- No audio or very quiet
  - Browsers require a user gesture to start audio; click or press a key (this repo resumes AudioContext on first interaction).
  - Also use Main Menu → Options to adjust volumes (settings persist via localStorage).
- Black screen or missing UI/CSS
  - Ensure assets were regenerated after changes; check DevTools console for 404s.
- 🔁 Dev server not reloading: ensure you’re using bun run dev (DEV=1). Some extensions can block the /__ws live-reload socket; try a private window.
- 🧹 Stale assets in dev: if you ran bun run server, you’re serving embedded assets; switch to bun run dev or regenerate assets (bun run server).

## Contributing

- Issues and PRs welcome.
- Style: vanilla ES modules; keep modules small and focused.
- If adding public assets, don’t forget to regenerate embedded assets.
- Commit messages: concise, imperative mood (e.g., “Add railgun chain effect”)
- PRs: small and focused are easier to review. Thanks! 🙏

## License 📜

Apache License 2.0. See LICENSE for details.

## Acknowledgements 🙌

- Bun (server, bundling, compile)
- webview-bun (desktop WebView)
- Thanks to the open-source community for inspiration on PBD/AVBD techniques.
