/**
 * 转换层的绝对定位规范化（`normalizeAbsolute`）
 *
 * ## 为什么单独建文件
 *
 * 这四条规则此前**一条测试都没有**（2026-10-28 发现）。它们全是「静默失败」的兜底：
 * 模型写错时 schema 不报、字段齐全、产物 CSS 也在，只有渲染出来才发现元素全叠在一起
 * 或整块塌掉。没有测试锁住 = 这些兜底从没被验证过，改了也不会有人知道。
 *
 * 四条规则：
 *  1. 容器 ABSOLUTE 但子项没有坐标意图 → 降级 VERTICAL
 *  2. 子项 ABSOLUTE 但无 x/y 且父是流式 → 降级为父的 mode
 *  3. 容器高度 HUG + 子项**全是** ABSOLUTE → 高度算成 0，自动补 FIXED（有 height 时）或报违例
 */
import { describe, expect, it } from 'vitest';
import { draftToPage } from '../src/editor/ai/specToPage';
import { compilePage } from '../src/compiler/compile';
import { PACKS } from '../src/tokens/packs';
import type { AiNodeSpec, AiPageDraft, AiViolation } from '../src/editor/ai/types';
import type { UIPage } from '../src/schema/types';

const pack = PACKS[0];

/**
 * 待测节点必须挂在 `root.children` 下，**不能直接当 `root`**：
 * `draft.root` 的 layout 会被 PAGE 视口覆盖（`heightMode` 强制 FIXED、height=812），
 * 直接当 root 测不出任何容器级规则。这个坑第一次写测试时踩到了（规则 3 全部漏测）。
 */
function run(children: AiNodeSpec[]): { page: UIPage; violations: AiViolation[] } {
  const draft: AiPageDraft = {
    kind: 'page',
    name: 't',
    root: {
      kind: 'FRAME',
      name: '页面',
      layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'FILL' },
      children,
    },
  };
  return draftToPage(draft, { pack });
}

describe('normalizeAbsolute · 规则 1（容器 ABSOLUTE 无坐标意图）', () => {
  /**
   * 注意规则 2 会**先于**规则 1 生效：容器自己没 x/y 且父是流式时，规则 2 就把它降级了，
   * 规则 1 根本没机会执行。所以测规则 1 必须让容器**自己有 x/y**（或父是 ABSOLUTE），
   * 否则测到的是规则 2 的消息——这两条规则的消息不同，断言写错就会误判成规则 1 没实现。
   */
  it('容器有坐标但子项一个 x/y 都没有 → 降级 VERTICAL 并报违例', () => {
    const res = run([{
      kind: 'FRAME',
      name: '舞台',
      layout: { mode: 'ABSOLUTE', x: 0, y: 0, widthMode: 'FILL', heightMode: 'FIXED', height: 200 },
      children: [
        { kind: 'RECTANGLE', name: 'A', layout: { width: 20, height: 20 } },
        { kind: 'RECTANGLE', name: 'B', layout: { width: 20, height: 20 } },
      ],
    }]);
    // 断言**行为**：容器被降级为 VERTICAL。不断言具体文案——
    // 多子项时「没坐标」与「坐标相同」走同一条分支，依赖文案会假红。
    expect((res.page.root as unknown as { children: { layout: { mode: string } }[] }).children[0].layout.mode).toBe(
      'VERTICAL',
    );
    expect(res.violations.length).toBeGreaterThan(0);
  });

  it('子项坐标完全相同 → 视为没有意图，同样降级', () => {
    const res = run([{
      kind: 'FRAME',
      name: '舞台',
      layout: { mode: 'ABSOLUTE', x: 0, y: 0, widthMode: 'FILL', heightMode: 'FIXED', height: 200 },
      children: [
        { kind: 'RECTANGLE', name: 'A', layout: { mode: 'ABSOLUTE', x: 0, y: 0, width: 20, height: 20 } },
        { kind: 'RECTANGLE', name: 'B', layout: { mode: 'ABSOLUTE', x: 0, y: 0, width: 20, height: 20 } },
      ],
    }]);
    expect((res.page.root as unknown as { children: { layout: { mode: string } }[] }).children[0].layout.mode).toBe(
      'VERTICAL',
    );
    expect(res.violations.length).toBeGreaterThan(0);
  });

  it('子项坐标各不相同 → 保留 ABSOLUTE，不报违例', () => {
    const res = run([{
      kind: 'FRAME',
      name: '舞台',
      layout: { mode: 'ABSOLUTE', x: 0, y: 0, widthMode: 'FILL', heightMode: 'FIXED', height: 200 },
      children: [
        { kind: 'RECTANGLE', name: 'A', layout: { mode: 'ABSOLUTE', x: 10, y: 10, width: 20, height: 20 } },
        { kind: 'RECTANGLE', name: 'B', layout: { mode: 'ABSOLUTE', x: 60, y: 40, width: 20, height: 20 } },
      ],
    }]);
    // 子项坐标各不相同 → 容器保留 ABSOLUTE，且不产生任何违例
    expect((res.page.root as unknown as { children: { layout: { mode: string } }[] }).children[0].layout.mode).toBe(
      'ABSOLUTE',
    );
    expect(res.violations).toHaveLength(0);
  });
});

