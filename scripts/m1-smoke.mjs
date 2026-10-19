import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

// M1 画布手感冒烟：状态栏缩放、快捷键、空格平移、框选、右键菜单、成组/撤销
// 与 tests/m1-canvas.test.ts（纯逻辑）互补；结论写入 dist/walkthrough/m1-smoke.json（UTF-8，可直接读）
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

const canvasCursor = () =>
  page.$eval('.konvajs-content', (el) => getComputedStyle(el).cursor).catch(() => 'n/a');
const statusSel = () => page.locator('.status-sel').textContent();

try {
  await page.goto('http://localhost:4173/');
  await page.waitForSelector('.editor', { timeout: 10000 });
  await sleep(400);

  // 打开 demo 页 03（有真实子节点，供框选/成组）
  const fcPromise = page.waitForEvent('filechooser');
  await page.click('.menu-btn:has-text("文件")');
  await page.click('.menu-dropdown .menu-item:has-text("打开")');
  const fc = await fcPromise;
  await fc.setFiles('dist/pages/03-商品列表/page.json');
  await page.waitForTimeout(600);
  await page.click('.side-tab:has-text("图层")');
  await sleep(200);
  const layerRows = await page.locator('.layer-row').count();
  step('打开 demo 页 03（图层行）', layerRows >= 10, `rows=${layerRows}`);

  // 状态栏存在
  step('状态栏渲染', await page.locator('.canvas-status').isVisible());
  const snapChecked = await page.locator('.status-snap input').isChecked();
  step('吸附开关默认开启', snapChecked);

  const zoomSel = page.locator('.status-zoom select');
  const customLabel = () => page.locator('.status-zoom select option[value="custom"]').textContent();

  // Shift+0 → 100%
  await page.keyboard.down('Shift');
  await page.keyboard.press('Digit0');
  await page.keyboard.up('Shift');
  step('Shift+0 缩放到 100%', (await zoomSel.inputValue()) === '1');

  // Shift+1 → 适合画布（自定义百分比）
  await page.keyboard.down('Shift');
  await page.keyboard.press('Digit1');
  await page.keyboard.up('Shift');
  const fitValue = await zoomSel.inputValue();
  const fitLabel = await customLabel();
  step('Shift+1 适合画布', fitValue === 'custom', `label=${fitLabel}`);

  // Ctrl+滚轮 → 以光标锚点缩放（百分比变化）
  await page.mouse.move(750, 475);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -120);
  await page.keyboard.up('Control');
  const afterWheel = await customLabel();
  step('Ctrl+滚轮缩放', afterWheel !== fitLabel, `${fitLabel} -> ${afterWheel}`);

  // 普通滚轮 = 平移（不崩）
  await page.mouse.wheel(0, 120);
  step('滚轮平移不报错', true);

  // 工具字母 + 空格光标（computed cursor，含继承）
  await page.keyboard.press('h');
  await sleep(120);
  const cursorHand = await canvasCursor();
  step('H 切换抓手工具（光标 grab）', cursorHand === 'grab', cursorHand);
  await page.keyboard.press('v');
  await sleep(80);
  const cursorSelect = await canvasCursor();
  step('V 切回选择工具', cursorSelect !== 'grab', cursorSelect);
  await page.keyboard.down(' ');
  await sleep(120);
  const cursorSpace = await canvasCursor();
  step('按住空格进入平移（光标 grab）', cursorSpace === 'grab', cursorSpace);
  await page.keyboard.up(' ');
  await sleep(80);
  const cursorUp = await canvasCursor();
  step('松开空格恢复', cursorUp !== 'grab', cursorUp);

  // Ctrl+A 全选 → 状态栏计数
  await page.keyboard.press('Control+a');
  await sleep(120);
  const selText = (await statusSel()) || '';
  step('Ctrl+A 全选', selText.includes('已选中'), selText);

  // 方向键微调（流式父级无操作，但不得报错）
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  step('方向键微调不报错', true);

  // Ctrl+G 成组 → 选中新 frame（已选中 1）
  await page.keyboard.press('Control+g');
  await sleep(150);
  const groupSel = (await statusSel()) || '';
  step('Ctrl+G 成组并选中新 frame', groupSel.includes('已选中 1'), groupSel);

  // Ctrl+Z 撤销成组 → 选中清空
  await page.keyboard.press('Control+z');
  await sleep(150);
  const undoSel = (await statusSel()) || '';
  step('Ctrl+Z 撤销成组', undoSel.includes('未选中'), undoSel);

  // 框选：先 Shift+1 适配（保证根画布四边 ≥48px 空白），从 canvas-wrap 左上角外空白处拖入内容区
  await page.keyboard.down('Shift');
  await page.keyboard.press('Digit1');
  await page.keyboard.up('Shift');
  await sleep(120);
  const box = await page.locator('.canvas-wrap').boundingBox();
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 8 });
  await page.mouse.up();
  await sleep(150);
  const marqueeSel = (await statusSel()) || '';
  step('拖拽框选多个节点', marqueeSel.includes('已选中'), marqueeSel);

  // 右键菜单：在若干点尝试，命中子节点即出现节点菜单（成组/删除）
  let menuText = '';
  let nodeMenu = false;
  const tryPoints = [
    [400, 300],
    [600, 400],
    [300, 500],
    [700, 250],
    [250, 650],
  ];
  for (const [x, y] of tryPoints) {
    await page.mouse.click(x, y, { button: 'right' });
    await sleep(120);
    if (await page.locator('.context-menu').isVisible()) {
      menuText = (await page.locator('.context-menu').textContent()) || '';
      if (menuText.includes('成组')) {
        nodeMenu = true;
        break;
      }
      await page.keyboard.press('Escape');
      await sleep(80);
    }
  }
  step('右键打开菜单', menuText.length > 0, menuText.slice(0, 40));
  step('节点菜单含成组/删除', nodeMenu && menuText.includes('删除'), nodeMenu ? 'node-menu' : 'bg-menu');
  if (await page.locator('.context-menu').isVisible()) {
    await page.keyboard.press('Escape');
    await sleep(120);
  }
  step('Esc 关闭菜单', !(await page.locator('.context-menu').isVisible()));

  // Esc 反选
  await page.keyboard.press('Escape');
  await sleep(120);
  const escSel = (await statusSel()) || '';
  step('Esc 取消选择', escSel.includes('未选中'), escSel);

  // 吸附开关可切换
  await page.locator('.status-snap input').click();
  const toggled = !(await page.locator('.status-snap input').isChecked());
  step('吸附开关可切换', toggled);
  await page.locator('.status-snap input').click();

  step('无页面错误', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  step('执行异常', false, e instanceof Error ? e.message : String(e));
} finally {
  await browser.close();
  server.kill();
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  writeFileSync(
    'dist/walkthrough/m1-smoke.json',
    JSON.stringify({ pass, fail, results, errors }, null, 2),
    'utf8',
  );
  console.log(`\nsmoke: ${pass} ok / ${fail} fail`);
  process.exit(fail ? 1 : 0);
}
