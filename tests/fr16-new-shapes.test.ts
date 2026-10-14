import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { arcSpec, clipPathPolygon, compilePage, flattenPx, polygonUnitPoints, starUnitPoints } from '../src/compiler';
import type { StyleSchema, UINode } from '../src/schema/types';

resetIdSeq(0);

function pageWith(node: UINode) {
  const page = createPage('FR16b 页面');
  page.root.children.push(node);
  return page;
}

function cssOf(node: UINode): Record<string, string> {
  return compilePage(pageWith(node)).nodes.find((n) => n.id === node.id)!.css;
}

describe('FR-16 形状 helper（画布/出码同口径）', () => {
  it('polygonUnitPoints：3 边顶朝上（首点 50,0）、n 点闭合', () => {
    const p3 = polygonUnitPoints(3);
    expect(p3).toHaveLength(3);
    expect(p3[0][0]).toBeCloseTo(50, 5);
    expect(p3[0][1]).toBeCloseTo(0, 5);
    expect(polygonUnitPoints(6)).toHaveLength(6);
    expect(polygonUnitPoints(2)).toHaveLength(3); // 下限 3
  });

  it('starUnitPoints：5 角 10 点、外 50 内 50*inner、交替', () => {
    const s = starUnitPoints(5, 0.5);
    expect(s).toHaveLength(10);
    expect(s[0][1]).toBeCloseTo(0, 5);
    const r1 = Math.hypot(s[1][0] - 50, s[1][1] - 50);
    expect(r1).toBeCloseTo(25, 4); // 内点半径=50*0.5
  });

  it('flattenPx：百分比点集按宽高展开', () => {
    const pts = flattenPx(polygonUnitPoints(4), 200, 100);
    // 4边（正方形内接）：上/右/下/左 → x 百分比 50/100/50/0 映射
    expect(pts[0]).toBeCloseTo(100, 4); // 50%*200
    expect(pts[1]).toBeCloseTo(0, 4);
    expect(pts).toHaveLength(8);
  });

  it('clipPathPolygon 输出 polygon() 百分比串', () => {
    const cp = clipPathPolygon(polygonUnitPoints(3));
    expect(cp.startsWith('polygon(')).toBe(true);
    expect(cp).toContain('%');
    expect(cp.split(',')).toHaveLength(3);
  });

  it('arcSpec：起止归一（跨0环绕、start==end=整圆、负角）', () => {
    expect(arcSpec(0, 90)).toEqual({ start: 0, sweep: 90, from: 0 });
    expect(arcSpec(270, 90).sweep).toBe(180);
    expect(arcSpec(0, 0).sweep).toBe(360);
    expect(arcSpec(-90, 90)).toEqual({ start: 270, sweep: 180, from: 270 });
    expect(arcSpec(450, 90)).toEqual({ start: 90, sweep: 360, from: 90 });
  });
});