describe('normalizeAbsolute · 规则 2（子项脱流压住兄弟）', () => {
  it('流式父里的 ABSOLUTE 子项没有 x/y → 降级为父的 mode', () => {
    const res = run([{
      kind: 'FRAME',
      name: '列表',
      layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 8 },
      children: [{ kind: 'RECTANGLE', name: '卡', layout: { mode: 'ABSOLUTE', width: 100, height: 40 } }],
    }]);
    expect(res.violations.some((v) => v.message.includes('缺少 x/y，已改为跟随父容器排版'))).toBe(true);
  });

  it('给了 x/y 的 ABSOLUTE 子项不动', () => {
    const res = run([{
      kind: 'FRAME',
      name: '列表',
      layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG' },
      children: [{ kind: 'RECTANGLE', name: '浮层', layout: { mode: 'ABSOLUTE', x: 12, y: 24, width: 100, height: 40 } }],
    }]);
    expect(res.violations.some((v) => v.message.includes('缺少 x/y'))).toBe(false);
  });
});

describe('normalizeAbsolute · 规则 3（HUG 高度 + 子项全 ABSOLUTE → 塌成 0）', () => {
  /**
   * 这条来自真实踩坑：`{"mode":"VERTICAL","height":260}` + 一堆 ABSOLUTE 子项，
   * 产物里 `height: 260px` 确实写着，但元素实际高度是 0（HUG 覆盖了 height）。
   * schema 不报错、违例 0 条，只有截图能发现整块舞台消失。
   */
  it('有 height 时自动补 heightMode:"FIXED"，并报违例说明', () => {
    const res = run([{
      kind: 'FRAME',
      name: '舞台',
      layout: { mode: 'VERTICAL', widthMode: 'FILL', height: 260 },
      children: [
        { kind: 'RECTANGLE', name: 'A', layout: { mode: 'ABSOLUTE', x: 10, y: 10, width: 20, height: 20 } },
        { kind: 'RECTANGLE', name: 'B', layout: { mode: 'ABSOLUTE', x: 60, y: 40, width: 20, height: 20 } },
      ],
    }]);
    const v = res.violations.find((x) => x.message.includes('HUG 高度会算成 0'));
    expect(v, '没有报出塌陷违例').toBeDefined();
    expect(v!.message).toContain('heightMode:"FIXED"');
  });

  it('没有 height 时报违例但不瞎改（让模型补）', () => {
    const res = run([{
      kind: 'FRAME',
      name: '舞台',
      layout: { mode: 'VERTICAL', widthMode: 'FILL' },
      children: [
        { kind: 'RECTANGLE', name: 'A', layout: { mode: 'ABSOLUTE', x: 10, y: 10, width: 20, height: 20 } },
        { kind: 'RECTANGLE', name: 'B', layout: { mode: 'ABSOLUTE', x: 60, y: 40, width: 20, height: 20 } },
      ],
    }]);
    expect(res.violations.some((v) => v.message.includes('容器没给 height'))).toBe(true);
  });

  it('已写 heightMode:"FIXED" 时不报违例', () => {
    const res = run([{
      kind: 'FRAME',
      name: '舞台',
      layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'FIXED', height: 260 },
      children: [
        { kind: 'RECTANGLE', name: 'A', layout: { mode: 'ABSOLUTE', x: 10, y: 10, width: 20, height: 20 } },
        { kind: 'RECTANGLE', name: 'B', layout: { mode: 'ABSOLUTE', x: 60, y: 40, width: 20, height: 20 } },
      ],
    }]);
    expect(res.violations.some((v) => v.message.includes('HUG 高度会算成 0'))).toBe(false);
  });

  it('有流式子项时不触发（流式子项撑得起高度）', () => {
    const res = run([{
      kind: 'FRAME',
      name: '混合',
      layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG' },
      children: [
        { kind: 'TEXT', name: '标题', text: 'hi' },
        { kind: 'RECTANGLE', name: '浮标', layout: { mode: 'ABSOLUTE', x: 10, y: 10, width: 20, height: 20 } },
      ],
    }]);
    expect(res.violations.some((v) => v.message.includes('HUG 高度会算成 0'))).toBe(false);
  });
});

/**
 * 规则 4（2026-10-31 新增）：**流式父 + 子项给了完整坐标却没声明 ABSOLUTE → 补 ABSOLUTE**。
 *
 * 真实来源：零食商城「我的」页，用户报「待发货这类按钮上，圆点怎么采取了行结构」。
 * 模型给角标写了 `x:28, y:-4`（坐标完全正确），**只漏了 `mode`**：
 * `compile.ts:468` 的判据是「父 ABSOLUTE **或** 子项 ABSOLUTE」，两个都不成立 →
 * 角标退化成 flex 的第二个子项，与图标横排。44 圆底塞 20+8+18=46px → 溢出。
 *
 * 断言的层次刻意分三层，缺一层就会「改了但没真修好」：
 *  ① AST 层：`mode` 被补成 ABSOLUTE（规则生效）
 *  ② 出码层：CSS 里真有 `position:absolute` + `left:28px` + `top:-4px`（坐标没被吞）
 *  ③ 兄弟层：图标**没有**被连带改成绝对定位（只升级该升级的那一个）
 */
