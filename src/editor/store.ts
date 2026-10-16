import { createContext, useContext } from 'react';
import type { NodeKind, UINode, UIPage, UIProject, LayoutSchema, StyleSchema, ContainerNode, ExportSetting, PrototypeInteraction, ImageAdjustments, ComponentDef, StyleToken, VectorData, LayoutGridSchema } from '../schema/types';
import type { StyleTokenKind } from '../schema/types';
import { isContainer } from '../schema/types';
import { clonePage, createNode, findById, nextId, walk } from '../schema/factory';
import { findVariant, variantGroupOf, variantsInGroup } from './variants';
import { BOOLEAN_OP_NAME, booleanVectorOf, type BooleanOp } from '../compiler/boolean';

/** FR-29：两属性组合是否等价（键集合与取值全等） */
function sameProps(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => a[k] === b[k]);
}

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
  /* ---- M4 单点合入：C 轨（组件/样式）状态域。与 page 历史独立——组件表增删不受 Ctrl+Z 影响（Assets 语义） ---- */
  /** FR-25 主组件表：id → ComponentDef（挂 root 级，不参与画布渲染） */
  components: Record<string, ComponentDef>;
  /** FR-27/28 样式表（Color/Text 等），可导出 tokens.css */
  tokens: StyleToken[];
  /** FR-28 变量序号：--uic-paint-N / --uic-text-N 自增，保证表内唯一 */
  styleSeq: number;
  /* ---- M4 单点合入：P 轨（多 Page）状态域。page 保留为「当前页视图」，pages 为唯一权威 ---- */
  /** FR-39 页面列表（对应 UIProject.pages） */
  pages: UIPage[];
  /** FR-39 当前页 id（用于回写 pages[i]） */
  currentPageId: string;
  /** FR-39 每页独立历史（切页不入任何 undo 栈，Figma 语义） */
  history: Record<string, { past: UIPage[]; future: UIPage[]; pendingBaseline: UIPage | null }>;
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
  /** FR-39/59：v2 工程整体载入（File→打开；pages/components/tokens 随工程重置） */
  | { type: 'LOAD_PROJECT'; project: UIProject }
  | { type: 'NEW_PAGE' }
  | { type: 'RENAME_PAGE'; name: string }
  /* ---- Wave2 主线单点共享 action（D0 schema-decisions §二热点规则：P/C 轨道消费、不各自加）---- */
  | { type: 'UPDATE_IMAGE_ADJUSTMENTS'; id: string; adjustments: ImageAdjustments | undefined; transient?: boolean }
  | { type: 'UPDATE_INTERACTIONS'; id: string; interactions: PrototypeInteraction[] }
  | { type: 'SET_FLOW_START'; id: string | null }
  /* ---- M4 C 轨（组件/样式/tokens）action 段：本轨独占维护 ---- */
  /** FR-25 选区→主组件（root 子树重排 id 入表；节点挂 componentId） */
  | { type: 'CREATE_COMPONENT'; id?: string; name?: string }
  /** FR-25 插入实例（深拷贝快照 + componentId；子树重排 id） */
  | { type: 'INSERT_INSTANCE'; componentId: string; parentId?: string; index?: number }
  /** FR-25 Detach instance（仅删标记，不动 id） */
  | { type: 'DETACH_INSTANCE'; id: string }
  /** FR-25 改主组件→实例跟随（选中实例子树回写 components[id].root，清 overrides） */
  | { type: 'PUSH_TO_COMPONENT'; id: string }
  /** FR-27 建样式（PAINT/TEXT；自动派生 cssVar 自增序号） */
  | { type: 'CREATE_TOKEN'; kind: StyleTokenKind; name?: string; style: Partial<StyleSchema>; nodeId?: string; grids?: LayoutGridSchema[] }
  /** FR-27 改样式→全部引用者同步 */
  | { type: 'UPDATE_TOKEN'; id: string; style?: Partial<StyleSchema>; name?: string; grids?: LayoutGridSchema[] }
  /** FR-27 删样式（清引用） */
  | { type: 'DELETE_TOKEN'; id: string }
  /** FR-27 应用样式（style 浅合并进节点；记 styleTokenId） */
  | { type: 'APPLY_TOKEN'; tokenId: string; nodeId?: string }
  /** FR-27 Detach style（仅删引用，样式值留在节点上） */
  | { type: 'DETACH_TOKEN'; id: string }
  /** FR-29 新建变体：以选中实例当前内容为该组合的变体成员入组 */
  | { type: 'CREATE_VARIANT'; id?: string; props: Record<string, string>; name?: string }
  /** FR-29 切换实例属性组合（改 componentId 指向组内匹配成员；命中失败回退首成员） */
  | { type: 'SET_VARIANT_PROPS'; id: string; props: Record<string, string> }
  /** FR-29 更新变体成员属性（改 variantProps；重名同组合则拒绝） */
  | { type: 'UPDATE_VARIANT_PROPS'; componentId: string; props: Record<string, string> }
  /* ---- M5 P 轨（多 Page）action 段 ---- */
  /** FR-39 新建页（尾插 + 切为当前页；走项目级操作，不进任何页历史） */
  | { type: 'ADD_PAGE'; name?: string }
  /** FR-39 删除页（至少保留 1 页；不做级联清理，broken link 由消费端处理） */
  | { type: 'DELETE_PAGE'; id?: string }
  /** FR-39 切换页（先 flush 当前页 pendingBaseline，避免丢一步微调） */
  | { type: 'SELECT_PAGE'; id: string }
  /** FR-39 复制页（深拷贝 + 全树重排 id） */
  | { type: 'DUPLICATE_PAGE'; id?: string }
  /** FR-39 重命名页 */
  | { type: 'RENAME_PAGE_BY_ID'; id: string; name: string }
  /** FR-39 页排序（移至目标索引） */
  | { type: 'REORDER_PAGE'; id: string; toIndex: number }
  /* ---- M4 余项：FR-22 布尔 / FR-23 蒙版 UI 入口 ---- */
  /** FR-22 布尔运算：对选中 VECTOR 参集合并为一条结果 VECTOR（原参集删除） */
  | { type: 'BOOLEAN_OP'; op: BooleanOp }
  /** FR-23 Use as mask：把选中容器标记/取消为蒙版组（复用 layout.clipContent 作显式开关） */
  | { type: 'TOGGLE_MASK'; ids?: string[] };

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
    // M4：C 轨状态域（空表起步；LOAD_PAGE/NEW_PAGE 时重置，与 clipboard 同款保留策略）
    components: {},
    tokens: [],
    styleSeq: 0,
    // M4：P 轨状态域——单页起步，pages[0] 即当前页（既有单页测试零感知）
    pages: [page],
    currentPageId: page.id,
    history: {},
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

