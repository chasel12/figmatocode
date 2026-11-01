/**
 * 45 个场景产物的**截图**（反 bug 审计的「人眼那一半」）
 *
 * 检测器只查得动「结构性坏形态」（脱流没尺寸、文字被压、热区太窄）。
 * 真实产物里最刺眼的 bug 往往是**语义组合错**——比如「主图标和消息红点写成同一行」，
 * 结构上完全合法，扫描器抓不到，只有看渲染结果才看得出来。
 *
 * 所以这份脚本做两件事：
 *   1. 逐页截图（`--scale=2`，375×812 视口 + fullPage 各一张）；
 *   2. 拼联系表（3×3 一版，带场景 id），一次能看 9 页，45 页 = 5 张。
 *
 * 用法：
 *   npx vite-node scripts/ui-shots.ts                 # 全部场景
 *   npx vite-node scripts/ui-shots.ts --only=nav-tabbar
 *   npx vite-node scripts/ui-shots.ts --sheet=9       # 每张联系表几页（默认 9）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { compilePage } from '../src/compiler';
import { generateHtml } from '../src/generator/html';
import type { UIPage } from '../src/schema/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, '.tmp/ui-gen');
const OUT = path.join(root, '.tmp/ui-shots');

const argv = process.argv.slice(2);
const argOf = (flag: string, dflt: string): string => {
  const eq = argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  return i >= 0 ? (argv[i + 1] ?? dflt) : dflt;
};
const only = argOf('--only', '');
const PER_SHEET = Math.max(1, Number(argOf('--sheet', '9')) || 9);
const VIEWPORT = { width: 375, height: 812 };

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/** `/fonts/*` 从 public 取，其余从产物目录取（`file://` 下 `/fonts` 会 404，只能起服务） */
function serve(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
    const base = p.startsWith('/fonts/') ? path.join(root, 'public') : OUT;
    const file = path.join(base, p.startsWith('/fonts/') ? p : p.replace(/^\//, ''));
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}

async function main(): Promise<void> {
  if (!fs.existsSync(SRC)) {
    console.error(`未找到 ${SRC}，先跑 npm run ui:gen`);
    process.exit(2);
  }
  fs.mkdirSync(OUT, { recursive: true });

  let files = fs.readdirSync(SRC).filter((f) => f.endsWith('.page.json'));
  if (only) files = files.filter((f) => f.startsWith(only));
  files.sort();
  if (files.length === 0) {
    console.error('没有可截图的产物');
    process.exit(2);
  }

  /* 1. 页面 → 单文件 HTML */
  const ids: string[] = [];
  for (const f of files) {
    const id = f.replace(/\.page\.json$/, '');
    const page = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8')) as UIPage;
    page.name = id;
    const html = generateHtml(page, compilePage(page), { title: id, fontsBase: '/fonts' });
    fs.writeFileSync(path.join(OUT, `${id}.html`), html, 'utf8');
    ids.push(id);
  }
  console.log(`已生成 ${ids.length} 份 HTML`);

  const srv = await serve();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  /* 2. 逐页截图：视口一张（看首屏）+ fullPage 一张（看滚动后有没有被压住） */
  const shots: { id: string; view: string; full: string; height: number }[] = [];
  for (const id of ids) {
    await page.goto(`${srv.url}/${id}.html`, { waitUntil: 'networkidle' });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const view = path.join(OUT, `${id}.view.png`);
    const full = path.join(OUT, `${id}.full.png`);
    await page.screenshot({ path: view });
    await page.screenshot({ path: full, fullPage: true });
    shots.push({ id, view, full, height });
    process.stdout.write(`  ${id.padEnd(20)} ${height}px\n`);
  }

  /* 3. 联系表：用浏览器自己排版 + 打标签，比手工拼 PNG 省事且能写字 */
  const sheets: string[] = [];
  for (let i = 0; i < shots.length; i += PER_SHEET) {
    const chunk = shots.slice(i, i + PER_SHEET);
    const cells = chunk
      .map(
        (s) => `<figure>
  <figcaption>${s.id} <span>${s.height}px</span></figcaption>
  <img src="${path.basename(s.full)}" />
</figure>`,
      )
      .join('\n');
    const sheetHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 16px; background: #f2f2f4; font: 12px/1.4 -apple-system, "Segoe UI", sans-serif; }
  .grid { display: grid; grid-template-columns: repeat(3, 300px); gap: 14px; }
  figure { margin: 0; background: #fff; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.18); }
  figcaption { padding: 5px 8px; font-weight: 600; color: #111; display: flex; justify-content: space-between; }
  figcaption span { font-weight: 400; color: #666; }
  /* 每个格子固定 620px 高，超出的部分截断 —— 联系表只用来「找可疑」，细节回看单页大图 */
  img { display: block; width: 300px; height: 620px; object-fit: cover; object-position: top; }
</style></head><body><div class="grid">${cells}</div></body></html>`;
    const sheetPath = path.join(OUT, `sheet-${Math.floor(i / PER_SHEET) + 1}.html`);
    fs.writeFileSync(sheetPath, sheetHtml, 'utf8');
    const out = path.join(OUT, `sheet-${Math.floor(i / PER_SHEET) + 1}.png`);
    await page.setViewportSize({ width: 960, height: 800 });
    await page.goto(`${srv.url}/${path.basename(sheetPath)}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: out, fullPage: true });
    sheets.push(out);
    await page.setViewportSize(VIEWPORT);
  }

  await browser.close();
  await srv.close();

  const index = {
    generatedAt: new Date().toISOString(),
    count: shots.length,
    shots,
    sheets,
  };
  fs.writeFileSync(path.join(OUT, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  console.log(`\n截图 ${shots.length} 页 → ${path.relative(root, OUT)}`);
  for (const s of sheets) console.log(`  联系表 ${path.basename(s)}`);
}

await main();
