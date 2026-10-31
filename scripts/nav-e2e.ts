/**
 * 导航点击 e2e：**在真实浏览器里点底栏**，断言真的换页。
 *
 * ## 为什么单独一个脚本
 *
 * 像素关（`mall-verify`）只截图不点击，所以「跳转有没有接上」它一个字都查不出：
 * 点击不改任何渲染，加了 `onClick` 和不加，截图逐像素相同。
 * 而 `tests/fr76-navigation.test.ts` 只能证明**产物里有那行代码**，
 * 不能证明「浏览器点下去真的跳了」——中间还隔着编译、路由注册、事件绑定。
 *
 * 这个脚本补的就是那一段：产物里有跳转代码 ≠ 点了会跳。
 *
 * ## 为什么点「底栏」
 *
 * 用户报的就是底栏。底栏在 DOM 里是最外层固定元素，文案（分类 / 购物车 / 我的）
 * 在设计稿里必然存在，比「某个卡片标题」稳定得多。
 *
 * ## 起点与断言
 *
 * 首页 → 点「分类」→ 应到 `p-2`；再点「我的」→ 应到 `p-6`。
 * 第二步不是凑数：平级导航走 `reLaunch`（清栈），清栈后还能不能继续跳是另一件事，
 * 只验第一步会漏掉「第一次跳成功、之后全死」的情况。
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT_DIR = resolve('.');
const argOf = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const CODEGEN = resolve(argOf('--root', '.tmp/mall/codegen'));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

/** 静态服务（与 mall-verify 同口径：越界拒绝、按扩展名给 MIME） */
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

interface Case {
  target: string;
  /** 产物根（相对 CODEGEN/<target>） */
  out: string;
  /** 该端产物存在的证据文件（相对 out）。react/vue 的根 index.html 是源文件不参与构建，不能用它 */
  probe: string;
  /** 页面路径 → URL */
  url: (p: string) => string;
}

const CASES: Case[] = [
  {
    target: 'react',
    out: 'dist',
    probe: 'pages/p-1/index.html',
    url: (p) => `/${p}/index.html`,
  },
  {
    target: 'vue',
    out: 'dist',
    probe: 'pages/p-1/index.html',
    url: (p) => `/${p}/index.html`,
  },
  { target: 'taro', out: 'dist', probe: 'index.html', url: (p) => `/#/${p}/index` },
  { target: 'uniapp', out: 'dist/build/h5', probe: 'index.html', url: (p) => `/#/${p}/index` },
];

/** 底栏点击链：首页 → 分类 → 我的（路径用 `pages/p-N`，与 `pagePathOf` 同口径） */
const STEPS = [
  { label: '分类', to: 'p-2' },
  { label: '我的', to: 'p-6' },
];

interface Result {
  target: string;
  ok: boolean;
  message: string;
}

/**
 * 在**文字之外、格子之内**找一个可点坐标。
 *
 * ## 为什么不能直接点文字
 *
 * 上一版用 `getByText('分类').click()`，Playwright 会精确点到文字中心。
 * 而 `interactions` 恰恰是写在 TEXT 节点上的 —— 于是「热区只有 22×13 的字」
 * 这个真实缺陷被测试天然绕过了：点文字当然跳，用户点图标/空白才不跳。
 *
 * ## 怎么认「一格」
 *
 * 不能只看「向上第一层」：uniapp 的 `uni-text` 会再包一层 `span`，
 * 而 `uni-text` 自己的盒子就是文字大小（22×13），把它当格子等于没测。
 *
 * 所以判据是「**显著大于文字**」：宽 ≥ 文字宽 ×1.3 或 高 ≥ 文字高 ×1.5，
 * 且不超过视口（宽 < 60%、高 < 1/3，防止一路认到整页）。
 * 底栏格子的高度含图标，必然满足；纯文字容器不满足，会被跳过。
 */
async function pickPointOutsideText(
  el: import('playwright').Locator,
  label: string,
): Promise<{ x: number; y: number; cell: { x: number; y: number; w: number; h: number } } | null> {
  return el.evaluate((node, text) => {
    const isLeafText = (n: Element | null): boolean =>
      !!n && n.children.length === 0 && (n.textContent ?? '').trim() === text;

    const self = node.getBoundingClientRect();
    let cell: Element | null = node.parentElement;
    let rect: DOMRect | null = null;
    for (let i = 0; i < 6 && cell; i += 1) {
      const r = cell.getBoundingClientRect();
      const bigger = r.width >= self.width * 1.3 || r.height >= self.height * 1.5;
      const inViewport = r.width > 0 && r.width < innerWidth * 0.6 && r.height > 0 && r.height < innerHeight / 3;
      if (bigger && inViewport) {
        rect = r;
        break;
      }
      cell = cell.parentElement;
    }
    if (!cell || !rect) return null;

    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const inset = (v: number) => Math.min(8, v * 0.2);
    const cands: [number, number][] = [
      [cx, rect.y + inset(rect.height)],
      [rect.x + inset(rect.width), cy],
      [rect.x + rect.width - inset(rect.width), cy],
      [cx, cy],
    ];
    for (const [x, y] of cands) {
      const hit = document.elementFromPoint(x, y);
      if (!hit || !cell.contains(hit) || isLeafText(hit)) continue;
      return { x, y, cell: { x: rect.x, y: rect.y, w: rect.width, h: rect.height } };
    }
    return null;
  }, label);
}

