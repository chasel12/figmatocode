import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { compilePage } from '../src/compiler';
import { BLEND_MODES, isContainer, type ContainerNode, type LayoutSchema, type StyleSchema, type UINode } from '../src/schema/types';

resetIdSeq(0);

/** 构造：root(FIXED) → parent(FIXED) → child，编译后取 css */
function cssOfChild(child: UINode, parentPatch?: Partial<LayoutSchema>, parentStyle?: StyleSchema) {
  const page = createPage('fr47', 800, 600);
  page.root.layout = { ...page.root.layout, mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 800, height: 600 };
  const parent = createNode('FRAME');
  parent.layout = {
    ...parent.layout,
    mode: 'VERTICAL',
    widthMode: 'FIXED',
    heightMode: 'FIXED',
    width: 400,
    height: 300,
    ...parentPatch,
  };
  if (parentStyle) parent.style = { ...(parent.style ?? {}), ...parentStyle };
  (parent as ContainerNode).children.push(child);
  page.root.children.push(parent);
  const compiled = compilePage(page);
  return {
    parent: compiled.nodes.find((n) => n.id === parent.id)!.css,
    css: compiled.nodes.find((n) => n.id === child.id)!.css,
    page,
    parent_: parent,
  };
}

describe('FR-47 A：Auto Layout→display:flex 全参数', () => {
  it('gap 正值→gap px；负 gap→父不出 gap、次子主轴负 margin', () => {
    const kid = createNode('FRAME');
    kid.layout = { ...kid.layout, widthMode: 'FIXED', heightMode: 'FIXED', width: 50, height: 50 } as LayoutSchema;
    const pos = cssOfChild(kid, { gap: 12 });
    expect(pos.parent['display']).toBe('flex');
    expect(pos.parent['gap']).toBe('12px');

    const kid2 = createNode('FRAME');
    kid2.layout = { ...kid2.layout, widthMode: 'FIXED', heightMode: 'FIXED', width: 50, height: 50 } as LayoutSchema;
    // 双子场景：首子不加负 margin，次子加
    const page = createPage('fr47neg', 800, 600);
    page.root.layout = { ...page.root.layout, mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 800, height: 600 };
    const parent = createNode('FRAME');
    parent.layout = { ...parent.layout, mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 400, height: 300, gap: -6 };
    (parent as ContainerNode).children.push(kid, kid2);
    page.root.children.push(parent);
    const compiled = compilePage(page);
    const pCss = compiled.nodes.find((n) => n.id === parent.id)!.css;
    expect(pCss['gap']).toBeUndefined();
    const aCss = compiled.nodes.find((n) => n.id === kid.id)!.css;
    const bCss = compiled.nodes.find((n) => n.id === kid2.id)!.css;
    expect(aCss['margin']).toBeUndefined(); // 首子不加
    expect(String(bCss['margin'])).toContain('-6px'); // 次子主轴负 margin
  });

  it('wrap→flex-wrap:wrap + 双轴 gap', () => {
    const kid = createNode('FRAME');
    const { parent } = cssOfChild(kid, { wrap: 'WRAP', gap: 20, gapCross: 8 });
    expect(parent['flex-wrap']).toBe('wrap');
    expect(parent['gap']).toBe('20px 8px');
  });

  it('justify→justify-content（含 space-between）', () => {
    const kid = createNode('FRAME');
    expect(cssOfChild(kid, { justify: 'SPACE_BETWEEN' }).parent['justify-content']).toBe('space-between');
    expect(cssOfChild(kid, { justify: 'CENTER' }).parent['justify-content']).toBe('center');
  });

  it('align→align-items（含 baseline / stretch）', () => {
    expect(cssOfChild(createNode('FRAME'), { align: 'BASELINE' }).parent['align-items']).toBe('baseline');
    expect(cssOfChild(createNode('FRAME'), { align: 'STRETCH' }).parent['align-items']).toBe('stretch');
    expect(cssOfChild(createNode('FRAME'), { align: 'CENTER' }).parent['align-items']).toBe('center');
  });

  it('FILL 主轴→flex:1 1 0 + min 基数归零；HUG→flex:0 0 auto + fit-content', () => {
    const fillKid = createNode('FRAME');
    fillKid.layout = { ...fillKid.layout, mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'FIXED', height: 40 } as LayoutSchema;
    const f = cssOfChild(fillKid, { mode: 'HORIZONTAL' });
    expect(f.css['flex']).toBe('1 1 0');
    expect(f.css['min-width']).toBe('0');

    const hugKid = createNode('FRAME');
    hugKid.layout = { ...hugKid.layout, mode: 'VERTICAL', widthMode: 'HUG', heightMode: 'HUG' } as LayoutSchema;
    const h = cssOfChild(hugKid);
    expect(h.css['flex']).toBe('0 0 auto');
    expect(h.css['width']).toBe('fit-content');
    expect(h.css['height']).toBe('fit-content');
  });

  it('min/max→min-width/height + max-width/height', () => {
    const kid = createNode('FRAME');
    kid.layout = { ...kid.layout, widthMode: 'FIXED', heightMode: 'FIXED', width: 50, height: 50, minWidth: 30, maxWidth: 200, minHeight: 20, maxHeight: 120 } as LayoutSchema;
    const { css } = cssOfChild(kid);
    expect(css['min-width']).toBe('30px');
    expect(css['max-width']).toBe('200px');
    expect(css['min-height']).toBe('20px');
    expect(css['max-height']).toBe('120px');
  });

  it('padding→padding（四值不等序 top right bottom left）', () => {
    const kid = createNode('FRAME');
    const { parent } = cssOfChild(kid, { padding: [1, 2, 3, 4] });
    expect(parent['padding']).toBe('1px 2px 3px 4px');
  });

  it('FIXED sizing→显式 px', () => {
    const kid = createNode('FRAME');
    kid.layout = { ...kid.layout, widthMode: 'FIXED', heightMode: 'FIXED', width: 123, height: 45 } as LayoutSchema;
    const { css } = cssOfChild(kid);
    expect(css['width']).toBe('123px');
    expect(css['height']).toBe('45px');
  });
});

