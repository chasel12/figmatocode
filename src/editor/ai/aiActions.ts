/**
 * M7 · 编辑指令协议（W4）
 *
 * 设计要点（plan §3 末行 / §4-W4）：
 *  - 指令是 **store action 的子集**：add→INSERT_NODE / remove→DELETE / move→MOVE_NODE /
 *    setText→UPDATE_TEXT / updateStyle→UPDATE_STYLE / updateLayout→UPDATE_LAYOUT。
 *    也就是说 AI 与人点按钮走**同一条管道**，撤销、自动保存、实例覆盖全部免费继承。
 *  - 采纳前先在**克隆页**上干跑一遍（`applyEditOps` 纯函数）：既产出差异摘要给用户看，
 *    也保证真正 dispatch 时不会半途失败留下脏状态。
 *  - 白名单外一律不执行（plan §8.4）：本文件不 import 任何其他 action 类型。
 */
import type { ContainerNode, UINode, UIPage, UIProject } from '../../schema/types';
import { isContainer } from '../../schema/types';
import { clonePage, createNode, findById, nextId } from '../../schema/factory';
import type { EditorAction } from '../store';
import type { AiEditOp, AiEditPlan, AiViolation } from './types';
import {
  buildLayout,
  buildNodeFromSpec,
  buildStyle,
  classPatch,
  expandRepeats,
  normalizePage,
  type BuildContext,
} from './specToPage';

/**
 * `updateLayout` / `updateStyle` 的补丁来源：className 先落地，显式字段再覆盖同名。
 * 两条指令都吃整份 className（含 layout 与 style 两部分）——只取一半会把另一半
 * 静默丢掉，而模型写 `flex items-center gap-3 bg-card` 时是把它当一个整体表达的。
 */
function updatePatch(
  op: Extract<AiEditOp, { op: 'updateLayout' | 'updateStyle' }>,
  kind: string,
  ctx: BuildContext,
  path: string,
  violations: AiViolation[],
): { layout: Record<string, unknown>; style: Record<string, unknown> } {
  const fromClass = classPatch(op.className, ctx, path, violations);
  const layout = { ...fromClass.layout, ...buildLayout(op.op === 'updateLayout' ? op.layout : undefined, kind) };
  const style = { ...fromClass.style, ...buildStyle(op.op === 'updateStyle' ? op.style : undefined, ctx.pack, `${path}.style`, violations) };
  return { layout, style };
}

export interface EditReportLine {
  op: AiEditOp['op'];
  /** 人类可读描述 */
  text: string;
  /** 目标节点 id（add 时为父容器） */
  targetId: string;
}

export interface EditDryRun {
  page: UIPage;
  report: EditReportLine[];
  violations: AiViolation[];
  /** 结构变化统计（面板展示） */
  stats: { nodesBefore: number; nodesAfter: number; styleChanges: number; textChanges: number };
}

function nodeLabel(node: UINode | undefined): string {
  if (!node) return '(未知)';
  const text = 'text' in node && node.text ? ` "${node.text.slice(0, 12)}"` : '';
  return `${node.name ?? node.type}${text}`;
}

function countNodes(node: UINode): number {
  let n = 1;
  if ('children' in node) for (const c of node.children) n += countNodes(c);
  return n;
}

/**
 * 一条 update 指令的目标集合：`targetId` 与 `targetIds` 合并去重。
 *
 * 两个字段并存是为了兼容：旧提示词/旧样例只写 `targetId`，批量场景写 `targetIds`。
 * 合并而不是二选一，避免模型「两个都写了」时静默丢掉一半目标。
 */
function opTargets(op: Extract<AiEditOp, { op: 'updateStyle' | 'updateLayout' }>): string[] {
  const ids = [...(op.targetId ? [op.targetId] : []), ...(op.targetIds ?? [])];
  return [...new Set(ids)];
}

/** 深拷贝并给整棵子树重新分配 id（复制出来的节点不能与原件共用 id） */
function cloneWithNewIds(node: UINode): UINode {
  const copy = JSON.parse(JSON.stringify(node)) as UINode;
  const visit = (n: UINode): void => {
    n.id = nextId(n.type.toLowerCase());
    if (isContainer(n)) n.children.forEach(visit);
  };
  visit(copy);
  return copy;
}

