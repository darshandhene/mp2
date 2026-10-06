// Serves dist/ the way GitHub Pages does for browser tests: real files under /mp2/,
// and dist/404.html with a 404 status for every other path.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = join(import.meta.dirname, "..", "dist");
const base = "/mp2/";
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};

function send(response, status, file) {
  response.writeHead(status, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
}

createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  if (path.startsWith(base)) {
    const relative = path.slice(base.length) || "index.html";
    const file = normalize(join(root, relative));
    if (file.startsWith(root) && existsSync(file) && statSync(file).isFile()) return send(response, 200, file);
    if (file.startsWith(root) && existsSync(join(file, "index.html"))) return send(response, 200, join(file, "index.html"));
  }
  send(response, 404, join(root, "404.html"));
}).listen(port, "127.0.0.1", () => console.log(`Pages-style server on http://127.0.0.1:${port}${base}`));