describe('FR-47 D/E/F：Stroke 三对齐 + 四边独立 + 圆角', () => {
  function borderCss(align: 'INSIDE' | 'CENTER' | 'OUTSIDE') {
    const kid = createNode('RECTANGLE');
    kid.style = { ...(kid.style ?? {}), border: { width: 4, color: '#000000', style: 'solid', align } };
    return cssOfChild(kid).css;
  }

  it('INSIDE→border + box-sizing:border-box', () => {
    const css = borderCss('INSIDE');
    expect(css['border']).toContain('4px');
    expect(css['box-sizing']).toBe('border-box');
  });

  it('CENTER→border 半宽 + outline 外半', () => {
    const css = borderCss('CENTER');
    expect(css['border']).toContain('2px');
    expect(css['outline']).toContain('2px');
  });

  it('OUTSIDE→box-shadow 外扩（不占盒）', () => {
    const css = borderCss('OUTSIDE');
    expect(css['box-shadow']).toContain('0 0 0 4px');
  });

  it('四边独立 widths→各边 border（Edge Case 10：与圆角组合近似）', () => {
    const kid = createNode('RECTANGLE');
    kid.style = {
      ...(kid.style ?? {}),
      border: { width: 1, color: '#111111', style: 'solid', widths: [1, 2, 3, 4] },
      borderRadius: 8,
    };
    const css = cssOfChild(kid).css;
    expect(css['border-top']).toContain('1px');
    expect(css['border-right']).toContain('2px');
    expect(css['border-bottom']).toContain('3px');
    expect(css['border-left']).toContain('4px');
    expect(css['border-radius']).toBe('8px');
  });

  it('四角独立 radius→border-radius 四值 TL TR BR BL；百分比透传', () => {
    const kid = createNode('RECTANGLE');
    kid.style = { ...(kid.style ?? {}), borderRadius: [1, 2, 3, 4] };
    expect(cssOfChild(kid).css['border-radius']).toBe('1px 2px 3px 4px');
    const pct = createNode('RECTANGLE');
    pct.style = { ...(pct.style ?? {}), borderRadius: [10, 20, 30, 40] };
    const c2 = cssOfChild(pct).css;
    expect(c2['border-radius']).toBe('10px 20px 30px 40px');
  });
});

