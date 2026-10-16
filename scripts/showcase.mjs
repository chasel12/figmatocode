import { chromium } from 'playwright';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * FR-57 样片管线（Wave1 轨道I / M6 基建）：
 * 对 dist/pages 16 页逐页产出「样片」对照卡：
 *   1) Playwright 300×650 视口截 render 侧全页（index.html）；
 *   2) reference.png / render.png 横向拼接成对照卡（pngjs，node canvas 不可用环境）；
 *   3) 逐页重跑 pixelmatch 得 similarity（阈值 0.99 仅报告分级，不作为通过线）。
 * 输出：dist/showcase/<页>/card.png 与 dist/showcase/report.json。
 * 启动模式抄 scripts/screenshot.mjs（本地 HTTP + fonts.ready），pad 对齐抄 scripts/diff.mjs。
 *
 * M6 补强（FR-57「含五区且像素报告入档」）：对照卡只是「验证区」素材，
 * 五区（①组件种类陈列 ②参数矩阵 ③多 Page ④原型跳转 ⑤验证）需逐区**可核查**。
 * 本脚本在卡生成后追加 `auditZones()`：从 dist/pages 的 page.json 实测统计五区覆盖，
 * 缺失项如实 FAIL 并写入 report.json 的 zones（含建议补齐位置）。
 * 说明：样片页面本身定义在 src/demo/（本轨道只读），故此处**只审计、不造页**。
 */

const root = process.cwd();
const pagesDir = join(root, 'dist', 'pages');
const outDir = join(root, 'dist', 'showcase');
const VIEW_W = Number(process.env.SHOWCASE_WIDTH || 300);
const VIEW_H = Number(process.env.SHOT_HEIGHT || 650);
const SIM_THRESHOLD = Number(process.env.SHOWCASE_THRESHOLD || 0.99);
const PER_PIXEL_THRESHOLD = Number(process.env.DIFF_THRESHOLD || 0.1);
const GAP = 8; // 对照卡两图间距（白）

// ---- 静态服务器（与 screenshot.mjs 同款；file:// 下 /fonts/ 会 404，Inter 无法加载） ----
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(root, 'dist', p);
    if (!file.startsWith(join(root, 'dist'))) {
      res.writeHead(403).end();
      return;
    }
    const data = await readFile(file);
    const ext = file.slice(file.lastIndexOf('.'));
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

// ---- 尺寸对齐（抄 diff.mjs pad：白底补齐到同宽同高） ----
function pad(png, w, h) {
  if (png.width === w && png.height === h) return png.data;
  const out = Buffer.alloc(w * h * 4, 255);
  for (let y = 0; y < Math.min(png.height, h); y += 1) {
    for (let x = 0; x < Math.min(png.width, w); x += 1) {
      const si = (y * png.width + x) * 4;
      const di = (y * w + x) * 4;
      png.data.copy(out, di, si, si + 4);
    }
  }
  return out;
}

const dirs = readdirSync(pagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: VIEW_W, height: VIEW_H },
  deviceScaleFactor: 1,
});

