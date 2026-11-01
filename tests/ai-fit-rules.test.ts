/**
 * 四条「短文案/满宽/横向行」规则的单测（2026-11-01 S5 收尾补）
 *
 * 这四条此前**只有量测证据**（`ui-measure` 从 65 条降到 0），没有单测锁定。
 * 量测证据的问题是不可回归：模型换一批样本、页面对不上，就再也证明不了规则还在跑。
 * 这里每条都给一个正例（必须改）和一个反例（不许动），撤掉规则时正例会变红。
 *
 * 四条规则都在 `normalizePage` 里，走 `draftToPage` 就能测到 —— 不需要 `rawPage` 绕过，
 * 因为它们本身**不报违例**（翻译成功就静默），没有「normalize 会把它修掉」的问题。
 */

import { describe, expect, it } from 'vitest';
import { draftToPage } from '../src/editor/ai/specToPage';
import type { AiPageDraft } from '../src/editor/ai/types';
import type { UINode, UIPage } from '../src/schema/types';
import { getPack } from '../src/tokens/packs';

const pack = getPack('shadcn');

/** 造单页：children 挂在 root 下（root 的 layout 会被视口覆盖，别指望它） */
function build(children: unknown[]): UIPage {
  const draft = {
    kind: 'page',
    name: '规则页',
    root: { kind: 'FRAME', name: 'root', children },
  } as unknown as AiPageDraft;
  return draftToPage(draft, { pack }).page;
}

const find = (page: UIPage, name: string): UINode => {
  const go = (n: UINode): UINode | null => {
    if (n.name === name) return n;
    for (const c of (n as { children?: UINode[] }).children ?? []) {
      const hit = go(c);
      if (hit) return hit;
    }
    return null;
  };
  const hit = go(page.root);
  if (!hit) throw new Error(`找不到节点 ${name}`);
  return hit;
};

/* =============================================================
 * normalizeTextFit
 * ============================================================= */

describe('normalizeTextFit（FILL 短文案设 min-width 防折行）', () => {
  it('正例：FILL 的 5 字按钮 → 拿到 min-width ≥ 文案宽', () => {
    const page = build([
      {
        kind: 'FRAME',
        name: '行',
        layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 8 },
        children: [
          {
            kind: 'BUTTON',
            name: '主按钮',
            text: '加入购物车',
            layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FIXED', height: 48, padding: [0, 12, 0, 12] },
            style: { fontSize: 14 },
          },
        ],
      },
    ]);
    const btn = find(page, '主按钮');
    // 5 个汉字 × 14px = 70，加左右 padding 24 + 2 余量 = 96
    expect(btn.layout.minWidth).toBeGreaterThanOrEqual(96);
  });

  it('反例：同一句话但 widthMode=FIXED → 不设 min-width（定宽是有意的）', () => {
    const page = build([
      {
        kind: 'BUTTON',
        name: '定宽按钮',
        text: '加入购物车',
        layout: { mode: 'HORIZONTAL', widthMode: 'FIXED', width: 200, heightMode: 'FIXED', height: 48 },
        style: { fontSize: 14 },
      },
    ]);
    expect(find(page, '定宽按钮').layout.minWidth).toBeUndefined();
  });

  it('反例：超过 10 字的正文 → 不设（长文案本来就该折行）', () => {
    const page = build([
      {
        kind: 'TEXT',
        name: '正文',
        text: '这是一段超过十个字的说明文字',
        layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG' },
        style: { fontSize: 14 },
      },
    ]);
    expect(find(page, '正文').layout.minWidth).toBeUndefined();
  });
});

/* =============================================================
 * normalizeButtonPadding
 * ============================================================= */

describe('normalizeButtonPadding（短文案按钮内边距收到 ≤12）', () => {
  it('正例：4 字按钮左右 20 → 收到 12', () => {
    const page = build([
      {
        kind: 'BUTTON',
        name: '短按钮',
        text: '立即购买',
        layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FIXED', height: 44, padding: [0, 20, 0, 20] },
        style: { fontSize: 14 },
      },
    ]);
    expect(find(page, '短按钮').layout.padding).toEqual([0, 12, 0, 12]);
  });

  it('反例：长文案（>6 字）的内边距不动', () => {
    const page = build([
      {
        kind: 'BUTTON',
        name: '长按钮',
        text: '同意并继续下一步',
        layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FIXED', height: 44, padding: [0, 20, 0, 20] },
        style: { fontSize: 14 },
      },
    ]);
    expect(find(page, '长按钮').layout.padding).toEqual([0, 20, 0, 20]);
  });
});

/* =============================================================
 * normalizeMinWidthUp
 * ============================================================= */

