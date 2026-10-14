import { useState } from 'react';
import { allDemoPages } from '../demo/pages';
import { useEditor } from './store';

/**
 * FR-25 左栏 Pages 页签：当前页 + demo 页快速打开（与 File>打开 载入同一条 LOAD_PAGE 路径）。
 * PRD v1.0 未含多页项目架构（单页 project），此页签做单页切换演示与快速导航。
 */
export function Pages() {
  const { state, dispatch } = useEditor();
  const [demoOpen, setDemoOpen] = useState(false);
  const demos = demoOpen ? allDemoPages() : [];

  const load = (page: import('../schema/types').UIPage) => {
    if ((state.past.length || state.pendingBaseline) && !confirm('当前修改未导出，切换页面将丢弃（可 Ctrl+Z 恢复前先确认），继续？')) {
      return;
    }
    dispatch({ type: 'LOAD_PAGE', page, projectName: page.name });
  };

  return (
    <div className="pages-panel">
      <div className="panel-title">页面</div>
      <div className="page-list">
        <div className="page-row is-current" title="当前页面">
          <span className="page-icon">⬒</span>
          <span className="page-name">{state.page.name}</span>
        </div>
        <button className="page-more" onClick={() => setDemoOpen((v) => !v)}>
          {demoOpen ? '收起示例页面' : '示例页面（16）'}
        </button>
        {demos.map((p) => (
          <button key={p.id + p.name} className="page-row page-demo" onClick={() => load(p)}>
            <span className="page-icon">▢</span>
            <span className="page-name">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
