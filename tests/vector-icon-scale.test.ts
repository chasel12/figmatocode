/**
 * 图标缩放：`viewBox`（路径坐标系）与渲染尺寸解耦（2026-10-28）
 *
 * 背景：`specToPage.ts` 生成 VECTOR 节点时硬写 `{ width: 24, height: 24 }`，
 * 而 `svgOfVector` 里 `d.width` 优先于 layout → 布局给 14/18/22 也永远出 24px。
 * 修法是把两个概念拆开：
 *   - viewBox 恒取 `d.width/d.height`（24 坐标系，跟着缩会把路径裁掉）；
 *   - 渲染尺寸取 `renderSize`；
 *   - stroke 按 `声明值 / scale` 反算，保持**视觉**粗细恒定。
 *
 * 这个文件锁四件事：
 * 1. scale=1 时产物**逐字节不变**（否则会动像素基线）；
 * 2. 图标三档尺寸生效，且 viewBox 恒为 24×24；
 * 3. 描边反算正确（3.43 × 14/24 = 2.0）；
 * 4. **五端同口径**——漏改一端就会出现「HTML 出 14px、React 出 24px」的跨端不一致，
 *    而这种不一致单端测试发现不了，所以这里必须五端一起断言。
 */
import { describe, it, expect } from 'vitest';
import { svgOfVector, svgOfNodeVector } from '../src/generator/vector';
import { compilePage } from '../src/compiler/compile';
import { resolveLayout } from '../src/compiler/layout';
import { createApproxMeasure } from '../src/compiler/measure';
import { buildPreviewDom } from '../src/generator/html';
import { makeEmitContext } from '../src/generator/emit-context';
import { emitTsxBody } from '../src/generator/tsx-emitter';
import { emitVueTemplate } from '../src/generator/vue';
import { generateReferenceHtml } from '../src/generator/reference';
import { generatePrototypeProject } from '../src/generator/prototype';
import type { UINode, UIPage, VectorNode } from '../src/schema/types';

const pad4 = [0, 0, 0, 0] as [number, number, number, number];

function layout(extra: Record<string, unknown> = {}) {
  return {
    mode: 'VERTICAL' as const,
    widthMode: 'FIXED' as const,
    heightMode: 'FIXED' as const,
    padding: pad4,
    gap: 0,
    ...extra,
  };
}

/** 24×24 图标（与 specToPage 产出的形状一致） */
function iconNode(size: number, extra: Record<string, unknown> = {}): VectorNode {
  return {
    id: 'n-icon',
    name: '图标',
    type: 'VECTOR',
    layout: layout({ width: size, height: size }),
    style: {},
    children: [],
    vector: { d: 'M4 12 L10 18 L20 6', width: 24, height: 24 },
    ...extra,
  } as unknown as VectorNode;
}

function pageOf(children: UINode[]): UIPage {
  return {
    id: 'page',
    name: '图标页',
    viewport: { width: 375, height: 812 },
    root: {
      id: 'root',
      name: 'Root',
      type: 'PAGE',
      layout: layout({ width: 375, height: 812 }),
      style: {},
      children,
    } as never,
  } as UIPage;
}

/**
 * 从任意出码产物里抽出第一个 <svg …> 开标签（各端包的外壳不同）。
 *
 * 必须先剥掉 `<style>` 块：图片占位符的 CSS 里有 `background-image:url("data:image/svg+xml,…")`，
 * 里面嵌了一个单引号属性的 svg，直接 `match(/<svg/)` 会抓到它（曾经就这样假红过一次）。
 */
function firstSvgTag(src: string): string {
  const withoutStyle = src.replace(/<style[\s\S]*?<\/style>/gi, '');
  const m = withoutStyle.match(/<svg\b[^>]*>/);
  if (!m) throw new Error('产物里没有 <svg>');
  return m[0];
}

