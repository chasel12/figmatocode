export type NodeKind = 'PAGE' | 'FRAME' | 'SECTION' | 'SLICE' | 'TEXT' | 'IMAGE' | 'RECTANGLE' | 'BUTTON' | 'OVAL' | 'LINE' | 'POLYGON' | 'STAR' | 'VECTOR';

export type SizeMode = 'FIXED' | 'FILL' | 'HUG';
export type LayoutMode = 'VERTICAL' | 'HORIZONTAL' | 'ABSOLUTE';
export type AlignMode = 'START' | 'CENTER' | 'END' | 'STRETCH' | 'BASELINE';
export type JustifyMode = 'START' | 'CENTER' | 'END' | 'SPACE_BETWEEN';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

/** FR-19 效果 8 类 */
export type EffectKind =
  | 'DROP_SHADOW'
  | 'INNER_SHADOW'
  | 'LAYER_BLUR'
  | 'BACKGROUND_BLUR'
  | 'PROGRESSIVE_BLUR'
  | 'NOISE'
  | 'TEXTURE'
  | 'GLASS';

/** FR-19 单条效果（可选字段按 kind 取用；旧 JSON 无 effects 走 boxShadow 旧路径） */
export interface Effect {
  kind: EffectKind;
  /** 缺省可见 */
  visible?: boolean;
  /** 效果层透明度 0-1（Noise/Texture 颗粒强度等；阴影类透明度在 color 内） */
  opacity?: number;
  /** 阴影类参数（DROP/INNER） */
  x?: number;
  y?: number;
  blur?: number;
  spread?: number;
  color?: string;
  /** 模糊类半径（LAYER/BACKGROUND/PROGRESSIVE 主半径） */
  radius?: number;
  /** Progressive blur（startRadius/offset/beta，Figma 实测为准） */
  startRadius?: number;
  offset?: number;
  beta?: number;
  /** Noise/Texture：radius 粒径、density 密度、color/color2 双色、scale 缩放 */
  density?: number;
  color2?: string;
  scale?: number;
  /** Glass 7 参数（Figma 行为校准）：refraction/depth/dispersion/chroma/highlight/saturation/edge */
  refraction?: number;
  depth?: number;
  dispersion?: number;
  chroma?: number;
  highlight?: number;
  saturation?: number;
  edge?: number;
}

/** FR-34 Layer 分区混合模式（CSS 20 种子集，缺省 normal） */
export type BlendMode =
  | 'NORMAL' | 'DARKEN' | 'MULTIPLY' | 'COLOR_BURN' | 'LIGHTEN' | 'SCREEN'
  | 'COLOR_DODGE' | 'OVERLAY' | 'SOFT_LIGHT' | 'HARD_LIGHT' | 'DIFFERENCE'
  | 'EXCLUSION' | 'HUE' | 'SATURATION' | 'COLOR' | 'LUMINOSITY';

export const BLEND_MODES: BlendMode[] = [
  'NORMAL', 'DARKEN', 'MULTIPLY', 'COLOR_BURN', 'LIGHTEN', 'SCREEN',
  'COLOR_DODGE', 'OVERLAY', 'SOFT_LIGHT', 'HARD_LIGHT', 'DIFFERENCE',
  'EXCLUSION', 'HUE', 'SATURATION', 'COLOR', 'LUMINOSITY',
];

export type BoxPadding = [number, number, number, number]; // top right bottom left

/** FR-35 约束档位：水平 Left/Right/Center/Scale、垂直 Top/Bottom/Center/Scale（对照 Figma 4×2；PRD「5 档」按括号值域解释为 Figma 实际 4 档，见 LOG 报备） */
export type HorizontalConstraint = 'LEFT' | 'RIGHT' | 'CENTER' | 'SCALE';
export type VerticalConstraint = 'TOP' | 'BOTTOM' | 'CENTER' | 'SCALE';

export interface Constraints {
  horizontal: HorizontalConstraint;
  vertical: VerticalConstraint;
}

