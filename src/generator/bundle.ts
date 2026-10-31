/**
 * FR-75 项目包：把「全部页面 × 三个可编译端」打成一份可直接解压使用的工程包。
 *
 * ## 为什么要单独一个模块
 * 这段逻辑原先长在 `CodeModal.tsx` 的 `exportBundle` 闭包里。闭包依赖 React state，
 * 脚本调不到 → `scripts/bundle-verify.ts` 只能另写一份等价逻辑，于是「验收的」和
 * 「用户点到的」是两份代码，任何一边改动都会让另一边的绿灯变成**假绿**。
 * 抽成纯函数后只有一份：UI 点按钮、脚本跑断言，走同一条路径。
 *
 * ## 与 `exportZip`（另一个导出）的分工
 *  - `exportZip`（`CodeModal.exportZip`）：**当前一页**的 Taro 单页工程 + 多页 HTML 原型
 *    + dataURL 外提资源。能看，但不能跑全站。
 *  - `buildBundleEntries`（本模块）：**全部页面** × react/taro/uniapp，各自是一份
 *    `npm i && npm run build` 可跑的工程，另附根 `manifest.json`。
 *
 * ## 三个生成器用动态 import
 * `react` / `taro-project` / `uniapp` 三个生成器加起来体积不小，而 CodeModal 是编辑器
 * 主 chunk 的一部分。动态 import 让它们落在独立 chunk，只在真正点「导出项目包」时加载。
 * 本模块自身只静态依赖 `compiler`（CodeModal 本来就已静态依赖它）。
 */
import { compilePage } from '../compiler';
import type { UIPage, UINode } from '../schema/types';
import type { GeneratedFile } from './emit-context';
import { makeEmitContext, pagePathOf } from './emit-context';
import type { FontPayload } from './react';

/**
 * 打包进项目包的目标端。
 *
 * `vue` 的定位必须说清楚，否则会被当成「vue 也能出小程序」：
 *   - `vue/` = `vite + @vitejs/plugin-vue` 的 MPA，**只能出 H5**（无小程序构建链）；
 *   - 要**用 vue3 语法出小程序**，走 `uniapp/` —— 它产出的就是 `.vue` SFC，
 *     构建链 `@dcloudio/vite-plugin-uni`，mp-weixin 已验（6/6 像素一致 + app.json 结构断言）。
 * 两条路都留着，因为「纯 H5 的 vue 工程」和「跨端 uni-app 工程」是不同交付物。
 */
export const BUNDLE_TARGETS = ['react', 'vue', 'taro', 'uniapp'] as const;
export type BundleTarget = (typeof BUNDLE_TARGETS)[number];

export interface BundleEntry {
  path: string;
  content: string | Uint8Array;
}

/** 单端清单：与 `scripts/codegen.ts` 写出的 `codegen-manifest.json` **同构** */
export interface TargetManifestPage {
  /** 输出路径（不含扩展名），如 pages/p-1 */
  path: string;
  title: string;
  /** 构建后 HTML 相对 dist 的路径 */
  html: string;
  viewport: { width: number; height: number };
  nodes: number;
}

export interface TargetManifest {
  target: string;
  generatedAt: string;
  pages: TargetManifestPage[];
  files: number;
  bytes: number;
}

/** 项目包根 `manifest.json`：人读的说明 + 页面清单 + 各端文件数 */
export interface BundleManifest {
  projectName: string;
  generatedAt: string;
  targets: { id: BundleTarget; files: number; bytes: number }[];
  pages: { name: string; path: string; viewport: { width: number; height: number }; nodes: number }[];
  notes: string[];
}

/** 节点数：与 AI 侧 `audit` 同口径（含根） */
export function countNodes(root: UINode): number {
  const kids = (root as { children?: UINode[] }).children ?? [];
  return 1 + kids.reduce((s, c) => s + countNodes(c), 0);
}

/** base64 → 字节。`createZip` 要 Uint8Array，生成器给的是 base64 字符串 */
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * 单端清单。与 `scripts/codegen.ts` 共用，避免两处推导 `html` 字段。
 *
 * `bytes` 必须由**已编码的条目**累加得到，不能拿字符串长度充数——
 * base64 条目落盘是解码后的字节，两者差 4/3。
 *
 * `target` 放宽成 string：`scripts/codegen.ts` 还会出 vue 端，那份清单与这里同构。
 */
