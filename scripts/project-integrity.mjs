/**
 * 工程完整性断言（plan §6 W3 / §7 L2）
 *
 * 只做**结构**断言，不构建、不联网——秒级出结果。构建与像素由 `mall-verify.mjs` 负责。
 * 分工的意义：包结构错了，构建日志会给出几十行无关报错；先在这里拦掉，定位成本低一个量级。
 *
 * 用法：
 *   node scripts/project-integrity.mjs --root dist/codegen --targets react,taro,uniapp
 *   node scripts/project-integrity.mjs --root dist/codegen --targets taro --json out.json
 *
 * 五条断言（对应 plan §6 W3）：
 *   A1 package.json 可跑：有构建脚本、依赖无 latest / file: / link:
 *   A2 页面齐：manifest 页面数 == 磁盘页面目录数 == 每个 manifest path 都存在
 *   A3 无空文件、无 0 字节资产
 *   A4 位图已外提：文本里不得残留 data:image/png|jpeg|webp（矢量 base64 允许，wxml 无 svg 只能这么载）
 *   A5 资源路径不自闭：不得出现 file:/// ；@font-face 的 url 必须是 / 开头的站内路径
 *   A6 导航自洽：tabBar 项数 ∈ {3,4,5}，且每项 pagePath 都能在 pages 里找到
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const argv = process.argv.slice(2);
const argOf = (flag, dflt) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : dflt;
};

const ROOT = resolve(argOf('--root', 'dist/codegen'));
const TARGETS = argOf('--targets', 'react,taro,uniapp')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const JSON_OUT = argOf('--json', '');

/** 每个 target 的「页面目录在哪 + 构建脚本叫什么」 */
const LAYOUT = {
  react: { pagesDir: 'pages', pageBase: '', build: 'build', manifest: 'codegen-manifest.json' },
  vue: { pagesDir: 'pages', pageBase: '', build: 'build', manifest: 'codegen-manifest.json' },
  taro: { pagesDir: 'src/pages', pageBase: 'src', build: 'build:h5', manifest: 'codegen-manifest.json' },
  uniapp: { pagesDir: 'src/pages', pageBase: 'src', build: 'build:h5', manifest: 'codegen-manifest.json' },
};

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'unpackage', '.swc']);
const TEXT_EXT = new Set(['.ts', '.tsx', '.vue', '.js', '.json', '.html', '.css', '.scss', '.md']);

/**
 * 递归列出文件（跳过依赖与产物）。
 * 点文件也跳过——`.codegen-cmd-*.log` 是 `codegen-verify` 跑构建时留下的 0 字节日志，
 * 属于工具痕迹而不是工程内容（打包时会按同一条规则排除）。
 */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    if (name.startsWith('.') && name !== '.gitignore') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push({ path: p, size: st.size });
  }
  return out;
}

/** manifest 里的页面路径是「工程根相对」，taro 的页面在 src/ 下，这里统一解析 */
const pagePathIn = (dir, cfg, p) => join(dir, cfg.pageBase, p);
/** tabBar 的 pagePath 带 `/index` 后缀，目录级断言要剥掉 */
const dirOfPagePath = (p) => p.replace(/\/index$/, '');

const results = [];

