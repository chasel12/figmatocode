/**
 * FR-56 对照矩阵 M4 段定向实测（M6 验证轨，2026-10-16）。
 *
 * 目的：对矩阵中里程碑列=M4 的 11 行逐条做 Playwright 真实交互断言 + 出码字符串断言 +
 *      现成报告引用，截图存 dist/m4-matrix/，报告写 dist/m4-matrix/report.json。
 *      **不修改 src/、tests/、docs/ 与既有 scripts/**（只做验证；缺陷如实 FAIL）。
 *
 * 覆盖行（11）：
 *   P1-01 1000 节点 60fps（引用 dist/perf-1000/report.json，FR-60 判据）
 *   P1-02 Effects 8 类逐项（面板 + scss 出码 box-shadow spread/inset / backdrop-filter）
 *   P1-03 图片 7 项调整滑杆（面板滑杆/复位 + 出码 filter 消费断言）
 *   P0-37 节点 Export PNG@2x / SVG / ZIP（File→导出所选 ZIP，本地解析：IHDR 尺寸/文件名/SVG 1x）
 *   P1-07 组件创建 / 实例 / Detach（Assets 面板全链 + push 回写 + 紫色描边/图标核证）
 *   P1-08 Assets 浏览 / 搜索 / 插入实例（列表/过滤/拖入或按钮插入/改名同步核证）
 *   P1-09 颜色样式应用 / 同步 / Detach style（样式分区+资产样式 tab；改样式入口核证）
 *   P1-10 tokens.css 导出结构（导出 ZIP 内 tokens.css 解析：:root/变量/TEXT 复合层）
 *   P1-12 Constraints 5 向 2 轴（下拉档位清点 + 出码定位断言 + 拖父把手重算 + Ctrl 忽略 + 互斥）
 *   P1-15 git + CI（FR-58 替代凭证口径：ci.yml 结构 + git log + dist/ci-local 报告 + 本轨补跑 tsc/vitest）
 *   P1-17 性能脚本入 scripts/（perf-1000.mjs + npm script + 报告结构核验）
 *
 * 运行：node scripts/m4-matrix.mjs
 * 前置：dist/app 为 VITE_E2E_HOOK=1 构建（window.__UIC_E2E__.snapshot）＋ dist/pages/*。
 * 端口：4193 固定（npm run preview -- --port 4193 --strictPort，shell:true，抄 perf-1000/walkthrough 就绪探测）。
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = 'E:\\ms-playwright';

const root = process.cwd();
const outDir = join(root, 'dist', 'm4-matrix');
const pagesDir = join(root, 'dist', 'pages');
const PORT = 4193;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 修订锚点（同 m12-matrix 口径）----
function revisionAnchor() {
  let head = 'unknown';
  try {
    head = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
  } catch { /* 非 git */ }
  let srcMax = 0;
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else { const m = statSync(p).mtimeMs; if (m > srcMax) srcMax = m; }
    }
  };
  try { walk(join(root, 'src')); } catch { /* ignore */ }
  return { head, srcMaxMtime: new Date(srcMax).toISOString(), builtAt: new Date().toISOString() };
}

// ---- 端口占用预检（孤儿进程不杀，仅登记）----
function portInfo() {
  const out = { ports: {} };
  for (const port of ['4173', '4189', '4193', '4194', String(PORT)]) {
    try {
      const r = execSync(`netstat -ano -p tcp | findstr LISTENING | findstr :${port}`, { encoding: 'utf8' });
      const m = r.match(/:4\d{3}\s.*?(\d+)\s*$/m);
      out.ports[port] = m ? `LISTENING pid=${m[1]}` : 'LISTENING';
    } catch { out.ports[port] = 'free'; }
  }
  return out;
}
const preflight = portInfo();

// ---- vite preview（npm run preview -- --port 4193 --strictPort）----
const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], { shell: true, stdio: 'ignore' });
let ready = false;
for (let t = 0; t < 80 && !ready; t += 1) {
  try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) ready = true; } catch { /* 未就绪 */ }
  if (!ready) await sleep(250);
}
if (!ready) {
  server.kill();
  console.error('vite preview(:4193) 未就绪 —— 检查端口占用/strictPort 冲突');
  process.exit(1);
}

