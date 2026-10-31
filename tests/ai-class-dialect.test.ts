/**
 * className 方言：阴影 / 字距 / 行高 / 字体家族（2026-10-29 补 StyleKit 素材时发现）
 *
 * 起因：把 20 份 StyleKit 风格规格（149 套风格库，每份带 Design Tokens）过一遍
 * `parseClassNames`，实测覆盖率只有 **68%**。被拒最多的不是边角料：
 *
 * | 次数 | class | 性质 |
 * |---|---|---|
 * | 51 | `shadow-sm/md/lg/xl/2xl` | **字段在、通道不在** |
 * | 31 | `font-mono/sans/serif` | 我们主动不给（风格包锁死） |
 * | 11 | `tracking-tight` | 字段在、通道不在 |
 * | 20+ | `bg-blue-500` / `border-gray-200` | 设计原则：只认语义令牌 |
 *
 * 三类性质必须分开处理，这是本文件的重点：
 *
 * 1. **补**：`shadow-*` / `tracking-*` / `leading-*` —— `effects`、`letterSpacing`、
 *    `lineHeight` 三个字段早就完整，`compile.ts` 也一直在出码，唯独 className 通道里
 *    没有这几行翻译。这跟 `margin` / `position` / `fills` / `decorations` 是同一形态，
 *    已经是第五例。
 * 2. **静默丢弃**：`font-mono` 这类。`fontFamily` 是我们**故意**不给的，
 *    为主动不给的能力报违例，等于惩罚模型写对的东西——只会白烧一轮自修，产物完全一样。
 * 3. **继续拒**：`bg-blue-500`。颜色必须走语义令牌，这是设计原则不是缺口；
 *    静默丢弃会让产物彻底没颜色，比报错更糟。
 */
import { describe, expect, it } from 'vitest';
import { parseClassNames } from '../src/editor/ai/tailwind';
import { draftToPage } from '../src/editor/ai/specToPage';
import { compilePage } from '../src/compiler/compile';
import { PACKS } from '../src/tokens/packs';
import type { AiNodeSpec, AiPageDraft, AiViolation } from '../src/editor/ai/types';
import type { UINode, UIPage } from '../src/schema/types';

const pack = PACKS[0];

/** 待测节点必须挂在 `root.children` 下：`draft.root` 的 layout 会被 PAGE 视口覆盖 */
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

const first = (page: UIPage): UINode => page.root.children[0];

function cssOf(page: UIPage, node: UINode): Record<string, string> {
  const compiled = compilePage(page);
  const hit = compiled.nodes.find((n) => n.id === node.id);
  return (hit?.css ?? {}) as Record<string, string>;
}

