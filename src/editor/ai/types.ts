/**
 * M7 AI 生成域 · 输出契约（Wave2 plan §5 / W1）
 *
 * 这是**模型与编译器之间唯一的接口**：模型只允许产出本文件的类型，
 * 出码链路对 AI 无感知（plan §1「AI 只画草稿，编译 100% 确定性」）。
 *
 * 纪律：
 * 1. `src/schema/types.ts` 冻结不动——本文件是它的**子集投影**，只表达"模型能说的那一部分"；
 *    未在此处出现的字段（交互、原型、变体、组件引用…）模型无权表达，属诚实边界。
 * 2. 本文件是 JSON Schema 的唯一源头：`scripts/gen-ai-schema.mjs` 用 ts-json-schema-generator
 *    从本文件生成 `contract.schema.json`，ajv 据此校验。**改本文件必须重跑 schema 生成**，
 *    `tests/ai-contract.test.ts` 会锁住两者不脱节。
 * 3. 颜色字段允许两种写法：`#rrggbb` 字面量，或 `@color.primary` 形式的**风格包令牌引用**。
 *    令牌引用由 `resolveTokens` 解析为具体色值——这是"风格符合度可测"的实现基础。
 */

/** 模型可创建的节点类型（PAGE/SECTION/SLICE/STAR/POLYGON 不在 AI 表达范围） */
export type AiNodeKind = 'FRAME' | 'TEXT' | 'BUTTON' | 'RECTANGLE' | 'IMAGE' | 'OVAL' | 'LINE' | 'VECTOR';

export interface AiLayoutSpec {
  /** 布局模式：纵向堆叠 / 横向排列 / 绝对定位 */
  mode?: 'VERTICAL' | 'HORIZONTAL' | 'ABSOLUTE';
  widthMode?: 'FIXED' | 'FILL' | 'HUG';
  heightMode?: 'FIXED' | 'FILL' | 'HUG';
  width?: number;
  height?: number;
  /** 内边距 [上,右,下,左]，单位 px（8pt 网格） */
  padding?: [number, number, number, number];
  /** 主轴间距 px */
  gap?: number;
  align?: 'START' | 'CENTER' | 'END' | 'STRETCH' | 'BASELINE';
  justify?: 'START' | 'CENTER' | 'END' | 'SPACE_BETWEEN';
  /** ABSOLUTE 容器内子项的坐标 */
  x?: number;
  y?: number;
}

/** 模型可表达的效果（阴影/模糊三档，其余效果不在表达范围） */
export interface AiEffectSpec {
  kind: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR';
  x?: number;
  y?: number;
  blur?: number;
  spread?: number;
  radius?: number;
  color?: string;
}

/** B1 渐变（描边用；from/to 走 applyColor，故支持令牌引用） */
export interface AiGradientSpec {
  /** 起点色：hex 或令牌引用 */
  from: string;
  /** 终点色：hex 或令牌引用 */
  to: string;
  /** Figma 向量角 deg（0=向右、顺时针）；缺省 90 = 自上而下 */
  angle?: number;
}

export interface AiBorderSpec {
  width: number;
  color: string;
  style?: 'solid' | 'dashed' | 'dotted';
  /** 设置即走渐变描边（三端原生支持），此时 color 仅作降级回退 */
  gradient?: AiGradientSpec;
}

/** B1 装饰：与 `schema/types.ts` 的 `DecorationSpec` 同枚举，但收窄到 AI 该管的字段 */
export interface AiMeshPoint {
  /** 0-100 */
  x: number;
  /** 0-100 */
  y: number;
  /** 半径占长边百分比 0-100 */
  radius: number;
  /** hex 或令牌引用 */
  color: string;
}

export interface AiDecorationSpec {
  kind: 'SPOTLIGHT' | 'VIGNETTE' | 'MESH_GRADIENT' | 'DIAGONAL_CUT' | 'DUOTONE';
  /** 强度 0-1，缺省 1 */
  intensity?: number;
  /** 主色：hex 或令牌引用 */
  color?: string;
  /** MESH_GRADIENT 的色斑（2~4 个） */
  points?: AiMeshPoint[];
  /** SPOTLIGHT 光源位置（百分比，可负） */
  at?: { x: number; y: number };
  /** 衰减起止（百分比） */
  stop?: { from: number; to: number };
  /** DIAGONAL_CUT 切角像素（四角同值） */
  cut?: number;
}

/** B2 交互态单态：只允许视觉字段（与 `StateStyleSchema` 同口径，收窄掉 decorations/points） */
export interface AiStateStyle {
  /** 填充色：hex 或令牌引用 */
  background?: string;
  /** 文本色：hex 或令牌引用 */
  color?: string;
  borderRadius?: number;
  border?: AiBorderSpec;
  /** 0-1 */
  opacity?: number;
  effects?: AiEffectSpec[];
}

