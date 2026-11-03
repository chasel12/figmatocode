/**
 * FR-77 `.fig` 导出（视觉层）—— AST 页面 → Figma 文件。
 *
 * 写出内容：
 *   DOCUMENT → CANVAS（一个画布，页面作为并排 FRAME）→ 节点树，含 size / transform /
 *   fillPaints / strokePaints / effects / cornerRadius / auto layout / 文本字段 / 图片 blob /
 *   **矢量路径几何（fillGeometry）**。
 *
 * 明确不写（与计划 §7「明确不做」一致）：组件与实例语义、Variables、Prototype。
 * 矢量网络（`vectorData`，服务 Figma 的「编辑矢量节点」面板）也不写 —— 渲染几何
 * 走 `fillGeometry` 已经足够显示，网络数据是另一套编码，没有可靠依据就不瞎猜。
 *
 * 坐标系：`transform.m02/m12` 是**父内相对坐标**（与 Figma 的 `node.x/y` 同源），
 * 导出时逐层算出相对父级的偏移，**不要写页面绝对坐标**——写了会让子项跑到父 frame 之外，
 * frame 默认裁剪，整页内容被裁没。
 */
import { zipSync, strToU8 } from 'fflate';
import { isContainer } from '../schema/types';
import type { ComponentDef, FillLayer, FlowDef, StyleToken, UINode, UIPage } from '../schema/types';
import { angleToTransform, cssColorToFigColor, fillToPaint, styleToEffects, styleToPaints, type FigEffect, type FigMatrix, type FigPaint } from './paint';
import { EXTRAS_VERSION, type ExtraNode, type ExtraProject } from './extras';
import { svgPathToBlob, rectBlob, ellipseBlob } from './path-blob';
import { solidPng, thumbnailSize } from './png';
import { createApproxMeasure, type TextMeasureFn } from '../compiler/measure';
import { resolveLayout, type GeometryMap } from '../compiler/layout';

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
  /**
   * 下面三组是**真实 Figma 文件里每个节点都带、我们早先一个都没写**的默认字段。
   * 缺 `visible` 时 Figma 侧不一定按 true 兜底（导入后画布空白的最可能原因之一）；
   * 缺 `strokeAlign/strokeJoin/strokeWeight` 时描边类渲染路径拿不到初值。
   * 现在统一显式写出，与 `tests/fixtures/fig/*.fig` 的字段集对齐。
   */
  documentColorProfile?: string;
  backgroundColor?: { r: number; g: number; b: number; a: number };
  backgroundEnabled?: boolean;
  backgroundOpacity?: number;
  /**
   * `size` 是**可选**的：DOCUMENT / CANVAS 两类节点在真实 Figma 文件里不带它
   * （带 0×0 反而会让画布没有边界）。其余节点（FRAME/TEXT/…）仍然必写。
   */
  size?: { x: number; y: number };
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
  /** frame 是否**不**作为蒙版。真实文件的 FRAME 恒带这个字段，我们只在页面根上写 `true`。 */
  frameMaskDisabled?: boolean;
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
  /**
   * 子项在父 auto-layout 里的定位方式：`AUTO`（参与流）/ `ABSOLUTE`（脱流，按 transform 摆）。
   *
   * 用来表达 AST 的 `position: 'FIXED' / 'STICKY'` —— **Figma 没有 fixed 定位**，
   * 不写这一项它就把底栏当普通流内子项排到内容末尾（ironlog 的「底部导航」被排到
   * y=814，而视口只有 812 高，直接落在画框外）。
   */
  stackPositioning?: string;
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
  /**
   * `lines` 是 Figma 的**逐行排版指令**，真实文件的 TEXT 恒带一条
   * （实测 `gold-preview.fig`：`{lineType:'PLAIN', styleId:0, indentationLevel:0,
   * sourceDirectionality:'AUTO', listStartOffset:0, isFirstLineOfList:false}`）。
   * 早先只写 `characters` —— 字符数据在，排版器拿不到行信息，文字不渲染。
   */
  textData?: {
    characters: string;
    lines?: Array<{
      lineType: string;
      styleId: number;
      indentationLevel: number;
      sourceDirectionality: string;
      listStartOffset: number;
      isFirstLineOfList: boolean;
    }>;
  };
  count?: number;
  starInnerScale?: number;
  /**
   * **VECTOR 的渲染几何**（2026-11-02 补）。
   *
   * 真实 Figma 文件的每个 VECTOR 都带 `fillGeometry: Path[]`，`Path.commandsBlob`
   * 是 blob 索引，指向紧凑编码的命令流。不写它，Figma 里图标就是**空框** ——
   * 这是本项目长期遗留的「`.fig` 里 VECTOR 没有 vectorData」那个坑的真正解药：
   * Figma 渲染靠的是 fillGeometry，不是 vectorData（后者只服务「编辑矢量节点」面板）。
   */
  fillGeometry?: Array<{ windingRule: string; commandsBlob: number; styleID: number }>;
}

