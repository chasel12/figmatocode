import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// FR-60 未保存守卫的真实浏览器验收（独立脚本，不并入 walkthrough）
const OUT = join(process.cwd(), 'dist', 'walkthrough');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn('npm', ['run', 'preview', '--', '--port', '4175', '--strictPort'], {
  shell: true,
  stdio: 'ignore',
});
let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  try {
    const r = await fetch('http://localhost:4175/');
    if (r.ok) ready = true;
  } catch {
    /* 未就绪 */
  }
  if (!ready) await sleep(250);
}
if (!ready) {
  server.kill();
  throw new Error('vite preview 未就绪');
}

let pass = 0;
let fail = 0;
function step(name, ok, note = '') {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${note ? '  -- ' + note : ''}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();

const dot = () => page.locator('.title-dirty-dot').count();
const modal = () => page.locator('.unsaved-modal').count();

/** 用 Palette 加一个矩形（一定改 state，制造脏）；等过防抖窗口再返回 */
async function makeDirty() {
  await page.click('.side-tab:has-text("资产")');
  await sleep(150);
  await page.click('.palette-item[title="添加 矩形"]');
  await sleep(800); // 脏标记在 500ms 防抖窗口后重算
}

async function layerCount() {
  await page.click('.side-tab:has-text("图层")');
  await sleep(150);
  return page.locator('.layer-row').count();
}

try {
  await page.goto('http://localhost:4175/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(900);

  // ① 初始干净
  step('初始（刚载入/刚保存）无脏点', (await dot()) === 0, `脏点=${await dot()}`);

  // ② 编辑 → 脏点出现
  await makeDirty();
  const layersBefore = await layerCount();
  step('编辑后出现脏点', (await dot()) === 1, `脏点=${await dot()}，图层=${layersBefore}`);

  // ③ 脏时点「新建项目」被拦，弹三按钮
  await page.click('.menu-btn:has-text("文件")');
  await page.click('.menu-item:has-text("新建项目")');
  await sleep(400);
  const buttons = await page.locator('.unsaved-actions .btn').allInnerTexts();
  step('脏时点「新建项目」弹三按钮弹窗', (await modal()) === 1 && buttons.length === 3, `按钮=${buttons.join('/')}`);

  // ④ 取消 → 弹窗关闭、内容不变、仍脏
  await page.click('.unsaved-actions .btn:has-text("取消")');
  await sleep(400);
  const layersAfterCancel = await layerCount();
  const dotAfterCancel = await dot();
  step(
    '选「取消」：弹窗关闭 / 内容不变 / 仍脏',
    (await modal()) === 0 && layersAfterCancel === layersBefore && dotAfterCancel === 1,
    `图层 ${layersBefore}→${layersAfterCancel}，脏点=${dotAfterCancel}`,
  );

  // ⑤ 再点 → 不保存 → 意图执行（工程被重置为空白页）、脏点归零
  await page.click('.menu-btn:has-text("文件")');
  await page.click('.menu-item:has-text("新建项目")');
  await sleep(300);
  await page.click('.unsaved-actions .btn:has-text("不保存")');
  await sleep(900);
  const layersAfterDiscard = await layerCount();
  const dotAfterDiscard = await dot();
  step(
    '选「不保存」：意图执行（工程重置）且脏点归零',
    layersAfterDiscard < layersBefore && dotAfterDiscard === 0,
    `图层 ${layersBefore}→${layersAfterDiscard}，脏点=${dotAfterDiscard}`,
  );

  // ⑥ 回滚点已留下（「不保存」= 可找回）
  const rollbackLen = await page.evaluate(() => (localStorage.getItem('ui-compiler.autosave.v2.prev') ?? '').length);
  step('「不保存」留下回滚点', rollbackLen > 100, `prev 长度=${rollbackLen}`);

  // ⑦ Ctrl+S 被接住：产生下载 + 脏点归零
  await makeDirty();
  const dotBeforeSave = await dot();
  const dl = page.waitForEvent('download', { timeout: 6000 }).catch(() => null);
  await page.keyboard.press('Control+s');
  const file = await dl;
  await sleep(700);
  const dotAfterSave = await dot();
  step(
    'Ctrl+S：接住快捷键（不弹浏览器保存网页）并落盘、脏点归零',
    !!file && dotBeforeSave === 1 && dotAfterSave === 0,
    `下载=${file ? file.suggestedFilename() : '无'}，脏点 ${dotBeforeSave}→${dotAfterSave}`,
  );

  // ⑧ 自动保存随编辑增长（关标签页不丢）
  const lenBefore = await page.evaluate(() => (localStorage.getItem('ui-compiler.autosave.v2') ?? '').length);
  await makeDirty();
  await sleep(600);
  const lenAfter = await page.evaluate(() => (localStorage.getItem('ui-compiler.autosave.v2') ?? '').length);
  step('编辑后自动保存体积增长（内容真的落盘了）', lenAfter > lenBefore, `autosave ${lenBefore}→${lenAfter}`);

  // ⑨ 脏时刷新 → beforeunload 被触发，且落盘数据不丢
  let dialogSeen = false;
  page.on('dialog', async (d) => {
    dialogSeen = d.type() === 'beforeunload';
    await d.accept(); // 接受「离开」：验证落盘兜底让「离开」不再丢数据
  });
  const beforeReload = await page.evaluate(() => (localStorage.getItem('ui-compiler.autosave.v2') ?? '').length);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1200);
  const afterReload = await page.evaluate(() => (localStorage.getItem('ui-compiler.autosave.v2') ?? '').length);
  step(
    '脏时刷新：触发 beforeunload 且落盘数据不丢',
    dialogSeen && afterReload >= beforeReload,
    `dialog=${dialogSeen}，autosave ${beforeReload}→${afterReload}`,
  );

  await page.screenshot({ path: join(OUT, 'fr60-unsaved-guard.png') });
} finally {
  await browser.close();
  server.kill();
}

console.log(`\nfr60: ${pass}/${pass + fail} pass`);
process.exit(fail === 0 ? 0 : 1);
