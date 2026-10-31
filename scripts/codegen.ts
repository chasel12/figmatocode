/**
 * FR-75 多目标出码入口（docs/multi-target-codegen-plan.md §5.2）
 *
 *   vite-node scripts/codegen.ts --target react|vue|taro|all
 *
 * 产物落 `dist/codegen/<target>/`，每个 target 是一份**可直接 npm i && npm run build 的工程**。
 * 同时写 `dist/codegen/<target>/codegen-manifest.json`：页面清单 + 视口 + 输出路径，
 * 供 `codegen-verify.mjs` 逐页起 preview 截图（不重复推导路径）。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { allDemoPages } from '../src/demo/pages';
import { compilePage } from '../src/compiler';
import type { UIPage } from '../src/schema/types';
import type { GeneratedFile } from '../src/generator';
import { buildTargetManifest, type TargetManifest } from '../src/generator/bundle';
import { makeEmitContext, pagePathOf } from '../src/generator/emit-context';
import type { FontPayload } from '../src/generator/react';

const ROOT = process.cwd();
const OUT_ROOT = join(ROOT, 'dist', 'codegen');
const FONT_DIR = join(ROOT, 'public', 'fonts');

/**
 * `--clean` 的真相（2026-10-30 查明，此前记错了）：
 *
 * 宿主沙箱的 safe-delete shim 在**进程启动时**就把 `CODEBUDDY_SAFE_DELETE_ENABLED` 读成
 * 模块级常量（`node-safe-delete-shim.cjs:22`），所以**在本文件里改 `process.env` 是空操作**。
 * 原先这里有一句「前置打开开关」的赋值，从来没生效过 —— `--clean` 一直会撞守卫，
 * 于是 `dist/codegen/<target>/pages/` 里留着上一次的页面，而 `project-integrity` 的 A2
 * 会报「磁盘多出未声明的页面」：**症状离原因隔了三步**，很费时间。
 *
 * 现在不假装能关掉守卫，改成如实两条路（见 `cleanDir`）：
 *   - 非沙箱环境：照常删；
 *   - 删不掉：**明确报错并建议 `--out <干净目录>`**，不静默跳过。
 * 真正稳的做法本来就是 `--out`：出到新目录，不依赖删除能力。
 */

export type Target = 'react' | 'vue' | 'taro' | 'uniapp';

/**
 * 清单类型与推导逻辑都在 `src/generator/bundle.ts` —— 项目包（CodeModal「导出项目包」）
 * 也要写同构的 `codegen-manifest.json`，两处各写一份必然漂移。
 */
type Manifest = TargetManifest;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** public/fonts 全量注入（FR-48 同源同字体；缺字体像素关必挂） */
function readFonts(): FontPayload[] {
  return readdirSync(FONT_DIR)
    .filter((f) => f.endsWith('.woff2'))
    .sort()
    .map((name) => ({ name, base64: readFileSync(join(FONT_DIR, name)).toString('base64') }));
}

/**
 * 清理策略：**默认不清理，直接覆盖写**。
 *
 * 原因：产物目录里同时有 node_modules（几百 MB，删了要重装 10 分钟）和上一次构建的 dist
 * （React/Vue 的 vite `emptyOutDir` 与 Taro 的 webpack 都会自己清），递归删除还会撞上
 * 宿主沙箱的批量删除守卫（>50 文件即拒）。
 *
 * 页面路径由 `pagePathOf` 确定性推导，同输入永远同路径 → 覆盖写即可保持一致。
 * 需要真正清空时跑 `--clean`；删不掉（沙箱守卫）会**直接失败并建议 `--out`**，
 * 不在脏目录上继续 —— 否则残留页面会让下游 A2 报出与原因无关的错。
 */
function cleanDir(dir: string): void {
  if (!existsSync(dir)) return;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      rmSync(join(dir, entry.name), { recursive: true, force: true });
    }
  } catch (e) {
    console.error(
      `\n✗ --clean 失败：无法清空 ${relative(ROOT, dir).replace(/\\/g, '/')}/（${(e as Error).message.split('\n')[0]}）\n` +
        '  宿主沙箱的删除守卫在进程启动时读取开关，脚本内改环境变量无效。两条出路：\n' +
        '    · 从命令行传：CODEBUDDY_SAFE_DELETE_ENABLED=0 npx vite-node scripts/codegen.ts --clean\n' +
        '    · 或干脆不删，出到干净目录：--out .tmp/codegen\n' +
        '  在脏目录上继续会让产物里混着上一次的页面，`project-integrity` 的 A2 会误报。',
    );
    process.exit(2);
  }
}