export interface AiStatesSpec {
  hover?: AiStateStyle;
  active?: AiStateStyle;
  focus?: AiStateStyle;
  disabled?: AiStateStyle;
}

/** B3 元素级变换（缺省绕元素中心；顺序 translate → rotate → scale） */
export interface AiTransformSpec {
  rotate?: number;
  scaleX?: number;
  scaleY?: number;
  translateX?: number;
  translateY?: number;
  /** CSS transform-origin，缺省 50% 50% */
  origin?: string;
}

/** B3 CSS Grid（设置即接管容器布局，flex 语义失效） */
export interface AiGridSpec {
  /** grid-template-columns 原值，如 repeat(3, 1fr) */
  columns?: string;
  rows?: string;
  columnGap?: number;
  rowGap?: number;
  autoFlow?: 'row' | 'column' | 'row dense' | 'column dense';
}

export interface AiStyleSpec {
  /** 填充色：hex 或 @token */
  background?: string;
  /** 文本/图标色：hex 或 @token */
  color?: string;
  borderRadius?: number;
  border?: AiBorderSpec;
  /** B1 装饰层（只补 fills/effects 表达不了的视觉） */
  decorations?: AiDecorationSpec[];
  /** B2 交互态：出码成伪类，画布不预览 */
  states?: AiStatesSpec;
  /** B3 元素级变换 */
  transform?: AiTransformSpec;
  /** B3 CSS Grid */
  grid?: AiGridSpec;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  opacity?: number;
  effects?: AiEffectSpec[];
}

export interface AiNodeSpec {
  kind: AiNodeKind;
  /** 图层名（用于人读与后续编辑定位，建议语义化中文/英文短语） */
  name?: string;
  /** TEXT/BUTTON 的文案 */
  text?: string;
  /** IMAGE 的图片地址（可为空占位） */
  src?: string;
  /** VECTOR 图标：风格包图标库名（如 "house"）；与 vectorD 二选一 */
  icon?: string;
  /** VECTOR 自定义路径（SVG path d，24×24 坐标系） */
  vectorD?: string;
  /**
   * Tailwind class 字符串——**模型熟悉的表达通道**，替代手写 layout/style 枚举。
   *
   * 动因：`widthMode: FILL` / `padding:[上,右,下,左]` 这类字段模型从未见过，
   * 只能盲写；而 `flex items-center gap-3 px-4` 它见过几百万次。所以给一个
   * 「用 class 描述布局」的入口，由确定性映射器转回 layout/style（见 `tailwind.ts`）。
   *
   * 优先级：显式 `layout` / `style` 字段**覆盖** className 解析结果（精确控制优先）。
   * 只支持可无损映射的受控子集；映射器不认识的 class 会进违例清单，不静默丢弃。
   */
  className?: string;
  layout?: AiLayoutSpec;
  style?: AiStyleSpec;
  children?: AiNodeSpec[];
}

/** prompt → 新页面草稿 */
export interface AiPageDraft {
  kind: 'page';
  /** 页面名（中文短语） */
  name: string;
  /** 视口宽（缺省 375） */
  width?: number;
  /** 视口高（缺省 812） */
  height?: number;
  /** 页面底色：hex 或 @token */
  background?: string;
  /** 页面内容根：其 children 成为 PAGE 的直接子项，layout 的 padding/gap/align 落到 PAGE 根 */
  root: AiNodeSpec;
}

/**
 * 编辑指令：白名单动作（plan W4：store action 子集）
 *
 * `updateStyle` / `updateLayout` 都接受 `className`，与生成侧同一套 Tailwind 方言：
 * 模型在编辑时也只会写 `flex items-center gap-3`，不会写 `{mode:'HORIZONTAL',align:'CENTER'}`。
 * className 先落地，显式字段再覆盖同名字段（与 `buildNodeFromSpec` 同序）。
 */
export type AiEditOp =
  | { op: 'add'; parentId: string; index?: number; node: AiNodeSpec }
  | { op: 'remove'; targetId: string }
  | { op: 'move'; targetId: string; parentId: string; index?: number }
  | { op: 'setText'; targetId: string; text: string }
  | { op: 'updateStyle'; targetId: string; style?: AiStyleSpec; className?: string }
  | { op: 'updateLayout'; targetId: string; layout?: AiLayoutSpec; className?: string };

/** prompt + 选中 → 修改计划 */
export interface AiEditPlan {
  kind: 'edit';
  /** 一句话说明改了什么（面板展示 + 采纳前确认） */
  summary: string;
  actions: AiEditOp[];
}

export type AiOutput = AiPageDraft | AiEditPlan;

/** 校验违例（喂回自修环的唯一形状） */
export interface AiViolation {
  /** 数据路径，如 `root.children[2].style.background` */
  path: string;
  /** 中文短句，直接可读可喂模型 */
  message: string;
  /** 违例类别：schema=结构不合契约 / token=未知令牌 / ref=引用了不存在的节点 */
  kind: 'schema' | 'token' | 'ref' | 'limit';
}
