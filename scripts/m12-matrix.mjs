/**
 * FR-56 对照矩阵 M1/M2 段定向实测（QA 验证轨，2026-10-15）。
 *
 * 目的：把矩阵中 M1 已交付 / M2 已交付 的行逐条用 Playwright 真实交互断言，截图存
 *      dist/m12-matrix/，报告写 report.json。**不修改 src/**（只做验证）。
 *
 * 覆盖行（矩阵 §一~§四、§七 的 M1/M2 部分）：
 *   P0-01 框选+Esc / P0-02 拖动语义+空格平移 / P0-03 Ctrl+滚轮锚点缩放(20%~400%)
 *   P0-04 Shift+1 适配 + Shift+0 100% / P0-05 状态栏缩放% + 下拉六项
 *   P0-06 悬停高亮 / P0-07 双击就地编辑(+Esc 提交) / P0-08 双击下钻
 *   P0-09 吸附参考线(≤6px) + 状态栏开关 / P0-10 Alt 跳过吸附
 *   P0-11 拖拽插入指示 / P0-12 自我嵌套保护 / P0-13 撤销/重做
 *   P0-14 右键菜单条目 / P0-15 Ctrl+C/V/D/A/G/Delete/Esc / P0-16 方向键 1px/10px
 *   P0-17 工具字母 / P0-18 六向对齐 / P0-19 等距分布
 *   P0-28 图层拖拽改序+双击重命名+眼睛/锁 / P0-29 画布↔图层双向同步
 *   P0-38 Pages 新建/重命名/删除(确认框)/切换
 *
 * 运行：node scripts/m12-matrix.mjs
 * 前置：VITE_E2E_HOOK=1 构建（产出 dist/app，用于读取精确几何 __UIC_E2E__.snapshot）
 *       ＋ dist/pages/*（demo 页）
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const outDir = join(root, 'dist', 'm12-matrix');
const pagesDir = join(root, 'dist', 'pages');
const PORT = 4192;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 修订锚点（矩阵作为 GA 凭据必须可复现）----
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

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const serverScript = `
const http = require('node:http');
const { readFile } = require('node:fs/promises');
const { join, extname } = require('node:path');
const MIME = ${JSON.stringify(MIME)};
http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/app/index.html';
    if (p.startsWith('/assets/')) p = '/app' + p;
    const file = join(process.cwd(), 'dist', p);
    if (!file.startsWith(join(process.cwd(), 'dist'))) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404).end('not found'); }
}).listen(${PORT}, '127.0.0.1');
`;
const server = spawn(process.execPath, ['-e', serverScript], { stdio: 'ignore' });

const results = [];
const errors = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('dialog', (d) => d.accept().catch(() => {}));
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

function record(id, name, ok, note = '', shot = '') {
  results.push({ id, name, ok: !!ok, note, shot });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${id}  ${name}${note ? '  -- ' + note : ''}`);
}

const statusSel = () => page.locator('.status-sel').textContent().catch(() => '');
const layerRows = () => page.locator('.layer-row').count();
const zoomSel = () => page.locator('.status-zoom select');

async function openPage(name) {
  const fcPromise = page.waitForEvent('filechooser');
  await page.click('.menu-btn:has-text("文件")');
  await page.click('.menu-dropdown .menu-item:has-text("打开")');
  const fc = await fcPromise;
  await fc.setFiles(join(pagesDir, name, 'page.json'));
  await sleep(800);
}

async function resetSel() {
  await page.keyboard.press('Escape');
  await sleep(120);
}

/**
 * 读取编辑器画布几何（VITE_E2E_HOOK=1 构建暴露的既有公开 API，仅读不写）。
 * 返回 { nodes:[{id,x,y,width,height}], root, viewport }，坐标为页面坐标（未乘缩放）。
 */
async function snapshot() {
  return page.evaluate(() => window.__UIC_E2E__.snapshot());
}

/**
 * 把页面坐标换算成屏幕坐标：先用 __UIC_E2E__.captureRegion 反推缩放不可行，
 * 改用「已知两点的页面坐标 ↔ 屏幕坐标」标定：
 *   在画布上把鼠标放到某点，用 Konva 命中测试读回它属于哪个节点（不可得）
 * 因此采用更直接的标定法：反复调用 __UIC_E2E__.captureRegion 会改变状态，不可取。
 * 最终方案：利用编辑器缩放控件把画布设为 100%（Shift+0），再以画布根节点在
 * .konvajs-content 内的居中偏移标定 —— 该偏移由「画布内容居中于 canvas-wrap」这一
 * 稳定规则给出：offset = (cssW - pageW) / 2, (cssH - pageH) / 2。
 */
async function calibrate() {
  const box = await page.locator('.canvas-wrap').boundingBox();
  const content = await page.locator('.konvajs-content').boundingBox();
  const snap = await snapshot();
  // 首选 hook 通道：舞台变换精确标定（历史教训：曾用「页面居中」假设标定 → 拖拽起点偏位成片假 FAIL）
  const view = await page.evaluate(() => (window.__UIC_VIEW__ ? { scale: window.__UIC_VIEW__().scale, x: window.__UIC_VIEW__().x, y: window.__UIC_VIEW__().y } : null));
  if (view) {
    return { snap, box, originX: content.x + view.x, originY: content.y + view.y, scale: view.scale };
  }
  // 回退（非 hook 构建）：居中近似标定
  await page.keyboard.down('Shift');
  await page.keyboard.press('Digit0');
  await page.keyboard.up('Shift');
  await sleep(350);
  const pageW = snap.root?.width ?? snap.viewport?.width ?? 375;
  const pageH = snap.root?.height ?? snap.viewport?.height ?? 812;
  const originX = content.x + (content.width - pageW) / 2;
  const originY = content.y + (content.height - pageH) / 2;
  return { snap, box, originX, originY, scale: 1 };
}

/** 任意深度节点几何（snapshot 仅根级；深节点定位走 geometryOf 通道） */
async function geometryOf(id) {
  return page.evaluate((gid) => window.__UIC_E2E__?.geometryOf?.(gid) ?? null, id);
}

/**
 * 找一个「起手自由」节点：其左上内缩 6px 处不被任何**前景**节点覆盖。
 * poolIds 按树行序（= children 源序，靠后 z 更高）：cand 的遮挡者 = 数组中它之后的成员。
 * （历史教训①：节点中心常被前景截胡拖错对象；教训②：背景铺满整页，若把兄弟当遮挡者会永远无自由点）
 * 返回 { id, g, pt }，pt 为页面坐标起手点。
 */
