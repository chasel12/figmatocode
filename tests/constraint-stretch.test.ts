import { describe, expect, it } from 'vitest';
import { compilePage } from '../src/compiler/compile';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { ContainerNode, UINode, UIPage } from '../src/schema/types';

resetIdSeq(0);

/**
 * #4a stretch 约束档（2026-10-20 补齐）。
 *
 * Figma 水平方向除 Left/Right/Center/Scale 外还有 **Left and right**（两边吸附 → 宽度随父拉伸），
 * 垂直对应 **Top and bottom**。此前只做 4 档，导致"铺满父容器"这类最常见的响应式需求无法表达。
 *
 * 出码约定：
 *  - `LEFT_RIGHT`  → 同时输出 left + right，**不输出 width**
 *  - `TOP_BOTTOM`  → 同时输出 top + bottom，**不输出 height**
 */
function absChildPage(h: string, v: string): UIPage {
  const page = createPage('约束回归');
  const parent = createNode('FRAME') as ContainerNode;
  parent.layout = {
    ...parent.layout,
    mode: 'ABSOLUTE',
    widthMode: 'FIXED',
    heightMode: 'FIXED',
    width: 375,
    height: 600,
    x: 0,
    y: 0,
    padding: [0, 0, 0, 0],
  };
  const child = createNode('RECTANGLE') as UINode;
  child.layout = {
    ...child.layout,
    widthMode: 'FIXED',
    heightMode: 'FIXED',
    width: 100,
    height: 50,
    x: 20,
    y: 30,
    constraints: { horizontal: h as never, vertical: v as never },
  };
  parent.children = [child];
  page.root.children.push(parent);
  return page;
}

function childCss(page: UIPage): Record<string, string> {
  const compiled = compilePage(page);
  // 找最后一个含 position:absolute 的节点
  const abs = compiled.nodes.filter((n) => n.css['position'] === 'absolute');
  return (abs[abs.length - 1]?.css ?? {}) as Record<string, string>;
}

describe('#4a 约束 stretch 档出码', () => {
  it('LEFT_RIGHT → 同时输出 left 与 right，且不输出 width', () => {
    const css = childCss(absChildPage('LEFT_RIGHT', 'TOP'));
    expect(css['left']).toBe('20px');
    expect(css['right']).toBeDefined(); // 375 - 20 - 100 = 255
    expect(css['right']).toBe('255px');
    expect(css['width']).toBeUndefined();
  });

  it('TOP_BOTTOM → 同时输出 top 与 bottom，且不输出 height', () => {
    const css = childCss(absChildPage('LEFT', 'TOP_BOTTOM'));
    expect(css['top']).toBe('30px');
    expect(css['bottom']).toBe('520px'); // 600 - 30 - 50
    expect(css['height']).toBeUndefined();
  });

  it('同时用两个 stretch 档 → 四边全吸附', () => {
    const css = childCss(absChildPage('LEFT_RIGHT', 'TOP_BOTTOM'));
    expect(css['left']).toBe('20px');
    expect(css['right']).toBe('255px');
    expect(css['top']).toBe('30px');
    expect(css['bottom']).toBe('520px');
    expect(css['width']).toBeUndefined();
    expect(css['height']).toBeUndefined();
  });

  it('存量 4 档语义不变（LEFT 仍出 left、RIGHT 仍出 right）', () => {
    const left = childCss(absChildPage('LEFT', 'TOP'));
    expect(left['left']).toBe('20px');
    expect(left['right']).toBeUndefined();

    const right = childCss(absChildPage('RIGHT', 'TOP'));
    expect(right['right']).toBeDefined();
    expect(right['left']).toBeUndefined();
  });

  it('SCALE 档仍输出百分比 left + width（未受 stretch 影响）', () => {
    const css = childCss(absChildPage('SCALE', 'TOP'));
    expect(String(css['left'])).toContain('%');
    expect(String(css['width'])).toContain('%');
  });
});
