import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// P1-04 临时探针（验后删除）：VECTOR 锚点二次编辑真实链路。
const OUT = join(process.cwd(), 'dist', 'p104-check');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 4207;

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

const results = [];
const step = (name, ok, note = '') => {
  results.push({ name, ok, note });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${note ? '  -- ' + note : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newContext({ viewport: { width: 1500, height: 950 } }).then((c) => c.newPage());
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('dialog', (d) => d.accept());

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.editor', { timeout: 15000 });
  await sleep(500);

  // 打开含 VECTOR 的样片页（17-样片-图层种类）
  const fcPromise = page.waitForEvent('filechooser');
  await page.click('.menu-btn:has-text("文件")');
  await page.click('.menu-dropdown .menu-item:has-text("打开")');
  const fc = await fcPromise;
  await fc.setFiles(join(process.cwd(), 'dist', 'pages', '17-样片-图层种类', 'page.json'));
  await sleep(800);

  await page.click('.side-tab:has-text("图层")');
  await sleep(400);
  const vecRow = page.locator('.layer-row:has-text("钢笔路径")').first();
  const hasVec = await vecRow.count();
  step('样片页含 VECTOR 节点', hasVec > 0, `count=${hasVec}`);

  // 记录拖拽前 d 与包围盒
  const before = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    return { hasCanvas: !!document.querySelector('.konvajs-content') };
  });
  step('画布渲染', before.hasCanvas, '');

  if (hasVec) {
    await vecRow.click();
    await sleep(600);
    await page.screenshot({ path: join(OUT, '01-选中矢量.png') });

    // 用 e2e hook 读舞台变换，精确定位 VECTOR 几何（避免猜坐标）
    const view = await page.evaluate(() => window.__UIC_VIEW__?.() ?? null);
    const stageBox0 = await page.locator('.konvajs-content').boundingBox();
    step('e2e 通道可用（精确定位锚点）', !!view && !!stageBox0, `view=${JSON.stringify(view)}`);

    // 生成代码取 d 基线（关闭 Modal 后再拖拽）
    const dOf = async () => {
      await page.click('.toolbar button:has-text("生成代码")');
      await page.waitForSelector('.code-modal .code-view', { timeout: 15000 });
      await sleep(400);
      await page.click('.code-modal .tab:has-text("preview.html")');
      await sleep(500);
      const html = (await page.locator('.code-modal .code-view').innerText()) || '';
      await page.click('.code-modal .btn-ghost');
      await sleep(400);
      return (html.match(/d="([^"]+)"/) || [])[1] || '';
    };

    const d0 = await dOf();
    step('取到 VECTOR 基线 d', d0.length > 0, `d=${d0.slice(0, 48)}`);

    if (view && stageBox0) {
      // 自校准命中阶梯：构造多套锚点屏幕坐标候选，逐个试拖；只有真命中锚点才会改变 d
      //（拖整节点=平移、点空=改选中，均不改 d，天然免疫误报）。命中即停并验证 Ctrl+Z。
      const mFirst = d0.match(/M\s*(-?[\d.]+)\s+(-?[\d.]+)/);
      const selId = await page.evaluate(() => document.querySelector('.layer-row.is-selected')?.getAttribute('data-node-id') ?? null);
      const konvaInfo = await page.evaluate(() => {
        const stage = window.Konva?.stages?.[0];
        if (!stage) return null;
        const dots = stage.find('Circle').filter((c) => c.radius() < 8);
        if (!dots.length) return null;
        const p = dots[0].getAbsolutePosition();
        return { x: p.x, y: p.y, stageX: stage.x(), stageY: stage.y(), scale: stage.scaleX() };
      });
      const snap = await page.evaluate(() => window.__UIC_E2E__?.snapshot?.() ?? null);
      const deepFind = (o, id) => {
        if (!o || typeof o !== 'object' || !id) return null;
        if (Array.isArray(o)) { for (const it of o) { const f = deepFind(it, id); if (f) return f; } return null; }
        if (o.id === id) return o;
        for (const v of Object.values(o)) { const f = deepFind(v, id); if (f) return f; }
        return null;
      };
      const gNode = deepFind(snap, selId);
      const gGeom = selId ? await page.evaluate((id) => window.__UIC_E2E__?.geometryOf?.(id) ?? null, selId) : null;
      console.log(`[p104] selId=${selId} konva=${JSON.stringify(konvaInfo)} snapNode=${JSON.stringify(gNode)} geom=${JSON.stringify(gGeom)}`);

      const candidates = [];
      if (konvaInfo) {
        candidates.push({ tag: 'K1', x: stageBox0.x + konvaInfo.x, y: stageBox0.y + konvaInfo.y });
        candidates.push({ tag: 'K2', x: stageBox0.x + view.x + konvaInfo.x * view.scale, y: stageBox0.y + view.y + konvaInfo.y * view.scale });
      }
      for (const [tag, g] of [['S1', gNode], ['G1', gGeom]]) {
        if (g && mFirst) {
          const px = g.x + Number(mFirst[1]);
          const py = g.y + Number(mFirst[2]);
          candidates.push({ tag, x: stageBox0.x + view.x + px * view.scale, y: stageBox0.y + view.y + py * view.scale });
        }
      }

      let hit = null;
      for (const c of candidates) {
        await vecRow.click();
        await sleep(400);
        await page.mouse.move(c.x, c.y);
        await sleep(200);
        await page.mouse.down();
        await page.mouse.move(c.x + 45, c.y + 35, { steps: 10 });
        await page.mouse.up();
        await sleep(700);
        await page.screenshot({ path: join(OUT, `02-拖拽后-${c.tag}.png`) });
        const dTry = await dOf();
        if (dTry.length > 0 && dTry !== d0) {
          hit = c;
          await page.keyboard.press('Control+z');
          await sleep(600);
          const d2 = await dOf();
          step('锚点拖拽改变了路径', true, `${c.tag} 命中 screen=(${Math.round(c.x)},${Math.round(c.y)})，d 已变 ✓`);
          step('Ctrl+Z 撤销回到原路径', d2 === d0, d2 === d0 ? '' : `d2=${d2.slice(0, 40)}`);
          break;
        }
        console.log(`[p104] 候选 ${c.tag}(${Math.round(c.x)},${Math.round(c.y)}) 未改 d，换下一候选`);
        await page.keyboard.press('Control+z');
        await sleep(300);
      }
      if (!hit) step('锚点拖拽改变了路径', false, `候选全未命中：${candidates.map((c) => `${c.tag}@${Math.round(c.x)},${Math.round(c.y)}`).join(' ; ')}`);
    } else {
      // e2e 通道未挂载（VITE_E2E_HOOK 构建）——退化为「锚点渲染可见性」检查：
      // 选中 VECTOR 后画布应渲染锚点圆（Konva Circle），由此证明 P1-04 入口存在。
      const anchorCircles = await page.evaluate(() => {
        const stage = window.Konva?.stages?.[0];
        if (!stage) return -1;
        let n = 0;
        stage.find('Circle').forEach((c) => {
          if (c.radius() < 8) n += 1;
        });
        return n;
      });
      step('选中 VECTOR 后画布渲染锚点', anchorCircles > 0, `小半径 Circle=${anchorCircles}`);
    }
  }

  step('无页面错误', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  step('探针中断', false, e instanceof Error ? e.message : String(e));
  await page.screenshot({ path: join(OUT, '99-异常.png') }).catch(() => {});
}

await browser.close();
server.kill();
writeFileSync(join(OUT, 'result.json'), JSON.stringify({ results, errors }, null, 2), 'utf8');
const failed = results.filter((r) => !r.ok);
console.log(`\np104-check: ${results.length - failed.length}/${results.length} pass`);
if (failed.length) process.exitCode = 1;
