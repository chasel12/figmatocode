/**
 * 视觉差距修复（2026-10-29）
 *
 * 起因：用户肉眼对照三组 skill（Swiss / 节气 / 金融）的 AST 产物与直接写码产物，
 * 逐条指出差距。本文件把每一条**都变成会变红的断言**，避免「修了但没人锁」。
 *
 * | 用户观察 | 根因 | 断言位置 |
 * |---|---|---|
 * | 金融「预算卡片宽度不统一」 | 等分网格里的子项 `widthMode:HUG` 覆盖了 `1fr` 拉伸 | `等分网格` 组 |
 * | 节气「字体死板、没有书法感」 | `fontFamily` 一直是「故意不给」，中文只能出黑体 | `字体族` 组 |
 * | 节气「背景色单调、太死板」 | `draftToPage` 只读 `draft.background`，`root.style` 整段被忽略 | `根节点样式` 组 |
 * | 节气「卡片颜色只有灰色」 | `repeat` 模板共享，样式字段拿不到逐项值 | `repeat 逐项样式` 组 |
 * | 排版缺下划线/大写眉标 | `textCase`/`textDecoration` 编译端早有、AI 三层全缺 | `大小写与装饰线` 组 |
 *
 * 每组的第二条都是**反向验证**：只加正向断言的话，把规则写宽（比如把所有 HUG 都改 FILL）
 * 也能全绿，而那样会误伤日历的周几标签。
 */
import { describe, expect, it } from 'vitest';
import { draftToPage } from '../src/editor/ai/specToPage';
import { compilePage } from '../src/compiler/compile';
import { PACKS } from '../src/tokens/packs';
import type { AiNodeSpec, AiPageDraft, AiViolation } from '../src/editor/ai/types';
import { isContainer } from '../src/schema/types';
import type { UINode, UIPage } from '../src/schema/types';

const pack = PACKS[0];

function run(
  children: AiNodeSpec[],
  rootPatch: Partial<AiNodeSpec> = {},
): { page: UIPage; violations: AiViolation[] } {
  const draft: AiPageDraft = {
    kind: 'page',
    name: 't',
    root: {
      kind: 'FRAME',
      name: '页面',
      layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'FILL' },
      children,
      ...rootPatch,
    },
  };
  return draftToPage(draft, { pack });
}

const first = (page: UIPage): UINode => page.root.children[0];

/** 取容器子项（`UINode` 是联合类型，TEXT 没有 children） */
const kidsOf = (n: UINode): UINode[] => (isContainer(n) ? n.children : []);

function cssOf(page: UIPage, node: UINode): Record<string, string> {
  const compiled = compilePage(page);
  const hit = compiled.nodes.find((n) => n.id === node.id);
  return (hit?.css ?? {}) as Record<string, string>;
}

describe('根节点样式：root.style 与 draft.background 的优先级', () => {
  it('root.style.background 生效（防回归：模型常把底色写在这里而不是顶层 draft.background）', () => {
    const { page, violations } = run([], { style: { background: '#FBF8F1' } });
    expect(violations).toHaveLength(0);
    expect(page.root.style!.background).toBe('#FBF8F1');
  });

  it('root.style 覆盖 draft.background（显式更具体）', () => {
    const draft: AiPageDraft = {
      kind: 'page',
      name: 't',
      background: '#F8F9FA',
      root: {
        kind: 'FRAME',
        name: '页面',
        layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'FILL' },
        style: { background: '#FBF8F1' },
        children: [],
      },
    };
    const { page } = draftToPage(draft, { pack });
    expect(page.root.style!.background).toBe('#FBF8F1');
  });

  it('反向验证：都没写时不报违例（缺省不是错误，不能凭空塞颜色）', () => {
    const { page, violations } = run([]);
    expect(violations).toHaveLength(0);
    expect(page.root.style?.background).toBeUndefined();
  });
});

