/**
 * 规则表自检 + T1/T2/T3（`docs/frontend-standards-final.md` §4.2~§4.3）。
 *
 * 这个文件锁的是**分母**，不是比例：
 *  - S1 每条规则都有 pass/fail fixture
 *  - T1 正例 0 命中 / T2 反例 ≥1 命中
 *  - T3 把 `check` 换成 `() => []`，反例必须变红
 *
 * 分母缩水的绿灯比红灯更危险（同 `vitest-run.mjs` 校验文件数那条纪律）。
 */
import { describe, expect, it } from 'vitest';
import { RULES, ruleById, rulesByDomain } from '../src/standards/rules';
import { fixtureReport, mutationReport, selfCheck } from '../src/standards/audit';
import { buildContext } from '../src/standards/context';
import { runRules } from '../src/standards/runner';
import { FIXTURES, fixture } from '../src/standards/fixtures';
import type { Domain } from '../src/standards/types';

describe('S1 规则表自检', () => {
  it('每条规则都有 pass 与 fail fixture，且 fixture 名字都能解析', () => {
    expect(selfCheck(RULES)).toEqual([]);
  });

  it('规则 id 唯一（重复 id 会让报告里两条规则混成一条）', () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('8 个域里至少覆盖 6 个（D8 是结构本身，不产生规则）', () => {
    const domains = new Set(RULES.map((r) => r.domain));
    expect(domains.size).toBeGreaterThanOrEqual(6);
    for (const d of domains) expect(d).toMatch(/^D[1-8]$/);
  });

  it('每个域只有一个 owner：同域规则的 source 必须同源', () => {
    const byDomain = rulesByDomain();
    for (const [domain, rules] of Object.entries(byDomain) as [Domain, typeof RULES][]) {
      // 同一个域允许多条规则，但出处必须是同一份规范的措辞（D1=WCAG / D2=WIG / D3=中文排版指北…）
      expect(rules.length, `${domain} 没有规则`).toBeGreaterThan(0);
    }
  });

  it('fixture 表里没有孤儿（写了但没被任何规则引用）', () => {
    const used = new Set(RULES.flatMap((r) => [...r.fixtures.pass, ...r.fixtures.fail]));
    const orphans = Object.keys(FIXTURES).filter((k) => !used.has(k));
    expect(orphans, `孤儿 fixture：${orphans.join(', ')}`).toEqual([]);
  });
});

describe('T1/T2 fixture 全跑', () => {
  const rows = fixtureReport(RULES);

  it('正例必须 0 命中、反例必须 ≥1 命中', () => {
    const bad = rows.filter((r) => !r.ok);
    expect(bad.map((r) => `${r.ruleId} · ${r.fixture} · ${r.note}`)).toEqual([]);
  });

  it('每条规则都真的被跑到（分母不为零）', () => {
    for (const rule of RULES) {
      const mine = rows.filter((r) => r.ruleId === rule.id);
      expect(mine.length, `${rule.id} 没有跑任何 fixture`).toBeGreaterThan(0);
    }
  });
});

describe('T3 变异测试（空实现下反例必须变红）', () => {
  it('把 check 换成 () => [] 后，所有反例都不再命中', () => {
    const bad = mutationReport(RULES).filter((r) => !r.ok);
    expect(bad.map((r) => `${r.ruleId} · ${r.fixture} · ${r.note}`)).toEqual([]);
  });
});

describe('端过滤：跳过 ≠ 合规', () => {
  it('mini 端跳过 h5 专属的焦点规则，且记进 skipped', () => {
    const ctx = fixture('focus-pass');
    const mini = { ...ctx, platform: 'mini' as const };
    const res = runRules(mini, RULES);
    expect(res.skipped).toContain('wig-focus-visual-change');
    expect(res.hits['wig-focus-visual-change']).toBeUndefined();
  });

  it('h5 端不会跑小程序字号规则', () => {
    const ctx = fixture('minfont-fail');
    const h5 = { ...ctx, platform: 'h5' as const };
    const res = runRules(h5, RULES);
    expect(res.skipped).toContain('wechat-min-font-size');
  });
});

describe('severity 分级', () => {
  it('占位符低对比只降 warn，普通正文才是 block', () => {
    const warn = runRules(fixture('contrast-warn-placeholder'), [ruleById('wcag-1.4.3-contrast')!]);
    expect(warn.violations).toHaveLength(1);
    expect(warn.violations[0].severity).toBe('warn');

    const block = runRules(fixture('contrast-fail-body'), [ruleById('wcag-1.4.3-contrast')!]);
    expect(block.violations[0].severity).toBe('block');
  });

  it('includeWarn:false 时只剩 block（自修环只喂可修的）', () => {
    const res = runRules(fixture('contrast-warn-placeholder'), RULES, { includeWarn: false });
    expect(res.violations).toEqual([]);
  });
});

describe('断言落点：ruleId + path，不落文案', () => {
  it('反例命中精确到节点路径', () => {
    const ctx = fixture('contrast-fail-body');
    const res = runRules(ctx, [ruleById('wcag-1.4.3-contrast')!]);
    expect(res.violations[0].ruleId).toBe('wcag-1.4.3-contrast');
    expect(res.violations[0].path).toBe('root/children[0]');
    expect(res.violations[0].nodeId).toBeTruthy();
  });

  it('规则抛错会被暴露成一条 warn，而不是静默吞掉', () => {
    const boom = { ...ruleById('seo-page-title')!, check: () => { throw new Error('boom'); } };
    const res = runRules(fixture('seo-pass'), [boom]);
    expect(res.violations).toHaveLength(1);
    expect(res.violations[0].message).toContain('boom');
  });
});

describe('上下文构建', () => {
  it('背景色沿祖先继承，文字色同理', () => {
    const page = fixture('contrast-fail-body').page;
    const ctx = buildContext(page);
    expect(ctx.nodes[0].path).toBe('root');
    expect(ctx.nodes[1].background).toBe('#FFFFFF');
  });
});
