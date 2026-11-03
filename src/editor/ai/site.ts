/**
 * P3-3 · 整站生成（规划 → 逐页生成 → 导航串联）
 *
 * ## 为什么是三步而不是一次调用
 *
 * 「一次生成三页」听起来更简单，实际是把输出预算摊成三份。本项目的既有实测
 * （`docs/ai-ab-report.md` 附录 B）已经证明模型的策略是**先砍内容再砍页**：
 * 同一个预算下日历从 3 周缩到 2 周、底部导航整块消失。三页挤一次调用的结果
 * 是三页都残缺——而且用户看不出哪里被砍了，因为每页看起来都「像那么回事」。
 *
 * 所以拆开：
 *  1. **规划**（一次调用，输出几百 token）：站点名 + 2~6 个页面名 + 每页一句话 brief；
 *  2. **逐页生成**（N 次调用）：复用已验证的单页管线，每页预算与单页生成完全一致；
 *  3. **导航串联**（0 次调用，纯确定性）：见下。
 *
 * ## 导航为什么是确定性代码
 *
 * 「点底部导航的『训练』跳到训练页」是**结构性事实**，不是审美选择。让模型逐条写
 * `interactions` 只会多一个出错面：漏一条不会有任何报错，而跳不过去是硬伤。
 * 更关键的是——模型写不出页面 id（id 在转换时才生成），它只能写页面名；
 * 既然只能用名字，那就干脆在转换层按名字匹配，一次做对。
 *
 * 匹配规则刻意**严格**：只认「文案去空白后与页面名完全相等」。
 * 不做包含匹配、不做同义词、不做编辑距离——猜错（点「训练」跳到「我的」）
 * 比连不上更糟，前者用户会判定产品坏了，后者只是这一版还没做跳转。
 */
import type { ContainerNode, PrototypeInteraction, TextNode, UINode, UIPage } from '../../schema/types';
import { isContainer } from '../../schema/types';
import { createNode, findById } from '../../schema/factory';
import { makeNavigateInteraction } from '../tools/connections';
import { checkSitePlan, entryPageIndex, validateAiOutput, extractJson, summarizeViolations } from './contract';
import { buildPrompt, buildRepairPrompt } from './promptPack';
import { DEFAULT_MODEL, estimateCostCny, type AiUsage } from './client';
import { runPageGeneration, type PipelineOptions, type PipelineResult } from './generate';
import type { AiSiteDraft, AiSitePageSpec, AiViolation } from './types';

/** 一条自动连出来的跳转（面板展示「连了几条」用） */
export interface NavLink {
  /** 源页面 id */
  fromPageId: string;
  /** 源节点 id */
  fromNodeId: string;
  /** 源节点文案 */
  label: string;
  /** 目标页面 id */
  toPageId: string;
  toPageName: string;
}

export interface SiteWiringResult {
  pages: UIPage[];
  links: NavLink[];
  /** 每个页面的导航项命中情况（缺了哪几项 → 面板提示用户，不静默） */
  missing: { pageId: string; pageName: string; missing: string[] }[];
}

/** 取节点的可点文案：TEXT/BUTTON 用 text，其余用 name（图标按钮常只有 name） */
function labelOf(node: UINode): string {
  if (node.type === 'TEXT' || node.type === 'BUTTON') return (node.text ?? '').trim();
  return (node.name ?? '').trim();
}

/**
 * 去掉文案尾部的**装饰性后缀**：数字角标与价格。
 *
 * - `去结算(3)` / `购物车（2）` → 本体（括号里是件数）
 * - `提交订单 ¥126.5` / `立即购买￥68` → 本体（尾部是金额）
 *
 * 为什么必须有这一步：角标和金额是**状态**不是**文案**。设计稿里「提交订单 ¥126.5」
 * 完全正确（甚至更好——用户一眼看到要付多少），但按「文案 == 页面名」精确匹配就
 * 连不上，产物里那一页成了孤岛。实测：零食商城 6 页里订单确认页只能从购物车的
 * 「去结算(3)」进、从自己的「提交订单 ¥126.5」出，两处都因为后缀而断掉。
 *
 * **只认这两种形式**。`购物车 2` 这种裸尾数字看着像角标，其实和「满 99 减 10」
 * 结构完全一样——剥了就把真文案截断，制造误配。括号与货币符号都是无歧义的，
 * 所以只支持它们。
 */
export function stripBadge(label: string): string {
  return label
    .replace(/[(（]\s*\d+\s*[)）]\s*$/, '')
    .replace(/\s*[¥￥$]\s*\d+(?:\.\d+)?\s*$/, '')
    .trim();
}

