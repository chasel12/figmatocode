/** FR-10 对齐/等距分布：纯函数，页面坐标系。调用方负责把页面坐标换算为 layout.x/y。 */

import type { Rect } from './snapping';

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';
export type DistributeAxis = 'h' | 'v';

export interface AlignItem {
  id: string;
  rect: Rect;
}

export interface AlignPatch {
  id: string;
  /** 目标页面坐标（只含需要变更的轴） */
  x?: number;
  y?: number;
}

function bbox(items: AlignItem[]): Rect {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const it of items) {
    x1 = Math.min(x1, it.rect.x);
    y1 = Math.min(y1, it.rect.y);
    x2 = Math.max(x2, it.rect.x + it.rect.width);
    y2 = Math.max(y2, it.rect.y + it.rect.height);
  }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/** 对齐到选区包围盒（Figma 语义：以整体包围盒为基准）。 */
export function alignPatches(items: AlignItem[], mode: AlignMode): AlignPatch[] {
  if (items.length < 2) return [];
  const b = bbox(items);
  return items.map(({ id, rect }) => {
    switch (mode) {
      case 'left':
        return { id, x: b.x };
      case 'hcenter':
        return { id, x: b.x + (b.width - rect.width) / 2 };
      case 'right':
        return { id, x: b.x + b.width - rect.width };
      case 'top':
        return { id, y: b.y };
      case 'vcenter':
        return { id, y: b.y + (b.height - rect.height) / 2 };
      case 'bottom':
        return { id, y: b.y + b.height - rect.height };
    }
  });
}

/**
 * 等距分布（Figma「等间距」语义）：首尾贴住包围盒两端，中间项按相等间隙排布。
 */
export function distributePatches(items: AlignItem[], axis: DistributeAxis): AlignPatch[] {
  if (items.length < 3) return [];
  const sorted = [...items].sort((a, b) =>
    axis === 'h' ? a.rect.x - b.rect.x : a.rect.y - b.rect.y,
  );
  const b = bbox(items);
  const totalSize = sorted.reduce((sum, it) => sum + (axis === 'h' ? it.rect.width : it.rect.height), 0);
  const span = axis === 'h' ? b.width : b.height;
  const gap = (span - totalSize) / (sorted.length - 1);

  const patches: AlignPatch[] = [];
  let cursor = axis === 'h' ? b.x : b.y;
  sorted.forEach((it, i) => {
    const isLast = i === sorted.length - 1;
    // 首项不动（天然贴边）；末项用包围盒端点兜底，避免浮点误差
    if (i > 0) {
      if (axis === 'h') patches.push({ id: it.id, x: cursor });
      else patches.push({ id: it.id, y: cursor });
    }
    if (isLast) return;
    cursor += (axis === 'h' ? it.rect.width : it.rect.height) + gap;
  });
  return patches;
}
