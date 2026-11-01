/**
 * `bugscan` 检测器自检：每条都要有「正例必须命中」+「反例必须不命中」。
 *
 * **反例（pass fixture）比正例重要**，因为检测器最大的风险不是漏报而是误报 ——
 * 漏报只是少发现一个问题，误报会让整份报告失去可信度（`text-invisible` 第一版
 * 在 demo 的 3 条误报就是这个后果，原因见 `hasBackdropLayer` 的注释）。
 *
 * 这里用真实 `draftToPage` 管线构造页面（而不是手搓 `UIPage`），
 * 目的是让 fixture 与线上同源：如果 `normalize` 改了某个字段，测试会跟着变，
 * 而不是「手搓的 fixture 永远对」这种假绿。
 */

import { describe, expect, it } from 'vitest';
import { draftToPage } from '../src/editor/ai/specToPage';
import { BUG_DETECTORS, detectorById } from '../src/editor/ai/bugscan/detectors';
import { scanPages, countNodes } from '../src/editor/ai/bugscan';
import type { AiPageDraft } from '../src/editor/ai/types';
import type { UIPage } from '../src/schema/types';
import { getPack } from '../src/tokens/packs';
import { createNode, createPage } from '../src/schema/factory';
import type { ContainerNode, StyleSchema, UINode } from '../src/schema/types';

const pack = getPack('shadcn');

/** 造一个单页 draft，children 直接挂在 root 下（root 的 layout 会被 PAGE 视口覆盖） */
function page(children: unknown[], rootLayout: Record<string, unknown> = {}): UIPage {
  const draft = {
    kind: 'page',
    name: '审计页',
    root: {
      kind: 'FRAME',
      name: 'root',
      layout: { mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 375, height: 812, ...rootLayout },
      children,
    },
  } as unknown as AiPageDraft;
  return draftToPage(draft, { pack }).page;
}

/**
 * 直接造 `UIPage`，**不经过 `draftToPage`**。
 *
 * 用在「要测的形态会被 normalize 修掉」的场景：`text-invisible` 的正例是白字压白底，
 * 而 `normalizeInvisibleText` 会把它改成黑字 —— 走管线就永远测不到正例。
 * 这类检测器的定位是**回归基线**（证明 normalize 真的在跑），正例只能绕过它来构造。
 */
function rawPage(children: UINode[], rootStyle?: StyleSchema): UIPage {
  const p = createPage('审计页', 375, 812);
  p.root.children = children as ContainerNode['children'];
  if (rootStyle) p.root.style = rootStyle;
  return p;
}

const hitsOf = (p: UIPage, id: string) => {
  const d = detectorById(id);
  if (!d) throw new Error(`未注册的检测器 ${id}`);
  return d.check(p);
};

/* =============================================================
 * 注册表完整性
 * ============================================================= */