/** `wireNavigation` 的可选参数 */
export interface WireOptions {
  /**
   * 闭合的「界面动作 → 页面名」别名表，**由调用方提供**。
   *
   * 为什么不内置：这是**领域知识**，不是结构性事实。零食商城的「去结算」指向
   * 订单确认，换一个行业（比如日程应用的「去支付」）就不成立。把它写死在管线里，
   * 等于把某个行业的假设变成所有站点的行为。
   *
   * 为什么不改成模糊匹配：`docs/ai-ab-report.md` 的结论是「猜错比连不上更糟」。
   * 别名表是**完全相等**的映射，可枚举、可审计；包含匹配/编辑距离会让
   * 「训练」莫名其妙跳到「我的」，用户会判定产品坏了。
   *
   * 只有目标页**确实存在**时才生效，否则按原名匹配失败处理（不报错）。
   */
  aliases?: Record<string, string>;
  /**
   * 底栏归属：给定页名返回它该有的 tab 项（**空数组 = 流程页，不装底栏**）。
   *
   * 缺省 `undefined` = 完全不接管底栏（模型画什么就是什么），保持既有调用方的行为。
   * 整站管线会自动从 `navItemsFor` 派生，所以一般不需要手填这个。
   */
  tabItemsFor?: (pageName: string) => string[];
  /** 底栏视觉（配色/字号/高度）。缺省 `DEFAULT_TAB_BAR_STYLE`；仅在给了 `tabItemsFor` 时生效 */
  tabBarStyle?: Partial<TabBarStyle>;
}

function walkNodes(root: UINode, visit: (n: UINode) => void): void {
  visit(root);
  if (isContainer(root)) (root as ContainerNode).children.forEach((c) => walkNodes(c, visit));
}

/** 节点总数（含根）。用于「内容塌陷」判据：同一个 brief 有时 80 个节点、有时 12 个 */
function countNodes(root: UINode): number {
  let n = 0;
  walkNodes(root, () => {
    n += 1;
  });
  return n;
}

/**
 * 底栏的**确定性安装**（整站生成专用）。
 *
 * ## 为什么不让模型画底栏
 *
 * 底栏是**跨页共享组件**，而整站生成是「N 次独立调用」——每页一次，互不知道对方
 * 画了什么。同一个底栏被独立复现 N 次，必然漂移。2026-11-02 实测铁志（力量训练日志）
 * 连跑 8 轮，每轮都漂：
 *
 * - 图标：`house`/`dumbbell`/`user` 三页各画一套；有的页干脆不画图标；
 * - 手写 `vectorD` 的坐标越界（`21.5 21.5` 落在 24 网格外），渲染成碎图形；
 * - 流程页（训练/记录/进度）明明要求「不要底栏」，仍有一半轮次长出底栏；
 * - 底栏在长页里被当成普通子项排在流中间，随内容滚走，不是吸底的。
 *
 * 这四条**没有一条能靠提示词修**：提示词是「请求」，不是「保证」，而底栏是结构事实。
 * 项目自己的第 7 条铁律就是「约束放令牌层，不放提示词」——底栏属于同一类。
 * 所以改成：模型爱画什么画什么，管线在串联前**先删掉它画的，再装一份标准的**。
 *
 * ## 为什么是「删了重装」而不是「只补缺」
 *
 * 只补缺的话，模型画的那一版会留下来，漂移照旧。而删了重装是幂等的：
 * 装过一次之后再跑一次，`isCanonicalTabBar` 判定「已经是我装的那一版」，直接返回，
 * 节点 id 不变——`wireNavigation` 的幂等性（见下方注释）才不会被打破。
 */

/** 底栏配色/尺寸。缺省对齐 shadcn 浅色，`showcase` 通过 `tabBarStyle` 覆盖成纸白/墨黑 */
export interface TabBarStyle {
  background: string;
  border: string;
  activeColor: string;
  idleColor: string;
  fontSize: number;
  height: number;
}

export const DEFAULT_TAB_BAR_STYLE: TabBarStyle = {
  /**
   * 缺省透明：底栏直接坐在页面底色上，深浅主题都不用另配一次色。
   * 要跟风格 skill 的令牌表对齐（纸白底 / 米白底）时由调用方覆盖。
   */
  background: 'transparent',
  border: '#E4E4E7',
  activeColor: '#111111',
  idleColor: '#9A9A9A',
  fontSize: 12,
  height: 64,
};

const TAB_BAR_NAME = '底部导航';

/** 一个 tab 单元格里能对上的文案（取第一个 TEXT 子项） */
function cellLabel(cell: UINode): string {
  if (!isContainer(cell)) return '';
  const text = (cell as ContainerNode).children.find((k) => k.type === 'TEXT');
  return text && text.type === 'TEXT' ? text.text.trim() : '';
}

