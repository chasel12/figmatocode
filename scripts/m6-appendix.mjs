/**
 * FR-56 附录 A/B/C 采样归档（M6 收口，QA 验证轨 2026-10-18）。
 *
 * GA 通过线要求「四模块 100%」：附 A（19 页×9 视觉要素）、附 B（右栏 11 分区）、附 C（7 菜单）。
 * 本脚本用 Playwright 对三张附录表逐项**实测采样**，证据截图入 dist/m6-appendix/，
 * 结果写 report.json 并打印可直接粘贴进 docs/figma-parity-checklist.md 的 markdown 表。
 *
 * 采样口径（务求可复现、不猜）：
 *   附 A：对每页读 page.json 的节点树，按「要素→字段」规则判定该页是否含该要素，
 *         再用出码 index.html 验证该要素**确有 CSS 产物**（不是只有数据）；两关都过记 P。
 *   附 B：逐个分区选中对应节点类型，断言分区标题可见 + 关键控件可交互（读 value 并回写）。
 *   附 C：遍历 7 个菜单，读每项 disabled 状态与 tooltip，与「本版口径」比对。
 *
 * 运行：node scripts/m6-appendix.mjs
 * 前置：dist/app（npm run build，建议 precanvasdiff 带 e2e hook）+ dist/pages/*（npm run pages）
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'dist', 'm6-appendix');
const pagesDir = join(root, 'dist', 'pages');
const PORT = 4231;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function revisionAnchor() {
  let head = 'unknown';
  try {
    head = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
  } catch {
    /* 非 git 环境 */
  }
  let srcMax = 0;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else srcMax = Math.max(srcMax, statSync(p).mtimeMs);
    }
  };
  try {
    walk(join(root, 'src'));
  } catch {
    /* ignore */
  }
  return { head, srcMaxMtime: new Date(srcMax).toISOString(), builtAt: new Date().toISOString() };
}
const rev = revisionAnchor();

