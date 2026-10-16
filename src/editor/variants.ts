/**
 * FR-29 Variants 变体：组件属性集（property × value）纯函数。
 *
 * 数据口径（schema-decisions §一，types.ts 已定稿）：
 *   - 每个变体就是一个普通 ComponentDef，靠 `variantProps: Record<prop, value>` 标注所属组合；
 *   - 同 `variantGroup`（组件名相同 / 显式组名）下多个 ComponentDef 构成一个变体组；
 *   - 实例切换组合 = 改 `node.componentId` 指向组内另一成员的快照（FR-25 快照口径不变）。
 *
 * 本模块只做纯计算；store 侧的 action 在 store.ts 的 C 轨 action 段。
 */
import type { ComponentDef } from '../schema/types';

/** 变体组 = 组件名（Figma 用 "Button/Primary" 这类命名聚合变体） */
export function variantGroupOf(def: ComponentDef): string {
  // 命名约定：组名取第一个 '/' 前的段；无 '/' 则用自身 name（单成员组）
  const slash = def.name.indexOf('/');
  return slash > 0 ? def.name.slice(0, slash) : def.name;
}

/** 该组件是否为变体成员（有 variantProps 且非空） */
export function isVariant(def: ComponentDef): boolean {
  return !!def.variantProps && Object.keys(def.variantProps).length > 0;
}

/** 组内全部成员（含非变体的同名组件） */
export function variantsInGroup(components: Record<string, ComponentDef>, group: string): ComponentDef[] {
  return Object.values(components)
    .filter((c) => variantGroupOf(c) === group)
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

/** 组内出现过的属性名全集（按首次出现顺序，供面板渲染属性行） */
export function variantPropertyNames(members: ComponentDef[]): string[] {
  const seen: string[] = [];
  for (const m of members) {
    for (const k of Object.keys(m.variantProps ?? {})) {
      if (!seen.includes(k)) seen.push(k);
    }
  }
  return seen;
}

/** 每个属性出现过的取值全集（按首次出现顺序） */
export function variantValueNames(members: ComponentDef[], prop: string): string[] {
  const seen: string[] = [];
  for (const m of members) {
    const v = m.variantProps?.[prop];
    if (v != null && !seen.includes(v)) seen.push(v);
  }
  return seen;
}

/**
 * 在组内按「目标属性组合」找匹配成员。
 * 语义：目标组合中的每一项都必须与成员一致（子集匹配）；空组合 → 返回首个成员（缺省变体）。
 * 找不到精确匹配时回退首个成员（**不返回 null**，保证实例始终有可渲染内容）。
 */
export function findVariant(
  members: ComponentDef[],
  props: Record<string, string>,
): { def: ComponentDef; exact: boolean } | null {
  if (!members.length) return null;
  const keys = Object.keys(props);
  if (!keys.length) return { def: members[0], exact: false };
  for (const m of members) {
    const mp = m.variantProps ?? {};
    if (keys.every((k) => mp[k] === props[k])) return { def: m, exact: true };
  }
  return { def: members[0], exact: false };
}

/** 当前实例所处的属性组合（从其 componentId 指向的定义读回；非变体返回 {}） */
export function currentVariantProps(
  components: Record<string, ComponentDef>,
  componentId: string | undefined,
): Record<string, string> {
  if (!componentId) return {};
  return { ...(components[componentId]?.variantProps ?? {}) };
}