/**
 * 找模型画的底栏：一个容器，**直接子项里 ≥2 个能对上 `items` 文案**。
 *
 * 为什么要求 ≥2 且过半：单条文案撞名的概率不低（「我的」页的入口列表里也可能出现
 * 「训练」），两条同时撞在同一个横排容器里才是底栏特征；再加「过半」是为了排除
 * 「内容列表里碰巧有两行等于页面名」这种误判。取命中最多的那一个。
 *
 * 两种形态都认：`FRAME 单元格 > TEXT`（我们装的那一版）和 `BUTTON 平铺`
 * （模型常见写法，见 `tests/ai-site.test.ts` 的 `pageDraftFor`）。只认前者的话，
 * 模型画的平铺底栏删不掉，会和我们装的那一份**并存**，页面出现两条底栏。
 */
function findTabBar(root: ContainerNode, items: Set<string>): { node: ContainerNode; parent: ContainerNode } | null {
  let bestNode: ContainerNode | null = null;
  let bestParent: ContainerNode | null = null;
  let bestScore = 0;
  const labelOfCell = (child: UINode): string => {
    if (isContainer(child)) return cellLabel(child);
    if (child.type === 'TEXT' || child.type === 'BUTTON') return child.text.trim();
    return '';
  };
  const visit = (parent: ContainerNode): void => {
    for (const child of parent.children) {
      if (!isContainer(child)) continue;
      const c = child as ContainerNode;
      const labels = c.children.map(labelOfCell).filter(Boolean);
      const hits = labels.filter((l) => items.has(l)).length;
      if (labels.length >= 2 && hits >= 2 && hits * 2 >= labels.length && hits > bestScore) {
        bestScore = hits;
        bestNode = c;
        bestParent = parent;
      }
      visit(c);
    }
  };
  visit(root);
  return bestNode && bestParent ? { node: bestNode, parent: bestParent } : null;
}

/** 是不是「我们已经装的那一版」（结构逐项对齐，含选中态有无下划线） */
function isCanonicalTabBar(node: ContainerNode, items: string[], current: string): boolean {
  const cells = node.children.filter(isContainer) as ContainerNode[];
  if (cells.length !== items.length) return false;
  return cells.every((cell, i) => {
    if (cellLabel(cell) !== items[i]) return false;
    const text = cell.children.find((k) => k.type === 'TEXT');
    if (!text) return false;
    const extra = cell.children.filter((k) => k !== text);
    if (extra.length > 1) return false;
    if (extra.length === 1 && extra[0].type !== 'RECTANGLE') return false;
    // 选中项必须有下划线，未选中项必须没有 —— 缺一边就重装
    return items[i] === current ? extra.length === 1 : extra.length === 0;
  });
}

function buildTabBar(items: string[], current: string, st: TabBarStyle): ContainerNode {
  const bar = createNode('FRAME', { name: TAB_BAR_NAME }) as ContainerNode;
  bar.layout = {
    ...bar.layout,
    mode: 'HORIZONTAL',
    widthMode: 'FILL',
    heightMode: 'FIXED',
    height: st.height,
    padding: [0, 24, 0, 24],
    gap: 0,
    align: 'CENTER',
    justify: 'SPACE_BETWEEN',
    // 吸底：长页滚动时底栏不能跟着走
    position: 'FIXED',
    stickyBottom: 0,
  };
  bar.style = {
    ...bar.style,
    background: st.background,
    border: { width: 1, color: st.border, style: 'solid' },
  };
  bar.children = items.map((label) => {
    const active = label === current;
    const cell = createNode('FRAME', { name: `导航-${label}` }) as ContainerNode;
    cell.layout = {
      ...cell.layout,
      mode: 'VERTICAL',
      widthMode: 'HUG',
      heightMode: 'HUG',
      padding: [0, 0, 0, 0],
      gap: 4,
      align: 'CENTER',
      justify: 'CENTER',
    };
    cell.style = { ...cell.style, background: 'transparent' };
    const text = createNode('TEXT', { name: `导航文字-${label}` }) as TextNode;
    text.text = label;
    text.layout = { ...text.layout, widthMode: 'HUG', heightMode: 'HUG' };
    text.style = {
      ...text.style,
      color: active ? st.activeColor : st.idleColor,
      fontSize: st.fontSize,
      fontWeight: active ? 600 : 400,
    };
    cell.children = [text];
    if (active) {
      const underline = createNode('RECTANGLE', { name: '选中下划线' });
      underline.layout = { ...underline.layout, widthMode: 'FIXED', heightMode: 'FIXED', width: 20, height: 2 };
      underline.style = { ...underline.style, background: st.activeColor };
      cell.children.push(underline);
    }
    return cell;
  });
  return bar;
}

/**
 * 给一页装上标准底栏（`items` 为空 = 流程页，只删不装）。返回是否改动了页面树。
 *
 * 幂等：第二趟跑同样的参数返回 `false` 且不动任何节点。
 */
