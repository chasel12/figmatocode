/**
 * B1 · 装饰层（`docs/decorations-rfc.md`）
 *
 * 锁四件事：
 * 1. **三通道各自正确**：背景层 prepend 到首位（在 fills/grids 之上）、filter 前置、clip-path 仲裁；
 * 2. **自包含**：产物里不得出现 `url(#…)`（跨文档引用）与 `::before/::after`（层级不一致）；
 * 3. **强度/参数可调**：intensity 进 alpha，at/stop/cut 生效；
 * 4. **AI 契约**：`decorations` 走 applyColor，未知令牌记违例；MESH 无色斑时丢弃空壳。
 */
import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { ContainerNode, DecorationSpec, StyleSchema } from '../src/schema/types';
import { compilePage, scssFromPage } from '../src/compiler';
import { draftToPage } from '../src/editor/ai/specToPage';
import type { StylePack } from '../src/tokens/packs/types';

resetIdSeq(1500);

function rectPage(style: Partial<StyleSchema>) {
  const page = createPage('B1 装饰');
  const rect = createNode('RECTANGLE');
  rect.layout = { ...rect.layout, width: 200, height: 120, widthMode: 'FIXED', heightMode: 'FIXED' };
  rect.style = style as StyleSchema;
  page.root.children.push(rect);
  return page;
}

function css(style: Partial<StyleSchema>): string {
  return scssFromPage(compilePage(rectPage(style)));
}

const deco = (d: Partial<DecorationSpec> & { kind: DecorationSpec['kind'] }): Partial<StyleSchema> => ({
  decorations: [d as DecorationSpec],
});

describe('B1 装饰 · SPOTLIGHT / VIGNETTE', () => {
  it('SPOTLIGHT 缺省：椭圆径向 + 光源在顶部画布外', () => {
    const out = css(deco({ kind: 'SPOTLIGHT' }));
    expect(out).toContain('radial-gradient(ellipse at 50% -20%, #FFFFFF 0%, transparent 65%)');
  });

  it('SPOTLIGHT 强度进 alpha，at/stop 生效', () => {
    const out = css(deco({ kind: 'SPOTLIGHT', color: '#000000', intensity: 0.3, at: { x: 20, y: 110 }, stop: { from: 10, to: 40 } }));
    expect(out).toContain('radial-gradient(ellipse at 20% 110%, rgba(0, 0, 0, 0.3) 10%, transparent 40%)');
  });

  it('VIGNETTE 缺省：中心透明 → 边缘压暗', () => {
    const out = css(deco({ kind: 'VIGNETTE' }));
    // 0.55 = 缺省强度上限（避免暗角过重）
    expect(out).toContain('radial-gradient(ellipse at center, transparent 45%, rgba(0, 0, 0, 0.55) 100%)');
  });

  it('装饰层排在 fills 与 layoutGrids 之前（首位 = 最上层）', () => {
    const out = css({
      fills: [{ type: 'SOLID', color: '#111111' }],
      layoutGrids: [{ pattern: 'GRID', sectionSize: 8, color: 'rgba(255,0,0,0.1)' }],
      ...deco({ kind: 'SPOTLIGHT' }),
    });
    const bg = /background-image: ([^;]+);/.exec(out)?.[1] ?? '';
    expect(bg.startsWith('radial-gradient(ellipse at 50% -20%')).toBe(true);
    expect(bg).toContain('#111111');
    expect(bg).toContain('repeating-linear-gradient');
  });
});

describe('B1 装饰 · MESH_GRADIENT', () => {
  it('每个色斑一条 radial，按数组序叠层', () => {
    const out = css(
      deco({
        kind: 'MESH_GRADIENT',
        points: [
          { x: 10, y: 20, radius: 60, color: '#ff0000' },
          { x: 80, y: 70, radius: 50, color: '#00ff00' },
        ],
      }),
    );
    const bg = /background-image: ([^;]+);/.exec(out)?.[1] ?? '';
    expect(bg).toBe('radial-gradient(circle at 10% 20%, #ff0000 0%, transparent 60%), radial-gradient(circle at 80% 70%, #00ff00 0%, transparent 50%)');
  });

  it('无色斑 → 不出 background-image', () => {
    const out = css(deco({ kind: 'MESH_GRADIENT' }));
    expect(out).not.toContain('background-image');
  });
});

describe('B1 装饰 · DUOTONE', () => {
  it('滤镜链前置（先调色再模糊），色相由主色换算', () => {
    const out = css({ ...deco({ kind: 'DUOTONE', color: '#ff0000' }), effects: [{ kind: 'LAYER_BLUR', radius: 4 }] });
    const f = /filter: ([^;]+);/.exec(out)?.[1] ?? '';
    expect(f.startsWith('grayscale(1) sepia(1) hue-rotate(0deg)')).toBe(true);
    expect(f).toContain('blur(4px)');
  });
});