/**
 * 干跑：在克隆页上按序执行指令，返回结果页 + 逐条说明 + 违例。
 * 纯函数（无 store / 无 DOM），与 `opsToStoreActions` 共用同一套语义。
 */
export function applyEditOps(page: UIPage, plan: AiEditPlan, ctx: BuildContext): EditDryRun {
  const next = clonePage(page);
  const report: EditReportLine[] = [];
  const violations: AiViolation[] = [];
  const stats = { nodesBefore: countNodes(page.root), nodesAfter: 0, styleChanges: 0, textChanges: 0 };

  plan.actions.forEach((op, i) => {
    const path = `actions[${i}]`;
    if (op.op === 'add') {
      const parent = findById(next.root, op.parentId);
      if (!parent || !isContainer(parent.node) || parent.node.type === 'RECTANGLE') {
        violations.push({ path: `${path}.parentId`, kind: 'ref', message: `父容器 "${op.parentId}" 不存在或不可容纳子节点` });
        return;
      }
      // repeat 与生成侧同口径：先展开再落地，否则 add 一个 repeat 节点只会插进去一个模板
      const specs = expandRepeats([op.node], `${path}.node`, violations);
      if (!specs.length) return;
      const built = specs.map((n, k) => buildNodeFromSpec(n, ctx, `${path}.node[${k}]`, violations));
      const index = Math.max(0, Math.min(op.index ?? parent.node.children.length, parent.node.children.length));
      parent.node.children.splice(index, 0, ...built);
      report.push({
        op: 'add',
        targetId: op.parentId,
        text: `在「${nodeLabel(parent.node)}」插入 ${built.map((b) => nodeLabel(b)).join('、')}`,
      });
      return;
    }

    /**
     * 批量 update：目标可能多个，且 `targetId` 可能缺省（只给 `targetIds`）。
     * 放在 `findById(op.targetId)` 之前，否则单目标版本会先因为「没有 targetId」被判死。
     */
    if (op.op === 'updateStyle' || op.op === 'updateLayout') {
      const targets = opTargets(op);
      if (!targets.length) {
        violations.push({ path, kind: 'schema', message: 'updateStyle / updateLayout 必须给 targetId 或 targetIds' });
        return;
      }
      /**
       * kind 固定传 'FRAME'：`buildLayout` 只在 kind 是 TEXT/OVAL/IMAGE 时补 widthMode 缺省值，
       * 而这里是在打**补丁**，不该凭空塞一个 widthMode（会把用户原有设置改掉）。
       * 同时这样与 `opsToStoreActions` 完全一致——那边拿不到节点类型，只能传 'FRAME'。
       */
      const patch = updatePatch(op, 'FRAME', ctx, path, violations);
      const labels: string[] = [];
      for (const id of targets) {
        const f = findById(next.root, id);
        if (!f) {
          violations.push({ path: `${path}.targetIds`, kind: 'ref', message: `目标节点 "${id}" 不存在` });
          continue;
        }
        Object.assign(f.node.layout, patch.layout);
        f.node.style = { ...(f.node.style ?? {}), ...patch.style };
        labels.push(nodeLabel(f.node));
      }
      if (!labels.length) return;
      if (Object.keys(patch.style).length) stats.styleChanges += 1;
      const keys = [...Object.keys(patch.layout), ...Object.keys(patch.style)];
      report.push({
        op: op.op,
        targetId: targets[0],
        text: `改${op.op === 'updateLayout' ? '布局' : '样式'}「${labels.join('、')}」：${keys.join('/') || '（无变化）'}`,
      });
      return;
    }

    if (op.op === 'duplicate') {
      const target = findById(next.root, op.targetId);
      if (!target?.parent) {
        violations.push({ path: `${path}.targetId`, kind: 'ref', message: `目标节点 "${op.targetId}" 不存在或没有父容器` });
        return;
      }
      // 上限 20：防止一条指令把画布撑爆（与 repeat 的 count 上限同一考虑）
      const count = Math.max(1, Math.min(Math.floor(op.count ?? 1), 20));
      const parent = target.parent;
      const at = parent.children.findIndex((c) => c.id === op.targetId);
      const copies = Array.from({ length: count }, () => cloneWithNewIds(target.node));
      parent.children.splice(at + 1, 0, ...copies);
      report.push({ op: 'duplicate', targetId: op.targetId, text: `复制「${nodeLabel(target.node)}」×${count}` });
      return;
    }

    if (op.op === 'group') {
      const ids = (op.targetIds ?? []).filter((id) => id !== next.root.id);
      const first = ids.length ? findById(next.root, ids[0]) : null;
      if (!first?.parent) {
        violations.push({ path: `${path}.targetIds`, kind: 'ref', message: '成组需要至少一个存在的节点' });
        return;
      }
      const parent = first.parent;
      const members = parent.children.filter((c) => ids.includes(c.id));
      if (members.length < 2) {
        violations.push({ path: `${path}.targetIds`, kind: 'ref', message: '成组需要**同一父级**下的至少 2 个节点' });
        return;
      }
      const frame = createNode('FRAME') as ContainerNode;
      frame.name = op.name ?? '分组';
      /**
       * 与 store 的 `GROUP` 同口径：跟随父容器的排版模式。
       * 尺寸用 HUG 让分组自适应内容——AI 没有画布几何，给不出精确包围盒。
       */
      frame.layout = {
        ...frame.layout,
        mode: parent.layout.mode === 'ABSOLUTE' ? 'ABSOLUTE' : parent.layout.mode,
        widthMode: 'HUG',
        heightMode: 'HUG',
        gap: parent.layout.gap ?? 0,
        padding: [0, 0, 0, 0],
      };
      const insertAt = parent.children.findIndex((c) => ids.includes(c.id));
      parent.children = parent.children.filter((c) => !ids.includes(c.id));
      frame.children = members;
      parent.children.splice(Math.max(0, insertAt), 0, frame);
      report.push({
        op: 'group',
        targetId: frame.id,
        text: `成组「${frame.name}」：${members.map((m) => nodeLabel(m)).join('、')}`,
      });
      return;
    }

    const found = findById(next.root, op.targetId);
    if (!found) {
      violations.push({ path: `${path}.targetId`, kind: 'ref', message: `目标节点 "${op.targetId}" 不存在` });
      return;
    }

    switch (op.op) {
      case 'remove': {
        if (op.targetId === next.root.id) {
          violations.push({ path: `${path}.targetId`, kind: 'ref', message: '不能删除页面根节点' });
          return;
        }
        if (!found.parent) {
          violations.push({ path: `${path}.targetId`, kind: 'ref', message: '目标节点没有父容器' });
          return;
        }
        const parent = found.parent;
        parent.children = parent.children.filter((c) => c.id !== op.targetId);
        report.push({ op: 'remove', targetId: op.targetId, text: `删除「${nodeLabel(found.node)}」` });
        return;
      }
      case 'move': {
        const targetParent = findById(next.root, op.parentId);
        if (!targetParent || !isContainer(targetParent.node)) {
          violations.push({ path: `${path}.parentId`, kind: 'ref', message: `目标父容器 "${op.parentId}" 不存在` });
          return;
        }
        if (!found.parent) return;
        const from = found.parent;
        from.children = from.children.filter((c) => c.id !== op.targetId);
        const to = targetParent.node;
        const index = Math.max(0, Math.min(op.index ?? to.children.length, to.children.length));
        to.children.splice(index, 0, found.node);
        report.push({ op: 'move', targetId: op.targetId, text: `移动「${nodeLabel(found.node)}」到「${nodeLabel(to)}」` });
        return;
      }
      case 'setText': {
        if (found.node.type !== 'TEXT' && found.node.type !== 'BUTTON') {
          violations.push({ path: `${path}.targetId`, kind: 'ref', message: `节点 "${op.targetId}" 不是文本节点，无法 setText` });
          return;
        }
        found.node.text = op.text;
        stats.textChanges += 1;
        report.push({ op: 'setText', targetId: op.targetId, text: `改文案「${op.text.slice(0, 16)}」` });
        return;
      }
      default:
        violations.push({ path, kind: 'schema', message: `不支持的指令（白名单外）：${(op as { op: string }).op}` });
    }
  });

  stats.nodesAfter = countNodes(next.root);
  /**
   * 干跑最后跑一遍与生成侧**同一个**规范化：编辑同样会造出退化结构
   * （把容器从横排改竖排，子项的 heightMode: FILL 会立刻塌成 0 高）。
   * 只在生成侧跑，编辑就会绕过兜底——这是两条路径最容易分叉的地方。
   *
   * 但这里的修正**不进 violations**：规范化是安全网，不是闸门。模型看不见子项继承来的
   * sizing，拿它去卡模型只会陷入「每轮都报同一个错、最后整条指令被拒」。
   * 改成写进 report，让面板如实告诉用户「我替你改了这里」。
   */
  const normViolations: AiViolation[] = [];
  const notes: string[] = [];
  normalizePage(next.root, normViolations, notes);
  for (const v of normViolations) notes.push(`${v.path}：${v.message}`);
  for (const text of notes) report.push({ op: 'updateLayout', targetId: next.root.id, text: `（自动修正）${text}` });
  return { page: next, report, violations, stats };
}

