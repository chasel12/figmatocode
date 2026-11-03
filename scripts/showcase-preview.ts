/**
 * 展示项目预览页：把 `.tmp/showcase/<id>/shots/*.html`（`ui-shots` 的单页产物）
 * 拷进 `showcase/out/preview/`，再生成一个 `showcase/out/index.html`。
 *
 *   vite-node scripts/showcase-preview.ts
 *
 * 为什么用 **iframe 而不是截图**：这些页里有 `position: fixed` 的底栏。
 * 截图（尤其 fullPage）会把固定元素画在视口位置，看起来像「底栏飘在页面中间」；
 * 而 iframe 给的是真实 375×812 视口 —— 底栏就该钉在框底，滚动时内容从它下面穿过。
 * 换句话说：**预览页展示的是编译产物的真实运行时行为**，不是又一份渲染近似。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const OUT = resolve(ROOT, 'showcase/out');
const PREVIEW = join(OUT, 'preview');

interface Cfg {
  id: string;
  title: string;
  pack: string;
  skill: string;
  pages: string[];
}

function loadConfigs(): Cfg[] {
  const dir = join(ROOT, 'showcase/configs');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Cfg);
}

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const ACCENT: Record<string, string> = { music: '#605dff', ledger: '#0f5132', coffee: '#c1663f' };

/**
 * 四端出口 → 同一条 `NAVIGATE` 交互被翻译成什么。
 *
 * 这是整页唯一「值得 HR 停下来看」的地方：**同一份 AST 节点**，
 * 四端各用自己的路由语义落地（浏览器跳转 / Vue Router 风格 `go` / Taro API / 小程序 `@tap`）。
 * 差异全在出口，不在设计——这正是「编译器」与「模板生成器」的分界。
 *
 * 片段是**构建时从产物里抓的**，不是手写的（手写就等于给自己发奖状）。
 */
const MARKER = 'frame-8';

const FOUR_ENDS: { key: string; label: string; file: string }[] = [
  { key: 'react', label: 'React (H5)', file: 'react/pages/p-1/PageP1.tsx' },
  { key: 'vue', label: 'Vue 3 (H5)', file: 'vue/pages/p-1/PageP1.vue' },
  { key: 'taro', label: 'Taro (小程序)', file: 'taro/src/pages/p-1/index.tsx' },
  { key: 'uniapp', label: 'uni-app (小程序)', file: 'uniapp/src/pages/p-1/index.vue' },
];

