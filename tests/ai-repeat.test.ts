import { describe, it, expect } from 'vitest';
import {
  MAX_EXPANDED_NODES,
  MAX_REPEAT_COUNT,
  draftToPage,
  expandRepeats,
} from '../src/editor/ai/specToPage';
import { STYLE_RECIPES } from '../src/editor/ai/styleRecipes';
import { validateAiOutput } from '../src/editor/ai/contract';
import type { AiNodeSpec, AiPageDraft } from '../src/editor/ai/types';
import type { AiViolation } from '../src/editor/ai/types';
import type { UINode } from '../src/schema/types';
import { PACKS } from '../src/tokens/packs';

const pack = PACKS[0];

/** UINode 是联合类型（TEXT 没有 children），统一用守卫取子节点 */
const kids = (n: UINode): UINode[] => ('children' in n ? (n as { children: UINode[] }).children : []);

function exp(list: AiNodeSpec[]): { nodes: AiNodeSpec[]; violations: AiViolation[] } {
  const violations: AiViolation[] = [];
  const nodes = expandRepeats(list, 'root', violations);
  return { nodes, violations };
}

describe('repeat 基础展开', () => {
  it('复制 count 份，name 自动补序号', () => {
    const { nodes, violations } = exp([{ kind: 'TEXT', name: '标签', text: 'x', repeat: { count: 3 } }]);
    expect(violations).toHaveLength(0);
    expect(nodes).toHaveLength(3);
    expect(nodes.map((n) => n.name)).toEqual(['标签 1', '标签 2', '标签 3']);
  });

  it('没有 name 时用 kind 兜底命名', () => {
    const { nodes } = exp([{ kind: 'TEXT', text: 'x', repeat: { count: 2 } }]);
    expect(nodes.map((n) => n.name)).toEqual(['TEXT 1', 'TEXT 2']);
  });

  it('{{value}} 依次取 values', () => {
    const { nodes } = exp([
      { kind: 'TEXT', text: '{{value}}', repeat: { count: 3, values: ['一', '二', '三'] } },
    ]);
    expect(nodes.map((n) => n.text)).toEqual(['一', '二', '三']);
  });

  it('values 比 count 短时循环取用', () => {
    const { nodes } = exp([
      { kind: 'TEXT', text: '{{value}}', repeat: { count: 5, values: ['A', 'B'] } },
    ]);
    expect(nodes.map((n) => n.text)).toEqual(['A', 'B', 'A', 'B', 'A']);
  });

  it('{{index}} 从 1 起，{{index0}} 从 0 起', () => {
    const { nodes } = exp([{ kind: 'TEXT', text: '{{index}}-{{index0}}', repeat: { count: 3 } }]);
    expect(nodes.map((n) => n.text)).toEqual(['1-0', '2-1', '3-2']);
  });

  it('展开后节点上不再有 repeat 字段', () => {
    const { nodes } = exp([{ kind: 'TEXT', text: 'x', repeat: { count: 2 } }]);
    for (const n of nodes) expect('repeat' in n).toBe(false);
  });
});

/**
 * 命名式 values（2026-10-29 补）。
 *
 * 动因是真实产物缺陷：只有位置式时，一张商品卡里的「名称」和「价格」是**两个**文本节点，
 * `{{value}}` 只能喂其中一个，于是零食商城首页 8 张卡全叫「炭烧腰果 168g / ¥29.9」。
 * 商品网格恰恰是 repeat 最该用的地方（逐卡手写 6 次会吃光输出预算），
 * 所以这里补的不是「更好用」，是「结构性不可表达」。
 */
