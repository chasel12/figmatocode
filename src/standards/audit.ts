/**
 * 规则表自检 + 变异测试（T1/T2/T3 的实现，**测试和脚本共用这一份**）。
 *
 * 为什么必须共用：如果单测里写一份、`standards:check` 里再写一份，两份会漂移，
 * 而漂移的那一份永远是**更松**的那一份（因为它不影响单测通过）。这与
 * `src/generator/bundle.ts` 被抽成纯函数的理由完全一样：验收不能另写一份实现。
 */
import { fixture } from './fixtures';
import { RULES } from './rules';
import { runRules } from './runner';
import type { RuleContext, StandardRule } from './types';

/** 规则表结构自检：返回问题清单（空 = 通过） */
export function selfCheck(rules: StandardRule[] = RULES): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const r of rules) {
    if (!r.id) problems.push('<匿名规则> 缺少 id');
    if (ids.has(r.id)) problems.push(`${r.id}: id 重复`);
    ids.add(r.id);
    if (!r.source) problems.push(`${r.id}: 缺少 source（无法追溯出处）`);
    if (!r.platform.length) problems.push(`${r.id}: platform 为空`);
    if (!r.fixtures.pass.length) problems.push(`${r.id}: 缺 pass fixture`);
    if (!r.fixtures.fail.length) problems.push(`${r.id}: 缺 fail fixture`);
    for (const name of [...r.fixtures.pass, ...r.fixtures.fail]) {
      try {
        fixture(name);
      } catch {
        problems.push(`${r.id}: fixture「${name}」不存在`);
      }
    }
  }
  return problems;
}

export interface FixtureRow {
  ruleId: string;
  fixture: string;
  kind: 'pass' | 'fail';
  hits: number;
  ok: boolean;
  note: string;
}

/**
 * T1/T2：正例必须 0 命中，反例必须 ≥1 命中。
 *
 * **反例 0 命中是最危险的一种假绿**：说明 fixture 造错了（或规则根本没跑），
 * 而不是「产物合规」。这里把它标成 `ok:false`，脚本非零退出。
 */
export function fixtureReport(rules: StandardRule[] = RULES): FixtureRow[] {
  const rows: FixtureRow[] = [];
  for (const rule of rules) {
    for (const [kind, names] of [
      ['pass', rule.fixtures.pass],
      ['fail', rule.fixtures.fail],
    ] as const) {
      for (const name of names) {
        let ctx: RuleContext;
        try {
          ctx = fixture(name);
        } catch (err) {
          rows.push({ ruleId: rule.id, fixture: name, kind, hits: -1, ok: false, note: `fixture 缺失：${String(err)}` });
          continue;
        }
        const hits = runRules(ctx, [rule]).violations.length;
        const ok = kind === 'pass' ? hits === 0 : hits > 0;
        rows.push({
          ruleId: rule.id,
          fixture: name,
          kind,
          hits,
          ok,
          note: ok ? 'ok' : kind === 'pass' ? `正例命中了 ${hits} 条` : '反例没有命中 → fixture 造假或规则没跑',
        });
      }
    }
  }
  return rows;
}

export interface MutationRow {
  ruleId: string;
  fixture: string;
  before: number;
  after: number;
  ok: boolean;
  note: string;
}

/**
 * T3 变异测试：把 `check` 换成 `() => []`，反例**必须变红**。
 *
 * 这一步抓的是「断言不依赖被测实现」——假绿的本质。走的是同一个 `runRules`
 * （含端过滤与盖章），所以它也顺带证明「命中不是从 runner 的其它路径漏出来的」。
 */
export function mutationReport(rules: StandardRule[] = RULES): MutationRow[] {
  const rows: MutationRow[] = [];
  for (const rule of rules) {
    for (const name of rule.fixtures.fail) {
      const ctx = fixture(name);
      const before = runRules(ctx, [rule]).violations.length;
      const mutated: StandardRule = { ...rule, check: () => [] };
      const after = runRules(ctx, [mutated]).violations.length;
      const ok = before > 0 && after === 0;
      rows.push({
        ruleId: rule.id,
        fixture: name,
        before,
        after,
        ok,
        note: ok ? 'ok' : before === 0 ? '反例在真实实现下也没命中' : '空实现下仍有命中 → 命中不来自 check',
      });
    }
  }
  return rows;
}
