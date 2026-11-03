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
import { zstdDecompressSync } from 'node:zlib';
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
  it('fractional index 用 Figma 的编码（从 `!` 起、变长、码点序 = 视觉序）', () => {
    /**
     * 2026-11-02 改：早先是 base62 定长 3 位（`000` `001` …）。码点序虽然也对，
     * 但**不是 Figma 的编码** —— 真实文件里同一父节点下依次是 `!` `"` `#` … `~` `~!` `~"`。
     * 导入器按 position 建树，非法排序键会让子节点挂不上父级：文件能导入、画布一片空白
     * （用户实测）。导入侧只按字典序比较，两种编码都排得对，所以改这里不影响自家往返。
     */
    const positions = Array.from({ length: 200 }, (_, i) => positionOf(i));
    expect(positions[0]).toBe('!');
    expect(positions[93]).toBe('~');
    // 进位处与实测一致：`~` 之后是 `~!`、`~"`
    expect(positions[94]).toBe('~!');
    expect(positions[95]).toBe('~"');
    // 变长编码做不到定长，但字典序必须严格递增（前缀相同则更长的更大）
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

  it('canvas.fig 的 data 段必须是 zstd（写成 deflate 会被 Figma 判 Internal error）', async () => {
    /**
     * 2026-11-03：真实 `.fig` 的容器是
     * `"fig-kiwi" | version | schemaLen | schema(deflate) | dataLen | data(zstd)`
     * —— **两段压缩算法不一样**。
     *
     * `@open-pencil/kiwi` 的 `buildFigKiwi` 只在 Bun 下用 zstd，Node/浏览器退化成 deflate，
     * 于是导出的文件 Figma 一律 `Internal error during import`。而自家往返永远发现不了：
     * 我们的 decode 两种都试，自己写的 deflate 自己当然读得回来。
     *
     * 这条测试用**独立解码器**（Node 内置 zlib，不是我们自己的代码）验证 data 段合法。
     */
    const page = allDemoPages()[0]!;
    const exported = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const canvas = unzip(exported.bytes).canvas;
    const view = new DataView(canvas.buffer, canvas.byteOffset, canvas.byteLength);
    expect(new TextDecoder().decode(canvas.subarray(0, 8))).toBe('fig-kiwi');
    const schemaLen = view.getUint32(12, true);
    const dataLenAt = 16 + schemaLen;
    const dataLen = view.getUint32(dataLenAt, true);
    const dataStart = dataLenAt + 4;
    // zstd magic：28 B5 2F FD
    expect([...canvas.subarray(dataStart, dataStart + 4)]).toEqual([0x28, 0xb5, 0x2f, 0xfd]);
    // 用 Node 的 zstd 解回来，证明不是「magic 对了但流是坏的」
    const raw = zstdDecompressSync(canvas.subarray(dataStart, dataStart + dataLen));
    expect(raw.length).toBeGreaterThan(0);
  });

  it('矩形类形状都带 fillGeometry（缺了 Figma 打开就是一屏空白）', async () => {
    /**
     * 2026-11-03：真实 Figma 文件里 FRAME / RECTANGLE / ROUNDED_RECTANGLE **100% 都带
     * `fillGeometry`**。早先只有 VECTOR 写这段，导出的 `.fig` 里 218 个形状只有 12 个
     * 有几何 —— 自家编辑器读 AST 看不出问题，拖进 Figma 就是空白。
     *
     * 这条测试是**独立检测器**：它不关心导出器怎么实现，只断言「每个形状都有几何」。
     */
    const page = allDemoPages()[0]!;
    // demo 页没有椭圆，而 AST 的 OVAL 导出成 ELLIPSE —— 正是漏写几何的盲区。自建一个补上。
    const oval = createNode('OVAL', { id: 'probe-oval', name: '探针椭圆' });
    Object.assign(oval.layout, { widthMode: 'FIXED', heightMode: 'FIXED', width: 60, height: 60 });
    oval.style = { background: '#ff0000' };
    const probePage = { ...page, root: { ...page.root, children: [...page.root.children, oval] } };
    const exported = await exportFig([probePage], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const decoded = codec.decode(unzip(exported.bytes).canvas);
    const shapes = decoded.nodeChanges.filter(
      // 注意按 **change.type** 断言：AST 的 OVAL 导出成 ELLIPSE（FIG_TYPE 映射），
      // 早先导出侧按 'OVAL' 判断 → 椭圆永远不走几何分支（2026-11-03 修复）
      (n) => n.type === 'FRAME' || n.type === 'RECTANGLE' || n.type === 'ELLIPSE',
    );
    // 椭圆必须真的在产物里，否则这条断言测了个寂寞
    expect(shapes.some((n) => n.type === 'ELLIPSE')).toBe(true);
    expect(shapes.length).toBeGreaterThan(0);
    const missing = shapes.filter((n) => !n.fillGeometry?.length).map((n) => `${n.type}/${n.name}`);
    expect(missing).toEqual([]);
    // 矩形几何是固定的 46 字节：M(0,0) L(w,0) L(w,h) L(0,h) L(0,0) Z —— 与真实文件逐字节一致
    const frame = shapes.find((n) => n.type === 'FRAME')!;
    const blob = decoded.blobs[frame.fillGeometry![0]!.commandsBlob!]!;
    expect(blob.length).toBe(46);
    expect(blob[0]).toBe(1); // MoveTo
    expect(blob[blob.length - 1]).toBe(0); // Close
    /**
     * 椭圆必须是**曲线几何**，不能复用矩形 blob。
     * 撤掉修复（把 ELLIPSE 写成 OVAL）时这条会红：矩形 blob 恒 46 字节，
     * 而椭圆是 1 个 MoveTo + 4 段 Cubic + Close = 9 + 4×25 + 1 = 110 字节。
     */
    const ellipse = shapes.find((n) => n.type === 'ELLIPSE')!;
    const eblob = decoded.blobs[ellipse.fillGeometry![0]!.commandsBlob!]!;
    expect(eblob.length).toBeGreaterThan(46);
    expect(eblob[0]).toBe(1); // MoveTo
    expect(eblob.includes(4)).toBe(true); // 含 Cubic 命令
  });

  it('TEXT 的文字与字体字段必须落盘 —— 即使节点身上挂着多余的 children 键', async () => {
    /**
     * 2026-11-03：用户报「另存为后重新用 uicompiler 打开，组件丢了很多，没有一个完整的
     * 页面 frame」。真相是 **所有文字都没导出**：6 个 frame 都在、节点数 386/386 一个不少，
     * 但整页只剩细线和色块。
     *
     * 根因链：`parseProject` 的 `ensureChildren` 护栏给每个节点补 `children: []`（连 TEXT 也补）
     * → 导出侧用 `'children' in node` 判容器 → TEXT 被判成容器 → `textFieldsOf` 整块跳过。
     *
     * **这个缺陷只在浏览器路径暴露**：门禁直接喂 `project.json` 的 pages，没走 `parseProject`，
     * 所以往返 20 页全绿。所以这条测试必须**显式把脏形状喂给导出器**，不能只测干净 AST。
     */
    const page = createPage('文本页');
    const text = createNode('TEXT', { name: '标题' }) as unknown as Record<string, unknown>;
    text.text = 'MON · 第 6 周';
    (text.style as Record<string, unknown>).fontSize = 11;
    (text.style as Record<string, unknown>).fontWeight = 600;
    (text.style as Record<string, unknown>).lineHeight = 15;
    (text.style as Record<string, unknown>).letterSpacing = 1.6;
    // 复刻旧版 ensureChildren 留下的污染
    text.children = [];
    page.root.children.push(text as unknown as UINode);

    const exported = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const decoded = codec.decode(unzip(exported.bytes).canvas);
    const t = decoded.nodeChanges.find((n) => n.type === 'TEXT')!;

    expect(t.textData?.characters).toBe('MON · 第 6 周');
    expect(t.fontSize).toBe(11);
    expect(t.fontName?.style?.replace(/\s+/g, '')).toBe('SemiBold');
    expect(t.lineHeight?.value).toBe(15);
    expect(t.letterSpacing?.value).toBeCloseTo(1.6, 3);

    // 再走一遍读回：文字与字体样式逐字段一致
    const back = importFig(exported.bytes, codec.decode);
    const flat = (n: UINode): UINode[] => [n, ...((n as { children?: UINode[] }).children ?? []).flatMap(flat)];
    const importedText = flat(back.pages[0]!.root).find((n) => n.type === 'TEXT')!;
    expect((importedText as { text: string }).text).toBe('MON · 第 6 周');
    expect(importedText.style?.fontSize).toBe(11);
    expect(importedText.style?.fontWeight).toBe(600);
    expect(importedText.style?.lineHeight).toBe(15);
    expect(importedText.style?.letterSpacing).toBeCloseTo(1.6, 3);
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
  it('根级流式子项必须按流排布，不能全落在 (0,0)', async () => {
    /**
     * 用户实测报的 bug：导出的 `.fig` 在 Figma 里打开是「一页乱七八糟的框」。
     * 原因是根级子项直接取 `child.layout.x ?? 0`，而 demo 页与 AI 生成页的根都是
     * `mode: VERTICAL`、子项本来没有坐标（流内元素不该有）→ 5~6 块全叠在原点。
     * 内层容器一直是对的（`buildNode` 里调 `layoutChildren`），漏的只有根这一层。
     *
     * **为什么原有往返用例抓不到**：`normalize` 会把「流内子项的 x/y」抹掉（流里它们
     * 无意义），于是导出写 0、导入读 0，逐字段照样相等 —— 位置全错而门禁全绿。
     * 所以这条用例绕开 normalize，直接断言解码后的绝对坐标。
     */
    const page = allDemoPages().find((p) => p.root.layout.mode === 'VERTICAL' && p.root.children.length >= 3);
    expect(page, '需要一个 VERTICAL 根、至少 3 个子项的 demo 页').toBeTruthy();
    const exported = await exportFig([page!], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    /**
     * 判据落在 `.fig` 的 `transform.m12`（Figma 真正读的字段），不是往返后的 AST。
     *
     * 2026-11-02 改：页面根现在是一个真实 FRAME，子项由 `buildNode` 内部的
     * `layoutChildren` 统一排 —— 导入时 `buildRaw` 的容器分支会把流内子项的 x/y
     * **删掉**（位置由布局决定，留着反而与 gap/padding 打架），所以 AST 侧取不到 y
     * 是正确行为，不是丢字段。旧判据看 AST 等于在测一个不该存在的字段。
     */
    const decoded = codec.decode(unzip(exported.bytes).canvas);
    const canvasChange = decoded.nodeChanges.find((n) => n.type === 'CANVAS');
    expect(canvasChange, '应有一个画布').toBeTruthy();
    const pageFrames = decoded.nodeChanges.filter(
      (n) => n.parentIndex?.guid?.localID === canvasChange!.guid!.localID && n.type === 'FRAME',
    );
    expect(pageFrames, '画布上应有页面 frame').toHaveLength(1);
    const kids = decoded.nodeChanges.filter((n) => n.parentIndex?.guid?.localID === pageFrames[0].guid!.localID);
    const ys = kids.map((c) => c.transform?.m12 ?? -1);
    // 首项贴顶
    expect(ys[0]).toBe(0);
    // 严格递增：任何一个 0 或重复都说明没排布
    for (let i = 1; i < ys.length; i += 1) expect(ys[i]).toBeGreaterThan(ys[i - 1]);
    // 且必须真的错开（不是「都等于 0 但恰好递增」这种空断言）
    expect(new Set(ys).size).toBe(ys.length);
  });

  it('页面根节点的样式与布局必须往返（.fig 里没有"页面根容器"这个实体）', async () => {
    /**
     * `.fig` 里页面根被压成 `CANVAS`，而 CANVAS 没有 fills / auto layout ——
     * 导出侧早先只借 CANVAS 带了 `stackMode` 与 `size`，根的 `style` 和
     * `layout.padding/gap/align/justify` **从来没被导出过**。
     *
     * 后果不是"少个字段"，是整页看不见：深色主题（`#1d232a` 底 + 白字）存成 `.fig`
     * 再打开，根背景回落成工厂默认白 → 白字白底。用户看到的就是
     * 「打开 fig 只有一页乱七八糟的东西」。
     *
     * 原有往返用例抓不到：两边都是 `undefined`，逐字段照样相等。
     */
    const page = createPage('根样式', 375, 812);
    page.root.layout.mode = 'VERTICAL';
    page.root.layout.padding = [0, 0, 80, 0];
    page.root.style = { background: '#1d232a' };
    const title = createNode('TEXT', { id: 'title', name: '标题' });
    title.layout.widthMode = 'FIXED';
    title.layout.heightMode = 'FIXED';
    title.layout.width = 100;
    title.layout.height = 20;
    (title as { text: string }).text = '早上好';
    page.root.children.push(title);

    const exported = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const back = importFig(exported.bytes, codec.decode).pages[0];
    expect(back.root.style?.background).toBe('#1d232a');
    expect(back.root.layout.padding).toEqual([0, 0, 80, 0]);
  });

  it('贴底固定子项在 .fig 里落在画框内（不流到页面外面）', async () => {
    /**
     * `position: 'FIXED'` + `stickyBottom: 0` 的底部导航，早先按普通流子项排到
     * y = 1008 —— 落在 812 高的画框**外面**。在 Figma 里就是「页面里 4 个块，
     * 页面下方飘着一条孤零零的导航」，也就是用户说的「乱七八糟」。
     *
     * 断言直接看解码后的 `transform.m12`（Figma 真正读的那个字段），
     * 而不是往返后的 AST —— AST 侧 y 会被 `normalize` 抹掉。
     */
    const page = createPage('固定栏', 375, 812);
    page.root.layout.mode = 'VERTICAL';
    page.root.layout.padding = [0, 0, 80, 0];
    const body = createNode('RECTANGLE', { id: 'body', name: '正文' });
    body.layout.widthMode = 'FIXED';
    body.layout.heightMode = 'FIXED';
    body.layout.width = 375;
    body.layout.height = 200;
    const nav = createNode('FRAME', { id: 'nav', name: '底部导航' });
    nav.layout.widthMode = 'FILL';
    nav.layout.heightMode = 'FIXED';
    nav.layout.height = 64;
    nav.layout.position = 'FIXED';
    nav.layout.stickyBottom = 0;
    page.root.children.push(body, nav);

    const exported = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const decoded = codec.decode(unzip(exported.bytes).canvas);
    const navChange = decoded.nodeChanges.find((n) => n.name === '底部导航');
    expect(navChange, '导出里应能找到底部导航').toBeTruthy();
    expect(navChange!.transform?.m12).toBe(812 - 64);
    // 整条不越界
    expect((navChange!.transform?.m12 ?? 0) + (navChange!.size?.y ?? 0)).toBeLessThanOrEqual(812);
  });

  it('多页导入后页面 id 必须两两不同（否则编辑器切不了页）', async () => {
    /**
     * 用户报的「打开 fig 只有一页」的**直接原因**（前两个 bug 只是让那一页长得乱）。
     *
     * 导入器建页用的是 `createPage()`，而它的 id 是固定 `'page'`（单页场景下
     * 「同样输入构造出逐字节相同的页面」要靠它，脏标记与几何断言都依赖）。
     * 六页全 `'page'` 之后，编辑器 `SELECT_PAGE` 的分支是
     * `if (action.id === state.currentPageId) return state;` —— 点任意一页都命中早退，
     * 页面列表六行还**全部**带 `is-current`。用户视角就是「只有一页，而且点了没反应」。
     *
     * 为什么既有用例抓不到：它们比的是 `page.root.children`，页面 id 不在比对范围；
     * 而 demo 页本来就是单页载入，同 id 看不出问题。
     */
    const src = allDemoPages().slice(0, 3);
    expect(src.length).toBe(3);
    const exported = await exportFig(src, codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const back = importFig(exported.bytes, codec.decode).pages;
    expect(back).toHaveLength(3);

    const ids = back.map((p) => p.id);
    // 判据一：页面 id 两两不同
    expect(new Set(ids).size).toBe(ids.length);
    // 判据二：根节点 id 也两两不同（同一套命名空间，跨页重复会让选中串页）
    const rootIds = back.map((p) => p.root.id);
    expect(new Set(rootIds).size).toBe(rootIds.length);
    // 判据三：模拟编辑器切页 —— 以任意一页为当前页，只能命中它自己
    for (const cur of ids) expect(ids.filter((id) => id === cur)).toHaveLength(1);
    // 页面名与顺序不能因为改 id 而错位
    expect(back.map((p) => p.name)).toEqual(src.map((p) => p.name));
  });

  it('多页导出是「一个画布 + 并排 frame」，不是一页一个画布', async () => {
    /**
     * 2026-11-02 改的映射：`UIPage → FRAME`，整个工程 → 一个 CANVAS。
     *
     * 早先是 `UIPage → CANVAS`（一页一个画布），那是把 AST 的 `UIPage`（一个屏幕）
     * 当成 Figma 的 `page`（文件内的分组容器）。真实 Figma 文件不是这样：
     * `tests/fixtures/fig/` 的四个样本全是「一个 CANVAS 上并排多个 FRAME」
     * （`variable-override-precedence.fig` 的 Page 1 就有 3 个 FRAME + 1 个 SECTION）。
     *
     * 旧映射还有连带代价：页面根在 `.fig` 里**没有实体**（被压成 CANVAS，而 CANVAS
     * 没有 fills / auto layout / padding），根的背景与内边距只能整份旁挂 —— 那正是
     * 「深色页打开变白字白底」的来源。改成 FRAME 后这些属性原生承载。
     */
    const pages = allDemoPages().slice(0, 3);
    const exported = await exportFig(pages, codec.encode, { fileName: '多页', exportedAt: '2026-01-01T00:00:00.000Z' });
    const decoded = codec.decode(unzip(exported.bytes).canvas);
    const doc = decoded.nodeChanges.find((n) => n.type === 'DOCUMENT')!;
    const canvases = decoded.nodeChanges.filter(
      (n) => n.parentIndex?.guid?.localID === doc.guid!.localID && n.type === 'CANVAS',
    );
    // 判据一：只有一个画布
    expect(canvases).toHaveLength(1);

    const frames = decoded.nodeChanges.filter(
      (n) => n.parentIndex?.guid?.localID === canvases[0].guid!.localID && n.type === 'FRAME',
    );
    // 判据二：每页一个 frame
    expect(frames).toHaveLength(3);
    // 判据三：并排 —— x 递增、y 都是 0、尺寸等于各页视口
    const xs = frames.map((f) => f.transform?.m02 ?? -1);
    for (let i = 1; i < xs.length; i += 1) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    for (const f of frames) expect(f.transform?.m12).toBe(0);
    expect(frames.map((f) => Math.round(f.size?.x ?? 0))).toEqual(pages.map((p) => p.viewport.width));
    expect(frames.map((f) => Math.round(f.size?.y ?? 0))).toEqual(pages.map((p) => p.viewport.height));
    // 判据四：根的布局与背景**原生承载**（不再靠旁挂）—— 有背景的页必须写出 fillPaints
    for (let i = 0; i < pages.length; i += 1) {
      if (pages[i].root.style?.background) expect((frames[i].fillPaints ?? []).length).toBeGreaterThan(0);
    }
    // 判据五：项目旁挂只有格式标记，没有 pages 根旁挂表（那是旧格式的补丁）
    const project = (importFig(exported.bytes, codec.decode).meta as {
      ui_compiler_extras?: { project?: { format?: string; pages?: unknown } };
    })?.ui_compiler_extras?.project;
    expect(project?.format).toBe('frames');
    expect(project?.pages).toBeUndefined();
  });

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

  it('TEXT 的 size.x 必须覆盖真实文本宽度（中文被低估会让 Figma 多换行）', async () => {
    /**
     * 2026-11-03 用户报「Figma 里 frame 排版和 uicompiler 不一样」。
     *
     * 根因：`measureTree` 对 HUG 宽度的 TEXT 用 `fontSize × 0.62 × 字符数` 粗估宽度。
     * 0.62 是**拉丁**字符的平均宽度，中文是全宽（≈1.0），于是中文文本宽度被低估约 40%。
     * 这个宽度落进 `size.x`，而 TEXT 的 `textAutoResize` 是 `HEIGHT`（按给定宽度换行、
     * 高度自适应）→ Figma 用真实字体在这个偏窄宽度上换行 → 多一行 → 该节点变高 →
     * 垂直流里后面所有兄弟节点整体下移。
     *
     * 实测 ironlog：168 个 TEXT 叶子有 114 个（68%）旧粗估偏窄，中文短标签普遍差 20–32px。
     */
    const page = createPage('文本宽度', 375, 812);
    page.root.layout.mode = 'VERTICAL';
    page.root.layout.widthMode = 'FIXED';
    page.root.layout.heightMode = 'FIXED';
    page.root.layout.width = 375;
    page.root.layout.height = 812;
    const longCn = '罗马尼亚硬拉四组八次训练记录';
    const t = createNode('TEXT', { id: 'cn-text', name: '中文长文本' });
    (t as { text?: string }).text = longCn;
    t.layout.widthMode = 'HUG';
    t.layout.heightMode = 'HUG';
    t.style = { fontSize: 16, lineHeight: 24 };
    page.root.children = [t];

    const exported = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const decoded = codec.decode(unzip(exported.bytes).canvas);
    const got = decoded.nodeChanges.find((n) => n.type === 'TEXT' && n.textData?.characters === longCn);
    expect(got, 'TEXT 没导出').toBeDefined();

    // 真实宽度：CJK 按 1em（这个文本全是中文，所以就是 14 × 16 = 224）
    const realWidth = longCn.length * 16;
    expect(got!.size!.x).toBeGreaterThanOrEqual(realWidth);
    // 旧粗估是 16 × 0.62 × 14 = 139 —— 明确排除
    expect(got!.size!.x).toBeGreaterThan(16 * 0.62 * longCn.length);
  });

  it('HUG 宽度的 BUTTON 文案 size.x 不能是 0', async () => {
    /**
     * `contentW = (layout.width ?? 0) - padding`：HUG 按钮没有 `layout.width`，
     * 算出来恒 0 → label 的 `size.x = 0` → Figma 里按钮文字宽度为 0，文字不显示。
     * 实测 ironlog 有 3 个按钮中招（「开始训练」「完成本组」「加 2.5kg」）。
     */
    const page = createPage('按钮宽度', 375, 812);
    page.root.layout.mode = 'VERTICAL';
    const btn = createNode('BUTTON', { id: 'btn-hug', name: '开始训练' });
    (btn as { text?: string }).text = '开始训练';
    btn.layout.widthMode = 'HUG';
    btn.layout.heightMode = 'FIXED';
    btn.layout.height = 48;
    btn.layout.padding = [12, 20, 12, 20];
    btn.style = { fontSize: 15, background: '#111111', color: '#ffffff' };
    page.root.children = [btn];

    const exported = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const decoded = codec.decode(unzip(exported.bytes).canvas);
    const label = decoded.nodeChanges.find((n) => n.name === BUTTON_LABEL);
    expect(label, '按钮文案节点没导出').toBeDefined();
    expect(label!.size!.x).toBeGreaterThan(0);
    expect(label!.size!.y).toBeGreaterThan(0);
  });

  it('thumbnail.png 必须存在且尺寸与 meta.thumbnail_size 一致', async () => {
    /**
     * 真实 Figma 文件**100% 带 `thumbnail.png`**，`client_meta.thumbnail_size` 就是它的像素尺寸
     * （实测 400×244）。我们早先两样都不写：`thumbnail_size` 恒 0×0、条目缺失 ——
     * 真实文件有、我们没有，属于条目级差异里唯一还没对齐的一项（2026-11-03 补）。
     *
     * 断言直接读 PNG 的 IHDR，不信任导出侧自己填的数字。
     */
    const page = allDemoPages()[0]!;
    const exported = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const entries = unzipSync(exported.bytes);
    const thumb = entries['thumbnail.png'];
    expect(thumb, 'thumbnail.png 缺失').toBeDefined();
    // PNG 签名 + IHDR（偏移 16 起是宽高，各 4 字节大端）
    expect([...thumb!.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const dv = new DataView(thumb!.buffer, thumb!.byteOffset, thumb!.byteLength);
    const w = dv.getUint32(16);
    const h = dv.getUint32(20);
    const meta = JSON.parse(new TextDecoder().decode(entries['meta.json'])) as {
      client_meta: { thumbnail_size: { width: number; height: number } };
    };
    expect({ width: w, height: h }).toEqual(meta.client_meta.thumbnail_size);
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);
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

