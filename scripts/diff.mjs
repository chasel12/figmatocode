import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const root = process.cwd();
const pagesDir = join(root, 'dist', 'pages');
const TARGET = Number(process.env.DIFF_TARGET || 0.98);
const PER_PIXEL_THRESHOLD = Number(process.env.DIFF_THRESHOLD || 0.1);

const dirs = readdirSync(pagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

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

const rows = [];
let passCount = 0;

// ---- FR-23 差异区域明细 ----
// 与 src/editor/diffRegions.ts 同规则（规范实现与单测见该文件 / tests/diffRegions.test.ts）；
// 此处为 .mjs 镜像，依赖 geometry.json（build-pages.ts 产出，与 reference.html 同源几何）。
const MASK_TOLERANCE = 3;
const MIN_REGION_PIXELS = 4;
const MAX_REGIONS = 20;
const OFFSET_THRESHOLD = 2;

function buildDiffMask(rgba, total) {
  const mask = new Uint8Array(total);
  for (let i = 0, p = 0; p < total; p++, i += 4) {
    if (rgba[i] === 255 && rgba[i + 1] === 0 && rgba[i + 2] === 0 && rgba[i + 3] === 255) mask[p] = 1;
  }
  return mask;
}

function findRegions(mask, width, height) {
  const visited = new Uint8Array(mask.length);
  const out = [];
  const stack = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    let minX = width, minY = height, maxX = -1, maxY = -1, count = 0;
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      count++;
      const x = p % width;
      const y = (p / width) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && mask[p - 1] && !visited[p - 1]) { visited[p - 1] = 1; stack.push(p - 1); }
      if (x < width - 1 && mask[p + 1] && !visited[p + 1]) { visited[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && mask[p - width] && !visited[p - width]) { visited[p - width] = 1; stack.push(p - width); }
      if (y < height - 1 && mask[p + width] && !visited[p + width]) { visited[p + width] = 1; stack.push(p + width); }
    }
    if (count >= MIN_REGION_PIXELS) out.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, pixels: count });
  }
  out.sort((a, b) => b.pixels - a.pixels);
  return out.slice(0, MAX_REGIONS);
}

const expand = (r) => ({ x: r.x - MASK_TOLERANCE, y: r.y - MASK_TOLERANCE, width: r.width + MASK_TOLERANCE * 2, height: r.height + MASK_TOLERANCE * 2 });

function intersectArea(a, b) {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function unionRect(rects) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) {
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.x + r.width > maxX) maxX = r.x + r.width;
    if (r.y + r.height > maxY) maxY = r.y + r.height;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function nodeCategory(entry, union, areaRatio) {
  const dx = union.x - entry.x;
  const dy = union.y - entry.y;
  const dw = union.width - entry.width;
  const dh = union.height - entry.height;
  if (Math.abs(dx) >= OFFSET_THRESHOLD || Math.abs(dy) >= OFFSET_THRESHOLD) return 'Position';
  if ((entry.type === 'TEXT' || entry.type === 'BUTTON') && areaRatio >= 0.5) return 'Typography';
  if (dw >= OFFSET_THRESHOLD || dh >= OFFSET_THRESHOLD) return 'Size';
  if (areaRatio >= 0.6) return 'Color';
  return 'Layout';
}

