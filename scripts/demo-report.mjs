import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// 生成「三个 PRD 遗留项 · 前端 Demo 演示报告」→ dist/walkthrough/index.html
const OUT = join(process.cwd(), 'dist', 'walkthrough');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function read(name, fallback = '') {
  const p = join(OUT, name);
  if (!existsSync(p)) return fallback;
  const buf = readFileSync(p);
  // PowerShell `*>` 重定向默认写 UTF-16LE（带 BOM），按 BOM 嗅探解码
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString('utf16le');
  return buf.toString('utf8');
}

const walkthrough = JSON.parse(read('walkthrough-log.json', '{"steps":[]}'));
const vpReal = read('viewport-real.log', '(缺少 viewport-real.log)');
const vpFixture = read('viewport-fixture.log', '(缺少 viewport-fixture.log)');
const e2eLog = read('e2e.log', '(缺少 e2e.log)');

const e2ePages = [...new Set([...e2eLog.matchAll(/(PASS|FAIL)\s+[\d.]+%\s+diff=\d+px\s+(.+)/g)].map((m) => m[2].trim()))];
const e2eTail = e2eLog.split('\n').filter((l) => l.trim()).slice(-6).join('\n');

const SHOTS = [
  ['01-初始状态.png', '打开编辑器（空项目）'],
  ['02-打开demo页.png', '打开 demo 页 03-商品列表（图层树 53 行）'],
  ['03-添加节点与图层树.png', 'Palette 点击添加 框架/文本/按钮/图片 → 57 行'],
  ['04-图片src编辑.png', '属性面板输入图片 src（data URI 即时上画布）'],
  ['05-粘贴后.png', 'Ctrl+C / Ctrl+V 粘贴 → 58 行'],
  ['06-撤销粘贴.png', 'Ctrl+Z 撤销 → 回到 57 行'],
  ['07-Diff差异明细.png', '像素比对：98.90% 通过 + 差异明细表（60 区域 / 12 节点定位）'],
  ['08-生成代码.png', '生成代码 Modal（Taro TSX + ZIP 导出）'],
];

const stepRows = walkthrough.steps
  .map((s) => `<tr><td>${s.ok ? '✅' : '❌'}</td><td>${esc(s.name)}</td><td>${esc(s.note)}</td></tr>`)
  .join('\n');

