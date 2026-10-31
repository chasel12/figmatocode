import { useMemo, useState } from 'react';
import { compilePage, scssFromPage } from '../compiler';
import { generateTaroProject, generateHtml, generateReferenceHtml, generatePrototypeProject } from '../generator';
import type { UIProject } from '../schema/types';
import { resolveLayout } from '../compiler/layout';
import { createApproxMeasure } from '../compiler/measure';
import { createZip, downloadBlob } from '../utils/zip';
import { FONT_FILES } from '../font';
import { collectDataUrls, assetFor, assetBytes, rewriteEntryText } from '../generator/zipKit';
import { pagePathOf } from '../generator/emit-context';
import { buildBundleEntries } from '../generator/bundle';
import type { FontPayload } from '../generator/react';
import { useEditor } from './store';

type Tab = 'tsx' | 'scss' | 'html' | 'reference' | 'prototype' | 'bundle';

const TABS: { id: Tab; label: string }[] = [
  { id: 'tsx', label: 'index.tsx' },
  { id: 'scss', label: 'index.scss' },
  { id: 'html', label: 'preview.html' },
  { id: 'reference', label: 'reference.html' },
  { id: 'prototype', label: 'prototype.html' },
  { id: 'bundle', label: '项目包（4 端）' },
];

export function CodeModal({ onClose }: { onClose: () => void }) {
  const { state } = useEditor();
  const [tab, setTab] = useState<Tab>('tsx');

  const files = useMemo(() => {
    const compiled = compilePage(state.page);
    const geometry = resolveLayout(state.page, createApproxMeasure());
    const taro = generateTaroProject(state.page, compiled);
    const tsx = taro.find((f) => f.path.endsWith('index.tsx'))?.content ?? '';
    const scss = scssFromPage(compiled);
    const html = generateHtml(state.page, compiled);
    const reference = generateReferenceHtml(state.page, compiled, geometry);
    // FR-50：原型工程（多页 + 交互 + runtime.js）——工程侧形状由 UIProject 承载
    const project: UIProject = {
      version: 2,
      name: state.projectName || 'UI 原型',
      pages: state.pages,
      components: state.components,
      tokens: state.tokens,
      flows: [],
    };
    const protoFiles = generatePrototypeProject(project);
    const prototype = protoFiles.find((f) => f.path === 'index.html')?.content ?? '';
    return { tsx, scss, html, reference, prototype, taro, compiled, protoFiles };
  }, [state.page, state.pages, state.components, state.tokens, state.projectName]);

  /** 「项目包」页签的说明文本：把四端的跑法与页面清单直接摊开，省一次猜 */
  const bundlePreview = useMemo(() => {
    const pages = state.pages.length ? state.pages : [state.page];
    return [
      '导出项目包（4 端 · 全部页面）',
      '',
      `工程：${state.projectName || 'ui-project'}`,
      `页面：${pages.length} 个`,
      ...pages.map(
        (p, i) => `  ${pagePathOf(p, i).padEnd(14)} ${p.name}  ${p.viewport.width}×${p.viewport.height}`,
      ),
      '',
      '包内结构：',
      '  react/    MPA 工程      npm i && npm run build      → dist/<page>/index.html',
      '  vue/      Vue3 MPA 工程 npm i && npm run build      → dist/<page>/index.html（仅 H5）',
      '  taro/     Taro 工程     npm run build:h5 / build:weapp',
      '  uniapp/   uni-app 工程  npm run build:h5 / build:mp-weixin',
      '  manifest.json          页面清单 + 目标端 + 文件数',
      '',
      '点右上「导出项目包」下载 zip；每个 target 目录都能独立 npm i 后构建。',
      'vue/ 是纯 H5 工程（vite + @vitejs/plugin-vue，没有小程序构建链）；',
      '要用 vue3 语法出小程序，请用 uniapp/ —— 它产出的就是 .vue 单文件组件。',
      '注意：设计稿自带底栏时，taro/uniapp 会关闭框架 tabBar 并把导航栏设为 custom，',
      '否则 native 导航栏会把内容下推、并与设计稿底栏叠成两条。',
    ].join('\n');
  }, [state.pages, state.page, state.projectName]);

  const current =
    tab === 'tsx'
      ? files.tsx
      : tab === 'scss'
        ? files.scss
        : tab === 'html'
          ? files.html
          : tab === 'reference'
            ? files.reference
            : tab === 'bundle'
              ? bundlePreview
              : files.prototype;

  const exportZip = async () => {
    // D2 修复（2026-10-20 QA 对账）：Inter 字体随 ZIP 走 + preview 页相对基座——file:// 与子目录部署不 404；
    // 抓取失败（非 http 环境等）则回退原 '/fonts' 口径，不阻断导出。
    const fontEntries: { path: string; content: Uint8Array }[] = [];
    for (const f of FONT_FILES) {
      try {
        const res = await fetch(`/fonts/${f}`);
        if (res.ok) fontEntries.push({ path: `assets/fonts/${f}`, content: new Uint8Array(await res.arrayBuffer()) });
      } catch { /* 回退缺省绝对路径 */ }
    }
    const withFonts = fontEntries.length === FONT_FILES.length;
    const geometry = resolveLayout(state.page, createApproxMeasure());
    const htmlOut = withFonts ? generateHtml(state.page, files.compiled, { fontsBase: '../assets/fonts' }) : files.html;
    const refOut = withFonts ? generateReferenceHtml(state.page, files.compiled, geometry, { fontsBase: '../assets/fonts' }) : files.reference;
    // FR-52 断言①②（zipKit）：全工程 dataURL 图片外提 assets/，文本条目按目录深度改写相对引用
    const assets = collectDataUrls(state.pages.length ? state.pages : [state.page]).map(assetFor);
    const rw = (path: string, content: string): string => rewriteEntryText(content, path, assets);
    const zip = createZip([
      ...files.taro.map((f) => ({ ...f, content: rw(f.path, f.content) })),
      { path: 'preview/index.html', content: rw('preview/index.html', htmlOut) },
      { path: 'preview/reference.html', content: rw('preview/reference.html', refOut) },
      ...fontEntries,
      // FR-50：原型工程进 ZIP 根（含 runtime.js，仅在有交互时产出）
      ...files.protoFiles.map((f) => ({ path: `prototype/${f.path}`, content: rw(`prototype/${f.path}`, f.content) })),
      ...assets.map((a) => ({ path: a.file, content: assetBytes(a.dataUrl) })),
    ]);
    downloadBlob(zip, `${state.projectName || 'ui-project'}.zip`);
  };

  /**
   * 导出**可编译的多页工程包**（plan §6 W2）。
   *
   * 与上面 `exportZip` 的区别要说清楚，否则用户会以为两者一样：
   *  - `exportZip`：当前**一页**的 Taro 单页工程 + 多页 HTML 原型 + 资源。能看不能跑全站。
   *  - `exportBundle`：**全部页面** × 三个目标端，各自是一份 `npm i && npm run build` 可跑的工程。
   *
   * 组装逻辑在 `generator/bundle.ts`——UI 与 `scripts/bundle-verify.ts` 走同一条路径，
   * 否则「脚本验的」和「用户点到的」会是两份代码，绿灯随时变假绿。
   *
   * 三份工程各自带 assets 与字体（生成器内部已 `collectAssets`），所以这里只做目录前缀，
   * 不需要再走 `zipKit` 的 dataURL 外提——那是给「单页 + 内联 base64」场景用的。
   */
  const exportBundle = async () => {
    const name = state.projectName || 'ui-project';
    const pages = state.pages.length ? state.pages : [state.page];
    const fonts: FontPayload[] = [];
    for (const f of FONT_FILES) {
      try {
        const res = await fetch(`/fonts/${f}`);
        if (!res.ok) continue;
        const bytes = new Uint8Array(await res.arrayBuffer());
        let bin = '';
        for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
        fonts.push({ name: f, base64: btoa(bin) });
      } catch {
        /* 无 http 环境（file:// 打开）时静默降级：工程回退系统字体栈 */
      }
    }
    const { entries } = await buildBundleEntries(pages, name, fonts);
    downloadBlob(createZip(entries), `${name}-project.zip`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal code-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">生成代码 · UI AST → Taro</div>
          <div className="modal-actions">
            <button className="btn" onClick={exportZip}>
              导出项目 ZIP
            </button>
            <button className="btn" onClick={() => void exportBundle()}>
              导出项目包
            </button>
            <button className="btn" onClick={() => navigator.clipboard.writeText(current)}>
              复制当前
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <pre className="code-view">
          <code>{current}</code>
        </pre>
      </div>
    </div>
  );
}
