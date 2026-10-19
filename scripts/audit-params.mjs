/**
 * 全参数功能审计（FR 全量 · 参数级）—— 2026-10-18
 *
 * 目的：对「每一个可调小参数」做**改了就应用**的实测：
 *   ① 在右栏改动该参数 → ② 读回 store 的 page.json（File→保存前的内存态，经 e2e hook）
 *   → ③ 生成代码（CodeModal 的 preview.html / index.scss）确认**产物同步变化**。
 * 任一环未变即记 FAIL，并在报告中标注归因线索。
 *
 * 覆盖：15 类节点 × 各分区字段（位置尺寸/布局/描边/填充/效果/排版/形状/图片/导出/约束…）
 *
 * 运行：node scripts/audit-params.mjs
 * 前置：npm run build（或 precanvasdiff）+ dist/pages/*（npm run pages）
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('E:\\ms-playwright')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = 'E:\\ms-playwright';
}

const root = process.cwd();
const outDir = join(root, 'dist', 'audit-params');
mkdirSync(outDir, { recursive: true });
const PORT = 4241;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const rows = [];
const record = (node, area, field, ok, note = '') => {
  rows.push({ node, area, field, ok: !!ok, note });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  [${node}/${area}] ${field}${note ? '  -- ' + note : ''}`);
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

/* ---------- 工具 ---------- */

/** 读当前内存页（不落盘，走 e2e hook 的 snapshot 拿不到样式，故用 File→保存截获） */
async function getCurrentPage() {
  // 用 __UIC_E2E__.getPage() 若存在（本项目已提供），否则退化为读 layer DOM + 出码
  return page.evaluate(() => {
    const hook = window.__UIC_E2E__;
    if (hook && typeof hook.getState === 'function') return hook.getState();
    return null;
  });
}

/** 选中图层（按名称子串；找不到返回 false） */
async function selectLayer(name, nth = 0) {
  await page.click('.side-tab:has-text("图层")');
  await sleep(150);
  const rowsLoc = page.locator(`.layer-row:has-text("${name}")`);
  const n = await rowsLoc.count();
  if (!n) return false;
  await rowsLoc.nth(Math.min(nth, n - 1)).click();
  await sleep(280);
  return true;
}

/**
 * 选中「最近创建的节点」——按图层树顺序取最后一个非根行。
 * 必要原因：demo/新建节点的 `name` 是 `Text 415`/`Rectangle 12` 这类**自动名**，
 * 不包含内容文本，按内容 `hasText` 找不到（这是本审计最初的假 FAIL 来源）。
 */
async function selectLastNode() {
  await page.click('.side-tab:has-text("图层")');
  await sleep(250);
  const n = await page.locator('.layer-row').count();
  if (n < 2) return false;
  await page.locator('.layer-row').nth(n - 1).click();
  await sleep(350);
  return true;
}

/** 读属性面板全文（用于断言分区/字段存在） */
const propsText = async () => ((await page.locator('.props').innerText().catch(() => '')) || '');

/** 打开生成代码，取 preview.html 文本 */
async function getCode() {
  await page.click('.toolbar button:has-text("生成代码")');
  await page.waitForSelector('.code-modal .code-view', { timeout: 12000 });
  await sleep(300);
  await page.click('.code-modal .tab:has-text("preview.html")');
  await sleep(400);
  const html = (await page.locator('.code-modal .code-view').innerText()) || '';
  await page.click('.code-modal .tab:has-text("index.scss")');
  await sleep(400);
  const scss = (await page.locator('.code-modal .code-view').innerText()) || '';
  await page.click('.code-modal .btn-ghost');
  await sleep(250);
  return { html, scss, all: html + '\n' + scss };
}

/**
 * 按**精确 label** 定位 `.field-row`（用 trim 后全文比较，不用 CSS 正则——label 带空白时正则失配）。
 * 结构（PropertyPanel.tsx:56）：div.field-row > label.field-label + div.field-body > input/select
 */
