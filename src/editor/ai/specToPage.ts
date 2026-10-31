/**
 * M7 · 契约 → 画布 AST 的**唯一**转换器（W1/W3 共用）
 *
 * 三件事，全部纯函数（无 store、无 DOM，可在 vitest 直接跑）：
 *  1. `resolveColorRef`：把 `@color.primary` 这类风格包令牌引用解析成 hex；
 *  2. `buildNodeFromSpec`：AiNodeSpec → UINode（借道 `createNode` 保证 id/默认值单源）；
 *  3. `draftToPage`：AiPageDraft → UIPage（新页 id 用 `nextId('page')`，与 store 的 createNewPage 同口径）。
 *
 * 违例一律**不抛错**：收集成 `AiViolation[]` 返回，由上层决定喂回自修环还是展示。
 */
import type {
  BorderSchema,
  ContainerNode,
  DecorationSpec,
  FillLayer,
  FillStop,
  GridSchema,
  LayoutSchema,
  StateStyleSchema,
  StatesSchema,
  StyleSchema,
  TransformSchema,
  UINode,
  UIPage,
  VectorNode,
} from '../../schema/types';
import { createNode, createPage, nextId } from '../../schema/factory';
import { isContainer } from '../../schema/types';
import type { StylePack } from '../../tokens/packs/types';
import type { AiBorderSpec, AiFillSpec, AiLayoutSpec, AiNodeSpec, AiPageDraft, AiStatesSpec, AiStyleSpec, AiViolation } from './types';
import { parseClassNames } from './tailwind';
import { resolveIconName } from './iconVocab';

export interface BuildContext {
  pack: StylePack;
  /** 图标库：name → path d（24×24）。未加载时用 icon 会记违例 */
  icons?: Record<string, string>;
}

export interface ColorResolution {
  value?: string;
  /** 未知令牌名（用于违例文案） */
  unknown?: string;
}

const HEX = /^#[0-9a-f]{3,8}$/i;
const COLOR_FN = /^(rgb|rgba|hsl|hsla|oklch)\(/i;

/**
 * 中文可用的字体族白名单（**AI 只能写别名，不能写任意字体名**）。
 *
 * 每一档都同时覆盖 macOS 与 Windows 的对应字体，最后落到通用族兜底。
 * 之所以要「两平台各给一个」：只写 `"Songti SC"` 在 Windows 上必然落空，
 * 而落空时浏览器**不报错、不退样式**，只是静默换成默认黑体——
 * 产物看上去「字体没生效」，字段和违例却全绿。这类假成功必须在转换层挡住。
 *
 * 为什么不内嵌 woff2：宋体/楷体的开源替代（思源宋体、霞鹜文楷）单个中文字重
 * 就有 5~10MB，单文件产物装不下；系统字体是当前唯一现实解。
 */
const AI_FONT_STACKS: Record<string, string> = {
  sans: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Noto Sans SC", system-ui, sans-serif',
  serif: '"Songti SC", "SimSun", "Source Han Serif SC", "Noto Serif SC", Georgia, serif',
  kai: '"Kaiti SC", "KaiTi", "STKaiti", "LXGW WenKai", serif',
  round: '"Yuanti SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  mono: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
};

/** 别名 → 上表的键。中英双写，模型写哪种都命中（中文模型常直接写「宋体」） */
const FONT_ALIASES: Record<string, string> = {
  sans: 'sans',
  'sans-serif': 'sans',
  黑体: 'sans',
  无衬线: 'sans',
  gothic: 'sans',
  serif: 'serif',
  'serif-sc': 'serif',
  宋体: 'serif',
  明朝: 'serif',
  衬线: 'serif',
  song: 'serif',
  kai: 'kai',
  楷体: 'kai',
  楷书: 'kai',
  手写: 'kai',
  handwriting: 'kai',
  round: 'round',
  圆体: 'round',
  圆黑: 'round',
  mono: 'mono',
  monospace: 'mono',
  code: 'mono',
  等宽: 'mono',
};

/**
 * `fontFamily` 解析：风格包 family → 别名表 → 违例。
 *
 * 返回的是**完整 CSS 栈**（不是单个 family 名），因为单个名字一旦在本机缺失
 * 就没有兜底，会直接落到浏览器的默认 serif。
 */
function resolveFontFamily(
  raw: string | undefined,
  pack: StylePack,
  path: string,
  violations: AiViolation[],
): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim();
  if (!key) return undefined;
  const lower = key.toLowerCase();

  // ① 风格包自带的字体（Inter / Space Grotesk 等）：直接用它声明好的栈
  const fromPack = pack.fonts.find(
    (f) => f.family.toLowerCase() === lower || f.stack.toLowerCase() === lower,
  );
  if (fromPack) return fromPack.stack;

  // ② 受控别名
  const alias = FONT_ALIASES[lower] ?? FONT_ALIASES[key];
  if (alias) return AI_FONT_STACKS[alias];

  violations.push({
    path: `${path}.fontFamily`,
    kind: 'schema',
    message: `fontFamily 只接受受控值：风格包字体名（${pack.fonts.map((f) => f.family).join(' / ') || '无'}）或别名 sans/serif/kai/round/mono（也认 黑体/宋体/楷体/圆体/等宽）。收到 ${JSON.stringify(raw)}——任意字体名在没装的机器上会静默退化成默认字体，所以不接受`,
  });
  return undefined;
}

/**
 * `className` 产出的字体别名 → 字体栈。
 *
 * 三条路径都要走：生成（`buildNodeFromSpec`）、页面根（`draftToPage`）、
 * 编辑指令（`classPatch`）。漏掉任何一条，那条路径的产物就会留下裸别名
 * （`font-family: serif`），落到浏览器默认衬线体而不是我们准备好的中文栈。
 */
function resolveClassFontFamily(
  style: Partial<StyleSchema>,
  pack: StylePack,
  path: string,
  violations: AiViolation[],
): void {
  if (!style.fontFamily) return;
  const resolved = resolveFontFamily(style.fontFamily, pack, path, violations);
  if (resolved) style.fontFamily = resolved;
  else delete style.fontFamily;
}

/** `@color.primary` / `@primary` → hex；字面 hex/rgb() 原样返回；其余视为未知令牌 */
export function resolveColorRef(raw: string | undefined, pack: StylePack): ColorResolution {
  if (!raw) return {};
  const value = raw.trim();
  if (!value) return {};
  if (HEX.test(value) || COLOR_FN.test(value)) return { value };
  if (value.startsWith('@')) {
    const key = value.slice(1).replace(/^color\./, '');
    const hit = pack.colors[key];
    return hit ? { value: hit } : { unknown: key };
  }
  // 非 hex 也非令牌：常见于 "white" / "transparent" 等关键字，放行（CSS 合法）
  return { value };
}

const CLASS_WHITELIST_HINT =
  '（只接受受控子集：flex/flex-col、items-*/justify-*、p*/m*/gap-*、w-*/h-*、text-*/font-*、rounded*、bg-*/border-*、opacity-*、overflow-hidden）' +
  '。注意：**不支持 m*-auto**（margin 是纯数值），水平居中用父容器 items-center、垂直居中用 justify-center';

/** 未知 class 一律报出来（不静默丢弃），措辞统一，供自修环直接读 */
function reportUnknownClasses(unknown: string[], path: string, violations: AiViolation[]): void {
  if (!unknown.length) return;
  violations.push({
    path: `${path}.className`,
    kind: 'schema',
    message: `不支持的 class：${unknown.join(' ')}${CLASS_WHITELIST_HINT}`,
  });
}

/**
 * `className` 解析出的颜色走**与显式 style 完全相同的令牌解析路径**。
 * `bg-primary` → `@color.primary` → 风格包 hex；`bg-[#1677FF]` 直接是字面量。
 * 不走这一步就写进 style，编译期会当成非法色值。
 */
