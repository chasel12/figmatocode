/**
 * D2 定案测试：**真实 ZIP 导出 → 解压 → file:// 打开 → 验证字体是否真的加载**。
 *
 * 背景：`CodeModal.tsx:62-68` 只在「导出 ZIP」时用 `fontsBase: '../assets/fonts'`
 * 并把 woff2 打进 `assets/fonts/`；而模态里**展示的那份 preview.html 文本**仍用
 * 缺省 `/fonts`（站点根部署口径，供 dist/pages 与 e2e 使用）。
 *
 * 本脚本走用户真实路径（下载 ZIP），因此能回答：**交付物到底能不能脱离服务端用**。
 *
 * 运行：node scripts/_zip-verify.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('E:\\ms-playwright')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = 'E:\\ms-playwright';
}

const root = process.cwd();
const outDir = join(root, 'dist', 'zip-verify');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const PORT = 4293;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  shell: true,
  stdio: 'ignore',
});
let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  try {
    const r = await fetch(`http://localhost:${PORT}/`);
    if (r.ok) ready = true;
  } catch {}
  if (!ready) await sleep(250);
}
if (!ready) {
  server.kill();
  throw new Error('preview 未就绪');
}

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
page.on('dialog', (d) => d.accept());
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.editor', { timeout: 15000 });
await sleep(700);

// 打开一个 demo 页（含文本，便于验证字体）
const fcP = page.waitForEvent('filechooser');
await page.click('.menu-btn');
await page.click('.menu-dropdown .menu-item:has-text("打开")');
const fc = await fcP;
await fc.setFiles(join(root, 'dist', 'pages', '01-登录', 'page.json'));
await sleep(1500);

// 导出 ZIP（菜单项「导出代码 / ZIP」）
// 「导出代码 / ZIP」只打开 CodeModal，真正的下载在模态内「导出项目 ZIP」按钮
await page.click('.menu-btn');
await sleep(300);
await page.locator('.menu-dropdown .menu-item:has-text("导出代码")').first().click();
await page.waitForSelector('.code-modal', { timeout: 15000 });
await sleep(400);
const dlP = page.waitForEvent('download', { timeout: 25000 }).catch(() => null);
await page.click('.code-modal button:has-text("导出项目 ZIP")');
const dl = await dlP;
if (!dl) {
  console.log('FAIL: 未捕获 ZIP 下载');
  await browser.close();
  server.kill();
  process.exit(1);
}
const zipPath = join(outDir, 'export.zip');
await dl.saveAs(zipPath);
console.log('ZIP 已下载 →', zipPath, '文件名:', dl.suggestedFilename());
await browser.close();
server.kill();
await sleep(300);

// 解压（PowerShell Expand-Archive）
const unpack = join(outDir, 'unpacked');
execSync(
  `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${unpack}' -Force"`,
  { stdio: 'inherit' },
);

// 结构清点
const entries = execSync(`powershell -NoProfile -Command "Get-ChildItem -LiteralPath '${unpack}' -Recurse -File | ForEach-Object { $_.FullName.Substring(${unpack.length + 1}) }"`)
  .toString()
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);
const fonts = entries.filter((e) => /\.woff2?$/i.test(e));
const previewHtml = entries.find((e) => /preview[\\/]index\.html$/i.test(e)) ?? entries.find((e) => /\.html$/i.test(e));
console.log(`\nZIP 条目 ${entries.length} 个；字体 ${fonts.length} 个：`);
for (const f of fonts) console.log('  ', f);
console.log('预览页:', previewHtml ?? '(未找到)');

if (!previewHtml) {
  console.log('FAIL: ZIP 内无 html');
  process.exit(1);
}

// file:// 打开，抓 404 与实际字体加载
const b2 = await chromium.launch();
const p2 = await (await b2.newContext({ viewport: { width: 420, height: 900 } })).newPage();
const errs = [];
p2.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text());
});
p2.on('pageerror', (e) => errs.push(String(e)));
const failed = [];
p2.on('requestfailed', (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText}`));

await p2.goto('file://' + join(unpack, previewHtml).replace(/\\/g, '/'));
await sleep(1200);

const fontStatus = await p2.evaluate(async () => {
  await document.fonts.ready;
  const loaded = Array.from(document.fonts).map((f) => `${f.family}/${f.weight}=${f.status}`);
  return { count: document.fonts.size, loaded };
});
await p2.screenshot({ path: join(outDir, 'zip-preview.png'), fullPage: true });
await b2.close();

const font404 = failed.filter((u) => /\.woff2?/i.test(u));
console.log('\n=== 结果 ===');
console.log('请求失败总数:', failed.length);
console.log('字体请求失败:', font404.length, font404.slice(0, 3).join(' | '));
console.log('document.fonts.size =', fontStatus.count);
console.log('字体状态:', fontStatus.loaded.slice(0, 4).join(' ; '));
console.log('console 错误:', errs.length, errs.slice(0, 2).join(' | '));
console.log(
  font404.length === 0
    ? '\n✅ D2 定案通过：ZIP 交付物在 file:// 下字体零 404（自包含）'
    : '\n❌ D2 仍有缺口：ZIP 在 file:// 下字体请求失败',
);