describe('检测器注册表', () => {
  it('每个 id 唯一', () => {
    const ids = BUG_DETECTORS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每条都有 rationale（报告要用它做表头）', () => {
    for (const d of BUG_DETECTORS) {
      expect(d.rationale.length, `${d.id} 缺 rationale`).toBeGreaterThan(10);
    }
  });

  it('scanPages 会把每个检测器都调用一遍（防注册表接错）', () => {
    const summary = scanPages([page([])]);
    expect(summary.silent).toEqual([]);
  });

  it('单个检测器抛异常不中断整轮，但会被记录', () => {
    const bomb = {
      id: 'bomb',
      title: '故意抛异常',
      severity: 'bug' as const,
      rationale: '测试用：验证异常不会吞掉其它检测器的结果',
      check: () => {
        throw new Error('boom');
      },
    };
    const summary = scanPages([page([])], [bomb, detectorById('gap-scatter')!]);
    expect(summary.pages[0].hits[0].detail).toContain('boom');
    expect(summary.totalPages).toBe(1);
  });

  it('countNodes 数的是整棵树', () => {
    const p = page([
      { kind: 'FRAME', name: 'a', layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG' }, children: [{ kind: 'TEXT', name: 'b', text: 'x', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } }] },
    ]);
    expect(countNodes(p)).toBe(3); // PAGE + FRAME + TEXT
  });
});

/* =============================================================
 * badge-inline
 * ============================================================= */

describe('badge-inline（角标被排进流里）', () => {
  const icon = { kind: 'VECTOR', name: '图标', icon: 'bell', layout: { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 24, height: 24 } };

  it('正例：44×44 圆底里放 18×18 数字角标，横排 → 命中', () => {
    const p = page([
      {
        kind: 'FRAME',
        name: '入口',
        layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG', gap: 4 },
        children: [
          icon,
          {
            kind: 'FRAME',
            name: '角标',
            layout: { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 18, height: 18, align: 'CENTER', justify: 'CENTER' },
            style: { background: '#FF4D4F', borderRadius: 9999 },
            children: [{ kind: 'TEXT', name: '数字', text: '2', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' }, style: { color: '#FFFFFF' } }],
          },
        ],
      },
    ]);
    const hits = hitsOf(p, 'badge-inline');
    expect(hits).toHaveLength(1);
    expect(hits[0].detail).toContain('2');
  });

  it('反例：同一个角标写了 position:ABSOLUTE → 不命中（这是正确写法）', () => {
    const p = page([
      {
        kind: 'FRAME',
        name: '入口',
        layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' },
        children: [
          icon,
          {
            kind: 'FRAME',
            name: '角标',
            layout: { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 18, height: 18, position: 'ABSOLUTE', x: 28, y: -4 },
            style: { background: '#FF4D4F', borderRadius: 9999 },
            children: [{ kind: 'TEXT', name: '数字', text: '2', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } }],
          },
        ],
      },
    ]);
    expect(hitsOf(p, 'badge-inline')).toHaveLength(0);
  });

  it('反例：圆形图标按钮里写符号「+」→ 不命中（不是计数角标）', () => {
    const p = page([
      {
        kind: 'FRAME',
        name: '工具条',
        layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' },
        children: [
          icon,
          {
            kind: 'FRAME',
            name: '添加按钮',
            layout: { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 20, height: 20 },
            style: { background: '#1677FF', borderRadius: 9999 },
            children: [{ kind: 'TEXT', name: '符号', text: '+', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } }],
          },
        ],
      },
    ]);
    expect(hitsOf(p, 'badge-inline')).toHaveLength(0);
  });

  it('反例：没有图标兄弟（纯文字横排）→ 不命中', () => {
    const p = page([
      {
        kind: 'FRAME',
        name: '标签行',
        layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' },
        children: [
          { kind: 'TEXT', name: '文字', text: '新品', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } },
          {
            kind: 'FRAME',
            name: '计数',
            layout: { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 18, height: 18 },
            style: { background: '#FF4D4F', borderRadius: 9999 },
            children: [{ kind: 'TEXT', name: '数字', text: '9', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } }],
          },
        ],
      },
    ]);
    expect(hitsOf(p, 'badge-inline')).toHaveLength(0);
  });
});

/* =============================================================
 * vector-ratio
 * ============================================================= */

describe('vector-ratio（图标被拉伸）', () => {
  it('正例：viewBox 24×24 渲染成 18×14 → 命中', () => {
    const p = page([
      { kind: 'VECTOR', name: '电量', icon: 'battery', layout: { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 18, height: 14 } },
    ]);
    expect(hitsOf(p, 'vector-ratio')).toHaveLength(1);
  });

  it('反例：等比缩放 24×24 → 20×20 → 不命中', () => {
    const p = page([
      { kind: 'VECTOR', name: '图标', icon: 'bell', layout: { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 20, height: 20 } },
    ]);
    expect(hitsOf(p, 'vector-ratio')).toHaveLength(0);
  });
});

