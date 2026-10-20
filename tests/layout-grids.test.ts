import { describe, expect, it } from 'vitest';
import { compilePage } from '../src/compiler/compile';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { ContainerNode, LayoutGridSchema, UIPage } from '../src/schema/types';

resetIdSeq(0);

/**
 * #4b Layout grids 独立分区（2026-10-20）。
 *
 * 缺陷背景：`layoutGrids` 原先只有**引用 GRID 样式**时才会经 `tokens.ts` 产出 CSS 变量；
 * 右栏直接设置（无样式引用）时产物为空——实测「添加网格后 preview.html 找不到任何 grid」。
 * 现补上直出路径，本测试锁定该行为与出码形状。
 */
function pageWithGrids(grids: LayoutGridSchema[]): UIPage {
  const page = createPage('网格回归');
  const frame = createNode('FRAME') as ContainerNode;
  frame.layout = { ...frame.layout, widthMode: 'FIXED', heightMode: 'FIXED', width: 375, height: 400 };
  frame.style = { ...(frame.style ?? {}), layoutGrids: grids };
  page.root.children.push(frame);
  return page;
}

function css(page: UIPage): string {
  const compiled = compilePage(page);
  return compiled.nodes
    .map((n) => Object.entries(n.css).map(([k, v]) => `${k}:${v}`).join(';'))
    .join('\n');
}

describe('#4b Layout grids 直出（无样式引用）', () => {
  it('COLUMNS 网格 → 产出 repeating-linear-gradient(to right, ...)', () => {
    const out = css(pageWithGrids([{ pattern: 'COLUMNS', count: 4, gutter: 16, visible: true }]));
    expect(out).toContain('background-image');
    expect(out).toContain('repeating-linear-gradient(to right');
    expect(out).toContain('16px');
  });

  it('ROWS 网格 → 产出 repeating-linear-gradient(to bottom, ...)', () => {
    const out = css(pageWithGrids([{ pattern: 'ROWS', count: 3, gutter: 24, visible: true }]));
    expect(out).toContain('repeating-linear-gradient(to bottom');
    expect(out).toContain('24px');
  });

  it('GRID 网格 → 两条轴叠加（to right + to bottom）', () => {
    const out = css(pageWithGrids([{ pattern: 'GRID', offset: 8, visible: true }]));
    expect(out).toContain('to right');
    expect(out).toContain('to bottom');
  });

  it('visible=false 的网格不产出', () => {
    const out = css(pageWithGrids([{ pattern: 'COLUMNS', count: 4, gutter: 16, visible: false }]));
    expect(out).not.toContain('repeating-linear-gradient');
  });

  it('空网格数组不产出背景层', () => {
    const out = css(pageWithGrids([]));
    expect(out).not.toContain('repeating-linear-gradient');
  });

  it('网格叠加在填充之上（背景层首项是网格）', () => {
    const page = pageWithGrids([{ pattern: 'COLUMNS', count: 4, gutter: 12, visible: true }]);
    const frame = (page.root as ContainerNode).children[0] as ContainerNode & { style: Record<string, unknown> };
    frame.style = { ...frame.style, background: '#ffffff' };
    const out = css(page);
    expect(out).toContain('repeating-linear-gradient');
    // 有填充时背景色仍保留（background-color 与 background-image 分层不冲突）
    expect(out).toContain('background-color');
  });
});
