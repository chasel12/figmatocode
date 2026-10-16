import { describe, expect, it } from 'vitest';
import { draftBounds, pointsToPathD, toLocalPoints, type PenDraftPoint } from '../src/editor/tools/penCore';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { compilePage } from '../src/compiler';
import { svgOfVector, vectorClipPathFallback } from '../src/generator/vector';
import type { UINode, VectorNode } from '../src/schema/types';

resetIdSeq(0);

describe('FR-21 钢笔核心：pointsToPathD', () => {
  it('空点集→空串；单点→M（未闭合无 Z）', () => {
    expect(pointsToPathD([], false)).toBe('');
    expect(pointsToPathD([{ x: 10, y: 20 }], false)).toBe('M 10 20');
  });

  it('单点闭合→M + Z（占位语义）', () => {
    expect(pointsToPathD([{ x: 10, y: 20 }], true)).toBe('M 10 20 Z');
  });

  it('全直线段：M + L…（无手柄）', () => {
    const pts: PenDraftPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(pointsToPathD(pts, false)).toBe('M 0 0 L 10 0 L 10 10');
  });

  it('闭合折线：追加末→首段 + Z（点数 > 2 才闭合）', () => {
    const pts: PenDraftPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(pointsToPathD(pts, true)).toBe('M 0 0 L 10 0 L 10 10 L 0 0 Z');
  });

  it('两点闭合不加 Z（points.length > 2 门槛）', () => {
    const pts: PenDraftPoint[] = [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
    ];
    expect(pointsToPathD(pts, true)).toBe('M 0 0 L 5 5');
  });

  it('任一段含手柄→该段改 C，控制点由手柄对称推导', () => {
    const pts: PenDraftPoint[] = [
      { x: 0, y: 0, hx: 10, hy: 0 },
      { x: 30, y: 0, hx: 10, hy: 0 },
    ];
    // c1 = a + a.h = (10,0)；c2 = b - b.h = (20,0)
    expect(pointsToPathD(pts, false)).toBe('M 0 0 C 10 0 20 0 30 0');
  });

  it('直线段与曲线段混排：逐段独立判定 L / C', () => {
    const pts: PenDraftPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10, hx: 5, hy: 5 },
    ];
    // 段1（0,0）→（10,0）：均无手柄 → L；段2（10,0）→（20,10）：b 有手柄 → C
    // c1 = a + a.h = (10,0)（a 无手柄→0）；c2 = b - b.h = (15,5)
    expect(pointsToPathD(pts, false)).toBe('M 0 0 L 10 0 C 10 0 15 5 20 10');
  });

  it('坐标两位小数取整（r2）', () => {
    expect(pointsToPathD([{ x: 1.234, y: 5.678 }, { x: 9.999, y: 0 }], false)).toBe('M 1.23 5.68 L 10 0');
  });

  it('闭合曲线：末→首段同样按 C 处理', () => {
    const pts: PenDraftPoint[] = [
      { x: 0, y: 0, hx: 1, hy: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const d = pointsToPathD(pts, true);
    expect(d.startsWith('M 0 0 C ')).toBe(true);
    expect(d.endsWith(' Z')).toBe(true);
  });
});

