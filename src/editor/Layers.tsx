import { useEffect, useRef, useState } from 'react';
import type { UINode } from '../schema/types';
import { isContainer } from '../schema/types';
import { findById } from '../schema/factory';
import { useEditor } from './store';
import { useCanvasGeometry } from './canvasContext';

type DropZone = 'before' | 'after' | 'inside';

const TYPE_ICON: Record<string, string> = {
  PAGE: '⬒',
  FRAME: '▣',
  RECTANGLE: '▭',
  OVAL: '⬭',
  LINE: '╱',
  TEXT: 'T',
  IMAGE: '🖼',
  BUTTON: '◉',
  // FR-16 形状 / FR-14 Section·Slice（缺项 fallback '?'——PRD FR-37 全 16 类图标升级另并）
  POLYGON: '⬠',
  STAR: '☆',
  SECTION: '◫',
  SLICE: '◨',
};

function collectAncestorIds(root: UINode, id: string): string[] {
  const path: string[] = [];
  const walk = (n: UINode): boolean => {
    if (n.id === id) return true;
    if (isContainer(n)) {
      for (const c of n.children) {
        if (walk(c)) {
          path.push(n.id);
          return true;
        }
      }
    }
    return false;
  };
  walk(root);
  return path;
}

interface RowProps {
  node: UINode;
  depth: number;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  renamingId: string | null;
  renameText: string;
  setRenameText: (v: string) => void;
  onStartRename: (node: UINode) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  dropHint: { id: string; zone: DropZone } | null;
  onDragStartRow: (id: string) => void;
  onDragOverRow: (e: React.DragEvent, node: UINode) => void;
  onDropRow: (e: React.DragEvent, node: UINode) => void;
  onDragEndRow: () => void;
}

function LayerRow(props: RowProps) {
  const { node, depth, collapsed } = props;
  const { state, dispatch } = useEditor();
  const selected = state.selectedIds.includes(node.id);
  const hidden = node.visible === false;
  const expanded = !collapsed.has(node.id);
  const icon = TYPE_ICON[node.type] ?? '▤';

  return (
    <>
      <div
        className={[
          'layer-row',
          selected ? 'is-selected' : '',
          hidden ? 'is-hidden' : '',
          node.locked ? 'is-locked' : '',
          props.dropHint?.id === node.id ? `drop-${props.dropHint.zone}` : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ paddingLeft: 8 + depth * 14 }}
        data-node-id={node.id}
        draggable={node.id !== state.page.root.id && !props.renamingId}
        onClick={(e) => dispatch({ type: 'SELECT', id: node.id, additive: e.shiftKey })}
        onDoubleClick={(e) => {
          e.preventDefault();
          props.onStartRename(node);
        }}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', node.id);
          props.onDragStartRow(node.id);
        }}
        onDragOver={(e) => props.onDragOverRow(e, node)}
        onDrop={(e) => props.onDropRow(e, node)}
        onDragEnd={props.onDragEndRow}
      >
        {isContainer(node) ? (
          <button
            type="button"
            className={`layer-chevron ${expanded ? 'is-open' : ''}`}
            title={expanded ? '折叠' : '展开'}
            onClick={(e) => {
              e.stopPropagation();
              props.onToggle(node.id);
            }}
          >
            ▸
          </button>
        ) : (
          <span className="layer-chevron is-empty" />
        )}
        <span className="layer-icon">{icon}</span>
        {props.renamingId === node.id ? (
          <input
            className="layer-rename"
            value={props.renameText}
            autoFocus
            onChange={(e) => props.setRenameText(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={props.onCommitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') props.onCommitRename();
              else if (e.key === 'Escape') props.onCancelRename();
              e.stopPropagation();
            }}
          />
        ) : (
          <span className="layer-name">{node.name ?? node.id}</span>
        )}
        {node.id !== state.page.root.id && (
          <span className="layer-actions">
            <button
              type="button"
              title={hidden ? '显示' : '隐藏'}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'TOGGLE_VISIBLE', id: node.id });
              }}
            >
              {hidden ? '○' : '◉'}
            </button>
            <button
              type="button"
              title={node.locked ? '解锁' : '锁定'}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'TOGGLE_LOCK', ids: [node.id] });
              }}
            >
              {node.locked ? '🔒' : '🔓'}
            </button>
          </span>
        )}
      </div>
      {isContainer(node) &&
        expanded &&
        node.children.map((child) => (
          <LayerRow key={child.id} {...props} node={child} depth={depth + 1} />
        ))}
    </>
  );
}

/**
 * FR-29 图层树：拖拽重排与跨容器、双击重命名、显隐/锁定、类型图标、
 * 画布选中 → 自动展开父级并滚动高亮（双向同步）。
 */
