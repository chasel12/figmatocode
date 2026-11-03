/**
 * **`.fig` 在 Figma 里的排版必须与 uicompiler 编辑器一致**。
 *
 * 为什么单独立一个文件：往返测试（`fig.test.ts`）只能证明「我们自己能读懂自己写的文件」——
 * encode 和 decode 用的是同一份 schema、同一套坐标，两边错得一样就相互抵消。
 * 而用户看到的是**另一个渲染器**：Figma 读 `.fig` 后看到 `stackMode` 就用自己的
 * auto-layout 引擎重算，完全忽略我们写的 `transform`。
 *
 * 所以这里用 `helpers/figma-layout.ts`（按 Figma 规则独立实现的布局器）重算一遍，
 * 再与 `.fig` 里写的坐标/尺寸比对。差异 0 = 两边看到的是同一个画面。
 *
 * 这套检测器抓到过的真实缺陷（每条都在下面留了针对性用例）：
 *   1. 导出侧自己写了一套布局（`measureTree` + `layoutChildren`），与编辑器的
 *      `resolveLayout` 不是同一个 —— SPACE_BETWEEN 排成紧凑、主轴 FILL 不分摊
 *   2. `FILL` 被写成 `RESIZE_TO_FIT_WITH_IMPLICIT_SIZE`（Figma 按内容收缩）
 *   3. `position: FIXED/STICKY` 子项没标 `stackPositioning`（底栏被排到画框外）
 *   4. `mode: 'ABSOLUTE'` 子项没标 `stackPositioning`（装饰圆被按流排下去）
 *   5. `margin` 子项没标 `stackPositioning`（整块内容偏移 (-16,-40)）
 *   6. `position: 'ABSOLUTE'` 子项漏判（角标跟着流排到左边，偏 295px）
 *   7. HUG + min/max 约束写 `RESIZE_TO_FIT`（Figma 不认约束，底栏矮 40px）
 *   8. `flex-wrap: WRAP` 的换行位置对不上
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { unzipSync } from 'fflate';
import { exportFig } from '../src/fig/export';
import { loadFigCodec, type FigCodec } from '../src/fig/codec';
import { allDemoPages } from '../src/demo/pages';
import { createNode, createPage } from '../src/schema/factory';
import { auditLayout, type FigNodeLike } from './helpers/figma-layout';
import type { UIPage } from '../src/schema/types';

let codec: FigCodec;
beforeAll(async () => {
  codec = await loadFigCodec();
});

async function exportPage(page: UIPage): Promise<FigNodeLike[]> {
  const { bytes } = await exportFig([page], codec.encode, {
    fileName: page.name,
    exportedAt: '2026-01-01T00:00:00.000Z',
  });
  const canvas = (unzipSync(bytes) as Record<string, Uint8Array>)['canvas.fig']!;
  return codec.decode(canvas).nodeChanges as unknown as FigNodeLike[];
}

describe('Figma 排版与编辑器一致', () => {
  it('demo 19 页：按 Figma 规则重算后，每个节点的位置与尺寸都不变', async () => {
    const bad: string[] = [];
    for (const page of allDemoPages()) {
      const audit = auditLayout(await exportPage(page));
      if (audit.moved.length > 0) {
        bad.push(`${page.name} 位置不一致 ${audit.moved.length} 个：${audit.moved.slice(0, 3).map((r) => r.name).join(' | ')}`);
      }
      if (audit.sized.length > 0) {
        bad.push(`${page.name} 尺寸不一致 ${audit.sized.length} 个：${audit.sized.slice(0, 3).map((r) => r.name).join(' | ')}`);
      }
    }
    expect(bad).toEqual([]);
  });

  /**
   * `position: FIXED` 的子项必须脱流。
   *
   * 不写 `stackPositioning: 'ABSOLUTE'` 时，Figma 把底栏当普通流内子项排到内容末尾 ——
   * 实测 ironlog「今日」页的「底部导航」被排到 y=814，而视口只有 812 高，
   * 整个底栏落在画框外（用户看到的是「导航没了」）。
   */
  it('position: FIXED 的子项必须标 stackPositioning=ABSOLUTE', async () => {
    const page = createPage('固定定位', 375, 812);
    const bar = createNode('FRAME', { id: 'bar', name: '底栏' });
    Object.assign(bar.layout, {
      mode: 'HORIZONTAL',
      widthMode: 'FILL',
      heightMode: 'FIXED',
      height: 64,
      position: 'FIXED',
      stickyBottom: 0,
    });
    (bar as { children?: unknown[] }).children = [];
    page.root.children = [bar as never];

    const nodes = await exportPage(page);
    const figBar = nodes.find((n) => n.name === '底栏')!;
    expect(figBar.stackPositioning).toBe('ABSOLUTE');
    // 位置必须落在视口底：812 - 64 = 748
    expect(figBar.transform!.m12).toBe(748);
  });

  /**
   * `margin` 在 Figma 里没有原语（只有 padding，而 padding 作用在所有子项上）。
   * 不脱流的话整块内容偏移 —— 实测 ledger「概览」页四个区块统一偏 (-16,-40)。
   */
  it('带 margin 的子项必须脱流，且父容器不能是 HUG', async () => {
    const page = createPage('边距', 375, 812);
    const box = createNode('FRAME', { id: 'box', name: '卡片' });
    Object.assign(box.layout, {
      mode: 'VERTICAL',
      widthMode: 'HUG',
      heightMode: 'HUG',
      gap: 8,
      padding: [16, 16, 16, 16],
    });
    const inner = createNode('TEXT', { id: 'inner', name: '字' });
    Object.assign(inner.layout, { widthMode: 'HUG', heightMode: 'HUG', margin: [12, 16, 0, 16] });
    (inner as { text?: string }).text = '内容';
    (box as { children?: unknown[] }).children = [inner];
    page.root.children = [box as never];

    const nodes = await exportPage(page);
    const figBox = nodes.find((n) => n.name === '卡片')!;
    const figInner = nodes.find((n) => n.name === '字')!;
    // 带 margin 的子项必须脱流（Figma 没有 margin 原语）
    expect(figInner.stackPositioning).toBe('ABSOLUTE');
    // 父容器有 margin 子项 → 脱流子项不计入 Hug，父尺寸必须写 FIXED
    expect(figBox.stackPrimarySizing).toBe('FIXED');
    expect(figBox.stackCounterSizing).toBe('FIXED');
    // 位置照旧：margin 已被 `resolveLayout` 算进坐标里，父 padding 之上再偏移
    expect(figInner.transform!.m02).toBe(16 + 16);
    expect(figInner.transform!.m12).toBe(16 + 12);
  });

  /**
   * `flex-wrap: WRAP` 的换行位置。容器宽度装不下第三个卡时，Figma 必须换行到第二行；
   * 导出漏写 `stackWrap` 的话三个卡会挤在一行，后面的兄弟全错位。
   */
  it('flex-wrap: WRAP 的换行位置与编辑器一致', async () => {
    const page = createPage('折行', 375, 812);
    const row = createNode('FRAME', { id: 'row', name: '横滑' });
    Object.assign(row.layout, {
      mode: 'HORIZONTAL',
      widthMode: 'FIXED',
      heightMode: 'HUG',
      width: 375,
      padding: [0, 20, 0, 20],
      gap: 12,
      wrap: 'WRAP',
    });
    const cards = [1, 2, 3].map((i) => {
      const c = createNode('FRAME', { id: `c${i}`, name: `卡${i}` });
      Object.assign(c.layout, { mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 136, height: 189 });
      (c as { children?: unknown[] }).children = [];
      return c;
    });
    (row as { children?: unknown[] }).children = cards;
    page.root.children = [row as never];

    const nodes = await exportPage(page);
    expect(nodes.find((n) => n.name === '横滑')!.stackWrap).toBe('WRAP');
    const audit = auditLayout(nodes);
    expect(audit.moved).toEqual([]);
    expect(audit.sized).toEqual([]);
    // 第三张卡必须换到第二行：y = 第一行高 189 + 行间距 12
    const c3 = nodes.find((n) => n.name === '卡3')!;
    expect(c3.transform!.m12).toBe(201);
  });
});
