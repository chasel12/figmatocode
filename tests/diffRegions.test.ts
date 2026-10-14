import { describe, expect, it } from 'vitest';
import { createPage, createNode } from '../src/schema/factory';
import { resolveLayout } from '../src/compiler/layout';
import { createApproxMeasure } from '../src/compiler/measure';
import { analyzeDiffRegions, buildDiffMask, findRegions } from '../src/editor/diffRegions';
import type { GeometryMap } from '../src/compiler/layout';
import type { UINode, UIPage } from '../src/schema/types';

const measure = createApproxMeasure();

/**
 * 定位节点：layout.x/y 仅在父级 mode=ABSOLUTE 时生效（mode 描述父节点如何排布子节点）。
 * 本测试统一将父级设为 ABSOLUTE（见 placeInAbsParent）。
 */
function place(node: UINode, x: number, y: number, width: number, height: number): UINode {
  node.layout.widthMode = 'FIXED';
  node.layout.heightMode = 'FIXED';
  node.layout.x = x;
  node.layout.y = y;
  node.layout.width = width;
  node.layout.height = height;
  return node;
}

function placeInAbsParent(layout: { mode: string }): void {
  layout.mode = 'ABSOLUTE';
}

function makeMask(width: number, height: number, rects: Array<[number, number, number, number]>): Uint8Array {
  const mask = new Uint8Array(width * height);
  for (const [x, y, w, h] of rects) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) mask[yy * width + xx] = 1;
    }
  }
  return mask;
}

describe('buildDiffMask（FR-23 掩码提取）', () => {
  it('仅提取精确不透明红色像素', () => {
    const rgba = new Uint8ClampedArray(3 * 4);
    rgba.set([255, 0, 0, 255], 0);
    rgba.set([255, 0, 0, 128], 4);
    rgba.set([250, 0, 0, 255], 8);
    const mask = buildDiffMask(rgba, 3);
    expect(Array.from(mask)).toEqual([1, 0, 0]);
  });
});

describe('findRegions（连通域提取）', () => {
  it('两个独立连通域按像素数降序返回', () => {
    const mask = makeMask(20, 20, [
      [0, 0, 4, 4],
      [10, 10, 6, 6],
    ]);
    const regions = findRegions(mask, 20, 20);
    expect(regions).toHaveLength(2);
    expect(regions[0]).toMatchObject({ x: 10, y: 10, width: 6, height: 6, pixels: 36 });
    expect(regions[1]).toMatchObject({ x: 0, y: 0, width: 4, height: 4, pixels: 16 });
  });

  it('过滤小于最小像素数的噪点', () => {
    const mask = makeMask(20, 20, [[3, 3, 1, 1]]);
    expect(findRegions(mask, 20, 20)).toHaveLength(0);
  });
});

describe('analyzeDiffRegions（归属/分类/误差）', () => {
  function pageWithRect(): { page: UIPage; geometry: GeometryMap } {
    const page = createPage('测试页');
    placeInAbsParent(page.root.layout);
    const rect = createNode('RECTANGLE', { name: '卡片' });
    place(rect, 50, 40, 100, 60);
    page.root.children.push(rect);
    const geometry: GeometryMap = resolveLayout(page, measure);
    return { page, geometry };
  }

  it('区域内覆盖节点主体 → 归属该节点，误差为 0，分类 Color', () => {
    const { page, geometry } = pageWithRect();
    const mask = makeMask(375, 200, [[50, 40, 100, 60]]);
    const { regions, nodeErrors } = analyzeDiffRegions(page, geometry, mask, 375, 200);
    expect(nodeErrors).toHaveLength(1);
    expect(nodeErrors[0].node).toBe('卡片');
    expect(nodeErrors[0].category).toBe('Color');
    expect(nodeErrors[0]).toMatchObject({ dx: 0, dy: 0, dw: 0, dh: 0 });
    expect(regions[0].node).toBe('卡片');
  });

  it('节点整体向左偏移 2px → 归属节点，dx=-2，分类 Position', () => {
    const { page, geometry } = pageWithRect();
    const mask = makeMask(375, 200, [[48, 40, 100, 60]]);
    const { nodeErrors } = analyzeDiffRegions(page, geometry, mask, 375, 200);
    expect(nodeErrors).toHaveLength(1);
    expect(nodeErrors[0].node).toBe('卡片');
    expect(nodeErrors[0].dx).toBe(-2);
    expect(nodeErrors[0].category).toBe('Position');
  });

  it('RECTANGLE 右侧多出 2px → dw=+2，分类 Size', () => {
    const { page, geometry } = pageWithRect();
    const mask = makeMask(375, 200, [[50, 40, 102, 60]]);
    const { nodeErrors } = analyzeDiffRegions(page, geometry, mask, 375, 200);
    expect(nodeErrors[0].dw).toBe(2);
    expect(nodeErrors[0].category).toBe('Size');
  });

  it('TEXT 节点区域覆盖过半 → 分类 Typography', () => {
    const page = createPage('测试页');
    placeInAbsParent(page.root.layout);
    const text = createNode('TEXT', { name: '标题' });
    place(text, 20, 10, 80, 20);
    page.root.children.push(text);
    const geometry = resolveLayout(page, measure);
    const mask = makeMask(375, 200, [[20, 10, 80, 20]]);
    const { nodeErrors } = analyzeDiffRegions(page, geometry, mask, 375, 200);
    expect(nodeErrors[0].category).toBe('Typography');
  });

  it('区域落在 FRAME 内但不覆盖任何叶子 → 归属 null，分类 Spacing', () => {
    const page = createPage('测试页');
    placeInAbsParent(page.root.layout);
    const frame = createNode('FRAME', { name: '容器' });
    place(frame, 10, 10, 200, 100);
    page.root.children.push(frame);
    const child = createNode('RECTANGLE', { name: '子项' });
    place(child, 6, 6, 40, 40);
    if (frame.type !== 'FRAME') throw new Error('应为 FRAME');
    placeInAbsParent(frame.layout);
    frame.children.push(child);
    const geometry = resolveLayout(page, measure);
    const mask = makeMask(375, 200, [[70, 60, 40, 30]]);
    const { regions, nodeErrors } = analyzeDiffRegions(page, geometry, mask, 375, 200);
    expect(nodeErrors).toHaveLength(0);
    expect(regions).toHaveLength(1);
    expect(regions[0].category).toBe('Spacing');
    expect(regions[0].node).toBeNull();
  });

  it('同一节点的多个差异区域聚合为单条节点误差', () => {
    const { page, geometry } = pageWithRect();
    const mask = makeMask(375, 200, [
      [50, 40, 4, 60],
      [146, 40, 4, 60],
    ]);
    const { nodeErrors, regions } = analyzeDiffRegions(page, geometry, mask, 375, 200);
    expect(regions).toHaveLength(2);
    expect(nodeErrors).toHaveLength(1);
    expect(nodeErrors[0].dw).toBe(0);
    expect(nodeErrors[0].pixels).toBe(4 * 60 * 2);
  });

  it('区域完全在页面外（无节点命中）→ 归属 null，分类 Layout', () => {
    const { page, geometry } = pageWithRect();
    const mask = makeMask(375, 200, [[300, 150, 30, 30]]);
    const { regions } = analyzeDiffRegions(page, geometry, mask, 375, 200);
    expect(regions[0].node).toBeNull();
    expect(regions[0].category).toBe('Layout');
  });
});