describe('阴影：className → effects', () => {
  it('shadow-md → DROP_SHADOW，产物 box-shadow 有值（修之前是 0 条）', () => {
    const { page, violations } = run([
      { kind: 'FRAME', name: '卡片', className: 'shadow-md rounded-lg', children: [] },
    ]);
    expect(violations).toHaveLength(0);
    const eff = first(page).style!.effects!;
    expect(eff).toHaveLength(1);
    expect(eff[0]).toMatchObject({ kind: 'DROP_SHADOW', x: 0, y: 4, blur: 6, spread: -1 });

    const css = cssOf(page, first(page));
    expect(css['box-shadow']).toContain('4px');
    expect(css['box-shadow']).toContain('rgba(0,0,0,0.1)');
  });

  it('六档全部命中，且 y 值单调递增（sm < md < lg < xl < 2xl）', () => {
    const { page, violations } = run([
      { kind: 'FRAME', name: 'a', className: 'shadow-sm', children: [] },
      { kind: 'FRAME', name: 'b', className: 'shadow', children: [] },
      { kind: 'FRAME', name: 'c', className: 'shadow-md', children: [] },
      { kind: 'FRAME', name: 'd', className: 'shadow-lg', children: [] },
      { kind: 'FRAME', name: 'e', className: 'shadow-xl', children: [] },
      { kind: 'FRAME', name: 'f', className: 'shadow-2xl', children: [] },
    ]);
    expect(violations).toHaveLength(0);
    const ys = page.root.children.map((n) => n.style!.effects![0].y!);
    expect(ys).toEqual([1, 1, 4, 10, 20, 25]);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1]);
  });

  it('任意值 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] → 硬边阴影（neo-brutalist 全靠它）', () => {
    const { page, violations } = run([
      {
        kind: 'FRAME',
        name: '野兽派卡片',
        className: 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none border-2',
        children: [],
      },
    ]);
    expect(violations).toHaveLength(0);
    expect(first(page).style!.effects![0]).toMatchObject({
      kind: 'DROP_SHADOW',
      x: 4,
      y: 4,
      blur: 0,
      spread: 0,
      color: 'rgba(0,0,0,1)',
    });
    // blur 必须是 0：硬边阴影一旦被模糊就不是野兽派了
    const css = cssOf(page, first(page));
    expect(css['box-shadow']).toBe('4px 4px 0px 0px rgba(0,0,0,1)');
  });

  it('任意值 inset → INNER_SHADOW', () => {
    const { page, violations } = run([
      { kind: 'FRAME', name: '凹槽', className: 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]', children: [] },
    ]);
    expect(violations).toHaveLength(0);
    expect(first(page).style!.effects![0].kind).toBe('INNER_SHADOW');
    expect(cssOf(page, first(page))['box-shadow']).toContain('inset');
  });

  it('shadow-none → effects 显式清空（不是忽略）', () => {
    const { page, violations } = run([
      { kind: 'FRAME', name: '平的', className: 'shadow-none', children: [] },
    ]);
    expect(violations).toHaveLength(0);
    expect(first(page).style!.effects).toEqual([]);
  });

  it('彩色阴影 shadow-red-500 → 仍拒（颜色必须走语义令牌，不猜）', () => {
    const { violations } = run([
      { kind: 'FRAME', name: '彩色阴影', className: 'shadow-red-500', children: [] },
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('shadow-red-500');
  });
});

describe('字距 / 行高：em 与倍数 → PERCENT 模式', () => {
  it('tracking-tight → letterSpacing -2.5 / PERCENT → 产物 -0.025em', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: '大标题', text: '川味小馆', className: 'tracking-tight' },
    ]);
    expect(violations).toHaveLength(0);
    const s = first(page).style!;
    expect(s.letterSpacing).toBe(-2.5);
    expect(s.letterSpacingMode).toBe('PERCENT');
    expect(cssOf(page, first(page))['letter-spacing']).toBe('-0.025em');
  });

  it('leading-relaxed → lineHeight 162.5 / PERCENT → 产物 1.625', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: '正文', text: '描述文字', className: 'leading-relaxed' },
    ]);
    expect(violations).toHaveLength(0);
    const s = first(page).style!;
    expect(s.lineHeight).toBe(162.5);
    expect(s.lineHeightMode).toBe('PERCENT');
    expect(cssOf(page, first(page))['line-height']).toBe('1.625');
  });

  it('任意值 tracking-[-0.04em] 与 leading-[26px] 都支持', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: 'a', text: 'x', className: 'tracking-[-0.04em]' },
      { kind: 'TEXT', name: 'b', text: 'y', className: 'leading-[26px]' },
    ]);
    expect(violations).toHaveLength(0);
    const [a, b] = page.root.children;
    expect(a.style!.letterSpacing).toBe(-4);
    expect(a.style!.letterSpacingMode).toBe('PERCENT');
    expect(b.style!.lineHeight).toBe(26);
    expect(b.style!.lineHeightMode).toBe('PIXELS');
  });

  it('PERCENT 行高不被 normalizeLineHeight 误判（125 是百分数不是 125px）', () => {
    // leading-none = 100 PERCENT。若被当成 px，会被判「100 < 字号？」再乘一遍
    const { page, violations } = run([
      { kind: 'TEXT', name: '紧凑标题', text: 'x', className: 'text-2xl leading-none' },
    ]);
    expect(violations).toHaveLength(0);
    const s = first(page).style!;
    expect(s.fontSize).toBe(24);
    expect(s.lineHeight).toBe(100);
    expect(s.lineHeightMode).toBe('PERCENT');
    expect(cssOf(page, first(page))['line-height']).toBe('1');
  });

  it('显式 style.lineHeight 覆盖 class，且成对的 mode 一起复位（否则 18 会变 0.18em）', () => {
    const { page } = run([
      { kind: 'TEXT', name: 'x', text: 'x', className: 'leading-tight', style: { lineHeight: 18 } },
    ]);
    const s = first(page).style!;
    expect(s.lineHeight).toBe(18);
    /**
     * `leading-tight` 给了 `mode:'PERCENT'`，显式只写 `lineHeight:18`。
     * 浅合并会留下 `{lineHeight:18, mode:'PERCENT'}` → 产物 `line-height: 0.18`。
     * 复位后 mode 回到缺省（undefined = PIXELS）。
     * 断言落在**产物**上而不是内部字段：字段对了但 CSS 错的情况已经出现过太多次。
     */
    expect(s.lineHeightMode).toBeUndefined();
    expect(cssOf(page, first(page))['line-height']).toBe('18px');
  });
});

