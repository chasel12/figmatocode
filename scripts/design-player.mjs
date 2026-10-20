/**
 * 设计实践③：**音乐播放器「Nocturne」播放页**（375×812，高复杂度）。
 *
 * 比前两版复杂的地方：
 *  - **深色渐变主视觉**：线性渐变填充（GRADIENT_LINEAR）+ 首屏大半被渐变占据
 *  - **圆形唱片**（Oval）叠在渐变上，带内圈
 *  - **波形可视化**：16 根定高柱（循环生成，高度按伪随机序列，模拟音频波形）
 *  - **进度条**：轨道(全宽) + 已播放段(固定宽) 嵌套，两端圆角
 *  - **播放控制组**：5 键横向，中间主键更大（含圆形底）
 *  - **播放列表**：4 行，每行 缩略图 + 文案列(标题/歌手) + 时长
 *  - **底部导航**：4 个 tab（图标圆点 + 标签），选中态高亮
 *
 * 全页预计 100+ 节点，深度 4 层，用来压测嵌套容器与循环生成的稳定性。
 *
 * 运行：node scripts/design-player.mjs → dist/design-player/
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('E:\\ms-playwright')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = 'E:\\ms-playwright';
}

const root = process.cwd();
const outDir = join(root, 'dist', 'design-player');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const PORT = 4361;
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

async function set(label, v, nth = 0) {
  const r = await findRow(label, nth);
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
  await sleep(150);
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
  await sleep(210);
  return ok;
}

async function content(t) {
  const r = await findRow('文本');
  if (!r) return false;
  const i = r.locator('input, textarea').first();
  if (!(await i.count())) return false;
  await i.fill(t);
  await i.press('Enter').catch(() => {});
  await sleep(230);
  return true;
}

async function textColor(hex) {
  const r = await findRow('颜色');
  if (!r) return false;
  const i = r.locator('input[type="color"]').first();
  if (!(await i.count())) return false;
  await i.fill(hex).catch(() => {});
  await sleep(250);
  return true;
}

async function fillIndex() {
  return page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('.props input[type="color"]'));
    const h = Array.from(document.querySelectorAll('.props .prop-heading')).find((x) => x.textContent.trim() === '填充');
    if (!h) return -1;
    const sec = h.closest('.prop-section') ?? h.parentElement;
    const inp = sec.querySelector('input[type="color"]');
    return inp ? all.indexOf(inp) : -1;
  });
}

/** 纯色填充 */
async function fill(hex) {
  let idx = await fillIndex();
  if (idx < 0) {
    const add = page.locator('.props button:has-text("添加填充")').first();
    if (await add.count()) {
      await add.click();
      await sleep(400);
      idx = await fillIndex();
    }
  }
  if (idx < 0) return false;
  await page.locator('.props input[type="color"]').nth(idx).fill(hex).catch(() => {});
  await sleep(300);
  return true;
}

/**
 * 线性渐变填充。
 *
 * 实测坑（首版失败）：出码得到 `linear-gradient(#E8E8E8, #E8E8E8)`（两 stop 同色），
 * 因为用「全局第 idx / idx+1 个 color input」定位色标时**指错了控件**
 * （填充层内部既有类型下拉，也有每个 stop 的色板与位置输入）。
 *
 * 正确做法：**先切类型 → 再在「填充」分区内按 DOM 顺序取色标**。
 */
