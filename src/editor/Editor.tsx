import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createPage, findById } from '../schema/factory';
import { createCanvasMeasure, resolveLayout } from '../compiler';
import { EditorContext, editorReducer, initialState, type Tool } from './store';
import { CanvasGeometryContext } from './canvasContext';
import { canvasBus } from './canvasBus';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { Palette } from './Palette';
import { AssetsPanel } from './AssetsPanel';
import { Pages } from './Pages';
import { Layers } from './Layers';
import { PropertyPanel } from './PropertyPanel';
import { PrototypePanel } from './PrototypePanel';
import { PresentOverlay, isPresenting } from './present/PresentOverlay';
import { presentBus } from './present/presentBus';

const STORAGE_KEY = 'ui-compiler.autosave.v1';

function loadAutosave(): ReturnType<typeof initialState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { page: import('../schema/types').UIPage; projectName: string };
    if (!data.page?.root) return null;
    return initialState(data.page, data.projectName);
  } catch {
    return null;
  }
}

export function Editor() {
  const restored = useMemo(() => loadAutosave(), []);
  const [state, dispatch] = useReducer(
    editorReducer,
    restored ?? initialState(createPage('未命名页面'), '未命名项目'),
  );
  const [leftTab, setLeftTab] = useState<'pages' | 'layers' | 'assets'>('layers');
  const [rightTab, setRightTab] = useState<'design' | 'prototype'>('design');
  // FR-44 Present 演示模式（视图态，不进 store 历史）；startId 为选中 Frame 有 flowStart 时的起点
  const [presenting, setPresenting] = useState(false);
  const [presentStartId, setPresentStartId] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // FR-28/FR-29：几何在 Editor 层解析并向下提供 —— 画布、右栏（对齐/预设）、左栏（图层拖拽）共享同一份。
  const measure = useMemo(() => createCanvasMeasure(), []);
  const geometry = useMemo(() => resolveLayout(state.page, measure), [state.page, measure]);

  // FR-51② e2e 通道：只暴露既有公开 API（几何快照 + canvasBus.requestCapture），
  // 不新增任何编辑行为；未开启 VITE_E2E_HOOK=1 时不挂载（与生产行为零差异）。
  useEffect(() => {
    if ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_E2E_HOOK !== '1') return;
    (window as unknown as Record<string, unknown>).__UIC_E2E__ = {
      snapshot: () => {
        const rootGeom = geometry[state.page.root.id];
        const nodes: { id: string; x: number; y: number; width: number; height: number }[] = [];
        state.page.root.children.forEach((c) => {
          const g = geometry[c.id];
          if (g) nodes.push({ id: c.id, x: g.x, y: g.y, width: g.width, height: g.height });
        });
        return {
          pageName: state.page.name,
          viewport: state.page.viewport,
          root: rootGeom ? { x: rootGeom.x, y: rootGeom.y, width: rootGeom.width, height: rootGeom.height } : null,
          nodes,
        };
      },
      captureRegion: (region: { x: number; y: number; width: number; height: number }, pixelScale: number) =>
        canvasBus.requestCapture(region, pixelScale, 'image/png'),
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__UIC_E2E__;
    };
  }, [state.page, geometry]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ page: state.page, projectName: state.projectName }));
      } catch {
        // 忽略存储配额错误
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [state.page, state.projectName]);

  // FR-44：Toolbar 经 presentBus 请求开始演示（起点由 Toolbar 依选中 Frame 的 flowStart 解析）
  useEffect(
    () =>
      presentBus.onStart((req) => {
        setPresentStartId(req.startId ?? null);
        setPresenting(true);
      }),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // FR-44：Present 期间编辑器键盘整体让路（PresentOverlay 自行处理 Esc/←→/R/H）
      if (isPresenting()) return;
      // Ctrl+Alt+P 开始演示（组合键规避钢笔工具 'P'）
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        const st = stateRef.current;
        const primary = st.selectedIds[st.selectedIds.length - 1];
        const sel = primary ? findById(st.page.root, primary)?.node : null;
        presentBus.requestStart({ startId: sel?.flowStart ? sel.id : null });
        return;
      }
      // FR-23 Ctrl+Alt+M：用作蒙版 / 取消蒙版（对照 Figma）
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_MASK' });
        return;
      }
      const target = e.target as HTMLElement;
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'REDO' : 'UNDO' });
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
        return;
      }
      if (typing) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'DELETE' });
        return;
      }
      if (mod && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        dispatch({ type: 'COPY' });
        return;
      }
      if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        dispatch({ type: 'PASTE' });
        return;
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        dispatch({ type: 'DUPLICATE' });
        return;
      }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        dispatch({ type: 'SELECT_MANY', ids: stateRef.current.page.root.children.map((c) => c.id) });
        return;
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'SELECT', id: null });
        return;
      }
      if (e.key.startsWith('Arrow')) {
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        e.preventDefault();
        dispatch({ type: 'NUDGE', dx, dy });
        return;
      }
      if (e.key === 'Tab' && !mod && !e.altKey) {
        const st = stateRef.current;
        const primary = st.selectedIds[st.selectedIds.length - 1];
        const found = primary ? findById(st.page.root, primary) : null;
        if (found?.parent) {
          e.preventDefault();
          const siblings = found.parent.children;
          const idx = siblings.findIndex((c) => c.id === primary);
          const next = siblings[(idx + 1) % siblings.length];
          if (next) dispatch({ type: 'SELECT', id: next.id });
        }
        return;
      }
      if (!mod && !e.altKey && !e.repeat) {
        const toolKeys: Record<string, Tool> = {
          v: 'select',
          h: 'hand',
          f: 'frame',
          r: 'rect',
          o: 'ellipse',
          l: 'line',
          t: 'text',
          p: 'pen',
        };
        const tool = toolKeys[e.key.toLowerCase()];
        if (tool) {
          e.preventDefault();
          dispatch({ type: 'SET_TOOL', tool });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <EditorContext.Provider value={{ state, dispatch }}>
      <CanvasGeometryContext.Provider value={geometry}>
        <div className="editor">
          <Toolbar />
          <div className="editor-body">
            <nav className="nav-rail" aria-label="导航">
              <button type="button" className="nav-btn" disabled title="主菜单（M3 对照 UI3 完善）">
                ☰
              </button>
              <button type="button" className="nav-btn" disabled title="搜索（暂不支持）">
                ⌕
              </button>
              <button
                type="button"
                className={`nav-btn ${leftTab === 'pages' ? 'is-active' : ''}`}
                title="页面"
                onClick={() => setLeftTab('pages')}
              >
                ▤
              </button>
              <button
                type="button"
                className={`nav-btn ${leftTab === 'layers' ? 'is-active' : ''}`}
                title="图层"
                onClick={() => setLeftTab('layers')}
              >
                ⧉
              </button>
              <button
                type="button"
                className={`nav-btn ${leftTab === 'assets' ? 'is-active' : ''}`}
                title="资产"
                onClick={() => setLeftTab('assets')}
              >
                ◆
              </button>
              <button type="button" className="nav-btn" disabled title="评论（暂不支持）">
                💬
              </button>
              <span className="nav-spacer" />
              <button type="button" className="nav-btn" disabled title="账户（本地应用无需登录）">
                ●
              </button>
            </nav>
            <aside className="sidebar-left">
              <div className="side-tabs">
                <button
                  className={`side-tab ${leftTab === 'pages' ? 'is-active' : ''}`}
                  onClick={() => setLeftTab('pages')}
                >
                  页面
                </button>
                <button
                  className={`side-tab ${leftTab === 'layers' ? 'is-active' : ''}`}
                  onClick={() => setLeftTab('layers')}
                >
                  图层
                </button>
                <button
                  className={`side-tab ${leftTab === 'assets' ? 'is-active' : ''}`}
                  onClick={() => setLeftTab('assets')}
                >
                  资产
                </button>
              </div>
              {leftTab === 'pages' && <Pages />}
              {leftTab === 'layers' && <Layers />}
              {leftTab === 'assets' && (
                <>
                  <Palette />
                  <AssetsPanel />
                </>
              )}
            </aside>
            <main className="canvas-area">
              <Canvas />
            </main>
            <aside className="sidebar-right">
              <div className="side-tabs">
                <button
                  className={`side-tab ${rightTab === 'design' ? 'is-active' : ''}`}
                  onClick={() => setRightTab('design')}
                >
                  Design
                </button>
                <button
                  className={`side-tab ${rightTab === 'prototype' ? 'is-active' : ''}`}
                  onClick={() => setRightTab('prototype')}
                >
                  Prototype
                </button>
              </div>
              {rightTab === 'design' ? <PropertyPanel /> : <PrototypePanel />}
            </aside>
          </div>
        </div>
      </CanvasGeometryContext.Provider>
      {/* FR-44：Present 全屏遮罩（视图态，不进 store 历史） */}
      {presenting && (
        <PresentOverlay
          page={state.page}
          startId={presentStartId}
          onExit={() => {
            setPresenting(false);
            setPresentStartId(null);
          }}
        />
      )}
    </EditorContext.Provider>
  );
}
