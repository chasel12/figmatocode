/**
 * 参数级四渠道覆盖审计（PM 追问专项，2026-10-18）。
 *
 * 目标：回答「右侧参数区每一个小参数是否在所有渠道都真实生效」——
 *   C1 面板：控件存在且可被 UI 操作；
 *   C2 数据：设值后 autosave 全工程 JSON（ui-compiler.autosave.v2）深 diff 非空；
 *   C3 出码：同一份读回的 project → **真实 compilePage** 的 CSS 串发生变化（node 侧 vite-node 直引 src）；
 *   C4 画布：节点屏幕区域的截图字节发生变化（所见即所得）。
 * 已知可复现项：8 类效果中 7 类 C4=false（差异 #18）——本审计同时验证其覆盖面。
 *
 * 隔离：每个控件一次 reload（addInitScript 注入 seed），控件索引在 seed 运行中冻结为 spec，
 *  每轮以 (分区标题, 控件下标, 标签文本) 三重校验后操作，标签漂移行记 SKIP 不猜。
 * 选择：seed 阶段在目标节点上预置「效果×2（含 NOISE 走 SVG 通道）+ 描边」，保证效果/描边分区有参数可枚举。
 *
 * 运行：npm run precanvasdiff && npm run build（dist/app 为 hook 构建）
 *       npx vite-node scripts/param-audit.ts
 * 产出：dist/param-audit/report.json + params.md + 逐控件 pre/post 画布区域截图
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseProject } from '../src/editor/project';
import { compilePage } from '../src/compiler/compile';

const root = process.cwd();
const PORT = 4281;
const outDir = join(root, 'dist', 'param-audit');
const shotsDir = join(outDir, 'shots');
mkdirSync(shotsDir, { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const KEY = 'ui-compiler.autosave.v2';

const BATCH1 = ['位置与尺寸', '布局', '图层', '填充', '描边', '效果'];

/* ---------------- preview 服务 ---------------- */
const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  cwd: root, stdio: 'ignore', shell: true,
});
let ready = false;
for (let i = 0; i < 60; i++) {
  try {
    const res = await fetch(`http://localhost:${PORT}/`);
    if (res.ok) { ready = true; break; }
  } catch { /* retry */ }
  await sleep(400);
}
if (!ready) { server.kill(); throw new Error('preview 未就绪（先跑 precanvasdiff/build 产出 dist/app）'); }

/* ---------------- 工具函数（页内） ---------------- */
const walk = (n: any, fn: (x: any) => void) => { fn(n); (n.children ?? []).forEach((c: any) => walk(c, fn)); };
const deepDiff = (a: any, b: any, path = '', out: string[] = []) => {
  if (out.length > 20) return out;
  if (a === b) return out;
  if (typeof a !== typeof b || a == null || b == null) { out.push(path); return out; }
  if (typeof a !== 'object') { out.push(path); return out; }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) deepDiff(a[k], b[k], path ? `${path}.${k}` : k, out);
  return out;
};
/** 出码 CSS 指纹：真实 compilePage，取每个节点 style/css 字段序列化 */
const compileFingerprint = (dataStr: string, pageName: string) => {
  const { project } = parseProject(JSON.parse(dataStr));
  const page = project.pages.find((p: any) => p.name === pageName) ?? project.pages[0];
  const compiled: any = compilePage(page as any);
  const parts: string[] = [];
  for (const n of compiled.nodes ?? []) parts.push(`${n.className ?? n.id}|${JSON.stringify(n.css ?? n.style ?? '')}`);
  return parts.join('\n');
};

/* ---------------- seed 运行：定靶、预置、枚举 ---------------- */
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

async function loadFresh() {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.prop-heading', { timeout: 15000 });
  await sleep(600);
}
async function selectNode(id: string) {
  const row = page.locator(`[data-node-id="${id}"]`).first();
  if (await row.count()) await row.click();
  else throw new Error(`图层树找不到节点 ${id}`);
  await sleep(300);
}
async function readData(): Promise<string> {
  return (await page.evaluate((k) => localStorage.getItem(k), KEY)) ?? '';
}

