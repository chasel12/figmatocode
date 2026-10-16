import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

// M2 界面复刻冒烟：三栏/菜单栏/工具条/页面页签/Frame 预设与拖画/图层树（改名·显隐·拖拽）/主题切换/对齐条
// 与 tests/m2-store.test.ts（纯逻辑）互补；结论写入 dist/walkthrough/m2-smoke.json（UTF-8）
mkdirSync('dist/walkthrough', { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn('npm', ['run', 'preview', '--', '--port', '4173', '--strictPort'], {
  shell: true,
  stdio: 'ignore',
});

let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  try {
    const r = await fetch('http://localhost:4173/');
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

const results = [];
function step(name, ok, note = '') {
  results.push({ name, ok, note });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${note ? '  -- ' + note : ''}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('dialog', (d) => d.accept().catch(() => {}));

const layerCount = () => page.locator('.layer-row').count();
const layerNames = () => page.locator('.layer-row').evaluateAll((els) => els.map((e) => e.dataset.nodeId));

try {
  await page.goto('http://localhost:4173/');
  await page.waitForSelector('.editor', { timeout: 10000 });

  // 1) 三栏结构 + 占位/禁用（FR-24、FR-27，P0-24/25）
  const menubar = await page.locator('.menubar .menu-btn').count();
  const tools = await page.locator('.tool-strip .tool-btn').count();
  const leftTabs = await page.locator('.sidebar-left .side-tab').allInnerTexts();
  const rightTabs = await page.locator('.sidebar-right .side-tab').allInnerTexts();
  step(
    '三栏 + 菜单栏 + 工具条结构',
    menubar === 7 && tools === 13 && leftTabs.join(',') === '页面,图层,资产' && rightTabs.join(',') === 'Design,Prototype',
    `menu=${menubar} tools=${tools} left=${leftTabs.join('/')} right=${rightTabs.join('/')}`,
  );
  // 断言报备：FR-40 落地后 Prototype tab 已启用（原为占位禁用），故本步改为
  // 「分享仍占位禁用 + Prototype 已启用且可切换」。步数不变（27）。
  step(
    '占位禁用：分享（Prototype 已启用）',
    (await page.locator('.toolbar button:has-text("分享")').isDisabled()) &&
      !(await page.locator('.sidebar-right .side-tab:has-text("Prototype")').isDisabled()),
  );

  // 1b) 7 菜单全集 + Help 快捷键面板（FR-33 / FR-9）
  const menuTexts = await page.locator('.menubar .menu-btn').allInnerTexts();
  step(
    '7 菜单全集（File/Edit/View/Object/Text/Plugins/Help）',
    ['File', 'Edit', 'View', 'Object', 'Text', 'Plugins', 'Help'].every((m) => menuTexts.includes(m)),
    menuTexts.join('/'),
  );
  await page.keyboard.press('Control+Shift+?');
  await sleep(150);
  const dialogVisible = await page.locator('.shortcuts-dialog').isVisible();
  const shortcutRows = await page.locator('.shortcuts-row').count();
  step('快捷键面板 Ctrl+Shift+? 打开（布局表渲染）', dialogVisible && shortcutRows >= 25, `rows=${shortcutRows}`);
  await page.keyboard.press('Escape');
  await sleep(120);
  step('Esc 关闭快捷键面板', !(await page.locator('.shortcuts-dialog').isVisible()));
  await page.click('.menu-btn:has-text("Plugins")');
  const pluginDisabled = await page.locator('.menu-dropdown .menu-item:disabled').count();
  const pluginNote = await page.locator('.menu-dropdown .menu-item:disabled').first().getAttribute('title');
  step('Plugins 菜单整组置灰 + tooltip 标注', pluginDisabled === 3 && !!pluginNote, `disabled=${pluginDisabled}, note=${pluginNote}`);
  await page.keyboard.press('Escape');

  // 2) File 菜单：打开/合起/禁用项（FR-25；FR-24 起「导出所选」启用，禁用项仅剩导入占位 ≥1）
  await page.click('.menu-btn:has-text("File")');
  const menuVisible = await page.locator('.menu-dropdown').isVisible();
  const items = await page.locator('.menu-dropdown .menu-item').allInnerTexts();
  const disabledItems = await page.locator('.menu-dropdown .menu-item:disabled').count();
  step(
    'File 菜单：项 + 禁用项标注',
    menuVisible && items.some((t) => t.includes('打开')) && disabledItems >= 1 && items.some((t) => t.includes('导出所选')),
    `${items.length} 项 / ${disabledItems} 禁用`,
  );
  await page.keyboard.press('Escape');
  await sleep(80);
  step('Esc 关闭菜单', !(await page.locator('.menu-dropdown').isVisible()));

  // 3) 左栏三页签轮换 + 页面列表（FR-25）
  await page.click('.sidebar-left .side-tab:has-text("页面")');
  await page.click('.page-more');
  await sleep(80);
  const pageRows = await page.locator('.page-row').count();
  step('页面页签：demo 页列表', pageRows >= 10, `rows=${pageRows}`);
  await page.click('.sidebar-left .side-tab:has-text("资产")');
  step('资产页签：Palette 可见', await page.locator('.palette-grid').isVisible());
  await page.click('.sidebar-left .side-tab:has-text("图层")');
  await sleep(80);

  // 4) 打开 demo 页 03（真实子节点）
  const fcPromise = page.waitForEvent('filechooser');
  await page.click('.menu-btn:has-text("File")');
  await page.click('.menu-dropdown .menu-item:has-text("打开")');
  const fc = await fcPromise;
  await fc.setFiles('dist/pages/03-商品列表/page.json');
  await page.waitForTimeout(600);
  const baseRows = await layerCount();
  step('打开 demo 页 03', baseRows >= 10, `rows=${baseRows}`);

  // 5) 工具切换（FR-27）：点 Frame 工具 → active 高亮
  await page.click('.tool-btn[title^="Frame"]');
  await sleep(80);
  const frameActive = await page.locator('.tool-btn[title^="Frame"]').evaluate((el) => el.classList.contains('is-active'));
  step('工具条切换 Frame（is-active）', frameActive);

  // 6) Frame 预设 iPhone SE 375×667（P0-20）
  const presetsVisible = await page.locator('.frame-presets .preset-grid').isVisible();
  const presetBtns = await page.locator('.preset-grid button').count();
  step('Frame 预设网格可见', presetsVisible && presetBtns === 4, `presets=${presetBtns}`);
  await page.click('.preset-grid button[title^="iPhone SE"]');
  await sleep(150);
  const afterPreset = await layerCount();
  const seName = await page.locator('.layer-row').last().locator('.layer-name').innerText();
  step('预设创建 iPhone SE（+1 层）', afterPreset === baseRows + 1 && seName.includes('iPhone SE'), `${baseRows} → ${afterPreset}, name=${seName}`);

  // 7) 画布拖画创建（FR-14 / P0-20）
  await page.click('.tool-btn[title^="Frame"]');
  await sleep(60);
  const box = await page.locator('.canvas-wrap').boundingBox();
  const sx = box.x + box.width * 0.55;
  const sy = box.y + box.height * 0.3;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 140, sy + 90, { steps: 6 });
  await page.mouse.up();
  await sleep(200);
  const afterDraw = await layerCount();
  step('画布拖画创建 Frame', afterDraw === afterPreset + 1, `${afterPreset} → ${afterDraw}`);
  await page.keyboard.press('v'); // 回选择工具

  // 7b) 矩形拖画创建（FR-16 / P0-22）
  await page.click('.tool-btn[title^="矩形"]');
  await sleep(60);
  const rx = box.x + box.width * 0.58;
  const ry = box.y + box.height * 0.58;
  await page.mouse.move(rx, ry);
  await page.mouse.down();
  await page.mouse.move(rx + 110, ry + 70, { steps: 5 });
  await page.mouse.up();
  await sleep(200);
  const afterRect = await layerCount();
  step('画布拖画创建 Rectangle', afterRect === afterDraw + 1, `${afterDraw} → ${afterRect}`);
  await page.keyboard.press('v');

  // 7c) 文本单击创建 + 即进入编辑态（FR-15 / P0-21）
  await page.click('.tool-btn[title^="文本"]');
  await sleep(60);
  await page.mouse.click(box.x + box.width * 0.86, box.y + box.height * 0.78);
  await sleep(200);
  const editVisible = await page.locator('.text-edit').isVisible();
  const afterText = await layerCount();
  step('文本单击创建 + 进入编辑态', editVisible && afterText === afterRect + 1, `${afterRect} → ${afterText}, edit=${editVisible}`);
  await page.keyboard.type('创建文本');
  await page.keyboard.press('Escape');
  await sleep(150);
  const textCommitted = !(await page.locator('.text-edit').isVisible());
  step('文本输入提交（Escape 退出编辑态）', textCommitted);
  await page.keyboard.press('v');

  // 7d) 椭圆拖画创建（FR-16 / P0-22）
  await page.click('.tool-btn[title^="椭圆"]');
  await sleep(60);
  await page.mouse.move(box.x + box.width * 0.32, box.y + box.height * 0.72);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.32 + 90, box.y + box.height * 0.72 + 60, { steps: 5 });
  await page.mouse.up();
  await sleep(200);
  const afterOval = await layerCount();
  step('画布拖画创建 Oval', afterOval === afterText + 1, `${afterText} → ${afterOval}`);
  await page.keyboard.press('v');

  // 7e) 直线拖画创建（FR-16 / P0-22）
  await page.click('.tool-btn[title^="直线"]');
  await sleep(60);
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.82);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6 + 120, box.y + box.height * 0.82 + 40, { steps: 5 });
  await page.mouse.up();
  await sleep(200);
  const afterLine = await layerCount();
  const lineName = await page.locator('.layer-name').filter({ hasText: 'Line' }).last().innerText();
  step('画布拖画创建 Line（斜角）', afterLine === afterOval + 1 && lineName.includes('Line'), `${afterOval} → ${afterLine}, name=${lineName}`);
  await page.keyboard.press('v');

  // 8) 图层双击改名（FR-29）
  const targetRow = page.locator('.layer-row').last();
  await targetRow.dblclick();
  await page.waitForSelector('.layer-rename', { timeout: 3000 });
  await page.locator('.layer-rename').fill('改名测试节点');
  await page.keyboard.press('Enter');
  await sleep(120);
  const renamed = await page.locator('.layer-row').last().locator('.layer-name').innerText();
  step('图层双击改名', renamed === '改名测试节点', renamed);

  // 9) 眼睛显隐（FR-29）
  const row2 = page.locator('.layer-row').last();
  await row2.hover();
  await row2.locator('[title="隐藏"]').click();
  await sleep(80);
  const hiddenNow = await row2.evaluate((el) => el.classList.contains('is-hidden'));
  await row2.hover();
  await row2.locator('[title="显示"]').click();
  await sleep(80);
  const shownAgain = await row2.evaluate((el) => !el.classList.contains('is-hidden'));
  step('图层眼睛显隐切换', hiddenNow && shownAgain, `hidden=${hiddenNow} restored=${shownAgain}`);

  // 10) 图层拖拽重排（FR-29 dnd）
  const before = await layerNames();
  const dragRow = page.locator('.layer-row').last();
  const dropRow = page.locator('.layer-row').nth(1);
  await dragRow.dragTo(dropRow);
  await sleep(200);
  const after = await layerNames();
  const changed = JSON.stringify(before) !== JSON.stringify(after);
  step('图层拖拽重排', changed, changed ? '顺序已变化' : '顺序未变化');

  // 11) 多选 → 对齐条（FR-10 / P0-01 几何上下文）
  await page.click('.canvas-wrap', { position: { x: 30, y: 30 } });
  await page.keyboard.press('Control+a');
  await sleep(150);
  const alignVisible = await page.locator('.align-toolbar .align-buttons').isVisible();
  const alignBtns = await page.locator('.align-toolbar .align-buttons button').count();
  step('多选显示对齐/分布条', alignVisible && alignBtns >= 8, `buttons=${alignBtns}`);
  await page.keyboard.press('Escape');

  // 12) 主题切换往返（FR-24）
  const bgBefore = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.click('.btn-theme');
  await sleep(120);
  const themeAttr = await page.evaluate(() => document.documentElement.dataset.theme);
  const bgLight = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const persisted = await page.evaluate(() => localStorage.getItem('ui-compiler.theme'));
  step('切换浅色主题', themeAttr === 'light' && bgLight !== bgBefore && persisted === 'light', `bg ${bgBefore} → ${bgLight}`);
  await page.click('.btn-theme');
  await sleep(120);
  const themeBack = await page.evaluate(() => document.documentElement.dataset.theme);
  step('切回深色主题', themeBack === 'dark', themeBack);

  step('无页面错误', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  step('执行异常', false, e instanceof Error ? e.message : String(e));
} finally {
  await browser.close();
  server.kill();
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  writeFileSync(
    'dist/walkthrough/m2-smoke.json',
    JSON.stringify({ pass, fail, results, errors }, null, 2),
    'utf8',
  );
  console.log(`\nsmoke: ${pass} ok / ${fail} fail`);
  process.exit(fail ? 1 : 0);
}