function analyzeDiff(mask, width, height, geometry) {
  if (!geometry || !Array.isArray(geometry.nodes)) return null;
  const raw = findRegions(mask, width, height);
  const byDepthDesc = (a, b) => b.depth - a.depth;
  const leaves = geometry.nodes.filter((n) => !n.frame).sort(byDepthDesc);
  const frames = geometry.nodes.filter((n) => n.frame).sort(byDepthDesc);

  const regions = [];
  const byNode = new Map();

  for (const r of raw) {
    let best = null;
    let bestArea = 0;
    for (const leaf of leaves) {
      const a = intersectArea(r, expand(leaf));
      if (a >= bestArea && a > 0) { bestArea = a; best = leaf; }
    }
    if (best) {
      const bucket = byNode.get(best.id) ?? { entry: best, rects: [], pixels: 0 };
      bucket.rects.push(r);
      bucket.pixels += r.pixels;
      byNode.set(best.id, bucket);
      regions.push({ ...r, node: best.name, category: 'Layout' });
      continue;
    }
    let matched = false;
    for (const frame of frames) {
      if (intersectArea(r, expand(frame)) <= 0) continue;
      if (frame.type === 'FRAME') {
        regions.push({ ...r, node: null, category: 'Spacing' });
        matched = true;
      } else {
        const bucket = byNode.get(frame.id) ?? { entry: frame, rects: [], pixels: 0 };
        bucket.rects.push(r);
        bucket.pixels += r.pixels;
        byNode.set(frame.id, bucket);
        regions.push({ ...r, node: frame.name, category: 'Layout' });
        matched = true;
      }
      if (matched) break;
    }
    if (!matched) regions.push({ ...r, node: null, category: 'Layout' });
  }

  const nodeErrors = [];
  for (const bucket of byNode.values()) {
    const union = unionRect(bucket.rects);
    const nodeArea = bucket.entry.width * bucket.entry.height;
    const areaRatio = nodeArea > 0 ? Math.min(intersectArea(union, bucket.entry) / nodeArea, 1) : 0;
    nodeErrors.push({
      node: bucket.entry.name,
      type: bucket.entry.type,
      dx: union.x - bucket.entry.x,
      dy: union.y - bucket.entry.y,
      dw: union.width - bucket.entry.width,
      dh: union.height - bucket.entry.height,
      pixels: bucket.pixels,
      category: nodeCategory(bucket.entry, union, areaRatio),
    });
  }
  nodeErrors.sort((a, b) => b.pixels - a.pixels);
  return { regions, nodeErrors };
}

const fmtDelta = (v) => `${v > 0 ? '+' : ''}${Math.round(v * 10) / 10}px`;

for (const name of dirs) {
  const dir = join(pagesDir, name);
  const ref = PNG.sync.read(readFileSync(join(dir, 'reference.png')));
  const render = PNG.sync.read(readFileSync(join(dir, 'render.png')));
  const w = Math.max(ref.width, render.width);
  const h = Math.max(ref.height, render.height);
  const a = pad(ref, w, h);
  const b = pad(render, w, h);
  const out = new PNG({ width: w, height: h });
  const diffPixels = pixelmatch(a, b, out.data, w, h, { threshold: PER_PIXEL_THRESHOLD });
  const total = w * h;
  const similarity = 1 - diffPixels / total;
  const pass = similarity >= TARGET;
  if (pass) passCount += 1;
  writeFileSync(join(dir, 'diff.png'), PNG.sync.write(out));
  let geometry = null;
  try {
    geometry = JSON.parse(readFileSync(join(dir, 'geometry.json'), 'utf8'));
  } catch {
    geometry = null;
  }
  const mask = buildDiffMask(out.data, w * h);
  const analysis = analyzeDiff(mask, w, h, geometry);
  rows.push({
    id: name,
    width: w,
    height: h,
    diffPixels,
    similarity: Number(similarity.toFixed(4)),
    pass,
    regions: analysis ? analysis.regions : null,
    nodeErrors: analysis ? analysis.nodeErrors : null,
  });
}

const report = {
  target: TARGET,
  perPixelThreshold: PER_PIXEL_THRESHOLD,
  total: rows.length,
  pass: passCount,
  fail: rows.length - passCount,
  pages: rows,
};
writeFileSync(join(pagesDir, 'diff-report.json'), JSON.stringify(report, null, 2), 'utf8');

for (const r of rows) {
  const pct = (r.similarity * 100).toFixed(2);
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${pct}%  diff=${r.diffPixels}px  ${r.id}`);
  for (const n of (r.nodeErrors ?? []).slice(0, 3)) {
    console.log(`       -> ${n.node} [${n.category}] pos(${fmtDelta(n.dx)}, ${fmtDelta(n.dy)}) size(${fmtDelta(n.dw)}, ${fmtDelta(n.dh)}) ${n.pixels}px`);
  }
}
console.log(`\n${passCount}/${rows.length} pages >= ${TARGET * 100}% similarity`);
if (passCount < rows.length) process.exitCode = 1;
