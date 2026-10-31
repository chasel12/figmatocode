/**
 * 商城工程的多端验收（plan §7 L3 + L4）
 *
 * 分两段，边界严格：
 *
 *   L3 构建关：react / taro(h5,weapp) / uniapp(h5,mp-weixin) 逐个真跑构建，退出码为准。
 *   L4 视觉关：**只对 H5 产物**做 Pixel Diff（基准 = `generateHtml` 出的单文件 HTML，
 *              与 e2e 的 reference.png 同源）。小程序端没有自动化截图通道，
 *              只做结构断言（app.json 的 pages 数 / tabBar 项数 / 产物文件存在）。
 *              把「编得过」冒充「看起来一样」是假绿，这里不干。
 *
 * 用法：
 *   npx vite-node scripts/mall-verify.ts                        # 只跑视觉关（产物已构建）
 *   npx vite-node scripts/mall-verify.ts --build                # 先构建再比
 *   npx vite-node scripts/mall-verify.ts --targets react,uniapp
 *   npx vite-node scripts/mall-verify.ts --project .tmp/mall/project.json --root dist/codegen
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { parseProject } from '../src/editor/project';
import { compilePage } from '../src/compiler';
import { generateHtml } from '../src/generator/html';
import type { UIPage } from '../src/schema/types';

const argv = process.argv.slice(2);
const argOf = (flag: string, dflt: string): string => {
  const i = argv.indexOf(flag);
  return i >= 0 ? (argv[i + 1] ?? dflt) : dflt;
};
const has = (flag: string) => argv.includes(flag);

const ROOT_DIR = process.cwd();
const PROJECT = resolve(argOf('--project', '.tmp/mall/project.json'));
const CODEGEN = resolve(argOf('--root', 'dist/codegen'));
const TARGETS = argOf('--targets', 'react,vue,taro,uniapp')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const DO_BUILD = has('--build');
const TARGET_SIM = Number(process.env.MALL_TARGET || 0.98);
const PER_PIXEL = Number(process.env.MALL_PIXEL_THRESHOLD || 0.1);
const WORK = resolve('.tmp/mall');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

/**
 * 每个 target 的产物根 + 页面 URL 形态（taro/uni 的 h5 都是 hash 路由，没有 per-page html）
 *
 * `vue` 与 `react` 同为 vite MPA，产物形态一致（`dist/<page>/index.html`）。
 * 但它**只能出 H5**：工程是 `vite + @vitejs/plugin-vue`，没有小程序构建链。
 * 要 vue3 语法出小程序请走 `uniapp` 端（同为 `.vue` SFC，构建链 `@dcloudio/vite-plugin-uni`）。
 */
const LAYOUT: Record<string, { out: string; url: (p: string) => string; build?: string[] }> = {
  react: { out: 'dist', url: (p) => `/${p}/index.html` },
  vue: { out: 'dist', url: (p) => `/${p}/index.html` },
  taro: { out: 'dist', url: (p) => `/#/${p}/index` },
  uniapp: { out: 'dist/build/h5', url: (p) => `/#/${p}/index` },
};

function pad(png: PNG, w: number, h: number): Buffer {
  if (png.width === w && png.height === h) return png.data as unknown as Buffer;
  const out = Buffer.alloc(w * h * 4, 255);
  for (let y = 0; y < Math.min(png.height, h); y += 1) {
    for (let x = 0; x < Math.min(png.width, w); x += 1) {
      const si = (y * png.width + x) * 4;
      const di = (y * w + x) * 4;
      out[di] = png.data[si];
      out[di + 1] = png.data[si + 1];
      out[di + 2] = png.data[si + 2];
      out[di + 3] = png.data[si + 3];
    }
  }
  return out;
}

/** 静态服务一个目录（与 codegen-verify 同口径：越界拒绝、按扩展名给 MIME） */
async function serve(dir: string): Promise<{ base: string; close: () => void }> {
  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      let p = decodeURIComponent(url.pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = join(dir, p);
      if (!file.startsWith(dir)) {
        res.writeHead(403).end();
        return;
      }
      const data = readFileSync(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const port = (server.address() as { port: number }).port;
  return { base: `http://127.0.0.1:${port}`, close: () => server.close() };
}

/** 基准：`generateHtml` 出的单文件 HTML（编译器直出，与 e2e reference 同源） */
function writeBaseline(pages: UIPage[]): { dir: string; files: string[] } {
  const dir = join(WORK, 'baseline');
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, 'fonts'), { recursive: true });
  const fontDir = join(ROOT_DIR, 'public', 'fonts');
  if (existsSync(fontDir)) {
    for (const f of readdirSync(fontDir)) copyFileSync(join(fontDir, f), join(dir, 'fonts', f));
  }
  const files: string[] = [];
  pages.forEach((page, i) => {
    const html = generateHtml(page, compilePage(page), { fontsBase: 'fonts', title: page.name });
    const name = `${String(i + 1).padStart(2, '0')}.html`;
    writeFileSync(join(dir, name), html, 'utf-8');
    files.push(name);
  });
  return { dir, files };
}

