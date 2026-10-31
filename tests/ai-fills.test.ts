import { describe, expect, it } from 'vitest';
import { buildStyle, draftToPage } from '../src/editor/ai/specToPage';
import { validateAiOutput } from '../src/editor/ai/contract';
import { STYLE_RECIPES } from '../src/editor/ai/styleRecipes';
import { compilePage } from '../src/compiler/compile';
import { generateHtml } from '../src/generator/html';
import { PACKS } from '../src/tokens/packs';
import type { AiNodeSpec, AiPageDraft, AiViolation } from '../src/editor/ai/types';

const pack = PACKS[0];
const primary = pack.colors.primary;
const accent = pack.colors.accent ?? pack.colors.primary;

function build(spec: AiNodeSpec['style']): { style: ReturnType<typeof buildStyle>; violations: AiViolation[] } {
  const violations: AiViolation[] = [];
  const style = buildStyle(spec, pack, 'root.style', violations);
  return { style, violations };
}

/**
 * `fills` 是 `AiStyleSpec` 相对 `StyleSchema` 唯一的真表达力缺口——
 * AST 与出码早就有（多层渐变），只差 AI 通道。这里逐项锁住搬运规则。
 */
describe('fills 搬运：线性渐变', () => {
  it('令牌引用被解析成 hex，stops 保序', () => {
    const { style, violations } = build({
      fills: [
        {
          type: 'GRADIENT_LINEAR',
          angle: 135,
          stops: [
            { position: 0, color: '@color.primary' },
            { position: 1, color: '@color.accent' },
          ],
        },
      ],
    });
    expect(violations).toHaveLength(0);
    expect(style.fills).toHaveLength(1);
    expect(style.fills?.[0]).toMatchObject({ type: 'GRADIENT_LINEAR', angle: 135 });
    expect(style.fills?.[0].stops?.map((s) => s.color)).toEqual([primary, accent]);
  });

  it('stops 写反了会被排好（顺序决定过渡方向，不报违例）', () => {
    const { style } = build({
      fills: [
        {
          type: 'GRADIENT_LINEAR',
          stops: [
            { position: 1, color: '@color.accent' },
            { position: 0, color: '@color.primary' },
          ],
        },
      ],
    });
    expect(style.fills?.[0].stops?.map((s) => s.position)).toEqual([0, 1]);
  });

  it('停靠点 opacity 与层 opacity 都保留', () => {
    const { style } = build({
      fills: [
        {
          type: 'GRADIENT_LINEAR',
          opacity: 0.9,
          stops: [
            { position: 0, color: '@color.primary', opacity: 0.35 },
            { position: 1, color: '@color.background', opacity: 0 },
          ],
        },
      ],
    });
    expect(style.fills?.[0].opacity).toBe(0.9);
    expect(style.fills?.[0].stops?.[0].opacity).toBe(0.35);
  });

  it('visible:false 被保留（用于临时关掉某层）', () => {
    const { style } = build({
      fills: [
        { type: 'SOLID', color: '@color.primary', visible: false },
        { type: 'SOLID', color: '@color.accent' },
      ],
    });
    expect(style.fills?.[0].visible).toBe(false);
  });
});

describe('fills 搬运：丢弃规则都报违例', () => {
  it('渐变 stops 少于 2 个 → 报违例并丢弃该层', () => {
    const { style, violations } = build({
      fills: [{ type: 'GRADIENT_LINEAR', stops: [{ position: 0, color: '@color.primary' }] }],
    });
    expect(style.fills).toBeUndefined();
    expect(violations).toHaveLength(1);
    expect(violations[0].path).toBe('root.style.fills[0].stops');
    expect(violations[0].message).toContain('2 个 stops');
  });

  it('SOLID 没给 color → 报违例并丢弃', () => {
    const { style, violations } = build({ fills: [{ type: 'SOLID' }] });
    expect(style.fills).toBeUndefined();
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('SOLID');
  });

  it('未知令牌 → 报 token 违例，有效颜色不足 2 个则整层丢弃', () => {
    const { style, violations } = build({
      fills: [
        {
          type: 'GRADIENT_LINEAR',
          stops: [
            { position: 0, color: '@color.不存在的令牌' },
            { position: 1, color: '@color.不存在的令牌2' },
          ],
        },
      ],
    });
    expect(style.fills).toBeUndefined();
    expect(violations.some((v) => v.kind === 'token')).toBe(true);
  });

  it('多层里坏一层，好的一层仍然保留', () => {
    const { style } = build({
      fills: [
        { type: 'GRADIENT_LINEAR', stops: [{ position: 0, color: '@color.primary' }] },
        { type: 'SOLID', color: '@color.accent' },
      ],
    });
    expect(style.fills).toHaveLength(1);
    expect(style.fills?.[0].type).toBe('SOLID');
  });
});

