import { useMemo, useState } from 'react';
import { compilePage, scssFromPage } from '../compiler';
import { generateTaroProject, generateHtml, generateReferenceHtml } from '../generator';
import { resolveLayout } from '../compiler/layout';
import { createApproxMeasure } from '../compiler/measure';
import { createZip, downloadBlob } from '../utils/zip';
import { useEditor } from './store';

type Tab = 'tsx' | 'scss' | 'html' | 'reference';

const TABS: { id: Tab; label: string }[] = [
  { id: 'tsx', label: 'index.tsx' },
  { id: 'scss', label: 'index.scss' },
  { id: 'html', label: 'preview.html' },
  { id: 'reference', label: 'reference.html' },
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
    return { tsx, scss, html, reference, taro, compiled };
  }, [state.page]);

  const current = files[tab === 'tsx' ? 'tsx' : tab === 'scss' ? 'scss' : tab === 'html' ? 'html' : 'reference'];

  const exportZip = () => {
    const zip = createZip([
      ...files.taro,
      { path: 'preview/index.html', content: files.html },
      { path: 'preview/reference.html', content: files.reference },
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
