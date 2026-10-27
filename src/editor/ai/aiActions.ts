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
import { buildLayout, buildNodeFromSpec, buildStyle, classPatch, normalizePage, type BuildContext } from './specToPage';

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
      case 'updateStyle':
      case 'updateLayout': {
        /**
         * kind 固定传 'FRAME'：`buildLayout` 只在 kind 是 TEXT/OVAL/IMAGE 时补 widthMode 缺省值，
         * 而这里是在打**补丁**，不该凭空塞一个 widthMode（会把用户原有设置改掉）。
         * 同时这样与 `opsToStoreActions` 完全一致——那边拿不到节点类型，只能传 'FRAME'。
         */
        const patch = updatePatch(op, 'FRAME', ctx, path, violations);
        Object.assign(found.node.layout, patch.layout);
        found.node.style = { ...(found.node.style ?? {}), ...patch.style };
        if (Object.keys(patch.style).length) stats.styleChanges += 1;
        const keys = [...Object.keys(patch.layout), ...Object.keys(patch.style)];
        report.push({
          op: op.op,
          targetId: op.targetId,
          text: `改${op.op === 'updateLayout' ? '布局' : '样式'}「${nodeLabel(found.node)}」：${keys.join('/') || '（无变化）'}`,
        });
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
      case 'updateStyle':
      case 'updateLayout': {
        /**
         * 必须与 `applyEditOps` 走**同一个** updatePatch，否则干跑看到的和真正 dispatch 的
         * 不是一回事（历史上这里给 buildLayout 传死 'FRAME'，而干跑传的是真实 kind，已经分叉）。
         */
        const patch = updatePatch(op, 'FRAME', ctx, `actions[${i}]`, violations);
        if (op.op === 'updateLayout') {
          actions.push({ type: 'UPDATE_LAYOUT', id: op.targetId, patch: patch.layout });
          // className 里的外观部分（bg-*/rounded-* 等）单独出一条 style 动作，不能吞掉
          if (Object.keys(patch.style).length) actions.push({ type: 'UPDATE_STYLE', id: op.targetId, patch: patch.style });
        } else {
          actions.push({ type: 'UPDATE_STYLE', id: op.targetId, patch: patch.style });
          if (Object.keys(patch.layout).length) actions.push({ type: 'UPDATE_LAYOUT', id: op.targetId, patch: patch.layout });
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
