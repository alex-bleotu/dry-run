// Serves web-dist/ locally so the website can be tried before deploying. Run `npm run build:web` first.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', 'web-dist');
const PORT = Number(process.env.PORT) || 8080;
const CONTENT_TYPE = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
};

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error('web-dist/ is missing. Run `npm run build:web` first.');
  process.exit(1);
}

http
  .createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.join(ROOT, pathname.endsWith('/') ? `${pathname}index.html` : pathname);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404);
      response.end('Not found');

      return;
    }
    response.writeHead(200, { 'content-type': CONTENT_TYPE[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  })
  .listen(PORT, () => {
    console.log(`Dry Run is running at http://localhost:${PORT}`);
  });
