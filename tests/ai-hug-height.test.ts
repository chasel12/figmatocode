import { describe, it, expect } from 'vitest';
import { draftToPage } from '../src/editor/ai/specToPage';
import type { AiNodeSpec, AiPageDraft } from '../src/editor/ai/types';
import type { UINode, UIPage } from '../src/schema/types';
import { PACKS } from '../src/tokens/packs';

const pack = PACKS[0];

const kids = (n: UINode): UINode[] => ('children' in n ? (n as { children: UINode[] }).children : []);

function build(child: AiNodeSpec): { page: UIPage; first: UINode } {
  const draft: AiPageDraft = {
    kind: 'page',
    name: 'hug',
    width: 375,
    height: 812,
    root: { kind: 'FRAME', layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG' }, children: [child] },
  };
  const { page } = draftToPage(draft, { pack });
  return { page, first: kids(page.root)[0] };
}

/**
 * `HUG + 显式高度` 的处置 —— 2026-11-01 真实模型实测的底栏被压扁。
 *
 * 编译层把 `HUG` 译成 `height: fit-content`，显式 `height` **整个丢掉**。
 * 模型的习惯写法是「底栏 height:64 + HUG」，于是底栏真的只剩内容高（实测 40px）：
 * 20px 图标 + 14px 文字挤满，文字底边落在视口第 811 行（视口 812），
 * 看起来就是「底栏文字被切了一半」。45 个 UI 场景里带底栏的页面全是这个形态。
 *
 * 修法是给它一个 `min-height` 地板：内容更矮时按声明值，内容更高时照常撑开。
 * **只做高度轴**：宽度轴有历史回归（品类栏 `HUG + 92` 落成固定宽会挤窄商品网格）。
 */
describe('HUG + 显式高度 → min-height 地板', () => {
  it('单轴 HUG + height：保留 HUG，同时落 min-height', () => {
    const { first } = build({
      kind: 'FRAME',
      name: '底栏',
      layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', height: 64 },
      children: [{ kind: 'TEXT', text: '首页', layout: { widthMode: 'HUG', heightMode: 'HUG' } }],
    });
    expect(first.layout.heightMode).toBe('HUG');
    expect(first.layout.minHeight).toBe(64);
  });

  it('不声明高度时不动它（别给所有 HUG 容器凭空加约束）', () => {
    const { first } = build({
      kind: 'FRAME',
      name: '容器',
      layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG' },
      children: [{ kind: 'TEXT', text: 'x', layout: { widthMode: 'HUG', heightMode: 'HUG' } }],
    });
    expect(first.layout.minHeight).toBeUndefined();
  });

  it('AI 契约里没有 minHeight 字段，地板直接取 height（max 只是防编辑管线带值进来）', () => {
    const { first } = build({
      kind: 'FRAME',
      name: '底栏',
      layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', height: 48 },
      children: [{ kind: 'TEXT', text: 'x', layout: { widthMode: 'HUG', heightMode: 'HUG' } }],
    });
    // draft 里的 minHeight 不是 AI 通道字段（模型写它会被契约拒），所以地板 = height
    expect(first.layout.minHeight).toBe(48);
  });

  it('两轴都是 HUG 且两轴都给了值 → 仍按 FIXED（既有规则不回归）', () => {
    const { first } = build({
      kind: 'FRAME',
      name: '卡片',
      layout: { mode: 'VERTICAL', widthMode: 'HUG', heightMode: 'HUG', width: 200, height: 120 },
      children: [{ kind: 'TEXT', text: 'x', layout: { widthMode: 'HUG', heightMode: 'HUG' } }],
    });
    expect(first.layout.widthMode).toBe('FIXED');
    expect(first.layout.heightMode).toBe('FIXED');
    expect(first.layout.minHeight).toBeUndefined();
  });

  it('宽度轴不落 minWidth（品类栏 HUG+92 会挤窄商品网格）', () => {
    const { first } = build({
      kind: 'FRAME',
      name: '品类栏',
      layout: { mode: 'VERTICAL', widthMode: 'HUG', heightMode: 'HUG', width: 92 },
      children: [{ kind: 'TEXT', text: 'x', layout: { widthMode: 'HUG', heightMode: 'HUG' } }],
    });
    expect(first.layout.minWidth).toBeUndefined();
  });
});