describe('svgOfVector：viewBox 与渲染尺寸解耦', () => {
  it('不给 renderSize 时行为与改造前一致（scale=1，零字节变化）', () => {
    const data = { d: 'M0 0 L10 10', width: 24, height: 24 };
    const svg = svgOfVector(data, 24, 24, { className: 'x' });
    expect(svg).toContain('width="24" height="24" viewBox="0 0 24 24"');
    // 反算开关打开但 scale=1 → 不反算（这条保证默认路径不被 strokeScale 影响）
    const withScale = svgOfVector(data, 24, 24, {
      className: 'x',
      border: { width: 2, color: '#000' },
      strokeScale: true,
    });
    expect(withScale).toContain('stroke-width="2"');
  });

  it('renderSize 只改渲染尺寸，viewBox 保持路径坐标系', () => {
    const svg = svgOfVector({ d: 'M0 0 L10 10', width: 24, height: 24 }, 0, 0, {
      renderSize: { width: 14, height: 14 },
    });
    expect(svg).toContain('width="14" height="14"');
    // 关键：viewBox 不能跟着缩到 14，否则 24 坐标系的路径被裁掉
    expect(svg).toContain('viewBox="0 0 24 24"');
  });

  it('stroke 反算：14px 图标声明 2px 描边 → 输出 3.43，视觉仍是 2px', () => {
    const svg = svgOfVector({ d: 'M0 0 L10 10', width: 24, height: 24 }, 0, 0, {
      renderSize: { width: 14, height: 14 },
      border: { width: 2, color: '#000' },
      strokeScale: true,
    });
    const m = svg.match(/stroke-width="([\d.]+)"/);
    expect(m).not.toBeNull();
    const emitted = Number(m![1]);
    expect(emitted).toBe(3.43);
    // 视觉粗细 = 输出值 × (渲染尺寸 / viewBox 尺寸)，应回到声明值 2
    expect(Number((emitted * (14 / 24)).toFixed(2))).toBe(2);
  });

  it('放大同样反算（24→48 时输出 1，视觉仍是 2）', () => {
    const svg = svgOfVector({ d: 'M0 0 L10 10', width: 24, height: 24 }, 0, 0, {
      renderSize: { width: 48, height: 48 },
      border: { width: 2, color: '#000' },
      strokeScale: true,
    });
    expect(svg).toContain('stroke-width="1"');
  });
});

describe('svgOfNodeVector：只对图标（24×24）缩放', () => {
  it.each([14, 18, 22])('%ipx 图标出对应尺寸，viewBox 恒为 24×24', (size) => {
    const svg = svgOfNodeVector(iconNode(size));
    expect(svg).toContain(`width="${size}" height="${size}"`);
    expect(svg).toContain('viewBox="0 0 24 24"');
  });

  it('24×24 图标与旧口径逐字节一致（不动像素基线）', () => {
    const node = iconNode(24);
    const viaNode = svgOfNodeVector(node);
    const legacy = svgOfVector(node.vector, 24, 24, {
      className: undefined,
      border: undefined,
      fill: undefined,
    });
    expect(viaNode).toBe(legacy);
  });

  it('非 24×24 的手绘矢量不缩放（改它会动既有像素基线）', () => {
    const node = {
      ...iconNode(200),
      vector: { d: 'M0 0 L100 50', width: 100, height: 50 },
    } as unknown as VectorNode;
    const svg = svgOfNodeVector(node);
    // viewBox 与渲染尺寸都取路径自身尺寸，layout 的 200 不生效
    expect(svg).toContain('width="100" height="50"');
    expect(svg).toContain('viewBox="0 0 100 50"');
  });
});

describe('五端同口径（漏改一端 = HTML 14px / React 24px）', () => {
  const page = pageOf([iconNode(14, { style: { border: { width: 2, color: '#123456' } } })]);
  const compiled = compilePage(page);
  const geometry = resolveLayout(page, createApproxMeasure());

  /** 各端产物（外壳不同，取第一个 <svg> 开标签比较） */
  function allEnds(): Record<string, string> {
    const { bodyHtml } = buildPreviewDom(page, compiled);
    const ctx = makeEmitContext(page, compiled, { index: 0 });
    const prototypeHtml = generatePrototypeProject({
      id: 'p',
      name: '图标工程',
      pages: [page],
      components: [],
    } as never)
      .map((f) => f.content)
      .join('\n');
    return {
      html: bodyHtml,
      tsx: emitTsxBody(ctx, {}),
      vue: emitVueTemplate(ctx),
      reference: generateReferenceHtml(page, compiled, geometry),
      prototype: prototypeHtml,
    };
  }

  it('五端都出 14px、viewBox 都是 24×24', () => {
    const ends = allEnds();
    expect(Object.keys(ends).sort()).toEqual(['html', 'prototype', 'reference', 'tsx', 'vue']);
    for (const [name, src] of Object.entries(ends)) {
      const tag = firstSvgTag(src);
      expect(tag, `${name} 端尺寸不对`).toContain('width="14"');
      expect(tag, `${name} 端 height 不对`).toContain('height="14"');
      expect(tag, `${name} 端 viewBox 被缩掉了`).toContain('viewBox="0 0 24 24"');
    }
  });

  it('五端描边反算值一致（3.43；TSX 侧是 camelCase）', () => {
    const ends = allEnds();
    for (const [name, src] of Object.entries(ends)) {
      const tag = firstSvgTag(src);
      // JSX 只改属性名大小写，不改值
      const attr = name === 'tsx' ? 'strokeWidth' : 'stroke-width';
      expect(tag, `${name} 端描边没反算`).toContain(`${attr}="3.43"`);
    }
  });

  it('反向验证：不走 svgOfNodeVector 就会退回 24px（这就是原来的 bug）', () => {
    // 直接调 svgOfVector 且不给 renderSize —— 布局尺寸被 d.width 压掉
    const node = iconNode(14);
    const broken = svgOfVector(node.vector, node.layout.width ?? 0, node.layout.height ?? 0, {});
    expect(broken).toContain('width="24"');
    expect(broken).not.toContain('width="14"');
  });
});
