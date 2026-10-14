import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { compilePage } from '../src/compiler';
import type { StyleSchema, UINode } from '../src/schema/types';

resetIdSeq(0);

function rectPage(style: StyleSchema) {
  const page = createPage('FR16 页面');
  const rect = createNode('RECTANGLE', { name: '盒' });
  rect.style = { ...style };
  page.root.children.push(rect);
  return { page, rect };
}

describe('FR-16 形状参数：四角独立圆角与 cornerSmoothing', () => {
  it('四角独立圆角 → border-radius 四值 TL TR BR BL', () => {
    const { page, rect } = rectPage({ borderRadius: [1, 2, 3, 4] });
    const css = compilePage(page).nodes.find((n) => n.id === rect.id)!.css;
    expect(css['border-radius']).toBe('1px 2px 3px 4px');
  });

  it('单值圆角 → 单值 px', () => {
    const { page, rect } = rectPage({ borderRadius: 12 });
    const css = compilePage(page).nodes.find((n) => n.id === rect.id)!.css;
    expect(css['border-radius']).toBe('12px');
  });

  it('cornerSmoothing>0 → corner-shape: squircle；0 或缺省不输出该声明', () => {
    const a = rectPage({ borderRadius: 8, cornerSmoothing: 0.6 });
    const cssA = compilePage(a.page).nodes.find((n) => n.id === a.rect.id)!.css;
    expect(cssA['corner-shape']).toBe('squircle');

    const b = rectPage({ borderRadius: 8, cornerSmoothing: 0 });
    const cssB = compilePage(b.page).nodes.find((n) => n.id === b.rect.id)!.css;
    expect(cssB['corner-shape']).toBeUndefined();

    const c = rectPage({ borderRadius: 8 });
    const cssC = compilePage(c.page).nodes.find((n) => n.id === c.rect.id)!.css;
    expect(cssC['corner-shape']).toBeUndefined();
  });

  it('cornerSmoothing 进 schema JSON 往返（可选字段，旧项目缺省不破）', () => {
    const { page } = rectPage({ borderRadius: [4, 4, 0, 0], cornerSmoothing: 0.25 });
    const round = JSON.parse(JSON.stringify(page));
    const child = round.root.children[0] as UINode;
    expect(child.style?.cornerSmoothing).toBe(0.25);
    expect(child.style?.borderRadius).toEqual([4, 4, 0, 0]);

    const legacy = JSON.parse(
      JSON.stringify({ id: 'p', name: '旧', viewport: { width: 1, height: 1 }, root: { id: 'r', type: 'PAGE', layout: { mode: 'VERTICAL', widthMode: 'HUG', heightMode: 'HUG' }, children: [] } }),
    );
    expect(legacy.root.style?.cornerSmoothing).toBeUndefined();
  });

  it('四角独立圆角数组经 Konva 语义保序（TL TR BR BL 与 CSS 同序）', () => {
    const { rect } = rectPage({ borderRadius: [0, 8, 0, 8] });
    const br = rect.style!.borderRadius;
    expect(Array.isArray(br) && br[0] === 0 && br[1] === 8 && br[2] === 0 && br[3] === 8).toBe(true);
  });
});