describe('repeat 命名式 values', () => {
  const card = (values: unknown, count = 3): AiNodeSpec => ({
    kind: 'FRAME',
    name: '商品卡',
    repeat: { count, values } as AiNodeSpec['repeat'],
    children: [
      { kind: 'TEXT', text: '{{name}}' },
      { kind: 'TEXT', text: '{{price}}' },
    ],
  });

  it('一张卡里多个格子各自取自己的键', () => {
    const { nodes, violations } = exp([
      card({ name: ['爆米花', '草莓脆', '腰果'], price: ['¥19.9', '¥26.8', '¥29.9'] }),
    ]);
    expect(violations).toHaveLength(0);
    expect(nodes).toHaveLength(3);
    expect(nodes.map((n) => n.children?.map((c) => c.text))).toEqual([
      ['爆米花', '¥19.9'],
      ['草莓脆', '¥26.8'],
      ['腰果', '¥29.9'],
    ]);
  });

  it('每个键各自循环，互不影响长度', () => {
    const { nodes } = exp([card({ name: ['A', 'B'], price: ['¥1'] }, 4)]);
    expect(nodes.map((n) => n.children?.map((c) => c.text))).toEqual([
      ['A', '¥1'],
      ['B', '¥1'],
      ['A', '¥1'],
      ['B', '¥1'],
    ]);
  });

  it('缺某个键 → 该占位符降级成序号，不报违例（模型写错键名不该整页失败）', () => {
    const { nodes, violations } = exp([card({ name: ['A', 'B', 'C'] }, 2)]);
    expect(violations).toHaveLength(0);
    expect(nodes.map((n) => n.children?.map((c) => c.text))).toEqual([
      ['A', '1'],
      ['B', '2'],
    ]);
  });

  it('位置式 values 遇到命名占位符也降级，不报违例', () => {
    const { nodes, violations } = exp([
      { kind: 'TEXT', text: '{{name}}', repeat: { count: 2, values: ['一', '二'] } },
    ]);
    expect(violations).toHaveLength(0);
    expect(nodes.map((n) => n.text)).toEqual(['1', '2']);
  });

  it('命名式里 {{index}} / {{index0}} 仍按序号走', () => {
    const { nodes } = exp([
      { kind: 'TEXT', text: '{{index}}.{{name}}', repeat: { count: 2, values: { name: ['甲', '乙'] } } },
    ]);
    expect(nodes.map((n) => n.text)).toEqual(['1.甲', '2.乙']);
  });

  it('命名式能过 schema（anyOf 两支都要认）', () => {
    const draft: AiPageDraft = {
      kind: 'page',
      name: '商城',
      width: 375,
      height: 812,
      root: { kind: 'FRAME', children: [card({ name: ['A'], price: ['¥1'] })] },
    };
    const res = validateAiOutput(draft, { expect: 'page', pack });
    expect(res.ok, JSON.stringify(res.violations ?? [])).toBe(true);
  });

  it('位置式仍然照旧（向后兼容，19 页基线不受影响）', () => {
    const draft: AiPageDraft = {
      kind: 'page',
      name: '日历',
      width: 375,
      height: 812,
      root: {
        kind: 'FRAME',
        children: [{ kind: 'TEXT', text: '{{value}}', repeat: { count: 2, values: ['一', '二'] } }],
      },
    };
    const res = validateAiOutput(draft, { expect: 'page', pack });
    expect(res.ok, JSON.stringify(res.violations ?? [])).toBe(true);
  });
});

describe('嵌套 repeat：序号归属', () => {
  /**
   * 这是最容易写错的一处：如果父层先做占位符替换、再展开子层，
   * 子层永远拿到父层的序号（3 个标签全变成同一个数字）。
   * 正确顺序是「先展开子层，再替换本层」。
   */
  it('子层用自己的 index，不继承父层', () => {
    const { nodes } = exp([
      {
        kind: 'FRAME',
        name: '行',
        repeat: { count: 2 },
        children: [{ kind: 'TEXT', text: '{{index}}', repeat: { count: 3 } }],
      },
    ]);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].children?.map((c) => c.text)).toEqual(['1', '2', '3']);
    expect(nodes[1].children?.map((c) => c.text)).toEqual(['1', '2', '3']);
  });

  it('子层没 repeat 时，{{index}} 引用父层序号', () => {
    const { nodes } = exp([
      {
        kind: 'FRAME',
        name: '行',
        repeat: { count: 3 },
        children: [{ kind: 'TEXT', text: '第{{index}}行' }],
      },
    ]);
    expect(nodes.map((n) => n.children?.[0].text)).toEqual(['第1行', '第2行', '第3行']);
  });
});