describe('等分网格：有底色的子项 HUG → FILL', () => {
  const grid = (children: AiNodeSpec[]): AiNodeSpec => ({
    kind: 'FRAME',
    name: '网格',
    style: { grid: { columns: 'repeat(2, 1fr)', columnGap: 12 } },
    children,
  });

  it('两张卡片都是 HUG 时改成 FILL，且逐条报违例说明替代写法', () => {
    const { page, violations } = run([
      grid([
        { kind: 'FRAME', name: '卡A', className: 'bg-card p-4', children: [] },
        { kind: 'FRAME', name: '卡B', className: 'bg-card p-4', children: [] },
      ]),
    ]);
    const kids = kidsOf(first(page));
    expect(kids[0].layout.widthMode).toBe('FILL');
    expect(kids[1].layout.widthMode).toBe('FILL');
    // 3 条：网格**容器自己**（HUG → FILL）+ 两个子项
    expect(violations).toHaveLength(3);
    expect(violations.every((v) => v.message.includes('FILL'))).toBe(true);
  });

  /**
   * 容器自己也要降 FILL（2026-10-29 补）。
   *
   * `1fr` 只定义「剩余空间怎么分」，HUG 是「按内容收缩」——收缩上下文里 `1fr`
   * 按 max-content 解析，整块比可用宽度还宽，把父容器撑出视口。
   * 实测：零食商城「分类」页右侧商品网格（HUG，父级横排）渲染成 428px，
   * 视口只有 375px，右边一列商品卡被裁一半；像素比对查不出来（基准图同一份 CSS，
   * 同样溢出，相似度仍是 100%），只有量渲染宽度才发现。
   */
  it('网格容器自己是 HUG 时也降 FILL（1fr 在收缩上下文里按 max-content 解析 → 横向溢出）', () => {
    const { page } = run([
      grid([{ kind: 'FRAME', name: '卡A', className: 'bg-card p-4', children: [] }]),
    ]);
    const g = first(page);
    expect(g.layout.widthMode).toBe('FILL');
  });

  it('auto 轨道的网格容器不动（标签流本来就该按内容宽）', () => {
    const { page } = run([
      {
        kind: 'FRAME',
        name: '标签流',
        style: { grid: { columns: 'auto auto', columnGap: 8 } },
        children: [{ kind: 'FRAME', name: 'chip', className: 'bg-card px-3', children: [] }],
      },
    ]);
    expect(first(page).layout.widthMode).not.toBe('FILL');
  });

  it('产物 CSS 里卡片是 width:100%（不是 fit-content），同排宽度才会一致', () => {
    const { page } = run([
      grid([{ kind: 'FRAME', name: '卡A', className: 'bg-card p-4', children: [] }]),
    ]);
    const card = kidsOf(first(page))[0];
    const css = cssOf(page, card);
    expect(css['width']).toBe('100%');
  });

  it('反向验证：纯 TEXT 子项不该被改 —— HUG 是 buildLayout 给的缺省，不是模型意图', () => {
    const { page, violations } = run([
      grid([
        { kind: 'TEXT', name: '一', text: '一' },
        { kind: 'TEXT', name: '二', text: '二' },
      ]),
    ]);
    const kids = kidsOf(first(page));
    expect(kids[0].layout.widthMode).toBe('HUG');
    expect(kids[1].layout.widthMode).toBe('HUG');
    // 子项一条都不报；只剩「容器自己 HUG」那一条（路径落在网格自己身上，不在 .children 下）
    expect(violations).toHaveLength(1);
    expect(violations[0].path).toMatch(/^root\.children\[0\]\.layout\.widthMode$/);
  });

  it('反向验证：auto 轨道里 HUG 是合理的，不该动', () => {
    const { page, violations } = run([
      {
        kind: 'FRAME',
        name: '流式网格',
        style: { grid: { columns: 'auto auto', columnGap: 8 } },
        children: [{ kind: 'FRAME', name: 'chip', className: 'bg-card px-3', children: [] }],
      },
    ]);
    expect(kidsOf(first(page))[0].layout.widthMode).toBe('HUG');
    expect(violations).toHaveLength(0);
  });
});

describe('字体族：受控别名 → 跨平台字体栈', () => {
  it('font-serif 出宋体栈（中文「书法感」的唯一可行解）', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: 'x', text: '节气', className: 'font-serif' },
    ]);
    expect(violations).toHaveLength(0);
    const family = first(page).style!.fontFamily!;
    expect(family).toContain('Songti SC'); // macOS
    expect(family).toContain('SimSun'); // Windows
    expect(family).toContain('serif'); // 兜底
  });

  it('产物 CSS 里 font-family 真的是宋体栈（不是字段有了但没出码）', () => {
    const { page } = run([{ kind: 'TEXT', name: 'x', text: '节气', className: 'font-serif' }]);
    const css = cssOf(page, first(page));
    expect(css['font-family']).toContain('Songti SC');
  });

  it('中文别名同样命中：楷体 / 宋体 / 黑体', () => {
    const cases: Array<[string, string]> = [
      ['楷体', 'Kaiti SC'],
      ['宋体', 'Songti SC'],
      ['黑体', 'PingFang SC'],
    ];
    for (const [alias, expectHit] of cases) {
      const { page, violations } = run([
        { kind: 'TEXT', name: 'x', text: 'x', style: { fontFamily: alias } },
      ]);
      expect(violations).toHaveLength(0);
      expect(first(page).style!.fontFamily).toContain(expectHit);
    }
  });

  it('反向验证：任意字体名报违例而不是静默接受（没装的字体会假成功）', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: 'x', text: 'x', style: { fontFamily: 'Comic Sans MS' } },
    ]);
    expect(first(page).style!.fontFamily).toBeUndefined();
    expect(violations).toHaveLength(1);
    expect(violations[0].path).toContain('fontFamily');
  });
});

