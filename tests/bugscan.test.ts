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

  it('正例：绕过 normalize 直接造 mode:ABSOLUTE + HUG → 命中（证明规则真的在跑）', () => {
    // 用 rawPage：走 draftToPage 的话 normalizeAbsolute 规则 3 会把它补成 FIXED，测不到正例
    const box = createNode('FRAME', { name: '浮层' });
    box.layout = { ...box.layout, mode: 'ABSOLUTE', widthMode: 'FIXED', width: 200, heightMode: 'HUG' };
    const t = createNode('TEXT', { name: '字' });
    (t as { text?: string }).text = '浮层内容';
    (box as ContainerNode).children = [t] as ContainerNode['children'];
    expect(hitsOf(rawPage([box]), 'abs-no-size')).toHaveLength(1);
  });

  it('反例：position:ABSOLUTE + HUG → 不命中（fit-content 会按内容算，不会塌 0）', () => {
    /**
     * 实测纠错（2026-11-01，`overlay-menu`）：判据原来写成
     * `position === 'ABSOLUTE' || mode === 'ABSOLUTE'`，于是下拉菜单
     * （`mode: VERTICAL` + `position: ABSOLUTE` + HUG）被报成「高度会塌 0」，
     * 而截图里它正常显示。`position: ABSOLUTE` 仍发射 `height: fit-content`，
     * 绝对定位元素的 fit-content 按内容算 —— 真正塌 0 的是 `mode: ABSOLUTE`。
     */
    const box = createNode('FRAME', { name: '下拉菜单' });
    box.layout = { ...box.layout, mode: 'VERTICAL', position: 'ABSOLUTE', x: 10, y: 10, widthMode: 'FIXED', width: 180, heightMode: 'HUG' };
    const t = createNode('TEXT', { name: '选项' });
    (t as { text?: string }).text = '编辑';
    (box as ContainerNode).children = [t] as ContainerNode['children'];
    expect(hitsOf(rawPage([box]), 'abs-no-size')).toHaveLength(0);
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

/* =============================================================
 * state-collapse
 * ============================================================= */

/**
 * 真实来源：`form-select` 场景里模型把 `{"kind":"VECTOR","icon":"check"}` 写进了
 * `repeat` 模板，展开出的 4 个选项每行一个勾 —— 单选列表不可能同时选中 4 项。
 *
 * 这条的**反例比正例关键**：任何「每行都有同一个图标」的列表（带右箭头的设置项）
 * 都会撞上同一个形态，只有把判据限定到「状态图标」才能不误报。
 */
describe('state-collapse（列表里 N 项同时显示选中标记）', () => {
  const VEC = { mode: 'HORIZONTAL' as const, widthMode: 'FIXED' as const, heightMode: 'FIXED' as const, width: 16, height: 16 };
  const ROW = { mode: 'HORIZONTAL' as const, widthMode: 'FILL' as const, heightMode: 'HUG' as const, gap: 8 };

  /** 一行：文案 + 一个尾部图标（图标名可换，用来区分「状态图标」与「普通图标」） */
  const row = (label: string, icon: string, iconName = '尾图标') => ({
    kind: 'FRAME',
    name: `选项-${label}`,
    layout: ROW,
    children: [
      { kind: 'TEXT', name: '文案', text: label, layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } },
      { kind: 'VECTOR', name: iconName, icon, layout: VEC },
    ],
  });

  const list = (rows: unknown[]) => page([
    {
      kind: 'FRAME',
      name: '选项组',
      layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 4 },
      children: rows,
    },
  ]);

  it('正例：4 行同构选项每行一个 check → 命中 1 条', () => {
    const p = list(['甲', '乙', '丙', '丁'].map((t) => row(t, 'check', '选中勾')));
    const hits = hitsOf(p, 'state-collapse');
    expect(hits).toHaveLength(1);
    expect(hits[0].detail).toContain('4 行');
    expect(hits[0].severity).toBe('bug');
  });

  it('正例：给了图标表时靠 `d` 反查回名字（编译后 VECTOR 只有 d，没有图标名）', () => {
    /**
     * 必须用 `rawPage` 造：单测环境里 `draftToPage` 没拿到图标表，会把每个图标
     * 降级成占位路径 `M 0 0` —— 那样测的是「所有图标长得一样」而不是「反查 `d`」。
     */
    const CHECK_D = 'M20 6 9 17l-5-5';
    const rows = ['甲', '乙', '丙'].map((t) => {
      const r = createNode('FRAME', { name: `选项-${t}` });
      r.layout = { ...r.layout, mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG' };
      const label = createNode('TEXT', { name: '文案' });
      (label as { text?: string }).text = t;
      const mark = createNode('VECTOR', { name: '尾图标' });
      mark.vector = { d: CHECK_D, width: 24, height: 24 } as typeof mark.vector;
      mark.layout = { ...mark.layout, widthMode: 'FIXED', width: 16, heightMode: 'FIXED', height: 16 };
      (r as ContainerNode).children = [label, mark] as ContainerNode['children'];
      return r;
    });
    const p = rawPage(rows);
    const hits = detectorById('state-collapse')!.check(p, { icons: { check: CHECK_D } });
    expect(hits).toHaveLength(1);
    expect(hits[0].meta?.icon).toBe('check');
  });

  it('反例：占位路径 `M 0 0`（没传图标表）不参与反查 → 不命中', () => {
    // 否则整页所有图标共用一个 d，反查表会把它当成 check，全线误报
    const rows = ['甲', '乙', '丙'].map((t) => {
      const r = createNode('FRAME', { name: `选项-${t}` });
      const mark = createNode('VECTOR', { name: '尾图标' });
      mark.vector = { d: 'M 0 0', width: 24, height: 24 } as typeof mark.vector;
      (r as ContainerNode).children = [mark] as ContainerNode['children'];
      return r;
    });
    expect(detectorById('state-collapse')!.check(rawPage(rows), { icons: { check: 'M 0 0' } })).toHaveLength(0);
  });

  it('反例：每行都是右箭头（普通列表）→ 不命中（这是最常见的形态，误报就废了）', () => {
    const p = list(['甲', '乙', '丙', '丁'].map((t) => row(t, 'chevron-right')));
    expect(hitsOf(p, 'state-collapse')).toHaveLength(0);
  });

  it('反例：只有 1 行带勾（手写列表的正确画法）→ 不命中', () => {
    const p = list([row('甲', 'check', '选中勾'), row('乙', 'chevron-right'), row('丙', 'chevron-right')]);
    expect(hitsOf(p, 'state-collapse')).toHaveLength(0);
  });

  it('反例：勾在 20×20 方框里（多选 checkbox，全部勾上合法）→ 不命中', () => {
    const p = page([
      {
        kind: 'FRAME',
        name: '复选框组',
        layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 4 },
        children: ['甲', '乙', '丙'].map((t) => ({
          kind: 'FRAME',
          name: `复选-${t}`,
          layout: ROW,
          children: [
            {
              kind: 'FRAME',
              name: '勾选框',
              layout: { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 20, height: 20 },
              children: [{ kind: 'VECTOR', name: '对勾', icon: 'check', layout: VEC }],
            },
            { kind: 'TEXT', name: '文案', text: t, layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } },
          ],
        })),
      },
    ]);
    expect(hitsOf(p, 'state-collapse')).toHaveLength(0);
  });

  it('反例：只有 2 行（不足 3 项，判不出是单选列表）→ 不命中', () => {
    const p = list(['甲', '乙'].map((t) => row(t, 'check', '选中勾')));
    expect(hitsOf(p, 'state-collapse')).toHaveLength(0);
  });

  it('scanPages 会把 ctx 透传给检测器', () => {
    const p = list(['甲', '乙', '丙'].map((t) => row(t, 'check', '选中勾')));
    const noCtx = scanPages([p], [detectorById('state-collapse')!]);
    expect(noCtx.byBug['state-collapse']).toBe(1); // 名称兜底也能判
    const withCtx = scanPages([p], [detectorById('state-collapse')!], { icons: { check: 'M20 6 9 17l-5-5' } });
    expect(withCtx.byBug['state-collapse']).toBe(1);
  });
});

