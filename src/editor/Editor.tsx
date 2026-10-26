import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createBlankPage, findById } from '../schema/factory';
import { createCanvasMeasure, resolveLayout } from '../compiler';
import { EditorContext, editorReducer, initialState, type Tool } from './store';
import { parseProject, serializeProject, stateFromProject } from './project';
import type { UIProject } from '../schema/types';
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
import { AiDock } from './ai/AiDock';
import { UnsavedDialog } from './UnsavedDialog';
import { saveProjectJson } from './saveProject';
import {
  AUTOSAVE_KEY,
  autosaveEnvelope,
  consumeCleanRequest,
  flushSnapshot,
  installLifecycleGuard,
  markSaved,
  recomputeDirty,
  registerRevalidator,
  registerSnapshotSource,
  resolvePending,
  subscribePending,
  type PendingIntent,
  type UnsavedChoice,
} from './unsaved';

/** §1.3：v1 键只读不删（降级/双开无害）；命中 v1 即升级并回写 v2 */
const STORAGE_KEY_V1 = 'ui-compiler.autosave.v1';
/** FR-60：防抖窗口与强制上限。纯防抖在连续拖动时会被无限推迟，必须有上限 */
const AUTOSAVE_DEBOUNCE = 500;
const AUTOSAVE_MAX_WAIT = 2000;

interface AutosaveEnvelope {
  version?: number;
  currentPageId?: string;
  project?: UIProject;
  page?: unknown;
  projectName?: string;
}

function loadAutosave(): ReturnType<typeof initialState> | null {
  try {
    const raw2 = localStorage.getItem(AUTOSAVE_KEY);
    if (raw2) {
      const env = JSON.parse(raw2) as AutosaveEnvelope;
      return stateFromProject(parseProject(env).project, env.currentPageId);
    }
    const raw1 = localStorage.getItem(STORAGE_KEY_V1);
    if (raw1) {
      const { project } = parseProject(raw1);
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(serializeProject(project)));
      } catch {
        /* 回写失败不阻塞恢复 */
      }
      return stateFromProject(project);
    }
    return null;
  } catch {
    return null;
  }
}

