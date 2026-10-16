import { useState } from 'react';
import { allDemoPages } from '../demo/pages';
import { useEditor } from './store';

/**
 * FR-39 多 Page 管理：新建/复制/重命名/删除/排序/切换。
 * - pages 为唯一权威，编辑器 state.page 为当前页视图（store 出口单点回写）。
 * - 每页独立图层根；切页不进任何 undo 栈（Figma 语义）。
 * - 示例页走 LOAD_PAGE（单页载入，重置为单页工程）——与 File>打开 同路径。
 */
export function Pages() {
  const { state, dispatch } = useEditor();
  const [demoOpen, setDemoOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const demos = demoOpen ? allDemoPages() : [];

  const loadDemo = (page: import('../schema/types').UIPage) => {
    if ((state.past.length || state.pendingBaseline) && !confirm('当前修改未导出，载入示例页将替换整个工程，继续？')) {
      return;
    }
    dispatch({ type: 'LOAD_PAGE', page, projectName: page.name });
  };

  const commitRename = () => {
    if (renamingId && renameText.trim()) {
      dispatch({ type: 'RENAME_PAGE_BY_ID', id: renamingId, name: renameText.trim() });
    }
    setRenamingId(null);
  };

  return (
    <div className="pages-panel">
      <div className="panel-title">页面</div>
      <div className="assets-actions pages-actions">
        <button className="mini-btn" title="新建页面" onClick={() => dispatch({ type: 'ADD_PAGE' })}>
          ＋ 新建
        </button>
        <button className="mini-btn" title="复制当前页面" onClick={() => dispatch({ type: 'DUPLICATE_PAGE' })}>
          ⧉ 复制
        </button>
      </div>
      <div className="page-list">
        {state.pages.map((p, i) => {
          const isCurrent = p.id === state.currentPageId;
          return (
            <div
              key={p.id}
              className={`page-row ${isCurrent ? 'is-current' : ''}`}
              title={p.name}
              onClick={() => dispatch({ type: 'SELECT_PAGE', id: p.id })}
              onDoubleClick={() => {
                setRenamingId(p.id);
                setRenameText(p.name);
              }}
            >
              <span className="page-icon">⬒</span>
              {renamingId === p.id ? (
                <input
                  className="page-rename-input"
                  autoFocus
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="page-name">{p.name}</span>
              )}
              <span className="page-row-tools">
                <button
                  className="mini-btn"
                  title="上移"
                  disabled={i === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'REORDER_PAGE', id: p.id, toIndex: i - 1 });
                  }}
                >
                  ↑
                </button>
                <button
                  className="mini-btn"
                  title="下移"
                  disabled={i === state.pages.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'REORDER_PAGE', id: p.id, toIndex: i + 1 });
                  }}
                >
                  ↓
                </button>
                <button
                  className="mini-btn"
                  title={state.pages.length <= 1 ? '至少保留 1 页' : '删除页面'}
                  disabled={state.pages.length <= 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`删除页面「${p.name}」？`)) dispatch({ type: 'DELETE_PAGE', id: p.id });
                  }}
                >
                  ✕
                </button>
              </span>
            </div>
          );
        })}
      </div>

      <button className="page-more" onClick={() => setDemoOpen((v) => !v)}>
        {demoOpen ? '收起示例页面' : '示例页面（16）'}
      </button>
      {demos.map((p) => (
        <button key={p.id + p.name} className="page-row page-demo" onClick={() => loadDemo(p)}>
          <span className="page-icon">▢</span>
          <span className="page-name">{p.name}</span>
        </button>
      ))}
    </div>
  );
}
