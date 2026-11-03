/**
 * VECTOR 路径几何导出（`vector.d` → `fillGeometry[].commandsBlob`）。
 *
 * 为什么单独立一个文件：这是「Figma 里图标是空框」的唯一修复点，而它的正确性
 * **只能靠真实文件的字节反证**——解析器错一个字节，Figma 里就是一团乱线或干脆不画。
 * 所以这里的断言不是「结构差不多」，而是**与真实 Figma 产出的 blob 逐字节相等**。
 */
import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import { parseSvgPath, svgPathToBlob, tokenizeSvgPath, encodeFigmaPath } from '../src/fig/path-blob';

const hex = (b: Uint8Array): string => Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join(' ');

/**
 * 真实 Figma 文件里一个 40×40 矩形的 `fillGeometry[0].commandsBlob`
 * （`variable-override-precedence.fig` 的 `ROUNDED_RECTANGLE "r"`，46 字节）。
 *
 * 反推出来的编码：`01`=MoveTo、`02`=LineTo、`00`=Close，后跟小端 f32 坐标。
 */
const REAL_RECT_BLOB =
  '01 00 00 00 00 00 00 00 00 02 00 00 20 42 00 00 00 00 02 00 00 20 42 00 00 20 42 ' +
  '02 00 00 00 00 00 00 20 42 02 00 00 00 00 00 00 00 00 00';

describe('SVG path → Figma commandsBlob', () => {
  it('矩形三种写法都产出与真实 Figma 文件逐字节相同的 blob', () => {
    for (const d of ['M0 0 H40 V40 H0 Z', 'M0 0L40 0L40 40L0 40L0 0Z', 'M0,0h40v40h-40z']) {
      const blob = svgPathToBlob(d);
      expect(blob, d).not.toBeNull();
      expect(hex(blob!), d).toBe(REAL_RECT_BLOB);
    }
  });

  it('相对命令按当前点累加（`l12-2` 曾被当成绝对坐标）', () => {
    // M9 18 → V5 → l12 -2 → (21,3) → v13 → (21,16)
    const parsed = parseSvgPath('M9 18V5l12-2v13');
    expect(parsed).not.toBeNull();
    const pts = parsed!.commands.map((c) => c.pts);
    expect(pts[0]).toEqual([9, 18]); // MoveTo
    expect(pts[1]).toEqual([9, 5]); // V5
    expect(pts[2]).toEqual([21, 3]); // l12 -2：相对 (9,5)
    expect(pts[3]).toEqual([21, 16]); // v13
  });

  it('缩放按 viewBox 比例作用到每个坐标（24 网格 → 16 盒子）', () => {
    const parsed = parseSvgPath('M9 18V5l12-2v13', 16 / 24, 16 / 24);
    const pts = parsed!.commands.map((c) => c.pts);
    expect(pts[0][0]).toBeCloseTo(6, 5);
    expect(pts[0][1]).toBeCloseTo(12, 5);
    expect(pts[2][0]).toBeCloseTo(14, 5);
    expect(pts[2][1]).toBeCloseTo(2, 5);
  });

  it('弧命令转成三次贝塞尔，且终点精确落在 (x,y)', () => {
    // 半圆：从 (0,0) 到 (10,0)，半径 5
    const parsed = parseSvgPath('M0 0 A5 5 0 0 1 10 0');
    expect(parsed).not.toBeNull();
    const cubics = parsed!.commands.filter((c) => c.type === 4);
    expect(cubics.length).toBeGreaterThan(0);
    const last = cubics[cubics.length - 1].pts;
    expect(last[4]).toBeCloseTo(10, 4);
    expect(last[5]).toBeCloseTo(0, 4);
    // 弧必须真的拱起来：SVG 的 y 轴向下，sweep=1 在屏幕上是顺时针 → 从 (0,0) 到 (10,0) 经过上方
    const minY = Math.min(...cubics.map((c) => Math.min(c.pts[1], c.pts[3], c.pts[5])));
    expect(minY).toBeLessThan(-3);
  });

  it('二次曲线升阶成三次（Q 不被丢弃）', () => {
    const parsed = parseSvgPath('M0 0 Q5 10 10 0');
    const cubic = parsed!.commands.find((c) => c.type === 4);
    expect(cubic).toBeDefined();
    expect(cubic!.pts[4]).toBeCloseTo(10, 5);
    expect(cubic!.pts[5]).toBeCloseTo(0, 5);
  });

  it('闭合路径显式补「回到起点」的线段再 Close（与真实文件形态一致）', () => {
    const parsed = parseSvgPath('M0 0 L10 0 L10 10 Z');
    const types = parsed!.commands.map((c) => c.type);
    expect(types).toEqual([1, 2, 2, 2, 0]);
    // 倒数第二条是回到 (0,0)
    expect(parsed!.commands[3].pts).toEqual([0, 0]);
  });

  it('没有几何的 d 返回 null（不产出空 blob）', () => {
    expect(parseSvgPath('')).toBeNull();
    expect(parseSvgPath('M10 10')).toBeNull();
    expect(svgPathToBlob('M0 0')).toBeNull();
  });

  it('分词：一条命令多组参数按隐式重复展开，`m` 的后续组是相对 `l`', () => {
    expect(tokenizeSvgPath('M0 0 10 10')).toEqual([
      { cmd: 'M', args: [0, 0] },
      { cmd: 'L', args: [10, 10] },
    ]);
    expect(tokenizeSvgPath('m0 0 10 10')).toEqual([
      { cmd: 'm', args: [0, 0] },
      { cmd: 'l', args: [10, 10] },
    ]);
  });

  it('编码长度等于命令流字节数（f32 小端）', () => {
    const blob = encodeFigmaPath([
      { type: 1, pts: [0, 0] },
      { type: 4, pts: [1, 2, 3, 4, 5, 6] },
      { type: 0, pts: [] },
    ]);
    expect(blob.length).toBe(1 + 8 + 1 + 24 + 1);
    expect(blob[0]).toBe(1);
    expect(blob[9]).toBe(4);
  });
});