/** 写盘：utf8 直写，base64 按字节落（图片/字体） */
function writeAll(outDir: string, files: GeneratedFile[]): number {
  let bytes = 0;
  for (const f of files) {
    const full = join(outDir, f.path);
    mkdirSync(dirname(full), { recursive: true });
    if (f.encoding === 'base64') {
      const buf = Buffer.from(f.content, 'base64');
      writeFileSync(full, buf);
      bytes += buf.byteLength;
    } else {
      writeFileSync(full, f.content, 'utf8');
      bytes += Buffer.byteLength(f.content, 'utf8');
    }
  }
  return bytes;
}

/* ------------------------------------------------------------------ */
/* FR-78 产物格式化                                                     */
/* ------------------------------------------------------------------ */

/** 扩展名 → prettier parser。没列进来的（`.html` / 无扩展名 / base64）一律跳过 */
const FORMAT_PARSER: Record<string, string> = {
  '.tsx': 'typescript',
  '.ts': 'typescript',
  '.jsx': 'babel',
  '.js': 'babel',
  '.vue': 'vue',
  '.scss': 'scss',
  '.css': 'css',
  '.json': 'json',
};

/**
 * FR-78：出码产物统一格式化。
 *
 * ## 为什么在**写盘前**格式化
 * manifest 里的 `bytes` 是写盘字节数。先写盘再格式化，这个数就与磁盘实际内容不符，
 * 而它是要进报告和 diff 的。内存里格式化只改内容、不改文件集合，字节数自然准确。
 *
 * ## 为什么跳过 `.html`
 * HTML 里标签之间的空白**是有语义的** —— inline 元素之间的空隙就来自那个换行/空格，
 * prettier 会在块级标签间插换行、把属性折行，像素关有回归风险。而三端产物 html
 * 都只是一个挂载壳（`<div id="app">` + `<script>`），本来也没有 diff 噪声。
 * **这条是取舍不是遗漏**：噪声只出在 tsx/vue/scss，收益全在那边，风险全在这边。
 *
 * ## 失败不阻断
 * 某个文件格式化抛错（语法边界、parser 缺插件）→ 记下来、原样保留未格式化内容、
 * 继续跑完其余文件。格式化是**可维护性优化**，不该让一次出码整体失败。
 */
async function formatFiles(
  files: GeneratedFile[],
): Promise<{ files: GeneratedFile[]; formatted: number; failed: string[] }> {
  let prettier: typeof import('prettier');
  try {
    prettier = await import('prettier');
  } catch {
    console.warn('    ⚠ 未安装 prettier，跳过格式化（npm i -D prettier）');
    return { files, formatted: 0, failed: [] };
  }

  const out: GeneratedFile[] = [];
  const failed: string[] = [];
  let formatted = 0;
  for (const f of files) {
    const ext = f.path.slice(f.path.lastIndexOf('.'));
    const parser = f.encoding === 'base64' ? undefined : FORMAT_PARSER[ext];
    if (!parser) {
      out.push(f);
      continue;
    }
    try {
      const code = await prettier.format(f.content, {
        parser,
        // 与仓库自身风格一致：单引号、行宽 110、无分号偏好交给默认
        singleQuote: true,
        printWidth: 110,
        tabWidth: 2,
      });
      out.push({ ...f, content: code });
      formatted += 1;
    } catch (e) {
      failed.push(`${f.path}（${(e as Error).message.split('\n')[0]}）`);
      out.push(f);
    }
  }
  return { files: out, formatted, failed };
}

function buildManifest(target: Target, pages: UIPage[], fileCount: number, bytes: number): Manifest {
  return buildTargetManifest(target, pages, fileCount, bytes);
}

