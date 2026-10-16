import { describe, expect, it } from 'vitest';
import {
  BOOLEAN_OPS,
  booleanFillRule,
  booleanOperandsOf,
  booleanPathOf,
  booleanVectorOf,
  pathBounds,
  splitSubpaths,
  subpathCount,
  type BooleanOp,
} from '../src/compiler/boolean';
import {
  isMaskExpressible,
  maskClipCss,
  maskDeclarations,
  maskIndexInGroup,
} from '../src/compiler/mask';
import { createBooleanNode, createMaskGroup, createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { compilePage } from '../src/compiler';
import { svgOfVector } from '../src/generator/vector';
import type { UINode, VectorNode } from '../src/schema/types';

resetIdSeq(0);

const SQUARE_A = 'M 0 0 L 100 0 L 100 100 L 0 100 Z';
const SQUARE_B = 'M 50 50 L 150 50 L 150 150 L 50 150 Z';
const CIRCLE = 'M 0 50 A 50 50 0 1 0 100 50 A 50 50 0 1 0 0 50 Z';

describe('FR-22 布尔运算：fill-rule 口径', () => {
  it('Union→nonzero，其余三运算→evenodd（与 SVG 原生语义对齐）', () => {
    expect(booleanFillRule('UNION')).toBe('nonzero');
    expect(booleanFillRule('INTERSECT')).toBe('evenodd');
    expect(booleanFillRule('SUBTRACT')).toBe('evenodd');
    expect(booleanFillRule('EXCLUDE')).toBe('evenodd');
  });

  it('四运算枚举齐备且顺序稳定（UI 面板顺序单一事实源）', () => {
    expect(BOOLEAN_OPS).toEqual(['UNION', 'INTERSECT', 'SUBTRACT', 'EXCLUDE']);
  });

  it('Union：子路径拼接 + nonzero（两条 d 原样保留，内边仍在——近似口径）', () => {
    const r = booleanPathOf([SQUARE_A, SQUARE_B], 'UNION');
    expect(r.fillRule).toBe('nonzero');
    expect(r.d).toBe(`${SQUARE_A} ${SQUARE_B}`);
    expect(r.operands).toBe(2);
    // 近似说明：Union 不做拓扑消边，内部边仍留在 d 串中
    expect(subpathCount(r.d)).toBe(2);
  });

  it('Subtract：拼接 + evenodd（B 被扣出 A 的依据是 evenodd 填充计数）', () => {
    const r = booleanPathOf([SQUARE_A, SQUARE_B], 'SUBTRACT');
    expect(r.fillRule).toBe('evenodd');
    expect(r.d).toBe(`${SQUARE_A} ${SQUARE_B}`);
  });

  it('Intersect / Exclude：同样走 evenodd 拼接路径', () => {
    for (const op of ['INTERSECT', 'EXCLUDE'] as BooleanOp[]) {
      const r = booleanPathOf([SQUARE_A, SQUARE_B], op);
      expect(r.fillRule).toBe('evenodd');
      expect(r.d).toBe(`${SQUARE_A} ${SQUARE_B}`);
    }
  });

  it('参集顺序即子路径顺序（数组序 = 自下而上，结果确定）', () => {
    const ab = booleanPathOf([SQUARE_A, SQUARE_B], 'UNION');
    const ba = booleanPathOf([SQUARE_B, SQUARE_A], 'UNION');
    expect(ab.d).toBe(`${SQUARE_A} ${SQUARE_B}`);
    expect(ba.d).toBe(`${SQUARE_B} ${SQUARE_A}`);
    expect(ab.d).not.toBe(ba.d);
  });

  it('三参集混合运算：全部子路径进入结果', () => {
    const r = booleanPathOf([SQUARE_A, CIRCLE, SQUARE_B], 'SUBTRACT');
    expect(r.operands).toBe(3);
    expect(subpathCount(r.d)).toBe(3);
    expect(r.d.startsWith(SQUARE_A)).toBe(true);
    expect(r.d.endsWith(SQUARE_B)).toBe(true);
  });
});

describe('FR-22 布尔运算：边界与确定性', () => {
  it('空参集 → 空 d、operands=0，但 fill-rule 仍按运算返回', () => {
    const r = booleanPathOf([], 'SUBTRACT');
    expect(r).toEqual({ d: '', fillRule: 'evenodd', operands: 0 });
    expect(booleanPathOf([], 'UNION').fillRule).toBe('nonzero');
  });

  it('空 d / 纯空白 d 被剔除（不产出多余子路径）', () => {
    const r = booleanPathOf([SQUARE_A, '', '   \n ', SQUARE_B], 'UNION');
    expect(r.operands).toBe(2);
    expect(r.d).toBe(`${SQUARE_A} ${SQUARE_B}`);
  });

  it('单 path → 原样返回（单参与集是恒等运算）', () => {
    const r = booleanPathOf([SQUARE_A], 'UNION');
    expect(r.d).toBe(SQUARE_A);
    expect(r.operands).toBe(1);
    expect(booleanPathOf([`  ${SQUARE_A}  `], 'UNION').d).toBe(SQUARE_A);
  });

  it('全空白参集 → 空结果（不产出 " " 之类的脏串）', () => {
    expect(booleanPathOf(['', '  '], 'EXCLUDE').d).toBe('');
  });

  it('粘连写法 M…M… 被规范化为单空格分隔（可读可 diff）', () => {
    const r = booleanPathOf(['M 0 0 L 1 1M 2 2 L 3 3'], 'UNION');
    expect(r.d).toBe('M 0 0 L 1 1 M 2 2 L 3 3');
  });

  it('序列化确定性：同输入两次调用字节一致', () => {
    const first = booleanPathOf([SQUARE_A, CIRCLE, SQUARE_B], 'EXCLUDE');
    const second = booleanPathOf([SQUARE_A, CIRCLE, SQUARE_B], 'EXCLUDE');
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(svgOfVector({ d: first.d, fillRule: first.fillRule }, 150, 150)).toBe(
      svgOfVector({ d: second.d, fillRule: second.fillRule }, 150, 150),
    );
  });

  it('splitSubpaths / subpathCount：Multiple M 计数正确', () => {
    expect(splitSubpaths('')).toEqual([]);
    expect(splitSubpaths(SQUARE_A)).toHaveLength(1);
    // CIRCLE 只有 1 个 M（两条 A 弧段同属一条子路径）→ 拼接后共 2 条子路径
    expect(splitSubpaths(`${SQUARE_A} ${CIRCLE}`)).toHaveLength(2);
    expect(splitSubpaths('M 0 0 L 1 1 M 2 2 L 3 3 M 4 4')).toHaveLength(3);
    expect(subpathCount(`${SQUARE_A} ${SQUARE_B}`)).toBe(2);
  });

  it('pathBounds：子路径外接矩形（用于参与集展示与归一化）', () => {
    expect(pathBounds(SQUARE_A)).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    expect(pathBounds(SQUARE_B)).toEqual({ x: 50, y: 50, width: 100, height: 100 });
    expect(pathBounds('')).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});

describe('FR-22 布尔运算：VectorData 封装与可编辑参与集', () => {
  it('booleanVectorOf：取参集最大 width/height 作为合并域', () => {
    const v = booleanVectorOf(
      [
        { d: SQUARE_A, width: 100, height: 100 },
        { d: SQUARE_B, width: 150, height: 150 },
      ],
      'UNION',
    );
    expect(v.width).toBe(150);
    expect(v.height).toBe(150);
    expect(v.fillRule).toBe('nonzero');
  });

  it('booleanVectorOf：无有效参集 → 空 d，且不写 0 尺寸（可选字段留空）', () => {
    const v = booleanVectorOf([undefined, { d: '  ' }], 'EXCLUDE');
    expect(v.d).toBe('');
    expect(v.width).toBeUndefined();
    expect(v.height).toBeUndefined();
    expect(v.fillRule).toBe('evenodd');
  });

  it('booleanOperandsOf：结果 d 回拆参与集（可继续编辑），顺序与 bounds 对齐', () => {
    const r = booleanPathOf([SQUARE_A, SQUARE_B], 'SUBTRACT');
    const ops = booleanOperandsOf(r.d);
    expect(ops).toHaveLength(2);
    expect(ops[0].d).toBe(SQUARE_A);
    expect(ops[1].bounds).toEqual({ x: 50, y: 50, width: 100, height: 100 });
  });

  it('factory.createBooleanNode：产出 VECTOR 节点并搬运尺寸，可再入 compilePage', () => {
    const node = createBooleanNode('UNION', [
      { d: SQUARE_A, width: 100, height: 100 },
      { d: SQUARE_B, width: 150, height: 150 },
    ]);
    expect(node.type).toBe('VECTOR');
    expect(node.name).toBe('Union');
    expect(node.vector?.fillRule).toBe('nonzero');
    // 工厂只搬 vector.width/height；layout 尺寸语义沿用 VECTOR 默认（HUG），由调用方按需改宽高模式
    expect(node.vector?.width).toBe(150);
    expect(node.vector?.height).toBe(150);

    const page = createPage('FR22 页面');
    page.root.children.push(node as UINode);
    const compiled = compilePage(page).nodes.find((n) => n.id === node.id)!;
    // FR-49 不变量：VECTOR 不出矩形底/边框（视觉全在 svg 内）
    expect(compiled.css['background-color']).toBeUndefined();
    expect(compiled.css['background-image']).toBeUndefined();
    expect(compiled.css['border']).toBeUndefined();
    // 尺寸语义保留（HUG 不被矢量出码塌陷为 0）
    expect(compiled.css.width).toBe('fit-content');
  });

  it('FIXED 宽高的布尔结果节点 → 出码出 px（参与 layout 布局语义）', () => {
    const node = createBooleanNode('UNION', [
      { d: SQUARE_A, width: 100, height: 100 },
      { d: SQUARE_B, width: 150, height: 150 },
    ]);
    node.layout.widthMode = 'FIXED';
    node.layout.heightMode = 'FIXED';
    node.layout.width = node.vector!.width;
    node.layout.height = node.vector!.height;
    const page = createPage('FR22 固定尺寸');
    page.root.children.push(node as UINode);
    const css = compilePage(page).nodes.find((n) => n.id === node.id)!.css;
    expect(css.width).toBe('150px');
    expect(css.height).toBe('150px');
  });

  it('Subtract 结果经 svgOfVector 出码：fill-rule 落在 svg 根上', () => {
    const node = createBooleanNode('SUBTRACT', [
      { d: SQUARE_A, width: 100, height: 100 },
      { d: CIRCLE, width: 100, height: 100 },
    ]);
    const svg = svgOfVector(node.vector, 100, 100, { fill: '#1677FF' });
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).toContain(`d="${node.vector!.d}"`);
  });
});

describe('FR-23 蒙版：各形态 CSS 等价出码', () => {
  it('VECTOR 蒙版（有 d）→ clip-path: path(...) + overflow hidden', () => {
    const mask = createNode('VECTOR') as VectorNode;
    mask.vector = { d: CIRCLE };
    const r = maskClipCss(mask)!;
    expect(r.kind).toBe('VECTOR');
    expect(r.clipPath).toBe(`path('${CIRCLE}')`);
    expect(r.overflow).toBe('hidden');
    expect(r.borderRadius).toBeNull();
  });

  it('VECTOR 蒙版带平移 → path 坐标换算到 target 本地系', () => {
    const mask = createNode('VECTOR') as VectorNode;
    mask.vector = { d: 'M 0 0 L 10 10' };
    const r = maskClipCss(mask, { x: 20, y: 30 })!;
    expect(r.clipPath).toBe("path('translate(-20 -30) M 0 0 L 10 10')");
  });

  it('VECTOR 空 d → null（不产出半吊子 clip，调用方保持原出码）', () => {
    const mask = createNode('VECTOR') as VectorNode;
    mask.vector = { d: '   ' };
    expect(maskClipCss(mask)).toBeNull();
    expect(isMaskExpressible(mask)).toBe(false);
  });

  it('圆角矩形蒙版 → border-radius + overflow hidden', () => {
    const mask = createNode('RECTANGLE');
    mask.style = { borderRadius: 12 };
    const r = maskClipCss(mask)!;
    expect(r.kind).toBe('ROUNDED_RECT');
    expect(r.borderRadius).toBe('12px');
    expect(r.overflow).toBe('hidden');
    expect(r.clipPath).toBeNull();
  });

  it('四角独立圆角蒙版 → 四值 border-radius 保序', () => {
    const mask = createNode('RECTANGLE');
    mask.style = { borderRadius: [1, 2, 3, 4] };
    expect(maskClipCss(mask)!.borderRadius).toBe('1px 2px 3px 4px');
  });

  it('无圆角矩形蒙版（已知尺寸）→ inset() 精确表达偏移裁切', () => {
    const mask = createNode('RECTANGLE');
    mask.layout.width = 80;
    mask.layout.height = 80;
    const r = maskClipCss(mask, { x: 10, y: 5 })!;
    expect(r.kind).toBe('RECT');
    expect(r.clipPath).toBe('inset(5px 10px 0 0)');
    expect(r.overflow).toBe('hidden');
  });

  it('椭圆蒙版 → border-radius 50% + overflow hidden', () => {
    const mask = createNode('OVAL');
    const r = maskClipCss(mask)!;
    expect(r.kind).toBe('OVAL');
    expect(r.borderRadius).toBe('50%');
    expect(r.overflow).toBe('hidden');
  });

  it('无等价形态（TEXT/LINE/POLYGON）→ null', () => {
    expect(maskClipCss(createNode('TEXT'))).toBeNull();
    expect(maskClipCss(createNode('LINE'))).toBeNull();
    expect(maskClipCss(createNode('POLYGON'))).toBeNull();
  });

  it('缺省/隐藏蒙版 → null（不可见蒙版不裁切组内下方图层）', () => {
    expect(maskClipCss(undefined)).toBeNull();
    const hidden = createNode('OVAL');
    hidden.visible = false;
    expect(maskClipCss(hidden)).toBeNull();
  });

  it('maskDeclarations：结果 → CSSDecl 声明片段，无结果为空对象', () => {
    const mask = createNode('RECTANGLE');
    mask.style = { borderRadius: 8 };
    expect(maskDeclarations(maskClipCss(mask))).toEqual({
      'border-radius': '8px',
      overflow: 'hidden',
    });
    expect(maskDeclarations(null)).toEqual({});
  });

  it('maskIndexInGroup：取组内最上方可见图层（数组末位）', () => {
    const a = createNode('RECTANGLE');
    const b = createNode('OVAL');
    const c = createNode('RECTANGLE');
    expect(maskIndexInGroup([a, b, c])).toBe(2);
    c.visible = false;
    expect(maskIndexInGroup([a, b, c])).toBe(1);
    expect(maskIndexInGroup([])).toBe(-1);
    expect(maskIndexInGroup(undefined)).toBe(-1);
  });

  it('factory.createMaskGroup：Frame 包裹 + 蒙版下标指向末位子项', () => {
    const target = createNode('IMAGE');
    const mask = createNode('OVAL');
    const { group, maskIndex } = createMaskGroup([target, mask], { name: '蒙版组' });
    expect(group.type).toBe('FRAME');
    expect(group.children).toHaveLength(2);
    expect(group.children[maskIndex].id).toBe(mask.id);
  });

  it('蒙版组经 compilePage：蒙版声明自动合入组内下方图层出码', () => {
    const target = createNode('RECTANGLE');
    const mask = createNode('RECTANGLE');
    mask.style = { borderRadius: 16 };
    const { group } = createMaskGroup([target, mask]);
    const page = createPage('FR23 页面');
    page.root.children.push(group);
    const compiled = compilePage(page);
    const targetCss = compiled.nodes.find((n) => n.id === target.id)!.css;
    // 下方图层被上方蒙版裁切
    expect(targetCss['border-radius']).toBe('16px');
    expect(targetCss['overflow']).toBe('hidden');
    // 蒙版自身不被裁切（不重复挂 overflow）
    const maskCss = compiled.nodes.find((n) => n.id === mask.id)!.css;
    expect(maskCss['overflow']).toBeUndefined();
    // 确定性：两次编译字节一致
    expect(JSON.stringify(compilePage(page).nodes)).toBe(JSON.stringify(compiled.nodes));
  });

  it('VECTOR 蒙版 → 组内下方图层出 clip-path:path（矢量蒙版首选等价）', () => {
    const target = createNode('RECTANGLE');
    const mask = createNode('VECTOR') as VectorNode;
    mask.vector = { d: CIRCLE };
    const { group } = createMaskGroup([target, mask]);
    const page = createPage('FR23 矢量蒙版');
    page.root.children.push(group);
    const css = compilePage(page).nodes.find((n) => n.id === target.id)!.css;
    expect(css['clip-path']).toBe(`path('${CIRCLE}')`);
    expect(css['overflow']).toBe('hidden');
  });

  it('clipContent 已开的容器不被蒙版重复裁切（避免双重裁切）', () => {
    const target = createNode('FRAME');
    target.layout.clipContent = true;
    const mask = createNode('OVAL');
    const { group } = createMaskGroup([target, mask]);
    const page = createPage('FR23 clipContent');
    page.root.children.push(group);
    const css = compilePage(page).nodes.find((n) => n.id === target.id)!.css;
    expect(css['overflow']).toBe('hidden'); // 既有 clipContent 出码
    expect(css['border-radius']).toBeUndefined(); // 蒙版声明不叠加
  });

  it('蒙版组嵌套编译确定性：两次 compilePage 的 CSS 字节一致', () => {
    const build = () => {
      const target = createNode('RECTANGLE');
      const inner = createNode('OVAL');
      const mask = createNode('RECTANGLE');
      mask.style = { borderRadius: [4, 4, 0, 0] };
      const { group } = createMaskGroup([target, inner, mask]);
      const page = createPage('FR23 嵌套');
      page.root.children.push(group);
      // 只比 CSS：节点 id 由 nextId 全局自增，两次 build 的 id 必然不同（非确定性来源不在编译器）
      return compilePage(page).nodes.map((n) => n.css);
    };
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
  });
});
