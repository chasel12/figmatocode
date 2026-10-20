/**
 * 以「真实用户」身份用本产品做一个页面（不是测试脚本，是**设计实践**）。
 *
 * 设计对象：**电影《沙丘 2》购票详情页**（375×812 移动端）
 * 设计决策（我作为设计师定的）：
 *   - 暗色影院风格：#0E0E12 底，#1A1A22 卡片，主色 #E8C87E（沙丘金）
 *   - 层级：巨幅海报 → 标题 28/700 → 副信息 12 → 场次芯片 → 座位条 → 底部价格+购票
 *   - 圆角节奏：海报 20、卡片 14、芯片 999(胶囊)、按钮 26
 *   - 间距节奏：外框 padding 20，卡片间 14，芯片间 8
 *
 * 全程只用**真实 UI 交互**（资产面板 / 右栏属性 / 图层树），不注入 JSON。
 *
 * 运行：node scripts/design-dune.mjs  → 产物 dist/design-dune/
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('E:\\ms-playwright')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = 'E:\\ms-playwright';
}

const root = process.cwd();
const outDir = join(root, 'dist', 'design-dune');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const PORT = 4311;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const log = [];
const note = (m) => {
  log.push(m);
  console.log(m);
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
const page = await (await browser.newContext({ viewport: { width: 1680, height: 1050 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('dialog', (d) => d.accept());

/* ---------------- UI 操作原语（对应真实鼠标动作） ---------------- */

async function findRow(label) {
  const idx = await page.evaluate((want) => {
    const rows = Array.from(document.querySelectorAll('.props .field-row'));
    return rows.findIndex((r) => r.querySelector('.field-label')?.textContent.trim() === want);
  }, label);
  return idx < 0 ? null : page.locator('.props .field-row').nth(idx);
}

/** 按精确 label 定位（支持同一 label 多实例：取第 n 个） */
async function findRowNth(label, n = 0) {
  const idx = await page.evaluate(
    ([want, nth]) => {
      const rows = Array.from(document.querySelectorAll('.props .field-row'));
      const hits = rows
        .map((r, i) => (r.querySelector('.field-label')?.textContent.trim() === want ? i : -1))
        .filter((i) => i >= 0);
      return hits[nth] ?? -1;
    },
    [label, n],
  );
  return idx < 0 ? null : page.locator('.props .field-row').nth(idx);
}

/**
 * 设「内边距」——**注意：内边距是 4 格网格（上/右/下/左）**，不是单值！
 * 早期脚本只填第 1 格 → 实际只加了上内边距（`padding: 20px 0 0 0`），
 * 是本脚本的用法错误，不是产品缺陷（产品口径与 Figma 一致，四向独立）。
 */
async function padding(up, right, down, left) {
  const row = await findRow('内边距');
  if (!row) return false;
  /**
   * 每个内边距格子是 **range + number 两个 input**（`.num-range` 滑条 + `.num-box` 数字框）。
   * 必须填 `.num-box`（数字框）才稳——填滑条时 React 的 value tracker 会吞掉同值写入。
   */
  const boxes = row.locator('input.num-box');
  const n = await boxes.count();
  if (n < 4) return false;
  const vals = [up, right, down, left];
  for (let i = 0; i < 4; i += 1) {
    await boxes.nth(i).fill(String(vals[i])).catch(() => {});
    await boxes.nth(i).press('Enter').catch(() => {});
    await sleep(130);
  }
  await sleep(220);
  return true;
}

/** 填字段（自动区分 range/number/text） */
async function set(label, value) {
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
  await sleep(170);
  return true;
}

/** 选下拉（按可见文本） */
async function pick(label, optionText) {
  const row = await findRow(label);
  if (!row) return false;
  const sel = row.locator('select').first();
  if (!(await sel.count())) return false;
  const ok = await sel
    .selectOption({ label: optionText })
    .then(() => true)
    .catch(() => false);
  await sleep(230);
  return ok;
}

/** 设文本内容（右栏「文本」字段） */
async function content(text) {
  const row = await findRow('文本');
  if (!row) return false;
  const inp = row.locator('input, textarea').first();
  if (!(await inp.count())) return false;
  await inp.fill(text);
  await inp.press('Enter').catch(() => {});
  await sleep(250);
  return true;
}

/**
 * 设填充色：先确保填充层存在（新建形状默认无填充），再写「填充」分区内的色板。
 * 这一步是真实用户必走的两步（先 + 添加填充，再点色块）。
 */
