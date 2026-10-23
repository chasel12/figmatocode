/**
 * FR-71 React 18 出口（docs/multi-target-codegen-plan.md §2.4 / §3 P0）
 *
 * 产物是 **多页 MPA 工程**（G2）：vite `rollupOptions.input` 按页面数动态展开，
 * 每页独立 HTML 入口，构建产物落 `dist/pages/<NN-slug>/index.html`。
 *
 * 为什么不选 react-router：MPA 的构建关与像素关都最稳——
 *   ① 每个页面是真实 HTML 文件，playwright 直接 goto，无需等待路由 hydration；
 *   ② 产物是静态站点，接入方要 SPA 时自行换 router，不被我们的路由约定绑死；
 *   ③ 少一个运行时依赖，构建失败点更少。
 *
 * 样式口径：普通 CSS（非 SCSS Modules）。类名由 compiler 生成且带节点 id 前缀，
 * 天然全局唯一；跳过 sass 依赖换取构建关稳定（与 plan FR-71 的字面口径偏差，已报备）。
 */
import type { UIPage } from '../schema/types';
import { compilePage } from '../compiler/compile';
import { scssFromPage } from '../compiler/css-model';
import { fontFaceCss, FONT_STACK } from '../font';
import { collectFxDefs } from './html';
import { assetBytes } from './zipKit';
import {
  collectAssets,
  makeEmitContext,
  pagePathOf,
  deriveTabBar,
  type AssetRef,
  type EmitContext,
  type GeneratedFile,
  type TagMap,
} from './emit-context';
import { componentNameOf, emitTsxBody } from './tsx-emitter';

/** React 的标签表是 identity：语义标签本身就是合法 DOM 标签 */
export const REACT_TAG_MAP: TagMap = {};

/** 字体二进制（由装配方注入：Node 侧读 public/fonts，浏览器侧 fetch） */
export interface FontPayload {
  /** 文件名，如 inter-latin-wght-normal.woff2 */
  name: string;
  /** base64 载荷 */
  base64: string;
}

export interface ReactProjectOptions {
  /** 工程名（package.json.name 后缀） */
  name?: string;
  /** 字体（缺省不注入 → global.css 只留系统栈，像素关会掉字体，门禁必须注入） */
  fonts?: FontPayload[];
  /** 是否输出根索引页（列出全部页面，方便人看与像素关批量导航） */
  indexPage?: boolean;
}

/** 页面文件名（meta.path 的最后一段，如 01-login） */
function dirOf(path: string): string {
  return path.split('/').pop() ?? path;
}

function htmlShell(title: string, scriptSrc: string, fxDefs: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeAttr(title)}</title>
</head>
<body>
<div id="root"></div>
${fxDefs}
<script type="module" src="${scriptSrc}"></script>
</body>
</html>
`;
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 单页产物：`generateReact(ctx)`（plan §2.3 统一签名）。
 * 返回该页的组件 + 样式 + HTML 入口 + 挂载入口。
 */
export function generateReact(ctx: EmitContext): GeneratedFile[] {
  const dir = ctx.meta.path;
  const name = componentNameOf(ctx.meta);
  const body = emitTsxBody(ctx, { rootId: ctx.page.root.id, startDepth: 2, buttonType: true });
  const fxDefs = collectFxDefs(ctx.page);

  const component = `import './page.css'

export function ${name}() {
  return (
${body}
  )
}

export default ${name}
`;

  const entry = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/global.css'
import './page.css'
import { ${name} } from './${name}'

const el = document.getElementById('root')
if (!el) throw new Error('#root not found')
createRoot(el).render(
  <StrictMode>
    <${name} />
  </StrictMode>,
)
`;

  return [
    { path: `${dir}/index.html`, content: htmlShell(ctx.meta.title, './main.tsx', fxDefs) },
    { path: `${dir}/main.tsx`, content: entry },
    { path: `${dir}/${name}.tsx`, content: component },
    { path: `${dir}/page.css`, content: scssFromPage(ctx.compiled) },
  ];
}

/** 页面入口名（vite input 的 key，用于产物命名，取 ASCII 目录名） */
function inputKey(path: string): string {
  return dirOf(path);
}

/**
 * 多页工程装配：脚手架 + 全部页面 + 资产 + 字体（plan §2.3 之外的项目级职责）。
 * 返回的文件集可直接落盘成可 `npm i && npm run build` 的工程。
 */
export function generateReactProject(
  pages: UIPage[],
  options: ReactProjectOptions = {},
): GeneratedFile[] {
  const appName = options.name ?? 'ui-compiler-react-app';
  const assets = collectAssets(pages);
  const files: GeneratedFile[] = [];
  const pageMetas: { path: string; title: string; name: string }[] = [];

  pages.forEach((page, i) => {
    const compiled = compilePage(page);
    const ctx = makeEmitContext(page, compiled, { index: i, allPages: pages, assets });
    files.push(...generateReact(ctx));
    pageMetas.push({ path: ctx.meta.path, title: ctx.meta.title, name: componentNameOf(ctx.meta) });
  });

  // 资产落盘（FR-79）：dataURL → public/assets/img-N.<ext>
  // 走 public/ 而非工程根 assets/：Vite 会把 public 资源按 base 自动改写 URL，
  // 且 SFC/JSX 里的 /assets/x 不会被当模块解析（相对路径会被 Rollup 当 import 报错）
  for (const a of assets) {
    files.push({
      path: `public/${a.path}`,
      content: toBase64(a),
      encoding: 'base64',
    });
  }

  // 字体（FR-48 同源口径）：public/fonts 供 dev/preview 的 /fonts 绝对路径
  for (const f of options.fonts ?? []) {
    files.push({ path: `public/fonts/${f.name}`, content: f.base64, encoding: 'base64' });
  }

  files.push(...scaffoldFiles(appName, pageMetas, pages, Boolean(options.fonts?.length)));

  if (options.indexPage !== false) {
    files.push({ path: 'index.html', content: rootIndexHtml(appName, pageMetas) });
  }

  return files;
}

