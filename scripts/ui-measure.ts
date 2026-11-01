/**
 * 45 页真实产物的**量测审计**（人眼之外的第三只眼）
 *
 * 为什么不能只靠 AST 扫描：`bugscan/` 的检测器读的是节点树，
 * 判据只能是「字段组合看起来像 bug」。而实测最刺眼的三个问题
 * （底栏文字被切、按钮文案换行、子项溢出父盒）**在 AST 里完全合法**，
 * 必须量渲染后的盒子才能发现。
 *
 * 这正是项目早就写进教训里的那条：像素比对与结构断言都查不出
 * 「1fr 在 HUG 里按 max-content 解析」这类问题，**只有量渲染宽度能查**。
 *
 * 判据（全部用「量出来的数」说话，不猜）：
 *   1. `below-fold`   元素底边超出视口 812px —— 用户看不到/点不到
 *   2. `wrap`         单行短文案（≤6 字）渲染成多行 —— 盒子太窄
 *   3. `h-overflow`   内容宽度超出自身盒宽 —— 横向被切
 *   4. `v-overflow`   内容高度超出自身盒高（且 overflow 非 visible）—— 纵向被切
 *   5. `out-of-parent` 子元素盒子超出父盒边界 —— 布局塌了
 *
 * 用法：
 *   npx vite-node scripts/ui-measure.ts                 # 全部
 *   npx vite-node scripts/ui-measure.ts --only=nav-tabbar
 *   npx vite-node scripts/ui-measure.ts --json          # 只出 json 不写 md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { buildClassNames } from '../src/compiler/compile';
import type { UINode, UIPage } from '../src/schema/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, '.tmp/ui-gen');
const SHOTS = path.join(root, '.tmp/ui-shots');
const OUT_MD = path.join(root, 'docs/ui-measure-report.md');
const OUT_JSON = path.join(root, '.tmp/ui-shots/measure.json');

const argv = process.argv.slice(2);
const argOf = (flag: string, dflt: string): string => {
  const eq = argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  return i >= 0 ? (argv[i + 1] ?? dflt) : dflt;
};
const only = argOf('--only', '');
const VIEW = { width: 375, height: 812 };
/** 容差：亚像素与 1px 描边不算问题 */
const TOL = 2;

interface NodeMeta {
  id: string;
  type: string;
  name: string;
  text?: string;
  layout: Record<string, unknown>;
  style: Record<string, unknown>;
  parent?: string;
}

interface RawBox {
  cls: string;
  x: number;
  y: number;
  w: number;
  h: number;
  scrollW: number;
  scrollH: number;
  clientW: number;
  clientH: number;
  text: string;
  /** 真实行盒数（Range.getClientRects 长度），0 = 无自有文字 */
  lines: number;
  fontSize: number;
  lineHeight: number;
  position: string;
  /** 自己或任一祖先 fixed/absolute */
  floating: boolean;
  overflowX: string;
  overflowY: string;
  parentW: number;
  parentH: number;
  parentLeft: number;
  parentTop: number;
  parentRight: number;
  parentBottom: number;
}

type Kind = 'size-ignored' | 'below-fold' | 'wrap' | 'h-overflow' | 'v-overflow' | 'out-of-parent';

interface Hit {
  kind: Kind;
  page: string;
  node: string;
  type: string;
  detail: string;
}

/** 节点树 → id 索引（含父 id，报告里能定位「是谁的错」） */
function indexNodes(page: UIPage): Map<string, NodeMeta> {
  const map = new Map<string, NodeMeta>();
  const visit = (n: UINode, parent?: string): void => {
    map.set(n.id, {
      id: n.id,
      type: n.type,
      name: n.name,
      text: (n as { text?: string }).text,
      layout: n.layout as unknown as Record<string, unknown>,
      style: (n.style ?? {}) as unknown as Record<string, unknown>,
      parent,
    });
    for (const c of (n as { children?: UINode[] }).children ?? []) visit(c, n.id);
  };
  visit(page.root);
  return map;
}