await loadFresh();
/* 默认页为空——用 R 工具自绘一个矩形，作为审计靶节点（走应用自身工厂，形状最真） */
const canvasBox = await page.locator('.konvajs-content').boundingBox();
if (!canvasBox) { server.kill(); throw new Error('画布容器 .konvajs-content 不存在'); }
await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
await sleep(200);
await page.keyboard.press('r');
await page.mouse.move(canvasBox.x + 140, canvasBox.y + 120);
await page.mouse.down();
await page.mouse.move(canvasBox.x + 300, canvasBox.y + 220, { steps: 6 });
await page.mouse.up();
await sleep(900);
let dataStr = await readData();
for (let i = 0; i < 6 && !dataStr; i++) { await sleep(500); dataStr = await readData(); }
if (!dataStr) { server.kill(); throw new Error('autosave 无内容，无法定 seed 基线'); }
let seed = JSON.parse(dataStr);
const { project: seedProj } = parseProject(seed);
const seedPage = seedProj.pages.find((p: any) => p.id === (seed.currentPageId ?? p.id)) ?? seedProj.pages[0];
const pageName = seedPage.name;
// 选靶：页内第一个叶子 RECTANGLE
let target: any = null;
walk(seedPage.root, (n: any) => { if (!target && n !== seedPage.root && !(n.children?.length) && n.type === 'RECTANGLE') target = n; });
if (!target) { server.kill(); throw new Error('自绘矩形未出现在 seed 树（检查 R 工具/autosave）'); }
const targetId = target.id;
// 预置：描边 + 两类效果（DROP_SHADOW 应画布响应、NOISE 应不响应——管线自校验）+ 目标后方叠一块背景（让混合/透明度/阴影有像素参照）
const patched = JSON.parse(dataStr);
let pTarget: any = null;
walk(patched, (n: any) => { if (n && typeof n === 'object' && n.id === targetId && !pTarget && n.type) pTarget = n; });
if (pTarget) {
  pTarget.style = pTarget.style ?? {};
  pTarget.style.border = { width: 3, color: '#c0392b', align: 'INSIDE' };
  pTarget.style.effects = [
    { kind: 'DROP_SHADOW', x: 0, y: 6, blur: 12, spread: 2, color: 'rgba(0,0,0,0.35)' },
    { kind: 'NOISE', radius: 6, density: 0.5, color: '#888888' },
  ];
  const bg = JSON.parse(JSON.stringify(pTarget));
  bg.id = 'audit-bg'; bg.name = '审计背景';
  bg.layout = { ...(bg.layout ?? {}), x: (pTarget.layout?.x ?? 0) - 60, y: (pTarget.layout?.y ?? 0) - 40, width: (pTarget.layout?.width ?? 160) + 120, height: (pTarget.layout?.height ?? 100) + 80 };
  bg.style = { fills: [{ type: 'SOLID', color: '#2ecc71' }] };
  let parent: any = null;
  walk(patched, (n: any) => { if (!parent && Array.isArray(n?.children) && n.children.some((c: any) => c?.id === targetId)) parent = n; });
  if (parent) {
    const ti = parent.children.findIndex((c: any) => c?.id === targetId);
    parent.children.splice(ti, 0, bg); // 插到目标之前 = 先画 → 视觉在后
  }
}
seed = JSON.stringify(patched);
await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, seed]);
await page.reload();
await page.waitForSelector('.prop-heading');
await sleep(700);
await selectNode(targetId);
await sleep(400);

/* 枚举：按分区抓控件规格 */
const spec = await page.evaluate(() => {
  const secs: { heading: string; controls: { idx: number; label: string; tag: string; itype?: string; value: string }[] }[] = [];
  for (const sec of Array.from(document.querySelectorAll('.prop-section'))) {
    const headEl = sec.querySelector('.prop-heading');
    if (!headEl) continue;
    const heading = (headEl.textContent ?? '').split('（')[0].trim();
    const controls: any[] = [];
    const nodes = Array.from(sec.querySelectorAll('input, select, textarea'));
    nodes.forEach((el: any, idx) => {
      let label = el.getAttribute('aria-label') ?? '';
      if (!label) {
        let p: HTMLElement | null = el.parentElement;
        while (p && p !== sec && !label) { label = p.querySelector('.field-label')?.textContent?.trim() ?? ''; if (!label) label = p.previousElementSibling?.querySelector?.('.field-label')?.textContent?.trim() ?? ''; p = p.parentElement; }
      }
      if (!label) label = el.name || el.title || `${heading}#${idx}`;
      controls.push({ idx, label, tag: el.tagName.toLowerCase(), itype: el.type, value: String(el.value ?? '') });
    });
    secs.push({ heading, controls });
  }
  return secs;
});
writeFileSync(join(outDir, 'spec.json'), JSON.stringify(spec, null, 2), 'utf8');
console.log('分区枚举：', spec.map((s) => `${s.heading}(${s.controls.length})`).join(' · '));

