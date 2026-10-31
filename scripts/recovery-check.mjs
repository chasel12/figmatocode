/**
 * FR-60 第 4 道防线的真实浏览器验收（崩溃恢复横幅）。独立脚本，不并入 walkthrough。
 *
 * ## 两个必须踩对的坑（都踩过）
 * ① **不能用 reload 制造「上次非正常退出」** —— reload 会先触发旧页 pagehide，
 *    而 pagehide 的职责正是清标记。必须用 addInitScript 在**新上下文**预置现场。
 * ② **initScript 每次导航都会重放** —— 所以它只在 `?seed=1` 时播种，
 *    否则「正常导航后不再弹横幅」这条永远测不出来（每次都在伪造现场）。
 *
 * ## 为什么要单独锁一条「无 pageerror」
 * 曾出现「横幅能弹、点掉后整个编辑器空白」：根因不在横幅，而是 Canvas 的
 * `useElementSize` 用了不稳定的 ref 回调，横幅卸载导致容器高度 861→902，
 * 每次 commit 都同步 setSize → 嵌套更新 50 层 → React #185 → 整树卸载。
 * 只断言「editor=1」会把这种崩溃报成一句看不懂的症状，所以把 pageerror 也计入断言。
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'dist', 'recovery');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 4176;
const BASE = `http://localhost:${PORT}`;

const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  shell: true,
  stdio: 'ignore',
});
let ready = false;
for (let i = 0; i < 120 && !ready; i++) {
  try {
    const r = await fetch(`${BASE}/`);
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
const step = (name, ok, note = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${note ? '  -- ' + note : ''}`);
};

const browser = await chromium.launch();

try {
  /* ---- 1) 造一份非空 autosave ---- */
  const seedCtx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const seedPage = await seedCtx.newPage();
  await seedPage.goto(`${BASE}/`, { waitUntil: 'load' });
  await seedPage.waitForTimeout(500);
  await seedPage.click('.side-tab:has-text("资产")');
  await seedPage.click('[title="添加 框架"]');
  await seedPage.click('[title="添加 文本"]');
  await seedPage.click('.side-tab:has-text("图层")');
  await seedPage.waitForTimeout(2600);
  const seedRows = await seedPage.locator('.layer-row').count();
  const envelope = await seedPage.evaluate(() => localStorage.getItem('ui-compiler.autosave.v2'));
  step('先产生一份非空 autosave', Boolean(envelope) && seedRows > 0, `图层=${seedRows} 字节=${envelope ? envelope.length : 0}`);
  await seedCtx.close();

  /* ---- 2) 新上下文预置「上次被杀了」的现场（仅 ?seed=1 时播种） ---- */
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  await ctx.addInitScript((env) => {
    if (!location.search.includes('seed=1')) return;
    const now = Date.now();
    localStorage.setItem('ui-compiler.autosave.v2', env);
    localStorage.setItem('ui-compiler.session.v1', JSON.stringify({ at: now - 7 * 60_000, projectName: '未命名项目' }));
    const mk = (at) => `ui-compiler.snapshot.${String(at).padStart(16, '0')}`;
    const meta = [];
    for (let i = 0; i < 2; i += 1) {
      const at = now - (12 + i * 6) * 60_000;
      localStorage.setItem(mk(at), env);
      meta.push({ key: mk(at), at, projectName: '未命名项目', bytes: env.length });
    }
    localStorage.setItem('ui-compiler.snapshot.index', JSON.stringify(meta));
  }, envelope);

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));

  await page.goto(`${BASE}/?seed=1`, { waitUntil: 'load' });
  await page.waitForTimeout(800);

  const banner = page.locator('.recovery-banner');
  step('启动后出现恢复横幅', (await banner.count()) === 1);
  const text = (await banner.innerText()).replace(/\s+/g, ' ');
  step('文案含「未正常关闭」与「7 分钟前」', text.includes('未正常关闭') && text.includes('7 分钟前'), text.slice(0, 80));
  await page.screenshot({ path: join(OUT, 'banner.png'), clip: { x: 0, y: 0, width: 1500, height: 200 } });

  /* ---- 3) 只关横幅（不恢复）：编辑器必须活着 ---- */
  await page.click('.recovery-actions .btn-primary');
  await page.waitForTimeout(400);
  step('只关横幅不恢复 → 编辑器仍在', (await page.locator('.editor').count()) === 1);
  step('关横幅不触发 React 崩溃（#185 无限更新循环）', errors.length === 0, errors[0] ?? '');

  /* ---- 4) 再次带现场打开 → 展开历史快照 → 点一份恢复 ---- */
  await page.goto(`${BASE}/?seed=1`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  step('再次带现场打开 → 横幅再次出现', (await page.locator('.recovery-banner').count()) === 1);

  await page.click('.recovery-actions .btn:not(.btn-primary)');
  await page.waitForTimeout(300);
  const rows = await page.locator('.recovery-snapshot-row').count();
  step('展开后列出 2 份历史快照', rows === 2, `行数=${rows}`);
  await page.screenshot({ path: join(OUT, 'banner-open.png'), clip: { x: 0, y: 0, width: 1500, height: 330 } });

  await page.locator('.recovery-snapshot-row').first().click();
  await page.waitForTimeout(700);
  step('点快照后横幅收起', (await page.locator('.recovery-banner').count()) === 0);
  const rowsAfterRestore = await page.locator('.layer-row').count();
  step(
    '恢复快照后编辑器仍在且有内容',
    (await page.locator('.editor').count()) === 1 && rowsAfterRestore > 0,
    `图层行=${rowsAfterRestore}`,
  );
  step('恢复快照不触发 React 崩溃', errors.length === 0, errors[0] ?? '');

  /* ---- 5) 正常导航不该再弹横幅（pagehide/beforeunload 已清标记） ---- */
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const afterNav = await page.locator('.recovery-banner').count();
  step('正常导航后不再弹横幅（标记已清，不误报）', afterNav === 0, `横幅=${afterNav}`);
  await ctx.close();

  /* ---- 6) 干净启动无横幅 ---- */
  const clean = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const cleanPage = await clean.newPage();
  await cleanPage.goto(`${BASE}/`, { waitUntil: 'load' });
  await cleanPage.waitForTimeout(600);
  step('干净启动无横幅', (await cleanPage.locator('.recovery-banner').count()) === 0);
  await clean.close();
} finally {
  await browser.close();
  server.kill();
}

console.log(`\nrecovery: ${pass}/${pass + fail} pass`);
process.exit(fail === 0 ? 0 : 1);
