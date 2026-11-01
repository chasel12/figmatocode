/**
 * `normalizeSticky`：贴底固定元素 → 根容器补 padding-bottom
 *
 * 这条规则的特殊之处：**它的 bug 在像素比对里完全看不见**。
 * `padding-bottom` 只影响可滚动范围的底部，视口顶部的截图一字不变。
 * 所以设计本身缺了这个 padding 时，产物忠实复现设计 → 像素 100% → 假绿。
 *
 * 因此这里的断言全部落在 **`root.layout.padding[2]` 的数值**上，
 * 不落在任何 CSS 或渲染结果上 —— 后者根本反映不出这个缺陷。
 */

import { describe, expect, it } from 'vitest';
import { draftToPage } from '../src/editor/ai/specToPage';
import { getPack } from '../src/tokens/packs';
import type { AiPageDraft } from '../src/editor/ai/types';

const pack = getPack('shadcn');

interface Opts {
  /** 底栏高度 */
  barHeight?: number;
  /** 底栏定位方式 */
  position?: 'FIXED' | 'STICKY' | null;
  /** 底栏的 y（贴底时 = 视口高 - 高） */
  y?: number | null;
  stickyBottom?: number;
  /** 根容器已有的 padding-bottom */
  rootPadBottom?: number;
  /** 视口高（root 的 height） */
  viewportHeight?: number;
}

function build(opts: Opts = {}): AiPageDraft {
  const {
    barHeight = 64,
    position = 'FIXED',
    y = 748,
    stickyBottom,
    rootPadBottom = 0,
    viewportHeight = 812,
  } = opts;

  const barLayout: Record<string, unknown> = {
    mode: 'HORIZONTAL',
    widthMode: 'FILL',
    heightMode: 'FIXED',
    height: barHeight,
  };
  if (position) barLayout.position = position;
  if (y != null) barLayout.y = y;
  if (stickyBottom != null) barLayout.stickyBottom = stickyBottom;

  return {
    kind: 'page',
    name: '底栏测试页',
    root: {
      kind: 'FRAME',
      name: 'root',
      layout: {
        mode: 'VERTICAL',
        widthMode: 'FIXED',
        heightMode: 'FIXED',
        width: 375,
        height: viewportHeight,
        padding: [0, 0, rootPadBottom, 0],
      },
      children: [
        {
          kind: 'FRAME',
          name: '内容',
          layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'FIXED', height: 700 },
          children: [{ kind: 'TEXT', name: '文案', text: '内容', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } }],
        },
        {
          kind: 'FRAME',
          name: '底部导航',
          layout: barLayout,
          children: [{ kind: 'TEXT', name: '首页', text: '首页', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } }],
        },
      ],
    },
  } as unknown as AiPageDraft;
}

const padBottom = (draft: AiPageDraft): number => {
  const { page } = draftToPage(draft, { pack });
  return page.root.layout.padding?.[2] ?? 0;
};

describe('normalizeSticky', () => {
  it('贴底底栏 64px + padding-bottom 0 → 补到 64', () => {
    expect(padBottom(build({ barHeight: 64, rootPadBottom: 0 }))).toBe(64);
  });

  it('底栏 68px → 补到 68（不是补 64 的固定值）', () => {
    expect(padBottom(build({ barHeight: 68, y: 744, rootPadBottom: 0 }))).toBe(68);
  });

  it('已有 padding-bottom 但不足（40 < 64）→ 补到 64，不是加到 104', () => {
    expect(padBottom(build({ barHeight: 64, rootPadBottom: 40 }))).toBe(64);
  });

  it('已有 padding-bottom 充足（80 ≥ 64）→ 一个字节都不动', () => {
    expect(padBottom(build({ barHeight: 64, rootPadBottom: 80 }))).toBe(80);
  });

  it('顶部固定栏（y=0，不贴底）→ 不补', () => {
    expect(padBottom(build({ barHeight: 56, y: 0 }))).toBe(0);
  });

  it('没有 y 但 stickyBottom=0 → 认定为贴底，补', () => {
    expect(padBottom(build({ barHeight: 64, y: null, stickyBottom: 0 }))).toBe(64);
  });

  it('没有 y 也没有 stickyBottom（默认贴顶）→ 不补', () => {
    expect(padBottom(build({ barHeight: 64, y: null }))).toBe(0);
  });

  it('非 FIXED（普通流内元素）→ 不补', () => {
    expect(padBottom(build({ barHeight: 64, position: null }))).toBe(0);
  });

  it('STICKY 不算 FIXED → 不补（sticky 仍占流，不需要预留）', () => {
    expect(padBottom(build({ barHeight: 64, position: 'STICKY' }))).toBe(0);
  });

  it('多个贴底栏取最高那个', () => {
    const draft = build({ barHeight: 64 });
    const root = (draft as unknown as { root: { children: { layout: Record<string, unknown> }[] } }).root;
    root.children.push({
      kind: 'FRAME',
      name: '播放条',
      layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FIXED', height: 88, position: 'FIXED', y: 724 },
    } as unknown as { layout: Record<string, unknown> });
    expect(padBottom(draft)).toBe(88);
  });

  it('其他三边 padding 原样保留', () => {
    const draft = build({ barHeight: 64 });
    const root = (draft as unknown as { root: { layout: { padding: number[] } } }).root;
    root.layout.padding = [12, 16, 0, 20];
    const { page } = draftToPage(draft, { pack });
    expect(page.root.layout.padding).toEqual([12, 16, 64, 20]);
  });
});
