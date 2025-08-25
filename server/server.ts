import { serve } from "bun";
import { join } from "path";
import { readdirSync, statSync } from "fs";

const DEV = process.env.DEV === "1";
const publicDir = join(import.meta.dir, "..", "public");

type AssetLike = { content: Uint8Array; mimeType: string };
let getAsset: ((path: string) => AssetLike | undefined) | undefined;
try {
  const mod = await import("./assets");
  getAsset = mod.getAsset;
} catch {
  if (!DEV) console.warn("[server] No embedded assets found; run scripts/generate-assets.ts");
}

const mimeTypes: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css",
  js: "text/javascript",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

const getFileFromDisk = async (pathname: string) => {
  const filePath = join(publicDir, pathname);
  const file = Bun.file(filePath);
  if (await file.exists()) {
    const ext = pathname.split('.').pop()?.toLowerCase() || "";
    const mimeType = mimeTypes[ext] || "application/octet-stream";
    return new Response(file, {
      headers: { "Content-Type": mimeType, "Cache-Control": "no-store" },
    });
  }
  return null;
};

const LIVE_RELOAD_SNIPPET = `
<script>
(function(){
  try{
    const p = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(p + '//' + location.host + '/__ws');
    ws.onmessage = (e)=>{ if(e.data==='reload'){ location.reload(); } };
    ws.onclose = ()=>{ setTimeout(()=>location.reload(), 1000); };
  }catch(e){}
})();
</script>`;

function fingerprint(dir: string): string {
  const stack = [dir];
  const parts: string[] = [];
  while (stack.length) {
    const d = stack.pop()!;
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else {
        const s = statSync(full);
        parts.push(full + ":" + s.size + ":" + s.mtimeMs);
      }
    }
  }
  return parts.sort().join("|");
}

const wsClients = new Set<WebSocket>();
if (DEV) {
  let lastFp = fingerprint(publicDir);
  setInterval(() => {
    try {
      const fp = fingerprint(publicDir);
      if (fp !== lastFp) {
        lastFp = fp;
        for (const ws of wsClients) { try { ws.send("reload"); } catch {} }
        console.log("[dev] public/ change -> reload");
      }
    } catch {}
  }, 500);
}

const server = serve({
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  websocket: {
    open(ws) { if (DEV) wsClients.add(ws); },
    close(ws) { wsClients.delete(ws); },
  },
  fetch: async (req, server) => {
    const url = new URL(req.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const accept = req.headers.get("Accept") || "";
    const wantsHtml = accept.includes("text/html");

    if (DEV && url.pathname === "/__ws") {
      if (server.upgrade(req)) return;
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    if (DEV) {
      const filePath = join(publicDir, pathname);
      const file = Bun.file(filePath);
      if (await file.exists()) {
        const ext = pathname.split('.').pop()?.toLowerCase() || "";
        if (ext === "html") {
          let html = await file.text();
          if (!html.includes("/__ws")) {
            html = html.includes("</body>")
              ? html.replace("</body>", LIVE_RELOAD_SNIPPET + "</body>")
              : html + LIVE_RELOAD_SNIPPET;
          }
          return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
        return new Response(file, {
          headers: { "Content-Type": mimeTypes[ext] || "application/octet-octet-stream", "Cache-Control": "no-store" },
        });
      }
      if (wantsHtml) {
        const idx = Bun.file(join(publicDir, "index.html"));
        if (await idx.exists()) {
          let html = await idx.text();
          if (!html.includes("/__ws")) {
            html = html.includes("</body>")
              ? html.replace("</body>", LIVE_RELOAD_SNIPPET + "</body>")
              : html + LIVE_RELOAD_SNIPPET;
          }
          return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
      }
      return new Response("Not Found", { status: 404 });
    } else {
      // Try embedded assets first
      if (getAsset) {
        const asset = getAsset(pathname);
        if (asset) {
          return new Response(asset.content, {
            headers: { "Content-Type": asset.mimeType, "Cache-Control": "no-store" },
          });
        }
      }
      // Fallback to filesystem
      try {
        const response = await getFileFromDisk(pathname);
        if (response) return response;
      } catch (error) {
        console.error(`Error serving ${pathname}:`, error);
      }
      if (pathname.startsWith("/api/")) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      // SPA fallback
      if (getAsset && wantsHtml) {
        const indexAsset = getAsset("/index.html");
        if (indexAsset) {
          return new Response(indexAsset.content, {
            headers: { "Content-Type": indexAsset.mimeType, "Cache-Control": "no-store" },
          });
        }
      }
      if (wantsHtml) {
        try {
          const response = await getFileFromDisk("/index.html");
          if (response) return response;
        } catch (error) {
          console.error("Error serving index.html:", error);
        }
      }
      return new Response("Not Found", { status: 404 });
    }
  },
});

console.log(`Server running on http://localhost:${server.port}${DEV ? " (dev mode, live reload)" : ""}`);
