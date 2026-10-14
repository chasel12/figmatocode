// 实验：14 页画布 vs 出码的垂直偏移探测（dy ∈ [-8,8] 逐行平移取最优相似度）
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const name = process.argv[2] || '14-长文本页面';
const dir = join(process.cwd(), 'dist', 'canvas-diff');
const pagesDir = join(process.cwd(), 'dist', 'pages');

const canvas = PNG.sync.read(readFileSync(join(dir, `${name}-canvas.png`)));
const renderFull = PNG.sync.read(readFileSync(join(pagesDir, name, 'render.png')));
const w = canvas.width, h = canvas.height;
const render = new PNG({ width: w, height: h });
PNG.bitblt(renderFull, render, 0, 0, Math.min(w, renderFull.width), Math.min(h, renderFull.height), 0, 0);

const rows = [];
for (let dy = -8; dy <= 8; dy++) {
  const shifted = new PNG({ width: w, height: h });
  PNG.bitblt(canvas, shifted, 0, 0, w, Math.max(0, h - Math.abs(dy)), 0, dy > 0 ? dy : 0);
  // dy>0: canvas 下移；dy<0: 上移（拷贝区域近似，边缘忽略）
  const diff = new PNG({ width: w, height: h });
  const n = pixelmatch(shifted.data, render.data, diff.data, w, h, { threshold: 0.1 });
  rows.push({ dy, sim: +(1 - n / (w * h)).toFixed(4) });
}
rows.sort((a, b) => b.sim - a.sim);
console.log(rows.slice(0, 5));
