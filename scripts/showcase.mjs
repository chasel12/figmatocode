import { chromium } from 'playwright';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * FR-57 样片管线（Wave1 轨道I / M6 基建）：
 * 对 dist/pages 16 页逐页产出「样片」对照卡：
 *   1) Playwright 300×650 视口截 render 侧全页（index.html）；
 *   2) reference.png / render.png 横向拼接成对照卡（pngjs，node canvas 不可用环境）；
 *   3) 逐页重跑 pixelmatch 得 similarity（阈值 0.99 仅报告分级，不作为通过线）。
 * 输出：dist/showcase/<页>/card.png 与 dist/showcase/report.json。
 * 启动模式抄 scripts/screenshot.mjs（本地 HTTP + fonts.ready），pad 对齐抄 scripts/diff.mjs。
 */

const root = process.cwd();
const pagesDir = join(root, 'dist', 'pages');
const outDir = join(root, 'dist', 'showcase');
const VIEW_W = Number(process.env.SHOWCASE_WIDTH || 300);
const VIEW_H = Number(process.env.SHOT_HEIGHT || 650);
const SIM_THRESHOLD = Number(process.env.SHOWCASE_THRESHOLD || 0.99);
const PER_PIXEL_THRESHOLD = Number(process.env.DIFF_THRESHOLD || 0.1);
const GAP = 8; // 对照卡两图间距（白）

// ---- 静态服务器（与 screenshot.mjs 同款；file:// 下 /fonts/ 会 404，Inter 无法加载） ----
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

// ---- 尺寸对齐（抄 diff.mjs pad：白底补齐到同宽同高） ----
function pad(png, w, h) {
  if (png.width === w && png.height === h) return png.data;
  const out = Buffer.alloc(w * h * 4, 255);
  for (let y = 0; y < Math.min(png.height, h); y += 1) {
    for (let x = 0; x < Math.min(png.width, w); x += 1) {
      const si = (y * png.width + x) * 4;
      const di = (y * w + x) * 4;
      png.data.copy(out, di, si, si + 4);
    }
  }
  return out;
}

const dirs = readdirSync(pagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: VIEW_W, height: VIEW_H },
  deviceScaleFactor: 1,
});

async function shot(path, out) {
  const page = await context.newPage();
  await page.goto(`${base}${path}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(80);
  await page.screenshot({ path: out, fullPage: true });
  await page.close();
}

const rows = [];
for (const name of dirs) {
  const dir = join(pagesDir, name);
  const cardDir = join(outDir, name);
  mkdirSync(cardDir, { recursive: true });

  // 1) 300×650 视口截 render 侧全页
  const renderShotPath = join(cardDir, 'render-300.png');
  await shot(`/pages/${name}/index.html`, renderShotPath);
  const render300 = PNG.sync.read(readFileSync(renderShotPath));

  // 2) reference / render 并排对照卡（pngjs 横向拼接，底部留白不写文字）
  const ref = PNG.sync.read(readFileSync(join(dir, 'reference.png')));
  const ren = PNG.sync.read(readFileSync(join(dir, 'render.png')));

  // 3) 逐页 similarity：重跑 pixelmatch（与 diff.mjs 同法：pad 对齐后逐像素比对）
  const w = Math.max(ref.width, ren.width);
  const h = Math.max(ref.height, ren.height);
  const a = pad(ref, w, h);
  const b = pad(ren, w, h);
  const diffPng = new PNG({ width: w, height: h });
  const diffPixels = pixelmatch(a, b, diffPng.data, w, h, { threshold: PER_PIXEL_THRESHOLD });
  const total = w * h;
  const similarity = Number((1 - diffPixels / total).toFixed(4));
  const grade = similarity >= SIM_THRESHOLD ? 'A' : similarity >= 0.95 ? 'B' : 'C';

  // 拼接：两图按各自高度取最大，间距 GAP，白底；步进逐行拷贝（宽高不一亦成立）
  const cardH = Math.max(ref.height, ren.height);
  const cardW = ref.width + GAP + ren.width;
  const card = new PNG({ width: cardW, height: cardH });
  card.data.fill(255);
  const blit = (src, dx) => {
    for (let y = 0; y < src.height; y += 1) {
      const si = (y * src.width) * 4;
      const di = (y * cardW + dx) * 4;
      src.data.copy(card.data, di, si, si + src.width * 4);
    }
  };
  blit(ref, 0);
  blit(ren, ref.width + GAP);
  writeFileSync(join(cardDir, 'card.png'), PNG.sync.write(card));

  rows.push({
    id: name,
    similarity,
    diffPixels,
    grade,
    pass: similarity >= SIM_THRESHOLD,
    viewport: { width: VIEW_W, height: VIEW_H },
    render300Height: render300.height,
    cardWidth: cardW,
    cardHeight: cardH,
  });
  console.log(`${grade}  ${name}  similarity=${(similarity * 100).toFixed(2)}%  card=${cardW}x${cardH}`);
}

await browser.close();
server.close();

const report = {
  target: SIM_THRESHOLD,
  note: '阈值 0.99 仅报告分级（A≥0.99 / B≥0.95 / C<0.95），非通过线（FR-57 样片只作展示基线）',
  perPixelThreshold: PER_PIXEL_THRESHOLD,
  viewport: { width: VIEW_W, height: VIEW_H },
  total: rows.length,
  pass: rows.filter((r) => r.pass).length,
  grades: {
    A: rows.filter((r) => r.grade === 'A').length,
    B: rows.filter((r) => r.grade === 'B').length,
    C: rows.filter((r) => r.grade === 'C').length,
  },
  avgSimilarity: rows.length ? Number((rows.reduce((s, r) => s + r.similarity, 0) / rows.length).toFixed(4)) : 0,
  pages: rows,
};
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(`\nshowcase done: ${rows.length} cards, avg=${(report.avgSimilarity * 100).toFixed(2)}%, A/B/C=${report.grades.A}/${report.grades.B}/${report.grades.C} → dist/showcase/`);