describe('字体家族：静默丢弃，不报违例', () => {
  it('font-mono / font-sans / font-serif 全部零违例', () => {
    const { violations } = run([
      { kind: 'TEXT', name: 'a', text: 'x', className: 'font-mono' },
      { kind: 'TEXT', name: 'b', text: 'x', className: 'font-sans' },
      { kind: 'TEXT', name: 'c', text: 'x', className: 'font-serif' },
    ]);
    expect(violations).toHaveLength(0);
  });

  it('字体族：font-serif / font-mono 映射到受控栈，后写的赢', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: 'x', text: 'x', className: 'font-mono font-serif' },
    ]);
    // 后写的覆盖前写的：serif 的栈里必须有宋体
    expect(first(page).style!.fontFamily).toContain('Songti SC');
    expect(violations).toHaveLength(0);
  });

  it('字体族：font-system / font-display 仍静默丢弃（没有确定族含义）', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: 'x', text: 'x', className: 'font-system font-display font-body' },
    ]);
    expect(first(page).style!.fontFamily).toBeUndefined();
    expect(violations).toHaveLength(0);
  });

  it('反向验证：任意字体名不放进 fontFamily（没装的字体会静默退化）', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: 'x', text: 'x', style: { fontFamily: 'Noto Serif SC' } },
    ]);
    expect(first(page).style!.fontFamily).toBeUndefined();
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].message).toContain('fontFamily');
  });

  it('反向验证：font-black 是字重 900，不能跟着家族一起被丢掉', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: 'x', text: 'x', className: 'font-black' },
    ]);
    expect(violations).toHaveLength(0);
    expect(first(page).style!.fontWeight).toBe(900);
  });
});