describe('normalizeMinWidthUp（子项 min-width 汇总到横向容器）', () => {
  it('正例：两个都有 min-width 的按钮 → 父容器拿到 之和 + gap', () => {
    const page = build([
      {
        kind: 'FRAME',
        name: '按钮组',
        layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 12 },
        children: [
          {
            kind: 'BUTTON',
            name: '左',
            text: '加入购物车',
            layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FIXED', height: 44, padding: [0, 12, 0, 12] },
            style: { fontSize: 14 },
          },
          {
            kind: 'BUTTON',
            name: '右',
            text: '立即购买',
            layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FIXED', height: 44, padding: [0, 12, 0, 12] },
            style: { fontSize: 14 },
          },
        ],
      },
    ]);
    const left = find(page, '左').layout.minWidth ?? 0;
    const right = find(page, '右').layout.minWidth ?? 0;
    expect(left).toBeGreaterThan(0);
    expect(find(page, '按钮组').layout.minWidth).toBe(left + right + 12);
  });

  it('反例：只有一个子项有 min-width → 不汇总（算不准，宁可不设）', () => {
    const page = build([
      {
        kind: 'FRAME',
        name: '混合组',
        layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 8 },
        children: [
          {
            kind: 'BUTTON',
            name: '有下限',
            text: '加入购物车',
            layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FIXED', height: 44 },
            style: { fontSize: 14 },
          },
          { kind: 'TEXT', name: '没下限', text: '说明', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' }, style: { fontSize: 12 } },
        ],
      },
    ]);
    expect(find(page, '混合组').layout.minWidth).toBeUndefined();
  });
});

/* =============================================================
 * normalizeFullWidthChild
 * ============================================================= */

describe('normalizeFullWidthChild（带内边距的满宽容器里，写死页面宽的子树项改 FILL）', () => {
  it('正例：父 FILL + padding 12，子项写死 343（= 375-32）→ 改 FILL', () => {
    const page = build([
      {
        kind: 'FRAME',
        name: '骨架卡',
        layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', padding: [12, 12, 12, 12], gap: 8 },
        children: [
          { kind: 'RECTANGLE', name: '封面占位', layout: { mode: 'VERTICAL', widthMode: 'FIXED', width: 343, heightMode: 'FIXED', height: 120 } },
        ],
      },
    ]);
    expect(find(page, '封面占位').layout.widthMode).toBe('FILL');
  });

  it('反例：子项只有 100 宽（不是「想占满整行」）→ 不动', () => {
    const page = build([
      {
        kind: 'FRAME',
        name: '卡片',
        layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', padding: [12, 12, 12, 12], gap: 8 },
        children: [
          { kind: 'RECTANGLE', name: '缩略图', layout: { mode: 'VERTICAL', widthMode: 'FIXED', width: 100, heightMode: 'FIXED', height: 100 } },
        ],
      },
    ]);
    expect(find(page, '缩略图').layout.widthMode).toBe('FIXED');
  });
});

/* =============================================================
 * normalizeHScroll
 * ============================================================= */

describe('normalizeHScroll（横向行装不下 → flex-shrink:0 + 换行）', () => {
  it('正例：5 张 140px 卡放在一行（700 > 375）→ shrink 0 且 wrap', () => {
    const cards = Array.from({ length: 5 }, (_, i) => ({
      kind: 'FRAME',
      name: `卡${i + 1}`,
      layout: { mode: 'VERTICAL', widthMode: 'FIXED', width: 140, heightMode: 'HUG' },
      children: [{ kind: 'TEXT', name: '标题', text: '自动布局映射', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } }],
    }));
    const page = build([
      {
        kind: 'FRAME',
        name: '横滚行',
        layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 12 },
        children: cards,
      },
    ]);
    const row = find(page, '横滚行');
    expect(row.layout.wrap).toBe('WRAP');
    for (let i = 1; i <= 5; i += 1) expect(find(page, `卡${i}`).layout.flexShrink).toBe(0);
  });

  it('反例：3 张 100px 卡（300 < 375）→ 不动', () => {
    const cards = Array.from({ length: 3 }, (_, i) => ({
      kind: 'FRAME',
      name: `小卡${i + 1}`,
      layout: { mode: 'VERTICAL', widthMode: 'FIXED', width: 100, heightMode: 'HUG' },
      children: [{ kind: 'TEXT', name: '字', text: '一', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } }],
    }));
    const page = build([
      {
        kind: 'FRAME',
        name: '正常行',
        layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 12 },
        children: cards,
      },
    ]);
    expect(find(page, '正常行').layout.wrap).toBeUndefined();
    expect(find(page, '小卡1').layout.flexShrink).toBeUndefined();
  });

  it('反例：子项是 FILL（不靠固定宽排版）→ 不动', () => {
    const page = build([
      {
        kind: 'FRAME',
        name: '等分行',
        layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 12 },
        children: [
          { kind: 'FRAME', name: 'A', layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG' }, children: [{ kind: 'TEXT', name: 'a', text: '一', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } }] },
          { kind: 'FRAME', name: 'B', layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG' }, children: [{ kind: 'TEXT', name: 'b', text: '二', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } }] },
          { kind: 'FRAME', name: 'C', layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG' }, children: [{ kind: 'TEXT', name: 'c', text: '三', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } }] },
        ],
      },
    ]);
    expect(find(page, '等分行').layout.wrap).toBeUndefined();
  });
});
