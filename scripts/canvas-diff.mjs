/**
 * FR-51② 画布↔出码像素一致性 —— 基线首跑脚本（M3 收口）。
 *
 * 流程：静态服务 dist（pages 数据 + app 编辑器）→ Playwright 打开编辑器（VITE_E2E_HOOK=1 构建）→
 * File→打开 加载 dist/pages/<页>/page.json → 通过 window.__UIC_E2E__：
 *   - snapshot()：page 坐标系下的根级子节点几何（Editor 层 resolveLayout 快照）
 *   - captureRegion(region, 1)：画布 Konva Stage 按 page 坐标 1:1 光栅化（FR-24 既有导出链路）
 * 捕获区域 = 根级子节点几何并集（画布 page 原点坐标系）；
 * 出码侧 = 既有 render.png（e2e 375×812 视口）按视口起点（0,0）裁剪到同区域。
 *
 * 注意：首跑定基线 —— CANVAS_TARGET 仅用于报告分级，不硬拦（PRD：基线由 PM 确认终值）。
 * 依赖：dist/pages 存在（npm run pages）；dist/app 为 VITE_E2E_HOOK=1 构建（npm run canvasdiff
 * 经 precanvasdiff 自动完成；手动构建：$env:VITE_E2E_HOOK='1'; npx vite build）。
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const root = process.cwd();
const pagesDir = join(root, 'dist', 'pages');
const outDir = join(root, 'dist', 'canvas-diff');
const PORT = Number(process.env.CANVASDIFF_PORT || 4193);
const CANVAS_TARGET = Number(process.env.CANVAS_TARGET || 0.95);
const DIFF_THRESHOLD = Number(process.env.DIFF_THRESHOLD || 0.1);
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 静态服务 dist（pages 数据 + app 编辑器）----
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};
const serverScript = `
const http = require('node:http');
const { readFile } = require('node:fs/promises');
const { join, extname } = require('node:path');
const MIME = ${JSON.stringify(MIME)};
const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/app/index.html';
    // vite build 默认 base=/：产物内引用 /assets/*，实际位于 dist/app/assets/*
    if (p.startsWith('/assets/')) p = '/app' + p;
    const file = join(process.cwd(), 'dist', p);
    if (!file.startsWith(join(process.cwd(), 'dist'))) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404).end('not found'); }
});
server.listen(${PORT}, '127.0.0.1');
`;
const server = spawn(process.execPath, ['-e', serverScript], { stdio: 'ignore' });

// ---- 工具：按目标区域裁剪（越界部分补白/截断，同 diff.mjs pad 口径）----
function cropAligned(png, rx, ry, rw, rh) {
  const out = new PNG({ width: rw, height: rh });
  const w = Math.max(0, Math.min(rw, png.width - rx));
  const h = Math.max(0, Math.min(rh, png.height - ry));
  if (w > 0 && h > 0) PNG.bitblt(png, out, rx, ry, w, h, 0, 0);
  return out;
}

// ---- 逐页执行 ----
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('dialog', (d) => d.accept());

const dirs = readdirSync(pagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const rows = [];

try {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.editor', { timeout: 15000 });
  await page.waitForFunction('() => !!window.__UIC_E2E__', undefined, { timeout: 10000 });
  await sleep(300);

  for (const name of dirs) {
    try {
      rows.push(await runOne(name));
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      console.log(`FAIL  ${name}  ${msg}`);
      rows.push({ page: name, error: msg, similarity: null, pass: false });
    }
  }
} finally {
  await browser.close();
  server.kill();
}

async function runOne(name) {
  // File → 打开 page.json（与 walkthrough 同一入口，走 LOAD_PAGE 真实链路）
  const fcPromise = page.waitForEvent('filechooser');
  await page.click('.menu-btn:has-text("File")');
  await page.click('.menu-dropdown .menu-item:has-text("打开")');
  const fc = await fcPromise;
  await fc.setFiles(join(pagesDir, name, 'page.json'));
  await page.waitForTimeout(700);

  const snap = await page.evaluate(() => window.__UIC_E2E__.snapshot());
  if (!snap || !snap.nodes.length) throw new Error('snapshot 无根级子节点几何');

  // 捕获区域 = 根级子节点并集（page 坐标）
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of snap.nodes) {
    x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y);
    x1 = Math.max(x1, n.x + n.width); y1 = Math.max(y1, n.y + n.height);
  }
  const region = { x: Math.round(x0), y: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) };
  if (region.width <= 0 || region.height <= 0) throw new Error('无效捕获区域');

  // 画布 1:1 光栅化（FR-24 captureRegion：pixelScale=1 → 输出 region.width×region.height）
  const dataUrl = await page.evaluate(([r]) => window.__UIC_E2E__.captureRegion(r, 1), [region]);
  const canvasPng = PNG.sync.read(Buffer.from(String(dataUrl).split(',')[1], 'base64'));

  // 出码侧：render.png 视口起点对齐（region 通常为 [0,0,w,h]）
  const renderPng = PNG.sync.read(readFileSync(join(pagesDir, name, 'render.png')));
  const renderCrop = cropAligned(renderPng, region.x, region.y, region.width, region.height);

  // 尺寸护栏（capture 输出可能因 Konva 内部取整偏移 1px）→ 统一到 renderCrop 尺寸
  const w = renderCrop.width, h = renderCrop.height;
  const canvasAligned = canvasPng.width === w && canvasPng.height === h ? canvasPng : cropAligned(canvasPng, 0, 0, w, h);

  const diff = new PNG({ width: w, height: h });
  const diffPixels = pixelmatch(canvasAligned.data, renderCrop.data, diff.data, w, h, { threshold: DIFF_THRESHOLD });
  const similarity = 1 - diffPixels / (w * h);
  const pass = similarity >= CANVAS_TARGET;

  writeFileSync(join(outDir, `${name}-canvas.png`), PNG.sync.write(canvasAligned));
  writeFileSync(join(outDir, `${name}-diff.png`), PNG.sync.write(diff));

  console.log(`${pass ? 'PASS' : 'MISS'}  ${name}  similarity=${(similarity * 100).toFixed(2)}%  region=${region.width}x${region.height}`);
  return { page: name, region, canvasSize: [canvasPng.width, canvasPng.height], similarity: Number(similarity.toFixed(4)), diffPixels, pass, target: CANVAS_TARGET };
}

// ---- 汇总 ----
const scored = rows.filter((r) => r.similarity !== null);
const passCount = rows.filter((r) => r.pass).length;
const min = scored.length ? Math.min(...scored.map((r) => r.similarity)) : null;
const avg = scored.length ? scored.reduce((s, r) => s + r.similarity, 0) / scored.length : null;
const summary = {
  date: new Date().toISOString(),
  indicator: 'FR-51② 画布截图 vs 出码页截图',
  target: CANVAS_TARGET,
  note: '首跑定基线：target 仅报告分级，不作硬门禁（PRD：基线由 PM 确认终值）',
  pages: rows.length,
  pass: passCount,
  minSimilarity: min,
  avgSimilarity: avg === null ? null : Number(avg.toFixed(4)),
  rows,
};
writeFileSync(join(outDir, 'report.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(`\ncanvas-diff done: ${rows.length} pages, pass=${passCount}, min=${min === null ? '-' : (min * 100).toFixed(2) + '%'}, avg=${avg === null ? '-' : (avg * 100).toFixed(2) + '%'}\nreport: dist/canvas-diff/report.json`);
