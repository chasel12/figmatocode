/**
 * FR-72 Vue 3 出口（docs/multi-target-codegen-plan.md §2.4 / §3 P0）
 *
 * Vue 需要独立 emitter：`<template>` 的文本是插值而非 JSX 表达式，属性名不做 camelCase，
 * 内联 SVG 保留 HTML 写法（这点比 React 省事）。但**树遍历、自闭合时机、SLICE 跳过、
 * RECTANGLE 空壳**等口径与 tsx-emitter 完全一致——三出口的 DOM 结构必须等价，像素关才可比。
 *
 * 样式：SFC 内联 `<style>`（**不加 scoped**）。
 * plan §8 把「scoped 与像素关」列为风险，缓解手段是「用 CSS Modules 或 BEM 类名替代」；
 * 我们的类名由 compiler 按节点 id 生成、天然全局唯一，且每页独立 HTML 只加载自身 CSS，
 * 故直接用普通 `<style>`——比 scoped 少一层 `[data-v-xxx]` 属性选择器，像素关变量更少。
 * （与 plan FR-72 字面口径「scoped」的偏差已报备。）
 */
import type { UINode, UIPage } from '../schema/types';
import { isContainer } from '../schema/types';
import { compilePage } from '../compiler/compile';
import { scssFromPage } from '../compiler/css-model';
import { fontFaceCss, FONT_STACK } from '../font';
import { collectFxDefs } from './html';
import { IMAGE_PLACEHOLDER_CLASS, IMAGE_PLACEHOLDER_CSS } from './imagePlaceholder';
import { svgOfVector } from './vector';
import { isShapeSvgNode, shapePathData, shapeFillOf, shapeStrokeOf } from '../compiler/shapePath';
import { assetBytes } from './zipKit';
import {
  collectAssets,
  makeEmitContext,
  deriveTabBar,
  assetPathOf,
  type AssetRef,
  type EmitContext,
  type GeneratedFile,
} from './emit-context';
import { componentNameOf } from './tsx-emitter';
import type { FontPayload } from './react';

/** Vue 的标签表是 identity：语义标签本身就是合法 HTML 标签 */
export const VUE_TAG_MAP = {};

/** Vue 模板文本：插值 + JSON 字面量，避免 `{{`/`}}` 被当插值边界 */
function vueText(text: string): string {
  return `{{ ${JSON.stringify(text)} }}`;
}

/** 单页模板（不含 <template> 外壳） */
export function emitVueTemplate(ctx: EmitContext): string {
  const classNames = new Map(ctx.compiled.nodes.map((n) => [n.id, n.className]));

  const renderNode = (node: UINode, depth: number): string => {
    const indent = '  '.repeat(depth);
    const cls = classNames.get(node.id) ?? node.id;
    const tag = ctx.tag(node);
    const idAttr = node.id === ctx.page.root.id ? ` id="${node.id}"` : '';

    if (node.type === 'TEXT') {
      return `${indent}<${tag}${idAttr} class="${cls}">${vueText(node.text)}</${tag}>`;
    }
    if (node.type === 'BUTTON') {
      return `${indent}<${tag}${idAttr} class="${cls}" type="button">${vueText(node.text)}</${tag}>`;
    }
    if (node.type === 'IMAGE') {
      const raw = node.src || '';
      const src = raw ? assetPathOf(raw, ctx.assets) : '';
      if (src) {
        if ((node.style?.imageScaleMode ?? 'FILL') === 'TILE') {
          return `${indent}<div${idAttr} class="${cls}" style="background-image:url('${src}');background-repeat:repeat;"></div>`;
        }
        return `${indent}<${tag}${idAttr} class="${cls}" src="${src}" alt="" />`;
      }
      return `${indent}<div${idAttr} class="${cls} ${IMAGE_PLACEHOLDER_CLASS}"></div>`;
    }
    if (node.type === 'SLICE') {
      return '';
    }
    if (node.type === 'VECTOR') {
      const svg = svgOfVector(node.vector, node.layout.width ?? 0, node.layout.height ?? 0, {
        className: cls,
        border: node.style?.border,
        fill: node.style?.background,
      });
      return svg ? `${indent}${svg}` : '';
    }
    if (isShapeSvgNode(node)) {
      const sp = shapePathData(node);
      if (sp) {
        const svg = svgOfVector(
          { d: sp.d, width: sp.width, height: sp.height },
          node.layout.width ?? sp.width,
          node.layout.height ?? sp.height,
          { className: cls, border: shapeStrokeOf(node.style?.border), fill: shapeFillOf(node.style) },
        );
        if (svg) return `${indent}${svg}`;
      }
      return `${indent}<div${idAttr} class="${cls}"></div>`;
    }
    if (!isContainer(node) || node.type === 'RECTANGLE') {
      return `${indent}<${tag}${idAttr} class="${cls}"></${tag}>`;
    }
    if (!node.children.length) return `${indent}<${tag}${idAttr} class="${cls}"></${tag}>`;

    const children = node.children
      .map((c) => renderNode(c, depth + 1))
      .filter(Boolean)
      .join('\n');
    return `${indent}<${tag}${idAttr} class="${cls}">\n${children}\n${indent}</${tag}>`;
  };

  return renderNode(ctx.page.root, 1);
}

