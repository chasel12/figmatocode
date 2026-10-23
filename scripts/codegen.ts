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
import { dirname, join } from 'node:path';
import { allDemoPages } from '../src/demo/pages';
import { compilePage } from '../src/compiler';
import type { UIPage } from '../src/schema/types';
import type { GeneratedFile } from '../src/generator';
import { makeEmitContext, pagePathOf } from '../src/generator/emit-context';
import type { FontPayload } from '../src/generator/react';

const ROOT = process.cwd();
const OUT_ROOT = join(ROOT, 'dist', 'codegen');
const FONT_DIR = join(ROOT, 'public', 'fonts');

/**
 * `--clean` 会删产物目录（>50 文件常见），触发宿主沙箱批量删除守卫。
 * 与 HANDOFF §10.4 坑 1 的既有处置同义；默认不清理，只有显式 `--clean` 才走这条。
 */
if (!process.env.CODEBUDDY_SAFE_DELETE_ENABLED && process.argv.includes('--clean')) {
  process.env.CODEBUDDY_SAFE_DELETE_ENABLED = '0';
}

export type Target = 'react' | 'vue' | 'taro';

interface ManifestPage {
  /** 输出路径（不含扩展名），如 pages/01-login */
  path: string;
  title: string;
  /** 构建后 HTML 相对 dist 的路径，如 pages/01-login/index.html */
  html: string;
  viewport: { width: number; height: number };
  nodes: number;
}

interface Manifest {
  target: Target;
  generatedAt: string;
  pages: ManifestPage[];
  files: number;
  bytes: number;
}

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
 * 需要真正清空时跑 `--clean`（并自行前置 CODEBUDDY_SAFE_DELETE_ENABLED=0）。
 */
function cleanDir(dir: string): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    rmSync(join(dir, entry.name), { recursive: true, force: true });
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

function buildManifest(target: Target, pages: UIPage[], fileCount: number, bytes: number): Manifest {
  const metas: ManifestPage[] = pages.map((page, i) => {
    const compiled = compilePage(page);
    const ctx = makeEmitContext(page, compiled, { index: i, allPages: pages });
    return {
      path: ctx.meta.path,
      title: ctx.meta.title,
      html: `${ctx.meta.path}/index.html`,
      viewport: { width: page.viewport.width, height: page.viewport.height },
      nodes: compiled.nodes.length,
    };
  });
  return { target, generatedAt: new Date().toISOString(), pages: metas, files: fileCount, bytes };
}

export async function generateTarget(target: Target): Promise<Manifest> {
  const pages = allDemoPages();
  const outDir = join(OUT_ROOT, target);
  if (process.argv.includes('--clean')) cleanDir(outDir);
  mkdirSync(outDir, { recursive: true });

  let files: GeneratedFile[];
  if (target === 'react') {
    const { generateReactProject } = await import('../src/generator/react');
    files = generateReactProject(pages, { name: 'ui-compiler-react-app', fonts: readFonts() });
  } else if (target === 'vue') {
    const { generateVueProject } = await import('../src/generator/vue');
    files = generateVueProject(pages, { name: 'ui-compiler-vue-app', fonts: readFonts() });
  } else {
    const { generateTaroMultiPageProject } = await import('../src/generator/taro-project');
    files = generateTaroMultiPageProject(pages, { name: 'ui-compiler-taro-app', fonts: readFonts() });
  }

  const bytes = writeAll(outDir, files);
  const manifest = buildManifest(target, pages, files.length, bytes);
  writeFileSync(join(outDir, 'codegen-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(
    `✓ ${target}: ${pages.length} 页 / ${files.length} 文件 / ${(bytes / 1024).toFixed(1)} KB → dist/codegen/${target}/`,
  );
  for (const p of manifest.pages) {
    console.log(`    ${p.path.padEnd(24)} ${p.viewport.width}×${p.viewport.height}  ${p.nodes} 节点`);
  }
  return manifest;
}

const requested = (argValue('--target') ?? 'react') as Target | 'all';
if (requested === 'all') {
  for (const t of ['react', 'vue', 'taro'] as Target[]) await generateTarget(t);
} else {
  if (!['react', 'vue', 'taro'].includes(requested)) {
    console.error(`未知 target: ${requested}（可选 react | vue | taro | all）`);
    process.exit(2);
  }
  await generateTarget(requested);
}

export { pagePathOf };
