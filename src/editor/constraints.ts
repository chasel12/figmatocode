import type { Constraints, LayoutSchema } from '../schema/types';

/**
 * FR-35 约束：父容器尺寸变化时 ABSOLUTE 子项重算（对照 Figma 拖把手语义）。
 * 纯函数：以 drag 起点的子 layout 与父尺寸为基准算终值（避免逐帧累计误差）。
 * 父容器非 ABSOLUTE（Auto Layout 流内）时调用方不进入本逻辑（子项约束无效，面板显示 Auto layout）。
 */
export interface ChildStart {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  constraints?: Constraints;
}

export type ChildPatch = Partial<Pick<LayoutSchema, 'x' | 'y' | 'width' | 'height'>>;

/** 单轴结果：p=新位置、s=新尺寸（缺省=不变） */
function axisPatch(
  pos: number,
  size: number,
  oldSpan: number,
  newSpan: number,
  rule: 'START' | 'END' | 'CENTER' | 'SCALE',
): { p?: number; s?: number } {
  if (oldSpan <= 0 || newSpan <= 0) return {};
  const delta = newSpan - oldSpan;
  switch (rule) {
    case 'START':
      return {};
    case 'END':
      return { p: pos + delta };
    case 'CENTER':
      return { p: pos + delta / 2 };
    case 'SCALE':
      return { p: (pos * newSpan) / oldSpan, s: (size * newSpan) / oldSpan };
  }
}

/** 按子项约束算 patch（相对父；x/y 缺省按 0）；无变化返回 {} */
export function recomputeChild(
  child: ChildStart,
  oldSize: { width: number; height: number },
  newSize: { width: number; height: number },
): ChildPatch {
  const c = child.constraints ?? { horizontal: 'LEFT', vertical: 'TOP' };
  const out: ChildPatch = {};

  const hRule =
    c.horizontal === 'LEFT' ? 'START' : c.horizontal === 'RIGHT' ? 'END' : c.horizontal === 'CENTER' ? 'CENTER' : 'SCALE';
  const h = axisPatch(child.x, child.width, oldSize.width, newSize.width, hRule);
  if (h.p !== undefined) out.x = Math.round(h.p);
  if (h.s !== undefined) out.width = Math.max(1, Math.round(h.s));

  const vRule =
    c.vertical === 'TOP' ? 'START' : c.vertical === 'BOTTOM' ? 'END' : c.vertical === 'CENTER' ? 'CENTER' : 'SCALE';
  const v = axisPatch(child.y, child.height, oldSize.height, newSize.height, vRule);
  if (v.p !== undefined) out.y = Math.round(v.p);
  if (v.s !== undefined) out.height = Math.max(1, Math.round(v.s));

  return out;
}

/** 父容器 resize → 全体子项 patch 列表（filter 掉空 patch；四档×2 轴全覆盖） */
export function recomputeChildren(
  children: ChildStart[],
  oldSize: { width: number; height: number },
  newSize: { width: number; height: number },
): { id: string; patch: ChildPatch }[] {
  const out: { id: string; patch: ChildPatch }[] = [];
  for (const child of children) {
    const patch = recomputeChild(child, oldSize, newSize);
    if (Object.keys(patch).length) out.push({ id: child.id, patch });
  }
  return out;
}