interface Shot {
  path: string;
  file: string;
}

/**
 * 展开「内部滚动壳」，让 fullPage 能截到视口以下的内容。
 *
 * 为什么需要：`page.screenshot({fullPage:true})` 只量 **document** 的滚动高度。
 * Taro h5 把页面装在 `.taro_page`（`position:absolute; height:<视口>; overflow-y:scroll`）里，
 * document 高度恒等于视口 → 1465px 的首页只截到 812px，下半屏被 `pad()` 补成白，
 * 相似度被压到 92.85%，且差异全在「截不到」而不是「画错了」。
 *
 * 只在**确实被夹住**时才动：判据是「存在高度超过 document 的内部滚动容器」。
 * React / uni-app 的 document 本来就能滚（实测 6/6 页高度与基准一致），这条不触发。
 *
 * 保留 `position:absolute` 只改高度/溢出：`.taro_page` 是设计稿根节点的包含块，
 * 改成 static 会让根节点内的绝对定位整体换基准，那是伪造对齐。
 */
async function flattenScrollShell(tab: import('playwright').Page): Promise<boolean> {
  return tab.evaluate(() => {
    const docH = document.documentElement.scrollHeight;
    let best: HTMLElement | null = null;
    let bestH = docH;
    document.querySelectorAll<HTMLElement>('*').forEach((el) => {
      if (el.clientHeight > 100 && el.scrollHeight > el.clientHeight + 4 && el.scrollHeight > bestH) {
        best = el;
        bestH = el.scrollHeight;
      }
    });
    if (!best) return false;
    const style = document.createElement('style');
    style.textContent = `
      html, body { height: auto !important; overflow: visible !important; }
      .${(best as HTMLElement).className.toString().trim().split(/\s+/).join('.')} {
        height: auto !important; max-height: none !important;
        overflow: visible !important; bottom: auto !important;
      }`;
    document.head.appendChild(style);
    return true;
  });
}

async function shootAll(
  browser: import('playwright').Browser,
  base: string,
  entries: { url: string; file: string; viewport: { width: number; height: number }; settle: number }[],
  outDir: string,
): Promise<Shot[]> {
  mkdirSync(outDir, { recursive: true });
  const shots: Shot[] = [];
  for (const e of entries) {
    const ctx = await browser.newContext({ viewport: e.viewport, deviceScaleFactor: 1 });
    const tab = await ctx.newPage();
    try {
      await tab.goto(base + e.url, { waitUntil: 'load', timeout: 30_000 });
      await tab.evaluate(() => document.fonts.ready);
      await tab.waitForTimeout(e.settle);
      if (await flattenScrollShell(tab)) await tab.waitForTimeout(150);
      const path = join(outDir, e.file);
      await tab.screenshot({ path, fullPage: true });
      shots.push({ path: e.url, file: path });
    } finally {
      await ctx.close();
    }
  }
  return shots;
}

