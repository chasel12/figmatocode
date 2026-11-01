/**
 * D2 界面行为规范 —— owner：**Vercel Web Interface Guidelines**（MIT）。
 *
 * 只留 AST 能判的两条：交互态存在性（C8 按端分流）、焦点态必须改变视觉属性（C14）。
 * WIG 的 Forms / Performance / Navigation&State / Locale 各组已明确排除（§2）。
 */
import type { StateStyleSchema, StyleSchema } from '../../schema/types';
import type { RuleHit, StandardRule } from '../types';

/** 交互态里能改变渲染的字段（与 `compile.ts:STATE_VISUAL_PROPS` 同口径，但**不 import**：
 *  那边是「允许出什么 CSS」，这边是「算不算有变化」，两边将来可能各自演化） */
const VISUAL_KEYS: (keyof StateStyleSchema)[] = [
  'background',
  'fills',
  'color',
  'border',
  'borderRadius',
  'opacity',
  'effects',
  'decorations',
];

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 该交互态是否真的改变了至少一个视觉属性（空对象 / 与基础同值 = 没变） */
export function stateChangesVisual(base: StyleSchema | undefined, state: StateStyleSchema | undefined): boolean {
  if (!state) return false;
  for (const key of VISUAL_KEYS) {
    const next = state[key];
    if (next == null) continue;
    if (!deepEqual(next, base?.[key])) return true;
  }
  return false;
}

export const interactionStateRule: StandardRule = {
  id: 'wig-interaction-state',
  domain: 'D2',
  source: 'Vercel WIG「Interactive states」+ C8 按端分流',
  severity: 'warn',
  platform: ['all'],
  fixtures: {
    pass: ['state-pass-h5', 'state-pass-mini'],
    fail: ['state-fail-h5', 'state-fail-mini'],
  },
  check(ctx) {
    // 小程序没有 hover（C8）：h5 查 hover，mini 查 active；`all` 认任一
    const slots: ('hover' | 'active')[] = ctx.platform === 'mini' ? ['active'] : ctx.platform === 'h5' ? ['hover'] : ['hover', 'active'];
    const hits: RuleHit[] = [];
    for (const rn of ctx.nodes) {
      if (!rn.clickable) continue;
      const states = rn.node.style?.states;
      const ok = slots.some((s) => stateChangesVisual(rn.node.style, states?.[s]));
      if (ok) continue;
      hits.push({
        path: rn.path,
        nodeId: rn.node.id,
        message: `可点元素缺少${slots.join('/')}态（${ctx.platform}）`,
        meta: { platform: ctx.platform, slots },
      });
    }
    return hits;
  },
};

export const focusVisualRule: StandardRule = {
  id: 'wig-focus-visual-change',
  domain: 'D2',
  source: 'Vercel WIG「Focus」+ C14',
  severity: 'warn',
  platform: ['h5'],
  fixtures: { pass: ['focus-pass'], fail: ['focus-fail'] },
  check(ctx) {
    const hits: RuleHit[] = [];
    for (const rn of ctx.nodes) {
      const focus = rn.node.style?.states?.focus;
      if (!focus) continue; // 没写焦点态不是本条的事（H5 有浏览器默认 focus-visible）
      if (stateChangesVisual(rn.node.style, focus)) continue;
      hits.push({
        path: rn.path,
        nodeId: rn.node.id,
        message: '焦点态与基础样式相同，等于没有可见焦点',
      });
    }
    return hits;
  },
};
