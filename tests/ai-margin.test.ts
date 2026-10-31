import { describe, it, expect } from 'vitest';
import { parseClassNames } from '../src/editor/ai/tailwind';
import { draftToPage } from '../src/editor/ai/specToPage';
import type { AiPageDraft } from '../src/editor/ai/types';
import { PACKS } from '../src/tokens/packs';

/**
 * margin 是「字段在、通道不在」的第二个实例（第一个是 decorations/states/grid/transform）：
 * `LayoutSchema.margin` 一直存在、`compile.ts` 一直在出码，
 * 但 AI 通道的两个入口都没有它，模型写 `mt-4` 就进违例清单。
 * 实测（`docs/ai-ab-report.md` 附录 C）首轮 4 条违例里 3 条是它。
 */

const pack = PACKS[0];

describe('className 的 margin 解析', () => {
  it('单边 mt-4 → [16,0,0,0]', () => {
    expect(parseClassNames('mt-4').layout.margin).toEqual([16, 0, 0, 0]);
  });

  it('mx-4 → 左右 [0,16,0,16]', () => {
    expect(parseClassNames('mx-4').layout.margin).toEqual([0, 16, 0, 16]);
  });

  it('m-4 → 四边', () => {
    expect(parseClassNames('m-4').layout.margin).toEqual([16, 16, 16, 16]);
  });

  it('mx-4 py-2 同时生效，互不覆盖', () => {
    const r = parseClassNames('mx-4 py-2');
    expect(r.layout.margin).toEqual([0, 16, 0, 16]);
    // py 只设上下，所以 padding 的左右仍是 0——margin 与 padding 是两套独立的四元组
    expect(r.layout.padding).toEqual([8, 0, 8, 0]);
    expect(r.unknown).toHaveLength(0);
  });

  it('长前缀优先：mb-4 不被 m 抢走', () => {
    expect(parseClassNames('mb-4').layout.margin).toEqual([0, 0, 16, 0]);
  });

  it('多边叠加：mt-2 mb-4 → [8,0,16,0]', () => {
    expect(parseClassNames('mt-2 mb-4').layout.margin).toEqual([8, 0, 16, 0]);
  });

  it('m*-auto 进 unknown（BoxPadding 表达不了 auto）', () => {
    const r = parseClassNames('mx-auto');
    expect(r.unknown).toContain('mx-auto');
    expect(r.layout.margin).toBeUndefined();
  });

  it('任意值 m-[12px] 可用', () => {
    expect(parseClassNames('m-[12px]').layout.margin).toEqual([12, 12, 12, 12]);
  });
});

describe('端到端：写 mt-4 不再产生违例', () => {
  const draft = {
    kind: 'page',
    name: 'margin 测试',
    width: 375,
    height: 812,
    background: '@color.background',
    root: {
      kind: 'FRAME',
      layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG' },
      children: [
        { kind: 'FRAME', name: '卡片', className: 'mt-4 mx-4 p-4 rounded-xl bg-card' },
        { kind: 'FRAME', name: '区块', className: 'mb-6 px-4' },
      ],
    },
  } as unknown as AiPageDraft;

  it('零违例，且 margin 真的落到了 AST', () => {
    const built = draftToPage(draft, { pack });
    const detail = built.violations.map((v) => `${v.path}: ${v.message}`).join(' | ');
    expect(built.violations, detail).toHaveLength(0);
    expect(built.page.root.children[0].layout.margin).toEqual([16, 16, 0, 16]);
    expect(built.page.root.children[1].layout.margin).toEqual([0, 0, 24, 0]);
  });

  it('反向：写 mx-auto 仍然报违例，且提示里给了替代方案', () => {
    const bad = {
      ...draft,
      root: { ...draft.root, children: [{ kind: 'FRAME', name: 'x', className: 'mx-auto w-full' }] },
    } as unknown as AiPageDraft;
    const built = draftToPage(bad, { pack });
    const text = built.violations.map((v) => v.message).join(' ');
    expect(built.violations.length).toBeGreaterThan(0);
    expect(text).toMatch(/m\*-auto|items-center/);
  });
});

describe('AiLayoutSpec.margin 显式字段', () => {
  it('layout.margin 也能写，且与 className 的合并顺序一致', () => {
    const draft = {
      kind: 'page',
      name: 't',
      width: 375,
      height: 812,
      background: '@color.background',
      root: {
        kind: 'FRAME',
        layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG' },
        children: [
          { kind: 'FRAME', name: '卡', className: 'mt-4', layout: { margin: [0, 0, 0, 32] } },
        ],
      },
    } as unknown as AiPageDraft;
    const built = draftToPage(draft, { pack });
    // 显式 layout 覆盖 className（与既有优先级一致）
    expect(built.page.root.children[0].layout.margin).toEqual([0, 0, 0, 32]);
  });
});