describe('FR-21 钢笔核心：draftBounds / toLocalPoints', () => {
  it('空点集→全 0 包围盒', () => {
    expect(draftBounds([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('包围盒含 8px 余量，且不小于 1×1', () => {
    const b = draftBounds([{ x: 100, y: 100 }]);
    expect(b.x).toBe(92);
    expect(b.y).toBe(92);
    expect(b.width).toBe(16); // 8 + 8
    expect(b.height).toBe(16);
    const single = draftBounds([{ x: 0, y: 0 }, { x: 0, y: 0 }]);
    expect(single.width).toBeGreaterThanOrEqual(1);
    expect(single.height).toBeGreaterThanOrEqual(1);
  });

  it('手柄外扩参与包围盒（含正负方向）', () => {
    const b = draftBounds([{ x: 100, y: 100, hx: 50, hy: -30 }]);
    expect(b.x).toBe(Math.min(100 + 50 - 8, 100 - 50 - 8)); // 42
    expect(b.x).toBe(42);
    expect(b.y).toBe(Math.min(100 - 30 - 8, 100 + 30 - 8)); // 62
    expect(b.y).toBe(62);
  });

  it('toLocalPoints：平移到 bounds 原点，手柄偏移不变', () => {
    const pts: PenDraftPoint[] = [
      { x: 100, y: 200, hx: 5, hy: 6 },
      { x: 130, y: 200 },
    ];
    const local = toLocalPoints(pts, 100, 200);
    expect(local[0]).toEqual({ x: 0, y: 0, hx: 5, hy: 6 });
    expect(local[1]).toEqual({ x: 30, y: 0, hx: undefined, hy: undefined });
  });

  it('端到端：点集 → 本地 d（画布与出码共享同一形状）', () => {
    const pts: PenDraftPoint[] = [
      { x: 50, y: 60 },
      { x: 90, y: 60 },
      { x: 90, y: 100 },
    ];
    const b = draftBounds(pts);
    const local = toLocalPoints(pts, b.x, b.y);
    // bounds 含 8px 余量 → 本地首点为 (8,8)
    expect(pointsToPathD(local, false)).toBe('M 8 8 L 48 8 L 48 48');
  });

  it('手柄拖拽语义：拖出=贝塞尔段，未拖（<1px）=直线段', () => {
    // 画布 endInteraction 的判定：位移 <1px 视为未拖（落锚点即直线）
    const micro = { hx: 0.4, hy: 0.3 };
    expect(Math.abs(micro.hx) < 1 && Math.abs(micro.hy) < 1).toBe(true);
    const dragged = { hx: 60, hy: 20 };
    expect(Math.abs(dragged.hx) < 1 && Math.abs(dragged.hy) < 1).toBe(false);
    // 拖出的锚点参与出码 → C 段
    const d = pointsToPathD([{ x: 0, y: 0 }, { x: 40, y: 20, ...dragged }], false);
    expect(d).toContain(' C ');
  });
});

describe('FR-21 VECTOR 节点 schema 与出码（FR-49 矢量序列化）', () => {
  it('factory 产出 VECTOR 叶子：默认占位 d、非容器', () => {
    const n = createNode('VECTOR') as VectorNode;
    expect(n.type).toBe('VECTOR');
    expect(n.vector?.d).toBe('M 0 0');
    expect((n as { children?: unknown }).children).toBeUndefined();
    expect(n.name).toMatch(/^Vector/); // kindName + 自增序号
  });

  it('svgOfVector：内联 svg + path d + 尺寸', () => {
    const svg = svgOfVector({ d: 'M 0 0 L 10 10' }, 20, 30);
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="20"');
    expect(svg).toContain('height="30"');
    expect(svg).toContain('viewBox="0 0 20 30"');
    expect(svg).toContain('d="M 0 0 L 10 10"');
  });

  it('svgOfVector：空 d 返回空串（占位不产物流）', () => {
    expect(svgOfVector({ d: '' }, 10, 10)).toBe('');
    expect(svgOfVector({ d: '   ' }, 10, 10)).toBe('');
  });

  it('svgOfVector：描边属性（宽度/颜色/dash/cap/join/fillRule）', () => {
    const svg = svgOfVector({ d: 'M 0 0 L 5 5', fillRule: 'evenodd' }, 10, 10, {
      border: { width: 3, color: '#FF0000', style: 'dashed', cap: 'ROUND', join: 'BEVEL', dash: [4, 2] },
    });
    expect(svg).toContain('stroke="#FF0000"');
    expect(svg).toContain('stroke-width="3"');
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).toContain('stroke-linejoin="bevel"');
    expect(svg).toContain('stroke-dasharray="4 2"');
  });

  it('svgOfVector：无 border 时不出 stroke 三件套、fill 可指定', () => {
    const svg = svgOfVector({ d: 'M 0 0 L 5 5' }, 10, 10, { fill: '#00FF00' });
    expect(svg).toContain('fill="#00FF00"');
    expect(svg).not.toContain('stroke=');
  });

  it('svgOfVector：序列化确定性（同输入两次字节一致）', () => {
    const data = { d: 'M 0 0 L 8 8 Z', fillRule: 'evenodd' as const };
    expect(svgOfVector(data, 20, 20)).toBe(svgOfVector(data, 20, 20));
  });

  it('vectorClipPathFallback：CSS 回退注记（空 d 为 null）', () => {
    expect(vectorClipPathFallback({ d: 'M 0 0 L 4 4' })).toBe("path('M 0 0 L 4 4')");
    expect(vectorClipPathFallback({ d: '  ' })).toBeNull();
    expect(vectorClipPathFallback(undefined)).toBeNull();
  });

  it('compilePage 输出 VECTOR 节点且带 svg 出码承载（不塌陷）', () => {
    const page = createPage('FR21 页面');
    const v = createNode('VECTOR') as VectorNode;
    v.vector = { d: 'M 0 0 L 40 0 L 40 40 Z' };
    v.layout.width = 40;
    v.layout.height = 40;
    page.root.children.push(v as UINode);
    const out = compilePage(page);
    const compiled = out.nodes.find((n) => n.id === v.id);
    expect(compiled).toBeTruthy();
    // 尺寸语义保留（不因矢量而塌陷为 0）
    expect(compiled!.css.width).toBeTruthy();
  });
});