async function gradientLinear(hexA, hexB, angle = 180) {
  let idx = await fillIndex();
  if (idx < 0) {
    const add = page.locator('.props button:has-text("添加填充")').first();
    if (await add.count()) {
      await add.click();
      await sleep(420);
      idx = await fillIndex();
    }
  }
  if (idx < 0) return false;

  // 1) 切到「线性」：用 Playwright selectOption（**不要手动派发 change**——
  //    React 受控组件读不到 setter 直改，实测静默失败、出码仍是纯色）
  const kindSel = page.locator('.props select').filter({ has: page.locator('option', { hasText: '线性' }) }).first();
  if (!(await kindSel.count())) return false;
  await kindSel.selectOption({ label: '线性' }).catch(() => {});
  await sleep(560);
  // 校验：切完后填充层应出现两个色标
  const stopCount = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('.props input[type="color"]'));
    const h = Array.from(document.querySelectorAll('.props .prop-heading')).find((x) => x.textContent.trim() === '填充');
    if (!h) return 0;
    const sec = h.closest('.prop-section') ?? h.parentElement;
    return sec.querySelectorAll('input[type="color"]').length;
  });
  if (stopCount < 2) return false;

  // 2) 角度
  await set('角度', angle);

  // 3) 色标：取「填充」分区内的全部 color input（切类型后会新增 2 个 stop 色板）
  const stopIdx = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('.props input[type="color"]'));
    const h = Array.from(document.querySelectorAll('.props .prop-heading')).find((x) => x.textContent.trim() === '填充');
    if (!h) return [];
    const sec = h.closest('.prop-section') ?? h.parentElement;
    return Array.from(sec.querySelectorAll('input[type="color"]')).map((e) => all.indexOf(e));
  });
  if (stopIdx.length >= 2) {
    // 最后两个 = 渐变两端的色标
    const a = stopIdx[stopIdx.length - 2];
    const b = stopIdx[stopIdx.length - 1];
    await page.locator('.props input[type="color"]').nth(a).fill(hexA).catch(() => {});
    await sleep(240);
    await page.locator('.props input[type="color"]').nth(b).fill(hexB).catch(() => {});
    await sleep(320);
  }
  return true;
}

