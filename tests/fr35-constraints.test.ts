import { describe, expect, it } from 'vitest';
import type { HorizontalConstraint, LayoutSchema, VerticalConstraint } from '../src/schema/types';
import { recomputeChild, recomputeChildren, type ChildPatch, type ChildStart } from '../src/editor/constraints';

function child(partial: Partial<ChildStart>): ChildStart {
  return { id: 'c1', x: 10, y: 20, width: 100, height: 50, ...partial };
}

describe('FR-35 Constraints 约束重算（4 档×2 轴）', () => {
  const oldSize = { width: 400, height: 300 };

  it('LEFT/TOP（与缺省）：尺寸变化子项不动', () => {
    const c = child({ constraints: { horizontal: 'LEFT', vertical: 'TOP' } });
    expect(recomputeChild(c, oldSize, { width: 600, height: 500 })).toEqual({});
    const legacy = child({});
    expect(recomputeChild(legacy, oldSize, { width: 600, height: 500 })).toEqual({});
  });

  it('RIGHT/BOTTOM：边距保持（平移 delta）', () => {
    const c = child({ x: 10, y: 20, width: 100, height: 50, constraints: { horizontal: 'RIGHT', vertical: 'BOTTOM' } });
    expect(recomputeChild(c, oldSize, { width: 500, height: 400 })).toEqual({ x: 110, y: 120 });
  });

  it('CENTER：居中保持（半移）', () => {
    const c = child({ x: 10, y: 20, constraints: { horizontal: 'CENTER', vertical: 'CENTER' } });
    expect(recomputeChild(c, oldSize, { width: 600, height: 400 })).toEqual({ x: 110, y: 70 });
  });

  it('SCALE：位置与尺寸同比例', () => {
    const c = child({ x: 10, y: 20, width: 100, height: 50, constraints: { horizontal: 'SCALE', vertical: 'SCALE' } });
    const patch = recomputeChild(c, oldSize, { width: 800, height: 600 });
    expect(patch).toEqual({ x: 20, y: 40, width: 200, height: 100 });
  });

  it('两轴独立组合（RIGHT×TOP）', () => {
    const c = child({ constraints: { horizontal: 'RIGHT', vertical: 'TOP' } });
    expect(recomputeChild(c, oldSize, { width: 500, height: 999 })).toEqual({ x: 110 });
  });

  it('防除零：父旧/新尺寸为 0 时不出 patch', () => {
    const c = child({ constraints: { horizontal: 'SCALE', vertical: 'SCALE' } });
    expect(recomputeChild(c, { width: 0, height: 0 }, { width: 500, height: 500 })).toEqual({});
    expect(recomputeChild(c, oldSize, { width: 0, height: 0 })).toEqual({});
    // 单轴 0 只挡该轴
    expect(recomputeChild(c, { width: 0, height: 300 }, { width: 500, height: 600 })).toEqual({ y: 40, height: 100 });
  });

  it('recomputeChildren：过滤无变化项，输出 id+patch', () => {
    const kids: ChildStart[] = [
      child({ id: 'keep', constraints: { horizontal: 'SCALE', vertical: 'TOP' } }),
      child({ id: 'skip', constraints: { horizontal: 'LEFT', vertical: 'TOP' } }),
    ];
    const out = recomputeChildren(kids, oldSize, { width: 800, height: 300 });
    expect(out.map((p) => p.id)).toEqual(['keep']);
    expect(out[0].patch).toEqual({ x: 20, width: 200 });
  });

  it('constraints JSON 往返与旧布局缺省', () => {
    const layout: LayoutSchema = { mode: 'ABSOLUTE', widthMode: 'FIXED', heightMode: 'FIXED', constraints: { horizontal: 'RIGHT', vertical: 'BOTTOM' } };
    const back = JSON.parse(JSON.stringify(layout)) as LayoutSchema;
    expect(back.constraints).toEqual({ horizontal: 'RIGHT', vertical: 'BOTTOM' });
    const legacy = JSON.parse(JSON.stringify({ mode: 'VERTICAL', widthMode: 'HUG', heightMode: 'HUG' })) as LayoutSchema;
    expect(legacy.constraints).toBeUndefined();
  });
});

/**
 * 拉伸档（`LEFT_RIGHT` / `TOP_BOTTOM`）曾经缺失 —— 落到 `else` 被当成 `SCALE`。
 *
 * 当时的表现：画布上拖父容器把手，选「左和右」的子项等比缩放；
 * 而 `compile.ts` 出的是 `left+right`（拉伸）。**同一份 AST，两个消费者理解不同。**
 * 出码是对的、画布是错的，且画布是用户唯一能直接看到的那一侧。
 *
 * 这一组用例的目的不只是"补上档位"，而是让**漏接一档**变成测试失败：
 * 表格里每一档的期望值都写死，任何一档静默退化都会对不上。
 */