export interface StoreActionPlan {
  actions: EditorAction[];
  /** 回退需要按 UNDO 的次数 */
  undoSteps: number;
}

/**
 * 干跑通过后的落库动作序列：一条 AI 指令 ↔ 一条 store action（同管道）。
 * 注意：`add` 的 node 已在干跑时校验过，这里重建一次（id 会不同——以本次为准）。
 */
export function opsToStoreActions(plan: AiEditPlan, ctx: BuildContext, violations: AiViolation[] = []): StoreActionPlan {
  const actions: EditorAction[] = [];
  plan.actions.forEach((op, i) => {
    switch (op.op) {
      case 'add': {
        const specs = expandRepeats([op.node], `actions[${i}].node`, violations);
        // 逐个递增 index，否则展开出来的多个节点会按倒序落位
        specs.forEach((n, k) => {
          const node = buildNodeFromSpec(n, ctx, `actions[${i}].node[${k}]`, violations);
          actions.push({ type: 'INSERT_NODE', node, parentId: op.parentId, index: (op.index ?? 0) + k });
        });
        break;
      }
      case 'remove':
        actions.push({ type: 'DELETE', ids: [op.targetId] });
        break;
      case 'move':
        actions.push({ type: 'MOVE_NODE', id: op.targetId, parentId: op.parentId, index: op.index ?? 0 });
        break;
      case 'setText':
        actions.push({ type: 'UPDATE_TEXT', id: op.targetId, text: op.text });
        break;
      case 'duplicate': {
        /**
         * store 的 `DUPLICATE` 一次只复制一份（且以 `ids` 为准，不依赖选中态）。
         * `count` 份就 dispatch 多次——它们会依次插在同一位置，最终顺序与原节点相邻。
         */
        const count = Math.max(1, Math.min(Math.floor(op.count ?? 1), 20));
        for (let k = 0; k < count; k += 1) actions.push({ type: 'DUPLICATE', ids: [op.targetId] });
        break;
      }
      case 'group':
        // 与人工「成组」走同一个 action：结构动作在 reducer 完成，frameLayout 缺省由它推
        actions.push({ type: 'GROUP', ids: op.targetIds });
        break;
      case 'updateStyle':
      case 'updateLayout': {
        /**
         * 必须与 `applyEditOps` 走**同一个** updatePatch，否则干跑看到的和真正 dispatch 的
         * 不是一回事（历史上这里给 buildLayout 传死 'FRAME'，而干跑传的是真实 kind，已经分叉）。
         */
        const patch = updatePatch(op, 'FRAME', ctx, `actions[${i}]`, violations);
        const targets = opTargets(op);
        if (!targets.length) break;
        const hasStyle = Object.keys(patch.style).length > 0;
        const hasLayout = Object.keys(patch.layout).length > 0;
        if (targets.length === 1) {
          const id = targets[0];
          if (op.op === 'updateLayout') {
            actions.push({ type: 'UPDATE_LAYOUT', id, patch: patch.layout });
            // className 里的外观部分（bg-*/rounded-* 等）单独出一条 style 动作，不能吞掉
            if (hasStyle) actions.push({ type: 'UPDATE_STYLE', id, patch: patch.style });
          } else {
            actions.push({ type: 'UPDATE_STYLE', id, patch: patch.style });
            if (hasLayout) actions.push({ type: 'UPDATE_LAYOUT', id, patch: patch.layout });
          }
        } else {
          /**
           * 批量走 MULTI：一条动作 = 一次撤销。
           * 逐节点 dispatch 会让「改 5 张卡」变成 5 步撤销，用户体验上等于没有撤销。
           */
          const stylePatches = targets.map((id) => ({ id, patch: patch.style }));
          const layoutPatches = targets.map((id) => ({ id, patch: patch.layout }));
          if (op.op === 'updateLayout') {
            actions.push({ type: 'UPDATE_LAYOUT_MULTI', patches: layoutPatches });
            if (hasStyle) actions.push({ type: 'UPDATE_STYLE_MULTI', patches: stylePatches });
          } else {
            actions.push({ type: 'UPDATE_STYLE_MULTI', patches: stylePatches });
            if (hasLayout) actions.push({ type: 'UPDATE_LAYOUT_MULTI', patches: layoutPatches });
          }
        }
        break;
      }
    }
  });
  return { actions, undoSteps: actions.length };
}


