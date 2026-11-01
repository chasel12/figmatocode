/**
 * 规则执行器：盖章（ruleId/domain/severity/source）+ 端过滤 + 统计。
 *
 * 单独一层的原因：**跳过和合规必须能区分**。如果端不匹配就 `return []`，报告里
 * 「h5 命中 0 条」和「mini 规则被跳过」会长得一模一样 —— 那就是 §4.4 里 0% 的
 * 第一种成因（规则没跑）被掩盖。
 */
import { appliesTo } from './context';
import type { RuleContext, StandardRule, StandardViolation } from './types';

export interface RunOptions {
  /** 只跑指定规则 id（调试 / 单规则回归用） */
  only?: string[];
  /** 是否包含 warn（默认包含；`blockOnly` 场景可关掉） */
  includeWarn?: boolean;
}

export interface RunResult {
  violations: StandardViolation[];
  /** 规则 id → 命中条数（**含 0**，便于判「跑了但合规」） */
  hits: Record<string, number>;
  /** 因端不匹配被跳过的规则 id */
  skipped: string[];
}

export function runRules(ctx: RuleContext, rules: StandardRule[], opts: RunOptions = {}): RunResult {
  const violations: StandardViolation[] = [];
  const hits: Record<string, number> = {};
  const skipped: string[] = [];

  for (const rule of rules) {
    if (opts.only && !opts.only.includes(rule.id)) continue;
    if (!appliesTo(rule.platform, ctx.platform)) {
      skipped.push(rule.id);
      continue;
    }
    let raw;
    try {
      raw = rule.check(ctx);
    } catch (err) {
      // 规则自身抛错必须显式暴露：静默吞掉等于「这条规则不存在」，而且是**假绿**
      raw = [
        {
          path: 'root',
          message: `规则执行抛错：${err instanceof Error ? err.message : String(err)}`,
          severity: 'warn' as const,
        },
      ];
    }
    hits[rule.id] = (hits[rule.id] ?? 0) + raw.length;
    for (const hit of raw) {
      const severity = hit.severity ?? rule.severity;
      if (severity === 'warn' && opts.includeWarn === false) continue;
      violations.push({
        ...hit,
        ruleId: rule.id,
        domain: rule.domain,
        severity,
        source: rule.source,
      });
    }
  }

  return { violations, hits, skipped };
}

/** 单条规则跑一组 fixture 名，返回命中数（变异测试用） */
export function countHits(rule: StandardRule, contexts: RuleContext[]): number {
  let n = 0;
  for (const ctx of contexts) n += rule.check(ctx).length;
  return n;
}
