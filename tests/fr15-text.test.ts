import { describe, expect, it } from 'vitest';
import { compilePage } from '../src/compiler';
import { applyTextCase, createApproxMeasure, effectiveLetterSpacingPx, effectiveLineHeight } from '../src/compiler/measure';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { StyleSchema, TextNode, UIPage } from '../src/schema/types';

function textPage(style?: StyleSchema, text = 'hello world'): UIPage {
  resetIdSeq(0);
  const page = createPage('t', 375, 812);
  const t = createNode('TEXT') as TextNode;
  t.id = 't';
  t.text = text;
  t.style = { fontSize: 20, ...style };
  t.layout = { mode: 'VERTICAL', widthMode: 'HUG', heightMode: 'HUG' };
  page.root.children.push(t);
  return page;
}

describe('FR-15 行高/字距单位', () => {
  it('lineHeightMode：缺省=px、AUTO=1.4×字号、PERCENT=%×字号、PIXELS=数值', () => {
    expect(effectiveLineHeight({ fontSize: 20, lineHeight: 30 })).toBe(30);
    expect(effectiveLineHeight({ fontSize: 20, lineHeight: 99, lineHeightMode: 'AUTO' })).toBe(28);
    expect(effectiveLineHeight({ fontSize: 20, lineHeight: 150, lineHeightMode: 'PERCENT' })).toBe(30);
    expect(effectiveLineHeight({ fontSize: 20, lineHeight: 33, lineHeightMode: 'PIXELS' })).toBe(33);
  });

  it('letterSpacingMode：PERCENT=字号百分比，缺省 px', () => {
    expect(effectiveLetterSpacingPx({ fontSize: 20, letterSpacing: 4 })).toBe(4);
    expect(effectiveLetterSpacingPx({ fontSize: 20, letterSpacing: 10, letterSpacingMode: 'PERCENT' })).toBe(2);
    expect(effectiveLetterSpacingPx({})).toBe(0);
  });
});

describe('FR-15 textCase 5 档', () => {
  it('UPPER/LOWER/TITLE/SMALL_CAPS(近似原样)/ORIGINAL', () => {
    expect(applyTextCase('hello world', 'UPPER')).toBe('HELLO WORLD');
    expect(applyTextCase('Hello World', 'LOWER')).toBe('hello world');
    expect(applyTextCase('hello world', 'TITLE')).toBe('Hello World');
    expect(applyTextCase('hello', 'SMALL_CAPS')).toBe('hello');
    expect(applyTextCase('Hello', 'ORIGINAL')).toBe('Hello');
    expect(applyTextCase('Hello', undefined)).toBe('Hello');
  });
});

describe('FR-15 测量（approx）', () => {
  const m = createApproxMeasure();

  it('textWrap=false：maxWidth 不折行（单行）', () => {
    const wrapped = m('aaaa bbbb cccc dddd', { fontSize: 16 }, 60);
    const nowrap = m('aaaa bbbb cccc dddd', { fontSize: 16, textWrap: false }, 60);
    expect(wrapped.lines).toBeGreaterThan(1);
    expect(nowrap.lines).toBe(1);
  });

  it('paragraphSpacing 段间加高', () => {
    const plain = m('a\nb', { fontSize: 10, lineHeight: 20 });
    const spaced = m('a\nb', { fontSize: 10, lineHeight: 20, paragraphSpacing: 30 });
    expect(plain.height).toBe(40);
    expect(spaced.height).toBe(70);
  });

  it('paragraphIndent 首行缩进计入宽度（近似全宽+indent）', () => {
    const base = m('abc', { fontSize: 10 });
    const indented = m('abc', { fontSize: 10, paragraphIndent: 12 });
    expect(indented.width).toBe(base.width + 12);
  });

  it('Truncate+maxLines：行数上限（高按上限截）', () => {
    const long = 'aaaa\nbbbb\ncccc\ndddd';
    const full = m(long, { fontSize: 10, lineHeight: 20 });
    const cut = m(long, { fontSize: 10, lineHeight: 20, textTruncation: 'ENDING', maxLines: 2 });
    expect(full.lines).toBe(4);
    expect(cut.lines).toBe(2);
    expect(cut.height).toBe(40);
  });

  it('textCase 参与测量（UPPER 影响字宽）', () => {
    const lower = m('www', { fontSize: 16 });
    const upper = m('www', { fontSize: 16, textCase: 'UPPER' });
    expect(upper.width).toBeGreaterThan(lower.width);
  });

  it('letterSpacing PERCENT 参与测量', () => {
    const base = m('abcd', { fontSize: 16 });
    const spaced = m('abcd', { fontSize: 16, letterSpacing: 50, letterSpacingMode: 'PERCENT' });
    expect(spaced.width).toBeGreaterThan(base.width);
  });
});

