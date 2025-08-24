// Auto-generated embedded assets
export interface Asset {
  content: BunFile;
  mimeType: string;
}

export const assets: Record<string, Asset> = {
  "/bullets.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/bullets.js"), mimeType: "text/javascript" },
  "/renderer.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/renderer.js"), mimeType: "text/javascript" },
  "/ui.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/ui.js"), mimeType: "text/javascript" },
  "/openrouter.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/openrouter.js"), mimeType: "text/javascript" },
  "/spatial.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/spatial.js"), mimeType: "text/javascript" },
  "/index.html": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/index.html"), mimeType: "text/html; charset=utf-8" },
  "/collisions.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/collisions.js"), mimeType: "text/javascript" },
  "/styles.css": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/styles.css"), mimeType: "text/css" },
  "/effects.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/effects.js"), mimeType: "text/javascript" },
  "/config.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/config.js"), mimeType: "text/javascript" },
  "/enemies.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/enemies.js"), mimeType: "text/javascript" },
  "/systems.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/systems.js"), mimeType: "text/javascript" },
  "/upgrades.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/upgrades.js"), mimeType: "text/javascript" },
  "/main.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/main.js"), mimeType: "text/javascript" },
  "/audio.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/audio.js"), mimeType: "text/javascript" },
  "/waves.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/waves.js"), mimeType: "text/javascript" },
  "/state.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/state.js"), mimeType: "text/javascript" },
  "/avbd2d.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/avbd2d.js"), mimeType: "text/javascript" },
  "/shop.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/shop.js"), mimeType: "text/javascript" },
  "/player.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/player.js"), mimeType: "text/javascript" },
  "/physics.js": { content: Bun.file("/Users/robinvivant/Git/ai-survivors/public/physics.js"), mimeType: "text/javascript" }
};

export function getAsset(path: string): Asset | undefined {
  return assets[path] || assets["/index.html"]; // fallback to index.html for SPA
}
