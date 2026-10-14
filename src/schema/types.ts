export type NodeKind = 'PAGE' | 'FRAME' | 'SECTION' | 'SLICE' | 'TEXT' | 'IMAGE' | 'RECTANGLE' | 'BUTTON' | 'OVAL' | 'LINE' | 'POLYGON' | 'STAR';

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

export type UINode = ContainerNode | TextNode | ButtonNode | ImageNode | ShapeNode;

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

export function isContainer(node: UINode): node is ContainerNode {
  return node.type === 'PAGE' || node.type === 'FRAME' || node.type === 'RECTANGLE' || node.type === 'SECTION';
}

export function hasText(node: UINode): node is TextNode | ButtonNode {
  return node.type === 'TEXT' || node.type === 'BUTTON';
}
