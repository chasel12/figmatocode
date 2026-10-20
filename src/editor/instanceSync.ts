/**
 * FR-25 组件实例**覆盖模型**（2026-10-20，#3 组件系统补齐）。
 *
 * ## 背景：为什么需要这个模块
 *
 * 原实现里「实例 = 主组件深拷贝快照 + componentId 标记」，`instanceOverrides` 字段
 * **只有类型定义、从无写入点**（store 里仅有 4 处把它置空/删除）。由此产生两个硬伤：
 *
 *  1. 「更新主组件」（PUSH_TO_COMPONENT）只改 `components[].root`，**其它实例不跟随**——
 *     它们各自抱着旧快照；
 *  2. 切换变体时 `instanceOverrides = undefined`，**实例上的改动被整体丢弃**。
 *
 * ## 现模型（对齐 Figma 口径）
 *
 *     实例渲染 = 主组件派生内容 ⊕ instanceOverrides 补丁
 *
 * - 覆盖用**节点内路径**定位（`path` = 相对实例根的子节点下标链，如 `""`=根 / `"2"` / `"2.1"`）；
 * - 覆盖记录的是**局部补丁**（style / layout / text / src 等），而非整节点替换；
 * - 切换变体 / 更新主组件 = **重新派生 + 按路径重放覆盖**，因此改动得以保留；
 * - 路径在新变体中不存在（该节点被删）→ 该覆盖静默丢弃（Figma 同行为）。
 *
 * ## 与出码的关系
 *
 * 派生结果是**普通节点树**（无 componentId 语义差异），故 compile/generator 无需改动。
 */

import type { ContainerNode, InstanceOverride, UINode } from '../schema/types';
import { isContainer } from '../schema/types';

/** 覆盖里可携带的补丁字段（只覆盖「实例可改」的部分，不动 id/type/children） */
export interface OverridePatch {
  style?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  text?: string;
  src?: string;
  name?: string;
}

/**
 * 求 `targetId` 在 `root` 子树内的相对路径。
 * 路径编码：从根出发，每层用 `children` 下标，用 `.` 连接；根自身为空串。
 * 返回 `null` 表示 target 不在该子树内。
 */
export function nodePathInInstance(root: UINode, targetId: string): string | null {
  if (root.id === targetId) return '';
  if (!isContainer(root)) return null;
  const kids = (root as ContainerNode).children ?? [];
  for (let i = 0; i < kids.length; i++) {
    const sub = nodePathInInstance(kids[i], targetId);
    if (sub !== null) return sub === '' ? String(i) : `${i}.${sub}`;
  }
  return null;
}

/** 按路径取节点（越界/非容器返回 null） */
export function nodeAtPath(root: UINode, path: string): UINode | null {
  if (path === '') return root;
  let cur: UINode = root;
  for (const seg of path.split('.')) {
    const idx = Number(seg);
    if (!Number.isInteger(idx) || idx < 0) return null;
    if (!isContainer(cur)) return null;
    const kids = (cur as ContainerNode).children ?? [];
    if (idx >= kids.length) return null;
    cur = kids[idx];
  }
  return cur;
}

/**
 * 记录/合并一条覆盖。
 * 同一 path 多次修改 → **浅合并** patch（改字色又改字号只留一条记录）。
 */
export function recordOverride(
  overrides: InstanceOverride[] | undefined,
  path: string,
  patch: OverridePatch,
): InstanceOverride[] {
  const list = overrides ? overrides.map((o) => ({ ...o })) : [];
  const existing = list.find((o) => o.path === path);
  if (!existing) {
    list.push({ path, value: { ...patch } });
    return list;
  }
  const prev = (existing.value ?? {}) as OverridePatch;
  const merged: OverridePatch = { ...prev };
  if (patch.style) merged.style = { ...(prev.style ?? {}), ...patch.style };
  if (patch.layout) merged.layout = { ...(prev.layout ?? {}), ...patch.layout };
  if (patch.text !== undefined) merged.text = patch.text;
  if (patch.src !== undefined) merged.src = patch.src;
  if (patch.name !== undefined) merged.name = patch.name;
  existing.value = merged;
  return list;
}

/** 深拷贝一个节点树（去掉实例语义字段，用于派生） */
export function cloneAsPlainNode(node: UINode): UINode {
  const copy = JSON.parse(JSON.stringify(node)) as UINode;
  delete (copy as { componentId?: string }).componentId;
  delete (copy as { instanceOverrides?: InstanceOverride[] }).instanceOverrides;
  return copy;
}

/**
 * 把一组覆盖**重放**到已派生出的实例树上（原地修改并返回）。
 * 路径失效（变体里该节点已不存在）→ 跳过该条，不报错。
 */
export function applyOverrides(root: UINode, overrides: InstanceOverride[] | undefined): UINode {
  if (!overrides?.length) return root;
  for (const ov of overrides) {
    const node = nodeAtPath(root, ov.path);
    if (!node) continue;
    const patch = (ov.value ?? {}) as OverridePatch;
    if (patch.style) node.style = { ...(node.style ?? {}), ...patch.style };
    if (patch.layout) node.layout = { ...node.layout, ...patch.layout };
    if (patch.text !== undefined) (node as { text?: string }).text = patch.text;
    if (patch.src !== undefined) (node as { src?: string }).src = patch.src;
    if (patch.name !== undefined) node.name = patch.name;
  }
  return root;
}

/**
 * 派生一个实例：主组件 root 深拷贝 → 重放覆盖 → 重新分配全子树 id。
 * `makeId` 由调用方注入（store 用 nextId），保持纯函数可单测。
 */
export function deriveInstance(
  componentRoot: UINode,
  overrides: InstanceOverride[] | undefined,
  makeId: () => string,
): UINode {
  const inst = cloneAsPlainNode(componentRoot);
  applyOverrides(inst, overrides);
  const reassign = (n: UINode): void => {
    n.id = makeId();
    if (isContainer(n)) ((n as ContainerNode).children ?? []).forEach(reassign);
  };
  reassign(inst);
  return inst;
}

/**
 * 把「实例内某节点的改动」捕获为覆盖项。
 * 用于 UPDATE_STYLE / UPDATE_LAYOUT / UPDATE_TEXT / UPDATE_SRC 等修改动作：
 * 只有当被改节点**位于实例子树内**时才记录；改实例根本身也记录（path='')。
 *
 * 返回新的 overrides（未命中实例则原样返回 undefined，调用方据此跳过）。
 */
export function captureOverrideForTarget(
  pageRoot: UINode,
  targetId: string,
  patch: OverridePatch,
): { instanceId: string; path: string; overrides: InstanceOverride[] } | null {
  // 找 target 的最近实例祖先（含自身）
  const ancestors: UINode[] = [];
  const findChain = (n: UINode, chain: UINode[]): boolean => {
    if (n.id === targetId) {
      ancestors.push(...chain, n);
      return true;
    }
    if (isContainer(n)) {
      for (const c of (n as ContainerNode).children ?? []) {
        if (findChain(c, [...chain, n])) return true;
      }
    }
    return false;
  };
  findChain(pageRoot, []);
  if (!ancestors.length) return null;

  // 从最近的实例祖先起算
  let instIdx = -1;
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (ancestors[i].componentId) {
      instIdx = i;
      break;
    }
  }
  if (instIdx < 0) return null;

  const inst = ancestors[instIdx];
  const path = nodePathInInstance(inst, targetId);
  if (path === null) return null;
  const overrides = recordOverride(inst.instanceOverrides, path, patch);
  return { instanceId: inst.id, path, overrides };
}
