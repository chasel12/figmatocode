import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'node:http';

const root = process.cwd();
const pagesDir = join(root, 'dist', 'pages');
const WIDTH = Number(process.env.SHOT_WIDTH || 375);
const HEIGHT = Number(process.env.SHOT_HEIGHT || 812);

const dirs = readdirSync(pagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

// FR-48：改走本地 HTTP（file:// 下 /fonts/ 会 404，Inter 无法加载）
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(root, 'dist', p);
    if (!file.startsWith(join(root, 'dist'))) {
      res.writeHead(403).end();
      return;
    }
    const data = await readFile(file);
    const ext = file.slice(file.lastIndexOf('.'));
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});

async function shot(path, out) {
  const page = await context.newPage();
  await page.goto(`${base}${path}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(80);
  await page.screenshot({ path: out, fullPage: true });
  const size = page.viewportSize();
  await page.close();
  return size;
}

let count = 0;
for (const name of dirs) {
  await shot(`/pages/${name}/reference.html`, join(pagesDir, name, 'reference.png'));
  await shot(`/pages/${name}/index.html`, join(pagesDir, name, 'render.png'));
  count += 1;
}

await browser.close();
server.close();
console.log(`shot done: ${count} pages x 2 (reference.png / render.png), width=${WIDTH}, font=Inter(local http)`);
