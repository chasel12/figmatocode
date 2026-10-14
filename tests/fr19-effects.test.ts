import { describe, expect, it } from 'vitest';
import type { Effect, StyleSchema, UINode, UIPage } from '../src/schema/types';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { compilePage, scssFromPage } from '../src/compiler';
import { generateHtml, generateReferenceHtml } from '../src/generator';

resetIdSeq(700);

function styledNode(kind: 'RECTANGLE' | 'FRAME', style: StyleSchema): UINode {
  const n = createNode(kind);
  n.style = style;
  return n;
}

function pageWith(node: UINode): UIPage {
  const page = createPage('FR-19');
  (page.root as { children: UINode[] }).children.push(node);
  return page;
}

function cssOf(style: StyleSchema): string {
  return scssFromPage(compilePage(pageWith(styledNode('RECTANGLE', style))));
}

describe('FR-19 Effects 8 类出码', () => {
  it('DROP_SHADOW + INNER_SHADOW → box-shadow 合并（inset 前缀），数组序=渲染序', () => {
    const css = cssOf({
      effects: [
        { kind: 'DROP_SHADOW', x: 0, y: 4, blur: 12, spread: 2, color: 'rgba(0,0,0,0.2)' },
        { kind: 'INNER_SHADOW', x: 0, y: 2, blur: 4, color: 'rgba(0,0,0,0.4)' },
      ],
    });
    expect(css).toContain('box-shadow: 0px 4px 12px 2px rgba(0,0,0,0.2), inset 0px 2px 4px 0px rgba(0,0,0,0.4)');
  });

  it('LAYER_BLUR → filter:blur；BACKGROUND_BLUR → backdrop-filter', () => {
    const css = cssOf({ effects: [{ kind: 'LAYER_BLUR', radius: 6 }] });
    expect(css).toContain('filter: blur(6px)');
    const css2 = cssOf({ effects: [{ kind: 'BACKGROUND_BLUR', radius: 20 }] });
    expect(css2).toContain('backdrop-filter: blur(20px)');
  });

  it('PROGRESSIVE_BLUR → 起始与主半径均值近似（CSS 无原生）', () => {
    const css = cssOf({ effects: [{ kind: 'PROGRESSIVE_BLUR', radius: 24, startRadius: 0 }] });
    expect(css).toContain('backdrop-filter: blur(12px)');
  });

  it('GLASS → 链式近似（blur+saturate+brightness）', () => {
    const css = cssOf({ effects: [{ kind: 'GLASS', depth: 8, refraction: 12, saturation: 150, highlight: 20 }] });
    expect(css).toContain('backdrop-filter: blur(');
    expect(css).toContain('saturate(150%)');
    expect(css).toContain('brightness(110%)');
  });

  it('NOISE/TEXTURE → url(#fx-noise-<id>) 且 html/reference 注入带参数 SVG defs', () => {
    const node = styledNode('RECTANGLE', { effects: [{ kind: 'NOISE', radius: 4, density: 3, opacity: 0.4 }] });
    const page = pageWith(node);
    const compiled = compilePage(page);
    const css = scssFromPage(compiled);
    expect(css).toContain(`url(#fx-noise-${node.id})`);
    const html = generateHtml(page, compiled);
    expect(html).toContain(`id="fx-noise-${node.id}"`);
    expect(html).toContain('feTurbulence');
    expect(html).toContain('baseFrequency="0.250"');
    expect(html).toContain('numOctaves="3"');
    expect(html).toContain('slope="0.40"');
    const ref = generateReferenceHtml(page, compiled, { page: { x: 0, y: 0, width: 375, height: 812 } });
    expect(ref).toContain(`id="fx-noise-${node.id}"`);
  });

  it('visible=false 的效果被排除；blendMode → mix-blend-mode', () => {
    const css = cssOf({
      effects: [
        { kind: 'DROP_SHADOW', x: 0, y: 4, blur: 8 },
        { kind: 'LAYER_BLUR', radius: 6, visible: false },
      ],
      blendMode: 'MULTIPLY',
    });
    expect(css).toContain('box-shadow');
    expect(css).not.toContain('blur(');
    expect(css).toContain('mix-blend-mode: multiply');
    expect(cssOf({ blendMode: 'NORMAL' })).not.toContain('mix-blend-mode');
  });

  it('旧 boxShadow 兼容：无 effects 走旧字段；有 effects 不叠加；OUTSIDE 描边与效果并存', () => {
    expect(cssOf({ boxShadow: '0 4 12 rgba(0,0,0,0.15)' })).toContain('box-shadow: 0 4 12 rgba(0,0,0,0.15)');
    expect(cssOf({ boxShadow: '0 4 12 rgba(0,0,0,0.15)', effects: [{ kind: 'DROP_SHADOW', x: 1, y: 1, blur: 1, color: '#000000' }] })).not.toContain('0 4 12');
    const css = cssOf({ border: { width: 2, color: '#ff0000', align: 'OUTSIDE' }, effects: [{ kind: 'DROP_SHADOW', x: 0, y: 4, blur: 8, color: '#000000' }] });
    expect(css).toContain('0 0 0 2px #ff0000');
    expect(css).toContain('0px 4px 8px 0px #000000');
    expect(css).toContain('0 0 0 2px #ff0000, 0px 4px 8px 0px #000000');
  });

  it('JSON 往返保序与参数；旧项目无 effects 字段', () => {
    const effects: Effect[] = [
      { kind: 'DROP_SHADOW', x: 2, y: 2, blur: 4 },
      { kind: 'BACKGROUND_BLUR', radius: 12 },
    ];
    const json = JSON.parse(JSON.stringify({ effects })) as { effects: Effect[] };
    expect(json.effects.map((e) => e.kind)).toEqual(['DROP_SHADOW', 'BACKGROUND_BLUR']);
    expect(json.effects[0].x).toBe(2);
    const legacy = JSON.parse(JSON.stringify({ boxShadow: '0 1 2 #000' })) as StyleSchema;
    expect(legacy.effects).toBeUndefined();
  });
});
