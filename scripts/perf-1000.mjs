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
// FR-60 有效判据：vsync 量化掉帧（不受 rAF 抖动污染）
let dragOnTimeRatio = 0;
let dragMissedFrames = 0;
/** 有效判据参与统计的帧数（已丢首帧） */
let dragArrCount = 0;
/** 预热结束时刻（其后帧才计入 FR-60 判定） */
let dragWarmupEnd = 0;
/** vsync 周期（60Hz = 16.667ms），供报告区引用 */
const VSYNC_MS = 1000 / 60;

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

  /**
   * 预热（WARMUP 次，不计入统计）：排除 JIT 编译 + 首轮光栅缓存填充带来的启动开销。
   * 依据：实测首 2 次拖拽 avg 33.86/27.27ms 显著高于其后稳定段 18.25~19.7ms——
   * 这是**启动成本**而非拖拽稳态性能，不应计入稳态帧预算判定（同业界 perf 基准惯例）。
   */
  const WARMUP = 3;
  for (let w = 0; w < WARMUP; w += 1) {
    const dir = w % 2 === 0 ? 1 : -1;
    await pg.mouse.move(cx, cy);
    await pg.mouse.down();
    await pg.mouse.move(cx + dir * 90, cy + 40, { steps: DRAG_STEPS });
    await pg.mouse.move(cx + dir * 30, cy - 20, { steps: DRAG_STEPS });
    await pg.mouse.up();
    await sleep(150);
  }
  const warmupEndT = await pg.evaluate(() => performance.now());

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
  dragWarmupEnd = warmupEndT;

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

  // 拖拽窗口内逐帧采样（rAF 时间戳按窗口回放）。
  // **排除预热期**（f.t <= dragWarmupEnd 的帧不计）：那属于 JIT/首轮光栅缓存填充的启动成本。
  dragFrameDeltas = all
    .filter((f) => f.t > dragWarmupEnd && dragRows.some((d) => f.t > d.t0 && f.t <= d.t1))
    .map((f) => f.d);
  if (dragFrameDeltas.length) {
    const ds = [...dragFrameDeltas].sort((a, b) => a - b);
    dragFramesCount = dragFrameDeltas.length;
    dragFramesUnder = dragFrameDeltas.filter((d) => d < FRAME_BUDGET_MS).length;
    dragUnderRatio = Number((dragFramesUnder / dragFrameDeltas.length).toFixed(4));
    dragFramesP95 = Number(ds[Math.min(ds.length - 1, Math.floor(ds.length * 0.95))].toFixed(2));
    dragFramesAvg = Number((dragFrameDeltas.reduce((s, d) => s + d, 0) / dragFrameDeltas.length).toFixed(2));
  }

  /**
   * FR-60 **主判据（方案 A，PM 2026-10-18 拍板）**：vsync 量化准时率。
   *
   * 背景与依据（一手实证，详见 LOG「FR-60 判据有效性实证」与 checklist 差异 #4）：
   * 原 PRD 字面「95% 帧 <16.7ms」在 60Hz 下仅留 0.033ms 余量（rAF 间隔≈16.667ms），
   * 任何调度抖动即判负——**空白页（0 节点）实测也只有 75~86%**，CPU profile 显示主线程 idle 74%。
   * 该阈值测的是 rAF 量化噪声，不是卡顿，故不可作为验收判据。
   *
   * 方案 A 定义：拖拽采样中 **≥95% 帧「按时」**，按时=<1.5×vsync（≈25ms，即未掉帧到 40fps 以下）。
   * 等价表述：**掉帧率 ≤5%**。与 PRD「95% 帧按时」的语义一致且可测。
   */
  const VSYNC = 1000 / 60;
  const ON_TIME_LIMIT_MS = VSYNC * 1.5; // ≈25ms，方案 A 的「按时」阈值
  const dragArr = dragFrameDeltas.slice(1); // 丢首帧（起拖瞬间的启动抖动）
  const onTime = dragArr.filter((d) => d < ON_TIME_LIMIT_MS).length;
  const missedFrames = dragArr.length - onTime;
  dragOnTimeRatio = dragArr.length ? Number((onTime / dragArr.length).toFixed(4)) : 0;
  dragMissedFrames = missedFrames;
  dragArrCount = dragArr.length;

  await pg.screenshot({ path: join(outDir, 'after-drags.png') });
} catch (e) {
  loadNote = e instanceof Error ? e.message : String(e);
  await pg.screenshot({ path: join(outDir, '99-异常现场.png') }).catch(() => {});
} finally {
  await browser.close();
  server.kill();
}