export function installTabBar(
  page: UIPage,
  items: string[],
  style: Partial<TabBarStyle> = {},
  /**
   * 全站页面名。**只有流程页（items 为空）需要它**：这时没有「该有哪些项」可比，
   * 只能拿全站页名当词典去认模型画的那条底栏。不传就等于「流程页不删底栏」。
   */
  knownPageNames: string[] = [],
): boolean {
  const root = page.root as ContainerNode;
  if (!isContainer(root)) return false;
  const wanted = items.map((s) => s.trim()).filter(Boolean);
  const current = (page.name ?? '').trim();
  const found = findTabBar(root, new Set(wanted.length ? wanted : knownPageNames));

  if (wanted.length < 2) {
    if (!found) return false;
    found.parent.children = found.parent.children.filter((c) => c !== found.node);
    return true;
  }
  if (found && isCanonicalTabBar(found.node, wanted, current)) return false;
  if (found) found.parent.children = found.parent.children.filter((c) => c !== found.node);
  root.children.push(buildTabBar(wanted, current, { ...DEFAULT_TAB_BAR_STYLE, ...style }));
  return true;
}

/**
 * 按页面名把导航串起来（**就地修改**传入的页面树，调用方负责先克隆）。
 *
 * 只给 TEXT/BUTTON 挂跳转：给 FRAME 挂会让「点卡片任何位置都跳页」，
 * 而模型画卡片时 FRAME 是包裹层，那会把整页变成一个大按钮。
 */
export function wireNavigation(pages: UIPage[], opts: WireOptions = {}): SiteWiringResult {
  const links: NavLink[] = [];
  const missing: SiteWiringResult['missing'] = [];
  const aliases = opts.aliases ?? {};

  /**
   * 底栏先装、再连线。顺序不能反：装出来的 TEXT 才是要连线的那些节点。
   * 装之前会把模型画的那一版删掉（见 `installTabBar` 的注释：为什么不能让模型自己画）。
   */
  if (opts.tabItemsFor) {
    const allNames = pages.map((p) => (p.name ?? '').trim()).filter(Boolean);
    for (const page of pages) {
      const items = opts.tabItemsFor(page.name ?? '');
      if (items) installTabBar(page, items, opts.tabBarStyle, allNames);
    }
  }

  /** 页面名 → 页面（同名已在闸门拦掉，这里取第一个即可） */
  const byName = new Map<string, UIPage>();
  for (const p of pages) {
    const name = (p.name ?? '').trim();
    if (name && !byName.has(name)) byName.set(name, p);
  }

  /**
   * 文案 → 目标页。三条**都要求完全相等**（别名先查、原名再查），
   * 顺序不能反：页面名优先，别名只在没有同名页时兜底，避免别名盖掉真实页面。
   */
  const resolve = (raw: string): { target: UIPage; key: string } | null => {
    const direct = byName.get(raw);
    if (direct) return { target: direct, key: raw };
    const bare = stripBadge(raw);
    if (bare !== raw) {
      const byBare = byName.get(bare);
      if (byBare) return { target: byBare, key: bare };
    }
    const alias = aliases[raw] ?? aliases[bare];
    if (alias) {
      const byAlias = byName.get(alias);
      if (byAlias) return { target: byAlias, key: alias };
    }
    return null;
  };

  for (const page of pages) {
    const hit = new Set<string>();
    walkNodes(page.root, (node) => {
      if (node.type !== 'TEXT' && node.type !== 'BUTTON') return;
      const label = labelOf(node);
      if (!label) return;
      const found = resolve(label);
      if (!found) return;
      const { target, key } = found;
      // 当前页的导航项不该跳回自己（点了没反应，用户会以为坏了）
      if (target.id === page.id) {
        hit.add(key);
        return;
      }
      hit.add(key);
      /**
       * 已有指向同一目标的跳转就不重复加：整站生成时一页里可能有两个「训练」
       * （底部导航 + 卡片入口），重复加会让面板里出现两条一样的连线。
       */
      const existing = node.interactions ?? [];
      if (existing.some((it) => it.action === 'NAVIGATE' && it.targetId === target.id)) {
        /**
         * 这条边**已经存在** —— 不重复写 interaction，但**仍然要记进 `links`**。
         *
         * 早先这里直接 `return`，于是 `wireNavigation` 不幂等：管线里它被调两次
         * （首次串联 → 死页重画 → 再串联），第二次只报出「这一趟新加的」那几条，
         * 第一次连好的链接凭空消失，调用方看到的是「导航断了 / 全是死页」。
         *
         * 实测（2026-11-01，音乐播放器 6 页）：页面里实际有 3 条出边，报告 0 条。
         * 修完把「撤掉修复会变红」验在 `tests/ai-site.test.ts` 的幂等用例上。
         */
        links.push({ fromPageId: page.id, fromNodeId: node.id, label, toPageId: target.id, toPageName: target.name });
        return;
      }
      const made = makeNavigateInteraction(existing, target.id);
      node.interactions = made.list as PrototypeInteraction[];
      links.push({ fromPageId: page.id, fromNodeId: node.id, label, toPageId: target.id, toPageName: target.name });
    });

    const absent = [...byName.keys()].filter((n) => n !== page.name && !hit.has(n));
    if (absent.length) missing.push({ pageId: page.id, pageName: page.name, missing: absent });
  }

  return { pages, links, missing };
}

