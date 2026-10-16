import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * FR-60 / FR-12 性能基建（Wave1 轨道I / M6 基建）：
 *   1) 构造 1000 节点页：25×40 网格 RECTANGLE 直接挂 root（写 dist/pages-perf/1000-节点/page.json）；
 *   2) Playwright 打开编辑器加载该页（vite preview，启动模式抄 walkthrough.mjs）；
 *   3) page.evaluate 内 rAF 采样 120 帧 → 平均帧耗时 / P95 / avgFps；
 *   4) 模拟拖拽 30 次（mouse move，steps=8），按拖拽窗口内帧耗时计流畅度。
 * 阈值（≥60fps / 95% 帧 <16.7ms）仅报告分级，未达如实记录、不阻塞（exit 0）。
 * 输出：dist/perf-1000/report.json + loaded.png（加载现场截图）。
 */

// 本机 Playwright 浏览器目录兜底（已知事实：E:\ms-playwright；有环境变量时以环境变量为准）
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = 'E:\\ms-playwright';

const root = process.cwd();
const outDir = join(root, 'dist', 'perf-1000');
const PERF_DIR = join(root, 'dist', 'pages-perf', '1000-节点');
const PREVIEW_PORT = 4173;
const FRAMES = 120;
const DRAGS = 30;
const DRAG_STEPS = 8;
// 流畅判定口径：拖拽窗口内平均帧耗时 < 32ms（≈30fps）记 1 次流畅（如实报告，非通过线）
const DRAG_SMOOTH_MS = 32;
// FR-60 硬判据：95% 帧 < 16.7ms（60fps 帧预算）
const FRAME_BUDGET_MS = 16.7;
// FR-60 通过线：95% 帧落在帧预算内
const FRAME_UNDER_TARGET = 0.95;

mkdirSync(outDir, { recursive: true });
mkdirSync(PERF_DIR, { recursive: true });

// ---- 1) 构造 1000 节点页：25 列 × 40 行，块 20×20，间隔 2px，直接挂 root ----
const COLS = 25;
const ROWS = 40;
const SIZE = 20;
const GAP = 2;
const GRID_W = COLS * SIZE + (COLS - 1) * GAP; // 548
const GRID_H = ROWS * SIZE + (ROWS - 1) * GAP; // 878

const children = [];
const fills = ['#4f46e5', '#0ea5e9', '#f59e0b', '#10b981'];
let i = 0;
for (let row = 0; row < ROWS; row += 1) {
  for (let col = 0; col < COLS; col += 1) {
    i += 1;
    children.push({
      id: `rect-${i}`,
      name: `Cell ${row + 1}-${col + 1}`,
      type: 'RECTANGLE',
      layout: {
        mode: 'ABSOLUTE',
        widthMode: 'FIXED',
        heightMode: 'FIXED',
        width: SIZE,
        height: SIZE,
        x: col * (SIZE + GAP),
        y: row * (SIZE + GAP),
        padding: [0, 0, 0, 0],
        gap: 0,
      },
      style: { fills: [fills[i % fills.length]] },
      children: [],
    });
  }
}

const page = {
  id: 'page-perf',
  name: '1000 节点',
  viewport: { width: GRID_W, height: GRID_H },
  root: {
    id: 'page-perf',
    name: '1000 节点',
    type: 'PAGE',
    layout: {
      mode: 'ABSOLUTE',
      widthMode: 'FIXED',
      heightMode: 'FIXED',
      width: GRID_W,
      height: GRID_H,
      padding: [0, 0, 0, 0],
      gap: 0,
    },
    style: { background: '#f8fafc' },
    children,
  },
};
writeFileSync(join(PERF_DIR, 'page.json'), JSON.stringify({ version: 1, page }, null, 2), 'utf8');
console.log(`page.json written: ${children.length} nodes (${COLS}×${ROWS} grid ${GRID_W}×${GRID_H}) → dist/pages-perf/1000-节点/`);

// ---- 2) vite preview 启动（抄 walkthrough.mjs） ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('npm', ['run', 'preview', '--', '--port', String(PREVIEW_PORT), '--strictPort'], {
  shell: true,
  stdio: 'ignore',
});

let ready = false;
for (let t = 0; t < 60 && !ready; t += 1) {
  try {
    const r = await fetch(`http://localhost:${PREVIEW_PORT}/`);
    if (r.ok) ready = true;
  } catch {
    /* 未就绪 */
  }
  if (!ready) await sleep(250);
}
if (!ready) {
  server.kill();
  throw new Error('vite preview 未就绪');
}

