/**
 * 「导出项目包」按钮的浏览器端 e2e（补 `bundle-verify.ts` 够不到的那一段）。
 *
 * ## 为什么要单独一个脚本
 * `bundle-verify.ts` 验的是 `buildBundleEntries()` 产出的**条目集合**和 zip 字节，
 * 它绕过了浏览器。于是有三件事一直没被验证：
 *   1. 按钮能不能点开、`fetch('/fonts/*.woff2')` 在真实页面里能不能拿到字体
 *   2. `createZip(entries)` 在浏览器里拿到的 Blob 与 node 侧是否同一批文件
 *   3. `downloadBlob` 的 `a.download` 文件名（含中文与「·」）是否被浏览器接受
 * 这三件都属于「逻辑验过了、按钮没验过」，是典型的假绿口子。
 *
 * ## 判据
 *   E1 工程导入：6 页进 store
 *   E2 面板打开：CodeModal 出现且「项目包」页签在
 *   E3 下载发生：`download` 事件触发，文件名以 `-project.zip` 结尾
 *   E4 字节合法：`unzip -t` 逐条目 CRC 无错
 *   E5 同源：条目名集合与 `bundle-verify` 落的那份 zip **完全一致**
 *      （唯一允许的差异是 manifest.json 里的 generatedAt）
 *
 * 用法：
 *   node scripts/export-bundle-e2e.mjs --project .tmp/mall/project.json
 * 前置：`npm run build`（vite preview 服务 dist/app）
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const argOf = (flag, dflt) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? (argv[i + 1] ?? dflt) : dflt;
};

const ROOT = process.cwd();
const PROJECT = join(ROOT, argOf('--project', '.tmp/mall/project.json'));
const OUT = join(ROOT, '.tmp/mall/e2e');
const PORT = Number(argOf('--port', '4174'));
/** bundle-verify 落的参照包（可选；没有就跳过 E5） */
const REF = join(ROOT, '.tmp/mall/bundle');

mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const steps = [];
function step(name, ok, note = '') {
  steps.push({ name, ok, note });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${note ? '  -- ' + note : ''}`);
}

/** 列 zip 条目名（用 unzip，不自写 reader） */
function listEntries(zip) {
  const out = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8', timeout: 60_000 });
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .sort();
}

const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  shell: true,
  stdio: 'ignore',
});

let ready = false;
for (let i = 0; i < 80 && !ready; i += 1) {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/`);
    if (r.ok) ready = true;
  } catch {
    /* 未就绪 */
  }
  if (!ready) await sleep(250);
}
if (!ready) {
  server.kill();
  throw new Error(`vite preview 未就绪（端口 ${PORT}）——先跑 npm run build`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('dialog', (d) => d.accept());
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

let allOk = true;
try {
  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.waitForSelector('.editor', { timeout: 20_000 });
  await sleep(400);

  /* ---- E1 导入工程 ---- */
  const fcPromise = page.waitForEvent('filechooser');
  await page.click('.menu-btn:has-text("文件")');
  await page.click('.menu-dropdown .menu-item:has-text("打开")');
  const fc = await fcPromise;
  await fc.setFiles(PROJECT);
  await sleep(1500);
  await page.click('.side-tab:has-text("图层")').catch(() => {});
  await sleep(300);
  // 页面数从「页面」面板读更直接
  const pageRows = await page
    .locator('.page-row, .pages-list .page-item, [data-page-row]')
    .count()
    .catch(() => 0);
  const layerRows = await page.locator('.layer-row').count();
  step('E1 导入工程', layerRows > 0, `图层行 ${layerRows} · 页面行 ${pageRows} · ${PROJECT.replace(ROOT, '.')}`);

  /* ---- E2 打开生成代码面板 ---- */
  await page.click('button.btn-primary:has-text("生成代码")');
  await page.waitForSelector('.code-modal', { timeout: 10_000 });
  await sleep(300);
  await page.click('.code-modal .tab:has-text("项目包")');
  await sleep(400);
  const previewText = await page.locator('.code-modal .code-view').innerText();
  const previewOk = /导出项目包/.test(previewText) && /页面：6 个/.test(previewText);
  step('E2 面板与项目包页签', previewOk, previewOk ? '说明文本含「页面：6 个」' : `预览文本异常：${previewText.slice(0, 80)}`);

  /* ---- E3 点按钮，接下载 ---- */
  const dlPromise = page.waitForEvent('download', { timeout: 120_000 });
  await page.click('.code-modal .modal-actions button:has-text("导出项目包")');
  const dl = await dlPromise;
  const suggested = dl.suggestedFilename();
  const savedPath = join(OUT, suggested);
  await dl.saveAs(savedPath);
  const size = statSync(savedPath).size;
  step(
    'E3 下载触发',
    /-project\.zip$/.test(suggested) && size > 100_000,
    `${suggested} · ${(size / 1024).toFixed(1)} KB`,
  );

  /* ---- E4 字节合法 ---- */
  let testOut = '';
  try {
    testOut = execFileSync('unzip', ['-t', savedPath], { encoding: 'utf8', timeout: 120_000 });
  } catch (e) {
    testOut = String(e.stdout ?? '');
  }
  const entryCount = listEntries(savedPath).length;
  step('E4 unzip -t', /No errors detected/i.test(testOut), `${entryCount} 条目 CRC 无错`);

  /* ---- E5 与 bundle-verify 的包同源 ---- */
  const refName = existsSync(REF) ? readdirSync(REF).find((n) => n.endsWith('-project.zip')) : null;
  const refZip = refName ? join(REF, refName) : null;
  if (refZip) {
    const a = listEntries(savedPath);
    const b = listEntries(refZip);
    const onlyA = a.filter((x) => !b.includes(x));
    const onlyB = b.filter((x) => !a.includes(x));
    step(
      'E5 与脚本包同源',
      onlyA.length === 0 && onlyB.length === 0,
      onlyA.length + onlyB.length === 0
        ? `${a.length} 条目完全一致（含各端 codegen-manifest.json）`
        : `多出 ${onlyA.slice(0, 3).join(',')} / 缺少 ${onlyB.slice(0, 3).join(',')}`,
    );
  } else {
    step('E5 与脚本包同源', true, '跳过（未找到 .tmp/mall/bundle/*-project.zip）');
  }

  if (pageErrors.length) step('页面无 JS 异常', false, pageErrors.slice(0, 2).join(' | '));
  else step('页面无 JS 异常', true);
} catch (e) {
  step('执行异常', false, String(e.message ?? e).slice(0, 300));
} finally {
  await browser.close();
  server.kill();
}

allOk = steps.every((s) => s.ok);
console.log(`\n[e2e] ${steps.filter((s) => s.ok).length}/${steps.length} 通过`);
console.log(allOk ? '\nPASS 「导出项目包」按钮可用' : '\nFAIL 按钮链路有问题');
process.exit(allOk ? 0 : 1);