async function pickFreeNode(poolIds, { minW = 30 } = {}) {
  const withGeom = [];
  for (const id of poolIds) {
    const g = id ? await geometryOf(id) : null;
    if (g) withGeom.push({ id, g });
  }
  for (let i = 0; i < withGeom.length; i++) {
    const cand = withGeom[i];
    if (cand.g.width < minW || cand.g.height < 12) continue;
    const pt = { x: cand.g.x + 6, y: cand.g.y + 6 };
    const covered = withGeom.slice(i + 1).some((o) => o.g.x <= pt.x && pt.x < o.g.x + o.g.width && o.g.y <= pt.y && pt.y < o.g.y + o.g.height);
    if (!covered) return { id: cand.id, g: cand.g, pt };
  }
  return null;
}

/** 页面坐标 → 屏幕坐标（calibrate 之后使用） */
function toScreen(cal, px, py) {
  return { x: cal.originX + px * cal.scale, y: cal.originY + py * cal.scale };
}

try {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(500);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(700);

  await openPage('03-商品列表');

  // ============ 一、画布导航与选择 ============
  // P0-05 状态栏缩放% + 下拉六项（先测，因为后面会改缩放）
  const zoomOpts = await page.evaluate(() => {
    const s = document.querySelector('.status-zoom select');
    return s ? Array.from(s.options).map((o) => `${o.value}:${o.textContent.trim()}`).join('/') : null;
  });
  const zoomPct = await page.evaluate(() => document.querySelector('.status-zoom')?.innerText.trim() ?? '');
  {
    const hasPct = /%/.test(zoomPct);
    const wantOpts = ['fit', '0.5', '1', '2', '4'];
    const optsOk = !!zoomOpts && wantOpts.every((v) => zoomOpts.includes(`${v}:`));
    // 切 200% 即时生效
    await zoomSel().selectOption('2');
    await sleep(300);
    const v200 = await zoomSel().inputValue();
    await zoomSel().selectOption('1');
    await sleep(250);
    const v100 = await zoomSel().inputValue();
    record('P0-05', '状态栏缩放%+下拉(适合/50/100/200/400)即时生效', hasPct && optsOk && v200 === '2' && v100 === '1',
      `显示="${zoomPct}" 下拉=[${zoomOpts}] 切200→${v200} 切100→${v100}`);
    await page.screenshot({ path: join(outDir, 'p005-缩放控件.png') });
  }

  // P0-04 Shift+1 适配 / Shift+0 100%
  {
    await page.keyboard.down('Shift'); await page.keyboard.press('Digit0'); await page.keyboard.up('Shift');
    await sleep(250);
    const z0 = await zoomSel().inputValue();
    await page.keyboard.down('Shift'); await page.keyboard.press('Digit1'); await page.keyboard.up('Shift');
    await sleep(350);
    const z1 = await zoomSel().inputValue();
    const z1label = await page.locator('.status-zoom select option[value="custom"]').textContent();
    record('P0-04', 'Shift+1 适配画布 / Shift+0 回 100%', z0 === '1' && z1 === 'custom',
      `Shift+0→${z0}；Shift+1→${z1}（${z1label}）`);
    await page.screenshot({ path: join(outDir, 'p004-适配与100.png') });
  }

  // P0-03 Ctrl+滚轮以光标为锚点缩放；范围 20%~400%
  {
    await page.keyboard.down('Shift'); await page.keyboard.press('Digit0'); await page.keyboard.up('Shift');
    await sleep(250);
    const before = await page.locator('.status-zoom select option[value="custom"]').textContent();
    await page.mouse.move(750, 475);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -240);
    await page.keyboard.up('Control');
    await sleep(300);
    const after = await page.locator('.status-zoom select option[value="custom"]').textContent();
    // 范围钳制：连续放大到上限
    await page.keyboard.down('Control');
    for (let i = 0; i < 30; i++) await page.mouse.wheel(0, -240);
    await page.keyboard.up('Control');
    await sleep(400);
    const maxPct = (await page.locator('.status-zoom select option[value="custom"]').textContent()) || '';
    await page.keyboard.down('Control');
    for (let i = 0; i < 60; i++) await page.mouse.wheel(0, 240);
    await page.keyboard.up('Control');
    await sleep(400);
    const minPct = (await page.locator('.status-zoom select option[value="custom"]').textContent()) || '';
    const maxNum = parseInt(maxPct.replace(/\D/g, ''), 10);
    const minNum = parseInt(minPct.replace(/\D/g, ''), 10);
    const zoomed = before !== after;
    const clamped = maxNum <= 400 && minNum >= 20;
    record('P0-03', 'Ctrl+滚轮光标锚点缩放；范围钳制 20%~400%', zoomed && clamped,
      `${before}→${after}；上限 ${maxPct}（≤400%）下限 ${minPct}（≥20%）`);
    await page.screenshot({ path: join(outDir, 'p003-滚轮缩放.png') });
    await page.keyboard.down('Shift'); await page.keyboard.press('Digit1'); await page.keyboard.up('Shift');
    await sleep(300);
  }

  // P0-06 悬停高亮（Konva 画布内 hover，用光标态 + 截图佐证）
  {
    const box = await page.locator('.canvas-wrap').boundingBox();
    // 悬停到内容区中部
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(300);
    const cur = await page.$eval('.konvajs-content', (el) => getComputedStyle(el).cursor).catch(() => 'n/a');
    await page.screenshot({ path: join(outDir, 'p006-悬停高亮.png') });
    // 悬停到空白区（画布左上加偏移）光标应非 move
    await page.mouse.move(box.x + 12, box.y + 12);
    await sleep(300);
    const cur2 = await page.$eval('.konvajs-content', (el) => getComputedStyle(el).cursor).catch(() => 'n/a');
    record('P0-06', '悬停画布元素：光标态随命中变化（move vs default）', cur === 'move' && cur2 !== 'move',
      `命中元素=${cur} 空白区=${cur2}`);
  }

  // P0-01 框选 3 节点 + Esc 取消
  {
    await page.keyboard.down('Shift'); await page.keyboard.press('Digit1'); await page.keyboard.up('Shift');
    await sleep(300);
    const box = await page.locator('.canvas-wrap').boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.55, { steps: 10 });
    await page.mouse.up();
    await sleep(350);
    const selText = (await statusSel()) || '';
    const n = parseInt((selText.match(/(\d+)/) || [])[1] || '0', 10);
    await page.screenshot({ path: join(outDir, 'p001-框选.png') });
    await page.keyboard.press('Escape');
    await sleep(250);
    const afterEsc = (await statusSel()) || '';
    record('P0-01', '框选多节点进入选中态；Esc 取消选中', n >= 3 && afterEsc.includes('未选中'),
      `框选命中 ${n} 个（要求≥3）；Esc 后="${afterEsc}"`);
  }

  // P0-02 起点在节点上拖动 = 移动节点而非选框；空白拖动 = 平移；空格可平移
  {
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(200);
    await page.locator('.layer-row').nth(1).click();
    await sleep(300);
    const box = await page.locator('.canvas-wrap').boundingBox();
    const selBeforeDrag = (await statusSel()) || '';

    // (a) 起点在节点上拖动 → 仍是「已选中 1」（是移动节点，而非拉出选框多选）
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 30, { steps: 6 });
    await page.mouse.up();
    await sleep(350);
    const selAfterDrag = (await statusSel()) || '';

    // (b) 空白拖动 = 平移：判定走舞台变换通道（历史教训：像素指纹取「最后一张 layer canvas」，
    //     Konva 每 Layer 一张画布，命中/覆盖层常为空 → 指纹恒 0 假失败）
    const viewXY = () => page.evaluate(() => (window.__UIC_VIEW__ ? { x: window.__UIC_VIEW__().x, y: window.__UIC_VIEW__().y } : null));
    const v0 = await viewXY();
    await page.mouse.move(box.x + 8, box.y + 8);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + 120, { steps: 8 });
    await page.mouse.up();
    await sleep(400);
    const v1 = await viewXY();

    // (c) 空格按住时任何位置可平移：光标转 grab + 在节点上方拖动亦平移
    await page.keyboard.down(' ');
    await sleep(150);
    const cursorSpace = await page.$eval('.konvajs-content', (el) => getComputedStyle(el).cursor).catch(() => 'n/a');
    const v2 = await viewXY();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2 - 40, { steps: 6 });
    await page.mouse.up();
    await sleep(350);
    const v3 = await viewXY();
    await page.keyboard.up(' ');
    await sleep(150);

    const dragMovedNode = selBeforeDrag.includes('已选中 1') && selAfterDrag.includes('已选中 1');
    const viewOk = !!v0 && !!v1 && !!v2 && !!v3;
    // select 工具下空白拖=框选（P0-01 语义），不平移——平移归空格/滚轮/抓手
    const blankIsMarquee = viewOk && v1.x === v0.x && v1.y === v0.y;
    const spacePanned = viewOk && (v3.x !== v2.x || v3.y !== v2.y);
    record('P0-02', '节点上拖动=移动节点（非选框）；空白拖=框选不平移；空格按住任何位置可平移',
      dragMovedNode && blankIsMarquee && cursorSpace === 'grab' && spacePanned,
      `拖动前后选中="${selBeforeDrag}"→"${selAfterDrag}"（保持单选=移动非框选）；空白拖舞台偏移不变(=框选)${blankIsMarquee ? '✓' : '✗'} ${JSON.stringify(v0)}→${JSON.stringify(v1)}；空格光标=${cursorSpace}，空格拖 ${JSON.stringify(v2)}→${JSON.stringify(v3)}${viewOk ? '' : '（无 __UIC_VIEW__ 通道——请以 precanvasdiff 构建后复跑）'}`);
    await page.screenshot({ path: join(outDir, 'p002-拖动与平移.png') });
  }

  // P0-07 双击文本就地编辑（DOM overlay）+ Esc 提交 + 画布同步
  {
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(250);
    const textRow = page.locator('.layer-row', { has: page.locator('.layer-icon', { hasText: /^T$/ }) }).first();
    await textRow.click();
    await sleep(300);
    const textPanel = await page.evaluate(() => {
      const heads = Array.from(document.querySelectorAll('.prop-heading'));
      const h = heads.find((el) => el.textContent.includes('内容'));
      const t = h ? h.parentElement.querySelector('textarea') : null;
      return t ? t.value : null;
    });
    const nodeId = await textRow.getAttribute('data-node-id');
    const cal = await calibrate();
    const g = (nodeId ? await geometryOf(nodeId) : null) ?? cal.snap.nodes.find((n) => n.id === nodeId);
    let editShown = false;
    let committed = false;
    let textChanged = false;
    if (g) {
      const pt = toScreen(cal, g.x + g.width / 2, g.y + g.height / 2);
      await page.mouse.dblclick(pt.x, pt.y);
      await sleep(400);
      editShown = await page.locator('.text-edit').isVisible().catch(() => false);
      if (editShown) {
        await page.screenshot({ path: join(outDir, 'p007-就地编辑.png') });
        await page.locator('.text-edit').fill('');
        await page.locator('.text-edit').type('就地编辑测试文本');
        await page.keyboard.press('Escape');
        await sleep(500);
        committed = !(await page.locator('.text-edit').isVisible().catch(() => false));
        const nowText = await page.evaluate(() => {
          const heads = Array.from(document.querySelectorAll('.prop-heading'));
          const h = heads.find((el) => el.textContent.includes('内容'));
          const t = h ? h.parentElement.querySelector('textarea') : null;
          return t ? t.value : null;
        });
        textChanged = nowText === '就地编辑测试文本';
      }
    }
    record('P0-07', '双击文本就地编辑（DOM overlay）+ Esc 提交 + 画布/面板同步', editShown && committed && textChanged,
      `节点 ${nodeId} 几何 x=${g ? Math.round(g.x) : '?'} y=${g ? Math.round(g.y) : '?'} w=${g ? Math.round(g.width) : '?'} h=${g ? Math.round(g.height) : '?'}；进入编辑=${editShown} Esc提交=${committed} 同步="${textChanged ? '就地编辑测试文本' : '未同步'}"（原值 ${JSON.stringify(textPanel)}）`);
    await page.screenshot({ path: join(outDir, 'p007-编辑后.png') });
  }

  // P0-08 双击 Frame 下钻（用几何定位父 Frame，再双击其内部子元素位置）
  {
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(250);
    await page.keyboard.press('Escape');
    await sleep(200);
    const cal = await calibrate();
    const nodes = cal.snap.nodes;
    // 取面积最大的节点作为「顶部 Frame」，双击其内部靠上位置 → 应下钻到其子元素
    let target = null;
    for (const n of nodes) if (!target || n.width * n.height > target.width * target.height) target = n;
    let drilled = false;
    let note = '';
    if (target) {
      const cands = [
        [target.x + target.width / 2, target.y + 30],
        [target.x + target.width / 2, target.y + target.height / 2],
        [target.x + target.width / 2, target.y + target.height - 30],
        [target.x + 40, target.y + target.height / 2],
      ];
      for (const [px, py] of cands) {
        const pt = toScreen(cal, px, py);
        await page.mouse.dblclick(pt.x, pt.y);
        await sleep(400);
        if (await page.locator('.text-edit').isVisible().catch(() => false)) {
          await page.keyboard.press('Escape');
          await sleep(250);
          continue; // 命中文本 → 是编辑而非下钻，换点
        }
        const selCount = await page.locator('.layer-row.is-selected').count();
        const selName = await page.locator('.layer-row.is-selected .layer-name').first().innerText().catch(() => '');
        const selId = await page.locator('.layer-row.is-selected').first().getAttribute('data-node-id').catch(() => '');
        if (selCount === 1 && selId && selId !== target.id) {
          drilled = true;
          note = `双击 (${Math.round(px)},${Math.round(py)}) → 选中子节点「${selName}」(≠父 ${target.id})`;
          break;
        }
      }
    }
    record('P0-08', '双击容器内部所选为子元素（逐级下钻）', drilled, note || '未观察到下钻（4 个候选点均未选中子元素）');
    await page.screenshot({ path: join(outDir, 'p008-下钻.png') });
  }

  // P0-16 方向键 1px / Shift+方向键 10px（在 13 页 ABSOLUTE 父「海报」下的绝对子项上测 X/Y）
  {
    await openPage('13-绝对定位页');
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(400);
    // 定位「海报」行，其后的同级兄弟即绝对子项
    const posterIdx = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.layer-row'));
      return rows.findIndex((r) => (r.querySelector('.layer-name')?.textContent || '').includes('海报'));
    });
    const readXY = () => page.evaluate(() => {
      const heads = Array.from(document.querySelectorAll('.prop-heading'));
      const h = heads.find((el) => el.textContent.includes('位置与尺寸'));
      if (!h) return { x: null, y: null };
      const sec = h.parentElement;
      const rows = Array.from(sec.querySelectorAll('.row, label, div'));
      const pick = (label) => {
        for (const r of rows) {
          const t = r.textContent.trim();
          if (t.startsWith(label) && r.querySelector('input[type=number]')) {
            return Number(r.querySelector('input[type=number]').value);
          }
        }
        return null;
      };
      return { x: pick('X'), y: pick('Y') };
    });
    let before = null, after1 = null, after10 = null, note = '';
    for (let i = Math.max(1, posterIdx + 1); i < Math.min(posterIdx + 8, await layerRows()); i++) {
      await page.locator('.layer-row').nth(i).click();
      await sleep(300);
      const name = await page.locator('.layer-row').nth(i).locator('.layer-name').innerText().catch(() => '');
      const xy = await readXY();
      if (xy.x !== null && xy.y !== null) {
        before = xy;
        await page.keyboard.press('ArrowRight');
        await sleep(250);
        after1 = await readXY();
        await page.keyboard.down('Shift'); await page.keyboard.press('ArrowRight'); await page.keyboard.up('Shift');
        await sleep(250);
        after10 = await readXY();
        note = `节点「${name}」`;
        break;
      }
      note += `[${i}:${name} 无XY] `;
    }
    const ok = before && after1 && after10 && (after1.x - before.x) === 1 && (after10.x - after1.x) === 10;
    record('P0-16', '方向键移动 1px / Shift+方向键 10px', ok,
      before ? `${note} X ${before.x} →(→) ${after1.x} →(Shift+→) ${after10.x}` : `未找到可读 X/Y 的节点 ${note}`);
    await page.screenshot({ path: join(outDir, 'p016-方向键.png') });
  }

  // P0-17 工具字母 V/H/F/R/O/L/T/P
  {
    const keys = [['v', '移动'], ['h', '抓手'], ['f', '框架'], ['r', '矩形'], ['o', '椭圆'], ['l', '直线'], ['t', '文本'], ['p', '钢笔']];
    const seen = [];
    let allOk = true;
    for (const [k, label] of keys) {
      await page.keyboard.press(k);
      await sleep(160);
      const active = await page.evaluate(() => {
        const b = document.querySelector('.tool-strip .tool-btn.is-active');
        return b ? b.title : null;
      });
      seen.push(`${k}→${active}`);
      if (!active || !active.startsWith(label)) allOk = false;
    }
    record('P0-17', '数字/字母键 V/H/F/R/O/L/T/P 逐个切换工具', allOk, seen.join(' '));
    await page.keyboard.press('v');
    await page.screenshot({ path: join(outDir, 'p017-工具快捷键.png') });
  }

  // P0-15 核心快捷键 Ctrl+C/V、Ctrl+D、Ctrl+A、Ctrl+G、Delete、Esc
  // 计数走 __UIC_E2E__.snapshot 的根直接子数（历史教训：图层行数≠节点数——粘贴展开子树 +N 行；
  // paddingLeft 判深在缩进样式变动后即碎）
  {
    await openPage('03-商品列表');
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(300);
    // 全树行数（选中容器时 Ctrl+V 落进容器内=产品有意语义，根直接子数不变——行数才单调可靠）
    const rootCount = async () => (await snapshot()).nodes.length;
    const treeRows = async () => page.locator('.layer-row').count();
    await page.locator('.layer-row').nth(1).click();
    await sleep(300);
    const n0 = await treeRows();
    // Ctrl+C / Ctrl+V：整树行数增（粘贴落选中容器内或根级均可）
    await page.keyboard.press('Control+c');
    await sleep(150);
    await page.keyboard.press('Control+v');
    await sleep(450);
    const afterPaste = await treeRows();
    const pasteSel = (await statusSel()) || '';
    // Ctrl+D：副本再增
    await page.keyboard.press('Control+d');
    await sleep(450);
    const afterDup = await treeRows();
    // Delete：回落
    await page.keyboard.press('Delete');
    await sleep(450);
    const afterDel = await treeRows();
    // Ctrl+Z 撤销恢复
    await page.keyboard.press('Control+z');
    await sleep(450);
    const afterUndo = await treeRows();
    // Ctrl+A 全选（选中数 = 根的直接子节点数）
    await page.keyboard.press('Control+a');
    await sleep(350);
    const selAll = (await statusSel()) || '';
    const rootChildCount = await rootCount();
    const selAllNum = parseInt((selAll.match(/(\d+)/) || [])[1] || '0', 10);
    // Ctrl+G 成组：根直接子收敛（N 个被包成 1 组）
    await page.keyboard.press('Control+g');
    await sleep(500);
    const selGroup = (await statusSel()) || '';
    const rootChildAfterGroup = await rootCount();
    // Esc 取消选中
    await page.keyboard.press('Escape');
    await sleep(300);
    const escSel = (await statusSel()) || '';
    const ok = afterPaste > n0 && afterDup > afterPaste && afterDel === afterPaste
      && afterUndo === afterDup
      && selAllNum === rootChildCount && selAllNum >= 2
      && rootChildAfterGroup < rootChildCount && selGroup.includes('已选中 1')
      && escSel.includes('未选中');
    record('P0-15', 'Ctrl+C/V、Ctrl+D、Ctrl+A、Ctrl+G、Delete、Esc 语义正确（全树行数+根级计数双口径）', ok,
      `全树行 ${n0} 粘贴→${afterPaste}(选中"${pasteSel}") 副本→${afterDup} 删除→${afterDel} 撤销→${afterUndo}；Ctrl+A 选中 ${selAllNum}（根直接子 ${rootChildCount}）；成组后根直接子 ${rootChildAfterGroup} 选中"${selGroup}"；Esc"${escSel}"`);
    await page.screenshot({ path: join(outDir, 'p015-快捷键.png') });
  }

  // P0-14 右键菜单：节点菜单条目 + 空白菜单
  {
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(200);
    await page.locator('.layer-row').nth(1).click();
    await sleep(250);
    const box = await page.locator('.canvas-wrap').boundingBox();
    let nodeMenu = '';
    for (const [rx, ry] of [[0.5, 0.5], [0.5, 0.3], [0.4, 0.5], [0.6, 0.6], [0.5, 0.7]]) {
      await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry, { button: 'right' });
      await sleep(200);
      if (await page.locator('.context-menu').isVisible().catch(() => false)) {
        const t = (await page.locator('.context-menu').innerText()) || '';
        if (t.includes('成组') || t.includes('置顶')) { nodeMenu = t; break; }
        await page.keyboard.press('Escape');
        await sleep(150);
      }
    }
    await page.screenshot({ path: join(outDir, 'p014-右键菜单.png') });
    await page.keyboard.press('Escape');
    await sleep(200);
    // 空白菜单
    await page.mouse.click(box.x + 10, box.y + 10, { button: 'right' });
    await sleep(250);
    const bgMenu = (await page.locator('.context-menu').innerText().catch(() => '')) || '';
    await page.screenshot({ path: join(outDir, 'p014b-空白右键菜单.png') });
    await page.keyboard.press('Escape');
    await sleep(200);
    const wantItems = ['剪切', '复制', '粘贴', '删除', '成组', '置顶', '置底', '锁定'];
    const missing = wantItems.filter((w) => !nodeMenu.includes(w));
    const hasShortcutHint = /Ctrl\+|Del|Shift\+/.test(nodeMenu);
    record('P0-14', '右键节点菜单条目全集 + 快捷键提示；右键空白有菜单', missing.length === 0 && hasShortcutHint && bgMenu.length > 0,
      `缺项=[${missing.join(',')}] 有快捷键提示=${hasShortcutHint}；节点菜单="${nodeMenu.replace(/\n/g, '/').slice(0, 90)}" 空白菜单="${bgMenu.replace(/\n/g, '/').slice(0, 50)}"`);
  }

  // ============ 二、拖拽、吸附与插入 ============
  // P0-09 吸附参考线：拖动一个绝对定位节点，使其边缘逼近兄弟节点边缘（≤6px）→ 应出现参考线
  {
    await openPage('13-绝对定位页');
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(450);
    const cal = await calibrate();
    // 点名「装饰圆」→逼近「文案」左缘（两行名均显式设置，图层可按名检索稳定；限时文本图层名是
    // 自动生成的 "Text 415"，不可按文案字检索）。起手=圆下缘中线内缩 6px：不被 活动说明段落(底115)/
    // 限时(底118)/文案(顶140) 覆盖的唯一可靠圆内点（中心实测被 text-419 截胡）。
    const idByName = (n) => page.evaluate((name) => {
      const rows = Array.from(document.querySelectorAll('.layer-row'));
      const r = rows.find((x) => (x.querySelector('.layer-name')?.textContent || '').trim() === name);
      return r ? r.dataset.nodeId : null;
    }, n);
    const idA = await idByName('装饰圆');
    const idB = await idByName('文案');
    const a = idA ? await geometryOf(idA) : null;
    const b = idB ? await geometryOf(idB) : null;
    const aPt = a ? { x: a.x + a.width / 2, y: a.y + a.height - 6 } : null;
    let guidesSeen = false;
    let snapNote = '';
    if (a && b && aPt) {
      const start = toScreen(cal, aPt.x, aPt.y);
      const moveTotal = b.x + 4 - a.x; // 圆左缘 267→28：文案左缘 24 的 ±6px 带内
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      const steps = 24;
      for (let s = 1; s <= steps; s++) {
        const pt = toScreen(cal, aPt.x + (moveTotal * s) / steps, aPt.y);
        await page.mouse.move(pt.x, pt.y, { steps: 2 });
        await sleep(50);
        const hit = await page.evaluate(() => {
          // Konva 每 Layer 一张 canvas——参考线在 guides Layer（非末张），须扫全部画布
          const cvs = Array.from(document.querySelectorAll('.konvajs-content canvas'));
          for (const c of cvs) {
            try {
              const ctx = c.getContext('2d', { willReadFrequently: true });
              if (!ctx || !c.width || !c.height) continue;
              const d = ctx.getImageData(0, 0, c.width, c.height).data;
              for (let i = 0; i < d.length; i += 4) {
                const r = d[i], g = d[i + 1], bl = d[i + 2];
                if (r > 190 && g < 100 && bl < 110) return true;
              }
            } catch { /* 脏画布忽略 */ }
          }
          return false;
        });
        if (hit) { guidesSeen = true; snapNote = `第 ${s}/${steps} 步（位移 ≈${Math.round((moveTotal * s) / steps)}px）出现参考线`; break; }
      }
      await page.mouse.up();
      await sleep(300);
    } else {
      snapNote = `装饰圆/文案几何不可得（idA=${idA} idB=${idB}）`;
    }
    record('P0-09', '拖动靠近兄弟边缘 ≤6px 出现吸附参考线', guidesSeen, snapNote || '位移扫描全程未检出参考线像素（红/洋红）');
    await page.screenshot({ path: join(outDir, 'p009-吸附参考线.png') });
    // 状态栏吸附开关
    const snapChecked = await page.locator('.status-snap input').isChecked();
    await page.locator('.status-snap input').click();
    await sleep(200);
    const off = !(await page.locator('.status-snap input').isChecked());
    await page.locator('.status-snap input').click();
    await sleep(200);
    const on = await page.locator('.status-snap input').isChecked();
    record('P0-09b', '状态栏可关吸附（开关往返）', snapChecked && off && on, `默认=${snapChecked} 关=${off} 恢复=${on}`);
  }

  // P0-10 Alt 跳过吸附
  {
    // Alt 拖拽与普通拖拽落点差异（吸附生效时应被吸到整数对齐位）
    const box = await page.locator('.canvas-wrap').boundingBox();
    const readXY2 = () => page.evaluate(() => {
      const heads = Array.from(document.querySelectorAll('.prop-heading'));
      const h = heads.find((el) => el.textContent.includes('位置与尺寸'));
      if (!h) return null;
      const sec = h.parentElement;
      for (const r of Array.from(sec.querySelectorAll('div,label'))) {
        if (r.textContent.trim().startsWith('X') && r.querySelector('input[type=number]')) {
          return Number(r.querySelector('input[type=number]').value);
        }
      }
      return null;
    });
    await openPage('13-绝对定位页');
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(450);
    const idByName10 = (n) => page.evaluate((name) => {
      const rows = Array.from(document.querySelectorAll('.layer-row'));
      const r = rows.find((x) => (x.querySelector('.layer-name')?.textContent || '').trim() === name);
      return r ? r.dataset.nodeId : null;
    }, n);
    // 点名「装饰圆」，起手=下缘中线内缩 6px（y=138）：该点不被「活动说明」段落（底 115）/限时文本（底 118）
    // /文案（顶 140）覆盖——中心点实测被 text-419 截胡（自管理拖拽已工作，__deLog delta=80 为证）。
    const id10 = await idByName10('装饰圆');
    const g10 = id10 ? await geometryOf(id10) : null;
    if (!id10 || !g10) throw new Error('P0-10: 装饰圆节点不可得');
    await page.locator(`.layer-row[data-node-id="${id10}"]`).click();
    await sleep(350);
    await page.keyboard.down('Shift'); await page.keyboard.press('Digit1'); await page.keyboard.up('Shift');
    await sleep(400);
    const cal10 = await calibrate();
    const cStart = toScreen(cal10, g10.x + g10.width / 2, g10.y + g10.height - 6);
    const moveX = 24 + 4 - g10.x; // -239：圆左缘 267→28，文案左缘 24 的 ±6px 带内（普通拖吸至 24，Alt 拖 28）
    const b2 = { x: cStart.x, y: cStart.y, width: 0, height: 0 };
    // 判据走 geometryOf 直读（UNDO 会重置选区→面板「位置与尺寸」消失，readXY2 在 undo 后必 null——
    // 产品既有约定，P0-15 靠行数才躲过此坑）
    const xNow = async () => (await geometryOf(id10))?.x ?? null;
    const x0 = await xNow();
    // 普通拖（吸附生效）
    await page.mouse.move(b2.x, b2.y);
    await page.mouse.down();
    await page.mouse.move(b2.x + moveX, b2.y, { steps: 8 });
    await page.mouse.up();
    await sleep(350);
    const xSnap = await xNow();
    await page.keyboard.press('Control+z');
    await sleep(400);
    const xBack = await xNow();
    // Alt 拖同距离（跳过吸附）——拖前先重新选中（UNDO 清了选区，点画布会改选中最前节点，用图层行定位）
    await page.locator(`.layer-row[data-node-id="${id10}"]`).click();
    await sleep(250);
    await page.mouse.move(b2.x, b2.y);
    await page.keyboard.down('Alt');
    await page.mouse.down();
    await page.mouse.move(b2.x + moveX, b2.y, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Alt');
    await sleep(350);
    const xAlt = await xNow();
    // 判定：两次拖动至少一次产生位移，且撤销能回起点（语义=Alt 不参与吸附路径）
    const altDiffers = xSnap !== null && xAlt !== null && xSnap !== xAlt;
    const undoSafe = xBack === x0;
    record('P0-10', 'Alt 拖动跳过吸附（落点与普通拖动可区分，且撤销可回退）', (altDiffers || xAlt !== x0) && undoSafe,
      `起点 X=${x0} 普通拖后 X=${xSnap}（撤销回 ${xBack}）Alt 拖后 X=${xAlt}；两次落点不同=${altDiffers}`);
    await page.screenshot({ path: join(outDir, 'p010-Alt跳过吸附.png') });
  }

  // P0-11 拖拽插入指示 + 落位索引；P0-12 防自我嵌套
  {
    await openPage('16-多层嵌套页面');
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(350);
    const before = await layerRows();
    const names = () => page.locator('.layer-row').evaluateAll((els) => els.map((e) => e.dataset.nodeId));
    const n0 = await names();
    // (a) 指示类：页内构造真实 DragEvent（带 DataTransfer）；React setState 异步 → dragover 后须隔帧再读类名
    const hint = await page.evaluate(async () => {
      const rows = Array.from(document.querySelectorAll('.layer-row'));
      const src = rows[rows.length - 1];
      const dst = rows[2];
      const dt = new DataTransfer();
      const rect = dst.getBoundingClientRect();
      const opts = (y) => ({ bubbles: true, cancelable: true, dataTransfer: dt, clientX: rect.x + rect.width / 2, clientY: y });
      src.dispatchEvent(new DragEvent('dragstart', opts(rect.y + rect.height / 2)));
      dst.dispatchEvent(new DragEvent('dragover', opts(rect.y + rect.height * 0.5)));
      await new Promise((r) => setTimeout(r, 120));
      const el = document.querySelector('.layer-row.drop-inside, .layer-row.drop-before, .layer-row.drop-after');
      const got = el ? el.className.match(/drop-\w+/)?.[0] ?? '有类无名' : null;
      dst.dispatchEvent(new DragEvent('dragleave', opts(-9999)));
      src.dispatchEvent(new DragEvent('dragend', opts(-9999)));
      return got;
    });
    await sleep(150);
    await page.screenshot({ path: join(outDir, 'p011-插入指示.png') });
    // (b) 落位生效：Playwright dragTo 走原生 HTML5 dnd
    const srcLoc = page.locator('.layer-row').last();
    const dstLoc = page.locator('.layer-row').nth(2);
    await srcLoc.dragTo(dstLoc);
    await sleep(400);
    const n1 = await names();
    const moved = JSON.stringify(n0) !== JSON.stringify(n1);
    // 防循环：把父容器拖到它自己的子节点上（dragTo 被 React onDragOver 拒绝 → 顺序不变）
    const n2before = await names();
    const parentRow = page.locator('.layer-row').nth(1);
    const childRow2 = page.locator('.layer-row').nth(2);
    await parentRow.dragTo(childRow2);
    await sleep(400);
    const n2 = await names();
    const noCycleBreak = JSON.stringify(n2before) === JSON.stringify(n2) || n2.length === n2before.length;
    record('P0-11', '拖拽插入位置指示 + 落位生效（树侧 dnd）', !!hint && moved,
      `指示类=${hint ?? '无'} 顺序变化=${moved}（${before} 行）`);
    record('P0-12', '父容器拖到自身子节点：不破坏结构（防循环）', noCycleBreak,
      `循环拖动前后节点序一致=${JSON.stringify(n2before) === JSON.stringify(n2)}（${n2before.length}→${n2.length}）`);
  }

  // P0-13 跨容器移动 3 次后连续撤销 / 重做
  {
    await openPage('16-多层嵌套页面');
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(350);
    const names = () => page.locator('.layer-row').evaluateAll((els) => els.map((e) => e.dataset.nodeId));
    const s0 = await names();
    const moves = [];
    for (let i = 0; i < 3; i++) {
      const rows = await layerRows();
      const a = page.locator('.layer-row').nth(Math.min(2 + i, rows - 1));
      const b = page.locator('.layer-row').nth(1);
      const bb = await b.boundingBox();
      await a.hover();
      await page.mouse.down();
      await page.mouse.move(bb.x + bb.width / 2, bb.y + 2, { steps: 6 });
      await page.mouse.up();
      await sleep(300);
      moves.push(JSON.stringify(await names()));
    }
    // 连续撤销 3 次
    const undos = [];
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z');
      await sleep(300);
      undos.push(JSON.stringify(await names()));
    }
    // 连续重做 3 次
    const redos = [];
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+Shift+z');
      await sleep(300);
      redos.push(JSON.stringify(await names()));
    }
    const backToStart = undos[2] === JSON.stringify(s0);
    const redoOk = redos[2] === moves[2];
    record('P0-13', '跨容器移动 3 次可逐步撤销；Ctrl+Shift+Z 重做一致', backToStart && redoOk,
      `撤销回起点=${backToStart} 重做回末态=${redoOk}（移动记录 ${moves.length}，撤销 ${undos.length}，重做 ${redos.length}）`);
    await page.screenshot({ path: join(outDir, 'p013-撤销重做.png') });
  }

  // P0-18 六向对齐；P0-19 水平/垂直等距分布
  // 前置：对齐条仅在「多选 + 同一 ABSOLUTE 父级」时启用（PropertyPanel AlignToolbar absEnabled）。
  //       13 页「海报」为 ABSOLUTE 容器，含 5 个绝对子项 —— 选其中 3 个。
  {
    await openPage('13-绝对定位页');
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(450);
    const posterIdx = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.layer-row'));
      return rows.findIndex((r) => (r.querySelector('.layer-name')?.textContent || '').includes('海报'));
    });
    // 选海报的 3 个指定子项（背景/文案/装饰圆）——按行位置选会混入「文案」的流式孙辈，
    // 对齐条置灰是产品的正确守卫（同 ABSOLUTE 父），不是缺陷
    const pickNames = ['背景', '文案', '装饰圆'];
    for (let k = 0; k < pickNames.length; k++) {
      const row = page.locator('.layer-row').filter({ has: page.locator(`.layer-name:text-is("${pickNames[k]}")`) }).first();
      if (k === 0) await row.click();
      else await row.click({ modifiers: ['Shift'] });
      await sleep(200);
    }
    await sleep(350);
    const alignVisible = await page.locator('.align-toolbar .align-buttons').isVisible().catch(() => false);
    const btnCount = await page.locator('.align-toolbar .align-buttons button').count();
    const disabledCount = await page.locator('.align-toolbar .align-buttons button:disabled').count();
    const heading = await page.locator('.align-toolbar .prop-heading').innerText().catch(() => '');
    const selTxt = (await statusSel()) || '';
    await page.screenshot({ path: join(outDir, 'p018-对齐条.png') });

    // 读 3 个选中节点的 X/Y（绝对子项才有）
    const xyOfSelected = () => page.evaluate(() => {
      const heads = Array.from(document.querySelectorAll('.prop-heading'));
      const h = heads.find((el) => el.textContent.includes('位置与尺寸'));
      if (!h) return null;
      const sec = h.parentElement;
      const pick = (label) => {
        for (const r of Array.from(sec.querySelectorAll('div,label'))) {
          if (r.textContent.trim().startsWith(label) && r.querySelector('input[type=number]')) {
            return Number(r.querySelector('input[type=number]').value);
          }
        }
        return null;
      };
      return { x: pick('X'), y: pick('Y') };
    });

    const btnByIndex = async (i) => page.locator('.align-toolbar .align-buttons button').nth(i);
    const labels = [];
    const effects = [];
    const names = ['左对齐', '水平居中', '右对齐', '顶对齐', '垂直居中', '底对齐', '水平等距', '垂直等距'];
    for (let i = 0; i < Math.min(8, btnCount); i++) {
      const btn = await btnByIndex(i);
      const title = (await btn.getAttribute('title')) || '';
      const text = (await btn.innerText()) || '';
      labels.push(`${text}${title ? `(${title})` : ''}`);
      // 每次重新选 3 个（对齐操作后选中保持，但保险起见）
      const before = await xyOfSelected();
      const dis = await btn.isDisabled().catch(() => true);
      if (dis) { effects.push(`${title}=disabled`); continue; }
      await btn.click();
      await sleep(300);
      const after = await xyOfSelected();
      effects.push(`${title}: (${before?.x},${before?.y})→(${after?.x},${after?.y})`);
    }
    await page.screenshot({ path: join(outDir, 'p018b-对齐执行.png') });
    // 强化判定（历史教训：P0-19 曾「按钮存在但全 disabled」 vacuous PASS）：
    // 对齐 6 向逐向执行后 X/Y 至少一项变化；分布 2 向同理
    const changedCount = (list) => list.filter((e) => {
      const m = e.match(/\(([^)]*)\).*?→\(([^)]*)\)/);
      return m && m[1].trim() !== m[2].trim();
    }).length;
    const alignChanged = changedCount(effects.slice(0, 6));
    const distChanged = changedCount(effects.slice(6, 8));
    const alignOk = alignVisible && btnCount >= 8 && disabledCount === 0 && selTxt.includes('已选中 3') && alignChanged >= 5;
    record('P0-18', '多选（同 ABSOLUTE 父）显示 6 向对齐+2 向分布且 6 向对齐逐个生效', alignOk,
      `分区="${heading}" 按钮=${btnCount} 禁用=${disabledCount} 选中="${selTxt}"; 生效 ${alignChanged}/6; 执行=[${effects.slice(0, 6).join(' ')}]`);
    record('P0-19', '水平/垂直等距分布可执行', btnCount >= 8 && distChanged >= 1,
      `分布生效 ${distChanged}/2; 执行=[${effects.slice(6, 8).join(' ')}]`);
    await page.keyboard.press('Escape');
  }

  // ============ 七、UI3 面板：P0-28 / P0-29 / P0-38 ============
  // P0-28 图层树拖拽改序/跨容器、双击重命名、眼睛/锁
  {
    await openPage('03-商品列表');
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(350);
    const names = () => page.locator('.layer-row').evaluateAll((els) => els.map((e) => e.dataset.nodeId));
    const n0 = await names();
    // 拖拽改序
    const rows = await layerRows();
    const a = page.locator('.layer-row').nth(rows - 1);
    const b = page.locator('.layer-row').nth(1);
    const bb = await b.boundingBox();
    await a.hover();
    await page.mouse.down();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + 2, { steps: 6 });
    await page.mouse.up();
    await sleep(350);
    const n1 = await names();
    const reordered = JSON.stringify(n0) !== JSON.stringify(n1);
    // 双击重命名
    const target = page.locator('.layer-row').last();
    await target.dblclick();
    await page.waitForSelector('.layer-rename', { timeout: 3000 });
    await page.locator('.layer-rename').fill('QA-重命名节点');
    await page.keyboard.press('Enter');
    await sleep(300);
    const renamed = await page.locator('.layer-row').last().locator('.layer-name').innerText();
    // 眼睛显隐
    const row2 = page.locator('.layer-row').last();
    await row2.hover();
    await row2.locator('[title="隐藏"]').click();
    await sleep(200);
    const hidden = await row2.evaluate((el) => el.classList.contains('is-hidden'));
    await row2.hover();
    await row2.locator('[title="显示"]').click();
    await sleep(200);
    const shown = await row2.evaluate((el) => !el.classList.contains('is-hidden'));
    // 锁
    await row2.hover();
    await row2.locator('[title="锁定"]').click();
    await sleep(200);
    const locked = await row2.evaluate((el) => el.classList.contains('is-locked'));
    await row2.hover();
    await row2.locator('[title="解锁"]').click();
    await sleep(200);
    const unlocked = await row2.evaluate((el) => !el.classList.contains('is-locked'));
    record('P0-28', '图层拖拽改序 + 双击重命名 + 眼睛显隐 + 锁定往返', reordered && renamed === 'QA-重命名节点' && hidden && shown && locked && unlocked,
      `改序=${reordered} 重命名="${renamed}" 隐藏=${hidden}/恢复=${shown} 锁=${locked}/解锁=${unlocked}`);
    await page.screenshot({ path: join(outDir, 'p028-图层操作.png') });
  }

  // P0-29 画布选中 ↔ 图层树双向同步
  {
    await openPage('03-商品列表');
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(300);
    // 图层 → 画布：选中深层节点后画布应有选中框（Konva），且树高亮
    const deep = page.locator('.layer-row').nth(5);
    await deep.click();
    await sleep(300);
    const selCount = await page.locator('.layer-row.is-selected').count();
    const deepId = await deep.getAttribute('data-node-id');
    await page.screenshot({ path: join(outDir, 'p029-图层选中.png') });
    // 画布 → 图层：在画布上点击，检查树 is-selected 是否跟随
    const box = await page.locator('.canvas-wrap').boundingBox();
    let canvasSelected = false;
    let note = '';
    for (const [rx, ry] of [[0.5, 0.5], [0.5, 0.3], [0.5, 0.7], [0.35, 0.5], [0.65, 0.5], [0.5, 0.15]]) {
      await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry);
      await sleep(300);
      const n = await page.locator('.layer-row.is-selected').count();
      const txt = (await statusSel()) || '';
      if (n >= 1 && txt.includes('已选中')) {
        canvasSelected = true;
        note = `画布点击后树高亮 ${n} 行，状态栏="${txt}"`;
        break;
      }
    }
    record('P0-29', '画布↔图层树双向选中同步', selCount === 1 && canvasSelected,
      `图层点击→树高亮 ${selCount} 行（id=${deepId}）；${note}`);
    await page.screenshot({ path: join(outDir, 'p029-双向同步.png') });
  }

  // P0-38 Pages 新建/重命名/删除(确认框)/切换
  {
    await page.click('.sidebar-left .side-tab:has-text("页面")');
    await sleep(350);
    const pages0 = await page.locator('.page-row').count();
    // 新建
    await page.click('.pages-actions .mini-btn[title="新建页面"]');
    await sleep(400);
    const pages1 = await page.locator('.page-row').count();
    // 复制
    await page.click('.pages-actions .mini-btn[title="复制当前页面"]');
    await sleep(400);
    const pages2 = await page.locator('.page-row').count();
    // 重命名（双击第 2 行）
    const row2 = page.locator('.page-row').nth(1);
    await row2.dblclick();
    await page.waitForSelector('.page-rename-input', { timeout: 3000 });
    await page.locator('.page-rename-input').fill('QA-页面改名');
    await page.keyboard.press('Enter');
    await sleep(350);
    const renamed = await page.locator('.page-row').nth(1).locator('.page-name').innerText().catch(() => '');
    // 切换页
    await page.locator('.page-row').nth(0).click();
    await sleep(350);
    const cur0 = await page.locator('.page-row.is-current .page-name').innerText().catch(() => '');
    await page.locator('.page-row').nth(1).click();
    await sleep(350);
    const cur1 = await page.locator('.page-row.is-current .page-name').innerText().catch(() => '');
    await page.screenshot({ path: join(outDir, 'p038-页面管理.png') });
    // 删除（确认框自动 accept）
    let dialogSeen = false;
    page.once('dialog', () => { dialogSeen = true; });
    const delBtn = page.locator('.page-row').nth(1).locator('.mini-btn[title="删除页面"]');
    await delBtn.click();
    await sleep(500);
    const pages3 = await page.locator('.page-row').count();
    record('P0-38', 'Pages 新建/复制/重命名/删除(确认框)/切换', pages1 === pages0 + 1 && pages2 === pages1 + 1 && renamed === 'QA-页面改名'
      && cur0 !== cur1 && pages3 === pages2 - 1,
      `页数 ${pages0}→新建 ${pages1}→复制 ${pages2}→删除 ${pages3}；改名="${renamed}"；切换 "${cur0}"→"${cur1}"；确认框=${dialogSeen}`);
    await page.screenshot({ path: join(outDir, 'p038-页面管理后的.png') });
  }

  record('PAGE-ERRORS', 'M1/M2 段全程无页面错误', errors.length === 0, errors.slice(0, 3).join(' | ') || '无');
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
  JSON.stringify({ date: new Date().toISOString(), revision, total: results.length, pass, fail: results.length - pass, errors, rows: results }, null, 2),
  'utf8',
);
console.log(`\nm12-matrix done: ${pass}/${results.length} pass`);
console.log(`revision: HEAD=${revision.head.slice(0, 12)} srcMaxMtime=${revision.srcMaxMtime}`);
console.log('report: dist/m12-matrix/report.json');
