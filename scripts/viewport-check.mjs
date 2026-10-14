import { chromium } from 'playwright';
import { readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// FR-6 多视口自动检查：375 / 390 / 414 / 768 下生成页
//   判据1：无横向溢出（scrollWidth ≤ clientWidth）
//   判据2：无元素重叠（同父级、双方非 position:absolute 的兄弟元素矩形交叠 > 2px；
//           absolute 视为设计性叠加（badge/浮层），不计入）
// 可用 VPAGES_DIR 环境变量指向其它页面目录（如故障样例）
const root = process.cwd();
const pagesDir = process.env.VPAGES_DIR ? resolve(root, process.env.VPAGES_DIR) : join(root, 'dist', 'pages');
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 768, height: 1024 },
];
const TOLERANCE = 1;

const dirs = readdirSync(pagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const browser = await chromium.launch();
const results = [];
let failCount = 0;

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  for (const name of dirs) {
    const page = await context.newPage();
    await page.goto(pathToFileURL(resolve(join(pagesDir, name, 'index.html'))).href);
    await page.evaluate(() => document.fonts.ready);
    const detail = await page.evaluate(() => {
      const doc = document.documentElement;
      const clientW = doc.clientWidth;
      const offenders = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > clientW + 1 || r.left < -1)) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className || '').slice(0, 60),
            left: Math.round(r.left),
            right: Math.round(r.right),
          });
          if (offenders.length >= 5) break;
        }
      }
      const overlaps = [];
      for (const parent of document.querySelectorAll('body *')) {
        const kids = [...parent.children];
        for (let i = 0; i < kids.length && overlaps.length < 5; i++) {
          for (let j = i + 1; j < kids.length && overlaps.length < 5; j++) {
            const a = kids[i];
            const b = kids[j];
            if (getComputedStyle(a).position === 'absolute' || getComputedStyle(b).position === 'absolute') continue;
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
            const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
            if (w > 2 && h > 2) {
              overlaps.push({
                a: `${a.tagName.toLowerCase()}.${String(a.className || '').slice(0, 40)}`,
                b: `${b.tagName.toLowerCase()}.${String(b.className || '').slice(0, 40)}`,
                area: Math.round(w * h),
              });
            }
          }
        }
        if (overlaps.length >= 5) break;
      }
      return { scrollWidth: doc.scrollWidth, clientWidth: clientW, offenders, overlaps };
    });
    const overflowPass = detail.scrollWidth <= detail.clientWidth + TOLERANCE;
    const overlapPass = detail.overlaps.length === 0;
    const pass = overflowPass && overlapPass;
    if (!pass) failCount += 1;
    results.push({ page: name, viewport: `${vp.width}x${vp.height}`, pass, overflowPass, overlapPass, ...detail });
    await page.close();
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${vp.width}px  scrollW=${detail.scrollWidth}/${detail.clientWidth}  overlap=${detail.overlaps.length}  ${name}`);
    if (!overflowPass) {
      for (const o of detail.offenders) console.log(`       -> overflow <${o.tag} class="${o.cls}"> x:[${o.left}, ${o.right}]`);
    }
    if (!overlapPass) {
      for (const o of detail.overlaps) console.log(`       -> overlap <${o.a}> x <${o.b}>  ${o.area}px²`);
    }
  }
  await context.close();
}

await browser.close();

const report = {
  pagesDir,
  viewports: VIEWPORTS.map((v) => `${v.width}x${v.height}`),
  criteria: ['no-horizontal-overflow', 'no-flow-sibling-overlap'],
  total: results.length,
  pass: results.length - failCount,
  fail: failCount,
  results,
};
writeFileSync(join(pagesDir, 'viewport-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(`\nviewport check: ${results.length - failCount}/${results.length} pass`);
if (failCount > 0) process.exitCode = 1;