describe('FR-47 G：Effects→box-shadow / filter / backdrop-filter', () => {
  it('DROP_SHADOW 多层含 spread→box-shadow；INNER→inset', () => {
    const kid = createNode('RECTANGLE');
    kid.style = {
      ...(kid.style ?? {}),
      effects: [
        { kind: 'DROP_SHADOW', x: 0, y: 2, blur: 4, spread: 1, color: '#000000', opacity: 0.5 },
        { kind: 'INNER_SHADOW', x: 1, y: 1, blur: 2, spread: 0, color: '#ffffff', opacity: 1 },
      ],
    };
    const shadow = cssOfChild(kid).css['box-shadow'];
    expect(shadow).toContain('0px 2px');
    expect(shadow).toContain('1px'); // spread
    expect(shadow).toContain('inset');
  });

  it('LAYER_BLUR→filter:blur；BACKGROUND_BLUR→backdrop-filter', () => {
    const kid = createNode('RECTANGLE');
    kid.style = { ...(kid.style ?? {}), effects: [{ kind: 'LAYER_BLUR', radius: 6 }] };
    expect(cssOfChild(kid).css['filter']).toContain('blur(6px)');
    const kid2 = createNode('RECTANGLE');
    kid2.style = { ...(kid2.style ?? {}), effects: [{ kind: 'BACKGROUND_BLUR', radius: 10 }] };
    expect(cssOfChild(kid2).css['backdrop-filter']).toContain('blur(10px)');
  });

  it('NOISE/TEXTURE→SVG filter url 引用', () => {
    const kid = createNode('RECTANGLE');
    kid.style = { ...(kid.style ?? {}), effects: [{ kind: 'NOISE', radius: 8, density: 3 }] };
    expect(cssOfChild(kid).css['filter']).toContain('url(#fx-noise-');
    const kid2 = createNode('RECTANGLE');
    kid2.style = { ...(kid2.style ?? {}), effects: [{ kind: 'TEXTURE', radius: 4, density: 2 }] };
    expect(cssOfChild(kid2).css['filter']).toContain('url(#fx-texture-');
  });
});

describe('FR-47 H：Fill 4 型渐变', () => {
  function fillCss(f: NonNullable<StyleSchema['fills']>[number]) {
    const kid = createNode('RECTANGLE');
    kid.style = { ...(kid.style ?? {}), fills: [f] };
    return cssOfChild(kid).css;
  }
  const stops = [
    { position: 0, color: '#ff0000', opacity: 1 },
    { position: 1, color: '#0000ff', opacity: 0.4 },
  ];

  it('LINEAR→linear-gradient(角度+90 换算) + stop 含透明度', () => {
    const bg = fillCss({ type: 'GRADIENT_LINEAR', angle: 0, stops })['background-image'];
    expect(bg).toContain('linear-gradient(90deg'); // Figma 0=东→CSS 90
    expect(bg).toContain('#ff0000 0%');
    expect(bg).toContain('rgba(0, 0, 255, 0.4) 100%');
  });

  it('RADIAL→radial-gradient；ANGULAR→conic-gradient(from 角度)', () => {
    expect(fillCss({ type: 'GRADIENT_RADIAL', stops })['background-image']).toContain('radial-gradient(');
    expect(fillCss({ type: 'GRADIENT_ANGULAR', angle: 90, stops })['background-image']).toContain('conic-gradient(from 180deg');
  });

  it('DIAMOND→线性近似（无原生 CSS——对照矩阵实测口径）', () => {
    expect(fillCss({ type: 'GRADIENT_DIAMOND', angle: 45, stops })['background-image']).toContain('linear-gradient(135deg');
  });

  it('SOLID fills→background-image 纯色层', () => {
    expect(fillCss({ type: 'SOLID', color: '#123456' })['background-image']).toContain('#123456');
  });
});