function resolveClassColors(
  patch: Partial<StyleSchema>,
  pack: StylePack,
  path: string,
  violations: AiViolation[],
): void {
  for (const key of ['background', 'color'] as const) {
    const raw = patch[key];
    if (typeof raw !== 'string' || !raw) continue;
    const res = resolveColorRef(raw, pack);
    if (res.unknown) {
      violations.push({ path: `${path}.className`, kind: 'token', message: `风格包里没有颜色令牌 "${res.unknown}"` });
      delete patch[key];
    } else if (res.value) {
      patch[key] = res.value;
    }
  }
  const borderObj = patch.border;
  if (borderObj?.color) {
    const res = resolveColorRef(borderObj.color, pack);
    if (res.unknown) {
      violations.push({ path: `${path}.className`, kind: 'token', message: `风格包里没有颜色令牌 "${res.unknown}"` });
      delete (borderObj as { color?: string }).color;
    } else if (res.value) {
      borderObj.color = res.value;
    }
  }
}

function applyColor(
  target: { value?: string },
  field: string,
  raw: string | undefined,
  pack: StylePack,
  violations: AiViolation[],
): void {
  const res = resolveColorRef(raw, pack);
  if (res.unknown) {
    violations.push({
      path: field,
      kind: 'token',
      message: `未知风格令牌 "${raw}"：只能使用 ${pack.name} 包内列出的令牌（形如 @color.primary）`,
    });
    return;
  }
  if (res.value != null) target.value = res.value;
}

/** AiBorderSpec → BorderSchema（基础样式与交互态共用；渐变走 `border.fill`，color 作降级回退） */
function buildBorder(
  spec: AiBorderSpec | undefined,
  pack: StylePack,
  path: string,
  violations: AiViolation[],
): BorderSchema | undefined {
  if (!spec) return undefined;
  const bc: { value?: string } = {};
  applyColor(bc, `${path}.color`, spec.color, pack, violations);
  const border: BorderSchema = {
    width: Math.max(0, spec.width),
    color: bc.value ?? '#000000',
    style: spec.style ?? 'solid',
  };
  if (spec.gradient) {
    const g = spec.gradient;
    const fc: { value?: string } = {};
    const tc: { value?: string } = {};
    applyColor(fc, `${path}.gradient.from`, g.from, pack, violations);
    applyColor(tc, `${path}.gradient.to`, g.to, pack, violations);
    if (fc.value && tc.value) {
      border.fill = {
        type: 'GRADIENT_LINEAR',
        angle: g.angle ?? 90,
        stops: [
          { position: 0, color: fc.value },
          { position: 1, color: tc.value },
        ],
      };
    }
  }
  return border;
}

/**
 * `AiFillSpec[]` → `FillLayer[]`。
 *
 * 颜色走 `applyColor`，与 `background` / `border` / `effects` 完全同一条令牌解析路径
 * ——这是「风格符合度可测」的前提：不能有一条路径绕过令牌表。
 *
 * 三条丢弃规则（都报违例，不静默留空壳）：
 *  1. `SOLID` 没有有效颜色 → 这一层等于什么都没画；
 *  2. 渐变 `stops` 少于 2 个 → 不是渐变；
 *  3. 渐变的颜色全部无效（未知令牌）→ 同上。
 */
function buildFills(
  spec: AiFillSpec[] | undefined,
  pack: StylePack,
  path: string,
  violations: AiViolation[],
): FillLayer[] | undefined {
  if (!spec?.length) return undefined;
  const out: FillLayer[] = [];
  spec.forEach((f, i) => {
    const p = `${path}[${i}]`;
    const layer: FillLayer = { type: f.type };
    if (f.opacity != null) layer.opacity = Math.min(1, Math.max(0, f.opacity));
    if (f.visible === false) layer.visible = false;
    if (f.angle != null) layer.angle = f.angle;

    if (f.type === 'SOLID') {
      const c: { value?: string } = {};
      applyColor(c, `${p}.color`, f.color, pack, violations);
      if (!c.value) {
        if (!f.color) {
          violations.push({ path: `${p}.color`, kind: 'schema', message: 'SOLID 填充必须给 color' });
        }
        return;
      }
      layer.color = c.value;
    } else {
      const stops = f.stops ?? [];
      if (stops.length < 2) {
        violations.push({
          path: `${p}.stops`,
          kind: 'schema',
          message: `渐变填充至少要 2 个 stops（收到 ${stops.length} 个）；只要单色请用 type:"SOLID" 或 background`,
        });
        return;
      }
      const built: FillStop[] = [];
      stops.forEach((s, j) => {
        const c: { value?: string } = {};
        applyColor(c, `${p}.stops[${j}].color`, s.color, pack, violations);
        if (!c.value) return;
        const stop: FillStop = { position: Math.min(1, Math.max(0, s.position)), color: c.value };
        if (s.opacity != null) stop.opacity = Math.min(1, Math.max(0, s.opacity));
        built.push(stop);
      });
      if (built.length < 2) {
        violations.push({ path: `${p}.stops`, kind: 'schema', message: '渐变填充的有效颜色不足 2 个，该层已丢弃' });
        return;
      }
      // 停靠点顺序决定过渡方向，模型写反了不会报错但视觉会错——这里替它排好
      layer.stops = built.sort((a, b) => a.position - b.position);
    }
    out.push(layer);
  });
  return out.length ? out : undefined;
}

