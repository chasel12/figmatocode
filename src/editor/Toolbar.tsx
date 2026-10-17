import { useEffect, useRef, useState } from 'react';
import { useEditor, type Tool } from './store';
import { parseProject, projectFromEditorState, serializeProject } from './project';
import { canvasBus } from './canvasBus';
import { useCanvasGeometry } from './canvasContext';
import { exportSelection } from './exporter';
import { CodeModal } from './CodeModal';
import { DiffModal } from './DiffModal';
import { ShortcutsDialog } from './ShortcutsDialog';
import { downloadText } from '../utils/zip';
import { findById } from '../schema/factory';
import { isBooleanConvertible } from '../compiler/shapePath';
import { presentBus } from './present/presentBus';

interface MenuDef {
  id: string;
  items: MenuItemDef[];
}

type MenuItemDef =
  | { divider: true }
  | { label: string; shortcut?: string; onClick?: () => void; disabled?: boolean; note?: string };

export const TOOLS: { id: Tool; label: string; key: string; icon: string }[] = [
  { id: 'select', label: '移动', key: 'V', icon: '↖' },
  { id: 'hand', label: '抓手', key: 'H', icon: '✋' },
  { id: 'frame', label: 'Frame', key: 'F', icon: '▣' },
  { id: 'section', label: 'Section', key: '', icon: '◫' },
  { id: 'slice', label: 'Slice', key: '', icon: '◨' },
  { id: 'rect', label: '矩形', key: 'R', icon: '▭' },
  { id: 'ellipse', label: '椭圆', key: 'O', icon: '⬭' },
  { id: 'line', label: '直线', key: 'L', icon: '╱' },
  { id: 'polygon', label: '多边形', key: '', icon: '⬠' },
  { id: 'star', label: '星形', key: '', icon: '☆' },
  { id: 'text', label: '文本', key: 'T', icon: 'T' },
  { id: 'pen', label: '钢笔', key: 'P', icon: '✒' },
  { id: 'image', label: '图片', key: '', icon: '🖼' },
];

type Theme = 'dark' | 'light';
const THEME_KEY = 'ui-compiler.theme';

