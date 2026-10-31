/**
 * Tailwind class → layout/style 映射器（`src/editor/ai/tailwind.ts`）的契约测试。
 *
 * 分三层：
 *  1. **映射表正确性**：每条 class 落在哪个字段、什么值；
 *  2. **不静默丢弃**：映射不了的 class 必须进 unknown（这是「AI 写的」与「画布上看到的」
 *     保持一致的前提），无害装饰性 class 例外；
 *  3. **等价性**：同一份视觉用 className 写和用 layout 手写，**几何必须完全相同**——
 *     这条是「换表达通道不改变产物」的核心保证。
 */
import { describe, expect, it } from 'vitest';
import { createApproxMeasure, resolveLayout } from '../src/compiler';
import { draftToPage } from '../src/editor/ai/specToPage';
import { parseClassNames, layoutToClassName } from '../src/editor/ai/tailwind';
import type { AiNodeSpec, AiPageDraft } from '../src/editor/ai/types';
import type { UINode, UIPage } from '../src/schema/types';
import { getPack } from '../src/tokens/packs';

const pack = getPack('shadcn');

const L = (cls: string) => parseClassNames(cls).layout;
const S = (cls: string) => parseClassNames(cls).style;

describe('class → layout', () => {
  it('方向：flex / flex-row / flex-col', () => {
    expect(L('flex').mode).toBe('HORIZONTAL');
    expect(L('flex-row').mode).toBe('HORIZONTAL');
    expect(L('flex-col').mode).toBe('VERTICAL');
  });

  it('对齐：items-* / justify-*', () => {
    const l = L('items-center justify-between');
    expect(l.align).toBe('CENTER');
    expect(l.justify).toBe('SPACE_BETWEEN');
    expect(L('items-stretch').align).toBe('STRETCH');
    expect(L('justify-end').justify).toBe('END');
  });

  it('内边距累积而不是互相覆盖（px-4 py-2 → [8,16,8,16]）', () => {
    expect(L('px-4 py-2').padding).toEqual([8, 16, 8, 16]);
    expect(L('p-3').padding).toEqual([12, 12, 12, 12]);
    expect(L('pt-1 pb-2').padding).toEqual([4, 0, 8, 0]);
  });

  it('间距：gap-N 与任意值', () => {
    expect(L('gap-3').gap).toBe(12);
    expect(L('gap-[10px]').gap).toBe(10);
  });

  it('尺寸：w/h 的 full / auto / 数值 / 任意值', () => {
    expect(L('w-full').widthMode).toBe('FILL');
    expect(L('h-full').heightMode).toBe('FILL');
    expect(L('w-auto').widthMode).toBe('HUG');
    const h = L('h-14');
    expect(h.height).toBe(56);
    expect(h.heightMode).toBe('FIXED');
    expect(L('w-[137px]').width).toBe(137);
  });

  it('flex-1 的撑满方向跟着主轴走（class 顺序无关）', () => {
    const row = L('flex-1 flex');
    expect(row.flexGrow).toBe(1);
    expect(row.widthMode).toBe('FILL');

    const col = L('flex-col flex-1');
    expect(col.flexGrow).toBe(1);
    expect(col.heightMode).toBe('FILL');
  });

  it('裁切与伸缩', () => {
    expect(L('overflow-hidden').clipContent).toBe(true);
    expect(L('shrink-0').flexShrink).toBe(0);
  });
});

describe('class → style', () => {
  it('字号 / 字重 / 文字颜色可以同时出现（text- 前缀二义性）', () => {
    const s = S('text-lg font-semibold text-primary');
    expect(s.fontSize).toBe(18);
    expect(s.fontWeight).toBe(600);
    expect(s.color).toBe('@color.primary');
  });

  it('任意字号', () => {
    expect(S('text-[13px]').fontSize).toBe(13);
  });

  it('文本对齐优先于字号解析', () => {
    expect(S('text-center').textAlign).toBe('center');
    expect(S('text-center').fontSize).toBeUndefined();
  });

  it('圆角：无后缀 / 命名 / full', () => {
    expect(S('rounded').borderRadius).toBe(4);
    expect(S('rounded-xl').borderRadius).toBe(12);
    expect(S('rounded-full').borderRadius).toBe(9999);
  });

  it('边框：宽度与颜色合并进同一个 border', () => {
    const s = S('border-2 border-border');
    expect(s.border).toEqual({ width: 2, color: '@color.border', style: 'solid' });
    // 只写颜色时宽度缺省 1
    expect(S('border-primary').border).toEqual({ width: 1, color: '@color.primary', style: 'solid' });
  });

  it('背景色：令牌名 / hex 任意值 / 具名色', () => {
    expect(S('bg-card').background).toBe('@color.card');
    expect(S('bg-[#1677FF]').background).toBe('#1677FF');
    expect(S('bg-white').background).toBe('#FFFFFF');
  });

  it('透明度按百分比折算', () => {
    expect(S('opacity-60').opacity).toBe(0.6);
  });
});