/**
 * FR-39 多页同步：`page` 为「当前页视图」，`pages` 为唯一权威。
 *
 * 设计：既有 ~60 个 case 全部读写 `state.page`，逐 case 改造风险极高且易漏。
 * 故在 reducer 出口**单点回写**——凡本次 `page` 引用发生变化（新对象），
 * 即把 `pages[currentPageId]` 换成新引用。切页类 action 自行维护 pages/currentPageId，
 * 由 `skipPageSync` 标记跳过（它们已把 page 指向另一页，不应再用它覆盖当前页条目）。
 */
function syncPages(state: EditorState, prevPage: UIPage, skipPageSync: boolean): EditorState {
  if (skipPageSync || state.page === prevPage) return state;
  const idx = state.pages.findIndex((p) => p.id === state.currentPageId);
  if (idx < 0) return state;
  const pages = [...state.pages];
  pages[idx] = state.page;
  return { ...state, pages };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  return syncPages(reduce(state, action), state.page, PAGE_ACTIONS.has(action.type));
}

/** 自行维护 pages/currentPageId 的 action（不经出口回写） */
const PAGE_ACTIONS = new Set<EditorAction['type']>([
  'ADD_PAGE',
  'DELETE_PAGE',
  'SELECT_PAGE',
  'DUPLICATE_PAGE',
  'RENAME_PAGE_BY_ID',
  'REORDER_PAGE',
  'LOAD_PAGE',
  'LOAD_PROJECT',
  'NEW_PAGE',
]);

