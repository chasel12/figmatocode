/**
 * B1 · 渐变描边（`docs/decorations-rfc.md` §3.2）
 *
 * 锁五件事：
 * 1. **CSS 口径**：透明 border + `background-clip: …, border-box` 叠层，且层数列表与
 *    `background-image` 顶层层数对齐（渐变内部逗号不能被当成分层符）；
 * 2. **降级口径**：四边独立 / 虚线 / CENTER / OUTSIDE 在 CSS 侧无叠层表达 → 退回纯色；
 * 3. **AI 契约**：`border.gradient.from/to` 走 `applyColor`，非法色记违例不抛错；
 * 4. **.fig paint 双向**：渐变描边 ↔ `strokePaints` 渐变 paint 互逆；
 * 5. **.fig 往返**：AST → `.fig` → AST 后 `border.fill` 仍在。
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { BorderSchema, ContainerNode, FillLayer, StyleSchema } from '../src/schema/types';
import { compilePage, scssFromPage } from '../src/compiler';
import { fillToPaint, paintToFill, strokesToStyle } from '../src/fig/paint';
import { exportFig } from '../src/fig/export';
import { importFig } from '../src/fig/import';
import { loadFigCodec, type FigCodec } from '../src/fig/codec';
import { draftToPage } from '../src/editor/ai/specToPage';
import type { StylePack } from '../src/tokens/packs/types';

resetIdSeq(1200);

const GRADIENT: FillLayer = {
  type: 'GRADIENT_LINEAR',
  angle: 90,
  stops: [
    { position: 0, color: '#7c3aed' },
    { position: 1, color: '#06b6d4' },
  ],
};

function rectPage(style: Partial<StyleSchema>) {
  const page = createPage('B1 渐变描边');
  const rect = createNode('RECTANGLE');
  rect.layout = { ...rect.layout, width: 120, height: 48, widthMode: 'FIXED', heightMode: 'FIXED' };
  rect.style = style as StyleSchema;
  page.root.children.push(rect);
  return page;
}

function css(style: Partial<StyleSchema>): string {
  return scssFromPage(compilePage(rectPage(style)));
}

const withFill = (b: Partial<BorderSchema>): BorderSchema => ({ width: 2, color: '#888888', ...b }) as BorderSchema;

describe('B1 渐变描边 · CSS 出码', () => {
  it('有填充层：渐变追加为最后一层，clip/origin 按层数对齐', () => {
    const out = css({
      fills: [
        { type: 'SOLID', color: '#111111' },
        { type: 'SOLID', color: '#222222' },
      ],
      border: withFill({ fill: GRADIENT }),
    });
    // 两层填充 + 一层渐变
    expect(out).toContain('linear-gradient(#111111, #111111), linear-gradient(#222222, #222222), linear-gradient(180deg, #7c3aed 0%, #06b6d4 100%)');
    expect(out).toContain('background-clip: padding-box, padding-box, border-box');
    expect(out).toContain('background-origin: padding-box, padding-box, border-box');
    // 透明 border 让底层渐变透出（不用 border-image，保住圆角）
    expect(out).toContain('border: 2px solid transparent');
    expect(out).not.toContain('border-image');
  });

  it('无填充层但有 background-color：底色转 padding-box 层，渐变进 border-box 层', () => {
    const out = css({ background: '#0a0a0a', border: withFill({ fill: GRADIENT }) });
    expect(out).toContain('linear-gradient(#0a0a0a, #0a0a0a), linear-gradient(180deg, #7c3aed 0%, #06b6d4 100%)');
    expect(out).toContain('background-clip: padding-box, border-box');
    expect(out).not.toContain('background-color');
  });

  it('完全没有填充：补透明底，避免渐变铺满内区', () => {
    const out = css({ border: withFill({ fill: GRADIENT }) });
    expect(out).toContain('linear-gradient(transparent, transparent), linear-gradient(180deg, #7c3aed 0%, #06b6d4 100%)');
    expect(out).toContain('background-clip: padding-box, border-box');
  });

  it('SOLID 型 fill 等价于纯色描边（不产生 background 叠层）', () => {
    const out = css({ background: '#0a0a0a', border: withFill({ fill: { type: 'SOLID', color: '#ff0000' } }) });
    // SOLID fill 与 color 同义，走 color 通道：不出透明 border、不出 clip 叠层
    expect(out).toContain('border: 2px solid #ff0000');
    expect(out).not.toContain('border: 2px solid transparent');
    expect(out).not.toContain('background-clip: padding-box, border-box');
  });

  it('虚线 / 四边独立 / CENTER / OUTSIDE 退回纯色（无 CSS 叠层表达）', () => {
    const dashed = css({ border: withFill({ style: 'dashed', fill: GRADIENT }) });
    expect(dashed).toContain('border: 2px dashed #888888');
    expect(dashed).not.toContain('background-clip: padding-box, border-box');

    const sides = css({ border: withFill({ widths: [1, 2, 3, 4], fill: GRADIENT }) });
    expect(sides).toContain('border-right: 2px solid #888888');
    expect(sides).not.toContain('background-clip: padding-box, border-box');

    const center = css({ border: withFill({ align: 'CENTER', fill: GRADIENT }) });
    expect(center).toContain('outline: 1px solid #888888');
    expect(center).not.toContain('background-clip: padding-box, border-box');

    const outside = css({ border: withFill({ align: 'OUTSIDE', fill: GRADIENT }) });
    expect(outside).toContain('box-shadow: 0 0 0 2px #888888');
    expect(outside).not.toContain('background-clip: padding-box, border-box');
  });

  it('层数统计不被渐变内部逗号干扰（4 个停靠点仍算 1 层）', () => {
    const multi: FillLayer = {
      type: 'GRADIENT_LINEAR',
      angle: 45,
      stops: [
        { position: 0, color: '#ff0000' },
        { position: 0.33, color: '#00ff00' },
        { position: 0.66, color: '#0000ff' },
        { position: 1, color: '#ffffff' },
      ],
    };
    const out = css({ fills: [multi], border: withFill({ fill: GRADIENT }) });
    expect(out).toContain('background-clip: padding-box, border-box');
    expect(out).not.toContain('padding-box, padding-box');
  });
});

describe('B1 渐变描边 · AI 契约', () => {
  const pack = { colors: {}, fonts: {}, shadows: {} } as unknown as StylePack;

  function draft(border: Record<string, unknown>) {
    return {
      kind: 'page' as const,
      name: 'P',
      root: {
        name: 'root',
        kind: 'FRAME' as const,
        layout: { width: 320, height: 200 },
        children: [{ name: 'btn', kind: 'RECTANGLE' as const, layout: { width: 120, height: 40 }, style: { border } }],
      },
    };
  }

  it('gradient 落到 border.fill，color 保留为降级回退', () => {
    const r = draftToPage(draft({ width: 2, color: '#888888', gradient: { from: '#7c3aed', to: '#06b6d4', angle: 90 } }) as never, { pack });
    const rect = (r.page.root as ContainerNode).children[0];
    expect(rect.style?.border?.color).toBe('#888888');
    expect(rect.style?.border?.fill?.type).toBe('GRADIENT_LINEAR');
    expect(rect.style?.border?.fill?.stops?.map((s) => s.color)).toEqual(['#7c3aed', '#06b6d4']);
  });

  it('未知令牌记违例、不抛错，且不落 fill', () => {
    const r = draftToPage(draft({ width: 2, color: '#888888', gradient: { from: '@color.nope', to: '#06b6d4' } }) as never, { pack });
    const rect = (r.page.root as ContainerNode).children[0];
    expect(r.violations.length).toBeGreaterThan(0);
    expect(rect.style?.border?.fill).toBeUndefined();
  });
});

describe('B1 渐变描边 · .fig paint 双向', () => {
  it('FillLayer 渐变 → paint → FillLayer 互逆', () => {
    const paint = fillToPaint(GRADIENT);
    expect(paint.type).toBe('GRADIENT_LINEAR');
    const back = paintToFill(paint);
    expect(back?.type).toBe('GRADIENT_LINEAR');
    expect(back?.stops?.map((s) => s.color)).toEqual(['#7c3aed', '#06b6d4']);
    expect(back?.angle).toBe(90);
  });

  it('strokesToStyle 首层是渐变 → border.fill + color 取首停靠色', () => {
    const out = strokesToStyle([fillToPaint(GRADIENT)], 2, 'INSIDE', undefined);
    expect(out.border?.fill?.type).toBe('GRADIENT_LINEAR');
    expect(out.border?.color).toBe('#7c3aed');
  });

  it('首层纯色仍走原路径（不产生 fill 字段）', () => {
    const out = strokesToStyle([{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }], 2, 'INSIDE', undefined);
    expect(out.border?.fill).toBeUndefined();
    expect(out.border?.color.toLowerCase()).toBe('#ff0000');
  });
});

describe('B1 渐变描边 · .fig 往返', () => {
  let codec: FigCodec;
  beforeAll(async () => {
    codec = await loadFigCodec();
  });

  it('AST → .fig → AST 后 border.fill 仍在', async () => {
    const page = rectPage({ background: '#0a0a0a', borderRadius: 8, border: withFill({ fill: GRADIENT }) });
    const exported = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const reimported = importFig(exported.bytes, codec.decode);
    const rect = (reimported.pages[0].root as ContainerNode).children[0];
    expect(rect.style?.border?.width).toBe(2);
    expect(rect.style?.border?.fill?.type).toBe('GRADIENT_LINEAR');
    expect(rect.style?.border?.fill?.stops?.map((s) => s.color)).toEqual(['#7c3aed', '#06b6d4']);
  });
});
