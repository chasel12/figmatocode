/**
 * 布局单位与定位通道（2026-10-29 点菜小程序对比实验修出来的三个缺陷）
 *
 * 三件事全是「字段在、语义不在」的静默失败——schema 不报、字段齐全、
 * 产物 CSS 也在，只有渲染出来才发现错：
 *
 *  1. **`lineHeight` 单位歧义**：模型按 CSS 习惯写 `1.2`（倍数），AST 缺省语义是 PIXELS，
 *     于是产物出现 `line-height: 1.2px`，多行文字直接叠在一起。
 *  2. **`position: FIXED` 不在 AI 契约里**：AST 有（`LayoutSchema.position`）、
 *     `compile.ts` 有，唯独模型不知道能写。结果移动端页面必备的固定底栏只能当普通流式子项，
 *     内容一超长就被顶出视口——产物里那条「去结算」直接看不见。
 *  3. **暗色主题下图片占位色不跟主题**：占位亮度写死 68~96%，
 *     用在近黑底上就是往画面里贴白纸，比正文还抢眼。
 *
 * 第 3 条不是「不好看」而是「读错」：占位块的作用是让人看出「这里要放图」，
 * 亮到刺眼时读起来像「渲染坏了」。
 */
import { describe, expect, it } from 'vitest';
import { draftToPage } from '../src/editor/ai/specToPage';
import { compilePage } from '../src/compiler/compile';
import { buildPreviewDom } from '../src/generator/html';
import { imagePlaceholderCss, isDarkColor, placeholderTint } from '../src/generator/imagePlaceholder';
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

/** 某个节点在产物里的 CSS 声明串（从 buildPreviewDom 的 css 里捞） */
function cssOf(page: UIPage, node: UINode): Record<string, string> {
  const compiled = compilePage(page);
  const hit = compiled.nodes.find((n) => n.id === node.id);
  return (hit?.css ?? {}) as Record<string, string>;
}

describe('lineHeight 倍数归一化', () => {
  it('倍数（1.2 < 字号 24）→ 换算成 29px，且**不报违例**', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: '标题', text: '川味小馆', style: { fontSize: 24, lineHeight: 1.2 } },
    ]);
    const style = first(page).style!;
    expect(style.lineHeight).toBe(29);
    expect(style.lineHeightMode).toBe('PIXELS');
    /**
     * 刻意不报违例：倍数写法是 CSS 常识（我们自己写 styleRecipes 时也写 1.5），
     * 报违例只会进自修环多烧一轮，换来的产物完全一样。
     * 与 `className` 同原则——转换层负责翻译方言，翻译成功就静默完成。
     */
    expect(violations.filter((v) => v.path.includes('lineHeight'))).toHaveLength(0);
  });

  it('绝对值（20 > 字号 14）→ 原样保留，不报违例', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: '正文', text: '描述', style: { fontSize: 14, lineHeight: 20 } },
    ]);
    const style = first(page).style!;
    expect(style.lineHeight).toBe(20);
    expect(violations.filter((v) => v.path.includes('lineHeight'))).toHaveLength(0);
  });

  it('行高等于字号 → 不误判（紧凑行高是合法写法）', () => {
    const { page, violations } = run([
      { kind: 'TEXT', name: '紧凑', text: 'x', style: { fontSize: 12, lineHeight: 12 } },
    ]);
    expect(first(page).style!.lineHeight).toBe(12);
    expect(violations.filter((v) => v.path.includes('lineHeight'))).toHaveLength(0);
  });

  it('字号来自 className（text-2xl → 24）时也能算对', () => {
    // 归一化必须在 className 与显式 style 合并之后执行，否则拿不到最终字号
    const { page } = run([
      { kind: 'TEXT', name: '标题', text: '川味小馆', className: 'text-2xl', style: { lineHeight: 1.2 } },
    ]);
    const style = first(page).style!;
    expect(style.fontSize).toBe(24);
    expect(style.lineHeight).toBe(29);
  });

  it('反向验证：产物 CSS 里不能再出现 1.2px 这种行高', () => {
    const { page } = run([
      { kind: 'TEXT', name: '标题', text: '川味小馆', style: { fontSize: 24, lineHeight: 1.2 } },
    ]);
    const { css } = buildPreviewDom(page, compilePage(page));
    expect(css).not.toMatch(/line-height:\s*1\.2px/);
    expect(css).toMatch(/line-height:\s*29px/);
  });
});

