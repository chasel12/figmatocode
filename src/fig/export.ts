/**
 * FR-77 `.fig` 导出（视觉层）—— AST 页面 → Figma 文件。
 *
 * 写出内容：
 *   DOCUMENT → CANVAS（每页一个）→ 节点树，含 size / transform / fillPaints / strokePaints /
 *   effects / cornerRadius / auto layout（stackMode·spacing·padding）/ 文本字段 / 图片 blob。
 *
 * 明确不写（与计划 §7「明确不做」一致）：组件与实例语义、Variables、Prototype、矢量命令几何。
 *
 * 坐标系：AST 的 `layout.x/y` 是父内相对坐标，Figma 要**页面绝对坐标**，导出时逐层累加；
 * 自动布局容器按 padding + gap + 子项尺寸自行推算子项绝对位置（Figma 打开后会按同一规则重排）。
 */
import { zipSync, strToU8 } from 'fflate';
import type { ComponentDef, ContainerNode, FillLayer, FlowDef, StyleToken, UINode, UIPage } from '../schema/types';
import { angleToTransform, cssColorToFigColor, fillToPaint, styleToEffects, styleToPaints, type FigEffect, type FigMatrix, type FigPaint } from './paint';
import { EXTRAS_VERSION, type ExtraNode, type ExtraProject } from './extras';

export type { ExtraNode };

/** 导出用的节点变更（字段与 `.fig` 的 NodeChange 对齐，只写我们表达的） */
export interface OutNodeChange {
  guid: { sessionID: number; localID: number };
  phase: 'CREATED';
  parentIndex?: { guid: { sessionID: number; localID: number }; position: string };
  type: string;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  blendMode?: string;
  size: { x: number; y: number };
  transform: FigMatrix;
  cornerRadius?: number;
  rectangleTopLeftCornerRadius?: number;
  rectangleTopRightCornerRadius?: number;
  rectangleBottomLeftCornerRadius?: number;
  rectangleBottomRightCornerRadius?: number;
  fillPaints?: FigPaint[];
  strokePaints?: FigPaint[];
  strokeWeight?: number;
  borderStrokeWeightsIndependent?: boolean;
  borderTopWeight?: number;
  borderRightWeight?: number;
  borderBottomWeight?: number;
  borderLeftWeight?: number;
  strokeAlign?: string;
  strokeJoin?: string;
  strokeCap?: string;
  dashPattern?: number[];
  effects?: FigEffect[];
  clipsContent?: boolean;
  stackMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  stackSpacing?: number;
  stackCounterSpacing?: number;
  stackVerticalPadding?: number;
  stackHorizontalPadding?: number;
  stackPaddingRight?: number;
  stackPaddingBottom?: number;
  stackPrimarySizing?: string;
  stackCounterSizing?: string;
  stackPrimaryAlignItems?: string;
  stackCounterAlignItems?: string;
  stackChildAlignSelf?: string;
  stackChildPrimaryGrow?: number;
  horizontalConstraint?: string;
  verticalConstraint?: string;
  stackWrap?: string;
  textCase?: string;
  textDecoration?: string;
  textTruncation?: string;
  maxLines?: number | null;
  paragraphSpacing?: number;
  paragraphIndent?: number;
  minSize?: { value: { x: number; y: number } };
  maxSize?: { value: { x: number; y: number } };
  fontSize?: number;
  fontName?: { family: string; style: string; postscript: string };
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  textAutoResize?: string;
  lineHeight?: { value: number; units: string };
  letterSpacing?: { value: number; units: string };
  textData?: { characters: string };
  count?: number;
  starInnerScale?: number;
}

export interface FigExportOptions {
  /** 文件名（写进 meta.json，Figma 打开后作为文件名） */
  fileName?: string;
  /** 写入时间（ISO），默认取当前时间；测试里固定以保证字节确定性 */
  exportedAt?: string;
  /** 是否写缩略图（无则省略；Figma 会自动生成） */
  thumbnail?: Uint8Array;
  /**
   * 项目级资产（写进 `meta.json` 的 `ui_compiler_extras.project`）。
   *
   * 这三个原本**完全不进 `.fig`**——`exportFig` 只接 `pages`，于是存盘再打开，
   * 组件表、命名样式、原型流程全部消失。现在走旁挂层保住自家往返；
   * Figma 侧看不到它们（格式边界），但不影响页面视觉。
   */
  components?: Record<string, ComponentDef>;
  tokens?: StyleToken[];
  flows?: FlowDef[];
}

/** AST 类型 → Figma 节点类型 */
const FIG_TYPE: Record<string, string> = {
  PAGE: 'FRAME',
  FRAME: 'FRAME',
  SECTION: 'SECTION',
  RECTANGLE: 'ROUNDED_RECTANGLE',
  TEXT: 'TEXT',
  BUTTON: 'FRAME',
  IMAGE: 'RECTANGLE',
  OVAL: 'ELLIPSE',
  LINE: 'LINE',
  POLYGON: 'REGULAR_POLYGON',
  STAR: 'STAR',
  SLICE: 'SLICE',
  VECTOR: 'VECTOR',
};

/** 字重 → Figma 字体 style 名（导入侧映射的逆） */
const STYLE_NAME: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
};

/**
 * Figma fractional index 的字母表（base62：数字 → 大写 → 小写）。
 * 顺序与码点顺序一致，所以兄弟排序可以直接用 `<`/`>` 比较。
 */
const IDX_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * 生成第 index 个兄弟的 fractional index（**定长 3 位**，码点序 = 视觉序）。
 *
 * 定长是硬要求：变长编码在进位处会排错（'10' < 'B' 但 62 应该排在 11 之后）。
 * 3 位 base62 覆盖 238328 个兄弟，远超任何真实页面；超出则退化为 4 位（已不可能出现）。
 *
 * 注意**不能用 localeCompare 比较**：ICU 的标点权重与码点顺序不一致
 * （实测 `'$'.localeCompare('%') === 1`），会把兄弟顺序排乱。
 */
