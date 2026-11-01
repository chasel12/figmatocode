/**
 * 审计执行器：把检测器跑在一组页面上，聚合成可出报告的结构。
 *
 * 与 `src/standards/runner.ts` 的差别：那边跑「合规规则」并按 fixture 做自检，
 * 这边跑「形态缺陷」并按页面聚合 —— 因为形态 bug 的处置单位是页面
 * （「这一页有几处坏」比「这条规则命中几次」更接近人要修的粒度）。
 */

import type { UIPage } from '../../../schema/types';
import { BUG_DETECTORS } from './detectors';
import type { BugDetector, BugHit, ScanContext } from './types';

export interface PageScan {
  page: string;
  /** 该页节点数，用于算「每千节点命中」 */
  nodes: number;
  hits: BugHit[];
}

export interface ScanSummary {
  /** 每页明细 */
  pages: PageScan[];
  /** bugId → 命中数 */
  byBug: Record<string, number>;
  /** 页面数 / 节点数 */
  totalPages: number;
  totalNodes: number;
  totalHits: number;
  /** 命中 0 条且不该是 0 的检测器（防「规则没被调用」的假绿） */
  silent: string[];
}

export function countNodes(page: UIPage): number {
  let n = 0;
  const go = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    n += 1;
    const kids = (node as { children?: unknown[] }).children;
    if (Array.isArray(kids)) for (const c of kids) go(c);
  };
  go(page.root);
  return n;
}

/**
 * 跑一组检测器。
 *
 * 单个检测器抛异常时**不中断整轮**，而是把异常记成一条 hit —— 理由是审计脚本
 * 的价值在于「一次跑完看到全貌」，一条规则崩了不该让另外 8 条的结果一起丢失。
 * 但也绝不能静默吞掉：记成 `meta.error` 让报告里能看见。
 */
export function scanPages(
  pages: UIPage[],
  detectors: BugDetector[] = BUG_DETECTORS,
  ctx?: ScanContext,
): ScanSummary {
  const out: PageScan[] = [];
  const byBug: Record<string, number> = {};
  const called = new Set<string>();
  let totalNodes = 0;

  for (const page of pages) {
    const hits: BugHit[] = [];
    for (const d of detectors) {
      called.add(d.id);
      try {
        for (const h of d.check(page, ctx)) hits.push(h);
      } catch (err) {
        hits.push({
          bugId: d.id,
          severity: 'taste',
          page: page.name,
          path: 'root',
          nodeId: page.root.id,
          detail: `检测器抛异常：${(err as Error).message}`,
          meta: { error: String((err as Error).message).slice(0, 120) },
        });
      }
    }
    const nodes = countNodes(page);
    totalNodes += nodes;
    for (const h of hits) byBug[h.bugId] = (byBug[h.bugId] ?? 0) + 1;
    out.push({ page: page.name, nodes, hits });
  }

  // 从没被调用过的检测器 = 注册表接错了，必须报出来（不是「0 命中」）
  const neverCalled = detectors.filter((d) => !called.has(d.id)).map((d) => d.id);

  return {
    pages: out,
    byBug,
    totalPages: pages.length,
    totalNodes,
    totalHits: out.reduce((n, p) => n + p.hits.length, 0),
    silent: neverCalled,
  };
}

/** 只保留某个严重度的命中（报告分「必修 / 可选」两段用） */
export function filterBySeverity(hits: BugHit[], severity: BugHit['severity']): BugHit[] {
  return hits.filter((h) => h.severity === severity);
}