describe('FR-47 I/J：blend mode 与 opacity', () => {
  it('非 NORMAL blend→mix-blend-mode（16 核心集逐个映射 lowercase-hyphen）', () => {
    expect(BLEND_MODES.length).toBeGreaterThanOrEqual(16);
    for (const mode of BLEND_MODES.filter((m) => m !== 'NORMAL')) {
      const kid = createNode('RECTANGLE');
      kid.style = { ...(kid.style ?? {}), blendMode: mode };
      const css = cssOfChild(kid).css;
      expect(css['mix-blend-mode'], mode).toBe(mode.toLowerCase().replace(/_/g, '-'));
    }
  });

  it('opacity<1→opacity（0-1 字符串）', () => {
    const kid = createNode('RECTANGLE');
    kid.style = { ...(kid.style ?? {}), opacity: 0.35 };
    expect(cssOfChild(kid).css['opacity']).toBe('0.35');
    const kid2 = createNode('RECTANGLE');
    kid2.style = { ...(kid2.style ?? {}), opacity: 1 };
    expect(cssOfChild(kid2).css['opacity']).toBeUndefined();
  });
});

describe('FR-47 K：Constraints→定位（4 档×2 轴出码）', () => {
  function absKid(constraints: NonNullable<LayoutSchema['constraints']>) {
    const kid = createNode('RECTANGLE');
    kid.layout = {
      ...kid.layout,
      mode: 'ABSOLUTE',
      x: 40,
      y: 30,
      widthMode: 'FIXED',
      heightMode: 'FIXED',
      width: 100,
      height: 50,
      constraints,
    } as LayoutSchema;
    return cssOfChild(kid).css; // parent 400×300
  }

  it('LEFT/TOP（缺省）→left/top px', () => {
    const css = absKid({ horizontal: 'LEFT', vertical: 'TOP' });
    expect(css['position']).toBe('absolute');
    expect(css['left']).toBe('40px');
    expect(css['top']).toBe('30px');
  });

  it('RIGHT/BOTTOM→right/bottom 边距（父-位置-尺寸）', () => {
    const css = absKid({ horizontal: 'RIGHT', vertical: 'BOTTOM' });
    expect(css['right']).toBe(`${400 - 40 - 100}px`); // 260px
    expect(css['bottom']).toBe(`${300 - 30 - 50}px`); // 220px
    expect(css['left']).toBeUndefined();
    expect(css['top']).toBeUndefined();
  });

  it('CENTER→相对父中心 calc 偏移', () => {
    const css = absKid({ horizontal: 'CENTER', vertical: 'CENTER' });
    expect(String(css['left'])).toContain('calc(50%');
    expect(String(css['left'])).toContain('-160px'); // Δ=40-200
    expect(String(css['top'])).toContain('calc(50%');
  });

  it('SCALE→百分比 left/top + 百分比宽高', () => {
    const css = absKid({ horizontal: 'SCALE', vertical: 'SCALE' });
    expect(css['left']).toBe('10%'); // 40/400
    expect(css['top']).toBe('10%'); // 30/300
    expect(css['width']).toBe('25%'); // 100/400
    expect(css['height']).toBe(`${Math.round((50 / 300) * 10000) / 100}%`);
  });

  it('组合：RIGHT+TOP 混合各自出码', () => {
    const css = absKid({ horizontal: 'RIGHT', vertical: 'TOP' });
    expect(css['right']).toBe('260px');
    expect(css['top']).toBe('30px');
  });
});

describe('FR-47 L：图片映射（7 调整归 FR-20 余项——本表锁定 scaleMode）', () => {
  function imgCss(scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE') {
    const kid = createNode('IMAGE');
    kid.style = { ...(kid.style ?? {}), imageScaleMode: scaleMode };
    (kid as { src?: string }).src = 'x.png';
    return cssOfChild(kid).css;
  }

  it('FILL/CROP→cover；FIT→contain；TILE→不设 object-fit（背景平铺）', () => {
    expect(imgCss('FILL')['object-fit']).toBe('cover');
    expect(imgCss('CROP')['object-fit']).toBe('cover');
    expect(imgCss('FIT')['object-fit']).toBe('contain');
    expect(imgCss('TILE')['object-fit']).toBeUndefined();
  });
});