export interface LayoutSchema {
  mode: LayoutMode;
  widthMode: SizeMode;
  heightMode: SizeMode;
  width?: number;
  height?: number;
  padding?: BoxPadding;
  margin?: BoxPadding;
  gap?: number;
  align?: AlignMode;
  justify?: JustifyMode;
  flexGrow?: number;
  flexShrink?: number;
  x?: number;
  y?: number;
  /** FR-35 约束：父容器 resize 时子项重算依据；缺省 {LEFT,TOP}（对照 Figma 默认，出码不依赖） */
  constraints?: Constraints;
  /** FR-36 Auto Layout：折行开关（缺省 NO_WRAP） */
  wrap?: 'NO_WRAP' | 'WRAP';
  /** FR-36 wrap 时交叉轴行/列间距（缺省沿用 gap） */
  gapCross?: number;
  /** FR-36 min/max 宽高约束（px；clamp 于 layout 测量与出码） */
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  /** FR-36 clip content：容器 overflow hidden（出码） */
  clipContent?: boolean;
  /** FR-36 Ignore auto layout：切「绝对定位」前的流方向（切回时恢复；mode=ABSOLUTE 即忽略流） */
  prevMode?: LayoutMode;
}

export interface BorderSchema {
  width: number;
  color: string;
  style?: 'solid' | 'dashed' | 'dotted';
  /** FR-18 四边独立权重 [top,right,bottom,left]（缺省单值 width） */
  widths?: [number, number, number, number];
  /** FR-18 三对齐：缺省 INSIDE（Figma 默认） */
  align?: 'INSIDE' | 'CENTER' | 'OUTSIDE';
  /** FR-18 虚线 dash+gap（px；设置即出码 dashed，gap 为近似保留位） */
  dash?: [number, number];
  /** FR-18 线端：盒模型无 cap 概念，供 LINE/矢量出码（CSS 忽略） */
  cap?: 'NONE' | 'ROUND' | 'SQUARE' | 'ARROW_LINES' | 'ARROW_TRIANGLED' | 'ARROW_DIAMOND' | 'ARROW_POLYGON' | 'ARROW_CIRCLE';
  /** FR-18 转角（CSS border 自动接合，近似忽略，供矢量出码） */
  join?: 'MITER' | 'ROUND' | 'BEVEL';
  miterLimit?: number;
  /** FR-18 描边层透明度 0-1 */
  opacity?: number;
}

/** FR-17 fill 层：type=纯色/四型渐变；渐变用 stops+angle（Figma 向量角：0=右，顺时针 Y 向下） */
export type FillKind = 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';

export interface FillStop {
  /** 0-1 位置 */
  position: number;
  color: string;
  opacity?: number;
}

export interface FillLayer {
  type: FillKind;
  /** SOLID 色值 */
  color?: string;
  /** 层透明度 0-1（缺省 1） */
  opacity?: number;
  /** 单层显隐（缺省 true） */
  visible?: boolean;
  /** 渐变角 deg（Figma 向量角，出码 +90 换算 CSS） */
  angle?: number;
  /** 渐变停靠点（自左至右/由内到外按 position 升序） */
  stops?: FillStop[];
}