function serve(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
    const base = p.startsWith('/fonts/') ? path.join(root, 'public') : SHOTS;
    const file = path.join(base, p.startsWith('/fonts/') ? p : p.replace(/^\//, ''));
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    const ext = path.extname(file);
    const mime = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.png' ? 'image/png' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}

/** 浏览器里跑：把每个带类名的元素量一遍（类名 → 节点 id 一一对应，见 compiler/compile.ts） */
const MEASURE_JS = `(() => {
  const out = [];
  const walk = (el) => {
    for (const child of el.children) {
      const tag = child.tagName.toLowerCase();
      const cls = (child.className && typeof child.className === 'string') ? child.className.trim() : '';
      const r = child.getBoundingClientRect();
      const cs = getComputedStyle(child);

      /**
       * 行数用 Range 数**行盒**，不要用「高度 / 行高」估。
       * 估法把按钮的上下 padding 当成第二行，实测 39 条「折行」里 30 条是误报
       * （「确认提交」在 343px 宽的按钮里，48px 高 = 22px 行高 + 上下各 13px padding）。
       * Range.getClientRects() 返回的矩形数就是真实行数，padding 不算行。
       */
      let lines = 0;
      const ownText = child.childElementCount === 0 ? (child.textContent || '').trim() : '';
      if (ownText) {
        const range = document.createRange();
        range.selectNodeContents(child);
        lines = range.getClientRects().length;
      }

      /** 是否「浮在页面上」：自己或任一祖先是 fixed/absolute（脱流元素超出视口才是 bug） */
      let floating = false;
      for (let p = child; p && p !== document.body; p = p.parentElement) {
        const pos = getComputedStyle(p).position;
        if (pos === 'fixed' || pos === 'absolute') { floating = true; break; }
      }

      const pr = child.parentElement ? child.parentElement.getBoundingClientRect() : null;
      out.push({
        cls,
        x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height,
        scrollW: child.scrollWidth, scrollH: child.scrollHeight,
        clientW: child.clientWidth, clientH: child.clientHeight,
        text: ownText.slice(0, 40),
        lines,
        fontSize: parseFloat(cs.fontSize) || 0,
        lineHeight: parseFloat(cs.lineHeight) || 0,
        position: cs.position,
        floating,
        overflowX: cs.overflowX,
        overflowY: cs.overflowY,
        parentW: pr ? pr.width : 0,
        parentH: pr ? pr.height : 0,
        parentLeft: pr ? pr.left : 0,
        parentTop: pr ? pr.top + window.scrollY : 0,
        parentRight: pr ? pr.right : 0,
        parentBottom: pr ? pr.bottom + window.scrollY : 0,
      });
      // svg 内部（path/defs）不是节点，不往里走；但 svg 元素本身是 VECTOR 节点，必须量
      if (tag !== 'svg') walk(child);
    }
  };
  walk(document.body);
  return out;
})()`;

/** 单行短文案被折行：按「每字 1em」估单行宽度，实际高度明显超出 1.6 倍行高即为折行 */
function classify(pageName: string, boxes: RawBox[], byCls: Map<string, NodeMeta>): Hit[] {
  const hits: Hit[] = [];
  const push = (kind: Kind, cls: string, detail: string): void => {
    const meta = byCls.get(cls);
    if (!meta) return;
    hits.push({ kind, page: pageName, node: `${meta.name}(${meta.type})`, type: meta.type, detail });
  };

  for (const b of boxes) {
    const meta = byCls.get(b.cls);
    if (!meta) continue;

    /**
     * 0. 声明的尺寸被丢了：`heightMode: HUG` + 显式 `height`，渲染高度却明显小于声明值。
     *
     * 这是 2026-11-01 抓到的真实 bug 的**回归守卫**：底栏写 `height:64 + HUG`，
     * 编译成 `height: fit-content` 把 64 丢了 → 实际 40px → 图标 20 + 文字 14 挤满，
     * 文字底边贴在视口最后一行，看起来像「底栏被切了一半」。
     * 修法在 `normalizeHugSize`（HUG + 显式高度 → min-height 地板），这条用来防止它再回来。
     */
    if (meta.layout.heightMode === 'HUG' && typeof meta.layout.height === 'number' && b.h > 0) {
      const declared = meta.layout.height;
      if (b.h + 1 < declared) {
        push('size-ignored', b.cls, `声明高 ${declared}px，实际 ${Math.round(b.h)}px（HUG 把显式高度吞了）`);
      }
    }

    /**
     * 1. 脱流元素超出视口底部 —— 底栏/操作栏/浮层最常见的坏形态。
     *
     * **只判 floating**：流内元素落在 812 以下完全正常（页面比一屏长就该滚）。
     * 早先没区分，`card-badge`（页高 963）里 4 个正常滚动的文字全被记成 bug —— 23 条里 18 条是误报。
     */
    if (b.floating && b.h > 0 && b.y + b.h > VIEW.height + TOL) {
      push('below-fold', b.cls, `底边 ${Math.round(b.y + b.h)} > 视口 ${VIEW.height}（被切掉 ${Math.round(b.y + b.h - VIEW.height)}px）`);
    }

    /**
     * 2. 单行短文案被折行。
     * 判据是**真实行盒数**（`lines`），不是「高度 / 行高」——后者把 padding 当行。
     * 只判 ≤8 字的文案：长文案折行是设计，短文案（按钮/标签/导航项）折行是坏。
     */
    if (b.lines > 1 && b.text.length > 0 && b.text.length <= 8) {
      push('wrap', b.cls, `「${b.text}」折成 ${b.lines} 行（盒宽 ${Math.round(b.w)}px，字号 ${b.fontSize}）`);
    }

    // 3. 内容横向超出自身
    if (b.scrollW > b.clientW + TOL && b.w > 0) {
      push('h-overflow', b.cls, `内容 ${b.scrollW}px > 盒宽 ${b.clientW}px`);
    }

    // 4. 内容纵向超出自身（且会被裁）
    if (b.scrollH > b.clientH + TOL && b.h > 0 && b.overflowY !== 'visible') {
      push('v-overflow', b.cls, `内容 ${b.scrollH}px > 盒高 ${b.clientH}px（overflow-y:${b.overflowY}）`);
    }

    /**
     * 5. 子元素**横向**超出父盒。
     *
     * 只判横向，不判纵向：纵向溢出会让 document 长高，用户滚一下就能看到（`overlay-toast`
     * 的 8 行列表就是这样，页高 880 而不是 812，内容没丢）；横向溢出到 375 以外则是
     * **永远看不见** —— 而 AST 没有横向滚动能力。这条区分是 2026-11-01 从 4 条命中里
     * 复盘出来的：3 条纵向（正常滚动）1 条横向（真 bug）。
     */
    if (!b.floating && b.parentW > 0 && b.w > 0) {
      const overRight = b.x + b.w - b.parentRight;
      if (overRight > TOL) {
        push('out-of-parent', b.cls, `横向超出父盒 ${Math.round(overRight)}px（自身 ${Math.round(b.w)}×${Math.round(b.h)}，父 ${Math.round(b.parentW)}×${Math.round(b.parentH)}）`);
      }
    }
    }
  return hits;
}

async function main(): Promise<void> {
  if (!fs.existsSync(SHOTS)) {
    console.error(`未找到 ${SHOTS}，先跑 npx vite-node scripts/ui-shots.ts`);
    process.exit(2);
  }
  let files = fs.readdirSync(SRC).filter((f) => f.endsWith('.page.json'));
  if (only) files = files.filter((f) => f.startsWith(only));
  files.sort();

  const srv = await serve();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  const all: Hit[] = [];
  let stale = 0;
  const perPage: { page: string; nodes: number; hits: number; height: number }[] = [];

  for (const f of files) {
    const id = f.replace(/\.page\.json$/, '');
    const uiPage = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8')) as UIPage;
    const metas = indexNodes(uiPage);

    const html = path.join(SHOTS, `${id}.html`);
    if (!fs.existsSync(html)) {
      console.warn(`  跳过 ${id}（缺 HTML，先跑 npm run ui:shots）`);
      continue;
    }
    /**
     * **同源校验**：HTML 必须是当前 page.json 渲染出来的。
     *
     * 早先只判「文件在不在」，于是改了转换层之后重跑量测，读到的还是**上一批**的 HTML，
     * 而对照用的 `page.json` 已经是新的 —— 两边不同源，报出来的「声明 64 实际 24」
     * 是旧产物的问题（实测 4 条全是这么来的）。不同源的结果比没有结果更危险：
     * 它会让人去修一个已经修好的 bug。
     */
    if (fs.statSync(html).mtimeMs < fs.statSync(path.join(SRC, f)).mtimeMs) {
      console.warn(`  跳过 ${id}（HTML 比 page.json 旧，先跑 npm run ui:shots）`);
      stale += 1;
      continue;
    }
    await page.goto(`${srv.url}/${id}.html`, { waitUntil: 'networkidle' });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const boxes = (await page.evaluate(MEASURE_JS)) as RawBox[];

    /**
     * 类名 → 节点：直接用编译层自己的 `buildClassNames`（`<type>-<序号>`，树前序），
     * **不要靠 DOM 顺序去对齐** —— RECTANGLE 的子项会被渲染器丢掉、VECTOR 出的是 `<svg>`，
     * 两边的元素数量根本对不上，对齐出来的映射是错的（错映射比没有映射更糟：
     * 报告里会指向无辜的节点）。
     */
    const classOf = buildClassNames(uiPage);
    const byCls = new Map<string, NodeMeta>();
    for (const [nid, cls] of Object.entries(classOf)) {
      const m = metas.get(nid);
      if (m) byCls.set(cls, m);
    }

    const hits = classify(id, boxes, byCls);
    all.push(...hits);
    perPage.push({ page: id, nodes: metas.size, hits: hits.length, height });
    process.stdout.write(`  ${id.padEnd(20)} ${String(metas.size).padStart(3)} 节点 ${String(hits.length).padStart(2)} 命中\n`);
  }

  await browser.close();
  await srv.close();

  /* 汇总 */
  const kinds: Kind[] = ['size-ignored', 'below-fold', 'wrap', 'h-overflow', 'v-overflow', 'out-of-parent'];
  const byKind = new Map<Kind, Hit[]>(kinds.map((k) => [k, all.filter((h) => h.kind === k)]));

  const lines: string[] = [];
  lines.push('# UI 量测审计报告', '');
  lines.push(`> 生成时间 ${new Date().toISOString().slice(0, 19).replace('T', ' ')}　·　页面 ${perPage.length} 个　·　命中 ${all.length} 条`);
  lines.push('>');
  lines.push('> 这份报告读的是**渲染后的盒子**，不是节点树。`bugscan/` 那些检测器判的是「字段组合像不像 bug」，');
  lines.push('> 而底栏被切、按钮换行、子项溢出父盒这些在 AST 里完全合法 —— 只有量出来才知道。');
  if (stale) lines.push('>', `> ⚠ 有 ${stale} 页因 HTML 比 page.json 旧被跳过（先跑 \`npm run ui:shots\`）。`);
  lines.push('');

  lines.push('## 一、按类型', '');
  lines.push('| 类型 | 命中 | 涉及页面 | 含义 |', '|---|---|---|---|');
  const meaning: Record<Kind, string> = {
    'size-ignored': 'HUG 把声明的显式高度吞了（底栏被压扁的根因）',
    'below-fold': '元素底边超出 812px 视口，用户看不到/点不到',
    wrap: '单行短文案折成多行，盒子太窄',
    'h-overflow': '内容比自身盒宽长，横向被切',
    'v-overflow': '内容比自身盒高长且会裁，纵向被切',
    'out-of-parent': '子元素超出父盒边界',
  };
  for (const k of kinds) {
    const hs = byKind.get(k) ?? [];
    const pages = new Set(hs.map((h) => h.page)).size;
    lines.push(`| \`${k}\` | ${hs.length} | ${pages} | ${meaning[k]} |`);
  }
  lines.push('');

  lines.push('## 二、逐条明细', '');
  for (const k of kinds) {
    const hs = byKind.get(k) ?? [];
    if (!hs.length) continue;
    lines.push(`### \`${k}\`（${hs.length}）`, '');
    lines.push('| 页面 | 节点 | 说明 |', '|---|---|---|');
    for (const h of hs.slice(0, 40)) lines.push(`| ${h.page} | ${h.node} | ${h.detail.replace(/\|/g, '\\|')} |`);
    if (hs.length > 40) lines.push('', `（另有 ${hs.length - 40} 条未列出）`);
    lines.push('');
  }

  lines.push('## 三、按页面', '');
  lines.push('| 页面 | 节点 | 命中 | 页高 |', '|---|---|---|---|');
  for (const p of [...perPage].sort((a, b) => b.hits - a.hits)) {
    lines.push(`| ${p.page} | ${p.nodes} | ${p.hits} | ${p.height}px |`);
  }
  lines.push('');

  fs.writeFileSync(OUT_MD, `${lines.join('\n')}\n`, 'utf8');
  fs.writeFileSync(
    OUT_JSON,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), total: all.length, byKind: Object.fromEntries([...byKind].map(([k, v]) => [k, v.length])), perPage, hits: all }, null, 2)}\n`,
    'utf8',
  );

  console.log(`\n量测 ${perPage.length} 页，命中 ${all.length} 条`);
  for (const k of kinds) console.log(`  ${k.padEnd(14)} ${String((byKind.get(k) ?? []).length).padStart(3)}  ${new Set((byKind.get(k) ?? []).map((h) => h.page)).size} 页`);
  console.log(`\n报告 → ${path.relative(root, OUT_MD)}`);
}

await main();