/* 每轮校验控件身份：返回定位句柄 */
async function locate(heading: string, c: (typeof spec)[0]['controls'][0]) {
  const sec = page.locator('.prop-section', { has: page.locator(`.prop-heading:text-is("${heading}")`) });
  const els = sec.locator('input, select, textarea');
  const handle = els.nth(c.idx);
  const label = await handle.getAttribute('aria-label');
  const valueNow = await handle.inputValue().catch(() => '');
  const labelOk = (label ?? c.label.slice(0, 10)).startsWith(c.label.slice(0, 6)) || label === null;
  return { handle, ok: (await handle.count()) > 0 && labelOk, valueNow };
}

/* 区域截图 */
async function nodeShot(tag: string): Promise<Buffer | null> {
  const g = await page.evaluate((id) => (window as any).__UIC_E2E__?.geometryOf(id) ?? null, targetId);
  const view = await page.evaluate(() => (window as any).__UIC_VIEW__?.() ?? null);
  const content = await page.locator('.konvajs-content').boundingBox().catch(() => null);
  if (!g || !view || !content) return null;
  const PAD = 48; // 阴影/模糊带外扩（8px 会截掉 DROP_SHADOW 的 y+blur+spread ≈20px 外晕 → 假「画布不响应」）
  const clip = {
    x: Math.max(0, Math.min(1430, content.x + view.x + g.x * view.scale - PAD)),
    y: Math.max(0, Math.min(880, content.y + view.y + g.y * view.scale - PAD)),
    width: Math.max(1, Math.min(1440, g.width * view.scale + PAD * 2)),
    height: Math.max(1, Math.min(900, g.height * view.scale + PAD * 2)),
  };
  try {
    const buf = await page.screenshot({ clip });
    writeFileSync(join(shotsDir, `${tag}.png`), buf);
    return buf;
  } catch {
    return null;
  }
}

/* ---------------- 审计主循环（BATCH1） ---------------- */
type Row = {
  section: string; label: string; tag: string; itype?: string;
  before: string; after: string;
  C1_panel: boolean; C2_data: boolean; C3_compile: boolean; C4_canvas: boolean;
  paths: string[]; note: string;
};
const rows: Row[] = [];

