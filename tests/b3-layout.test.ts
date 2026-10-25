/**
 * B3 · 布局表达力（CSS Grid / transform 组合 / sticky-fixed）
 *
 * 锁四件事：
 * 1. **Grid 接管布局**：设置 `style.grid` 后容器出 `display:grid` + 模板，
 *    且**不再出** `flex-direction` / flex 语义的 `gap`（网格 gap 走 rowGap/columnGap）；
 * 2. **transform 顺序固定** translate → rotate → scale，origin 缺省元素中心；
 *    与 LINE 的 `rotation`（线段角度）互不覆写；
 * 3. **sticky/fixed 仅出码**：与 `mode: 'ABSOLUTE'` 互斥（ABS 已出 `position: absolute`）；
 * 4. **AI 契约**：`transform` / `grid` 透传，空对象不落字段。
 */
import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { ContainerNode, LayoutSchema, StyleSchema } from '../src/schema/types';
import { compilePage, scssFromPage } from '../src/compiler';
import { draftToPage } from '../src/editor/ai/specToPage';
import type { StylePack } from '../src/tokens/packs/types';

resetIdSeq(5300);

function framePage(style: Partial<StyleSchema>, layout?: Partial<LayoutSchema>) {
  const page = createPage('B3 布局');
  const f = createNode('FRAME');
  f.layout = {
    ...f.layout,
    width: 300,
    height: 200,
    widthMode: 'FIXED',
    heightMode: 'FIXED',
    mode: 'HORIZONTAL',
    ...layout,
  };
  f.style = style as StyleSchema;
  const card = createNode('RECTANGLE');
  card.layout = { ...card.layout, width: 80, height: 40, widthMode: 'FIXED', heightMode: 'FIXED' };
  (f as unknown as { children: unknown[] }).children = [card];
  page.root.children.push(f);
  return page;
}

function css(style: Partial<StyleSchema>, layout?: Partial<LayoutSchema>): string {
  return scssFromPage(compilePage(framePage(style, layout)));
}

/** 取某个类名块的声明（第一个匹配） */
function blockOf(out: string, cls: string): string {
  const m = new RegExp(`\\.${cls} \\{([\\s\\S]*?)\\n\\}`).exec(out);
  return m?.[1] ?? '';
}

describe('B3 · CSS Grid', () => {
  it('设置 grid 后接管布局：出 display:grid + 模板 + 网格 gap', () => {
    const b = blockOf(css({ grid: { columns: 'repeat(3, 1fr)', columnGap: 12, rowGap: 8 } }), 'frame-1');
    expect(b).toContain('display: grid');
    expect(b).toContain('grid-template-columns: repeat(3, 1fr)');
    expect(b).toContain('gap: 8px 12px');
    // flex 语义必须消失
    expect(b).not.toContain('flex-direction');
  });

  it('未设 rowGap 时沿用 columnGap；autoFlow 非缺省才出', () => {
    const b = blockOf(css({ grid: { columns: '1fr 2fr', columnGap: 10 } }), 'frame-1');
    expect(b).toContain('gap: 10px 10px');
    expect(b).not.toContain('grid-auto-flow');
    const dense = blockOf(css({ grid: { columns: '1fr', autoFlow: 'row dense' } }), 'frame-1');
    expect(dense).toContain('grid-auto-flow: row dense');
  });

  it('网格不影响子项尺寸声明（FILL/FIXED 照旧出）', () => {
    const out = css({ grid: { columns: 'repeat(2, 1fr)' } });
    expect(blockOf(out, 'rectangle-1')).toContain('width: 80px');
  });

  it('ABSOLUTE 容器不受 grid 影响（绝对定位优先）', () => {
    const b = blockOf(css({ grid: { columns: '1fr' } }, { mode: 'ABSOLUTE' }), 'frame-1');
    expect(b).toContain('position: absolute');
    expect(b).not.toContain('display: grid');
    expect(b).not.toContain('grid-template-columns');
  });
});