/** B2 交互态：四槽位逐字段白名单搬运（不做隐式推断，布局字段类型层就不存在） */
function buildStates(spec: AiStatesSpec | undefined, pack: StylePack, path: string, violations: AiViolation[]): StatesSchema | undefined {
  if (!spec) return undefined;
  const out: StatesSchema = {};
  for (const key of ['hover', 'active', 'focus', 'disabled'] as const) {
    const s = spec[key];
    if (!s) continue;
    const p = `${path}.${key}`;
    const st: StateStyleSchema = {};
    const bg: { value?: string } = {};
    applyColor(bg, `${p}.background`, s.background, pack, violations);
    if (bg.value) st.background = bg.value;
    const stFills = buildFills(s.fills, pack, `${p}.fills`, violations);
    if (stFills) st.fills = stFills;
    const fg: { value?: string } = {};
    applyColor(fg, `${p}.color`, s.color, pack, violations);
    if (fg.value) st.color = fg.value;
    if (s.borderRadius != null) st.borderRadius = Math.max(0, s.borderRadius);
    const bd = buildBorder(s.border, pack, `${p}.border`, violations);
    if (bd) st.border = bd;
    if (s.opacity != null) st.opacity = Math.min(1, Math.max(0, s.opacity));
    if (s.effects?.length) {
      st.effects = s.effects.map((e) => {
        const c: { value?: string } = {};
        applyColor(c, `${p}.effects.color`, e.color, pack, violations);
        return { ...e, color: c.value };
      });
    }
    if (Object.keys(st).length) out[key] = st;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * 行高归一化：AI 写的是 **CSS 倍数**（1.2 / 1.5），而 AST 的 `lineHeight` 缺省语义是
 * `PIXELS`（`lineHeightMode` 缺省值）。不归一化就会把 `1.2` 当成 `1.2px` 输出。
 *
 * 后果非常隐蔽（2026-10-29 点菜小程序实测）：`line-height: 1.2px` 让多行文字**直接叠在一起**，
 * 而 schema 不报错、违例 0 条、字段一个不少——**只有截图能发现**。
 * 这与 `normalizeAbsolute` 规则 3（ABSOLUTE 容器 HUG 塌成 0）是同一类静默失败。
 *
 * 判据用「行高 ≤ 3」而不是「行高 < 字号」。
 *
 * 第一版用的是「行高 < 字号」，理由是「行高小于字号必然裁切，只可能是倍数」——
 * 这个推理在**输入可信**时成立，但输入里混着 `factory.ts` 给的缺省 `lineHeight: 22`：
 *
 * - `text-3xl`（字号 30）只写 className 不给行高 → 22 < 30 成立 → **22 × 30 = 660px**
 * - 显式给 px 行高 18 配字号 30 → 18 < 30 成立 → 18 × 30 = 540px
 *
 * 两种都是灾难级产物，而 schema 不报错、违例 0 条。2026-10-29 用 neo-brutalist
 * 验证页截图时才发现（标题占了一整屏）。
 *
 * CSS 里行高倍数的实际范围是 0.8~2.5，**超过 3 的不可能是倍数**。
 * 所以按数值区间判断比按字号比较稳健：缺省 22、显式 18 都不会被误判。
 *
 * 另一半修复在 `buildNodeFromSpec`：显式与 className 都没给行高时，把 factory 的
 * 缺省值删掉，让 `compile.ts` 按最终字号算 `fontSize × 1.4`。两道一起才完整——
 * 只改判据的话，`text-3xl` 会保留 22px 行高配 30px 字号，挤在一起。
 *
 * ## 为什么**不报违例**（跟 `normalizeAbsolute` 的处理刻意不同）
 *
 * 倍数写法是 CSS 常识，连我们自己写 `styleRecipes` 时都写 `lineHeight: 1.5`
 * ——第一版这里报了违例，结果 9 条「转换零违例」的测试全红，配方语料自己先违规了。
 *
 * 报违例的真实代价：进自修环 → 多一次模型调用 → 多花钱，换来的只是模型把 `1.2`
 * 改写成 `29`，对产物**零收益**（换算结果完全一样）。
 *
 * 这与 `className` 的处理是同一原则：转换层负责**翻译模型熟悉的方言**，
 * 翻译成功就静默完成；只有「翻译不了」才报错。`margin` 写进 `style`、
 * 图标名不存在，那些才是错误。
 *
 * 必须放在 className 与显式 style 合并**之后**调用——字号可能来自 `text-sm` 这类 class，
 * 提前算会拿不到最终字号。
 */
function normalizeLineHeight(style: StyleSchema): void {
  if (style.lineHeight == null) return;
  /**
   * PERCENT 模式直接跳过：`leading-tight` 这类 class 会写 `lineHeight:125, mode:PERCENT`，
   * 125 是百分数不是 px，套下面的倍数判据会把它当成大得离谱的倍数。
   */
  if (style.lineHeightMode === 'PERCENT') return;
  const fontSize = style.fontSize ?? 14;
  if (style.lineHeight > 0 && style.lineHeight <= 3) {
    style.lineHeight = Math.round(style.lineHeight * fontSize);
    style.lineHeightMode = 'PIXELS';
  }
}

/** AiStyleSpec → StyleSchema（逐字段白名单搬运，不做任何隐式推断） */
export function buildStyle(spec: AiStyleSpec | undefined, pack: StylePack, path: string, violations: AiViolation[]): StyleSchema {
  const style: StyleSchema = {};
  if (!spec) return style;

  const bg: { value?: string } = {};
  applyColor(bg, `${path}.background`, spec.background, pack, violations);
  if (bg.value != null) style.background = bg.value;

  const fills = buildFills(spec.fills, pack, `${path}.fills`, violations);
  if (fills) style.fills = fills;

  const fg: { value?: string } = {};
  applyColor(fg, `${path}.color`, spec.color, pack, violations);
  if (fg.value != null) style.color = fg.value;

  if (spec.borderRadius != null) style.borderRadius = Math.max(0, spec.borderRadius);
  const border = buildBorder(spec.border, pack, `${path}.border`, violations);
  if (border) style.border = border;
  const family = resolveFontFamily(spec.fontFamily, pack, path, violations);
  if (family) style.fontFamily = family;
  if (spec.textCase) style.textCase = spec.textCase;
  if (spec.textDecoration) style.textDecoration = spec.textDecoration;
  if (spec.fontSize != null) style.fontSize = spec.fontSize;
  if (spec.fontWeight != null) style.fontWeight = spec.fontWeight;
  if (spec.lineHeight != null) style.lineHeight = spec.lineHeight;
  if (spec.letterSpacing != null) style.letterSpacing = spec.letterSpacing;
  if (spec.textAlign != null) style.textAlign = spec.textAlign;
  if (spec.opacity != null) style.opacity = Math.min(1, Math.max(0, spec.opacity));
  if (spec.effects?.length) {
    style.effects = spec.effects.map((e) => {
      const c: { value?: string } = {};
      applyColor(c, `${path}.effects.color`, e.color, pack, violations);
      return { ...e, color: c.value };
    });
  }
  if (spec.decorations?.length) {
    const out: DecorationSpec[] = [];
    spec.decorations.forEach((d, i) => {
      const p = `${path}.decorations[${i}]`;
      const item: DecorationSpec = { kind: d.kind };
      if (d.intensity != null) item.intensity = Math.min(1, Math.max(0, d.intensity));
      if (d.color) {
        const c: { value?: string } = {};
        applyColor(c, `${p}.color`, d.color, pack, violations);
        if (c.value) item.color = c.value;
      }
      if (d.at) item.at = d.at;
      if (d.stop) item.stop = d.stop;
      if (d.cut != null) item.cut = d.cut;
      if (d.points?.length) {
        item.points = [];
        d.points.forEach((pt, j) => {
          const c: { value?: string } = {};
          applyColor(c, `${p}.points[${j}].color`, pt.color, pack, violations);
          if (c.value) item.points?.push({ x: pt.x, y: pt.y, radius: pt.radius, color: c.value });
        });
      }
      // MESH_GRADIENT 无色斑等于没效果，直接丢弃（不静默留空壳）
      if (d.kind === 'MESH_GRADIENT' && !item.points?.length) return;
      out.push(item);
    });
    if (out.length) style.decorations = out;
  }
  const states = buildStates(spec.states, pack, `${path}.states`, violations);
  if (states) style.states = states;
  if (spec.transform) {
    const t = spec.transform;
    const tf: TransformSchema = {};
    if (t.rotate != null) tf.rotate = t.rotate;
    if (t.scaleX != null) tf.scaleX = t.scaleX;
    if (t.scaleY != null) tf.scaleY = t.scaleY;
    if (t.translateX != null) tf.translateX = t.translateX;
    if (t.translateY != null) tf.translateY = t.translateY;
    if (t.origin) tf.origin = t.origin;
    if (Object.keys(tf).length) style.transform = tf;
  }
  if (spec.grid) {
    const g = spec.grid;
    const grid: GridSchema = {};
    if (g.columns) grid.columns = g.columns;
    if (g.rows) grid.rows = g.rows;
    if (g.columnGap != null) grid.columnGap = Math.max(0, g.columnGap);
    if (g.rowGap != null) grid.rowGap = Math.max(0, g.rowGap);
    if (g.autoFlow) grid.autoFlow = g.autoFlow;
    if (Object.keys(grid).length) style.grid = grid;
  }
  return style;
}

export function buildLayout(spec: AiLayoutSpec | undefined, kind: string): Partial<LayoutSchema> {
  if (!spec) return {};
  const layout: Partial<LayoutSchema> = {};
  if (spec.mode) layout.mode = spec.mode;
  if (spec.widthMode) layout.widthMode = spec.widthMode;
  if (spec.heightMode) layout.heightMode = spec.heightMode;
  if (spec.width != null) layout.width = Math.max(0, spec.width);
  if (spec.height != null) layout.height = Math.max(0, spec.height);
  if (spec.padding) layout.padding = spec.padding;
  if (spec.margin) layout.margin = spec.margin;
  if (spec.gap != null) layout.gap = Math.max(0, spec.gap);
  if (spec.align) layout.align = spec.align;
  if (spec.justify) layout.justify = spec.justify;
  if (spec.x != null) layout.x = spec.x;
  if (spec.y != null) layout.y = spec.y;
  if (spec.position) layout.position = spec.position;
  if (spec.stickyTop != null) layout.stickyTop = spec.stickyTop;
  if (spec.stickyBottom != null) layout.stickyBottom = spec.stickyBottom;
  // 叶子节点默认不参与主轴伸缩（避免模型漏写导致被压扁）
  if ((kind === 'TEXT' || kind === 'OVAL' || kind === 'IMAGE') && !spec.widthMode) {
    layout.widthMode = kind === 'TEXT' ? 'HUG' : 'FIXED';
  }
  return layout;
}

/**
 * `className` → 可直接合并的 layout/style 补丁。
 *
 * 抽出来的唯一原因是**编辑指令也要用同一套方言**：`updateLayout`/`updateStyle` 若只认
 * `{mode:'HORIZONTAL',align:'CENTER',gap:12}`，模型在编辑时的表现就会退化回生成侧修好之前
 * 的样子——它只会写 `flex items-center gap-3`。两条路径共用本函数，方言才是一致的。
 *
 * 未知 class 与未知颜色令牌都进违例（不静默丢弃）；合并顺序由调用方决定（class 先、显式后）。
 */
export function classPatch(
  className: string | undefined,
  ctx: BuildContext,
  path: string,
  violations: AiViolation[],
): { layout: Partial<LayoutSchema>; style: Partial<StyleSchema> } {
  if (!className) return { layout: {}, style: {} };
  const parsed = parseClassNames(className);
  reportUnknownClasses(parsed.unknown, path, violations);
  const style = parsed.style;
  resolveClassColors(style, ctx.pack, path, violations);
  resolveClassFontFamily(style, ctx.pack, path, violations);
  return { layout: parsed.layout, style };
}

/**
 * `className` 补丁 + 显式 `style` 的合并，含成对字段复位与行高归一化。
 *
 * 抽出来的理由是这段逻辑有 4 条互相依赖的规则（见下），散在函数体里读不出顺序。
 * 复位逻辑的核心问题：浅合并会让 `lineHeight`/`lineHeightMode` 这类**成对字段**
 * 出现「值来自 A、mode 来自 B」的错配，产物 `line-height: 0.18`，零违例、只有截图能发现。
 */
function mergeNodeStyle(
  base: StyleSchema | undefined,
  classStyle: Partial<StyleSchema>,
  explicitStyle: StyleSchema,
): StyleSchema {
  const merged: StyleSchema = { ...(base ?? {}), ...classStyle, ...explicitStyle };

  /**
   * 显式给了值却没给 mode → 清掉 mode，回到字段缺省语义（PIXELS）。
   *
   * `{...classStyle, ...explicitStyle}` 是**浅合并**：class 给了 `leading-tight`
   * → `{lineHeight:125, mode:'PERCENT'}`，显式 style 只写 `{lineHeight:18}` 时，
   * 合并结果是 `{lineHeight:18, mode:'PERCENT'}` → 产物 `line-height: 0.18`。
   * **零违例、字段齐全，只有截图能发现**——与 `normalizeAbsolute` 规则 3 同类。
   */
  if (explicitStyle.lineHeight != null && explicitStyle.lineHeightMode == null) {
    delete merged.lineHeightMode;
  }
  if (explicitStyle.letterSpacing != null && explicitStyle.letterSpacingMode == null) {
    delete merged.letterSpacingMode;
  }

  /**
   * 显式与 className **都没给**行高时，删掉 `factory.ts` 的缺省 `22`。
   *
   * 缺省 22 是配 16px 字号的。`text-3xl`（30px）保留 22px 行高会让文字挤在一起，
   * `text-xs`（12px）又偏松。删掉之后 `compile.ts` 的 `?? Math.round(fontSize * 1.4)`
   * 会按**最终字号**算，这才是「缺省」该有的行为。
   *
   * 只删「两边都没给」的情况：显式 `style.lineHeight` 或 class `leading-*` 都要保留。
   */
  if (explicitStyle.lineHeight == null && classStyle.lineHeight == null) {
    delete merged.lineHeight;
    delete merged.lineHeightMode;
  }

  // 必须在合并之后：字号可能来自 className（text-sm → 14），提前算拿不到最终值
  normalizeLineHeight(merged);
  return merged;
}

/** 单个 spec → 节点树 */
export function buildNodeFromSpec(
  spec: AiNodeSpec,
  ctx: BuildContext,
  path = 'root',
  violations: AiViolation[] = [],
): UINode {
  const node = createNode(spec.kind);
  if (spec.name) node.name = spec.name;

  /**
   * `className` 是模型熟悉的表达通道（Tailwind），先解析成 patch，
   * 再由显式 `layout` / `style` 覆盖——「class 给默认，显式字段做精确控制」。
   * 映射器不认识的 class 进违例清单，**不静默丢弃**（静默会让「AI 写的」和「画布上看到的」不一致）。
   */
  const fromClass = parseClassNames(spec.className);
  reportUnknownClasses(fromClass.unknown, path, violations);
  Object.assign(node.layout, fromClass.layout);
  Object.assign(node.layout, buildLayout(spec.layout, spec.kind));

  const classStyle = fromClass.style;
  resolveClassColors(classStyle, ctx.pack, path, violations);
  resolveClassFontFamily(classStyle, ctx.pack, `${path}.className`, violations);
  const explicitStyle = buildStyle(spec.style, ctx.pack, `${path}.style`, violations);
  node.style = mergeNodeStyle(node.style, classStyle, explicitStyle);

  if (node.type === 'TEXT' || node.type === 'BUTTON') {
    node.text = spec.text ?? (node.type === 'BUTTON' ? '按钮' : '文本');
  }
  if (node.type === 'IMAGE') {
    node.src = spec.src ?? '';
  }
  if (node.type === 'VECTOR') {
    const vectorNode = node as VectorNode;
    /**
     * 图标名走归一器（精确 → 别名 → 规范化 → 前缀/包含 → 标签）。
     * 模型写 `home`/`cart`/`notification` 这类「它以为存在」的名字时，
     * 直接映射到 house/shopping-cart/bell；只有真正无关的名字才报违例。
     * 契约校验（contract.ts）用的是同一个函数，两处必须保持一致。
     */
    const hit = spec.icon && ctx.icons ? resolveIconName(spec.icon, ctx.icons) : { name: undefined, candidates: [] };
    const d = spec.vectorD ?? (hit.name ? ctx.icons?.[hit.name] : undefined);
    if (spec.icon && !ctx.icons) {
      violations.push({ path: `${path}.icon`, kind: 'limit', message: `图标库未加载，无法解析 "${spec.icon}"` });
    } else if (spec.icon && !d) {
      violations.push({
        path: `${path}.icon`,
        kind: 'limit',
        message: `图标库中不存在 "${spec.icon}"，相近的有：${hit.candidates.join(' / ') || '（无）'}`,
      });
    }
    vectorNode.vector = { d: d ?? 'M 0 0', width: 24, height: 24 };
    /**
     * 图标 ≠ 形状。VECTOR 的路径按 24×24 坐标系绘制，盒子被拉伸时路径会跟着放大
     * （stroke 2 在 48px 盒子里看起来像 stroke 4，视觉上又粗又糊）。
     *
     * 实测模型会把「圆底 + 图标」塞进**同一个** VECTOR：`w-full h-12 rounded-full bg-muted`
     * + icon，于是图标被撑成 48px 色块。这是建模错误，不是尺寸偏好。
     * 真需要圆底就套一层 FRAME，让图标保持 24。报违例而非静默纠正：改了模型的结构，
     * 就该让它知道，否则下一轮还会这么写。
     */
    if (spec.icon && (node.layout.widthMode === 'FILL' || node.layout.heightMode === 'FILL')) {
      violations.push({
        path: `${path}.layout`,
        kind: 'schema',
        message: 'VECTOR 图标不能用 FILL 尺寸（图标会被拉伸成色块）；用 w-4/w-5/w-6 定尺，需要圆底就套一层 FRAME',
      });
    }
    /**
     * 底色单独判、且只在**尺寸过大**时才判：`bg-*` 对图标是有正当用途的
     * （实心星标/实心心形就靠它填充）。真正的错误信号是「又大又有底色」——
     * 那说明模型把图标当成了形状容器。
     */
    const iconW = node.layout.width ?? 0;
    const iconH = node.layout.height ?? 0;
    const bg = vectorNode.style?.background;
    if (spec.icon && typeof bg === 'string' && bg !== 'transparent' && Math.max(iconW, iconH) > 32) {
      violations.push({
        path: `${path}.style.background`,
        kind: 'schema',
        message: `VECTOR 图标 ${iconW}×${iconH} 过大且带底色，像是把图标当形状用了：图标保持 24，需要圆底请用 FRAME（w-12 h-12 rounded-full bg-muted）包住它`,
      });
    }
    /**
     * 图标默认 24×24 定尺；描边来自 style.color（Lucide 是描边型图标）。
     * 判空必须看 `node.layout`（class 已经合并进来）而不是 `spec.layout`：
     * 契约示例教模型写 `w-4 h-4`，只看显式字段会把它静默改回 24×24。
     */
    if (node.layout.width == null) node.layout.width = 24;
    if (node.layout.height == null) node.layout.height = 24;
    if (!node.layout.widthMode) node.layout.widthMode = 'FIXED';
    if (!node.layout.heightMode) node.layout.heightMode = 'FIXED';
    if (!vectorNode.style?.border) {
      /**
       * 颜色来源**必须读合并后的节点**，不能读 `spec.style`。
       *
       * 模型几乎总是把颜色写在 `className` 里（`w-5 h-5 text-foreground`），
       * `spec.style.color` 是 `undefined` —— 只看它就会一路落到 `#111111` 兜底值。
       * 浅色主题下看不出来，暗色主题下就是**近黑背景上的近黑图标，等于没有图标**
       * （实测 A/B 对比：整页 7 个 svg 全部隐形）。
       *
       * 这与上面尺寸那段是同一个道理：class 已经合并进 `node`，判空要判合并后的结果。
       */
      const rawColor = vectorNode.style?.color ?? spec.style?.color;
      const stroke = resolveColorRef(rawColor, ctx.pack).value ?? '#111111';
      vectorNode.style = { ...(vectorNode.style ?? {}), border: { width: 2, color: stroke, style: 'solid' } };
    }
  }

  /**
   * 只有 FRAME 落子项。RECTANGLE 虽是 ContainerNode，但布局引擎与出码器都跳过它的
   * 子项（`|| node.type === 'RECTANGLE'`），写进去等于静默丢弃——所以这里不写，
   * 并报违例让模型改成 FRAME。
   */
  if (node.type === 'FRAME') {
    const kids = spec.children ?? [];
    (node as ContainerNode).children = kids.map((child, i) => buildNodeFromSpec(child, ctx, `${path}.children[${i}]`, violations));
  } else if (spec.children?.length) {
    violations.push({
      path: `${path}.children`,
      kind: 'schema',
      message:
        node.type === 'RECTANGLE'
          ? 'RECTANGLE 是纯形状，不能有 children（子项会被出码器丢弃）；需要「圆底 + 图标」请用 FRAME（className 带 rounded-full bg-muted）'
          : `${spec.kind} 是叶子节点，不能有 children`,
    });
  }
  return node;
}

export interface DraftBuildResult {
  page: UIPage;
  violations: AiViolation[];
}

/**
 * 绝对定位规范化（**转换层兜底，不靠提示词**）。
 *
 * 为什么必须有这一层：契约把 `mode: ABSOLUTE` 与 VERTICAL/HORIZONTAL 并列，
 * 模型拿不准时会选它（听起来最「精确」）。而布局引擎对 ABSOLUTE 父级的处理是
 * 「所有子项按自身 x/y 放置，缺省 0」（`layout.ts:286`）→ **全部叠在左上角**。
 * 这就是「AI 生成的页面组件几乎全是绝对定位、全部重叠拥挤」的直接技术原因。
 *
 * 关键判断：**这类问题不该靠提示词加约束去治**——那是在限制模型发挥，而且模型每次
 * 都可能再犯。约束应该落在转换层这种确定性代码里：模型随便写，这里保证产物合法。
 *
 * 四条判定，只有**真给了坐标**才放行：
 *  1. 容器声明 ABSOLUTE，但没有任何子项带 x/y → 它没有坐标意图 → 降级 VERTICAL；
 *  2. 节点声明 ABSOLUTE 却无 x/y，且父是流式 → 会被放到父左上角压住兄弟 → 降级为父的 mode；
 *  3. 容器 HUG + 子项全是 ABSOLUTE → 高度塌成 0 → 有 height 就补 FIXED；
 *  4. 流式父 + 子项**给了完整 x/y 却漏写定位** → 补 `position: 'ABSOLUTE'` 脱流（见函数内注释）。
 */
function normalizeAbsolute(root: UINode, violations: AiViolation[]): void {
  const hasXY = (n: UINode): boolean => n.layout.x != null || n.layout.y != null;

  const visit = (node: UINode, parentMode: LayoutSchema['mode'] | null, path: string): void => {
    // 规则 2：自身声明 ABSOLUTE 却无坐标，且父不是 ABSOLUTE（流式父里脱流 → 压住兄弟）
    if (
      node.layout.mode === 'ABSOLUTE' &&
      !hasXY(node) &&
      parentMode != null &&
      parentMode !== 'ABSOLUTE'
    ) {
      node.layout.mode = parentMode === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL';
      violations.push({
        path: `${path}.layout.mode`,
        kind: 'schema',
        message: 'ABSOLUTE 缺少 x/y，已改为跟随父容器排版（否则会压在兄弟节点上）',
        autoFixed: true,
      });
    }

    if (!isContainer(node)) return;
    const kids = node.children;

    /**
     * 规则 4：**流式父 + 子项给了完整坐标却没声明定位 → 补 `position: 'ABSOLUTE'`（脱流）**。
     *
     * 2026-10-31 实测（零食商城「我的」页，用户报「圆点怎么采取了行结构」）：
     * 模型想给订单状态图标挂数字角标，写了
     * `{"name":"角标","layout":{"x":28,"y":-4,"width":18,"height":18}}` —— 坐标完全正确，
     * **只漏了定位声明**。而 `compile.ts` 的判据是「父 ABSOLUTE 或 子项脱流」，两个都不成立
     * → 角标退化成 flex 的第二个子项，与图标横排。
     * 44px 圆底里塞 20 图标 + 8 gap + 18 角标 = 46px → 溢出，角标被顶到圆外。
     * 用户看到的是「圆点变成了一行」，而不是「右上角的数字徽标」。
     *
     * **补的是 `position` 不是 `mode`**（第一版补 mode，被规则 1 立刻降级回去）：
     * 角标不仅要脱流，里面的数字还要居中；`mode: ABSOLUTE` 会把内部排版也变成绝对定位
     * （`compile.ts` 在 ABSOLUTE 下不输出 gap/align/justify）→ 数字落到 0,0。
     * `position: 'ABSOLUTE'` 只脱流、不动内部排版，正好是「脱流 + 居中」的表达。
     *
     * 注意这条规则与规则 2 是**互为镜像**的一对：
     *  - 声明了 ABSOLUTE 却没坐标 → 降级（否则压在兄弟上）；
     *  - 有坐标却没声明定位 → 补上（否则坐标被彻底忽略）。
     * 两个方向的共同点是「坐标是强意图信号」，只有坐标与声明不一致时才动手。
     *
     * 判据为什么是「x/y **都**给了，且不全为 0」：
     *  - 只给一个轴不足以表达「放在某个角」，更像漏填；
     *  - `x:0,y:0` 是模型常用的交差写法（规则 1 的 `sameXY` 就是治它），这种不该升级
     *    ——升级后它不占流，会把兄弟的排布挤乱，而视觉上又和缺省位置一样。
     *
     * 为什么静默不报违例：这是把模型**已经表达清楚的意图**翻译成合法 AST
     * （同 `normalizeLineHeight` 的倍数换算）。报违例只会多烧一轮自修，产物一模一样。
     *
     * 为什么不会误伤 `.fig` 导入：本函数只服务 `AiPageDraft → UIPage` 这一条通道，
     * 导入路径走 `src/fig/*`，那里的 x/y 由几何信息填，不经过这里。
     */
    if (node.layout.mode === 'HORIZONTAL' || node.layout.mode === 'VERTICAL') {
      for (const c of kids) {
        if (c.layout.mode === 'ABSOLUTE' || c.layout.position === 'ABSOLUTE') continue;
        const { x, y } = c.layout;
        if (x == null || y == null || (x === 0 && y === 0)) continue;
        c.layout.position = 'ABSOLUTE';
      }
    }

    /**
     * 规则 1：容器声明 ABSOLUTE，但子项**没有有效坐标意图** → 按流式排。
     *
     * 两种「没有意图」都要判：
     *  - 一个 x/y 都没给（缺省会全落 0）；
     *  - 给了但**所有子项坐标完全一样**（模型常写一堆 `x:0,y:0` 交差），
     *    效果与「没给」等价，同样是全部重叠。
     *
     * 误伤代价可接受：本该叠加的两层会被拆成上下排列——至少看得见，
     * 比全部糊在左上角强。
     */
    const sameXY =
      kids.length >= 2 &&
      new Set(kids.map((c) => `${c.layout.x ?? 0},${c.layout.y ?? 0}`)).size === 1;
    if (node.layout.mode === 'ABSOLUTE' && kids.length > 0 && (!kids.some(hasXY) || sameXY)) {
      /**
       * 「容器自己有 x/y、子项却没有」是**最常见的一种误用**（2026-10-29 实测）：
       * 写的人想表达「这个盒子固定在页面底部、内部横向排」，于是给了 `mode:ABSOLUTE` + `x/y`
       * + `justify:SPACE_BETWEEN`。但 `compile.ts` 在 ABSOLUTE 下**不输出 flex 的
       * gap/align/justify**（ABS 只出 position:absolute），所以内部排版能力其实已经丢了。
       *
       * 2026-10-31 修正：**降级 mode 会连「脱流」这个正确意图一起丢掉**。这个盒子
       * 本该脱流挂在父的某个位置（它有 x/y），只是内部要按流式排。所以现在改成
       * 「mode 降级 + 若自己有坐标则补 `position: 'ABSOLUTE'` 保住脱流」——
       * 两件事分开表达，正是 `LayoutSchema.position` 存在的理由。
       */
      const selfPositioned = hasXY(node);
      node.layout.mode = 'VERTICAL';
      if (selfPositioned && node.layout.position == null) node.layout.position = 'ABSOLUTE';
      violations.push({
        path: `${path}.layout.mode`,
        kind: 'schema',
        message: selfPositioned
          ? 'ABSOLUTE 容器的子项都没有 x/y，且 ABSOLUTE 下不输出 flex 排布，已改为 VERTICAL + position:"ABSOLUTE"（保住 x/y 脱流）；若想「固定在视口某处 + 内部横向排」，请改用 mode:"HORIZONTAL" + position:"FIXED" + stickyBottom'
          : sameXY
            ? 'ABSOLUTE 容器内所有子项坐标完全相同，已改为 VERTICAL（否则子项会全部重叠）'
            : 'ABSOLUTE 容器内没有任何子项带 x/y，已改为 VERTICAL（否则子项会全部重叠在左上角）',
        autoFixed: true,
      });
    }

    /**
     * 规则 3：容器高度 HUG + 子项**全是 ABSOLUTE** → 高度算成 0，整块消失。
     *
     * ABSOLUTE 子项不占流，父容器的自然高度（fit-content）就是 0。模型写
     * `{"mode":"VERTICAL","height":260}` 配一堆 ABSOLUTE 子项时，`height` 会被
     * HUG 覆盖掉——产物 CSS 里 `height: 260px` 那行**还在**，但元素实际高度是 0。
     *
     * 这一条最阴：schema 不报错、违例 0 条、字段齐全，只有截图能发现整块舞台塌了
     * （2026-10-28 实测，见 `docs/ai-ab-report.md` 附录 D.3③）。
     * 所以在这里兜底：有 height 就自动补 `heightMode:"FIXED"` 并报违例说明，
     * 没 height 就报违例让模型补——不静默放行。
     */
    if (
      kids.length > 0 &&
      kids.every((c) => c.layout.mode === 'ABSOLUTE' || c.layout.position === 'ABSOLUTE') &&
      node.layout.heightMode !== 'FIXED'
    ) {
      if (node.layout.height != null) {
        node.layout.heightMode = 'FIXED';
        violations.push({
          path: `${path}.layout`,
          kind: 'schema',
          message: `子项全是 ABSOLUTE（不占流），HUG 高度会算成 0；已改为 heightMode:"FIXED"（height=${node.layout.height}）`,
          autoFixed: true,
        });
      } else {
        violations.push({
          path: `${path}.layout`,
          kind: 'schema',
          message: '子项全是 ABSOLUTE 且容器没给 height，整块会塌成 0 高度；请给 height 并写 heightMode:"FIXED"',
        });
      }
    }

    const mode = node.layout.mode;
    kids.forEach((c, i) => visit(c, mode, `${path}.children[${i}]`));
  };

  visit(root, null, 'root');
}

/**
 * 退化 FILL 规范化（同样是转换层兜底）。
 *
 * **主轴 FILL 需要父容器在那一轴上有确定尺寸**。编译器按 FR-47 把主轴 FILL 出成
 * `flex: 1 1 0; min-*: 0`（标准 flexbox 语义，没错），但父容器若在那一轴是 HUG
 * （`height: fit-content`），子项就被压成 0 高、内容溢出到容器外——
 * 实测场景：编辑时把商家卡片从横排改成竖排，里面那块 `heightMode: FILL` 的文字区
 * 立刻塌成 0，标题和评分全跑到卡片外面。
 *
 * 为什么这里**只记 notes 不记 violations**：子项的 sizing 往往是上一轮继承下来的
 * （模型这次根本没碰它），它看不见也改不动。实测把它当违例会陷入死循环——
 * 修正已经生效、违例却每轮重现，最后整条编辑指令被拒。所以纠正但不卡流程，
 * 用 notes 让面板把「我替你改了这里」如实告诉用户。
 */
function normalizeFill(root: UINode, notes: string[]): void {
  const visit = (node: UINode, path: string): void => {
    if (!isContainer(node)) return;
    const kids = node.children;
    const vertical = node.layout.mode === 'VERTICAL';
    kids.forEach((child, i) => {
      const childPath = `${path}.children[${i}]`;
      if (vertical && child.layout.heightMode === 'FILL' && node.layout.heightMode === 'HUG') {
        child.layout.heightMode = 'HUG';
        notes.push(`${child.name ?? childPath}：父容器高度是 HUG，heightMode FILL 没有可填的高度（会塌成 0），已按 HUG 处理`);
      }
      if (!vertical && child.layout.widthMode === 'FILL' && node.layout.widthMode === 'HUG') {
        child.layout.widthMode = 'HUG';
        notes.push(`${child.name ?? childPath}：父容器宽度是 HUG，widthMode FILL 没有可填的宽度（会塌成 0），已按 HUG 处理`);
      }
      visit(child, childPath);
    });
  };
  visit(root, 'root');
}

/**
 * 等分网格里的 HUG 子项 → FILL。
 *
 * ## 现象
 *
 * 模型写 `grid: {columns:"repeat(2, 1fr)"}` 同时给子项 `widthMode:"HUG"`，产物是
 * `display:grid; grid-template-columns:repeat(2,1fr)` 配 `width:fit-content`。
 * CSS Grid 的 `1fr` 只定义**轨道怎么分**，item 的 `width:fit-content` 会覆盖拉伸，
 * 于是每张卡片按自身内容收缩 —— 内容长短不同就宽度不齐。
 * 用户肉眼看到的就是「这几张卡片宽度不统一，另一边很规整」（2026-10-29 s3 实测）。
 *
 * ## 判据为什么只认 `fr`
 *
 * `auto` / `min-content` / `max-content` 轨道里 HUG 是**对的**（chips 流式排列
 * 本来就该按内容宽）。只有等分轨道与 HUG 语义互斥，所以只改 `fr` 这一种。
 *
 * ## 为什么不交给提示词
 *
 * 「等分网格的子项必须 FILL」是**确定性规则**，转换层一行判断就能兜住；
 * 写进提示词则要靠模型每轮记得，且它不会知道自己在自相矛盾。
 * 与 `normalizeAbsolute` 的三条规则同策略：约束放在转换层。
 */
function normalizeGridItems(root: UINode, violations: AiViolation[]): void {
  const FR = /\d+(?:\.\d+)?fr/;
  /**
   * 只改**有视觉盒子**的节点（背景/填充/描边）。
   *
   * 纯 `TEXT` 在等分网格里 HUG 是无害的：它没有底色，格子宽度由 `1fr` 决定，
   * 文字按内容宽反而正确。而 `buildLayout` 给 TEXT 的**缺省**就是 HUG，
   * 若不加这道过滤，日历的 7 个周几标签会被逐条报违例 —— 那不是模型写错，
   * 是我们自己给的缺省值，报违例会白白消耗自修轮（`tests/ai-style-recipes` 实测炸过）。
   */
  const hasBox = (n: UINode): boolean =>
    n.style?.background != null || (n.style?.fills?.length ?? 0) > 0 || n.style?.border != null;
  const visit = (node: UINode, path: string): void => {
    if (!isContainer(node)) return;
    /**
     * 判据是 `style.grid` 而**不是** `layout.mode` —— 网格不是一种排版模式。
     * `compile.ts:511` 的条件是 `S.grid && L.mode !== 'ABSOLUTE'`：只要 style 上有
     * grid 就出 `display:grid`，mode 仍是 VERTICAL/HORIZONTAL 之一（只影响不生效的
     * flex 声明）。按 mode 判会永远不命中。
     */
    const cols = node.layout.mode === 'ABSOLUTE' ? undefined : node.style?.grid?.columns;
    if (cols && FR.test(cols)) {
      /**
       * 网格**容器自己**是 HUG 时也要降成 FILL（2026-10-29 补）。
       *
       * `1fr` 只定义「剩余空间怎么分」，而 HUG 是「按内容收缩」——收缩上下文里
       * `1fr` 按 max-content 解析，整块会比可用宽度还宽，直接把父容器撑出视口。
       * 实测：零食商城「分类」页的右侧商品网格（`HUG`，父级横排）渲染成 428px，
       * 而视口只有 375px，右边一列商品卡被裁掉一半；像素比对查不出来（基准图
       * 也是同一份 CSS，同样溢出），只有截图能发现。
       *
       * 判据同样只认 `fr` 轨道：`auto` 轨道下 HUG 是对的（标签流、色卡行）。
       */
      if (node.layout.widthMode === 'HUG' && node !== root) {
        node.layout.widthMode = 'FILL';
        violations.push({
          path: `${path}.layout.widthMode`,
          kind: 'schema',
          message: `等分网格（columns="${cols}"）的容器自己写了 widthMode:"HUG"：1fr 在收缩上下文里按内容解析，整块会撑出父容器（横向溢出、右侧被裁）。已改为 FILL`,
          autoFixed: true,
        });
      }
      node.children.forEach((child, i) => {
        if (hasBox(child) && child.layout.widthMode === 'HUG') {
          child.layout.widthMode = 'FILL';
          violations.push({
            path: `${path}.children[${i}].layout.widthMode`,
            kind: 'schema',
            message: `父容器是等分网格（columns="${cols}"），子项有底色却写 widthMode:"HUG" 会按内容收缩、导致同排卡片宽度不齐；已改为 FILL。若某项确实要按内容宽，请把它移到 auto 轨道或给它固定 width`,
            autoFixed: true,
          });
        }
      });
    }
    node.children.forEach((c, i) => visit(c, `${path}.children[${i}]`));
  };
  visit(root, 'root');
}

/* ============================ repeat 展开（结构级方言） ============================ */
/**
 * `repeat` 是**模型的输入压缩格式**，不是 AST 的数据结构。
 *
 * 展开发生在这里（转换层），展开后就是 N 个普通节点 —— 编译、画布、`.fig` 往返、
 * 比对口径全部零改动。与 `className` 完全同策略：借模型的表达习惯，产物里不留痕。
 *
 * 为什么不进 AST：那需要「模板 / 实例」两层概念（Figma component-instance 那套），
 * 编辑器、`.fig` 读写、比对口径都要跟着改，是另一个量级的改动。
 * 先验证「压缩输出预算能不能换来更多内容」，再决定要不要投那一笔。
 */
export const MAX_REPEAT_COUNT = 60;
/** 展开后的总节点上限：防模型写 count:60 套 count:60（3600 个节点直接撑爆画布） */
export const MAX_EXPANDED_NODES = 800;

/**
 * 占位符：`{{index}}` / `{{index0}}` 是位置变量，其余任意键名走 `values`。
 *
 * 早期只认 `{{value}}` 三选一，导致「一张卡里两个格子各自取值」结构性不可表达：
 * 8 张商品卡只能共用一个商品名。命名式 `{{name}}` / `{{price}}` 才够用。
 * 键名放宽到标识符（字母开头，允许数字/下划线/连字符），写错键名不报错、降级成序号。
 */
const PLACEHOLDER = /\{\{([A-Za-z_][\w-]*)\}\}/g;

/** `values` 的两种形态：位置式数组 / 命名式映射（见 `AiRepeatSpec.values`） */
type RepeatValues = string[] | Record<string, string[]> | undefined;

/** 取第 i 项（长度不足循环）；取不到返回 undefined 交给调用方降级 */
function pickAt(list: string[] | undefined, i: number): string | undefined {
  if (!list?.length) return undefined;
  return list[i % list.length];
}

/** 深拷贝并把字符串里的占位符换掉（只递归 string / array / plain object） */
function substituteDeep<T>(value: T, i: number, values: RepeatValues): T {
  if (typeof value === 'string') {
    if (!value.includes('{{')) return value;
    const named = values && !Array.isArray(values) ? values : undefined;
    const flat = Array.isArray(values) ? values : undefined;
    return value.replace(PLACEHOLDER, (_m, key: string) => {
      if (key === 'index') return String(i + 1);
      if (key === 'index0') return String(i);
      /**
       * `{{value}}` / `{{键名}}` 但这一层没给对应 values：**降级成序号**，不报违例。
       *
       * 早期版本这里报违例，实测代价太大——模型在深层嵌套（日期格 → 格内标签）时
       * 容易把 values 写到错的层上，一条违例就让整页生成失败，自修两轮也未必改对。
       * 而降级后的结果（第 N 格显示 N）本身是合理的：用户看到的是数字日历，
       * 不是空白，也不是报错。
       *
       * 命名式同理：模型把 `{{price}}` 写成 `{{Price}}` 只该丢一格，不该整页失败。
       */
      const hit = key === 'value' ? pickAt(flat, i) : pickAt(named?.[key], i);
      return hit ?? String(i + 1);
    }) as unknown as T;
  }
  if (Array.isArray(value)) return value.map((v) => substituteDeep(v, i, values)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = substituteDeep(v, i, values);
    return out as unknown as T;
  }
  return value;
}

interface ExpandCounter {
  n: number;
  overflowed: boolean;
}

function expandNode(
  spec: AiNodeSpec,
  path: string,
  violations: AiViolation[],
  counter: ExpandCounter,
): AiNodeSpec[] {
  const { repeat, ...rest } = spec;

  if (!repeat) {
    counter.n += 1;
    if (counter.n > MAX_EXPANDED_NODES) {
      // 只报一次，否则 800 个节点会刷出 800 条一样的违例把提示词淹掉
      if (!counter.overflowed) {
        counter.overflowed = true;
        violations.push({
          path,
          kind: 'schema',
          message: `展开后节点数超过上限 ${MAX_EXPANDED_NODES}：repeat 叠得太重，请减少 count 或拆成多页`,
        });
      }
      return [];
    }
    if (rest.children?.length) {
      rest.children = rest.children.flatMap((c, i) => expandNode(c, `${path}.children[${i}]`, violations, counter));
    }
    return [rest];
  }

  if (!Number.isInteger(repeat.count) || repeat.count < 1) {
    violations.push({
      path: `${path}.repeat.count`,
      kind: 'schema',
      message: `repeat.count 必须是 ≥1 的整数（收到 ${String(repeat.count)}）`,
    });
    return [];
  }
  if (repeat.count > MAX_REPEAT_COUNT) {
    violations.push({
      path: `${path}.repeat.count`,
      kind: 'schema',
      message: `repeat.count 最大 ${MAX_REPEAT_COUNT}（收到 ${repeat.count}），要更多请拆成多个 repeat 容器`,
    });
    return [];
  }

  const out: AiNodeSpec[] = [];
  for (let i = 0; i < repeat.count; i += 1) {
    /**
     * 展开出的每一份**都要计数**。
     * 早期版本只在「无 repeat」分支计数，于是 `count:60` 套 `count:60` 的
     * 3600 个节点一个都不算——上限形同虚设。这条由单测锁住。
     */
    counter.n += 1;
    if (counter.n > MAX_EXPANDED_NODES) {
      if (!counter.overflowed) {
        counter.overflowed = true;
        violations.push({
          path,
          kind: 'schema',
          message: `展开后节点数超过上限 ${MAX_EXPANDED_NODES}：repeat 叠得太重，请减少 count 或拆成多页`,
        });
      }
      return out;
    }

    /**
     * 顺序很关键：**先展开子节点，再替换本层占位符**。
     *
     * 反过来的话，父层的 `substituteDeep` 会把子节点里的 `{{index}}` 一起吃掉，
     * 子 repeat 就永远拿到父层的序号（日历里「每格里面的小标签」会全部变成同一个数字）。
     * 先展开子节点后，子层占位符已被它自己的 repeat 处理掉，
     * 剩下的才是真正属于本层的。
     */
    const clone: AiNodeSpec = { ...rest };
    if (rest.children?.length) {
      clone.children = rest.children.flatMap((c, j) =>
        expandNode(c, `${path}[${i}].children[${j}]`, violations, counter),
      );
    } else {
      delete clone.children;
    }

    const finalNode = substituteDeep(clone, i, repeat.values);

    /**
     * 逐项样式覆盖 —— 必须在 `substituteDeep` **之后**。
     *
     * `values` 只能替换字符串里的占位符，样式字段拿不到逐项值（模板是共享的），
     * 所以「24 条色条各一色」靠 `values` 表达不出来。`styles[i]` 按同一个 index
     * 对齐，直接盖到这一份克隆上。
     *
     * 这里**必须新建对象**：`clone` 是 `{...rest}` 浅拷贝，`clone.style` 与
     * `rest.style` 共享同一个引用；就地改字段会让 24 份克隆全部变成最后一个颜色。
     */
    const perItem = repeat.styles?.[i];
    if (perItem) {
      finalNode.style = { ...(finalNode.style ?? {}), ...perItem };
    }

    // 同名节点在编辑器里无法区分（图层面板会显示 42 个「日期格」），补序号。
    // name 自身带占位符时以占位符结果为准，不再追加序号。
    if (!rest.name?.includes('{{')) {
      finalNode.name = rest.name ? `${rest.name} ${i + 1}` : `${finalNode.kind} ${i + 1}`;
    }
    out.push(finalNode);
  }
  return out;
}

/** 展开一组节点的 repeat（导出供测试与编辑管线复用） */
export function expandRepeats(list: AiNodeSpec[], path: string, violations: AiViolation[]): AiNodeSpec[] {
  const counter: ExpandCounter = { n: 0, overflowed: false };
  return list.flatMap((c, i) => expandNode(c, `${path}[${i}]`, violations, counter));
}

/** 产物规范化总入口：生成与编辑都必须在落地前跑一遍，否则两条路径的兜底不一致 */
export function normalizePage(root: UINode, violations: AiViolation[], notes: string[] = []): void {
  normalizeAbsolute(root, violations);
  // 必须早于 normalizeGridItems：网格里子项 HUG 该降 FILL（轨道定义宽度），
  // 若先把 HUG+size 转成 FIXED，网格那条规则就没机会生效了。
  normalizeHugSize(root);
  normalizeFill(root, notes);
  // 必须在 normalizeFill 之后：那条规则会把「父 HUG 的子项 FILL」降回 HUG，
  // 而等分网格的子项必须是 FILL，否则同排宽度不齐。后跑的规则优先。
  normalizeGridItems(root, violations);
}

/**
 * `HUG` + **两轴都给了显式尺寸** → `FIXED`（转换层兜底，静默）。
 *
 * ## 为什么
 *
 * `widthMode: 'HUG'` 的语义是「宽度由内容决定」，此时 `width` 字段**会被完全忽略**
 * （`compile.ts` 出 `fit-content`）。但模型经常两个都写，它以为 HUG 是「自动适应」的
 * 修饰词、数值是「我要的大小」：
 *
 * ```json
 * {"name":"角标","layout":{"widthMode":"HUG","heightMode":"HUG","width":18,"height":18}}
 * ```
 *
 * 2026-10-31 实测（零食商城「我的」页角标）：`border-radius: 9999px` 的设计意图是
 * 18×18 的圆点，HUG 让宽度退成内容宽 7px、高度退成行高 12px → 渲染出来是一条
 * **竖长条**贴在图标右上角。位置已经修对了（规则 4），但形状还是错的。
 *
 * ## 为什么判据是「两轴都给」而不是「给哪个轴改哪个轴」
 *
 * 第一版按轴分别处理（给了 width 就改 widthMode），实测**引入了新缺陷**：
 * 分类页「品类栏」写 `widthMode:HUG, width:92`，转 FIXED 后比内容宽 16px，
 * 把右侧 FILL 的商品网格挤窄 → 商品描述换行后被卡片高度截断。
 * 只给一个轴时，那个数值更像是「设计稿参考值」而不是硬约束（品类项 `height:40`
 * 也是同样情况：转了会让左侧列表从 150px 撑到 240px）。
 *
 * 两轴都给的节点（零食商城 537 个里只有 4 个，全是角标）才是「明确要一个固定尺寸的
 * 盒子」——角标、头像、图标底、色块。这类节点给数值就是要那个尺寸。
 *
 * ## 为什么静默
 *
 * 这是把模型已经表达清楚的意图翻译成合法 AST，不是纠错。报违例只会多烧一轮自修
 * （模型把 `HUG` 删掉，产物一模一样），与 `normalizeLineHeight` 同一取舍。
 */
function normalizeHugSize(root: UINode): void {
  const visit = (node: UINode): void => {
    const L = node.layout;
    if (L.widthMode === 'HUG' && L.width != null && L.heightMode === 'HUG' && L.height != null) {
      L.widthMode = 'FIXED';
      L.heightMode = 'FIXED';
    }
    if (isContainer(node)) node.children.forEach(visit);
  };
  visit(root);
}

/** AiPageDraft → 全新 UIPage（页面 id/root id 唯一，避免与既有页冲突） */
export function draftToPage(draft: AiPageDraft, ctx: BuildContext): DraftBuildResult {
  const violations: AiViolation[] = [];
  const width = draft.width ?? 375;
  const height = draft.height ?? 812;
  const page = createPage(draft.name || 'AI 生成页', width, height);
  // 与 store.createNewPage 同口径：页 id 与 root id 必须唯一
  const pageId = nextId('page');
  page.id = pageId;
  page.root.id = pageId;
  page.root.name = draft.name || 'AI 生成页';

  // 页面底色
  const bg: { value?: string } = {};
  applyColor(bg, 'background', draft.background, ctx.pack, violations);
  if (bg.value) page.root.style = { ...(page.root.style ?? {}), background: bg.value };

  // root 单独处理（不走 buildNodeFromSpec），className 与显式 style 两条通道都要补齐
  const rootClass = parseClassNames(draft.root.className);
  reportUnknownClasses(rootClass.unknown, 'root', violations);
  Object.assign(page.root.layout, rootClass.layout);
  const rootClassStyle = rootClass.style;
  resolveClassColors(rootClassStyle, ctx.pack, 'root', violations);
  resolveClassFontFamily(rootClassStyle, ctx.pack, 'root.className', violations);
  page.root.style = { ...(page.root.style ?? {}), ...rootClassStyle };

  // root 视为页面内容根：layout 落到 PAGE 根，children 成为 PAGE 的直接子项
  const rootLayout = buildLayout(draft.root.layout, 'FRAME');
  Object.assign(page.root.layout, rootLayout);
  page.root.layout.width = width;
  page.root.layout.height = height;
  page.root.layout.widthMode = 'FIXED';
  page.root.layout.heightMode = 'FIXED';

  const rootStyle = buildStyle(draft.root.style, ctx.pack, 'root.style', violations);
  page.root.style = { ...(page.root.style ?? {}), ...rootStyle };
  // 与 buildNodeFromSpec 同一条规则：显式值覆盖 class 值时，成对的 mode 也要一起复位
  if (rootStyle.lineHeight != null && rootStyle.lineHeightMode == null) {
    delete page.root.style.lineHeightMode;
  }
  if (rootStyle.letterSpacing != null && rootStyle.letterSpacingMode == null) {
    delete page.root.style.letterSpacingMode;
  }
  normalizeLineHeight(page.root.style);

  // repeat 必须在 buildNodeFromSpec 之前展开：展开后就是普通节点，后续链路零改动
  const expandedChildren = expandRepeats(draft.root.children ?? [], 'root.children', violations);
  page.root.children = expandedChildren.map((child, i) =>
    buildNodeFromSpec(child, ctx, `root.children[${i}]`, violations),
  );
  // 兜底规范化：必须在 children 建好之后（判定依赖子项是否带 x/y）
  normalizePage(page.root, violations);
  return { page, violations };
}

/** 统计节点数（面板显示 / 评测用） */
export function countNodes(node: UINode): number {
  let n = 1;
  if ('children' in node) for (const c of node.children) n += countNodes(c);
  return n;
}
