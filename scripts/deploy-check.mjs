import { chromium } from 'playwright';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * FR-59 部署实测：导出页**脱离服务端**（file:// 协议）能否打开。
 *
 * PRD FR-59：「`npm run build` 产物静态托管可用；**导出页脱离服务端可打开**」。
 * 这里实测的是后半句——不经任何 HTTP 服务，直接用 file:// 打开
 * `dist/pages/<页>/index.html`，逐页采集：
 *   1) 是否加载成功（无导航错误）；
 *   2) **控制台错误 / 页面异常 / 资源请求失败**（file:// 下 /fonts/ 绝对路径会失败）；
 *   3) 文档字体是否真正就绪并命中 Inter（FR-48 本地托管的实际效果）；
 *   4) 首屏布局是否可用（body 有渲染高度、根节点有非零几何）。
 *
 * 结论分两级：
 *   - `openable`：页面能打开且结构可用（DOM 渲染出来）——这是「脱离服务端可打开」的字面口径；
 *   - `fullySelfContained`：连字体等资源引用也无 404（当前实现用 `/fonts/` 站点绝对路径，
 *     file:// 下必然失败，故**预期为 false**，如实入报告，并给出 src/ 侧建议 diff）。
 *
 * 用法：node scripts/deploy-check.mjs   → dist/deploy-check/report.json
 */

const root = process.cwd();
const pagesDir = join(root, 'dist', 'pages');
const outDir = join(root, 'dist', 'deploy-check');
mkdirSync(outDir, { recursive: true });

if (!existsSync(pagesDir)) {
  console.error('dist/pages 不存在：请先跑 `npm run pages`');
  process.exit(1);
}

const dirs = readdirSync(pagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const browser = await chromium.launch();
const rows = [];

for (const name of dirs) {
  const file = resolve(pagesDir, name, 'index.html');
  const url = pathToFileURL(file).href;
  const page = await browser.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('requestfailed', (r) => failedRequests.push({ url: r.url(), error: r.failure()?.errorText ?? '' }));

  let navOk = true;
  let navError = '';
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
  } catch (e) {
    navOk = false;
    navError = e instanceof Error ? e.message : String(e);
  }

  // 字体就绪 + 实际命中的字体族（FR-48：file:// 下 Inter 应回退到系统栈）
  let fontsReady = false;
  let fontFamily = '';
  let bodyHeight = 0;
  let rootBox = null;
  let nodeCount = 0;
  if (navOk) {
    try {
      await page.evaluate(() => document.fonts.ready);
      fontsReady = true;
    } catch {
      /* 忽略 */
    }
    const m = await page.evaluate(() => {
      const body = document.body;
      const first = body.firstElementChild;
      const probe = document.createElement('span');
      probe.textContent = 'Aa';
      body.appendChild(probe);
      const fam = getComputedStyle(probe).fontFamily;
      probe.remove();
      return {
        bodyHeight: Math.round(body.getBoundingClientRect().height),
        nodeCount: body.querySelectorAll('*').length,
        rootBox: first
          ? {
              cls: String(first.className || ''),
              w: Math.round(first.getBoundingClientRect().width),
              h: Math.round(first.getBoundingClientRect().height),
            }
          : null,
        fontFamily: fam,
      };
    });
    bodyHeight = m.bodyHeight;
    nodeCount = m.nodeCount;
    rootBox = m.rootBox;
    fontFamily = m.fontFamily;
  }

  await page.close();

  // 只看字体类失败（图片 src 多为外链/占位，不计入「自包含」判定）
  const fontFailures = failedRequests.filter((r) => /fonts?\/|\.woff2?/i.test(r.url));
  const otherFailures = failedRequests.filter((r) => !/fonts?\/|\.woff2?/i.test(r.url));

  const openable = navOk && (rootBox?.w ?? 0) > 0 && (rootBox?.h ?? 0) > 0;
  const noErrors = consoleErrors.length === 0 && pageErrors.length === 0;
  const fullySelfContained = openable && fontFailures.length === 0 && noErrors;

  const row = {
    page: name,
    url,
    openable,
    navOk,
    navError,
    rendered: { bodyHeight, nodeCount, rootBox },
    fonts: { ready: fontsReady, computedFamily: fontFamily, interApplied: /Inter/i.test(fontFamily) },
    consoleErrors,
    pageErrors,
    failedRequests: failedRequests.length,
    fontFailures,
    otherFailures,
    fullySelfContained,
  };
  rows.push(row);

  console.log(
    `${openable ? 'OPENABLE' : 'FAIL'}  ${fullySelfContained ? 'SELF-CONTAINED' : 'needs-http'}  ${name}  body=${bodyHeight}px nodes=${nodeCount} fontFail=${fontFailures.length} consoleErr=${consoleErrors.length}`,
  );
}

await browser.close();

const openableCount = rows.filter((r) => r.openable).length;
const selfContainedCount = rows.filter((r) => r.fullySelfContained).length;
const fontFailPages = rows.filter((r) => r.fontFailures.length > 0).length;

const report = {
  feature: 'FR-59 · 导出页脱离服务端（file://）实测',
  protocol: 'file://',
  pagesDir,
  total: rows.length,
  // 字面口径：能打开且渲染出结构
  openable: openableCount,
  openableAll: openableCount === rows.length,
  // 严格口径：连资源引用都无失败（当前实现不满足，因 /fonts/ 为站点绝对路径）
  fullySelfContained: selfContainedCount,
  fullySelfContainedAll: selfContainedCount === rows.length,
  pagesWithFontFailures: fontFailPages,
  conclusion: {
    openable: `file:// 可直接打开并渲染：${openableCount}/${rows.length}`,
    resources:
      fontFailPages > 0
        ? `${fontFailPages}/${rows.length} 页在 file:// 下字体引用失败（FONT_FACE_CSS 用 /fonts/ 站点绝对路径，回退系统字体栈）`
        : '无字体引用失败',
    note: '布局/样式为编译期 CSS 内联，无 JS 依赖，故脱离服务端可正常呈现；仅字体回退受影响',
  },
  suggestDiff: [
    {
      file: 'src/font.ts',
      point: 'FONT_FACE_CSS 的 src 用 `/fonts/…` 站点绝对路径，file:// 与 ZIP 相对解析均失败',
      diff: "- src:url('/fonts/inter-latin-wght-normal.woff2') format('woff2');\n+ src:url('./fonts/inter-latin-wght-normal.woff2') format('woff2');",
      note: '改相对路径后需 build-pages 把字体拷到 dist/pages/<页>/fonts/（现拷到 dist/fonts/）',
    },
  ],
  rows,
  generatedAt: new Date().toISOString(),
};
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

console.log(`\nfile:// 可打开：${openableCount}/${rows.length}`);
console.log(`严格自包含（资源零失败）：${selfContainedCount}/${rows.length}`);
if (fontFailPages) console.log(`字体引用失败页数：${fontFailPages}/${rows.length}（/fonts/ 绝对路径，file:// 下 404 → 回退系统字体）`);
console.log(`→ dist/deploy-check/report.json`);

if (openableCount !== rows.length) process.exitCode = 1;
