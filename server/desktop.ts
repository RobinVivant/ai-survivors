import { serve } from "bun";
import { getAsset } from "./assets";
import { spawn } from "bun";

console.log("Starting AI Survivors desktop app...");

// Start embedded HTTP server on a fixed port for debugging
const server = serve({
  port: 9999, // Use fixed port for easier debugging
  fetch: async (req) => {
    const url = new URL(req.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;

    // Serve embedded assets
    const asset = getAsset(pathname);
    if (asset) {
      return new Response(asset.content, {
        headers: { 
          "Content-Type": asset.mimeType,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "*"
        },
      });
    }

    // SPA fallback to index.html
    const indexAsset = getAsset("/index.html");
    if (indexAsset) {
      return new Response(indexAsset.content, {
        headers: { 
          "Content-Type": indexAsset.mimeType,
          "Access-Control-Allow-Origin": "*"
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`✓ Server running on http://localhost:9999`);
console.log(`✓ Opening browser window...`);

// Fallback: Open in system browser if webview doesn't work
try {
  // Try to open with system browser as fallback
  let openCmd;
  if (process.platform === "darwin") {
    openCmd = "open";
  } else if (process.platform === "win32") {
    openCmd = "start";
  } else {
    openCmd = "xdg-open";
  }
  
  spawn([openCmd, "http://localhost:9999"], { 
    stdio: "ignore",
    detached: true 
  });
  
  console.log(`✓ Game opened in browser at http://localhost:9999`);
  console.log("Press Ctrl+C to stop the server");
  
} catch (error) {
  console.log("Could not open browser automatically.");
  console.log("Please open http://localhost:9999 in your browser manually");
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log("\nShutting down server...");
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.stop();
  process.exit(0);
});

// Keep the process alive
setInterval(() => {}, 1000);