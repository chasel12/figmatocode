/**
 * 规则注册表 —— **唯一真相源**。
 *
 * 8 个域、一个域一个 owner（`docs/frontend-standards-final.md` §2）。新增规则前先回答：
 * 「这件事归哪个域？该域的 owner 已经有话说吗？」—— 有话说就不要新增第二条，
 * 那是把冲突重新引入（§2.1 第 1 条）。
 */
import { contrastRule, imageAltRule, targetSizeRule } from './rules/d1-a11y';
import { focusVisualRule, interactionStateRule } from './rules/d2-behavior';
import { cjkEllipsisRule, cjkPunctuationRule, cjkSpacingRule } from './rules/d3-typography';
import { colorDriftRule } from './rules/d4-tokens';
import { motionRule } from './rules/d5-motion';
import { miniappFontRule } from './rules/d6-miniapp';
import { pageTitleRule } from './rules/d7-seo';
import type { Domain, StandardRule } from './types';

export const RULES: StandardRule[] = [
  // D1 可访问性（WCAG 2.2 AA）
  contrastRule,
  imageAltRule,
  targetSizeRule,
  // D2 界面行为（Vercel WIG）
  interactionStateRule,
  focusVisualRule,
  // D3 中文文案与标点（中文文案排版指北）
  cjkSpacingRule,
  cjkPunctuationRule,
  cjkEllipsisRule,
  // D4 设计令牌（DTCG）
  colorDriftRule,
  // D5 动效（WIG Animation）
  motionRule,
  // D6 小程序（微信设计指南）
  miniappFontRule,
  // D7 质量审计（web-quality-skills）
  pageTitleRule,
];

/** 域 → 该域的规则（报告按域分组，便于一眼看出哪个域在报警） */
export function rulesByDomain(rules: StandardRule[] = RULES): Record<Domain, StandardRule[]> {
  const out = {} as Record<Domain, StandardRule[]>;
  for (const r of rules) {
    (out[r.domain] ??= []).push(r);
  }
  return out;
}

export function ruleById(id: string): StandardRule | undefined {
  return RULES.find((r) => r.id === id);
}