describe('导出产物里 VECTOR 带几何', () => {
  it('页面里的 VECTOR 导出后有 fillGeometry，导入回来 d 不丢', async () => {
    const { loadFigCodec } = await import('../src/fig/codec');
    const { importFig } = await import('../src/fig/import');
    const { exportFig } = await import('../src/fig/export');
    const { createPage } = await import('../src/schema/factory');
    const codec = await loadFigCodec();

    const page = createPage('矢量页', 375, 812);
    page.id = 'figpage-vector';
    page.root.id = page.id;
    page.root.children = [
      {
        id: 'icon-1',
        type: 'VECTOR',
        name: '图标',
        layout: { x: 0, y: 0, width: 16, height: 16, mode: 'ABSOLUTE' },
        // 24 网格的图标，缩到 16 盒子
        vector: { d: 'M9 18V5l12-2v13M3 18a3 3 0 1 0 6 0', width: 24, height: 24 },
      },
    ] as never;

    const { bytes } = await exportFig([page], codec.encode);
    // `exportFig` 返回的是整份 zip；要取 canvas.fig 才能单独解码
    const files = unzipSync(bytes) as Record<string, Uint8Array>;
    const decoded = codec.decode(files['canvas.fig']);
    const vectors = (decoded.nodeChanges as unknown as Array<Record<string, unknown>>).filter((n) => n.type === 'VECTOR');
    expect(vectors.length).toBe(1);
    const geo = vectors[0].fillGeometry as Array<{ commandsBlob: number; windingRule: string }>;
    expect(geo?.length).toBe(1);
    expect(geo[0].windingRule).toBe('NONZERO');

    // 几何 blob 必须真实存在且非空
    const blobs = decoded.blobs as unknown as Uint8Array[];
    expect(blobs[geo[0].commandsBlob]).toBeDefined();
    expect(blobs[geo[0].commandsBlob].length).toBeGreaterThan(0);

    // 往返：d 不能丢，且是「缩放后的节点本地坐标」；原始 viewBox 由旁挂保住
    const { pages } = importFig(bytes, codec.decode);
    let found: { d?: string; width?: number; height?: number } | null = null;
    const walk = (n: { type?: string; vector?: { d?: string; width?: number; height?: number }; children?: unknown[] }): void => {
      if (n.type === 'VECTOR') found = n.vector ?? null;
      for (const c of (n.children ?? []) as typeof n[]) walk(c);
    };
    for (const p of pages) walk(p.root as never);
    expect(found).not.toBeNull();
    expect(found!.d).toBeTruthy();
    // 24 网格缩到 16 盒子：起点 (9,18) → (6,12)
    expect(found!.d).toContain('M6 12');
    /**
     * `viewBox` **不能**恢复成原始的 24 —— `d` 已经烘焙成 16 坐标，若 viewBox 还是 24，
     * 出码会再缩一次，图标变成 2/3 大小贴在左上角（实测「图标消失」）。
     * 缺省 viewBox = layout 尺寸，两者一致。
     */
    expect(found!.width).toBeUndefined();
    expect(found!.height).toBeUndefined();
  });
});
