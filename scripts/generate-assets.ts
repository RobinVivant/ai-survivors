#!/usr/bin/env bun
import { readdirSync, statSync } from "fs";
import { join, relative, extname } from "path";

const publicDir = join(import.meta.dir, "..", "public");
const outputFile = join(import.meta.dir, "..", "server", "assets.ts");

// MIME type mapping
const getMimeType = (filePath: string): string => {
  const ext = extname(filePath).toLowerCase().slice(1);
  const mimeTypes: Record<string, string> = {
    'html': 'text/html; charset=utf-8',
    'css': 'text/css; charset=utf-8',
    'js': 'text/javascript; charset=utf-8',
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
  return mimeTypes[ext] || 'application/octet-stream';
};

// Recursively get all files
function getAllFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Generate the assets file
const files = getAllFiles(publicDir);
const assets: string[] = [];

for (const file of files) {
  const relativePath = relative(publicDir, file);
  const urlPath = "/" + relativePath.replace(/\\/g, "/");
  const buf = await Bun.file(file).arrayBuffer();
  const bytes = Array.from(new Uint8Array(buf));
  assets.push(`  "${urlPath}": { content: new Uint8Array([${bytes.join(',')}]), mimeType: "${getMimeType(file)}" }`);
}

const content = `// Auto-generated embedded assets
export interface Asset {
  content: Uint8Array;
  mimeType: string;
}

export const assets: Record<string, Asset> = {
${assets.join(',\n')}
};

export function getAsset(path: string): Asset | undefined {
  return assets[path];
}
`;

await Bun.write(outputFile, content);
console.log(`Generated ${outputFile} with ${files.length} assets`);