for (const sectionSpec of spec.filter((s) => BATCH1.includes(s.heading))) {
  for (const c of sectionSpec.controls) {
    const row: Row = { section: sectionSpec.heading, label: c.label, tag: c.tag, itype: c.itype, before: '', after: '', C1_panel: false, C2_data: false, C3_compile: false, C4_canvas: false, paths: [], note: '' };
    try {
      await page.reload(); await page.waitForSelector('.prop-heading'); await sleep(550);
      await selectNode(targetId); await sleep(250);
      const { handle, ok, valueNow } = await locate(sectionSpec.heading, c);
      row.before = valueNow;
      if (!ok) { row.note = 'SKIP：控件身份漂移（重载后标签/索引不符，不猜）'; rows.push(row); continue; }
      row.C1_panel = await handle.isEnabled();
      if (!row.C1_panel) { row.note = 'SKIP：disabled 态'; rows.push(row); continue; }

      const preData = await readData();
      const preCss = compileFingerprint(preData, pageName);
      const preShot = await nodeShot(`${sectionSpec.heading}#${c.idx}-pre`);
      if (!preShot) row.note = '画布通道不可用（hook/几何/选区缺失）→ C4 记不定';

      /* 设一个肯定不同的值（按类型） */
      if (c.tag === 'select') {
        const nOpts = await handle.locator('option').count();
        if (nOpts < 2) { row.note = 'SKIP：select 仅一个选项'; rows.push(row); continue; }
        const selIdx = await handle.evaluate((el: HTMLSelectElement) => el.selectedIndex);
        const targetIdx = selIdx >= nOpts - 1 ? 0 : selIdx + 1;
        await handle.selectOption({ index: targetIdx });
        row.after = (await handle.evaluate((el: HTMLSelectElement) => el.options[el.selectedIndex]?.text ?? '')) ?? '';
      } else if (c.itype === 'checkbox') {
        await handle.click();
        row.after = String(await handle.isChecked().catch(() => ''));
      } else if (c.itype === 'color') {
        await handle.evaluate((el: HTMLInputElement) => {
          const v = el.value.toLowerCase() === '#7f3fd2' ? '#1fa77a' : '#7f3fd2';
          Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        row.after = await handle.inputValue().catch(() => '');
      } else if (c.tag === 'textarea') {
        await handle.fill(`${valueNow || 'x'}+`); await page.keyboard.press('Enter');
        row.after = await handle.inputValue().catch(() => '');
      } else {
        const info = await handle.evaluate((el: HTMLInputElement) => ({
          min: el.min !== '' ? parseFloat(el.min) : -1000,
          max: el.max !== '' ? parseFloat(el.max) : 1000,
          step: el.step ? parseFloat(el.step) : 1,
          cur: parseFloat(el.value),
        }));
        if (!Number.isFinite(info.max - info.min) || info.max <= info.min) { row.note = 'SKIP：数值域异常'; rows.push(row); continue; }
        const span = info.max - info.min;
        const curN = Number.isFinite(info.cur) ? info.cur : info.min;
        let nv = curN + (info.itype === 'range' || span <= 20 ? span * 0.3 : 5);
        if (nv > info.max) nv = curN - span * 0.3;
        if (Math.abs(nv - curN) < info.step / 2) nv = info.min + span * 0.5; // 兜底取中点
        nv = Math.round(Math.min(info.max, Math.max(info.min, nv)) / info.step) * info.step;
        if (nv === curN) { row.note = `SKIP：域内无处可设（${info.min}~${info.max}）`; rows.push(row); continue; }
        await handle.evaluate((el: HTMLInputElement, v: number) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          setter?.call(el, String(Math.round(v * 1000) / 1000));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, nv);
        await page.keyboard.press('Enter');
        row.after = String(Math.round(nv * 1000) / 1000);
      }
      await sleep(800); // autosave debounce 500ms

      const postData = await readData();
      row.C2_data = postData !== preData;
      if (row.C2_data) row.paths = deepDiff(JSON.parse(preData), JSON.parse(postData)).slice(0, 6);
      row.C3_compile = compileFingerprint(postData || preData, pageName) !== preCss;
      const postShot = await nodeShot(`${sectionSpec.heading}#${c.idx}-post`);
      row.C4_canvas = !!(preShot && postShot && !preShot.equals(postShot));
      rows.push(row);
    } catch (e: any) {
      row.note = `ERROR：${String(e?.message ?? e).slice(0, 90)}`;
      rows.push(row);
    }
  }
  const done = rows.filter((r) => r.C1_panel && !r.note.startsWith('SKIP')).length;
  console.log(`· 分区「${sectionSpec.heading}」完成（累计有效行 ${done}）`);
}

/* ---------------- 报表 ---------------- */
const valid = rows.filter((r) => !r.note.startsWith('SKIP') && !r.note.startsWith('ERROR'));
const stats = {
  总行数: rows.length, 有效行: valid.length,
  SKIP_disabled: rows.filter((r) => r.note.startsWith('SKIP') && r.C1_panel === false && !r.before).length,
  SKIP_identity: rows.filter((r) => r.note.startsWith('SKIP：控件身份')).length,
  ERROR: rows.filter((r) => r.note.startsWith('ERROR')).length,
  四全绿: valid.filter((r) => r.C2_data && r.C3_compile && r.C4_canvas).length,
  画布不响应数据出码皆有效: valid.filter((r) => r.C2_data && r.C3_compile && !r.C4_canvas).length,
  数据未动: valid.filter((r) => !r.C2_data).length,
  数据动而未进码: valid.filter((r) => r.C2_data && !r.C3_compile).length,
};
const md: string[] = [
  '# 参数级四渠道覆盖审计 · 第一批（6 分区）',
  '', `> 专项基线：HEAD=${execSync('git rev-parse --short HEAD').toString().trim()}+未提交工作区（并发 WIP：PropertyPanel/Canvas/store）· 端口 ${PORT} · C2=autosave JSON 深diff / C3=真 compilePage / C4=节点区域像素字节`,
  '',
  '| # | 分区 | 控件 | 类型 | 前值→后值 | C2 数据 | C3 出码 | C4 画布 | 变更路径/备注 |',
  '|---|---|---|---|---|---|---|---|---|',
];
rows.forEach((r, i) => {
  md.push(`| ${i + 1} | ${r.section} | ${r.label} | ${r.itype ?? r.tag} | ${String(r.before).slice(0, 14)}→${String(r.after).slice(0, 14)} | ${r.C2_data ? '✅' : '❌'} | ${r.C3_compile ? '✅' : '❌'} | ${r.C4_canvas ? '✅' : '❌'} | ${r.note || r.paths.join(';').slice(0, 90)} |`);
});
md.push('', '```json\n' + JSON.stringify(stats, null, 2) + '\n```');
writeFileSync(join(outDir, 'params.md'), md.join('\n'), 'utf8');
writeFileSync(join(outDir, 'report.json'), JSON.stringify({ stats, rows }, null, 2), 'utf8');
console.log('\n=== 汇总 ===', JSON.stringify(stats, null, 2));
console.log('报表：' + join(outDir, 'params.md'));

await browser.close();
server.kill();