/* =============================================================
 * template-leak
 * ============================================================= */

describe('template-leak（{{…}} 漏进产物）', () => {
  it('正例：写了 {{title}} 却没有 repeat → 命中', () => {
    const p = page([
      { kind: 'TEXT', name: '标题', text: '{{title}}', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } },
    ]);
    const hits = hitsOf(p, 'template-leak');
    expect(hits).toHaveLength(1);
    expect(hits[0].meta?.key).toBe('title');
  });

  it('反例：repeat 展开后占位符已被替换 → 不命中', () => {
    const p = page([
      {
        kind: 'FRAME',
        name: '列表',
        layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 8 },
        children: [
          {
            kind: 'FRAME',
            name: '行',
            repeat: { count: 3, values: { title: ['甲', '乙', '丙'] } },
            layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG' },
            children: [{ kind: 'TEXT', name: '标题', text: '{{title}}', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } }],
          },
        ],
      },
    ]);
    expect(hitsOf(p, 'template-leak')).toHaveLength(0);
    expect(JSON.stringify(p)).not.toContain('{{');
  });

  it('反例：普通文案里带单个花括号 → 不命中（只认 {{…}}）', () => {
    const p = page([
      { kind: 'TEXT', name: '文案', text: '价格 {起}', layout: { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG' } },
    ]);
    expect(hitsOf(p, 'template-leak')).toHaveLength(0);
  });
});