/** 每页需求串：把站点名与页面名拼进去，让模型知道自己在画整站里的哪一页 */
export function pagePromptOf(siteName: string, spec: AiSitePageSpec): string {
  return `${spec.name}：${siteName} 的「${spec.name}」页。${spec.brief}`;
}

/* ---------------- 管线 ---------------- */

export interface SitePipelineResult extends Omit<PipelineResult<UIPage[]>, 'data'> {
  pages: UIPage[];
  /** 规划本身（面板展示「规划了哪几页」） */
  site: AiSiteDraft;
  /** 自动连出的跳转 */
  links: NavLink[];
  missing: SiteWiringResult['missing'];
  /** 每页的生成明细（含各自的自修轮数，便于定位「哪一页拖后腿」） */
  perPage: { name: string; attempts: number; costCny: number; elapsedMs: number }[];
}

const emptyUsage = (): AiUsage => ({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });

const addUsage = (a: AiUsage, b: AiUsage): AiUsage => ({
  inputTokens: a.inputTokens + b.inputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
  cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
  cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
});

/** `runSiteGeneration` 的可选参数 */
export interface SiteGenerationOptions extends WireOptions {
  /**
   * 指定**必须逐字出现**的页面名（顺序不限）。
   *
   * 为什么需要：页面名同时决定 tabBar 归属和跳转匹配，模型改名（把「购物车」
   * 写成「商品列表」、或写成「零食小铺 首页」）不会报任何错，只会让整站导航断掉。
   * 调用方既然已经知道要哪几页，就把它变成**可校验的约束**，让规划轮自修到达标，
   * 而不是画完 6 页再回头发现名字不对（那时已经烧掉全部成本）。
   *
   * 规划轮输出只有几百 token，重试很便宜——这是唯一值得反复试错的阶段。
   */
  requirePageNames?: string[];
  /**
   * 逐页的导航项。缺省 = 全部页面名（每页都能跳到任何一页）。
   *
   * 为什么要能定制：真实 App 里**只有 tab 页有底部导航**，播放页、详情页、歌词页
   * 这类流程页靠返回键和页面内按钮进出。缺省行为把 6 个页面名塞给每一页，
   * 模型就照画 6 项底栏 —— 结构上没错（导航更全），但视觉上是错的：
   * 实测音乐播放器 6 页全部长出了一模一样的 6 项底栏。
   *
   * 这是**领域知识**，属于调用方（`showcase/configs/*.json` 的 `tabPages`），
   * 管线保持与行业无关。
   */
  navItemsFor?: (pageName: string) => string[];
  /**
   * 底栏视觉（配色/字号/高度）。缺省 `DEFAULT_TAB_BAR_STYLE`。
   *
   * 底栏是确定性安装的（见 `installTabBar`），所以配色也只能从代码给 ——
   * 想跟风格 skill 的令牌表对齐（纸白底 + 墨黑选中），就在这里传。
   */
  tabBarStyle?: Partial<TabBarStyle>;
  /**
   * 单页节点数下限，低于它**自动重画一次**（缺省 30）。
   *
   * 为什么需要：模型的已知失败模式是「先砍内容再砍页」——同一个需求，
   * 有时画出 80 个节点，有时只画 12 个（只有标题和一张图）。它不报违例、
   * 不违反 schema、导航也照连，唯一能发现的方式是数节点或看截图。
   * 实测：零食商城商品详情页某一轮只出 12 节点 / 2 段文字，整页几乎空白。
   *
   * 重画很便宜（一次调用），而残缺的页面会让整个工程包不可用，
   * 所以这里选择「宁可多花一次」。
   */
  minNodesPerPage?: number;
}

/**
 * 第一步：只拿页面规划。自修 ≤2 轮（与单页管线同口径）。
 * 单独导出便于面板「先看规划再决定要不要继续画」——规划失败很便宜，画三页失败很贵。
 */
