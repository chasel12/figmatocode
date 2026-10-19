/**
 * 参数级四渠道覆盖审计 · 第二批（100% 收口批，2026-10-19）。
 * 第一批（58 行，提交 4592ab4）后补齐：
 *  · 三种靶节点：RECT（叠绿背景+多层填充+8 类效果+描边+导出预设）/ FRAME 容器（两子矩形→容器属性真实语义）/ TEXT（排版+内容）；
 *  · 出码指纹升级为 compilePage CSS **＋ generateHtml**（文本内容等走 HTML 通道的参数不再假阴性）；
 *  · 效果 8 类全量入册 → #18 画布覆盖面精确量化；
 *  · 样式分区=按钮型控件（token 应用），不在原生控件枚举域，登记边界。
 * 运行：npm run build && npm run precanvasdiff 后 `npx vite-node scripts/param-audit.ts`
 * 产出：dist/param-audit/{report2.json,params2.md,shots2/}
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compilePage } from '../src/compiler/compile';
import { generateHtml } from '../src/generator/html';

const root = process.cwd();
const PORT = 4284;
const outDir = join(root, 'dist', 'param-audit');
const shotsDir = join(outDir, 'shots2');
mkdirSync(shotsDir, { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const KEY = 'ui-compiler.autosave.v2';

/* ---------------- seed 工程（工厂构造，保证 hydration 兼容） ---------------- */
const mkLayout = (x: number, y: number, w: number, h: number, over: Record<string, unknown> = {}) => ({
  mode: 'ABSOLUTE', x, y, width: w, height: h, widthMode: 'FIXED', heightMode: 'FIXED',
  padding: [0, 0, 0, 0], gap: 0, align: 'START', justify: 'START', ...over,
});
const mkLeaf = (id: string, name: string, layout: Record<string, unknown>, style: Record<string, unknown>) => ({
  id, name, type: 'RECTANGLE', layout, style, children: [],
});
const seedRect = mkLeaf('audit-rect', '审计靶',
  mkLayout(100, 90, 160, 100),
  {
    fills: [{ type: 'SOLID', color: '#e67e22', opacity: 0.45 }, { type: 'GRADIENT_LINEAR', angle: 45, stops: [{ position: 0, color: '#ff0000' }, { position: 1, color: '#0000ff' }] }],
    border: { width: 3, color: '#c0392b', align: 'INSIDE' },
    exportSettings: [{ format: 'PNG', scale: 2, suffix: '@2x' }],
    effects: [
      { kind: 'DROP_SHADOW', x: 0, y: 6, blur: 12, spread: 2, color: 'rgba(0,0,0,0.35)' },
      { kind: 'INNER_SHADOW', x: 0, y: 2, blur: 6, color: 'rgba(0,0,0,0.3)' },
      { kind: 'LAYER_BLUR', radius: 6 },
      { kind: 'BACKGROUND_BLUR', radius: 8 },
      { kind: 'PROGRESSIVE_BLUR', radius: 10, startRadius: 2, offset: 40, beta: 0.6 },
      { kind: 'NOISE', radius: 6, density: 0.5, color: '#888888' },
      { kind: 'TEXTURE', radius: 4, density: 0.4, color: '#777777' },
      { kind: 'GLASS', radius: 10, color: '#ffffff' },
    ],
  });
const seedBg = mkLeaf('audit-bg', '审计背景', mkLayout(60, 60, 300, 220), { fills: [{ type: 'SOLID', color: '#2ecc71' }] });
const seedFrame = {
  id: 'audit-frame', name: '审计容器', type: 'FRAME',
  layout: mkLayout(60, 340, 340, 150, { mode: 'HORIZONTAL', align: 'START', justify: 'START', gap: 10, padding: [8, 8, 8, 8] }),
  style: { fills: [{ type: 'SOLID', color: '#f5eefc' }] },
  children: [
    mkLeaf('f-c1', '子一', { mode: 'FIXED', width: 80, height: 60, widthMode: 'FIXED', heightMode: 'FIXED' } as Record<string, unknown>, { fills: [{ type: 'SOLID', color: '#3498db' }] }),
    mkLeaf('f-c2', '子二', { mode: 'FIXED', width: 80, height: 60, widthMode: 'FIXED', heightMode: 'FIXED' } as Record<string, unknown>, { fills: [{ type: 'SOLID', color: '#e74c3c' }] }),
  ],
};
const seedText = {
  id: 'audit-text', name: '审计文案', type: 'TEXT',
  layout: mkLayout(60, 520, 300, 30),
  style: { color: '#111111', fontSize: 16, fontWeight: 400, lineHeight: 22, textAlign: 'left' },
  text: '审计文本 Audit Text',
  children: [],
};
const seedStorage = JSON.stringify({
  version: 2,
  project: {
    version: 2, name: '参数审计工程',
    pages: [{ id: 'audit-page', name: '审计页', viewport: { width: 500, height: 600 }, root: { id: 'audit-root', name: '审计页', type: 'FRAME', layout: mkLayout(0, 0, 500, 600, { mode: 'VERTICAL' }), style: { fills: [{ type: 'SOLID', color: '#ffffff' }] }, children: [seedBg, seedRect, seedFrame, seedText] } }],
    components: {}, tokens: [], flows: [],
  },
  currentPageId: 'audit-page',
});

