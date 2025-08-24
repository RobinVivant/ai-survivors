import { serve } from "bun";
import { getAsset } from "./assets";
import { Webview } from "webview-bun";

console.log("Starting AI Survivors desktop app...");

// Start embedded HTTP server on a fixed port for debugging
const server = serve({
  port: 0, // let OS pick an available port
  fetch: async (req) => {
    async function waitUntilUp(url, timeoutMs = 5000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) return;
        } catch {}
        await Bun.sleep(50);
      }
    }
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

console.log(`✓ Server running on http://127.0.0.1:${server.port}`);
const host = process.env.WEBVIEW_HOST || "127.0.0.1";
const addr = `http://${host}:${server.port}/`;
console.log(`✓ Launching WebView: ${addr}`);
await waitUntilUp(addr);

const webview = new Webview();
webview.width = 1280;
webview.height = 800;
webview.title = "AI Survivors";
webview.navigate(addr);

process.on('SIGINT', () => {
  console.log("\nShutting down...");
  try { webview.terminate?.(); } catch {}
  server.stop();
  process.exit(0);
});
process.on('SIGTERM', () => {
  try { webview.terminate?.(); } catch {}
  server.stop();
  process.exit(0);
});

// Blocks until the window is closed
webview.run();

// Window closed -> stop server and exit
server.stop();
process.exit(0);