export async function runSitePlan(
  opts: PipelineOptions,
  requirePageNames?: string[],
): Promise<{ site: AiSiteDraft; attempts: number; usage: AiUsage; costCny: number; raw: string }> {
  const maxRepair = opts.maxRepair ?? 2;
  const required = (requirePageNames ?? []).map((n) => n.trim()).filter(Boolean);
  const userPrompt = required.length
    ? [
        opts.userPrompt,
        '',
        `页面名硬约束：必须逐字使用「${required.join('」「')}」这 ${required.length} 个名字（顺序不限）。`,
        '不要改名、不要加品牌名前缀、不要加空格、不要加序号、不要增删页。',
      ].join('\n')
    : opts.userPrompt;
  const { system, user } = buildPrompt({
    mode: 'site',
    pack: opts.pack,
    userPrompt,
    viewport: opts.viewport,
    designRef: opts.designRef,
  });

  let usage = emptyUsage();
  let lastRaw = '';
  let lastViolations: AiViolation[] = [];

  for (let attempt = 0; attempt <= maxRepair; attempt += 1) {
    const userMessage =
      attempt === 0
        ? user
        : buildRepairPrompt({
            previousOutput: lastRaw,
            violationsText: summarizeViolations(lastViolations),
            attempt,
            requirement: userPrompt,
          });
    opts.onProgress?.({
      stage: attempt === 0 ? 'request' : 'repair',
      attempt,
      message: attempt === 0 ? '规划整站页面…' : `规划自修第 ${attempt} 轮（${lastViolations.length} 条违例）`,
    });

    const res = await opts.client.run({ kind: 'site', system, user: userMessage, onDelta: opts.onDelta, signal: opts.signal });
    usage = addUsage(usage, res.usage);
    lastRaw = res.text;

    if (res.finishReason === 'length') {
      lastViolations = [
        {
          path: '(根)',
          kind: 'limit',
          message: `输出被截断（finish_reason=length，已写 ${res.usage.outputTokens} tokens）；请更精简地重新输出完整 JSON`,
        },
      ];
      lastRaw = '';
      opts.onProgress?.({ stage: 'validate', attempt, message: '规划输出被截断，重试' });
      continue;
    }

    const parsed = extractJson(res.text);
    if (!parsed.ok) {
      lastViolations = [{ path: '(根)', kind: 'schema', message: parsed.error }];
      continue;
    }
    const checked = validateAiOutput(parsed.value, { expect: 'site', pack: opts.pack });
    lastViolations = checked.violations;
    if (!checked.ok) {
      opts.onProgress?.({ stage: 'validate', attempt, message: `规划 ${checked.violations.length} 条违例` });
      continue;
    }
    /**
     * 页面名核对：改名不会报错，只会让 tabBar 与跳转全断，所以必须在**规划阶段**拦住。
     * 这一轮输出只有几百 token，重试成本可以忽略。
     */
    if (required.length) {
      const got = ((checked.data as AiSiteDraft).pages ?? []).map((p) => (p.name ?? '').trim());
      const missing = required.filter((n) => !got.includes(n));
      const extra = got.filter((n) => !required.includes(n));
      if (missing.length || extra.length) {
        lastViolations = [
          {
            path: 'pages',
            kind: 'schema',
            message:
              `页面名不符合要求：${missing.length ? `缺「${missing.join('」「')}」` : ''}` +
              `${missing.length && extra.length ? '；' : ''}` +
              `${extra.length ? `多「${extra.join('」「')}」` : ''}。` +
              `必须逐字使用「${required.join('」「')}」，不要改名或加前缀`,
          },
        ];
        opts.onProgress?.({ stage: 'validate', attempt, message: '页面名不符，规划重试' });
        continue;
      }
    }
    return { site: checked.data as AiSiteDraft, attempts: attempt + 1, usage, costCny: estimateCostCny(usage, opts.model ?? DEFAULT_MODEL), raw: lastRaw };
  }

  throw Object.assign(new Error('整站规划未通过契约校验'), { violations: lastViolations, raw: lastRaw, usage });
}

/**
 * 完整整站管线：规划 → 逐页生成 → 导航串联。
 *
 * 页面顺序按规划顺序落库，入口页放第一位——`pagesToProject` 与原型出码都按数组序，
 * 而原型 runtime 默认展示**第一个未隐藏页**。入口页不在第一位，演示时会从半路开始。
 */
/**
 * 整站生成。
 *
 * `siteOpts` 只影响**规划约束**与**导航串联**，不进单页提示词、不改单页管线——
 * 领域知识（必须有哪些页、界面动作指向哪页）属于调用方，管线本身保持与行业无关。
 */