async function fill(hex, rowIndex = 0) {
  const colorIdx = async () =>
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
  if ((await colorIdx()) < 0) {
    const add = page.locator('.props button:has-text("添加填充")').first();
    if (await add.count()) {
      await add.click();
      await sleep(400);
    }
  }
  const idx = await colorIdx();
  if (idx < 0) return false;
  await page.locator('.props input[type="color"]').nth(idx + rowIndex).fill(hex).catch(() => {});
  await sleep(320);
  return true;
}

/** 选中图层：按索引（0=页根） */
async function sel(n) {
  await page.click('.side-tab:has-text("图层")');
  await sleep(170);
  const cnt = await page.locator('.layer-row').count();
  if (n >= cnt) return false;
  await page.locator('.layer-row').nth(n).click();
  await sleep(260);
  return true;
}

/** 选中最后一个（最新创建）图层 */
async function selLast() {
  await page.click('.side-tab:has-text("图层")');
  await sleep(170);
  const cnt = await page.locator('.layer-row').count();
  if (cnt < 2) return false;
  await page.locator('.layer-row').nth(cnt - 1).click();
  await sleep(260);
  return true;
}

/** 当前图层树快照（用于按名字精确定位） */
async function layerNames() {
  await page.click('.side-tab:has-text("图层")');
  await sleep(150);
  return page.$$eval('.layer-row', (els) => els.map((e) => e.textContent.trim()));
}

/**
 * 按名字选中（**子串匹配**）。
 *
 * 踩坑记录：图层行文本含图标字形与锁标（如 `▸▣场次行◉🔓`），
 * 用 `textContent.trim() === name` **永远匹配不到** → 选中静默失败，
 * 后续新建节点会嵌进「上一次选中的节点」里，层层错位（本脚本首版就是这么坏的）。
 * 故：① 用 includes 子串匹配；② 选中后**校验成功**，失败即抛错而非静默继续。
 */
async function selByName(name) {
  await page.click('.side-tab:has-text("图层")');
  await sleep(170);
  const idx = await page.evaluate((want) => {
    const rows = Array.from(document.querySelectorAll('.layer-row'));
    return rows.findIndex((r) => r.textContent.includes(want));
  }, name);
  if (idx < 0) throw new Error(`图层「${name}」未找到（不能静默继续，否则会错嵌）`);
  await page.locator('.layer-row').nth(idx).click();
  await sleep(280);
  // 校验：右侧「名称」字段应等于该名字
  const nm = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.props .field-row'));
    const r = rows.find((x) => x.querySelector('.field-label')?.textContent.trim() === '名称');
    return r?.querySelector('input')?.value ?? '';
  });
  if (nm && nm !== name) throw new Error(`选中校验失败：期望「${name}」实得「${nm}」`);
  return true;
}

/** 资产面板加节点 */
async function add(title) {
  await page.click('.side-tab:has-text("资产")');
  await sleep(140);
  const btn = page.locator(`[title="${title}"]`);
  if (!(await btn.count())) return false;
  await btn.click();
  await sleep(380);
  return true;
}

/** 重命名当前选中节点（便于后续按名定位） */
async function rename(name) {
  const ok = await set('名称', name);
  await sleep(150);
  return ok;
}

async function getCode() {
  await page.click('.toolbar button:has-text("生成代码")');
  await page.waitForSelector('.code-modal .code-view', { timeout: 15000 });
  await sleep(300);
  await page.click('.code-modal .tab:has-text("preview.html")');
  await sleep(450);
  const html = (await page.locator('.code-modal .code-view').innerText()) || '';
  await page.click('.code-modal .btn-ghost');
  await sleep(280);
  return html;
}

/**
 * 设**文字颜色**。
 * 注意：文本的颜色在排版分区的「颜色」字段（`style.color`），
 * 不是「填充」分区——早期脚本对 TEXT 调用 fill() 改不到字色
 * （出码仍是默认 #111111，看起来像"颜色没生效"）。这是脚本用错字段。
 */
async function textColor(hex) {
  const row = await findRow('颜色');
  if (!row) return false;
  const inp = row.locator('input[type="color"]').first();
  if (!(await inp.count())) return false;
  await inp.fill(hex).catch(() => {});
  await sleep(300);
  return true;
}

/**
 * 造一个"胶囊带字"的芯片：Frame（可容纳子节点）+ 内层文本居中。
 * 设计细节：
 *  - Frame 用「固定」84×34 + 圆角 17；
 *  - 对齐/分布设「居中」让文字在芯片内居中（否则文字贴左上角）；
 *  - 文本宽高模式用「包裹」（自动尺寸），固定尺寸会把字形裁切。
 */