describe('FR-47 M/N/O/P：文字与文本盒', () => {
  function textCss(patch: StyleSchema, layoutPatch?: Partial<LayoutSchema>) {
    const t = createNode('TEXT');
    t.style = { ...(t.style ?? {}), ...patch };
    if (layoutPatch) t.layout = { ...t.layout, ...layoutPatch } as LayoutSchema;
    return cssOfChild(t).css;
  }

  it('line-height PIXELS→Npx；PERCENT→单位less 倍数；AUTO→不输出（字体度量口径报备）', () => {
    expect(textCss({ lineHeightMode: 'PIXELS', lineHeight: 24 })['line-height']).toBe('24px');
    expect(textCss({ lineHeightMode: 'PERCENT', lineHeight: 150 })['line-height']).toBe('1.5');
    expect(textCss({ lineHeightMode: 'AUTO' })['line-height']).toBeUndefined();
  });

  it('letter-spacing PIXELS→px；PERCENT→em 换算', () => {
    expect(textCss({ letterSpacingMode: 'PIXELS', letterSpacing: 2 })['letter-spacing']).toBe('2px');
    expect(textCss({ letterSpacingMode: 'PERCENT', letterSpacing: 5, fontSize: 20 })['letter-spacing']).toBe('0.05em');
  });

  it('textAlign justify→text-align:justify；text-transform 4 映射', () => {
    expect(textCss({ textAlign: 'justify' })['text-align']).toBe('justify');
    expect(textCss({ textCase: 'UPPER' })['text-transform']).toBe('uppercase');
    expect(textCss({ textCase: 'LOWER' })['text-transform']).toBe('lowercase');
    expect(textCss({ textCase: 'TITLE' })['text-transform']).toBe('capitalize');
    expect(textCss({ textCase: 'SMALL_CAPS' })['text-transform']).toBe('small-caps');
    expect(textCss({ textCase: 'ORIGINAL' })['text-transform']).toBeUndefined();
  });

  it('-webkit-font-smoothing:antialiased（文字节字面）', () => {
    expect(textCss({})['-webkit-font-smoothing']).toBe('antialiased');
  });

  it('auto resize HUG→fit-content（width:auto 等价口径报备）+ flex:0 0 auto', () => {
    const css = textCss({ textAlign: 'left' }, { widthMode: 'HUG', heightMode: 'HUG' });
    expect(css['width']).toBe('fit-content');
    expect(css['flex']).toBe('0 0 auto');
  });

  it('Truncate→-webkit-line-clamp + overflow hidden + ellipsis', () => {
    const css = textCss({ textTruncation: 'ENDING', maxLines: 3 });
    expect(css['-webkit-line-clamp']).toBe('3');
    expect(css['overflow']).toBe('hidden');
    expect(css['text-overflow']).toBe('ellipsis');
  });

  it('clipContent→overflow:hidden（圆角蒙版 FR-23 前的容器裁剪口径）', () => {
    const kid = createNode('FRAME');
    kid.layout = { ...kid.layout, clipContent: true } as LayoutSchema;
    expect(cssOfChild(kid).css['overflow']).toBe('hidden');
  });
});

describe('FR-47 报备项落点（依赖其他 FR——本表标注不锁）', () => {
  it('图片 7 调整（Exposure…Shadows）= FR-20 余项——schema 无字段即无映射（出码表标 FAIL 依赖项）', () => {
    const kid = createNode('IMAGE');
    const styleKeys = Object.keys(kid.style ?? {});
    expect(styleKeys.some((k) => /exposure|contrast|saturation|temperature|tint|highlight|shadow/i.test(k))).toBe(false);
  });

  it('容器为 SECTION 时仍按 flex/ABSOLUTE 通用规则出码（Section 标题为编辑器 UI 不出码）', () => {
    const sec = createNode('SECTION');
    expect(isContainer(sec)).toBe(true);
    const { parent } = cssOfChild(sec as unknown as UINode);
    expect(parent).toBeTruthy();
  });
});
