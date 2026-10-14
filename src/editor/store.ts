import { createContext, useContext } from 'react';
import type { NodeKind, UINode, UIPage, LayoutSchema, StyleSchema, ContainerNode, ExportSetting } from '../schema/types';
import { isContainer } from '../schema/types';
import { clonePage, createNode, findById } from '../schema/factory';

export type Tool = 'select' | 'hand' | 'frame' | 'section' | 'slice' | 'rect' | 'ellipse' | 'line' | 'polygon' | 'star' | 'text' | 'pen' | 'image';

export interface EditorState {
  page: UIPage;
  projectName: string;
  selectedIds: string[];
  past: UIPage[];
  future: UIPage[];
  pendingBaseline: UIPage | null;
  /** 复制（Ctrl+C）快照，粘贴（Ctrl+V）时深拷贝出新 id；不进历史、不进自动保存 */
  clipboard: UINode[];
  /** 当前工具（视图态，不进历史）；M1 落地 select/hand，其余字母切换与光标 M1 即具备 */
  tool: Tool;
}

export type EditorAction =
  | { type: 'SELECT'; id: string | null; additive?: boolean }
  | { type: 'SELECT_MANY'; ids: string[] }
  | { type: 'SET_TOOL'; tool: Tool }
  | { type: 'ADD_NODE'; kind: NodeKind; parentId?: string; index?: number }
  | { type: 'UPDATE_LAYOUT'; id: string; patch: Partial<LayoutSchema>; transient?: boolean }
  | { type: 'UPDATE_LAYOUT_MULTI'; patches: { id: string; patch: Partial<LayoutSchema> }[]; transient?: boolean }
  | { type: 'UPDATE_STYLE'; id: string; patch: Partial<StyleSchema>; transient?: boolean }
  | { type: 'UPDATE_TEXT'; id: string; text: string; transient?: boolean }
  | { type: 'UPDATE_SRC'; id: string; src: string; transient?: boolean }
  | { type: 'UPDATE_NAME'; id: string; name: string }
  | { type: 'UPDATE_EXPORT_SETTINGS'; id: string; settings: ExportSetting[] }
  | { type: 'DELETE'; ids?: string[] }
  | { type: 'COPY'; ids?: string[] }
  | { type: 'PASTE' }
  | { type: 'DUPLICATE'; ids?: string[] }
  | { type: 'MOVE_NODE'; id: string; parentId: string; index: number; patch?: Partial<LayoutSchema> }
  | { type: 'REORDER'; id: string; direction: 'up' | 'down' }
  | { type: 'REORDER_Z'; id: string; to: 'front' | 'back' }
  | {
      /** 成组：结构动作在 reducer 完成；坐标类补丁由 Canvas（持有几何）预计算后传入 */
      type: 'GROUP';
      ids?: string[];
      frameLayout?: Partial<LayoutSchema>;
      offsets?: Record<string, { x: number; y: number }>;
    }
  | { type: 'TOGGLE_LOCK'; ids?: string[] }
  | { type: 'TOGGLE_VISIBLE'; id: string }
  | {
      /** FR-14 Frame 拖画/预设创建：结构与坐标补丁在 reducer 完成，插入索引由 Canvas（持有几何）预计算 */
      type: 'CREATE_FRAME';
      width: number;
      height: number;
      parentId: string;
      index?: number;
      patch?: Partial<LayoutSchema>;
      name?: string;
    }
  | { type: 'NUDGE'; dx: number; dy: number }
  | {
      /** FR-15/16 工具创建：Canvas 预构建完整节点（含 id，文本需创建后立即进入编辑态）后插入 */
      type: 'INSERT_NODE';
      node: UINode;
      parentId: string;
      index?: number;
      patch?: Partial<LayoutSchema>;
    }
  | { type: 'COMMIT' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'LOAD_PAGE'; page: UIPage; projectName?: string }
  | { type: 'NEW_PAGE' }
  | { type: 'RENAME_PAGE'; name: string };

/** FR-11：撤销重做历史 ≥100 步 */
const HISTORY_LIMIT = 100;

export function initialState(page: UIPage, projectName = '未命名项目'): EditorState {
  return {
    page,
    projectName,
    selectedIds: [page.root.id],
    past: [],
    future: [],
    pendingBaseline: null,
    clipboard: [],
    tool: 'select',
  };
}

