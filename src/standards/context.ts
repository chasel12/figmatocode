/**
 * 规则上下文构建：把 `UIPage` 拍平成「每个节点 + 它真正看到的背景/文字色」。
 *
 * 为什么不让每条规则自己爬祖先链：
 *  - 「有效背景」的口径只该有一份（谁先算谁说了算，两条规则算出两个背景 = 假绿温床）
 *  - 规则要能在 fixture 上跑，就得能脱离真实页面构造上下文
 *
 * **不可判定 ≠ 不合规**：渐变背景、图片、半透明叠层一律记 `background: null`，
 * 依赖它的规则跳过。这是本项目一贯的纪律（同 `ai-metrics` 的「查不出就不算通过率」）。
 */
import type { ContainerNode, UINode, UIPage } from '../schema/types';
import { isContainer } from '../schema/types';
import { isOpaque, parseColor } from './color';
import type { Platform, ResolvedNode, RuleContext, SiteContext } from './types';

/** 页面缺省底色：`generateHtml` 出的是白底，没声明背景的根容器等于白 */
export const PAGE_DEFAULT_BG = '#FFFFFF';
const DEFAULT_TEXT = '#000000';

export interface BuildOptions {
  platform?: Platform;
  site?: SiteContext;
  css?: string;
  html?: string;
}

/**
 * 节点自身填充的解析结果。
 *
 * **`inherit` 与 `unknown` 必须分开**：`inherit` 是「我没画背景，看我爹的」；
 * `unknown` 是「我画了，但画的是渐变/半透明，算不出对比度」。合成一个 `null` 会让
 * 渐变背景的卡片**错误地**继承到祖先的白底，从而报出一条根本不成立的对比度违例
 * （第一版就是这么错的：`contrast-skip-gradient` 正例命中 1 条）。
 */
export type BgResolution = { state: 'inherit' } | { state: 'color'; value: string } | { state: 'unknown' };

/**
 * 取节点自身的**不透明**填充色。
 *
 * 判定顺序与出码一致：`fills`（首层可见）优先于 `background`，与 `compile.ts` 的
 * 「未设 fills 时回退 background」同向。
 */
export function ownBackground(node: UINode): BgResolution {
  const style = node.style;
  if (!style) return { state: 'inherit' };
  const fills = style.fills?.filter((f) => f.visible !== false) ?? [];
  if (fills.length) {
    // 多层叠在一起时，只要有一层不是纯色不透明，结果就不可判定
    const solid = fills.every((f) => f.type === 'SOLID');
    if (!solid) return { state: 'unknown' };
    const top = parseColor(fills[0].color);
    const alpha = (fills[0].opacity ?? 1) * (top?.a ?? 1);
    if (!top || alpha < 0.999) return { state: 'unknown' };
    return { state: 'color', value: fills[0].color as string };
  }
  if (style.background) {
    const c = parseColor(style.background);
    if (!isOpaque(c)) return { state: 'unknown' };
    return { state: 'color', value: style.background };
  }
  return { state: 'inherit' };
}

/**
 * 该容器是否有「铺满的背景层」子节点。
 *
 * 判据四件齐：`position: ABSOLUTE`（脱流不占位）+ `widthMode: FILL`（横向铺满）
 * + 高度 ≥ 父高 80% + 有可见填充。
 *
 * 为什么要这个函数：有一种很常见的写法是把背景画在**同级兄弟**上 —— 一个绝对定位的
 * 矩形铺满父容器，文字再叠上去（demo「13 绝对定位页」的海报就是这样，白字压在渐变上）。
 * 这种结构从 AST 爬祖先链永远看不到那个矩形，算出来的「有效背景」是父容器的底色，
 * 于是白字压白底 = 1.07:1，报出一条根本不存在的违例。
 *
 * 加高度比例是为了不把**角标**当成背景层 —— 角标同样是 ABSOLUTE，但只有 18×18。
 *
 * 这个判定有两个消费者，口径必须唯一：
 * - 生成侧 `specToPage.normalizeInvisibleText`（决定要不要改文字色）
 * - 审计侧 `bugscan.detectors` 的 `text-invisible`（决定要不要报）
 * 两边算出不同结论就是「同一条规则自己和自己打架」。
 */
export function hasBackdropLayer(parent: UINode): boolean {
  if (!isContainer(parent)) return false;
  const ph = parent.layout.height ?? 0;
  /**
   * **父容器 `mode: 'ABSOLUTE'` 时，子节点天然脱流**，不需要各自声明 `position`。
   *
   * 这一条是踩过才补的：demo「13 绝对定位页」的海报 `mode=ABSOLUTE`，里面的背景矩形
   * 只写了 `widthMode:FILL` + `height:420`，**没有 `position` 字段**。
   * 第一版判据要求 `position === 'ABSOLUTE'`，于是永远返回 false ——
   * 这条「防误报」的防线写了却从未生效，只是恰好那条路径当时没被跑到。
   */
  const parentAbs = parent.layout.mode === 'ABSOLUTE';
  return parent.children.some((c) => {
    const L = c.layout;
    const S = c.style;
    const outOfFlow = L.position === 'ABSOLUTE' || parentAbs;
    if (!outOfFlow) return false;
    if (L.widthMode !== 'FILL') return false;
    if (!S?.fills?.length && !S?.background) return false;
    const ch = L.height ?? 0;
    return ph > 0 ? ch >= ph * 0.8 : ch > 0;
  });
}

/** 可点元素：BUTTON，或挂了 `ON_CLICK` 交互（导航热区在 `wireNavigation` 里会提到祖先，
 *  但那属于出码侧；规则看的是设计意图，所以按 AST 原始绑定点判） */
function isClickable(node: UINode): boolean {
  if (node.type === 'BUTTON') return true;
  return (node.interactions ?? []).some((it) => it.trigger === 'ON_CLICK' && it.action !== 'CLOSE' && it.action !== 'BACK');
}

/** 深度优先拍平，路径用 `root/children[i]` —— 断言要精确到这个粒度（防「文案级断言」假绿） */
export function buildContext(page: UIPage, opts: BuildOptions = {}): RuleContext {
  const nodes: ResolvedNode[] = [];

  const walk = (
    node: UINode,
    path: string,
    depth: number,
    chain: UINode[],
    inheritedBg: string | null,
    inheritedColor: string,
  ): void => {
    const own = ownBackground(node);
    const bg = own.state === 'color' ? own.value : own.state === 'unknown' ? null : inheritedBg;
    const color = node.style?.color ?? inheritedColor;
    const text = 'text' in node && typeof node.text === 'string' ? node.text : undefined;
    nodes.push({
      node,
      path,
      depth,
      chain: [...chain, node],
      background: bg,
      color,
      clickable: isClickable(node),
      text,
    });
    if (isContainer(node)) {
      (node as ContainerNode).children.forEach((child, i) => {
        walk(child, `${path}/children[${i}]`, depth + 1, [...chain, node], bg, color);
      });
    }
  };

  walk(page.root, 'root', 0, [], PAGE_DEFAULT_BG, DEFAULT_TEXT);

  return {
    page,
    platform: opts.platform ?? 'all',
    nodes,
    site: opts.site,
    css: opts.css,
    html: opts.html,
  };
}

/** 平台过滤：规则声明的端不包含当前端 → 跳过（**不算合规**，单独计数） */
export function appliesTo(platforms: Platform[], current: Platform): boolean {
  if (current === 'all') return true;
  return platforms.includes(current) || platforms.includes('all');
}