describe('大小写与装饰线（编译端早有，AI 三层此前全缺）', () => {
  it('uppercase → textCase UPPER → 产物 text-transform: uppercase', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: '眉标', text: 'capabilities', className: 'uppercase' },
    ]);
    expect(violations).toHaveLength(0);
    expect(first(page).style!.textCase).toBe('UPPER');
    expect(cssOf(page, first(page))['text-transform']).toBe('uppercase');
  });

  it('underline → 产物 text-decoration: underline', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: '链接', text: '查看全部', className: 'underline' },
    ]);
    expect(violations).toHaveLength(0);
    expect(first(page).style!.textDecoration).toBe('UNDERLINE');
    expect(cssOf(page, first(page))['text-decoration']).toBe('underline');
  });

  it('显式 style 也认，且 no-underline 能清掉（成对字段语义）', () => {
    const { page } = run([
      {
        kind: 'TEXT',
        name: 'x',
        text: 'x',
        className: 'underline',
        style: { textDecoration: undefined },
      },
    ]);
    // 显式没给值 → 保留 class 的结果
    expect(first(page).style!.textDecoration).toBe('UNDERLINE');

    const { page: p2 } = run([
      { kind: 'TEXT', name: 'y', text: 'y', className: 'no-underline' },
    ]);
    expect(first(p2).style!.textDecoration).toBeUndefined();
  });
});

describe('repeat 逐项样式：24 条色条各一色', () => {
  it('styles[i] 按 index 对齐 values[i]，三份克隆拿到三个颜色', () => {
    const { page, violations } = run([
      {
        kind: 'FRAME',
        name: '色条组',
        layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 4 },
        children: [
          {
            kind: 'RECTANGLE',
            name: '条',
            layout: { width: 8, height: 40 },
            style: { background: '#EEEEEE' },
            repeat: {
              count: 3,
              styles: [
                { background: '#FF4F40' },
                { background: '#9BB074' },
                { background: '#091723' },
              ],
            },
          },
        ],
      },
    ]);
    expect(violations).toHaveLength(0);
    const bars = kidsOf(first(page));
    expect(bars).toHaveLength(3);
    expect(bars.map((b) => b.style!.background)).toEqual(['#FF4F40', '#9BB074', '#091723']);
  });

  it('styles 长度短于 count 时，缺的位置用模板原值（不报违例）', () => {
    const { page, violations } = run([
      {
        kind: 'FRAME',
        name: '色条组',
        layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG' },
        children: [
          {
            kind: 'RECTANGLE',
            name: '条',
            layout: { width: 8, height: 40 },
            style: { background: '#EEEEEE' },
            repeat: { count: 3, styles: [{ background: '#FF4F40' }] },
          },
        ],
      },
    ]);
    expect(violations).toHaveLength(0);
    expect(kidsOf(first(page)).map((b) => b.style!.background)).toEqual([
      '#FF4F40',
      '#EEEEEE',
      '#EEEEEE',
    ]);
  });

  it('反向验证：逐项覆盖不能污染其他克隆（浅拷贝共享 style 引用的坑）', () => {
    const { page } = run([
      {
        kind: 'FRAME',
        name: '色条组',
        layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG' },
        children: [
          {
            kind: 'RECTANGLE',
            name: '条',
            layout: { width: 8, height: 40 },
            style: { background: '#EEEEEE' },
            repeat: { count: 2, styles: [{ background: '#FF4F40' }] },
          },
        ],
      },
    ]);
    const bars = kidsOf(first(page));
    // 第一份被覆盖，第二份必须是模板原值 —— 共享引用的话这里会是 #FF4F40
    expect(bars[0].style!.background).toBe('#FF4F40');
    expect(bars[1].style!.background).toBe('#EEEEEE');
  });

  it('styles 里的颜色支持 @token（与显式 style 同一条解析路径）', () => {
    const { page, violations } = run([
      {
        kind: 'FRAME',
        name: '色条组',
        layout: { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG' },
        children: [
          {
            kind: 'RECTANGLE',
            name: '条',
            layout: { width: 8, height: 40 },
            repeat: { count: 1, styles: [{ background: '@color.primary' }] },
          },
        ],
      },
    ]);
    expect(violations).toHaveLength(0);
    expect(kidsOf(first(page))[0].style!.background).toBe(pack.colors.primary);
  });
});
