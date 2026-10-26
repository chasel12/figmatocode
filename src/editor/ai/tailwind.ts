/**
 * Tailwind class → `layout` / `style` 的**确定性映射器**（AI 表达通道的后端）。
 *
 * ## 为什么需要它
 *
 * 让模型手写 `widthMode: FILL` / `padding: [上,右,下,左]` 这类字段，等于让它盲写——
 * 这些枚举它从未见过。而 `flex items-center gap-3 px-4` 它在预训练里见过几百万次。
 * 所以给模型一个它熟悉的表达通道，由本文件负责翻译回 AST 字段。
 *
 * ## 设计原则
 *
 * 1. **只映射能无损转换的子集**。映射不了的一律进 `unknown`，绝不静默丢弃——
 *    静默丢弃会让「AI 写的东西」和「画布上看到的东西」不一致，比报错更糟。
 * 2. **一个 class 一个确定语义**。这是相对「解析任意 CSS」的核心优势：
 *    `ml-auto` 语义唯一，不需要从 `margin-left:auto` / `float:right` / `justify-self` 里猜意图。
 * 3. **不认变体前缀**（`md:` / `hover:` / `dark:`）。项目没有响应式断点，交互态走
 *    `style.states`，class 里带变体说明模型越界了，报出来比猜好。
 *
 * 优先级：调用方（`specToPage`）让显式 `layout` / `style` 字段**覆盖**本文件的产出，
 * 这样「class 给默认，显式字段做精确控制」。
 */
import type { BorderSchema, LayoutSchema, StyleSchema } from '../../schema/types';

export interface ClassParseResult {
  layout: Partial<LayoutSchema>;
  style: Partial<StyleSchema>;
  /** 无法识别或无法无损映射的 class（调用方据此生成违例，喂给自修环） */
  unknown: string[];
}

/** Tailwind 间距基准：1 单位 = 4px（正好是项目 8pt 网格的半个步长） */
const UNIT = 4;

const FONT_SIZE: Record<string, number> = {
  xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48,
};

/** 键为空串表示 `rounded`（无后缀）= 4px，与 Tailwind 默认一致 */
const RADIUS: Record<string, number> = {
  none: 0, sm: 2, '': 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, full: 9999,
};

const FONT_WEIGHT: Record<string, number> = {
  thin: 100, light: 300, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800,
};

const ALIGN: Record<string, LayoutSchema['align']> = {
  start: 'START', center: 'CENTER', end: 'END', stretch: 'STRETCH', baseline: 'BASELINE',
};

const JUSTIFY: Record<string, LayoutSchema['justify']> = {
  start: 'START', center: 'CENTER', end: 'END', between: 'SPACE_BETWEEN',
};

/** 无颜色档位的具名色（项目令牌里没有 white/black，直接给字面量） */
const NAMED_COLOR: Record<string, string> = {
  white: '#FFFFFF', black: '#000000', transparent: 'transparent',
};

/**
 * 对 AST 表达无影响的装饰性 class：**忽略而不是报错**。
 * 报错只会白白消耗自修轮，而它们本来也不改变视觉。
 */
const IGNORED = new Set([
  'antialiased', 'select-none', 'pointer-events-none', 'sr-only',
  'cursor-pointer', 'transition', 'transition-all', 'transition-colors',
  'duration-100', 'duration-150', 'duration-200', 'duration-300', 'ease-in-out', 'ease-out',
  'relative', 'static',
]);

/** 单边 padding 的下标：p=四边 / px=左右 / py=上下 / 单边 */
const PAD_SIDES: Record<string, number[]> = {
  p: [0, 1, 2, 3], px: [1, 3], py: [0, 2], pt: [0], pr: [1], pb: [2], pl: [3],
};

/** `12` → 48；`0.5` → 2；`[12px]` → 12；`auto`/`full` 等关键字 → null */
function sizeOf(token: string): number | null {
  const arb = /^\[(\d+(?:\.\d+)?)px\]$/.exec(token);
  if (arb) return Number(arb[1]);
  if (token === 'px') return 1;
  if (token === '0') return 0;
  const n = Number(token);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * UNIT);
}

/**
 * class 颜色段 → 颜色值。
 * `primary` → `@color.primary`（交给调用方按风格包解析）；`[#1677FF]` → 字面量。
 * 带数字档位的（`blue-500`）无法映射到项目令牌 → null（进 unknown）。
 */