/** AssetRef → base64 载荷（assetBytes 解码后重新编码，兼容 URI 编码的 svg） */
function toBase64(asset: AssetRef): string {
  const bytes = assetBytes(asset.dataUrl);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function rootIndexHtml(appName: string, metas: { path: string; title: string }[]): string {
  const links = metas
    .map((m) => `    <li><a href="./${m.path}/index.html">${escapeAttr(m.title)}</a> <code>${m.path}</code></li>`)
    .join('\n');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>${escapeAttr(appName)}</title>
<style>
body { font-family: ${FONT_STACK}; margin: 0; padding: 32px; color: #111; }
h1 { font-size: 18px; font-weight: 600; margin: 0 0 16px; }
ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
a { color: #0b6bcb; text-decoration: none; }
code { color: #666; font-size: 12px; margin-left: 8px; }
</style>
</head>
<body>
<h1>${escapeAttr(appName)} · ${metas.length} 页</h1>
<ul>
${links}
</ul>
</body>
</html>
`;
}

function scaffoldFiles(
  appName: string,
  metas: { path: string; title: string; name: string }[],
  pages: UIPage[],
  hasFonts: boolean,
): GeneratedFile[] {
  const inputs = metas
    .map((m) => `      '${inputKey(m.path)}': fileURLToPath(new URL('./${m.path}/index.html', import.meta.url)),`)
    .join('\n');

  const tabBar = deriveTabBar(pages);

  const pkg = {
    name: appName,
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview --port 4173',
    },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
    },
    devDependencies: {
      '@types/node': '^22.10.2',
      '@types/react': '^18.3.12',
      '@types/react-dom': '^18.3.1',
      '@vitejs/plugin-react': '^4.3.4',
      typescript: '^5.6.3',
      vite: '^5.4.11',
    },
  };

  const tsconfig = {
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      moduleDetection: 'force',
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noFallthroughCasesInSwitch: true,
    },
    include: ['pages', 'src', 'vite.config.ts'],
  };

  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  // 相对 base：产物可搬到任意子目录（file:// 或静态托管子路径均可用）
  base: './',
  build: {
    outDir: 'dist',
    // 必须显式 false：vite 的 emptyOutDir 默认就是 true，会用 rmSync 清空 outDir，
    // 在本机沙箱下触发批量删除守卫（>50 文件即拒，构建关假 FAIL）。
    // 产物靠 contenthash 覆盖写（同输入同文件名），不需要清空。
    emptyOutDir: false,
    rollupOptions: {
      input: {
${inputs}
      },
    },
  },
})
`;

  const globalCss = `${fontFaceCss('/fonts')}
html, body { margin: 0; padding: 0; }
body {
  font-family: ${FONT_STACK};
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
}
/* #root 不生成盒子：让页面根节点成为 body 的直接子元素，
   与 HTML 出口（generator/html.ts）的盒子树等价 —— 像素关的前提 */
#root { display: contents; }
.ui-image-placeholder { background: #e0e0e0; }
`;

  const readme = `# ${appName}

由 UI Compiler 生成的多页 React 工程（${metas.length} 页）。

## 运行

\`\`\`bash
npm install
npm run dev       # 开发
npm run build     # 构建到 dist/
npm run preview   # 预览构建产物
\`\`\`

## 页面

${metas.map((m) => `- \`${m.path}\` — ${m.title}（组件 \`${m.name}\`）`).join('\n')}
${tabBar ? `\n## 底部导航（由页面名推导，非设计稿信息）\n\n${tabBar.map((t) => `- ${t.text} → \`${t.pagePath}\``).join('\n')}\n` : ''}
## 说明

- 样式是普通 CSS，类名由编译器按节点 id 生成，全局唯一。
- 图片已落到 \`assets/\`，\`src\` 已改写为相对路径。
${hasFonts ? '- 字体已落到 `public/fonts/`，`global.css` 里是 `@font-face` 声明。\n' : '- 未注入字体文件，回退系统字体栈。\n'}- 本工程只含视觉层，不含业务逻辑（plan §1.2 非目标）。
`;

  return [
    { path: 'package.json', content: JSON.stringify(pkg, null, 2) + '\n' },
    { path: 'tsconfig.json', content: JSON.stringify(tsconfig, null, 2) + '\n' },
    { path: 'vite.config.ts', content: viteConfig },
    { path: 'src/global.css', content: globalCss },
    { path: 'README.md', content: readme },
    { path: '.gitignore', content: 'node_modules\ndist\n' },
  ];
}

export { pagePathOf };