let avgFps = 0;
let p95FrameMs = 0;
let framesUnder = 0;
let underRatio = 0;
let dragSmooth = 0;
let dragAvgFps = 0;
let dragP95 = 0;
let perDrag = [];
let loadOk = false;
let loadNote = '';
const dragRows = [];
// FR-60 拖拽窗口逐帧统计
let dragFrameDeltas = [];
let dragFramesCount = 0;
let dragFramesUnder = 0;
let dragUnderRatio = 0;
let dragFramesP95 = 0;
let dragFramesAvg = 0;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 1 });
const pg = await context.newPage();
pg.on('dialog', (d) => d.accept());

try {
  await pg.goto(`http://localhost:${PREVIEW_PORT}/`);
  await pg.waitForSelector('.editor', { timeout: 10000 });
  await sleep(400);

  // File → 打开 载入 1000 节点页（与 walkthrough 同路径）
  const fcPromise = pg.waitForEvent('filechooser');
  await pg.click('.menu-btn:has-text("File")');
  await pg.click('.menu-dropdown .menu-item:has-text("打开")');
  const fc = await fcPromise;
  await fc.setFiles(join(PERF_DIR, 'page.json'));
  await sleep(1200); // 大页加载留足渲染时间
  loadOk = true;
  await pg.screenshot({ path: join(outDir, 'loaded.png') });

  // ---- 3) 连续 rAF 采样器（拖拽窗口按时间戳回放；空闲 120 帧单独取一段） ----
  await pg.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const loop = (now) => {
      window.__frames.push({ t: now, d: now - last });
      if (window.__frames.length > 4000) window.__frames.splice(0, 2000);
      last = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  await sleep(200); // 采样器预热（丢弃启动抖动）

  const idle = await pg.evaluate((frames) => {
    const start = performance.now();
    return new Promise((resolve) => {
      const deltas = [];
      let prev = performance.now();
      let n = 0;
      const tick = (now) => {
        deltas.push(now - prev);
        prev = now;
        n += 1;
        if (n < frames) requestAnimationFrame(tick);
        else resolve({ deltas, span: performance.now() - start });
      };
      requestAnimationFrame(tick);
    });
  }, FRAMES);

  const sorted = [...idle.deltas].sort((a, b) => a - b);
  const avgDelta = idle.deltas.reduce((s, d) => s + d, 0) / idle.deltas.length;
  avgFps = Number((1000 / avgDelta).toFixed(1));
  p95FrameMs = Number(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))].toFixed(2));
  framesUnder = idle.deltas.filter((d) => d < 16.7).length;
  underRatio = Number((framesUnder / idle.deltas.length).toFixed(4));

  // ---- 4) 拖拽 30 次（Konva 舞台中心起拖，横向往复，steps=8） ----
  const stage = await pg.locator('.konvajs-content').boundingBox();
  if (!stage) throw new Error('找不到 .konvajs-content');
  const cx = stage.x + Math.min(stage.width * 0.35, 300);
  const cy = stage.y + Math.min(stage.height * 0.4, 300);

  for (let d = 0; d < DRAGS; d += 1) {
    const dir = d % 2 === 0 ? 1 : -1;
    const t0 = await pg.evaluate(() => performance.now());
    await pg.mouse.move(cx, cy);
    await pg.mouse.down();
    await pg.mouse.move(cx + dir * 90, cy + 40, { steps: DRAG_STEPS });
    await pg.mouse.move(cx + dir * 30, cy - 20, { steps: DRAG_STEPS });
    await pg.mouse.up();
    const t1 = await pg.evaluate(() => performance.now());
    dragRows.push({ i: d + 1, t0, t1 });
    await sleep(120);
  }

  const all = await pg.evaluate(() => window.__frames);
  perDrag = [];
  for (const d of dragRows) {
    const inWindow = all.filter((f) => f.t > d.t0 && f.t <= d.t1);
    const avg = inWindow.length ? inWindow.reduce((s, f) => s + f.d, 0) / inWindow.length : 999;
    perDrag.push({ i: d.i, frames: inWindow.length, avgFrameMs: Number(avg.toFixed(2)) });
  }
  dragSmooth = perDrag.filter((p) => p.avgFrameMs < DRAG_SMOOTH_MS).length;
  const dragDeltas = perDrag.filter((p) => p.frames > 0).map((p) => p.avgFrameMs).sort((a, b) => a - b);
  if (dragDeltas.length) {
    dragAvgFps = Number((1000 / (dragDeltas.reduce((s, d) => s + d, 0) / dragDeltas.length)).toFixed(1));
    dragP95 = Number(dragDeltas[Math.min(dragDeltas.length - 1, Math.floor(dragDeltas.length * 0.95))].toFixed(2));
  }

  // FR-60 判定口径：「拖拽/缩放采样 60fps（**95% 帧 <16.7ms**）」
  // 拖拽窗口内逐帧采样（rAF 时间戳按窗口回放），统计 <16.7ms 的帧占比——
  // 与 idle 同口径，但取样自**真实拖拽期间**，是 FR-60 的直接判据。
  dragFrameDeltas = all.filter((f) => dragRows.some((d) => f.t > d.t0 && f.t <= d.t1)).map((f) => f.d);
  if (dragFrameDeltas.length) {
    const ds = [...dragFrameDeltas].sort((a, b) => a - b);
    dragFramesCount = dragFrameDeltas.length;
    dragFramesUnder = dragFrameDeltas.filter((d) => d < FRAME_BUDGET_MS).length;
    dragUnderRatio = Number((dragFramesUnder / dragFrameDeltas.length).toFixed(4));
    dragFramesP95 = Number(ds[Math.min(ds.length - 1, Math.floor(ds.length * 0.95))].toFixed(2));
    dragFramesAvg = Number((dragFrameDeltas.reduce((s, d) => s + d, 0) / dragFrameDeltas.length).toFixed(2));
  }

  await pg.screenshot({ path: join(outDir, 'after-drags.png') });
} catch (e) {
  loadNote = e instanceof Error ? e.message : String(e);
  await pg.screenshot({ path: join(outDir, '99-异常现场.png') }).catch(() => {});
} finally {
  await browser.close();
  server.kill();
}