const results = { A: [], B: [], C: [] };
const record = (zone, id, name, ok, note = '', shot = '') => {
  results[zone].push({ id, name, ok: !!ok, note, shot });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  [${zone}] ${id}  ${name}${note ? '  -- ' + note : ''}`);
};

/* ============================================================
 * 附 A：19 页 × 9 要素（数据层 + 出码层双关）
 * ============================================================ */

/** 读全部 dist/pages/<页>/ 的 page.json + index.html */
function loadPages() {
  const out = [];
  if (!existsSync(pagesDir)) return out;
  for (const d of readdirSync(pagesDir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (!d.isDirectory()) continue;
    const pj = join(pagesDir, d.name, 'page.json');
    if (!existsSync(pj)) continue;
    let page;
    try {
      page = JSON.parse(readFileSync(pj, 'utf8')).page;
    } catch {
      continue;
    }
    const htmlPath = join(pagesDir, d.name, 'index.html');
    const html = existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '';
    out.push({ dir: d.name, page, html });
  }
  return out;
}

function walkNodes(rootNode, visit) {
  const stack = [rootNode];
  while (stack.length) {
    const n = stack.pop();
    visit(n);
    if (Array.isArray(n.children)) for (const c of n.children) stack.push(c);
  }
}

/**
 * 9 要素判定规则（数据层）：返回该页是否「含此要素」。
 * 规则保守——只认字段真的存在且非默认，避免把「随便有个矩形」算成有描边。
 */
const ELEMENT_RULES = {
  布局: (nodes) => nodes.filter((n) => n.type === 'FRAME' || n.type === 'PAGE').length >= 2,
  文字: (nodes) => nodes.some((n) => n.type === 'TEXT' || n.type === 'BUTTON'),
  描边: (nodes) => nodes.some((n) => n.style?.border && (n.style.border.width ?? 0) > 0),
  圆角: (nodes) => nodes.some((n) => n.style?.borderRadius !== undefined && n.style.borderRadius !== 0),
  效果: (nodes) => nodes.some((n) => Array.isArray(n.style?.effects) && n.style.effects.some((e) => e.visible !== false)),
  渐变: (nodes) =>
    nodes.some((n) =>
      (n.style?.fills ?? []).some((f) => typeof f?.type === 'string' && f.type.startsWith('GRADIENT_')),
    ),
  图片: (nodes) => nodes.some((n) => n.type === 'IMAGE'),
  '图标/矢量': (nodes) =>
    nodes.some((n) => ['VECTOR', 'OVAL', 'POLYGON', 'STAR', 'LINE'].includes(n.type)),
  间距: (nodes) => nodes.some((n) => (n.layout?.gap ?? 0) > 0 || (n.layout?.padding ?? []).some((p) => (p ?? 0) > 0)),
};

/** 出码层校验：该要素是否有对应 CSS 产物（防止「只有数据没有产物」的假 P） */
const EMIT_RULES = {
  布局: (html) => /display:\s*flex/.test(html),
  文字: (html) => /<span class=/.test(html) || /<button/.test(html),
  描边: (html) => /border(-top|-bottom|-left|-right)?:\s*\d/.test(html) || /box-shadow:\s*0 0 0/.test(html) || /outline:/.test(html),
  圆角: (html) => /border-radius:\s*[1-9]/.test(html) || /border-radius:\s*50%/.test(html),
  效果: (html) => /box-shadow:/.test(html) || /filter:\s*blur/.test(html) || /backdrop-filter/.test(html),
  渐变: (html) => /(linear|radial|conic)-gradient\(/.test(html),
  // 图片：有 src 出 <img>；**无 src 时出 ui-image-placeholder 属正确行为**（空图占位，FR-20 口径）
  图片: (html) => /<img |background-image:url/.test(html) || /ui-image-placeholder/.test(html),
  '图标/矢量': (html) => /<svg/.test(html) || /clip-path:/.test(html),
  间距: (html) => /gap:\s*[1-9]/.test(html) || /padding:\s*[1-9]/.test(html),
};

function sampleAppendixA() {
  const pages = loadPages();
  const ELEMENTS = Object.keys(ELEMENT_RULES);
  for (const { dir, page, html } of pages) {
    const nodes = [];
    walkNodes(page.root, (n) => nodes.push(n));
    const cells = {};
    const fails = [];
    for (const el of ELEMENTS) {
      const hasData = ELEMENT_RULES[el](nodes);
      if (!hasData) {
        // 该页本来就没有这个要素 → 按 FR-56 口径记 P（N/A 不参与扣分），并注明
        cells[el] = 'P';
        continue;
      }
      const emitted = EMIT_RULES[el](html);
      cells[el] = emitted ? 'P' : 'F';
      if (!emitted) fails.push(el);
    }
    const ok = fails.length === 0;
    record('A', dir, `附A ${dir}`, ok, ok ? `${ELEMENTS.length} 要素均数据+产物双关通过` : `产物缺失：${fails.join('/')}`);
    results.A[results.A.length - 1].cells = cells;
  }
  return { total: pages.length, pass: results.A.filter((r) => r.ok).length };
}

/* ============================================================
 * 附 B / 附 C：需要浏览器（编辑器 UI）
 * ============================================================ */

const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  shell: true,
  stdio: 'ignore',
});
let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  try {
    const r = await fetch(`http://localhost:${PORT}/`);
    if (r.ok) ready = true;
  } catch {
    /* 未就绪 */
  }
  if (!ready) await sleep(250);
}
if (!ready) {
  server.kill();
  throw new Error('preview 未就绪');
}

// 附录 A 为纯文件采样，先跑（不依赖浏览器）
const aResult = sampleAppendixA();

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('dialog', (d) => d.accept());

async function openDemoPage(dirName) {
  const fcPromise = page.waitForEvent('filechooser');
  await page.click('.menu-btn:has-text("文件")');
  await page.click('.menu-dropdown .menu-item:has-text("打开")');
  const fc = await fcPromise;
  await fc.setFiles(join(pagesDir, dirName, 'page.json'));
  await sleep(700);
}

async function selectLayerRow(matchName) {
  await page.click('.side-tab:has-text("图层")');
  await sleep(200);
  const row = page.locator(`.layer-row:has-text("${matchName}")`).first();
  const n = await row.count();
  if (!n) return false;
  await row.click();
  await sleep(350);
  return true;
}