/** 添加效果（按可见文本选项） */
async function addEffect(kindLabel) {
  const add = page.locator('.props button:has-text("添加效果")').first();
  if (!(await add.count())) return false;
  await add.click();
  await sleep(500);
  const ok = await page.evaluate((want) => {
    const sels = Array.from(document.querySelectorAll('.props select'));
    for (const s of sels) {
      const opt = Array.from(s.options).find((o) => o.textContent.trim() === want);
      if (opt) {
        s.value = opt.value;
        s.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    return false;
  }, kindLabel);
  await sleep(500);
  return ok;
}

async function padding(up, right, down, left) {
  const row = await findRow('内边距');
  if (!row) return false;
  const boxes = row.locator('input.num-box');
  if ((await boxes.count()) < 4) return false;
  const vals = [up, right, down, left];
  for (let i = 0; i < 4; i += 1) {
    await boxes.nth(i).fill(String(vals[i])).catch(() => {});
    await boxes.nth(i).press('Enter').catch(() => {});
    await sleep(100);
  }
  await sleep(170);
  return true;
}

async function gotoLayer() {
  await page.click('.side-tab:has-text("图层")');
  await sleep(320);
}
async function gotoAssets() {
  await page.click('.side-tab:has-text("资产")');
  await sleep(290);
}

async function sel(name) {
  await gotoLayer();
  /**
   * 精确匹配优先，回退子串。
   * 踩坑记录：原先只用 `includes(want)`，「列表」会误命中「播放列表」标题节点，
   * 导致曲目行全被塞进错误父容器（实测 4 行横向排开、页面撑到 959px）。
   */
  const idx = await page.evaluate((want) => {
    const rows = Array.from(document.querySelectorAll('.layer-row'));
    const norm = (s) => s.replace(/[▸▣▭◉🔓⬭T\s]/g, '');
    const exact = rows.findIndex((r) => norm(r.textContent) === want);
    if (exact >= 0) return exact;
    return rows.findIndex((r) => r.textContent.includes(want));
  }, name);
  if (idx < 0) throw new Error(`图层「${name}」未找到`);
  await page.locator('.layer-row').nth(idx).click();
  await sleep(280);
  return true;
}

async function selLast() {
  await gotoLayer();
  const n = await page.locator('.layer-row').count();
  if (n < 2) return false;
  await page.locator('.layer-row').nth(n - 1).click();
  await sleep(270);
  return true;
}

async function selRoot() {
  await gotoLayer();
  await page.locator('.layer-row').first().click();
  await sleep(250);
  return true;
}

async function add(title) {
  await gotoAssets();
  const b = page.locator(`[title="${title}"]`);
  if (!(await b.count())) throw new Error(`资产按钮「${title}」不存在`);
  await b.click();
  await sleep(380);
  return true;
}

async function rename(name) {
  return set('名称', name);
}

async function getCode() {
  await page.click('.toolbar button:has-text("生成代码")');
  await page.waitForSelector('.code-modal .code-view', { timeout: 15000 });
  await sleep(300);
  await page.click('.code-modal .tab:has-text("preview.html")');
  await sleep(450);
  const html = (await page.locator('.code-modal .code-view').innerText()) || '';
  await page.click('.code-modal .btn-ghost');
  await sleep(270);
  return html;
}

/* ---------------- 组合原语 ---------------- */

async function frame(name, parent, o = {}) {
  await sel(parent);
  await add('添加 框架');
  await selLast();
  await pick('方向', o.dir ?? '纵向');
  if (o.width != null) {
    await pick('宽模式', '固定');
    await set('W', o.width);
  } else if (o.fillWidth) await pick('宽模式', '填充');
  if (o.height != null) {
    await pick('高模式', '固定');
    await set('H', o.height);
  } else await pick('高模式', '包裹');
  if (o.radius != null) await set('圆角', o.radius);
  if (o.pad) await padding(...o.pad);
  if (o.gap != null) await set('间距', o.gap);
  if (o.align) await pick('对齐', o.align);
  if (o.justify) await pick('分布', o.justify);
  if (o.fill) await fill(o.fill);
  await rename(name);
  await sleep(130);
  return true;
}

async function text(name, parent, str, o = {}) {
  await sel(parent);
  await add('添加 文本');
  await selLast();
  await content(str);
  if (o.size) await set('字号', o.size);
  if (o.weight) await set('字重', o.weight);
  await pick('宽模式', '包裹');
  await pick('高模式', '包裹');
  if (o.color) await textColor(o.color);
  if (o.align) await pick('对齐', o.align);
  await rename(name);
  await sleep(120);
  return true;
}

async function rect(name, parent, o = {}) {
  await sel(parent);
  await add('添加 矩形');
  await selLast();
  if (o.width != null) {
    await pick('宽模式', '固定');
    await set('W', o.width);
  } else if (o.fillWidth) await pick('宽模式', '填充');
  if (o.height != null) {
    await pick('高模式', '固定');
    await set('H', o.height);
  }
  if (o.radius != null) await set('圆角', o.radius);
  if (o.fill) await fill(o.fill);
  if (o.gradient) await gradientLinear(o.gradient[0], o.gradient[1], o.gradient[2] ?? 180);
  if (o.effect) await addEffect(o.effect);
  if (o.opacity != null) await set('不透明度', o.opacity);
  await rename(name);
  await sleep(120);
  return true;
}

async function oval(name, parent, o = {}) {
  await sel(parent);
  await add('添加 椭圆');
  await selLast();
  if (o.width != null) {
    await pick('宽模式', '固定');
    await set('W', o.width);
  }
  if (o.height != null) {
    await pick('高模式', '固定');
    await set('H', o.height);
  }
  if (o.fill) await fill(o.fill);
  if (o.effect) await addEffect(o.effect);
  await rename(name);
  await sleep(120);
  return true;
}

async function button(name, parent, label, o = {}) {
  await sel(parent);
  await add('添加 按钮');
  await selLast();
  await content(label);
  if (o.width != null) {
    await pick('宽模式', '固定');
    await set('W', o.width);
  } else if (o.fillWidth) await pick('宽模式', '填充');
  if (o.height != null) {
    await pick('高模式', '固定');
    await set('H', o.height);
  }
  if (o.radius != null) await set('圆角', o.radius);
  if (o.fill) await fill(o.fill);
  await rename(name);
  await sleep(140);
  return true;
}

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(700);
  note('▶ 打开编辑器');

  /* ===== 1. 主画板（深色） ===== */
  await selRoot();
  await add('添加 框架');
  await selLast();
  await pick('宽模式', '固定');
  await set('W', 375);
  await pick('高模式', '固定');
  await set('H', 812);
  await pick('方向', '纵向');
  await padding(0, 0, 0, 0);
  await set('间距', 0);
  await fill('#12101A');
  await rename('画板');
  note('✔ 画板 375×812 / 深色 #12101A');

  /* ===== 2. 顶部主视觉（渐变区，高度由内容包裹） ===== */
  /**
   * 实测教训（首版）：给固定 height:300 时，四个子区块（状态栏/顶栏/唱片/歌曲信息）
   * 总高超出 300 → 内容溢出，后续区块被挤压成竖排文字。改「包裹」让高度自适应。
   */
  await frame('主视觉', '画板', { fillWidth: true, radius: 0 });
  await gradientLinear('#2A1B4A', '#12101A', 180);
  note('✔ 主视觉：线性渐变 #2A1B4A → #12101A（高度包裹）');

  // 状态栏
  await frame('状态栏', '主视觉', { dir: '横向', fillWidth: true, pad: [14, 22, 0, 22] });
  await pick('分布', '两端分布');
  await pick('对齐', '居中');
  await text('时间', '状态栏', '9:41', { size: 13, weight: 600, color: '#FFFFFF' });
  await text('信号', '状态栏', '●●● ⌁ ▮', { size: 11, color: '#FFFFFF' });
  note('✔ 状态栏（两端分布）');

  // 顶栏：返回 + 标题 + 更多
  await frame('顶栏', '主视觉', { dir: '横向', fillWidth: true, pad: [16, 22, 0, 22] });
  await pick('分布', '两端分布');
  await pick('对齐', '居中');
  await text('返回', '顶栏', '‹', { size: 26, weight: 700, color: '#FFFFFF' });
  await frame('顶栏中', '顶栏', { dir: '纵向', gap: 2, align: '居中' });
  await text('顶栏小标', '顶栏中', '正在播放', { size: 10, color: '#B9A8D8' });
  await text('顶栏标题', '顶栏中', '夜间电台', { size: 13, weight: 700, color: '#FFFFFF' });
  await text('更多', '顶栏', '⋯', { size: 22, weight: 700, color: '#FFFFFF' });
  note('✔ 顶栏：返回 + 居中双行标题 + 更多');

  /* ===== 3. 唱片（圆形叠在主视觉上） ===== */
  await frame('唱片区', '主视觉', { fillWidth: true, align: '居中', pad: [18, 0, 0, 0] });
  await oval('唱片', '唱片区', { width: 148, height: 148, fill: '#1E1830', effect: '投影' });
  await sel('唱片');
  await oval('唱片内圈', '唱片', { width: 54, height: 54, fill: '#6C4BC6' });
  note('✔ 圆形唱片 148 + 内圈 54（椭圆嵌套 + 投影效果）');

  /* ===== 4. 歌曲信息（主视觉内底部） ===== */
  await frame('歌曲信息', '主视觉', { fillWidth: true, pad: [16, 22, 0, 22], gap: 5 });
  await text('曲名', '歌曲信息', 'Nocturne', { size: 24, weight: 700, color: '#FFFFFF' });
  await text('歌手', '歌曲信息', 'Aurora Lane · Midnight Sessions', { size: 12, color: '#A493C9' });
  note('✔ 歌曲信息：曲名 24/700 + 歌手行');

  /* ===== 5. 波形可视化（16 根柱） ===== */
  await frame('波形区', '画板', { fillWidth: true, pad: [16, 22, 0, 22] });
  /**
   * 实测教训：横向容器里 `width:100%` 的容器会把兄弟元素压成 1 字宽（文字竖排）。
   * 波形容器给**固定高度**并让柱子在交叉轴末尾对齐，柱子自身宽高都固定。
   */
  await frame('波形', '波形区', { dir: '横向', fillWidth: true, gap: 4, height: 48, align: '末尾' });
  // 伪随机但确定的柱高序列（模拟音频包络，中间高两端低）
  const bars = [10, 18, 26, 38, 30, 44, 34, 46, 40, 30, 42, 28, 34, 22, 16, 10];
  for (let i = 0; i < bars.length; i += 1) {
    const active = i < 9; // 前 9 根=已播放
    await rect(`柱-${i + 1}`, '波形', {
      width: 4,
      height: bars[i],
      radius: 2,
      fill: active ? '#8B6BE0' : '#2E2842',
    });
  }
  note(`✔ 波形可视化：${bars.length} 根定高柱（前 9 根高亮=已播放）`);

  /* ===== 6. 进度条（轨道 + 已播放段） ===== */
  await frame('进度区', '画板', { fillWidth: true, pad: [10, 22, 0, 22], gap: 6 });
  await frame('进度轨道', '进度区', { dir: '横向', fillWidth: true, height: 4, radius: 2, fill: '#2E2842' });
  await sel('进度轨道');
  await rect('已播放', '进度轨道', { width: 196, height: 4, radius: 2, fill: '#8B6BE0' });
  await frame('时间行', '进度区', { dir: '横向', fillWidth: true });
  await pick('分布', '两端分布');
  await text('当前时间', '时间行', '1:42', { size: 11, color: '#7A6B9E' });
  await text('总时长', '时间行', '3:28', { size: 11, color: '#7A6B9E' });
  note('✔ 进度条：轨道(全宽) + 已播放段(196) + 两端时间');

  /* ===== 7. 播放控制组（5 键，中间主键更大） ===== */
  await frame('控制区', '画板', { fillWidth: true, pad: [18, 40, 0, 40] });
  await frame('控制组', '控制区', { dir: '横向', fillWidth: true, align: '居中', justify: '两端分布' });
  await text('上一首', '控制组', '⏮', { size: 20, color: '#C9BEE6' });
  await text('后退15', '控制组', '↺', { size: 18, color: '#C9BEE6' });
  await frame('主控', '控制组', { dir: '横向', width: 62, height: 62, radius: 31, fill: '#8B6BE0', align: '居中', justify: '居中' });
  await text('播放键', '主控', '▶', { size: 24, weight: 700, color: '#FFFFFF', align: '居中' });
  await text('前进15', '控制组', '↻', { size: 18, color: '#C9BEE6' });
  await text('下一首', '控制组', '⏭', { size: 20, color: '#C9BEE6' });
  note('✔ 控制组：5 键横向两端分布，中间 62px 圆形主控');

  /* ===== 8. 播放列表标题 ===== */
  await frame('列表头', '画板', { dir: '横向', fillWidth: true, pad: [24, 22, 0, 22] });
  await pick('分布', '两端分布');
  await pick('对齐', '居中');
  await text('列表标题', '列表头', '播放列表', { size: 15, weight: 700, color: '#FFFFFF' });
  await text('列表数量', '列表头', '共 8 首', { size: 11, color: '#7A6B9E' });
  note('✔ 播放列表标题行');

  /* ===== 9. 播放列表 4 行 ===== */
  const tracks = [
    ['Nocturne', 'Aurora Lane', '3:28', '#6C4BC6'],
    ['Silk Road', 'Kenji Mori', '4:12', '#4B6BC6'],
    ['Amber Hour', 'Lila Reyes', '2:56', '#C67B4B'],
    ['Static Bloom', 'Neon Garden', '3:44', '#4BC69A'],
  ];
  const listWrap = await (async () => {
    // 用唯一名「曲目列表」（避免与「播放列表」标题歧义）
    await frame('曲目列表', '画板', { fillWidth: true, pad: [12, 22, 0, 22], gap: 10 });
    return '曲目列表';
  })();
  for (let k = 0; k < tracks.length; k += 1) {
    const [t, artist, dur, c] = tracks[k];
    const rowName = `曲目-${k + 1}`;
    await frame(rowName, listWrap, { dir: '横向', fillWidth: true, gap: 10, align: '居中' });
    await rect(`${rowName}-封面`, rowName, { width: 40, height: 40, radius: 8, fill: c });
    /**
     * 文案列用**固定宽度**而非「填充」：
     * 横向父容器里 `width:100%` 会把时间列挤到 0、并让自身文字竖排（实测踩坑）。
     * 宽度预算：375 − 22×2(列表 padding) = 331；再减 封面40 + gap10×2 + 时长≈34 ≈ 237。
     * 首版给 230 仍溢出（实测 doc 宽 1079）——包一层保险取 200，右侧留余量。
     */
    await frame(`${rowName}-文案`, rowName, { dir: '纵向', width: 200, gap: 3 });
    await text(`${rowName}-曲名`, `${rowName}-文案`, t, { size: 13, weight: 600, color: '#FFFFFF' });
    await text(`${rowName}-歌手`, `${rowName}-文案`, artist, { size: 11, color: '#7A6B9E' });
    await text(`${rowName}-时长`, rowName, dur, { size: 11, color: '#7A6B9E' });
  }
  note(`✔ 播放列表：${tracks.length} 行（封面 + 双行文案 + 时长）`);

  /* ===== 10. 底部导航（4 tab） ===== */
  await frame('导航区', '画板', { fillWidth: true, pad: [20, 0, 0, 0] });
  await frame('导航', '导航区', { dir: '横向', fillWidth: true, pad: [12, 22, 14, 22], align: '居中', justify: '两端分布', fill: '#191624' });
  const tabs = [
    ['首页', '#7A6B9E'],
    ['搜索', '#7A6B9E'],
    ['正在播', '#8B6BE0'],
    ['我的', '#7A6B9E'],
  ];
  for (let k = 0; k < tabs.length; k += 1) {
    const [label, c] = tabs[k];
    const nm = `tab-${k + 1}`;
    await frame(nm, '导航', { dir: '纵向', gap: 4, align: '居中' });
    await oval(`${nm}-点`, nm, { width: 16, height: 16, fill: c });
    await text(`${nm}-文字`, nm, label, { size: 10, weight: 500, color: c });
  }
  note('✔ 底部导航：4 tab（圆点图标 + 标签，第 3 个选中态高亮）');

  await page.screenshot({ path: join(outDir, '01-设计过程.png') });

  /* ===== 11. 图层统计 ===== */
  await gotoLayer();
  const names = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.layer-row')).map((e) => e.textContent.trim().replace(/\s+/g, ' ')),
  );
  note(`\n图层总数：${names.length} 行`);
  note('前 30 行：');
  names.slice(0, 30).forEach((n) => note('   ' + n));
  await page.screenshot({ path: join(outDir, '02-图层树.png') });

  /* ===== 12. 出码 ===== */
  const html = await getCode();
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  note(`\n✔ 生成代码 ${html.length} 字节`);

  /* ===== 13. ZIP ===== */
  await sleep(350);
  await page.click('.menu-btn');
  await sleep(240);
  await page.locator('.menu-dropdown .menu-item:has-text("导出代码")').first().click();
  await page.waitForSelector('.code-modal', { timeout: 15000 });
  await sleep(380);
  const dlP = page.waitForEvent('download', { timeout: 25000 }).catch(() => null);
  await page.click('.code-modal button:has-text("导出项目 ZIP")');
  const dl = await dlP;
  if (dl) {
    await dl.saveAs(join(outDir, 'Nocturne播放页.zip'));
    note(`✔ ZIP：${dl.suggestedFilename()}`);
  } else note('⚠ ZIP 未捕获');

  await browser.close();
  server.kill();
  await sleep(300);

  /* ===== 14. 独立渲染 ===== */
  const b2 = await chromium.launch();
  const p2 = await (await b2.newContext({ viewport: { width: 420, height: 900 } })).newPage();
  const err2 = [];
  p2.on('pageerror', (e) => err2.push(String(e)));
  p2.on('console', (m) => {
    if (m.type() === 'error') err2.push(m.text());
  });
  await p2.goto('file://' + join(outDir, 'index.html').replace(/\\/g, '/'));
  await sleep(1100);
  await p2.screenshot({ path: join(outDir, '03-成品页面.png'), fullPage: true });
  const txt = await p2.evaluate(() => document.body.innerText.trim());
  note(`\n✔ 成品渲染；文本条数：${txt.split('\n').filter(Boolean).length}`);
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
console.log(`\n产物：dist/design-player/`);
if (errors.length) console.log(`页面错误：${errors.slice(0, 3).join(' | ')}`);