describe('repeat 的边界与报错', () => {
  it('count 超过上限直接报违例，不静默截断', () => {
    const { nodes, violations } = exp([{ kind: 'TEXT', repeat: { count: MAX_REPEAT_COUNT + 1 } }]);
    expect(nodes).toHaveLength(0);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain(String(MAX_REPEAT_COUNT));
  });

  it('count 为 0 或非整数报违例', () => {
    expect(exp([{ kind: 'TEXT', repeat: { count: 0 } }]).violations).toHaveLength(1);
    expect(exp([{ kind: 'TEXT', repeat: { count: 2.5 } }]).violations).toHaveLength(1);
  });

  it('用了 {{value}} 却没给 values → 降级成序号，不让整页失败', () => {
    /**
     * 这里曾经是「报违例」，实测代价太大：模型在深层嵌套里把 values 写到错的层上，
     * 一条违例就让整页生成失败，自修两轮也未必改对。
     * 降级后的结果（第 N 格显示 N）本身合理——用户看到的是数字，不是空白也不是报错。
     */
    const { nodes, violations } = exp([{ kind: 'TEXT', text: '{{value}}', repeat: { count: 3 } }]);
    expect(violations).toHaveLength(0);
    expect(nodes.map((n) => n.text)).toEqual(['1', '2', '3']);
  });

  it('嵌套后总节点数超限 → 只报一次，不刷屏', () => {
    const { violations } = exp([
      { kind: 'FRAME', repeat: { count: MAX_REPEAT_COUNT }, children: [{ kind: 'TEXT', repeat: { count: MAX_REPEAT_COUNT } }] },
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain(String(MAX_EXPANDED_NODES));
  });
});

describe('端到端：draftToPage 后 AST 里没有 repeat', () => {
  const draft = {
    kind: 'page',
    name: '日历页',
    width: 375,
    height: 812,
    background: '@color.background',
    root: {
      kind: 'FRAME',
      layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG' },
      children: [
        {
          kind: 'FRAME',
          name: '日历',
          style: { grid: { columns: 'repeat(7, 1fr)' } },
          children: [
            { kind: 'TEXT', text: '{{value}}', className: 'text-xs', repeat: { count: 7, values: ['一', '二', '三', '四', '五', '六', '日'] } },
            { kind: 'FRAME', name: '日期格', className: 'py-2', repeat: { count: 35 }, children: [{ kind: 'TEXT', text: '{{index}}' }] },
          ],
        },
      ],
    },
  } as unknown as AiPageDraft;

  it('节点真的被展开了（7 + 35，且每格带自己的序号）', () => {
    const built = draftToPage(draft, { pack });
    // 只断言「需要模型改」的违例为 0：归一化顺手改对的（autoFixed，如网格容器 HUG→FILL）
    // 已经体现在产物里，不算失败。见 AiViolation.autoFixed。
    expect(built.violations.filter((v) => !v.autoFixed)).toHaveLength(0);
    const calendar = built.page.root.children[0];
    const cells = kids(calendar);
    expect(cells).toHaveLength(42);
    expect(cells[0].type).toBe('TEXT');
    expect(cells[7].name).toBe('日期格 1');
    expect(kids(cells[7])[0]).toMatchObject({ type: 'TEXT', text: '1' });
    expect(kids(cells[41])[0]).toMatchObject({ type: 'TEXT', text: '35' });
  });

  it('AST 里任何一个节点都不带 repeat 字段', () => {
    const built = draftToPage(draft, { pack });
    const walk = (n: UINode): void => {
      expect('repeat' in n, `节点 ${n.name} 上残留了 repeat`).toBe(false);
      for (const c of kids(n)) walk(c);
    };
    walk(built.page.root);
  });
});

describe('配方里的日历示例必须能展开', () => {
  it('grid-calendar 配方展开后是 7 + 35 = 42 个格子', () => {
    const recipe = STYLE_RECIPES.find((r) => r.id === 'grid-calendar');
    expect(recipe).toBeTruthy();
    const node = JSON.parse(recipe!.json) as AiNodeSpec;
    const violations: AiViolation[] = [];
    const nodes = expandRepeats([node], 'root', violations);
    expect(violations).toHaveLength(0);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].children).toHaveLength(42);
  });

  it('示例本身仍过 schema（repeat 已进契约）', () => {
    const recipe = STYLE_RECIPES.find((r) => r.id === 'grid-calendar')!;
    const draft = {
      kind: 'page',
      name: 't',
      width: 375,
      height: 812,
      background: '@color.background',
      root: { kind: 'FRAME', layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG' }, children: [JSON.parse(recipe.json)] },
    };
    const checked = validateAiOutput(draft, { expect: 'page', pack });
    const detail = checked.violations.map((v) => `${v.path}: ${v.message}`).join(' | ');
    expect(checked.ok, detail).toBe(true);
    expect(checked.violations).toHaveLength(0);
  });
});

/**
 * `icon:"{{icon}}"` + `values.icon` —— 让 N 个图标各不相同的**唯一**写法。
 *
 * 2026-11-01 真实模型实测：`ai-matrix` 实跑 10 页，L3/L6 两页整页失败，
 * 原因全是闸门拿字面量 `"{{icon}}"` 去查图标表（查不到）→ 报违例 → 模型写的就是对的，
 * 改 3 轮也改不出来 → 抛异常。B2「自修后通过率」从 100% 掉到 80%。
 *
 * 这里锁住两件事：**闸门放行占位符**、**展开后拿到的是替换后的真名**。
 */
describe('图标占位符（闸门与转换层分层）', () => {
  const icons: Record<string, string> = {
    house: 'M1',
    'shopping-cart': 'M2',
    bell: 'M3',
    circle: 'M4',
    'shopping-bag': 'M5',
  };

  const draftWith = (child: AiNodeSpec): AiPageDraft => ({
    kind: 'page',
    name: '图标占位',
    width: 375,
    height: 812,
    root: { kind: 'FRAME', layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG' }, children: [child] },
  });

  const vectors = (node: UINode): UINode[] => {
    const out: UINode[] = [];
    const visit = (n: UINode): void => {
      if (n.type === 'VECTOR') out.push(n);
      kids(n).forEach(visit);
    };
    visit(node);
    return out;
  };

  it('闸门放行 icon:"{{icon}}"（展开前是字面量，不能拿去查表）', () => {
    const draft = draftWith({
      kind: 'FRAME',
      repeat: { count: 3, values: { icon: ['house', 'shopping-cart', 'bell'] } },
      children: [{ kind: 'VECTOR', icon: '{{icon}}', layout: { width: 24, height: 24 } }],
    });
    const res = validateAiOutput(draft, { expect: 'page', pack, icons });
    expect(res.ok, JSON.stringify(res.violations ?? [])).toBe(true);
  });

  it('展开后每个图标各用各的名字（不是 N 份同一个）', () => {
    const draft = draftWith({
      kind: 'FRAME',
      repeat: { count: 3, values: { icon: ['house', 'shopping-cart', 'bell'] } },
      children: [{ kind: 'VECTOR', icon: '{{icon}}', layout: { width: 24, height: 24 } }],
    });
    const { page, violations } = draftToPage(draft, { pack, icons });
    expect(violations).toHaveLength(0);
    const ds = vectors(page.root).map((n) => (n as unknown as { vector: { d: string } }).vector.d);
    expect(ds).toEqual(['M1', 'M2', 'M3']);
  });

  it('写错名字（字面量、无相近项）仍然报违例 —— 那是模型该改的', () => {
    const draft = draftWith({ kind: 'VECTOR', icon: 'zzzzqqq', layout: { width: 24, height: 24 } });
    const res = validateAiOutput(draft, { expect: 'page', pack, icons });
    expect(res.ok).toBe(false);
    expect(res.violations.some((v) => v.path.endsWith('.icon'))).toBe(true);
  });

  it('占位符写在 repeat 之外：降级成相近图标，不整页失败', () => {
    const draft = draftWith({ kind: 'VECTOR', icon: '{{icon}}', layout: { width: 24, height: 24 } });
    const { page, violations } = draftToPage(draft, { pack, icons });
    const vec = vectors(page.root);
    expect(vec).toHaveLength(1);
    // 关键：不能是空路径（空路径 = 界面上一个看不见的洞）
    expect((vec[0] as unknown as { vector: { d: string } }).vector.d).not.toBe('M 0 0');
    expect(violations.some((v) => v.path.endsWith('.icon') && v.autoFixed)).toBe(true);
  });

  it('values 缺 icon 数组：降级成序号后同样兜底，不失败', () => {
    const draft = draftWith({
      kind: 'FRAME',
      repeat: { count: 2, values: { name: ['甲', '乙'] } },
      children: [{ kind: 'VECTOR', icon: '{{icon}}', layout: { width: 24, height: 24 } }],
    });
    const { page, violations } = draftToPage(draft, { pack, icons });
    const vec = vectors(page.root);
    expect(vec).toHaveLength(2);
    for (const v of vec) {
      expect((v as unknown as { vector: { d: string } }).vector.d).not.toBe('M 0 0');
    }
    expect(violations.every((v) => v.autoFixed)).toBe(true);
  });
});

/**
 * `repeat.styles[i].width`（2026-11-02 补）
 *
 * 触发场景：记账「预算」页六条分类进度条。模型用了 repeat（该页 63 节点，逐条手写会吃光
 * 输出预算），而 `styles` 当时只有视觉字段 → 六条填充宽度全是 160，只有第一条 240、
 * 最后一条超支 300。**结构上表达不了「长度各不相同」**，不是采样噪声。
 */
describe('repeat 逐项长度（styles[i].width）', () => {
  const bar = (widths: number[]): AiNodeSpec => ({
    kind: 'FRAME',
    name: '进度填充',
    layout: { widthMode: 'HUG', height: 8 },
    style: { background: '#0f5132' },
    repeat: {
      count: widths.length,
      styles: widths.map((w) => ({ width: w })),
    },
  });

  it('逐项写进 layout.width，并强制 widthMode=FIXED', () => {
    const { nodes } = exp([bar([240, 160, 90])]);
    expect(nodes.map((n) => n.layout?.width)).toEqual([240, 160, 90]);
    // 模板写的是 HUG：只给数值不强制模式，HUG 会把数值当参考值 → 长度照样全一样
    expect(nodes.map((n) => n.layout?.widthMode)).toEqual(['FIXED', 'FIXED', 'FIXED']);
  });

  it('width 不会漏进 style（那里没有这个键，会被静默丢掉）', () => {
    const { nodes } = exp([bar([240, 160])]);
    for (const n of nodes) {
      expect(n.style as Record<string, unknown>).not.toHaveProperty('width');
      // 视觉字段照旧生效
      expect(n.style?.background).toBe('#0f5132');
    }
  });

  it('宽度与颜色可同时逐项给，且每份克隆互不影响', () => {
    const { nodes } = exp([
      {
        kind: 'FRAME',
        name: '色条',
        style: { background: '#000000' },
        repeat: {
          count: 3,
          styles: [
            { width: 10, background: '#111111' },
            { width: 20, background: '#222222' },
            { width: 30, background: '#333333' },
          ],
        },
      },
    ]);
    expect(nodes.map((n) => n.layout?.width)).toEqual([10, 20, 30]);
    expect(nodes.map((n) => n.style?.background)).toEqual(['#111111', '#222222', '#333333']);
  });

  it('styles 比 count 短时，缺的位置沿用模板原值（不报违例）', () => {
    const spec = bar([240]);
    spec.repeat = { count: 2, styles: [{ width: 240 }] };
    const { nodes, violations } = exp([spec]);
    expect(violations).toHaveLength(0);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].layout?.width).toBe(240);
    expect(nodes[1].layout?.width).toBeUndefined();
  });

  it('契约闸门放行 styles[i].width（否则模型写了也是违例）', () => {
    const draft: AiPageDraft = {
      kind: 'page',
      name: '预算',
      width: 375,
      height: 812,
      root: {
        kind: 'FRAME',
        layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'FILL' },
        children: [bar([240, 160, 90])],
      },
    };
    const res = validateAiOutput(draft, { expect: 'page', pack });
    expect(res.ok, JSON.stringify(res.violations ?? [])).toBe(true);
  });
});
