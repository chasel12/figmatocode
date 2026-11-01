/**
 * D7 质量审计 —— owner：**addyosmani/web-quality-skills**（只留 a11y 30% + SEO 15% 两维）。
 *
 * Perf 40% / Best-practices 15% 已裁（产物静态、无运行时数据、无依赖清单）。
 * 这里做 SEO 的「标题」一项：`<title>` 直接来自页面名（`html.ts:141`），所以
 * 「页面名唯一且长度合理」= 标题合规，且这是**整站**性质，必须带 `ctx.site`。
 */
import type { RuleHit, StandardRule } from '../types';

/** 中文标题的经验上限：超过在搜索结果里会被截断 */
const MAX_TITLE = 30;
const MIN_TITLE = 2;

export const pageTitleRule: StandardRule = {
  id: 'seo-page-title',
  domain: 'D7',
  source: 'web-quality-skills SEO 维度',
  severity: 'warn',
  platform: ['all'],
  fixtures: { pass: ['seo-pass'], fail: ['seo-fail-dup', 'seo-fail-long'] },
  check(ctx) {
    const name = ctx.page.name?.trim() ?? '';
    const hits: RuleHit[] = [];
    if (name.length < MIN_TITLE) {
      hits.push({ path: 'page', message: `页面名过短（${name.length} 字），无法作为有效标题`, meta: { name } });
    } else if (name.length > MAX_TITLE) {
      hits.push({
        path: 'page',
        message: `页面名 ${name.length} 字超过 ${MAX_TITLE} 字，搜索结果里会被截断`,
        meta: { name, length: name.length, max: MAX_TITLE },
      });
    }
    const names = ctx.site?.pageNames ?? [];
    const dup = names.filter((n) => n.trim() === name).length;
    if (dup > 1) {
      hits.push({
        path: 'page',
        message: `页面名「${name}」在站内出现 ${dup} 次，标题不唯一`,
        meta: { name, count: dup, names },
      });
    }
    return hits;
  },
};
