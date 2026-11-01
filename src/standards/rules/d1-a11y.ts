/**
 * D1 可访问性判据 —— owner：**WCAG 2.2 AA**。
 *
 * 这里只放「有正式判据、可测」的三条：对比度（1.4.3）、图片替代文本（1.1.1）、
 * 目标尺寸（2.5.8）。键盘可达、焦点顺序这类依赖真实 DOM 交互的判据不在 AST 层做，
 * 交给 B7（axe on dist）。
 */
import { contrastRatio } from '../color';
import type { RuleHit, StandardRule } from '../types';

/* ------------------------------------------------------------------ *
 * 1.4.3 对比度（C1 分级：正文 4.5 / 大字 3.0 / 禁用豁免 / 占位符降 warn）
 * ------------------------------------------------------------------ */

/** 占位符文案：降 warn。这类文字天然低对比，报 block 会让模型无限自修 */
const PLACEHOLDER_RE = /^(请输入|请选择|请填写|搜索|输入|选择|暂无|未设置|还没有)/;

/** WCAG「大字」定义：≥24px，或 ≥18.66px 且 bold */
function isLargeText(fontSize: number, fontWeight: number): boolean {
  return fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
}

/**
 * 禁用态判定：AST 没有 `disabled` 布尔位（画布也不模拟），所以只能按**视觉约定**认——
 * 整体降透明度。这是本项目的已知表达缺口，不是判据的偷懒：`states.disabled` 只描述
 * 「禁用时长什么样」，不描述「现在是不是禁用」。
 */
function looksDisabled(opacity: number | undefined): boolean {
  return opacity != null && opacity < 0.7;
}

export const contrastRule: StandardRule = {
  id: 'wcag-1.4.3-contrast',
  domain: 'D1',
  source: 'WCAG 2.2 SC 1.4.3',
  severity: 'block',
  platform: ['all'],
  fixtures: {
    pass: ['contrast-pass-body', 'contrast-pass-large', 'contrast-pass-bold-large', 'contrast-skip-gradient', 'contrast-skip-disabled'],
    fail: ['contrast-fail-body', 'contrast-fail-large', 'contrast-warn-placeholder'],
  },
  check(ctx) {
    const hits: RuleHit[] = [];
    for (const rn of ctx.nodes) {
      if (!rn.text || !rn.text.trim()) continue;
      if (rn.node.type !== 'TEXT' && rn.node.type !== 'BUTTON') continue;
      if (looksDisabled(rn.node.style?.opacity)) continue;
      // 背景不可判定（渐变/图片/半透明）→ 跳过，**不是合规**
      const ratio = contrastRatio(rn.color, rn.background);
      if (ratio == null) continue;
      const fontSize = rn.node.style?.fontSize ?? 14;
      const fontWeight = rn.node.style?.fontWeight ?? 400;
      const required = isLargeText(fontSize, fontWeight) ? 3 : 4.5;
      if (ratio + 0.005 >= required) continue;
      const placeholder = PLACEHOLDER_RE.test(rn.text.trim());
      hits.push({
        path: rn.path,
        nodeId: rn.node.id,
        severity: placeholder ? 'warn' : undefined,
        message: placeholder
          ? `占位符文本对比度 ${ratio.toFixed(2)}:1 低于 ${required}:1（占位符仅告警）`
          : `文字对比度 ${ratio.toFixed(2)}:1 低于 ${required}:1`,
        meta: { ratio: Number(ratio.toFixed(2)), required, fontSize, fontWeight, color: rn.color, background: rn.background },
      });
    }
    return hits;
  },
};

/* ------------------------------------------------------------------ *
 * 1.1.1 图片替代文本
 * ------------------------------------------------------------------ */

/** 装饰性图片豁免：名字里带这些词的，替代文本应为空是**正确**的 */
const DECORATIVE_RE = /(装饰|背景|分割|底纹|光晕|渐变层|占位块)/;

export const imageAltRule: StandardRule = {
  id: 'wcag-1.1.1-image-alt',
  domain: 'D1',
  source: 'WCAG 2.2 SC 1.1.1',
  severity: 'warn',
  platform: ['all'],
  fixtures: { pass: ['alt-pass'], fail: ['alt-fail'] },
  check(ctx) {
    const hits: RuleHit[] = [];
    for (const rn of ctx.nodes) {
      if (rn.node.type !== 'IMAGE') continue;
      const name = rn.node.name ?? '';
      if (DECORATIVE_RE.test(name)) continue;
      const alt = (rn.node as { alt?: string }).alt;
      if (alt && alt.trim()) continue;
      hits.push({
        path: rn.path,
        nodeId: rn.node.id,
        message: '图片缺少替代文本（alt）',
        meta: { name },
      });
    }
    return hits;
  },
};

/* ------------------------------------------------------------------ *
 * 2.5.8 目标尺寸（最小 24×24 CSS px）
 * ------------------------------------------------------------------ */

const MIN_TARGET = 24;

export const targetSizeRule: StandardRule = {
  id: 'wcag-2.5.8-target-size',
  domain: 'D1',
  source: 'WCAG 2.2 SC 2.5.8',
  severity: 'warn',
  platform: ['all'],
  fixtures: { pass: ['target-pass'], fail: ['target-fail'] },
  check(ctx) {
    const hits: RuleHit[] = [];
    for (const rn of ctx.nodes) {
      if (!rn.clickable) continue;
      const { width, height, widthMode, heightMode } = rn.node.layout;
      // HUG/FILL 的最终尺寸要跑布局测量，AST 层拿不到 → 跳过（不在这一层猜）
      if (widthMode !== 'FIXED' || heightMode !== 'FIXED') continue;
      if (width == null || height == null) continue;
      if (width >= MIN_TARGET && height >= MIN_TARGET) continue;
      hits.push({
        path: rn.path,
        nodeId: rn.node.id,
        message: `可点区域 ${Math.round(width)}×${Math.round(height)} 小于 ${MIN_TARGET}×${MIN_TARGET}`,
        meta: { width: Math.round(width), height: Math.round(height), min: MIN_TARGET },
      });
    }
    return hits;
  },
};