/* =============================================================
 * empty-frame
 * ============================================================= */

describe('empty-frame（空容器）', () => {
  it('正例：100×40 空 FRAME，无背景无描边 → 命中', () => {
    const p = page([{ kind: 'FRAME', name: '空块', layout: { mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 100, height: 40 } }]);
    expect(hitsOf(p, 'empty-frame')).toHaveLength(1);
  });

  it('反例：有背景的空 FRAME → 不命中（它是色块，不是空）', () => {
    const p = page([
      { kind: 'FRAME', name: '色块', layout: { mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 100, height: 40 }, style: { background: '#EEEEEE' } },
    ]);
    expect(hitsOf(p, 'empty-frame')).toHaveLength(0);
  });

  it('反例：名字叫 spacer 的占位 → 不命中', () => {
    const p = page([{ kind: 'FRAME', name: 'spacer-24', layout: { mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 375, height: 24 } }]);
    expect(hitsOf(p, 'empty-frame')).toHaveLength(0);
  });
});

/* =============================================================
 * abs-no-size
 * ============================================================= */

describe('abs-no-size（脱流容器高度塌 0）', () => {
  it('反例：normalizeAbsolute 已经补了 FIXED → 存量应为 0 命中', () => {
    const p = page([
      {
        kind: 'FRAME',
        name: '浮层',
        layout: { mode: 'ABSOLUTE', widthMode: 'FIXED', heightMode: 'HUG', width: 200 },
        children: [{ kind: 'TEXT', name: '字', text: '浮层内容', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } }],
      },
    ]);
    expect(hitsOf(p, 'abs-no-size')).toHaveLength(0);
  });
});

/* =============================================================
 * text-invisible
 * ============================================================= */