// ---- 5) 报告（阈值仅分级，不阻塞） ----
const fpsOk = avgFps >= 60;
const p95Ok = p95FrameMs < FRAME_BUDGET_MS;
// FR-60 直接判据：95% 帧 < 16.7ms（拖拽窗口实测）
const frameUnderOk = dragUnderRatio >= FRAME_UNDER_TARGET;
const report = {
  feature: 'FR-60 / FR-12 · 1000 节点性能采样',
  nodeCount: children.length,
  grid: { cols: COLS, rows: ROWS, size: SIZE, gap: GAP, width: GRID_W, height: GRID_H },
  load: { ok: loadOk, note: loadNote },
  idle: {
    samplingFrames: FRAMES,
    avgFps,
    p95FrameMs,
    framesUnder16_7: framesUnder,
    underRatio,
  },
  drag: {
    count: DRAGS,
    steps: DRAG_STEPS,
    smoothCount: dragSmooth,
    smoothRule: `拖拽窗口内平均帧耗时 < ${DRAG_SMOOTH_MS}ms（≈30fps）`,
    avgFps: dragAvgFps,
    p95FrameMs: dragP95,
    perDrag: perDrag,
  },
  // FR-60 判据区：拖拽窗口内逐帧采样（rAF 时间戳按窗口回放）
  fr60: {
    criterion: '拖拽采样 60fps 且 95% 帧 < 16.7ms',
    frameBudgetMs: FRAME_BUDGET_MS,
    targetUnderRatio: FRAME_UNDER_TARGET,
    dragFrames: dragFramesCount,
    framesUnder16_7: dragFramesUnder,
    underRatio: dragUnderRatio,
    avgFrameMs: dragFramesAvg,
    p95FrameMs: dragFramesP95,
    passed: frameUnderOk,
    verdict: frameUnderOk
      ? `达标（${(dragUnderRatio * 100).toFixed(1)}% 帧 <16.7ms ≥95%）`
      : `未达标（${(dragUnderRatio * 100).toFixed(1)}% 帧 <16.7ms <95%）`,
  },
  targets: { fps: '≥60', p95FrameMs: '<16.7', underRatio: '≥0.95', note: 'FR-60 判据如实上报；本机未达标不阻塞（阈值分级口径）' },
  verdict: {
    fps: fpsOk ? '达标' : '未达标',
    p95: p95Ok ? '达标' : '未达标',
    '95%帧<16.7ms': frameUnderOk ? '达标' : '未达标',
  },
  evidence: { loaded: 'dist/perf-1000/loaded.png', after: 'dist/perf-1000/after-drags.png', pageJson: 'dist/pages-perf/1000-节点/page.json' },
};
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

console.log(`idle: avg=${avgFps}fps  p95=${p95FrameMs}ms  <16.7ms=${(underRatio * 100).toFixed(1)}% (${framesUnder}/${FRAMES})`);
console.log(`drag: smooth=${dragSmooth}/${DRAGS}  avg=${dragAvgFps}fps  p95=${dragP95}ms`);
console.log(
  `FR-60 判据: 拖拽逐帧 ${dragFramesCount} 帧，<16.7ms ${(dragUnderRatio * 100).toFixed(1)}% (${dragFramesUnder}/${dragFramesCount}) avg=${dragFramesAvg}ms p95=${dragFramesP95}ms → ${report.fr60.verdict}`,
);
console.log(`perf-1000 done → dist/perf-1000/report.json  verdict: fps ${report.verdict.fps}, p95 ${report.verdict.p95}`);
if (!loadOk) process.exitCode = 1;
