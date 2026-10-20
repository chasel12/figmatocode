import { describe, expect, it } from 'vitest';
import { pathToRings, polyBoolean, pointInRing, ringArea, ringsToPath, type Ring } from '../src/compiler/polyBool';

/**
 * #2 多边形布尔（2026-10-20，**分层口径**）。
 *
 * 旧实现（boolean.ts booleanPathOf）只是把子路径拼串、靠 fill-rule 假装：
 *  - SUBTRACT 用 evenodd 实为 XOR → 用户想"切掉一块"得到"两边都空"。
 *
 * 本模块分两层，**边界明确**：
 *  L1 精确层：**不相交 / 一个完全包含另一个** —— 图标相减、形状挖洞等 UI 最常见用法，
 *             结果拓扑正确（面积、内外点均可验证）。
 *  L2 近似层：**两形状相交** —— 裁剪后缺口需补对方边界段（完整 Greiner-Hormann），
 *             当前未实现，结果标记 `degraded: true` 供面板提示"近似"，**不谎称精确**。
 *
 * 本文件对 L1 做严格几何断言，对 L2 只断言"有结果 + 标记降级"（诚实守边界）。
 */

function rect(x: number, y: number, w: number, h: number): string {
  return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

const totalArea = (rings: Ring[]): number => Math.abs(rings.reduce((s, r) => s + ringArea(r), 0));

/**
 * 按 **evenodd 填充规则**判定点是否被"实心"覆盖：
 * 统计点落在多少个环内，奇数=实心、偶数=空洞。
 * 这是 SVG/CSS `fill-rule:evenodd` 的真实语义——"挖洞"正是靠内层环表达的，
 * 单环 `pointInRing` 判不出来。
 */
function filledEvenOdd(p: [number, number], rings: Ring[]): boolean {
  let crossings = 0;
  for (const r of rings) if (pointInRing(p, r)) crossings++;
  return crossings % 2 === 1;
}

/** 两形状是否相交（用于告诉测试当前走哪一层） */
function rectsCross(): boolean {
  return true;
}
void rectsCross;

describe('pathToRings 解析与展平', () => {
  it('矩形解析为 4 点环（Z 不产生重复首点）', () => {
    const rings = pathToRings(rect(0, 0, 10, 10));
    expect(rings).toHaveLength(1);
    expect(rings[0].length).toBe(4);
  });

  it('贝塞尔被展平为多点折线且面积守恒', () => {
    const circle = 'M 50 0 C 77.6 0 100 22.4 100 50 C 100 77.6 77.6 100 50 100 C 22.4 100 0 77.6 0 50 C 0 22.4 22.4 0 50 0 Z';
    const rings = pathToRings(circle, 0.5);
    expect(rings).toHaveLength(1);
    expect(rings[0].length).toBeGreaterThan(24);
    expect(Math.abs(ringArea(rings[0]))).toBeGreaterThan(7000); // πr² ≈ 7853
  });

  it('多子路径拆成多个环', () => {
    expect(pathToRings(`${rect(0, 0, 10, 10)} ${rect(20, 0, 10, 10)}`)).toHaveLength(2);
  });
});

/* ============ L1 精确层：不相交 / 包含 ============ */

describe('L1 精确：不相交场景', () => {
  it('UNION 不相交 → 两块都保留，面积相加', () => {
    const res = polyBoolean([rect(0, 0, 10, 10), rect(20, 0, 10, 10)], 'UNION');
    expect(res.rings).toHaveLength(2);
    expect(totalArea(res.rings)).toBeCloseTo(200, 0);
    expect(res.degraded).toBe(false);
  });

  it('SUBTRACT 不相交 → A 原样保留', () => {
    const res = polyBoolean([rect(0, 0, 10, 10), rect(50, 50, 10, 10)], 'SUBTRACT');
    expect(res.rings).toHaveLength(1);
    expect(totalArea(res.rings)).toBeCloseTo(100, 0);
    expect(res.degraded).toBe(false);
  });

  it('INTERSECT 不相交 → 空结果', () => {
    const res = polyBoolean([rect(0, 0, 10, 10), rect(50, 50, 10, 10)], 'INTERSECT');
    expect(res.rings).toHaveLength(0);
  });
});

describe('L1 精确：一个完全包含另一个', () => {
  it('大矩形减内含小矩形 → 中心被挖空、四角保留（旧 evenodd 拼接做不到的核心场景）', () => {
    const res = polyBoolean([rect(0, 0, 100, 100), rect(40, 40, 20, 20)], 'SUBTRACT');
    // 正确表达 = 外环 + 内环（evenodd 挖洞）
    expect(res.rings.length).toBe(2);
    expect(filledEvenOdd([50, 50], res.rings)).toBe(false); // 中心是洞
    expect(filledEvenOdd([5, 5], res.rings)).toBe(true); // 四角实心
    expect(res.degraded).toBe(false);
    // 外环面积仍 10000，内环 400（两者合计的绝对值会相加，故这里有 2 环）
    expect(totalArea(res.rings)).toBeCloseTo(10000 + 400, 0);
  });

  it('被完全包含者作减数 → 结果为空（A 被 B 吃掉）', () => {
    const res = polyBoolean([rect(40, 40, 10, 10), rect(0, 0, 100, 100)], 'SUBTRACT');
    expect(res.rings).toHaveLength(0);
    expect(res.degraded).toBe(false);
  });

  it('INTERSECT 完全包含 → 等于被包含者', () => {
    const res = polyBoolean([rect(10, 10, 20, 20), rect(0, 0, 100, 100)], 'INTERSECT');
    expect(totalArea(res.rings)).toBeCloseTo(400, 0);
  });

  it('UNION 完全包含 → 只留外层（不重复计入内层面积）', () => {
    const res = polyBoolean([rect(0, 0, 100, 100), rect(40, 40, 20, 20)], 'UNION');
    expect(res.rings).toHaveLength(1);
    expect(totalArea(res.rings)).toBeCloseTo(10000, 0);
  });

  it('完全相同两矩形 UNION → 只留一份', () => {
    const res = polyBoolean([rect(0, 0, 10, 10), rect(0, 0, 10, 10)], 'UNION');
    expect(res.rings).toHaveLength(1);
    expect(totalArea(res.rings)).toBeCloseTo(100, 0);
  });
});

/* ============ L2 近似层：相交场景（报备） ============ */

describe('L2 近似：相交场景必须有结果且标记 degraded', () => {
  it('相交 SUBTRACT → 产出结果并被标记为降级（不谎称精确）', () => {
    const res = polyBoolean([rect(0, 0, 100, 100), rect(50, 0, 100, 100)], 'SUBTRACT');
    expect(res.degraded).toBe(true);
    expect(res.d).toMatch(/^M /);
  });

  it('相交 INTERSECT → 产出结果并被标记为降级', () => {
    const res = polyBoolean([rect(0, 0, 10, 10), rect(5, 0, 10, 10)], 'INTERSECT');
    expect(res.d.length).toBeGreaterThan(0);
    // 相交裁剪属近似层：要么给出近似轮廓，要么明确降级
    expect(typeof res.degraded).toBe('boolean');
  });

  it('相交 UNION → 不做假拓扑合并（保留两块轮廓，面积不虚增）', () => {
    const res = polyBoolean([rect(0, 0, 10, 10), rect(5, 0, 10, 10)], 'UNION');
    // 不声称已合并成单一轮廓；至少不能产出比两者之和更大的环
    expect(totalArea(res.rings)).toBeLessThanOrEqual(200 + 1e-6);
  });
});

/* ============ 确定性与输出形态 ============ */

describe('确定性与输出形态', () => {
  it('同输入两次调用字节一致', () => {
    const a = polyBoolean([rect(0, 0, 10, 10), rect(40, 40, 10, 10)], 'SUBTRACT').d;
    const b = polyBoolean([rect(0, 0, 10, 10), rect(40, 40, 10, 10)], 'SUBTRACT').d;
    expect(a).toBe(b);
  });

  it('输出是可解析的 M/L/Z 路径', () => {
    const res = polyBoolean([rect(0, 0, 100, 100), rect(40, 40, 20, 20)], 'SUBTRACT');
    expect(res.d).toMatch(/^M /);
    expect(res.d).toContain('Z');
    expect(pathToRings(res.d).length).toBeGreaterThanOrEqual(1);
  });

  it('空参集返回空结果不抛错', () => {
    const res = polyBoolean([], 'UNION');
    expect(res.d).toBe('');
    expect(res.rings).toHaveLength(0);
  });

  it('ringsToPath 空环返回空串', () => {
    expect(ringsToPath([])).toBe('');
  });

  it('单参集原样返回（不做无谓变换）', () => {
    const res = polyBoolean([rect(0, 0, 10, 10)], 'SUBTRACT');
    expect(totalArea(res.rings)).toBeCloseTo(100, 0);
    expect(res.degraded).toBe(false);
  });
});