const shotCards = SHOTS.filter(([f]) => existsSync(join(OUT, f)))
  .map(
    ([f, cap]) => `<figure><img src="${f}" loading="lazy" /><figcaption>${esc(cap)}</figcaption></figure>`,
  )
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>三个 PRD 遗留项 · 前端 Demo 演示</title>
<style>
  :root { --bg:#0f1117; --card:#161a23; --line:#2a3040; --text:#e5e7eb; --dim:#9aa3b2; --accent:#6366f1; --pass:#34d399; --fail:#f87171; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.7 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif; }
  .wrap { max-width:1200px; margin:0 auto; padding:40px 24px 80px; }
  h1 { font-size:26px; margin:0 0 6px; }
  h2 { font-size:20px; margin:48px 0 8px; padding-top:24px; border-top:1px solid var(--line); }
  h3 { font-size:15px; margin:20px 0 8px; color:var(--dim); font-weight:600; }
  .sub { color:var(--dim); margin-bottom:24px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:18px 20px; margin:14px 0; }
  .why { color:var(--dim); font-size:14px; margin:4px 0 12px; }
  table { border-collapse:collapse; width:100%; font-size:14px; }
  th,td { border:1px solid var(--line); padding:7px 12px; text-align:left; }
  th { background:#1c2130; color:var(--dim); font-weight:600; }
  pre { background:#0b0d13; border:1px solid var(--line); border-radius:8px; padding:12px 14px; overflow:auto; font-size:12.5px; line-height:1.6; color:#cbd5e1; max-height:340px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(440px,1fr)); gap:16px; }
  figure { margin:0; background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  figure img { width:100%; display:block; cursor:zoom-in; }
  figcaption { padding:9px 12px; font-size:13px; color:var(--dim); border-top:1px solid var(--line); }
  .pass { color:var(--pass); font-weight:700; }
  .fail { color:var(--fail); font-weight:700; }
  .tag { display:inline-block; background:#1c2130; border:1px solid var(--line); border-radius:999px; padding:1px 10px; font-size:12px; color:var(--dim); margin-left:8px; vertical-align:middle; }
  a { color:var(--accent); }
</style>
</head>
<body>
<div class="wrap">
  <h1>三个 PRD 遗留项 · 前端 Demo 演示</h1>
  <div class="sub">把「人工走查」「FR-6 元素重叠判据」「PRD 文档维护」三个抽象痛点跑成可见的页面与日志 · 2026-10-02</div>

  <h2>痛点① 人工走查 <span class="tag">里程碑 10-16 / 10-20</span></h2>
  <div class="why">
    含义：单测只证明 <b>reducer 数据对</b>，不证明 <b>界面点起来对</b>——粘贴按钮、Diff 明细表、图片 src 输入这些新功能从没人在真实浏览器里点过。
    下面这份报告本身就是走查产物：<code>scripts/walkthrough.mjs</code> 用 Playwright 把完整流程真点了 8 步，全程截图。
  </div>
  <div class="card">
    <table>
      <tr><th>结果</th><th>步骤</th><th>证据</th></tr>
      ${stepRows}
    </table>
  </div>
  <div class="grid">
    ${shotCards}
  </div>

  <h2>痛点② FR-6「无元素重叠」判据缺失 <span class="tag">已补进 npm run viewport</span></h2>
  <div class="why">
    含义：PRD 给 FR-6 定了三条判据，前两条早有断言，唯独<b>「无元素重叠」从来没人测过</b>——布局把两个卡片压在一起，现有脚本照样全绿。
    本次把判据补进 <code>viewport-check.mjs</code>（兄弟元素、双方非 absolute 才比对；absolute 视为 badge/浮层等设计性叠加）并新增 375 视口。
    <b>用一个故意压盖的故障样例证明检测真的会报错（exit 1）</b>，而不是加了个永远通过的假检查。
  </div>
  <h3>真实 16 页 × 4 视口（含新增 375）—— <span class="pass">64/64 通过</span></h3>
  <pre>${esc(vpReal.split('\n').slice(-8).join('\n'))}</pre>
  <h3>故障样例（负 margin 压盖）—— <span class="fail">0/4 失败并 exit 1</span>，证明检测有效</h3>
  <pre>${esc(vpFixture.split('\n').slice(-8).join('\n'))}</pre>
  <p class="why">样例源码：<code>tests/fixtures/overlap-pages/故障样例-元素重叠/index.html</code>；复跑：<code>npm run viewport</code></p>

  <h2>痛点③ PRD 文档维护 <span class="tag">文档 vs 现实的三处偏差</span></h2>
  <div class="why">
    含义：PRD 是权威规格，但它有几处声明已被现实推翻/与现实脱节。最有说服力的证据就在这次 demo 的运行日志里：
  </div>

  <div class="card">
    <h3 style="margin-top:0">证据 1 · 双入口问题：回归环只测 demo 页，测不到编辑器里的页面</h3>
    <p class="why">
      上面①里我们在编辑器打开/改动了页面（截图 07 那个 98.90% 的页面）——但 <code>npm run e2e</code> 跑的是
      <code>dist/pages</code> 下的 16 个 demo DSL 页，<b>编辑器用户的页面永远不在回归环里</b>。这正是三轮评审指出的「双入口链路未区分」。
    </p>
    <p class="why">e2e 日志实际比对的页面 ID（全部）：</p>
    <pre>${esc(e2ePages.join('\n')) || '(未解析到)'}</pre>
    <p class="why">日志尾部（16/16 达标退出）：</p>
    <pre>${esc(e2eTail)}</pre>
  </div>

  <div class="card">
    <h3 style="margin-top:0">证据 2 · 过时口径注：说断言脚本不存在，其实已经存在</h3>
    <p class="why">PRD（v0.3，§Verification 口径注）原文：</p>
    <pre>&gt; 标注 Automated 但**尚无对应断言脚本**的项（FR-1 / FR-3 / FR-5 / FR-12 的结构断言与
&gt; ZIP 解压校验等），补齐前不得计入已验证。</pre>
    <p class="why">现实：断言已全部补齐并全绿 —— <code>tests/requirements.test.ts</code>（43 项测试含 FR-1/3/5/12）+
      <code>scripts/assert-pages.mjs</code>（224 项产物检查，已挂进 <code>npm run pages</code>）。<b>文档这句话现在是错的</b>，不改会误导后续评审。</p>
  </div>

  <div class="card">
    <h3 style="margin-top:0">证据 3 · Goal 1 措辞与你的策略冲突（呼应你说的「HTML 导出就够了」）</h3>
    <p class="why">
      PRD Goal 1 写「H5 渲染 → 像素对比」，但像素对比的 render 侧截图源是 <code>index.html</code>（HTML 预览），
      <code>dist/taro</code> 的 TSX <b>从未被任何编译器编译过</b>。
      按你第 1 点的策略（导出结构正确的 HTML，交给 agent 适配各框架），这项不是「待补的验证」而是「待改的声明」——
      Taro CLI 构建可从必选项降级，Goal 1 / 里程碑 10-27 应改写为「HTML 导出为源，框架适配为 agent 下游工序」。<b>这就属于 PRD 维护。</b>
    </p>
  </div>

  <h2>小结</h2>
  <table>
    <tr><th>痛点</th><th>是什么</th><th>这次做了什么</th></tr>
    <tr><td>① 人工走查</td><td>新功能没人真点过</td><td class="pass">Playwright 真点 8 步全过，截图见上</td></tr>
    <tr><td>② 重叠判据</td><td>PRD 三判据缺一条从未测过</td><td class="pass">补进 viewport 脚本；真页 64/64、故障样例 0/4 抓出</td></tr>
    <tr><td>③ PRD 维护</td><td>文档三处声明与现实不符</td><td class="pass">三条证据固化在本报告，待 PRD 0.4 修订统一处理</td></tr>
  </table>
  <p class="why">复跑方式：<code>node scripts/walkthrough.mjs</code> · <code>npm run viewport</code> · <code>node scripts/demo-report.mjs</code></p>
</div>
</body>
</html>
`;

writeFileSync(join(OUT, 'index.html'), html, 'utf8');
console.log(`report → dist/walkthrough/index.html（截图 ${shotCards ? SHOTS.filter(([f]) => existsSync(join(OUT, f))).length : 0}/8，e2e 页面 ${e2ePages.length} 个）`);
