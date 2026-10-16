import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * FR-44 Present 演示模式走查（wave1-prototype-plan §3.2 验收）：
 * 配交互 → Present → 点击跳转断言页面切换 → Esc 断言遮罩卸载。
 * 另覆盖：← → 历史、R 重启、H 热区、空状态提示。
 */
const OUT = join(process.cwd(), 'dist', 'present-smoke');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PORT = 4189;
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

const log = { steps: [], errors: [] };
const step = (name, ok, note = '') => {
  log.steps.push({ name, ok, note });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${note ? '  -- ' + note : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newContext({ viewport: { width: 1500, height: 950 } }).then((c) => c.newPage());
page.on('pageerror', (e) => log.errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') log.errors.push(m.text());
});
page.on('dialog', (d) => d.accept());

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(500);

  await page.screenshot({ path: join(OUT, '01-编辑器.png') });

  // ---- 空状态：无 Frame 时 Present 应显示空状态提示（FR-44）----
  await page.click('.toolbar button:has-text("演示")');
  await sleep(500);
  const emptyShown = await page.locator('.present-empty').count();
  step('无 Frame → 空状态提示', emptyShown === 1, `present-empty=${emptyShown}`);
  await page.screenshot({ path: join(OUT, '02-空状态.png') });
  await page.keyboard.press('Escape');
  await sleep(400);
  const exitedEmpty = await page.locator('.present-overlay').count();
  step('Esc 退出演示', exitedEmpty === 0, `overlay=${exitedEmpty}`);

  // ---- 建两个 Frame 并配 NAVIGATE 交互 ----
  await page.click('.side-tab:has-text("资产")');
  await sleep(200);
  await page.click('[title="添加 Frame"]');
  await sleep(250);
  await page.click('[title="添加 Frame"]');
  await sleep(250);

  await page.click('.side-tab:has-text("图层")');
  await sleep(250);
  await page.locator('.layer-row:has-text("Frame")').first().click();
  await sleep(300);

  await page.click('.side-tab:has-text("Prototype")');
  await sleep(300);
  await page.click('.proto-add');
  await sleep(300);
  // 目标 = 第 3 个 select（触发器/动作/目标/过渡）
  const targetSel = page.locator('.proto-row select').nth(2);
  const opts = await targetSel.locator('option').allTextContents();
  const target = opts.find((o) => o.includes('Frame 2'));
  if (target) {
    await targetSel.selectOption({ label: target });
    await sleep(300);
  }
  step('配置 NAVIGATE 交互', !!target, `目标=${target ?? '未找到'}`);

  // ---- Present ----
  await page.click('.toolbar button:has-text("演示")');
  await sleep(600);
  const overlayShown = await page.locator('.present-overlay').count();
  step('Present 遮罩挂载', overlayShown === 1, `overlay=${overlayShown}`);
  await page.screenshot({ path: join(OUT, '03-演示初始.png') });

  const flowSelect = page.locator('.present-flow-select');
  const beforeVal = await flowSelect.inputValue();
  const stageBoxBefore = await page.locator('.present-frame').boundingBox();

  // H 热区：子节点用 .present-hotspot 按几何标框；根 Frame 自身挂交互用 .present-hotspot-root 整帧描边
  await page.keyboard.press('h');
  await sleep(300);
  const hotspots = (await page.locator('.present-hotspot').count()) + (await page.locator('.present-hotspot-root').count());
  await page.screenshot({ path: join(OUT, '04-热区.png') });
  step('H 显示热区', hotspots >= 1, `热区标记=${hotspots}`);

  // 点击带交互的节点 → NAVIGATE 切 Frame
  const nodeWithInter = page.locator('[data-present-node]').first();
  const hasNode = await nodeWithInter.count();
  if (hasNode) {
    await nodeWithInter.click({ force: true });
    await sleep(600);
  }
  const afterVal = await flowSelect.inputValue();
  step('点击跳转切换页面', afterVal !== beforeVal, `${beforeVal} → ${afterVal}`);
  await page.screenshot({ path: join(OUT, '05-跳转后.png') });

  // ← 返回历史
  await page.keyboard.press('ArrowLeft');
  await sleep(500);
  const backVal = await flowSelect.inputValue();
  step('← 返回历史', backVal === beforeVal, `${afterVal} → ${backVal}`);

  // R 重启
  await page.keyboard.press('r');
  await sleep(500);
  const restartVal = await flowSelect.inputValue();
  step('R 重启回起点', restartVal === beforeVal, `${backVal} → ${restartVal}`);

  // 编辑器键盘被 gate：Present 中按 Delete 不应删除节点
  await page.keyboard.press('Delete');
  await sleep(300);
  const stillPresenting = await page.locator('.present-overlay').count();
  step('Present 期间编辑器键盘让路', stillPresenting === 1, `overlay=${stillPresenting}`);

  // Esc 退出
  await page.keyboard.press('Escape');
  await sleep(500);
  const afterExit = await page.locator('.present-overlay').count();
  step('Esc 退出（遮罩卸载）', afterExit === 0, `overlay=${afterExit}`);
  await page.screenshot({ path: join(OUT, '06-退出后.png') });

  // 退出后编辑器仍可交互（键盘恢复）
  await page.click('.side-tab:has-text("图层")');
  await sleep(250);
  const layerRows = await page.locator('.layer-row').count();
  step('退出后编辑器可用', layerRows >= 3, `图层行=${layerRows}`);

  const stageBoxAfter = await page.locator('.konvajs-content').boundingBox();
  step('Stage 仍渲染', !!stageBoxAfter && stageBoxAfter.width > 0, `w=${stageBoxAfter?.width ?? 0}`);
  void stageBoxBefore;

  step('无页面错误', log.errors.length === 0, log.errors.slice(0, 3).join(' | '));
} catch (e) {
  step('走查中断', false, e instanceof Error ? e.message : String(e));
  await page.screenshot({ path: join(OUT, '99-异常.png') }).catch(() => {});
}

await browser.close();
server.kill();

writeFileSync(join(OUT, 'present-smoke-log.json'), JSON.stringify(log, null, 2), 'utf8');
const failed = log.steps.filter((s) => !s.ok);
console.log(`\npresent-smoke: ${log.steps.length - failed.length}/${log.steps.length} pass`);
if (failed.length) process.exitCode = 1;