describe('FR-35 补：stretch 档（LEFT_RIGHT / TOP_BOTTOM）', () => {
  const oldSize = { width: 400, height: 300 };
  const newSize = { width: 500, height: 400 };
  const base = { x: 10, y: 20, width: 100, height: 50 };

  it('水平五档全覆盖（无一档静默落到 SCALE）', () => {
    // 期望值按 oldSize 400 → newSize 500 手算；垂直固定 TOP（不出 patch）
    const table: [HorizontalConstraint, ChildPatch][] = [
      ['LEFT', {}],
      ['RIGHT', { x: 110 }],
      ['CENTER', { x: 60 }],
      ['SCALE', { x: 13, width: 125 }],
      ['LEFT_RIGHT', { width: 200 }],
    ];
    for (const [horizontal, expected] of table) {
      const c = child({ ...base, constraints: { horizontal, vertical: 'TOP' } });
      expect(recomputeChild(c, oldSize, newSize), `horizontal=${horizontal}`).toEqual(expected);
    }
  });

  it('垂直五档全覆盖（无一档静默落到 SCALE）', () => {
    // oldSize 300 → newSize 400；SCALE：20*400/300=26.67→27、50*400/300=66.67→67
    const table: [VerticalConstraint, ChildPatch][] = [
      ['TOP', {}],
      ['BOTTOM', { y: 120 }],
      ['CENTER', { y: 70 }],
      ['SCALE', { y: 27, height: 67 }],
      ['TOP_BOTTOM', { height: 150 }],
    ];
    for (const [vertical, expected] of table) {
      const c = child({ ...base, constraints: { horizontal: 'LEFT', vertical } });
      expect(recomputeChild(c, oldSize, newSize), `vertical=${vertical}`).toEqual(expected);
    }
  });

  it('拉伸 ≠ 等比缩放（这正是当初错的那一步）', () => {
    const stretched = recomputeChild(child({ ...base, constraints: { horizontal: 'LEFT_RIGHT', vertical: 'TOP' } }), oldSize, newSize);
    const scaled = recomputeChild(child({ ...base, constraints: { horizontal: 'SCALE', vertical: 'TOP' } }), oldSize, newSize);
    expect(stretched).not.toEqual(scaled);
    // 拉伸位置不动、缩放位置按比例走 —— 两者不该混为一谈
    expect(stretched.x).toBeUndefined();
    expect(scaled.x).toBe(13);
  });

  it('两端边距不变量：拉伸前后左右（上下）边距完全一致', () => {
    // 这条不变量就是 Figma 的语义本身，与实现无关 —— 换实现也该过
    const c = child({ x: 40, y: 30, width: 120, height: 60, constraints: { horizontal: 'LEFT_RIGHT', vertical: 'TOP_BOTTOM' } });
    const next = { width: 640, height: 480 };
    const p = recomputeChild(c, oldSize, next);
    const w = p.width ?? c.width;
    const h = p.height ?? c.height;
    expect(next.width - (c.x + w)).toBe(oldSize.width - (c.x + c.width));
    expect(next.height - (c.y + h)).toBe(oldSize.height - (c.y + c.height));
  });

  it('缩到比两端边距还小时夹在 1px，不出负尺寸', () => {
    const c = child({ ...base, constraints: { horizontal: 'LEFT_RIGHT', vertical: 'TOP' } });
    // 父容器 400→20，delta=-380，理论宽度 100-380=-280
    expect(recomputeChild(c, oldSize, { width: 20, height: 300 })).toEqual({ width: 1 });
  });

  it('父容器尺寸没变 → 空 patch（保持「无变化不出 patch」的约定）', () => {
    const c = child({ constraints: { horizontal: 'LEFT_RIGHT', vertical: 'TOP_BOTTOM' } });
    expect(recomputeChild(c, oldSize, oldSize)).toEqual({});
  });

  it('recomputeChildren 能过滤掉「拉伸但父容器没变」的项', () => {
    const kids: ChildStart[] = [
      child({ id: 'stretch', constraints: { horizontal: 'LEFT_RIGHT', vertical: 'TOP' } }),
      child({ id: 'fixed', constraints: { horizontal: 'LEFT', vertical: 'TOP' } }),
    ];
    expect(recomputeChildren(kids, oldSize, oldSize)).toEqual([]);
    expect(recomputeChildren(kids, oldSize, newSize)).toEqual([{ id: 'stretch', patch: { width: 200 } }]);
  });
});