export interface StyleSchema {
  background?: string;
  /** FR-17 多层填充（数组序=面板序=CSS 层序，首层在上；未设时回退 background 旧路径） */
  fills?: FillLayer[];
  color?: string;
  border?: BorderSchema;
  borderRadius?: number | [number, number, number, number];
  /** FR-16 圆角平滑 0-100（Figma cornerSmoothing，可选字段，JSON 缺省视为 0 */
  cornerSmoothing?: number;
  /** FR-16 椭圆 arcData：起止角 deg（0=右，顺时针）+ 内径比例 0-1 → 饼/环（缺省字段=整圆） */
  arcData?: { startingAngle: number; endingAngle: number; innerRadius: number };
  /** FR-16 多边形点数（缺省 3）/ 星形点数（3-60，缺省 5） */
  pointCount?: number;
  /** FR-16 星形内径比例 0-1（缺省 0.38 对照 Figma） */
  innerRadius?: number;
  /** FR-20 图片填充模式：Fill/Fit/Crop/Tile（缺省 FILL） */
  imageScaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  /** 旋转角 deg（顺时针；LINE 斜线用，出码 transform rotate，origin 0 50%） */
  rotation?: number;
  opacity?: number;
  /** FR-19 效果列表（数组序=面板序=渲染序；未设时 boxShadow 旧字段生效） */
  effects?: Effect[];
  /** FR-34 Layer 混合模式（缺省 NORMAL=不输出） */
  blendMode?: BlendMode;
  /** 旧字段：自由串阴影（无 effects 时兼容路径） */
  boxShadow?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  /** FR-15：数值随 lineHeightMode 解释（缺省 PIXELS=旧语义） */
  lineHeight?: number;
  /** FR-15 行高单位：Auto（1.4×字号近似）/px/% */
  lineHeightMode?: 'AUTO' | 'PIXELS' | 'PERCENT';
  /** FR-15：数值随 letterSpacingMode 解释（缺省 PIXELS=旧语义） */
  letterSpacing?: number;
  /** FR-15 字距单位：px / %（% = 字号百分比） */
  letterSpacingMode?: 'PIXELS' | 'PERCENT';
  textAlign?: TextAlign;
  /** FR-15 垂直对齐（定宽/定高生效；出码与画布 Konva verticalAlign） */
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  /** FR-15 段落间距 px（段间额外高；测量生效，CSS 无原生对应出码忽略——LOG 报备） */
  paragraphSpacing?: number;
  /** FR-15 首行缩进 px（出码 text-indent） */
  paragraphIndent?: number;
  /** FR-15 自动换行（缺省 true；false 出码 white-space:pre / 画布 wrap none） */
  textWrap?: boolean;
  /** FR-15 Truncate：ENDING=截断加省略号（配 maxLines，缺省 DISABLED） */
  textTruncation?: 'DISABLED' | 'ENDING';
  /** FR-15 Truncate 最大行数（与 textTruncation=ENDING 同用） */
  maxLines?: number;
  /** FR-15 Text case 5 档（缺省 ORIGINAL） */
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS';
  /** FR-15 装饰：无/下划线/删除线（缺省 NONE） */
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  /** FR-15 OpenType 常用项：连字 liga、字距对 kern、自由连字 dlig（出码 font-feature-settings；画布由字体默认——LOG 报备） */
  openType?: { liga?: boolean; kern?: boolean; dlig?: boolean };
}

/** FR-24 节点导出设置：format PNG/JPG/SVG/PDF、scale 1x/2x/3x（SVG/PDF 恒 1x，对照 Figma 限制）、suffix 文件名后缀 */
export interface ExportSetting {
  format: 'PNG' | 'JPG' | 'SVG' | 'PDF';
  scale: 1 | 2 | 3;
  suffix?: string;
}

/* =============================================================
 * D0 Schema 定稿（2026-10-14）—— M4 矢量/组件 + M5 原型 + FR-20 余项
 * 规则：全部可选字段 + 旧 JSON 缺省即旧行为；单点写入，各轨道只消费不重定义。
 * ============================================================= */

/** FR-21/49 矢量路径：SVG path d 语法为唯一数据源（钢笔写入、布尔产出、出码直接复用）。
 *  坐标为节点本地系（相对节点左上角），尺寸缺省取 layout width/height。 */
export interface VectorData {
  /** SVG path d（M/L/C/Q/Z…，本地坐标系） */
  d: string;
  /** viewBox 宽（缺省用 layout.width） */
  width?: number;
  /** viewBox 高（缺省用 layout.height） */
  height?: number;
  /** fill-rule（缺省 nonzero；布尔 Subtract/Exclude 常用 evenodd） */
  fillRule?: 'nonzero' | 'evenodd';
}

/** FR-25 组件：主组件定义挂 root 级（不参与画布渲染），实例节点引用 componentId。
 *  实例 = 深拷贝快照 + componentId 标记；Detach 即删除 componentId/overrides。 */
export interface ComponentDef {
  id: string;
  name: string;
  /** 主组件内容（单根子树；PAGE 包裹以保证独立可渲染） */
  root: ContainerNode;
  /** FR-29 变体组：组名 + 本组件在该组下的取值（如 State=hover） */
  variantProps?: Record<string, string>;
  /** 创建时间序（Assets 排序用） */
  createdAt?: number;
}

