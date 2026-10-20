/**
 * 设计实践②：**咖啡馆 Lamora 点单页**（375×812，组件较丰富）。
 *
 * 与第一版（《沙丘 2》购票页）相比，本页刻意用到更多**组件类型与能力**：
 *   Frame（嵌套容器 / 横向 / 纵向 / 包裹）、Text（多级字阶）、Rectangle（卡片/胶囊/圆点）、
 *   Oval（头像/评分点）、Button（加购）、组件实例（商品卡复用）、Layout grid（对齐底纹）。
 *
 * 设计决策：
 *   暖调咖啡馆 —— 底 #FBF7F2，主色 #6F4E37（咖啡棕），辅色 #C8A27A，文字 #2B211B / #8A7A6D
 *   字阶：28/700 店名 → 18/700 分区 → 15/700 商品 → 13 描述 → 12 标签
 *   圆角：卡片 16、胶囊 999(用 999→大圆角)、按钮 22、图 12
 *   节奏：padding 20，分区间 22，卡片内 12
 *
 * 全程真实 UI 操作，不注入 JSON。
 * 运行：node scripts/design-cafe.mjs → dist/design-cafe/
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('E:\\ms-playwright')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = 'E:\\ms-playwright';
}

const root = process.cwd();
const outDir = join(root, 'dist', 'design-cafe');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const PORT = 4351;
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
const page = await (await browser.newContext({ viewport: { width: 1680, height: 1080 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('dialog', (d) => d.accept());

/* ---------------- UI 原语 ---------------- */

async function findRow(label, nth = 0) {
  const idx = await page.evaluate(
    ([want, n]) => {
      const rows = Array.from(document.querySelectorAll('.props .field-row'));
      const hits = rows.map((r, i) => (r.querySelector('.field-label')?.textContent.trim() === want ? i : -1)).filter((i) => i >= 0);
      return hits[n] ?? -1;
    },
    [label, nth],
  );
  return idx < 0 ? null : page.locator('.props .field-row').nth(idx);
}

async function set(label, v) {
  const r = await findRow(label);
  if (!r) return false;
  const i = r.locator('input').first();
  if (!(await i.count())) return false;
  const t = await i.getAttribute('type');
  let val = v;
  if (t === 'range') {
    const mn = Number((await i.getAttribute('min')) ?? 0);
    const mx = Number((await i.getAttribute('max')) ?? 100);
    val = Math.min(mx, Math.max(mn, Number(v)));
  }
  await i.fill(String(val)).catch(() => {});
  await i.press('Enter').catch(() => {});
  await sleep(170);
  return true;
}

async function pick(label, opt) {
  const r = await findRow(label);
  if (!r) return false;
  const s = r.locator('select').first();
  if (!(await s.count())) return false;
  const ok = await s
    .selectOption({ label: opt })
    .then(() => true)
    .catch(() => false);
  await sleep(230);
  return ok;
}

/** 文本内容 */
async function content(t) {
  const r = await findRow('文本');
  if (!r) return false;
  const i = r.locator('input, textarea').first();
  if (!(await i.count())) return false;
  await i.fill(t);
  await i.press('Enter').catch(() => {});
  await sleep(260);
  return true;
}

/** 文字颜色（排版区「颜色」） */
async function textColor(hex) {
  const r = await findRow('颜色');
  if (!r) return false;
  const i = r.locator('input[type="color"]').first();
  if (!(await i.count())) return false;
  await i.fill(hex).catch(() => {});
  await sleep(280);
  return true;
}

/** 填充色（「填充」分区内的色板；无填充层时先添加） */
async function fill(hex) {
  const idxOf = () =>
    page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('.props input[type="color"]'));
      const h = Array.from(document.querySelectorAll('.props .prop-heading')).find((x) => x.textContent.trim() === '填充');
      if (!h) return -1;
      const sec = h.closest('.prop-section') ?? h.parentElement;
      const inp = sec.querySelector('input[type="color"]');
      return inp ? all.indexOf(inp) : -1;
    });
  let idx = await idxOf();
  if (idx < 0) {
    const add = page.locator('.props button:has-text("添加填充")').first();
    if (await add.count()) {
      await add.click();
      await sleep(420);
      idx = await idxOf();
    }
  }
  if (idx < 0) return false;
  await page.locator('.props input[type="color"]').nth(idx).fill(hex).catch(() => {});
  await sleep(320);
  return true;
}

/** 内边距四向（4 格网格，必须填 .num-box） */
async function padding(up, right, down, left) {
  const row = await findRow('内边距');
  if (!row) return false;
  const boxes = row.locator('input.num-box');
  if ((await boxes.count()) < 4) return false;
  const vals = [up, right, down, left];
  for (let i = 0; i < 4; i += 1) {
    await boxes.nth(i).fill(String(vals[i])).catch(() => {});
    await boxes.nth(i).press('Enter').catch(() => {});
    await sleep(110);
  }
  await sleep(190);
  return true;
}

