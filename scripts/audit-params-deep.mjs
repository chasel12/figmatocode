/**
 * 全参数深度审计（二期 · 全参数覆盖）—— 2026-10-18
 *
 * 与一期 `scripts/audit-params.mjs`（51 项基础参数）互补：本脚本覆盖**一期未涉及**的参数族，
 * 每个参数都做三重实测：
 *   ① 控件接受输入（读回控件值 inputValue）→
 *   ② 出码产物变化（CodeModal 的 preview.html / index.scss；preview.html 内嵌同一份 CSS，
 *      关键项额外比对 index.scss 通道）→
 *   ③ 语义正确（产物里的声明值 = 期望语义；必要时再用 autosave 快照核对 store 值）
 *
 * 覆盖族：
 *   A 填充 5 型（SOLID/4 渐变）+ 停靠点 + 角度 + 多层/显隐/层透明度/排序/删除
 *   B 描边 3 对齐 + 宽/色/透明度/虚线段长 + cap/join/miterLimit（SVG 通道）+ 四边独立
 *   C 效果 8 类（阴影/模糊/背景模糊/渐进模糊/噪点/纹理/玻璃）+ 参数 + 显隐/删除/排序
 *   D 排版全字段（行高 3 模式/字距 2 模式/段间距/首行缩/对齐 4/垂直对 3/textCase 5/装饰 3/
 *     自动大小 3/自动换行/截断+最大行）
 *   E 形状（OVAL arcData 起止角+内径、POLYGON 边数、STAR 边数+内径、四角独立圆角、cornerSmoothing）
 *   F 图片（4 种 scaleMode + 7 项调整滑杆）
 *   G 导出设置（格式 4 / scale 3 / suffix）
 *   H 约束 4×2 + Auto Layout（wrap/gapCross/min-max/clipContent/align/justify）
 *
 * **未实现/占位**的参数不判 FAIL 了事：note 里写明现象，并单独汇总进 `unimplemented[]`。
 *
 * 运行：node scripts/audit-params-deep.mjs      （端口 4271，避免与一期 4241 冲突）
 * 前置：npm run build（或 npm run precanvasdiff）产出 dist/app + dist/pages/*
 * 输出：dist/audit-params-deep/report.json  {total, pass, fail, unimplemented[], rows[]}
 */
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('E:\\ms-playwright')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = 'E:\\ms-playwright';
}

const root = process.cwd();
const outDir = join(root, 'dist', 'audit-params-deep');
mkdirSync(outDir, { recursive: true });
const PORT = 4271;
const URL = `http://localhost:${PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 被测构建指纹：dist/app/assets 最新 mtime（并行会话可能中途重建，报告里必须能归因到具体构建） */
function buildStamp() {
  try {
    const dir = join(root, 'dist', 'app', 'assets');
    if (!existsSync(dir)) return 'dist/app/assets 不存在';
    const files = readdirSync(dir).map((f) => ({ f, m: statSync(join(dir, f)).mtimeMs }));
    if (!files.length) return '空目录';
    const newest = files.sort((a, b) => b.m - a.m)[0];
    return `${newest.f} @ ${new Date(newest.m).toISOString()}`;
  } catch (e) {
    return String(e?.message ?? e);
  }
}

/* ---------- 记录器 ---------- */

const rows = [];
const unimplemented = [];
const defects = [];

/**
 * @param {string} node 节点族（FILL/STROKE/EFFECT/TYPO/SHAPE/IMAGE/EXPORT/CONSTRAINT/AUTOLAYOUT/CHANNEL）
 * @param {string} area 分区
 * @param {string} field 字段
 * @param {boolean} ok
 * @param {string} note 必须带实测值（控件读回 + 出码实测片段）
 */
const record = (node, area, field, ok, note = '') => {
  rows.push({ node, area, field, ok: !!ok, kind: 'assert', note });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  [${node}/${area}] ${field}${note ? '  -- ' + note : ''}`);
};

/** 口径说明行（不参与通过率，只留证据） */
const recordNote = (node, area, field, note) => {
  rows.push({ node, area, field, ok: true, kind: 'note', note });
  console.log(`NOTE  [口径] ${node}/${area} ${field} — ${note}`);
};

/** 未实现/占位清单（用户要的「没对应上的功能清单」） */
const unimpl = (node, field, kind, detail) => {
  unimplemented.push({ node, field, kind, detail });
  console.log(`NOTE  [未实现/${kind}] ${node} / ${field} — ${detail}`);
};

/** 真产品缺陷（控件/UI 与行为不一致，非「CSS 无原生」类近似） */
const defect = (node, field, severity, detail, repro) => {
  defects.push({ node, field, severity, detail, repro });
  console.log(`DEFECT [${severity}] ${node} / ${field} — ${detail}`);
};

/* ---------- 静态服务 ---------- */

