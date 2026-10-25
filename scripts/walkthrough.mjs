import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// 痛点①演示：把「人工走查」用 Playwright 实际跑一遍并截图
// 覆盖：添加节点 / 图片 src 编辑 / Ctrl+C·V 粘贴 / Ctrl+Z 撤销 / Diff 明细 / 生成代码
const OUT = join(process.cwd(), 'dist', 'walkthrough');
mkdirSync(OUT, { recursive: true });

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

const log = { steps: [], layerCounts: {}, diffDetails: '', codeSnippet: '' };

function step(name, ok, note = '') {
  log.steps.push({ name, ok, note });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${note ? '  -- ' + note : ''}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('dialog', (d) => d.accept());

try {
  await page.goto('http://localhost:4173/');
  await page.waitForSelector('.editor', { timeout: 10000 });
  await sleep(400);
  await page.screenshot({ path: join(OUT, '01-初始状态.png') });
  step('打开编辑器', true);

  const fcPromise = page.waitForEvent('filechooser');
  await page.click('.menu-btn:has-text("文件")');
  await page.click('.menu-dropdown .menu-item:has-text("打开")');
  const fc = await fcPromise;
  await fc.setFiles(join(process.cwd(), 'dist', 'pages', '03-商品列表', 'page.json'));
  await sleep(600);
  await page.click('.side-tab:has-text("图层")');
  await sleep(200);
  const loadedRows = await page.locator('.layer-row').count();
  await page.screenshot({ path: join(OUT, '02-打开demo页.png') });
  step('打开 demo 页 03-商品列表', loadedRows >= 10, `图层行数=${loadedRows}`);

  await page.click('.side-tab:has-text("资产")');
  await page.click('[title="添加 框架"]');
  await page.click('[title="添加 文本"]');
  await page.click('[title="添加 按钮"]');
  await page.click('[title="添加 图片"]');
  await sleep(300);
  await page.click('.side-tab:has-text("图层")');
  await sleep(200);
  log.layerCounts.afterAdd = await page.locator('.layer-row').count();
  await page.screenshot({ path: join(OUT, '03-添加节点与图层树.png') });
  step('Palette 点击添加 Frame/Text/Button/Image', log.layerCounts.afterAdd > loadedRows, `图层行数 ${loadedRows} → ${log.layerCounts.afterAdd}`);

  await page.click('.side-tab:has-text("资产")');
  const srcInput = page.locator('.props input[placeholder^="图片 URL"]');
  await srcInput.waitFor({ timeout: 5000 });
  const dataUri =
    "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' rx='12' fill='%234f46e5'/%3E%3Ccircle cx='48' cy='40' r='16' fill='%23fff'/%3E%3Cpath d='M20 78 Q48 52 76 78' stroke='%23fff' stroke-width='6' fill='none'/%3E%3C/svg%3E";
  await srcInput.fill(dataUri);
  await page.click('.brand-name');
  await sleep(500);
  const srcValue = await srcInput.inputValue();
  await page.screenshot({ path: join(OUT, '04-图片src编辑.png') });
  step('属性面板输入图片 src', srcValue.startsWith('data:image/'), `src 长度=${srcValue.length}`);

  await page.click('.side-tab:has-text("图层")');
  await sleep(150);
  const beforePaste = await page.locator('.layer-row').count();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await sleep(300);
  const afterPaste = await page.locator('.layer-row').count();
  await page.screenshot({ path: join(OUT, '05-粘贴后.png') });
  step('Ctrl+C / Ctrl+V 粘贴', afterPaste > beforePaste, `图层 ${beforePaste} → ${afterPaste}`);

  await page.keyboard.press('Control+z');
  await sleep(300);
  const afterUndo = await page.locator('.layer-row').count();
  await page.screenshot({ path: join(OUT, '06-撤销粘贴.png') });
  step('Ctrl+Z 撤销', afterUndo === beforePaste, `图层 ${afterPaste} → ${afterUndo}`);

  // FR-14：工具轨拖画 Section（Page 顶层）与 Slice（虚线圈定框）——创建走查
  const beforeSS = await page.locator('.layer-row').count();
  const stageBox = await page.locator('.konvajs-content').boundingBox();
  await page.click('.tool-strip [title="分区"]');
  await page.mouse.move(stageBox.x + 140, stageBox.y + 140);
  await page.mouse.down();
  await page.mouse.move(stageBox.x + 340, stageBox.y + 300, { steps: 8 });
  await page.mouse.up();
  await sleep(300);
  await page.click('.tool-strip [title="切片"]');
  await page.mouse.move(stageBox.x + 380, stageBox.y + 160);
  await page.mouse.down();
  await page.mouse.move(stageBox.x + 500, stageBox.y + 260, { steps: 6 });
  await page.mouse.up();
  await sleep(300);
  await page.keyboard.press('Escape');
  await page.click('.side-tab:has-text("图层")');
  await sleep(200);
  const afterSS = await page.locator('.layer-row').count();
  const secRows = await page.locator('.layer-row:has-text("Section")').count();
  const sliceRows = await page.locator('.layer-row:has-text("Slice")').count();
  await page.screenshot({ path: join(OUT, '06b-Section与Slice创建.png') });
  step(
    '拖画创建 Section + Slice（FR-14）',
    afterSS >= beforeSS + 2 && secRows > 0 && sliceRows > 0,
    `图层 ${beforeSS} → ${afterSS}，Section=${secRows} Slice=${sliceRows}`,
  );

  // ── M7 W5 验收：AI 面板（§8 口径「未配 key 整体置灰」+ 风格包 3 选）──
  await page.click('.nav-btn[title="AI 生成"]');
  await page.waitForSelector('.ai-dock', { timeout: 5000 });
  await page.fill('.ai-prompt', '生成一个商品详情页，含大图、标题、价格和购买按钮');
  await sleep(200);
  const aiSetup = await page.locator('.ai-setup').count();
  const aiRunDisabled = await page.locator('.ai-run').isDisabled();
  // 面板有三个 select：供应商 / 风格包 / 模型档，按 title 精确定位，避免顺序变动导致误判
  const providerOptions = await page.locator('.ai-select[title]').first().evaluate((el) => el.options.length);
  const packOptions = await page
    .locator('.ai-select[title^="风格包"]')
    .evaluate((el) => el.options.length);
  const keyPersisted = await page.evaluate(() => localStorage.getItem('ui-compiler.ai.key'));
  await page.screenshot({ path: join(OUT, '06c-AI面板未配key.png') });
  step(
    'AI 面板：未配 key 整体置灰 + 供应商 ≥2 选（现 6 家）+ 风格包 3 选（M7 W5 / §8）',
    aiSetup > 0 && aiRunDisabled && providerOptions >= 2 && packOptions === 3 && keyPersisted === null,
    `配置区=${aiSetup} 填了提示词后生成按钮仍 disabled=${aiRunDisabled} 供应商选项=${providerOptions} 风格包选项=${packOptions} localStorage 无 key=${keyPersisted === null}`,
  );

  // ── M7 W2.5 验收：图标页签可搜可插（VECTOR 引用 path，不内联图片）──
  await page.click('.side-tab:has-text("图层")');
  await sleep(150);
  const beforeIcon = await page.locator('.layer-row').count();
  await page.click('.side-tab:has-text("资产")');
  await page.click('.assets-tab:has-text("图标")');
  await page.waitForSelector('.assets-icon-grid', { timeout: 15000 });
  const iconTotal = await page.locator('.assets-icon-cell').count();
  await page.fill('.assets-search', 'house');
  await sleep(300);
  await page.locator('.assets-icon-cell').first().click();
  await sleep(300);
  await page.screenshot({ path: join(OUT, '06d-图标搜索与插入.png') });
  await page.click('.side-tab:has-text("图层")');
  await sleep(200);
  const afterIcon = await page.locator('.layer-row').count();
  const iconRows = await page.locator('.layer-row:has-text("图标")').count();
  step(
    '图标页签：Lucide 全量可搜可插为 VECTOR（M7 W2.5）',
    iconTotal >= 40 && afterIcon === beforeIcon + 1 && iconRows > 0,
    `网格图标=${iconTotal} 搜 house 后点击插入；图层 ${beforeIcon} → ${afterIcon}，图标节点行=${iconRows}`,
  );
  await page.keyboard.press('Control+z');
  await sleep(250);

  await page.click('.toolbar button:has-text("像素比对")');
  await page.waitForSelector('.diff-modal .diff-details', { timeout: 20000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('.diff-modal .diff-number');
    return el && /%$/.test(el.textContent || '');
  }, { timeout: 20000 });
  await sleep(300);
  log.diffDetails = (await page.locator('.diff-modal .diff-details').innerText()) || '';
  await page.screenshot({ path: join(OUT, '07-Diff差异明细.png') });
  step('打开 Pixel Diff 查看差异明细', log.diffDetails.includes('差异明细'), log.diffDetails.split('\n')[0]);

  await page.click('.diff-modal .btn-ghost');
  await sleep(200);
  await page.click('.toolbar button:has-text("生成代码")');
  await page.waitForSelector('.code-modal .code-view', { timeout: 10000 });
  await sleep(300);
  log.codeSnippet = ((await page.locator('.code-modal .code-view').innerText()) || '').slice(0, 400);
  await page.screenshot({ path: join(OUT, '08-生成代码.png') });
  step('打开生成代码 Modal', log.codeSnippet.length > 0, `${log.codeSnippet.length} 字符`);

  /* --- `.fig` 产品入口（M5/M6 收尾）：把一次性探针变成常驻走查 ---
     放在最后并**先重载页面**：① 导入 `.fig` 会整体替换工程，前面基于 demo 工程的步骤必须先跑完；
     ② 重载顺便清掉上一步的代码 Modal，避免遮挡菜单。 */
  await page.goto('http://localhost:4173/');
  await page.waitForSelector('.editor', { timeout: 10000 });
  await sleep(400);
  await page.click('.menu-btn:has-text("文件")');
  await page.waitForSelector('.menu-dropdown', { timeout: 3000 });
  const figItems = await page
    .locator('.menu-dropdown .menu-item')
    .evaluateAll((els) => els.map((e) => ({ text: (e.textContent || '').trim(), disabled: /disabled/.test(e.className) })));
  const figImport = figItems.find((i) => i.text.includes('导入 Figma 文件'));
  const figExport = figItems.find((i) => i.text.includes('另存为 Figma 文件'));
  await page.screenshot({ path: join(OUT, '09-文件菜单-fig入口.png') });
  step(
    '文件菜单含 .fig 导入/另存两项且可点',
    Boolean(figImport && !figImport.disabled && figExport && !figExport.disabled),
    `导入=${figImport ? (figImport.disabled ? '置灰' : '可点') : '缺失'} 另存=${figExport ? (figExport.disabled ? '置灰' : '可点') : '缺失'}`,
  );

  // 切 tab 会把菜单关掉，所以「读菜单」和「点菜单项」要各自重新打开一次
  await page.keyboard.press('Escape');
  await page.click('.side-tab:has-text("页面")');
  await sleep(250);
  const pagesBefore = await page.locator('.page-row').count();
  const figChooser = page.waitForEvent('filechooser');
  await page.click('.menu-btn:has-text("文件")');
  await page.waitForSelector('.menu-dropdown', { timeout: 3000 });
  await page.click('.menu-dropdown .menu-item:has-text("导入 Figma 文件")');
  await (await figChooser).setFiles(join(process.cwd(), 'tests', 'fixtures', 'fig', 'slots.fig'));
  await sleep(2500);
  // 页面面板与图层面板是同一块区域的两个 tab，分开点：页面数从「页面」看，图层数从「图层」看
  await page.click('.side-tab:has-text("页面")');
  await sleep(300);
  const pagesAfter = await page.locator('.page-row').count();
  const figPageNames = await page.locator('.page-row').allInnerTexts();
  await page.screenshot({ path: join(OUT, '10-导入fig后-页面.png') });
  await page.click('.side-tab:has-text("图层")');
  await sleep(300);
  const figLayers = await page.locator('.layer-row').count();
  await page.screenshot({ path: join(OUT, '10-导入fig后-图层.png') });
  step(
    '导入 slots.fig：页/图层/画布都有内容',
    pagesAfter >= 2 && figLayers > 0,
    `页面 ${pagesBefore} → ${pagesAfter}（${figPageNames.map((t) => t.trim().split('\n')[0]).join(' / ')}）图层 ${figLayers}`,
  );

  // 另存回 `.fig`：走真实下载链路（blob → download），验产物非空
  const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
  await page.click('.menu-btn:has-text("文件")');
  await page.click('.menu-dropdown .menu-item:has-text("另存为 Figma 文件")');
  const download = await downloadPromise;
  const savedName = download.suggestedFilename();
  const savedPath = join(OUT, savedName);
  await download.saveAs(savedPath);
  const savedSize = statSync(savedPath).size;
  step('另存为 .fig：下载到非空文件', /\.fig$/i.test(savedName) && savedSize > 1000, `${savedName} ${savedSize} B`);
} catch (e) {
  step('走查中断', false, e instanceof Error ? e.message : String(e));
  await page.screenshot({ path: join(OUT, '99-异常现场.png') }).catch(() => {});
}

await browser.close();
server.kill();

writeFileSync(join(OUT, 'walkthrough-log.json'), JSON.stringify(log, null, 2), 'utf8');
const failed = log.steps.filter((s) => !s.ok);
console.log(`\nwalkthrough: ${log.steps.length - failed.length}/${log.steps.length} pass`);
if (failed.length) process.exitCode = 1;