describe('映射不了的一律进 unknown（不静默丢弃）', () => {
  it('越界语法', () => {
    /**
     * 2026-10-29 更新：`leading-tight` 已从「越界」变成受支持（补 StyleKit 素材时加的，
     * 见 `tests/ai-class-dialect.test.ts`），所以换成 `shadow-red-500` 保持这条测试的强度
     * ——它代表「能识别前缀但取值不在受控子集」这一类，必须继续进 unknown。
     */
    const { unknown } = parseClassNames('grid md:flex hover:bg-card gap-x-4 rounded-t-lg justify-around shadow-red-500');
    expect(unknown).toEqual(['grid', 'md:flex', 'hover:bg-card', 'gap-x-4', 'rounded-t-lg', 'justify-around', 'shadow-red-500']);
  });

  it('Tailwind 默认色板没有对应令牌，不能硬映射成包外色值', () => {
    const { style, unknown } = parseClassNames('bg-blue-500');
    expect(style.background).toBeUndefined();
    expect(unknown).toEqual(['bg-blue-500']);
  });

  it('无害装饰性 class 被忽略，不产生噪声违例', () => {
    const { unknown } = parseClassNames('antialiased select-none transition duration-200 cursor-pointer');
    expect(unknown).toEqual([]);
  });
});

describe('往返：layout/style → className → layout/style 不丢字段', () => {
  /**
   * 反向映射存在的唯一理由是「让 few-shot 样例用 className 写」。
   * 既然样例会被模型当模板抄，它就必须和正向映射严格对称——否则样例本身就在教错东西。
   */
  it('布局字段往返一致', () => {
    const layout = {
      mode: 'HORIZONTAL' as const,
      align: 'CENTER' as const,
      justify: 'SPACE_BETWEEN' as const,
      padding: [8, 16, 8, 16] as [number, number, number, number],
      gap: 12,
      widthMode: 'FILL' as const,
      heightMode: 'FIXED' as const,
      height: 56,
      flexGrow: 1,
      clipContent: true,
    };
    const cls = layoutToClassName(layout, {});
    // 数值优先落标准刻度（h-14 而不是 h-[56px]），模型见过的是前者
    expect(cls).toBe('flex items-center justify-between py-2 px-4 gap-3 w-full h-14 flex-1 overflow-hidden');
    expect(parseClassNames(cls).layout).toEqual(layout);
  });

  it('刻度表里没有的才退到任意值语法，仍能往返', () => {
    // 10px = 2.5 单位，命中 Tailwind 刻度 → py-2.5；13px 不在刻度上 → gap-[13px]
    const layout = { padding: [10, 16, 10, 16] as [number, number, number, number], gap: 13 };
    const cls = layoutToClassName(layout, {});
    expect(cls).toBe('py-2.5 px-4 gap-[13px]');
    expect(parseClassNames(cls).layout).toEqual(layout);
  });

  it('样式字段往返一致', () => {
    const style = {
      fontSize: 18,
      fontWeight: 600,
      textAlign: 'center' as const,
      background: '@color.card',
      color: '@color.foreground',
      borderRadius: 12,
      border: { width: 1, color: '@color.border', style: 'solid' as const },
      opacity: 0.6,
    };
    const cls = layoutToClassName({}, style);
    expect(parseClassNames(cls).style).toEqual(style);
  });
});

/* ------------------------------------------------------------------ */
/* 等价性：换表达通道不能改变产物几何                                    */
/* ------------------------------------------------------------------ */

const geoOf = (page: UIPage): number[][] => {
  const geo = resolveLayout(page, createApproxMeasure());
  const out: number[][] = [];
  const walk = (n: UINode): void => {
    const g = geo[n.id];
    if (g) out.push([Math.round(g.x), Math.round(g.y), Math.round(g.width), Math.round(g.height)]);
    if ('children' in n) for (const c of n.children) walk(c);
  };
  walk(page.root);
  return out;
};

const draftOf = (nav: AiNodeSpec, card: AiNodeSpec): AiPageDraft => ({
  kind: 'page',
  name: '等价性',
  width: 375,
  height: 812,
  root: { kind: 'FRAME', className: 'flex-col w-full', children: [nav, card] },
});