/**
 * 等「有一段可见的该文案」。
 *
 * Taro / uni 是 SPA，hash 一变 `waitForURL` 立刻返回，但新页面还在挂载/布局，
 * 这期间文字节点存在而 `getBoundingClientRect()` 全是 0 —— 量不出格子，
 * 会被误判成「热区未上提」。所以每次点击前先等它真的有尺寸。
 */
async function waitVisibleText(page: import('playwright').Page, label: string): Promise<void> {
  await page.waitForFunction(
    (t) =>
      [...document.querySelectorAll('*')].some(
        (n) =>
          n.children.length === 0 &&
          (n.textContent ?? '').trim() === t &&
          n.getBoundingClientRect().width > 0 &&
          n.getBoundingClientRect().height > 0,
      ),
    label,
    { timeout: 15_000 },
  );
}

async function runCase(browser: import('playwright').Browser, c: Case): Promise<Result> {
  const dir = join(CODEGEN, c.target, c.out);
  if (!existsSync(join(dir, c.probe))) {
    return { target: c.target, ok: false, message: `产物不存在（先跑 mall-verify --build）：${dir}` };
  }
  const srv = await serve(dir);
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await page.goto(srv.base + c.url('pages/p-1'), { waitUntil: 'load', timeout: 30_000 });
    // 等 React/Vue/uni 挂载完：底栏文案是设计稿里的，挂载后才有
    await page.getByText(STEPS[0].label, { exact: true }).first().waitFor({ timeout: 15_000 });

    const done: string[] = [];
    for (const step of STEPS) {
      await waitVisibleText(page, step.label);
      /**
       * 从后往前找**可见**的那个：
       *  - 底栏在 DOM 末尾（FIXED 元素通常最后绘制），而页面正文里也可能出现同名词；
       *  - Taro 是 SPA 且保留页面栈，跳转后**上一页的 DOM 可能还在**（隐藏），
       *    直接 `.last()` 会取到隐藏元素，量出来全是 0。
       * `pickPointOutsideText` 对 0 尺寸返回 null，正好用来跳过不可见的。
       */
      const all = page.getByText(step.label, { exact: true });
      const n = await all.count();
      let pt: Awaited<ReturnType<typeof pickPointOutsideText>> = null;
      for (let i = n - 1; i >= 0 && !pt; i -= 1) pt = await pickPointOutsideText(all.nth(i), step.label);
      if (!pt) throw new Error(`「${step.label}」热区未上提：${n} 个同名节点里找不到文字以外的可点位置`);
      await page.mouse.click(pt.x, pt.y);
      await page.waitForURL((u) => u.href.includes(`/${step.to}/`), { timeout: 10_000 });
      const ratio = (pt.cell.w * pt.cell.h).toFixed(0);
      done.push(`${step.label}→${step.to}(格子${ratio}px²)`);
    }
    const bad = errors.length ? ` · JS 异常 ${errors.length} 条` : '';
    return { target: c.target, ok: errors.length === 0, message: `${done.join(' · ')}${bad}` };
  } catch (e) {
    const u = page.url();
    return { target: c.target, ok: false, message: `失败于 ${u} — ${String(e).split('\n')[0].slice(0, 120)}` };
  } finally {
    await page.close();
    srv.close();
  }
}

async function main(): Promise<void> {
  console.log(`[nav-e2e] 产物根：${CODEGEN}`);
  const browser = await chromium.launch();
  const results: Result[] = [];
  try {
    for (const c of CASES) results.push(await runCase(browser, c));
  } finally {
    await browser.close();
  }

  console.log('\n[nav-e2e] 底栏点击');
  for (const r of results) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.target.padEnd(8)} ${r.message}`);
  }
  const allOk = results.every((r) => r.ok);
  console.log(allOk ? `\nPASS ${results.length} 端底栏可点` : '\nFAIL 有端点击未跳转');
  process.exitCode = allOk ? 0 : 1;
}

void main();