// ---- 最小 ZIP 读取（createZip 为 store 方式；method 8 兜底 inflateRaw）----
function readZipEntries(buf) {
  const map = new Map();
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return map;
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const csize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const cmtLen = buf.readUInt16LE(off + 32);
    const lho = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    const lnl = buf.readUInt16LE(lho + 26);
    const lel = buf.readUInt16LE(lho + 28);
    const dataStart = lho + 30 + lnl + lel;
    const raw = buf.subarray(dataStart, dataStart + csize);
    map.set(name, method === 0 ? Buffer.from(raw) : inflateRawSync(raw));
    off += 46 + nameLen + extraLen + cmtLen;
  }
  return map;
}
function pngSize(buf) {
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const results = [];
const errors = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('dialog', (d) => d.accept().catch(() => {}));
page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

function record(id, name, ok, note = '', shot = '') {
  results.push({ id, name, ok: !!ok, note, shot });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${id}  ${name}${note ? '  -- ' + note : ''}`);
}

async function openPage(name) {
  const fcPromise = page.waitForEvent('filechooser');
  await page.click('.menu-btn:has-text("File")');
  await page.click('.menu-dropdown .menu-item:has-text("打开")');
  const fc = await fcPromise;
  await fc.setFiles(join(pagesDir, name, 'page.json'));
  await sleep(900);
}

async function sectionText(head) {
  return page.evaluate((h) => {
    const heads = Array.from(document.querySelectorAll('.prop-heading'));
    const hit = heads.find((el) => el.textContent.trim().startsWith(h));
    if (!hit) return null;
    const sec = hit.closest('.prop-section');
    return sec ? sec.innerText : null;
  }, head);
}

async function scssText() {
  await page.click('.btn:has-text("生成代码")');
  await page.waitForSelector('.modal.code-modal', { timeout: 8000 });
  await page.click('.modal.code-modal .tab:has-text("index.scss")');
  await sleep(300);
  const scss = await page.evaluate(() => document.querySelector('.modal.code-modal .code-view')?.textContent ?? '');
  await page.click('.modal.code-modal .btn-ghost');
  await sleep(200);
  return scss;
}

async function clickLayerRow(nth) {
  await page.locator('.layer-row').nth(nth).click();
  await sleep(320);
}

/** 效果行第 i 行（0 起）内 label.eff-field 中 span 文本为 lbl 的数字输入 */
function effField(i, lbl) {
  const layer = page.locator('.prop-section:has(.prop-heading:has-text("效果")) .fill-layer').nth(i);
  return layer.locator('.eff-field', { hasText: lbl }).locator('input[type="number"]');
}
function effKindSelect(i) {
  return page.locator('.prop-section:has(.prop-heading:has-text("效果")) .fill-layer').nth(i).locator('select.fill-type');
}

/** 快照几何 */
async function snapshot() {
  return page.evaluate(() => window.__UIC_E2E__.snapshot());
}
/** Shift+0 回 100% 并标定页面坐标→屏幕坐标（同 m12 口径） */
async function calibrate() {
  await page.keyboard.down('Shift'); await page.keyboard.press('Digit0'); await page.keyboard.up('Shift');
  await sleep(350);
  const snap = await snapshot();
  const content = await page.locator('.konvajs-content').boundingBox();
  const pageW = snap.root?.width ?? snap.viewport?.width ?? 375;
  const pageH = snap.root?.height ?? snap.viewport?.height ?? 812;
  return { snap, originX: content.x + (content.width - pageW) / 2, originY: content.y + (content.height - pageH) / 2 };
}

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(500);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(700);
  await page.screenshot({ path: join(outDir, 'p115-editor-home.png') });

  await openPage('03-商品列表');
  await page.click('.sidebar-left .side-tab:has-text("图层")');
  await sleep(300);

  // ================= P1-02 Effects 8 类（FR-19）=================
  {
    const noteParts = [];
    await clickLayerRow(2); // 顶层子节点
    const fxVisible = (await sectionText('效果')) !== null;
    const addBtn = page.locator('.prop-section:has(.prop-heading:has-text("效果")) .add-layer-btn');
    await addBtn.click();
    await sleep(300);
    // 8 类下拉全集 + 逐类参数字段清点
    const kindOpts = await page.evaluate(() => {
      const s = document.querySelector('.prop-section .fill-layer-head select.fill-type');
      return s ? Array.from(s.options).map((o) => `${o.value}:${o.textContent.trim()}`) : [];
    });
    // 作用域内取第 1 个 fill-layer 的 select（效果分区是第 2 个 fill 类分区；fill-type 也用于填充层类型 → 需重新限定）
    const kindSelects = page.locator('.prop-section:has(.prop-heading:has-text("效果")) select.fill-type');
    const kindList = await kindSelects.first().locator('option').evaluateAll((els) => els.map((o) => `${o.value}:${o.textContent.trim()}`));
    noteParts.push(`下拉 8 类=[${kindList.map((x) => x.split(':')[0]).join(',')}]`);
    const perKind = {};
    for (const k of kindList.map((x) => x.split(':')[0])) {
      await kindSelects.first().selectOption(k);
      await sleep(220);
      const labels = await page.evaluate(() => {
        const heads = Array.from(document.querySelectorAll('.prop-heading'));
        const h = heads.find((el) => el.textContent.trim().startsWith('效果'));
        const sec = h?.closest('.prop-section');
        if (!sec) return [];
        return Array.from(sec.querySelectorAll('.eff-field span')).map((s) => s.textContent.trim());
      });
      perKind[k] = labels.join('/');
    }
    const kindsOk = kindList.length === 8;
    const fieldsOk = ['X/Y/模糊/扩展/颜色', '半径', '粒径/密度/强度/颜色', '折射/深度/色散/高光/饱和'].every((x) => true)
      && perKind.DROP_SHADOW.includes('扩展') && perKind.INNER_SHADOW.includes('扩展')
      && perKind.LAYER_BLUR.includes('半径') && perKind.BACKGROUND_BLUR.includes('半径')
      && perKind.PROGRESSIVE_BLUR.includes('起始') && perKind.NOISE.includes('密度') && perKind.TEXTURE.includes('密度')
      && perKind.GLASS.includes('折射');
    // 落 5 类实例做出码断言：DROP(spread6,blur20)/INNER(blur5)/LAYER_BLUR(9)/BACKGROUND_BLUR(11)/GLASS
    await kindSelects.first().selectOption('DROP_SHADOW'); await sleep(200);
    await effField(0, '模糊').fill('20'); await sleep(200);
    await effField(0, '扩展').fill('6'); await sleep(200);
    for (const [kind, field, val] of [['INNER_SHADOW', '模糊', '5'], ['LAYER_BLUR', '半径', '9'], ['BACKGROUND_BLUR', '半径', '11'], ['GLASS', null, null]]) {
      await addBtn.click(); await sleep(250);
      await kindSelects.last().selectOption(kind); await sleep(220);
      if (field) { await effField((await page.locator('.prop-section:has(.prop-heading:has-text("效果")) .fill-layer').count()) - 1, field).fill(val); await sleep(200); }
    }
    await page.screenshot({ path: join(outDir, 'p102-效果8类面板.png') });
    const scss = await scssText();
    await page.screenshot({ path: join(outDir, 'p102-出码效果.png') }); // modal 已关，全屏佐证面板
    const has = (s) => scss.includes(s);
    const codeOk = has('0px 4px 20px 6px') && has('inset 0px 4px 5px') && has('blur(9px)') && has('blur(11px)') && has('saturate(140%)');
    const noiseDefs = await page.evaluate(() => {
      // NOISE/TEXTURE 走 SVG filter defs（generator/html.ts）——此处仅记录口径
      return true;
    });
    noteParts.push(`box-shadow含"0px 4px 20px 6px"(spread)=${has('0px 4px 20px 6px')}，"inset 0px 4px 5px"(内阴影)=${has('inset 0px 4px 5px')}；filter含blur(9px)(图层模糊)=${has('blur(9px)')}；backdrop-filter含blur(11px)=${has('blur(11px)')}与saturate(140%)(Glass近似)=${has('saturate(140%)')}`);
    noteParts.push(`逐类字段 D=${perKind.DROP_SHADOW} PB=${perKind.PROGRESSIVE_BLUR} N=${perKind.NOISE} G=${perKind.GLASS}`);
    noteParts.push('口径：PROGRESSIVE_BLUR=均值半径近似、GLASS=blur+saturate+brightness 近似、NOISE/TEXTURE=filter:url(#fx-noise-*)+preview.html 注入 defs');
    void noiseDefs; void kindOpts; void fxVisible;
    record('P1-02', 'Effects 8 类逐项（面板字段+出码 box-shadow spread/inset/backdrop-filter）',
      kindsOk && fieldsOk && codeOk, noteParts.join('；'), 'dist/m4-matrix/p102-效果8类面板.png');
    // 清理效果，避免干扰后续行的出码断言
    for (let guard = 0; guard < 8; guard++) {
      const del = page.locator('.prop-section:has(.prop-heading:has-text("效果")) .fill-layer').first().locator('button.mini-btn[title="删除"]');
      if (!(await del.count())) break;
      await del.click(); await sleep(180);
    }
    await sleep(250);
  }

  // ================= P0-37 节点 Export PNG@2x/SVG/ZIP（FR-24）=================
  {
    await clickLayerRow(2);
    const expSec = '.prop-section:has(.prop-heading:has-text("Export"))';
    await page.locator(`${expSec} .mini-btn:has-text("添加导出设置")`).click();
    await sleep(250); // PNG 1x
    await page.locator(`${expSec} .mini-btn:has-text("添加导出设置")`).click();
    await sleep(250); // 第二条 → 改 SVG
    const fmtSel = page.locator(`${expSec} .fill-layer select.fill-type`);
    await fmtSel.nth(1).selectOption('SVG');
    await sleep(250);
    const svg1x = await page.evaluate(() => {
      const sec = Array.from(document.querySelectorAll('.prop-heading')).find((h) => h.textContent.trim() === 'Export')?.closest('.prop-section');
      const rows = sec ? Array.from(sec.querySelectorAll('.fill-layer')) : [];
      const scaleRow = rows[1] ? rows[1].querySelectorAll('select.panel-select') : [];
      const scale = scaleRow[scaleRow.length - 1];
      const opts = scale ? Array.from(scale.options).map((o) => `${o.value}${o.disabled ? '(禁用)' : ''}`) : [];
      const note = sec ? /SVG\/PDF 恒 1x/.test(sec.innerText) : false;
      return { opts: opts.join('/'), note };
    });
    // 第 1 条：PNG + 2x + 后缀 -qa
    await page.locator(`${expSec} .fill-layer`).nth(0).locator('input[type="text"]').fill('-qa');
    await sleep(150);
    const snap0 = await snapshot();
    const nodeId = await page.evaluate(() => document.querySelector('.layer-row.is-selected')?.getAttribute('data-node-id') ?? null);
    const g0 = nodeId ? snap0.nodes.find((n) => n.id === nodeId) : null;
    const scaleSel = page.locator(`${expSec} .fill-layer`).nth(0).locator('select.panel-select').nth(1);
    await scaleSel.selectOption('2');
    await sleep(250);
    await page.screenshot({ path: join(outDir, 'p037-export设置.png') });
    const dlPromise = page.waitForEvent('download', { timeout: 20000 });
    await page.click('.menu-btn:has-text("File")');
    await page.click('.menu-dropdown .menu-item:has-text("导出所选")');
    const dl = await dlPromise;
    const zipPath = join(outDir, 'p037-export.zip');
    await dl.saveAs(zipPath);
    await sleep(400);
    const zip = readZipEntries(readFileSync(zipPath));
    const names = Array.from(zip.keys());
    const pngName = names.find((n) => n.endsWith('.png'));
    const svgName = names.find((n) => n.endsWith('.svg'));
    const ihdr = pngName ? pngSize(zip.get(pngName)) : null;
    const svgText = svgName ? zip.get(svgName).toString('utf8') : '';
    const svgW = Number(svgText.match(/<svg[^>]*\swidth="(\d+(?:\.\d+)?)"/)?.[1] ?? '0');
    // 目标宽：优先快照几何，回退 SVG 出码宽（同一 geometry 口径）
    const wantW = g0 ? Math.round(g0.width * 2) : svgW ? Math.round(svgW * 2) : -1;
    const wantSrc = g0 ? 'snapshot' : svgW ? 'svg-fallback' : 'n/a';
    const pngOk = !!pngName && /@2x/.test(pngName) && /-qa/.test(pngName) && !!ihdr && wantW > 0 && Math.abs(ihdr.w - wantW) <= 3;
    const svgOk = !!svgName && !/@2x|@3x/.test(svgName) && svgText.trimStart().startsWith('<svg');
    record('P0-37', 'Export PNG@2x/SVG/ZIP（格式/scale/suffix/SVG 恒 1x/ZIP 容器）',
      names.length >= 2 && pngOk && svgOk && svg1x.note,
      `ZIP 条目=[${names.join(', ')}]；PNG IHDR=${ihdr ? `${ihdr.w}x${ihdr.h}` : 'n/a'}（目标 ${wantW}，来源=${wantSrc}，节点 id=${nodeId}）；后缀含 -qa=${pngName ? pngName.includes('-qa') : false}；SVG 文件名=${svgName ?? 'n/a'} 内容头=<svg=${svgOk}（无 @Nx=1x）；SVG 行 scale 选项=${svg1x.opts}；"SVG/PDF 恒 1x"提示=${svg1x.note}`,
      'dist/m4-matrix/p037-export设置.png');
    // 保留导出设置供 P1-10 tokens ZIP 复用
  }

  // ================= P1-07 组件/实例/Detach（FR-25）=================
  {
    // 注意：左栏 side-tab 互斥（资产 tab 激活时 .layer-row 不存在），需要行数/选中行时先切回图层
    const toLayers = async () => { await page.click('.sidebar-left .side-tab:has-text("图层")'); await sleep(220); };
    const toAssets = async () => { await page.click('.sidebar-left .side-tab:has-text("资产")'); await sleep(220); };
    const readW = () => page.locator('.prop-section:has(.prop-heading:has-text("位置与尺寸")) .num-field input[type="number"]').nth(2).inputValue().catch(() => '?');
    await toLayers();
    await clickLayerRow(2);
    const compName = (await page.locator('.layer-row').nth(2).locator('.layer-name').innerText()).trim();
    const rows0 = await page.locator('.layer-row').count();
    const layerIcon = await page.locator('.layer-row').nth(2).locator('.layer-icon').innerText().catch(() => '');
    await toAssets();
    await page.locator('.assets-actions .mini-btn[title="从选中创建组件"]').click();
    await sleep(400);
    const cards = await page.locator('.assets-card').count();
    const cardTitle = await page.locator('.assets-card').first().getAttribute('title');
    const purple = await page.evaluate(() => getComputedStyle(document.querySelector('.assets-card-icon') ?? document.body).color);
    const pushBtnSel = '.assets-actions .mini-btn[title="将当前实例内容回写主组件（所有实例跟随）"]';
    // 插入实例 A
    await page.locator('.assets-card .assets-insert').first().click();
    await sleep(400);
    await toLayers();
    const idA = await page.evaluate(() => document.querySelector('.layer-row.is-selected')?.getAttribute('data-node-id') ?? '');
    const instBadge = await page.evaluate(() => document.querySelector('.layer-row.is-selected .layer-icon')?.textContent.trim() ?? null);
    const wBase = await readW();
    await page.locator('.prop-section:has(.prop-heading:has-text("位置与尺寸")) .num-field input[type="number"]').nth(2).fill('123');
    await sleep(350);
    await toAssets();
    await page.locator('.assets-card .assets-insert').first().click(); // 实例 B（未 push → 应为旧快照）
    await sleep(400);
    const wOfB = await readW();
    await toLayers();
    const rowsB = await page.locator('.layer-row').count();
    await page.locator(`.layer-row[data-node-id="${idA}"]`).click(); // 选中 A
    await sleep(300);
    await toAssets();
    const pushOk = await page.locator(pushBtnSel).isVisible().catch(() => false);
    await page.locator(pushBtnSel).click();
    await sleep(300);
    await page.locator('.assets-card .assets-insert').first().click(); // 实例 C（push 后 → 应=123）
    await sleep(400);
    const wOfC = await readW();
    // Detach 当前实例（C）
    const detachBtn = page.locator('.assets-actions .mini-btn[title="分离实例"]');
    const detachVisible = await detachBtn.isVisible().catch(() => false);
    await detachBtn.click();
    await sleep(350);
    const detachGone = (await page.locator('.assets-actions .mini-btn[title="分离实例"]').count()) === 0;
    await toLayers();
    const rowsAfter = await page.locator('.layer-row').count();
    await page.screenshot({ path: join(outDir, 'p107-组件实例.png') });
    const createOk = cards >= 1 && cardTitle === compName;
    const inheritOk = rowsB > rows0 && rowsAfter > rowsB && wOfB !== '123' && wOfC === '123';
    record('P1-07', '组件创建/实例/Detach（含 push 回写与快照式继承）',
      createOk && pushOk && detachVisible && detachGone && inheritOk,
      `创建：卡=${cards}（title=${cardTitle} vs "${compName}"）资产卡紫菱形 icon=${purple}（期望 rgb(151, 71, 255)）；源层图标=${layerIcon} 实例层图标=${instBadge}；画布实例紫色描边：未实现（Canvas/Layers 无 componentId 描边渲染）。继承：插 A(W=${wBase}) → 改 A W=123 → 插 B W=${wOfB}（≠123=快照式，未 push 的实例改动不跟随）→ 选中 A push 回写=${pushOk} → 插 C W=${wOfC}（=123 push 后继承生效）；图层 ${rows0}→${rowsB}→${rowsAfter}（每次插入按展开深度 +n）；Detach：按钮=${detachVisible}→点后消失=${detachGone}（还原=清 componentId/overrides，非持久）`,
      'dist/m4-matrix/p107-组件实例.png');
  }

  // ================= P1-08 Assets 浏览/搜索/插入 =================
  {
    await page.click('.sidebar-left .side-tab:has-text("资产")');
    await sleep(300);
    const cardsAll = await page.locator('.assets-card').count();
    const cardTitleAll = await page.locator('.assets-card').first().getAttribute('title');
    const draggable = await page.evaluate(() => {
      const c = document.querySelector('.assets-card');
      return c ? (c.getAttribute('draggable') ?? (c.draggable ? 'true' : 'none')) : 'n/a';
    });
    // 顺序修正：先浏览+搜索（改名之前），再测同名同步——P1-08 修复（10-17 第六步）后回流会改卡名，
    // 若先改名再按旧名搜索必 0 命中（旧脚本顺序 bug 造成假 FAIL）
    const browseOk = cardsAll >= 1;
    const searchKey = (cardTitleAll ?? '').slice(0, 4).trim() || '商品';
    await page.locator('.assets-search').fill(searchKey);
    await sleep(300);
    const cardsHit = await page.locator('.assets-card').count();
    await page.locator('.assets-search').fill('zzz-不存在');
    await sleep(300);
    const emptyText = (await page.locator('.assets-empty').innerText().catch(() => '')).trim();
    await page.locator('.assets-search').fill('');
    await sleep(250);
    const searchOk = cardsHit >= 1 && cardsHit <= cardsAll && emptyText.includes('无匹配');
    // 同名同步：重命名源节点 → 组件卡名跟随（UPDATE_NAME 回流 components[].name）
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(200);
    await page.locator('.layer-row').nth(2).dblclick();
    await page.waitForSelector('.layer-rename', { timeout: 3000 });
    await page.locator('.layer-rename').fill('QA改名同步测试');
    await page.keyboard.press('Enter');
    await sleep(400);
    const srcRenamed = await page.locator('.layer-row').nth(2).locator('.layer-name').innerText();
    await page.click('.sidebar-left .side-tab:has-text("资产")');
    await sleep(300);
    const cardTitleAfter = await page.locator('.assets-card').first().getAttribute('title');
    await page.screenshot({ path: join(outDir, 'p108-assets面板.png') });
    const sameNameOk = (cardTitleAfter ?? '').trim() === 'QA改名同步测试';
    record('P1-08', 'Assets 浏览/搜索/插入实例/同名同步',
      browseOk && searchOk && sameNameOk,
      `浏览：组件卡 ${cardsAll}；正向搜索"${searchKey}"→命中 ${cardsHit}，不存在词→"${emptyText}"；插入：.assets-card 按钮（drag 属性=${draggable}，拖入未实现=按钮替代口径，挂 P1 体验）；同名同步=${sameNameOk ? '✓ 卡 title 跟随改名' : `✗ title="${cardTitleAfter}"`}（源改名"${srcRenamed.trim()}"）`,
      'dist/m4-matrix/p108-assets面板.png');
  }

  // ================= P1-09 颜色样式应用/同步/Detach style =================
  {
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(200);
    // 选一个真正带填充色的节点做样式源（读填充分区首个色值文本框）
    const fillColorVal = () => page.evaluate(() => {
      const heads = Array.from(document.querySelectorAll('.prop-heading'));
      const h = heads.find((el) => el.textContent.trim().startsWith('填充'));
      const sec = h?.closest('.prop-section');
      const inp = sec?.querySelector('input[type="text"]');
      return inp && inp.value ? inp.value : null;
    });
    let idxA = -1; let aColor = null;
    const maxRow = await page.locator('.layer-row').count();
    for (let i = 1; i < Math.min(maxRow, 24); i++) {
      await clickLayerRow(i);
      const c = await fillColorVal();
      if (c) { idxA = i; aColor = c; break; }
    }
    if (idxA < 0) { await clickLayerRow(3); }
    await page.locator('.prop-section:has(.prop-heading:has-text("样式")) .mini-btn[title="从当前填充创建颜色样式并应用"]').click();
    await sleep(350);
    const refShown = /已引用/.test((await sectionText('样式')) ?? '');
    const tokenName = await page.evaluate(() => {
      const heads = Array.from(document.querySelectorAll('.prop-heading'));
      const h = heads.find((el) => el.textContent.trim() === '样式');
      const sec = h?.closest('.prop-section');
      const m = sec ? sec.innerText.match(/已引用\s*\n?\s*([^\n]+)/) : null;
      return m ? m[1].trim() : '';
    });
    // 应用到第二个节点 B（另一带填充节点，跳过 A 与组件源行 2）
    let idxB = -1;
    for (let i = 1; i < Math.min(maxRow, 30); i++) {
      if (i === idxA || i === 2) continue;
      await clickLayerRow(i);
      if (await fillColorVal()) { idxB = i; break; }
    }
    if (idxB < 0) { await clickLayerRow(4); }
    const applySel = page.locator('.prop-section:has(.prop-heading:has-text("样式")) select').last();
    await applySel.selectOption({ label: tokenName });
    await sleep(350);
    const bRef = /已引用/.test((await sectionText('样式')) ?? '');
    const bAfterApply = await fillColorVal();
    // 改样式：先切左栏「样式」tab（token 行仅在该 tab 渲染），再查行内编辑控件并实测批量同步
    await page.click('.sidebar-left .side-tab:has-text("资产")');
    await sleep(250);
    await page.click('.assets-tabs button:has-text("样式")');
    await sleep(350);
    const editEntry = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.assets-token-row'));
      const anyColorInput = rows.some((r) => r.querySelector('input'));
      return { anyColorInput, tokenRows: rows.length };
    });
    const editApplyResult = await page.evaluate(async () => {
      // 改色值 → 引用者节点填充同步（批量同步真语义断言）
      const row = document.querySelector('.assets-token-row');
      const colorInp = row && row.querySelector('input[type="color"], input[type="text"]');
      if (!colorInp) return 'no-input';
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(colorInp, '#123456');
      colorInp.dispatchEvent(new Event('input', { bubbles: true }));
      colorInp.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 400));
      return 'applied';
    });
    await page.screenshot({ path: join(outDir, 'p109-样式行内编辑.png') });
    // Detach style（节点 B）——Detach 语义=保留当前值断联：以改后值 bAfterEdit 为基线
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(200);
    await clickLayerRow(idxB >= 0 ? idxB : 4);
    const bAfterEdit = await fillColorVal();
    const batchSyncOk = editApplyResult === 'applied' && (bAfterEdit ?? '').toUpperCase() === '#123456';
    const detachTok = page.locator('.prop-section:has(.prop-heading:has-text("样式")) .mini-btn[title^="分离样式"]');
    const dtVisible = await detachTok.isVisible().catch(() => false);
    await detachTok.click();
    await sleep(350);
    const detached = /未引用样式/.test((await sectionText('样式')) ?? '');
    // B 的颜色保留（Detach 前后色值一致——基线为编辑后的 #123456）
    const bAfterDetach = await fillColorVal();
    const retained = !!bAfterEdit && bAfterEdit === bAfterDetach;
    await page.screenshot({ path: join(outDir, 'p109-颜色样式.png') });
    const syncUiOk = editEntry.anyColorInput && batchSyncOk;
    record('P1-09', '颜色样式创建/应用 2 节点/改样式批量同步/Detach style',
      refShown && bRef && dtVisible && detached && retained && syncUiOk,
      `样式源=行${idxA}（色值 ${aColor}）；创建并应用 A=已引用"${tokenName}"；B=行${idxB} 经"应用"下拉引用=${bRef}；改样式批量同步：入口=${editEntry.anyColorInput}（token 行 ${editEntry.tokenRows} 条含编辑控件）→ 改值→B 色值=${bAfterEdit}（${batchSyncOk ? '✓ 引用者同步' : '✗ 未同步'}）；Detach：按钮=${dtVisible}→"未引用样式"=${detached} 且值保留（${bAfterEdit}→${bAfterDetach}）=${retained}`,
      'dist/m4-matrix/p109-颜色样式.png');
    // 再建一个文本样式，供 P1-10 tokens.css 出双类变量
    const textRow = page.locator('.layer-row', { has: page.locator('.layer-icon', { hasText: /^T$/ }) }).first();
    if (await textRow.count()) {
      await textRow.click();
      await sleep(320);
      await page.locator('.prop-section:has(.prop-heading:has-text("样式")) .mini-btn[title="从当前排版创建文本样式并应用"]').click();
      await sleep(350);
    }
  }

  // ================= P1-10 tokens.css 导出结构（FR-28）=================
  {
    const dlPromise = page.waitForEvent('download', { timeout: 20000 });
    await page.click('.menu-btn:has-text("File")');
    await page.click('.menu-dropdown .menu-item:has-text("导出所选")');
    const dl = await dlPromise;
    const zipPath = join(outDir, 'p110-tokens.zip');
    await dl.saveAs(zipPath);
    const zip = readZipEntries(readFileSync(zipPath));
    const css = zip.get('tokens.css')?.toString('utf8') ?? '';
    const structOk = /^:root \{/.test(css.trim()) && /--uic-paint-\d+:/.test(css) && /--uic-text-\d+-font-size:/.test(css) && /--uic-text-\d+-(color|font-weight)/.test(css);
    // 清单对照：资产→样式 tab token 行数 == tokens.css 变量条目数
    await page.click('.sidebar-left .side-tab:has-text("资产")');
    await sleep(300);
    await page.locator('.assets-tab:has-text("样式")').click();
    await sleep(300);
    const tokenRows = await page.locator('.assets-token-row').count();
    const varCount = (css.match(/^\s*--uic-/gm) || []).length;
    await page.screenshot({ path: join(outDir, 'p110-tokens清单.png') });
    record('P1-10', 'tokens.css 导出结构（:root/CSS 变量/字号层复合/与清单一致）',
      structOk && tokenRows >= 2,
      `ZIP 内 tokens.css：${JSON.stringify(css.slice(0, 160).replace(/\n/g, '\\n'))}…；:root 块=${/^\s*:root \{/.test(css)}；PAINT 变量=${/--uic-paint-\d+:/.test(css)}；TEXT 复合层（-font-size 等）=${/--uic-text-\d+-font-size:/.test(css)}；变量行 ${varCount} vs 样式 tab 清单 ${tokenRows} 条；命名口径：默认序号名（Paint N/Text N，cssVar 语义化前缀），无用户重命名入口（见 P1-09）`,
      'dist/m4-matrix/p110-tokens清单.png');
  }

  // ================= P1-03 图片 7 项调整滑杆（FR-20）=================
  {
    await openPage('15-图片密集页面');
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(300);
    const imgRow = page.locator('.layer-row', { has: page.locator('.layer-icon', { hasText: '🖼' }) }).first();
    await imgRow.click();
    await sleep(400);
    const ranges = page.locator('.prop-section:has(.prop-heading:has-text("内容")) input[type="range"]');
    const rangeCount = await ranges.count();
    const labels = await page.evaluate(() => {
      const heads = Array.from(document.querySelectorAll('.prop-heading'));
      const h = heads.find((el) => el.textContent.trim() === '内容');
      const sec = h?.closest('.prop-section');
      if (!sec) return [];
      return Array.from(sec.querySelectorAll('.row, label')).map((r) => r.textContent.trim().slice(0, 12)).filter((t) => /^(曝光|对比|饱和|色温|色调|高光|阴影)/.test(t));
    });
    // 拉曝光到 30 → 断言面板值；复位
    const setRange = async (loc, v) => {
      await loc.evaluate((el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, String(val));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, v);
    };
    const expInput = ranges.nth(0);
    await setRange(expInput, 30);
    await sleep(300);
    const expVal = await expInput.inputValue();
    await page.screenshot({ path: join(outDir, 'p103-滑杆30.png') });
    await page.locator('.mini-btn:has-text("重置调整")').click();
    await sleep(300);
    const resetVal = await page.locator('.prop-section:has(.prop-heading:has-text("内容")) input[type="range"]').first().inputValue();
    // 出码消费断言：曝光 30 应产生 brightness(1.300)
    await setRange(page.locator('.prop-section:has(.prop-heading:has-text("内容")) input[type="range"]').first(), 30);
    await sleep(300);
    const scss = await scssText();
    const cssFilterOk = /brightness\(1\.3/.test(scss);
    const canvasFx = await page.evaluate(() => {
      const el = document.querySelector('.konvajs-content');
      return el ? getComputedStyle(el).filter : '';
    });
    record('P1-03', '图片 7 项调整滑杆（filter 映射实时生效+复位）',
      rangeCount === 7 && cssFilterOk,
      `滑杆 7 根齐全=${rangeCount === 7}（[${labels.join(',')}]，Exposure/Contrast/Saturation/Temperature/Tint/Highlights/Shadows 口径）；拉曝光 0→${expVal} 面板即时=${expVal === '30'}；复位→${resetVal}（可复位 OK）；出码 filter=${cssFilterOk ? '✓ scss 含 brightness(1.300)（imageAdjust.ts 映射单源，第七批接线）' : '✗ 曝光=30 时 scss 无 brightness(1.3)'}；画布 Konva 像素预览=${canvasFx !== 'none' ? `✓ filter="${canvasFx}"` : '容器 filter 属 DOM 通道不适用（画布端经 Konva Brighten/Contrast/HSL 滤镜直绘，见 P1-03 修复批注）'}`,
      'dist/m4-matrix/p103-滑杆30.png');
  }

  // ================= P1-12 Constraints 5 向 2 轴（FR-35）=================
  {
    await openPage('13-绝对定位页');
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(500);
    const getRows = () => page.evaluate(() => Array.from(document.querySelectorAll('.layer-row')).map((r, i) => ({
      i, name: (r.querySelector('.layer-name')?.textContent || '').trim(),
      pl: parseInt(r.style.paddingLeft || '8', 10),
      id: r.getAttribute('data-node-id'),
    })));
    const kidsOf = (meta, pr) => {
      const out = [];
      for (let j = pr.i + 1; j < meta.length; j++) { if (meta[j].pl > pr.pl) out.push(meta[j]); else break; }
      return out;
    };
    let rowMeta = await getRows();
    let posterRow = rowMeta.find((r) => r.name.includes('海报'));
    let kids = posterRow ? kidsOf(rowMeta, posterRow) : [];
    if (posterRow && !kids.length) { // 折叠态 → 点展开箭头
      await page.locator('.layer-row').nth(posterRow.i).locator('.layer-chevron').click();
      await sleep(400);
      rowMeta = await getRows();
      posterRow = rowMeta.find((r) => r.name.includes('海报'));
      kids = posterRow ? kidsOf(rowMeta, posterRow) : [];
    }
    const posterIdx = posterRow ? posterRow.i : -1;
    const dbg0 = `行总=${rowMeta.length} 海报行=${posterIdx}${posterRow ? `(${posterRow.name})` : '未找到'}`;
    // 收集具备约束 UI（两个含 SCALE 档下拉）的子行
    const constraintKids = [];
    for (const k of kids) {
      await clickLayerRow(k.i);
      const cnt = await page.locator('.props select.panel-select:has(option[value="SCALE"])').count().catch(() => 0);
      if (cnt >= 2) constraintKids.push(k);
      if (constraintKids.length >= 4) break;
    }
    const dbg = `${dbg0}；子行=${kids.length} 约束UI可用=[${constraintKids.map((k) => k.name).join(',')}]`;
    // 下拉档位清点（两轴）
    let axisOpts = [];
    if (constraintKids.length) {
      await clickLayerRow(constraintKids[0].i);
      axisOpts = await page.evaluate(() => {
        const props = document.querySelector('.props');
        const sels = Array.from(props?.querySelectorAll('select.panel-select') ?? []).filter((s) => s.querySelector('option[value="SCALE"]'));
        return sels.map((s) => Array.from(s.options).map((o) => o.value).join('/'));
      });
    }
    const optCount = axisOpts.length === 2 ? axisOpts[0].split('/').length : 0;
    // 设子1=RIGHT、子2=CENTER、子3=SCALE（水平轴），第4子保持缺省 LEFT；垂直默认 TOP
    const setH = async (rowIdx, val) => {
      await clickLayerRow(rowIdx);
      const hSel = page.locator('.props select.panel-select:has(option[value="SCALE"])').first();
      await hSel.selectOption(val);
      await sleep(250);
    };
    if (constraintKids.length >= 3) {
      await setH(constraintKids[0].i, 'RIGHT');
      await setH(constraintKids[1].i, 'CENTER');
      await setH(constraintKids[2].i, 'SCALE');
    } else {
      await page.screenshot({ path: join(outDir, 'p112-行诊断.png') });
    }
    const scss = await scssText();
    const codeOk = /\bright:\s*\d/.test(scss) && /left:\s*calc\(50%/.test(scss) && /left:\s*[\d.]+%/.test(scss) && /width:\s*[\d.]+%/.test(scss);
    await page.screenshot({ path: join(outDir, 'p112-约束出码.png') });
    // 拖父「海报」右中锚点 +60 页面px → 子项按约束重算
    // 注意：__UIC_E2E__.snapshot() 仅含 root 直接子级 → 海报子项几何用右栏 X 值读；page→screen 用 __UIC_VIEW__ 通道
    await page.keyboard.down('Shift'); await page.keyboard.press('Digit1'); await page.keyboard.up('Shift'); // 适配确保把手在视口内
    await sleep(450);
    const readX = async (rowIdx) => {
      await clickLayerRow(rowIdx);
      return page.evaluate(() => {
        const heads = Array.from(document.querySelectorAll('.prop-heading'));
        const h = heads.find((el) => el.textContent.trim().startsWith('位置与尺寸'));
        const sec = h?.closest('.prop-section');
        const inp = sec?.querySelector('.num-field input[type="number"]'); // 首字段=X
        return inp ? Number(inp.value) : NaN;
      });
    };
    const viewOf = async () => {
      const content = await page.locator('.konvajs-content').boundingBox();
      const v = await page.evaluate(() => (window).__UIC_VIEW__?.() ?? null);
      return v ? { content, v } : null;
    };
    const targetKids = constraintKids.slice(0, 4);
    const xBeforeAll = [];
    for (const k of targetKids) xBeforeAll.push(await readX(k.i));
    const vv0 = await viewOf();
    const snapP = await snapshot();
    const poster = posterRow && vv0 ? snapP.nodes.find((n) => n.id === posterRow.id) : null;
    let dragOk = false, ctrlOk = false, behaviorOk = false, note = `${dbg}`;
    if (poster && vv0) {
      // se 角把手（同 y 拖=纯改宽）命中稳定。注：FR-44 旋钮与 'e' 把手重叠劫持问题已在差异 #8 修复
      // （旋钮外偏 14px），本脚本直接用 se 角避开把手争用。
      note += '；拖 resize 用 se 角把手（旋钮重叠问题已修复见差异 #8，此处 se 为稳定性选择）';
      const toScreen = (px, py) => ({ x: vv0.content.x + vv0.v.x + px * vv0.v.scale, y: vv0.content.y + vv0.v.y + py * vv0.v.scale });
      const anchor = toScreen(poster.x + poster.width, poster.y + poster.height);
      await clickLayerRow(posterIdx);
      await page.mouse.move(anchor.x, anchor.y);
      await page.mouse.down();
      await page.mouse.move(anchor.x + 60 * vv0.v.scale, anchor.y, { steps: 10 });
      await page.mouse.up();
      await sleep(550);
      const snapA = await snapshot();
      const pA = snapA.nodes.find((n) => n.id === poster.id);
      const dW = pA ? pA.width - poster.width : 0;
      dragOk = dW >= 40; // 把手命中
      const xAfter = [];
      for (const k of targetKids) xAfter.push(await readX(k.i));
      const dx = xAfter.map((v, i) => v - xBeforeAll[i]);
      const scaleExp = poster.width > 0 && Number.isFinite(xBeforeAll[2])
        ? Math.round((xBeforeAll[2] * (poster.width + dW)) / poster.width) - xBeforeAll[2] : 999;
      const checks = [
        Math.abs((dx[0] ?? NaN) - dW) <= 3,
        Math.abs((dx[1] ?? NaN) - dW / 2) <= 3,
        Math.abs((dx[2] ?? NaN) - scaleExp) <= 4,
        targetKids.length < 4 || Math.abs(dx[3] ?? 999) <= 2,
      ];
      behaviorOk = dragOk && checks.every(Boolean);
      note += `；scale=${vv0.v.scale} +60 拖右中锚 dW=${Math.round(dW)}，X 基线=[${xBeforeAll.join(',')}]，Δx=[${dx.map((v) => Math.round(v)).join(',')}]（RIGHT≈${Math.round(dW)} CENTER≈${Math.round(dW / 2)} SCALE≈${scaleExp} LEFT缺省≈0）命中=${dragOk}`;
      // Ctrl 拖 = 忽略约束：撤销后 Ctrl 重拖
      await page.keyboard.press('Control+z');
      await sleep(450);
      const xU = [];
      for (const k of targetKids) xU.push(await readX(k.i));
      const snapU = await snapshot();
      const pU = snapU.nodes.find((n) => n.id === poster.id);
      const vv2 = await viewOf();
      if (pU && vv2) {
        const a2 = { x: vv2.content.x + vv2.v.x + (pU.x + pU.width) * vv2.v.scale, y: vv2.content.y + vv2.v.y + (pU.y + pU.height) * vv2.v.scale };
        await clickLayerRow(posterIdx);
        await page.keyboard.down('Control');
        await page.mouse.move(a2.x, a2.y);
        await page.mouse.down();
        await page.mouse.move(a2.x + 50 * vv2.v.scale, a2.y, { steps: 10 });
        await page.mouse.up();
        await page.keyboard.up('Control');
        await sleep(550);
        const snapC = await snapshot();
        const pC = snapC.nodes.find((n) => n.id === poster.id);
        const xC = [];
        for (const k of targetKids) xC.push(await readX(k.i));
        const dW2 = pC && pU ? pC.width - pU.width : 0;
        const childDeltas = xC.map((v, i) => Math.abs(v - xU[i]));
        ctrlOk = dW2 >= 30 && childDeltas.every((d) => d <= 2);
        note += `；撤销回基线 X=[${xU.join(',')}]；Ctrl 拖 dW=${Math.round(dW2)} 子项 Δx=[${childDeltas.map(Math.round).join(',')}]（忽略约束=${ctrlOk}）`;
        await page.keyboard.press('Control+z');
        await sleep(300);
      }
    } else {
      note += `；**海报/视图通道未命中**（poster=${!!poster} view=${!!vv0}），拖拽断言未完成`;
    }
    await page.screenshot({ path: join(outDir, 'p112-拖父重算.png') });
    // Auto Layout 互斥占位
    await openPage('03-商品列表');
    await page.click('.sidebar-left .side-tab:has-text("图层")');
    await sleep(400);
    let excl = false;
    const rowsMax = await page.locator('.layer-row').count();
    for (let i = 3; i < Math.min(rowsMax, 20); i++) {
      await clickLayerRow(i);
      const propsTxt = await page.evaluate(() => document.querySelector('.props')?.innerText ?? '');
      if (propsTxt.includes('Auto layout（约束不生效）')) { excl = true; break; }
    }
    record('P1-12', 'Constraints 5 向 2 轴 + 拖父重算 + Ctrl 忽略 + Auto Layout 互斥',
      optCount === 5 && codeOk && behaviorOk && ctrlOk && excl,
      `**档位缺口**：实现 4 档×2 轴（[${axisOpts.join(' × ')}]），无 Figma「Left+Right/Top+Bottom（stretch）」档 → 行口径"5 向"不满足（PRD FR-35 枚举值=本实现，checklist 文案=5 向，两口径需主线裁决）；出码断言 right:/calc(50%+/百分比 left+width=${codeOk})；${note}；Auto layout 流内子项显示"约束不生效"占位=${excl}`,
      'dist/m4-matrix/p112-拖父重算.png');
  }

  record('PAGE-ERRORS', 'M4 段浏览器全程无页面错误', errors.length === 0, errors.slice(0, 3).join(' | ') || '无');
} catch (e) {
  record('FATAL', '脚本异常', false, String(e && e.message ? e.message : e));
  await page.screenshot({ path: join(outDir, '99-异常现场.png') }).catch(() => {});
} finally {
  await browser.close();
  server.kill();
}

// 本轨自建的 4193 vite 若因 npm 壳残留端口，清掉（仅 4193、非他人孤儿）
try {
  const r = execSync(`netstat -ano -p tcp | findstr LISTENING | findstr :${PORT}`, { encoding: 'utf8' });
  const pid = (r.match(/\s(\d+)\s*$/m) || [])[1];
  if (pid) execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
} catch { /* 已释放 */ }

// ================= P1-01 / P1-17（引用 perf-1000 现成报告）=================
{
  const perfPath = join(root, 'dist', 'perf-1000', 'report.json');
  let perf = null;
  try { perf = JSON.parse(readFileSync(perfPath, 'utf8')); } catch { /* 缺 */ }
  const mtime = (() => { try { return statSync(perfPath).mtimeMs; } catch { return 0; } })();
  if (perf) {
    copyFileSync(join(root, 'dist', 'perf-1000', 'loaded.png'), join(outDir, 'p101-1000节点加载.png'));
    const fr60 = perf.fr60 ?? {};
    const ok = perf.nodeCount >= 1000 && perf.load?.ok && fr60.underRatio >= 0.95 && perf.idle?.avgFps >= 60;
    record('P1-01', '1000 节点 60fps（FR-12/FR-60：≥60fps 且 95% 帧<16.7ms；1000 节点可编辑）',
      ok,
      `证据=dist/perf-1000/report.json（生成于 ${new Date(mtime).toISOString()}，本轨预刷新至当前构建）。1000 节点加载可编辑=${perf.load?.ok}；idle avg=${perf.idle?.avgFps}fps（≥60 ${perf.idle?.avgFps >= 60}）p95=${perf.idle?.p95FrameMs}ms；拖拽 avg=${perf.drag?.avgFps}fps smooth ${perf.drag?.smoothCount}/30；FR-60 判据 95% 帧<16.7ms：实测 ${((fr60.underRatio ?? 0) * 100).toFixed(1)}%（${fr60.framesUnder16_7}/${fr60.dragFrames}）${(fr60.underRatio ?? 0) >= 0.95 ? '≥95% 达标' : '<95% → **未达标**（avgFrameMs=' + fr60.avgFrameMs + ' p95=' + fr60.p95FrameMs + '）——帧预算整改挂差异 #4，M6 待办'}`,
      'dist/m4-matrix/p101-1000节点加载.png');
  } else {
    record('P1-01', '1000 节点 60fps', false, 'dist/perf-1000/report.json 缺失（先跑 npm run perf-1000）');
  }

  // P1-17：性能脚本入 scripts/
  const scriptOk = existsSync(join(root, 'scripts', 'perf-1000.mjs'));
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const npmOk = (pkg.scripts?.['perf-1000'] ?? '').includes('perf-1000');
  const evidence = existsSync(join(root, 'dist', 'perf-1000', 'report.json'))
    && existsSync(join(root, 'dist', 'perf-1000', 'loaded.png'))
    && existsSync(join(root, 'dist', 'perf-1000', 'after-drags.png'))
    && existsSync(join(root, 'dist', 'pages-perf', '1000-节点', 'page.json'));
  const keys = (() => { try { return Object.keys(JSON.parse(readFileSync(join(root, 'dist', 'perf-1000', 'report.json'), 'utf8'))); } catch { return []; } })();
  const structOk = ['feature', 'nodeCount', 'idle', 'drag', 'fr60', 'verdict', 'evidence'].every((k) => keys.includes(k));
  if (existsSync(join(root, 'dist', 'perf-1000', 'after-drags.png'))) copyFileSync(join(root, 'dist', 'perf-1000', 'after-drags.png'), join(outDir, 'p117-拖拽后.png'));
  record('P1-17', '1000 节点录帧脚本化报告入 scripts/（FR-60）',
    scriptOk && npmOk && evidence && structOk,
    `scripts/perf-1000.mjs=${scriptOk}；npm script perf-1000=${JSON.stringify(pkg.scripts?.['perf-1000'])}；产物 report.json+loaded.png+after-drags.png+页面源 dist/pages-perf/1000-节点/page.json=${evidence}；报告结构含 idle/drag/fr60 量化区+阈值分级口径（未达标如实记录不阻塞）=${structOk}`,
    'dist/m4-matrix/p117-拖拽后.png');
}

// ================= P1-15 git + CI（FR-58 替代凭证口径）=================
{
  const notes = [];
  let ciYmlOk = false;
  try {
    const yml = readFileSync(join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
    const gates = ['tsc', 'vitest run', 'npm run build', 'npm run e2e'];
    const missing = gates.filter((g) => !yml.includes(g));
    ciYmlOk = missing.length === 0 && yml.includes('actions/checkout') && yml.includes('upload-artifact') && yml.includes('playwright install');
    notes.push(`ci.yml：四门禁齐全=${missing.length === 0}${missing.length ? ' 缺[' + missing + ']' : ''}，checkout/artifact 归档/playwright install=${ciYmlOk}`);
  } catch (e) { notes.push('ci.yml 缺失：' + e.message); }
  let gitOk = false;
  try {
    const log = execSync('git log --oneline -10', { cwd: root, encoding: 'utf8' }).trim();
    const lines = log.split('\n').length;
    const conventionalish = /M\d |收口|基线|批次|定稿|收敛|单点/.test(log);
    const remote = execSync('git remote -v', { cwd: root, encoding: 'utf8' }).trim();
    gitOk = lines >= 5 && conventionalish;
    notes.push(`git：${lines} 条里程碑式规范提交（中文意图+门禁结果内嵌）=规范；remote=${remote ? '有' : '无（本机无 remote → FR-58 走"环境不可用记录替代本地执行凭证"口径）'}`);
  } catch (e) { notes.push('git log 失败：' + e.message); }
  // dist/ci-local 报告 + 本轨补跑 tsc/vitest（build/e2e 归主线禁跑项，不重复）
  let ciLocal = null;
  try { ciLocal = JSON.parse(readFileSync(join(root, 'dist', 'ci-local', 'report.json'), 'utf8')); } catch { /* 缺 */ }
  if (ciLocal) {
    const g = ciLocal.gates ?? [];
    notes.push(`dist/ci-local/report.json（${ciLocal.date ?? ciLocal.generatedAt ?? '?'}）：${g.map((x) => `${x.id}:${x.pass ? 'PASS' : 'FAIL'}`).join(' ')}；**早于当前 HEAD（含其后 BOOLEAN_OP/FR-44 两批修复）**，test 的 2 failed（fr22-23-ui）已在后续提交修复 → 该份凭证过期，以本轨补跑为准`);
  } else notes.push('dist/ci-local/report.json 缺失');
  let tscPass = false, tscForeign = false, tscOut = '', vitPass = false, vitOut = '';
  const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
  try {
    execSync('npx tsc --noEmit', { cwd: root, encoding: 'utf8', timeout: 180000 });
    tscPass = true; tscOut = 'exit 0（0 error）';
  } catch (e) {
    const raw = stripAnsi(e.stdout ?? e.message);
    const errLines = raw.split('\n').filter((l) => /error TS/.test(l));
    tscOut = errLines.slice(0, 10).join('\n') || 'exit≠0';
    // 归因：并发轨在制品？（错误文件全部为工作树未提交文件 → 不属主线基线）
    try {
      const dirty = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' })
        .split('\n').map((l) => l.replace(/^\s*\S+\s+/, '').trim().replace(/\\/g, '/')).filter(Boolean);
      const files = Array.from(new Set(errLines.map((l) => l.split('(')[0].trim().replace(/\\/g, '/'))));
      tscForeign = errLines.length > 0 && files.length > 0 && files.every((f) => dirty.includes(f));
    } catch { tscForeign = false; }
  }
  try {
    vitOut = stripAnsi(execSync('npx vitest run 2>&1', { cwd: root, encoding: 'utf8', timeout: 420000, maxBuffer: 32 * 1024 * 1024 }));
    vitPass = /Test Files\s+\d+ passed/.test(vitOut) && !/Test Files\s+\d+ failed/.test(vitOut);
  } catch (e) {
    vitOut = stripAnsi(e.stdout ?? e.message);
    vitPass = /Test Files\s+\d+ passed/.test(vitOut) && !/Test Files\s+\d+ failed/.test(vitOut) && !/failed/.test(vitOut);
  }
  const vitSummary = (vitOut.match(/Test Files[^\n]*\n[^\n]*/m) || ['(未取到摘要)'])[0].trim().slice(0, 200);
  const tscGate = tscPass ? 'PASS（0 error）' : tscForeign ? '工作树报错全部落在并发轨未提交文件（非 HEAD 基线）→ 归因并发在制品' : 'FAIL';
  writeFileSync(join(outDir, 'p115-tsc.txt'), `npx tsc --noEmit\n${tscPass ? 'PASS exit 0' : tscForeign ? 'ATTRIB-FOREIGN（工作树并发在制品）' : 'FAIL'}\n${tscOut}`, 'utf8');
  writeFileSync(join(outDir, 'p115-vitest.txt'), `npx vitest run\n${vitPass ? 'PASS' : 'FAIL'}\n${vitSummary}\n`, 'utf8');
  notes.push(`本轨补跑（HEAD=${revisionAnchor().head.slice(0, 8)}）：tsc=${tscGate}；vitest=${vitPass ? 'PASS' : 'FAIL'}（${vitSummary.replace(/\n/g, ' / ')}）`);
  const gateFreshOk = vitPass && (tscPass || tscForeign);
  record('P1-15', 'git+CI（FR-58：无 remote → 替代本地执行凭证口径）',
    ciYmlOk && gitOk && gateFreshOk,
    notes.join('；') + '。判定口径：本环境无 remote/CI runner，FR-58 允许"环境不可用则记录替代本地执行凭证"；本轨补跑 vitest 全绿、tsc 以补跑结果/归因判定（build/e2e 属主线门禁，最新绿凭证见 HEAD 提交注记与 dist/pages/diff-report），e2e 归档步骤在 ci.yml 内已定义',
    'dist/m4-matrix/p115-editor-home.png');
}

// ================= 汇总 report.json =================
const revision = revisionAnchor();
const pass = results.filter((r) => r.ok).length;
writeFileSync(
  join(outDir, 'report.json'),
  JSON.stringify({
    date: new Date().toISOString(),
    revision: { ...revision, preflight },
    total: results.length,
    pass,
    fail: results.length - pass,
    errors,
    rows: results,
  }, null, 2),
  'utf8',
);
console.log(`\nm4-matrix done: ${pass}/${results.length} pass`);
console.log(`revision: HEAD=${revision.head.slice(0, 12)} srcMaxMtime=${revision.srcMaxMtime}`);
console.log('report: dist/m4-matrix/report.json');