export async function generateTarget(
  target: Target,
  pages: UIPage[] = allDemoPages(),
  outRoot: string = OUT_ROOT,
): Promise<Manifest> {
  const outDir = join(outRoot, target);
  if (process.argv.includes('--clean')) cleanDir(outDir);
  mkdirSync(outDir, { recursive: true });

  let files: GeneratedFile[];
  if (target === 'react') {
    const { generateReactProject } = await import('../src/generator/react');
    files = generateReactProject(pages, { name: 'ui-compiler-react-app', fonts: readFonts() });
  } else if (target === 'vue') {
    const { generateVueProject } = await import('../src/generator/vue');
    files = generateVueProject(pages, { name: 'ui-compiler-vue-app', fonts: readFonts() });
  } else if (target === 'uniapp') {
    const { generateUniappProject } = await import('../src/generator/uniapp');
    files = generateUniappProject(pages, { name: 'ui-compiler-uniapp-app', fonts: readFonts() });
  } else {
    const { generateTaroMultiPageProject } = await import('../src/generator/taro-project');
    files = generateTaroMultiPageProject(pages, { name: 'ui-compiler-taro-app', fonts: readFonts() });
  }

  // FR-78：格式化在写盘前做，manifest 的 bytes 才是磁盘真实字节数
  let formatNote = '';
  if (!process.argv.includes('--no-format')) {
    const r = await formatFiles(files);
    files = r.files;
    formatNote = ` · 格式化 ${r.formatted}`;
    if (r.failed.length) {
      formatNote += `（${r.failed.length} 个失败，已按原样写出）`;
      for (const line of r.failed.slice(0, 5)) console.warn(`    ⚠ 格式化失败 ${line}`);
    }
  }

  const bytes = writeAll(outDir, files);
  const manifest = buildManifest(target, pages, files.length, bytes);
  writeFileSync(join(outDir, 'codegen-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(
    `✓ ${target}: ${pages.length} 页 / ${files.length} 文件 / ${(bytes / 1024).toFixed(1)} KB${formatNote} → ${relative(ROOT, outDir).replace(/\\/g, '/')}/`,
  );
  for (const p of manifest.pages) {
    console.log(`    ${p.path.padEnd(24)} ${p.viewport.width}×${p.viewport.height}  ${p.nodes} 节点`);
  }
  return manifest;
}

/**
 * 页面来源。默认仍是 demo 页（**历史基线别改**，`codegen:verify` 靠它）。
 *
 * `--project <file.json>` 读编辑器「File → 保存」写出的 v2 工程格式，
 * 于是 AI 生成的整站工程也能走同一条出码链，不必先塞进 `src/demo/pages.ts`。
 */
async function loadPages(): Promise<UIPage[]> {
  const file = argValue('--project');
  if (!file) return allDemoPages();
  const abs = resolve(ROOT, file);
  if (!existsSync(abs)) {
    console.error(`--project 指向的文件不存在：${abs}`);
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(abs, 'utf8')) as unknown;
  // 动态导入：不传 --project 时这条路径根本不走（editor 侧会连带加载 react）
  const { parseProject } = await import('../src/editor/project');
  const { project } = parseProject(raw);
  if (project.pages.length === 0) {
    console.error(`--project 里没有页面：${abs}`);
    process.exit(2);
  }
  console.log(`[project] ${file} → ${project.pages.length} 页：${project.pages.map((p) => p.name).join(' / ')}`);
  return project.pages;
}

function outRootOf(): string {
  const out = argValue('--out');
  return out ? resolve(ROOT, out) : OUT_ROOT;
}

const requested = (argValue('--target') ?? 'react') as Target | 'all';
const PAGES = await loadPages();
const OUT_ROOT_ACTIVE = outRootOf();
const ALL_TARGETS: Target[] = ['react', 'vue', 'taro', 'uniapp'];
if (requested === 'all') {
  for (const t of ALL_TARGETS) await generateTarget(t, PAGES, OUT_ROOT_ACTIVE);
} else {
  if (!ALL_TARGETS.includes(requested)) {
    console.error(`未知 target: ${requested}（可选 ${ALL_TARGETS.join(' | ')} | all）`);
    process.exit(2);
  }
  await generateTarget(requested, PAGES, OUT_ROOT_ACTIVE);
}

export { pagePathOf };