function pushHistory(state: EditorState, nextPage: UIPage): EditorState {
  // 若有未提交的 transient 基线（如连续微调），新动作提交前先把基线入栈，
  // 否则 pushHistory 清空 pendingBaseline 会让「微调」这一步永远无法撤销（FR-11 往返一致）
  let past = state.past;
  if (state.pendingBaseline) past = [...past, state.pendingBaseline];
  past = [...past, clonePage(state.page)].slice(-HISTORY_LIMIT);
  return { ...state, page: nextPage, past, future: [], pendingBaseline: null };
}

/** 连续微调（resize / 输入）只记录一次历史：首次变更时暂存基线 */
function transientEdit(state: EditorState, nextPage: UIPage): EditorState {
  if (state.pendingBaseline) return { ...state, page: nextPage };
  return { ...state, page: nextPage, pendingBaseline: clonePage(state.page), future: [] };
}

function selectedPrimary(state: EditorState): string {
  return state.selectedIds[state.selectedIds.length - 1] ?? state.page.root.id;
}

function effectiveParentId(state: EditorState): string {
  const id = selectedPrimary(state);
  const found = findById(state.page.root, id);
  if (!found) return state.page.root.id;
  return isContainer(found.node) ? found.node.id : (found.parent?.id ?? state.page.root.id);
}

