/**
 * 前端规范规则表（`docs/frontend-standards-final.md`）。
 *
 * 对外只暴露四样东西：规则表、上下文构建、执行器、自检/变异。
 * 其余（颜色计算、fixture、单条规则）是内部实现。
 */
export { RULES, ruleById, rulesByDomain } from './rules';
export { buildContext, ownBackground, appliesTo, PAGE_DEFAULT_BG } from './context';
export { runRules, countHits } from './runner';
export { selfCheck, fixtureReport, mutationReport } from './audit';
export { FIXTURES, fixture, fixturesOf } from './fixtures';
export { normalizeCjkText, normalizeSpacing, normalizePunctuation, normalizeEllipsis } from './rules/d3-typography';
export { contrastRatio, parseColor, deltaE, normalizeHex } from './color';
export type {
  Domain,
  Platform,
  RuleContext,
  RuleHit,
  ResolvedNode,
  Severity,
  SiteContext,
  StandardRule,
  StandardViolation,
} from './types';