export function positionOf(index: number): string {
  const base = IDX_ALPHABET.length;
  const width = index < base ** 3 ? 3 : index < base ** 4 ? 4 : 5;
  let n = index;
  let out = '';
  for (let i = 0; i < width; i += 1) {
    out = IDX_ALPHABET[n % base] + out;
    n = Math.floor(n / base);
  }
  return out;
}

/**
 * AST 尺寸模式 → Figma `StackSize` 枚举。
 * 注意 Figma 的 StackSize 只有 FIXED / RESIZE_TO_FIT / RESIZE_TO_FIT_WITH_IMPLICIT_SIZE 三档，
 * **没有 FILL**（填充由父容器 stretch 与 flexGrow 决定），写 FILL 会被 schema 直接拒。
 */
function sizingOf(mode: string | undefined, value: number | null | undefined): string {
  if (mode === 'HUG') return 'RESIZE_TO_FIT';
  // FIXED 但没给数值 = 「宽度自动」，AST 里这是合法状态（编译器当作不出 width 声明）。
  // Figma 用 RESIZE_TO_FIT_WITH_IMPLICIT_SIZE 表达同一件事，不能写 FIXED —— 否则读回来会凭空多一个 width。
  if (value == null) return 'RESIZE_TO_FIT_WITH_IMPLICIT_SIZE';
  return 'FIXED';
}

/**
 * BUTTON 的文案子节点名。
 *
 * Figma 没有 BUTTON 原语，导出时把 AST 的 BUTTON 拆成「FRAME + 一个 TEXT 子节点」，
 * 导入时凭这个约定名把两者合回 BUTTON（见 `import.ts` 的 `BUTTON_LABEL`）。
 * 约定成立条件：FRAME 只有这一个 TEXT 子节点 —— 普通 Frame 撞上的概率极低，
 * 且即便撞上也只是「单行文字容器」被识别成按钮，视觉不变。
 */
export const BUTTON_LABEL = 'Label';

/**
 * AST 没写 `fontFamily` 时导出用的字体族。
 *
 * Figma 的 `fontName.family` 是必填字段，不能留空；但 AST 的「不写 = 用默认字体栈」与
 * 「显式写 Inter」在编译期结果不同（前者出 `FONT_STACK`，后者出 `Inter`）。
 * 所以导入侧把这个哨兵值还原成 undefined（见 `import.ts`），代价是真实文件里显式指定
 * Inter 会退化成默认栈 —— 已记入计划 §10.4 已知有损项。
 */
export const DEFAULT_FONT_FAMILY = 'Inter';

/**
 * 空图片占位符的 hash（40 个 0，与 sha1 同长度）。
 *
 * AST 的 IMAGE 可以没有 src（设计期的占位框），但 Figma 没有「空图片节点」——
 * 不写图片填充就退化成矩形，往返后 `object-fit`/`border-radius:0` 这些 IMAGE 专属 CSS 会消失。
 * 所以导出时塞一张 1×1 透明 PNG，并把这个固定 hash 当作「空图」的哨兵，导入侧据此还原成无 src 的 IMAGE。
 */
export const PLACEHOLDER_IMAGE_HASH = '0'.repeat(40);