/** FR-25 实例覆盖：属性路径 → 覆盖值（Detach 前可回填主组件变更） */
export interface InstanceOverride {
  path: string;
  value: unknown;
}

/** FR-27 样式（Paint/Text Style）：命名样式，节点引用 tokenId；样式改 → 引用者同步。
 *  引用表达：节点 style 内 styleTokenId 字段（下增）；Detach 即删该字段。 */
export interface StyleToken {
  id: string;
  name: string;
  kind: 'PAINT' | 'TEXT';
  /** 应用到节点的 style 片段（浅合并进节点 style） */
  style: Partial<StyleSchema>;
  /** FR-28 tokens.css 变量名（--color-primary 形态；导出用） */
  cssVar?: string;
}

/** FR-40 原型动作七类 P0（CHANGE_TO 随 FR-29 变体后并） */
export type PrototypeActionKind =
  | 'NAVIGATE' | 'BACK' | 'SCROLL' | 'OPEN_LINK' | 'CLOSE'
  | 'OPEN_OVERLAY' | 'CLOSE_OVERLAY' | 'CHANGE_TO';

/** FR-39 触发器十类（P0 实现 ON_CLICK/ON_HOVER/ON_PRESS/AFTER_TIMEOUT/KEYDOWN；其余后并） */
export type PrototypeTriggerKind =
  | 'ON_CLICK' | 'ON_HOVER' | 'ON_PRESS' | 'ON_DRAG' | 'AFTER_TIMEOUT'
  | 'MOUSE_ENTER' | 'MOUSE_LEAVE' | 'KEYDOWN' | 'TOUCH' | 'ON_LOAD';

/** FR-41 过渡：INSTANT 即无动画；easing 五档出码 cubic-bezier（CUSTOM 用 bezier 四值） */
export interface PrototypeTransition {
  kind: 'INSTANT' | 'DISSOLVE' | 'SMART_ANIMATE' | 'MOVE_IN' | 'MOVE_OUT' | 'PUSH' | 'SLIDE_IN' | 'SLIDE_OUT';
  /** ms（INSTANT 忽略） */
  duration?: number;
  easing?: 'LINEAR' | 'EASE_IN' | 'EASE_OUT' | 'EASE_IN_OUT' | 'EASE_IN_BACK' | 'CUSTOM';
  /** CUSTOM 时四值 cubic-bezier */
  bezier?: [number, number, number, number];
  /** MOVE/PUSH/SLIDE 方向 */
  direction?: 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM';
}

export interface PrototypeInteraction {
  id: string;
  trigger: PrototypeTriggerKind;
  /** AFTER_TIMEOUT 时 ms */
  timeoutMs?: number;
  /** KEYDOWN 时键名（如 'Escape'） */
  key?: string;
  action: PrototypeActionKind;
  /** NAVIGATE/OPEN_OVERLAY/CHANGE_TO 目标（BACK/CLOSE/CLOSE_OVERLAY/OPEN_LINK 免） */
  targetId?: string;
  /** OPEN_LINK 时 URL */
  url?: string;
  /** SCROLL 行为 */
  scrollBehavior?: 'TOP' | 'BOTTOM' | 'POINT';
  transition?: PrototypeTransition;
  /** OPEN_OVERLAY 定位九宫（相对视口） */
  overlayPosition?:
    | 'TOP_LEFT' | 'TOP_CENTER' | 'TOP_RIGHT'
    | 'CENTER' | 'BOTTOM_LEFT' | 'BOTTOM_CENTER' | 'BOTTOM_RIGHT'
    | 'MANUAL' | 'PRESET';
  /** OPEN_OVERLAY 点外行为 */
  overlayCloseOnOutside?: boolean;
  /** CHANGE_TO 目标变体值（variantProps 快照） */
  changeToVariant?: Record<string, string>;
}

/** FR-39 Flow：原型流程起点标记 + 演示分组（默认 Flow = 全部未标记页面） */
export interface FlowDef {
  id: string;
  name: string;
  /** 起点 Frame 的节点 id（蓝标） */
  startNodeId?: string;
  /** 参与本流程的页面 id 列表（空 = 全部） */
  pageIds?: string[];
}