async function gotoLayer() {
  await page.click('.side-tab:has-text("图层")');
  await sleep(330);
}
async function gotoAssets() {
  await page.click('.side-tab:has-text("资产")');
  await sleep(300);
}

/** 按名字子串选中（含校验，失败即抛错而非静默错嵌） */
async function sel(name) {
  await gotoLayer();
  const idx = await page.evaluate((want) => {
    const rows = Array.from(document.querySelectorAll('.layer-row'));
    return rows.findIndex((r) => r.textContent.includes(want));
  }, name);
  if (idx < 0) throw new Error(`图层「${name}」未找到`);
  await page.locator('.layer-row').nth(idx).click();
  await sleep(290);
  return true;
}

async function selLast() {
  await gotoLayer();
  const n = await page.locator('.layer-row').count();
  if (n < 2) return false;
  await page.locator('.layer-row').nth(n - 1).click();
  await sleep(280);
  return true;
}

async function selRoot() {
  await gotoLayer();
  await page.locator('.layer-row').first().click();
  await sleep(260);
  return true;
}

async function add(title) {
  await gotoAssets();
  const b = page.locator(`[title="${title}"]`);
  if (!(await b.count())) throw new Error(`资产按钮「${title}」不存在`);
  await b.click();
  await sleep(400);
  return true;
}

async function rename(name) {
  return set('名称', name);
}

async function getCode() {
  await page.click('.toolbar button:has-text("生成代码")');
  await page.waitForSelector('.code-modal .code-view', { timeout: 15000 });
  await sleep(320);
  await page.click('.code-modal .tab:has-text("preview.html")');
  await sleep(450);
  const html = (await page.locator('.code-modal .code-view').innerText()) || '';
  await page.click('.code-modal .btn-ghost');
  await sleep(280);
  return html;
}

/** 造一个纵向容器 */
async function frame(name, parent, opt = {}) {
  await sel(parent);
  await add('添加 框架');
  await selLast();
  await pick('方向', opt.dir ?? '纵向');
  if (opt.width != null) {
    await pick('宽模式', '固定');
    await set('W', opt.width);
  } else if (opt.fillWidth) {
    await pick('宽模式', '填充');
  }
  if (opt.height != null) {
    await pick('高模式', '固定');
    await set('H', opt.height);
  } else {
    await pick('高模式', '包裹');
  }
  if (opt.radius != null) await set('圆角', opt.radius);
  if (opt.pad) await padding(...opt.pad);
  if (opt.gap != null) await set('间距', opt.gap);
  if (opt.fill) await fill(opt.fill);
  await rename(name);
  await sleep(160);
  return true;
}

/** 造文本 */
async function text(name, parent, str, opt = {}) {
  await sel(parent);
  await add('添加 文本');
  await selLast();
  await content(str);
  if (opt.size) await set('字号', opt.size);
  if (opt.weight) await set('字重', opt.weight);
  await pick('宽模式', '包裹');
  await pick('高模式', '包裹');
  if (opt.color) await textColor(opt.color);
  await rename(name);
  await sleep(140);
  return true;
}

/** 造矩形 */
async function rect(name, parent, opt = {}) {
  await sel(parent);
  await add('添加 矩形');
  await selLast();
  if (opt.width != null) {
    await pick('宽模式', '固定');
    await set('W', opt.width);
  } else if (opt.fillWidth) {
    await pick('宽模式', '填充');
  }
  if (opt.height != null) {
    await pick('高模式', '固定');
    await set('H', opt.height);
  }
  if (opt.radius != null) await set('圆角', opt.radius);
  if (opt.fill) await fill(opt.fill);
  await rename(name);
  await sleep(140);
  return true;
}

/** 造椭圆 */
async function oval(name, parent, opt = {}) {
  await sel(parent);
  await add('添加 椭圆');
  await selLast();
  if (opt.width != null) {
    await pick('宽模式', '固定');
    await set('W', opt.width);
  }
  if (opt.height != null) {
    await pick('高模式', '固定');
    await set('H', opt.height);
  }
  if (opt.fill) await fill(opt.fill);
  await rename(name);
  await sleep(140);
  return true;
}