describe('FR-15 出码（compile）', () => {
  it('行高：缺省 px / PERCENT 单位less / AUTO 不输出', () => {
    const a = compilePage(textPage({ lineHeight: 30 })).nodes.find((n) => n.id === 't')!;
    expect(a.css['line-height']).toBe('30px');
    const b = compilePage(textPage({ lineHeight: 150, lineHeightMode: 'PERCENT' })).nodes.find((n) => n.id === 't')!;
    expect(b.css['line-height']).toBe('1.5');
    const c = compilePage(textPage({ lineHeight: 99, lineHeightMode: 'AUTO' })).nodes.find((n) => n.id === 't')!;
    expect(c.css['line-height']).toBeUndefined();
  });

  it('字距：px 直出、PERCENT 换算 em', () => {
    const a = compilePage(textPage({ letterSpacing: 2 })).nodes.find((n) => n.id === 't')!;
    expect(a.css['letter-spacing']).toBe('2px');
    const b = compilePage(textPage({ letterSpacing: 10, letterSpacingMode: 'PERCENT' })).nodes.find((n) => n.id === 't')!;
    expect(b.css['letter-spacing']).toBe('0.1em');
  });

  it('text-align justify 与 text-indent', () => {
    const css = compilePage(textPage({ textAlign: 'justify', paragraphIndent: 24 })).nodes.find((n) => n.id === 't')!;
    expect(css.css['text-align']).toBe('justify');
    expect(css.css['text-indent']).toBe('24px');
  });

  it('textWrap=false → white-space:pre', () => {
    const css = compilePage(textPage({ textWrap: false })).nodes.find((n) => n.id === 't')!;
    expect(css.css['white-space']).toBe('pre');
    const on = compilePage(textPage({})).nodes.find((n) => n.id === 't')!;
    expect(on.css['white-space']).toBe('pre-wrap');
  });

  it('textCase 5 档映射 CSS text-transform', () => {
    const map: [NonNullable<StyleSchema['textCase']>, string][] = [
      ['UPPER', 'uppercase'],
      ['LOWER', 'lowercase'],
      ['TITLE', 'capitalize'],
      ['SMALL_CAPS', 'small-caps'],
    ];
    for (const [c, expected] of map) {
      const css = compilePage(textPage({ textCase: c })).nodes.find((n) => n.id === 't')!;
      expect(css.css['text-transform']).toBe(expected);
    }
    const orig = compilePage(textPage({ textCase: 'ORIGINAL' })).nodes.find((n) => n.id === 't')!;
    expect(orig.css['text-transform']).toBeUndefined();
  });

  it('textDecoration 下划线/删除线', () => {
    const u = compilePage(textPage({ textDecoration: 'UNDERLINE' })).nodes.find((n) => n.id === 't')!;
    expect(u.css['text-decoration']).toBe('underline');
    const s = compilePage(textPage({ textDecoration: 'STRIKETHROUGH' })).nodes.find((n) => n.id === 't')!;
    expect(s.css['text-decoration']).toBe('line-through');
  });

  it('Truncate+maxLines → line-clamp 块', () => {
    const css = compilePage(textPage({ textTruncation: 'ENDING', maxLines: 3 })).nodes.find((n) => n.id === 't')!;
    expect(css.css['display']).toBe('-webkit-box');
    expect(css.css['-webkit-line-clamp']).toBe('3');
    expect(css.css['overflow']).toBe('hidden');
    expect(css.css['text-overflow']).toBe('ellipsis');
  });

  it('OpenType：liga/dlig feature-settings、kern font-kerning', () => {
    const css = compilePage(textPage({ openType: { liga: false, dlig: true, kern: false } })).nodes.find((n) => n.id === 't')!;
    expect(css.css['font-feature-settings']).toBe('"liga" 0, "dlig" 1');
    expect(css.css['font-kerning']).toBe('none');
  });

  it('textAlignVertical 定高文本 → flex 纵向居中/底部', () => {
    const page = textPage({ textAlignVertical: 'CENTER' });
    const t = page.root.children[0];
    t.layout = { ...t.layout, widthMode: 'FIXED', width: 200, heightMode: 'FIXED', height: 80 };
    const css = compilePage(page).nodes.find((n) => n.id === 't')!;
    expect(css.css['display']).toBe('flex');
    expect(css.css['justify-content']).toBe('center');
    const page2 = textPage({ textAlignVertical: 'BOTTOM' });
    page2.root.children[0].layout = { ...page2.root.children[0].layout, widthMode: 'FIXED', width: 200, heightMode: 'FIXED', height: 80 };
    const css2 = compilePage(page2).nodes.find((n) => n.id === 't')!;
    expect(css2.css['justify-content']).toBe('flex-end');
  });
});

describe('FR-15 字段 JSON 往返', () => {
  it('全字段序列化保留', () => {
    const style: StyleSchema = {
      fontSize: 18,
      lineHeight: 150,
      lineHeightMode: 'PERCENT',
      letterSpacing: 5,
      letterSpacingMode: 'PERCENT',
      textAlign: 'justify',
      textAlignVertical: 'CENTER',
      paragraphSpacing: 8,
      paragraphIndent: 16,
      textWrap: false,
      textTruncation: 'ENDING',
      maxLines: 4,
      textCase: 'TITLE',
      textDecoration: 'UNDERLINE',
      openType: { liga: true, kern: false, dlig: false },
    };
    const back = JSON.parse(JSON.stringify(style)) as StyleSchema;
    expect(back).toMatchObject(style);
  });
});