describe('B1 装饰 · DIAGONAL_CUT', () => {
  it('单值切角：四角各出两点，用 calc 表达右/下边', () => {
    const out = css(deco({ kind: 'DIAGONAL_CUT', cut: 10 }));
    expect(out).toContain(
      'clip-path: polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))',
    );
  });

  it('四角独立：0 表示该角不切', () => {
    const out = css(deco({ kind: 'DIAGONAL_CUT', cut: [0, 8, 0, 8] }));
    expect(out).toContain('clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))');
  });

  it('SVG 通道形状（POLYGON/STAR/VECTOR）不参与装饰出码（外观全在 <svg> 内）', () => {
    const page = createPage('B1 装饰·形状');
    const poly = createNode('POLYGON');
    poly.layout = { ...poly.layout, width: 120, height: 120, widthMode: 'FIXED', heightMode: 'FIXED' };
    poly.style = { pointCount: 5, ...deco({ kind: 'DIAGONAL_CUT', cut: 10 }) } as StyleSchema;
    page.root.children.push(poly);
    const out = scssFromPage(compilePage(page));
    expect(out).not.toContain('calc(100% - 10px)');
  });
});

describe('B1 装饰 · 自包含约束（RFC §2）', () => {
  it('所有装饰都不产生 url(#…) 与伪元素', () => {
    const all: DecorationSpec['kind'][] = ['SPOTLIGHT', 'VIGNETTE', 'DIAGONAL_CUT', 'DUOTONE'];
    for (const kind of all) {
      const out = css(deco({ kind }));
      expect(out, kind).not.toContain('url(#');
      expect(out, kind).not.toContain('::before');
      expect(out, kind).not.toContain('::after');
    }
  });

  it('visible:false 的装饰不参与出码', () => {
    const out = css({ decorations: [{ kind: 'SPOTLIGHT', visible: false }] });
    expect(out).not.toContain('radial-gradient');
  });
});

describe('B1 装饰 · .fig 往返（旁挂层保住，不再降级）', () => {
  it('装饰经 meta.json 旁挂层原样往返，其余样式不受影响', async () => {
    const { exportFig } = await import('../src/fig/export');
    const { importFig } = await import('../src/fig/import');
    const { loadFigCodec } = await import('../src/fig/codec');
    const codec = await loadFigCodec();
    const page = rectPage({ background: '#0a0a0a', borderRadius: 8, ...deco({ kind: 'SPOTLIGHT' }) });
    const exported = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const back = importFig(exported.bytes, codec.decode);
    const rect = (back.pages[0].root as ContainerNode).children[0];
    /**
     * 这条原先断言「装饰丢失」—— 那是 `KNOWN_LOSS` 时代的事实。
     * 现在走 `meta.json` 的 `ui_compiler_extras` 旁挂层，**必须原样回来**：
     * Figma 不读这一层，所以既不污染 Figma 文件，也不牺牲我们自己的往返。
     */
    expect(rect.style?.decorations?.[0]?.kind).toBe('SPOTLIGHT');
    // 其余样式原样往返
    expect(rect.style?.borderRadius).toBe(8);
    expect(rect.style?.background?.toLowerCase()).toBe('#0a0a0a');
  });
});

describe('B1 装饰 · AI 契约', () => {
  const pack = { colors: {}, fonts: {}, shadows: {} } as unknown as StylePack;

  function draft(style: Record<string, unknown>) {
    return {
      kind: 'page' as const,
      name: 'P',
      root: {
        kind: 'FRAME' as const,
        layout: { width: 320, height: 200 },
        children: [{ name: 'card', kind: 'RECTANGLE' as const, layout: { width: 200, height: 120 }, style }],
      },
    };
  }

  it('decorations 透传到 StyleSchema', () => {
    const r = draftToPage(
      draft({ decorations: [{ kind: 'SPOTLIGHT', intensity: 0.4, color: '#ffffff', at: { x: 30, y: -10 } }] }) as never,
      { pack },
    );
    const rect = (r.page.root as ContainerNode).children[0];
    expect(rect.style?.decorations?.[0]).toMatchObject({ kind: 'SPOTLIGHT', intensity: 0.4, color: '#ffffff', at: { x: 30, y: -10 } });
  });

  it('未知令牌记违例，且该装饰不落 color', () => {
    const r = draftToPage(draft({ decorations: [{ kind: 'VIGNETTE', color: '@color.nope' }] }) as never, { pack });
    const rect = (r.page.root as ContainerNode).children[0];
    expect(r.violations.length).toBeGreaterThan(0);
    expect(rect.style?.decorations?.[0]?.color).toBeUndefined();
    expect(rect.style?.decorations?.[0]?.kind).toBe('VIGNETTE');
  });

  it('MESH 无色斑时整条丢弃（不留空壳）', () => {
    const r = draftToPage(draft({ decorations: [{ kind: 'MESH_GRADIENT' }] }) as never, { pack });
    const rect = (r.page.root as ContainerNode).children[0];
    expect(rect.style?.decorations).toBeUndefined();
  });
});