describe('设计原则：调色板色继续拒（不是缺口）', () => {
  it('bg-blue-500 进违例（颜色必须走语义令牌）', () => {
    const { violations } = run([
      { kind: 'FRAME', name: 'x', className: 'bg-blue-500', children: [] },
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('bg-blue-500');
  });

  it('bg-primary 这类语义令牌正常通过（解析成包内 hex）', () => {
    const { page, violations } = run([
      { kind: 'FRAME', name: 'x', className: 'bg-primary', children: [] },
    ]);
    expect(violations).toHaveLength(0);
    // 令牌在 AI 阶段就解析成 hex（出码器拿不到 pack），所以断言落在「是合法 hex」而不是令牌名
    expect(first(page).style!.background).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('行高缺省值不能被当成倍数（2026-10-29 neo-brutalist 验证页抓到的 bug）', () => {
  it('text-3xl 只写 className 不给行高 → 行高按字号算，不是 22×30=660', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: '大标题', text: 'RAW', className: 'text-3xl font-black' },
    ]);
    expect(violations).toHaveLength(0);
    const s = first(page).style!;
    expect(s.fontSize).toBe(30);
    /**
     * `factory.ts:137` 给 TEXT 的缺省是 `lineHeight: 22`（配 16px 字号）。
     * 第一版 `normalizeLineHeight` 的判据是「行高 < 字号 → 必是倍数」，
     * 于是 22 < 30 成立 → 22 × 30 = **660px**，标题占满整屏。
     * schema 不报错、违例 0 条，只有截图能发现。
     *
     * 修复分两半：① 判据改成「≤ 3 才是倍数」；② 两边都没给行高时删掉 factory 缺省，
     * 让 compile 按最终字号算 `fontSize × 1.4`。只改判据的话 22px 配 30px 字号会挤。
     */
    expect(s.lineHeight).toBeUndefined();
    expect(cssOf(page, first(page))['line-height']).toBe('42px'); // 30 × 1.4
  });

  it('显式 px 行高 18 配字号 30 → 保持 18，不会被乘成 540', () => {
    const { page } = run([
      { kind: 'TEXT', name: '标题', text: 'x', className: 'text-3xl', style: { lineHeight: 18 } },
    ]);
    expect(first(page).style!.lineHeight).toBe(18);
    expect(cssOf(page, first(page))['line-height']).toBe('18px');
  });

  it('text-xs 不给行高 → 也按字号算（缺省 22 对 12px 字太松）', () => {
    const { page } = run([
      { kind: 'TEXT', name: '小字', text: 'x', className: 'text-xs' },
    ]);
    expect(first(page).style!.lineHeight).toBeUndefined();
    expect(cssOf(page, first(page))['line-height']).toBe('17px'); // 12 × 1.4 = 16.8 → 17
  });

  it('反向验证：leading-* 给了行高时不能删（只有两边都没给才删）', () => {
    const { page } = run([
      { kind: 'TEXT', name: '标题', text: 'x', className: 'text-3xl leading-tight' },
    ]);
    const s = first(page).style!;
    expect(s.lineHeight).toBe(125);
    expect(s.lineHeightMode).toBe('PERCENT');
    expect(cssOf(page, first(page))['line-height']).toBe('1.25');
  });
});

describe('parseClassNames 直接断言（不经 draftToPage）', () => {
  it('shadow-md 不再出现在 unknown 里', () => {
    const r = parseClassNames('shadow-md shadow-lg shadow-[0_1px_2px_#000] shadow-none shadow-inner');
    expect(r.unknown).toEqual([]);
    expect(r.style.effects).toHaveLength(1);
    // 后写的 shadow-inner 覆盖前面的
    expect(r.style.effects![0].kind).toBe('INNER_SHADOW');
  });

  it('tracking / leading 全档位都在白名单内', () => {
    const r = parseClassNames(
      'tracking-tighter tracking-tight tracking-normal tracking-wide tracking-wider tracking-widest ' +
        'leading-none leading-tight leading-snug leading-normal leading-relaxed leading-loose',
    );
    expect(r.unknown).toEqual([]);
  });

  it('反向验证：unknown 仍然收集真正的越界写法', () => {
    const r = parseClassNames('shadow-2xs tracking-super leading-[3rem] md:shadow-md');
    // 2xs / super / rem 都不在受控子集，变体前缀也不认
    expect(r.unknown.length).toBeGreaterThanOrEqual(3);
  });

  it('border 宽度两种写法都认（数字档 + 任意值）', () => {
    const num = parseClassNames('border-2 border-[#1C1C1C]');
    expect(num.unknown).toEqual([]);
    expect(num.style.border).toEqual({ width: 2, color: '#1C1C1C', style: 'solid' });

    const arb = parseClassNames('border-[3px]');
    expect(arb.unknown).toEqual([]);
    expect(arb.style.border?.width).toBe(3);

    // 反向验证：小数 px 合法，非 px 单位仍拒
    expect(parseClassNames('border-[1.5px]').style.border?.width).toBe(1.5);
    expect(parseClassNames('border-[2rem]').unknown).toEqual(['border-[2rem]']);
  });
});