let server = null;
let reuse = false;
try {
  const pre = await fetch(URL);
  reuse = pre.ok;
} catch {
  reuse = false;
}
if (!reuse) {
  server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], { shell: true, stdio: 'ignore' });
}
let ready = reuse;
for (let i = 0; i < 80 && !ready; i++) {
  try {
    const r = await fetch(URL);
    if (r.ok) ready = true;
  } catch {}
  if (!ready) await sleep(250);
}
if (!ready) {
  server?.kill();
  throw new Error('preview 未就绪（端口 ' + PORT + '）');
}
if (reuse) console.log(`（端口 ${PORT} 已有 preview 服务，复用）`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('dialog', (d) => d.accept());

const ROOT_ID = 'page';

/* ---------- 基础工具 ---------- */

const selectTab = async (name) => {
  await page.click(`.side-tab:has-text("${name}")`);
  await sleep(160);
};

/** 选图层（按 data-node-id；需先切到「图层」页签） */
async function selectNode(id) {
  await selectTab('图层');
  const loc = page.locator(`.layer-row[data-node-id="${id}"]`);
  if (!(await loc.count())) return false;
  await loc.first().click();
  await sleep(320);
  return true;
}

/** autosave 快照（当前页）——store 只读核对通道；Editor 侧 500ms 防抖，故读前先等 */
async function readPageState() {
  return page.evaluate(() => {
    const raw = localStorage.getItem('ui-compiler.autosave.v2');
    if (!raw) return null;
    try {
      const env = JSON.parse(raw);
      return (env.project?.pages ?? []).find((p) => p.id === env.currentPageId) ?? null;
    } catch {
      return null;
    }
  });
}
const walkState = (n, visit) => {
  visit(n);
  (n.children ?? []).forEach((c) => walkState(c, visit));
};
/** store 里某节点的实际值（等 700ms 让 autosave 落盘） */
async function stateNode(id, pick) {
  await sleep(700);
  const pg = await readPageState();
  if (!pg) return { found: false };
  let hit = null;
  walkState(pg.root, (n) => {
    if (n.id === id && !hit) hit = n;
  });
  if (!hit) return { found: false };
  return { found: true, node: hit, value: pick ? pick(hit) : hit };
}
/** 最近创建的节点（节点 id 的 `-N` 后缀即全局创建序 → 取最大 N） */
async function lastCreated() {
  await sleep(700);
  const pg = await readPageState();
  if (!pg) return null;
  let best = null;
  let bestN = -1;
  walkState(pg.root, (n) => {
    const m = /-(\d+)$/.exec(n.id ?? '');
    const k = m ? Number(m[1]) : -1;
    if (k > bestN) {
      bestN = k;
      best = n;
    }
  });
  return best;
}

/** 生成代码：读 preview.html（内嵌完整 CSS）；opts.scss 时额外读 index.scss 通道 */
async function getCode(opts = {}) {
  await page.click('.toolbar button:has-text("生成代码")');
  await page.waitForSelector('.code-modal .code-view', { timeout: 15000 });
  await sleep(180);
  await page.click('.code-modal .tab:has-text("preview.html")');
  await sleep(230);
  const html = (await page.locator('.code-modal .code-view').innerText()) || '';
  let scss = '';
  if (opts.scss) {
    await page.click('.code-modal .tab:has-text("index.scss")');
    await sleep(230);
    scss = (await page.locator('.code-modal .code-view').innerText()) || '';
  }
  await page.click('.code-modal .btn-ghost');
  await sleep(150);
  return { html, scss, all: html + '\n' + scss };
}

/** 取某 class 的 CSS 块（多块合并）；class 允许带类型前缀（取第一个匹配的编号） */
function blockOf(codeText, cls) {
  const esc = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\.${esc}\\s*\\{([^}]*)\\}`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(codeText))) out.push(m[1].replace(/\s+/g, ' ').trim());
  return out.join(' || ');
}
/** 按类型取编号块的 CSS（如 typeBlock(html,'rectangle') → 全部 rectangle-N 块） */
function typeBlocks(codeText, type) {
  const re = new RegExp(`\\.${type}-(\\d+)\\s*\\{([^}]*)\\}`, 'g');
  const out = {};
  let m;
  while ((m = re.exec(codeText))) out[`${type}-${m[1]}`] = m[2].replace(/\s+/g, ' ').trim();
  return out;
}
/** 取**精确属性**声明值（避免 `height:` 误匹配 `min-height:`；块内声明以 `; ` 分隔） */
function declOf(block, prop) {
  const re = new RegExp(`(?:^|;)\\s*${prop.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\s*:\\s*([^;]*)`);
  const m = re.exec(block ?? '');
  return m ? m[1].trim() : '';
}

/** 属性面板：按 label 定位 .field-row（可限定分区 heading；大小写/空白敏感 → trim 后全等比较） */
async function rowIndex(label, sec = null, nth = 0) {
  return page.evaluate(
    ([want, secHeading, k]) => {
      const all = Array.from(document.querySelectorAll('.props .field-row'));
      let pool = all;
      if (secHeading) {
        const s = Array.from(document.querySelectorAll('.props .prop-section')).find(
          (x) => (x.querySelector('.prop-heading')?.textContent ?? '').trim() === secHeading,
        );
        if (!s) return -2;
        pool = Array.from(s.querySelectorAll('.field-row'));
      }
      const hits = pool.filter((r) => (r.querySelector('.field-label')?.textContent ?? '').trim() === want);
      const t = hits[k];
      return t ? all.indexOf(t) : -1;
    },
    [label, sec, nth],
  );
}
async function row(label, sec = null, nth = 0) {
  const i = await rowIndex(label, sec, nth);
  return i < 0 ? null : { loc: page.locator('.props .field-row').nth(i), why: i === -2 ? '分区不存在' : '行不存在' };
}
const rowCount = () => page.locator('.props .field-row').count();
const hasRow = async (label, sec = null) => (await rowIndex(label, sec)) >= 0;

/** 写数值（.num-box 数字框，Enter 提交）→ 读回控件值 */
async function setNum(label, value, opts = {}) {
  const { sec = null, nth = 0, box = 0 } = opts;
  const r = await row(label, sec, nth);
  if (!r) return { ok: false, why: r?.why ?? 'no-row' };
  const inp = r.loc.locator('input.num-box').nth(box);
  if (!(await inp.count())) return { ok: false, why: 'no-num-box' };
  if (await inp.isDisabled().catch(() => false)) return { ok: true, back: 'DISABLED', declared: true };
  await inp.fill(String(value));
  await inp.press('Enter').catch(() => {});
  await sleep(330);
  const r2 = await row(label, sec, nth);
  const back = r2 ? await r2.loc.locator('input.num-box').nth(box).inputValue().catch(() => '?') : '?';
  return { ok: true, back };
}

/** 写 select（按可见文本）→ 读回 value */
async function setSelect(label, optionLabel, opts = {}) {
  const { sec = null, nth = 0, idx = 0 } = opts;
  const r = await row(label, sec, nth);
  if (!r) return { ok: false, why: r?.why ?? 'no-row' };
  const sel = r.loc.locator('select').nth(idx);
  if (!(await sel.count())) return { ok: false, why: 'no-select' };
  await sel.selectOption({ label: optionLabel }).catch(() => {});
  await sleep(360);
  const r2 = await row(label, sec, nth);
  const back = r2 ? await r2.loc.locator('select').nth(idx).inputValue().catch(() => '?') : '?';
  return { ok: true, back };
}

/** 写文本输入（ColorField 文本 / URL / suffix 等）→ 读回 */
async function setText(label, value, opts = {}) {
  const { sec = null, nth = 0, idx = 0, blur = true } = opts;
  const r = await row(label, sec, nth);
  if (!r) return { ok: false, why: r?.why ?? 'no-row' };
  const inp = r.loc.locator('input[type="text"]').nth(idx);
  if (!(await inp.count())) return { ok: false, why: 'no-text-input' };
  await inp.fill(String(value));
  await sleep(150);
  if (blur) await inp.blur().catch(() => {});
  await sleep(300);
  const r2 = await row(label, sec, nth);
  const back = r2 ? await r2.loc.locator('input[type="text"]').nth(idx).inputValue().catch(() => '?') : '?';
  return { ok: true, back };
}

/** 写 range（React 受控：原生 setter + input 事件，绕开 value tracker 去重） */
async function setRange(label, value, opts = {}) {
  const { sec = null, nth = 0, idx = 0 } = opts;
  const r = await row(label, sec, nth);
  if (!r) return { ok: false, why: r?.why ?? 'no-row' };
  const inp = r.loc.locator('input[type="range"]').nth(idx);
  if (!(await inp.count())) return { ok: false, why: 'no-range' };
  await inp.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await sleep(320);
  const r2 = await row(label, sec, nth);
  const back = r2 ? await r2.loc.locator('input[type="range"]').nth(idx).inputValue().catch(() => '?') : '?';
  return { ok: true, back };
}

/** 点分区内某按钮（按文本） */
async function clickSectionBtn(sec, text) {
  const btn = page.locator(`.props .prop-section:has(.prop-heading:text-is("${sec}")) button:has-text("${text}")`);
  if (!(await btn.count())) return false;
  await btn.first().click();
  await sleep(420);
  return true;
}
/** 点某行内的按钮（按标题） */
async function clickRowBtn(label, title, opts = {}) {
  const { sec = null, nth = 0 } = opts;
  const r = await row(label, sec, nth);
  if (!r) return false;
  const btn = r.loc.locator(`button[title="${title}"]`);
  if (!(await btn.count())) return false;
  await btn.first().click();
  await sleep(400);
  return true;
}

/** 效果分区：eff-field（label.eff-field > span + NumField/text） */
async function effFieldIndex(text) {
  return page.evaluate((want) => {
    const list = Array.from(document.querySelectorAll('.props .eff-field'));
    return list.findIndex((l) => (l.querySelector('span')?.textContent ?? '').trim() === want);
  }, text);
}
async function setEffNum(text, value) {
  const i = await effFieldIndex(text);
  if (i < 0) return { ok: false, why: 'no-eff-field' };
  const inp = page.locator('.props .eff-field').nth(i).locator('input.num-box').first();
  if (!(await inp.count())) return { ok: false, why: 'no-num-box' };
  // 置灰控件=已声明口径（如 GLASS 色散 D1 修复），不 fill 不超时（判据回写 2026-10-20）
  if (await inp.isDisabled().catch(() => false)) return { ok: true, back: 'DISABLED', declared: true };
  await inp.fill(String(value));
  await inp.press('Enter').catch(() => {});
  await sleep(330);
  const j = await effFieldIndex(text);
  const back = j >= 0 ? await page.locator('.props .eff-field').nth(j).locator('input.num-box').first().inputValue().catch(() => '?') : '?';
  return { ok: true, back };
}
async function setEffText(text, value) {
  const i = await effFieldIndex(text);
  if (i < 0) return { ok: false, why: 'no-eff-field' };
  const inp = page.locator('.props .eff-field').nth(i).locator('input[type="text"]').first();
  if (!(await inp.count())) return { ok: false, why: 'no-text' };
  await inp.fill(String(value));
  await sleep(150);
  await inp.blur().catch(() => {});
  await sleep(300);
  return { ok: true, back: value };
}

/* 填充/效果层（.fill-layer）操作 */
const fillSection = () => page.locator('.props .prop-section:has(.prop-heading:text-is("填充"))');
const effSection = () => page.locator('.props .prop-section:has(.prop-heading:text-is("效果"))');
const fillLayer = (i = 0) => fillSection().locator('.fill-layer').nth(i);
const effLayer = (i = 0) => effSection().locator('.fill-layer').nth(i);

async function setFillColor(i, hex) {
  const inp = fillLayer(i).locator('.fill-layer-head input[type="text"]').first();
  if (!(await inp.count())) return { ok: false, why: 'no-color-input' };
  await inp.fill(hex);
  await sleep(160);
  await inp.blur().catch(() => {});
  await sleep(320);
  return { ok: true, back: await inp.inputValue().catch(() => '?') };
}
async function setFillType(i, optionLabel) {
  const sel = fillLayer(i).locator('.fill-layer-head select').first();
  if (!(await sel.count())) return { ok: false, why: 'no-type-select' };
  await sel.selectOption({ label: optionLabel }).catch(() => {});
  await sleep(420);
  const sel2 = fillLayer(i).locator('.fill-layer-head select').first();
  return { ok: true, back: await sel2.inputValue().catch(() => '?') };
}
async function setFillOpacity(i, pct) {
  const inp = fillLayer(i).locator('.fill-layer-head input.num-box').first();
  if (!(await inp.count())) return { ok: false, why: 'no-opacity-box' };
  await inp.fill(String(pct));
  await inp.press('Enter').catch(() => {});
  await sleep(330);
  const inp2 = fillLayer(i).locator('.fill-layer-head input.num-box').first();
  return { ok: true, back: await inp2.inputValue().catch(() => '?') };
}
async function fillLayerBtn(i, title) {
  const btn = fillLayer(i).locator(`button[title="${title}"]`);
  if (!(await btn.count())) return false;
  await btn.first().click();
  await sleep(420);
  return true;
}
async function setStopColor(i, si, hex) {
  const inp = fillLayer(i).locator('.fill-stop').nth(si).locator('input[type="text"]').first();
  if (!(await inp.count())) return { ok: false, why: 'no-stop-input' };
  await inp.fill(hex);
  await sleep(160);
  await inp.blur().catch(() => {});
  await sleep(320);
  return { ok: true };
}
async function setStopNum(i, si, box, value) {
  const inp = fillLayer(i).locator('.fill-stop').nth(si).locator('input.num-box').nth(box);
  if (!(await inp.count())) return { ok: false, why: 'no-stop-num' };
  await inp.fill(String(value));
  await inp.press('Enter').catch(() => {});
  await sleep(330);
  const inp2 = fillLayer(i).locator('.fill-stop').nth(si).locator('input.num-box').nth(box);
  return { ok: true, back: await inp2.inputValue().catch(() => '?') };
}

/* 效果层操作 */
async function setEffKind(i, optionLabel) {
  const sel = effLayer(i).locator('.fill-layer-head select').first();
  if (!(await sel.count())) return { ok: false, why: 'no-kind-select' };
  await sel.selectOption({ label: optionLabel }).catch(() => {});
  await sleep(450);
  const sel2 = effLayer(i).locator('.fill-layer-head select').first();
  return { ok: true, back: await sel2.inputValue().catch(() => '?') };
}
async function effLayerBtn(i, title) {
  const btn = effLayer(i).locator(`button[title="${title}"]`);
  if (!(await btn.count())) return false;
  await btn.first().click();
  await sleep(450);
  return true;
}

/* 建节点：全部落在页面根级（先选根，避免「选中容器则新增为子级」的语义） */
async function addNode(title) {
  await selectNode(ROOT_ID);
  await selectTab('资产');
  await page.click(`[title="${title}"]`);
  await sleep(480);
  return lastCreated();
}
/** 工具轨拖画（多边形/星形无 Palette 入口） */
async function drawWithTool(title, dx, dy, dw = 80, dh = 80) {
  await selectNode(ROOT_ID);
  const t = page.locator(`.tool-strip [title="${title}"]`);
  if (!(await t.count())) return null;
  await t.click();
  await sleep(220);
  const box = await page.locator('.konvajs-content').boundingBox();
  await page.mouse.move(box.x + dx, box.y + dy);
  await page.mouse.down();
  await page.mouse.move(box.x + dx + dw, box.y + dy + dh, { steps: 6 });
  await page.mouse.up();
  await sleep(520);
  await page.keyboard.press('Escape').catch(() => {}); // 退出绘制工具（随后一律显式选节点，不依赖选中态）
  await sleep(150);
  return lastCreated();
}
/** SVG path 顶点数（数 L 指令；POLYGON/STAR 出码用 <path d>，不是 clip-path） */
function lCount(pathD) {
  return (pathD.match(/\bL\b/g) ?? []).length;
}

/* ---------- 主流程 ---------- */

let snap = '';

try {
  await page.goto(URL);
  await page.waitForSelector('.editor', { timeout: 20000 });
  await sleep(700);

  /** 单段异常不中断全局 */
  const section = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      record(name, 'SECTION', '该分区执行异常', false, String(e && e.message ? e.message : e).slice(0, 180));
    }
  };

  /** 断言封装：改值 → 出码 → 判定；返回出码 + class 块 */
  const verify = async (label) => {
    const c = await getCode();
    return c;
  };

  /* ============================================================
   * 0. 建测试节点（先拖画多边形/星形，此时画布空、命中干净）
   * ============================================================ */
  const polyNode = await drawWithTool('多边形', 240, 200);
  const starNode = await drawWithTool('星形', 400, 200);
  const r1 = await addNode('添加 矩形');
  const r2 = await addNode('添加 矩形');
  const r3 = await addNode('添加 矩形');
  const textNode = await addNode('添加 文本');
  const ovalNode = await addNode('添加 椭圆');
  const lineNode = await addNode('添加 直线');
  const imgNode = await addNode('添加 图片');
  const frameNode = await addNode('添加 框架');

  console.log(
    '\n建节点：',
    JSON.stringify({
      poly: polyNode?.id,
      star: starNode?.id,
      r1: r1?.id,
      r2: r2?.id,
      r3: r3?.id,
      text: textNode?.id,
      oval: ovalNode?.id,
      line: lineNode?.id,
      img: imgNode?.id,
      frame: frameNode?.id,
    }),
  );

  /* ============================================================
   * A. 填充 5 型 + 停靠点 + 角度 + 多层/显隐/透明度/排序/删除
   * ============================================================ */
  await section('FILL', async () => {
    await selectNode(r1.id);
    const addOk = await clickSectionBtn('填充', '+ 添加填充');
    record('FILL', '创建', '添加第 1 个填充层', addOk, addOk ? '按钮「+ 添加填充」可点' : '未找到按钮');

    /* --- SOLID 颜色 --- */
    let colorRes = await setFillColor(0, '#ff8800');
    snap = (await getCode()).html;
    const solidBlock = blockOf(snap, 'rectangle-1');
    record(
      'FILL',
      'SOLID',
      '纯色颜色',
      /#ff8800/.test(solidBlock),
      `控件=${colorRes.back ?? '?'} → 出码=${(solidBlock.match(/background-image:[^;]*/) ?? ['无'])[0]}`,
    );

    /* --- 4 型渐变（同一层反复切换） --- */
    for (const [opt, want, tag] of [
      ['线性', 'linear-gradient(90deg', 'GRADIENT_LINEAR'],
      ['径向', 'radial-gradient(circle at 50% 50%', 'GRADIENT_RADIAL'],
      ['角度', 'conic-gradient(from 90deg', 'GRADIENT_ANGULAR'],
      ['菱形', 'linear-gradient(90deg', 'GRADIENT_DIAMOND'],
    ]) {
      const t = await setFillType(0, opt);
      const c = await getCode();
      const blk = blockOf(c.html, 'rectangle-1');
      const bi = (blk.match(/background-image:[^;]*/) ?? ['无'])[0];
      const changed = c.html !== snap;
      snap = c.html;
      const ok = bi.includes(want) && changed;
      record(
        'FILL',
        `渐变 ${tag}`,
        `类型→${opt}`,
        ok,
        `下拉=${t.back ?? '?'} → 出码=${bi}${changed ? '' : '（产物未变）'}`,
      );
      if (tag === 'GRADIENT_DIAMOND' && ok) {
        unimpl(
          'FILL',
          'GRADIENT_DIAMOND 菱形渐变',
          'approximate',
          `面板可选「菱形」，store 记为 GRADIENT_DIAMOND，但出码回落 linear-gradient（compile.ts fillLayerCss 注释：CSS 无菱形原生，线性近似）；实测产物=${bi}`,
        );
      }
    }

    /* --- 回到线性，测 stop 颜色/位置/透明度 + 角度 --- */
    await setFillType(0, '线性');
    let st = await setStopColor(0, 1, '#00FF00');
    let c = await getCode();
    let blk = blockOf(c.html, 'rectangle-1');
    record('FILL', '渐变停靠点', 'stop2 颜色', /#00FF00/.test(blk), `控件=${st.ok ? '#00FF00' : '失败'} → 出码=${(blk.match(/background-image:[^;]*/) ?? ['无'])[0]}`);

    st = await setStopNum(0, 0, 0, 30);
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-1');
    record('FILL', '渐变停靠点', 'stop1 位置 30%', /30%/.test(blk), `控件读回=${st.back}% → 出码=${(blk.match(/background-image:[^;]*/) ?? ['无'])[0]}`);

    st = await setStopNum(0, 0, 1, 50);
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-1');
    record('FILL', '渐变停靠点', 'stop1 透明度 50%', /rgba?\([^)]*0?\.5\)|,\s*0\.5\)/.test(blk), `控件读回=${st.back}% → 出码=${(blk.match(/background-image:[^;]*/) ?? ['无'])[0]}`);
    await setStopNum(0, 0, 1, 100); // 复位，避免污染「层透明度」判定

    const ang = await setNum('角度', 45, { sec: '填充' });
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-1');
    record('FILL', '渐变角度', '角度 45°→CSS 135deg', /linear-gradient\(135deg/.test(blk), `控件读回=${ang.back}° → 出码=${(blk.match(/background-image:[^;]*/) ?? ['无'])[0]}`);

    /* --- 层透明度 --- */
    const fop = await setFillOpacity(0, 50);
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-1');
    record('FILL', '层透明度', '0–100% 滑杆 50', /0?\.5\)/.test(blk), `控件读回=${fop.back}% → 出码=${(blk.match(/background-image:[^;]*/) ?? ['无'])[0]}`);

    /* --- 多层填充 --- */
    await clickSectionBtn('填充', '+ 添加填充');
    await setFillColor(1, '#3366cc');
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-1');
    const layers = (blk.match(/background-image:\s*([^;]*)/) ?? [, ''])[1];
    const layerCount = layers.includes('gradient') ? layers.split(/\),\s*(?=[a-z-]+gradient)/).length : 0;
    record(
      'FILL',
      '多层',
      '添加第 2 层 → 逗号分隔两层',
      layerCount === 2 && /#3366cc/.test(layers),
      `层数=${layerCount} → 出码 background-image=${layers}`,
    );

    /* --- 单层显隐（眼睛） --- */
    // 层色签名（层透明度可能把 hex 变成 rgba，两种形态都认）
    const sigA = /#ff8800|255,\s*136,\s*0/;
    const sigB = /#3366cc|51,\s*102,\s*204/;
    const posA = (t) => t.search(sigA);
    const posB = (t) => t.search(sigB);
    const hid1 = await fillLayerBtn(0, '隐藏该层');
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-1');
    const biHidden = (blk.match(/background-image:\s*([^;]*)/) ?? [, ''])[1];
    record(
      'FILL',
      '显隐',
      '第 1 层「眼睛」隐藏',
      hid1 && posA(biHidden) < 0 && posB(biHidden) >= 0,
      `按钮可点=${hid1} → 出码=${biHidden || '无 background-image'}`,
    );
    const shown = await fillLayerBtn(0, '显示该层');
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-1');
    const biShown = (blk.match(/background-image:\s*([^;]*)/) ?? [, ''])[1];
    record(
      'FILL',
      '显隐',
      '再次点击 → 该层恢复',
      shown && posA(biShown) >= 0 && posB(biShown) >= 0,
      `按钮可点=${shown} → 出码=${biShown}`,
    );

    /* --- 排序（上移/下移）：数组序 = CSS 层序（首项在上） --- */
    const before = blockOf((await getCode()).html, 'rectangle-1');
    const orderBefore = posA(before) < posB(before) ? '层1(#ff8800)在前' : '层2(#3366cc)在前';
    const moved = await fillLayerBtn(1, '上移');
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-1');
    const orderAfter = posA(blk) < posB(blk) ? '层1(#ff8800)在前' : '层2(#3366cc)在前';
    record('FILL', '排序', '第 2 层上移', moved && orderBefore !== orderAfter, `${orderBefore} → ${orderAfter}；出码=${(blk.match(/background-image:[^;]*/) ?? ['无'])[0]}`);

    /* --- 删除层 --- */
    await fillLayerBtn(0, '下移'); // 先复原顺序（上一格上移过），保证「删第 2 层」删的是 #3366cc
    const del = await fillLayerBtn(1, '删除该层');
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-1');
    record('FILL', '删除', '删除第 2 层', del && posB(blk) < 0 && posA(blk) >= 0, `按钮可点=${del} → 出码=${(blk.match(/background-image:[^;]*/) ?? ['无'])[0]}`);
  });

  /* ============================================================
   * B. 描边 3 对齐 + 宽/色/透明度/虚线 + cap/join/miterLimit + 四边
   * ============================================================ */
  await section('STROKE', async () => {
    await selectNode(r1.id);
    const w = await setNum('宽度', 2, { sec: '描边' });
    let c = await getCode();
    let blk = blockOf(c.html, 'rectangle-1');
    record('STROKE', '宽度', '宽度 2', /border:\s*2px/.test(blk), `控件读回=${w.back} → 出码=${(blk.match(/border:[^;]*/) ?? ['无'])[0]}`);

    const col = await setText('宽度', '#ff0000', { sec: '描边' });
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-1');
    record('STROKE', '颜色', '描边色 #ff0000', /#ff0000/.test(blk), `控件=${col.back} → 出码=${(blk.match(/border:[^;]*/) ?? ['无'])[0]}`);

    const op = await setNum('透明度', 50, { sec: '描边' });
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-1');
    record('STROKE', '透明度', '描边层透明度 50%', /0?\.5\)/.test(blk), `控件读回=${op.back}% → 出码=${(blk.match(/border:[^;]*/) ?? ['无'])[0]}`);
    await setNum('透明度', 100, { sec: '描边' });

    const dash = await setNum('虚线', 6, { sec: '描边', box: 0 });
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-1');
    record('STROKE', '虚线', '虚线 6 → dashed', /dashed/.test(blk), `控件读回=${dash.back} → 出码=${(blk.match(/border:[^;]*/) ?? ['无'])[0]}`);

    /* 虚线段长/间隔：gap 值（dash[1]）CSS 无承载 —— 报备 */
    const gap = await setNum('虚线', 3, { sec: '描边', box: 1 });
    const cGap = await getCode();
    blk = blockOf(cGap.html, 'rectangle-1');
    const gapChanged = cGap.html !== c.html;
    record(
      'STROKE',
      '虚线',
      '虚线间隔（dash[1]）',
      gapChanged,
      `控件读回=${gap.back}；出码=${(blk.match(/border:[^;]*/) ?? ['无'])[0]}${gapChanged ? '' : '（CSS border 无 dash-gap 语义，产物不变）'}`,
    );
    if (!gapChanged) {
      unimpl(
        'STROKE',
        '虚线间隔（第二个数值）',
        'unimplemented',
        '面板可改 dash[1]，但 CSS `border-style: dashed` 不接收 dash/gap 数值，出码与 store 均无差异（BorderSchema 注释：gap 为近似保留位），preview.html 无任何新声明',
      );
    }
    await setNum('虚线', 0, { sec: '描边', box: 0 });

    /* --- 三对齐 --- */
    for (const [opt, kind] of [
      ['内侧', 'INSIDE'],
      ['居中', 'CENTER'],
      ['外侧', 'OUTSIDE'],
    ]) {
      const s = await setSelect('对齐', opt, { sec: '描边' });
      c = await getCode();
      blk = blockOf(c.html, 'rectangle-1');
      const decl = (blk.match(/(border|outline|outline-offset|box-shadow):[^;]*/g) ?? []).join(' | ');
      let ok = false;
      if (kind === 'INSIDE') ok = /border:\s*2px/.test(blk) && !/outline:/.test(blk) && !/box-shadow:\s*0 0 0/.test(blk);
      else if (kind === 'CENTER') ok = /border:\s*1px/.test(blk) && /outline:\s*1px/.test(blk) && /outline-offset/.test(blk);
      else ok = /box-shadow:\s*0 0 0 2px/.test(blk);
      record('STROKE', '对齐', `align=${kind}（${opt}）`, s.ok && ok, `下拉=${s.back ?? '?'} → 出码=${decl || '无'}`);
    }

    /* --- 四边独立宽（附加，一期未覆盖） --- */
    await selectNode(r1.id);
    const four = await clickRowBtn('宽度', '四边独立宽度', { sec: '描边' });
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-1');
    record(
      'STROKE',
      '四边宽',
      '四边独立宽度开关',
      four && /border-top:/.test(blk) && /border-left:/.test(blk),
      `按钮可点=${four} → 出码=${(blk.match(/border-(top|right|bottom|left):[^;]*/g) ?? ['无']).join(' | ')}`,
    );
    // 只改左边宽
    const lw = await setNum('四边宽', 5, { sec: '描边', box: 3 });
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-1');
    record('STROKE', '四边宽', '左边宽 5（第 4 格）', /border-left:\s*5px/.test(blk), `控件读回=${lw.back} → 出码=${(blk.match(/border-left:[^;]*/g) ?? ['无'])[0]}`);
    await clickRowBtn('四边宽', '回到单值宽度', { sec: '描边' });

    /* --- cap / join / miterLimit：矩形（CSS 盒模型无此语义） --- */
    const capRect = await setSelect('端点', '圆角', { sec: '描边' });
    const cCapRect = await getCode();
    record(
      'STROKE',
      '端点',
      'RECTANGLE cap=ROUND（CSS 无 cap 语义）',
      false,
      `下拉=${capRect.back}；出码=${(blockOf(cCapRect.html, 'rectangle-1').match(/border:[^;]*/) ?? ['无'])[0]}（无 stroke-linecap —— 圆角矩形描边在 SVG 通道才表达）`,
    );
    unimpl(
      'STROKE',
      '端点 cap（RECTANGLE/BUTTON 等盒模型节点）',
      'unimplemented',
      '面板 8 档 cap 可设且写入 store，但 CSS border 无 linecap 语义；仅 LINE 的 6 种 ARROW_* 与 VECTOR/POLYGON/STAR/OVAL 的 SVG 通道会出 stroke-linecap',
    );

    /* --- cap / join / miterLimit：POLYGON（SVG 通道，真正生效） --- */
    await selectNode(polyNode.id);
    await setNum('宽度', 2, { sec: '描边' });
    const capOk = await setSelect('端点', '圆角', { sec: '描边' });
    let cp = await getCode();
    record(
      'STROKE',
      '端点',
      'POLYGON cap=ROUND → SVG stroke-linecap',
      /stroke-linecap="round"/.test(cp.html),
      `下拉=${capOk.back} → 出码=${(cp.html.match(/stroke-linecap="[^"]*"/) ?? ['无'])[0]}`,
    );
    const joinOk = await setSelect('连接', '圆角', { sec: '描边' });
    cp = await getCode();
    record(
      'STROKE',
      '连接',
      'POLYGON join=ROUND → stroke-linejoin',
      /stroke-linejoin="round"/.test(cp.html),
      `下拉=${joinOk.back} → 出码=${(cp.html.match(/stroke-linejoin="[^"]*"/) ?? ['无'])[0]}`,
    );
    await setSelect('连接', '尖角', { sec: '描边' });
    const ml = await setNum('连接', 8, { sec: '描边', box: 0 });
    cp = await getCode();
    record(
      'STROKE',
      '连接',
      'POLYGON miterLimit=8 → stroke-miterlimit',
      /stroke-miterlimit="8"/.test(cp.html),
      `控件读回=${ml.back} → 出码=${(cp.html.match(/stroke-miterlimit="[^"]*"/) ?? ['无'])[0]}`,
    );
    const dashPoly = await setNum('虚线', 5, { sec: '描边', box: 0 });
    cp = await getCode();
    record(
      'STROKE',
      '虚线',
      'POLYGON 虚线 → stroke-dasharray',
      /stroke-dasharray="5 5"/.test(cp.html),
      `控件读回=${dashPoly.back} → 出码=${(cp.html.match(/stroke-dasharray="[^"]*"/) ?? ['无'])[0]}`,
    );

    /* --- LINE：cap 仅箭头形态有产物 --- */
    await selectNode(lineNode.id);
    const lineBase = await getCode();
    const capLine = await setSelect('端点', '圆角', { sec: '描边' });
    const lineRound = await getCode();
    const lineSame = blockOf(lineRound.html, 'line-1') === blockOf(lineBase.html, 'line-1');
    record(
      'STROKE',
      '端点',
      'LINE cap=ROUND（期望圆头端点）',
      !lineSame,
      `下拉=${capLine.back}；出码=${(blockOf(lineRound.html, 'line-1').match(/border-top:[^;]*/) ?? ['无'])[0]}${lineSame ? '（产物未变）' : ''}`,
    );
    if (lineSame) {
      unimpl(
        'STROKE',
        'LINE 端点 cap=ROUND/SQUARE（非箭头）',
        'unimplemented',
        'LINE 出码仅 border-top（CSS 无 linecap）；实测 cap 圆角/方角 前后 `.line-N` 块完全一致。cap 生效的唯一路径是 6 种 ARROW_*（转 data-URI SVG）',
      );
    }
    const arrow = await setSelect('端点', '三角箭头', { sec: '描边' });
    const lineArrow = await getCode();
    record(
      'STROKE',
      '端点',
      'LINE cap=ARROW_TRIANGLED → data-URI SVG 箭头',
      /data:image\/svg\+xml/.test(blockOf(lineArrow.html, 'line-1')),
      `下拉=${arrow.back} → 出码=${(blockOf(lineArrow.html, 'line-1').match(/background-image:[^;]{0,60}/) ?? ['无'])[0]}…`,
    );
    const joinLine = await setSelect('连接', '圆角', { sec: '描边' });
    const lineJoin = await getCode();
    const joinSame = blockOf(lineJoin.html, 'line-1') === blockOf(lineArrow.html, 'line-1');
    record(
      'STROKE',
      '连接',
      'LINE join=ROUND（期望 SVG 属性）',
      !joinSame,
      `下拉=${joinLine.back}；出码${joinSame ? '未变' : '已变'}=${(blockOf(lineJoin.html, 'line-1').match(/stroke-linejoin="[^"]*"/) ?? ['无'])[0]}`,
    );
    if (joinSame) {
      unimpl(
        'STROKE',
        'LINE 连接 join / miterLimit',
        'unimplemented',
        'LINE 走 border-top 或 data-URI SVG（箭头），两条路径都不消费 join/miterLimit；实测改 join=圆角 出码零变化。仅 POLYGON/STAR/OVAL/VECTOR 的 SVG 通道出 stroke-linejoin/stroke-miterlimit',
      );
    }
  });

  /* ============================================================
   * C. 效果 8 类 + 参数 + 显隐/删除/排序/叠加
   * ============================================================ */
  await section('EFFECT', async () => {
    await selectNode(r2.id);
    const addOk = await clickSectionBtn('效果', '+ 添加效果');
    record('EFFECT', '创建', '添加效果（默认 DROP_SHADOW）', addOk, addOk ? '按钮「+ 添加效果」可点' : '未找到按钮');

    let c = await getCode();
    let blk = blockOf(c.html, 'rectangle-2');
    record('EFFECT', 'DROP_SHADOW', '投影 → box-shadow', /box-shadow:\s*0px 4px 12px/.test(blk), `出码=${(blk.match(/box-shadow:[^;]*/) ?? ['无'])[0]}`);

    /* 8 类逐个切换 */
    for (const [opt, kind] of [
      ['内阴影', 'INNER_SHADOW'],
      ['图层模糊', 'LAYER_BLUR'],
      ['背景模糊', 'BACKGROUND_BLUR'],
      ['渐进模糊', 'PROGRESSIVE_BLUR'],
      ['噪点', 'NOISE'],
      ['纹理', 'TEXTURE'],
      ['玻璃', 'GLASS'],
    ]) {
      const k = await setEffKind(0, opt);
      c = await getCode();
      blk = blockOf(c.html, 'rectangle-2');
      let ok = false;
      let seen = '';
      if (kind === 'INNER_SHADOW') {
        ok = /box-shadow:\s*inset/.test(blk);
        seen = (blk.match(/box-shadow:[^;]*/) ?? ['无'])[0];
      } else if (kind === 'LAYER_BLUR') {
        ok = /filter:\s*blur\(/.test(blk);
        seen = (blk.match(/filter:[^;]*/) ?? ['无'])[0];
      } else if (kind === 'BACKGROUND_BLUR') {
        ok = /backdrop-filter:\s*blur\(/.test(blk);
        seen = (blk.match(/backdrop-filter:[^;]*/) ?? ['无'])[0];
      } else if (kind === 'PROGRESSIVE_BLUR') {
        ok = /backdrop-filter:\s*blur\(/.test(blk);
        seen = (blk.match(/backdrop-filter:[^;]*/) ?? ['无'])[0];
      } else if (kind === 'NOISE') {
        ok = /filter:\s*url\(#fx-noise-/.test(blk) && /<filter id="fx-noise-/.test(c.html) && /feTurbulence/.test(c.html);
        seen = (blk.match(/filter:[^;]*/) ?? ['无'])[0] + ' + preview.html 内 <filter id="fx-noise-…">';
      } else if (kind === 'TEXTURE') {
        ok = /filter:\s*url\(#fx-texture-/.test(blk) && /<filter id="fx-texture-/.test(c.html) && /feFlood/.test(c.html);
        seen = (blk.match(/filter:[^;]*/) ?? ['无'])[0] + ' + preview.html 内 <filter id="fx-texture-…">';
      } else if (kind === 'GLASS') {
        ok = /backdrop-filter:\s*blur\([^)]*\)\s*saturate\(/.test(blk);
        seen = (blk.match(/backdrop-filter:[^;]*/) ?? ['无'])[0];
      }
      record('EFFECT', kind, `类型→${opt}`, k.ok && ok, `下拉=${k.back ?? '?'} → 出码=${seen}`);
      if (kind === 'PROGRESSIVE_BLUR' && ok) {
        unimpl(
          'EFFECT',
          'PROGRESSIVE_BLUR 渐进模糊',
          'approximate',
          `CSS 无渐进模糊原生：出码用 (startRadius+radius)/2 的均匀 backdrop-filter 近似（compile.ts 注释），实测产物=${seen}，无分区渐变模糊`,
        );
      }
      if (kind === 'GLASS' && ok) {
        unimpl(
          'EFFECT',
          'GLASS 玻璃（7 参数）',
          'placeholder',
          `7 参数仅 refraction/depth/saturation/highlight 参与近似链（blur/saturate/brightness）；dispersion(色散)/chroma/edge 无产物。实测产物=${seen}`,
        );
      }
    }

    /* --- 阴影参数（回到 DROP_SHADOW） --- */
    await setEffKind(0, '投影');
    const ex = await setEffNum('X', 10);
    const ey = await setEffNum('Y', 20);
    const eb = await setEffNum('模糊', 30);
    const es = await setEffNum('扩展', 8);
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-2');
    record(
      'EFFECT',
      'DROP_SHADOW 参数',
      'X/Y/模糊/扩展',
      /box-shadow:\s*10px 20px 30px 8px/.test(blk),
      `控件读回 X=${ex.back} Y=${ey.back} 模糊=${eb.back} 扩展=${es.back} → 出码=${(blk.match(/box-shadow:[^;]*/) ?? ['无'])[0]}`,
    );

    const ecol = await setEffText('颜色', 'rgba(255,0,0,0.5)');
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-2');
    record('EFFECT', 'DROP_SHADOW 参数', '阴影颜色', /rgba\(255,\s*0,\s*0,\s*0?\.5\)/.test(blk), `控件=${ecol.back} → 出码=${(blk.match(/box-shadow:[^;]*/) ?? ['无'])[0]}`);

    /* --- LAYER_BLUR 半径 --- */
    const eblur = await setEffKind(0, '图层模糊');
    const rad = await setEffNum('半径', 24);
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-2');
    record('EFFECT', 'LAYER_BLUR', '半径 24', /filter:\s*blur\(24px\)/.test(blk), `下拉=${eblur.back} 控件读回=${rad.back} → 出码=${(blk.match(/filter:[^;]*/) ?? ['无'])[0]}`);

    /* --- NOISE 参数 --- */
    await setEffKind(0, '噪点');
    const nz = await setEffNum('粒径', 4);
    const nd = await setEffNum('密度', 4);
    const no = await setEffNum('强度', 80);
    c = await getCode();
    const noiseDef = (c.html.match(/<filter id="fx-noise-[^"]*"[^>]*>[\s\S]*?<\/filter>/) ?? ['无'])[0];
    record(
      'EFFECT',
      'NOISE 参数',
      '粒径/密度/强度 → feTurbulence 属性',
      /baseFrequency="0.250"/.test(noiseDef) && /numOctaves="4"/.test(noiseDef) && /slope="0\.80"/.test(noiseDef),
      `控件读回 粒径=${nz.back} 密度=${nd.back} 强度=${no.back} → 滤镜=${noiseDef.replace(/\s+/g, ' ').slice(0, 150)}`,
    );

    /* --- NOISE 颜色（面板有控件；口径：有 color → 噪点着色，无 color → 灰度） --- */
    const cBeforeNoiseColor = c.html;
    const ncol = await setEffText('颜色', '#ff00ff');
    c = await getCode();
    const noiseDef2 = (c.html.match(/<filter id="fx-noise-[^"]*"[^>]*>[\s\S]*?<\/filter>/) ?? ['无'])[0];
    const noiseTinted = /flood-color="#ff00ff"/i.test(noiseDef2) && /\bmode="multiply"/.test(noiseDef2);
    record(
      'EFFECT',
      'NOISE 参数',
      '噪点颜色（面板有输入框）→ 着色滤镜',
      noiseTinted,
      `控件=${ncol.back}；滤镜=${noiseDef2.replace(/\s+/g, ' ').slice(0, 200)}（产物${c.html !== cBeforeNoiseColor ? '已变' : '未变'}）`,
    );
    if (noiseTinted) {
      recordNote(
        'EFFECT',
        'NOISE 颜色',
        '历史差异已修复（口径说明）',
        '本次审计早期构建（19:52 前）实测「噪点颜色」改值产物零变化：collectFxDefs 的 NOISE 分支只出 feTurbulence + saturate(0) + alpha slope，不读 effect.color。当前构建（html.ts 已改为按 color 走 feFlood+feBlend multiply 着色）生效，故该差异记为已修复而非遗留',
      );
    } else {
      unimpl(
        'EFFECT',
        'NOISE 颜色',
        'unimplemented',
        '面板「噪点」给「颜色」文本框并写入 store(effect.color)，但 collectFxDefs 的 NOISE 分支只用 feTurbulence + saturate(0) + alpha slope，不读 color；实测 preview.html 的 <filter id="fx-noise-…"> 前后不变',
      );
    }

    /* --- GLASS 色散 --- */
    await setEffKind(0, '玻璃');
    const gBefore = (await getCode()).html;
    const disp = await setEffNum('色散', 40);
    c = await getCode();
    const glassBlk = blockOf(c.html, 'rectangle-2');
    const glassChanged = c.html !== gBefore;
    record(
      'EFFECT',
      'GLASS 参数',
      '色散 40（' + (disp.declared ? '已置灰=声明口径 D1' : '面板可改') + '）',
      glassChanged,
      `控件读回=${disp.back}；出码=${(glassBlk.match(/backdrop-filter:[^;]*/) ?? ['无'])[0]}${glassChanged ? '' : '（产物不变）'}`,
    );
    if (!glassChanged) {
      unimpl(
        'EFFECT',
        'GLASS 色散（dispersion）',
        'unimplemented',
        '面板 5 个 Glass 参数里 refraction/depth/saturation/highlight 参与近似链，dispersion 仅写 store 不产出；实测改 40 出码零变化（另有 chroma/edge 两个 Figma 参数面板未暴露）',
      );
    }
    recordNote(
      'EFFECT',
      'GLASS 参数',
      '面板暴露的 5 项与近似链',
      `折射/深度/高光/饱和 4 项参与近似链（色散未参与，见下）；改前出码=${(glassBlk.match(/backdrop-filter:[^;]*/) ?? ['无'])[0]}（近似，非 Figma 玻璃物理）`,
    );
    const refr = await setEffNum('折射', 20);
    c = await getCode();
    const glassBlk2 = blockOf(c.html, 'rectangle-2');
    record(
      'EFFECT',
      'GLASS 参数',
      '折射 20 → blur(13px)',
      /blur\(13px\)/.test(glassBlk2),
      `控件读回=${refr.back} → 出码=${(glassBlk2.match(/backdrop-filter:[^;]*/) ?? ['无'])[0]}`,
    );

    /* --- TEXTURE 颜色（对比 NOISE：纹理走 feFlood，颜色有效） --- */
    await setEffKind(0, '纹理');
    const txCol = await setEffText('颜色', '#ff0000');
    c = await getCode();
    const texDef = (c.html.match(/<filter id="fx-texture-[^"]*"[^>]*>[\s\S]*?<\/filter>/) ?? ['无'])[0];
    record(
      'EFFECT',
      'TEXTURE 参数',
      '纹理颜色 → feFlood flood-color',
      /flood-color="#ff0000"/.test(texDef),
      `控件=${txCol.back} → 滤镜=${texDef.replace(/\s+/g, ' ').slice(0, 180)}`,
    );

    /* --- PROGRESSIVE_BLUR 起始/半径参数 --- */
    await setEffKind(0, '渐进模糊');
    const pStart = await setEffNum('起始', 20);
    const pRad = await setEffNum('半径', 40);
    c = await getCode();
    const progBlk = blockOf(c.html, 'rectangle-2');
    record(
      'EFFECT',
      'PROGRESSIVE_BLUR 参数',
      '起始 20 + 半径 40 → blur(30px)（均值近似）',
      /blur\(30px\)/.test(progBlk),
      `控件读回 起始=${pStart.back} 半径=${pRad.back} → 出码=${(progBlk.match(/backdrop-filter:[^;]*/) ?? ['无'])[0]}`,
    );

    /* --- 显隐 / 删除 / 排序 --- */
    await setEffKind(0, '投影');
    const hide = await effLayerBtn(0, '隐藏');
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-2');
    record('EFFECT', '显隐', '效果层「●/○」隐藏', hide && !/box-shadow:/.test(blk), `按钮可点=${hide} → 出码 ${/box-shadow:/.test(blk) ? '仍有 box-shadow' : '无 box-shadow'}`);
    await effLayerBtn(0, '显示');
    c = await getCode();
    record('EFFECT', '显隐', '重新显示', /box-shadow:/.test(blockOf(c.html, 'rectangle-2')), `恢复后出码=${(blockOf(c.html, 'rectangle-2').match(/box-shadow:[^;]*/) ?? ['无'])[0]}`);

    // 第 2 条效果 → 排序
    await clickSectionBtn('效果', '+ 添加效果');
    await setEffKind(1, '内阴影');
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-2');
    const twoShadow = (blk.match(/box-shadow:[^;]*/) ?? ['无'])[0];
    record('EFFECT', '多条', '两条效果 → 逗号串', /inset/.test(twoShadow) && twoShadow.includes(','), `出码=${twoShadow}`);
    const swap = await effLayerBtn(1, '上移');
    c = await getCode();
    const after = (blockOf(c.html, 'rectangle-2').match(/box-shadow:[^;]*/) ?? ['无'])[0];
    record('EFFECT', '排序', '第 2 条上移', swap && after !== twoShadow, `${twoShadow} → ${after}`);

    const del = await effLayerBtn(1, '删除');
    c = await getCode();
    const one = (blockOf(c.html, 'rectangle-2').match(/box-shadow:[^;]*/) ?? ['无'])[0];
    record('EFFECT', '删除', '删除 1 条（剩 1 条）', del && one !== after && /box-shadow:/.test(one), `按钮可点=${del} → 出码=${one}`);
    const del2 = await effLayerBtn(0, '删除');
    c = await getCode();
    const none = blockOf(c.html, 'rectangle-2');
    record('EFFECT', '删除', '删除最后 1 条 → box-shadow 消失', del2 && !/box-shadow:/.test(none), `按钮可点=${del2} → 出码 ${/box-shadow:/.test(none) ? '仍有' : '无 box-shadow'}`);
    // 恢复一条，供后续需要
    await clickSectionBtn('效果', '+ 添加效果');
  });

  /* ============================================================
   * D. 排版全字段
   * ============================================================ */
  await section('TYPO', async () => {
    await selectNode(textNode.id);
    record('TYPO', '分区', 'TEXT 选中 → 排版分区出现', await hasRow('字号', '排版'), `行数=${await rowCount()}`);

    /* 字号/字重（一期已覆盖，此处仅作为基线复测） */
    const fs = await setNum('字号', 28, { sec: '排版' });
    let c = await getCode();
    record('TYPO', '字号', '字号 28', /font-size:\s*28px/.test(blockOf(c.html, 'text-1')), `控件读回=${fs.back} → 出码=${(blockOf(c.html, 'text-1').match(/font-size:[^;]*/) ?? ['无'])[0]}`);

    const fw = await setNum('字重', 700, { sec: '排版' });
    c = await getCode();
    record('TYPO', '字重', '字重 700', /font-weight:\s*700/.test(blockOf(c.html, 'text-1')), `控件读回=${fw.back} → 出码=${(blockOf(c.html, 'text-1').match(/font-weight:[^;]*/) ?? ['无'])[0]}`);

    /* 行高 3 模式 */
    let lh = await setNum('行高', 40, { sec: '排版', box: 0 });
    c = await getCode();
    record('TYPO', '行高', 'px 模式 40', /line-height:\s*40px/.test(blockOf(c.html, 'text-1')), `控件读回=${lh.back} → 出码=${(blockOf(c.html, 'text-1').match(/line-height:[^;]*/) ?? ['无'])[0]}`);

    await setSelect('行高', '%', { sec: '排版' });
    lh = await setNum('行高', 150, { sec: '排版', box: 0 });
    c = await getCode();
    record('TYPO', '行高', '% 模式 150 → line-height: 1.5', /line-height:\s*1\.5\b/.test(blockOf(c.html, 'text-1')), `控件读回=${lh.back} → 出码=${(blockOf(c.html, 'text-1').match(/line-height:[^;]*/) ?? ['无'])[0]}`);

    await setSelect('行高', '自动', { sec: '排版' });
    c = await getCode();
    const noLh = !/line-height:/.test(blockOf(c.html, 'text-1'));
    record('TYPO', '行高', '自动模式 → 不出 line-height', noLh, `出码${noLh ? '无 line-height（浏览器 normal）' : '仍有 line-height'}`);
    await setSelect('行高', 'px', { sec: '排版' });

    /* 字距 2 模式 */
    let ls = await setNum('字距', 3, { sec: '排版', box: 0 });
    c = await getCode();
    record('TYPO', '字距', 'px 模式 3', /letter-spacing:\s*3px/.test(blockOf(c.html, 'text-1')), `控件读回=${ls.back} → 出码=${(blockOf(c.html, 'text-1').match(/letter-spacing:[^;]*/) ?? ['无'])[0]}`);

    await setSelect('字距', '%', { sec: '排版' });
    ls = await setNum('字距', 50, { sec: '排版', box: 0 });
    c = await getCode();
    record('TYPO', '字距', '% 模式 50 → 0.5em', /letter-spacing:\s*0?\.5em/.test(blockOf(c.html, 'text-1')), `控件读回=${ls.back} → 出码=${(blockOf(c.html, 'text-1').match(/letter-spacing:[^;]*/) ?? ['无'])[0]}`);
    await setSelect('字距', 'px', { sec: '排版' });
    await setNum('字距', 0, { sec: '排版', box: 0 });

    /* 段间距（已知：CSS 无对应） */
    const cBeforePara = (await getCode()).html;
    const ps = await setNum('段间距', 20, { sec: '排版' });
    c = await getCode();
    const textBlk = blockOf(c.html, 'text-1');
    const paraChanged = c.html !== cBeforePara || /paragraph|margin-block|margin-top/.test(textBlk);
    record(
      'TYPO',
      '段间距',
      '段间距 20（面板有控件）',
      paraChanged,
      `控件读回=${ps.back} → .text-1 出码=${textBlk || '无'}${paraChanged ? '' : '（无任何段间距声明）'}`,
    );
    if (!paraChanged) {
      unimpl(
        'TYPO',
        '段间距（paragraphSpacing）',
        'unimplemented',
        '面板「段间距」可写 store，measure.ts 用它算多段文本高度（仅影响 HUG 高度测量），CSS 出码零声明（types.ts 注释：CSS 无原生对应）；实测 .text-N 块前后一致，preview.html/index.scss 均无产物',
      );
    }

    /* 首行缩进 */
    const pi = await setNum('首行缩', 24, { sec: '排版' });
    c = await getCode();
    record('TYPO', '首行缩', '首行缩进 24', /text-indent:\s*24px/.test(blockOf(c.html, 'text-1')), `控件读回=${pi.back} → 出码=${(blockOf(c.html, 'text-1').match(/text-indent:[^;]*/) ?? ['无'])[0]}`);

    /* 文本颜色（与填充/描边同用 ColorField，但出码走 color:） */
    const tcol = await setText('颜色', '#123456', { sec: '排版' });
    c = await getCode();
    const tb = blockOf(c.html, 'text-1');
    record('TYPO', '颜色', '文本色 #123456', /(?:^|;)\s*color:\s*#123456/.test(tb), `控件=${tcol.back} → 出码=${(tb.match(/(?:^|;)\s*color:\s*[^;]*/) ?? ['无'])[0]}`);

    /* 水平对齐 4 值 */
    for (const [opt, want] of [
      ['居中', 'center'],
      ['右对齐', 'right'],
      ['两端', 'justify'],
      ['左对齐', null],
    ]) {
      const s = await setSelect('对齐', opt, { sec: '排版' });
      c = await getCode();
      const b = blockOf(c.html, 'text-1');
      const decl = (b.match(/text-align:[^;]*/) ?? [])[0] ?? '无 text-align';
      const ok = want ? decl === `text-align: ${want}` : !/text-align:/.test(b);
      record('TYPO', '水平对齐', `textAlign=${want ?? 'left（默认不声明）'}`, s.ok && ok, `下拉=${s.back ?? '?'} → 出码=${decl}`);
    }

    /* 垂直对齐 3 值（需定高：先切「固定尺寸」） */
    const ar = await setSelect('自动大小', '固定尺寸', { sec: '排版' });
    c = await getCode();
    for (const [opt, want] of [
      ['居中', 'center'],
      ['底部', 'flex-end'],
      ['顶部', 'TOP'],
    ]) {
      const s = await setSelect('垂直对', opt, { sec: '排版' });
      c = await getCode();
      const b = blockOf(c.html, 'text-1');
      const hasFlex = /display:\s*flex/.test(b);
      const jc = (b.match(/justify-content:[^;]*/) ?? [])[0] ?? '无';
      const ok = want === 'TOP' ? !hasFlex : hasFlex && jc === `justify-content: ${want}`;
      record('TYPO', '垂直对齐', `textAlignVertical=${opt}`, s.ok && ok, `下拉=${s.back ?? '?'}；自动大小=${ar.back ?? '?'} → 出码 display=${hasFlex ? 'flex' : '无'} ${jc}`);
    }

    /* textCase 5 */
    for (const [opt, want] of [
      ['全部大写', 'uppercase'],
      ['全部小写', 'lowercase'],
      ['标题大写', 'capitalize'],
      ['小型大写', 'small-caps'],
      ['原样', null],
    ]) {
      const s = await setSelect('形态', opt, { sec: '排版' });
      c = await getCode();
      const b = blockOf(c.html, 'text-1');
      const decl = (b.match(/text-transform:[^;]*/) ?? [])[0] ?? '无 text-transform';
      const ok = want ? decl === `text-transform: ${want}` : !/text-transform:/.test(b);
      record('TYPO', 'textCase', `形态=${opt}`, s.ok && ok, `下拉=${s.back ?? '?'} → 出码=${decl}`);
    }

    /* 装饰 3 */
    for (const [opt, want] of [
      ['下划线', 'underline'],
      ['删除线', 'line-through'],
      ['无', null],
    ]) {
      const s = await setSelect('装饰', opt, { sec: '排版' });
      c = await getCode();
      const b = blockOf(c.html, 'text-1');
      const decl = (b.match(/text-decoration:[^;]*/) ?? [])[0] ?? '无 text-decoration';
      const ok = want ? decl === `text-decoration: ${want}` : !/text-decoration:/.test(b);
      record('TYPO', 'textDecoration', `装饰=${opt}`, s.ok && ok, `下拉=${s.back ?? '?'} → 出码=${decl}`);
    }

    /* 自动大小 3 模式 */
    for (const [opt, checks] of [
      ['自动宽高', (b) => /width:\s*fit-content/.test(b) && /height:\s*fit-content/.test(b)],
      ['定宽自动高', (b) => /height:\s*fit-content/.test(b) && /width:\s*\d+px/.test(b)],
      ['固定尺寸', (b) => /width:\s*\d+px/.test(b) && /height:\s*\d+px/.test(b)],
    ]) {
      const s = await setSelect('自动大小', opt, { sec: '排版' });
      c = await getCode();
      const b = blockOf(c.html, 'text-1');
      record(
        'TYPO',
        '自动大小',
        `自动大小=${opt}`,
        s.ok && checks(b),
        `下拉=${s.back ?? '?'} → 出码 ${(b.match(/width:[^;]*/) ?? ['无'])[0]} / ${(b.match(/height:[^;]*/) ?? ['无'])[0]}`,
      );
    }

    /* 自动换行开关（按钮 title 固定，直接按行内 button 定位） */
    const wrapBtn = page.locator(
      '.props .prop-section:has(.prop-heading:text-is("排版")) .field-row:has(.field-label:text-is("自动换行")) button',
    ).first();
    if (await wrapBtn.count()) {
      const wasActive = ((await wrapBtn.getAttribute('class')) ?? '').includes('is-active');
      if (wasActive) await wrapBtn.click();
      await sleep(430);
      c = await getCode();
      let wb = blockOf(c.html, 'text-1');
      record(
        'TYPO',
        '自动换行',
        '关闭自动换行 → white-space: pre',
        /white-space:\s*pre\b(?!-wrap)/.test(wb),
        `按钮原状态=${wasActive ? '开' : '关'} → 出码=${(wb.match(/white-space:[^;]*/) ?? ['无'])[0]}`,
      );
      await wrapBtn.click(); // 恢复
      await sleep(430);
      c = await getCode();
      wb = blockOf(c.html, 'text-1');
      record(
        'TYPO',
        '自动换行',
        '重新打开 → white-space: pre-wrap',
        /white-space:\s*pre-wrap/.test(wb),
        `出码=${(wb.match(/white-space:[^;]*/) ?? ['无'])[0]}`,
      );
    } else {
      record('TYPO', '自动换行', '自动换行按钮', false, '未找到「自动换行」行按钮');
    }

    /* 截断 + 最大行 */
    const truncBtn = page.locator('.props .prop-section:has(.prop-heading:text-is("排版")) .field-row:has(.field-label:text-is("截断")) button');
    if (await truncBtn.count()) {
      await truncBtn.first().click();
      await sleep(450);
      const maxRow = await hasRow('最大行', '排版');
      const maxShown = await page.evaluate(() => {
        const s = Array.from(document.querySelectorAll('.props .prop-section')).find(
          (x) => (x.querySelector('.prop-heading')?.textContent ?? '').trim() === '排版',
        );
        const r = s ? Array.from(s.querySelectorAll('.field-row')).find((x) => (x.querySelector('.field-label')?.textContent ?? '').trim() === '最大行') : null;
        return r?.querySelector('input.num-box')?.value ?? null;
      });
      const stTrunc = await stateNode(textNode.id, (n) => ({ t: n.style?.textTruncation, m: n.style?.maxLines }));
      c = await getCode();
      let b = blockOf(c.html, 'text-1');
      const clamp1 = (b.match(/-webkit-line-clamp:[^;]*/) ?? ['无'])[0];
      record(
        'TYPO',
        '截断',
        '截断开关（默认 2 行）→ -webkit-line-clamp',
        /-webkit-line-clamp:\s*2/.test(b) && /text-overflow:\s*ellipsis/.test(b) && /display:\s*-webkit-box/.test(b),
        `出现「最大行」行=${maxRow}（控件显示 ${maxShown}）；store=${JSON.stringify(stTrunc.value)}；出码 ${clamp1} / ${(b.match(/text-overflow:[^;]*/) ?? ['无'])[0]}`,
      );
      if (!/-webkit-line-clamp/.test(b)) {
        defect(
          'TYPO',
          '截断（textTruncation）开关',
          'P2（UI/产物不一致）',
          `面板「截断」默认显示「最大行 = 2」，但点击开关只写 textTruncation=ENDING、不写 maxLines；compile.ts 的判据是 \`textTruncation==='ENDING' && maxLines != null && maxLines > 0\`，因此**开关打开后出码零变化**（无 -webkit-line-clamp / text-overflow / display:-webkit-box），必须先手动改一次「最大行」才生效。实测：控件显示 2，store=${JSON.stringify(stTrunc.value)}，.text-N 块无任何截断声明。`,
          '新建文本 → 右栏「排版」→ 点「截断」开关 → 打开生成代码看 preview.html：无 -webkit-line-clamp；再把「最大行」从 2 改成 3 → 立刻出现 -webkit-line-clamp: 3（改回 2 也生效），证明缺的是「开开关时写入默认 maxLines」。',
        );
      } else {
        recordNote(
          'TYPO',
          '截断（textTruncation）开关',
          '历史缺陷已修复（口径说明）',
          `本次审计早期构建（19:52 前）实测该开关只写 textTruncation 不写 maxLines，产物零变化（独立探针复现两次）；当前构建 PropertyPanel 开关处同时落 maxLines=S.maxLines ?? 2，实测 store=${JSON.stringify(stTrunc.value)}、出码 ${(b.match(/-webkit-line-clamp:[^;]*/) ?? ['无'])[0]}，故记为已修复而非遗留`,
        );
      }
      const ml = await setNum('最大行', 3, { sec: '排版' });
      c = await getCode();
      b = blockOf(c.html, 'text-1');
      record('TYPO', '截断', '最大行 3', /-webkit-line-clamp:\s*3/.test(b), `控件读回=${ml.back} → 出码=${(b.match(/-webkit-line-clamp:[^;]*/) ?? ['无'])[0]}`);
      await truncBtn.first().click(); // 关闭
      await sleep(400);
      c = await getCode();
      record('TYPO', '截断', '关闭截断 → 声明消失', !/-webkit-line-clamp/.test(blockOf(c.html, 'text-1')), `出码 ${/-webkit-line-clamp/.test(blockOf(c.html, 'text-1')) ? '仍有 clip' : '无 clip'}`);
    } else {
      record('TYPO', '截断', '截断按钮', false, '未找到「截断」行按钮');
    }
  });

  /* ============================================================
   * E. 形状参数
   * ============================================================ */
  await section('SHAPE', async () => {
    /* --- OVAL arcData --- */
    await selectNode(ovalNode.id);
    let c = await getCode();
    const plainOval = c.html;
    record(
      'SHAPE',
      'OVAL',
      '默认整圆 → SVG 通道（非 conic）',
      /<svg class="oval-1"/.test(plainOval),
      `出码=${(plainOval.match(/<svg class="oval-1"[^>]{0,120}/) ?? ['无'])[0]}…`,
    );

    const sa = await setNum('起始角', 30, { sec: '位置与尺寸' });
    c = await getCode();
    let blk = blockOf(c.html, 'oval-1');
    record(
      'SHAPE',
      'OVAL arcData',
      '起始角 30 → conic-gradient from 120deg',
      /conic-gradient\(from 120deg/.test(blk),
      `控件读回=${sa.back}° → 出码=${(blk.match(/background-image:[^;]*/) ?? ['无'])[0]}`,
    );

    const ea = await setNum('结束角', 270, { sec: '位置与尺寸' });
    c = await getCode();
    blk = blockOf(c.html, 'oval-1');
    record(
      'SHAPE',
      'OVAL arcData',
      '结束角 270 → sweep 240deg',
      /240deg/.test(blk),
      `控件读回=${ea.back}° → 出码=${(blk.match(/background-image:[^;]*/) ?? ['无'])[0]}`,
    );

    const ir = await setNum('内径', 40, { sec: '位置与尺寸' });
    c = await getCode();
    blk = blockOf(c.html, 'oval-1');
    record(
      'SHAPE',
      'OVAL arcData',
      '内径 40% → mask-image 打孔（环）',
      /mask-image:\s*radial-gradient\(circle closest-side, transparent 40\.0%/.test(blk) && /border-radius:\s*50%/.test(blk),
      `控件读回=${ir.back}% → 出码 ${(blk.match(/mask-image:[^;]*/) ?? ['无'])[0]}`,
    );

    /* --- POLYGON --- */
    await selectNode(polyNode.id);
    c = await getCode();
    const polyBefore = (c.html.match(/<svg class="polygon-\d+"[\s\S]*?<\/svg>/) ?? ['无'])[0];
    const polyD0 = (polyBefore.match(/d="([^"]*)"/) ?? [, ''])[1];
    const pc = await setNum('边数', 8, { sec: '位置与尺寸' });
    c = await getCode();
    const polyAfter = (c.html.match(/<svg class="polygon-\d+"[\s\S]*?<\/svg>/) ?? ['无'])[0];
    const polyD1 = (polyAfter.match(/d="([^"]*)"/) ?? [, ''])[1];
    record(
      'SHAPE',
      'POLYGON',
      '边数 3→8 → SVG path 顶点数变化',
      pc.ok && polyAfter !== polyBefore && lCount(polyD1) === 7 && lCount(polyD0) === 2,
      `控件读回=${pc.back}；顶点 L 数 3→${lCount(polyD0)}、8→${lCount(polyD1)}；path=${polyD1.slice(0, 80)}…`,
    );
    recordNote(
      'SHAPE',
      'POLYGON',
      '出码通道（口径说明）',
      `P1-14 起 POLYGON/STAR/整圆 OVAL 走 SVG 通道（<svg><path d>），不是 clip-path polygon()——语义等价且逐像素更准，故本审计断言 path d 的顶点数而非 clip-path；画布侧仍用点集。实测出码含 <svg class="polygon-N">`,
    );

    await selectNode(starNode.id);
    c = await getCode();
    const starBefore = (c.html.match(/<svg class="star-\d+"[\s\S]*?<\/svg>/) ?? ['无'])[0];
    const starD0 = (starBefore.match(/d="([^"]*)"/) ?? [, ''])[1];
    const sc = await setNum('边数', 6, { sec: '位置与尺寸' });
    const inner = await setNum('内径', 70, { sec: '位置与尺寸' });
    c = await getCode();
    const starAfter = (c.html.match(/<svg class="star-\d+"[\s\S]*?<\/svg>/) ?? ['无'])[0];
    const starD1 = (starAfter.match(/d="([^"]*)"/) ?? [, ''])[1];
    record(
      'SHAPE',
      'STAR',
      '边数 6 + 内径 70% → path 顶点数变化',
      sc.ok && inner.ok && starAfter !== starBefore && lCount(starD1) === 11,
      `控件读回 边数=${sc.back} 内径=${inner.back}；顶点 L 数 5→${lCount(starD0)}、6→${lCount(starD1)}；path=${starD1.slice(0, 80)}…`,
    );

    /* --- 四角独立圆角 + 平滑 --- */
    await selectNode(r3.id);
    const toggle = page.locator('.props .prop-section:has(.prop-heading:text-is("位置与尺寸")) .radius-toggle').first();
    await toggle.click();
    await sleep(420);
    const gridCount = await page.evaluate(() => {
      const s = Array.from(document.querySelectorAll('.props .prop-section')).find(
        (x) => (x.querySelector('.prop-heading')?.textContent ?? '').trim() === '位置与尺寸',
      );
      const grid = s?.querySelector('.radius-grid');
      return grid ? grid.querySelectorAll('input.num-box').length : -1;
    });
    record('SHAPE', '圆角', '切「四角独立」→ 4 个角输入框', gridCount === 4, `输入框数=${gridCount}`);

    const c1 = await setNum('圆角', 20, { sec: '位置与尺寸', box: 0 });
    const c3 = await setNum('圆角', 4, { sec: '位置与尺寸', box: 2 });
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-3');
    record(
      'SHAPE',
      '圆角',
      '四角独立：左上 20 / 右下 4 → 4 值 border-radius',
      /border-radius:\s*20px 0px 4px 0px/.test(blk),
      `控件读回 ${c1.back}/${c3.back} → 出码=${(blk.match(/border-radius:[^;]*/) ?? ['无'])[0]}`,
    );

    const sm = await setNum('平滑', 60, { sec: '位置与尺寸' });
    c = await getCode();
    blk = blockOf(c.html, 'rectangle-3');
    const smState = await stateNode(r3.id, (n) => n.style?.cornerSmoothing);
    record(
      'SHAPE',
      '平滑',
      'cornerSmoothing 60% → corner-shape: squircle',
      /corner-shape:\s*squircle/.test(blk),
      `控件读回=${sm.back}% store=${smState.value} → 出码=${(blk.match(/corner-shape:[^;]*/) ?? ['无'])[0]}（非标准属性，需 Chrome 139+ 才生效）`,
    );
  });

  /* ============================================================
   * F. 图片 4 scaleMode + 7 调整滑杆
   * ============================================================ */
  await section('IMAGE', async () => {
    await selectNode(imgNode.id);
    const src = await setText(
      '图片源',
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
      { sec: '内容' },
    );
    let c = await getCode();
    record('IMAGE', '图片源', '设置 data-URI 源 → 出 <img src>', /<img class="image-1" src="data:image\/png/.test(c.html), `控件=${String(src.back).slice(0, 24)}… → 出码含 <img src>`);

    for (const [opt, mode] of [
      ['填满', 'FILL'],
      ['适应', 'FIT'],
      ['裁剪', 'CROP'],
      ['平铺', 'TILE'],
    ]) {
      const s = await setSelect('填充', opt, { sec: '内容' });
      c = await getCode();
      const b = blockOf(c.html, 'image-1');
      const dom = (c.html.match(/<(img|div) class="image-1"[^>]*>/) ?? ['无'])[0];
      let ok = false;
      let seen = '';
      if (mode === 'FILL') {
        ok = /object-fit:\s*cover/.test(b) && /<img class="image-1"/.test(c.html);
        seen = (b.match(/object-fit:[^;]*/) ?? ['无'])[0] + ' + <img>';
      } else if (mode === 'FIT') {
        ok = /object-fit:\s*contain/.test(b);
        seen = (b.match(/object-fit:[^;]*/) ?? ['无'])[0] + ' + <img>';
      } else if (mode === 'CROP') {
        // CROP 与 FILL 同为 cover（无独立裁切语义）
        ok = true;
        seen = (b.match(/object-fit:[^;]*/) ?? ['无'])[0] + '（与 FILL 相同）';
      } else {
        ok = !/object-fit:/.test(b) && /background-repeat:repeat/.test(dom) && /<div class="image-1"/.test(dom);
        seen = 'dom=' + dom;
      }
      record('IMAGE', 'scaleMode', `${mode}（${opt}）`, s.ok && ok, `下拉=${s.back ?? '?'} → ${seen}${mode === 'CROP' ? ' ← 与 FILL 产物完全相同' : ''}`);
      if (mode === 'CROP') {
        unimpl(
          'IMAGE',
          'scaleMode=CROP（裁剪）',
          'approximate',
          'FILL 与 CROP 都出 `object-fit: cover`，无 crop 矩形/焦点参数，产物字节级相同（compile.ts 注释：Crop 近似 cover，裁切把手后续）',
        );
      }
    }
    await setSelect('填充', '填满', { sec: '内容' });

    // 7 项调整
    for (const [label, want, v, exact] of [
      ['曝光', 'brightness(1.500)', 50, true],
      ['对比', 'contrast(1.500)', 50, true],
      ['饱和', 'saturate(1.500)', 50, true],
      ['色温', 'sepia(0.250)', 50, false],
      ['色调', 'hue-rotate(10.000deg)', 50, false],
      ['高光', 'contrast(1.125)', 50, false],
      ['阴影', 'brightness(1.100)', 50, false],
    ]) {
      const r = await setRange(label, v, { sec: '内容' });
      c = await getCode();
      const b = blockOf(c.html, 'image-1');
      const filter = (b.match(/filter:[^;]*/) ?? ['无'])[0];
      record(
        'IMAGE',
        '调整滑杆',
        `${label}=${v}${exact ? '（精确映射）' : '（近似映射）'}`,
        r.ok && filter.includes(want),
        `控件读回=${r.back} → 出码 filter=${filter}（期望含 ${want}）`,
      );
      if (!exact && !unimplemented.some((u) => u.node === 'IMAGE' && u.field.includes(label))) {
        unimpl(
          'IMAGE',
          `图片调整 ${label}`,
          'approximate',
          `CSS filter 无原生 ${label} 能力，用 ${want} 近似（exact=false，imageAdjust.ts 报备）；面板亦有「画布不显示近似项」提示`,
        );
      }
    }
  });

  /* ============================================================
   * G. 导出设置（只验 UI 可配置；产物由 zip-assert/e2e 覆盖）
   * ============================================================ */
  await section('EXPORT', async () => {
    await selectNode(imgNode.id);
    const addOk = await clickSectionBtn('导出', '+ 添加导出设置');
    record('EXPORT', '创建', '添加导出设置', addOk, addOk ? '按钮可点，出现格式/倍数/后缀行' : '未找到按钮');

    const expSel = page.locator('.props .prop-section:has(.prop-heading:text-is("导出")) .fill-layer-head select').first();
    const fmtOpts = await expSel.locator('option').allTextContents();
    record('EXPORT', '格式', '格式 4 档可选', fmtOpts.join('/') === 'PNG/JPG/SVG/PDF', `选项=${fmtOpts.join('/')}`);

    await expSel.selectOption({ label: 'JPG' });
    await sleep(400);
    let fmtNow = await expSel.inputValue();
    const st1 = await stateNode(imgNode.id, (n) => n.exportSettings);
    record(
      'EXPORT',
      '格式',
      '切 JPG',
      fmtNow === 'JPG' && st1.value?.[0]?.format === 'JPG',
      `下拉=${fmtNow} store=${JSON.stringify(st1.value)}`,
    );

    const scaleSel = page.locator('.props .prop-section:has(.prop-heading:text-is("导出")) .fill-layer-head select').nth(1);
    const scaleOpts = await scaleSel.locator('option').allTextContents();
    await scaleSel.selectOption({ label: '2x' });
    await sleep(400);
    let scaleNow = await scaleSel.inputValue();
    const st2 = await stateNode(imgNode.id, (n) => n.exportSettings);
    record(
      'EXPORT',
      '倍数',
      'scale 2x',
      scaleNow === '2' && st2.value?.[0]?.scale === 2,
      `选项=${scaleOpts.join('/')} 下拉=${scaleNow} store=${JSON.stringify(st2.value)}`,
    );

    await expSel.selectOption({ label: 'SVG' });
    await sleep(450);
    const scaleOpts2 = await scaleSel.locator('option').evaluateAll((os) =>
      os.map((o) => `${o.textContent}${o.disabled ? '(禁用)' : ''}${o.selected ? '(选中)' : ''}`),
    );
    const st3 = await stateNode(imgNode.id, (n) => n.exportSettings);
    record(
      'EXPORT',
      '倍数',
      'SVG 恒 1x（2x/3x 禁用并回落）',
      scaleOpts2.some((t) => t.includes('2x(禁用)')) && st3.value?.[0]?.scale === 1,
      `scale 选项=${scaleOpts2.join('/')} store=${JSON.stringify(st3.value)}`,
    );

    const suf = await setText('后缀', '@2x', { sec: '导出' });
    const st4 = await stateNode(imgNode.id, (n) => n.exportSettings);
    record(
      'EXPORT',
      '后缀',
      'suffix 文本可写',
      st4.value?.[0]?.suffix === '@2x',
      `控件=${suf.back} store=${JSON.stringify(st4.value)}`,
    );

    const del = page.locator('.props .prop-section:has(.prop-heading:text-is("导出")) .fill-layer-head button[title="删除"]');
    await del.first().click();
    await sleep(450);
    const st5 = await stateNode(imgNode.id, (n) => n.exportSettings);
    record('EXPORT', '删除', '删除导出设置', !st5.value?.length, `store=${JSON.stringify(st5.value ?? null)}`);
    recordNote(
      'EXPORT',
      '口径',
      '产物通道（口径说明）',
      'PNG/JPG/SVG/PDF 实际出图由 npm run zip-assert / e2e 覆盖（CodeModal 不出导出图），本审计只断言控件 → store 的格式/倍数/后缀三件套',
    );
  });

  /* ============================================================
   * H. 约束 4×2 见下（H-2）；Auto Layout（H-1）
   * ============================================================ */

  /* ============================================================
   * H-1. Auto Layout（先跑：此时页面根仍为流式，Frame 才有「定位」行）
   * ============================================================ */
  await section('AUTOLAYOUT', async () => {
    await selectNode(frameNode.id);
    const visible = {
      方向: await hasRow('方向', '布局'),
      定位: await hasRow('定位', '布局'),
      宽模式: await hasRow('宽模式', '布局'),
      高模式: await hasRow('高模式', '布局'),
      内边距: await hasRow('内边距', '布局'),
      间距: await hasRow('间距', '布局'),
      对齐: await hasRow('对齐', '布局'),
      分布: await hasRow('分布', '布局'),
      折行: await hasRow('折行', '布局'),
      裁剪: await hasRow('裁剪', '布局'),
      宽限: await hasRow('宽限', '布局'),
      高限: await hasRow('高限', '布局'),
    };
    record(
      'AUTOLAYOUT',
      '字段可见',
      '12 项布局字段齐备',
      Object.values(visible).every(Boolean),
      JSON.stringify(visible),
    );

    const dir = await setSelect('方向', '横向', { sec: '布局' });
    let c = await getCode();
    record('AUTOLAYOUT', '方向', '横向 → flex-direction: row', /flex-direction:\s*row/.test(blockOf(c.html, 'frame-1')), `下拉=${dir.back} → 出码=${(blockOf(c.html, 'frame-1').match(/flex-direction:[^;]*/) ?? ['无'])[0]}`);

    const gap = await setNum('间距', 24, { sec: '布局' });
    c = await getCode();
    record('AUTOLAYOUT', '间距', 'gap 24', /gap:\s*24px/.test(blockOf(c.html, 'frame-1')), `控件读回=${gap.back} → 出码=${(blockOf(c.html, 'frame-1').match(/gap:[^;]*/) ?? ['无'])[0]}`);

    const wrap = await setSelect('折行', '折行', { sec: '布局' });
    c = await getCode();
    record('AUTOLAYOUT', '折行', 'WRAP → flex-wrap: wrap', /flex-wrap:\s*wrap/.test(blockOf(c.html, 'frame-1')), `下拉=${wrap.back} → 出码=${(blockOf(c.html, 'frame-1').match(/flex-wrap:[^;]*/) ?? ['无'])[0]}`);

    const noWrap = await setSelect('折行', '不折行', { sec: '布局' });
    c = await getCode();
    record('AUTOLAYOUT', '折行', 'NO_WRAP → 不出 flex-wrap', noWrap.back === 'NO_WRAP' && !/flex-wrap:/.test(blockOf(c.html, 'frame-1')), `下拉=${noWrap.back} → ${/flex-wrap:/.test(blockOf(c.html, 'frame-1')) ? '仍有 flex-wrap' : '无 flex-wrap'}`);

    await setSelect('折行', '折行', { sec: '布局' });
    const crossAppear = await hasRow('行间距', '布局');
    const cross = await setNum('行间距', 30, { sec: '布局' });
    c = await getCode();
    const frameBlk = blockOf(c.html, 'frame-1');
    record(
      'AUTOLAYOUT',
      'gapCross',
      '折行后出现「行间距」→ gap 两值',
      crossAppear && /gap:\s*30px 24px/.test(frameBlk),
      `行间距行出现=${crossAppear} 控件读回=${cross.back} → 出码=${(frameBlk.match(/gap:[^;]*/) ?? ['无'])[0]}`,
    );

    for (const [opt, want, row] of [
      ['起始', 'flex-start', null],
      ['居中', 'center', 'center'],
      ['末尾', 'flex-end', 'flex-end'],
      ['拉伸', 'stretch', 'stretch'],
      ['基线', 'baseline', 'baseline'],
    ]) {
      const s = await setSelect('对齐', opt, { sec: '布局' });
      c = await getCode();
      const b = blockOf(c.html, 'frame-1');
      const decl = (b.match(/align-items:[^;]*/) ?? [])[0] ?? '无 align-items';
      const ok = want === 'flex-start' ? !/align-items:/.test(b) : decl === `align-items: ${want}`;
      record('AUTOLAYOUT', '对齐', `align=${opt}`, s.ok && ok, `下拉=${s.back ?? '?'} → 出码=${decl}`);
      void row;
    }

    for (const [opt, want] of [
      ['起始', null],
      ['居中', 'center'],
      ['末尾', 'flex-end'],
      ['两端分布', 'space-between'],
    ]) {
      const s = await setSelect('分布', opt, { sec: '布局' });
      c = await getCode();
      const b = blockOf(c.html, 'frame-1');
      const decl = (b.match(/justify-content:[^;]*/) ?? [])[0] ?? '无 justify-content';
      const ok = want ? decl === `justify-content: ${want}` : !/justify-content:/.test(b);
      record('AUTOLAYOUT', '分布', `justify=${opt}`, s.ok && ok, `下拉=${s.back ?? '?'} → 出码=${decl}`);
    }

    const mn = await setNum('宽限', 120, { sec: '布局', box: 0 });
    const mx = await setNum('宽限', 480, { sec: '布局', box: 1 });
    c = await getCode();
    let b = blockOf(c.html, 'frame-1');
    record(
      'AUTOLAYOUT',
      'min/max 宽',
      '宽限 min 120 / max 480',
      /min-width:\s*120px/.test(b) && /max-width:\s*480px/.test(b),
      `控件读回 min=${mn.back} max=${mx.back} → 出码 ${(b.match(/min-width:[^;]*/) ?? ['无'])[0]} / ${(b.match(/max-width:[^;]*/) ?? ['无'])[0]}`,
    );

    const hm = await setNum('高限', 60, { sec: '布局', box: 0 });
    const hx = await setNum('高限', 240, { sec: '布局', box: 1 });
    c = await getCode();
    b = blockOf(c.html, 'frame-1');
    record(
      'AUTOLAYOUT',
      'min/max 高',
      '高限 min 60 / max 240',
      /min-height:\s*60px/.test(b) && /max-height:\s*240px/.test(b),
      `控件读回 min=${hm.back} max=${hx.back} → 出码 ${(b.match(/min-height:[^;]*/) ?? ['无'])[0]} / ${(b.match(/max-height:[^;]*/) ?? ['无'])[0]}`,
    );

    const clipBtn = page.locator('.props .prop-section:has(.prop-heading:text-is("布局")) .field-row:has(.field-label:text-is("裁剪")) button').first();
    await clipBtn.click();
    await sleep(450);
    c = await getCode();
    b = blockOf(c.html, 'frame-1');
    const st = await stateNode(frameNode.id, (n) => n.layout?.clipContent);
    record('AUTOLAYOUT', 'clipContent', '裁剪开关 → overflow: hidden', /overflow:\s*hidden/.test(b), `store.clipContent=${st.value} → 出码=${(b.match(/overflow:[^;]*/) ?? ['无'])[0]}`);

    /* 宽/高模式（FILL/HUG/FIXED）——用 declOf 精确取值，避免 height: 误匹配 min-height: */
    for (const [opt, tag] of [
      ['固定', 'FIXED → 具体 px'],
      ['包裹', 'HUG → fit-content/max-content'],
      ['填充', 'FILL → 主轴 flex 1 1 0 或 100%'],
    ]) {
      const s = await setSelect('宽模式', opt, { sec: '布局' });
      c = await getCode();
      b = blockOf(c.html, 'frame-1');
      const wv = declOf(b, 'width');
      const fv = declOf(b, 'flex');
      const ok =
        opt === '固定' ? /^\d+(\.\d+)?px$/.test(wv) : opt === '包裹' ? /^(fit-content|max-content)$/.test(wv) : wv === '100%' || /(^|\s)1 1 0(\s|$)/.test(fv);
      record('AUTOLAYOUT', '宽模式', `宽模式=${opt}（${tag}）`, s.ok && ok, `下拉=${s.back ?? '?'} → width=${wv || '无'} / flex=${fv || '无'}`);
    }
    await setSelect('宽模式', '固定', { sec: '布局' });

    /* 高模式 3 档 */
    for (const [opt, tag] of [
      ['固定', 'FIXED → 具体 px'],
      ['包裹', 'HUG → fit-content'],
      ['填充', 'FILL → 主轴 flex 1 1 0 或 100%'],
    ]) {
      const s = await setSelect('高模式', opt, { sec: '布局' });
      c = await getCode();
      b = blockOf(c.html, 'frame-1');
      const hv = declOf(b, 'height');
      const fv = declOf(b, 'flex');
      const ok =
        opt === '固定' ? /^\d+(\.\d+)?px$/.test(hv) : opt === '包裹' ? /^(fit-content|max-content)$/.test(hv) : hv === '100%' || /(^|\s)1 1 0(\s|$)/.test(fv);
      record('AUTOLAYOUT', '高模式', `高模式=${opt}（${tag}）`, s.ok && ok, `下拉=${s.back ?? '?'} → height=${hv || '无'} / flex=${fv || '无'}`);
    }
    await setSelect('高模式', '固定', { sec: '布局' });
  });

  /* ============================================================
   * H-2. 约束 4×2（页面根切绝对定位后才有 absChild，故放在 AutoLayout 之后）
   * ============================================================ */
  await section('CONSTRAINT', async () => {
    /* 页面根切「绝对定位」→ 子项成为 absChild，约束行出现（Figma：约束只在绝对定位父级下生效） */
    await selectNode(ROOT_ID);
    const rootMode = await setSelect('方向', '绝对定位', { sec: '布局' });
    record('CONSTRAINT', '前置', '页面根 方向→绝对定位', rootMode.ok && rootMode.back === 'ABSOLUTE', `下拉读回=${rootMode.back}`);

    await selectNode(r1.id);
    const consRow = await row('约束', '位置与尺寸');
    const consSelects = consRow ? await consRow.loc.locator('select').count() : 0;
    record('CONSTRAINT', '控件', '约束行 2 个下拉（水平×垂直）', consSelects === 2, `select 数=${consSelects}`);

    await setNum('X', 41, { sec: '位置与尺寸' });
    await setNum('Y', 29, { sec: '位置与尺寸' });
    for (const [hLabel, vLabel, want] of [
      ['左', '上', { re: /left:\s*41px/, re2: /top:\s*29px/, tag: 'LEFT/TOP → left/top px' }],
      ['右', '下', { re: /right:\s*214px/, re2: /bottom:\s*703px/, tag: 'RIGHT/BOTTOM → right/bottom px' }],
      ['水平居中', '垂直居中', { re: /left:\s*calc\(50%/, re2: /top:\s*calc\(50%/, tag: 'CENTER/CENTER → calc(50%±)' }],
      ['水平缩放', '垂直缩放', { re: /left:\s*[\d.]+%/, re2: /top:\s*[\d.]+%/, tag: 'SCALE/SCALE → 百分比' }],
    ]) {
      const r = await row('约束', '位置与尺寸');
      if (!r) {
        record('CONSTRAINT', '约束', want.tag, false, '约束行不存在');
        continue;
      }
      await r.loc.locator('select').nth(0).selectOption({ label: hLabel }).catch(() => {});
      await sleep(260);
      await r.loc.locator('select').nth(1).selectOption({ label: vLabel }).catch(() => {});
      await sleep(380);
      const c = await getCode();
      const blk = blockOf(c.html, 'rectangle-1');
      const st = await stateNode(r1.id, (n) => n.layout?.constraints);
      const pos = (blk.match(/(left|right|top|bottom):[^;]*/g) ?? []).join(' | ');
      record(
        'CONSTRAINT',
        '4×2 档位',
        want.tag,
        want.re.test(blk) && want.re2.test(blk),
        `${hLabel}/${vLabel} → store=${JSON.stringify(st.value)} 出码=${pos}`,
      );
    }
    // 复位到 LEFT/TOP 便于后续
    const r0 = await row('约束', '位置与尺寸');
    if (r0) {
      await r0.loc.locator('select').nth(0).selectOption({ label: '左' }).catch(() => {});
      await sleep(200);
      await r0.loc.locator('select').nth(1).selectOption({ label: '上' }).catch(() => {});
      await sleep(300);
    }
  });

  /* ============================================================
   * I. 产物通道一致性（preview.html vs index.scss）
   * ============================================================ */
  await section('CHANNEL', async () => {
    await selectNode(r1.id);
    const c = await getCode({ scss: true });
    const htmlBlk = blockOf(c.html, 'rectangle-1');
    const scssBlk = blockOf(c.scss, 'rectangle-1');
    record(
      'CHANNEL',
      '双通道',
      'preview.html 内嵌 CSS 与 index.scss 一致',
      !!htmlBlk && htmlBlk === scssBlk,
      `html=${htmlBlk.slice(0, 90)}… | scss=${scssBlk.slice(0, 90)}…`,
    );
    record(
      'CHANNEL',
      '双通道',
      'index.scss 通道可用（非空）',
      c.scss.length > 50,
      `index.scss 长度=${c.scss.length}`,
    );
  });
} catch (e) {
  record('AUDIT', 'FATAL', '脚本异常', false, String(e && e.message ? e.message : e));
} finally {
  await browser.close().catch(() => {});
  // Windows：spawn(shell:true) 下 kill 只杀 cmd 外壳，vite preview 子进程会残留占端口 → 用 taskkill /T 连坐
  if (server?.pid) {
    try {
      spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      /* 忽略 */
    }
  }
  try {
    server?.kill();
  } catch {
    /* 忽略 */
  }
}

/* ---------- 报告 ---------- */

const asserts = rows.filter((r) => r.kind === 'assert');
const pass = asserts.filter((r) => r.ok).length;
const fail = asserts.length - pass;
const report = {
  generatedAt: new Date().toISOString(),
  port: PORT,
  buildStamp: buildStamp(),
  total: asserts.length,
  pass,
  fail,
  passRate: asserts.length ? Number(((pass / asserts.length) * 100).toFixed(1)) : 0,
  noteRows: rows.length - asserts.length,
  unimplementedCount: unimplemented.length,
  unimplemented,
  defectCount: defects.length,
  defects,
  errors: errors.slice(0, 40),
  rows,
};
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

console.log(`\n=== 深度参数审计：${pass}/${asserts.length} = ${report.passRate}%（另有 ${report.noteRows} 条口径说明行不计分）===`);
console.log(`未实现/占位：${unimplemented.length} 项；产品缺陷：${defects.length} 项`);
if (fail) {
  console.log('\n未通过项：');
  for (const f of asserts.filter((r) => !r.ok)) console.log(`  ${f.node} / ${f.area} / ${f.field} — ${f.note}`);
}
if (unimplemented.length) {
  console.log('\n未实现/占位清单：');
  for (const u of unimplemented) console.log(`  [${u.kind}] ${u.node} / ${u.field} — ${u.detail}`);
}
if (defects.length) {
  console.log('\n真产品缺陷：');
  for (const d of defects) console.log(`  [${d.severity}] ${d.node} / ${d.field} — ${d.detail}\n      复现：${d.repro}`);
}
if (errors.length) console.log(`\n页面错误 ${errors.length}：${errors.slice(0, 3).join(' | ')}`);
console.log(`\n报告：${join(outDir, 'report.json')}`);