const NAV_RE = /navigateTo\(|window\.location\.href|@click="go\(|@tap="go\(/;

/**
 * 从产物文件里抓出**某一个节点**的几行（默认 `frame-8` = 播放按钮）。
 *
 * 必须先按节点标记找、再退化成按跳转语句找：Vue / uni-app 是 SFC，
 * `<script>` 里有个 `const go = (href) => { window.location.href = href }` 的helper，
 * 按 `window.location.href` 搜会先命中 helper —— 展示出来的就不是「这个节点」，
 * 而是「路由工具函数」，说服力为零。实测第一版就是这样。
 */
function navSnippet(file: string, marker: string): string[] | null {
  if (!existsSync(file)) return null;
  const lines = readFileSync(file, 'utf8').split('\n');
  const byMarker = lines.findIndex((l) => l.includes(marker) && NAV_RE.test(l));
  const i = byMarker >= 0 ? byMarker : lines.findIndex((l) => NAV_RE.test(l));
  if (i < 0) return null;
  return lines
    .slice(i, i + 4)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (l.length > 150 ? `${l.slice(0, 150)} …` : l));
}

function codePane(label: string, lines: string[]): string {
  const body = lines
    .map((l) => esc(l).replace(/(Taro\.navigateTo|window\.location\.href|go\()/g, '<span class="hl">$1</span>'))
    .join('\n');
  return `<div class="pane"><header><b>${esc(label)}</b><span>${lines.length} 行</span></header><pre>${body}</pre></div>`;
}

function buildIndex(cfgs: { cfg: Cfg; shots: string[] }[]): string {
  const total = cfgs.reduce((a, c) => a + c.shots.length, 0);
  const sections = cfgs
    .map(({ cfg, shots }) => {
      const accent = ACCENT[cfg.id] ?? '#111';
      const frames = shots
        .map((f) => {
          const name = f.replace(/^\d+-/, '').replace(/\.html$/, '');
          return `<figure class="phone">
        <div class="screen"><iframe src="preview/${cfg.id}/${encodeURI(f)}" title="${esc(cfg.title)} · ${esc(name)}" loading="lazy"></iframe></div>
        <figcaption>${esc(name)}</figcaption>
      </figure>`;
        })
        .join('\n      ');
      const fig = join(OUT, cfg.id, 'project.fig');
      const chips = [
        existsSync(fig)
          ? `<a class="chip" href="${cfg.id}/project.fig" download><b>.fig</b><span>${(statSync(fig).size / 1024).toFixed(0)} KB · ${shots.length} 页</span></a>`
          : '',
        existsSync(join(OUT, `${cfg.id}.zip`)) ? `<a class="chip" href="${cfg.id}.zip" download><b>四端工程包</b><span>react / vue / taro / uniapp</span></a>` : '',
        `<a class="chip" href="preview/${cfg.id}/" target="_blank"><b>单页 HTML</b><span>${shots.length} 个</span></a>`,
      ]
        .filter(Boolean)
        .join('');
      return `<section class="project" style="--accent:${accent}">
    <header class="project-head">
      <div>
        <h2>${esc(cfg.title)}</h2>
        <p class="meta">主题包 <code>${esc(cfg.pack)}</code> · 风格规格 <code>${esc(cfg.skill.split('/').pop() ?? '')}</code> · ${shots.length} 页 · 同一份 AST 出四端</p>
      </div>
      <span class="count">${shots.length} 页</span>
    </header>
    <div class="artifacts">${chips}</div>
    <div class="rail">
      ${frames}
    </div>
  </section>`;
    })
    .join('\n\n  ');

  const snips = FOUR_ENDS.map((e) => {
    const lines = navSnippet(join(OUT, 'music', e.file), MARKER);
    return lines ? codePane(e.label, lines) : '';
  }).filter(Boolean);
  const duoSection = snips.length
    ? `<section class="project">
    <header class="project-head">
      <div>
        <h2>同源证明</h2>
        <p class="meta">回声 · 音乐播放「发现」页的一个节点：<code>frame-8</code>（播放按钮，带 <code>NAVIGATE → p-2</code> 交互）</p>
      </div>
      <span class="count">1 个 AST 节点 → 4 种路由语义</span>
    </header>
    <div class="duo">${snips.join('')}</div>
    <p class="note">四段代码不是手写的，是构建时从四份产物里抓的同一处。AST 里只有「点这个节点 → 跳到 p-2」一条声明；浏览器跳转、Vue 的 <code>go()</code>、Taro 的 <code>navigateTo</code>、小程序的 <code>@tap</code> 全由出码器按端补齐 —— <b>设计一次，四端一致</b>。</p>
  </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>UI Compiler · 展示工程</title>
<style>
  :root {
    --bg: #f6f6f7;
    --panel: #ffffff;
    --ink: #14161a;
    --ink-2: #5b6169;
    --line: #e4e5e9;
    --radius: 18px;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 1360px; margin: 0 auto; padding: 56px 32px 96px; }
  .hero h1 { font-size: 34px; line-height: 1.2; margin: 0 0 12px; letter-spacing: -0.02em; }
  .hero p { margin: 0; color: var(--ink-2); font-size: 15px; line-height: 1.7; max-width: 760px; }
  .stats { display: flex; gap: 28px; margin: 28px 0 8px; flex-wrap: wrap; }
  .stat b { display: block; font-size: 26px; letter-spacing: -0.02em; }
  .stat span { font-size: 12px; color: var(--ink-2); letter-spacing: 0.04em; }
  .project { margin-top: 56px; }
  .project-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding-bottom: 14px; border-bottom: 1px solid var(--line); }
  .project-head h2 { margin: 0 0 6px; font-size: 21px; letter-spacing: -0.01em; }
  .project-head h2::before { content: ""; display: inline-block; width: 9px; height: 9px; border-radius: 3px; background: var(--accent); margin-right: 10px; vertical-align: 2px; }
  .meta { margin: 0; font-size: 12.5px; color: var(--ink-2); }
  .meta code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #eceef1; border-radius: 5px; padding: 1px 5px; font-size: 11.5px; }
  .count { font-size: 12px; color: var(--ink-2); white-space: nowrap; }
  .rail { display: flex; gap: 22px; overflow-x: auto; padding: 22px 2px 10px; scroll-snap-type: x proximity; }
  .phone { margin: 0; flex: 0 0 auto; scroll-snap-align: start; }
  .screen {
    width: 375px; height: 812px;
    border-radius: 26px;
    background: #fff;
    border: 1px solid var(--line);
    box-shadow: 0 1px 2px rgba(16,20,28,.04), 0 12px 28px -12px rgba(16,20,28,.18);
    overflow: hidden;
  }
  .screen iframe { width: 375px; height: 812px; border: 0; display: block; }
  figcaption { margin-top: 10px; font-size: 12.5px; color: var(--ink-2); text-align: center; }
  .artifacts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
  .chip {
    display: inline-flex; align-items: baseline; gap: 7px;
    font-size: 12px; padding: 7px 12px; border: 1px solid var(--line); border-radius: 999px;
    background: var(--panel); color: var(--ink); text-decoration: none; transition: border-color .15s, color .15s;
  }
  .chip:hover { border-color: var(--accent); color: var(--accent); }
  .chip b { font-weight: 600; }
  .chip span { color: var(--ink-2); font-size: 11.5px; }
  .duo { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-top: 20px; }
  .pane { background: #15171c; border: 1px solid #24262d; border-radius: 14px; overflow: hidden; }
  .pane header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 9px 12px; font-size: 11.5px; color: #9aa1ab; border-bottom: 1px solid #24262d;
  }
  .pane header b { color: #e8eaee; font-weight: 600; }
  .pane pre {
    margin: 0; padding: 12px; font-size: 11px; line-height: 1.7; color: #c9d0da;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: pre-wrap; word-break: break-all;
  }
  .hl { color: #7ee787; }
  .note { margin: 16px 0 0; font-size: 12.5px; line-height: 1.85; color: var(--ink-2); max-width: 860px; }
  .note code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #eceef1; border-radius: 5px; padding: 1px 5px; font-size: 11.5px; }
  footer { margin-top: 64px; padding-top: 20px; border-top: 1px solid var(--line); font-size: 12.5px; color: var(--ink-2); line-height: 1.8; }
  footer code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>
</head>
<body>
<div class="wrap">
  <div class="hero">
    <h1>UI Compiler · 设计 → 代码，四端</h1>
    <p>三个完整的小程序产品，由「设计 → AST → 代码」编译器产出：模型只输出结构化的节点树，出码链路 0% AI。同一份 AST 可以存成 <code>.fig</code> 回到编辑器继续改，也可以出 React / Vue / Taro / uni-app 四端工程。</p>
    <div class="stats">
      <div class="stat"><b>${cfgs.length}</b><span>个产品</span></div>
      <div class="stat"><b>${total}</b><span>个页面</span></div>
      <div class="stat"><b>4</b><span>端出码</span></div>
      <div class="stat"><b>0</b><span>行手写 UI 代码</span></div>
    </div>
  </div>

  ${sections}

  ${duoSection}

  <footer>
    预览用 iframe 按 375×812 真实视口渲染 —— 底栏是 <code>position: fixed</code>，滚动时内容从它下方穿过，与真机一致。<br />
    <code>.fig</code> 是标准 Figma 交换格式：<b>一个画布上并排 6 个 frame</b>（每页一个 375×812），在 Figma 里打开就是这个样子；本项目编辑器内部仍按「页面」组织，一次编辑一页。四端工程在 <code>&lt;id&gt;/</code> 下，每份都带 <code>npm run dev:h5</code> / <code>build:weapp</code>。
  </footer>
</div>
</body>
</html>
`;
}

function main(): void {
  const cfgs = loadConfigs();
  mkdirSync(PREVIEW, { recursive: true });
  const rows: { cfg: Cfg; shots: string[] }[] = [];
  for (const cfg of cfgs) {
    const shotsDir = join(ROOT, '.tmp/showcase', cfg.id, 'shots');
    if (!existsSync(shotsDir)) {
      console.error(`[${cfg.id}] 没有 shots 目录：先跑 npm run ui:shots -- --src .tmp/showcase/${cfg.id}/pages --out ${shotsDir}`);
      continue;
    }
    const shots = readdirSync(shotsDir).filter((f) => f.endsWith('.html') && !f.startsWith('sheet')).sort();
    if (!shots.length) {
      console.error(`[${cfg.id}] shots 里没有单页 HTML`);
      continue;
    }
    const dst = join(PREVIEW, cfg.id);
    mkdirSync(dst, { recursive: true });
    for (const f of shots) copyFileSync(join(shotsDir, f), join(dst, f));
    /**
     * `.fig` 也要进交付包：它是「这真是设计文件」的唯一凭证。
     * 少了它，整个展示就退化成「一堆好看的网页截图」，而本项目卖点恰恰是
     * 「设计稿能往返、能进编辑器、还能继续改」。
     */
    const figSrc = join(ROOT, '.tmp/showcase', cfg.id, 'project.fig');
    const figDst = join(OUT, cfg.id, 'project.fig');
    if (existsSync(figSrc) && existsSync(join(OUT, cfg.id))) {
      copyFileSync(figSrc, figDst);
      console.log(`[${cfg.id}] project.fig ${(statSync(figDst).size / 1024).toFixed(0)} KB → ${cfg.id}/`);
    } else if (!existsSync(figSrc)) {
      console.warn(`[${cfg.id}] 缺 .fig：先跑 npm run showcase:gen -- --project ${cfg.id} --split-only`);
    }
    rows.push({ cfg, shots });
    console.log(`[${cfg.id}] ${shots.length} 页 → preview/${cfg.id}`);
  }
  writeFileSync(join(OUT, 'index.html'), buildIndex(rows), 'utf-8');
  console.log(`预览页 → ${join(OUT, 'index.html')}`);
}

main();
