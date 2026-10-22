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
import type { UINode, UIPage, UIProject } from '../../schema/types';
import { isContainer } from '../../schema/types';
import { clonePage, findById } from '../../schema/factory';
import type { EditorAction } from '../store';
import type { AiEditOp, AiEditPlan, AiViolation } from './types';
import { buildLayout, buildNodeFromSpec, buildStyle, type BuildContext } from './specToPage';

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
      const node = buildNodeFromSpec(op.node, ctx, `${path}.node`, violations);
      const index = Math.max(0, Math.min(op.index ?? parent.node.children.length, parent.node.children.length));
      parent.node.children.splice(index, 0, node);
      report.push({ op: 'add', targetId: op.parentId, text: `在「${nodeLabel(parent.node)}」插入 ${nodeLabel(node)}` });
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
      case 'updateStyle': {
        const patch = buildStyle(op.style, ctx.pack, `${path}.style`, violations);
        found.node.style = { ...(found.node.style ?? {}), ...patch };
        stats.styleChanges += 1;
        report.push({ op: 'updateStyle', targetId: op.targetId, text: `改样式「${nodeLabel(found.node)}」：${Object.keys(patch).join('/')}` });
        return;
      }
      case 'updateLayout': {
        const patch = buildLayout(op.layout, found.node.type);
        Object.assign(found.node.layout, patch);
        report.push({ op: 'updateLayout', targetId: op.targetId, text: `改布局「${nodeLabel(found.node)}」：${Object.keys(patch).join('/')}` });
        return;
      }
      default:
        violations.push({ path, kind: 'schema', message: `不支持的指令（白名单外）：${(op as { op: string }).op}` });
    }
  });

  stats.nodesAfter = countNodes(next.root);
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
        const node = buildNodeFromSpec(op.node, ctx, `actions[${i}].node`, violations);
        actions.push({ type: 'INSERT_NODE', node, parentId: op.parentId, index: op.index });
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
      case 'updateStyle': {
        const patch = buildStyle(op.style, ctx.pack, `actions[${i}].style`, violations);
        actions.push({ type: 'UPDATE_STYLE', id: op.targetId, patch });
        break;
      }
      case 'updateLayout': {
        const patch = buildLayout(op.layout, 'FRAME');
        actions.push({ type: 'UPDATE_LAYOUT', id: op.targetId, patch });
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