describe('text-invisible（文字与背景几乎同色）', () => {
  it('正例：白字压白底 → 命中（绕过 normalize 直接构造）', () => {
    const t = createNode('TEXT', { name: '字' });
    (t as { text?: string }).text = '看不见';
    t.style = { ...t.style, color: '#FFFFFF' };
    const p = rawPage([t], { background: '#FFFFFF' });
    expect(hitsOf(p, 'text-invisible')).toHaveLength(1);
  });

  it('同一形态走 draftToPage 管线 → 已被 normalizeInvisibleText 修掉，0 命中', () => {
    const p = page(
      [{ kind: 'TEXT', name: '字', text: '看不见', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' }, style: { color: '#FFFFFF' } }],
      { style: { background: '#FFFFFF' } },
    );
    expect(hitsOf(p, 'text-invisible')).toHaveLength(0);
  });

  it('反例：背景画在同级绝对定位层上（海报结构）→ 不命中', () => {
    // 父容器 mode=ABSOLUTE，背景矩形只有 widthMode:FILL + 高度，**没有 position 字段**。
    // 这正是 demo「13 绝对定位页」的真实形态，第一版判据漏了它导致 3 条误报。
    const p = page([
      {
        kind: 'FRAME',
        name: '海报',
        layout: { mode: 'ABSOLUTE', widthMode: 'FILL', heightMode: 'FIXED', height: 420 },
        children: [
          {
            kind: 'RECTANGLE',
            name: '背景',
            layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'FIXED', height: 420 },
            style: { fills: [{ type: 'GRADIENT_LINEAR', color: '#7C3AED' }] },
          },
          {
            kind: 'FRAME',
            name: '文案',
            layout: { mode: 'VERTICAL', widthMode: 'HUG', heightMode: 'HUG' },
            children: [
              { kind: 'TEXT', name: '白字', text: 'SPRING SALE', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' }, style: { color: '#FFFFFF' } },
            ],
          },
        ],
      },
    ]);
    expect(hitsOf(p, 'text-invisible')).toHaveLength(0);
  });

  it('反例：渐变背景不可判定 → 跳过（查不出 ≠ 不合规）', () => {
    const p = page(
      [{ kind: 'TEXT', name: '字', text: '限时', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' }, style: { color: '#FFFFFF' } }],
      { style: { fills: [{ type: 'GRADIENT_LINEAR', color: '#FF6600' }] } },
    );
    expect(hitsOf(p, 'text-invisible')).toHaveLength(0);
  });

  it('反例：深色底白字 → 不命中（正常设计）', () => {
    const p = page(
      [{ kind: 'TEXT', name: '字', text: '深色', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' }, style: { color: '#FFFFFF' } }],
      { style: { background: '#111111' } },
    );
    expect(hitsOf(p, 'text-invisible')).toHaveLength(0);
  });
});

/* =============================================================
 * gap-scatter / flat-hierarchy
 * ============================================================= */

describe('gap-scatter（间距档位过多）', () => {
  const box = (gap: number) => ({
    kind: 'FRAME',
    name: `组${gap}`,
    layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap },
    children: [{ kind: 'TEXT', name: 't', text: 'x', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } }],
  });

  it('正例：7 种 gap → 命中', () => {
    expect(hitsOf(page([2, 4, 6, 8, 10, 12, 14].map(box)), 'gap-scatter')).toHaveLength(1);
  });

  it('反例：4 种 gap（阶梯）→ 不命中', () => {
    expect(hitsOf(page([4, 8, 12, 16].map(box)), 'gap-scatter')).toHaveLength(0);
  });
});

describe('flat-hierarchy（字号层次不足）', () => {
  it('正例：全页只有 1 档字号 → 命中', () => {
    const p = page([
      { kind: 'TEXT', name: 'a', text: '标题', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' }, style: { fontSize: 16 } },
      { kind: 'TEXT', name: 'b', text: '正文', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' }, style: { fontSize: 16 } },
    ]);
    expect(hitsOf(p, 'flat-hierarchy')).toHaveLength(1);
  });

  it('反例：3 档字号 → 不命中', () => {
    const p = page([
      { kind: 'TEXT', name: 'a', text: '标题', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' }, style: { fontSize: 24 } },
      { kind: 'TEXT', name: 'b', text: '正文', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' }, style: { fontSize: 16 } },
      { kind: 'TEXT', name: 'c', text: '辅助', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' }, style: { fontSize: 12 } },
    ]);
    expect(hitsOf(p, 'flat-hierarchy')).toHaveLength(0);
  });
});

/* =============================================================
 * text-clip
 * ============================================================= */

describe('text-clip（文字估算超出固定宽度）', () => {
  it('正例：20 个汉字塞进 100px（16px 字号）→ 命中', () => {
    const p = page([
      {
        kind: 'TEXT',
        name: '长文',
        text: '这是一段很长很长的商品标题文字用来测试裁切',
        layout: { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'HUG', width: 100 },
        style: { fontSize: 16 },
      },
    ]);
    expect(hitsOf(p, 'text-clip')).toHaveLength(1);
  });

  it('反例：clipContent 为真（裁切是有意的）→ 不命中', () => {
    // 用 rawPage：draft 契约里没有 clipContent 字段，走管线会被丢掉，测不到
    const t = createNode('TEXT', { name: '长文' });
    (t as { text?: string }).text = '这是一段很长很长的商品标题文字用来测试裁切';
    t.layout = { ...t.layout, widthMode: 'FIXED', width: 100, clipContent: true };
    t.style = { ...t.style, fontSize: 16 };
    expect(hitsOf(rawPage([t]), 'text-clip')).toHaveLength(0);
  });

  it('反例：短文本 → 不命中', () => {
    const p = page([
      { kind: 'TEXT', name: '短文', text: '标题', layout: { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'HUG', width: 100 }, style: { fontSize: 16 } },
    ]);
    expect(hitsOf(p, 'text-clip')).toHaveLength(0);
  });
});