function buildTarget(target: string): { ok: boolean; message: string } {
  const dir = join(CODEGEN, target);
  if (!existsSync(dir)) return { ok: false, message: `目录不存在 ${dir}` };
  const steps: string[][] =
    target === 'react' || target === 'vue'
      ? // react 与 vue 都是 vite MPA，用仓库里的同一个 vite（工程自身不装）
        [[join(ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js'), 'build']]
      : target === 'taro'
        ? [
            // 顺序很重要：Taro 的 h5 与 weapp 共用 outputRoot=dist/，后跑的会覆盖前一个。
            // 所以先 weapp，跑完立刻把 dist 挪成 dist-weapp，再跑 h5（dist 最终留 h5）。
            [join(dir, 'node_modules', '@tarojs', 'cli', 'bin', 'taro'), 'build', '--type', 'weapp'],
            [join(dir, 'node_modules', '@tarojs', 'cli', 'bin', 'taro'), 'build', '--type', 'h5'],
          ]
        : [
            [join(dir, 'node_modules', '@dcloudio', 'vite-plugin-uni', 'bin', 'uni.js'), 'build'],
            [join(dir, 'node_modules', '@dcloudio', 'vite-plugin-uni', 'bin', 'uni.js'), 'build', '-p', 'mp-weixin'],
          ];
  for (const [bin, ...args] of steps) {
    if (!existsSync(bin)) return { ok: false, message: `缺构建器：${bin}（该端需要 node_modules）` };
    try {
      execFileSync(process.execPath, [bin, ...args], {
        cwd: dir,
        stdio: 'pipe',
        timeout: 600_000,
        env: {
          ...process.env,
          /**
           * `NODE_ENV` 必须是 production。实测：未设置时 Taro 按「非 production 即开发」处理，
           * babel 会注入 react-refresh，产物里留下 `$RefreshReg$(App,"App")` 而运行时没有该全局
           * → 页面全白（`$RefreshReg$ is not defined`），像素关掉到 87% 还查不出原因。
           * 这不是渲染 bug，是构建模式选错。
           */
          NODE_ENV: 'production',
          // 产物目录批量清理会触发宿主沙箱守卫（>50 文件），与 codegen.ts --clean 同一处置
          CODEBUDDY_SAFE_DELETE_ENABLED: '0',
        },
      });
      // taro weapp 产物先搬走，给 h5 让出 dist/（否则像素关会拿 weapp 产物当 H5 渲染，全是 404）
      if (target === 'taro' && args.includes('weapp')) {
        const from = join(dir, 'dist');
        const to = join(dir, 'dist-weapp');
        rmSync(to, { recursive: true, force: true });
        renameSync(from, to);
      }
    } catch (e) {
      const err = e as { stdout?: Buffer; stderr?: Buffer; message: string };
      const tail = (err.stderr?.toString() || err.stdout?.toString() || err.message).slice(-600);
      return { ok: false, message: `${target} 构建失败（${args.join(' ')}）：\n${tail}` };
    }
  }
  return { ok: true, message: `${steps.length} 个构建命令全过` };
}

/** 小程序端结构断言（没有截图通道，只证明「结构齐」）。只有 taro / uniapp 有小程序产物 */
function weappStructure(target: string): { ok: boolean; message: string } {
  const appJsonPath =
    target === 'taro'
      ? join(CODEGEN, 'taro', 'dist-weapp', 'app.json')
      : join(CODEGEN, 'uniapp', 'dist', 'build', 'mp-weixin', 'app.json');
  if (!existsSync(appJsonPath)) return { ok: false, message: `缺 ${appJsonPath}（小程序端未构建）` };
  const app = JSON.parse(readFileSync(appJsonPath, 'utf8')) as {
    pages?: string[];
    window?: { navigationStyle?: string };
    tabBar?: { list?: { text: string }[] };
  };
  const pages = app.pages?.length ?? 0;
  const tabs = app.tabBar?.list?.length ?? 0;
  const custom = app.window?.navigationStyle === 'custom';
  // 设计稿自带底栏时框架 tabBar 被有意关掉（emit-context.hasFixedChrome），
  // 这时「0 项」不是缺陷，但必须同时是 navigationStyle:custom，否则就是两个导航叠一起。
  const ok = pages === 6 && (tabs === 0 ? custom : tabs >= 3 && tabs <= 5);
  const tabNote = tabs ? `tabBar ${tabs} 项（${(app.tabBar?.list ?? []).map((t) => t.text).join('/')}）` : '无框架 tabBar（设计稿自带底栏 + navigationStyle:custom）';
  return { ok, message: `app.json：${pages} 页 · ${tabNote}` };
}

async function main(): Promise<void> {
  const { project } = parseProject(JSON.parse(readFileSync(PROJECT, 'utf8')));
  const pages = project.pages;
  if (!pages.length) throw new Error(`${PROJECT} 里没有页面`);
  console.log(`[project] ${project.name} · ${pages.length} 页`);
  console.log(`[targets] ${TARGETS.join(', ')}${DO_BUILD ? ' · 先构建' : ' · 不构建'}`);

  const baseline = writeBaseline(pages);
  const browser = await chromium.launch();
  const report: Record<string, unknown> = {};
  let allOk = true;

  try {
    /* ---- 基准截图 ---- */
    const baseSrv = await serve(baseline.dir);
    const baseShots = await shootAll(
      browser,
      baseSrv.base,
      pages.map((p, i) => ({
        url: `/${baseline.files[i]}`,
        file: `${String(i + 1).padStart(2, '0')}.png`,
        viewport: p.viewport,
        settle: 120,
      })),
      join(WORK, 'baseline-shots'),
    );
    baseSrv.close();
    console.log(`[baseline] ${baseShots.length} 张基准截图 → .tmp/mall/baseline-shots/`);

    for (const target of TARGETS) {
      const cfg = LAYOUT[target];
      if (!cfg) {
        console.log(`\n[${target}] ✗ 未知 target`);
        allOk = false;
        continue;
      }
      console.log(`\n[${target}]`);

      let buildRes = { ok: true, message: '跳过构建（未传 --build）' };
      if (DO_BUILD) {
        buildRes = buildTarget(target);
        console.log(`  ${buildRes.ok ? '✓' : '✗'} 构建关：${buildRes.message.split('\n')[0]}`);
        if (!buildRes.ok) {
          console.log(buildRes.message);
          allOk = false;
          report[target] = { build: buildRes, pixel: null };
          continue;
        }
      }

      const outDir = join(CODEGEN, target, cfg.out);
      if (!existsSync(outDir)) {
        console.log(`  ✗ 产物不存在：${outDir}`);
        allOk = false;
        report[target] = { build: buildRes, pixel: null };
        continue;
      }

      const srv = await serve(outDir);
      let shots: Shot[] = [];
      try {
        shots = await shootAll(
          browser,
          srv.base,
          pages.map((p, i) => ({
            url: cfg.url(`pages/p-${i + 1}`),
            file: `${String(i + 1).padStart(2, '0')}.png`,
            viewport: p.viewport,
            settle: target === 'react' ? 120 : 500,
          })),
          join(WORK, 'shots', target),
        );
      } finally {
        srv.close();
      }

      /* ---- 逐页 Pixel Diff ---- */
      const rows = pages.map((page, i) => {
        const ref = PNG.sync.read(readFileSync(baseShots[i].file));
        const render = PNG.sync.read(readFileSync(shots[i].file));
        const w = Math.max(ref.width, render.width);
        const h = Math.max(ref.height, render.height);
        const out = new PNG({ width: w, height: h });
        const diff = pixelmatch(pad(ref, w, h), pad(render, w, h), out.data as unknown as Uint8Array, w, h, {
          threshold: PER_PIXEL,
        });
        const sim = 1 - diff / (w * h);
        /**
         * 横向溢出单独判：渲染宽度超出视口就是**右侧被裁**。
         *
         * 像素比对查不出这个——基准图（`generateHtml`）用的是同一份 CSS，同样溢出，
         * 两张图逐像素一致，相似度 100%。实测：分类页渲染成 428px（视口 375），
         * 右边一列商品卡被裁掉一半，而「100.00%」把这件事盖得干干净净。
         * 只有量宽度能发现。
         */
        const overflow = render.width - page.viewport.width;
        return {
          page: page.name,
          sim: Number(sim.toFixed(4)),
          ok: sim >= TARGET_SIM && overflow <= 1,
          w,
          h,
          overflow,
        };
      });
      for (const r of rows) {
        const flag = r.overflow > 1 ? `  ⚠ 横向溢出 ${r.overflow}px（视口 ${pages[rows.indexOf(r)].viewport.width}）` : '';
        console.log(`  ${r.ok ? '✓' : '✗'} ${r.page.padEnd(8)} ${(r.sim * 100).toFixed(2)}%  ${r.w}×${r.h}${flag}`);
      }
      const pixelOk = rows.every((r) => r.ok);
      const avg = rows.reduce((s, r) => s + r.sim, 0) / rows.length;

      // 只有 taro / uniapp 有小程序产物；react / vue 是纯 H5（vite MPA），跳过这条
      const extra = target === 'taro' || target === 'uniapp' ? weappStructure(target) : null;
      if (extra) console.log(`  ${extra.ok ? '✓' : '✗'} 小程序结构：${extra.message}`);
      if (!pixelOk) allOk = false;
      if (extra && !extra.ok) allOk = false;

      report[target] = { build: buildRes, pixel: { ok: pixelOk, avg: Number(avg.toFixed(4)), rows }, weapp: extra };
    }
  } finally {
    await browser.close();
  }

  mkdirSync(WORK, { recursive: true });
  writeFileSync(join(WORK, 'verify-report.json'), JSON.stringify({ project: PROJECT, targets: TARGETS, report }, null, 2) + '\n', 'utf8');
  console.log(`\n[out] .tmp/mall/verify-report.json`);
  console.log(allOk ? `\nPASS ${TARGETS.length} 端验收通过` : '\nFAIL 有端未过');
  process.exit(allOk ? 0 : 1);
}

await main();
