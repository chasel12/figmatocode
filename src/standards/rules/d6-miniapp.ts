/**
 * D6 移动端 / 小程序 —— owner：**微信小程序设计指南**。
 *
 * 只留「字号下限」这一条可判的（C11：StylePack 的字号阶为准，微信指南当下限用）。
 * 视觉体系（配色/圆角/间距）与 StylePack 冲突，已明确排除（§2 D6 的「排除」列）。
 */
import type { RuleHit, StandardRule } from '../types';

/** 正文最小字号（微信指南的下限；比它更小在真机上基本读不清） */
const MIN_FONT_SIZE = 11;

export const miniappFontRule: StandardRule = {
  id: 'wechat-min-font-size',
  domain: 'D6',
  source: '微信小程序设计指南「字号」+ C11',
  severity: 'warn',
  platform: ['mini'],
  fixtures: { pass: ['minfont-pass'], fail: ['minfont-fail'] },
  check(ctx) {
    const hits: RuleHit[] = [];
    for (const rn of ctx.nodes) {
      if (!rn.text || !rn.text.trim()) continue;
      const size = rn.node.style?.fontSize;
      if (size == null || size >= MIN_FONT_SIZE) continue;
      hits.push({
        path: rn.path,
        nodeId: rn.node.id,
        message: `字号 ${size}px 低于小程序下限 ${MIN_FONT_SIZE}px`,
        meta: { fontSize: size, min: MIN_FONT_SIZE },
      });
    }
    return hits;
  },
};