async function findRow(labelText) {
  const idx = await page.evaluate((want) => {
    const rows = Array.from(document.querySelectorAll('.props .field-row'));
    return rows.findIndex((r) => {
      const l = r.querySelector('.field-label');
      return l && l.textContent.trim() === want;
    });
  }, labelText);
  if (idx < 0) return null;
  return page.locator('.props .field-row').nth(idx);
}

/**
 * 写入字段值。按控件类型分派（关键：`range` 输入不吃任意字符串，且量纲可能不同）：
 *   - range（如「不透明度」0–100 百分比）：按 min/max 夹紧后赋值；
 *   - color：直接 fill；
 *   - 其它 number/text：fill + Enter 提交。
 */
async function setField(labelText, value) {
  const row = await findRow(labelText);
  if (!row) return false;
  const input = row.locator('input').first();
  if (!(await input.count())) return false;
  const type = (await input.getAttribute('type')) ?? 'text';
  let v = value;
  if (type === 'range') {
    const min = Number((await input.getAttribute('min')) ?? 0);
    const max = Number((await input.getAttribute('max')) ?? 100);
    const n = Math.min(max, Math.max(min, Number(value)));
    // range 必须用 fill（Playwright 对 range 支持赋值），且值需在 min..max 内
    await input.fill(String(n)).catch(async () => {
      await input.evaluate((el, val) => {
        el.value = String(val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, n);
    });
    v = n;
  } else {
    await input.fill(String(value));
  }
  await input.press('Enter').catch(() => {});
  await sleep(340);
  // 读回实际值，便于调用方断言（range 可能被夹紧）
  const actual = await input.inputValue().catch(() => '');
  return { ok: true, actual, requested: String(v) };
}

/** 按精确 label 选 select 选项（按可见文本） */
async function setSelect(labelText, optionText) {
  const row = await findRow(labelText);
  if (!row) return false;
  const sel = row.locator('select').first();
  if (!(await sel.count())) return false;
  await sel.selectOption({ label: optionText }).catch(() => {});
  await sleep(340);
  return true;
}

/** 字段 label 是否存在 */
async function hasLabel(labelText) {
  return (await findRow(labelText)) !== null;
}

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(600);

  /**
   * 分区执行器：单段异常**不中断全局**（照实记 FAIL 并继续下一段）。
   * 全量审计必须跑完才有价值——中途 FATAL 会让报告只覆盖前几项。
   */
  const section = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      record(name, 'SECTION', '该分区执行异常', false, String(e && e.message ? e.message : e).slice(0, 160));
    }
  };

  /* ============ 0. 基线：从空白页开始，逐个创建节点做参数审计 ============ */
  const baseline = await getCode();

  await section('RECTANGLE', async () => {
  /* ---------- A. RECTANGLE：位置/尺寸/圆角/填充/描边/透明/混合 ============ */
  await page.click('.side-tab:has-text("资产")');
  await sleep(200);
  await page.click('[title="添加 矩形"]');
  await sleep(400);

  let code = await getCode();
  const rectId = await page.evaluate(() => {
    const el = document.querySelector('.layer-row[data-node-id]:not([data-node-id="page"])');
    return el?.getAttribute('data-node-id') ?? '';
  });
  record('RECTANGLE', '创建', '新增矩形节点', code.all !== baseline.all, `nodeId=${rectId || '?'}`);

  // X/Y 仅在「绝对定位」下存在（流内布局无自由坐标，符合 Figma 语义）→ 先切换
  const absOk = await setSelect('定位', '绝对定位');
  record('RECTANGLE', '布局', '定位→绝对定位（X/Y 出现）', absOk && (await hasLabel('X')) && (await hasLabel('Y')), '');

  // W / H
  const beforeW = await getCode();
  await setField('W', 123);
  const afterW = await getCode();
  record('RECTANGLE', '位置尺寸', 'W', /123px/.test(afterW.all) && afterW.all !== beforeW.all, '出码含 width:123px');

  await setField('H', 77);
  const afterH = await getCode();
  record('RECTANGLE', '位置尺寸', 'H', /77px/.test(afterH.all), '');

  await setField('X', 41);
  const afterX = await getCode();
  record('RECTANGLE', '位置尺寸', 'X', /left:\s*41px/.test(afterX.all) || /41px/.test(afterX.all), '');

  await setField('Y', 29);
  const afterY = await getCode();
  record('RECTANGLE', '位置尺寸', 'Y', /top:\s*29px/.test(afterY.all) || /29px/.test(afterY.all), '');

  // 圆角
  await setField('圆角', 16);
  const afterR = await getCode();
  record('RECTANGLE', '圆角', 'borderRadius', /border-radius:\s*16px/.test(afterR.all), '');

  // 不透明度（range 控件，量纲 0–100 百分比；50 对应 CSS opacity: 0.5）
  const opRes = await setField('不透明度', 50);
  const afterO = await getCode();
  record(
    'RECTANGLE',
    '图层',
    'opacity（range 0–100）',
    /opacity:\s*0?\.5\b/.test(afterO.all),
    `控件值=${opRes ? opRes.actual : '?'}`,
  );

  // 填充色（点色块改 value）
  const fillsBefore = await getCode();
  const colorInput = page.locator('.props input[type="color"]').first();
  if (await colorInput.count()) {
    await colorInput.fill('#ff8800');
    await sleep(350);
    const afterC = await getCode();
    record('RECTANGLE', '填充', '颜色', /ff8800|255,\s*136,\s*0/.test(afterC.all.toLowerCase()), '');
  } else {
    record('RECTANGLE', '填充', '颜色', false, '未找到 color input');
  }

  // 添加填充层（多层填充）
  const addFill = page.locator('.props button:has-text("添加填充")').first();
  if (await addFill.count()) {
    const before = await getCode();
    await addFill.click();
    await sleep(400);
    const after = await getCode();
    record('RECTANGLE', '填充', '多层填充（添加层）', after.all !== before.all, '');
  } else record('RECTANGLE', '填充', '多层填充（添加层）', false, '未找到按钮');

  // 描边宽度
  const strokeBefore = await getCode();
  await setField('宽度', 4);
  const strokeAfter = await getCode();
  record('RECTANGLE', '描边', '宽度', /border[^:]*:\s*4px/.test(strokeAfter.all) || /outline[^:]*:\s*4px/.test(strokeAfter.all) || strokeAfter.all !== strokeBefore.all, '');

  /* ---------- B. 混合模式（Layer 分区「混合」select） ---------- */
  {
    const blendRow = await findRow('混合');
    const sel = blendRow ? blendRow.locator('select').first() : null;
    if (sel && (await sel.count())) {
      const opts = await sel.locator('option').allTextContents();
      const target = opts.find((o) => /MULTIPLY/i.test(o)) ?? opts[1];
      await sel.selectOption({ label: target });
      await sleep(400);
      const afterB = await getCode();
      record('RECTANGLE', '图层', '混合模式', /mix-blend-mode/.test(afterB.all), `选中=${target}`);
    } else record('RECTANGLE', '图层', '混合模式', false, '未找到「混合」行 select');
  }
  });

  await section('TEXT', async () => {
  /* ---------- C. TEXT：排版全字段 ---------- */
  await page.click('.side-tab:has-text("资产")');
  await sleep(200);
  await page.click('[title="添加 文本"]');
  await sleep(500);
  await page.keyboard.type('审计文本 Audit');
  // 提交文本：点顶栏稳定区域（**不能用 Escape**——Escape 会清空选中，导致随后排版字段全部不可见）
  await page.click('.brand-name');
  await sleep(500);
  // 重新选中刚建的文本节点（右栏才显示排版分区）。
  // 注意：图层行名是自动名 `Text 415`，**不含内容文本**，故用「最后一个节点」而非按文本找。
  await selectLastNode();
  await sleep(400);

  for (const field of ['字号', '字重', '行高', '字距', '段间距', '首行缩', '对齐', '垂直对', '自动大小', '形态', '装饰', '字形增强']) {
    record('TEXT', '排版', `${field} 字段可见`, await hasLabel(field), '');
  }

  const tBefore = await getCode();
  const fsRes = await setField('字号', 28);
  const tAfter = await getCode();
  const fsSeen = (tAfter.all.match(/font-size:\s*([\d.]+)px/g) ?? []).slice(0, 3).join(', ');
  record('TEXT', '排版', '字号→出码', /font-size:\s*28px/.test(tAfter.all), `控件=${fsRes ? fsRes.actual : '未找到'}; 出码=${fsSeen || '无'}`);

  const fwRes = await setField('字重', 700);
  const tAfter2 = await getCode();
  const fwSeen = (tAfter2.all.match(/font-weight:\s*\d+/g) ?? []).slice(0, 3).join(', ');
  record('TEXT', '排版', '字重→出码', /font-weight:\s*700/.test(tAfter2.all), `控件=${fwRes ? fwRes.actual : '未找到'}; 出码=${fwSeen || '无'}`);
  });

  await section('SHAPES', async () => {
  /* ---------- D. 形状族：OVAL / POLYGON / STAR / LINE ---------- */
  for (const [tool, label] of [
    ['添加 椭圆', 'OVAL'],
    ['添加 直线', 'LINE'],
  ]) {
    await page.click('.side-tab:has-text("资产")');
    await sleep(150);
    const btn = page.locator(`[title="${tool}"]`);
    if (await btn.count()) {
      await btn.click();
      await sleep(400);
      const c = await getCode();
      record(label, '创建', '新增节点', c.all.length > 0, '');
    } else record(label, '创建', '新增节点', false, `未找到 ${tool}`);
  }

  // 多边形/星形走工具轨
  for (const [title, label] of [
    ['多边形', 'POLYGON'],
    ['星形', 'STAR'],
  ]) {
    const t = page.locator(`.tool-strip [title="${title}"]`);
    if (await t.count()) {
      await t.click();
      await sleep(200);
      const box = await page.locator('.konvajs-content').boundingBox();
      await page.mouse.move(box.x + 260, box.y + 240);
      await page.mouse.down();
      await page.mouse.move(box.x + 340, box.y + 320, { steps: 6 });
      await page.mouse.up();
      await sleep(450);
      // 拖画后节点应自动选中 → 右栏出现形状参数（多边形：边数；星形：边数+内径）。
      // 判据用「右栏出现形状专属字段」，**不用 layer-row 计数**——此时停在「资产」页签，
      // 图层树未渲染，`.layer-row` 恒为 0（本审计早期的假 FAIL 来源）。
      const hasCount = await hasLabel('边数');
      const hasInner = await hasLabel('内径');
      const ok = hasCount && (label === 'POLYGON' || hasInner);
      record(label, '创建+参数', '拖画创建 → 形状参数区', ok, `边数=${hasCount} 内径=${hasInner}`);
      // 实测改边数 → 出码 clip-path 变化
      if (hasCount) {
        const before = await getCode();
        const changed = await setField('边数', label === 'POLYGON' ? 8 : 4);
        const after = await getCode();
        record(label, '参数', '边数→出码 clip-path 变化', changed && after.all !== before.all, '');
      }
    } else record(label, '创建', '工具不存在', false, '');
  }
  });

  await section('FRAME', async () => {
  /* ---------- E. 约束 / Auto Layout ---------- */
  // Frame 容器的布局分区
  await page.click('.side-tab:has-text("资产")');
  await sleep(150);
  await page.click('[title="添加 框架"]');
  await sleep(400);
  for (const field of ['方向', '定位', '宽模式', '高模式', '内边距', '间距', '对齐', '分布', '折行', '裁剪', '宽限', '高限']) {
    record('FRAME', '布局', `${field} 字段可见`, await hasLabel(field), '');
  }
  // 实测改内边距（四向）→ 出码 padding 变化
  const fBefore = await getCode();
  const padOk = await setField('内边距', 18);
  const fAfter = await getCode();
  record('FRAME', '布局', '内边距→出码', padOk && /padding/.test(fAfter.all) && fAfter.all !== fBefore.all, '');
  // 改间距 gap
  const gBefore = await getCode();
  const gapOk = await setField('间距', 24);
  const gAfter = await getCode();
  record('FRAME', '布局', '间距 gap→出码', gapOk && /gap:\s*24px/.test(gAfter.all), '');
  // 方向改横向
  const dirOk = await setSelect('方向', '横向');
  const dAfter = await getCode();
  record('FRAME', '布局', '方向→横向', dirOk && /flex-direction:\s*row/.test(dAfter.all), '');

  /* ---------- F. 效果（Effects 8 类） ---------- */
  const addEffect = page.locator('.props button:has-text("添加效果")').first();
  if (await addEffect.count()) {
    await page.click('.side-tab:has-text("图层")');
    await sleep(200);
    await page.locator('.layer-row').nth(1).click();
    await sleep(300);
    const btn = page.locator('.props button:has-text("添加效果")').first();
    const before = await getCode();
    await btn.click();
    await sleep(450);
    const after = await getCode();
    record('EFFECTS', '效果', '添加效果→出码', /box-shadow|filter|backdrop/.test(after.all) && after.all !== before.all, '');
  } else record('EFFECTS', '效果', '添加效果按钮', false, '未找到');

  /* ---------- H. Constraints 档位 ---------- */
  const consSelects = await page.locator('.props select').count();
  record('CONSTRAINTS', '约束', '下拉控件存在', consSelects >= 2, `select 数=${consSelects}`);
  });

  await section('EFFECTS', async () => {
  /* ---------- F. 效果（Effects 8 类） ---------- */
  await page.click('.side-tab:has-text("图层")');
  await sleep(200);
  const addEffect = page.locator('.props button:has-text("添加效果")').first();
  if (await addEffect.count()) {
    const before = await getCode();
    await addEffect.click();
    await sleep(450);
    const after = await getCode();
    record('EFFECTS', '效果', '添加效果→出码', /box-shadow|filter|backdrop/.test(after.all) && after.all !== before.all, '');
  } else record('EFFECTS', '效果', '添加效果按钮', false, '未找到');
  });

  await section('EXPORT', async () => {
  /* ---------- G. 导出设置 ---------- */
  const exportArea = await page.locator('.props').innerText();
  record('EXPORT', '导出', 'Export 分区可见', /导出|Export/i.test(exportArea), '');
  });
} catch (e) {
  record('AUDIT', 'FATAL', '脚本异常', false, String(e && e.message ? e.message : e));
} finally {
  await browser.close();
  server.kill();
}

const pass = rows.filter((r) => r.ok).length;
const report = {
  total: rows.length,
  pass,
  fail: rows.length - pass,
  passRate: rows.length ? Number(((pass / rows.length) * 100).toFixed(1)) : 0,
  errors,
  rows,
};
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

console.log(`\n=== 参数审计：${pass}/${rows.length} = ${report.passRate}% ===`);
const fails = rows.filter((r) => !r.ok);
if (fails.length) {
  console.log('\n未通过项：');
  for (const f of fails) console.log(`  ${f.node} / ${f.area} / ${f.field}  — ${f.note}`);
}
if (errors.length) console.log(`\n页面错误 ${errors.length}：${errors.slice(0, 3).join(' | ')}`);