export function Layers() {
  const { state, dispatch } = useEditor();
  const geometry = useCanvasGeometry();
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [dropHint, setDropHint] = useState<{ id: string; zone: DropZone } | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const pendingScrollRef = useRef<string | null>(null);

  // 画布选中 → 自动展开所有父级（FR-29 双向同步）
  useEffect(() => {
    if (!state.selectedIds.length) return;
    setCollapsed((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of state.selectedIds) {
        for (const a of collectAncestorIds(state.page.root, id)) {
          if (next.delete(a)) changed = true;
        }
      }
      return changed ? next : prev;
    });
    pendingScrollRef.current = state.selectedIds[state.selectedIds.length - 1];
  }, [state.selectedIds, state.page]);

  // 展开后滚动到选中行
  useEffect(() => {
    const id = pendingScrollRef.current;
    if (!id) return;
    pendingScrollRef.current = null;
    const el = document.querySelector(`[data-node-id="${id}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [collapsed, state.selectedIds]);

  const zoneFor = (e: React.DragEvent, node: UINode): DropZone => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientY - rect.top) / Math.max(1, rect.height);
    if (rel < 0.33) return 'before';
    if (rel > 0.66) return 'after';
    // 与画布 drop/findContainerAt 一致：RECTANGLE 不作嵌套目标，中区退化为 before/after
    if (node.type === 'RECTANGLE') return rel < 0.5 ? 'before' : 'after';
    return isContainer(node) ? 'inside' : rel < 0.5 ? 'before' : 'after';
  };

  const commitRename = () => {
    if (renamingId && renameText.trim()) dispatch({ type: 'UPDATE_NAME', id: renamingId, name: renameText.trim() });
    setRenamingId(null);
  };

  const rowProps: Omit<RowProps, 'node' | 'depth'> = {
    collapsed,
    onToggle: (id) =>
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    renamingId,
    renameText,
    setRenameText: setRenameText,
    onStartRename: (node) => {
      setRenamingId(node.id);
      setRenameText(node.name ?? '');
    },
    onCommitRename: commitRename,
    onCancelRename: () => setRenamingId(null),
    dropHint,
    onDragStartRow: (id) => {
      dragIdRef.current = id;
    },
    onDragOverRow: (e, node) => {
      if (!dragIdRef.current) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const zone = zoneFor(e, node);
      setDropHint((prev) => (prev?.id === node.id && prev.zone === zone ? prev : { id: node.id, zone }));
    },
    onDropRow: (e, node) => {
      e.preventDefault();
      const dragId = dragIdRef.current;
      const zone = zoneFor(e, node);
      dragIdRef.current = null;
      setDropHint(null);
      if (!dragId || dragId === node.id) return;

      let parentId: string;
      let pos: number;
      if (zone === 'inside') {
        if (!isContainer(node) || node.type === 'RECTANGLE') return;
        parentId = node.id;
        pos = node.children.length;
      } else {
        const found = findById(state.page.root, node.id);
        if (!found?.parent) return;
        parentId = found.parent.id;
        pos = found.parent.children.findIndex((c) => c.id === node.id) + (zone === 'after' ? 1 : 0);
      }

      const dragFound = findById(state.page.root, dragId);
      if (!dragFound) return;
      const sameParent = dragFound.parent?.id === parentId;
      const oldIdx = sameParent ? dragFound.parent!.children.findIndex((c) => c.id === dragId) : -1;
      // store 的 MOVE_NODE 是「先摘除再按下标插入」——下标按摘除后的数组空间计算
      let insertAt = pos;
      if (sameParent && oldIdx >= 0 && oldIdx < pos) insertAt -= 1;
      insertAt = Math.max(0, insertAt);

      const targetParent = findById(state.page.root, parentId)?.node;
      let patch: { x: number; y: number } | undefined;
      if (targetParent && targetParent.layout.mode === 'ABSOLUTE' && geometry) {
        const dragG = geometry[dragId];
        const parentG = geometry[parentId];
        if (dragG && parentG) {
          const p = targetParent.layout.padding ?? [0, 0, 0, 0];
          const ml = dragFound.node.layout.margin?.[3] ?? 0;
          const mt = dragFound.node.layout.margin?.[0] ?? 0;
          patch = {
            x: Math.round(dragG.x - (parentG.x + p[3]) - ml),
            y: Math.round(dragG.y - (parentG.y + p[0]) - mt),
          };
        }
      }
      dispatch({ type: 'MOVE_NODE', id: dragId, parentId, index: insertAt, ...(patch ? { patch } : {}) });
    },
    onDragEndRow: () => {
      dragIdRef.current = null;
      setDropHint(null);
    },
  };

  return (
    <div className="layers">
      <div className="panel-title">图层</div>
      <div className="layer-list">
        <LayerRow node={state.page.root} depth={0} {...rowProps} />
      </div>
    </div>
  );
}
