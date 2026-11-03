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
import type { BorderSchema, Effect, LayoutSchema, StyleSchema } from '../../schema/types';

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
  thin: 100, light: 300, normal: 400, medium: 500, semibold: 600, bold: 700,
  extrabold: 800, black: 900,
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
 * Tailwind 默认阴影档位（x 恒为 0，只列 y / blur / spread / color）。
 *
 * 为什么必须补：`StyleSchema.effects` 从 FR-19 起就完整支持 8 种效果，
 * `compile.ts:890` 一直在出 `box-shadow` 链，**唯独 className 通道里没有 shadow 这一行**。
 * 模型写 `shadow-md`（Tailwind 里最高频的类之一）→ 进 unknown → 违例 → 阴影消失。
 *
 * 实测（2026-10-29，20 份 StyleKit 风格规格）：`shadow-*` 累计被拒 **51 次**，
 * 是单一最大缺口。而阴影是区分设计层次的唯一手段，没有它所有卡片都是平的。
 *
 * 与 Tailwind v3 默认值的差异：`md` 及以上在 Tailwind 里是**两层**阴影，
 * 这里只取主层。第二层是 `0 2px 4px -2px` 这类极淡的补边，视觉差在 1px 级，
 * 换来的是一条 effects 而不是两条（AST 每节点固定开销 60~80 字符，体积税要算）。
 * 需要精确多层时走显式 `style.effects`，那条路径不受影响。
 */
const SHADOW: Record<string, { y: number; blur: number; spread: number; color: string }> = {
  sm: { y: 1, blur: 2, spread: 0, color: 'rgba(0,0,0,0.05)' },
  '': { y: 1, blur: 3, spread: 0, color: 'rgba(0,0,0,0.1)' },
  md: { y: 4, blur: 6, spread: -1, color: 'rgba(0,0,0,0.1)' },
  lg: { y: 10, blur: 15, spread: -3, color: 'rgba(0,0,0,0.1)' },
  xl: { y: 20, blur: 25, spread: -5, color: 'rgba(0,0,0,0.1)' },
  '2xl': { y: 25, blur: 50, spread: -12, color: 'rgba(0,0,0,0.25)' },
};

/**
 * 字距档位：Tailwind 给的是 **em 倍数**，AST 的 `letterSpacingMode: 'PERCENT'` 正好是
 * 「值 / 100 = em」，所以直接 ×100 落 PERCENT。
 *
 * 不走 PIXELS 的原因：em→px 需要字号，而字号可能来自 `text-2xl` 这类同批 class，
 * 解析顺序不保证。PERCENT 不需要字号，一步到位，也不会被 `normalizeLineHeight` 误判。
 */
const TRACKING: Record<string, number> = {
  tighter: -5, tight: -2.5, normal: 0, wide: 2.5, wider: 5, widest: 10,
};

/** 行高档位：Tailwind 给的是**倍数**，同样 ×100 落 `lineHeightMode: 'PERCENT'` */
const LEADING: Record<string, number> = {
  none: 100, tight: 125, snug: 137.5, normal: 150, relaxed: 162.5, loose: 200,
};

/**
 * 字体家族类：**静默丢弃**，不进 `unknown`。
 *
 * `fontFamily` 是 AI 契约里**故意不给**的（由风格包锁死，见 `types.ts`），
 * 所以模型写 `font-mono` / `font-sans` 是「写了我们主动不提供的能力」。
 * 为主动不给的东西报违例，等于惩罚模型写对的东西——只会白烧一轮自修，产物完全一样。
 * 与 `normalizeLineHeight` 同原则：转换层负责翻译方言，翻译不了就静默降级，不报错。
 *
 * 实测：20 份 StyleKit 规格里 `font-mono` 出现 19 次、`font-sans` 8 次、`font-serif` 4 次。
 */
/**
 * `font-*` 里**只表示字体族**的那几个 → 受控别名。
 *
 * 与字重共用 `font-` 前缀是 Tailwind 的设计（`font-bold` 是字重，`font-serif` 是族）。
 * 早期版本把这几个静默丢弃，理由是「fontFamily 由风格包锁死」——**那个理由在
 * 注入风格 skill 的场景下是错的**：skill 说「宋体/书法体」，通道不给就只能出黑体，
 * 用户肉眼看到的是「字体死板」（2026-10-29 s2 实测）。
 * 现在映射到受控别名，再由 `specToPage.resolveFontFamily` 展开成跨平台字体栈。
 *
 * `font-system` / `font-display` / `font-body` 仍静默丢弃：它们没有确定的族含义，
 * 落到哪个字体取决于实现，属于「说了等于没说」。
 */