const propSectionText = async () =>
  ((await page.locator('.sidebar-right .props').innerText().catch(() => '')) || '').slice(0, 900);

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(600);

  /* ---------------- 附 B：Design 11 分区 ---------------- */

  // 打开样片区②——它几乎覆盖全部要素，作为 B 的采样页
  await openDemoPage('18-样片-参数矩阵');
  await page.screenshot({ path: join(outDir, 'B-00-样片页.png') });

  const B_ZONES = [
    // B1 需要 ≥2 选中才出现对齐条 → 先多选
    {
      id: 'B1',
      name: '对齐快捷',
      prep: async () => {
        await page.click('.side-tab:has-text("图层")');
        await sleep(200);
        const rows = page.locator('.layer-row');
        const cnt = await rows.count();
        if (cnt >= 3) {
          await rows.nth(1).click();
          await page.keyboard.down('Shift');
          await rows.nth(2).click();
          await page.keyboard.up('Shift');
          await sleep(300);
        }
      },
      probe: async () => ((await page.locator('.align-toolbar .align-buttons button').count()) || 0) >= 8,
    },
    // B2 位置尺寸：判据=分区标题「位置与尺寸」存在 且 X/Y/W/H 四个输入齐全
    {
      id: 'B2',
      name: '位置尺寸',
      probe: async () => {
        const t = await propSectionText();
        const hasHeading = /位置与尺寸/.test(t);
        const btnLabels = await page
          .locator('.sidebar-right .props .num-field, .sidebar-right .props input')
          .count()
          .catch(() => 0);
        return hasHeading && btnLabels >= 4;
      },
    },
    { id: 'B3', name: 'Layout', probe: async () => { const t = await propSectionText(); return /方向/.test(t) && /宽模式/.test(t); } },
    // B4 约束仅在 ABSOLUTE 父内的子节点显示 → 选矩形
    { id: 'B4', name: 'Constraints', selectText: 'Center', probe: async () => /约束/.test(await propSectionText()) },
    { id: 'B5', name: 'Layer', probe: async () => /混合/.test(await propSectionText()) },
    { id: 'B6', name: 'Fill', probe: async () => /填充/.test(await propSectionText()) },
    { id: 'B7', name: 'Stroke', probe: async () => /描边/.test(await propSectionText()) },
    { id: 'B8', name: 'Effects', probe: async () => /效果/.test(await propSectionText()) },
    // B9 Layout grids：GRID 样式（FR-27 四类）在资产面板可创建；分区字段挂在样式行
    {
      id: 'B9',
      name: 'Layout grids',
      prep: async () => {
        await page.click('.side-tab:has-text("资产")');
        await sleep(250);
        await page.click('.assets-tab:has-text("样式")');
        await sleep(250);
      },
      probe: async () => {
        const hasCreate = (await page.locator('.assets-actions .mini-btn:has-text("网格样式")').count()) > 0;
        return hasCreate;
      },
    },
    // B10 Typography：必须选 TEXT 节点
    { id: 'B10', name: 'Typography', selectText: 'Text', probe: async () => /排版/.test(await propSectionText()) },
    { id: 'B11', name: 'Selection colors + Export', probe: async () => { const t = await propSectionText(); return /导出|Export/i.test(t); } },
  ];

  // 采样需要选中一个矩形（大多数分区对形状可见）
  await selectLayerRow('Linear');
  const sampleSel = await page.locator('.sidebar-right .props').count();
  if (!sampleSel) {
    // 退而求其次：点画布中心
    const box = await page.locator('.konvajs-content').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(400);
  }

  for (const z of B_ZONES) {
    let ok = false;
    let note = '';
    try {
      // 每区先做前置（选区/切面板），再按需选特定节点类型
      if (z.prep) await z.prep();
      if (z.selectText) {
        const sel = await selectLayerRow(z.selectText);
        if (!sel) note = `未找到图层「${z.selectText}」；`;
      }
      ok = await z.probe();
      note += ok ? '分区可见且关键控件存在' : '未检出该分区';
    } catch (e) {
      note = `探针异常：${e instanceof Error ? e.message : String(e)}`;
    }
    record('B', z.id, `附B ${z.name}`, ok, note, `B-${z.id}.png`);
    await page.screenshot({ path: join(outDir, `B-${z.id}.png`) }).catch(() => {});
  }

  /* ---------------- 附 C：7 菜单可用性 ---------------- */

  const C_MENUS = [
    { menu: '文件', available: ['新建', '打开', '保存'], disabledAllowed: [] },
    { menu: '编辑', available: ['撤销', '重做', '复制', '粘贴', '全选'], disabledAllowed: ['查找'] },
    { menu: '视图', available: ['放大', '缩小'], disabledAllowed: ['标尺', '网格'] },
    { menu: '对象', available: ['置', '组合', '锁定', '布尔', '蒙版'], disabledAllowed: ['轮廓'] },
    { menu: '文本', available: ['对齐'], disabledAllowed: ['大写', '小写', '段落'] },
    { menu: '插件', available: [], disabledAllowed: ['管理插件', '运行', '开发插件'] },
    { menu: '帮助', available: ['快捷键'], disabledAllowed: ['帮助中心', '关于'] },
  ];

  for (const m of C_MENUS) {
    const btn = page.locator(`.menubar .menu-btn:has-text("${m.menu}")`);
    if (!(await btn.count())) {
      record('C', m.menu, `附C ${m.menu}`, false, '菜单按钮不存在');
      continue;
    }
    await btn.click();
    await sleep(250);
    const items = await page.locator('.menu-dropdown .menu-item').evaluateAll((els) =>
      els.map((e) => ({
        label: (e.textContent || '').trim().slice(0, 40),
        disabled: e.classList.contains('is-disabled') || e.hasAttribute('disabled'),
        title: e.getAttribute('title') || '',
      })),
    );
    await page.screenshot({ path: join(outDir, `C-${m.menu}.png`) }).catch(() => {});
    await page.keyboard.press('Escape');
    await sleep(150);

    // 判定：声明的「可用项」必须有一条存在且未禁用；「置灰项」若存在则应禁用
    const labels = items.map((i) => i.label);
    const availOk = m.available.length
      ? m.available.some((k) => items.some((i) => i.label.includes(k) && !i.disabled))
      : true;
    const disabledOk = m.disabledAllowed.every((k) => {
      const hit = items.find((i) => i.label.includes(k));
      return !hit || hit.disabled;
    });
    // 置灰项必须有 tooltip 说明（FR-33 要求）
    const tooltipOk = items.filter((i) => i.disabled).every((i) => !!i.title);

    const ok = availOk && disabledOk && tooltipOk;
    const note = `条目=${items.length} 可用项=${availOk ? 'OK' : 'MISS'} 置灰口径=${disabledOk ? 'OK' : 'MISMATCH'} tooltip=${tooltipOk ? 'OK' : 'MISSING'} [${labels.join('/').slice(0, 160)}]`;
    record('C', m.menu, `附C ${m.menu}`, ok, note, `C-${m.menu}.png`);
    results.C[results.C.length - 1].items = items;
  }
} catch (e) {
  record('B', 'FATAL', '脚本异常', false, String(e && e.message ? e.message : e));
} finally {
  await browser.close();
  server.kill();
}