function isDescendant(root: UINode, ancestorId: string, targetId: string): boolean {
  const found = findById(root, ancestorId);
  if (!found || !isContainer(found.node)) return false;
  let hit = false;
  const walk = (n: UINode): void => {
    if (n.id === targetId) hit = true;
    if (isContainer(n)) n.children.forEach(walk);
  };
  walk(found.node);
  return hit;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SELECT': {
      if (action.id == null) return { ...state, selectedIds: [] };
      if (action.additive) {
        const has = state.selectedIds.includes(action.id);
        return {
          ...state,
          selectedIds: has ? state.selectedIds.filter((x) => x !== action.id) : [...state.selectedIds, action.id],
        };
      }
      return { ...state, selectedIds: [action.id] };
    }

    case 'SELECT_MANY': {
      const ids = action.ids.filter((id) => id !== state.page.root.id);
      return { ...state, selectedIds: ids };
    }

    case 'SET_TOOL': {
      if (action.tool === state.tool) return state;
      return { ...state, tool: action.tool };
    }

    case 'UPDATE_LAYOUT_MULTI': {
      if (!action.patches.length) return state;
      const nextPage = clonePage(state.page);
      for (const p of action.patches) {
        const found = findById(nextPage.root, p.id);
        if (found) Object.assign(found.node.layout, p.patch);
      }
      return action.transient ? transientEdit(state, nextPage) : pushHistory(state, nextPage);
    }

    case 'TOGGLE_LOCK': {
      const ids = action.ids ?? state.selectedIds;
      if (!ids.length || ids.includes(state.page.root.id)) return state;
      const nextPage = clonePage(state.page);
      let changed = false;
      const visit = (node: UINode): void => {
        if (ids.includes(node.id)) {
          node.locked = !node.locked;
          changed = true;
        }
        if (isContainer(node)) node.children.forEach(visit);
      };
      visit(nextPage.root);
      if (!changed) return state;
      return pushHistory(state, nextPage);
    }

    case 'TOGGLE_VISIBLE': {
      if (action.id === state.page.root.id) return state;
      const nextPage = clonePage(state.page);
      const found = findById(nextPage.root, action.id);
      if (!found) return state;
      // 两态语义：undefined（可见）↔ false（隐藏），避免翻出冗余的 true
      found.node.visible = found.node.visible === false ? undefined : false;
      return pushHistory(state, nextPage);
    }

    case 'CREATE_FRAME': {
      const nextPage = clonePage(state.page);
      const parentFound = findById(nextPage.root, action.parentId);
      if (!parentFound || !isContainer(parentFound.node)) return state;
      const parent = parentFound.node;
      const frame = createNode('FRAME', action.name ? { name: action.name } : {}) as ContainerNode;
      frame.layout = {
        ...frame.layout,
        width: action.width,
        height: action.height,
        widthMode: 'FIXED',
        heightMode: 'FIXED',
        ...(parent.layout.mode === 'ABSOLUTE' ? { mode: 'ABSOLUTE' as const, x: 0, y: 0 } : {}),
        ...(action.patch ?? {}),
      };
      const index = Math.max(0, Math.min(action.index ?? parent.children.length, parent.children.length));
      parent.children.splice(index, 0, frame);
      const next = pushHistory(state, nextPage);
      return { ...next, selectedIds: [frame.id] };
    }

    case 'NUDGE': {
      if (!action.dx && !action.dy) return state;
      const nextPage = clonePage(state.page);
      let changed = false;
      for (const id of state.selectedIds) {
        const found = findById(nextPage.root, id);
        if (!found?.parent || found.parent.layout.mode !== 'ABSOLUTE') continue;
        if (found.node.locked) continue;
        found.node.layout.x = (found.node.layout.x ?? 0) + action.dx;
        found.node.layout.y = (found.node.layout.y ?? 0) + action.dy;
        changed = true;
      }
      if (!changed) return state;
      return transientEdit(state, nextPage);
    }

    case 'INSERT_NODE': {
      const nextPage = clonePage(state.page);
      const parentFound = findById(nextPage.root, action.parentId);
      if (!parentFound || !isContainer(parentFound.node)) return state;
      const parent = parentFound.node;
      const node = structuredClone(action.node);
      if (action.patch) Object.assign(node.layout, action.patch);
      const index = Math.max(0, Math.min(action.index ?? parent.children.length, parent.children.length));
      parent.children.splice(index, 0, node);
      const next = pushHistory(state, nextPage);
      return { ...next, selectedIds: [node.id] };
    }

    case 'GROUP': {
      const ids = (action.ids ?? state.selectedIds).filter((id) => id !== state.page.root.id);
      if (!ids.length) return state;
      const nextPage = clonePage(state.page);
      // 仅对同一父级下的节点成组（不同父级取第一个节点的父级，其余忽略）
      const first = findById(nextPage.root, ids[0]);
      if (!first?.parent) return state;
      const parent = first.parent;
      const members = parent.children.filter((c) => ids.includes(c.id) && !c.locked);
      if (!members.length) return state;
      const memberIds = new Set(members.map((m) => m.id));
      const insertIndex = parent.children.findIndex((c) => memberIds.has(c.id));

      const frame = createNode('FRAME') as ContainerNode;
      const isAbs = parent.layout.mode === 'ABSOLUTE';
      frame.layout = {
        ...frame.layout,
        mode: isAbs ? 'ABSOLUTE' : parent.layout.mode,
        widthMode: isAbs ? 'FIXED' : 'HUG',
        heightMode: isAbs ? 'FIXED' : 'HUG',
        gap: isAbs ? 0 : (parent.layout.gap ?? 0),
        align: parent.layout.align,
        justify: parent.layout.justify,
        padding: [0, 0, 0, 0],
        ...(action.frameLayout ?? {}),
      };
      // 先摘出成员（保持原顺序），再按最小索引插入 frame
      const ordered = parent.children.filter((c) => memberIds.has(c.id));
      parent.children = parent.children.filter((c) => !memberIds.has(c.id));
      for (const m of ordered) {
        const off = action.offsets?.[m.id];
        if (off) {
          m.layout.x = off.x;
          m.layout.y = off.y;
        }
        frame.children.push(m);
      }
      parent.children.splice(Math.min(insertIndex, parent.children.length), 0, frame);
      const next = pushHistory(state, nextPage);
      return { ...next, selectedIds: [frame.id] };
    }

    case 'REORDER_Z': {
      const found = findById(state.page.root, action.id);
      if (!found?.parent || action.id === state.page.root.id) return state;
      const parent = found.parent;
      if (parent.children.length < 2) return state;
      const nextPage = clonePage(state.page);
      const f2 = findById(nextPage.root, action.id);
      if (!f2?.parent) return state;
      const arr = f2.parent.children;
      const idx = arr.findIndex((c) => c.id === action.id);
      if (idx < 0) return state;
      const [node] = arr.splice(idx, 1);
      if (action.to === 'front') arr.push(node);
      else arr.unshift(node);
      return pushHistory(state, nextPage);
    }

    case 'ADD_NODE': {
      const parentId = action.parentId ?? effectiveParentId(state);
      const found = findById(state.page.root, parentId);
      if (!found || !isContainer(found.node)) return state;
      const nextPage = clonePage(state.page);
      const target = findById(nextPage.root, parentId);
      if (!target || !isContainer(target.node)) return state;
      const node = createNode(action.kind);
      const index = action.index ?? target.node.children.length;
      target.node.children.splice(index, 0, node);
      const next = pushHistory(state, nextPage);
      return { ...next, selectedIds: [node.id] };
    }

    case 'UPDATE_LAYOUT': {
      const nextPage = clonePage(state.page);
      const found = findById(nextPage.root, action.id);
      if (!found) return state;
      Object.assign(found.node.layout, action.patch);
      return action.transient ? transientEdit(state, nextPage) : pushHistory(state, nextPage);
    }

    case 'UPDATE_STYLE': {
      const nextPage = clonePage(state.page);
      const found = findById(nextPage.root, action.id);
      if (!found) return state;
      found.node.style = { ...(found.node.style ?? {}), ...action.patch };
      return action.transient ? transientEdit(state, nextPage) : pushHistory(state, nextPage);
    }

    case 'UPDATE_TEXT': {
      const nextPage = clonePage(state.page);
      const found = findById(nextPage.root, action.id);
      if (!found || (found.node.type !== 'TEXT' && found.node.type !== 'BUTTON')) return state;
      (found.node as { text: string }).text = action.text;
      return action.transient ? transientEdit(state, nextPage) : pushHistory(state, nextPage);
    }

    case 'UPDATE_SRC': {
      const nextPage = clonePage(state.page);
      const found = findById(nextPage.root, action.id);
      if (!found || found.node.type !== 'IMAGE') return state;
      found.node.src = action.src;
      return action.transient ? transientEdit(state, nextPage) : pushHistory(state, nextPage);
    }

    case 'UPDATE_NAME': {
      const nextPage = clonePage(state.page);
      const found = findById(nextPage.root, action.id);
      if (!found) return state;
      found.node.name = action.name;
      return pushHistory(state, nextPage);
    }

    case 'UPDATE_EXPORT_SETTINGS': {
      const nextPage = clonePage(state.page);
      const found = findById(nextPage.root, action.id);
      if (!found) return state;
      if (action.settings.length) found.node.exportSettings = action.settings;
      else delete found.node.exportSettings;
      return pushHistory(state, nextPage);
    }

    case 'DELETE': {
      const ids = action.ids ?? state.selectedIds;
      if (!ids.length || ids.includes(state.page.root.id)) return state;
      const nextPage = clonePage(state.page);
      const remove = (container: UINode): void => {
        if (!isContainer(container)) return;
        container.children = container.children.filter((c) => !ids.includes(c.id));
        container.children.forEach(remove);
      };
      remove(nextPage.root);
      const next = pushHistory(state, nextPage);
      return { ...next, selectedIds: [] };
    }

    case 'COPY': {
      const ids = action.ids ?? state.selectedIds;
      const nodes: UINode[] = [];
      for (const id of ids) {
        if (id === state.page.root.id) continue;
        const found = findById(state.page.root, id);
        if (found) nodes.push(JSON.parse(JSON.stringify(found.node)) as UINode);
      }
      if (!nodes.length) return state;
      return { ...state, clipboard: nodes };
    }

    case 'PASTE': {
      if (!state.clipboard.length) return state;
      const parentId = effectiveParentId(state);
      const nextPage = clonePage(state.page);
      const target = findById(nextPage.root, parentId);
      if (!target || !isContainer(target.node)) return state;
      const newIds: string[] = [];
      for (const src of state.clipboard) {
        const copy = cloneCopy(src);
        newIds.push(copy.id);
        target.node.children.push(copy);
      }
      const next = pushHistory(state, nextPage);
      return { ...next, selectedIds: newIds };
    }

    case 'DUPLICATE': {
      const ids = action.ids ?? state.selectedIds;
      if (!ids.length) return state;
      const nextPage = clonePage(state.page);
      const newIds: string[] = [];
      const dup = (container: UINode): void => {
        if (!isContainer(container)) return;
        const result: UINode[] = [];
        for (const child of container.children) {
          result.push(child);
          if (ids.includes(child.id)) {
            const copy = cloneCopy(child);
            newIds.push(copy.id);
            result.push(copy);
          }
        }
        container.children = result;
        container.children.forEach(dup);
      };
      dup(nextPage.root);
      if (!newIds.length) return state;
      const next = pushHistory(state, nextPage);
      return { ...next, selectedIds: newIds };
    }

    case 'MOVE_NODE': {
      if (action.id === action.parentId || isDescendant(state.page.root, action.id, action.parentId)) return state;
      const nextPage = clonePage(state.page);
      const found = findById(nextPage.root, action.id);
      const parent = findById(nextPage.root, action.parentId);
      if (!found || !parent || !isContainer(parent.node)) return state;
      if (found.parent) {
        const idx = found.parent.children.findIndex((c) => c.id === action.id);
        if (idx >= 0) found.parent.children.splice(idx, 1);
      }
      const node = found.node;
      if (action.patch) Object.assign(node.layout, action.patch);
      // FR-36：拖入流式容器 → 退出 Ignore auto layout（进流，恢复切走前方向，缺省纵向）
      if (parent.node.layout.mode !== 'ABSOLUTE' && node.layout.mode === 'ABSOLUTE') {
        node.layout.mode = node.layout.prevMode ?? 'VERTICAL';
        delete node.layout.prevMode;
        delete node.layout.x;
        delete node.layout.y;
      }
      const insertAt = Math.min(action.index, parent.node.children.length);
      parent.node.children.splice(insertAt, 0, node);
      return pushHistory(state, nextPage);
    }

    case 'REORDER': {
      const id = action.id;
      const found = findById(state.page.root, id);
      if (!found?.parent) return state;
      const siblings = found.parent.children;
      const idx = siblings.findIndex((c) => c.id === id);
      const target = action.direction === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || target < 0 || target >= siblings.length) return state;
      const nextPage = clonePage(state.page);
      const f2 = findById(nextPage.root, id);
      if (!f2?.parent) return state;
      const arr = f2.parent.children;
      const i2 = arr.findIndex((c) => c.id === id);
      const [node] = arr.splice(i2, 1);
      arr.splice(target, 0, node);
      return pushHistory(state, nextPage);
    }

    case 'COMMIT': {
      if (!state.pendingBaseline) return state;
      const past = [...state.past, state.pendingBaseline].slice(-HISTORY_LIMIT);
      return { ...state, past, pendingBaseline: null, future: [] };
    }

    case 'UNDO': {
      if (state.pendingBaseline) {
        return {
          ...state,
          page: state.pendingBaseline,
          pendingBaseline: null,
          future: [clonePage(state.page), ...state.future].slice(0, HISTORY_LIMIT),
          selectedIds: [],
        };
      }
      if (!state.past.length) return state;
      const past = [...state.past];
      const prev = past.pop()!;
      const future = [clonePage(state.page), ...state.future];
      return { ...state, page: prev, past, future, selectedIds: [] };
    }

    case 'REDO': {
      if (!state.future.length) return state;
      const [next, ...rest] = state.future;
      const past = [...state.past, clonePage(state.page)].slice(-HISTORY_LIMIT);
      return { ...state, page: next, past, future: rest, selectedIds: [] };
    }

    case 'LOAD_PAGE':
      return {
        page: action.page,
        projectName: action.projectName ?? state.projectName,
        selectedIds: [action.page.root.id],
        past: [],
        future: [],
        pendingBaseline: null,
        clipboard: state.clipboard,
        tool: state.tool,
      };

    case 'NEW_PAGE': {
      return { ...initialState(createNewPage(), state.projectName), clipboard: state.clipboard };
    }

    case 'RENAME_PAGE': {
      const nextPage = clonePage(state.page);
      nextPage.name = action.name;
      return { ...state, page: nextPage, projectName: action.name };
    }

    default:
      return state;
  }
}

let copySeq = 0;
function cloneCopy(node: UINode): UINode {
  copySeq += 1;
  const copy = JSON.parse(JSON.stringify(node)) as UINode;
  const reassign = (n: UINode): void => {
    n.id = `${n.id}-copy${copySeq}`;
    if (n.name) n.name = `${n.name} 副本`;
    if (isContainer(n)) n.children.forEach(reassign);
  };
  reassign(copy);
  return copy;
}

function createNewPage(): UIPage {
  const page = createNode('PAGE', { id: 'page', name: '未命名页面' }) as UINode as import('../schema/types').ContainerNode;
  return {
    id: 'page',
    name: '未命名页面',
    viewport: { width: 375, height: 812 },
    root: page,
  };
}

export interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('EditorContext missing');
  return ctx;
}
