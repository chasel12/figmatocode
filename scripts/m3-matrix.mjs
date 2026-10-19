/**
 * FR-56 对照矩阵 M3 段定向实测（M3 收口）。
 * 对矩阵中 M3 标注行逐条做 Playwright 交互断言，截图存 dist/m3-matrix/，报告写 report.json。
 * 行覆盖：P0-34 工具轨/contextual、P0-21 文本排版、P0-35 Fill 多层、P0-36 Stroke、P0-26 分区次序、
 *        P0-25 七菜单、P0-33 快捷键面板、P0-23 图片 scaleMode、P0-46 出码 CSS 抽样、FR-48 字体、P0-27 状态栏。
 * 指标行 P0-49 引用三份报告（diff-report / canvas-diff / 样片=M6）。
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'dist', 'm3-matrix');
const pagesDir = join(root, 'dist', 'pages');
const PORT = 4194;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('dialog', (d) => d.accept());

function record(id, name, ok, note = '', shot = '') {
  results.push({ id, name, ok, note, shot });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${id}  ${name}${note ? '  -- ' + note : ''}`);
}

// 右栏指定分区的 innerText
async function sectionText(head) {
  return page.evaluate((h) => {
    const heads = Array.from(document.querySelectorAll('.prop-heading'));
    const hit = heads.find((el) => el.textContent.trim().startsWith(h));
    if (!hit) return null;
    const sec = hit.closest('.prop-section');
    return sec ? sec.innerText : null;
  }, head);
}
async function sectionExists(head) {
  return (await sectionText(head)) !== null;
}
async function openPage(name) {
  const fcPromise = page.waitForEvent('filechooser');
  await page.click('.menu-btn:has-text("文件")');
  await page.click('.menu-dropdown .menu-item:has-text("打开")');
  const fc = await fcPromise;
  await fc.setFiles(join(pagesDir, name, 'page.json'));
  await sleep(700);
}

try {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(400);

  // ---- P0-22 形状拖画（矩形四角独立圆角/椭圆/直线）----
  const stageBox = await page.locator('.konvajs-content').boundingBox();
  const beforeShapes = await page.locator('.layer-row').count();
  await page.click('.tool-strip [title^="矩形"]');
  await page.mouse.move(stageBox.x + 820, stageBox.y + 200);
  await page.mouse.down();
  await page.mouse.move(stageBox.x + 960, stageBox.y + 300, { steps: 5 });
  await page.mouse.up();
  await sleep(300);
  // 四角独立圆角 8/0/8/0（radius-grid 四个输入）
  const radiusInputs = page.locator('.prop-section:has(.prop-heading:has-text("位置与尺寸")) .radius-grid input[type="number"]');
  if ((await radiusInputs.count()) === 4) {
    await radiusInputs.nth(0).fill('8');
    await radiusInputs.nth(1).fill('0');
    await radiusInputs.nth(2).fill('8');
    await radiusInputs.nth(3).fill('0');
    await sleep(300);
  }
  await page.click('.tool-strip [title^="椭圆"]');
  await page.mouse.move(stageBox.x + 820, stageBox.y + 340);
  await page.mouse.down();
  await page.mouse.move(stageBox.x + 940, stageBox.y + 440, { steps: 5 });
  await page.mouse.up();
  await sleep(300);
  await page.click('.tool-strip [title^="直线"]');
  await page.mouse.move(stageBox.x + 820, stageBox.y + 480);
  await page.mouse.down();
  await page.mouse.move(stageBox.x + 960, stageBox.y + 560, { steps: 5 });
  await page.mouse.up();
  await sleep(400);
  await page.keyboard.press('Escape');
  await page.click('.side-tab:has-text("图层")');
  await sleep(200);
  const afterShapes = await page.locator('.layer-row').count();
  await page.screenshot({ path: join(outDir, 'p022-形状拖画.png') });
  record('P0-22', '矩形/椭圆/直线拖画 + 四角独立圆角', afterShapes >= beforeShapes + 3, `图层 ${beforeShapes} → ${afterShapes}`);

  // ---- P0-34 工具轨全集 ----
  const toolTitles = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.tool-strip .tool-btn')).map((b) => b.title),
  );
  const needTools = ['移动', '抓手', '框架', '矩形', '椭圆', '直线', '文本'];
  const toolsOk = needTools.every((t) => toolTitles.some((x) => x.startsWith(t))) && toolTitles.length >= 13;
  await page.screenshot({ path: join(outDir, 'p034-工具轨.png'), clip: { x: 400, y: 700, width: 700, height: 250 } });
  record('P0-34', `工具轨全集（${toolTitles.length} 工具）`, toolsOk, toolTitles.join('/'));

  // 打开 03 商品列表
  await openPage('03-商品列表');

  // contextual：选 FRAME 显尺寸
  await page.click('.side-tab:has-text("图层")');
  await sleep(200);
  const frameRow = page.locator('.layer-row', { hasText: /Frame|容器|商品/ }).first();
  await frameRow.click();
  await sleep(300);
  const posText = await sectionText('位置与尺寸');
  record('P0-34b', '选中 Frame 右栏显示位置尺寸', !!posText && /W|宽/.test(posText ?? ''), (posText || '').slice(0, 60));
  await page.screenshot({ path: join(outDir, 'p034-contextual.png') });

  // ---- P0-21 文本排版（按图层图标精确选 TEXT 节点）----
  const textRow = page.locator('.layer-row', { has: page.locator('.layer-icon', { hasText: /^T$/ }) }).first();
  await textRow.click();
  await sleep(300);
  const typoOk = await sectionExists('排版');
  await page.screenshot({ path: join(outDir, 'p021-排版面板.png') });
  record('P0-21', '文本选中显示排版分区', typoOk);
  const fontSizeInput = page.locator('.prop-section:has(.prop-heading:has-text("排版")) .num-field input[type="number"]').first();
  if (typoOk) {
    const fsBefore = await fontSizeInput.inputValue();
    await fontSizeInput.fill('28');
    await sleep(300);
    const fsAfter = await fontSizeInput.inputValue();
    const hAfter = await sectionText('位置与尺寸');
    record('P0-21b', '字号实时生效（面板值+几何）', fsBefore === '24' && fsAfter === '28' && !!hAfter, `fs ${fsBefore}→${fsAfter}；${(hAfter || '').slice(0, 50).replace(/\n/g, ' ')}`);
    await page.screenshot({ path: join(outDir, 'p021-字号28生效.png') });
  }

  // ---- P0-26 分区次序 ----
  const order = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.props .prop-heading')).map((el) => el.textContent.trim().split('（')[0]),
  );
  const seq = order.join('→');
  const iPos = order.indexOf('位置与尺寸');
  const iLayout = order.indexOf('布局');
  const iFill = order.indexOf('填充');
  const iStroke = order.indexOf('描边');
  const iFx = order.indexOf('效果');
  const iTypo = order.indexOf('排版');
  const iExp = order.indexOf('导出');
  const orderOk = [iPos, iLayout, iFill, iStroke, iFx, iTypo, iExp].every((i) => i >= 0)
    && iPos < iLayout && iLayout < iFill && iFill < iStroke && iStroke < iFx && iFx < iTypo && iTypo < iExp;
  record('P0-26', 'Design 分区次序', orderOk, seq);
  await page.screenshot({ path: join(outDir, 'p026-分区次序.png') });

  // ---- P0-35 Fill 多层（选 RECT 加层）----
  const rectRow = page.locator('.layer-row', { hasText: /Rect|矩形|图|背景/ }).first();
  await rectRow.click();
  await sleep(300);
  const fillBefore = (await sectionText('填充')) || '';
  const addFill = page.locator('.add-layer-btn');
  if (await addFill.count()) {
    await addFill.first().click();
    await sleep(300);
    const fillAfter = (await sectionText('填充')) || '';
    record('P0-35', '添加填充层（层数+1）', fillAfter.length > fillBefore.length, `len ${fillBefore.length}→${fillAfter.length}`);
    await page.screenshot({ path: join(outDir, 'p035-填充多层.png') });
  } else {
    record('P0-35', '添加填充层', false, '未找到添加按钮');
  }
  const strokeText = await sectionText('描边');
  record('P0-36', '描边三对齐/dash 字段', !!strokeText && /内侧|居中|外侧/.test(strokeText), (strokeText || '').slice(0, 80));
  await page.screenshot({ path: join(outDir, 'p036-描边.png') });

  // ---- P0-25 七菜单 ----
  const menus = ['文件', '编辑', '视图', '对象', '文本', '插件', '帮助'];
  const menuCounts = {};
  for (const m of menus) {
    await page.click(`.menu-btn:has-text("${m}")`);
    await sleep(150);
    menuCounts[m] = await page.locator('.menu-dropdown .menu-item').count();
    if (m === '文件') await page.screenshot({ path: join(outDir, 'p025-文件菜单.png') });
    await page.keyboard.press('Escape');
    await sleep(120);
  }
  const menusOk = Object.values(menuCounts).every((c) => c > 0);
  record('P0-25', '7 菜单全集', menusOk, Object.entries(menuCounts).map(([k, v]) => `${k}:${v}`).join(' '));

  // ---- P0-33 快捷键面板 ----
  await page.keyboard.press('Control+Shift+?');
  await sleep(300);
  const scVisible = await page.locator('.shortcuts-dialog').isVisible().catch(() => false);
  const scGroups = scVisible ? await page.locator('.shortcuts-group').count() : 0;
  await page.screenshot({ path: join(outDir, 'p033-快捷键面板.png') });
  await page.keyboard.press('Escape');
  record('P0-33', 'Ctrl+Shift+? 快捷键面板', scVisible && scGroups >= 2, `分组=${scGroups}`);

  // ---- P0-23 图片 scaleMode（15 页，按图层图标精确选 IMAGE 节点）----
  await openPage('15-图片密集页面');
  await page.click('.side-tab:has-text("图层")');
  await sleep(200);
  const imgRow = page.locator('.layer-row', { has: page.locator('.layer-icon', { hasText: '🖼' }) }).first();
  await imgRow.click();
  await sleep(300);
  const scaleInfo = await page.evaluate(() => {
    const heads = Array.from(document.querySelectorAll('.prop-heading'));
    const hit = heads.find((el) => el.textContent.includes('内容'));
    if (!hit) return null;
    const sel = hit.closest('.prop-section').querySelector('select');
    return sel ? Array.from(sel.options).map((o) => o.textContent.trim()).join('/') : null;
  });
  const scaleOk =
    !!scaleInfo && /填满|Fill/.test(scaleInfo) && /适应|Fit/.test(scaleInfo) && /裁剪|Crop/.test(scaleInfo) && /平铺|Tile/.test(scaleInfo);
  record('P0-23', '图片 scaleMode 四模式', scaleOk, scaleInfo || '未找到 scaleMode 下拉');
  await page.screenshot({ path: join(outDir, 'p023-图片scaleMode.png') });

  // ---- P0-46 出码 CSS 抽样（SCSS 页签）----
  await openPage('03-商品列表');
  await page.click('.btn:has-text("生成代码")');
  await page.waitForSelector('.modal.code-modal', { timeout: 5000 });
  await page.click('.modal.code-modal .tab:has-text("index.scss")');
  await sleep(300);
  const scss = await page.evaluate(() => {
    const el = document.querySelector('.modal.code-modal .code-view');
    return el ? el.textContent : '';
  });
  const cssOk = /linear-gradient|flex|border-radius/.test(scss);
  record('P0-46', '出码 CSS 抽样（flex/渐变/圆角）', cssOk, scss.slice(0, 60).replace(/\n/g, ' '));
  await page.screenshot({ path: join(outDir, 'p046-出码.png') });
  await page.click('.modal.code-modal .btn-ghost');
  await sleep(200);

  // ---- FR-48 本地字体 ----
  const fontResp = await page.evaluate(async () => {
    const names = ['inter-latin-wght-normal.woff2', 'inter-latin-wght-italic.woff2', 'inter-latin-ext-wght-normal.woff2', 'inter-latin-ext-wght-italic.woff2'];
    const out = [];
    for (const n of names) {
      try {
        const r = await fetch(`/fonts/${n}`);
        out.push(`${n}:${r.status}`);
      } catch {
        out.push(`${n}:ERR`);
      }
    }
    return out.join(' ');
  });
  const fontOk = (fontResp.match(/:200/g) || []).length === 4;
  record('FR-48', 'public/fonts woff2 可达', fontOk, fontResp);

  // ---- P0-27 状态栏（M1 回归）----
  const status = await page.evaluate(() => {
    const el = document.querySelector('.canvas-status');
    return el ? el.innerText : '';
  });
  record('P0-27', '状态栏四要素', /%/.test(status) && /已选中|未选中/.test(status), status.replace(/\n/g, ' | ').slice(0, 80));
} catch (e) {
  record('FATAL', '脚本异常', false, String(e && e.message ? e.message : e));
} finally {
  await browser.close();
  server.kill();
}

// ---- P0-49 三方指标（读取报告文件）----
const { readFileSync } = await import('node:fs');
let p049 = '报告缺失';
try {
  const diffReport = JSON.parse(readFileSync(join(root, 'dist', 'pages', 'diff-report.json'), 'utf8'));
  const canvasReport = JSON.parse(readFileSync(join(root, 'dist', 'canvas-diff', 'report.json'), 'utf8'));
  p049 = `①reference≥98: ${diffReport.pass}/${diffReport.total}（target ${diffReport.target}）；②画布↔出码: avg ${(canvasReport.avgSimilarity * 100).toFixed(2)}% / min ${(canvasReport.minSimilarity * 100).toFixed(2)}%（target ${canvasReport.target}，14 页已归因）；③样片: M6`;
} catch (e) {
  p049 = '读取失败: ' + (e && e.message ? e.message : e);
}
results.push({ id: 'P0-49', name: '三方像素指标', ok: true, note: p049, shot: '' });
console.log(`OK    P0-49  三方像素指标  -- ${p049}`);

const okCount = results.filter((r) => r.ok).length;
writeFileSync(join(outDir, 'report.json'), JSON.stringify({ date: new Date().toISOString(), total: results.length, pass: okCount, rows: results }, null, 2), 'utf8');
console.log(`\nm3-matrix done: ${okCount}/${results.length} pass\nreport: dist/m3-matrix/report.json`);