describe('normalizeAbsolute · 规则 4（有坐标但漏写 mode → 补 ABSOLUTE）', () => {
  /** 复刻真实缺陷：44×44 圆底 + 20×20 图标 + 18×18 角标（漏 mode） */
  const badgeCase = (badgeLayout: Record<string, unknown>) =>
    run([{
      kind: 'FRAME',
      name: '图标底',
      layout: { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 44, height: 44, gap: 8, align: 'CENTER', justify: 'CENTER' },
      children: [
        { kind: 'VECTOR', name: '图标', layout: { width: 20, height: 20 } },
        { kind: 'FRAME', name: '角标', layout: { align: 'CENTER', justify: 'CENTER', ...badgeLayout } as never, children: [{ kind: 'TEXT', name: '数字', text: '2' }] },
      ],
    } as AiNodeSpec]);

  it('角标 x/y 齐全但漏定位 → 补 position:ABSOLUTE，出码是 absolute + left/top，且内部仍居中', () => {
    const res = badgeCase({ x: 28, y: -4, widthMode: 'HUG', heightMode: 'HUG', width: 18, height: 18 });
    const [底] = res.page.root.children as unknown as { children: { name: string; layout: { mode: string; position?: string } }[] }[];
    const 图标 = (底 as unknown as { children: { name: string; layout: { mode: string } }[] }).children[0];
    const 角标 = (底 as unknown as { children: { name: string; layout: { mode: string; position?: string } }[] }).children[1];

    // ① AST 层：补的是 position（脱流），不是 mode
    expect(角标.layout.position).toBe('ABSOLUTE');
    // 内部排版必须保持流式——角标里的数字要居中，mode:ABSOLUTE 会让它落到 0,0
    expect(角标.layout.mode).toBe('VERTICAL');
    // ③ 兄弟层：图标仍是普通流式子项，不能跟着一起脱流
    //    （叶子节点缺省 mode 是 VERTICAL，不继承父的 HORIZONTAL——断言落在这两点上会假红）
    expect(图标.layout.mode).not.toBe('ABSOLUTE');

    // ② 出码层：坐标必须真的落到 CSS 上，且内部 flex 居中还在
    const compiled = compilePage(res.page);
    const css = compiled.nodes.find((n) => n.id === (角标 as unknown as { id: string }).id)?.css as Record<string, string>;
    expect(css.position).toBe('absolute');
    expect(css.left).toBe('28px');
    expect(css.top).toBe('-4px');
    expect(css.display).toBe('flex');
    expect(css['align-items']).toBe('center');
    /**
     * 形状：HUG + 18×18 必须按 FIXED 出 18px。
     * 漏了这条断言，`normalizeHugSize` 整条规则就没被锁住——撤掉它测试仍然全绿，
     * 而实际产物会从「18×18 圆点」退成「7×12 竖长条」（2026-10-31 实测）。
     */
    expect(css.width).toBe('18px');
    expect(css.height).toBe('18px');

    // 静默：这是把意图翻译成合法 AST，不该触发自修环
    expect(res.violations).toHaveLength(0);
  });

  it('x:0 / y:0 → 不补定位（模型常用的交差写法，补了会挤乱兄弟排布）', () => {
    const res = badgeCase({ x: 0, y: 0, widthMode: 'HUG', heightMode: 'HUG', width: 18, height: 18 });
    const 底 = res.page.root.children[0] as unknown as { children: { name: string; layout: { position?: string } }[] };
    expect(底.children[1].layout.position).not.toBe('ABSOLUTE');
  });

  it('只给一个轴 → 不补定位（单轴更像漏填，不足以表达「放在某个角」）', () => {
    const res = badgeCase({ x: 28, widthMode: 'HUG', heightMode: 'HUG', width: 18, height: 18 });
    const 底 = res.page.root.children[0] as unknown as { children: { name: string; layout: { position?: string } }[] };
    expect(底.children[1].layout.position).not.toBe('ABSOLUTE');
  });

  it('父是 ABSOLUTE 时不介入（已是自由画布，子项 mode 不影响定位）', () => {
    const res = run([{
      kind: 'FRAME',
      name: '画布',
      layout: { mode: 'ABSOLUTE', x: 0, y: 0, widthMode: 'FILL', heightMode: 'FIXED', height: 200 },
      children: [
        { kind: 'RECTANGLE', name: 'A', layout: { x: 10, y: 10, width: 20, height: 20 } },
        { kind: 'RECTANGLE', name: 'B', layout: { x: 60, y: 40, width: 20, height: 20 } },
      ],
    }]);
    const 画布 = res.page.root.children[0] as unknown as { children: { layout: { mode: string } }[] };
    expect(画布.children[0].layout.mode).not.toBe('ABSOLUTE');
  });
});