async function shot(path, out) {
  const page = await context.newPage();
  await page.goto(`${base}${path}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(80);
  await page.screenshot({ path: out, fullPage: true });
  await page.close();
}

const rows = [];
for (const name of dirs) {
  const dir = join(pagesDir, name);
  const cardDir = join(outDir, name);
  mkdirSync(cardDir, { recursive: true });

  // 1) 300×650 视口截 render 侧全页
  const renderShotPath = join(cardDir, 'render-300.png');
  await shot(`/pages/${name}/index.html`, renderShotPath);
  const render300 = PNG.sync.read(readFileSync(renderShotPath));

  // 2) reference / render 并排对照卡（pngjs 横向拼接，底部留白不写文字）
  const ref = PNG.sync.read(readFileSync(join(dir, 'reference.png')));
  const ren = PNG.sync.read(readFileSync(join(dir, 'render.png')));

  // 3) 逐页 similarity：重跑 pixelmatch（与 diff.mjs 同法：pad 对齐后逐像素比对）
  const w = Math.max(ref.width, ren.width);
  const h = Math.max(ref.height, ren.height);
  const a = pad(ref, w, h);
  const b = pad(ren, w, h);
  const diffPng = new PNG({ width: w, height: h });
  const diffPixels = pixelmatch(a, b, diffPng.data, w, h, { threshold: PER_PIXEL_THRESHOLD });
  const total = w * h;
  const similarity = Number((1 - diffPixels / total).toFixed(4));
  const grade = similarity >= SIM_THRESHOLD ? 'A' : similarity >= 0.95 ? 'B' : 'C';

  // 拼接：两图按各自高度取最大，间距 GAP，白底；步进逐行拷贝（宽高不一亦成立）
  const cardH = Math.max(ref.height, ren.height);
  const cardW = ref.width + GAP + ren.width;
  const card = new PNG({ width: cardW, height: cardH });
  card.data.fill(255);
  const blit = (src, dx) => {
    for (let y = 0; y < src.height; y += 1) {
      const si = (y * src.width) * 4;
      const di = (y * cardW + dx) * 4;
      src.data.copy(card.data, di, si, si + src.width * 4);
    }
  };
  blit(ref, 0);
  blit(ren, ref.width + GAP);
  writeFileSync(join(cardDir, 'card.png'), PNG.sync.write(card));

  rows.push({
    id: name,
    similarity,
    diffPixels,
    grade,
    pass: similarity >= SIM_THRESHOLD,
    viewport: { width: VIEW_W, height: VIEW_H },
    render300Height: render300.height,
    cardWidth: cardW,
    cardHeight: cardH,
  });
  console.log(`${grade}  ${name}  similarity=${(similarity * 100).toFixed(2)}%  card=${cardW}x${cardH}`);
}

await browser.close();
server.close();

const report = {
  target: SIM_THRESHOLD,
  note: '阈值 0.99 仅报告分级（A≥0.99 / B≥0.95 / C<0.95），非通过线（FR-57 样片只作展示基线）',
  perPixelThreshold: PER_PIXEL_THRESHOLD,
  viewport: { width: VIEW_W, height: VIEW_H },
  total: rows.length,
  pass: rows.filter((r) => r.pass).length,
  grades: {
    A: rows.filter((r) => r.grade === 'A').length,
    B: rows.filter((r) => r.grade === 'B').length,
    C: rows.filter((r) => r.grade === 'C').length,
  },
  avgSimilarity: rows.length ? Number((rows.reduce((s, r) => s + r.similarity, 0) / rows.length).toFixed(4)) : 0,
  pages: rows,
};

/* ============================================================
 * FR-57 五区审计（M6 补强）
 *
 * PRD FR-57 要求样片「含五区」：
 *   ① 组件种类陈列区：16 类图层每类 ≥1 示例（Section/组件实例/变体/布尔/钢笔/Slice）
 *   ② 参数矩阵区：四角圆角/stroke 三对齐/8 类效果/4 型渐变/blend/约束 5 档/AutoLayout 8 组合/文本排版
 *   ③ 多 Page 设计：≥3 Page，各自 Frame 布局完整
 *   ④ 原型跳转：≥5 类交互 + ≥3 Flow + 演示模式走通
 *   ⑤ 验证：初始态出码 vs reference ≥99%、画布 vs 出码 ≥95%，截图与 diff 报告入 dist/showcase/
 *
 * 本区为**实测审计**：直接读 dist/pages/&lt;页&gt;/page.json 里真实的节点字段统计覆盖度，
 * 不做任何猜测；缺失即 FAIL，并给出「在哪补」的建议（样片内容定义在 src/demo/，本轨道只读）。
 * ============================================================ */

/** 遍历 page.json 的节点树 */
function walkNodes(root, visit) {
  const stack = [root];
  while (stack.length) {
    const n = stack.pop();
    visit(n);
    if (Array.isArray(n.children)) for (const c of n.children) stack.push(c);
  }
}

/** 读全部 dist/pages/<页>/page.json，返回 {页名 → UIPage} */
function loadPages() {
  const out = [];
  if (!existsSync(pagesDir)) return out;
  for (const d of readdirSync(pagesDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const pj = join(pagesDir, d.name, 'page.json');
    if (!existsSync(pj)) continue;
    try {
      out.push({ dir: d.name, page: JSON.parse(readFileSync(pj, 'utf8')).page });
    } catch {
      /* 跳过非法 page.json（assert-pages 另有职责） */
    }
  }
  return out;
}

function auditZones() {
  const loaded = loadPages();
  const kinds = new Map(); // kind → 出现页数
  const effects = new Set();
  const gradients = new Set();
  const blendModes = new Set();
  const strokes = new Set();
  const constraints = new Set();
  const textFeatures = new Set();
  const interactions = [];
  const flows = [];
  const components = [];
  const tokens = [];
  let autolayoutCombos = new Set();
  let radiusNodes = 0;
  let vectorNodes = 0;
  let sliceNodes = 0;
  let sectionNodes = 0;

  for (const { page } of loaded) {
    const seen = new Set();
    walkNodes(page.root, (n) => {
      seen.add(n.type);
      if (n.type === 'VECTOR') vectorNodes += 1;
      if (n.type === 'SLICE') sliceNodes += 1;
      if (n.type === 'SECTION') sectionNodes += 1;
      const st = n.style ?? {};
      if (st.borderRadius !== undefined) radiusNodes += 1;
      for (const e of st.effects ?? []) if (e.visible !== false) effects.add(e.kind);
      // FR-17 多层填充：type 取 FillKind（SOLID / GRADIENT_LINEAR / GRADIENT_RADIAL / GRADIENT_ANGULAR / GRADIENT_DIAMOND）
      for (const f of st.fills ?? []) {
        if (f && typeof f.type === 'string' && f.type.startsWith('GRADIENT_')) {
          gradients.add(f.type.replace('GRADIENT_', ''));
        }
      }
      if (typeof st.blendMode === 'string' && st.blendMode !== 'NORMAL') blendModes.add(st.blendMode);
      // FR-18 stroke 三对齐：border.align（缺省 CENTER）
      if (st.border) strokes.add(st.border.align ?? 'CENTER');
      if (n.constraints) for (const k of Object.keys(n.constraints)) constraints.add(k);
      if (typeof st.textCase === 'string' && st.textCase !== 'ORIGINAL') textFeatures.add(`case:${st.textCase}`);
      if (st.textTruncation === 'ENDING') textFeatures.add('truncate');
      if (st.textAlign === 'justify') textFeatures.add('justify');
      const lay = n.layout ?? {};
      if (lay.mode === 'HORIZONTAL' || lay.mode === 'VERTICAL') {
        autolayoutCombos.add(`${lay.mode}/${lay.wrap ? 'wrap' : 'nowrap'}/${lay.align ?? '-'}/${lay.justify ?? '-'}`);
      }
      if (Array.isArray(n.interactions) && n.interactions.length) {
        for (const it of n.interactions) interactions.push({ page: page.name, trigger: it.trigger, action: it.action });
      }
    });
    for (const k of seen) kinds.set(k, (kinds.get(k) ?? 0) + 1);
    for (const f of page.flows ?? []) flows.push(f);
    for (const c of page.components ?? []) components.push(c);
    for (const t of page.tokens ?? []) tokens.push(t);
  }

  /* --- 16 类图层：PRD 口径的 16 类（NodeKind 13 类 + 组件/实例/变体分组） --- */
  const REQUIRED_KINDS = [
    'FRAME', 'SECTION', 'SLICE', 'TEXT', 'IMAGE', 'RECTANGLE', 'BUTTON',
    'OVAL', 'LINE', 'POLYGON', 'STAR', 'VECTOR',
  ];
  const missingKinds = REQUIRED_KINDS.filter((k) => !kinds.has(k));

  /* --- 8 类效果（FR-19 EffectKind 全集） --- */
  const REQUIRED_EFFECTS = [
    'DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR',
    'PROGRESSIVE_BLUR', 'NOISE', 'TEXTURE', 'GLASS',
  ];
  const missingEffects = REQUIRED_EFFECTS.filter((k) => !effects.has(k));

  /* --- 4 型渐变（FR-17 FillKind 的渐变四态，去掉 GRADIENT_ 前缀） --- */
  const REQUIRED_GRADIENTS = ['LINEAR', 'RADIAL', 'ANGULAR', 'DIAMOND'];
  const missingGradients = REQUIRED_GRADIENTS.filter((g) => !gradients.has(g));

  const zones = [
    {
      id: 1,
      name: '组件种类陈列区',
      requirement: '16 类图层每类 ≥1 示例（含 Section 分组、组件+实例+变体、布尔、钢笔、Slice）',
      pass: missingKinds.length === 0 && vectorNodes > 0 && sliceNodes > 0 && components.length > 0,
      measured: {
        kindsPresent: [...kinds.keys()].sort(),
        kindsMissing: missingKinds,
        vectorNodes,
        sliceNodes,
        sectionNodes,
        components: components.length,
        instances: null,
      },
      gap: missingKinds.length
        ? `16 类中缺 ${missingKinds.length} 类：${missingKinds.join(', ')}（demo 页实测仅用 ${kinds.size} 类）`
        : '覆盖完整',
      suggest: 'src/demo/pages.ts 增补「样片-组件种类」页：SECTION 分组 + OVAL/LINE/POLYGON/STAR/VECTOR/SLICE 各 ≥1 + 组件实例与变体',
    },
    {
      id: 2,
      name: '参数矩阵区',
      requirement: '四角圆角/stroke 三对齐/8 类效果/4 型渐变/blend 抽样/约束 5 档/AutoLayout 8 组合/文本排版对照',
      pass:
        missingEffects.length === 0 &&
        missingGradients.length === 0 &&
        strokes.size >= 3 &&
        constraints.size >= 4 &&
        autolayoutCombos.size >= 8 &&
        textFeatures.size >= 3,
      measured: {
        effectsPresent: [...effects].sort(),
        effectsMissing: missingEffects,
        gradientsPresent: [...gradients].sort(),
        gradientsMissing: missingGradients,
        strokeAligns: [...strokes].sort(),
        blendModes: [...blendModes].sort(),
        constraints: [...constraints].sort(),
        autolayoutCombos: autolayoutCombos.size,
        textFeaturesPresent: [...textFeatures].sort(),
        radiusNodes,
      },
      gap: [
        missingEffects.length ? `效果缺 ${missingEffects.length} 类：${missingEffects.join(', ')}` : '',
        missingGradients.length ? `渐变缺 ${missingGradients.join(', ')}` : '',
        strokes.size < 3 ? `stroke 对齐 ${strokes.size}/3` : '',
        constraints.size < 4 ? `约束档 ${constraints.size}/5` : '',
        autolayoutCombos.size < 8 ? `AutoLayout 组合 ${autolayoutCombos.size}/8` : '',
        textFeatures.size < 3 ? `文本排版项 ${textFeatures.size}/3` : '',
      ]
        .filter(Boolean)
        .join('；') || '覆盖完整',
      suggest: 'src/demo/pages.ts 增补「样片-参数矩阵」页：4 角圆角差异 + stroke 三对齐并排 + 8 效果逐个 + 4 型渐变并排 + 约束 5 档',
    },
    {
      id: 3,
      name: '多 Page 设计',
      requirement: '≥3 Page，各自 Frame 布局完整',
      pass: loaded.length >= 3,
      measured: { pageCount: loaded.length, pages: loaded.map((l) => l.page.name) },
      gap: loaded.length >= 3 ? '覆盖完整（16 demo 页）' : `仅 ${loaded.length} Page`,
      suggest: '样片需 ≥3 个「设计页」（列表/详情/设置），当前 16 demo 页可复用为素材',
    },
    {
      id: 4,
      name: '原型跳转',
      requirement: '≥5 类交互（点击 Navigate+动画/返回/悬停态/overlay/After delay 或 Scroll to）+ ≥3 Flow + 演示模式走通',
      pass: interactions.length >= 5 && flows.length >= 3,
      measured: {
        interactionCount: interactions.length,
        triggers: [...new Set(interactions.map((i) => i.trigger))].sort(),
        actions: [...new Set(interactions.map((i) => i.action))].sort(),
        flowCount: flows.length,
      },
      gap: interactions.length || flows.length
        ? `交互 ${interactions.length} 条 / Flow ${flows.length} 个（需 ≥5 交互 + ≥3 Flow）`
        : 'demo 页零交互、零 Flow（Prototype 数据仅在编辑器内产生，未落 dist/pages）',
      suggest: 'src/demo/pages.ts 样片页补 interactions（FR-40 六类动作）+ flows；或由 P 原型线导出样例工程到 dist/showcase/',
    },
    {
      id: 5,
      name: '验证（像素报告入档）',
      requirement: '初始态出码 vs reference ≥99%、画布 vs 出码 ≥95%，截图与 diff 报告存 dist/showcase/',
      pass: report.avgSimilarity >= 0.99 && report.grades.A + report.grades.B === report.total,
      measured: {
        avgSimilarity: report.avgSimilarity,
        gradeA: report.grades.A,
        gradeB: report.grades.B,
        gradeC: report.grades.C,
        cards: report.total,
        cardDir: 'dist/showcase/<页>/card.png',
      },
      gap:
        report.avgSimilarity >= 0.99
          ? `avg ${(report.avgSimilarity * 100).toFixed(2)}% ≥99% 达标`
          : `avg ${(report.avgSimilarity * 100).toFixed(2)}% < 99%（${report.grades.B} 页落 B 档）`,
      suggest: 'B 档页（04 商品详情 98.79% / 13 绝对定位页 98.89%）差异先归因再定豁免（PRD 禁止调阈值）',
    },
  ];

  const passCount = zones.filter((z) => z.pass).length;
  return {
    note: 'FR-57 五区实测审计；样片内容定义在 src/demo/（本轨道只读），故只审计并给出补齐建议',
    total: zones.length,
    pass: passCount,
    fail: zones.length - passCount,
    allPass: passCount === zones.length,
    zones,
  };
}

const zones = auditZones();
report.zones = zones;
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

console.log(`\nshowcase done: ${rows.length} cards, avg=${(report.avgSimilarity * 100).toFixed(2)}%, A/B/C=${report.grades.A}/${report.grades.B}/${report.grades.C} → dist/showcase/`);
console.log(`\nFR-57 五区审计：${zones.pass}/${zones.total} 区通过`);
for (const z of zones.zones) {
  console.log(`  ${z.pass ? 'PASS' : 'FAIL'}  区${z.id} ${z.name} — ${z.gap}`);
}
if (!zones.allPass) {
  console.log('\n（未通过区需在 src/demo/ 补样片内容，建议见 dist/showcase/report.json 的 zones[].suggest）');
  process.exitCode = 1;
}