describe('等价性：className 与手写 layout 产出相同几何', () => {
  it('同一份视觉，两种写法 → 每个节点的 x/y/w/h 完全一致', () => {
    const navByClass: AiNodeSpec = {
      kind: 'FRAME',
      name: '导航',
      className: 'flex items-center justify-between px-4 h-14 w-full bg-card',
      children: [
        { kind: 'TEXT', text: '标题', className: 'text-lg font-semibold text-foreground' },
        { kind: 'TEXT', text: '更多', className: 'text-sm text-muted-foreground' },
      ],
    };
    const navByLayout: AiNodeSpec = {
      kind: 'FRAME',
      name: '导航',
      layout: {
        mode: 'HORIZONTAL',
        align: 'CENTER',
        justify: 'SPACE_BETWEEN',
        padding: [0, 16, 0, 16],
        height: 56,
        heightMode: 'FIXED',
        widthMode: 'FILL',
      },
      style: { background: '@color.card' },
      children: [
        { kind: 'TEXT', text: '标题', style: { fontSize: 18, fontWeight: 600, color: '@color.foreground' } },
        { kind: 'TEXT', text: '更多', style: { fontSize: 14, color: '@color.muted-foreground' } },
      ],
    };

    const cardByClass: AiNodeSpec = {
      kind: 'FRAME',
      name: '卡片',
      className: 'flex-col gap-2 p-4 rounded-xl border border-border w-full bg-card',
      children: [{ kind: 'TEXT', text: '正文', className: 'text-sm text-foreground' }],
    };
    const cardByLayout: AiNodeSpec = {
      kind: 'FRAME',
      name: '卡片',
      layout: { mode: 'VERTICAL', gap: 8, padding: [16, 16, 16, 16], widthMode: 'FILL' },
      style: {
        background: '@color.card',
        borderRadius: 12,
        border: { width: 1, color: '@color.border', style: 'solid' },
      },
      children: [{ kind: 'TEXT', text: '正文', style: { fontSize: 14, color: '@color.foreground' } }],
    };

    const a = draftToPage(draftOf(navByClass, cardByClass), { pack });
    const b = draftToPage(draftOf(navByLayout, cardByLayout), { pack });

    expect(a.violations).toEqual([]);
    expect(b.violations).toEqual([]);
    expect(geoOf(a.page)).toEqual(geoOf(b.page));
  });

  it('颜色令牌经 className 也走同一条解析路径（bg-primary → 风格包 hex）', () => {
    const { page, violations } = draftToPage(
      {
        kind: 'page',
        name: '令牌',
        root: {
          kind: 'FRAME',
          className: 'p-4 bg-primary w-full',
          children: [{ kind: 'TEXT', text: '按钮', className: 'text-primary-foreground text-sm' }],
        },
      },
      { pack },
    );
    expect(violations).toEqual([]);
    expect(page.root.style?.background).toBe(pack.colors.primary);
    expect(page.root.children[0].style?.color).toBe(pack.colors['primary-foreground']);
  });

  it('显式 layout 覆盖 className 的同名字段（精确控制优先）', () => {
    const { page } = draftToPage(
      {
        kind: 'page',
        name: '覆盖',
        root: {
          kind: 'FRAME',
          className: 'gap-2 p-4 w-full',
          layout: { gap: 24 },
          children: [{ kind: 'TEXT', text: 'x' }],
        },
      },
      { pack },
    );
    expect(page.root.layout.gap).toBe(24); // 显式覆盖 gap-2(=8)
    expect(page.root.layout.padding).toEqual([16, 16, 16, 16]); // className 保留
  });

  it('未知 class 生成违例（喂自修环），但仍产出可用页面', () => {
    const { page, violations } = draftToPage(
      {
        kind: 'page',
        name: '违例',
        root: {
          kind: 'FRAME',
          className: 'grid grid-cols-2 gap-4',
          children: [{ kind: 'TEXT', text: 'x' }],
        },
      },
      { pack },
    );
    expect(violations.some((v) => /不支持的 class/.test(v.message) && /grid/.test(v.message))).toBe(true);
    expect(page.root.layout.gap).toBe(16); // 能映射的部分照常生效
  });

  it('VECTOR 的 24×24 缺省不会覆盖 class 给的尺寸（契约示例教的就是 w-4 h-4）', () => {
    const { page, violations } = draftToPage(
      {
        kind: 'page',
        name: '图标',
        root: {
          kind: 'FRAME',
          className: 'flex items-center gap-2 w-full',
          children: [
            { kind: 'VECTOR', icon: 'search', className: 'w-4 h-4 text-muted-foreground' },
            { kind: 'VECTOR', icon: 'search', className: 'text-muted-foreground' },
          ],
        },
      },
      { pack, icons: { search: 'M 1 1 L 2 2' } },
    );
    expect(violations).toEqual([]);
    expect(page.root.children[0].layout.width).toBe(16); // w-4
    expect(page.root.children[0].layout.height).toBe(16); // h-4
    expect(page.root.children[1].layout.width).toBe(24); // 没写尺寸 → 图标缺省 24
  });
});