async function makeChip(label, bg, fg, parentName) {
  await selByName(parentName);
  await add('添加 框架');
  await selLast();
  await pick('方向', '横向');
  await pick('宽模式', '固定');
  await set('W', 84);
  await pick('高模式', '固定');
  await set('H', 34);
  await set('圆角', 17);
  await padding(0, 0, 0, 0);
  await pick('分布', '居中');
  await pick('对齐', '居中');
  await fill(bg);
  await rename(`芯片-${label}`);
  await sleep(220);

  await selByName(`芯片-${label}`);
  await add('添加 文本');
  await selLast();
  await content(label);
  await set('字号', 13);
  await set('字重', 700);
  await pick('高模式', '包裹');
  await pick('宽模式', '包裹');
  await textColor(fg);
  await rename(`芯片文字-${label}`);
  await sleep(150);
}

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(700);
  note('▶ 打开编辑器');

  /* ============ 1. 画板：暗色影院底 ============ */
  await sel(0);
  await add('添加 框架');
  await selLast();
  await pick('宽模式', '固定');
  await set('W', 375);
  await pick('高模式', '固定');
  await set('H', 812);
  await pick('方向', '纵向');
  await padding(20, 20, 20, 20);
  await set('间距', 14);
  await fill('#0E0E12');
  await rename('画板');
  note('✔ 画板 375×812 / 纵向流 / padding 四向 20 / gap 14 / 底 #0E0E12');

  /* ============ 2. 海报（大圆角占位） ============ */
  await selByName('画板');
  await add('添加 矩形');
  await selLast();
  await pick('宽模式', '固定');
  await set('W', 335);
  await set('H', 300);
  await set('圆角', 20);
  await fill('#1A1A22');
  await rename('海报');
  note('✔ 海报 335×300 / 圆角 20 / #1A1A22');

  /* ============ 3. 片名 + 副信息（放进海报下方） ============ */
  await selByName('画板');
  await add('添加 文本');
  await selLast();
  await content('沙丘 2');
  await set('字号', 28);
  await set('字重', 700);
  // 文本必须用「包裹」（自动尺寸），固定尺寸会裁切字形
  await pick('宽模式', '包裹');
  await pick('高模式', '包裹');
  await sleep(200);
  // 文字色：填充分区对 TEXT 即字色
  await textColor('#E8C87E');
  await rename('片名');
  note('✔ 片名「沙丘 2」28px/700 / 金色 #E8C87E');

  await selByName('画板');
  await add('添加 文本');
  await selLast();
  await content('Dune: Part Two · 科幻 / 冒险 · 166 分钟');
  await set('字号', 12);
  await sleep(200);
  await textColor('#8A8A99');
  await rename('副信息');
  note('✔ 副信息 12px / #8A8A99');

  /* ============ 4. 场次芯片（横向容器 + 3 个胶囊） ============ */
  await selByName('画板');
  await add('添加 框架');
  await selLast();
  await pick('方向', '横向');
  await set('间距', 8);
  await pick('高模式', '包裹');
  await rename('场次行');
  await sleep(200);
  const rowIdx = (await layerNames()).findIndex((t) => t.includes('场次行'));
  note(`✔ 场次行（横向 / gap 8 / 包裹）图层索引=${rowIdx}`);

  const sessions = [
    ['14:30', '#E8C87E', '#0E0E12'],
    ['18:00', '#1F1F2A', '#C9C9D4'],
    ['21:15', '#1F1F2A', '#C9C9D4'],
  ];
  /**
   * 场次芯片用 Frame + 文字居中。
   * 关键设计认知：矩形（RECTANGLE）**不能容纳子节点**（与 Figma 一致），
   * 在矩形里"加文字"会把文字落到父级当兄弟节点。要做带字胶囊必须用 Frame。
   */
  for (const [label, bg, fg] of sessions) {
    await makeChip(label, bg, fg, '场次行');
  }
  note('✔ 三枚场次芯片（Frame 84×34 圆角17 / 文字居中 / 选中态金色）');

  /* ============ 5. 影厅信息卡（Frame 承载两行文字） ============ */
  await selByName('画板');
  await add('添加 框架');
  await selLast();
  await pick('方向', '纵向');
  await pick('宽模式', '固定');
  await set('W', 335);
  await pick('高模式', '固定');
  await set('H', 76);
  await set('圆角', 14);
  await padding(16, 16, 16, 16);
  await set('间距', 6);
  await fill('#15151C');
  await rename('影厅卡');
  await sleep(200);
  await selByName('影厅卡');
  await add('添加 文本');
  await selLast();
  await content('IMAX 激光厅 · 5 号厅');
  await set('字号', 14);
  await set('字重', 700);
  await textColor('#EDEDF2');
  await rename('影厅名');
  note('✔ 影厅卡（Frame 335×76 圆角14 padding16）+ 影厅名 14/700');

  await selByName('影厅卡');
  await add('添加 文本');
  await selLast();
  await content('7 排 12 座 · 已选 2 张');
  await set('字号', 12);
  await textColor('#8A8A99');
  await rename('座位信息');
  note('✔ 座位信息 12px 灰');

  /* ============ 6. 分隔留白 + 价格行 ============ */
  await selByName('画板');
  await add('添加 框架');
  await selLast();
  await pick('方向', '横向');
  await pick('宽模式', '填充');
  await set('间距', 8);
  await rename('价格行');
  note('✔ 价格行（横向 / 填充宽）');

  await selByName('价格行');
  await add('添加 文本');
  await selLast();
  await content('¥ 96');
  await set('字号', 24);
  await set('字重', 700);
  await textColor('#E8C87E');
  await rename('价格');
  note('✔ 价格 ¥96 / 24px / 金色');

  /* ============ 7. 购票 CTA ============ */
  await selByName('画板');
  await add('添加 按钮');
  await selLast();
  await pick('宽模式', '固定');
  await set('W', 335);
  await set('H', 50);
  await set('圆角', 25);
  await sleep(200);
  await content('立即购票');
  await fill('#E8C87E');
  await rename('购票按钮');
  note('✔ 购票按钮 335×50 / 圆角25 / 金色底');

  await page.screenshot({ path: join(outDir, '01-设计过程.png') });

  /* ============ 8. 图层结构确认 ============ */
  const names = await layerNames();
  note(`\n图层树（${names.length} 行）：`);
  for (const n of names) note('   ' + n.replace(/\s+/g, ' '));
  await page.screenshot({ path: join(outDir, '02-图层树.png') });

  /* ============ 9. 出码 ============ */
  const html = await getCode();
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  note(`\n✔ 生成代码 ${html.length} 字节`);

  /* ============ 10. 导出 ZIP ============ */
  await sleep(400);
  await page.click('.menu-btn');
  await sleep(250);
  await page.locator('.menu-dropdown .menu-item:has-text("导出代码")').first().click();
  await page.waitForSelector('.code-modal', { timeout: 15000 });
  await sleep(400);
  const dlP = page.waitForEvent('download', { timeout: 25000 }).catch(() => null);
  await page.click('.code-modal button:has-text("导出项目 ZIP")');
  const dl = await dlP;
  if (dl) {
    await dl.saveAs(join(outDir, '沙丘2-购票页.zip'));
    note(`✔ ZIP 导出：${dl.suggestedFilename()}`);
  } else {
    note('⚠ ZIP 下载未捕获');
  }
  await browser.close();
  server.kill();
  await sleep(300);

  /* ============ 11. 独立渲染 ============ */
  const b2 = await chromium.launch();
  const p2 = await (await b2.newContext({ viewport: { width: 420, height: 900 } })).newPage();
  const err2 = [];
  p2.on('pageerror', (e) => err2.push(String(e)));
  p2.on('console', (m) => {
    if (m.type() === 'error') err2.push(m.text());
  });
  await p2.goto('file://' + join(outDir, 'index.html').replace(/\\/g, '/'));
  await sleep(1000);
  await p2.screenshot({ path: join(outDir, '03-成品页面.png'), fullPage: true });
  const text = await p2.evaluate(() => document.body.innerText.trim());
  note(`\n✔ 成品页独立渲染；可见文本：\n${text.split('\n').filter(Boolean).map((t) => '   ' + t).join('\n')}`);
  note(`   控制台错误：${err2.filter((e) => !/ERR_FILE_NOT_FOUND/.test(e)).length}（字体 404 属站点根口径，见 zip-file-verify）`);
  await b2.close();
} catch (e) {
  note(`✖ 中断：${e instanceof Error ? e.message : String(e)}`);
  await page.screenshot({ path: join(outDir, '99-异常.png') }).catch(() => {});
  await browser.close().catch(() => {});
  server.kill();
}

writeFileSync(join(outDir, 'build-log.txt'), log.join('\n'), 'utf8');
console.log(`\n产物：dist/design-dune/`);
if (errors.length) console.log(`页面错误：${errors.slice(0, 3).join(' | ')}`);