describe('fills 与 background 共存', () => {
  it('两个都写时各自保留（background 是渐变下面的底色）', () => {
    const { style } = build({
      background: '@color.card',
      fills: [
        {
          type: 'GRADIENT_LINEAR',
          stops: [
            { position: 0, color: '@color.primary' },
            { position: 1, color: '@color.accent' },
          ],
        },
      ],
    });
    expect(style.background).toBe(pack.colors.card);
    expect(style.fills).toHaveLength(1);
  });
});

describe('fills 进交互态', () => {
  it('hover 态可以换渐变底', () => {
    const { style, violations } = build({
      states: {
        hover: {
          fills: [
            {
              type: 'GRADIENT_LINEAR',
              stops: [
                { position: 0, color: '@color.accent' },
                { position: 1, color: '@color.primary' },
              ],
            },
          ],
        },
      },
    });
    expect(violations).toHaveLength(0);
    expect(style.states?.hover?.fills).toHaveLength(1);
  });
});

describe('fills 端到端', () => {
  const draft = {
    kind: 'page',
    name: '渐变测试',
    width: 375,
    height: 812,
    background: '@color.background',
    root: {
      kind: 'FRAME',
      className: 'flex-col w-full p-4',
      children: [
        {
          kind: 'FRAME',
          name: '主按钮',
          className: 'h-12 rounded-xl',
          style: {
            fills: [
              {
                type: 'GRADIENT_LINEAR',
                angle: 135,
                stops: [
                  { position: 0, color: '@color.primary' },
                  { position: 1, color: '@color.accent' },
                ],
              },
            ],
          },
        },
      ],
    },
  } as unknown as AiPageDraft;

  it('契约校验通过（additionalProperties:false 认这个新字段）', () => {
    const checked = validateAiOutput(draft, { expect: 'page', pack });
    const detail = checked.violations.map((v) => `${v.path}: ${v.message}`).join(' | ');
    expect(checked.ok, detail).toBe(true);
  });

  it('落地 AST 里有 fills，且出码成 CSS 渐变', () => {
    const built = draftToPage(draft, { pack });
    expect(built.violations).toHaveLength(0);
    const btn = built.page.root.children[0];
    expect(btn.style?.fills).toHaveLength(1);
    const html = generateHtml(built.page, compilePage(built.page), { title: 't' });
    expect(html).toMatch(/linear-gradient/);
    expect(html).toContain(primary);
  });
});

describe('配方里的渐变样例', () => {
  it('每条 fills 配方都能过契约并落地出渐变', () => {
    const ids = ['gradient-fill', 'layered-fill', 'radial-glow'];
    for (const id of ids) {
      const recipe = STYLE_RECIPES.find((r) => r.id === id);
      expect(recipe, `缺配方 ${id}`).toBeTruthy();
      const node = JSON.parse(recipe!.json) as AiNodeSpec;
      const draft = {
        kind: 'page',
        name: 't',
        width: 375,
        height: 812,
        background: '@color.background',
        root: { kind: 'FRAME', className: 'flex-col w-full', children: [node] },
      } as unknown as AiPageDraft;
      const checked = validateAiOutput(draft, { expect: 'page', pack });
      const detail = checked.violations.map((v) => `${v.path}: ${v.message}`).join(' | ');
      expect(checked.ok, `${id}: ${detail}`).toBe(true);
      const built = draftToPage(draft, { pack });
      expect(built.violations, id).toHaveLength(0);
      expect(built.page.root.children[0].style?.fills?.length, id).toBeGreaterThan(0);
    }
  });
});
