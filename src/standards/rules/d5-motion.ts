/**
 * D5 动效 —— owner：**Vercel WIG Animation 组**。
 *
 * 这条规则**必须跑在产物 CSS 上**，不能在 AST 上：`StyleSchema` 没有 `transition` 字段
 * （C15 的裁决就是「先做 normalizer 拒绝，等有字段再升级为闸门」）。所以 `ctx.css`
 * 缺失时本规则**不产生命中**，报告里会显式标出「css 缺失」——不能把「没跑」算成「合规」。
 */
import type { RuleHit, StandardRule } from '../types';

/** `transition: all` / `transition:all`（含 `all 0.2s` 等变体） */
const TRANSITION_ALL_RE = /transition(?:-property)?\s*:\s*all\b/gi;

export const motionRule: StandardRule = {
  id: 'wig-no-transition-all',
  domain: 'D5',
  source: 'Vercel WIG「Animation」+ C15',
  severity: 'warn',
  platform: ['all'],
  fixtures: { pass: ['motion-pass'], fail: ['motion-fail'] },
  check(ctx) {
    if (!ctx.css) return [];
    const hits: RuleHit[] = [];
    const lines = ctx.css.split(/[;}]+/);
    lines.forEach((seg, i) => {
      TRANSITION_ALL_RE.lastIndex = 0;
      if (!TRANSITION_ALL_RE.test(seg)) return;
      hits.push({
        path: 'page',
        message: '禁止 `transition: all`（会连带过渡布局属性，产生掉帧与意外位移）',
        meta: { segment: seg.trim(), index: i },
      });
    });
    return hits;
  },
};
