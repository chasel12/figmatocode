import { describe, expect, it } from 'vitest';
import type { LayoutSchema } from '../src/schema/types';
import { recomputeChild, recomputeChildren, type ChildStart } from '../src/editor/constraints';

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
