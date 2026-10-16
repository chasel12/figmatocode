import { useMemo, useState } from 'react';
import { compilePage, scssFromPage } from '../compiler';
import { generateTaroProject, generateHtml, generateReferenceHtml, generatePrototypeProject } from '../generator';
import type { UIProject } from '../schema/types';
import { resolveLayout } from '../compiler/layout';
import { createApproxMeasure } from '../compiler/measure';
import { createZip, downloadBlob } from '../utils/zip';
import { useEditor } from './store';

type Tab = 'tsx' | 'scss' | 'html' | 'reference' | 'prototype';

const TABS: { id: Tab; label: string }[] = [
  { id: 'tsx', label: 'index.tsx' },
  { id: 'scss', label: 'index.scss' },
  { id: 'html', label: 'preview.html' },
  { id: 'reference', label: 'reference.html' },
  { id: 'prototype', label: 'prototype.html' },
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

  const current =
    tab === 'tsx' ? files.tsx
    : tab === 'scss' ? files.scss
    : tab === 'html' ? files.html
    : tab === 'reference' ? files.reference
    : files.prototype;

  const exportZip = () => {
    const zip = createZip([
      ...files.taro,
      { path: 'preview/index.html', content: files.html },
      { path: 'preview/reference.html', content: files.reference },
      // FR-50：原型工程进 ZIP 根（含 runtime.js，仅在有交互时产出）
      ...files.protoFiles.map((f) => ({ path: `prototype/${f.path}`, content: f.content })),
    ]);
    downloadBlob(zip, `${state.projectName || 'ui-project'}.zip`);
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
