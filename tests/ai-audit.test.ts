import { describe, expect, it } from 'vitest';
import { auditDraft, auditPage, auditSpec, formatMetrics, HIGHER_IS_BETTER } from '../src/editor/ai/audit';
import { draftToPage } from '../src/editor/ai/specToPage';
import { PACKS } from '../src/tokens/packs';
import type { AiPageDraft } from '../src/editor/ai/types';

const pack = PACKS[0];

/**
 * 结构指标是 P0-2 的「量尺」——所有关于「改动有没有让生成变差」的判断都建在它上面。
 * 量尺本身算错，后面全是错的。所以这里逐项验，而不是只看总数。
 */

const draft = {
  kind: 'page',
  name: '指标测试',
  width: 375,
  height: 812,
  background: '@color.background',
  root: {
    kind: 'FRAME',
    className: 'flex-col w-full p-4 gap-3',
    children: [
      {
        kind: 'FRAME',
        name: '卡片',
        className: 'rounded-xl p-4',
        style: {
          effects: [
            { kind: 'DROP_SHADOW', x: 0, y: 8, blur: 24, color: 'rgba(0,0,0,0.12)' },
            { kind: 'DROP_SHADOW', x: 0, y: 2, blur: 4, color: 'rgba(0,0,0,0.08)' },
          ],
          decorations: [{ kind: 'SPOTLIGHT', intensity: 0.6 }],
          states: { hover: { background: '@color.muted' } },
        },
        children: [
          { kind: 'TEXT', text: '标题文案', className: 'text-lg font-bold' },
          {
            kind: 'FRAME',
            name: '网格',
            style: { grid: { columns: 'repeat(3, 1fr)', columnGap: 8 } },
            children: [{ kind: 'TEXT', text: '{{index}}', repeat: { count: 6 } }],
          },
          { kind: 'FRAME', name: '变换', style: { transform: { rotate: 8 } } },
        ],
      },
    ],
  },
} as unknown as AiPageDraft;

describe('auditSpec（模型视角，repeat 未展开）', () => {
  const m = auditSpec(draft.root);

  it('统计节点数与各类型计数', () => {
    // root + 卡片 + 标题 + 网格 + 变换 + 模板 TEXT
    expect(m.nodes).toBe(6);
    expect(m.kinds.FRAME).toBe(4);
    expect(m.kinds.TEXT).toBe(2);
  });

  it('看到 repeat 的使用', () => {
    expect(m.repeatNodes).toBe(1);
  });

  it('文本字数按字符累加', () => {
    // 「标题文案」4 + 「{{index}}」9
    expect(m.textChars).toBe(13);
  });
});

describe('auditPage（落地视角，repeat 已展开）', () => {
  const built = draftToPage(draft, { pack });
  const m = auditPage(built.page);

  it('repeat 展开后节点数变多，repeatNodes 归零', () => {
    // PAGE 根 + 卡片 + 标题 + 网格 + 变换 + 展开出的 6 个 TEXT = 11
    // （draft.root 是页面内容根，本身不产生节点，所以 spec 的 5 个里少了它）
    expect(m.nodes).toBe(11);
    expect(m.repeatNodes).toBe(0);
  });

  it('阴影按节点数与条目数分开统计', () => {
    expect(m.effectNodes).toBe(1);
    expect(m.effectCount).toBe(2);
  });

  it('装饰层被统计，并记下类型', () => {
    expect(m.decorationNodes).toBe(1);
    expect(m.decorationKinds).toEqual(['SPOTLIGHT']);
  });

  it('交互态、网格、变换各自计数', () => {
    expect(m.statesNodes).toBe(1);
    expect(m.gridNodes).toBe(1);
    expect(m.transformNodes).toBe(1);
  });

  it('圆角与字号从 className 解析后进入统计（不是从 style 对象）', () => {
    expect(m.radii).toContain(12); // rounded-xl
    expect(m.fontSizes.length).toBeGreaterThan(0); // text-lg
  });

  it('颜色是令牌解析后的 hex，不是 @token 字面量', () => {
    expect(m.colors.every((c) => !c.startsWith('@'))).toBe(true);
  });

  it('描边节点数按有 border 的节点算', () => {
    expect(m.borderNodes).toBe(0);
  });
});

describe('指标口径自身', () => {
  it('auditDraft 与 auditSpec(draft.root) 等价', () => {
    expect(auditDraft(draft)).toEqual(auditSpec(draft.root));
  });

  it('无 repeat 时两个视角节点数一致（root 是页面内容根，不额外产生节点）', () => {
    const simple = {
      kind: 'page',
      name: 't',
      root: { kind: 'FRAME', children: [{ kind: 'TEXT', text: 'x' }] },
    } as unknown as AiPageDraft;
    expect(auditSpec(simple.root).nodes).toBe(2); // FRAME + TEXT
    expect(auditPage(draftToPage(simple, { pack }).page).nodes).toBe(2); // PAGE + TEXT
  });

  it('「越大越好」清单里的指标都是数值型', () => {
    const m = auditPage(draftToPage(draft, { pack }).page);
    for (const key of HIGHER_IS_BETTER) expect(typeof m[key]).toBe('number');
  });

  it('formatMetrics 输出稳定（脚本与测试共用同一格式）', () => {
    const m = auditPage(draftToPage(draft, { pack }).page);
    expect(formatMetrics(m)).toContain('节点 ');
    expect(formatMetrics(m)).toContain('装饰节点 ');
  });
});