export function Toolbar() {
  const { state, dispatch } = useEditor();
  const [showCode, setShowCode] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem(THEME_KEY) as Theme) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [zoom, setZoom] = useState(1);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const menuBarRef = useRef<HTMLElement | null>(null);

  // FR-22/23 菜单项可用性：布尔需 ≥2 个可布尔节点（VECTOR 或可自动矢量化的图形，P1-05）；蒙版需容器且子项 ≥2
  const selectedNodes = state.selectedIds
    .map((id) => findById(state.page.root, id)?.node)
    .filter((n): n is NonNullable<typeof n> => !!n);
  const canBoolean = selectedNodes.filter((n) => isBooleanConvertible(n)).length >= 2;
  const maskTarget = selectedNodes.find(
    (n) => n.id !== state.page.root.id && 'children' in n && n.children.length >= 2 && n.type !== 'RECTANGLE',
  );
  const canMaskTarget = !!maskTarget;
  const canMask = !!(maskTarget && maskTarget.layout.clipContent);

  const save = () => {
    // FR-39/59 §1.4：v2 工程文件（多页/组件/样式一体）
    downloadText(
      JSON.stringify(serializeProject(projectFromEditorState(state)), null, 2),
      `${state.projectName || 'project'}.uicproj.json`,
      'application/json',
    );
  };

  const open = async (file: File) => {
    try {
      const text = await file.text();
      const { project } = parseProject(text); // v1 单页与 v2 工程双兼容（project.ts 单源）
      dispatch({ type: 'LOAD_PROJECT', project });
    } catch (e) {
      alert(`打开失败：${e instanceof Error ? e.message : e}`);
    }
  };

  const newPage = () => {
    if (state.past.length || state.pendingBaseline) {
      if (!confirm('当前项目未导出，确定新建？')) return;
    }
    dispatch({ type: 'NEW_PAGE' });
  };

  // FR-24：主题覆盖全部面板（CSS 变量切换），默认深色
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // 忽略存储错误
    }
  }, [theme]);

  // FR-25：顶栏缩放控件与 View 菜单通过总线驱动画布
  useEffect(() => canvasBus.onScale(setZoom), []);

  const geometry = useCanvasGeometry();

  const canUndo = state.past.length > 0 || !!state.pendingBaseline;
  const canRedo = state.future.length > 0;

  const menus: MenuDef[] = [
    {
      id: 'File',
      items: [
        { label: '新建项目', shortcut: 'Ctrl+N', onClick: newPage },
        { label: '打开…', shortcut: 'Ctrl+O', onClick: () => fileRef.current?.click() },
        { label: '保存 JSON', shortcut: 'Ctrl+S', onClick: save },
        { divider: true },
        { label: '导出代码 / ZIP', shortcut: 'Ctrl+E', onClick: () => setShowCode(true) },
        {
          label: '导出所选为图片 / SVG（ZIP）',
          onClick: () => {
            if (!geometry) return;
            exportSelection(state.page, geometry, state.selectedIds, state.projectName, state.tokens).then((out) => {
              if (out.skipped.length) alert(`已导出 ${out.files.length} 项；跳过 ${out.skipped.length} 项：\n${out.skipped.map((s) => `${s.file} — ${s.reason}`).join('\n')}`);
            }).catch((err: Error) => alert(err.message));
          },
        },
        { label: '导入 Figma 文件（暂不支持）', disabled: true },
      ],
    },
    {
      id: 'Edit',
      items: [
        { label: '撤销', shortcut: 'Ctrl+Z', disabled: !canUndo, onClick: () => dispatch({ type: 'UNDO' }) },
        { label: '重做', shortcut: 'Ctrl+Y', disabled: !canRedo, onClick: () => dispatch({ type: 'REDO' }) },
        { divider: true },
        {
          label: '剪切',
          shortcut: 'Ctrl+X',
          onClick: () => {
            dispatch({ type: 'COPY' });
            dispatch({ type: 'DELETE' });
          },
        },
        { label: '复制', shortcut: 'Ctrl+C', onClick: () => dispatch({ type: 'COPY' }) },
        { label: '粘贴', shortcut: 'Ctrl+V', onClick: () => dispatch({ type: 'PASTE' }) },
        { label: '复制副本', shortcut: 'Ctrl+D', onClick: () => dispatch({ type: 'DUPLICATE' }) },
        { label: '删除', shortcut: 'Del', onClick: () => dispatch({ type: 'DELETE' }) },
        { divider: true },
        {
          label: '全选',
          shortcut: 'Ctrl+A',
          onClick: () => dispatch({ type: 'SELECT_MANY', ids: state.page.root.children.map((c) => c.id) }),
        },
        { label: '查找…（暂不支持）', disabled: true },
      ],
    },
    {
      id: 'View',
      items: [
        { label: '放大', shortcut: 'Ctrl+=', onClick: () => canvasBus.send({ op: 'zoomIn' }) },
        { label: '缩小', shortcut: 'Ctrl+-', onClick: () => canvasBus.send({ op: 'zoomOut' }) },
        { label: '适合画布', shortcut: 'Shift+1', onClick: () => canvasBus.send({ op: 'fit' }) },
        { label: '实际大小', shortcut: 'Shift+0', onClick: () => canvasBus.send({ op: 'zoomSet', scale: 1 }) },
        { divider: true },
        {
          label: theme === 'dark' ? '切换浅色主题' : '切换深色主题',
          onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
        },
        { divider: true },
        { label: '标尺（暂不支持）', disabled: true },
        { label: '像素网格（暂不支持）', disabled: true },
      ],
    },
    {
      id: 'Object',
      items: [
        {
          label: '上移一层',
          shortcut: ']',
          onClick: () => dispatch({ type: 'REORDER', id: state.selectedIds[0] ?? '', direction: 'up' }),
        },
        {
          label: '下移一层',
          shortcut: '[',
          onClick: () => dispatch({ type: 'REORDER', id: state.selectedIds[0] ?? '', direction: 'down' }),
        },
        { label: '置于顶层', shortcut: 'Shift+]', onClick: () => dispatch({ type: 'REORDER_Z', id: state.selectedIds[0] ?? '', to: 'front' }) },
        { label: '置于底层', shortcut: 'Shift+[', onClick: () => dispatch({ type: 'REORDER_Z', id: state.selectedIds[0] ?? '', to: 'back' }) },
        { divider: true },
        { label: '组合', shortcut: 'Ctrl+G', onClick: () => dispatch({ type: 'GROUP' }) },
        { label: '锁定 / 解锁', shortcut: 'Ctrl+Shift+L', onClick: () => dispatch({ type: 'TOGGLE_LOCK' }) },
        { divider: true },
        // FR-22 布尔运算：需选中 ≥2 个 VECTOR 参集（禁用态依选中数判定）
        {
          label: '布尔：合并',
          disabled: !canBoolean,
          note: canBoolean ? undefined : '需选中 ≥2 个矢量/图形节点',
          onClick: () => dispatch({ type: 'BOOLEAN_OP', op: 'UNION' }),
        },
        {
          label: '布尔：交集',
          disabled: !canBoolean,
          note: canBoolean ? undefined : '需选中 ≥2 个矢量/图形节点',
          onClick: () => dispatch({ type: 'BOOLEAN_OP', op: 'INTERSECT' }),
        },
        {
          label: '布尔：减去',
          disabled: !canBoolean,
          note: canBoolean ? undefined : '需选中 ≥2 个矢量/图形节点',
          onClick: () => dispatch({ type: 'BOOLEAN_OP', op: 'SUBTRACT' }),
        },
        {
          label: '布尔：排除',
          disabled: !canBoolean,
          note: canBoolean ? undefined : '需选中 ≥2 个矢量/图形节点',
          onClick: () => dispatch({ type: 'BOOLEAN_OP', op: 'EXCLUDE' }),
        },
        { divider: true },
        // FR-23 蒙版：复用 layout.clipContent 作显式开关
        {
          label: canMask ? '取消蒙版' : '用作蒙版',
          shortcut: 'Ctrl+Alt+M',
          disabled: !canMaskTarget,
          note: canMaskTarget ? undefined : '需选中含 ≥2 个子项的容器',
          onClick: () => dispatch({ type: 'TOGGLE_MASK' }),
        },
        { divider: true },
        { label: '创建组件', disabled: true, note: '布局用资产面板「创建组件」（FR-25）' },
        { label: '轮廓描边', disabled: true, note: '本版不支持（P1，M4 交付）' },
      ],
    },
    {
      id: 'Text',
      items: [
        { label: '左对齐', shortcut: 'Ctrl+Shift+L', onClick: () => dispatch({ type: 'UPDATE_STYLE', id: state.selectedIds[0] ?? '', patch: { textAlign: 'left' } }) },
        { label: '居中对齐', shortcut: 'Ctrl+Shift+E', onClick: () => dispatch({ type: 'UPDATE_STYLE', id: state.selectedIds[0] ?? '', patch: { textAlign: 'center' } }) },
        { label: '右对齐', shortcut: 'Ctrl+Shift+R', onClick: () => dispatch({ type: 'UPDATE_STYLE', id: state.selectedIds[0] ?? '', patch: { textAlign: 'right' } }) },
        { divider: true },
        { label: '转换为大写', disabled: true, note: '本版不支持（文本排版 M5）' },
        { label: '转换为小写', disabled: true, note: '本版不支持（文本排版 M5）' },
        { label: '段落样式', disabled: true, note: '本版不支持（文本排版 M5）' },
      ],
    },
    {
      id: 'Plugins',
      items: [
        { label: '管理插件…', disabled: true, note: '本版不支持（插件体系未开放）' },
        { label: '运行上一个插件', disabled: true, note: '本版不支持（插件体系未开放）' },
        { label: '开发插件', disabled: true, note: '本版不支持（插件体系未开放）' },
      ],
    },
    {
      id: 'Help',
      items: [
        { label: '快捷键', shortcut: 'Ctrl+Shift+?', onClick: () => setShowShortcuts(true) },
        { divider: true },
        { label: '帮助中心', disabled: true, note: '本版不支持（外链文档 M6 提供）' },
        { label: '关于 UI Compiler', disabled: true, note: '本版暂无关于页' },
      ],
    },
  ];

  // 菜单打开时：点击外部关闭；Esc 关闭并阻断下层（同 ContextMenu 语义）
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!menuBarRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [openMenu]);

  // FR-26 菜单快捷键（画布未覆盖的文件/缩放命令）；输入态不拦截
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 'n') {
        e.preventDefault();
        newPage();
      } else if (k === 'o') {
        e.preventDefault();
        fileRef.current?.click();
      } else if (k === 's') {
        e.preventDefault();
        save();
      } else if (k === 'e') {
        e.preventDefault();
        setShowCode(true);
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        canvasBus.send({ op: 'zoomIn' });
      } else if (e.key === '-') {
        e.preventDefault();
        canvasBus.send({ op: 'zoomOut' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // FR-9/FR-33：快捷键面板 Ctrl+Shift+?（再次按下或 Esc 关闭）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (showShortcuts && e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setShowShortcuts(false);
        return;
      }
      if (mod && e.shiftKey && (e.key === '?' || e.key === '/')) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [showShortcuts]);

  const zoomValue =
    Math.abs(zoom - 1) < 0.001
      ? '1'
      : Math.abs(zoom - 0.5) < 0.001
        ? '0.5'
        : Math.abs(zoom - 2) < 0.001
          ? '2'
          : Math.abs(zoom - 4) < 0.001
            ? '4'
            : 'custom';

  return (
    <>
      <header className="toolbar">
        <span className="brand">
          <span className="brand-mark" title="UI Compiler">
            ⬡
          </span>
          <span className="brand-name">UI Compiler</span>
          <span className="brand-tag">本地</span>
        </span>
        <nav className="menubar" ref={menuBarRef}>
          {menus.map((m) => (
            <div className="menu-root" key={m.id}>
              <button
                type="button"
                className={`menu-btn ${openMenu === m.id ? 'is-open' : ''}`}
                onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                onMouseEnter={() => {
                  if (openMenu && openMenu !== m.id) setOpenMenu(m.id);
                }}
              >
                {m.id}
              </button>
              {openMenu === m.id && (
                <div className="menu-dropdown">
                  {m.items.map((item, i) =>
                    'divider' in item ? (
                      <div className="menu-divider" key={i} />
                    ) : (
                      <button
                        type="button"
                        key={i}
                        className={`menu-item ${item.disabled ? 'is-disabled' : ''}`}
                        title={'note' in item && item.note ? item.note : item.disabled ? '本版暂不支持' : undefined}
                        disabled={item.disabled}
                        onClick={() => {
                          setOpenMenu(null);
                          item.onClick?.();
                        }}
                      >
                        <span>{item.label}</span>
                        {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>
        <input
          className="project-name"
          value={state.projectName}
          onChange={(e) => dispatch({ type: 'RENAME_PAGE', name: e.target.value })}
          title="项目名称"
        />
        <div className="toolbar-spacer" />
        <div className="toolbar-group">
          <button className="btn" disabled={!canUndo} onClick={() => dispatch({ type: 'UNDO' })} title="Ctrl+Z">
            ↶
          </button>
          <button className="btn" disabled={!canRedo} onClick={() => dispatch({ type: 'REDO' })} title="Ctrl+Y">
            ↷
          </button>
        </div>
        <select
          className="toolbar-zoom"
          value={zoomValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'fit') canvasBus.send({ op: 'fit' });
            else if (v !== 'custom') canvasBus.send({ op: 'zoomSet', scale: Number(v) });
          }}
          title="缩放"
        >
          <option value="fit">适合画布</option>
          <option value="0.5">50%</option>
          <option value="1">100%</option>
          <option value="2">200%</option>
          <option value="4">400%</option>
          <option value="custom">{Math.round(zoom * 100)}%</option>
        </select>
        <button
          className="btn"
          title="演示模式（Ctrl+Alt+P）"
          onClick={() => {
            const primary = state.selectedIds[state.selectedIds.length - 1];
            const sel = primary ? findById(state.page.root, primary)?.node : null;
            presentBus.requestStart({ startId: sel?.flowStart ? sel.id : null });
          }}
        >
          演示
        </button>
        <button className="btn" disabled title="分享暂不支持（P2 协作，M7 评审后启用）">
          分享
        </button>
        <button className="btn btn-primary" onClick={() => setShowCode(true)}>
          生成代码
        </button>
        <button className="btn btn-accent" onClick={() => setShowDiff(true)}>
          Pixel Diff
        </button>
        <button
          type="button"
          className="btn btn-theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? '切换浅色主题' : '切换深色主题'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) open(f);
            e.target.value = '';
          }}
        />
      </header>
      <div className="tool-strip floating-tools" role="toolbar" aria-label="工具">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tool-btn ${state.tool === t.id ? 'is-active' : ''}`}
            title={t.key ? `${t.label}（${t.key}）` : t.label}
            onClick={() => dispatch({ type: 'SET_TOOL', tool: t.id })}
          >
            {t.icon}
          </button>
        ))}
      </div>
  {showCode && <CodeModal onClose={() => setShowCode(false)} />}
  {showDiff && <DiffModal onClose={() => setShowDiff(false)} />}
  {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}
    </>
  );
}