/** FR-20 余项：图片 7 项调整（出码合成 CSS filter；画布渲染近似，轨道内报备） */
export interface ImageAdjustments {
  exposure?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  tint?: number;
  highlights?: number;
  shadows?: number;
}

interface NodeBase {
  id: string;
  name?: string;
  layout: LayoutSchema;
  style?: StyleSchema;
  /** 锁定后不可在画布点选/拖动/框选（FR-8/FR-9）；可选字段，旧项目 JSON 缺省即未锁定 */
  locked?: boolean;
  /** 隐藏后画布不渲染/不可点选（FR-29 显隐）；可选字段，旧项目 JSON 缺省即可见 */
  visible?: boolean;
  /** FR-24 导出预设列表（可多条）；旧项目 JSON 缺省即无导出设置 */
  exportSettings?: ExportSetting[];
  /** FR-21/49 矢量数据（VECTOR 节点专用；钢笔写入、布尔产出、SVG 出码直接复用） */
  vector?: VectorData;
  /** FR-25 组件实例标记：指向 root 级 ComponentDef.id；缺省 = 普通节点 */
  componentId?: string;
  /** FR-25 实例覆盖（与 componentId 同用；Detach 一并删除） */
  instanceOverrides?: InstanceOverride[];
  /** FR-27 样式引用（挂 style 内语义写在 StyleSchema；此处冗余导航字段不设——单点表达在 styleTokenId） */
  styleTokenId?: string;
  /** FR-39 原型交互列表（通常挂 Frame；数组序=执行序） */
  interactions?: PrototypeInteraction[];
  /** FR-43 Flow 起点标记（Set flow starting point） */
  flowStart?: boolean;
  /** FR-20 余项：图片调整（IMAGE 节点专用） */
  imageAdjustments?: ImageAdjustments;
}

export interface ContainerNode extends NodeBase {
  type: 'PAGE' | 'FRAME' | 'RECTANGLE' | 'SECTION';
  children: UINode[];
}

export interface TextNode extends NodeBase {
  type: 'TEXT';
  text: string;
}

export interface ButtonNode extends NodeBase {
  type: 'BUTTON';
  text: string;
}

export interface ImageNode extends NodeBase {
  type: 'IMAGE';
  src?: string;
}

/** FR-16 形状叶子：OVAL 椭圆 / LINE 直线（height=0 语义，斜角存 style.rotation）/ POLYGON 多边形 / STAR 星形；FR-14 SLICE（无样式圈定框，出码跳过） */
export interface ShapeNode extends NodeBase {
  type: 'OVAL' | 'LINE' | 'POLYGON' | 'STAR' | 'SLICE';
}

/** FR-21/49 矢量叶子：钢笔/布尔产出；渲染与出码均走 vector.d（SVG path） */
export interface VectorNode extends NodeBase {
  type: 'VECTOR';
}

export type UINode = ContainerNode | TextNode | ButtonNode | ImageNode | ShapeNode | VectorNode;

export interface Viewport {
  width: number;
  height: number;
}

export interface UIPage {
  id: string;
  name: string;
  viewport: Viewport;
  root: ContainerNode;
}

/** UIProject v1.1：多 Page + 组件 + 样式 + Flow 的工程级容器（M5 起；page 单页 JSON 继续兼容）。
 *  序列化契约：File→保存 写 project v2（含 pages/components/tokens/flows）；File→打开 双向兼容 v1（单 page）与 v2。 */
export interface UIProject {
  version: 2;
  name: string;
  pages: UIPage[];
  /** FR-25 主组件表（id → def；实例节点以 componentId 引用） */
  components: Record<string, ComponentDef>;
  /** FR-27 样式表（PAINT/TEXT） */
  tokens: StyleToken[];
  /** FR-39 原型流程 */
  flows: FlowDef[];
}

export function isContainer(node: UINode): node is ContainerNode {
  return node.type === 'PAGE' || node.type === 'FRAME' || node.type === 'RECTANGLE' || node.type === 'SECTION';
}

export function hasText(node: UINode): node is TextNode | ButtonNode {
  return node.type === 'TEXT' || node.type === 'BUTTON';
}