describe('B3 · transform 组合', () => {
  it('顺序固定 translate → rotate → scale，origin 缺省中心', () => {
    const b = blockOf(css({ transform: { translateX: 4, translateY: -2, rotate: 15, scaleX: 1.1, scaleY: 0.9 } }), 'frame-1');
    expect(b).toContain('transform: translate(4px, -2px) rotate(15deg) scale(1.1, 0.9)');
    expect(b).toContain('transform-origin: 50% 50%');
  });

  it('自定义 origin 生效；空 transform 不出声明', () => {
    const b = blockOf(css({ transform: { rotate: 90, origin: '0 0' } }), 'frame-1');
    expect(b).toContain('transform-origin: 0 0');
    expect(blockOf(css({ transform: {} }), 'frame-1')).not.toContain('transform:');
  });

  it('LINE 的 rotation（线段角度）不被 transform 覆写', () => {
    const page = createPage('B3 LINE');
    const line = createNode('LINE');
    line.layout = { ...line.layout, width: 100, height: 0, widthMode: 'FIXED', heightMode: 'FIXED' };
    line.style = { rotation: 30, border: { width: 1, color: '#000000' }, transform: { rotate: 90 } };
    page.root.children.push(line);
    const out = scssFromPage(compilePage(page));
    expect(out).toContain('transform: rotate(30deg)');
    expect(out).not.toContain('rotate(90deg)');
    expect(out).toContain('transform-origin: 0 50%');
  });
});

describe('B3 · sticky / fixed（仅出码）', () => {
  it('STICKY 出 position:sticky + top', () => {
    const b = blockOf(css({}, { position: 'STICKY', stickyTop: 12 }), 'frame-1');
    expect(b).toContain('position: sticky');
    expect(b).toContain('top: 12px');
  });

  it('FIXED 出 position:fixed；stickyBottom 单独生效', () => {
    const b = blockOf(css({}, { position: 'STICKY', stickyBottom: 8 }), 'frame-1');
    expect(b).toContain('position: sticky');
    expect(b).toContain('bottom: 8px');
    const fx = blockOf(css({}, { position: 'FIXED' }), 'frame-1');
    expect(fx).toContain('position: fixed');
    expect(fx).toContain('top: 0px');
  });

  it('ABSOLUTE 模式互斥：不出 sticky/fixed', () => {
    const b = blockOf(css({}, { mode: 'ABSOLUTE', position: 'STICKY' }), 'frame-1');
    expect(b).not.toContain('sticky');
  });
});

describe('B3 · AI 契约', () => {
  const pack = { colors: {}, fonts: {}, shadows: {} } as unknown as StylePack;

  function draft(style: Record<string, unknown>) {
    return {
      kind: 'page' as const,
      name: 'P',
      root: {
        kind: 'FRAME' as const,
        layout: { width: 320, height: 200 },
        children: [{ name: 'card', kind: 'FRAME' as const, layout: { width: 300, height: 160 }, style }],
      },
    };
  }

  it('transform / grid 透传到 StyleSchema', () => {
    const r = draftToPage(
      draft({ transform: { rotate: 10, scaleX: 1.2 }, grid: { columns: 'repeat(2, 1fr)', columnGap: 16 } }) as never,
      { pack },
    );
    const card = (r.page.root as ContainerNode).children[0];
    expect(card.style?.transform).toEqual({ rotate: 10, scaleX: 1.2 });
    expect(card.style?.grid).toEqual({ columns: 'repeat(2, 1fr)', columnGap: 16 });
  });

  it('空对象不落字段', () => {
    const r = draftToPage(draft({ transform: {}, grid: {} }) as never, { pack });
    const card = (r.page.root as ContainerNode).children[0];
    expect(card.style?.transform).toBeUndefined();
    expect(card.style?.grid).toBeUndefined();
  });
});
