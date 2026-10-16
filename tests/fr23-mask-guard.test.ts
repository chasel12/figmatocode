import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { compilePage } from '../src/compiler';
import type { ContainerNode, UINode } from '../src/schema/types';

resetIdSeq(0);

function cssOf(container: ContainerNode, childId: string): Record<string, string> {
  const page = createPage('蒙版判定回归');
  page.root.children.push(container);
  const compiled = compilePage(page);
  return compiled.nodes.find((n) => n.id === childId)!.css;
}

/**
 * FR-23 回归防线：蒙版判定必须**显式**（容器 layout.clipContent = true）。
 *
 * 反例背景：早期实现按「组内末位可见子即蒙版」隐式推断，导致任何
 * 「矩形后跟圆角矩形/椭圆/矢量」的普通 Frame 都会给前位子注入
 * border-radius / overflow / clip-path —— 静默改变正常页面出码。
 * 以下用例锁定「未声明 clipContent 时绝不出裁切声明」。
 */
describe('FR-23 蒙版判定必须显式（防隐式误判回归）', () => {
  it('普通 Frame（矩形 + 圆角矩形）：前位子无裁切声明', () => {
    const f = createNode('FRAME') as ContainerNode;
    const a = createNode('RECTANGLE');
    const b = createNode('RECTANGLE');
    b.style = { borderRadius: 12 };
    f.children = [a, b];
    const aCss = cssOf(f, a.id);
    expect(aCss['border-radius']).toBeUndefined();
    expect(aCss['overflow']).toBeUndefined();
    expect(aCss['clip-path']).toBeUndefined();
  });

  it('普通 Frame（矩形 + 椭圆）：前位子无裁切声明', () => {
    const f = createNode('FRAME') as ContainerNode;
    const a = createNode('RECTANGLE');
    const oval = createNode('OVAL');
    f.children = [a, oval];
    const aCss = cssOf(f, a.id);
    expect(aCss['border-radius']).toBeUndefined();
    expect(aCss['overflow']).toBeUndefined();
  });

  it('普通 Frame（矩形 + 矢量）：前位子无 clip-path', () => {
    const f = createNode('FRAME') as ContainerNode;
    const a = createNode('RECTANGLE');
    const v = createNode('VECTOR') as UINode;
    (v as { vector: { d: string } }).vector = { d: 'M 0 0 L 10 0 L 10 10 Z' };
    f.children = [a, v];
    const aCss = cssOf(f, a.id);
    expect(aCss['clip-path']).toBeUndefined();
    expect(aCss['overflow']).toBeUndefined();
  });

  it('显式声明 clipContent 后，蒙版等价才生效（圆角矩形蒙版）', () => {
    const f = createNode('FRAME') as ContainerNode;
    f.layout.clipContent = true;
    const a = createNode('RECTANGLE');
    const b = createNode('RECTANGLE');
    b.style = { borderRadius: 12 };
    f.children = [a, b];
    const aCss = cssOf(f, a.id);
    expect(aCss['border-radius']).toBe('12px');
    expect(aCss['overflow']).toBe('hidden');
  });

  it('显式 clipContent + 椭圆蒙版 → border-radius 50%', () => {
    const f = createNode('FRAME') as ContainerNode;
    f.layout.clipContent = true;
    const a = createNode('RECTANGLE');
    const oval = createNode('OVAL');
    f.children = [a, oval];
    expect(cssOf(f, a.id)['border-radius']).toBe('50%');
  });

  it('显式 clipContent + 矢量蒙版 → clip-path: path（蒙版自身不被裁切）', () => {
    const f = createNode('FRAME') as ContainerNode;
    f.layout.clipContent = true;
    const a = createNode('RECTANGLE');
    const v = createNode('VECTOR') as UINode;
    (v as { vector: { d: string } }).vector = { d: 'M 0 0 L 10 0 L 10 10 Z' };
    f.children = [a, v];
    expect(cssOf(f, a.id)['clip-path']).toContain('path(');
    // 蒙版自身不参与裁切
    const vCss = cssOf(f, v.id);
    expect(vCss['opacity'] ?? '1').toBeTruthy();
  });
});
