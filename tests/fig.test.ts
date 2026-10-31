/**
 * FR-76/77 `.fig` 导入导出单测（docs/multi-target-codegen-plan.md §11）
 *
 * 锁四件事：
 * 1. **真实文件能解**：4 个真 Figma 导出的 `.fig`（含 550KB 的 gold-preview）都要出页面；
 * 2. **paint 双向映射是互逆的**：颜色/填充/描边/效果两边命名不完全一致（`FOREGROUND_BLUR`
 *    ↔ `LAYER_BLUR`、`GRAIN` ↔ `NOISE`、`REPEAT` ↔ `TEXTURE`），映射错一个视觉就变；
 * 3. **往返结构无损**：AST → `.fig` → AST 后，19 页 demo 里除「渐进模糊」这一项 Figma
 *    没有原语的能力外，结构与样式逐字段相等（口径见 scripts/fig-check.ts）；
 * 4. **Figma 约束被遵守**：StackSize 无 FILL、StackAlign 无 STRETCH、Image.hash 是 byte[]、
 *    fontName.postscript 必填 —— 这些写错 kiwi 会直接抛异常。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { unzipSync } from 'fflate';
import { join } from 'node:path';
import { importFig } from '../src/fig/import';
import { exportFig, positionOf, BUTTON_LABEL, PLACEHOLDER_IMAGE_HASH } from '../src/fig/export';
import { loadFigCodec, type FigCodec } from '../src/fig/codec';
import {
  cssColorToFigColor,
  figColorToCss,
  colorToHex,
  hexToColor,
  gradientAngle,
  angleToTransform,
  effectsToStyle,
  styleToEffects,
  styleToPaints,
  fillsToStyle,
  strokesToStyle,
} from '../src/fig/paint';
import { allDemoPages } from '../src/demo/pages';
import { compilePage } from '../src/compiler/compile';
import { scssFromPage } from '../src/compiler/css-model';
import { deepEqual, normalize, normalizeCss, roundDeep } from '../scripts/fig-normalize';
import { createNode, createPage } from '../src/schema/factory';
import type { HorizontalConstraint, UINode, VerticalConstraint } from '../src/schema/types';

const FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'fig');

let codec: FigCodec;
beforeAll(async () => {
  codec = await loadFigCodec();
});

/* ---------------------------------------------------------------- 编解码 */

describe('fig codec', () => {
  it('真实 Figma 文件都能解出页面与节点', () => {
    const files = readdirSync(FIXTURES).filter((f) => f.endsWith('.fig'));
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const file of files) {
      const bytes = new Uint8Array(readFileSync(join(FIXTURES, file)));
      const result = importFig(bytes, codec.decode, { maxNodes: 20000 });
      const nodes = result.pages.reduce((sum, p) => sum + countNodes(p.root), 0);
      expect(result.pages.length, `${file} 页数`).toBeGreaterThan(0);
      expect(nodes, `${file} 节点数`).toBeGreaterThan(0);
      // 每页都必须有名字与正的视口
      for (const page of result.pages) {
        expect(page.name.length).toBeGreaterThan(0);
        expect(page.viewport.width).toBeGreaterThan(0);
      }
    }
  });

  it('未知节点类型只告警不中断', () => {
    const bytes = new Uint8Array(readFileSync(join(FIXTURES, 'gold-preview.fig')));
    const result = importFig(bytes, codec.decode);
    // 告警是字符串数组，不影响页面产出
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(result.pages.length).toBeGreaterThan(0);
  });

  it('非 .fig 字节给出可读错误', () => {
    expect(() => importFig(new Uint8Array([1, 2, 3]), codec.decode)).toThrow();
  });
});

/* ------------------------------------------------------------------ paint */

