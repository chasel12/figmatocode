/**
 * FR-44 Present 演示模式的导航执行器（纯函数，无 React 依赖）。
 *
 * 与 FR-50 出码 runtime 共用同一交互语义协议（docs/wave1-prototype-plan.md §4）：
 * 触发器判定 → 动作执行 → 过渡表达。此处为**编辑器内运行时**（Present 遮罩），
 * 出码侧 runtime.js 是独立实现（二者各自独立、协议一致）。
 */
import type { PrototypeInteraction, PrototypeTransition, UINode } from '../../schema/types';
import { isContainer } from '../../schema/types';

/** 已实现（出码/演示一致）的触发器与动作——其余为 P0 置灰项 */
export const SUPPORTED_TRIGGERS = [
  'ON_CLICK',
  'ON_HOVER',
  'MOUSE_ENTER',
  'MOUSE_LEAVE',
  'ON_PRESS',
  'AFTER_TIMEOUT',
  'KEYDOWN',
  'ON_LOAD',
] as const;

export const SUPPORTED_ACTIONS = [
  'NAVIGATE',
  'BACK',
  'SCROLL',
  'OPEN_LINK',
  'OPEN_OVERLAY',
  'CLOSE_OVERLAY',
] as const;

export function isSupportedTrigger(t: string): boolean {
  return (SUPPORTED_TRIGGERS as readonly string[]).includes(t);
}

export function isSupportedAction(a: string): boolean {
  return (SUPPORTED_ACTIONS as readonly string[]).includes(a);
}

/** DOM 事件名 ← 触发器（§4.2 绑定表） */
export function domEventOf(trigger: string): string | null {
  switch (trigger) {
    case 'ON_CLICK':
      return 'click';
    case 'ON_HOVER':
    case 'MOUSE_ENTER':
      return 'mouseover';
    case 'MOUSE_LEAVE':
      return 'mouseout';
    case 'ON_PRESS':
      return 'mousedown';
    default:
      return null; // AFTER_TIMEOUT / KEYDOWN / ON_LOAD 不走元素事件委托
  }
}

/** 触发器是否命中当前事件（mouseover/mouseout 需 relatedTarget 判定，mouseenter/leave 不冒泡） */
export function triggerMatches(
  trigger: string,
  ev: { type: string; relatedTarget?: EventTarget | null },
  currentTarget: EventTarget | null,
): boolean {
  const want = domEventOf(trigger);
  if (!want || want !== ev.type) return false;
  if (want === 'mouseover' || want === 'mouseout') {
    const from = ev.relatedTarget as Node | null;
    // 在自身内部移动不算进入/离开
    if (from && currentTarget && (currentTarget as Node).contains(from)) return false;
  }
  return true;
}

/** 过渡 easing → CSS（§2.3；EASE_IN_BACK 用回弹贝塞尔近似 Figma gentle） */
export function easingCss(tr?: PrototypeTransition): string {
  if (!tr) return 'ease';
  if (tr.easing === 'CUSTOM' && tr.bezier && tr.bezier.length === 4) {
    return `cubic-bezier(${tr.bezier.join(', ')})`;
  }
  switch (tr.easing) {
    case 'LINEAR':
      return 'linear';
    case 'EASE_IN':
      return 'cubic-bezier(0.42, 0, 1, 1)';
    case 'EASE_OUT':
      return 'cubic-bezier(0, 0, 0.58, 1)';
    case 'EASE_IN_OUT':
      return 'cubic-bezier(0.42, 0, 0.58, 1)';
    case 'EASE_IN_BACK':
      return 'cubic-bezier(0.36, 0, 0.66, -0.56)';
    default:
      return 'ease';
  }
}

/** 过渡位移起点（MOVE/PUSH/SLIDE 按方向） */
export function translateOf(tr?: PrototypeTransition): string {
  switch (tr?.direction) {
    case 'LEFT':
      return 'translateX(-100%)';
    case 'RIGHT':
      return 'translateX(100%)';
    case 'TOP':
      return 'translateY(-100%)';
    case 'BOTTOM':
      return 'translateY(100%)';
    default:
      return 'translateY(100%)';
  }
}

/** 过渡时长（缺省 300ms，PRD 候选值） */
export function durationOf(tr?: PrototypeTransition): number {
  if (!tr || typeof tr.duration !== 'number') return 300;
  return Math.max(0, tr.duration);
}

/** OVERLAY 九宫 → flex 对齐（与 runtime.js 的 .uic-pos-* 同口径） */
export function overlayFlex(pos?: string): { justify: string; align: string } {
  switch (pos) {
    case 'TOP_LEFT':
      return { justify: 'flex-start', align: 'flex-start' };
    case 'TOP_CENTER':
      return { justify: 'center', align: 'flex-start' };
    case 'TOP_RIGHT':
      return { justify: 'flex-end', align: 'flex-start' };
    case 'BOTTOM_LEFT':
      return { justify: 'flex-start', align: 'flex-end' };
    case 'BOTTOM_CENTER':
      return { justify: 'center', align: 'flex-end' };
    case 'BOTTOM_RIGHT':
      return { justify: 'flex-end', align: 'flex-end' };
    default:
      return { justify: 'center', align: 'center' };
  }
}

/** 收集树中全部带交互的节点（热区可视化 H 键用） */
export function collectHotspots(root: UINode, out: UINode[] = []): UINode[] {
  const usable = (root.interactions ?? []).some((it) => isSupportedTrigger(it.trigger) && isSupportedAction(it.action));
  if (usable) out.push(root);
  if (isContainer(root)) root.children.forEach((c) => collectHotspots(c, out));
  return out;
}

/** 取节点上可执行的交互（过滤置灰档）；flowStart 不参与 */
export function usableInteractions(node: UINode): PrototypeInteraction[] {
  return (node.interactions ?? []).filter(
    (it) => isSupportedTrigger(it.trigger) && isSupportedAction(it.action),
  );
}

/**
 * 起点解析（§3.2-3）：优先显式传入 → 有 flowStart 的 Frame → 首个 FRAME → null。
 * 全无 Frame 时返回 null，调用方显示空状态提示（FR-44）。
 */
export function resolveStartNode(root: UINode, preferId?: string | null): UINode | null {
  if (preferId) {
    const hit = findNode(root, preferId);
    if (hit) return hit;
  }
  const flowStart = findFirst(root, (n) => !!n.flowStart && n.type === 'FRAME');
  if (flowStart) return flowStart;
  return findFirst(root, (n) => n.type === 'FRAME');
}

function findNode(root: UINode, id: string): UINode | null {
  if (root.id === id) return root;
  if (isContainer(root)) {
    for (const c of root.children) {
      const r = findNode(c, id);
      if (r) return r;
    }
  }
  return null;
}

function findFirst(root: UINode, pred: (n: UINode) => boolean): UINode | null {
  if (pred(root)) return root;
  if (isContainer(root)) {
    for (const c of root.children) {
      const r = findFirst(c, pred);
      if (r) return r;
    }
  }
  return null;
}

/** 同页 Frame 列表（Present 侧栏 Flows 下拉用） */
export function framesOf(root: UINode): { id: string; name: string; flowStart: boolean }[] {
  const out: { id: string; name: string; flowStart: boolean }[] = [];
  const walk = (n: UINode): void => {
    if (n.type === 'FRAME') out.push({ id: n.id, name: n.name ?? n.id, flowStart: !!n.flowStart });
    if (isContainer(n)) n.children.forEach(walk);
  };
  walk(root);
  return out;
}