export function buildTargetManifest(
  target: string,
  pages: UIPage[],
  files: number,
  bytes: number,
): TargetManifest {
  const metas: TargetManifestPage[] = pages.map((page, i) => {
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
  return { target, generatedAt: new Date().toISOString(), pages: metas, files, bytes };
}

/** 生成一个目标端的文件集（动态 import 见模块头注释） */
async function emitTarget(
  target: BundleTarget,
  pages: UIPage[],
  name: string,
  fonts: FontPayload[],
): Promise<GeneratedFile[]> {
  if (target === 'react') {
    const { generateReactProject } = await import('./react');
    return generateReactProject(pages, { name: `${name}-react`, fonts });
  }
  if (target === 'vue') {
    const { generateVueProject } = await import('./vue');
    return generateVueProject(pages, { name: `${name}-vue`, fonts });
  }
  if (target === 'taro') {
    const { generateTaroMultiPageProject } = await import('./taro-project');
    return generateTaroMultiPageProject(pages, { name: `${name}-taro`, fonts });
  }
  const { generateUniappProject } = await import('./uniapp');
  return generateUniappProject(pages, { name: `${name}-uniapp`, fonts });
}

export interface BundleResult {
  entries: BundleEntry[];
  manifest: BundleManifest;
}

/**
 * 构建项目包的全部 zip 条目（未压缩，交给 `createZip` 落 store 方式）。
 *
 * 目录形状（与 `scripts/project-integrity.mjs` 的 `--root` 口径一致，
 * 解压出来的目录可以直接拿去跑那六条断言）：
 *
 *   react/    pages/p-1..N  index.html  package.json  codegen-manifest.json
 *   taro/     src/pages/... （同上）
 *   uniapp/   src/pages/... （同上）
 *   manifest.json
 */
export async function buildBundleEntries(
  pages: UIPage[],
  name: string,
  fonts: FontPayload[] = [],
): Promise<BundleResult> {
  if (!pages.length) throw new Error('项目包里至少要有一页');

  const entries: BundleEntry[] = [];
  const targets: BundleManifest['targets'] = [];

  for (const target of BUNDLE_TARGETS) {
    const files = await emitTarget(target, pages, name, fonts);
    let bytes = 0;
    for (const f of files) {
      const content = f.encoding === 'base64' ? base64ToBytes(f.content) : f.content;
      bytes += typeof content === 'string' ? new TextEncoder().encode(content).length : content.length;
      entries.push({ path: `${target}/${f.path}`, content });
    }
    // 单端清单：解压后不必回看根 manifest 就知道这端有几页、每页产物路径
    const tm = buildTargetManifest(target, pages, files.length, bytes);
    entries.push({ path: `${target}/codegen-manifest.json`, content: JSON.stringify(tm, null, 2) + '\n' });
    targets.push({ id: target, files: files.length, bytes });
  }

  const manifest: BundleManifest = {
    projectName: name,
    generatedAt: new Date().toISOString(),
    targets,
    pages: pages.map((p, i) => ({
      name: p.name,
      path: pagePathOf(p, i),
      viewport: p.viewport,
      nodes: countNodes(p.root),
    })),
    notes: [
      '每个 target 目录都是一份独立工程：cd <target> && npm i && npm run build',
      'react: MPA，产物 dist/<page>/index.html',
      'vue: 仅 H5（vite + @vitejs/plugin-vue），产物 dist/<page>/index.html',
      'taro: npm run build:h5 / build:weapp',
      'uniapp: npm run build:h5 / build:mp-weixin',
      '要用 vue3 语法出小程序，请用 uniapp 端（同为 .vue SFC，已验 mp-weixin）',
      '每端的 codegen-manifest.json 记录该端页面清单与产物路径（与本包生成时一致）',
    ],
  };
  entries.push({ path: 'manifest.json', content: JSON.stringify(manifest, null, 2) + '\n' });

  return { entries, manifest };
}