const FONT_FAMILY_ALIAS: Record<string, string> = {
  'font-sans': 'sans',
  'font-serif': 'serif',
  'font-mono': 'mono',
  'font-kai': 'kai',
  'font-round': 'round',
};

/** 没有确定族含义的 `font-*`：静默丢弃，不报违例（报了也改不出结果） */
const FONT_FAMILY_IGNORED = new Set(['font-system', 'font-display', 'font-body']);

/** 大小写变换（中文无效果，只对西文眉标有意义） */
const TEXT_CASE: Record<string, 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS'> = {
  uppercase: 'UPPER',
  lowercase: 'LOWER',
  capitalize: 'TITLE',
  'small-caps': 'SMALL_CAPS',
};

/** 文字装饰线。`no-underline` 单独处理（清空而非设值） */
const TEXT_DECORATION: Record<string, 'UNDERLINE' | 'STRIKETHROUGH'> = {
  underline: 'UNDERLINE',
  'line-through': 'STRIKETHROUGH',
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

/**
 * 单边 margin 的下标（与 padding 同构）。
 *
 * 补这块的原因：`LayoutSchema.margin` 一直存在、`compile.ts` 一直在出码，
 * 但 AI 通道的两个入口（className / `AiLayoutSpec`）都没有它 ——
 * 模型写 `mt-4 mx-4` 就进违例清单，而这是 Tailwind 里最高频的几个类之一。
 * 实测（`docs/ai-ab-report.md` 附录 C）首轮 4 条违例里 3 条都是它。
 */
const MARGIN_SIDES: Record<string, number[]> = {
  m: [0, 1, 2, 3], mx: [1, 3], my: [0, 2], mt: [0], mr: [1], mb: [2], ml: [3],
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
 * 任意值阴影 `shadow-[…]` → 一条 `Effect`。解析失败返回 null（进 unknown）。
 *
 * 支持的形式（Tailwind 里空格用 `_` 表示）：
 * - `shadow-[0_4px_8px_rgba(0,0,0,0.1)]`        3 段长度，spread 缺省 0
 * - `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`    4 段长度 —— neo-brutalist 的硬边阴影
 * - `shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]` 内阴影
 *
 * 两个解析陷阱：
 * ① 颜色必须**先抽走**再分词。`rgba(0 0 0 / 0.1)` 里的空格会把分词切碎，
 *    抽走后剩余部分才是干净的长度序列。颜色本身保留原样（`rgb(0 0 0 / .1)` 是合法 CSS，
 *    去掉内部空格反而会拼成 `rgb(000/.1)`）。
 * ② 负值合法（`-1px` 的 spread 是 Tailwind md 以上的标配），所以不能复用 `sizeOf`
 *    ——它按间距语义把负数当非法。
 */
function shadowArbitrary(spec: string): Effect | null {
  let rest = spec.replace(/_/g, ' ').trim();
  let color = 'rgba(0,0,0,0.2)';

  const fn = /rgba?\([^)]*\)/.exec(rest);
  if (fn) {
    color = fn[0].trim();
    rest = rest.replace(fn[0], ' ');
  } else {
    const hex = /#[0-9a-fA-F]{3,8}/.exec(rest);
    if (hex) {
      color = hex[0];
      rest = rest.replace(hex[0], ' ');
    }
  }

  const parts = rest.trim().split(/\s+/).filter(Boolean);
  const inset = parts[0] === 'inset';
  const lens = inset ? parts.slice(1) : parts;
  if (lens.length < 1 || lens.length > 4) return null;

  const toPx = (t: string): number | null => {
    if (t === '0') return 0;
    const m = /^(-?\d+(?:\.\d+)?)px$/.exec(t);
    return m ? Number(m[1]) : null;
  };
  const nums = lens.map(toPx);
  if (nums.some((n) => n == null)) return null;

  const [x = 0, y = 4, blur = 4, spread = 0] = nums as number[];
  return { kind: inset ? 'INNER_SHADOW' : 'DROP_SHADOW', x, y, blur, spread, color };
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
  const mrg: [number, number, number, number] = [0, 0, 0, 0];
  const mrgSet = [false, false, false, false];
  const border: Partial<BorderSchema> = {};
  let hasBorder = false;
  let flex1 = false;
  /**
   * 阴影的「染色」意图（`shadow-md shadow-[#b5654a]/10` 的后半截）。
   *
   * 单独存一个变量而不是就地改 `style.effects`：class 顺序不保证，
   * 染色可能写在档位之前（`shadow-[#hex]/10 shadow-md`），就地改会被后面的档位覆盖掉。
   */
  let shadowTint: string | null = null;

  for (const raw of input.split(/\s+/)) {
    const cls = raw.trim();
    if (!cls) continue;

    // 变体前缀（md: / hover: / active: / focus: / dark:）不在受控子集内：项目没有断点，
    // 交互态走 `style.states`。**静默丢弃，不报违例。**
    //
    // 2026-11-01 改：原先 push 进 unknown。理由成立（确实不支持），但后果没算清 ——
    // 风格 skill（StyleKit / taste-skill 一类）是写给**通用 Tailwind 工程**的，
    // hover:/active:/md: 的密度极高：实测三份规格里变体前缀占全部不支持 token 的 28/62。
    // 照抄一条就是一条 token 违例，一页十几条，直接触发自修轮（每轮都是钱和时间）。
    // 而丢弃后的静态渲染与「按 hover 之前的样式渲染」逐像素一致，信息损失为零。
    // 与 `font-system` 同类：没有静态等价物的写法，丢弃比报违例便宜。
    //
    // 边界：调色板色（`bg-gray-50`）**不在此列**，仍然要拒 —— 静默丢弃会让产物彻底没颜色。
    if (cls.includes(':')) continue;

    // `ring-*` 同理：本项目没有 ring，描边一律走 `border`。丢弃不改变盒子尺寸。
    if (cls.startsWith('ring-')) continue;

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

    // ---- 外边距（与 padding 同构，累积不覆盖）----
    // 长前缀优先（mx/my/mt...），否则 `mb-4` 会被 `m` 抢先匹配后失败回溯
    m = /^(mx|my|mt|mr|mb|ml|m)-(.+)$/.exec(cls);
    if (m) {
      const px = sizeOf(m[2]);
      // `m*-auto` 走这里：BoxPadding 是纯数值四元组，表达不了 auto。
      // 进 unknown 让自修环看到，错误提示里会给出替代写法（items-center）。
      if (px == null) {
        unknown.push(cls);
        continue;
      }
      for (const i of MARGIN_SIDES[m[1]]) {
        mrg[i] = px;
        mrgSet[i] = true;
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

    // ---- 字重 / 字体家族 ----
    m = /^font-(.+)$/.exec(cls);
    if (m) {
      const w = FONT_WEIGHT[m[1]];
      if (w != null) style.fontWeight = w;
      else if (FONT_FAMILY_ALIAS[cls]) style.fontFamily = FONT_FAMILY_ALIAS[cls];
      else if (!FONT_FAMILY_IGNORED.has(cls)) unknown.push(cls);
      // font-system / font-display / font-body：没有确定族含义，静默丢弃不报违例
      continue;
    }

    // ---- 大小写与装饰线（compile.ts 早已出码，此前只缺方言入口）----
    if (TEXT_CASE[cls]) {
      style.textCase = TEXT_CASE[cls];
      continue;
    }
    if (cls === 'normal-case') {
      // 显式回到原样：删掉可能来自别处的 textCase（成对字段语义，与 leading-none 同策略）
      delete style.textCase;
      continue;
    }
    if (TEXT_DECORATION[cls]) {
      style.textDecoration = TEXT_DECORATION[cls];
      continue;
    }
    if (cls === 'no-underline') {
      delete style.textDecoration;
      continue;
    }

    // ---- 阴影（effects → box-shadow 链，编译层早已完整支持）----
    if (cls === 'shadow') {
      const s = SHADOW[''];
      style.effects = [{ kind: 'DROP_SHADOW', x: 0, y: s.y, blur: s.blur, spread: s.spread, color: shadowTint ?? s.color }];
      continue;
    }
    if (cls === 'shadow-inner') {
      // Tailwind: inset 0 2px 4px 0 rgb(0 0 0 / 0.05)
      style.effects = [{ kind: 'INNER_SHADOW', x: 0, y: 2, blur: 4, spread: 0, color: 'rgba(0,0,0,0.05)' }];
      continue;
    }
    if (cls.startsWith('shadow-')) {
      /**
       * 先剥掉 `/n` 不透明度后缀。
       *
       * Tailwind 里 `shadow-[#b5654a]/10` 是「给阴影上色」，几何仍由档位决定；
       * 而 `^\[(.+)\]$` 匹配不到带 `/10` 的串，于是整条掉进 unknown。
       * 实测 terracotta 那份规格通篇这么写，一条不修就全是违例。
       */
      const suffix = cls.slice('shadow-'.length).replace(/\/\d+(?:\.\d+)?$/, '');
      if (suffix === 'none') {
        style.effects = []; // 显式清空：box-shadow: none
        shadowTint = null;
        continue;
      }
      const arb = /^\[(.+)\]$/.exec(suffix);
      if (arb) {
        const inner = arb[1].trim();
        // 纯颜色（不是完整 shadow 描述）：只改颜色，几何沿用档位
        if (/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))$/.test(inner)) {
          shadowTint = inner;
          if (style.effects?.length) {
            style.effects = style.effects.map((e) => ({ ...e, color: inner }));
          }
          continue;
        }
        const e = shadowArbitrary(inner);
        if (e) style.effects = [e];
        else unknown.push(cls);
        continue;
      }
      const s = SHADOW[suffix];
      if (s) {
        style.effects = [{ kind: 'DROP_SHADOW', x: 0, y: s.y, blur: s.blur, spread: s.spread, color: shadowTint ?? s.color }];
      } else {
        // shadow-red-500 之类的彩色阴影：颜色来自 Tailwind 调色板，项目只认语义令牌 → 不猜
        unknown.push(cls);
      }
      continue;
    }

    // ---- 字距（em 倍数 → letterSpacingMode: PERCENT，值 = em × 100）----
    m = /^tracking-(.+)$/.exec(cls);
    if (m) {
      const t = m[1];
      const arbEm = /^\[(-?\d+(?:\.\d+)?)em\]$/.exec(t);
      if (arbEm) {
        style.letterSpacing = Number(arbEm[1]) * 100;
        style.letterSpacingMode = 'PERCENT';
        continue;
      }
      const arbPx = /^\[(-?\d+(?:\.\d+)?)px\]$/.exec(t);
      if (arbPx) {
        style.letterSpacing = Number(arbPx[1]);
        style.letterSpacingMode = 'PIXELS';
        continue;
      }
      const v = TRACKING[t];
      if (v != null) {
        style.letterSpacing = v;
        style.letterSpacingMode = 'PERCENT';
      } else {
        unknown.push(cls);
      }
      continue;
    }

    // ---- 行高（倍数 → lineHeightMode: PERCENT，值 = 倍数 × 100）----
    m = /^leading-(.+)$/.exec(cls);
    if (m) {
      const t = m[1];
      const arbPx = /^\[(\d+(?:\.\d+)?)px\]$/.exec(t);
      if (arbPx) {
        style.lineHeight = Number(arbPx[1]);
        style.lineHeightMode = 'PIXELS';
        continue;
      }
      const arbNum = /^\[(\d+(?:\.\d+)?)\]$/.exec(t);
      if (arbNum) {
        style.lineHeight = Number(arbNum[1]) * 100;
        style.lineHeightMode = 'PERCENT';
        continue;
      }
      const v = LEADING[t];
      if (v != null) {
        style.lineHeight = v;
        style.lineHeightMode = 'PERCENT';
      } else {
        unknown.push(cls);
      }
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
    // 任意值宽度 `border-[2px]`：不补这条会掉进下面的 `border-(.+)` 分支，
    // 被当成颜色交给 colorOf('[2px]') → null → 违例。模型写 `border-2` 和
    // `border-[2px]` 的概率一样高，两种都得认。
    m = /^border-\[(\d+(?:\.\d+)?)px\]$/.exec(cls);
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
  if (mrgSet.some(Boolean)) layout.margin = mrg;
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

  // 只给了染色、没给档位（`shadow-[#b5654a]/10` 单独出现）：按 md 兜底，别让染色白丢
  if (shadowTint && !style.effects?.length) {
    const s = SHADOW.md;
    style.effects = [{ kind: 'DROP_SHADOW', x: 0, y: s.y, blur: s.blur, spread: s.spread, color: shadowTint }];
  }

  return { layout, style, unknown };
}