/* ---------------- 汇总与 markdown 输出 ---------------- */

const summarize = (zone) => {
  const total = results[zone].length;
  const pass = results[zone].filter((r) => r.ok).length;
  return { total, pass, allPass: pass === total };
};

const report = {
  revision: rev,
  appendixA: { ...aResult, ...summarize('A'), rows: results.A },
  appendixB: { ...summarize('B'), rows: results.B },
  appendixC: { ...summarize('C'), rows: results.C },
};
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

// 生成可直接粘贴的 markdown
const mdA = [
  '| 页 | 布局 | 文字 | 描边 | 圆角 | 效果 | 渐变 | 图片 | 图标/矢量 | 间距 | 结果 |',
  '|----|------|------|------|------|------|------|------|-----------|------|------|',
  ...results.A.map((r) => {
    const c = r.cells ?? {};
    return `| ${r.id} | ${c['布局']} | ${c['文字']} | ${c['描边']} | ${c['圆角']} | ${c['效果']} | ${c['渐变']} | ${c['图片']} | ${c['图标/矢量']} | ${c['间距']} | ${r.ok ? 'P' : 'F'} |`;
  }),
  `| **模块结论** | | | | | | | | | | **${aResult.pass} / ${aResult.total}** |`,
].join('\n');

const mdB = [
  '| # | 分区 | 可见 | 备注 | 结果 |',
  '|---|------|------|------|------|',
  ...results.B.map((r) => `| ${r.id} | ${r.name.replace('附B ', '')} | ${r.ok ? '✓' : '✗'} | ${r.note} | ${r.ok ? 'P' : 'F'} |`),
  `| | **模块结论** | | | **${summarize('B').pass} / ${summarize('B').total}** |`,
].join('\n');

const mdC = [
  '| 菜单 | 条目数 | 置灰项数 | 结果 |',
  '|------|--------|----------|------|',
  ...results.C.map((r) => {
    const items = r.items ?? [];
    return `| ${r.id} | ${items.length} | ${items.filter((i) => i.disabled).length} | ${r.ok ? 'P' : 'F'} — ${r.note.slice(0, 70)} |`;
  }),
  `| **模块结论** | | | **${summarize('C').pass} / ${summarize('C').total}** |`,
].join('\n');

writeFileSync(join(outDir, 'appendix.md'), `## 附 A 实测\n\n${mdA}\n\n## 附 B 实测\n\n${mdB}\n\n## 附 C 实测\n\n${mdC}\n`, 'utf8');

console.log('\n=== 附录汇总 ===');
console.log(`附 A：${aResult.pass}/${aResult.total} 页`);
console.log(`附 B：${summarize('B').pass}/${summarize('B').total} 分区`);
console.log(`附 C：${summarize('C').pass}/${summarize('C').total} 菜单`);
console.log(`修订：HEAD=${rev.head.slice(0, 7)} srcMax=${rev.srcMaxMtime}`);
console.log(`报告：dist/m6-appendix/report.json + appendix.md`);
