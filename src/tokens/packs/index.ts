/**
 * M7 风格包注册表（W2.5）
 *
 * 数据全部来自 `scripts/extract-tokens.mjs` 的构建期产物（同目录 *.tokens.json）。
 * 本文件只做三件事：注册、查表、把风格包摊平成可导入资产面板的 StyleToken 列表。
 */
import type { StyleToken } from '../../schema/types';
import type { StylePack } from './types';
import shadcnJson from './shadcn.tokens.json';
import openpropsJson from './openprops.tokens.json';
import daisyDarkJson from './daisy-dark.tokens.json';
import blackgreenJson from './blackgreen.tokens.json';
import forestJson from './forest.tokens.json';

export type { StylePack } from './types';

/**
 * 已注册风格包。
 *
 * `blackgreen` 是**手写**的（不是 `scripts/extract-tokens.mjs` 产物）：三个抽取包里
 * 主色分别是紫 / 蓝 / 蓝，没有任何绿色，而提示词硬规则明确「不要出现包外色值」——
 * 意味着「做一个黑绿色的 app」这类显式配色要求，不改代码就实现不了。
 * 补一个包是最小修复；更彻底的方案是让用户能在 UI 里自定义包（当前只能改源码）。
 *
 * `forest` 同理，2026-11-02 补：记账小程序的需求稿写「主色是墨绿」，但 `shadcn` 的
 * `primary` 是 `#0090ff`（蓝）。提示词说绿、包说蓝 —— 模型两边都听，于是同一个页面里
 * 大部分元素用了显式墨绿、**一个按钮用了 `@color.primary` 变蓝**。
 * 这类「说一套、令牌给另一套」的冲突不该靠提示词加强语气解决（约束要放在令牌层），
 * 补一个墨绿包即可。
 */
export const PACKS: StylePack[] = [shadcnJson, openpropsJson, daisyDarkJson, blackgreenJson, forestJson] as unknown as StylePack[];

export const DEFAULT_PACK_ID = 'shadcn';

export function getPack(id: string | undefined): StylePack {
  return PACKS.find((p) => p.id === id) ?? PACKS[0];
}

/**
 * 风格包 → 工程样式表（PAINT 每个语义色一条，TEXT 每个字号阶一条）。
 * 用于「载入风格包」：让生成的页面在资产面板里也能被人手工复用，
 * 且改样式能同步到引用者（FR-27 既有能力，AI 域零新增）。
 */
export function packTokens(pack: StylePack): StyleToken[] {
  const tokens: StyleToken[] = [];
  for (const [name, value] of Object.entries(pack.colors)) {
    tokens.push({
      id: `ai-${pack.id}-paint-${name}`,
      name: `${pack.name} / ${name}`,
      kind: 'PAINT',
      style: { background: value },
      cssVar: `--ai-${pack.id}-${name}`,
    });
  }
  pack.fonts.slice(0, 1).forEach((font, i) => {
    for (const size of pack.fontSizes) {
      tokens.push({
        id: `ai-${pack.id}-text-${i}-${size}`,
        name: `${pack.name} / ${font.family} ${size}`,
        kind: 'TEXT',
        style: {
          fontFamily: font.stack,
          fontSize: size,
          fontWeight: size >= 20 ? 600 : 400,
          lineHeight: Math.round(size * 1.45),
          color: pack.colors.foreground,
        },
        cssVar: `--ai-${pack.id}-text-${size}`,
      });
    }
  });
  return tokens;
}

/** 色板校验：某个色值是否属于风格包（风格符合度指标用） */
export function isPackColor(pack: StylePack, color: string | undefined): boolean {
  if (!color) return true;
  const c = color.trim().toLowerCase();
  return Object.values(pack.colors).some((v) => v.toLowerCase() === c);
}
