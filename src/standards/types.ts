/**
 * 前端规范「规则注册表」类型定义（`docs/frontend-standards-final.md` §4.2）。
 *
 * 设计要点：
 *  - **一条规则 = 一个对象**（id/domain/source/severity/platform/check/fixtures）。
 *    规则是**数据**，所以变异测试（把 `check` 换成 `() => []`）可以完全自动化 —— 这是
 *    T3「撤销必须变红」能跑起来的前提。
 *  - **一个域只有一个 owner**（§2）。`domain` 不是标签，是**归属**：同一句话不允许
 *    出现两个出处，否则「对比度该不该 4.5」会有两个答案。
 *  - `check` 返回 `RuleHit[]`（**空数组 = 合规**），`ruleId`/`domain`/`severity` 由
 *    注册表在运行时盖章。这样规则自己不可能标错 id，也避免 20 份重复字面量。
 *
 * 与方案原文的差异（有意）：`check` 返回 `RuleHit` 而非完整 `StandardViolation`，
 * 语义不变（空 = 合规），只是把「盖章」收敛到 runner 一处。
 */
import type { UINode, UIPage } from '../schema/types';

/** D1 可访问性 / D2 界面行为 / D3 中文文案 / D4 设计令牌 / D5 动效 / D6 小程序 / D7 质量审计 */
export type Domain = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7';

/**
 * 适用端。
 *
 * - `h5`：浏览器产物（有 `:hover` / `:focus-visible`）
 * - `mini`：小程序产物（只有 tap 触发的 `:active`，没有 hover/focus）
 * - `all`：两端都适用
 *
 * 规则自身声明它支持哪些端；`platform` 不匹配时 runner 直接跳过（**不是**「返回空」），
 * 这样命中率统计里能区分「跳过」和「合规」。
 */
export type Platform = 'h5' | 'mini' | 'all';

/** `block` 进自修环；`warn` 只记录。**不可修复的规则一律降 `warn`**（§4.1 第 ④ 问）。 */
export type Severity = 'block' | 'warn';

/** 规则产出的「一条命中」：只描述**在哪、什么问题**，不带身份信息 */
export interface RuleHit {
  /** 节点路径 `root/children[0]/children[2]`；页面级规则用 `page` */
  path: string;
  nodeId?: string;
  message: string;
  /** 结构化明细（对比度比值、期望值等），便于报告与调试；**断言不要落在 message 上** */
  meta?: Record<string, unknown>;
  /** 覆盖规则默认严重度（占位符文本降 warn 这类分级用） */
  severity?: Severity;
}

/** 盖章后的违例：规则表 + 命中信息 */
export interface StandardViolation extends RuleHit {
  ruleId: string;
  domain: Domain;
  severity: Severity;
  source: string;
}

/** 解析后的节点视图：规则直接读它，不再自己爬祖先链 */
export interface ResolvedNode {
  node: UINode;
  path: string;
  depth: number;
  /** 祖先链（根在前，含自己） */
  chain: UINode[];
  /**
   * 有效背景色。`null` = **不可判定**（渐变 / 图片 / 半透明叠层 / 未知色值），
   * 依赖背景的规则必须跳过而不是猜。
   */
  background: string | null;
  /** 有效文字色（继承最近祖先的 `style.color`，缺省 `#000000`） */
  color: string;
  /** 可点元素：BUTTON，或挂了 `ON_CLICK` 交互 */
  clickable: boolean;
  /** 文本内容（TEXT/BUTTON 才有） */
  text?: string;
}

/** 整站上下文：SEO（标题唯一性）与小程序 tabBar 这类规则需要跨页视野 */
export interface SiteContext {
  pageNames: string[];
  /** 是否整站生成（单页生成时不做 tabBar 检查，C13） */
  sitewide: boolean;
  /** 底部导航项数（0 = 无 tabBar） */
  tabBarItems?: number;
}

export interface RuleContext {
  page: UIPage;
  platform: Platform;
  nodes: ResolvedNode[];
  site?: SiteContext;
  /** 产物 CSS 文本（D5 动效规则要在**出码结果**上查，AST 没有 transition 字段） */
  css?: string;
  /** 产物 HTML 文本（D7 结构类规则用） */
  html?: string;
}

export interface StandardRule {
  /** 稳定标识，如 `wcag-1.4.3-contrast`；**断言只认它** */
  id: string;
  /** 归属域（唯一 owner，§2） */
  domain: Domain;
  /** 出处（写进报告，便于追溯「这条凭什么是规范」） */
  source: string;
  severity: Severity;
  platform: Platform[];
  /** 判据：返回空数组 = 合规 */
  check(ctx: RuleContext): RuleHit[];
  /**
   * fixture 名单（在 `fixtures.ts` 里按名字解析）。
   * **pass/fail 都必须非空** —— 自检测试会锁死这一条，防「加了规则没测试」。
   */
  fixtures: { pass: string[]; fail: string[] };
}
