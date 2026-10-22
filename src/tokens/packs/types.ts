/**
 * M7 风格资产域 · 风格包数据契约（Wave2 plan §3 / W2.5）
 *
 * 数据来源全部为**构建期抽取**（`scripts/extract-tokens.mjs`），产物 JSON 落库：
 *  - `shadcn`  ← @radix-ui/colors（MIT）+ shadcn 语义色名，经 culori 把 oklch/hex 统一为 hex
 *  - `openprops` ← open-props（MIT）：阴影族 / 字号阶 / 间距阶 / 色板
 *  - `daisy-dark` ← daisyui（MIT）的 dark 主题色
 *
 * 运行时只读 JSON，不做任何色彩计算——保证产物确定性与零运行时依赖。
 */
export interface PackFont {
  /** 字体族名（CSS font-family 首项） */
  family: string;
  /** 完整 font-family 栈 */
  stack: string;
  /** 可用字重 */
  weights: number[];
  /** 来源包（@fontsource-variable/...） */
  source: string;
  license: string;
}

export interface StylePack {
  id: string;
  /** 展示名 */
  name: string;
  /** 来源与许可证（UI 上如实展示，红线③） */
  source: string;
  license: string;
  /** 亮/暗底（生成时提示词用） */
  mode: 'light' | 'dark';
  /** 一句话设计语言描述（进系统提示） */
  description: string;
  /** 语义色名 → hex（模型以 `@color.<name>` 引用） */
  colors: Record<string, string>;
  /** 字号阶（px，升序） */
  fontSizes: number[];
  /** 间距阶（px，升序） */
  spacings: number[];
  /** 圆角阶（px，升序） */
  radii: number[];
  /** 阴影 CSS 值（open-props 族；生成时作为参考） */
  shadows: string[];
  fonts: PackFont[];
}

/** 令牌引用前缀：`@color.primary` / `@color.primary` 简写 `@primary` */
export const TOKEN_PREFIX = '@';
