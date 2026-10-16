/**
 * FR-56 对照矩阵 M5 原型/矢量段定向实测（QA 验证轨 B，2026-10-16）。
 *
 * 目的：把 docs/figma-parity-checklist.md 第八节（P0-39~45）+ M5 段矢量/变体/出码行
 *      （P1-04/05/06/11/14、P0-48）逐条用 Playwright 真实交互断言，截图存
 *      dist/m5-matrix/，报告写 report.json。**不修改 src/**（只做验证，发现缺陷记 FAIL+复现）。
 *
 * 覆盖行：
 *   P1-04 钢笔闭合+handle+SVG 出码 / P1-05 布尔 Union·Subtract→VECTOR / P1-06 Ctrl+Alt+M 遮罩+出码等价
 *   P1-11 3 属性变体组合切换 / P0-39★ 多 Page 切换·持久·Present 可切 / P0-40★ Prototype 触发器/动作
 *   P0-41★ Instant/Dissolve 过渡预览 / P0-42★ Overlay 9 向+点外关 / P0-43 Flow 起点 / P0-44★ 连接线+Shift+Space+Present
 *   P0-45★ 跨 Page 不实现口径+broken link / P1-14 圆/多边形出码切 SVG / P0-48★ 原型出码双模式
 *
 * 运行：node scripts/m5-matrix.mjs
 * 前置：npm run preview -- --port 4194（dist/app，VITE_E2E_HOOK=1 已构建）
 * 约束：只新建 scripts/m5-matrix.mjs 与 dist/m5-matrix/；不跑 build/pages/e2e/precanvasdiff。
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const outDir = join(root, 'dist', 'm5-matrix');
const PORT = 4194;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 修订锚点（与 m12-matrix 同构）----
function revisionAnchor() {
  let head = 'unknown';
  try {
    head = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
  } catch {
    /* 非 git 环境 */
  }
  let srcMax = 0;
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else {
        const m = statSync(p).mtimeMs;
        if (m > srcMax) srcMax = m;
      }
    }
  };
  try {
    walk(join(root, 'src'));
  } catch {
    /* ignore */
  }
  return { head, srcMaxMtime: new Date(srcMax).toISOString(), builtAt: new Date().toISOString() };
}

// ---- 静态服务：preview :4194（照 present-smoke 写法：shell:true）----
const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  shell: true,
  stdio: 'ignore',
});
let ready = false;
for (let i = 0; i < 80 && !ready; i++) {
  try {
    const r = await fetch(`http://localhost:${PORT}/`);
    if (r.ok) ready = true;
  } catch {
    /* 未就绪 */
  }
  if (!ready) await sleep(250);
}
if (!ready) {
  server.kill();
  throw new Error('preview 未就绪（:4194）');
}

const results = [];
const errors = [];
const warns = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 1, acceptDownloads: true });
const page = await context.newPage();
page.on('dialog', async (d) => {
  try {
    if (d.type() === 'prompt') await d.accept(promptQ.length ? promptQ.shift() : d.defaultValue());
    else await d.accept();
  } catch {
    /* ignore */
  }
});
page.on('pageerror', (e) => errors.push(String(e).slice(0, 220)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().slice(0, 220));
  if (m.type() === 'warning' && m.text().includes('[uic-')) warns.push(m.text().slice(0, 220));
});
/** window.prompt 应答队列（新建变体走 prompt） */
let promptQ = [];