/* ---------------- 服务 ---------------- */
const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore', shell: true });
let ready = false;
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://localhost:${PORT}/`)).ok) { ready = true; break; } } catch { /* retry */ }
  await sleep(400);
}
if (!ready) { server.kill(); throw new Error('preview 未就绪'); }

/* ---------------- 通道工具 ---------------- */
const deepDiff = (a: unknown, b: unknown, path = '', out: string[] = []): string[] => {
  if (out.length > 20) return out;
  if (a === b) return out;
  if (typeof a !== typeof b || a == null || b == null || typeof a !== 'object') { out.push(path); return out; }
  const ao = a as Record<string, unknown>; const bo = b as Record<string, unknown>;
  for (const k of new Set([...Object.keys(ao), ...Object.keys(bo)])) deepDiff(ao[k], bo[k], path ? `${path}.${k}` : k, out);
  return out;
};
const fingerprint = (dataStr: string) => {
  const proj = JSON.parse(dataStr).project;
  const page = proj.pages[0];
  const compiled = compilePage(page);
  return JSON.stringify(compiled.nodes.map((n: { className: string; css: unknown }) => [n.className, n.css]))
    + '@@HTML@@' + generateHtml(page, compiled);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, seedStorage]);
const page = await ctx.newPage();

async function freshLoad(targetId: string) {
  const perr: string[] = [];
  const onPageErr = (e: Error) => perr.push(String(e.message).slice(0, 200));
  page.on('pageerror', onPageErr);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 12000 });
      await page.waitForSelector('.prop-heading', { timeout: 15000 });
      break;
    } catch (e) {
      if (attempt === 1) {
        const body = await page.evaluate(() => document.body?.innerHTML?.slice(0, 400)).catch(() => '(evaluator 失效)');
        writeFileSync(join(outDir, 'diag-fail.html'), `<!-- ${perr.join('\n')} -->\n${body}`, 'utf8');
        console.log('诊断：pageerrors=', perr.slice(0, 4), '\nbody head=', body.slice(0, 160));
      }
      if (attempt === 1) throw e;
      await sleep(2500);
    }
  }
  page.off('pageerror', onPageErr);
  await sleep(550);
  await page.locator(`[data-node-id="${targetId}"]`).first().click();
  await sleep(250);
}
async function readData() { return (await page.evaluate((k) => localStorage.getItem(k), KEY)) ?? ''; }

const enumSection = (heading: string) => {
  const secs = Array.from(document.querySelectorAll('.prop-section'));
  const sec = secs.find(s => (s.querySelector('.prop-heading')?.textContent ?? '').split('（')[0].trim() === heading);
  if (!sec) return { missing: true, controls: [] as { idx: number; label: string; tag: string; itype: string }[] };
  const out: { idx: number; label: string; tag: string; itype: string }[] = [];
  Array.from(sec.querySelectorAll('input, select, textarea')).forEach((el: any, idx: number) => {
    let label: string = el.getAttribute('aria-label') ?? '';
    if (!label) label = el.closest('.field-row')?.querySelector('.field-label')?.textContent?.trim() ?? '';
    if (!label) { let p: any = el.parentElement; while (p && p !== sec && !label) { label = p.querySelector('.field-label')?.textContent?.trim() ?? ''; p = p.parentElement; } }
    if (!label) label = el.name || el.title || heading + '#' + idx;
    out.push({ idx, label, tag: el.tagName.toLowerCase(), itype: el.type || '' });
  });
  return { missing: false, controls: out };
};

