/**
 * 给已导出的 `.fig` 补 `thumbnail.png`（400×400）。
 *
 * 为什么要补：真实 Figma 文件的 zip 里恒有 `thumbnail.png`，且 `meta.client_meta.
 * thumbnail_size` 与实际像素一致（实测 `circle-text.fig` 400×400、`slots.fig` 335×400）。
 * 我们导出时这两个都是空的 —— 文件浏览器里的预览图会是空白，也可能被导入器判成不完整。
 *
 * 缩略图**不放进导出器**：`exportFig` 是纯函数（Node / 浏览器都能跑），不该依赖
 * 无头浏览器。这里做成后处理，交付脚本按需调用。
 *
 * 用法：
 *   npx vite-node scripts/fig-thumb.ts --project music
 *   npx vite-node scripts/fig-thumb.ts --all
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { unzipSync, zipSync, strToU8 } from 'fflate';

const ROOT = process.cwd();
const OUT = join(ROOT, 'showcase', 'out');
const THUMB = 400;

function argOf(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

/**
 * 用第一页的 HTML 渲染一张 400×400 封面。
 *
 * 分两步：① 以真实视口（375×812）打开页面截图；② 把截图以 data URI 内联进
 * 一个 400×400 的容器里缩放。
 *
 * 为什么不用 iframe 直接嵌 `file://`：`setContent` 造出来的页面是 `about:blank`，
 * 在它里面加载 `file://` 子框架会被安全策略拦掉 —— 截出来是一张纯白图（1352B，
 * 三个工程大小完全一致，就是这个特征）。data URI 不受该限制。
 */
async function shoot(page: import('playwright').Page, htmlPath: string, pngPath: string): Promise<void> {
  const url = `file:///${htmlPath.replace(/\\/g, '/')}`;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const shot = await page.screenshot({ type: 'png' });
  const b64 = Buffer.from(shot).toString('base64');

  await page.setViewportSize({ width: THUMB, height: THUMB });
  await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:#fff}
    .wrap{width:${THUMB}px;height:${THUMB}px;overflow:hidden}
    img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
  </style></head><body><div class="wrap"><img src="data:image/png;base64,${b64}"></div></body></html>`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: pngPath, type: 'png' });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: THUMB, height: THUMB }, deviceScaleFactor: 1 });

const ids = process.argv.includes('--all')
  ? readdirSync(OUT).filter((d) => existsSync(join(OUT, d, 'project.fig')))
  : [argOf('project')!];

for (const id of ids) {
  const figPath = join(OUT, id, 'project.fig');
  if (!existsSync(figPath)) {
    console.warn(`[${id}] 没有 project.fig，跳过`);
    continue;
  }
  const previewDir = join(OUT, 'preview', id);
  const first = readdirSync(previewDir).filter((f) => f.endsWith('.html')).sort()[0];
  if (!first) {
    console.warn(`[${id}] 没有预览 HTML，先跑 showcase-preview`);
    continue;
  }
  const pngPath = join(ROOT, '.tmp', `thumb-${id}.png`);
  await shoot(page, join(previewDir, first), pngPath);
  const thumb = new Uint8Array(readFileSync(pngPath));

  const entries = unzipSync(new Uint8Array(readFileSync(figPath)));
  const meta = JSON.parse(new TextDecoder().decode(entries['meta.json'])) as {
    client_meta?: { thumbnail_size?: { width: number; height: number } };
  };
  meta.client_meta = { ...(meta.client_meta ?? {}), thumbnail_size: { width: THUMB, height: THUMB } };

  /**
   * 重新打包时**必须保持各条目的压缩方式**（2026-11-02 修）。
   *
   * 真实 `.fig` 里 `canvas.fig` / `thumbnail.png` / `images/*` 都是 store（level 0），
   * 只有 `meta.json` 是 deflate。早先这里一把 `level: 6` 会把刚修好的形态重新压扁 ——
   * 补缩略图这一步于是成了「把文件改回打不开的样子」。
   */
  const keepLevel = (name: string): 0 | 6 => (name === 'meta.json' || name.endsWith('.json') ? 6 : 0);
  const next: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  for (const [name, data] of Object.entries(entries)) {
    next[name] = [name === 'thumbnail.png' ? thumb : data, { level: keepLevel(name) }];
  }
  next['thumbnail.png'] = [thumb, { level: 0 }];
  next['meta.json'] = [strToU8(JSON.stringify(meta)), { level: 6 }];
  writeFileSync(figPath, zipSync(next));
  console.log(`[${id}] thumbnail.png ${thumb.length}B → ${(readFileSync(figPath).length / 1024).toFixed(0)} KB`);
}

await browser.close();