describe('fig paint 双向映射', () => {
  it('颜色 hex ↔ Figma Color 互逆', () => {
    for (const hex of ['#000000', '#ffffff', '#1677ff', '#7a4e00']) {
      expect(colorToHex(hexToColor(hex))).toBe(hex);
    }
  });

  it('CSS 颜色串（含 rgba / transparent）能被解析并还原', () => {
    expect(figColorToCss(cssColorToFigColor('#1677FF'))).toBe('#1677ff');
    expect(figColorToCss(cssColorToFigColor('transparent'))).toBe('transparent');
    expect(figColorToCss(cssColorToFigColor('rgba(0,0,0,0.08)'))).toBe('rgba(0,0,0,0.08)');
    expect(figColorToCss(cssColorToFigColor('rgb(22,119,255)'))).toBe('#1677ff');
  });

  it('渐变角度 ↔ transform 互逆', () => {
    for (const angle of [0, 45, 90, 135, 180, 270]) {
      expect(gradientAngle(angleToTransform(angle))).toBe(angle);
    }
  });

  it('效果类型用显式枚举映射（Figma 命名与 AST 不同）', () => {
    // AST → Figma：LAYER_BLUR 必须写 FOREGROUND_BLUR（schema 里没有 LAYER_BLUR）
    const out = styleToEffects({ effects: [{ kind: 'LAYER_BLUR', radius: 6 }] });
    expect(out[0].type).toBe('FOREGROUND_BLUR');
    expect(out[0].radius).toBe(6);
    // Figma → AST：GRAIN 归到 NOISE，REPEAT 归到 TEXTURE
    expect(effectsToStyle([{ type: 'GRAIN', radius: 4 }])[0].kind).toBe('NOISE');
    expect(effectsToStyle([{ type: 'REPEAT', radius: 4 }])[0].kind).toBe('TEXTURE');
    // 阴影带 alpha 时还原成 rgba()（编译器只读 color，不读 opacity）
    const shadow = effectsToStyle([
      { type: 'DROP_SHADOW', offset: { x: 0, y: -4 }, radius: 16, spread: 0, color: { r: 0, g: 0, b: 0, a: 0.08 } },
    ]);
    expect(shadow[0]).toMatchObject({ kind: 'DROP_SHADOW', x: 0, y: -4, blur: 16, spread: 0, color: 'rgba(0,0,0,0.08)' });
  });

  it('单层纯色落 background，多层落 fills', () => {
    expect(fillsToStyle([{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }])).toEqual({ background: '#ffffff' });
    const two = fillsToStyle([
      { type: 'SOLID', color: { r: 1, g: 1, b: 1 } },
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
    ]);
    expect(two.fills?.length).toBe(2);
    // 渐变回到 fills，不落 background
    const grad = fillsToStyle([{ type: 'GRADIENT_LINEAR', transform: angleToTransform(90), stops: [{ color: { r: 0, g: 0, b: 0 }, position: 0 }] }]);
    expect(grad.fills?.[0].type).toBe('GRADIENT_LINEAR');
    expect(grad.background).toBeUndefined();
  });

  it('描边缺省对齐是 INSIDE，只有 CENTER/OUTSIDE 才写', () => {
    const inside = strokesToStyle([{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }], 2, 'INSIDE', undefined);
    expect(inside.border?.align).toBeUndefined();
    const outside = strokesToStyle([{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }], 2, 'OUTSIDE', undefined);
    expect(outside.border?.align).toBe('OUTSIDE');
    // 虚线走 dashPattern
    const dashed = strokesToStyle([{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }], 1, 'INSIDE', [6, 3]);
    expect(dashed.border?.style).toBe('dashed');
    expect(dashed.border?.dash).toEqual([6, 3]);
  });

  it('styleToPaints 支持 rgba 背景', () => {
    const paints = styleToPaints({ background: 'rgba(0,0,0,0.5)' });
    expect(paints.length).toBe(1);
    expect(paints[0].color?.a).toBeCloseTo(0.5, 5);
  });
});

/* -------------------------------------------------------------- 索引/约定 */

describe('fig 导出约定', () => {
  it('fractional index 是定长且码点序 = 视觉序', () => {
    const positions = Array.from({ length: 200 }, (_, i) => positionOf(i));
    expect(positions[0]).toBe('000');
    expect(new Set(positions.map((p) => p.length)).size).toBe(1);
    // base62 顺序（0-9 → A-Z → a-z），且必须用 `<` 比较 —— 定长才能保证跨位序也正确
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i - 1] < positions[i], `${positions[i - 1]} < ${positions[i]}`).toBe(true);
    }
    // 回归：ICU 的 localeCompare 会把 '$' 排在 '%' 之后，历史 bug
    expect('$'.localeCompare('%')).not.toBe(-1);
  });

  it('BUTTON 拆成 FRAME + 唯一 Label 文本，导入能合回', async () => {
    const page = allDemoPages().find((p) => p.name.startsWith('01'))!;
    const exported = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const decoded = codec.decode(unzip(exported.bytes).canvas);
    const labels = decoded.nodeChanges.filter((n) => n.type === 'TEXT' && n.name === BUTTON_LABEL);
    expect(labels.length).toBeGreaterThan(0);
    const reimported = importFig(exported.bytes, codec.decode);
    expect(findAll(reimported.pages[0].root, (n) => n.type === 'BUTTON').length).toBe(
      findAll(page.root, (n) => n.type === 'BUTTON').length,
    );
  });

  it('空图占位写成 1×1 透明图 + 哨兵 hash，读回来仍是无 src 的 IMAGE', async () => {
    const page = allDemoPages().find((p) => p.name.startsWith('04'))!;
    const exported = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const archive = unzip(exported.bytes);
    expect(archive.images[PLACEHOLDER_IMAGE_HASH]).toBeTruthy();
    const reimported = importFig(exported.bytes, codec.decode);
    const images = findAll(reimported.pages[0].root, (n) => n.type === 'IMAGE');
    expect(images.length).toBeGreaterThan(0);
    expect(images.every((n) => !(n as { src?: string }).src)).toBe(true);
  });
});