export async function runSiteGeneration(
  opts: PipelineOptions,
  siteOpts: SiteGenerationOptions = {},
): Promise<SitePipelineResult> {
  const started = Date.now();
  opts.onProgress?.({ stage: 'prompt', attempt: 0, message: '整站模式：先规划页面，再逐页生成' });

  const plan = await runSitePlan(opts, siteOpts.requirePageNames);
  const { site } = plan;
  const entryAt = entryPageIndex(site);
  const ordered = site.pages.map((p, i) => ({ p, i })).sort((a, b) => (a.i === entryAt ? -1 : b.i === entryAt ? 1 : a.i - b.i)).map((x) => x.p);
  const names = ordered.map((p) => p.name);
  /** 逐页导航项：给了 navItemsFor 就按页面定制（流程页给空数组 = 不画底栏） */
  const navFor = (pageName: string): string[] => (siteOpts.navItemsFor ? siteOpts.navItemsFor(pageName) : names);

  /**
   * 串联阶段的选项：底栏由 `installTabBar` 确定性安装，**规则跟 `navItemsFor` 同源**
   * （流程页返回空数组 → 只删不装），这样「提示词说要什么」和「管线真装什么」不会打架。
   * 缺省 `navItemsFor` 时每页都是全站 tab —— 与改造前 `navFor` 的行为一致。
   */
  const wireOpts: WireOptions = {
    aliases: siteOpts.aliases,
    tabItemsFor: (pageName) => navFor(pageName),
    tabBarStyle: siteOpts.tabBarStyle,
  };

  opts.onProgress?.({
    stage: 'validate',
    attempt: plan.attempts - 1,
    message: `规划 ${ordered.length} 页：${names.join(' / ')}（入口：${ordered[0].name}）`,
  });

  const pages: UIPage[] = [];
  const perPage: SitePipelineResult['perPage'] = [];
  let usage = plan.usage;
  let raw = plan.raw;

  for (const spec of ordered) {
    opts.onProgress?.({ stage: 'request', attempt: 0, message: `生成「${spec.name}」页…` });
    /**
     * 每页都带上**全部页面名**当导航项。这是整站能连起来的前提：
     * 只要有一页的导航栏少写一项，那一项在那一页就点不动（`missing` 会如实报出来）。
     */
    const basePrompt = pagePromptOf(site.name, spec);
    let pageRes = await runPageGeneration({ ...opts, userPrompt: basePrompt, navItems: navFor(spec.name) });

    /**
     * 内容塌陷自动重画一次（见 `minNodesPerPage`）。
     *
     * 只在**第一次**就过薄时重画：重画后仍然薄，说明这个 brief 本身就想画得很简，
     * 再试第三遍只是烧钱——把事实留给调用方的断言去报。
     */
    const minNodes = siteOpts.minNodesPerPage ?? 30;
    let totalCost = pageRes.costCny;
    let totalAttempts = pageRes.attempts;
    let pageUsage = pageRes.usage;
    const thin = countNodes(pageRes.data.root) < minNodes;
    if (thin) {
      const got = countNodes(pageRes.data.root);
      opts.onProgress?.({
        stage: 'repair',
        attempt: 0,
        message: `「${spec.name}」只画了 ${got} 个节点，内容太单薄，重画一次`,
      });
      const retry = await runPageGeneration({
        ...opts,
        userPrompt: `${basePrompt}\n\n上一版只画了 ${got} 个节点，内容太单薄、像半成品。请把这一页该有的元素**全部**画出来，不要省略列表项、不要用一句话代替一整块内容。`,
        navItems: navFor(spec.name),
      });
      pageUsage = addUsage(pageUsage, retry.usage);
      // 取更丰富的那一版（重画也可能更差）
      if (countNodes(retry.data.root) >= got) pageRes = retry;
      totalCost += retry.costCny;
      totalAttempts += retry.attempts;
    }

    /**
     * 页面名以**规划**为准，不用 draft 里的 `name`。
     *
     * 页面名不是展示文案，是**导航的主键**：tabBar 归属按它判、跳转按它精确匹配。
     * 单页生成时模型会自作主张改写成「零食小铺-首页」「商品列表」，而且不报任何错——
     * 规划轮明明写了「首页」，落库却成了别的名字，整站导航当场断一半。
     * 规划已经过 `requirePageNames` 校验，是唯一权威来源，这里直接覆盖。
     */
    pageRes.data.name = spec.name;
    pages.push(pageRes.data);
    perPage.push({ name: spec.name, attempts: totalAttempts, costCny: totalCost, elapsedMs: pageRes.elapsedMs });
    usage = addUsage(usage, pageUsage);
    raw = pageRes.raw;
    opts.onProgress?.({
      stage: 'done',
      attempt: totalAttempts - 1,
      message: `「${spec.name}」完成（${totalAttempts} 轮，¥${totalCost.toFixed(3)}）`,
    });
  }

  /**
   * 第一趟**只连线、不装底栏**。
   *
   * 死页检测看的是「模型自己画出来的出边」——先装底栏会让每一页都凭空多出出边，
   * 检测当场失效（每页都「不是死页」）。所以底栏要等到检测与重画都结束之后再装。
   */
  let wired = wireNavigation(pages, { aliases: siteOpts.aliases });

  /**
   * 死页自动重画一次：某页一条出边都没有 = 用户进去出不来。
   *
   * 这在可点原型里**永远是缺陷**，不是风格选择——所以值得多花一次调用。
   * 实测：零食商城整站生成连跑 8 轮，每轮只坏一处且每次坏的地方不同
   * （12 节点空页 / 分类页横向溢出 / 首页整块漏画底栏），全靠人工重跑是治不住的。
   * 内容塌陷与横向溢出分别由 `minNodesPerPage` 和网格归一化兜住，这里补最后一种。
   *
   * 只补一轮：重画后仍然没出边，说明这一页的 brief 本身就不需要导航（流程页），
   * 交给调用方的断言去判，不再无限重试烧钱。
   */
  const deadEnd = (): UIPage[] => {
    const hasOut = new Set(wired.links.map((l) => l.fromPageId));
    return wired.pages.filter((p) => {
      if (hasOut.has(p.id)) return false;
      /**
       * tab 页**天然有出边**：底栏由 `installTabBar` 确定性安装，装完必定连到其它 tab。
       * 不排除它的话，模型只要没自己画底栏（现在我们本来就让它别画），每页都会被判死页、
       * 白重画一次 —— 6 页站点直接多烧 3 次调用。
       */
      const items = wireOpts.tabItemsFor?.(p.name ?? '');
      return !(items && items.filter((n) => n !== p.name).length);
    });
  };
  const dead = deadEnd();
  if (dead.length) {
    opts.onProgress?.({
      stage: 'repair',
      attempt: 0,
      message: `死页（无任何出边）：${dead.map((p) => p.name).join('、')}，重画一次`,
    });
    for (const page of dead) {
      const spec = ordered.find((s) => s.name === page.name);
      if (!spec) continue;
      /**
       * **重画提示词必须走 `navFor`，不能写 `names`。**
       *
       * 早先这里无条件写「请补上底部导航栏，文案用「全部页面名」里的词」——
       * 而 `navItems` 已经按 `navItemsFor` 给流程页发了空数组。两条指令打架，
       * 模型听提示词的：实测记账小程序的「记一笔」「预算」两页各长出**6 项**底栏
       * （概览/明细/记一笔/预算/统计/我的），而它们的 `navItems` 是 `[]`。
       * 与 `wireNavigation` 幂等那次同源：**新增的旁路没跟上主路的规则**。
       *
       * 流程页真正缺的不是底栏，是「回得去 + 走得下去」的两个按钮。
       */
      const retryNav = navFor(spec.name);
      const navHint = retryNav.length
        ? `请补上底部导航栏，**只放这几项**：${retryNav.join(' / ')}（不要出现其它页面名）。`
        : '这一页**不要画底部导航栏**（它是流程页）。请补一个明确的返回按钮和一个通往下一步的入口按钮。';
      const retry = await runPageGeneration({
        ...opts,
        userPrompt: `${pagePromptOf(site.name, spec)}\n\n上一版这一页**一条导航都没有**，用户进来就出不去了。${navHint}`,
        navItems: retryNav,
      });
      retry.data.name = spec.name;
      const at = pages.findIndex((p) => p.id === page.id);
      if (at >= 0) pages[at] = retry.data;
      usage = addUsage(usage, retry.usage);
      const rec = perPage.find((r) => r.name === spec.name);
      if (rec) {
        rec.attempts += retry.attempts;
        rec.costCny += retry.costCny;
      }
    }
  }

  /**
   * 最后一趟：连线 + **确定性安装标准底栏**。
   *
   * 放最后有两个理由：① 要覆盖模型画的那一版，而重画过的页也会在这里被覆盖；
   * ② 底栏装出来的 TEXT 才是最终要连线的节点，先连线后装等于白连。
   */
  wired = wireNavigation(pages, wireOpts);

  opts.onProgress?.({
    stage: 'convert',
    attempt: 0,
    message: wired.links.length ? `自动连接 ${wired.links.length} 条页面跳转` : '没有找到可连接的导航文案',
  });
  if (wired.missing.length) {
    const detail = wired.missing.map((m) => `${m.pageName} 缺 ${m.missing.join('、')}`).join('；');
    opts.onProgress?.({ stage: 'convert', attempt: 0, message: `导航不完整：${detail}` });
  }

  return {
    pages: wired.pages,
    site,
    links: wired.links,
    missing: wired.missing,
    perPage,
    attempts: plan.attempts + perPage.reduce((n, p) => n + p.attempts, 0),
    usage,
    costCny: plan.costCny + perPage.reduce((n, p) => n + p.costCny, 0),
    elapsedMs: Date.now() - started,
    violations: [],
    raw,
    firstPass: plan.attempts === 1 && perPage.every((p) => p.attempts === 1),
  };
}

/* ---------------- 面板辅助 ---------------- */

/** 供面板使用：把某页的导航命中情况转成一句话 */
export function describeWiring(result: SiteWiringResult): string {
  const parts = [`自动连接 ${result.links.length} 条跳转`];
  if (result.missing.length) {
    parts.push(`${result.missing.length} 页导航不完整：${result.missing.map((m) => `${m.pageName} 缺 ${m.missing.join('、')}`).join('；')}`);
  }
  return parts.join('；');
}

/** 导出给测试/面板用：某页里有没有某个文案的可点节点 */
export function hasNavLabel(page: UIPage, label: string): boolean {
  let found = false;
  walkNodes(page.root, (n) => {
    if (found) return;
    if ((n.type === 'TEXT' || n.type === 'BUTTON') && (n.text ?? '').trim() === label) found = true;
  });
  return found;
}

export { findById, checkSitePlan };