export interface FigExportOptions {
  /** 文件名（写进 meta.json，Figma 打开后作为文件名） */
  fileName?: string;
  /** 写入时间（ISO），默认取当前时间；测试里固定以保证字节确定性 */
  exportedAt?: string;
  /** 是否写缩略图（无则省略；Figma 会自动生成） */
  thumbnail?: Uint8Array;
  /**
   * 文本度量。**必须传浏览器的真实测量**，否则 `.fig` 在 Figma 里的排版会和编辑器不一样。
   *
   * 早先 `measureTree` 对 HUG 宽度的 TEXT 用 `fontSize × 0.62 × 字符数` 粗估 —— 0.62 是
   * 英文字符的平均宽度，**中文是全宽（≈1.0）**，于是中文文本宽度被低估约 40%。这个宽度
   * 会落进 `size.x`，而 TEXT 的 `textAutoResize` 是 `HEIGHT`（按给定宽度换行、高度自适应）
   * → Figma 用真实字体在这个**偏窄的宽度**上换行 → 多出一行 → 该节点高度变大 →
   * 垂直流里后面所有兄弟节点整体下移。用户看到的就是「frame 排版和 uicompiler 不一样」。
   *
   * 浏览器侧传 `createCanvasMeasure()`，Node 侧（脚本 / 测试）不传则退化为
   * `createApproxMeasure()`（CJK 1em、拉丁 0.55em），至少不会系统性低估中文。
   */
  measure?: TextMeasureFn;
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
 * 生成第 index 个兄弟的 fractional index，**编码与 Figma 一致**。
 *
 * Figma 用的是可打印 ASCII 区间 U+0021(`!`) ~ U+007E(`~`)，共 94 个字符，且**变长**：
 * 实测真实文件里同一父节点下的 position 依次是 `!` `"` `#` `$` `%` `&` … `~` `~!` `~"`。
 *
 * 早先这里是 base62 定长 3 位（`000` `001` …）。码点序虽然也对，但**不是 Figma 的编码**：
 * 导入器按 position 建树，非法的排序键会让子节点挂不上父级 —— 文件能导入、
 * 画布却一片空白（2026-11-02 用户实测）。导入侧只按字典序比较，两种编码都能排对，
 * 所以改这里不影响自家往返。
 *
 * 定长在变长编码里做不到，但**字典序严格递增**仍然成立：
 * `!` < `"` < … < `~` < `~!` < `~"` < … < `~~` < `~~!`（前缀相同则更长的更大）。
 */
export function positionOf(index: number): string {
  const MIN = 0x21; // '!'
  const BASE = 0x7e - MIN + 1; // 94
  if (index < BASE) return String.fromCharCode(MIN + index);
  // 进位：用最大字符 `~` 当前缀，余数递归 —— 与实测的 `~!` / `~"` 一致
  return '~' + positionOf(index - BASE);
}

/**
 * AST 尺寸模式 → Figma `StackSize` 枚举。
 * 注意 Figma 的 StackSize 只有 FIXED / RESIZE_TO_FIT / RESIZE_TO_FIT_WITH_IMPLICIT_SIZE 三档，
 * **没有 FILL**（填充由父容器 stretch 与 flexGrow 决定），写 FILL 会被 schema 直接拒。
 */
function sizingOf(mode: string | undefined, value: number | null | undefined, constrained = false): string {
  // HUG 带 min/max 约束 → 尺寸已由约束算定，Figma 的 Hug 不认约束，必须写 FIXED
  if (mode === 'HUG') return constrained ? 'FIXED' : 'RESIZE_TO_FIT';
  /**
   * **FILL 必须写 `FIXED`**（2026-11-03 修，Figma 排版与编辑器不一致的主因之一）。
   *
   * `RESIZE_TO_FIT_WITH_IMPLICIT_SIZE` 在 Figma 里仍是「按内容自适应」，只是初值取当前
   * size —— 它会**忽略父级的拉伸**。而 FILL 的语义恰恰是「宽度由父容器决定」：
   * `resolveLayout` 已经算出了具体值（写进 `size`），Figma 只要照用即可。
   *
   * 写成 implicit 的后果是整棵树被压扁：实测 ironlog 的「顶部导航」`size.x = 375`
   * 被 Figma 重算成 67（内容宽），于是它里面的 SPACE_BETWEEN 全部重排、
   * 交叉轴 STRETCH 的子项也跟着缩，整页错位。63 个节点受影响。
   */
  if (mode === 'FILL') return 'FIXED';
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
   * 当前页的几何（`resolveLayout` 的产物，页面内绝对坐标）。
   *
   * **必须与编辑器渲染同源**：编辑器的画布读的就是 `resolveLayout(page, measure)`，
   * 导出侧早先另写了一套 `measureTree` + `layoutChildren`（只做流式累加，没有
   * SPACE_BETWEEN、没有主轴 FILL 分摊），于是「.fig 里写的坐标」本身就和用户在
   * uicompiler 里看到的不是一回事 —— 用户报的「Figma 排版和 uicompiler 不一样」
   * 有一半来自这里，而不是 Figma 的重算。
   */
  geom: GeometryMap;
  /** 页面并排时的横向偏移（`resolveLayout` 给的是页面内坐标，导出要加上它） */
  pageOffsetX: number;
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

/**
 * 取节点第一层 SOLID 填充的色值（画布底色 / 文件底色用）。
 * 渐变、图片、无填充一律返回 null —— 由调用方兜底成白色。
 */
function firstSolidFill(node: UINode | undefined): { r: number; g: number; b: number; a: number } | null {
  const style = node?.style;
  // AI 生成的页面根普遍用 `background`（单色简写），手绘的用 `fills` 层，两种都认
  const raw = style?.fills?.find((f) => f.type === 'SOLID' && f.visible !== false && f.color)?.color ?? style?.background;
  if (!raw) return null;
  const c = cssColorToFigColor(raw, '#ffffff');
  return { r: c.r, g: c.g, b: c.b, a: c.a ?? 1 };
}

function textFieldsOf(node: UINode): Partial<OutNodeChange> {
  const style = node.style ?? {};
  const out: Partial<OutNodeChange> = {};
  const text = node.type === 'TEXT' || node.type === 'BUTTON' ? node.text : undefined;
  if (text !== undefined) {
    out.textData = {
      characters: text,
      lines: [
        {
          lineType: 'PLAIN',
          styleId: 0,
          indentationLevel: 0,
          sourceDirectionality: 'AUTO',
          listStartOffset: 0,
          isFirstLineOfList: false,
        },
      ],
    };
    out.textAutoResize = style.textWrap === false ? 'WIDTH_AND_HEIGHT' : 'HEIGHT';
  }
  out.fontSize = style.fontSize ?? 16;
  /**
   * `postscript` 不能留空：真实文件是 `"Inter-Medium"`（family-style 去空格）。
   * 空串会让 Figma 找不到字体回退，文字可能整段不画。
   */
  const family = style.fontFamily ?? DEFAULT_FONT_FAMILY;
  const face = STYLE_NAME[style.fontWeight ?? 400] ?? 'Regular';
  out.fontName = { family, style: face, postscript: `${family}-${face}`.replace(/\s+/g, '') };
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
  parent: {
    guid: { sessionID: number; localID: number };
    mode?: 'HORIZONTAL' | 'VERTICAL' | 'ABSOLUTE';
    abs?: { x: number; y: number };
    /**
     * 父容器**含 margin 子项**时置真：此时父级所有子项一律脱流。
     *
     * 原因：margin 子项必须脱流（Figma 没有 margin 原语），但**脱流就等于不占流位置** ——
     * 它后面的兄弟会整体上移。实测 music「播放」页第 9 个子项带 margin，脱流后
     * 「播放列表入口」上移 25px。既然这些位置 `resolveLayout` 已经逐个算好，
     * 就让该容器整层都按 transform 摆，Figma 不再插嘴。
     */
    forceAbsolute?: boolean;
  } | null,
  position: string,
  ctx: BuildContext,
  inheritStretch: boolean,
): void {
  const guid = allocGuid(ctx);
  const type = FIG_TYPE[node.type] ?? 'FRAME';
  /**
   * **必须按 `type` 判容器，不能按 `'children' in node`**（2026-11-03 修，丢文字的真凶）。
   *
   * `parseProject` 的 `ensureChildren` 护栏会给**每个节点**补 `children: []`（连 TEXT 也补，
   * 那是为了兜住手改过的外部文件）。于是浏览器里跑起来的每个 TEXT 都「有 children 键」，
   * `'children' in node` 恒真 → 下面的 `if (!isContainer && node.type === 'TEXT')` 永不成立
   * → `textFieldsOf` 整块跳过：`.fig` 里 174 个 TEXT **一个字符都没写**，也没有
   * fontSize / fontName / lineHeight / letterSpacing。
   *
   * 后果不是「字丢了」这么简单：打开后 6 个 frame 都在、节点数一个不少（386/386），
   * 但整页只剩细线和色块 —— 用户看到的「残次的组件，没有一个完整的页面frame」。
   * 这个缺陷只在**浏览器路径**暴露：Node 门禁直接喂 `project.json`，没走 `parseProject`，
   * 所以 `fig:check` 的往返 20 页全绿。
   */
  const isNodeContainer = isContainer(node);
  const style = node.style ?? {};
  const box = ctx.sizes.get(node.id) ?? { w: node.layout.width ?? 0, h: node.layout.height ?? 0 };
  /**
   * **`transform.m02/m12` 是「相对父级」的坐标，不是页面绝对坐标**（2026-11-02 修，第 6 个缺陷）。
   *
   * 真实文件实证（`variable-override-precedence.fig`）：`FRAME G @(400,50)` 的子项
   * `g1 @(0,0)`、`g2 @(40,70)` —— 若按绝对坐标解释，g1 落在 (0,0)、在 G 的框外，
   * 不可能。Figma 的 `node.x/y`（插件 API 同源）一直是**父内相对**坐标。
   *
   * 我们早先写的是绝对坐标（`layoutChildren` 算出来的页面坐标直接落盘）。后果不是「偏移一点」：
   * 第 N 页的根 FRAME 在 x=455×(N-1)，它的每个子项也被加上了同样的偏移，于是子项相对父级
   * 跑到了几百 px 之外 —— **FRAME 默认裁剪，整页内容被裁没**，打开就是「六个空 frame」。
   * 第 1 页恰好偏移为 0，所以「看起来只有一个页面是好的」，这正是用户报的现象。
   */
  const parentAbs = parent?.abs ?? { x: 0, y: 0 };
  const change: OutNodeChange = {
    guid,
    phase: 'CREATED',
    type,
    name: node.name ?? node.type,
    size: { x: box.w, y: box.h },
    transform: { m00: 1, m01: 0, m02: abs.x - parentAbs.x, m10: 0, m11: 1, m12: abs.y - parentAbs.y },
  };
  if (parent) {
    change.parentIndex = { guid: parent.guid, position };
    const parentMode = parent.mode ?? 'ABSOLUTE';
    /**
     * **脱流子项必须标 `stackPositioning: 'ABSOLUTE'`**（2026-11-03 修）。
     *
     * 三种「Figma 的 auto-layout 排不出来」的情况，都只能靠脱流 + 我们的 `transform` 定位：
     *
     * ① `position: 'FIXED' / 'STICKY'` —— 钉在视口/容器边缘（底栏、悬浮按钮）。
     *    不写的话 Figma 把底栏排到内容末尾（实测 ironlog「今日」页的「底部导航」被排到
     *    y=814，视口只有 812 高，整个底栏落在画框外）。
     * ② `mode: 'ABSOLUTE'` —— 子项自己脱流、内部再绝对定位（唱片的同心圆、装饰光晕）。
     *    不写的话 Figma 把它们按 VERTICAL 流一个接一个排下去，实测 music 的「唱片舞台」
     *    里五个圆被推到 y=644~1156（正确位置是 140~256），差 500~970px。
     * ③ **`margin` 非零** —— Figma 的 auto-layout **没有 margin 原语**（只有 padding，
     *    而 padding 作用在所有子项上）。实测 ledger「概览」页的四个区块都带
     *    `margin: [12,16,0,16]`，`resolveLayout` 据此把 x 推到 16、y 多 12；
     *    Figma 那边 x=0、y 少 12 —— 整块内容连同它所有子孙统一偏移 (-16,-40)，
     *    看起来就是「整个页面往左上角塌了」。
     *    margin 本身仍进旁挂层（`ExtraNode.margin`），往返不丢。
     *
     * 判据与 `compile.ts` 的 `parentIsAbsoluteContainer`、`layout.ts` 的 `fixedRectOf` 同口径。
     */
    const mg = node.layout.margin;
    const hasMargin = !!mg && (mg[0] !== 0 || mg[1] !== 0 || mg[2] !== 0 || mg[3] !== 0);
    if (
      parent.forceAbsolute ||
      node.layout.position === 'FIXED' ||
      node.layout.position === 'STICKY' ||
      /** `position: 'ABSOLUTE'` 与 `mode: 'ABSOLUTE'` 是两件事：前者是「相对父容器定位」，
       * 后者是「自身内部绝对布局」。两个都要脱流（coffee 的「角标」是前者，
       * 不写就跟着 HORIZONTAL 流排到左边，实测偏 295px）。 */
      node.layout.position === 'ABSOLUTE' ||
      node.layout.mode === 'ABSOLUTE' ||
      hasMargin
    ) {
      change.stackPositioning = 'ABSOLUTE';
    }
    // FILL 在 Figma 里没有原语，只能借子项字段表达（导入侧按同一约定还原）：
    //   交叉轴/宽度 → stackChildAlignSelf = STRETCH，主轴/高度 → stackChildPrimaryGrow = 1。
    // ABSOLUTE 容器没有 stack 语义，但它下面的 FILL 仍要表达（否则尺寸被写死），
    // 只是不掺「父容器 align=STRETCH」那一层含义（绝对布局下 align 本身无意义）。
    /**
     * **整层脱流时不写 alignSelf / grow**（2026-11-03）。
     *
     * 这两个字段在导入侧被当成「宽度/高度是 FILL」以及「父 align = STRETCH」的证据
     * （见 `import.ts` 的 `stretched` 判定）。而脱流子项的位置和尺寸已经由 transform
     * 定死，写上去只会让往返把 `align: START` 读成 `STRETCH` —— 实测 demo「16 多层嵌套页面」
     * 就是这样把父容器的交叉轴对齐改掉的，连带编译后 CSS 都变。
     */
    if (change.stackPositioning === 'ABSOLUTE') {
      // 脱流：位置与尺寸都已由 transform / size 定死，写这两个只会污染往返语义
    } else if (parentMode === 'ABSOLUTE') {
      change.stackChildAlignSelf = node.layout.widthMode === 'FILL' ? 'STRETCH' : 'AUTO';
      if (node.layout.heightMode === 'FILL') change.stackChildPrimaryGrow = 1;
    } else {
      const crossFill = parentMode === 'HORIZONTAL' ? node.layout.heightMode === 'FILL' : node.layout.widthMode === 'FILL';
      change.stackChildAlignSelf = inheritStretch || crossFill ? 'STRETCH' : 'AUTO';
      const primaryFill = parentMode === 'HORIZONTAL' ? node.layout.widthMode === 'FILL' : node.layout.heightMode === 'FILL';
      if (primaryFill) change.stackChildPrimaryGrow = 1;
    }
  }
  /**
   * `visible` / `opacity` / 描边三项**显式写默认值**。
   *
   * 真实 Figma 文件的每个节点都带 `visible: true`、`opacity: 1`、
   * `strokeAlign` / `strokeJoin` / `strokeWeight`（实测 `circle-text.fig` 全有）。
   * 早先我们只在「非默认」时才写 —— 语义上等价，但导入器的默认值未必是 true：
   * 实测用户拖进 Figma 后**画布一片空白**，最可能就是 `visible` 缺失被当成 false。
   * 显式写出来代价是几百字节，换来的是「与真实文件字段集一致」。
   */
  if (node.visible === false) change.visible = false;
  else change.visible = true;
  change.opacity = typeof node.style?.opacity === 'number' ? node.style.opacity : 1;
  change.strokeAlign = change.strokeAlign ?? 'INSIDE';
  change.strokeJoin = change.strokeJoin ?? 'MITER';
  /**
   * 默认 `strokeWeight` 用 **1**（不是 0）：真实 Figma 文件里没描边的 FRAME 也带 1
   * （`circle-text.fig` / `gold-preview.fig` 实测）。描边宽度只在 `strokePaints` 存在时生效，
   * 所以这个默认值不会凭空画出一道线。
   */
  change.strokeWeight = change.strokeWeight ?? 1;
  if (node.locked) change.locked = true;
  /**
   * **VECTOR 的路径几何**：`vector.d` → `fillGeometry[].commandsBlob`。
   *
   * 不写这段的话，`.fig` 里图标只有尺寸没有形状，Figma 打开是一片空框（自家编辑器
   * 不受影响，因为它直接读 AST 的 `vector.d`）——所以这个缺陷只有拖进 Figma 才看得见。
   *
   * 坐标换算：`d` 画在 `viewBox`（图标通常 24×24）里，而 Figma 的路径是**节点本地系**，
   * 所以要按 `box / viewBox` 缩放。两者相等时 scale=1，不改变任何数值。
   */
  if (node.type === 'VECTOR') {
    const v = node.vector;
    const vbW = Math.max(v?.width ?? box.w, 1);
    const vbH = Math.max(v?.height ?? box.h, 1);
    const blob = v?.d ? svgPathToBlob(v.d, box.w / vbW, box.h / vbH) : null;
    if (blob) {
      ctx.blobs.push(blob);
      change.fillGeometry = [
        {
          // 枚举值就是 NONZERO / ODD（不是 EVENODD —— 写错 kiwi 直接抛 Invalid value）
          windingRule: v?.fillRule === 'evenodd' ? 'ODD' : 'NONZERO',
          commandsBlob: ctx.blobs.length - 1,
          styleID: 0,
        },
      ];
    }
  } else if (
    change.type === 'FRAME' ||
    change.type === 'RECTANGLE' ||
    change.type === 'ROUNDED_RECTANGLE' ||
    change.type === 'ELLIPSE'
  ) {
    /**
     * **矩形类也要几何**（2026-11-03）。
     *
     * 真实 Figma 文件里 FRAME / RECTANGLE / ROUNDED_RECTANGLE **100% 都带 `fillGeometry`**；
     * 早先只有 VECTOR 写了这段，导出的 `.fig` 里 218 个形状只有 12 个有几何 ——
     * 拖进 Figma 就是一屏空白（自家编辑器读 AST，完全看不出这个缺陷）。
     *
     * **按 `change.type` 判断，不能按 `node.type`**：BUTTON 导出成 FRAME、页面根也导出成
     * FRAME，它们的 AST 类型分别是 BUTTON / PAGE，按 AST 判会漏掉这两个。
     *
     * 圆角不进几何：真实文件的 `ROUNDED_RECTANGLE` 命令流就是普通矩形，倒角靠
     * `cornerRadius` 字段。AST 里圆角矩形是 `RECTANGLE` + `style.borderRadius`，
     * 导出时写进 `cornerRadius`，几何仍是矩形。见 `rectBlob` 注释里的逐字节反证。
     */
    const blob = change.type === 'ELLIPSE' ? ellipseBlob(box.w, box.h) : rectBlob(box.w, box.h);
    ctx.blobs.push(blob);
    change.fillGeometry = [{ windingRule: 'NONZERO', commandsBlob: ctx.blobs.length - 1, styleID: 0 }];
  }
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
  const modeIsNative = isNodeContainer && nativeFrame;
  if (!modeIsNative) extra.mode = node.layout.mode;
  if (node.layout.position) extra.position = node.layout.position;
  if (node.layout.stickyTop !== undefined) extra.stickyTop = node.layout.stickyTop;
  if (node.layout.stickyBottom !== undefined) extra.stickyBottom = node.layout.stickyBottom;
  if (node.layout.margin) extra.margin = node.layout.margin;
  /**
   * 原始尺寸模式旁挂（见 `ExtraNode.sizing`）。**所有节点都写**，不做挑选 ——
   * 「只在被改写时写」需要判断哪些节点被改写，而判断本身就是漂移源。
   */
  if (node.layout.widthMode || node.layout.heightMode) {
    extra.sizing = { w: node.layout.widthMode, h: node.layout.heightMode };
    // 只有原本就带值时才存 —— 存 0/undefined 会让导入凭空长出一个 width
    if (node.layout.width != null) extra.sizing.wv = node.layout.width;
    if (node.layout.height != null) extra.sizing.hv = node.layout.height;
  }
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
  // B8：alt 在 Figma 的 NodeChange 里没有原语，只能旁挂（空串是「装饰图」的显式声明，也要存）
  if (node.type === 'IMAGE' && node.alt !== undefined) extra.alt = node.alt;
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
  /**
   * 矢量**不写旁挂**：路径几何在原生 `fillGeometry` 里（Figma 里改过也能读回来），
   * `fillRule` 在 `windingRule` 里。早先试过旁挂 `viewBox`，结果是「d 已缩放到本地坐标、
   * viewBox 却按原值恢复」→ 出码二次缩放 → 图标缩成 2/3 并贴左上角。不留这个口子。
   */
  if (Object.keys(extra).length > 0) ctx.extras[`${guid.sessionID}:${guid.localID}`] = extra;
  // opacity 已在上面统一写过（默认 1），这里不再重复
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

  if (isNodeContainer) {
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
  const vertical = isNodeContainer && node.layout.mode === 'VERTICAL';
  /**
   * **HUG 但带 min/max 约束时不能写 `RESIZE_TO_FIT`**（2026-11-03 修）。
   *
   * Figma 的「Hug contents」只认内容尺寸，**不认 minWidth/minHeight**。而 AST 里
   * 「HUG + minHeight」是常见组合（底部操作栏 `heightMode: 'HUG', minHeight: 88`，
   * 意思是「按内容撑开，但不低于 88」）。`resolveLayout` 会尊重约束算出 88，
   * Figma 却按内容算成 48 —— 整条底栏矮 40px，里面的按钮跟着上移。
   *
   * 既然尺寸已经被算成具体值，直接写 `FIXED` 让 Figma 照用。约束本身在旁挂层
   * （`minSize` 走原生字段、其余走 extras），往返不受影响。
   */
  const hasWConstraint = node.layout.minWidth != null || node.layout.maxWidth != null;
  const hasHConstraint = node.layout.minHeight != null || node.layout.maxHeight != null;
  /**
   * **有 margin 子项的容器也不能写 HUG**（2026-11-03 修）。
   *
   * margin 子项在 Figma 里被迫脱流（Figma 没有 margin 原语，见上面 `stackPositioning`
   * 那段），而**脱流的子项不计入父容器的 Hug 尺寸** —— 于是父容器在 Figma 里矮一截，
   * 它后面的兄弟整体上移。实测 music「推荐信息」写入 142、Figma 算 84（差 58），
   * 「今日推荐区」「今日推荐卡」连锁差 58。
   *
   * 尺寸既然已经由 `resolveLayout`（它会把 margin 算进去）算出具体值，就让 Figma 照用。
   */
  const hasMarginChild =
    isNodeContainer &&
    node.children.some((c) => {
      const m = c.layout.margin;
      return !!m && (m[0] !== 0 || m[1] !== 0 || m[2] !== 0 || m[3] !== 0);
    });
  change.stackPrimarySizing = sizingOf(
    vertical ? node.layout.heightMode : node.layout.widthMode,
    vertical ? node.layout.height : node.layout.width,
    (vertical ? hasHConstraint : hasWConstraint) || hasMarginChild,
  );
  change.stackCounterSizing = sizingOf(
    vertical ? node.layout.widthMode : node.layout.heightMode,
    vertical ? node.layout.width : node.layout.height,
    (vertical ? hasWConstraint : hasHConstraint) || hasMarginChild,
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

  if (!isNodeContainer && node.type === 'TEXT') {
    Object.assign(change, textFieldsOf(node));
  }

  ctx.nodeChanges.push(change);

  // BUTTON 无对应 Figma 原语：本体当 FRAME（带底色/描边/圆角），文案挂一个 TEXT 子节点，
  // 否则按钮文字在 `.fig` 里直接消失（视觉层最大的坑）
  if (node.type === 'BUTTON') {
    const pad = node.layout.padding ?? [0, 0, 0, 0];
    /**
     * 宽度取**测量后的实际尺寸**，不能只用 `layout.width`：
     * HUG 宽度的按钮（`widthMode: 'HUG'`）没有 `layout.width`，早先算出的 `contentW`
     * 恒为 0 → label 的 `size.x = 0` → Figma 里按钮文字宽度为 0，文字不显示。
     */
    const btnBox = ctx.sizes.get(node.id);
    const btnW = node.layout.width ?? btnBox?.w ?? 0;
    const btnH = node.layout.height ?? btnBox?.h ?? 0;
    const contentW = Math.max(0, btnW - pad[1] - pad[3]);
    const contentH = Math.max(0, btnH - pad[0] - pad[2]);
    const label: OutNodeChange = {
      guid: allocGuid(ctx),
      phase: 'CREATED',
      type: 'TEXT',
      name: BUTTON_LABEL,
      parentIndex: { guid, position: positionOf(0) },
      size: { x: contentW, y: contentH },
      /** 按钮文案相对按钮本体定位（父内相对坐标） */
      transform: { m00: 1, m01: 0, m02: pad[3], m10: 0, m11: 1, m12: pad[0] },
      ...textFieldsOf(node),
      fillPaints: [{ type: 'SOLID', color: cssColorToFigColor(style.color, '#ffffff'), opacity: 1, visible: true, blendMode: 'NORMAL' }],
    };
    // 按钮的垂直居中来自 flex align，不是 style.textAlignVertical，这里翻译过去
    if (node.layout.align === 'CENTER' && label.textAlignVertical === 'TOP') label.textAlignVertical = 'CENTER';
    ctx.nodeChanges.push(label);
  }

  if (isNodeContainer) {
    /**
     * 子项坐标直接取 `resolveLayout` 的几何（页面内绝对坐标），只加并排偏移。
     * 不再用 `layoutChildren` 自己排 —— 那是第二套布局引擎，必然与编辑器漂移。
     */
    const stretch = node.layout.align === 'STRETCH';
    /**
     * 只要有一个子项带 margin，整层都脱流 —— 见 `parent.forceAbsolute` 的注释。
     * 判据与上面 `hasMarginChild` 一致（非零才算，`[0,0,0,0]` 视为没有）。
     */
    const forceAbsolute = node.children.some((c) => {
      const m = c.layout.margin;
      return !!m && (m[0] !== 0 || m[1] !== 0 || m[2] !== 0 || m[3] !== 0);
    });
    node.children.forEach((child, i) => {
      const g = ctx.geom[child.id];
      const pos = g ? { x: ctx.pageOffsetX + g.x, y: g.y } : { x: abs.x, y: abs.y };
      buildNode(child, pos, { guid, mode: node.layout.mode, abs, forceAbsolute }, positionOf(i), ctx, stretch);
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
  /**
   * 文本度量：浏览器侧由调用方传 `createCanvasMeasure()`（真实 canvas measureText），
   * Node 侧（脚本 / 测试）退化为近似度量。**不能让 TEXT 的尺寸落回「按字符数粗估」**，
   * 详见 `FigExportOptions.measure` 的注释。
   */
  const textMeasure: TextMeasureFn = options.measure ?? createApproxMeasure();
  /**
   * `sessionID: 0` —— 与真实文件一致（实测四个样本：DOCUMENT 恒 `0:0`、第一个 CANVAS 恒 `0:1`）。
   * 早先用 1，于是 DOCUMENT 是 `1:0`。sessionID 本身是「谁写的」的标识，理论上可以任意，
   * 但 Figma 的导入器很可能按 `0:0` 定位文档节点 —— 对不上就是「文件打不开」。
   * 这是零代价的对齐，没有理由不跟。
   */
  const ctx: BuildContext = { nodeChanges: [], blobs: [], images: {}, sessionID: 0, nextLocalID: 0, sizes: new Map(), extras: {}, geom: {}, pageOffsetX: 0 };

  // DOCUMENT 固定 1:1，各页 CANVAS 顺延
  const documentGuid = { sessionID: ctx.sessionID, localID: 0 };
  ctx.nodeChanges.push({
    guid: documentGuid,
    phase: 'CREATED',
    type: 'DOCUMENT',
    name: 'Document',
    /** 真实 Figma 文件的 DOCUMENT 恒带这一项（实测 `circle-text.fig`），缺了色彩配置可能失效 */
    documentColorProfile: 'SRGB',
    visible: true,
    opacity: 1,
    /**
     * **DOCUMENT / CANVAS 不写 `size`**（2026-11-02 修）。
     *
     * 早先这里写了 `size: { x: 0, y: 0 }` —— 真实 Figma 文件里这两类节点**根本没有 `size` 字段**
     * （四个样本实测，见 `.tmp/fig-fields.ts`）。给一个 0×0 的 size 等于告诉 Figma「这个画布没有
     * 边界」，是「拖进 Figma 一片空白」最像的直接原因。两者都不带 `size` 才是正确口径。
     */
    strokeWeight: 0,
    strokeAlign: 'CENTER',
    strokeJoin: 'BEVEL',
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
  });

  /**
   * **一个 CANVAS 装全部页面**（2026-11-02 改）。
   *
   * 早先是 `UIPage → CANVAS`（一页一个画布）。那是把 AST 的 `UIPage`（= 一个屏幕）
   * 直接等同于 Figma 的 `page`（= 文件内的分组容器）。真实 Figma 文件不是这样：
   * `tests/fixtures/fig/` 的四个样本全是「一个 CANVAS 上并排多个 FRAME」
   * （`variable-override-precedence.fig` 的 Page 1 就有 3 个 FRAME + 1 个 SECTION）。
   *
   * 旧映射的连带代价：页面根节点在 `.fig` 里**没有实体**（被压成 CANVAS，而 CANVAS
   * 没有 fills / auto layout / padding），根的 `style` 与 `padding` 只能整份旁挂 ——
   * 那正是「深色页存成 .fig 再打开变白字白底」的来源。改成 FRAME 之后这些属性
   * **原生承载**，根不再需要旁挂。
   *
   * 兼容：项目旁挂写 `format: 'frames'`。没有这个标记的文件（旧版导出、外部 Figma）
   * 导入侧仍按「CANVAS 就是页面」读，行为不变。
   */
  const canvasGuid = allocGuid(ctx);
  /**
   * 画布底色跟第一页的根背景走（深色主题的文件在 Figma 里不该是一片刺眼的白）。
   * 真实文件同源：`circle-text.fig` 的 `meta.client_meta.background_color` 与它 CANVAS 的
   * `backgroundColor` 完全一致（#1e1e1e），说明 Figma 是拿画布底色当文件底色的。
   */
  const canvasBg = firstSolidFill(pages[0]?.root) ?? { r: 1, g: 1, b: 1, a: 1 };
  ctx.nodeChanges.push({
    guid: canvasGuid,
    phase: 'CREATED',
    type: 'CANVAS',
    name: options.fileName ?? 'Page 1',
    parentIndex: { guid: documentGuid, position: positionOf(0) },
    /** CANVAS 的画布底色：真实文件必带这三项（`circle-text.fig` 是 #1e1e1e） */
    backgroundColor: canvasBg,
    backgroundEnabled: true,
    backgroundOpacity: 1,
    visible: true,
    opacity: 1,
    /** 同上：CANVAS 也不带 `size`（真实文件口径），且描边默认是 CENTER/BEVEL 而非 INSIDE/MITER */
    strokeWeight: 0,
    strokeAlign: 'CENTER',
    strokeJoin: 'BEVEL',
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
  });

  /** 画布上相邻页面之间的横向间距（Figma 里并排的常规留白） */
  const PAGE_GAP = 80;
  let cursorX = 0;
  /** 所有页面并排后的包围盒：写进 meta 的 `render_coordinates`（0×0 会让文件看起来是空的） */
  let totalWidth = 0;
  let totalHeight = 0;
  pages.forEach((page, pageIndex) => {
    totalWidth = cursorX + page.viewport.width;
    totalHeight = Math.max(totalHeight, page.viewport.height);
    /**
     * **几何必须与编辑器同源**（2026-11-03 修）。
     *
     * 编辑器画布渲染的就是 `resolveLayout(page, measure)` 的结果；导出侧早先另写了
     * `measureTree` + `layoutChildren`（只做流式累加：没有 SPACE_BETWEEN、没有主轴
     * FILL 分摊、HUG 宽度也不看父约束），于是**写进 `.fig` 的坐标本身就和用户在
     * uicompiler 里看到的不一样** —— 这跟 Figma 会不会重算是两件事。
     *
     * 修法：直接调同一个函数。差异从「两套布局引擎的差」收敛成「Figma 重算的差」，
     * 后者由 `stackPositioning: 'ABSOLUTE'` 关掉（见 buildNode）。
     */
    const geom = resolveLayout(page, textMeasure);
    ctx.geom = geom;
    ctx.pageOffsetX = cursorX;
    for (const [id, g] of Object.entries(geom)) ctx.sizes.set(id, { w: g.width, h: g.height });
    // 根自己的尺寸显式补上（resolveLayout 有 root，这里只是防御性兜底）
    ctx.sizes.set(page.root.id, { w: page.viewport.width, h: page.viewport.height });
    /**
     * 页面根直接当 FRAME 构建（`FIG_TYPE.PAGE = 'FRAME'`）。
     *
     * `buildNode` 会把 `mode / padding / gap / align / justify / fills / 圆角 / 裁剪`
     * 全部写进**原生字段**（Figma 里可见、可改），子项坐标由它内部的 `layoutChildren`
     * 按同一套规则排。原来手写的「根级子项也必须过流式布局」那段逻辑因此收归一处 ——
     * 那次修的 bug（子项全落 (0,0)）不可能再以另一种形式复发。
     */
    const rootIndex = ctx.nodeChanges.length;
    buildNode(
      page.root,
      { x: cursorX, y: 0 },
      { guid: canvasGuid, mode: page.root.layout.mode },
      positionOf(pageIndex),
      ctx,
      false,
    );
    /**
     * **页面根 frame 必须裁剪**（2026-11-02 补）。
     *
     * 一个手机屏幕本来就是「视口裁掉滚动内容」—— 内容总高（102+341+247+318+64=1072）
     * 常常大于视口 812。Figma 的 frame 默认就裁剪，所以那边看不出问题；
     * 而**我们自己的画布不裁剪**，于是导入后整段内容从 frame 底部溢出来，散在画布上
     * 像一堆碎片（用户报的「残次的组件」就是这个）。显式写 `clipsContent`，
     * 两个渲染器就一致了。
     */
    const rootChange = ctx.nodeChanges[rootIndex];
    if (rootChange && rootChange.type === 'FRAME') {
      /**
       * **页面名以 `page.name` 为准，不跟 `root.name`**（2026-11-02 补）。
       *
       * 顶层 FRAME 就是「这一页」本身，它的图层名在 Figma 里显示的就是页面名。
       * 早先这里用的是 `root.name` —— AI 生成的页面根常被模型起成「铁志-训练」这种
       * 带品牌前缀的图层名，于是**导出再导入，页面名就从「训练」变成「铁志-训练」**。
       *
       * 这不是美观问题：页面名是导航的主键（`wireNavigation` 按它精确匹配、tabBar 按它判归属），
       * 往返一次就换名字，等于整站导航全断。demo 页两者恰好相等（`createPage` 同名），
       * 所以这个 bug 只在 AI 生成的工程上暴露。
       */
      if (page.name) rootChange.name = page.name;
      /**
       * `frameMaskDisabled` 能编码，`clipsContent` **不能** —— Figma 的 schema 里根本没有
       * 这个字段名（实测 grep 整个 schema 只有 `clipToShape` / `isClip` 之类）。
       * Figma 的 frame 本来就默认裁剪，所以那边不需要写；我们这边要靠旁挂层
       * （`extra.clipContent`，见 buildNode 里那段）才能让自家画布也裁。
       */
      rootChange.frameMaskDisabled = true;
    }
    cursorX += page.viewport.width + PAGE_GAP;
  });

  const canvas = await encode(ctx.nodeChanges, ctx.blobs);
  /**
   * 项目级旁挂。`format: 'frames'` 是**格式标记**，不是可选装饰：
   * 它告诉导入侧「这个 CANVAS 下的顶层 FRAME 才是页面」。没有它的文件（旧版导出、
   * 外部 Figma 文件）仍按「CANVAS 就是页面、子项是页面内容」读 —— 那是历史语义。
   */
  const project: ExtraProject = { format: 'frames' };
  if (options.components && Object.keys(options.components).length > 0) project.components = options.components;
  if (options.tokens && options.tokens.length > 0) project.tokens = options.tokens;
  if (options.flows && options.flows.length > 0) project.flows = options.flows;
  const hasProject = Object.keys(project).length > 0;
  /**
   * **缩略图必须与 `thumbnail_size` 同尺寸**（2026-11-03）。
   *
   * 真实 Figma 文件恒带 `thumbnail.png`，且 `meta.client_meta.thumbnail_size` 就是它的尺寸
   * （实测 400×244）。我们早先两样都不写（0×0 + 无条目）—— 真实文件 100% 有、我们 0% 有，
   * 这是最后一个条目级差异。没传真实缩略图时用纯背景色占位（导出层在 Node 里跑，没有 canvas）。
   */
  const thumb = thumbnailSize(totalWidth, totalHeight);
  const thumbBytes =
    options.thumbnail ??
    solidPng(
      thumb.width,
      thumb.height,
      [canvasBg.r, canvasBg.g, canvasBg.b].map((v) => Math.round(v * 255)) as [number, number, number],
    );
  const meta = {
    client_meta: {
      background_color: canvasBg,
      thumbnail_size: thumb,
      /**
       * **必须写真实包围盒**（2026-11-02 修）。
       *
       * 早先恒写 `{0,0,0,0}` —— 真实文件这里是整个文件的渲染范围
       * （`circle-text.fig` 是 `{0,0,607,607}`）。0×0 等于告诉 Figma「这个文件没有任何内容」，
       * 是「拖进 Figma 打开一片空白」的第二个强嫌疑（第一个是 `size: 0×0`）。
       */
      render_coordinates: { x: 0, y: 0, width: Math.round(totalWidth), height: Math.round(totalHeight) },
    },
    file_name: options.fileName ?? 'ui-compiler-export',
    developer_related_links: [],
    exported_at: options.exportedAt ?? new Date().toISOString(),
    /**
     * **只有这 4 个键**，与真实文件逐键一致。AST 专有字段搬到归档里的
     * `ui_compiler_extras.json`（见下面 entries 那段），不污染 Figma 会读的 meta。
     */
  };

  /**
   * 归档条目与压缩方式**必须跟真实文件一致**（2026-11-02 修）。
   *
   * 四个真实 `.fig` 实测（`python -c "zipfile...infolist()"`）：`canvas.fig`、
   * `thumbnail.png`、`images/*` **全部是 store（method=0，不压缩）**，只有 `meta.json`
   * 走 deflate；而且**即使没有图片也带一个空的 `images/` 目录条目**。
   *
   * 我们早先一律 `level: 6` 全量 deflate。`canvas.fig` 内部本来就是 deflate 过的
   * （压缩率 1.000x，省 2 字节），再套一层没有收益，却偏离了唯一被验证过的形态 ——
   * 用户报「拖进 Figma 打不开」，这是当时唯一还没对齐的二进制级差异。
   */
  const entries: Record<string, [Uint8Array, { level: 0 | 6 }]> = {
    'canvas.fig': [canvas, { level: 0 }],
    'meta.json': [strToU8(JSON.stringify(meta)), { level: 6 }],
    /** 空目录条目：真实文件恒有，缺了可能被判成「不完整的归档」 */
    'images/': [new Uint8Array(0), { level: 0 }],
  };
  for (const [key, bytes] of Object.entries(ctx.images)) entries[`images/${key}`] = [bytes, { level: 0 }];
  entries['thumbnail.png'] = [thumbBytes, { level: 0 }];
  /**
   * AST 专有字段**不写进 `meta.json`**，单独一个条目。
   *
   * `meta.json` 是 Figma 真的会读的文件（`file_name` / `client_meta.background_color` /
   * `render_coordinates` / `thumbnail_size` 全从这儿取），真实文件只有 4 个键、约 315 字节。
   * 我们往里塞了 12KB 的 `ui_compiler_extras` —— 一旦 Figma 对 meta 做键校验就是硬失败。
   * 独立条目是纯增量：Figma 忽略未知文件名（它连 `images/` 都只是按需取），
   * 我们自己的导入侧再读回来（`openFigArchive` 会把它合并进 `meta`，下游零改动）。
   */
  const extrasPayload = {
    version: EXTRAS_VERSION,
    nodes: ctx.extras,
    ...(hasProject ? { project } : {}),
  };
  if (Object.keys(ctx.extras).length > 0 || hasProject) {
    entries['ui_compiler_extras.json'] = [strToU8(JSON.stringify(extrasPayload)), { level: 6 }];
  }

  const bytes = zipSync(entries);
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