async function nodeShot(targetId: string, tag: string): Promise<Buffer | null> {
  const g = await page.evaluate((id) => (window as unknown as { __UIC_E2E__?: { geometryOf: (i: string) => unknown } }).__UIC_E2E__?.geometryOf(id) as { x: number; y: number; width: number; height: number } | null, targetId);
  const view = await page.evaluate(() => ((window as unknown as { __UIC_VIEW__?: () => { scale: number; x: number; y: number } }).__UIC_VIEW__?.() ?? null));
  const content = await page.locator('.konvajs-content').boundingBox().catch(() => null);
  if (!g || !view || !content) return null;
  const PAD = 48;
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
  } catch { return null; }
}

type Row = { section: string; target: string; label: string; itype: string; before: string; after: string; C2_data: boolean; C3_code: boolean; C4_canvas: boolean; canvasUnmeasurable?: boolean; paths: string[]; note: string };
const rows: Row[] = [];

const PLAN: { heading: string; target: string; tname: string }[] = [
  { heading: '位置与尺寸', target: 'audit-rect', tname: '矩形' },
  { heading: '位置与尺寸', target: 'audit-frame', tname: '容器' },
  { heading: '布局', target: 'audit-frame', tname: '容器' },
  { heading: '图层', target: 'audit-rect', tname: '矩形' },
  { heading: '填充', target: 'audit-rect', tname: '矩形' },
  { heading: '效果', target: 'audit-rect', tname: '矩形' },
  { heading: '导出', target: 'audit-rect', tname: '矩形' },
  { heading: '排版', target: 'audit-text', tname: '文本' },
  { heading: '内容', target: 'audit-text', tname: '文本' },
];