function reduce(state: EditorState, action: EditorAction): EditorState {
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
      // P1-08：改名回流组件表——实例/主组件改名时同步 components[].name（差异 #6①）
      // 语义：改名该实例所在的组件定义（Figma 中改实例名即改组件名，所有实例名跟随）。
      const compId = found.node.componentId;
      const base = pushHistory(state, nextPage);
      if (!compId || !state.components[compId]) return base;
      return {
        ...base,
        components: { ...state.components, [compId]: { ...state.components[compId], name: action.name } },
      };
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
      // M4：C 轨组件/样式表随载入重置（跨工程不串味）；P 轨 pages 重置为单页
      return {
        ...state,
        page: action.page,
        projectName: action.projectName ?? state.projectName,
        selectedIds: [action.page.root.id],
        past: [],
        future: [],
        pendingBaseline: null,
        clipboard: state.clipboard,
        tool: state.tool,
        components: {},
        tokens: [],
        styleSeq: 0,
        pages: [action.page],
        currentPageId: action.page.id,
        history: {},
      };

    case 'LOAD_PROJECT': {
      // v2 工程载入：pages 为权威、当前页=首页；组件/样式表随工程装载（与 LOAD_PAGE 的「空表重置」不同——
      // 工程本体就带着它们；styleSeq 抬高到表长+1 防撞）。历史/选区清零（跨工程不串味）。
      const pages = action.project.pages.length ? action.project.pages : [createNewPage()];
      const first = pages[0];
      return {
        ...state,
        page: first,
        projectName: action.project.name,
        selectedIds: [first.root.id],
        past: [],
        future: [],
        pendingBaseline: null,
        clipboard: state.clipboard,
        tool: state.tool,
        components: action.project.components ?? {},
        tokens: action.project.tokens ?? [],
        styleSeq: (action.project.tokens?.length ?? 0) + 1,
        pages,
        currentPageId: first.id,
        history: {},
      };
    }

    case 'NEW_PAGE': {
      const fresh = initialState(createNewPage(), state.projectName);
      return { ...fresh, clipboard: state.clipboard };
    }

    case 'RENAME_PAGE': {
      const nextPage = clonePage(state.page);
      nextPage.name = action.name;
      return { ...state, page: nextPage, projectName: action.name };
    }

    /* ---- Wave2 共享 action 段（主线单点维护）---- */
    case 'UPDATE_IMAGE_ADJUSTMENTS': {
      const nextPage = clonePage(state.page);
      const found = findById(nextPage.root, action.id);
      if (!found || found.node.type !== 'IMAGE') return state;
      found.node.imageAdjustments = action.adjustments;
      return action.transient ? transientEdit(state, nextPage) : pushHistory(state, nextPage);
    }

    case 'UPDATE_INTERACTIONS': {
      const nextPage = clonePage(state.page);
      const found = findById(nextPage.root, action.id);
      if (!found) return state;
      found.node.interactions = action.interactions.length ? action.interactions : undefined;
      return pushHistory(state, nextPage);
    }

    case 'SET_FLOW_START': {
      const nextPage = clonePage(state.page);
      const clear = (n: UINode): void => {
        if (n.flowStart) n.flowStart = undefined;
        if (isContainer(n)) n.children.forEach(clear);
      };
      clear(nextPage.root);
      if (action.id) {
        const found = findById(nextPage.root, action.id);
        if (!found) return state;
        found.node.flowStart = true;
      }
      return pushHistory(state, nextPage);
    }

    /* ---- M4 C 轨（组件/样式/tokens）action 段 ---- */
    case 'CREATE_COMPONENT': {
      // FR-25：选中节点 → 主组件（叶子包 FRAME root；子树重排 id 避免与实例撞号）
      const targetId = action.id ?? selectedPrimary(state);
      const found = findById(state.page.root, targetId);
      if (!found) return state;
      const nextPage = clonePage(state.page);
      const found2 = findById(nextPage.root, targetId);
      if (!found2) return state;
      const reassign = (n: UINode): void => {
        n.id = nextId(n.type === 'PAGE' ? 'page' : 'n');
        if (isContainer(n)) n.children.forEach(reassign);
      };
      const snapshot = JSON.parse(JSON.stringify(found2.node)) as UINode;
      reassign(snapshot);
      const rootNode: ContainerNode =
        isContainer(snapshot) && snapshot.type !== 'RECTANGLE'
          ? (snapshot as ContainerNode)
          : (() => {
              // 叶子包一层 FRAME（组件 root 需可容纳实例内容）
              const wrap = createNode('FRAME') as ContainerNode;
              wrap.id = nextId('n');
              wrap.name = found2.node.name ?? 'Component';
              wrap.layout = { ...wrap.layout, width: found2.node.layout.width ?? 100, height: found2.node.layout.height ?? 100 };
              wrap.children = [snapshot];
              return wrap;
            })();
      const compId = nextId('comp');
      found2.node.componentId = compId;
      return {
        ...pushHistory(state, nextPage),
        components: {
          ...state.components,
          [compId]: {
            id: compId,
            name: action.name ?? found2.node.name ?? 'Component',
            root: rootNode,
            createdAt: Date.now(),
          },
        },
      };
    }

    case 'INSERT_INSTANCE': {
      // FR-25：实例=深拷贝快照+componentId（画布零改动）；子树重排 id
      const def = state.components[action.componentId];
      if (!def) return state;
      const nextPage = clonePage(state.page);
      const parentId = action.parentId ?? effectiveParentId(state);
      const parent = findById(nextPage.root, parentId);
      if (!parent || !isContainer(parent.node)) return state;
      const inst = JSON.parse(JSON.stringify(def.root)) as ContainerNode;
      const reassign = (n: UINode): void => {
        n.id = nextId('n');
        if (isContainer(n)) n.children.forEach(reassign);
      };
      reassign(inst);
      inst.componentId = action.componentId;
      const idx = action.index ?? parent.node.children.length;
      parent.node.children.splice(Math.max(0, Math.min(idx, parent.node.children.length)), 0, inst);
      return pushHistory({ ...state, page: nextPage, selectedIds: [inst.id] }, nextPage);
    }

    case 'DETACH_INSTANCE': {
      const nextPage = clonePage(state.page);
      const found = findById(nextPage.root, action.id);
      if (!found || !found.node.componentId) return state;
      found.node.componentId = undefined;
      found.node.instanceOverrides = undefined;
      return pushHistory(state, nextPage);
    }

    case 'PUSH_TO_COMPONENT': {
      // FR-25：选中实例→回写主组件 root（清 overrides）；实例因引用同表在下次读取呈现新内容
      const nextPage = clonePage(state.page);
      const found = findById(nextPage.root, action.id);
      const compId = found?.node.componentId;
      if (!found || !compId || !state.components[compId]) return state;
      const snapshot = JSON.parse(JSON.stringify(found.node)) as UINode;
      delete snapshot.componentId;
      delete snapshot.instanceOverrides;
      const rootNode: ContainerNode = isContainer(snapshot) && snapshot.type !== 'RECTANGLE'
        ? (snapshot as ContainerNode)
        : (() => {
            const wrap = createNode('FRAME') as ContainerNode;
            wrap.name = found.node.name ?? 'Component';
            wrap.children = [snapshot];
            return wrap;
          })();
      return {
        ...state,
        components: { ...state.components, [compId]: { ...state.components[compId], root: rootNode } },
      };
    }

    case 'CREATE_TOKEN': {
      const tokenId = nextId('tok');
      const seq = state.styleSeq + 1;
      const prefix =
        action.kind === 'PAINT' ? '--uic-paint' : action.kind === 'TEXT' ? '--uic-text' : action.kind === 'EFFECT' ? '--uic-effect' : '--uic-grid';
      const labelCn = action.kind === 'PAINT' ? 'Paint' : action.kind === 'TEXT' ? 'Text' : action.kind === 'EFFECT' ? 'Effect' : 'Grid';
      const token: StyleToken = {
        id: tokenId,
        name: action.name ?? `${labelCn} ${seq}`,
        kind: action.kind,
        style: action.style,
        cssVar: `${prefix}-${seq}`,
        ...(action.kind === 'GRID' && action.grids ? { grids: action.grids } : {}),
      };
      // 若指定节点：创建即应用（style 浅合并 + 记引用；GRID 类额外写 layoutGrids）
      let base = { ...state, tokens: [...state.tokens, token], styleSeq: seq };
      if (action.nodeId) {
        const nextPage = clonePage(state.page);
        const found = findById(nextPage.root, action.nodeId);
        if (found) {
          found.node.style = {
            ...found.node.style,
            ...action.style,
            ...(action.kind === 'GRID' && action.grids ? { layoutGrids: action.grids } : {}),
          };
          found.node.styleTokenId = tokenId;
          base = { ...base, ...pushHistory(base, nextPage) };
        }
      }
      return base;
    }

    case 'UPDATE_TOKEN': {
      const token = state.tokens.find((t) => t.id === action.id);
      if (!token) return state;
      const nextStyle = action.style && Object.keys(action.style).length ? { ...token.style, ...action.style } : token.style;
      const nextGrids = action.grids ?? token.grids;
      const nextTokens = state.tokens.map((t) =>
        t.id === action.id
          ? { ...t, style: nextStyle, name: action.name ?? t.name, ...(nextGrids ? { grids: nextGrids } : {}) }
          : t,
      );
      // FR-27：引用者同步（浅合新样式；GRID 类额外同步 layoutGrids）
      const nextPage = clonePage(state.page);
      let touched = false;
      walk(nextPage.root, (n) => {
        if (n.styleTokenId === action.id) {
          n.style = {
            ...n.style,
            ...nextStyle,
            ...(action.grids && token.kind === 'GRID' ? { layoutGrids: action.grids } : {}),
          };
          touched = true;
        }
      });
      const merged = { ...state, tokens: nextTokens };
      return touched ? pushHistory(merged, nextPage) : merged;
    }

    case 'DELETE_TOKEN': {
      const nextPage = clonePage(state.page);
      let touched = false;
      walk(nextPage.root, (n) => {
        if (n.styleTokenId === action.id) {
          n.styleTokenId = undefined; // 样式值保留（Detach 语义）
          touched = true;
        }
      });
      const merged = { ...state, tokens: state.tokens.filter((t) => t.id !== action.id) };
      return touched ? pushHistory(merged, nextPage) : merged;
    }

    case 'APPLY_TOKEN': {
      const token = state.tokens.find((t) => t.id === action.tokenId);
      if (!token) return state;
      const targetId = action.nodeId ?? selectedPrimary(state);
      const nextPage = clonePage(state.page);
      const found = findById(nextPage.root, targetId);
      if (!found) return state;
      found.node.style = { ...found.node.style, ...token.style };
      found.node.styleTokenId = token.id;
      return pushHistory(state, nextPage);
    }

    case 'DETACH_TOKEN': {
      const nextPage = clonePage(state.page);
      const found = findById(nextPage.root, action.id);
      if (!found || !found.node.styleTokenId) return state;
      found.node.styleTokenId = undefined;
      return pushHistory(state, nextPage);
    }

    /* ---- FR-29 变体（C 轨 action 段） ---- */
    case 'CREATE_VARIANT': {
      // 以选中实例（或指定节点）当前内容为快照，作为新属性组合的变体成员入组
      const srcId = action.id ?? selectedPrimary(state);
      const found = findById(state.page.root, srcId);
      if (!found) return state;
      const baseCompId = found.node.componentId;
      const baseDef = baseCompId ? state.components[baseCompId] : undefined;
      const group = action.name ?? (baseDef ? variantGroupOf(baseDef) : found.node.name ?? 'Component');
      const snapshot = JSON.parse(JSON.stringify(found.node)) as UINode;
      delete snapshot.componentId;
      delete snapshot.instanceOverrides;
      const reassign = (n: UINode): void => {
        n.id = nextId('n');
        if (isContainer(n)) n.children.forEach(reassign);
      };
      reassign(snapshot);
      const rootNode: ContainerNode =
        isContainer(snapshot) && snapshot.type !== 'RECTANGLE'
          ? (snapshot as ContainerNode)
          : (() => {
              const wrap = createNode('FRAME') as ContainerNode;
              wrap.name = group;
              wrap.children = [snapshot];
              return wrap;
            })();
      const compId = nextId('comp');
      const variantName = Object.entries(action.props)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      const members = variantsInGroup(state.components, group);
      // 同组合同组合已存在 → 拒绝（避免同组合两个成员，切换歧义）
      if (members.some((m) => sameProps(m.variantProps ?? {}, action.props))) return state;
      return {
        ...state,
        components: {
          ...state.components,
          [compId]: {
            id: compId,
            name: baseDef && variantGroupOf(baseDef) === group ? `${group}/${variantName}` : `${group}/${variantName}`,
            root: rootNode,
            variantProps: { ...action.props },
            createdAt: Date.now(),
          },
        },
      };
    }

    case 'SET_VARIANT_PROPS': {
      const found = findById(state.page.root, action.id);
      const compId = found?.node.componentId;
      const def = compId ? state.components[compId] : undefined;
      if (!def) return state;
      const members = variantsInGroup(state.components, variantGroupOf(def));
      const hit = findVariant(members, action.props);
      if (!hit) return state;
      const nextPage = clonePage(state.page);
      const target = findById(nextPage.root, action.id);
      if (!target) return state;
      // 换指向组内另一成员；已存在的属性覆盖清空（快照口径下组合切换即整体替换内容）
      target.node.componentId = hit.def.id;
      target.node.instanceOverrides = undefined;
      return pushHistory(state, nextPage);
    }

    case 'UPDATE_VARIANT_PROPS': {
      const def = state.components[action.componentId];
      if (!def) return state;
      const group = variantGroupOf(def);
      const others = variantsInGroup(state.components, group).filter((m) => m.id !== action.componentId);
      if (others.some((m) => sameProps(m.variantProps ?? {}, action.props))) return state;
      return {
        ...state,
        components: {
          ...state.components,
          [action.componentId]: { ...def, variantProps: { ...action.props } },
        },
      };
    }

    /* ---- M5 P 轨（多 Page）action 段 ---- */
    case 'ADD_PAGE': {
      const page = createNewPage();
      if (action.name) page.name = action.name;
      return {
        ...state,
        pages: [...state.pages, page],
        currentPageId: page.id,
        page,
        selectedIds: [page.root.id],
        // 新页从干净历史起步（切页不入任何 undo 栈，Figma 语义）
        past: [],
        future: [],
        pendingBaseline: null,
      };
    }

    case 'DELETE_PAGE': {
      // 至少保留 1 页（FR-39）；不做级联清理——broken link 由消费端处理（FR-45）
      if (state.pages.length <= 1) return state;
      const targetId = action.id ?? state.currentPageId;
      const idx = state.pages.findIndex((p) => p.id === targetId);
      if (idx < 0) return state;
      const pages = state.pages.filter((p) => p.id !== targetId);
      // 被删页的历史一并丢弃（避免 history 随删除无限累积）
      const history = { ...state.history };
      delete history[targetId];
      // 删的是非当前页 → 当前视图与栈均不变
      if (targetId !== state.currentPageId) return { ...state, pages, history };
      // 删的是当前页 → 落到同位置的下一页（末页则取前一页），并恢复该页历史
      const next = pages[Math.min(idx, pages.length - 1)];
      const restored = history[next.id] ?? { past: [], future: [], pendingBaseline: null };
      const nextHistory = { ...history };
      delete nextHistory[next.id];
      return {
        ...state,
        pages,
        history: nextHistory,
        currentPageId: next.id,
        page: next,
        selectedIds: [next.root.id],
        past: restored.past,
        future: restored.future,
        pendingBaseline: restored.pendingBaseline,
      };
    }

    case 'SELECT_PAGE': {
      if (action.id === state.currentPageId) return state;
      const next = state.pages.find((p) => p.id === action.id);
      if (!next) return state;

      // 切页前先把当前页的 transient 微调落定，否则丢一步（§1.2-3）
      const settled = state.pendingBaseline
        ? [...state.past, state.pendingBaseline].slice(-HISTORY_LIMIT)
        : state.past;

      // FR-39 每页独立历史（完整形态）：把**切出页**的栈存进 history，再取**切入页**的栈。
      // 语义：切页不入任何 undo 栈；切回原页时其历史仍可用（§1.1 B 案）。
      const history: EditorState['history'] = {
        ...state.history,
        [state.currentPageId]: { past: settled, future: state.future, pendingBaseline: null },
      };
      const restored = history[next.id] ?? { past: [], future: [], pendingBaseline: null };
      const nextHistory = { ...history };
      delete nextHistory[next.id]; // 当前页的栈回到顶层 past/future，不留副本

      return {
        ...state,
        page: next,
        currentPageId: next.id,
        selectedIds: [next.root.id],
        past: restored.past,
        future: restored.future,
        pendingBaseline: restored.pendingBaseline,
        history: nextHistory,
      };
    }

    case 'DUPLICATE_PAGE': {
      const targetId = action.id ?? state.currentPageId;
      const idx = state.pages.findIndex((p) => p.id === targetId);
      if (idx < 0) return state;
      const src = state.pages[idx];
      const copy = clonePage(src);
      // 全树重排 id，避免与源页撞号
      const reassign = (n: UINode): void => {
        n.id = nextId('n');
        if (isContainer(n)) n.children.forEach(reassign);
      };
      copy.root.id = nextId('page');
      copy.id = nextId('page');
      copy.name = `${src.name} 副本`;
      copy.root.children.forEach(reassign);
      const pages = [...state.pages];
      pages.splice(idx + 1, 0, copy);
      return { ...state, pages };
    }

    case 'RENAME_PAGE_BY_ID': {
      const idx = state.pages.findIndex((p) => p.id === action.id);
      if (idx < 0) return state;
      const pages = [...state.pages];
      pages[idx] = { ...pages[idx], name: action.name };
      const isCurrent = action.id === state.currentPageId;
      return {
        ...state,
        pages,
        ...(isCurrent ? { page: pages[idx], projectName: action.name } : {}),
      };
    }

    case 'REORDER_PAGE': {
      const idx = state.pages.findIndex((p) => p.id === action.id);
      if (idx < 0) return state;
      const to = Math.max(0, Math.min(action.toIndex, state.pages.length - 1));
      if (to === idx) return state;
      const pages = [...state.pages];
      const [moved] = pages.splice(idx, 1);
      pages.splice(to, 0, moved);
      return { ...state, pages };
    }

    /* ---- M4 余项：FR-22 布尔 / FR-23 蒙版 ---- */
    case 'BOOLEAN_OP': {
      // FR-22：选中集里的 VECTOR 节点按「自下而上」参集序合并为一条结果节点。
      // 参集顺序取 tree 序（下→上=先出现的在前），与 Figma「先选的在下」语义一致。
      const ids = state.selectedIds.filter((id) => id !== state.page.root.id);
      if (ids.length < 2) return state;
      const nextPage = clonePage(state.page);
      const order: string[] = [];
      walk(nextPage.root, (n) => {
        if (ids.includes(n.id)) order.push(n.id);
      });
      const vectors: VectorData[] = [];
      const vecIds: string[] = [];
      for (const id of order) {
        const hit = findById(nextPage.root, id);
        if (hit && hit.node.type === 'VECTOR' && hit.node.vector?.d?.trim()) { vectors.push(hit.node.vector); vecIds.push(id); }
      }
      if (vectors.length < 2) return state;

      const merged = booleanVectorOf(vectors, action.op);
      if (!merged.d.trim()) return state;

      // 结果节点：继承首个参集的样式与位置；包围盒取参集并集（外接矩形，报备）
      const first = findById(nextPage.root, vecIds[0])!;
      const parent = first.parent;
      if (!parent) return state;
      const bounds = vectors.map((v) => ({ w: v.width ?? 0, h: v.height ?? 0 }));
      const node = createNode('VECTOR') as import('../schema/types').VectorNode;
      node.vector = merged;
      node.name = BOOLEAN_OP_NAME[action.op];
      node.style = { ...(first.node.style ?? {}) };
      node.layout = {
        ...first.node.layout,
        width: Math.max(1, Math.round(Math.max(...bounds.map((b) => b.w), first.node.layout.width ?? 1))),
        height: Math.max(1, Math.round(Math.max(...bounds.map((b) => b.h), first.node.layout.height ?? 1))),
      };

      // 删除原参集——仅有效 VECTOR（order 含非参集节点，直接删会误伤未参与的 RECT 等）；
      // 插位须在 prune 前捕获：prune 后参集已不在数组，findIndex 恒 -1（原实现的位置保持是坏的）。
      const removeIds = new Set(vecIds);
      const insertIdx = Math.max(0, parent.children.findIndex((c) => c.id === vecIds[0]));
      const prune = (n: ContainerNode): void => {
        n.children = n.children.filter((c) => {
          const keep = !removeIds.has(c.id);
          if (keep && isContainer(c)) prune(c);
          return keep;
        });
      };
      prune(nextPage.root);
      parent.children.splice(Math.min(insertIdx, parent.children.length), 0, node);
      if (parent.layout.mode === 'ABSOLUTE') {
        node.layout = { ...node.layout, x: first.node.layout.x, y: first.node.layout.y };
      }
      return pushHistory({ ...state, selectedIds: [node.id] }, nextPage);
    }

    case 'TOGGLE_MASK': {
      // FR-23：以 layout.clipContent 作显式蒙版开关（与该字段「本容器裁切子项」语义吻合，
      // 且避免「末位子即蒙版」的隐式推断误伤普通页面——见 tests/fr23-mask-guard.test.ts）。
      const ids = action.ids ?? state.selectedIds;
      const targets = ids.filter((id) => id !== state.page.root.id);
      if (!targets.length) return state;
      const nextPage = clonePage(state.page);
      let any = false;
      for (const id of targets) {
        const hit = findById(nextPage.root, id);
        if (hit && isContainer(hit.node) && hit.node.type !== 'RECTANGLE') {
          // 蒙版组需至少 2 个子项（上=蒙版、下=被裁切）
          if (hit.node.children.length < 2) continue;
          hit.node.layout = { ...hit.node.layout, clipContent: !hit.node.layout.clipContent };
          any = true;
        }
      }
      if (!any) return state;
      return pushHistory(state, nextPage);
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
  // FR-39：**必须分配唯一 id**——早先硬编码 id:'page' 会让多页共用同一 id，
  // 导致 pages/currentPageId 无法区分页面（findIndex 恒命中首页）。
  const id = nextId('page');
  const page = createNode('PAGE', { id, name: '未命名页面' }) as UINode as import('../schema/types').ContainerNode;
  return {
    id,
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