/** 单页产物：`generateVue(ctx)`（plan §2.3 统一签名） */
export function generateVue(ctx: EmitContext): GeneratedFile[] {
  const dir = ctx.meta.path;
  const name = componentNameOf(ctx.meta);
  const template = emitVueTemplate(ctx);
  const css = scssFromPage(ctx.compiled);

  const sfc = `<template>
${template}
</template>

<style>
${css}</style>
`;

  const entry = `import { createApp } from 'vue'
import '../../src/global.css'
import ${name} from './${name}.vue'

createApp(${name}).mount('#root')
`;

  return [
    { path: `${dir}/index.html`, content: htmlShell(ctx.meta.title, './main.ts', collectFxDefs(ctx.page)) },
    { path: `${dir}/main.ts`, content: entry },
    { path: `${dir}/${name}.vue`, content: sfc },
  ];
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

export interface VueProjectOptions {
  name?: string;
  fonts?: FontPayload[];
  indexPage?: boolean;
}

/** 多页工程装配（脚手架 + 全部页面 + 资产 + 字体） */
export function generateVueProject(pages: UIPage[], options: VueProjectOptions = {}): GeneratedFile[] {
  const appName = options.name ?? 'ui-compiler-vue-app';
  const assets = collectAssets(pages);
  const files: GeneratedFile[] = [];
  const metas: { path: string; title: string; name: string }[] = [];

  pages.forEach((page, i) => {
    const compiled = compilePage(page);
    const ctx = makeEmitContext(page, compiled, { index: i, allPages: pages, assets });
    files.push(...generateVue(ctx));
    metas.push({ path: ctx.meta.path, title: ctx.meta.title, name: componentNameOf(ctx.meta) });
  });

  for (const a of assets) {
    files.push({
      path: `public/${a.path}`,
      content: toBase64(a),
      encoding: 'base64',
    });
  }
  for (const f of options.fonts ?? []) {
    files.push({ path: `public/fonts/${f.name}`, content: f.base64, encoding: 'base64' });
  }

  files.push(...scaffold(appName, metas, pages, Boolean(options.fonts?.length)));
  if (options.indexPage !== false) files.push({ path: 'index.html', content: rootIndex(appName, metas) });
  return files;
}

function toBase64(asset: AssetRef): string {
  const bytes = assetBytes(asset.dataUrl);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function rootIndex(appName: string, metas: { path: string; title: string }[]): string {
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

function scaffold(
  appName: string,
  metas: { path: string; title: string; name: string }[],
  pages: UIPage[],
  hasFonts: boolean,
): GeneratedFile[] {
  const inputs = metas
    .map((m) => `      '${m.path.split('/').pop()}': fileURLToPath(new URL('./${m.path}/index.html', import.meta.url)),`)
    .join('\n');
  const tabBar = deriveTabBar(pages);

  const pkg = {
    name: appName,
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview --port 4174' },
    dependencies: { vue: '^3.5.13' },
    devDependencies: {
      '@types/node': '^22.10.2',
      '@vitejs/plugin-vue': '^5.2.1',
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
      strict: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
    },
    include: ['pages', 'src', 'env.d.ts', 'vite.config.ts'],
  };

  const viteConfig = `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    // 必须显式 false：vite 默认 true，会用 rmSync 清空 outDir，本机沙箱下触发批量删除守卫
    emptyOutDir: false,
    rollupOptions: {
      input: {
${inputs}
      },
    },
  },
})
`;

  const envDts = `/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}
`;

  const globalCss = `${fontFaceCss('/fonts')}
html, body { margin: 0; padding: 0; }
body {
  font-family: ${FONT_STACK};
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
}
#root { display: contents; }
${IMAGE_PLACEHOLDER_CSS}
`;

  const readme = `# ${appName}

由 UI Compiler 生成的多页 Vue 3 工程（${metas.length} 页）。

## 运行

\`\`\`bash
npm install
npm run dev
npm run build
npm run preview
\`\`\`

## 页面

${metas.map((m) => `- \`${m.path}\` — ${m.title}（组件 \`${m.name}\`）`).join('\n')}
${tabBar ? `\n## 底部导航（由页面名推导，非设计稿信息）\n\n${tabBar.map((t) => `- ${t.text} → \`${t.pagePath}\``).join('\n')}\n` : ''}
## 说明

- 每页一个 SFC，样式内联在 \`<style>\`（**非 scoped**：类名已全局唯一，避免 \`[data-v-]\` 干扰像素比对）。
- 图片已落到 \`assets/\`，\`src\` 已改写为相对路径。
${hasFonts ? '- 字体已落到 `public/fonts/`。\n' : '- 未注入字体文件，回退系统字体栈。\n'}- 本工程只含视觉层，不含业务逻辑。
`;

  return [
    { path: 'package.json', content: JSON.stringify(pkg, null, 2) + '\n' },
    { path: 'tsconfig.json', content: JSON.stringify(tsconfig, null, 2) + '\n' },
    { path: 'vite.config.ts', content: viteConfig },
    { path: 'env.d.ts', content: envDts },
    { path: 'src/global.css', content: globalCss },
    { path: 'README.md', content: readme },
    { path: '.gitignore', content: 'node_modules\ndist\n' },
  ];
}