function colorOf(token: string): string | null {
  const named = NAMED_COLOR[token];
  if (named) return named;
  const arb = /^\[(.+)\]$/.exec(token);
  if (arb) {
    const v = arb[1].trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) ? v : null;
  }
  // Tailwind 默认色板（blue-500 之类）在项目里没有对应令牌，硬映射会造出包外色值
  if (/^[a-z]+-\d{2,3}$/.test(token)) return null;
  return `@color.${token}`;
}

/* ------------------------------------------------------------------ */
/* 反向：layout/style → className                                        */
/* ------------------------------------------------------------------ */

/**
 * 为什么要反向映射：few-shot 语料的示范权重**远高于**契约里的文字说明。
 * 实测（2026-10-26）只改契约、样例仍全是手写 layout 时，模型输出 className 使用率 **0%**。
 * 所以要让模型用上新通道，必须让样例本身就用 className 写——本函数就是干这个的。
 *
 * 数值优先用 Tailwind 标准刻度（`w-14` 而不是 `w-[56px]`），这样模型看到的是它
 * 在预训练里见过几十亿次的那种写法；刻度表里没有的才退到任意值语法。
 */
const SCALE = new Set([
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96,
]);

function step(n: number): string | null {
  const v = n / UNIT;
  return SCALE.has(v) ? String(v) : null;
}

function sizeClass(prefix: string, n: number): string {
  const s = step(n);
  return s != null ? `${prefix}-${s}` : `${prefix}-[${n}px]`;
}

/** 颜色值 → class 里的颜色段（令牌名 / 具名色 / 任意值） */
function colorToken(v: string | undefined): string | null {
  if (!v) return null;
  const tok = /^@(?:color\.)?(.+)$/.exec(v);
  if (tok) return tok[1];
  const named = Object.entries(NAMED_COLOR).find(([, hex]) => hex.toLowerCase() === v.toLowerCase());
  if (named) return named[0];
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return `[${v}]`;
  return null;
}

/**
 * layout / style → 空格分隔的 class 串（与 `parseClassNames` 严格对称）。
 * 只输出**有值**的字段，所以结果可以直接替换掉 layout/style 出现在样例里。
 */
export function layoutToClassName(layout: Partial<LayoutSchema>, style: Partial<StyleSchema>): string {
  const out: string[] = [];

  if (layout.mode === 'HORIZONTAL') out.push('flex');
  else if (layout.mode === 'VERTICAL') out.push('flex-col');

  if (layout.align && layout.align !== 'BASELINE') out.push(`items-${String(layout.align).toLowerCase()}`);
  if (layout.justify) {
    const j = layout.justify === 'SPACE_BETWEEN' ? 'between' : String(layout.justify).toLowerCase();
    out.push(`justify-${j}`);
  }

  const pad = layout.padding;
  if (pad && pad.some((v) => v !== 0)) {
    const [t, r, b, l] = pad;
    if (t === r && r === b && b === l) {
      out.push(sizeClass('p', t));
    } else if (t === b && r === l) {
      if (t) out.push(sizeClass('py', t));
      if (r) out.push(sizeClass('px', r));
    } else {
      if (t) out.push(sizeClass('pt', t));
      if (r) out.push(sizeClass('pr', r));
      if (b) out.push(sizeClass('pb', b));
      if (l) out.push(sizeClass('pl', l));
    }
  }

  if (layout.gap) out.push(sizeClass('gap', layout.gap));

  // 尺寸：FILL/HUG 用关键字，FIXED 用刻度
  if (layout.widthMode === 'FILL') out.push('w-full');
  else if (layout.widthMode === 'HUG') out.push('w-auto');
  else if (layout.width != null) out.push(sizeClass('w', layout.width));

  if (layout.heightMode === 'FILL') out.push('h-full');
  else if (layout.heightMode === 'HUG') out.push('h-auto');
  else if (layout.height != null) out.push(sizeClass('h', layout.height));

  if (layout.flexGrow === 1) out.push('flex-1');
  if (layout.clipContent) out.push('overflow-hidden');

  // ---- style ----
  const fs = style.fontSize;
  if (fs != null) {
    const key = Object.entries(FONT_SIZE).find(([, v]) => v === fs)?.[0];
    out.push(key ? `text-${key}` : `text-[${fs}px]`);
  }
  if (style.fontWeight != null) {
    const key = Object.entries(FONT_WEIGHT).find(([, v]) => v === style.fontWeight)?.[0];
    if (key) out.push(`font-${key}`);
  }
  if (style.textAlign) out.push(`text-${style.textAlign}`);

  const bg = colorToken(style.background);
  if (bg) out.push(`bg-${bg}`);
  const fg = colorToken(style.color);
  if (fg) out.push(`text-${fg}`);

  const radius = style.borderRadius;
  if (typeof radius === 'number') {
    const key = Object.entries(RADIUS).find(([, v]) => v === radius)?.[0];
    if (key === '') out.push('rounded');
    else if (key) out.push(`rounded-${key}`);
    else out.push(`rounded-[${radius}px]`); // 刻度外的圆角（如 18）走任意值，否则样例会丢字段
  }

  const border = style.border;
  if (border && border.width > 0) {
    out.push(border.width === 1 ? 'border' : `border-${border.width}`);
    const bc = colorToken(border.color);
    if (bc) out.push(`border-${bc}`);
  }

  if (style.opacity != null && style.opacity < 1) out.push(`opacity-${Math.round(style.opacity * 100)}`);

  return out.join(' ');
}