/** 造按钮 */
async function button(name, parent, label, opt = {}) {
  await sel(parent);
  await add('添加 按钮');
  await selLast();
  await content(label);
  if (opt.width != null) {
    await pick('宽模式', '固定');
    await set('W', opt.width);
  } else if (opt.fillWidth) {
    await pick('宽模式', '填充');
  }
  if (opt.height != null) {
    await pick('高模式', '固定');
    await set('H', opt.height);
  }
  if (opt.radius != null) await set('圆角', opt.radius);
  if (opt.fill) await fill(opt.fill);
  await rename(name);
  await sleep(160);
  return true;
}

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(700);
  note('▶ 打开编辑器');

  /* ===== 1. 主画板 ===== */
  await selRoot();
  await add('添加 框架');
  await selLast();
  await pick('宽模式', '固定');
  await set('W', 375);
  await pick('高模式', '固定');
  await set('H', 812);
  await pick('方向', '纵向');
  await padding(20, 20, 20, 20);
  await set('间距', 18);
  await fill('#FBF7F2');
  await rename('画板');
  note('✔ 画板 375×812 / 纵向 / padding 20 / gap 18 / #FBF7F2');

  /* ===== 2. 顶部栏（横向：头像 + 店名 …… 会员标签，两端分布） ===== */
  await frame('顶部栏', '画板', { dir: '横向', fillWidth: true, gap: 12 });
  await pick('对齐', '居中');
  await pick('分布', '两端分布');

  await oval('头像', '顶部栏', { width: 36, height: 36, fill: '#6F4E37' });
  await text('店名', '顶部栏', 'Lamora', { size: 20, weight: 700, color: '#2B211B' });
  await text('会员标签', '顶部栏', 'Gold', { size: 12, color: '#C8A27A' });
  note('✔ 顶部栏：头像(椭圆) + 店名 …… 会员标签（两端分布）');

  /* ===== 3. 门店卡（含标签胶囊 + 距你 + 评分点） ===== */
  await frame('门店卡', '画板', { fillWidth: true, radius: 16, pad: [16, 16, 16, 16], gap: 10, fill: '#FFFFFF' });
  await text('门店名', '门店卡', 'Lamora 手冲咖啡 · 静安店', { size: 15, weight: 700, color: '#2B211B' });
  await text('门店副信息', '门店卡', '南京西路 1266 号 · 距你 480m', { size: 12, color: '#8A7A6D' });

  // 标签行（横向胶囊组）
  await frame('标签行', '门店卡', { dir: '横向', gap: 8 });
  const tags = [
    ['标签-营业', '营业中', '#EAF5EC', '#2F855A'],
    ['标签-自提', '可自提', '#F3EDE6', '#6F4E37'],
    ['标签-外送', '外送 30min', '#F3EDE6', '#6F4E37'],
  ];
  for (const [nm, label, bg, fg] of tags) {
    await frame(nm, '标签行', { dir: '横向', radius: 12, pad: [4, 10, 4, 10], gap: 0, fill: bg });
    await pick('对齐', '居中');
    await pick('分布', '居中');
    await text(`${nm}-文字`, nm, label, { size: 11, weight: 500, color: fg });
  }
  note('✔ 门店卡：店名 + 副信息 + 三枚标签胶囊（嵌套 Frame）');

  /* ===== 4. 分类标签栏（沿横向排布，选中态高亮） ===== */
  await frame('分类栏', '画板', { dir: '横向', fillWidth: true, gap: 8 });
  const cats = [
    ['分类-1', '全部', '#6F4E37', '#FFFFFF'],
    ['分类-2', '手冲', '#FFFFFF', '#8A7A6D'],
    ['分类-3', '奶咖', '#FFFFFF', '#8A7A6D'],
    ['分类-4', '甜点', '#FFFFFF', '#8A7A6D'],
  ];
  for (const [nm, label, bg, fg] of cats) {
    await frame(nm, '分类栏', { dir: '横向', radius: 14, pad: [6, 14, 6, 14], fill: bg });
    await pick('对齐', '居中');
    await pick('分布', '居中');
    await text(`${nm}-文字`, nm, label, { size: 13, weight: 600, color: fg });
  }
  note('✔ 分类栏：4 枚胶囊（首枚选中态棕底白字）');

  /* ===== 5. 分区标题 ===== */
  await text('分区标题', '画板', '今日推荐', { size: 18, weight: 700, color: '#2B211B' });
  note('✔ 分区标题「今日推荐」18/700');

  /* ===== 6. 商品卡 ×3（每张都是复合容器） ===== */
  const items = [
    ['桂花冷萃', 'SOE 埃塞俄比亚 · 花香明亮', '¥ 28', '#E8D9C5'],
    ['海盐焦糖拿铁', '双份浓缩 · 海盐奶盖', '¥ 32', '#D9C3A5'],
    ['提拉米苏', '手工马斯卡彭 · 限量', '¥ 26', '#C9AE8C'],
  ];
  for (let k = 0; k < items.length; k += 1) {
    const [title, desc, price, thumb] = items[k];
    const cardName = `商品卡-${k + 1}`;
    await frame(cardName, '画板', { fillWidth: true, radius: 16, pad: [12, 12, 12, 12], gap: 10, fill: '#FFFFFF' });
    await pick('方向', '横向');
    await pick('对齐', '居中');

    // 左：缩略图（圆角矩形）+ 文案列
    await rect(`${cardName}-缩略图`, cardName, { width: 64, height: 64, radius: 12, fill: thumb });

    await frame(`${cardName}-文案`, cardName, { dir: '纵向', fillWidth: true, gap: 4 });
    await text(`${cardName}-名称`, `${cardName}-文案`, title, { size: 15, weight: 700, color: '#2B211B' });
    await text(`${cardName}-描述`, `${cardName}-文案`, desc, { size: 12, color: '#8A7A6D' });
    await text(`${cardName}-价格`, `${cardName}-文案`, price, { size: 15, weight: 700, color: '#6F4E37' });

    // 右：加购按钮
    await button(`${cardName}-加购`, cardName, '+', { width: 32, height: 32, radius: 16, fill: '#6F4E37' });
    note(`✔ 商品卡${k + 1}：${title}（缩略图 + 文案列三行 + 圆形加购按钮）`);
  }

  /* ===== 7. 分隔线 ===== */
  await rect('分隔线', '画板', { fillWidth: true, height: 1, fill: '#EDE4DA' });
  note('✔ 分隔线');

  /* ===== 8. 底部结算栏（横向：合计 + 按钮，两端推开） ===== */
  await frame('结算栏', '画板', { dir: '横向', fillWidth: true, gap: 12 });
  await pick('对齐', '居中');
  // 分布=两端分布（SPACE_BETWEEN）→ 合计靠左、按钮靠右（"弹性空隙"矩形在横向容器里不生效，改用分布）
  await pick('分布', '两端分布');
  await frame('合计组', '结算栏', { dir: '纵向', gap: 2 });
  await text('合计标签', '合计组', '已完成 3 件', { size: 12, color: '#8A7A6D' });
  await text('合计金额', '合计组', '¥ 86', { size: 20, weight: 700, color: '#2B211B' });
  await button('去结算', '结算栏', '去结算', { width: 130, height: 46, radius: 23, fill: '#6F4E37' });
  note('✔ 结算栏：合计组（两行）+ 去结算按钮');

  await page.screenshot({ path: join(outDir, '01-设计过程.png') });

  /* ===== 9. 图层概览 ===== */
  await gotoLayer();
  const names = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.layer-row')).map((e) => e.textContent.trim().replace(/\s+/g, ' ')),
  );
  note(`\n图层树（${names.length} 行）：`);
  names.forEach((n) => note('   ' + n));
  await page.screenshot({ path: join(outDir, '02-图层树.png') });

  /* ===== 10. 出码 ===== */
  const html = await getCode();
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  note(`\n✔ 生成代码 ${html.length} 字节`);

  /* ===== 11. ZIP ===== */
  await sleep(350);
  await page.click('.menu-btn');
  await sleep(250);
  await page.locator('.menu-dropdown .menu-item:has-text("导出代码")').first().click();
  await page.waitForSelector('.code-modal', { timeout: 15000 });
  await sleep(400);
  const dlP = page.waitForEvent('download', { timeout: 25000 }).catch(() => null);
  await page.click('.code-modal button:has-text("导出项目 ZIP")');
  const dl = await dlP;
  if (dl) {
    await dl.saveAs(join(outDir, 'Lamora点单页.zip'));
    note(`✔ ZIP：${dl.suggestedFilename()}`);
  } else note('⚠ ZIP 未捕获');

  await browser.close();
  server.kill();
  await sleep(300);

  /* ===== 12. 独立渲染 ===== */
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
  const txt = await p2.evaluate(() => document.body.innerText.trim());
  note(`\n✔ 成品渲染；可见文本：\n${txt.split('\n').filter(Boolean).map((t) => '   ' + t).join('\n')}`);
  const fatal = err2.filter((e) => !/ERR_FILE_NOT_FOUND/.test(e));
  note(`   致命错误：${fatal.length}${fatal.length ? ' → ' + fatal.slice(0, 2).join(' | ') : ''}`);
  await b2.close();
} catch (e) {
  note(`✖ 中断：${e instanceof Error ? e.message : String(e)}`);
  await page.screenshot({ path: join(outDir, '99-异常.png') }).catch(() => {});
  await browser.close().catch(() => {});
  server.kill();
}

writeFileSync(join(outDir, 'build-log.txt'), log.join('\n'), 'utf8');
console.log(`\n产物：dist/design-cafe/`);
if (errors.length) console.log(`页面错误：${errors.slice(0, 3).join(' | ')}`);