/** 1×1 透明 PNG（占位图片填充用） */
const PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function placeholderPng(): Uint8Array {
  const binary = atob(PLACEHOLDER_PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** AST 主轴对齐 → Figma `StackJustify`（MIN/CENTER/MAX/SPACE_EVENLY/SPACE_BETWEEN） */
const JUSTIFY_OUT: Record<string, string> = {
  START: 'MIN',
  CENTER: 'CENTER',
  END: 'MAX',
  SPACE_BETWEEN: 'SPACE_BETWEEN',
};

/**
 * AST 交叉轴对齐 → Figma `StackAlign`（MIN/CENTER/MAX/BASELINE）。
 *
 * 注意 Figma 的**交叉轴拉伸不在父容器上表达**：`stackCounterAlignItems` 是 StackAlign，
 * 没有 STRETCH；拉伸是子项上的 `stackChildAlignSelf: 'STRETCH'`（类型 StackCounterAlign）。
 * 所以 STRETCH 在这里降级为 MIN，再由子项自己带 `stackChildAlignSelf` 表达。
 */
const COUNTER_OUT: Record<string, string> = {
  START: 'MIN',
  CENTER: 'CENTER',
  END: 'MAX',
  STRETCH: 'MIN',
  BASELINE: 'BASELINE',
};

/**
 * AST Constraints → Figma `NodeChange.horizontalConstraint / verticalConstraint`。
 *
 * **这一档是无损的**，与 grid→flex、交互态、PROGRESSIVE_BLUR 那些降级不同：
 * Figma 的枚举和 AST 的五档一一对应，所以不需要进 `KNOWN_LOSS`。
 *   MIN→LEFT / MAX→RIGHT / CENTER / SCALE / STRETCH→LEFT_RIGHT
 *
 * 曾经整个 `.fig` 往返都不写这两个字段，约束在另存再打开之后**静默消失** ——
 * 而 `fig-check` 的 normalize 也没比约束，所以门禁一直是绿的。
 */
const H_CONSTRAINT_OUT: Record<string, string> = {
  LEFT: 'MIN',
  RIGHT: 'MAX',
  CENTER: 'CENTER',
  SCALE: 'SCALE',
  LEFT_RIGHT: 'STRETCH',
};
const V_CONSTRAINT_OUT: Record<string, string> = {
  TOP: 'MIN',
  BOTTOM: 'MAX',
  CENTER: 'CENTER',
  SCALE: 'SCALE',
  TOP_BOTTOM: 'STRETCH',
};

/** 图片 dataURL → 字节（导出时写进 images/ 与 blobs） */
function dataUrlToBytes(src: string): { bytes: Uint8Array; ext: string } | null {
  if (!src.startsWith('data:')) return null;
  const comma = src.indexOf(',');
  if (comma < 0) return null;
  const meta = src.slice(5, comma);
  const payload = src.slice(comma + 1);
  const mime = (meta.split(';')[0] || 'image/png').toLowerCase();
  let bytes: Uint8Array;
  if (/;base64/i.test(meta)) {
    const binary = atob(payload);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  } else {
    // 非 base64 的 data URL（常见于内联 SVG：`data:image/svg+xml,%3Csvg…`）是百分号编码的文本
    try {
      bytes = new TextEncoder().encode(decodeURIComponent(payload));
    } catch {
      return null;
    }
  }
  const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/svg+xml' ? 'svg' : mime === 'image/gif' ? 'gif' : mime === 'image/webp' ? 'webp' : 'png';
  return { bytes, ext };
}

/** 稳定的图片 key（FNV-1a 展开成 40 位十六进制，与 Figma 的 sha1 同长度但不保证相同） */
function imageKey(bytes: Uint8Array): string {
  let h = 0x811c9dc5;
  const parts: string[] = [];
  for (let round = 0; round < 5; round += 1) {
    for (let i = round; i < bytes.length; i += 5) {
      h ^= bytes[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    parts.push(h.toString(16).padStart(8, '0'));
    h = (h ^ (round + 1)) >>> 0;
  }
  return parts.join('');
}

/**
 * 十六进制串 → 字节。
 *
 * `Image.hash` 在 schema 里是 `byte[]`（不是字符串），写字符串会被 kiwi 直接拒；
 * Figma 里它是 20 字节的 sha1，所以这里把 40 位 hex 展开成 20 字节。
 */
function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

interface BuildContext {
  nodeChanges: OutNodeChange[];
  blobs: Uint8Array[];
  images: Record<string, Uint8Array>;
  sessionID: number;
  nextLocalID: number;
  /** 解析后的绝对尺寸（Figma 无 FILL，必须换成具体数值） */
  sizes: Map<string, { w: number; h: number }>;
  /**
   * Figma 原生表达不了的 AST 字段，按 guid 旁挂到 `meta.json`。
   * 结构与版本约定见 `src/fig/extras.ts`。
   */
  extras: Record<string, ExtraNode>;
}

function allocGuid(ctx: BuildContext): { sessionID: number; localID: number } {
  ctx.nextLocalID += 1;
  return { sessionID: ctx.sessionID, localID: ctx.nextLocalID };
}

/**
 * 解析出每个节点的**绝对尺寸**。
 *
 * Figma 的 StackSize 没有 FILL，导出时必须把 `widthMode/heightMode = FILL` 换算成具体数值，
 * 否则写出去的 frame 尺寸是 0，在 Figma 里直接塌陷。规则：
 *   FIXED → 取 layout 值；FILL → 取父内容盒；HUG → 由子项反推（Figma 会用 RESIZE_TO_FIT 重算）。
 * 这套数值只服务「Figma 里看得对」，不参与往返比对（比对口径见 scripts/fig-check.ts）。
 */
function measureTree(root: ContainerNode, avail: { w: number; h: number }): Map<string, { w: number; h: number }> {
  const out = new Map<string, { w: number; h: number }>();
  const visit = (node: UINode, availW: number, availH: number): { w: number; h: number } => {
    const L = node.layout;
    const pad = L.padding ?? [0, 0, 0, 0];
    let w = L.widthMode === 'FILL' ? availW : (L.width ?? null);
    let h = L.heightMode === 'FILL' ? availH : (L.height ?? null);
    const kids = 'children' in node ? node.children : [];
    const gap = L.gap ?? 0;
    const contentW = Math.max(0, (w ?? availW) - pad[1] - pad[3]);
    const contentH = Math.max(0, (h ?? availH) - pad[0] - pad[2]);
    const measured = kids.map((c) => visit(c, contentW, contentH));
    if (w == null) {
      if (L.mode === 'ABSOLUTE') w = Math.max(0, ...kids.map((c) => (c.layout.x ?? 0) + (measured[kids.indexOf(c)]?.w ?? 0)));
      else if (L.mode === 'HORIZONTAL') w = pad[1] + pad[3] + measured.reduce((a, s, i) => a + s.w + (i > 0 ? gap : 0), 0);
      else w = pad[1] + pad[3] + Math.max(0, ...measured.map((s) => s.w));
      if (kids.length === 0 && node.type === 'TEXT') {
        // 叶子文本没有子项可推，按字号粗估一个宽度（Figma 侧会按 textAutoResize 重算）
        const size = node.style?.fontSize ?? 16;
        const text = (node as { text?: string }).text ?? '';
        w = Math.min(availW, Math.ceil(size * 0.62 * Math.max(1, text.length)));
      }
    }
    if (h == null) {
      if (L.mode === 'ABSOLUTE') h = Math.max(0, ...kids.map((c) => (c.layout.y ?? 0) + (measured[kids.indexOf(c)]?.h ?? 0)));
      else if (L.mode === 'VERTICAL') h = pad[0] + pad[2] + measured.reduce((a, s, i) => a + s.h + (i > 0 ? gap : 0), 0);
      else h = pad[0] + pad[2] + Math.max(0, ...measured.map((s) => s.h));
      if (kids.length === 0 && node.type === 'TEXT') {
        const size = node.style?.fontSize ?? 16;
        h = Math.ceil((node.style?.lineHeight ?? size * 1.4) || size * 1.4);
      }
    }
    const box = { w, h };
    out.set(node.id, box);
    return box;
  };
  for (const c of root.children) visit(c, avail.w, avail.h);
  return out;
}

/** 自动布局下按 padding + gap 推算子项绝对位置（Figma 打开后会按同样规则重排） */
function layoutChildren(node: ContainerNode, origin: { x: number; y: number }, sizes: Map<string, { w: number; h: number }>): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  const { mode, padding = [0, 0, 0, 0], gap = 0 } = node.layout;
  if (mode === 'ABSOLUTE') {
    for (const c of node.children) {
      out.set(c.id, { x: origin.x + (c.layout.x ?? 0), y: origin.y + (c.layout.y ?? 0) });
    }
    return out;
  }
  let cursor = mode === 'VERTICAL' ? origin.y + padding[0] : origin.x + padding[3];
  for (const c of node.children) {
    /**
     * 自绝对定位子项（`c.layout.mode === 'ABSOLUTE'`）**不参与流**：
     * 编译侧把它当 `position: absolute`（见 `compile.ts:468` 的 `parentIsAbsoluteContainer`），
     * 位置就是父容器 padding 边 + x/y，且**不推进 cursor**。
     *
     * 这里曾经无差别按流排布，于是「VERTICAL 页里被拖到自由位置的子项」在 `.fig` 里
     * 落到流位置上，读回来 x/y 又被清空 —— 画布、导出、出码三处全对不上。
     */
    if (c.layout.mode === 'ABSOLUTE') {
      out.set(c.id, { x: origin.x + (c.layout.x ?? 0), y: origin.y + (c.layout.y ?? 0) });
      continue;
    }
    const w = sizes.get(c.id)?.w ?? c.layout.width ?? 0;
    const h = sizes.get(c.id)?.h ?? c.layout.height ?? 0;
    if (mode === 'VERTICAL') {
      out.set(c.id, { x: origin.x + padding[3], y: cursor });
      cursor += h + gap;
    } else {
      out.set(c.id, { x: cursor, y: origin.y + padding[0] });
      cursor += w + gap;
    }
  }
  return out;
}

function fillPaintsOf(node: UINode, ctx: BuildContext): FigPaint[] {
  // TEXT 的「填充」在 Figma 里就是文字颜色，必须写，否则读回来全变默认色
  if (node.type === 'TEXT') {
    return [{ type: 'SOLID', color: cssColorToFigColor(node.style?.color, '#111111'), opacity: 1, visible: true, blendMode: 'NORMAL' }];
  }
  // 图片：底色（若有）在下、图片填充在上；没有 src 的 IMAGE 是占位框，写 1×1 透明图 + 哨兵 hash
  const base = styleToPaints(node.style);
  if (node.type === 'IMAGE') {
    const parsed = node.src ? dataUrlToBytes(node.src) : null;
    const bytes = parsed?.bytes ?? placeholderPng();
    const key = parsed ? imageKey(bytes) : PLACEHOLDER_IMAGE_HASH;
    ctx.images[key] = bytes;
    ctx.blobs.push(bytes);
    return [
      ...base,
      {
        type: 'IMAGE',
        opacity: 1,
        visible: true,
        blendMode: 'NORMAL',
        scaleMode: 'FILL',
        image: { hash: hexToBytes(key), dataBlob: ctx.blobs.length - 1, name: parsed ? `image.${parsed.ext}` : 'placeholder.png' },
      },
    ];
  }
  return base;
}

function textFieldsOf(node: UINode): Partial<OutNodeChange> {
  const style = node.style ?? {};
  const out: Partial<OutNodeChange> = {};
  const text = node.type === 'TEXT' || node.type === 'BUTTON' ? node.text : undefined;
  if (text !== undefined) {
    out.textData = { characters: text };
    out.textAutoResize = style.textWrap === false ? 'WIDTH_AND_HEIGHT' : 'HEIGHT';
  }
  out.fontSize = style.fontSize ?? 16;
  out.fontName = { family: style.fontFamily ?? DEFAULT_FONT_FAMILY, style: STYLE_NAME[style.fontWeight ?? 400] ?? 'Regular', postscript: '' };
  out.textAlignHorizontal =
    style.textAlign === 'center' ? 'CENTER' : style.textAlign === 'right' ? 'RIGHT' : style.textAlign === 'justify' ? 'JUSTIFIED' : 'LEFT';
  out.textAlignVertical = style.textAlignVertical === 'CENTER' ? 'CENTER' : style.textAlignVertical === 'BOTTOM' ? 'BOTTOM' : 'TOP';
  if (typeof style.lineHeight === 'number') {
    out.lineHeight = { value: style.lineHeight, units: style.lineHeightMode === 'PERCENT' ? 'PERCENT' : 'PIXELS' };
  }
  if (typeof style.letterSpacing === 'number') {
    out.letterSpacing = { value: style.letterSpacing, units: style.letterSpacingMode === 'PERCENT' ? 'PERCENT' : 'PIXELS' };
  }
  /**
   * 大小写与装饰线：`import.ts` 早就在读 `textCase` / `textDecoration`（UPPER/LOWER/TITLE、
   * UNDERLINE/STRIKETHROUGH），但导出侧一直没写 —— 又是「只有一半」的死代码。
   */
  if (style.textCase && style.textCase !== 'ORIGINAL') out.textCase = style.textCase;
  if (style.textDecoration && style.textDecoration !== 'NONE') out.textDecoration = style.textDecoration;
  /**
   * 截断：`textTruncation` / `maxLines` 是 Figma 原生字段（面板里就是「截断」+「最大行」），
   * 但导出侧从来没写过 —— 第三例「schema 有、编译器读、往返丢」。
   * 只有 ENDING 才写；DISABLED 与缺省等价，不落盘以免读回来凭空多一个字段。
   */
  // 段落间距 / 首行缩进：Figma 原生字段，走原生（旁挂层里那两份是旧数据的兜底）
  if (typeof style.paragraphSpacing === 'number') out.paragraphSpacing = style.paragraphSpacing;
  if (typeof style.paragraphIndent === 'number') out.paragraphIndent = style.paragraphIndent;
  if (style.textTruncation === 'ENDING') {
    out.textTruncation = 'ENDING';
    if (typeof style.maxLines === 'number' && style.maxLines > 0) out.maxLines = style.maxLines;
  }
  return out;
}

function buildNode(
  node: UINode,
  abs: { x: number; y: number },
  parent: { guid: { sessionID: number; localID: number }; mode?: 'HORIZONTAL' | 'VERTICAL' | 'ABSOLUTE' } | null,
  position: string,
  ctx: BuildContext,
  inheritStretch: boolean,
): void {
  const guid = allocGuid(ctx);
  const type = FIG_TYPE[node.type] ?? 'FRAME';
  const isContainer = 'children' in node;
  const style = node.style ?? {};
  const box = ctx.sizes.get(node.id) ?? { w: node.layout.width ?? 0, h: node.layout.height ?? 0 };
  const change: OutNodeChange = {
    guid,
    phase: 'CREATED',
    type,
    name: node.name ?? node.type,
    size: { x: box.w, y: box.h },
    transform: { m00: 1, m01: 0, m02: abs.x, m10: 0, m11: 1, m12: abs.y },
  };
  if (parent) {
    change.parentIndex = { guid: parent.guid, position };
    const parentMode = parent.mode ?? 'ABSOLUTE';
    // FILL 在 Figma 里没有原语，只能借子项字段表达（导入侧按同一约定还原）：
    //   交叉轴/宽度 → stackChildAlignSelf = STRETCH，主轴/高度 → stackChildPrimaryGrow = 1。
    // ABSOLUTE 容器没有 stack 语义，但它下面的 FILL 仍要表达（否则尺寸被写死），
    // 只是不掺「父容器 align=STRETCH」那一层含义（绝对布局下 align 本身无意义）。
    if (parentMode === 'ABSOLUTE') {
      change.stackChildAlignSelf = node.layout.widthMode === 'FILL' ? 'STRETCH' : 'AUTO';
      if (node.layout.heightMode === 'FILL') change.stackChildPrimaryGrow = 1;
    } else {
      const crossFill = parentMode === 'HORIZONTAL' ? node.layout.heightMode === 'FILL' : node.layout.widthMode === 'FILL';
      change.stackChildAlignSelf = inheritStretch || crossFill ? 'STRETCH' : 'AUTO';
      const primaryFill = parentMode === 'HORIZONTAL' ? node.layout.widthMode === 'FILL' : node.layout.heightMode === 'FILL';
      if (primaryFill) change.stackChildPrimaryGrow = 1;
    }
  }
  if (node.visible === false) change.visible = false;
  if (node.locked) change.locked = true;
  /**
   * Constraints：只在 AST 显式设了才写。
   * 缺省（LEFT/TOP ≡ Figma 的 MIN/MIN）不写，导入侧也把 MIN/MIN 还原成「无约束字段」——
   * 两边都遵守「缺省不落盘」，往返才能逐字段相等。
   */
  if (node.layout.constraints) {
    change.horizontalConstraint = H_CONSTRAINT_OUT[node.layout.constraints.horizontal] ?? 'MIN';
    change.verticalConstraint = V_CONSTRAINT_OUT[node.layout.constraints.vertical] ?? 'MIN';
  }

  /**
   * 原生可表达的布局字段：直接写 NodeChange，Figma 里也看得见。
   * `import.ts` 早就有读取代码（`stackWrap` / `minSize` / `maxSize`），
   * 但导出侧一直没写 —— 那半边等于死代码，往返时这些字段全丢。
   */
  if (node.layout.wrap === 'WRAP') change.stackWrap = 'WRAP';
  const minW = node.layout.minWidth;
  const minH = node.layout.minHeight;
  const maxW = node.layout.maxWidth;
  const maxH = node.layout.maxHeight;
  if (minW !== undefined || minH !== undefined) change.minSize = { value: { x: minW ?? 0, y: minH ?? 0 } };
  if (maxW !== undefined || maxH !== undefined) change.maxSize = { value: { x: maxW ?? 0, y: maxH ?? 0 } };

  /**
   * 原生表达不了的：旁挂 meta.json。
   * `flexGrow` 特别说明 —— 不能写进 `stackChildPrimaryGrow`，因为导入侧把
   * `stackChildPrimaryGrow > 0` 当作「主轴 FILL」的标记，写了会污染 `widthMode`。
   */
  const extra: ExtraNode = {};
  /**
   * 布局模式能否走原生，取决于**两件事同时成立**：
   * ① AST 侧它是个容器（`stackMode` 才有意义）；② Figma 侧的类型是 frame 类。
   *
   * 只看 `'children' in node` 会漏掉 RECTANGLE —— 它在本 schema 里是容器（可以装 mask 子项），
   * 但导出成 `ROUNDED_RECTANGLE`，而 **kiwi 只对 FRAME/SECTION 保留 `stackMode` / `clipsContent`**，
   * 写了也被编码器丢掉（实测探针读回来是 undefined）。这类节点补一份旁挂。
   *
   * BUTTON 是反向的例子：Figma 类型是 FRAME，但 AST 侧是叶子 —— 它的模式也没法原生表达。
   */
  const nativeFrame = type === 'FRAME' || type === 'SECTION';
  const modeIsNative = isContainer && nativeFrame;
  if (!modeIsNative) extra.mode = node.layout.mode;
  if (node.layout.position) extra.position = node.layout.position;
  if (node.layout.stickyTop !== undefined) extra.stickyTop = node.layout.stickyTop;
  if (node.layout.stickyBottom !== undefined) extra.stickyBottom = node.layout.stickyBottom;
  if (node.layout.margin) extra.margin = node.layout.margin;
  if (node.layout.flexGrow !== undefined) extra.flexGrow = node.layout.flexGrow;
  if (node.layout.flexShrink !== undefined) extra.flexShrink = node.layout.flexShrink;
  if (node.layout.prevMode) extra.prevMode = node.layout.prevMode;
  /**
   * `clipContent` 一律旁挂一份 —— 原生 `clipsContent` 实测**在 FRAME 上也会被编码器丢掉**
   * （探针读回来是 undefined），所以不能只靠原生。原生那份照写，留给 Figma 看。
   */
  if (node.layout.clipContent) extra.clipContent = true;
  /**
   * 样式侧同样有一批「Figma 没有对应原语」的字段。注意 `rotation` / `cornerSmoothing` /
   * `imageScaleMode` 在 Figma 里其实是**有**的（transform 矩阵 / cornerSmoothing 字段 /
   * paint.imageScaleMode），只是本导出器还没写那半边 —— 现阶段先保证我们自己的往返无损，
   * 原生映射列在 docs/HANDOFF.md §12.3.2 的待办里。
   */
  const st = node.style ?? {};
  /**
   * 底色 + 多层 `fills` 同时存在时，底色没法从 paint 列表里区分出来（`fillsToStyle` 只能靠
   * 「首层是不是纯色」猜，猜错就把渐变下面的底色丢了）。`null` 显式表示「确实没有底色」。
   */
  if (st.fills && st.fills.length > 0) extra.background = st.background ?? null;
  if (st.rotation !== undefined) extra.rotation = st.rotation;
  if (st.cornerSmoothing !== undefined) extra.cornerSmoothing = st.cornerSmoothing;
  if (st.boxShadow !== undefined) extra.boxShadow = st.boxShadow;
  if (st.imageScaleMode !== undefined) extra.imageScaleMode = st.imageScaleMode;
  if (st.arcData !== undefined) extra.arcData = st.arcData;
  if (st.paragraphIndent !== undefined) extra.paragraphIndent = st.paragraphIndent;
  if (st.openType !== undefined) extra.openType = st.openType;
  if (st.decorations) extra.decorations = st.decorations;
  if (st.states) extra.states = st.states;
  if (st.transform) extra.transform = st.transform;
  if (st.grid) extra.grid = st.grid;
  if (st.layoutGrids) extra.layoutGrids = st.layoutGrids;
  if (st.effects && st.effects.length > 0) extra.effects = st.effects;
  /**
   * FR-25 组件实例：Figma 有 SYMBOL/INSTANCE，但本导出器没实现那套语义，
   * 原生侧一律当普通帧写；组件关系走旁挂，保证**自家往返**不丢。
   */
  if (node.componentId) extra.componentId = node.componentId;
  if (node.instanceOverrides?.length) extra.instanceOverrides = node.instanceOverrides;
  if (Object.keys(extra).length > 0) ctx.extras[`${guid.sessionID}:${guid.localID}`] = extra;
  if (typeof style.opacity === 'number') change.opacity = style.opacity;
  /**
   * 混合模式：Figma 的节点级 `blendMode` 与 CSS `mix-blend-mode` 是同一套 16 个名字
   * （NORMAL/MULTIPLY/SCREEN/OVERLAY…），可以直通，不必走旁挂层。
   * NORMAL 是缺省，不写以免读回来多一个必然差异。
   */
  if (style.blendMode && style.blendMode !== 'NORMAL') change.blendMode = style.blendMode;

  const radius = style.borderRadius;
  if (typeof radius === 'number') change.cornerRadius = radius;
  else if (Array.isArray(radius)) {
    change.rectangleTopLeftCornerRadius = radius[0];
    change.rectangleTopRightCornerRadius = radius[1];
    change.rectangleBottomRightCornerRadius = radius[2];
    change.rectangleBottomLeftCornerRadius = radius[3];
  }

  const fills = fillPaintsOf(node, ctx);
  if (fills.length > 0) change.fillPaints = fills;

  if (style.border && style.border.width > 0) {
    // B1 渐变描边：Figma 的 strokePaints 原生支持渐变，直接写渐变 paint（往返精确）
    change.strokePaints =
      style.border.fill && style.border.fill.type !== 'SOLID'
        ? [fillToPaint(style.border.fill, style.border.color)]
        : [{ type: 'SOLID', color: cssColorToFigColor(style.border.color, '#000000'), opacity: 1, visible: true, blendMode: 'NORMAL' }];
    change.strokeWeight = style.border.width;
    /**
     * FR-18 四边独立权重：Figma 有原生表达（`borderStrokeWeightsIndependent` +
     * 四边 weight），走原生而不是旁挂 —— 这样在 Figma 里也看得见。
     */
    if (style.border.fill && style.border.color) extra.borderColor = style.border.color;
    if (style.border.style && style.border.style !== 'solid') extra.borderStyle = style.border.style;
    if (style.border.miterLimit !== undefined) extra.borderMiterLimit = style.border.miterLimit;
    if (style.border.opacity !== undefined) extra.borderOpacity = style.border.opacity;
    if (style.border.widths) {
      const [t, r, b, l] = style.border.widths;
      change.borderStrokeWeightsIndependent = true;
      change.borderTopWeight = t;
      change.borderRightWeight = r;
      change.borderBottomWeight = b;
      change.borderLeftWeight = l;
    }
    // AST 的缺省对齐是 INSIDE（见 BorderSchema 注释），Figma 的缺省是 CENTER —— 必须按 AST 语义写
    change.strokeAlign = style.border.align ?? 'INSIDE';
    change.strokeJoin = style.border.join ?? 'MITER';
    if (style.border.cap) change.strokeCap = style.border.cap;
    // 虚线在 Figma 里靠 dashPattern 表达（没有 border-style），不写就丢成实线
    if (style.border.style === 'dashed' || style.border.style === 'dotted') {
      change.dashPattern = style.border.dash ?? (style.border.style === 'dotted' ? [1, 2] : [4, 4]);
    }
  }
  const effects = styleToEffects(style);
  if (effects.length > 0) change.effects = effects;

  if (node.type === 'POLYGON' || node.type === 'STAR') {
    change.count = style.pointCount ?? (node.type === 'STAR' ? 5 : 3);
    if (node.type === 'STAR') change.starInnerScale = style.innerRadius ?? 0.38;
  }

  if (isContainer) {
    const { mode, wrap } = node.layout;
    change.stackMode = mode === 'HORIZONTAL' ? 'HORIZONTAL' : mode === 'VERTICAL' ? 'VERTICAL' : 'NONE';
    if (mode !== 'ABSOLUTE') {
      if (wrap === 'WRAP' && change.stackCounterAlignItems === 'MIN') change.stackCounterAlignItems = 'AUTO';
    }
    if (node.layout.clipContent) change.clipsContent = true;
  }

  // 尺寸模式**所有节点都写**：叶子（TEXT/BUTTON/IMAGE）的 HUG 在编译期产出 `fit-content`，
  // 丢了 CSS 就变（见 compiler/compile.ts 的 widthMode 分支），所以不能只在容器上写。
  // 轴向：主轴 = 排列方向；非自动布局节点没有主轴，统一按横向（primary=宽）。
  const vertical = isContainer && node.layout.mode === 'VERTICAL';
  change.stackPrimarySizing = sizingOf(
    vertical ? node.layout.heightMode : node.layout.widthMode,
    vertical ? node.layout.height : node.layout.width,
  );
  change.stackCounterSizing = sizingOf(
    vertical ? node.layout.widthMode : node.layout.heightMode,
    vertical ? node.layout.width : node.layout.height,
  );

  // padding 同理：叶子的内边距直接进 CSS（按钮的 10/20 就靠它），必须写
  const pad = node.layout.padding ?? [0, 0, 0, 0];
  change.stackVerticalPadding = pad[0];
  change.stackHorizontalPadding = pad[3];
  change.stackPaddingRight = pad[1];
  change.stackPaddingBottom = pad[2];

  // 对齐同样对所有节点写：BUTTON 是叶子，它的 align/justify 决定文字居中
  change.stackPrimaryAlignItems = JUSTIFY_OUT[node.layout.justify ?? 'START'] ?? 'MIN';
  change.stackCounterAlignItems = COUNTER_OUT[node.layout.align ?? 'START'] ?? 'MIN';
  change.stackSpacing = node.layout.gap ?? 0;
  if (node.layout.gapCross !== undefined) change.stackCounterSpacing = node.layout.gapCross;

  if (!isContainer && node.type === 'TEXT') {
    Object.assign(change, textFieldsOf(node));
  }

  ctx.nodeChanges.push(change);

  // BUTTON 无对应 Figma 原语：本体当 FRAME（带底色/描边/圆角），文案挂一个 TEXT 子节点，
  // 否则按钮文字在 `.fig` 里直接消失（视觉层最大的坑）
  if (node.type === 'BUTTON') {
    const pad = node.layout.padding ?? [0, 0, 0, 0];
    const contentW = Math.max(0, (node.layout.width ?? 0) - pad[1] - pad[3]);
    const contentH = Math.max(0, (node.layout.height ?? 0) - pad[0] - pad[2]);
    const label: OutNodeChange = {
      guid: allocGuid(ctx),
      phase: 'CREATED',
      type: 'TEXT',
      name: BUTTON_LABEL,
      parentIndex: { guid, position: positionOf(0) },
      size: { x: contentW, y: contentH },
      transform: { m00: 1, m01: 0, m02: abs.x + pad[3], m10: 0, m11: 1, m12: abs.y + pad[0] },
      ...textFieldsOf(node),
      fillPaints: [{ type: 'SOLID', color: cssColorToFigColor(style.color, '#ffffff'), opacity: 1, visible: true, blendMode: 'NORMAL' }],
    };
    // 按钮的垂直居中来自 flex align，不是 style.textAlignVertical，这里翻译过去
    if (node.layout.align === 'CENTER' && label.textAlignVertical === 'TOP') label.textAlignVertical = 'CENTER';
    ctx.nodeChanges.push(label);
  }

  if (isContainer) {
    const childAbs = layoutChildren(node, abs, ctx.sizes);
    const stretch = node.layout.align === 'STRETCH';
    node.children.forEach((child, i) => {
      const pos = childAbs.get(child.id) ?? { x: abs.x, y: abs.y };
      buildNode(child, pos, { guid, mode: node.layout.mode }, positionOf(i), ctx, stretch);
    });
  }
}

export interface FigExportResult {
  bytes: Uint8Array;
  stats: { pages: number; nodes: number; images: number };
}

/**
 * 主入口：AST 页面 → `.fig` 字节。
 *
 * @param encode 注入编码器（`@open-pencil/kiwi` 的 codec + container），
 *               与导入同理，避免把 kiwi 运行时打进主包首屏
 */
export async function exportFig(
  pages: UIPage[],
  encode: (nodeChanges: OutNodeChange[], blobs: Uint8Array[]) => Promise<Uint8Array>,
  options: FigExportOptions = {},
): Promise<FigExportResult> {
  if (pages.length === 0) throw new Error('没有可导出的页面');
  const ctx: BuildContext = { nodeChanges: [], blobs: [], images: {}, sessionID: 1, nextLocalID: 0, sizes: new Map(), extras: {} };

  // DOCUMENT 固定 1:1，各页 CANVAS 顺延
  const documentGuid = { sessionID: ctx.sessionID, localID: 0 };
  ctx.nodeChanges.push({
    guid: documentGuid,
    phase: 'CREATED',
    type: 'DOCUMENT',
    name: 'Document',
    size: { x: 0, y: 0 },
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
  });

  pages.forEach((page, pageIndex) => {
    const canvasGuid = allocGuid(ctx);
    ctx.nodeChanges.push({
      guid: canvasGuid,
      phase: 'CREATED',
      type: 'CANVAS',
      name: page.name,
      parentIndex: { guid: documentGuid, position: positionOf(pageIndex) },
      size: { x: 0, y: 0 },
      transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    });
    // 先解析整页尺寸（FILL 要换成具体数值），再按同一套数值算绝对坐标
    const measured = measureTree(page.root, { w: page.viewport.width, h: page.viewport.height });
    for (const [id, box] of measured) ctx.sizes.set(id, box);
    page.root.children.forEach((child, i) => {
      buildNode(child, { x: child.layout.x ?? 0, y: child.layout.y ?? 0 }, { guid: canvasGuid, mode: page.root.layout.mode }, positionOf(i), ctx, false);
    });
    // 记录页面尺寸（Figma 忽略 CANVAS 尺寸，这里是我们自己的往返载体）
    const canvasChange = ctx.nodeChanges.find((c) => c.guid.localID === canvasGuid.localID && c.type === 'CANVAS');
    if (canvasChange) {
      /**
       * 写**页面视口**而不是子项包围盒。
       *
       * 包围盒会丢掉「画框比内容高」这件事：`18-样片-参数矩阵` 的视口是 375×1600，
       * 内容只到 812，写包围盒就等于把画框高度改成 812 —— 百分比定位的子项随之全部位移
       * （`left: 39.47%` 变成 `0%`）。Figma 不读 CANVAS 尺寸，所以这里可以放心写真值。
       */
      canvasChange.size = { x: page.viewport.width, y: page.viewport.height };
      /**
       * 页面根布局模式：**Figma 的 CANVAS 没有布局概念**，所以这一项无处安放。
       * 不写就会在导入侧回落到工厂默认 VERTICAL —— 于是「绝对定位页」（根 ABSOLUTE）
       * 另存为 `.fig` 再打开会变成 flex 列，子项从 `top/left` 变成 `flex: 0 0 auto`。
       *
       * 沿用本文件已有的做法（`size` 也是「仅供测试断言，Figma 忽略」）：写在 CANVAS 上。
       * 这里用 `stackMode` 是因为它的取值域恰好就是 VERTICAL/HORIZONTAL/NONE，
       * 而 ABSOLUTE ≡ NONE，语义一一对应。Figma 打开时忽略，我们自己的往返无损。
       */
      canvasChange.stackMode =
        page.root.layout.mode === 'HORIZONTAL' ? 'HORIZONTAL' : page.root.layout.mode === 'VERTICAL' ? 'VERTICAL' : 'NONE';
    }
  });

  const canvas = await encode(ctx.nodeChanges, ctx.blobs);
  /**
   * 项目级旁挂：只有真给了内容才写，避免给「纯页面导出」多塞一个空对象
   * （空对象会让旧文件的二进制不再一致，也白白增大体积）。
   */
  const project: ExtraProject = {};
  if (options.components && Object.keys(options.components).length > 0) project.components = options.components;
  if (options.tokens && options.tokens.length > 0) project.tokens = options.tokens;
  if (options.flows && options.flows.length > 0) project.flows = options.flows;
  const hasProject = Object.keys(project).length > 0;
  const meta = {
    client_meta: {
      background_color: { r: 1, g: 1, b: 1, a: 1 },
      thumbnail_size: { width: 0, height: 0 },
      render_coordinates: { x: 0, y: 0, width: 0, height: 0 },
    },
    file_name: options.fileName ?? 'ui-compiler-export',
    developer_related_links: [],
    exported_at: options.exportedAt ?? new Date().toISOString(),
    /** AST 专有字段旁挂层；空表不写，保持与旧文件二进制一致 */
    ...(Object.keys(ctx.extras).length > 0 || hasProject
      ? {
          ui_compiler_extras: {
            version: EXTRAS_VERSION,
            nodes: ctx.extras,
            ...(hasProject ? { project } : {}),
          },
        }
      : {}),
  };

  const entries: Record<string, Uint8Array> = {
    'canvas.fig': canvas,
    'meta.json': strToU8(JSON.stringify(meta)),
  };
  for (const [key, bytes] of Object.entries(ctx.images)) entries[`images/${key}`] = bytes;
  if (options.thumbnail) entries['thumbnail.png'] = options.thumbnail;

  const bytes = zipSync(entries, { level: 6 });
  return {
    bytes,
    stats: { pages: pages.length, nodes: ctx.nodeChanges.length, images: Object.keys(ctx.images).length },
  };
}

/** 浏览器/Node 通用的下载辅助（不改动 store，仅产出 Blob） */
export function figBlobOf(bytes: Uint8Array): Blob {
  return new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' });
}

/** 渐变角度 → transform（导出渐变时用；与 paint.ts 的 angleToTransform 同源，此处转发便于测试） */
export { angleToTransform };

/** 收集页面里的图片填充（测试断言用） */
export function countImageNodes(page: UIPage): number {
  let n = 0;
  const visit = (node: UINode): void => {
    if (node.type === 'IMAGE') n += 1;
    if ('children' in node) for (const c of node.children) visit(c);
  };
  visit(page.root);
  return n;
}

/** 填充层列表里是否有图片（导出侧决定是否写 images/） */
export function hasImageLayer(fills: FillLayer[] | undefined): boolean {
  return (fills ?? []).some((f) => (f as { type?: string }).type === 'IMAGE');
}
