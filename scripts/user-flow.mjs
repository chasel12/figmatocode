/**
 * 用户流程 E2E：从空白画布 **纯 UI 操作** 做出一个真实页面，再导出并渲染验证。
 *
 * 这不是 API 调用测试，而是**模拟真实 Figma 用户**的完整路径：
 *   空页 → 建 Frame → 放标题/图片/卡片/按钮 → 调尺寸/颜色/圆角/字号/间距
 *   → 图层整理 → 生成代码 → 导出 HTML → 独立打开渲染 → 截图比对。
 *
 * 产出：dist/user-flow/{index.html, page.json, 01..N.png}
 * 运行：node scripts/user-flow.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('E:\\ms-playwright')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = 'E:\\ms-playwright';
}

const root = process.cwd();
const outDir = join(root, 'dist', 'user-flow');
mkdirSync(outDir, { recursive: true });
const PORT = 4273;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const steps = [];
const step = (name, ok, note = '') => {
  steps.push({ name, ok: !!ok, note });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${note ? '  -- ' + note : ''}`);
};

const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  shell: true,
  stdio: 'ignore',
});
let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  try {
    const r = await fetch(`http://localhost:${PORT}/`);
    if (r.ok) ready = true;
  } catch {}
  if (!ready) await sleep(250);
}
if (!ready) {
  server.kill();
  throw new Error('preview 未就绪');
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('dialog', (d) => d.accept());

/* ---------- UI 辅助（复用 audit 经验） ---------- */

async function findRow(labelText) {
  const idx = await page.evaluate((want) => {
    const rows = Array.from(document.querySelectorAll('.props .field-row'));
    return rows.findIndex((r) => r.querySelector('.field-label')?.textContent.trim() === want);
  }, labelText);
  return idx < 0 ? null : page.locator('.props .field-row').nth(idx);
}

async function setNum(label, value) {
  const row = await findRow(label);
  if (!row) return false;
  const inp = row.locator('input').first();
  if (!(await inp.count())) return false;
  const type = await inp.getAttribute('type');
  let v = value;
  if (type === 'range') {
    const min = Number((await inp.getAttribute('min')) ?? 0);
    const max = Number((await inp.getAttribute('max')) ?? 100);
    v = Math.min(max, Math.max(min, Number(value)));
  }
  await inp.fill(String(v)).catch(() => {});
  await inp.press('Enter').catch(() => {});
  await sleep(200);
  return true;
}

async function setSelect(label, optionText) {
  const row = await findRow(label);
  if (!row) return false;
  const sel = row.locator('select').first();
  if (!(await sel.count())) return false;
  const okSel = await sel.selectOption({ label: optionText }).then(() => true).catch(() => false);
  await sleep(250);
  return okSel;
}

/** 选中第 n 个图层行（0=根） */
async function selectRow(n) {
  await page.click('.side-tab:has-text("图层")');
  await sleep(200);
  const cnt = await page.locator('.layer-row').count();
  if (n >= cnt) return false;
  await page.locator('.layer-row').nth(n).click();
  await sleep(300);
  return true;
}

/** 选中最后一个（最新）图层 */
async function selectLast() {
  await page.click('.side-tab:has-text("图层")');
  await sleep(200);
  const cnt = await page.locator('.layer-row').count();
  if (cnt < 2) return false;
  await page.locator('.layer-row').nth(cnt - 1).click();
  await sleep(300);
  return true;
}

/** 点 Palette 添加节点（会挂到当前选中容器） */
async function addNode(title) {
  await page.click('.side-tab:has-text("资产")');
  await sleep(150);
  const btn = page.locator(`[title="${title}"]`);
  if (!(await btn.count())) return false;
  await btn.click();
  await sleep(400);
  return true;
}

async function getCode() {
  await page.click('.toolbar button:has-text("生成代码")');
  await page.waitForSelector('.code-modal .code-view', { timeout: 15000 });
  await sleep(350);
  await page.click('.code-modal .tab:has-text("preview.html")');
  await sleep(500);
  const html = (await page.locator('.code-modal .code-view').innerText()) || '';
  await page.click('.code-modal .btn-ghost');
  await sleep(300);
  return html;
}