/**
 * 采纳新页面：把生成页追加进工程（尾插，不改变既有页顺序）。
 * 纯函数，便于单测；面板侧只需 `LOAD_PROJECT` + `SELECT_PAGE` 两个 dispatch。
 * 注意：`LOAD_PROJECT` 会清空 undo 栈（跨工程语义）——生成页属"新上下文"，与 Figma 新建页一致。
 */
export function projectWithNewPage(
  state: { projectName: string; pages: UIPage[]; components: UIProject['components']; tokens: UIProject['tokens'] },
  page: UIPage,
): UIProject {
  return {
    version: 2,
    name: state.projectName,
    pages: [...state.pages, page],
    components: state.components,
    tokens: state.tokens,
    flows: [],
  };
}

/**
 * 采纳整站：**同名页替换、新页追加**（不是无脑追加）。
 *
 * 为什么同名要替换：用户改了需求重新生成，无脑追加会得到「首页」和「首页 2」两份，
 * 而整站的导航是按**页面名**连的（`wireNavigation` 取第一个同名页），
 * 于是点导航永远跳到旧那份——用户改了需求却看不到变化，这是最坏的一种 bug。
 * 替换的语义与「重新生成一个 Frame」一致，符合直觉。
 */
export function projectWithSite(
  state: {
    projectName: string;
    pages: UIPage[];
    components: UIProject['components'];
    tokens: UIProject['tokens'];
    /** 编辑器 state 里没有 flows（只在 UIProject 上）；缺省按空表 */
    flows?: UIProject['flows'];
  },
  pages: UIPage[],
): { project: UIProject; replaced: number; added: number } {
  const incoming = new Map(pages.map((p) => [(p.name ?? '').trim(), p]));
  const kept: UIPage[] = [];
  let replaced = 0;
  for (const old of state.pages) {
    const key = (old.name ?? '').trim();
    const next = incoming.get(key);
    if (next) {
      kept.push(next);
      incoming.delete(key);
      replaced += 1;
    } else {
      kept.push(old);
    }
  }
  const added = [...incoming.values()];
  return {
    project: {
      version: 2,
      name: state.projectName,
      pages: [...kept, ...added],
      components: state.components,
      tokens: state.tokens,
      flows: state.flows ?? [],
    },
    replaced,
    added: added.length,
  };
}