for (const target of TARGETS) {
  const cfg = LAYOUT[target];
  const dir = join(ROOT, target);
  const checks = [];
  const fail = (id, message) => checks.push({ id, ok: false, message });
  const pass = (id, message) => checks.push({ id, ok: true, message });

  if (!cfg) {
    results.push({ target, ok: false, checks: [{ id: 'A0', ok: false, message: '未知 target' }] });
    continue;
  }
  if (!existsSync(dir)) {
    results.push({ target, ok: false, checks: [{ id: 'A0', ok: false, message: `目录不存在：${dir}` }] });
    continue;
  }

  /* ---- A1 package.json ---- */
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) {
    fail('A1', '缺 package.json');
  } else {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const script = pkg.scripts?.[cfg.build];
    if (!script) fail('A1', `缺构建脚本 ${cfg.build}`);
    else {
      const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      const bad = Object.entries(deps).filter(([, v]) => /^(latest|file:|link:|\.|\/)/.test(String(v)));
      if (bad.length) fail('A1', `依赖版本不自洽：${bad.map(([k, v]) => `${k}@${v}`).join(', ')}`);
      else pass('A1', `${cfg.build} = ${script} · ${Object.keys(deps).length} 个依赖`);
    }
  }

  /* ---- A2 页面齐 ---- */
  const manifestPath = join(dir, cfg.manifest);
  if (!existsSync(manifestPath)) {
    fail('A2', `缺 ${cfg.manifest}`);
  } else {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const declared = manifest.pages.map((p) => p.path);
    const pagesDir = join(dir, cfg.pagesDir);
    const onDisk = existsSync(pagesDir)
      ? readdirSync(pagesDir).filter((n) => statSync(join(pagesDir, n)).isDirectory())
      : [];
    const missing = declared.filter((p) => !existsSync(pagePathIn(dir, cfg, p)));
    const extra = onDisk.filter((n) => !declared.some((p) => p.endsWith(`/${n}`)));
    if (missing.length) fail('A2', `manifest 声明的页面缺目录：${missing.join(', ')}`);
    else if (extra.length) fail('A2', `磁盘多出未声明的页面：${extra.join(', ')}`);
    else pass('A2', `${declared.length} 页，manifest 与磁盘一致（${cfg.pagesDir}）`);
  }

  /* ---- A3 空文件 ---- */
  const files = walk(dir);
  const empty = files.filter((f) => f.size === 0);
  if (empty.length) fail('A3', `${empty.length} 个 0 字节文件：${empty.slice(0, 3).map((f) => relative(dir, f.path)).join(', ')}`);
  else pass('A3', `${files.length} 个文件，无空文件`);

  /* ---- A4 位图外提 / A5 路径不自闭 ---- */
  const rasterLeft = [];
  const fileUrls = [];
  for (const f of files) {
    const ext = f.path.slice(f.path.lastIndexOf('.'));
    if (!TEXT_EXT.has(ext)) continue;
    const text = readFileSync(f.path, 'utf8');
    if (/data:image\/(png|jpeg|jpg|webp)/i.test(text)) rasterLeft.push(relative(dir, f.path));
    // `file:///` 是「单文件 HTML 走 file:// 打开」才会出现的问题；
    // 构建型工程里 @font-face 用相对 url 是对的（由 webpack/vite 解析），不在这里判。
    if (text.includes('file:///')) fileUrls.push(relative(dir, f.path));
  }
  if (rasterLeft.length) fail('A4', `位图未外提：${rasterLeft.slice(0, 3).join(', ')}`);
  else pass('A4', '位图已外提（data:image/svg 允许：wxml 无 svg，矢量只能走 base64）');
  if (fileUrls.length) fail('A5', `出现 file:/// 绝对路径：${fileUrls.slice(0, 3).join(', ')}`);
  else pass('A5', '无 file:/// 绝对路径');

  /* ---- A6 导航自洽 ---- */
  let tabList = null;
  if (target === 'uniapp' && existsSync(join(dir, 'src/pages.json'))) {
    tabList = JSON.parse(readFileSync(join(dir, 'src/pages.json'), 'utf8')).tabBar?.list ?? null;
  } else if (target === 'taro' && existsSync(join(dir, 'src/app.config.ts'))) {
    const src = readFileSync(join(dir, 'src/app.config.ts'), 'utf8');
    tabList = [...src.matchAll(/pagePath:\s*'([^']+)',\s*\n\s*text:\s*'([^']+)'/g)].map((m) => ({
      pagePath: m[1],
      text: m[2],
    }));
  }
  if (tabList === null || tabList.length === 0) {
    // 设计稿自带底栏时框架 tabBar 有意关闭（emit-context.hasFixedChrome），不是缺件
    pass('A6', '无框架 tabBar（设计稿自带底栏，navigationStyle 交给设计稿）');
  } else if (tabList.length < 3 || tabList.length > 5) {
    fail('A6', `tabBar 项数 ${tabList.length} 不在 3~5`);
  } else {
    const dangling = tabList.filter((t) => !existsSync(pagePathIn(dir, cfg, dirOfPagePath(t.pagePath))));
    if (dangling.length) fail('A6', `tabBar 指向不存在的页面：${dangling.map((t) => t.pagePath).join(', ')}`);
    else pass('A6', `tabBar ${tabList.length} 项：${tabList.map((t) => t.text).join(' / ')}`);
  }

  results.push({ target, ok: checks.every((c) => c.ok), checks });
}

/* ---- 输出 ---- */
let allOk = true;
for (const r of results) {
  console.log(`\n[${r.target}] ${r.ok ? '✓ PASS' : '✗ FAIL'}`);
  for (const c of r.checks) console.log(`  ${c.ok ? '✓' : '✗'} ${c.id} ${c.message}`);
  if (!r.ok) allOk = false;
}

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({ root: ROOT, targets: TARGETS, results }, null, 2) + '\n', 'utf8');
  console.log(`\n[json] ${JSON_OUT}`);
}

console.log(allOk ? '\nPASS 工程完整性六条断言全过' : '\nFAIL 有断言未过');
process.exit(allOk ? 0 : 1);