/* ------------------------------------------------------------------ 往返 */

describe('fig 往返（AST → .fig → AST）', () => {
  /**
   * 与门禁同口径的**严格**断言：结构 + 页面级（视口/根尺寸/根模式）+ 编译后 CSS 三样都要一致。
   *
   * 这里曾经留了一个 `PROGRESSIVE_BLUR` 的豁免正则 —— 那等于在单测里承认「渐进模糊会丢」，
   * 后来靠 `meta.json` 旁挂层救回来了，豁免一并删掉：**不留任何"已知会丢"的通行证**。
   */
  it('19 页 demo 的结构、页面尺寸与编译后 CSS 逐字段一致', async () => {
    const pages = allDemoPages();
    const diffs: string[] = [];
    for (const page of pages) {
      const exported = await exportFig([page], codec.encode, { fileName: page.name, exportedAt: '2026-01-01T00:00:00.000Z' });
      const back = importFig(exported.bytes, codec.decode).pages[0];
      const pageDiff =
        page.viewport.width !== back.viewport.width ||
        page.viewport.height !== back.viewport.height ||
        page.root.layout.mode !== back.root.layout.mode
          ? `页面 ${page.viewport.width}x${page.viewport.height}/${page.root.layout.mode} ≠ ${back.viewport.width}x${back.viewport.height}/${back.root.layout.mode}`
          : null;
      if (pageDiff) diffs.push(`${page.name}: ${pageDiff}`);
      const before = roundDeep(page.root.children.map((n) => normalize(n, page.root.layout.mode)), 4);
      const after = roundDeep(back.root.children.map((n) => normalize(n, back.root.layout.mode)), 4);
      const diff = deepEqual(before, after, 'children');
      if (diff) diffs.push(`${page.name}: ${diff}`);
      const cssBefore = normalizeCss(scssFromPage(compilePage(page)));
      const cssAfter = normalizeCss(scssFromPage(compilePage(back)));
      if (cssBefore !== cssAfter) diffs.push(`${page.name}: 编译后 CSS 不一致`);
    }
    expect(diffs).toEqual([]);
  });

  /**
   * **全字段无损**：把 `LayoutSchema` / `StyleSchema` 的每个字段都设成非缺省值，
   * 往返后逐字段相等。
   *
   * 为什么需要这一条：19 页 demo 只覆盖「用到的字段」。之前系统枚举过一遍 ——
   * 37 个样式字段里 19 个、26 个布局字段里 12 个在 demo 里**从未出现过**，
   * 门禁里是 `undefined === undefined`，再绿也是空比。
   * 这一条把「从没被验证过」变成「必须过」。
   */
  it('全字段无损（每个 DSL 字段都设非缺省值）', async () => {
    const page = createPage('全字段', 480, 640);
    page.root.layout.mode = 'VERTICAL';
    page.root.layout.padding = [16, 12, 8, 4];
    page.root.layout.gap = 12;

    // ① 自由定位矩形：布局字段全家桶 + 样式字段全家桶
    const rect = createNode('RECTANGLE', { id: 'rect', name: '布局全字段' });
    Object.assign(rect.layout, {
      mode: 'ABSOLUTE',
      widthMode: 'FIXED',
      heightMode: 'FIXED',
      x: 21,
      y: 34,
      width: 120,
      height: 88,
      margin: [1, 2, 3, 4],
      flexGrow: 2,
      flexShrink: 3,
      constraints: { horizontal: 'RIGHT', vertical: 'BOTTOM' },
      wrap: 'WRAP',
      gapCross: 7,
      minWidth: 40,
      maxWidth: 300,
      minHeight: 30,
      maxHeight: 200,
      clipContent: true,
      prevMode: 'HORIZONTAL',
    });
    rect.style = {
      background: '#123456',
      fills: [
        { type: 'GRADIENT_LINEAR', angle: 45, stops: [{ position: 0, color: '#FF0000' }, { position: 1, color: '#0000FF', opacity: 0.5 }] },
        { type: 'SOLID', color: '#00FF00', opacity: 0.5 },
      ],
      border: {
        width: 2,
        color: '#ABCDEF',
        style: 'dashed',
        widths: [1, 2, 3, 4],
        align: 'OUTSIDE',
        dash: [6, 3],
        cap: 'ROUND',
        join: 'BEVEL',
        miterLimit: 8,
        opacity: 0.7,
      },
      borderRadius: [1, 2, 3, 4],
      cornerSmoothing: 0.35,
      rotation: 12,
      opacity: 0.6,
      blendMode: 'MULTIPLY',
      effects: [{ kind: 'PROGRESSIVE_BLUR', radius: 12, startRadius: 4, offset: 2, beta: 0.5 }],
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      layoutGrids: [{ pattern: 'COLUMNS', count: 4, gutter: 16, offset: 8, alignment: 'CENTER', color: '#FF0000' }],
      decorations: [{ kind: 'SPOTLIGHT', intensity: 0.5 }],
      states: { hover: { background: '#654321', opacity: 0.8 } },
      transform: { rotate: 5, scaleX: 1.1, translateX: 3, origin: '0% 0%' },
      grid: { columns: '1fr 2fr', columnGap: 10, rowGap: 4, autoFlow: 'column' },
    };

    // ② 文本：文字类字段全家桶（截断 / 大小写 / 装饰线 / 字距 / 行高 / OpenType）
    const txt = createNode('TEXT', { id: 'txt', name: '文本全字段' });
    Object.assign(txt.layout, {
      widthMode: 'FIXED',
      heightMode: 'FIXED',
      width: 200,
      height: 40,
      position: 'STICKY',
      stickyTop: 5,
      stickyBottom: 3,
    });
    (txt as { text: string }).text = 'Ab 12';
    txt.style = {
      color: '#222222',
      fontFamily: 'Roboto',
      fontSize: 18,
      fontWeight: 600,
      lineHeight: 150,
      lineHeightMode: 'PERCENT',
      letterSpacing: 2,
      letterSpacingMode: 'PERCENT',
      textAlign: 'justify',
      textAlignVertical: 'BOTTOM',
      paragraphSpacing: 6,
      paragraphIndent: 4,
      textWrap: false,
      textTruncation: 'ENDING',
      maxLines: 3,
      textCase: 'SMALL_CAPS',
      textDecoration: 'UNDERLINE',
      openType: { liga: true, kern: false, dlig: true },
    };

    // ③ 形状类专属字段：多边形的边数、星形的内半径、椭圆的扇形、图片的缩放模式
    const poly = createNode('POLYGON', { id: 'poly', name: '多边形' });
    poly.layout.widthMode = 'FIXED';
    poly.layout.heightMode = 'FIXED';
    poly.layout.width = 60;
    poly.layout.height = 60;
    poly.style = { pointCount: 6, background: '#334455' };

    const star = createNode('STAR', { id: 'star', name: '星形' });
    star.layout.widthMode = 'FIXED';
    star.layout.heightMode = 'FIXED';
    star.layout.width = 60;
    star.layout.height = 60;
    star.style = { pointCount: 5, innerRadius: 0.4 };

    const oval = createNode('OVAL', { id: 'oval', name: '椭圆' });
    oval.layout.widthMode = 'FIXED';
    oval.layout.heightMode = 'FIXED';
    oval.layout.width = 60;
    oval.layout.height = 60;
    oval.style = { arcData: { startingAngle: 10, endingAngle: 200, innerRadius: 0.5 } };

    const img = createNode('IMAGE', { id: 'img', name: '图片' });
    img.layout.widthMode = 'FIXED';
    img.layout.heightMode = 'FIXED';
    img.layout.width = 60;
    img.layout.height = 60;
    img.style = { imageScaleMode: 'FIT' };

    // ④ 渐变描边 + 四种效果 + 固定定位：paint / effect / position 三条链路各走一遍
    const grad = createNode('RECTANGLE', { id: 'grad', name: '渐变描边' });
    Object.assign(grad.layout, {
      widthMode: 'FIXED',
      heightMode: 'FIXED',
      width: 80,
      height: 40,
      position: 'FIXED',
      stickyTop: 2,
    });
    grad.style = {
      background: '#F0F0F0',
      border: {
        width: 3,
        color: '#FF00FF',
        fill: { type: 'GRADIENT_LINEAR', angle: 90, stops: [{ position: 0, color: '#FF0000' }, { position: 1, color: '#0000FF' }] },
        align: 'CENTER',
        style: 'dotted',
      },
      effects: [
        { kind: 'DROP_SHADOW', x: 2, y: 4, blur: 6, spread: 1, color: '#000000', opacity: 0.3 },
        { kind: 'INNER_SHADOW', x: 1, y: 1, blur: 2, spread: 0, color: '#333333' },
        { kind: 'NOISE', radius: 3, density: 0.6, color: '#888888', color2: '#AAAAAA', scale: 1.5, opacity: 0.4 },
        { kind: 'GLASS', refraction: 0.5, depth: 2, dispersion: 0.3, chroma: 0.4, highlight: 0.5, saturation: 1.2, edge: 0.1 },
      ],
    };

    // ⑤ 按钮：Figma 没有 BUTTON 原语，导出时拆成 FRAME + Label，靠约定名合回
    const btn = createNode('BUTTON', { id: 'btn', name: '按钮' });
    Object.assign(btn.layout, {
      widthMode: 'FIXED',
      heightMode: 'FIXED',
      width: 120,
      height: 44,
      padding: [8, 16, 8, 16],
      align: 'CENTER',
      justify: 'CENTER',
      borderRadius: undefined,
    });
    (btn as { text: string }).text = '确定';
    btn.style = {
      background: '#1677FF',
      borderRadius: 8,
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: 500,
      letterSpacing: 0.5,
      textAlign: 'center',
    };

    // ④ 容器：flex 全家桶（折行 / 交叉轴间距 / 收缩 / 居中）
    const box = createNode('FRAME', { id: 'box', name: '容器' }) as typeof rect & { children: UINode[] };
    Object.assign(box.layout, {
      mode: 'HORIZONTAL',
      widthMode: 'FIXED',
      heightMode: 'FIXED',
      width: 300,
      height: 120,
      padding: [4, 6, 8, 10],
      margin: [5, 5, 5, 5],
      gap: 9,
      gapCross: 11,
      align: 'CENTER',
      justify: 'SPACE_BETWEEN',
      wrap: 'WRAP',
      flexShrink: 2,
      clipContent: true,
      minWidth: 100,
      maxWidth: 400,
    });
    box.style = { background: '#EEEEEE', borderRadius: 8 };
    box.children = [];

    page.root.children = [rect, txt, poly, star, oval, img, box, grad, btn];

    const exported = await exportFig([page], codec.encode, { fileName: 'all-fields', exportedAt: '2026-01-01T00:00:00.000Z' });
    const back = importFig(exported.bytes, codec.decode).pages[0];
    const before = roundDeep(page.root.children.map((n) => normalize(n, page.root.layout.mode)), 4);
    const after = roundDeep(back.root.children.map((n) => normalize(n, back.root.layout.mode)), 4);
    expect(deepEqual(before, after, 'children')).toBeNull();
  });

  it('导出字节是合法 zip（canvas.fig + meta.json + images/）', async () => {
    const page = allDemoPages().find((p) => p.name.startsWith('01'))!;
    const exported = await exportFig([page], codec.encode, { fileName: 'demo', exportedAt: '2026-01-01T00:00:00.000Z' });
    const archive = unzip(exported.bytes);
    expect(archive.canvas.length).toBeGreaterThan(0);
    expect(archive.meta?.file_name).toBe('demo');
    expect(exported.stats.pages).toBe(1);
  });

  /**
   * Constraints 曾经在 `.fig` 往返里**整体消失** —— 导出不写 `horizontalConstraint` /
   * `verticalConstraint`，导入也不读。而门禁的 normalize 同样没比这两个字段，
   * 所以「另存为 .fig 再打开，约束全没了」这件事一直是绿的。
   * 这一组用例把五档都跑一遍，缺任何一档映射都会在这里红。
   */
  it('Constraints 五档往返逐字段一致', async () => {
    const combos: [HorizontalConstraint, VerticalConstraint][] = [
      ['LEFT', 'TOP'],
      ['RIGHT', 'BOTTOM'],
      ['CENTER', 'CENTER'],
      ['SCALE', 'SCALE'],
      ['LEFT_RIGHT', 'TOP_BOTTOM'],
    ];
    const page = createPage('约束往返', 400, 300);
    page.root.layout.mode = 'ABSOLUTE';
    page.root.children = combos.map(([h, v], i) => {
      const n = createNode('RECTANGLE', { id: `r${i}`, name: `${h}/${v}` });
      n.layout.mode = 'ABSOLUTE';
      n.layout.x = 10 + i * 60;
      n.layout.y = 20;
      n.layout.width = 100;
      n.layout.height = 50;
      n.layout.constraints = { horizontal: h, vertical: v };
      return n;
    });

    const exported = await exportFig([page], codec.encode, { fileName: 'constraints', exportedAt: '2026-01-01T00:00:00.000Z' });
    const back = importFig(exported.bytes, codec.decode).pages[0];
    // 缺省（LEFT/TOP）在 AST 里不落字段，读回来是 undefined —— 归一后再比
    const got = back.root.children.map((c) => c.layout.constraints ?? { horizontal: 'LEFT', vertical: 'TOP' });
    expect(got).toEqual(combos.map(([horizontal, vertical]) => ({ horizontal, vertical })));
  });

  it('缺省约束不写进 AST（MIN/MIN 不该被物化成 LEFT/TOP 字段）', async () => {
    const page = createPage('缺省约束', 400, 300);
    page.root.layout.mode = 'ABSOLUTE';
    const n = createNode('RECTANGLE', { id: 'plain', name: '无约束' });
    n.layout.mode = 'ABSOLUTE';
    n.layout.x = 10;
    n.layout.y = 10;
    n.layout.width = 50;
    n.layout.height = 50;
    page.root.children = [n];
    const exported = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const back = importFig(exported.bytes, codec.decode).pages[0];
    expect(back.root.children[0].layout.constraints).toBeUndefined();
  });

  /**
   * 页面根布局模式：Figma 的 CANVAS 没有布局概念，只能在 CANVAS 上带一个我们自己的字段。
   * 不带的后果是「绝对定位页」另存再打开变成 flex 列（子项从 top/left 变 flex: 0 0 auto）。
   */
  it('页面根布局模式往返（ABSOLUTE 不被降级成 VERTICAL）', async () => {
    for (const mode of ['ABSOLUTE', 'VERTICAL', 'HORIZONTAL'] as const) {
      const page = createPage(`根模式-${mode}`, 400, 300);
      page.root.layout.mode = mode;
      const n = createNode('RECTANGLE', { id: 'a', name: 'a' });
      n.layout.mode = 'ABSOLUTE';
      n.layout.x = 5;
      n.layout.y = 5;
      n.layout.width = 40;
      n.layout.height = 40;
      page.root.children = [n];
      const exported = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
      const back = importFig(exported.bytes, codec.decode).pages[0];
      expect(back.root.layout.mode, mode).toBe(mode);
    }
  });

  it('导出结果可被再次导入且页面名/尺寸稳定', async () => {
    const page = allDemoPages().find((p) => p.name.startsWith('09'))!;
    const first = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const once = importFig(first.bytes, codec.decode).pages[0];
    const second = await exportFig([once], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const twice = importFig(second.bytes, codec.decode).pages[0];
    expect(twice.name).toBe(once.name);
    expect(twice.viewport).toEqual(once.viewport);
  });
});

/* ------------------------------------------------------------------ 工具 */

function countNodes(node: UINode): number {
  let n = 1;
  if ('children' in node) for (const c of node.children) n += countNodes(c);
  return n;
}

function findAll(node: UINode, pred: (n: UINode) => boolean): UINode[] {
  const out: UINode[] = pred(node) ? [node] : [];
  if ('children' in node) for (const c of node.children) out.push(...findAll(c, pred));
  return out;
}

/** 极简 zip 解包（只取 canvas.fig / meta.json / images/，测试里不引第三方实现） */
function unzip(bytes: Uint8Array): { canvas: Uint8Array; meta?: Record<string, unknown>; images: Record<string, Uint8Array> } {
  // 用 fflate（已是运行时依赖），避免自己写 zip 解析
  const entries = unzipSync(bytes);
  const images: Record<string, Uint8Array> = {};
  for (const [name, data] of Object.entries(entries)) {
    if (name.startsWith('images/') && name.length > 7) images[name.slice(7)] = data;
  }
  return {
    canvas: entries['canvas.fig'],
    ...(entries['meta.json'] ? { meta: JSON.parse(new TextDecoder().decode(entries['meta.json'])) as Record<string, unknown> } : {}),
    images,
  };
}

