import { serve } from "bun";
import { join } from "path";
import { getAsset } from "./assets";

// Fallback to filesystem in development
const getFileFromDisk = async (pathname: string) => {
  const publicDir = join(import.meta.dir, "..", "public");
  const filePath = join(publicDir, pathname);
  const file = Bun.file(filePath);
  
  if (await file.exists()) {
    const ext = pathname.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'html': 'text/html; charset=utf-8',
      'css': 'text/css',
      'js': 'text/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
    };
    const mimeType = mimeTypes[ext || ''] || 'application/octet-stream';
    
    return new Response(file, {
      headers: { "Content-Type": mimeType, "Cache-Control": "no-store" },
    });
  }
  return null;
};

// Static files with embedded assets and filesystem fallback
const server = serve({
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  fetch: async (req) => {
    const url = new URL(req.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;

    const accept = req.headers.get("Accept") || "";
    const wantsHtml = accept.includes("text/html");

    // Try embedded assets first
    const asset = getAsset(pathname);
    if (asset) {
      return new Response(asset.content, {
        headers: { "Content-Type": asset.mimeType, "Cache-Control": "no-store" },
      });
    }

    // Fallback to filesystem (for development)
    try {
      const response = await getFileFromDisk(pathname);
      if (response) return response;
    } catch (error) {
      console.error(`Error serving ${pathname}:`, error);
    }

    // 404 for non-asset API paths
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // SPA fallback to index.html
    const indexAsset = wantsHtml ? getAsset("/index.html") : undefined;
    if (indexAsset && wantsHtml) {
      return new Response(indexAsset.content, {
        headers: { "Content-Type": indexAsset.mimeType, "Cache-Control": "no-store" },
      });
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
  },
});

console.log(`Server running on http://localhost:${server.port}`);