for (const plan of PLAN) {
  await freshLoad(plan.target);
  const spec = await page.evaluate(enumSection, plan.heading) as { missing: boolean; controls: { idx: number; label: string; tag: string; itype: string }[] };
  if (spec.missing) { rows.push({ section: plan.heading, target: plan.tname, label: '-', itype: '-', before: '', after: '', C2_data: false, C3_code: false, C4_canvas: false, paths: [], note: 'ERROR：分区未出现（靶节点不匹配？）' }); continue; }
  if (!spec.controls.length) { rows.push({ section: plan.heading, target: plan.tname, label: '-', itype: '-', before: '', after: '', C2_data: false, C3_code: false, C4_canvas: false, paths: [], note: 'NOTE：该分区无原生控件（按钮型交互，审计边界外）' }); continue; }

  for (const c of spec.controls) {
    const row: Row = { section: plan.heading, target: plan.tname, label: c.label, itype: c.itype || c.tag, before: '', after: '', C2_data: false, C3_code: false, C4_canvas: false, paths: [], note: '' };
    rows.push(row);
    try {
      await freshLoad(plan.target);
      const sec = page.locator('.prop-section', { has: page.locator(`.prop-heading:text-is("${plan.heading}")`) });
      const handle = sec.locator('input, select, textarea').nth(c.idx);
      if (!(await handle.count())) { row.note = 'SKIP：重载后控件消失'; continue; }
      const cur = await handle.evaluate((el: HTMLInputElement) => ({ v: el.value, checked: el.checked, type: el.type }));
      row.before = String(cur.v ?? cur.checked);
      if (!(await handle.isEnabled())) { row.note = 'SKIP：disabled 态'; continue; }

      const preData = await readData();
      const preFp = fingerprint(preData);
      const preShot = await nodeShot(plan.target, `${plan.heading}-${row.target}#${c.idx}-pre`);
      if (!preShot) row.note = '画布通道不可测（几何/hook 缺失）';

      if (c.tag === 'select') {
        const nOpts = await handle.locator('option').count();
        if (nOpts < 2) { row.note = 'SKIP：单选项 select'; continue; }
        const selIdx = await handle.evaluate((el: HTMLSelectElement) => el.selectedIndex);
        await handle.selectOption({ index: selIdx >= nOpts - 1 ? 0 : selIdx + 1 });
        row.after = await handle.evaluate((el: HTMLSelectElement) => el.options[el.selectedIndex]?.text ?? '');
      } else if (cur.type === 'checkbox') {
        await handle.click();
        row.after = String(!(cur as { checked: boolean }).checked);
      } else if (cur.type === 'color') {
        await handle.evaluate((el: HTMLInputElement) => {
          const v = el.value.toLowerCase() === '#7f3fd2' ? '#1fa77a' : '#7f3fd2';
          Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        row.after = await handle.inputValue().catch(() => '');
      } else if (c.tag === 'textarea') {
        await handle.fill(`${cur.v || 'x'}+审计`);
        await page.keyboard.press('Enter');
        row.after = '⟂追加';
      } else {
        const info = await handle.evaluate((el: HTMLInputElement) => ({
          min: el.min !== '' ? parseFloat(el.min) : -1000,
          max: el.max !== '' ? parseFloat(el.max) : 1000,
          step: el.step ? parseFloat(el.step) : 1,
          cur: parseFloat(el.value),
          isRange: el.type === 'range',
        }));
        const span = info.max - info.min;
        const curN = Number.isFinite(info.cur) ? info.cur : info.min;
        let nv = curN + (info.isRange || span <= 20 ? span * 0.3 : 5);
        if (nv > info.max) nv = curN - span * 0.3;
        if (Math.abs(nv - curN) < info.step / 2) nv = info.min + span * 0.5;
        nv = Math.round(Math.min(info.max, Math.max(info.min, nv)) / info.step) * info.step;
        if (nv === curN) { row.note = `SKIP：域内无处可设（${info.min}~${info.max}）`; continue; }
        await handle.evaluate((el: HTMLInputElement, v: number) => {
          Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(el, String(Math.round(v * 1000) / 1000));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, nv);
        await page.keyboard.press('Enter');
        row.after = String(Math.round(nv * 1000) / 1000);
      }
      await sleep(800);

      const postData = await readData();
      row.C2_data = postData !== preData;
      if (row.C2_data) row.paths = deepDiff(JSON.parse(preData), JSON.parse(postData)).slice(0, 5);
      row.C3_code = fingerprint(postData || preData) !== preFp;
      const postShot = await nodeShot(plan.target, `${plan.heading}-${row.target}#${c.idx}-post`);
      row.canvasUnmeasurable = !preShot || !postShot;
      row.C4_canvas = !!(preShot && postShot && !preShot.equals(postShot));
    } catch (e: unknown) {
      row.note = `ERROR：${String(e instanceof Error ? e.message : e).slice(0, 80)}`;
    }
  }
  const sec = rows.filter((r) => r.section === plan.heading && r.target === plan.tname);
  console.log(`· ${plan.heading}[${plan.tname}] 完成 ${sec.length} 行`);
}

/* ---------------- 报表 ---------------- */
const acted = rows.filter((r) => r.C2_data || r.C3_code || r.C4_canvas);
const stats = {
  总行数: rows.length,
  有效枚举行: acted.length,
  三渠道全通: acted.filter((r) => r.C2_data && r.C3_code && r.C4_canvas).length,
  数据出码通画布不响应: acted.filter((r) => r.C2_data && r.C3_code && !r.C4_canvas && !r.canvasUnmeasurable).length,
  数据通未进码: acted.filter((r) => r.C2_data && !r.C3_code).length,
  画布不可测: rows.filter((r) => r.canvasUnmeasurable && !r.note.startsWith('SKIP')).length,
  SKIP或NOTE: rows.filter((r) => (r.note.startsWith('SKIP') || r.note.startsWith('NOTE')) && !r.C2_data).length,
  ERROR: rows.filter((r) => r.note.startsWith('ERROR')).length,
};
const md: string[] = [
  '# 参数级四渠道审计 · 第二批（收口批）',
  '',
  `> 基线：HEAD=${execSync('git rev-parse --short HEAD').toString().trim()}＋未提交并发 WIP（PropertyPanel/NumField，17:22 mtime）· 端口 ${PORT} · 出码指纹=compilePage CSS+generateHtml · C4=靶节点区域像素（PAD48，绿底参照）`,
  '',
  '| # | 分区 | 靶 | 控件 | 前→后 | C2 数据 | C3 码 | C4 画布 | 备注/路径 |',
  '|---|---|---|---|---|---|---|---|---|',
];
rows.forEach((r, i) => {
  md.push(`| ${i + 1} | ${r.section} | ${r.target} | ${r.label} | ${String(r.before).slice(0, 12)}→${String(r.after).slice(0, 12)} | ${r.C2_data ? '✅' : '—'} | ${r.C3_code ? '✅' : '—'} | ${r.canvasUnmeasurable ? '▦' : r.C4_canvas ? '✅' : '❌'} | ${r.note || r.paths.join(';').slice(0, 80)} |`);
});
md.push('', '```json\n' + JSON.stringify(stats, null, 2) + '\n```');
writeFileSync(join(outDir, 'params2.md'), md.join('\n'), 'utf8');
writeFileSync(join(outDir, 'report2.json'), JSON.stringify({ stats, rows }, null, 2), 'utf8');
console.log('\n=== 第二批汇总 ===', JSON.stringify(stats, null, 2));
console.log('报表：' + join(outDir, 'params2.md'));

await browser.close();
server.kill();
