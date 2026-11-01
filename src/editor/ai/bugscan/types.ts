/**
 * UI 形态缺陷检测器（**只检测，不修复**）
 *
 * 注意与既有 `src/editor/ai/audit.ts` 的区别（那个不是这个）：
 * `audit.ts` 的 `auditPage` 统计的是**输出指标**（样式字段覆盖率 8/37、节点数、文本量），
 * 回答「模型写得够不够多」；本目录回答「写出来的东西有没有坏」。
 * 两者都是只读，但口径不同，所以分开命名（`bugscan` vs `audit`），
 * 且**不能**把本目录建成 `ai/audit/` —— 那会和 `ai/audit.ts` 抢模块解析。
 *
 * 与 `src/standards/` 的分工，必须分清否则会写出两套重叠的东西：
 *
 * - `standards/` 判「**合不合规**」：对比度 4.5:1、字号 ≥11px、中英文空格。
 *   依据是外部标准（WCAG / 微信指南），有权威文本可引。
 * - `audit/` 判「**像不像一个正常界面**」：角标有没有排成一行、图标有没有被拉扁、
 *   空容器有没有留下、底栏有没有压住内容。依据是「这么写就是错的」，没有标准可引，
 *   但能一眼看出。
 *
 * 为什么要分开：`standards/` 的规则允许「合规但很丑」（全部 4.5:1 的页面可以丑到不能看），
 * `audit/` 的规则允许「好看但对比度不够」。两类混在一个注册表里，严重度就没法分了。
 *
 * **检测器一律不修改节点。** 修不修、怎么修是 `specToPage.ts` 里 normalize 的事，
 * 分开的理由是同一个：先拿到「有哪些 bug、各多少条」的数据，再决定写哪条规则。
 * 之前凭经验列了 8 条规则，实测 2 条收益为 0、1 条风险过高 —— 先扫后写。
 */

export type BugSeverity =
  /** 明显错误：渲染出来就是坏的，用户一眼能看出「这不对」 */
  | 'bug'
  /** 观感问题：不算错，但会显得粗糙 */
  | 'taste';

export interface BugHit {
  bugId: string;
  severity: BugSeverity;
  /** 页面名（便于报告分组） */
  page: string;
  /** 从 root 到命中节点的名字路径，形如 `root/底部导航/导航-分类` */
  path: string;
  nodeId: string;
  /** 一句话说清「哪里不对」，直接进报告，不做事后加工 */
  detail: string;
  /** 判据用到的原始数值，便于核对误报 */
  meta?: Record<string, number | string | boolean | null>;
}

export interface BugDetector {
  /** kebab-case，报告里当主键 */
  id: string;
  title: string;
  severity: BugSeverity;
  /** 这条防的是什么形态（一句话，进报告表头） */
  rationale: string;
  /**
   * 已经负责修它的那条 `normalize`（有则 0 命中是**回归基线**，不是「没跑」）。
   *
   * 为什么要区分：`badge-inline` 0 命中不等于「没有这种形态」，
   * 而是「`normalizeAbsolute` 规则 4 已经把它补掉了」。报告里把两者混为一谈，
   * 会让人以为检测器失效；反过来，没有覆盖的检测器 0 命中才是「产物里真没有」。
   */
  coveredBy?: string;
  /**
   * 返回本页所有命中。
   *
   * **必须能在没有编译产物的情况下判**：只吃 `UIPage`，不吃 CSS。
   * 理由是检测要能跑在「模型刚输出、还没编译」的 draft 上 —— 那才是 bug 刚诞生的时刻。
   * 唯一例外是 `fixed-occlude`，它要拿视口高度算，视口在 `page.viewport` 里有。
   */
  check(page: import('../../../schema/types').UIPage): BugHit[];
}