describe('position: FIXED 通道（固定底栏）', () => {
  const bottomBar = (extra: Record<string, unknown> = {}): AiNodeSpec =>
    ({
      kind: 'FRAME',
      name: '底栏',
      layout: {
        mode: 'HORIZONTAL',
        widthMode: 'FILL',
        heightMode: 'FIXED',
        height: 68,
        justify: 'SPACE_BETWEEN',
        align: 'CENTER',
        position: 'FIXED',
        stickyBottom: 0,
        ...extra,
      },
      children: [{ kind: 'TEXT', name: '合计', text: '¥118' }],
    }) as AiNodeSpec;

  it('AI 契约的 position 能落到 AST 并出 position:fixed / bottom:0', () => {
    const { page, violations } = run([bottomBar()]);
    const node = first(page);
    expect(node.layout.position).toBe('FIXED');
    expect(node.layout.stickyBottom).toBe(0);
    const css = cssOf(page, node);
    expect(css.position).toBe('fixed');
    // B5：贴底固定元素带安全区抬升（env() 无安全区时回退 0，渲染不变）
    expect(css.bottom).toContain('env(safe-area-inset-bottom');
    // 不该被 normalizeAbsolute 降级（它压根不是 ABSOLUTE）
    expect(node.layout.mode).toBe('HORIZONTAL');
    expect(violations.filter((v) => v.path.includes('layout.mode'))).toHaveLength(0);
  });

  it('FIXED 下内部 flex 仍然生效（这正是它相对 ABSOLUTE 的价值）', () => {
    const { page } = run([bottomBar()]);
    const css = cssOf(page, first(page));
    expect(css['justify-content']).toBe('space-between');
    expect(css['align-items']).toBe('center');
  });

  it('反向验证：ABSOLUTE 容器不输出 flex 排布（所以不能拿它做底栏）', () => {
    // 子项必须给**不同**的 x/y：否则 normalizeAbsolute 规则 1 会把容器降级成 VERTICAL，
    // 测到的是降级后的结果（justify 反而生效了），断言就会假红
    const { page } = run([
      {
        kind: 'FRAME',
        name: '画布',
        layout: {
          mode: 'ABSOLUTE',
          x: 0,
          y: 700,
          width: 375,
          height: 68,
          widthMode: 'FIXED',
          heightMode: 'FIXED',
          justify: 'SPACE_BETWEEN',
          align: 'CENTER',
        },
        children: [
          { kind: 'TEXT', name: '合计', text: '¥118', layout: { mode: 'ABSOLUTE', x: 0, y: 0 } },
          { kind: 'TEXT', name: '说明', text: '含餐具费', layout: { mode: 'ABSOLUTE', x: 120, y: 0 } },
        ],
      } as AiNodeSpec,
    ]);
    const node = first(page);
    expect(node.layout.mode).toBe('ABSOLUTE'); // 确认没被降级，否则这条测的就不是 ABSOLUTE
    const css = cssOf(page, node);
    expect(css.position).toBe('absolute');
    expect(css['justify-content']).toBeUndefined();
    expect(css['align-items']).toBeUndefined();
  });

  it('ABSOLUTE + 自己有坐标 + 子项无坐标 → 降级但消息指向 position 写法', () => {
    const { violations } = run([
      {
        kind: 'FRAME',
        name: '底栏',
        layout: { mode: 'ABSOLUTE', x: 0, y: 744, width: 375, height: 68, justify: 'SPACE_BETWEEN' },
        children: [
          { kind: 'TEXT', name: 'A', text: 'a' },
          { kind: 'TEXT', name: 'B', text: 'b' },
        ],
      } as AiNodeSpec,
    ]);
    const hit = violations.find((v) => v.path.includes('layout.mode'));
    expect(hit).toBeTruthy();
    // 只降级不说替代写法 = 模型只会反复调 x/y
    expect(hit!.message).toContain('position');
    expect(hit!.message).toContain('stickyBottom');
  });
});

describe('暗色主题的图片占位色', () => {
  it('isDarkColor 判得对（含 3 位简写与非颜色串）', () => {
    expect(isDarkColor('#0a0f0d')).toBe(true);
    expect(isDarkColor('#121a16')).toBe(true);
    expect(isDarkColor('#ffffff')).toBe(false);
    expect(isDarkColor('#fff')).toBe(false);
    expect(isDarkColor('#000')).toBe(true);
    expect(isDarkColor('rgba(0,0,0,0.5)')).toBe(false); // 解析不了就当亮色，保持历史行为
    expect(isDarkColor(undefined)).toBe(false);
  });

  it('暗色配方的亮度显著低于亮色配方', () => {
    const lums = (tint: string): number[] =>
      [...tint.matchAll(/hsl\(\d+ \d+% (\d+)%\)/g)].map((m) => Number(m[1]));
    const light = lums(placeholderTint('菜品图'));
    const dark = lums(placeholderTint('菜品图', true));
    expect(Math.max(...light)).toBeGreaterThan(70);
    expect(Math.max(...dark)).toBeLessThan(40);
  });

  it('色相不受明暗影响（同名同色相，只换明度）', () => {
    const hue = (tint: string): string => (tint.match(/hsl\((\d+)/) ?? [])[1] ?? '';
    expect(hue(placeholderTint('水煮牛肉图'))).toBe(hue(placeholderTint('水煮牛肉图', true)));
  });

  it('imagePlaceholderCss 暗色版换掉兜底底色与高光强度', () => {
    const nodes = [{ type: 'IMAGE', name: '菜品图', src: '' }];
    const light = imagePlaceholderCss(nodes, false);
    const dark = imagePlaceholderCss(nodes, true);
    expect(light).toContain('#ececf1');
    expect(dark).not.toContain('#ececf1');
    expect(dark).toContain('rgba(255,255,255,0.10)');
    expect(light).toContain('rgba(255,255,255,0.75)');
  });

  it('缺省仍是亮色（既有 19 页像素基线不受影响）', () => {
    const nodes = [{ type: 'IMAGE', name: '菜品图', src: '' }];
    expect(imagePlaceholderCss(nodes)).toBe(imagePlaceholderCss(nodes, false));
  });
});