export function parseClassNames(input: string | undefined): ClassParseResult {
  const layout: Partial<LayoutSchema> = {};
  const style: Partial<StyleSchema> = {};
  const unknown: string[] = [];
  if (!input) return { layout, style, unknown };

  const pad: [number, number, number, number] = [0, 0, 0, 0];
  const padSet = [false, false, false, false];
  const border: Partial<BorderSchema> = {};
  let hasBorder = false;
  let flex1 = false;

  for (const raw of input.split(/\s+/)) {
    const cls = raw.trim();
    if (!cls) continue;

    // 变体前缀（md: / hover: / dark:）不在受控子集内：项目没有断点，交互态走 style.states
    if (cls.includes(':')) {
      unknown.push(cls);
      continue;
    }

    // ---- 布局方向 ----
    if (cls === 'flex' || cls === 'flex-row') {
      layout.mode = 'HORIZONTAL';
      continue;
    }
    if (cls === 'flex-col') {
      layout.mode = 'VERTICAL';
      continue;
    }
    if (cls === 'grid') {
      // AST 的 grid 是另一套语义（columns/rows 模板串），不做隐式映射
      unknown.push(cls);
      continue;
    }

    // ---- 交叉轴 / 主轴对齐 ----
    let m = /^items-(.+)$/.exec(cls);
    if (m) {
      const v = ALIGN[m[1]];
      if (v) layout.align = v;
      else unknown.push(cls);
      continue;
    }
    m = /^justify-(.+)$/.exec(cls);
    if (m) {
      const v = JUSTIFY[m[1]];
      if (v) layout.justify = v;
      else unknown.push(cls); // around / evenly 在项目里没有对应档
      continue;
    }

    // ---- 内边距（累积，不互相覆盖：px-4 py-2 应得 [8,16,8,16]）----
    m = /^(p|px|py|pt|pr|pb|pl)-(.+)$/.exec(cls);
    if (m) {
      const px = sizeOf(m[2]);
      if (px == null) {
        unknown.push(cls);
        continue;
      }
      for (const i of PAD_SIDES[m[1]]) {
        pad[i] = px;
        padSet[i] = true;
      }
      continue;
    }

    // ---- 间距 ----
    m = /^gap-(.+)$/.exec(cls);
    if (m) {
      const px = sizeOf(m[1]);
      if (px == null) unknown.push(cls);
      else layout.gap = px;
      continue;
    }
    // gap-x / gap-y 是双轴独立间距，AST 只有单 gap（wrap 场景另有 gapCross）→ 不猜
    if (/^gap-[xy]-/.test(cls)) {
      unknown.push(cls);
      continue;
    }

    // ---- 尺寸 ----
    if (cls === 'w-full') {
      layout.widthMode = 'FILL';
      continue;
    }
    if (cls === 'h-full') {
      layout.heightMode = 'FILL';
      continue;
    }
    if (cls === 'w-auto' || cls === 'w-fit') {
      layout.widthMode = 'HUG';
      continue;
    }
    if (cls === 'h-auto' || cls === 'h-fit') {
      layout.heightMode = 'HUG';
      continue;
    }
    m = /^w-(.+)$/.exec(cls);
    if (m) {
      const px = sizeOf(m[1]);
      if (px == null) unknown.push(cls);
      else {
        layout.width = px;
        layout.widthMode = 'FIXED';
      }
      continue;
    }
    m = /^h-(.+)$/.exec(cls);
    if (m) {
      const px = sizeOf(m[1]);
      if (px == null) unknown.push(cls);
      else {
        layout.height = px;
        layout.heightMode = 'FIXED';
      }
      continue;
    }
    m = /^(min|max)-([wh])-(.+)$/.exec(cls);
    if (m) {
      const px = sizeOf(m[3]);
      if (px == null) {
        unknown.push(cls);
        continue;
      }
      if (m[1] === 'min') {
        if (m[2] === 'w') layout.minWidth = px;
        else layout.minHeight = px;
      } else if (m[2] === 'w') {
        layout.maxWidth = px;
      } else {
        layout.maxHeight = px;
      }
      continue;
    }

    // ---- flex 伸缩（flex-1 的 FILL 方向要等循环结束才知道，见下方）----
    if (cls === 'flex-1') {
      flex1 = true;
      layout.flexGrow = 1;
      continue;
    }
    if (cls === 'grow') {
      layout.flexGrow = 1;
      continue;
    }
    if (cls === 'grow-0') {
      layout.flexGrow = 0;
      continue;
    }
    if (cls === 'shrink') {
      layout.flexShrink = 1;
      continue;
    }
    if (cls === 'shrink-0') {
      layout.flexShrink = 0;
      continue;
    }

    // ---- 文本对齐（必须在 text- 字号/颜色之前判断）----
    m = /^text-(left|center|right|justify)$/.exec(cls);
    if (m) {
      style.textAlign = m[1] as 'left' | 'center' | 'right' | 'justify';
      continue;
    }

    // ---- 字号 / 文字颜色（同一个前缀，先字号后颜色）----
    m = /^text-(.+)$/.exec(cls);
    if (m) {
      const t = m[1];
      const arb = /^\[(\d+(?:\.\d+)?)px\]$/.exec(t);
      if (arb) {
        style.fontSize = Number(arb[1]);
        continue;
      }
      const fs = FONT_SIZE[t];
      if (fs != null) {
        style.fontSize = fs;
        continue;
      }
      const c = colorOf(t);
      if (c) {
        style.color = c;
        continue;
      }
      unknown.push(cls);
      continue;
    }

    // ---- 字重 ----
    m = /^font-(.+)$/.exec(cls);
    if (m) {
      const w = FONT_WEIGHT[m[1]];
      if (w != null) style.fontWeight = w;
      else unknown.push(cls);
      continue;
    }

    // ---- 圆角（单角 rounded-t-lg 之类 AST 表达不了）----
    if (cls === 'rounded' || cls.startsWith('rounded-')) {
      const suffix = cls === 'rounded' ? '' : cls.slice('rounded-'.length);
      const arb = /^\[(\d+(?:\.\d+)?)px\]$/.exec(suffix);
      const r = arb ? Number(arb[1]) : RADIUS[suffix];
      if (r != null) style.borderRadius = r;
      else unknown.push(cls);
      continue;
    }

    // ---- 背景色 ----
    m = /^bg-(.+)$/.exec(cls);
    if (m) {
      const c = colorOf(m[1]);
      if (c) style.background = c;
      else unknown.push(cls);
      continue;
    }

    // ---- 边框（宽度 / 颜色，合并进同一个 border 对象）----
    if (cls === 'border') {
      border.width = 1;
      hasBorder = true;
      continue;
    }
    m = /^border-(\d+)$/.exec(cls);
    if (m) {
      border.width = Number(m[1]);
      hasBorder = true;
      continue;
    }
    m = /^border-(.+)$/.exec(cls);
    if (m) {
      const c = colorOf(m[1]);
      if (c) {
        border.color = c;
        hasBorder = true;
      } else {
        // border-t / border-dashed 等：单边、线型不在本映射器的无损范围内
        unknown.push(cls);
      }
      continue;
    }

    // ---- 透明度 ----
    m = /^opacity-(\d+)$/.exec(cls);
    if (m) {
      style.opacity = Number(m[1]) / 100;
      continue;
    }

    // ---- 裁切 ----
    if (cls === 'overflow-hidden') {
      layout.clipContent = true;
      continue;
    }
    if (cls === 'overflow-visible') {
      layout.clipContent = false;
      continue;
    }

    if (IGNORED.has(cls)) continue;
    unknown.push(cls);
  }

  if (padSet.some(Boolean)) layout.padding = pad;
  if (hasBorder) {
    style.border = {
      width: border.width ?? 1,
      color: border.color ?? '@color.border',
      style: 'solid',
    };
  }
  /**
   * `flex-1` = `flex: 1 1 0%`，除了 flexGrow 还要在**主轴**上撑满。
   * 主轴方向由 `flex` / `flex-col` 决定，而 class 顺序不保证，所以延到这里再补；
   * 显式给过 widthMode/heightMode（如同时写了 `w-full`）时不覆盖。
   */
  if (flex1) {
    if (layout.mode === 'VERTICAL') {
      if (!layout.heightMode) layout.heightMode = 'FILL';
    } else if (!layout.widthMode) {
      layout.widthMode = 'FILL';
    }
  }

  return { layout, style, unknown };
}