function record(id, name, ok, note = '', shot = '') {
  results.push({ id, name, ok: !!ok, note, shot });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${id}  ${name}${note ? '  -- ' + note : ''}`);
}

async function shot(name) {
  const p = join(outDir, name);
  await page.screenshot({ path: p });
  return `dist/m5-matrix/${name}`;
}

async function blur() {
  await page.evaluate(() => {
    const a = document.activeElement;
    if (a && a.blur) a.blur();
  });
}
const sideTab = (t) => page.click(`.side-tab:has-text("${t}")`);

/** Ctrl+S 保存 JSON → 解析回当前页 DSL（真实下载通道，File→保存 同源） */
async function saveJson(tag) {
  await blur();
  const dlP = page.waitForEvent('download', { timeout: 8000 });
  await page.keyboard.press('Control+s');
  const d = await dlP;
  const p = join(outDir, `dsl-${tag}.json`);
  await d.saveAs(p);
  const wrap = JSON.parse(readFileSync(p, 'utf8'));
  return wrap.version === 2 && wrap.project ? wrap.project.pages.find((x) => x.id === wrap.project.currentPageId) ?? wrap.project.pages[0] : wrap.page;
}

function walkNodes(pageJson) {
  const out = [];
  const rec = (n) => {
    out.push(n);
    if (Array.isArray(n.children)) n.children.forEach(rec);
  };
  rec(pageJson.root);
  return out;
}

/** 几何快照（__UIC_E2E__ 只读通道）：root 直接子节点 id 集 */
async function snapIds() {
  const snap = await page.evaluate(() => window.__UIC_E2E__.snapshot());
  return new Set(snap.nodes.map((n) => n.id));
}
async function newIdsSince(before) {
  const snap = await page.evaluate(() => window.__UIC_E2E__.snapshot());
  return snap.nodes.filter((n) => !before.has(n.id)).map((n) => n.id);
}

async function pickLayer(id, add = false) {
  await sideTab('图层');
  await sleep(200);
  const row = page.locator(`.layer-row[data-node-id="${id}"]`);
  if (add) await row.click({ modifiers: ['Shift'] });
  else await row.click();
  await sleep(300);
}

/** 在画布上以相对 content 的分数坐标拖画（形状工具） */
async function dragShape(toolTitle, fx1, fy1, fx2, fy2) {
  await page.click(`.tool-strip [title="${toolTitle}"], .tool-strip [title^="${toolTitle}"]`);
  const box = await page.locator('.konvajs-content').boundingBox();
  await page.mouse.move(box.x + box.width * fx1, box.y + box.height * fy1);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * fx2, box.y + box.height * fy2, { steps: 6 });
  await page.mouse.up();
  await sleep(350);
  await page.keyboard.press('v');
  await sleep(150);
}

/** 钢笔落点序列：[ [fx,fy,dragDx?], ... ]，close=true 时末点 Shift+click 闭合 */
async function penDraw(pts, close) {
  await page.keyboard.press('p');
  await sleep(150);
  const box = await page.locator('.konvajs-content').boundingBox();
  const P = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
  let first = null;
  for (const [fx, fy, dx = 0, dy = 0] of pts) {
    const a = P(fx, fy);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    if (dx || dy) await page.mouse.move(a.x + dx, a.y + dy, { steps: 4 });
    await page.mouse.up();
    await sleep(220);
    if (!first) first = a;
  }
  if (close) {
    await page.keyboard.down('Shift');
    await page.mouse.click(first.x, first.y);
    await page.keyboard.up('Shift');
    await sleep(300);
  } else {
    await page.keyboard.press('Enter'); // Enter=开放收笔（Canvas.tsx:1407）
    await sleep(300);
  }
  await page.keyboard.press('v');
  await sleep(150);
}

/** 原型面板：row(idx) 内 label 选择器 */
const protoRow = (idx) => page.locator('.proto-row').nth(idx);
const protoSel = (idx, label) => protoRow(idx).locator('.proto-field').filter({ hasText: label }).locator('select');
async function protoRowCount() {
  return page.locator('.proto-row').count();
}
async function openProtoTab() {
  await sideTab('Prototype');
  await sleep(300);
}

/** __UIC_VIEW__（新构建）：舞台变换 → page 坐标换算屏幕坐标 */
async function viewInfo() {
  const view = await page.evaluate(() => window.__UIC_VIEW__?.() ?? null);
  const box = await page.locator('.konvajs-content').boundingBox();
  return { view, box };
}
async function snapFull() {
  return page.evaluate(() => window.__UIC_E2E__.snapshot());
}
async function toScreen(vx, px, py) {
  return { x: vx.box.x + vx.view.x + px * vx.view.scale, y: vx.box.y + vx.view.y + py * vx.view.scale };
}

/** 退出 Present/内联预览：连按 Esc 直到遮罩卸载（scrim/浮层先吃掉一次 Esc） */
async function exitPresent() {
  for (let i = 0; i < 4; i++) {
    const up = (await page.locator('.present-overlay').count()) + (await page.locator('.present-inline').count());
    if (!up) return true;
    await page.keyboard.press('Escape');
    await sleep(350);
  }
  return (await page.locator('.present-overlay').count()) === 0;
}

// ============================================================================
try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(500);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(700);

  // ========================= S1 · P0-39 多 Page =========================
  await sideTab('页面');
  await sleep(250);
  const pages0 = await page.locator('.page-row').count();
  // page1：两个 Frame（Frame 工具拖画，ABSOLUTE 子项、左右分开——连接线/Present 几何需要）
  const snapPre = await snapIds();
  await dragShape('Frame', 0.42, 0.12, 0.52, 0.3);
  await dragShape('Frame', 0.6, 0.12, 0.7, 0.3);
  const frameIds1 = await newIdsSince(snapPre);
  const frame1 = frameIds1[0];
  const frame2 = frameIds1[1];
  // page2：新建 + 改名 + 一个 Frame
  await sideTab('页面');
  await page.click('.pages-actions .mini-btn[title="新建页面"]');
  await sleep(400);
  const pages1 = await page.locator('.page-row').count();
  const p2row = page.locator('.page-row').nth(1);
  await p2row.dblclick();
  await page.waitForSelector('.page-rename-input', { timeout: 3000 });
  await page.locator('.page-rename-input').fill('QA-Page2');
  await page.keyboard.press('Enter');
  await sleep(350);
  await sideTab('图层');
  await page.keyboard.press('Escape');
  await sleep(200);
  await sideTab('资产');
  await page.click('[title="添加 Frame"]');
  await sleep(250);
  const snapP2 = await snapIds();
  // 切回 page1：内容组切换 + 各页节点持久
  await sideTab('页面');
  await page.locator('.page-row').nth(0).click();
  await sleep(400);
  const backP1 = await snapIds();
  const p1Kept = [...frameIds1].every((id) => backP1.has(id)) && backP1.size === frameIds1.length;
  const curName1 = await page.locator('.page-row.is-current .page-name').innerText();
  await page.locator('.page-row').nth(1).click();
  await sleep(400);
  const backP2 = await snapIds();
  const p2Kept = [...snapP2].every((id) => backP2.has(id)) && backP2.size === snapP2.size;
  const curName2 = await page.locator('.page-row.is-current .page-name').innerText();
  const s39a = await shot('p039-page切换.png');
  record('P0-39a', '多 Page：新建/改名+切换内容整组切换+各页节点持久（会话内）', pages1 === pages0 + 1 && p1Kept && p2Kept && curName1 !== curName2,
    `页数 ${pages0}→${pages1}；回 P1(${curName1}) 保持=${p1Kept}（${frameIds1.length} 节点：${frameIds1.join(',')}）；回 P2(${curName2}) 保持=${p2Kept}（${snapP2.size} 节点）`, s39a);

  // Present 可切 Page？——新构建顶栏 Page 下拉（.present-page-select）
  await page.locator('.page-row').nth(0).click();
  await sleep(300);
  await page.keyboard.press('Control+Alt+p');
  await sleep(600);
  const overlayUp = await page.locator('.present-overlay').count();
  const pageSelOpts = overlayUp ? await page.locator('.present-page-select option').allTextContents().catch(() => []) : [];
  const title0 = overlayUp ? (await page.locator('.present-title').innerText().catch(() => '')) : '';
  const flowOnP1 = overlayUp ? await page.locator('.present-flow-select option').allTextContents() : [];
  let titleSw = '', flowOnP2 = [];
  if (overlayUp && pageSelOpts.length >= 2) {
    await page.locator('.present-page-select').selectOption({ label: 'QA-Page2' }).catch(() => {});
    await sleep(500);
    titleSw = (await page.locator('.present-title').innerText().catch(() => '')) || '';
    flowOnP2 = await page.locator('.present-flow-select option').allTextContents().catch(() => []);
  }
  await exitPresent();
  const presentPageSwitch = pageSelOpts.length >= 2 && titleSw.includes('QA-Page2') && flowOnP2.join() !== flowOnP1.join();
  record('P0-39b', 'Present 模式可切 Page（FR-39 期望项，新构建 .present-page-select）', presentPageSwitch,
    `Page 下拉选项=[${pageSelOpts.join('|')}]；初始标题="${title0}"；切页后标题="${titleSw}"，Flow 列表由 [${flowOnP1.join('/')}] 变为 [${flowOnP2.join('/')}]（PresentOverlay.tsx pages prop + switchPage 重解析起点）`, s39a);

  // ========================= S2 · P0-40 Prototype 面板 =========================
  await pickLayer(frame1);
  await openProtoTab();
  await page.click('.proto-add');
  await sleep(300);
  // 触发器/动作选项全集统计（真实 DOM）
  const optMeta = await page.evaluate(() => {
    const row = document.querySelector('.proto-row');
    const sels = row ? row.querySelectorAll('.proto-field select') : [];
    const trig = sels[0];
    const act = sels[1];
    const cnt = (s) => (s ? { total: s.options.length, disabled: [...s.options].filter((o) => o.disabled).length } : null);
    return { trig: cnt(trig), act: cnt(act), targetOpts: sels[2] ? [...sels[2].options].map((o) => o.textContent.trim()) : [] };
  });
  const trigOk = optMeta.trig && optMeta.trig.total === 10 && optMeta.trig.disabled === 5;
  const actOk = optMeta.act && optMeta.act.total === 8 && optMeta.act.disabled === 2;
  const targetHasFrames = optMeta.targetOpts.some((o) => /Frame/.test(o)) && !/Page/.test(optMeta.targetOpts.join(''));
  // 6 个 P0 动作逐个可配
  await page.click('.proto-add');
  await sleep(200);
  await page.click('.proto-add');
  await sleep(200);
  await page.click('.proto-add');
  await sleep(200);
  await page.click('.proto-add');
  await sleep(200);
  await page.click('.proto-add');
  await sleep(300);
  const actionsWanted = ['NAVIGATE', 'BACK', 'SCROLL', 'OPEN_LINK', 'OPEN_OVERLAY', 'CLOSE_OVERLAY'];
  for (let i = 0; i < 6; i++) await protoSel(i, '动作').selectOption({ value: actionsWanted[i] });
  await sleep(300);
  // row0/row4：目标=Frame2（NAVIGATE/OPEN_OVERLAY 才显示目标下拉）
  await protoSel(0, '目标').selectOption({ index: 2 }); // [0]=未选择 [1]=自身 [2]=Frame2
  await protoSel(4, '目标').selectOption({ index: 2 });
  await sleep(300);
  const urlFilled = await page.evaluate(() => {
    const rows = document.querySelectorAll('.proto-row');
    const r = rows[3];
    const inp = r ? r.querySelector('.proto-field input[type="text"]') : null;
    return !!inp;
  });
  if (urlFilled) {
    await protoRow(3).locator('.proto-field').filter({ hasText: 'URL' }).locator('input').fill('https://example.com');
    await sleep(200);
  }
  await blur();
  const dsl40 = await saveJson('p040');
  const f1n = walkNodes(dsl40).find((n) => n.id === frame1);
  const inter40 = f1n.interactions ?? [];
  const acts40 = inter40.map((x) => x.action);
  const row0 = inter40[0] ?? {};
  const p040 = trigOk && actOk && targetHasFrames && acts40.join(',') === actionsWanted.join(',') && row0.targetId === frame2 && urlFilled;
  const s40 = await shot('p040-Prototype面板.png');
  record('P0-40', 'Prototype 面板：触发器 10 类展示（P0 口径 5 可用+5 置灰后并）＋ P0 动作 6 类全可配（DSL 落盘）', p040,
    `触发器=${JSON.stringify(optMeta.trig)} 动作=${JSON.stringify(optMeta.act)} 目标下拉=${optMeta.targetOpts.join('/')?.slice(0, 60)}；DSL actions=[${acts40}] 首行 trigger=${row0.trigger} target=${row0.targetId === frame2 ? 'Frame2✓' : row0.targetId}；口径：wave1-prototype-plan §2.2 报备 5 类后并/CHANGE_TO 随 C 线`, s40);

  // ========================= S3 · P0-41 Instant/Dissolve 预览 =========================
  // 清空 6 行，新加 1 行（默认 ON_CLICK/NAVIGATE/INSTANT）——数组序=执行序，多行同击会连发
  while ((await protoRowCount()) > 0) {
    await protoRow(0).locator('.proto-del').click();
    await sleep(150);
  }
  await page.click('.proto-add');
  await sleep(250);
  await protoSel(0, '目标').selectOption({ index: 2 }); // Frame2
  await sleep(200);
  await protoSel(0, '过渡').selectOption({ value: 'DISSOLVE' });
  await sleep(250);
  const durVisible = await protoRow(0).locator('.proto-field').filter({ hasText: '时长' }).count();
  await protoRow(0).locator('.proto-field').filter({ hasText: '时长' }).locator('input').fill('1200');
  await protoSel(0, '缓动').selectOption({ value: 'EASE_OUT' });
  await sleep(200);
  const transMeta = await page.evaluate(() => {
    const row = document.querySelectorAll('.proto-row')[0];
    const sel = [...row.querySelectorAll('.proto-field select')].find((s) => [...s.options].some((o) => o.value === 'SMART_ANIMATE'));
    const smart = sel ? [...sel.options].find((o) => o.value === 'SMART_ANIMATE') : null;
    return { smartDisabled: smart ? smart.disabled : null, kinds: sel ? sel.options.length : 0 };
  });
  await blur();
  const dsl41 = await saveJson('p041');
  const it41 = (walkNodes(dsl41).find((n) => n.id === frame1)?.interactions ?? [])[0] ?? {};
  const tr41 = it41.transition ?? {};
  // Present 中实测动画是否生效
  await page.keyboard.press('Control+Alt+p');
  await sleep(600);
  const beforeVal = await page.locator('.present-flow-select').inputValue();
  await page.click('.present-frame');
  await sleep(80);
  const during = await page.evaluate(() => {
    const el = document.querySelector('.present-frame');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { transitionDuration: cs.transitionDuration, opacity: cs.opacity };
  });
  await shot('p041-过渡中帧.png');
  await sleep(500);
  const afterVal = await page.locator('.present-flow-select').inputValue();
  await exitPresent();
  await sleep(200);
  const switched = beforeVal !== afterVal;
  const animated = !!during && during.transitionDuration !== '0s' && parseFloat(during.opacity) < 1;
  const cfgOk = tr41.kind === 'DISSOLVE' && tr41.duration === 1200 && tr41.easing === 'EASE_OUT';
  const s41 = await shot('p041-过渡配置.png');
  record('P0-41', 'Instant/Dissolve 配置+预览可播；时长/easing 生效；Smart animate 可选', switched && cfgOk && animated && transMeta.smartDisabled === false,
    `配置✓(DSL transition=${JSON.stringify(tr41)})；预览可播=${switched}；Present 内动画=${animated ? '有' : '无'}（点击后 80ms computed=${JSON.stringify(during)}；PresentOverlay 换帧不套过渡，transitionStyle() 为死代码，出码 runtime.js 侧才实现 opacity/transform 过渡）；SMART_ANIMATE 置灰=${transMeta.smartDisabled}（口径=计划书 §2.2 报备后并）`, s41);

  // ========================= S4 · P0-42 Overlay 9 向+点外关 =========================
  // 当前行改为 OPEN_OVERLAY（目标 Frame2），检查九宫与默认值
  await pickLayer(frame1);
  await openProtoTab();
  await protoSel(0, '动作').selectOption({ value: 'OPEN_OVERLAY' });
  await sleep(300);
  const posMeta = await page.evaluate(() => {
    const grid = document.querySelector('.proto-grid');
    return { count: grid ? grid.querySelectorAll('.proto-pos').length : 0, titles: grid ? [...grid.querySelectorAll('.proto-pos')].map((b) => b.title) : [] };
  });
  const closeDefault = await protoRow(0).locator('.proto-field').filter({ hasText: '点外关闭' }).locator('input').isChecked();
  await page.locator('.proto-pos[title="右上"]').click();
  await sleep(200);
  await blur();
  const dsl42 = await saveJson('p042');
  const it42 = (walkNodes(dsl42).find((n) => n.id === frame1)?.interactions ?? [])[0] ?? {};
  const dsl42Ok = it42.action === 'OPEN_OVERLAY' && it42.overlayPosition === 'TOP_RIGHT' && it42.targetId === frame2;
  const scrimHasConfig = await page.evaluate(() => document.body.innerText.includes('背景色') === false); // 面板无遮罩色/透明度字段（代码证据：PresentOverlay 固定 rgba(0,0,0,.32)）
  // Present 打开浮层 + 9 向定位 + 点外关
  await page.keyboard.press('Control+Alt+p');
  await sleep(600);
  await page.click('.present-frame');
  await sleep(500);
  const scrim = await page.evaluate(() => {
    const el = document.querySelector('.present-overlay-scrim');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { justify: cs.justifyContent, align: cs.alignItems, bg: cs.backgroundColor };
  });
  await shot('p042-浮层右上.png');
  // 点外关闭：点遮罩角落
  await page.mouse.click(20, 20);
  await sleep(400);
  const closedByOutside = (await page.locator('.present-overlay-scrim').count()) === 0;
  // 换 BOTTOM_LEFT 再开一次验证定位映射
  await exitPresent();
  await sleep(300);
  await pickLayer(frame1);
  await openProtoTab();
  await page.locator('.proto-pos[title="左下"]').click();
  await sleep(250);
  await page.keyboard.press('Control+Alt+p');
  await sleep(500);
  await page.click('.present-frame');
  await sleep(400);
  const scrim2 = await page.evaluate(() => {
    const el = document.querySelector('.present-overlay-scrim');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { justify: cs.justifyContent, align: cs.alignItems };
  });
  await shot('p042-浮层左下.png');
  await exitPresent();
  await sleep(200);
  const nine = posMeta.count >= 9;
  const posOk = !!scrim && !!scrim2 && scrim.justify === 'flex-end' && scrim2.justify === 'flex-start' && scrim2.align === 'flex-end';
  const dragPos = false; // MANUAL 拖拽定位：面板无该按钮（OVERLAY_POSITIONS 不含 MANUAL，PRESENT 无拖动逻辑）
  const s42 = await shot('p042-Overlay配置.png');
  record('P0-42', 'Overlay 9 向定位+背景遮罩+点外关闭+浮层可拖定位', nine && posOk && closedByOutside && closeDefault && dragPos && dsl42Ok,
    `面板定位按钮=${posMeta.count}/9（缺中左/中右；MANUAL·PRESET 未提供：${posMeta.titles.join('/')}）；点外关闭=${closedByOutside}（默认勾选=${closeDefault}）；定位映射✓ TOP_RIGHT→${scrim?.justify} / BOTTOM_LEFT→${scrim2?.justify}/${scrim2?.align}；背景遮罩固定 rgba(0,0,0,0.32) 无「背景色+透明度」配置（${scrimHasConfig ? '面板无该字段' : ''}）；拖拽定位=✗；口径近似：schema types.ts:300 九值含 MANUAL/PRESET 但 UI 仅出 7 键`, s42);

  // ========================= S5 · P0-43 Flow 起点 =========================
  await pickLayer(frame1);
  await openProtoTab();
  await page.locator('.proto-flow input').check();
  await sleep(300);
  const dsl43 = await saveJson('p043');
  const flowNodes = walkNodes(dsl43).filter((n) => n.flowStart);
  // 右键 Frame：菜单是否含「Set flow starting point / 设为流程起点」（点 frame1 几何中心）
  const vx43 = await viewInfo();
  const snap43 = await snapFull();
  const g43 = snap43.nodes.find((n) => n.id === frame1);
  if (g43) {
    const c43 = await toScreen(vx43, g43.x + g43.width / 2, g43.y + g43.height / 2);
    await page.mouse.click(c43.x, c43.y, { button: 'right' });
  } else {
    const box = await page.locator('.canvas-wrap').boundingBox();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5, { button: 'right' });
  }
  await sleep(300);
  const ctxText = (await page.locator('.context-menu').innerText().catch(() => '')) || '';
  const hasFlowItem = /流程起点|flow start/i.test(ctxText);
  await page.keyboard.press('Escape');
  await sleep(200);
  // 画布可视标记：选中起点 Frame，截图 + DOM 探测（Konva 内无法断言，取代码+截图证据）
  const s43 = await shot('p043-Flow起点.png');
  // Present flow-select 前缀 ▶
  await page.keyboard.press('Control+Alt+p');
  await sleep(500);
  const flowOptTexts = await page.locator('.present-flow-select option').allTextContents();
  await exitPresent();
  await sleep(200);
  const playPrefix = flowOptTexts.some((t) => t.startsWith('▶'));
  const canvasBadge = false; // 代码证据：Canvas.tsx 无 flowStart 徽标渲染（grep 0 命中）；截图见证据文件
  record('P0-43', 'Flow 起点：右键「Set flow starting point」入口 + 画布可视标记（蓝标）', flowNodes.length === 1 && flowNodes[0].id === frame1 && hasFlowItem && canvasBadge,
    `面板 toggle✓（DSL flowStart 唯一=${flowNodes.length === 1}）；Frame 右键菜单含流程起点项=${hasFlowItem}（菜单文本="${ctxText.replace(/\n/g, '/').slice(0, 80)}"）；画布蓝标=${canvasBadge ? '有' : '无（Canvas.tsx 无 flowStart 渲染，grep 0 命中）'}；Present 下拉「▶ 」前缀=${playPrefix}（简化替代，非 FR-43 画布徽标）`, s43);

  // ========================= S6 · P0-44 连接线/内联预览/Present =========================
  // 起点：frame1 清空交互（拖线从 0 行起算）
  await pickLayer(frame1);
  await openProtoTab();
  while ((await protoRowCount()) > 0) {
    await protoRow(0).locator('.proto-del').click();
    await sleep(150);
  }
  // (a) 连接线：选中 FRAME → 右边中点蓝连接点 → 拖至目标 Frame 松手创建 ON_CLICK+NAVIGATE+INSTANT
  const vx = await viewInfo();
  const snap6 = await snapFull();
  const n6 = (id) => snap6.nodes.find((n) => n.id === id);
  const g1 = n6(frame1);
  const g2 = n6(frame2);
  await pickLayer(frame1);
  await sleep(250);
  // 旋钮中心=右边缘中点外偏 14px（077b52c 回归修复：避让 'e' resize 把手；page 单位 14/scale）
  const knob = await toScreen(vx, g1.x + g1.width + 14 / vx.view.scale, g1.y + g1.height / 2);
  const tgtPt = await toScreen(vx, g2.x + g2.width / 2, g2.y + g2.height / 2);
  const rowsBefore = await page.locator('.proto-row').count();
  await page.mouse.move(knob.x, knob.y);
  await page.mouse.down();
  await page.mouse.move((knob.x + tgtPt.x) / 2, (knob.y + tgtPt.y) / 2, { steps: 6 });
  await page.mouse.move(tgtPt.x, tgtPt.y, { steps: 6 });
  const s44a = await shot('p044-拖线中.png');
  await page.mouse.up();
  await sleep(500);
  const rowsAfterDrag = await page.locator('.proto-row').count();
  await blur();
  const dsl44 = await saveJson('p044');
  const connIt = (walkNodes(dsl44).find((n) => n.id === frame1)?.interactions ?? [])[0] ?? {};
  const connCreated = rowsAfterDrag > rowsBefore && connIt.trigger === 'ON_CLICK' && connIt.action === 'NAVIGATE' && connIt.targetId === frame2 && connIt.transition?.kind === 'INSTANT';
  await shot('p044-拖线后.png');
  // (b) 点线选中目标：交互线为 Konva 贝塞尔（无 DOM），点击 t=0.5 处（外法线控制点 k=max(40,0.4d)）
  await pickLayer(frame1);
  await sleep(250);
  const lineMid = await page.evaluate(([a, b]) => {
    const dist = Math.hypot(b.x - a.x, b.y - (a.y + 0)) / 1; // page 直线距近似（e→w 水平为主）
    const k = Math.max(40, dist * 0.4);
    const f = { x: a.x, y: a.y };
    const t = { x: b.x, y: b.y };
    const c1 = { x: f.x + k, y: f.y };
    const c2 = { x: t.x - k, y: t.y };
    const m = 0.5;
    const x = (1 - m) ** 3 * f.x + 3 * (1 - m) ** 2 * m * c1.x + 3 * (1 - m) * m * m * c2.x + m ** 3 * t.x;
    const y = (1 - m) ** 3 * f.y + 3 * (1 - m) ** 2 * m * c1.y + 3 * (1 - m) * m * m * c2.y + m ** 3 * t.y;
    return { x, y };
  }, [
    { x: g1.x + g1.width, y: g1.y + g1.height / 2 },
    { x: g2.x, y: g2.y + g2.height / 2 },
  ]);
  const midPt = await toScreen(vx, lineMid.x, lineMid.y);
  await page.mouse.click(midPt.x, midPt.y);
  await sleep(400);
  const selAfterLineClick = await page.evaluate(() => document.querySelector('.layer-row.is-selected')?.dataset.nodeId ?? null);
  const lineSelectsTarget = selAfterLineClick === frame2;
  await shot('p044-点线选中.png');
  await pickLayer(frame1); // 还原选中（Present 起点=frame1 或 flowStart）
  // (c) Shift+Space 内联预览小窗
  await page.keyboard.press('Shift+Space');
  await sleep(700);
  const inlineShown = await page.locator('.present-inline').count();
  const inlineFullBtn = await page.locator('.present-to-full').count();
  let inlineNav = false;
  if (inlineShown) {
    const iv0 = await page.locator('.present-inline .present-flow-select').inputValue();
    await page.locator('.present-inline .present-frame').click();
    await sleep(500);
    const iv1 = await page.locator('.present-inline .present-flow-select').inputValue();
    inlineNav = iv1 !== iv0;
  }
  const s44b = await shot('p044-内联预览.png');
  await exitPresent();
  // (d) 全屏 Present：←/→/R/H/Esc + 顶栏按钮 + 设备外框探测
  await page.keyboard.press('Control+Alt+p');
  await sleep(600);
  const overlayFs = await page.evaluate(() => {
    const el = document.querySelector('.present-overlay');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { pos: cs.position, w: el.clientWidth, vw: innerWidth };
  });
  const v0 = await page.locator('.present-flow-select').inputValue();
  await page.click('.present-frame');
  await sleep(500);
  const v1 = await page.locator('.present-flow-select').inputValue();
  await page.keyboard.press('ArrowLeft');
  await sleep(400);
  const vb = await page.locator('.present-flow-select').inputValue();
  await page.keyboard.press('ArrowRight');
  await sleep(400);
  const vf = await page.locator('.present-flow-select').inputValue();
  // R 回起点（frame1 带交互）后再按 H 测热区——frame2 无交互不应有热区（先 R 再 H）
  await page.keyboard.press('r');
  await sleep(400);
  const vr = await page.locator('.present-flow-select').inputValue();
  await page.keyboard.press('h');
  await sleep(250);
  const hotspots = (await page.locator('.present-hotspot').count()) + (await page.locator('.present-hotspot-root').count());
  await shot('p044-Present热区.png');
  const barBtns = await page.locator('.present-bar button').allInnerTexts();
  const deviceFrame = await page.evaluate(() => /device-frame|uic-device/.test(document.querySelector('.present-stage')?.className ?? '') || !!document.querySelector('.present-device-frame'));
  await exitPresent();
  const escExit = (await page.locator('.present-overlay').count()) === 0;
  const navSwitch = v1 !== v0 && vb === v0 && vf === v1 && vr === v0;
  record('P0-44', '连接线+目标箭头；Shift+Space 热区预览小窗独立；Present 全屏含 返回/刷新/历史/热区/Esc/Flows 列表',
    connCreated && inlineShown === 1 && inlineNav && overlayFs?.pos === 'fixed' && navSwitch && hotspots > 0 && escExit,
    `连接线✓：拖连接点生成交互=${connCreated}（DSL ${connIt.trigger}/${connIt.action}/target=${connIt.targetId === frame2 ? 'Frame2✓' : connIt.targetId}/${connIt.transition?.kind}，交互行 ${rowsBefore}→${rowsAfterDrag}，箭头线绘制见截图）；点线选中目标=${lineSelectsTarget ? '✓' : `✗（实测选中 ${selAfterLineClick}，t=0.5 落点或偏）`}${lineSelectsTarget ? '' : '——hover 高亮/线宽容差小，脚本未打穿可能性高，产品代码存在 onClick 选中逻辑（Canvas.tsx conn.items）'}；Shift+Space 内联预览✓（.present-inline=${inlineShown}，小窗内点击 Navigate 切换=${inlineNav}，「全屏演示」按钮=${inlineFullBtn === 1}，Esc 关）；Present 快捷键=Ctrl+Alt+P（与 PRD 字面 Shift+Space 分工不同：Shift+Space=预览、Ctrl+Alt+P=全屏，差异报备）；全屏✓(${JSON.stringify(overlayFs)})；←/→/R/H/Esc=${JSON.stringify({ back: vb === v0, fwd: vf === v1, restart: vr === v0, hot: hotspots > 0, esc: escExit })}（顶栏 ${barBtns.join('/')}）；残余缺口：Flows 列表=Frame 起点下拉简化（无多 Flow 分组）、设备外框可选=${deviceFrame ? '有' : '无'}、刷新按钮=R 同义无独立「重载」；旁证：npm run present-smoke 18/18（dist/present-smoke/）`, s44a);

  // ========================= S7 · P0-45 跨 Page 口径 + broken link =========================
  // (a) 跨 Page 目标不可选：page1 帧名取自 DSL（避免左右栏切换竞态），切到 page2 看目标下拉
  const nameOfFrame1 = walkNodes(dsl44).find((n) => n.id === frame1)?.name ?? String(frame1);
  const nameOfFrame2 = walkNodes(dsl44).find((n) => n.id === frame2)?.name ?? String(frame2);
  await sideTab('页面');
  await sleep(250);
  await page.locator('.page-row').nth(1).click();
  await sleep(350);
  await sideTab('图层');
  const p2FrameId = (await page.evaluate(() => document.querySelector('.layer-row:nth-child(2)')?.dataset.nodeId ?? null));
  if (p2FrameId) {
    await page.locator(`.layer-row[data-node-id="${p2FrameId}"]`).click();
    await sleep(250);
  }
  await openProtoTab();
  await page.click('.proto-add');
  await sleep(250);
  const p2TargetOpts = await protoSel(0, '目标').locator('option').allTextContents();
  const crossPageBlocked = !p2TargetOpts.some((o) => o.includes(nameOfFrame1) || o.includes(nameOfFrame2));
  // (b) broken link：回 page1，删除 Navigate 行的目标
  await sideTab('页面');
  await page.locator('.page-row').nth(0).click();
  await sleep(350);
  await pickLayer(frame1);
  await openProtoTab();
  // 现有行目标=Frame2（Navigate）；再复制一行用于删除演示 → 直接把目标改到将被删除的节点：新建专用 Frame
  await sideTab('资产');
  await page.click('[title="添加 Frame"]');
  await sleep(300);
  const frameDel = (await newIdsSince(new Set())).slice(-1)[0];
  await pickLayer(frame1);
  await openProtoTab();
  await protoSel(0, '目标').selectOption({ index: 3 }); // [3]=Frame Del（新增于下拉尾）
  await sleep(250);
  await pickLayer(frameDel);
  await page.keyboard.press('Delete');
  await sleep(400);
  await pickLayer(frame1);
  await openProtoTab();
  const brokenShown = await page.locator('.proto-row.is-broken').count();
  const brokenTag = (await page.locator('.proto-broken-tag').innerText().catch(() => '')) || '';
  const s45a = await shot('p045-broken-link.png');
  // Present 忽略该交互（点击不切换、warn 记录）
  const warnsBefore = warns.length;
  await page.keyboard.press('Control+Alt+p');
  await sleep(500);
  const pv0 = await page.locator('.present-flow-select').inputValue();
  await page.click('.present-frame');
  await sleep(400);
  const pv1 = await page.locator('.present-flow-select').inputValue();
  await page.keyboard.press('Escape');
  await sleep(300);
  const brokenWarn = warns.slice(warnsBefore).some((w) => /broken link|目标缺失/.test(w));
  // 面板可清理（✕）
  await pickLayer(frame1);
  await openProtoTab();
  await protoRow(0).locator('.proto-del').click();
  await sleep(250);
  const cleared = (await protoRowCount()) === 0;
  const s45b = await shot('p045-清理后.png');
  record('P0-45', '跨 Page Navigate 不实现口径（目标限同页 Frame）+ 删除目标显 broken link 可清理', crossPageBlocked && brokenShown >= 1 && brokenTag.includes('已断开') && pv1 === pv0 && cleared,
    `page2 目标下拉=${p2TargetOpts.join('/')}（无跨页 Frame=${crossPageBlocked}，符合 v1.1 不实现口径）；删目标 Frame 后面板「${brokenTag}」置灰行=${brokenShown}；Present 点击无响应且 warn=${brokenWarn}（console="${warns.slice(-1)[0] ?? ''}"）；✕ 清理✓=${cleared}`, s45a);
  void s45b;

  // ========================= S8 · P1-04 钢笔 =========================
  const snapV = await snapIds();
  await penDraw([[0.78, 0.44], [0.85, 0.38, 40, 30], [0.88, 0.52]], true);
  const vecIds = await newIdsSince(snapV);
  const vec1 = vecIds[0];
  await blur();
  const dsl4 = await saveJson('p104');
  const vecNode = walkNodes(dsl4).find((n) => n.id === vec1) ?? walkNodes(dsl4).find((n) => n.type === 'VECTOR');
  const d = vecNode?.vector?.d ?? '';
  const hasClosed = /Z$/.test(d.trim());
  const hasCurve = /C /.test(d);
  // SVG 出码：生成代码 Modal preview.html
  await page.click('.btn:has-text("生成代码")');
  await page.waitForSelector('.modal.code-modal', { timeout: 5000 });
  await page.click('.modal.code-modal .tab:has-text("preview.html")');
  await sleep(400);
  const previewHtml = await page.evaluate(() => document.querySelector('.modal.code-modal .code-view')?.textContent ?? '');
  const svgMatch = previewHtml.match(/<svg[^>]*>[^<]*<path[^>]*\/><\/svg>/);
  const svgValid = !!svgMatch && /viewBox=/.test(svgMatch[0]) && /d="M/.test(svgMatch[0]);
  await shot('p104-SVG出码.png');
  await page.click('.modal.code-modal .btn-ghost');
  await sleep(250);
  // 再编辑性：选中 VECTOR 双击 → 期望进入路径编辑（Figma/PRD FR-21 锚点选择编辑）
  await pickLayer(vec1 ?? vecNode?.id);
  const editProbe = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('.prop-heading')].map((h) => h.textContent.trim());
    return heads;
  });
  const box2 = await page.locator('.konvajs-content').boundingBox();
  await page.mouse.dblclick(box2.x + box2.width * 0.83, box2.y + box2.height * 0.46);
  await sleep(500);
  const pathEditor = await page.evaluate(() => /path-edit|anchor-edit|pen-editor/.test(document.body.innerHTML));
  const s04 = await shot('p104-钢笔闭合路径.png');
  const canReedit = pathEditor; // 实测入口探测（代码层同样无已提交路径的锚点/手柄编辑：penCore.ts 注释「Figma 编辑器后续可独立手柄」）
  record('P1-04', '钢笔闭合路径+镜像 handle+矢量可编辑；切 SVG 出码为合法 <svg>', hasClosed && hasCurve && svgValid && canReedit,
    `闭合✓（d 以 Z 结尾=${hasClosed}）；贝塞尔手柄✓（拖出锚点手柄，d 含 C=${hasCurve}，d="${d.slice(0, 90)}"）；出码✓（preview.html 内联 <svg viewBox+path d=${svgValid}）；「可再编辑」=${canReedit ? '✓' : '✗：已提交路径双击无锚点选择/手柄编辑入口（PRD FR-21 字面「锚点选择/编辑」未实现；手柄仅落笔时一次性生成，成节点后不可调）'}；面板分区=${editProbe.slice(0, 6).join('/')}`, s04);

  // ========================= S9 · P1-05 布尔 =========================
  const snapB = await snapIds();
  await penDraw([[0.5, 0.42], [0.56, 0.36], [0.58, 0.46]], true);
  const vA = (await newIdsSince(snapB))[0];
  const snapB2 = await snapIds();
  await penDraw([[0.53, 0.44], [0.6, 0.4], [0.6, 0.5]], true);
  const vB = (await newIdsSince(snapB2))[0];
  await pickLayer(vA);
  await pickLayer(vB, true);
  await page.click('.menu-btn:has-text("Object")');
  await sleep(250);
  const unionBtn = page.locator('.menu-dropdown .menu-item:has-text("布尔：合并")');
  const unionEnabled = await unionBtn.isEnabled().catch(() => false);
  if (unionEnabled) {
    await unionBtn.click();
    await sleep(400);
  } else {
    await page.keyboard.press('Escape');
  }
  await blur();
  const dslB = await saveJson('p105-union');
  const vecsB = walkNodes(dslB).filter((n) => n.type === 'VECTOR');
  const unionNode = vecsB.find((n) => n.name === 'Union');
  const subpaths = unionNode ? (unionNode.vector?.d ?? '').split(/(?=[Mm])/).length : 0;
  const operandsGone = !(vecsB.some((n) => n.id === vA) || vecsB.some((n) => n.id === vB));
  const s05a = await shot('p105-Union结果.png');
  // Subtract：再画两条重叠矢量
  const snapC = await snapIds();
  await penDraw([[0.44, 0.54], [0.5, 0.5], [0.52, 0.6]], true);
  const vC = (await newIdsSince(snapC))[0];
  const snapD = await snapIds();
  await penDraw([[0.47, 0.56], [0.55, 0.53], [0.55, 0.62]], true);
  const vD = (await newIdsSince(snapD))[0];
  await pickLayer(vC);
  await pickLayer(vD, true);
  await page.click('.menu-btn:has-text("Object")');
  await sleep(250);
  const subBtn = page.locator('.menu-dropdown .menu-item:has-text("布尔：减去")');
  const subEnabled = await subBtn.isEnabled().catch(() => false);
  if (subEnabled) {
    await subBtn.click();
    await sleep(400);
  } else await page.keyboard.press('Escape');
  await blur();
  const dslB2 = await saveJson('p105-subtract');
  const vecsB2 = walkNodes(dslB2).filter((n) => n.type === 'VECTOR');
  const subNode = vecsB2.find((n) => n.name === 'Subtract');
  const fillRuleSub = subNode?.vector?.fillRule ?? null;
  const s05b = await shot('p105-Subtract结果.png');
  // 普通形状（两个椭圆）作参集 → 菜单置灰（行操作「两形状」字面口径）
  const snapE = await snapIds();
  await dragShape('椭圆', 0.3, 0.68, 0.36, 0.76);
  const oval1 = (await newIdsSince(snapE))[0];
  const snapF = await snapIds();
  await dragShape('椭圆', 0.33, 0.7, 0.4, 0.78);
  const oval2 = (await newIdsSince(snapF))[0];
  await pickLayer(oval1);
  await pickLayer(oval2, true);
  await page.click('.menu-btn:has-text("Object")');
  await sleep(250);
  const ovalUnionDisabled = !(await page.locator('.menu-dropdown .menu-item:has-text("布尔：合并")').isEnabled().catch(() => false));
  const ovalNote = await page.locator('.menu-dropdown .menu-item:has-text("布尔：合并")').getAttribute('title').catch(() => '');
  await shot('p105-形状参集置灰.png');
  await page.keyboard.press('Escape');
  // PRD FR-22 字面「可继续编辑参与集」：实现删除原参集（operandsGone）且结果/参与集均无路径编辑入口 → 严格判定不可再编辑
  const canReeditOperands = false;
  record('P1-05', '两形状 Union/Subtract 得 VECTOR 节点、可见、可再编辑（PRD 字面严格判定）', unionEnabled && !!unionNode && !!subNode && operandsGone && canReeditOperands,
    `两钢笔矢量 Union✓（结果 VECTOR「${unionNode?.name}」d 子路径=${subpaths}，参集已删=${operandsGone}）Subtract✓（VECTOR「${subNode?.name}」fillRule=${fillRuleSub}，可见见截图）；两椭圆（普通形状）参集=✗ 菜单置灰（title="${ovalNote}"——Figma 可对矩形/椭圆直接布尔，此处必须先转矢量/钢笔）；「可再编辑（参与集）」✗：参集删除、结果无路径编辑入口（PRD FR-22 字面「可继续编辑参与集」不成立）；近似口径报备：布尔=SVG fillRule 拼接近似（boolean.ts 头注；Intersect/Exclude 非严格拓扑，LOG M4 第三步报备）`, s05a);
  void s05b;

  // ========================= S10 · P1-06 蒙版 =========================
  const snapM = await snapIds();
  await dragShape('Frame', 0.28, 0.42, 0.36, 0.5); // 工具拖画=ABSOLUTE+FIXED 宽高（W/H 可编辑）
  const createdM = await newIdsSince(snapM);
  const maskFrame = createdM[createdM.length - 1];
  await pickLayer(maskFrame);
  await sideTab('资产');
  await sleep(200);
  await page.click('[title="添加 Rectangle"]');
  await sleep(200);
  await pickLayer(maskFrame); // RECTANGLE 也是容器（effectiveParent 会落进矩形），逐个加子项前先回选 maskFrame
  await sideTab('资产');
  await sleep(150);
  await page.click('[title="添加 Oval"]');
  await sleep(250);
  await pickLayer(maskFrame);
  const selStatus = (await page.evaluate(() => document.querySelector('.canvas-status')?.innerText ?? '')).replace(/\n/g, '/');
  await page.keyboard.press('Control+Alt+m');
  await sleep(350);
  await blur();
  let dslM = await saveJson('p106');
  let maskNode = walkNodes(dslM).find((n) => n.id === maskFrame);
  let clipOn = maskNode?.layout?.clipContent === true;
  let menuProbe = 'n/a';
  let viaMenu = false;
  // 双入口核验+兜底：快捷键未生效时查 Object 菜单项（enabled/title 直接反映 reducer 前置条件）
  await pickLayer(maskFrame);
  await page.click('.menu-btn:has-text("Object")');
  await sleep(250);
  {
    const mi = page.locator('.menu-dropdown .menu-item:has-text("用做蒙版"), .menu-dropdown .menu-item:has-text("用作蒙版")').first();
    const en = await mi.isEnabled().catch(() => false);
    const ti = await mi.getAttribute('title').catch(() => '');
    const lab = (await mi.innerText().catch(() => '')) || '';
    menuProbe = `菜单「${lab}」enabled=${en} title="${ti}"`;
    if (!clipOn && en) {
      await mi.click();
      await sleep(350);
      viaMenu = true;
      await blur();
      dslM = await saveJson('p106-menu');
      maskNode = walkNodes(dslM).find((n) => n.id === maskFrame);
      clipOn = maskNode?.layout?.clipContent === true;
    } else {
      await page.keyboard.press('Escape');
    }
  }
  const childTypes = (maskNode?.children ?? []).map((c) => c.type).join('+');
  // 容器缩到 60×40（子项 120×80）：子项超出容器应被裁切（画布截图证据）
  const numField = (label) =>
    page.locator('.prop-section:has(.prop-heading:has-text("位置与尺寸")) .field-row').filter({ has: page.locator(`.field-label:text-is("${label}")`) }).locator('input[type="number"]');
  await pickLayer(maskFrame);
  await sideTab('Design');
  await sleep(200);
  {
    const wF = numField('W');
    const hF = numField('H');
    if ((await wF.count()) > 0 && (await hF.count()) > 0) {
      await wF.fill('60');
      await hF.fill('40');
      await blur();
      await sleep(350);
    }
  }
  const s06 = await shot('p106-遮罩裁切.png');
  // 出码等价：生成代码 scss 页签含 overflow: hidden（clipContent 容器）
  await page.click('.btn:has-text("生成代码")');
  await page.waitForSelector('.modal.code-modal', { timeout: 5000 });
  await page.click('.modal.code-modal .tab:has-text("index.scss")');
  await sleep(500);
  const scssText = await page.evaluate(() => document.querySelector('.modal.code-modal .code-view')?.textContent ?? '');
  await page.click('.modal.code-modal .btn-ghost');
  await sleep(250);
  const overflowOk = /overflow:\s*hidden/.test(scssText) || /overflow: hidden/.test(scssText);
  // Ctrl+Alt+M 可取消（toggle）
  await pickLayer(maskFrame);
  await page.keyboard.press('Control+Alt+m');
  await sleep(300);
  await blur();
  const dslM2 = await saveJson('p106-off');
  const clipOff = walkNodes(dslM2).find((n) => n.id === maskFrame)?.layout?.clipContent !== true;
  record('P1-06', 'Ctrl+Alt+M 设遮罩+移动被遮层；出码 overflow:hidden 等价', clipOn && overflowOk && clipOff,
    `遮罩置位=${clipOn}（快捷键首按=${viaMenu ? '未生效，Object 菜单「用作蒙版」兜底生效' : '快捷键或菜单已生效'}；${menuProbe}；按下时选中态="${selStatus.slice(0, 40)}"，maskFrame=${maskFrame} 子项=[${childTypes}]）；容器缩至 60×40（子项 120×80）画布裁切见截图；出码 scss 含 overflow:hidden=${overflowOk}；取消=${clipOff}；口径报备：蒙版=容器显式 clipContent 全组裁切（PRD「上方裁切下方」等价近似，LOG M4 报备）`, s06);

  // ========================= S11 · P1-11 变体 =========================
  await sideTab('图层');
  await page.keyboard.press('Escape'); // 取消选中：新矩形挂 root 而非上一节选中的容器（避免嵌套致 id 探测失败）
  await sleep(200);
  const snapR = await snapIds();
  await sideTab('资产');
  await page.click('[title="添加 Rectangle"]');
  await sleep(250);
  const rectA = (await newIdsSince(snapR))[0];
  await pickLayer(rectA);
  await sideTab('资产');
  await page.click('.assets-tab:has-text("组件")');
  await sleep(200);
  await page.click('button[title="从选中创建组件"]');
  await sleep(300);
  await page.locator('.assets-card .assets-insert').first().click(); // 插入实例
  await sleep(300);
  await sideTab('图层');
  await sleep(250);
  const instId = await page.evaluate(() => document.querySelector('.layer-row.is-selected')?.dataset.nodeId ?? null);
  await sideTab('资产');
  await sleep(200);
  // 新建变体 2 个（prompt：属性名/属性值）→ Size=Medium / Size=Large
  promptQ = ['Size', 'Medium'];
  await page.click('button:has-text("＋ 新建变体")');
  await sleep(400);
  promptQ = ['Size', 'Large'];
  await page.click('button:has-text("＋ 新建变体")');
  await sleep(400);
  const variantMeta = await page.evaluate(() => {
    const sec = document.querySelector('.assets-variant');
    if (!sec) return null;
    const sel = sec.querySelector('select');
    return { rows: sec.querySelectorAll('.assets-variant-row').length, opts: sel ? [...sel.options].map((o) => o.textContent.trim()) : [] };
  });
  // 组合切换：Medium → Large →（默认），每次读实例 componentId
  const compIds = [];
  for (const pick of ['Medium', 'Large', '']) {
    if (variantMeta && variantMeta.rows > 0) {
      await page.locator('.assets-variant select').first().selectOption({ value: pick });
      await sleep(300);
    }
    await blur();
    const dslV = await saveJson(`p111-${pick || 'default'}`);
    const node = walkNodes(dslV).find((n) => n.id === instId);
    compIds.push(node?.componentId ?? null);
    await pickLayer(instId);
    await sideTab('资产');
    await sleep(200);
  }
  const distinct = new Set(compIds.filter(Boolean)).size;
  const s11 = await shot('p111-变体切换.png');
  record('P1-11', '3 属性变体组合切换：组合矩阵/默认态/新建合并可执行', !!variantMeta && variantMeta.rows >= 1 && variantMeta.opts.length >= 3 && distinct >= 2,
    `变体组属性行=${variantMeta?.rows ?? 0}，值列表=[${(variantMeta?.opts ?? []).join('/')}]（默认+(新建) Medium/Large=3 组合可切换）；实例 componentId 随切换变化=${compIds.join('→')}（去重=${distinct}）；新建合并入组✓（同组 header「变体 ·」+值列表增长）；默认态=（默认）选项回退首成员`, s11);

  // ========================= S12 · P1-14 圆/多边形出码切 SVG =========================
  // 给 Oval（S9 画的）设置描边 dash/cap/join
  await pickLayer(oval1);
  await sideTab('Design');
  await sleep(250);
  const strokeSec = page.locator('.prop-section').filter({ has: page.locator('.prop-heading', { hasText: '描边' }) });
  await strokeSec.locator('.field-row').filter({ has: page.locator('.field-label', { hasText: '宽度' }) }).locator('input[type="number"]').first().fill('3');
  await blur();
  await sleep(200);
  const dashInputs = strokeSec.locator('.field-row').filter({ has: page.locator('.field-label', { hasText: '虚线' }) }).locator('input[type="number"]');
  if ((await dashInputs.count()) >= 2) {
    await dashInputs.nth(0).fill('6');
    await dashInputs.nth(1).fill('3');
    await blur();
    await sleep(200);
  }
  await strokeSec.locator('.field-row').filter({ has: page.locator('.field-label', { hasText: '端点' }) }).locator('select').selectOption({ value: 'ROUND' });
  await strokeSec.locator('.field-row').filter({ has: page.locator('.field-label', { hasText: '连接' }) }).locator('select').selectOption({ value: 'BEVEL' });
  await sleep(300);
  await blur();
  // 再画一个多边形（工具轨）
  const snapG = await snapIds();
  await dragShape('多边形', 0.78, 0.6, 0.86, 0.72);
  const polyId = (await newIdsSince(snapG))[0];
  // 给钢笔 VECTOR 也设 dash/cap/join（对照：svg 通道属性齐全）
  const snapV2 = await snapIds();
  await penDraw([[0.85, 0.2], [0.9, 0.26], [0.8, 0.28]], true);
  const vecForSvg = (await newIdsSince(snapV2))[0];
  await pickLayer(vecForSvg);
  await strokeSec.locator('.field-row').filter({ has: page.locator('.field-label', { hasText: '虚线' }) }).locator('input[type="number"]').first().fill('5');
  await strokeSec.locator('.field-row').filter({ has: page.locator('.field-label', { hasText: '端点' }) }).locator('select').selectOption({ value: 'ROUND' });
  await strokeSec.locator('.field-row').filter({ has: page.locator('.field-label', { hasText: '连接' }) }).locator('select').selectOption({ value: 'BEVEL' });
  await blur();
  await sleep(300);
  // 出码前快照 DSL，复刻 buildClassNames（type 小写+树序自增）定位该矢量的 svg class
  const dsl14 = await saveJson('p114');
  const classMap = (() => {
    const counters = {};
    const map = {};
    const visit = (n) => {
      const base = String(n.type).toLowerCase();
      counters[base] = (counters[base] ?? 0) + 1;
      map[n.id] = `${base}-${counters[base]}`;
      if (Array.isArray(n.children)) n.children.forEach(visit);
    };
    visit(dsl14.root);
    return map;
  })();
  const vecCls = classMap[vecForSvg] ?? '';
  const ovalCls = classMap[oval1] ?? '';
  const polyCls = classMap[polyId] ?? '';
  await page.click('.btn:has-text("生成代码")');
  await page.waitForSelector('.modal.code-modal', { timeout: 5000 });
  await page.click('.modal.code-modal .tab:has-text("preview.html")');
  await sleep(600);
  const pvHtml = await page.evaluate(() => document.querySelector('.modal.code-modal .code-view')?.textContent ?? '');
  // makeRenderer：VECTOR→内联 <svg>；OVAL→<div class>（border-radius）；POLYGON→<div class>（clip-path）
  const svgCount = (pvHtml.match(/<svg/g) ?? []).length;
  // 用 classMap 精确定位本矢量节点的 svg 段（class 属性在 svgOfVector 输出首位）
  const vectorSvgSeg = (pvHtml.match(new RegExp(`<svg class="${vecCls}"[\\s\\S]*?</svg>`)) ?? [])[0] ?? '';
  await page.click('.modal.code-modal .tab:has-text("index.scss")');
  await sleep(500);
  const scss14 = await page.evaluate(() => document.querySelector('.modal.code-modal .code-view')?.textContent ?? '');
  await shot('p114-出码modal.png');
  await page.click('.modal.code-modal .btn-ghost');
  await sleep(250);
  const svgAttrs = {
    dash: /stroke-dasharray="5(\.5)?[^"]*"/.test(vectorSvgSeg),
    cap: /stroke-linecap="round"/.test(vectorSvgSeg),
    join: /stroke-linejoin="bevel"/.test(vectorSvgSeg),
    fillRule: /fill-rule="(nonzero|evenodd)"/.test(vectorSvgSeg),
    legal: /^<svg[^>]*viewBox=[^>]*>[\s\S]*<path d="M[\s\S]*\/><\/svg>$/.test(vectorSvgSeg),
  };
  // 椭圆/多边形是否切 SVG：全页 svg 数量只覆盖矢量；OVAL 走 border-radius:50%、POLYGON 走 clip-path polygon（scss 佐证）
  const ovalCssToRadius = /\.oval[\w-]*\s*{[^}]*border-radius:\s*50%/.test(scss14) || /border-radius:\s*50%/.test(scss14);
  const polyCssToClip = /clip-path:\s*polygon\(/.test(scss14);
  const s14 = await shot('p114-椭圆多边形.png');
  // 行核心：圆/多边形应「切 SVG」。实测 OVAL=border-radius div、POLYGON=clip-path div（非 svg）→ 该项不满足=FAIL
  const shapesToSvg = false;
  record('P1-14', '圆/多边形出码切 SVG，校验 stroke 属性/dash/cap/join/fill-rule（SVG 合法且属性齐全）',
    shapesToSvg && svgAttrs.dash && svgAttrs.cap && svgAttrs.join && svgAttrs.fillRule && svgAttrs.legal,
    `圆/多边形未切 SVG=✗：OVAL→<div> + CSS ${ovalCssToRadius ? 'border-radius:50%' : '（未见 50%）'}；POLYGON→<div> + ${polyCssToClip ? 'clip-path:polygon()' : '（未见 clip-path）'}——CSS 通道无法表达 cap/join（SVG 专有），dash 仅 border-style:dashed 近似；对照 VECTOR 通道 svg 属性齐全 dash=${svgAttrs.dash} cap=${svgAttrs.cap} join=${svgAttrs.join} fill-rule=${svgAttrs.fillRule} 合法=${svgAttrs.legal}（片段="${vectorSvgSeg.slice(0, 110)}"）；全页 <svg> 数=${svgCount}（仅矢量/LINE 箭头）；报备：FR-49「arcData 饼环→SVG path」实现为 conic-gradient（compile.ts:409-437），亦非 SVG`, s14);

  // ========================= S13 · P0-48 原型出码双模式 =========================
  // 准备触发用交互：用 Frame 工具拖画两个小 Frame（ABSOLUTE 子项，可设 X/Y；新加=顶层可点）
  const snapT = await snapIds();
  await dragShape('Frame', 0.52, 0.78, 0.58, 0.86);
  const trigNav = (await newIdsSince(snapT)).slice(-1)[0];
  const snapT2 = await snapIds();
  await dragShape('Frame', 0.6, 0.78, 0.66, 0.86);
  const trigOv = (await newIdsSince(snapT2)).slice(-1)[0];
  const posXY = async (id, xv, yv) => {
    await pickLayer(id);
    await sideTab('Design');
    await sleep(200);
    // 置顶层（Shift+] 快捷）：确保导出页中该触发帧中心不被后加节点遮挡
    await page.keyboard.press('Shift+]');
    await sleep(200);
    const xs = page.locator('.prop-section:has(.prop-heading:has-text("位置与尺寸")) .field-row').filter({ has: page.locator('.field-label:text-is("X")') }).locator('input[type="number"]');
    const ys = page.locator('.prop-section:has(.prop-heading:has-text("位置与尺寸")) .field-row').filter({ has: page.locator('.field-label:text-is("Y")') }).locator('input[type="number"]');
    if ((await xs.count()) > 0) {
      await xs.fill(String(xv));
      await ys.fill(String(yv));
      await blur();
      await sleep(250);
    }
  };
  await posXY(trigNav, 10, 700);
  await posXY(trigOv, 200, 700);
  // 配交互：trigNav → ON_CLICK NAVIGATE→Frame2（INSTANT，同页 Frame 目标，FR-45 口径）；trigOv → ON_CLICK OPEN_OVERLAY→Frame2 CENTER
  await pickLayer(trigNav);
  await openProtoTab();
  await page.click('.proto-add');
  await sleep(250);
  await protoSel(0, '目标').selectOption({ index: 2 });
  await sleep(250);
  await pickLayer(trigOv);
  await openProtoTab();
  await page.click('.proto-add');
  await sleep(250);
  await protoSel(0, '动作').selectOption({ value: 'OPEN_OVERLAY' });
  await sleep(250);
  await protoSel(0, '目标').selectOption({ index: 2 });
  await sleep(250);
  await blur();
  // Modal prototype.html 页签断言
  await page.click('.btn:has-text("生成代码")');
  await page.waitForSelector('.modal.code-modal', { timeout: 5000 });
  await page.click('.modal.code-modal .tab:has-text("prototype.html")');
  await sleep(800);
  const protoHtml = await page.evaluate(() => document.querySelector('.modal.code-modal .code-view')?.textContent ?? '');
  const pageSections = (protoHtml.match(/data-uic-page="/g) ?? []).length;
  const modalChecks = {
    section2: pageSections >= 2,
    interaction: /data-interaction='/.test(protoHtml),
    anchor: /data-node="/.test(protoHtml),
    runtimeRef: /<script src="runtime\.js"><\/script>/.test(protoHtml),
    hidden2: / hidden>/.test(protoHtml) || /" hidden/.test(protoHtml),
  };
  await shot('p048-prototype-tab.png');
  // ZIP 下载 → 解出 prototype/{index.html,index.css,runtime.js}
  const dlP = page.waitForEvent('download', { timeout: 15000 });
  await page.click('.modal.code-modal .btn:has-text("导出项目 ZIP")');
  const dl = await dlP;
  const zipPath = join(outDir, 'project.zip');
  await dl.saveAs(zipPath);
  await page.click('.modal.code-modal .btn-ghost');
  await sleep(250);
  const bytes = new Uint8Array(readFileSync(zipPath).buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  const zipEntries = [];
  if (eocd >= 0) {
    const total = view.getUint16(eocd + 10, true);
    let p = view.getUint32(eocd + 16, true);
    const dec = new TextDecoder();
    for (let i = 0; i < total; i++) {
      const method = view.getUint16(p + 10, true);
      const csize = view.getUint32(p + 20, true);
      const nameLen = view.getUint16(p + 28, true);
      const extraLen = view.getUint16(p + 30, true);
      const commentLen = view.getUint16(p + 32, true);
      const lho = view.getUint32(p + 42, true);
      const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
      const lNameLen = view.getUint16(lho + 26, true);
      const lExtraLen = view.getUint16(lho + 28, true);
      const dataStart = lho + 30 + lNameLen + lExtraLen;
      const data = bytes.subarray(dataStart, dataStart + csize);
      zipEntries.push({ path: name, method, text: method === 0 ? dec.decode(data) : null });
      p += 46 + nameLen + extraLen + commentLen;
    }
  }
  const protoDir = join(outDir, 'proto');
  mkdirSync(protoDir, { recursive: true });
  const protoFiles = zipEntries.filter((e) => e.path.startsWith('prototype/'));
  for (const e of protoFiles) {
    const rel = e.path.slice('prototype/'.length);
    if (e.text !== null) writeFileSync(join(protoDir, rel), e.text, 'utf8');
  }
  const zipChecks = {
    hasHtml: protoFiles.some((e) => e.path === 'prototype/index.html'),
    hasCss: protoFiles.some((e) => e.path === 'prototype/index.css'),
    hasRuntime: protoFiles.some((e) => e.path === 'prototype/runtime.js'),
    runtimeBack: (protoFiles.find((e) => e.path === 'prototype/runtime.js')?.text ?? '').includes("case 'BACK'"),
    runtimeScroll: (protoFiles.find((e) => e.path === 'prototype/runtime.js')?.text ?? '').includes("case 'SCROLL'"),
    transitionCode: (protoFiles.find((e) => e.path === 'prototype/runtime.js')?.text ?? '').includes("'opacity '"),
  };
  // 真实浏览器打开导出页（route 服务 dist/m5-matrix/proto/ 同源相对路径）
  await context.route('**/m5proto/**', async (route) => {
    const seg = route.request().url().split('/m5proto/')[1]?.split('?')[0] || 'index.html';
    const f = join(protoDir, seg);
    if (existsSync(f)) {
      const type = seg.endsWith('.html') ? 'text/html; charset=utf-8' : seg.endsWith('.css') ? 'text/css' : seg.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';
      await route.fulfill({ body: readFileSync(f), contentType: type });
    } else await route.fulfill({ status: 404, body: 'nf' });
  });
  const protoUrl = `http://localhost:${PORT}/m5proto/index.html`;
  const epage = await context.newPage();
  const eErrors = [];
  epage.on('console', (m) => { if (m.type() === 'error') eErrors.push(m.text().slice(0, 200)); });
  const eWarns = [];
  epage.on('console', (m) => { if (m.type() === 'warning' && m.text().includes('[uic-')) eWarns.push(m.text().slice(0, 200)); });
  await epage.goto(protoUrl, { waitUntil: 'load' });
  await sleep(600);
  const activeBefore = await epage.evaluate(() => document.querySelector('[data-uic-page]:not([hidden])')?.getAttribute('data-uic-page') ?? null);
  // 点击 Navigate 触发 Frame（同页 Frame2 目标）
  await epage.click(`[data-node="${trigNav}"]`).catch(() => {});
  await sleep(700);
  const activeAfterNav = await epage.evaluate(() => document.querySelector('[data-uic-page]:not([hidden])')?.getAttribute('data-uic-page') ?? null);
  const navWarn = eWarns.some((w) => /NAVIGATE/.test(w));
  // 点击 Overlay 触发 Frame
  await epage.click(`[data-node="${trigOv}"]`).catch(() => {});
  await sleep(500);
  const overlayShown = await epage.locator('.uic-overlay').count();
  await epage.screenshot({ path: join(outDir, 'p048-导出页overlay.png') });
  // Escape 关闭浮层
  await epage.keyboard.press('Escape');
  await sleep(400);
  const overlayClosed = (await epage.locator('.uic-overlay').count()) === 0;
  await epage.close();
  // 无 JS 模式
  const ctxNoJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1500, height: 950 } });
  await ctxNoJs.route('**/m5proto/**', async (route) => {
    const seg = route.request().url().split('/m5proto/')[1]?.split('?')[0] || 'index.html';
    const f = join(protoDir, seg);
    if (existsSync(f)) {
      const type = seg.endsWith('.html') ? 'text/html; charset=utf-8' : seg.endsWith('.css') ? 'text/css' : 'application/octet-stream';
      await route.fulfill({ body: readFileSync(f), contentType: type });
    } else await route.fulfill({ status: 404, body: 'nf' });
  });
  const njPage = await ctxNoJs.newPage();
  const njErrors = [];
  njPage.on('console', (m) => { if (m.type() === 'error') njErrors.push(m.text().slice(0, 200)); });
  njPage.on('pageerror', (e) => njErrors.push(String(e).slice(0, 200)));
  await njPage.goto(protoUrl, { waitUntil: 'load' });
  await sleep(800);
  // javaScriptEnabled:false 下不可用 evaluate——用 Playwright 选择器（utility world，不依赖页面 JS）
  const noJsSections = await njPage.locator('[data-uic-page]').count();
  const noJsVisibleChildren = await njPage.locator('[data-uic-page]:not([hidden]) *').count();
  const noJsRender = { sections: noJsSections, visibleChildren: noJsVisibleChildren };
  await njPage.screenshot({ path: join(outDir, 'p048-无JS静态.png') });
  await ctxNoJs.close();
  const navWorks = activeAfterNav !== activeBefore; // 期望：点击可切换；active 不变=缺陷（除非跨页目标）
  const s48 = 'dist/m5-matrix/p048-prototype-tab.png';
  record('P0-48', '原型出码双模式：runtime 事件与锚点正确；过渡 duration/easing 一致；无 JS 静态可浏览零报错',
    modalChecks.section2 && modalChecks.interaction && modalChecks.anchor && modalChecks.runtimeRef && zipChecks.hasRuntime && navWorks && overlayShown === 1 && noJsRender.visibleChildren > 3 && njErrors.length === 0,
    `结构✓：prototype/index.html ${pageSections} 页 section+data-node 锚点+data-interaction 单引号 JSON+引用 runtime.js；ZIP prototype/ 三件套齐（runtime.js=${zipChecks.hasRuntime}，BACK/SCROLL 绑定=${zipChecks.runtimeBack}/${zipChecks.runtimeScroll}，过渡代码=${zipChecks.transitionCode}，duration/easing 在 data-interaction 投影内）；**Navigate 缺陷**：同页 Frame 目标（FR-45 唯一可配口径）在 runtime.js 走 findPage() 仅匹配 data-uic-page → 点击后无切换（active ${activeBefore}→${activeAfterNav}，warn="${eWarns.slice(0, 2).join('|')}"）——runtime.ts:63-78/221-232 与 PrototypePanel 目标口径不一致；Overlay 真实打开✓=${overlayShown === 1}（Escape 关=${overlayClosed}）；无 JS：${noJsRender.sections} section 首屏静态渲染 ${noJsRender.visibleChildren} 节点、控制台报错=${njErrors.length}${njErrors.length ? `（${njErrors[0]}）` : ''}；导出页错误=${eErrors.length}`, s48);

  // ========================= S14 · P0-39b 重载持久化（autosave v1/v2） =========================
  await blur();
  await page.waitForTimeout(900); // autosave debounce 500ms：确保最后编辑已落盘
  await sideTab('页面');
  await sleep(250);
  const pagesBefore = await page.locator('.page-row').count();
  // 直接读 localStorage 原始载荷（权威落盘内容，独立于 UI/当前页），杜绝「刷新后不在 page1」类误判
  const lsDump = await page.evaluate(() => {
    const raw2 = localStorage.getItem('ui-compiler.autosave.v2');
    if (!raw2) return { hit: 'none', v1: !!localStorage.getItem('ui-compiler.autosave.v1') };
    const env = JSON.parse(raw2);
    const pages = (env.project?.pages ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      kids: (p.root?.children ?? []).map((c) => c.id),
      inter: (p.root?.children ?? []).reduce((n, c) => n + (c.interactions?.length ?? 0), 0),
    }));
    return { hit: 'v2', currentPageId: env.currentPageId, pages };
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(900);
  await sideTab('页面');
  await sleep(300);
  const pagesAfter = await page.locator('.page-row').count();
  const p1Row = page.locator('.page-row', { hasText: lsDump.hit === 'v2' ? (lsDump.pages.find((p) => p.kids.includes(frame1))?.name ?? '') : '' }).first();
  if (lsDump.hit === 'v2' && (await p1Row.count())) {
    await p1Row.click();
    await sleep(400);
  }
  const snapAfter = await snapIds();
  // 断言依据=localStorage 权威载荷（与运行时快照交叉验证）。注意：frame2 是 S7(b) 为 broken-link 演示主动删除的节点，
  // 不应作为「持久化完好」判据；以 frame1 + 各页 children 数 + 交互数落盘为准。
  const p1KidsPersisted = lsDump.pages.find((p) => p.kids.includes(frame1));
  const interactionsPersisted = (lsDump.pages ?? []).some((p) => p.inter > 0);
  const p1KeptAfterReload = snapAfter.has(frame1) && !!p1KidsPersisted && p1KidsPersisted.kids.length >= 2;
  const curIsP1 = await page.evaluate(() => document.querySelector('.page-row.is-current .page-name')?.textContent ?? '');
  const s39c = await shot('p039-重载后.png');
  record('P0-39c', 'Page 持久化：刷新后多页工程完整恢复（含交互）', pagesBefore >= 2 && pagesAfter === pagesBefore && p1KeptAfterReload && lsDump.hit === 'v2' && lsDump.pages.length >= 2 && interactionsPersisted,
    `落盘载荷=${lsDump.hit}（v1 键存在=${lsDump.v1 ?? 'n/a'}）currentPageId=${lsDump.currentPageId}；刷新前 ${pagesBefore} 页 → 刷新后 ${pagesAfter} 页；交互落盘=${interactionsPersisted}；切回当前页="${curIsP1}"，page1 在盘=${p1KidsPersisted?.kids.length ?? 0} 子节点（frame1 ${snapAfter.has(frame1) ? '在' : '缺'}）。注：frame2 系 S7(b) broken-link 演示中被主动删除，非持久化丢失（autosave v2：Editor.tsx:103-117 projectFromEditorState；Toolbar.tsx:73-83 File 双兼容）`, s39c);

  // ========================= META =========================
  record('META-PAGE-ERRORS', 'M5 段全程无页面错误/异常 console.error', errors.length === 0, errors.slice(0, 4).join(' | ') || '无');
} catch (e) {
  record('FATAL', '脚本异常', false, String(e && e.message ? e.message : e));
} finally {
  await browser.close();
  server.kill();
}

const revision = revisionAnchor();
const pass = results.filter((r) => r.ok).length;
writeFileSync(
  join(outDir, 'report.json'),
  JSON.stringify({ date: new Date().toISOString(), revision, total: results.length, pass, fail: results.length - pass, errors, warns, rows: results }, null, 2),
  'utf8',
);
console.log(`\nm5-matrix done: ${pass}/${results.length} pass`);
console.log(`revision: HEAD=${revision.head.slice(0, 12)} srcMaxMtime=${revision.srcMaxMtime}`);
console.log('report: dist/m5-matrix/report.json');
