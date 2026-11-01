/**
 * D3 中文文案与标点 —— owner：**中文文案排版指北**（sparanoid）。
 *
 * 拆成三条**独立**规则而不是一条大规则，原因有两个：
 *  1. 一条规则只判一件事 —— 否则命中率无法归因（§4.7 的「能不能用规则表解释」就废了）
 *  2. 三条的严格程度不同：空格是硬约定（几乎所有中文产品都遵守），全角标点是偏好。
 *     混在一起只能取最松或最严，两头都错。
 *
 * 归一化函数是**幂等**的（`apply(apply(x)) === apply(x)`），有单测锁死 —— 排版类规则
 * 最容易互相打架（A 加空格 / B 删空格，净效果为零），幂等测试是唯一能抓震荡的办法。
 */

import type { RuleContext, RuleHit, StandardRule } from '../types';

/** 汉字（含扩展 A / 兼容区） */
const CJK = '\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff';
const CJK_RE = new RegExp(`[${CJK}]`);
const CJK_CLASS = `[${CJK}]`;

/** 白名单（C2）：这些片段内部一律不动，也不能因为它在中间而加空格 */
const PROTECT_PATTERNS: RegExp[] = [
  /`[^`]*`/g, // 代码
  /https?:\/\/[^\s，。；）)]+/g, // URL
  /\{\{[^{}]*\}\}/g, // 模板占位符（repeat 的 {{index}} 等）
  /[\w.+-]+@[\w-]+\.[\w.-]+/g, // 邮箱
];

const SENTINEL = '\u0001';

function protect(text: string, extra: RegExp[] = []): { text: string; restore: (s: string) => string } {
  const saved: string[] = [];
  let out = text;
  for (const re of [...PROTECT_PATTERNS, ...extra]) {
    out = out.replace(re, (m) => {
      saved.push(m);
      return `${SENTINEL}${saved.length - 1}${SENTINEL}`;
    });
  }
  return {
    text: out,
    restore: (s: string) => s.replace(new RegExp(`${SENTINEL}(\\d+)${SENTINEL}`, 'g'), (_, i: string) => saved[Number(i)] ?? ''),
  };
}

const FULLWIDTH: Record<string, string> = {
  ',': '，',
  ';': '；',
  ':': '：',
  '?': '？',
  '!': '！',
};

/** C3：中文语境用「……」，英文/数字后用「…」 */
export function normalizeEllipsis(input: string): string {
  const { text, restore } = protect(input);
  const out = text.replace(/\.{3,}/g, (_m, offset: number, whole: string) => {
    const prev = whole.slice(0, offset).trimEnd().slice(-1);
    return CJK_RE.test(prev) ? '……' : '…';
  });
  return restore(out);
}

/** 中文语境里的半角标点 → 全角；括号内是中文时同样转 */
export function normalizePunctuation(input: string): string {
  const { text, restore } = protect(input);
  let out = text;
  for (const [half, full] of Object.entries(FULLWIDTH)) {
    const esc = half.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 中文在前：吃掉中间的空格（"价格 : 29" → "价格：29"）
    out = out.replace(new RegExp(`(${CJK_CLASS})\\s*${esc}`, 'g'), `$1${full}`);
    out = out.replace(new RegExp(`${esc}(${CJK_CLASS})`, 'g'), `${full}$1`);
  }
  out = out.replace(new RegExp(`\\(([^()]*${CJK_CLASS}[^()]*)\\)`, 'g'), '（$1）');
  return restore(out);
}

/**
 * 中英文之间加空格。
 *
 * **刻意不管「中文 ↔ 数字」**：中文里「3 个」是排版指北的写法，但「3个」也是主流，
 * 且数字参与的是量词结构而不是语言切换。把数字也纳进来会让命中率飙到无法收敛，
 * 而收益只是「更讲究」—— 这是取舍，不是遗漏。
 *
 * **数字+单位整体保护**（C2）：`10MB` 里的 `MB` 不参与「中英文之间」的判定，否则
 * 「剩余10MB空间」会变成「剩余10MB 空间」—— 左边不加右边加，比不加更难看。
 * 单位词是**一个整体**，整体两侧都不动。
 */
export function normalizeSpacing(input: string): string {
  const { text, restore } = protect(input, [/\d+(?:\.\d+)?[A-Za-z]+/g]);
  let out = text;
  out = out.replace(new RegExp(`(${CJK_CLASS})([A-Za-z])`, 'g'), '$1 $2');
  out = out.replace(new RegExp(`([A-Za-z])(${CJK_CLASS})`, 'g'), '$1 $2');
  return restore(out);
}

/** 三步全跑（顺序固定：省略号 → 标点 → 空格） */
export function normalizeCjkText(input: string): string {
  return normalizeSpacing(normalizePunctuation(normalizeEllipsis(input)));
}

/** 只有含中文的文案才归 D3 管；纯英文走 D2/WIG（C3 的按语言分流） */
function needsCjk(text: string | undefined): text is string {
  return !!text && CJK_RE.test(text);
}

function lint(ctx: RuleContext, fn: (s: string) => string, label: string): RuleHit[] {
  const hits: RuleHit[] = [];
  for (const rn of ctx.nodes) {
    if (!needsCjk(rn.text)) continue;
    const next = fn(rn.text);
    if (next === rn.text) continue;
    hits.push({
      path: rn.path,
      nodeId: rn.node.id,
      message: `${label}：${JSON.stringify(rn.text)} → ${JSON.stringify(next)}`,
      meta: { from: rn.text, to: next },
    });
  }
  return hits;
}

export const cjkSpacingRule: StandardRule = {
  id: 'cjk-latin-spacing',
  domain: 'D3',
  source: '中文文案排版指北「中英文之间加空格」+ C2 白名单',
  severity: 'warn',
  platform: ['all'],
  fixtures: { pass: ['cjk-space-pass', 'cjk-space-pass-unit'], fail: ['cjk-space-fail'] },
  check: (ctx) => lint(ctx, normalizeSpacing, '中英文之间缺少空格'),
};

export const cjkPunctuationRule: StandardRule = {
  id: 'cjk-fullwidth-punctuation',
  domain: 'D3',
  source: '中文文案排版指北「全角标点」',
  severity: 'warn',
  platform: ['all'],
  fixtures: { pass: ['cjk-punct-pass'], fail: ['cjk-punct-fail'] },
  check: (ctx) => lint(ctx, normalizePunctuation, '中文语境应使用全角标点'),
};

export const cjkEllipsisRule: StandardRule = {
  id: 'cjk-ellipsis',
  domain: 'D3',
  source: '中文文案排版指北「省略号」+ C3 按语言分流',
  severity: 'warn',
  platform: ['all'],
  fixtures: { pass: ['cjk-ellipsis-pass'], fail: ['cjk-ellipsis-fail'] },
  check: (ctx) => lint(ctx, normalizeEllipsis, '省略号应使用「……」'),
};