export function Editor() {
  const restored = useMemo(() => loadAutosave(), []);
  const [state, dispatch] = useReducer(
    editorReducer,
    // 空白画布页（根 ABSOLUTE）：首次打开即可自由摆放，不排进 flex 流。
    // demo/AI 页面仍走 `createPage`（根 VERTICAL）——两者职责不同，见 factory.ts 注释。
    restored ?? initialState(createBlankPage(), '未命名项目'),
  );
  const [leftTab, setLeftTab] = useState<'pages' | 'layers' | 'assets' | 'ai'>('layers');
  const [rightTab, setRightTab] = useState<'design' | 'prototype'>('design');
  // FR-44 Present 演示模式（视图态，不进 store 历史）；startId 为选中 Frame 有 flowStart 时的起点
  const [presenting, setPresenting] = useState(false);
  const [presentStartId, setPresentStartId] = useState<string | null>(null);
  // FR-44：Shift+Space 内联预览（画布内小窗运行，同一播放引擎的 inline 模式）
  const [previewing, setPreviewing] = useState(false);
  const [previewStartId, setPreviewStartId] = useState<string | null>(null);
  // FR-60：被未保存守卫挂起的破坏性意图（新建/打开/关闭）；非 null 即弹三按钮弹窗
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);
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
      /** 任意深度节点的几何（验证轨深节点定位；snapshot 仅根级子节点）——只读 */
      geometryOf: (id: string) => {
        const g = geometry[id];
        return g ? { id, x: g.x, y: g.y, width: g.width, height: g.height } : null;
      },
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__UIC_E2E__;
    };
  }, [state.page, geometry]);

  // §1.3 autosave v2：pages 为权威整工程落盘（多页/组件/样式随编辑持久）；v1 键不再写
  //
  // FR-60 两处改造：
  // ① 节奏改「500ms 防抖 + 2s 强制上限」。原实现是纯防抖 —— 每次 state 变更都 clear 掉上一个
  //    timer，于是连续拖动 / 连续输入时**可以长时间一次都不落盘**，中途崩溃就全丢。
  // ② 顺带做脏标记：拿「保存点 JSON」与当前 JSON 逐字节比（撤销回到保存点会正确变干净，
  //    用 undo 栈长度算不出来这个）。
  const lastFlushAtRef = useRef(0);
  useEffect(() => {
    // 同步消费「下次变更即干净」请求（打开文件/新建后），避免被后续 timer 抢走
    const cleanRequested = consumeCleanRequest();
    const since = Date.now() - lastFlushAtRef.current;
    const delay = since >= AUTOSAVE_MAX_WAIT ? 0 : AUTOSAVE_DEBOUNCE;
    const timer = setTimeout(() => {
      let json: string;
      try {
        json = autosaveEnvelope(stateRef.current);
      } catch {
        return; // 序列化失败（循环引用等）不该拖垮编辑
      }
      lastFlushAtRef.current = Date.now();
      flushSnapshot(json);
      if (cleanRequested) markSaved(json);
      else recomputeDirty(json);
    }, delay);
    return () => clearTimeout(timer);
  }, [state.pages, state.currentPageId, state.projectName, state.components, state.tokens]);

  // FR-60：把「当前工程 → JSON」与「重算脏标记」交给守卫模块；装 beforeunload / pagehide /
  // visibilitychange 钩子（关闭时同步落盘，这是强制关闭场景里唯一保证完成的写）
  useEffect(() => {
    registerSnapshotSource(() => autosaveEnvelope(stateRef.current));
    registerRevalidator(() => recomputeDirty(autosaveEnvelope(stateRef.current)));
    const dispose = installLifecycleGuard();
    return () => {
      registerSnapshotSource(null);
      registerRevalidator(null);
      dispose();
    };
  }, []);

  // FR-60：守卫挂起意图 → 本层渲染三按钮弹窗
  useEffect(() => subscribePending(setPendingIntent), []);

  const handleUnsavedChoice = (choice: UnsavedChoice) => {
    if (choice === 'cancel') {
      resolvePending('cancel');
      return;
    }
    if (choice === 'save') {
      // 与菜单「保存 JSON」同一实现（saveProject.ts），并立即把保存点前移
      commitSave();
      resolvePending('save');
      return;
    }
    // 「不保存」：回滚点已由 resolvePending 存下；新状态算干净由意图自己声明
    // （`requestCleanOnNextChange()` 放在 dispatch 前一行，避免读文件失败时把标记留到下一次编辑）
    resolvePending('discard');
  };

  // FR-44：Toolbar 经 presentBus 请求开始演示（起点由 Toolbar 依选中 Frame 的 flowStart 解析）
  useEffect(
    () =>
      presentBus.onStart((req) => {
        setPresentStartId(req.startId ?? null);
        setPresenting(true);
      }),
    [],
  );

  /** 保存并前移保存点：菜单 / Ctrl+S / 未保存弹窗「保存」三处共用 */
  const commitSave = () => {
    saveProjectJson(stateRef.current);
    const json = autosaveEnvelope(stateRef.current);
    markSaved(json);
    flushSnapshot(json);
  };

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

      // FR-60：菜单里标着 Ctrl+S，就真接住它 —— 否则浏览器会弹自己的「保存网页」对话框
      if (mod && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        commitSave();
        return;
      }

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
      // FR-44：Shift+Space 内联预览——起点=选中 Frame（含非 Frame 时忽略，由 resolveStartNode 兜底首 Frame）
      if (e.code === 'Space' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const st = stateRef.current;
        const primary = st.selectedIds[st.selectedIds.length - 1];
        const sel = primary ? findById(st.page.root, primary)?.node : null;
        setPreviewStartId(sel && sel.type === 'FRAME' ? sel.id : null);
        setPreviewing(true);
        return;
      }
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
              {/* M7 W5：AI dock 入口（新目录 src/editor/ai/，热点文件仅接线） */}
              <button
                type="button"
                className={`nav-btn ${leftTab === 'ai' ? 'is-active' : ''}`}
                title="AI 生成"
                onClick={() => setLeftTab('ai')}
              >
                ✦
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
                <button
                  className={`side-tab ${leftTab === 'ai' ? 'is-active' : ''}`}
                  onClick={() => setLeftTab('ai')}
                >
                  AI
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
              {leftTab === 'ai' && <AiDock />}
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
                  设计
                </button>
                <button
                  className={`side-tab ${rightTab === 'prototype' ? 'is-active' : ''}`}
                  onClick={() => setRightTab('prototype')}
                >
                  原型
                </button>
              </div>
              {rightTab === 'design' ? <PropertyPanel /> : <PrototypePanel />}
            </aside>
          </div>
        </div>
      </CanvasGeometryContext.Provider>
      {/* FR-60：未保存守卫三按钮弹窗（应用内破坏性操作；标签页关闭走浏览器原生两按钮） */}
      {pendingIntent && (
        <UnsavedDialog
          label={pendingIntent.label}
          projectName={state.projectName}
          onChoose={handleUnsavedChoice}
        />
      )}
      {/* FR-44：Present 全屏遮罩（视图态，不进 store 历史）；pages 传入以支持演示中切页（FR-39） */}
      {presenting && (
        <PresentOverlay
          page={state.page}
          pages={state.pages}
          startId={presentStartId}
          onExit={() => {
            setPresenting(false);
            setPresentStartId(null);
          }}
        />
      )}
      {/* FR-44：Shift+Space 内联预览小窗（同引擎 inline 模式；Esc/✕ 关闭，可升级全屏） */}
      {previewing && (
        <PresentOverlay
          inline
          page={state.page}
          pages={state.pages}
          startId={previewStartId}
          onExit={() => {
            setPreviewing(false);
            setPreviewStartId(null);
          }}
          onGoFullscreen={() => {
            setPreviewing(false);
            setPresentStartId(previewStartId);
            setPresenting(true);
          }}
        />
      )}
    </EditorContext.Provider>
  );
}