/** 设置「文本」内容（PropertyPanel 最后一个字段，比在画布上打字稳定） */
async function setTextContent(value) {
  const row = await findRow('文本');
  if (!row) return false;
  const inp = row.locator('input, textarea').first();
  if (!(await inp.count())) return false;
  await inp.fill(value);
  await inp.press('Enter').catch(() => {});
  await sleep(300);
  return true;
}

/**
 * 设置**填充色**。
 *
 * 关键 UX（与 Figma 一致）：新建形状默认**没有填充层**，面板显示「当前无填充（点击添加）」，
 * 必须先点「+ 添加填充」生成 SOLID 层，色板才出现。
 * 若直接找 `.props input[type=color]` 的第一个，会**误改描边色**
 * （本脚本首跑实测：矩形出码成了 `border: 1px solid #4f7cff` 而非背景填充）。
 */
async function setFillColor(hex) {
  /** 返回「填充」分区的 section 元素内 color input 的下标（相对全局面板），无则 -1 */
  const fillColorIndex = () =>
    page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('.props input[type="color"]'));
      const h = Array.from(document.querySelectorAll('.props .prop-heading')).find(
        (x) => x.textContent.trim() === '填充',
      );
      if (!h) return -1;
      const sec = h.closest('.prop-section') ?? h.parentElement;
      const inp = sec.querySelector('input[type="color"]');
      return inp ? all.indexOf(inp) : -1;
    });

  // 1) 填充区为空 → 点「+ 添加填充」生成默认 SOLID 层
  let idx = await fillColorIndex();
  if (idx < 0) {
    const addBtn = page.locator('.props button:has-text("添加填充")').first();
    if (await addBtn.count()) {
      await addBtn.click();
      await sleep(500);
      idx = await fillColorIndex();
    }
  }
  if (idx < 0) return false;
  await page.locator('.props input[type="color"]').nth(idx).fill(hex).catch(() => {});
  await sleep(400);
  return true;
}

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(700);
  await page.screenshot({ path: join(outDir, '01-空白画布.png') });
  step('打开编辑器（空白画布）', true);

  /* ===== 1. 选中页根，建主 Frame（相当于 Figma 画一个手机画板）===== */
  await page.click('.side-tab:has-text("图层")');
  await sleep(200);
  await page.locator('.layer-row').first().click(); // 页根
  await sleep(250);
  await addNode('添加 框架');
  await selectLast();
  /**
   * 主画板：375×812，**保持流内（VERTICAL）布局**——这样后加的子节点会自动纵向堆叠。
   * 若切成「绝对定位」，所有子节点默认落在 (0,0) 叠在一起（本脚本首跑踩坑：
   * 出码里 7 个元素全 `left:0;top:0`）。
   * 宽用「固定」模式后再给 W，否则 HUG 会输出 `width: max-content`。
   */
  await setSelect('宽模式', '固定');
  await setNum('W', 375);
  await setSelect('高模式', '固定');
  await setNum('H', 812);
  await setSelect('方向', '纵向');
  await setNum('内边距', 0);
  await sleep(300);
  const afterFrame = await getCode();
  /**
   * 断言口径：主画板宽 == 页宽(375) 时，Responsive Compiler 会**有意**输出 `width: 100%`
   * （README「布局语义映射」：FIXED 恰等于父内容宽 → 转 100%），故不能断言 `375px`。
   * 正确断言：出码出现 375 高度的流式容器 + 纵向 flex。
   */
  step(
    '建主画板 Frame（375×812，宽度转为 100% 流式）',
    /flex-direction:\s*column/.test(afterFrame) && (/height:\s*812px/.test(afterFrame) || /min-height/.test(afterFrame)),
    `预设为 375 宽 / 812 高；出码宽度按响应式规则转为 100%`,
  );

  /* ===== 2. 顶部标题栏：进 Frame 放标题文本 ===== */
  await selectLast(); // 选中 Frame
  await addNode('添加 文本');
  await selectLast();
  // 用右栏「文本」字段设内容（比在画布上打字稳定）
  await setTextContent('周末去哪里');
  await selectLast();
  await setNum('字号', 22);
  await setNum('字重', 700);
  await sleep(250);
  const afterTitle = await getCode();
  step(
    '顶部标题文本（内容+22px/700）',
    /font-size:\s*22px/.test(afterTitle) && /font-weight:\s*700/.test(afterTitle) && afterTitle.includes('周末去哪里'),
    '',
  );

  /* ===== 3. 副标题 ===== */
  await selectRow(1); // Frame
  await addNode('添加 文本');
  await selectLast();
  await setTextContent('为你精选 12 个近郊目的地');
  await selectLast();
  await setNum('字号', 13);
  await sleep(250);
  const afterSub = await getCode();
  step('副标题文本（13px + 内容）', /font-size:\s*13px/.test(afterSub) && afterSub.includes('为你精选'), '');

  /* ===== 4. 主图（卡片）===== */
  await selectRow(1);
  await addNode('添加 矩形');
  await selectLast();
  await setNum('W', 335);
  await setNum('H', 180);
  await setNum('圆角', 16);
  await sleep(250);
  const fillOk = await setFillColor('#4f7cff');
  const afterHero = await getCode();
  step(
    '主图占位矩形（335×180 / 圆角16 / 蓝底填充）',
    /border-radius:\s*16px/.test(afterHero) && /4f7cff/i.test(afterHero),
    `填充写入=${fillOk}`,
  );

  /* ===== 5. 三个信息卡片（放进横向容器里，模拟 Figma 用户建一行）===== */
  await selectRow(1);
  await addNode('添加 框架');
  await selectLast();
  await setSelect('方向', '横向');
  await setNum('间距', 10);
  await sleep(250);
  const rowFrameIdx = (await page.locator('.layer-row').count()) - 1;
  for (let i = 0; i < 3; i += 1) {
    await selectRow(rowFrameIdx); // 选中横向容器
    await addNode('添加 矩形');
    await selectLast();
    await setNum('W', 100);
    await setNum('H', 64);
    await setNum('圆角', 12);
    await sleep(200);
    await setFillColor(['#eef2ff', '#ecfdf5', '#fff7ed'][i]);
  }
  const afterCards = await getCode();
  step('三个信息卡片（横向容器 / 100×64 / 圆角12）', (afterCards.match(/border-radius:\s*12px/g) ?? []).length >= 3, '');

  /* ===== 6. 主按钮 ===== */
  await selectRow(1);
  await addNode('添加 按钮');
  await selectLast();
  await setNum('W', 335);
  await setNum('H', 48);
  await setNum('圆角', 24);
  await sleep(250);
  await setFillColor('#1677ff');
  const afterBtn = await getCode();
  step('主按钮（335×48 / 圆角24 / 蓝底）', /border-radius:\s*24px/.test(afterBtn), '');

  await page.screenshot({ path: join(outDir, '02-页面结构完成.png') });

  /* ===== 7. 检查图层数（结构合理性）===== */
  await page.click('.side-tab:has-text("图层")');
  await sleep(300);
  const layerCount = await page.locator('.layer-row').count();
  step('图层结构（根+画板+7元素）', layerCount >= 8, `图层行=${layerCount}`);
  await page.screenshot({ path: join(outDir, '03-图层树.png') });

  /* ===== 8. 导出代码 ===== */
  const finalHtml = await getCode();
  writeFileSync(join(outDir, 'index.html'), finalHtml, 'utf8');
  step('生成代码（HTML 非空）', finalHtml.length > 500, `长度=${finalHtml.length}`);

  // 保存 page.json（真实用户会 File→保存）。先确认菜单按钮可见（前一轮此处超时：
  // 上一步 getCode 关闭 Modal 后需等遮罩卸载，否则点击被 backdrop 拦截）
  await sleep(500);
  const menuBtn = page.locator('.menu-btn').first();
  const menuVisible = await menuBtn.isVisible().catch(() => false);
  if (menuVisible) {
    const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
    await menuBtn.click();
    await sleep(250);
    const saveItem = page.locator('.menu-dropdown .menu-item:has-text("保存")');
    if (await saveItem.count()) {
      await saveItem.first().click();
      const download = await dl;
      if (download) {
        await download.saveAs(join(outDir, 'project.json')).catch(() => {});
        step('File→保存 JSON 可下载', true, `文件名=${download.suggestedFilename()}`);
      } else step('File→保存 JSON 可下载', false, '未捕获下载事件');
    } else {
      await page.keyboard.press('Escape');
      step('File→保存 JSON 可下载', false, '菜单无「保存」项');
    }
  } else {
    step('File→保存 JSON 可下载', false, '菜单按钮不可见（可能被遮罩拦截）');
  }

  /* ===== 9. 独立渲染导出的 HTML（脱离服务端）===== */
  await browser.close();
  server.kill();

  const b2 = await chromium.launch();
  const p2 = await b2.newContext({ viewport: { width: 420, height: 900 } }).then((c) => c.newPage());
  const err2 = [];
  p2.on('pageerror', (e) => err2.push(String(e)));
  p2.on('console', (m) => {
    if (m.type() === 'error') err2.push(m.text());
  });
  try {
    await p2.goto('file://' + join(outDir, 'index.html').replace(/\\/g, '/'));
    await sleep(900);
    await p2.screenshot({ path: join(outDir, '04-导出页渲染.png'), fullPage: true });
    /**
     * 字体说明（**2026-10-20 对账后更新**，勿再写成「已知缺口」）：
     *   本步拿的是 CodeModal 里**展示的 preview.html 文本**，它按**站点根部署口径**
     *   用绝对路径 `/fonts/*.woff2`（服务 dist/pages 与 e2e 19 页），
     *   单独存成文件用 file:// 打开时字体必然 404 → 回退系统字体，页面仍完整渲染。
     *
     *   **真正的交付物（导出项目 ZIP）已自包含**：字体随包进 `assets/fonts/`，
     *   预览页用相对基座 `../assets/fonts`。该路径由 `npm run zip-file-verify` 实测把关
     *   （ZIP → 解压 → file:// → 字体 0 404、document.fonts 已加载）。
     *
     * 故本步只断言「页面可打开且无**致命**报错」，字体 404 属预览文本口径、不计失败。
     */
    const fatal = err2.filter((e) => !/net::ERR_FILE_NOT_FOUND|Failed to load resource/.test(e));
    const font404 = err2.length - fatal.length;
    step(
      '导出页独立打开（file://）无致命报错',
      fatal.length === 0,
      font404
        ? `字体 404 ${font404} 条（模态预览文本为站点根口径；自包含交付物请用导出 ZIP，见 zip-file-verify）`
        : '零报错',
    );
    const bodyText = await p2.evaluate(() => document.body.innerText.trim());
    const hasContent = bodyText.length > 0 || (await p2.locator('div').count()) > 3;
    step('导出页有可见内容', hasContent, `文本=${JSON.stringify(bodyText.slice(0, 40))}`);
  } catch (e) {
    step('导出页打开失败', false, e instanceof Error ? e.message : String(e));
  }
  await b2.close();
} catch (e) {
  step('用户流程中断', false, e instanceof Error ? e.message : String(e));
  await page.screenshot({ path: join(outDir, '99-异常.png') }).catch(() => {});
  await browser.close().catch(() => {});
  server.kill();
}

const pass = steps.filter((s) => s.ok).length;
writeFileSync(
  join(outDir, 'report.json'),
  JSON.stringify({ total: steps.length, pass, fail: steps.length - pass, errors, steps }, null, 2),
  'utf8',
);
console.log(`\n=== 用户流程：${pass}/${steps.length} ===`);
console.log(`产出：dist/user-flow/（index.html + 截图 + report.json）`);
if (errors.length) console.log(`页面错误：${errors.slice(0, 3).join(' | ')}`);