describe('FR-16 出码：POLYGON / STAR clip-path', () => {
  it('POLYGON 默认 3 边 → clip-path polygon()', () => {
    const n = createNode('POLYGON');
    const css = cssOf(n);
    expect(css['clip-path']).toMatch(/^polygon\(/);
    expect(n.style?.pointCount).toBe(3);
  });

  it('POLYGON pointCount=6 → 6 点（split 得 6 段）', () => {
    const n = createNode('POLYGON');
    n.style = { ...(n.style as StyleSchema), pointCount: 6 };
    const css = cssOf(n);
    expect(css['clip-path'].split(',')).toHaveLength(6);
  });

  it('STAR 默认 pointCount=5 / innerRadius=0.38 → 10 点', () => {
    const n = createNode('STAR');
    expect(n.style?.pointCount).toBe(5);
    expect(n.style?.innerRadius).toBe(0.38);
    const css = cssOf(n);
    expect(css['clip-path'].split(',')).toHaveLength(10);
  });
});

describe('FR-16 出码：OVAL arcData（conic + mask）', () => {
  function oval(style: StyleSchema): Record<string, string> {
    const n = createNode('OVAL');
    n.style = { ...(n.style as StyleSchema), ...style };
    return cssOf(n);
  }

  it('扇形 0→90：conic-gradient + from 90deg（0=东换算北起）+ 无 mask', () => {
    const css = oval({ arcData: { startingAngle: 0, endingAngle: 90, innerRadius: 0 } });
    expect(css['background-image']).toContain('conic-gradient(from 90deg');
    expect(css['background-image']).toContain('0deg 90deg');
    expect(css['border-radius']).toBe('50%');
    expect(css['mask-image']).toBeUndefined();
  });

  it('跨0环 270→90：sweep 180', () => {
    const css = oval({ arcData: { startingAngle: 270, endingAngle: 90, innerRadius: 0 } });
    expect(css['background-image']).toContain('180deg');
  });

  it('内径 40% → mask radial-gradient 打孔 + -webkit 前缀', () => {
    const css = oval({ arcData: { startingAngle: 0, endingAngle: 180, innerRadius: 0.4 } });
    expect(css['mask-image']).toContain('radial-gradient');
    expect(css['-webkit-mask-image']).toContain('radial-gradient');
  });

  it('整圆等效 arc（0/360/0）→ 不走 conic，保持普通椭圆', () => {
    const css = oval({ arcData: { startingAngle: 0, endingAngle: 360, innerRadius: 0 } });
    expect(css['background-image']).toBeUndefined();
    expect(css['border-radius']).toBe('50%');
  });

  it('弧形接管 fills：conic 色取 fills[0] 首色', () => {
    const n = createNode('OVAL');
    n.style = {
      ...(n.style as StyleSchema),
      arcData: { startingAngle: 0, endingAngle: 90, innerRadius: 0 },
      fills: [{ type: 'SOLID', color: '#FF0000' }],
    };
    const css = cssOf(n);
    expect(css['background-image']).toContain('%23FF0000'.replace('%23', '#'));
  });
});

describe('FR-16 出码：LINE 箭头端点', () => {
  function line(style: StyleSchema): Record<string, string> {
    const n = createNode('LINE');
    n.style = { ...(n.style as StyleSchema), ...style };
    return cssOf(n);
  }

  it('无箭头 cap → 现状 border-top + height 0（既有语义不变）', () => {
    const css = line({ border: { width: 2, color: '#000000', style: 'solid', cap: 'ROUND' } });
    expect(css['height']).toBe('0');
    expect(css['border-top']).toContain('2px');
    expect(css['background-image']).toBeUndefined();
  });

  it('ARROW_TRIANGLED → data-URI SVG、两端三角头、height 含头', () => {
    const css = line({ border: { width: 2, color: '#FF0000', style: 'solid', cap: 'ARROW_TRIANGLED' } });
    expect(css['background-image']).toContain('data:image/svg+xml');
    expect(css['border-top']).toBeUndefined();
    expect(parseInt(css['height'])).toBeGreaterThan(0);
    const svg = decodeURIComponent(css['background-image']!.slice(css['background-image']!.indexOf(',') + 1));
    expect(svg).toContain('<polygon');
    expect(svg).toMatch(/<line /);
    expect(svg.split('<polygon')).toHaveLength(3); // 两端两头
  });

  it('ARROW_DIAMOND → 两端菱形 polygon（4点点集可含于 svg）', () => {
    const css = line({ border: { width: 1, color: '#000000', style: 'solid', cap: 'ARROW_DIAMOND' } });
    const svg = decodeURIComponent(css['background-image']!.slice(css['background-image']!.indexOf(',') + 1));
    expect(svg.split('<polygon')).toHaveLength(3);
  });

  it('ARROW_LINES → 描边空心三角（fill none 近似开口）', () => {
    const css = line({ border: { width: 1, color: '#000000', style: 'solid', cap: 'ARROW_LINES' } });
    const svg = decodeURIComponent(css['background-image']!.slice(css['background-image']!.indexOf(',') + 1));
    expect(svg).toContain('fill="none"');
  });

  it('ARROW_CIRCLE → 两端 circle', () => {
    const css = line({ border: { width: 1, color: '#000000', style: 'solid', cap: 'ARROW_CIRCLE' } });
    const svg = decodeURIComponent(css['background-image']!.slice(css['background-image']!.indexOf(',') + 1));
    expect(svg.split('<circle')).toHaveLength(3);
  });
});

describe('FR-16 schema 往返与工具接入', () => {
  it('POLYGON/STAR + arcData/pointCount/innerRadius JSON 往返', () => {
    const page = createPage('往返');
    const poly = createNode('POLYGON');
    poly.style = { ...(poly.style as StyleSchema), pointCount: 8 };
    const star = createNode('STAR');
    star.style = { ...(star.style as StyleSchema), pointCount: 7, innerRadius: 0.6 };
    const oval = createNode('OVAL');
    oval.style = { ...(oval.style as StyleSchema), arcData: { startingAngle: 45, endingAngle: 200, innerRadius: 0.3 } };
    page.root.children.push(poly, star, oval);
    const round = JSON.parse(JSON.stringify(page));
    const kids = round.root.children as UINode[];
    expect(kids[0].style?.pointCount).toBe(8);
    expect(kids[1].style?.innerRadius).toBe(0.6);
    expect(kids[2].style?.arcData).toEqual({ startingAngle: 45, endingAngle: 200, innerRadius: 0.3 });
  });

  it('旧 JSON（无新字段）可编译不破', () => {
    const legacy = JSON.parse(
      JSON.stringify({
        id: 'p',
        name: '旧',
        viewport: { width: 1, height: 1 },
        root: { id: 'r', type: 'PAGE', layout: { mode: 'VERTICAL', widthMode: 'HUG', heightMode: 'HUG' }, children: [
          { id: 'n1', type: 'OVAL', name: 'o', layout: { mode: 'ABSOLUTE', width: 10, height: 10, x: 0, y: 0, widthMode: 'FIXED', heightMode: 'FIXED' }, style: {} },
        ] },
      }),
    );
    expect(() => compilePage(legacy)).not.toThrow();
  });
});