// ---- 5) 报告 ----
const fpsOk = avgFps >= 60;
const p95Ok = p95FrameMs < FRAME_BUDGET_MS;
// FR-60 **主判据（方案 A，PM 拍板）**：拖拽采样中 ≥95% 帧按时（<25ms）= 掉帧率 ≤5%
const frameUnderOk = dragOnTimeRatio >= FRAME_UNDER_TARGET;
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
  /**
   * FR-60 **主判据（方案 A，PM 2026-10-18 拍板）**。
   * 口径：拖拽采样中 ≥95% 帧「按时」（<1.5×vsync≈25ms），等价掉帧率 ≤5%。
   */
  fr60: {
    criterion: '拖拽采样中 ≥95% 帧按时（<1.5×vsync≈25ms），即掉帧率 ≤5%',
    decidedBy: 'PM 2026-10-18（方案 A；原字面「95% 帧<16.7ms」经实证不可判定，见 checklist 差异 #4）',
    vsyncMs: Number(VSYNC_MS.toFixed(3)),
    onTimeLimitMs: Number((VSYNC_MS * 1.5).toFixed(2)),
    targetOnTimeRatio: FRAME_UNDER_TARGET,
    frames: dragArrCount,
    onTimeFrames: dragArrCount - dragMissedFrames,
    missedFrames: dragMissedFrames,
    onTimeRatio: dragOnTimeRatio,
    avgFrameMs: dragFramesAvg,
    p95FrameMs: dragFramesP95,
    passed: frameUnderOk,
    verdict: frameUnderOk
      ? `达标（按时 ${(dragOnTimeRatio * 100).toFixed(2)}% ≥95%，掉帧 ${dragMissedFrames}/${dragArrCount}）`
      : `未达标（按时 ${(dragOnTimeRatio * 100).toFixed(2)}% <95%，掉帧 ${dragMissedFrames}/${dragArrCount}）`,
  },
  /**
   * 参考信号（**非判据**）：原 PRD 字面「95% 帧 <16.7ms」。
   * 保留仅作历史对照——该指标在 60Hz 下受 rAF 量化噪声支配（空白页亦仅 75~86%），故不用于判定。
   */
  fr60_legacyLiteral: {
    note: '仅参考，非判据（量化噪声支配，空白页亦 75~86%）',
    criterion: '拖拽采样 95% 帧 < 16.7ms',
    frameBudgetMs: FRAME_BUDGET_MS,
    dragFrames: dragFramesCount,
    framesUnder16_7: dragFramesUnder,
    underRatio: dragUnderRatio,
    p95FrameMs: dragFramesP95,
  },
  targets: {
    fps: '≥60',
    p95FrameMs: '<16.7',
    onTimeRatio: '≥0.95',
    note: 'FR-60 判据=fr60（方案 A）；本机未达标不阻塞（阈值分级口径）',
  },
  verdict: {
    fps: fpsOk ? '达标' : '未达标',
    p95: p95Ok ? '达标' : '未达标',
    'FR-60(方案A 按时率)': frameUnderOk ? '达标' : '未达标',
  },
  evidence: { loaded: 'dist/perf-1000/loaded.png', after: 'dist/perf-1000/after-drags.png', pageJson: 'dist/pages-perf/1000-节点/page.json' },
};
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

console.log(`idle: avg=${avgFps}fps  p95=${p95FrameMs}ms  <16.7ms=${(underRatio * 100).toFixed(1)}% (${framesUnder}/${FRAMES})`);
console.log(`drag: smooth=${dragSmooth}/${DRAGS}  avg=${dragAvgFps}fps  p95=${dragP95}ms`);
console.log(`FR-60 判据（方案 A）: 拖拽逐帧 ${dragArrCount} 帧，按时(<${(VSYNC_MS * 1.5).toFixed(1)}ms) ${(dragOnTimeRatio * 100).toFixed(2)}%，掉帧 ${dragMissedFrames} → ${report.fr60.verdict}`);
console.log(`  [参考] 原字面 <16.7ms: ${(dragUnderRatio * 100).toFixed(1)}%（非判据，量化噪声主导）`);
console.log(`perf-1000 done → dist/perf-1000/report.json  verdict: fps ${report.verdict.fps}, p95 ${report.verdict.p95}, FR-60 ${report.verdict['FR-60(方案A 按时率)']}`);
if (!loadOk) process.exitCode = 1;
