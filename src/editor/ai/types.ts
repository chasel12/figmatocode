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
  /**
   * 布局模式：纵向堆叠 / 横向排列 / 绝对定位。
   *
   * **`ABSOLUTE` 有两个完全不同的用法**（本字段最容易搞错的地方）：
   * 1. 写在**容器**上 → 该容器变成「自由画布」，它的子项按各自的 x/y 摆放，
   *    且内部**失去 flex 排版能力**（不输出 gap/align/justify）；
   * 2. 写在**子项**上（父是 VERTICAL/HORIZONTAL）→ 该子项**从父的流里脱流**，
   *    用 x/y 相对父容器定位。但它自己的内部排版也会变成绝对定位，
   *    所以「脱流 + 内部居中/横排」不要用这个，用 `position: "ABSOLUTE"`。
   *
   * 只写 `x`/`y` 不给任何定位声明时，子项仍参与 flex 排布，坐标被**完全忽略**
   * （2026-10-31 实测：角标 x:28 / y:-4 全对，只漏了声明，结果和图标横排、
   * 还溢出 44px 的圆底被顶到圆外）。转换层会兜底补上，但请直接写全。
   */
  mode?: 'VERTICAL' | 'HORIZONTAL' | 'ABSOLUTE';
  widthMode?: 'FIXED' | 'FILL' | 'HUG';
  heightMode?: 'FIXED' | 'FILL' | 'HUG';
  width?: number;
  height?: number;
  /** 内边距 [上,右,下,左]，单位 px（8pt 网格） */
  padding?: [number, number, number, number];
  /**
   * 外边距 [上,右,下,左]，单位 px（8pt 网格）。
   * 与 `padding` 一样走 4 元组；**不支持 auto**（居中请用父容器 align/justify）。
   */
  margin?: [number, number, number, number];
  /** 主轴间距 px */
  gap?: number;
  align?: 'START' | 'CENTER' | 'END' | 'STRETCH' | 'BASELINE';
  justify?: 'START' | 'CENTER' | 'END' | 'SPACE_BETWEEN';
  /**
   * 绝对定位横坐标：相对**父容器内边距左上角**，单位 px，**可为负**。
   *
   * 生效条件：本节点声明了 `position: "ABSOLUTE"`（或父容器是 `mode: "ABSOLUTE"`）。
   * 典型写法——44×44 图标底右上角挂数字角标：
   * `{"name":"角标","layout":{"mode":"VERTICAL","position":"ABSOLUTE",
   *  "x":28,"y":-4,"width":18,"height":18,"align":"CENTER","justify":"CENTER"}}`
   */
  x?: number;
  /** 绝对定位纵坐标，语义同 `x`（可为负，负值 = 溢出父容器上边缘） */
  y?: number;
  /**
   * 自身定位方式。**与 `mode` 严格分工**：`mode` 管「我内部怎么排」，`position` 管
   * 「我相对谁定位」。
   *
   * - `FIXED`：固定在**视口**。移动端固定底栏 / 悬浮按钮用它，`mode` 仍可写
   *   `HORIZONTAL` ——「固定在屏幕底部的横向 flex 栏」只能这么表达。
   * - `STICKY`：滚动到边界时吸附。
   * - `ABSOLUTE`：相对**父容器**用 `x`/`y` 定位，**不占父的流**，但**内部照常排版**。
   *
   * ## 为什么需要 `position: "ABSOLUTE"` 而不直接用 `mode: "ABSOLUTE"`
   *
   * `mode: "ABSOLUTE"` 会连带把**自己的内部排版**也变成绝对定位（`compile.ts` 在
   * mode=ABSOLUTE 下不输出 gap/align/justify），于是「脱流 + 内部居中」这种最常见的
   * 组合表达不出来。典型例子就是**图标右上角的数字角标**：18×18 圆底要脱流挂到角上，
   * 里面的数字还要水平垂直居中。正确写法：
   *
   * ```json
   * {"name":"角标","layout":{"mode":"VERTICAL","position":"ABSOLUTE",
   *  "x":28,"y":-4,"width":18,"height":18,"align":"CENTER","justify":"CENTER"}}
   * ```
   *
   * 注意：`FIXED` 是**出码侧**语义，画布不预览（编辑器里它就是普通节点）；
   * `ABSOLUTE` 画布会预览（按 x/y 摆放）。
   */
  position?: 'FIXED' | 'STICKY' | 'ABSOLUTE';
  /** STICKY/FIXED 距顶 px（与 stickyBottom 二选一，同时给时 top 优先） */
  stickyTop?: number;
  /** STICKY/FIXED 距底 px —— 固定底栏用这个 */
  stickyBottom?: number;
}

/**
 * 模型可表达的效果（阴影 / 两种模糊）。
 *
 * `LAYER_BLUR` 与 `BACKGROUND_BLUR` **必须分开**，它们出码到不同的 CSS 属性：
 * - `LAYER_BLUR` → `filter: blur()`，**糊掉元素自身**，用于光晕/发光垫层；
 * - `BACKGROUND_BLUR` → `backdrop-filter: blur()`，**糊它背后的东西**，用于毛玻璃浮层。
 *
 * 混用会让产物直接失效：把 `LAYER_BLUR` 加在色条/图标/文字上，元素本身就糊没了
 * （2026-10-29 s2 实测：模型给 24 条色条加了 LAYER_BLUR，整条带子变成一片模糊）。
 * `BACKGROUND_BLUR` 一直在 `compile.ts` 里实现（`backdropFilters`），此前只是没进 AI 类型。
 */
export interface AiEffectSpec {
  kind: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
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

/** 填充层的一个停靠点 */
export interface AiFillStop {
  /** 0-1 */
  position: number;
  /** hex 或令牌引用 */
  color: string;
  /** 0-1，缺省 1 */
  opacity?: number;
}

/**
 * 填充层（`StyleSchema.fills` 的 AI 投影）。
 *
 * ## 为什么需要它
 *
 * `background` 只能表达**一种**颜色，而现代 UI 的按钮、卡片底、头图几乎都是渐变或
 * 「渐变叠在底色上」。这是 `AiStyleSpec` 相对 `StyleSchema` 唯一真正缺失的表达力
 * ——其余差集（`fontFamily` / `layoutGrids` / `blendMode`）都是故意不给的。
 *
 * ## 与 `background` 的关系
 *
 * 两者可以共存：`background` 是**渐变下面的底色**，`fills` 按数组序叠在上面
 * （数组序 = 面板序 = CSS 层序，首层在最上）。只写 `fills` 不写 `background` 也合法。
 *
 * ## 收窄
 *
 * `FillKind` 里有 5 种，这里只放 4 种：`GRADIENT_DIAMOND` 在移动端界面里几乎不出现，
 * 给了只会增加模型的错误面。
 */
export interface AiFillSpec {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR';
  /** SOLID 用：hex 或令牌引用 */
  color?: string;
  /** 层透明度 0-1，缺省 1 */
  opacity?: number;
  /** 单层显隐，缺省 true */
  visible?: boolean;
  /** 渐变角 deg（Figma 向量角，0=向右顺时针）；缺省 90 = 自上而下 */
  angle?: number;
  /** 渐变停靠点，2~5 个，按 position 升序 */
  stops?: AiFillStop[];
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
  /** 交互态的多层填充（如 hover 时换成渐变底） */
  fills?: AiFillSpec[];
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
  /** FR-17 多层填充（数组序 = CSS 层序，首层在上）；渐变按钮/渐变卡片底用它 */
  fills?: AiFillSpec[];
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
  /**
   * 字体族。**只接受受控名字，不接受任意 CSS 字符串。**
   *
   * 取值两路：① 风格包提供的 family 名（如 `"Inter"` / `"Space Grotesk"`）；
   * ② 固定别名 —— `sans` / `serif` / `kai` / `round` / `mono`（也收中文名
   * `黑体` / `宋体` / `楷体` / `圆体` / `等宽`）。
   *
   * 为什么必须受控：产物是单文件 HTML，字体只能靠本机已装的系统字体或已内嵌的
   * woff2。模型若写 `"Noto Serif SC"` 而机器没装，浏览器静默退回默认字体——
   * 字段在、违例 0 条、像素基线正常，**只有肉眼能发现**「怎么还是黑体」。
   * 这与 `writing-mode` 那类真缺字段不同，是「给了但会假成功」，所以卡在转换层。
   */
  fontFamily?: string;
  /** 大小写变换（中文无效果，只对西文标签/眉标有意义） */
  textCase?: 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS';
  /** 文字装饰线（下划线强调、删除价） */
  textDecoration?: 'UNDERLINE' | 'STRIKETHROUGH';
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  opacity?: number;
  effects?: AiEffectSpec[];
}

/**
 * 重复（**结构级方言**，与 `className` 同策略：解析完即丢弃，AST 不存）
 *
 * ## 为什么需要它
 *
 * AST 每个节点有固定骨架开销（`kind` + `name` + `className` 约 60~80 字符），
 * 而 HTML 一个 `<div class="cell">14</div>` 只要 30 字符。实测（`docs/ai-ab-report.md` 附录 B）：
 * 模型画日历只能一格一格写，42 个格子里真正有信息量的只有 `14`、`力量` 两个词，
 * 其余全是重复描述「我是一个格子」。输出预算被格式占满，于是日历从 3 周缩到 2 周、
 * 底部导航直接消失。
 *
 * `repeat` 让模型**写一遍模板 + 说重复几次**，展开由转换层确定性完成。
 * 省下的预算用于画更多内容——这是 AST 相对「直接写代码」唯一能反超的地方，
 * 因为静态 HTML 表达不了「重复」（`for` 循环是运行时行为，产物不可编辑）。
 *
 * ## 为什么不进 AST
 *
 * 展开后就是 N 个普通节点，编译 / 画布 / `.fig` 往返 / 比对口径全部零改动。
 * 代价是「改模板不能影响实例」——那是完整版（AST 原生支持）才有的能力，
 * 需要引入 Figma 的 component-instance 概念，属另一个量级的改动。
 */
export interface AiRepeatSpec {
  /** 重复次数（1~60，超限报违例不静默截断） */
  count: number;
  /**
   * 逐项取值，两种形态：
   *
   * - **位置式** `string[]` → 填 `{{value}}`，长度不足循环取用；
   * - **命名式** `Record<string, string[]>` → 填 `{{键名}}`，每个键各自循环取用。
   *
   * ## 为什么必须有两种（2026-10-29 补）
   *
   * 只有位置式时，一张卡里**两个**文本节点拿不到两个不同的逐项值：
   * `values:["炭烧腰果"]` 只能驱动 `{{value}}`，价格那一格要么写死、要么也是腰果。
   * 实测后果：零食商城首页 8 张商品卡全叫「炭烧腰果 168g / ¥29.9」——
   * 而商品网格正是 repeat 最该用的地方（逐卡手写 8 次会吃光输出预算）。
   *
   * 命名式让 `{"name":[...],"price":[...]}` 一次驱动多个格子，仍是**同一份模板**，
   * 展开后照旧是普通节点，AST 不存任何 repeat 痕迹。
   *
   * ## 降级规则（与位置式一致：不报违例）
   *
   * 命名式里**缺某个键**时该占位符降级成序号；位置式给了命名占位符同理。
   * 报违例会整页失败，而模型在深层嵌套里极易把键名写错一个字母——
   * 降级后用户看到的是「第 N 格」，不是空白也不是报错。
   */
  values?: string[] | Record<string, string[]>;
  /**
   * 逐项样式：与 `values` 按同一个 index 对齐，第 i 份克隆额外覆盖 `styles[i]`。
   *
   * ## 为什么需要它
   *
   * `values` 只能填**字符串占位符**，而模板是共享的——样式字段拿不到逐项值。
   * 于是「24 个节气色条各一个颜色」在 repeat 下结构性不可表达：24 条只能共用一个色。
   * 而 24 条恰恰是靠 repeat 才画得起的（逐条手写会把输出预算吃光）。
   * 实测见 `docs/ai-ab-report.md` 附录 G.3。
   *
   * ## 用法约束
   *
   * - 只放**配色/圆角/透明度**这类逐项差异，别放布局（布局逐项不同请拆成独立节点）；
   * - 长度可以短于 `count`，缺的位置用模板原值（不报违例）；
   * - 展开后就是普通节点，AST 不存 `styles`，编译 / 画布 / `.fig` 往返零改动。
   */
  styles?: Array<Partial<AiStyleSpec>>;
}

export interface AiNodeSpec {
  kind: AiNodeKind;
  /** 图层名（用于人读与后续编辑定位，建议语义化中文/英文短语） */
  name?: string;
  /** TEXT/BUTTON 的文案 */
  text?: string;
  /** IMAGE 的图片地址（可为空占位） */
  src?: string;
  /**
   * IMAGE 的替代文本（WCAG 1.1.1）。
   *
   * **这是给读屏器念的句子，不是图层名**：`name` 写「商品主图」是给编辑者看的，
   * `alt` 要写「芒果干包装正面，净含量 100g」——把内容说清楚，而不是把类别说一遍。
   * 装饰性图片（分割线、背景光晕）显式写空串 `""`，与「忘了写」区分开。
   *
   * 出码：H5 四端出 `alt`，小程序两端出 `aria-label`。
   */
  alt?: string;
  /**
   * VECTOR 图标名（lucide，24×24 线性图标）；与 `vectorD` 二选一。
   *
   * 提示词里列出的约 150 个是**高频推荐**，不是白名单——库里另有 1400 多个，
   * 直接写英文名（`cookie` / `popcorn` / `cup-soda`）同样有效；写中文语义名
   * （`零食` / `美妆` / `宠物`）会走别名表或标签检索。只有完全不相干的名字才判违例。
   *
   * 同一排的图标要逐项不同时，把 `icon` 写成 `"{{icon}}"`，在带 `repeat` 的那层
   * 用命名式 `values: { icon: [...] }` 逐项给。**不这么做的话，repeat 展开出的
   * 每一份图标完全相同**（5 个品类入口全是一个购物袋，就是这么来的）。
   */
  icon?: string;
  /** VECTOR 自定义路径（SVG path d，24×24 坐标系） */
  vectorD?: string;
  /**
   * 重复模板：给定时本节点被复制 `count` 份，每份内所有字符串里的
   * `{{value}}`（或 `{{键名}}`，见 `values` 命名式）/ `{{index}}` / `{{index0}}`
   * 被替换，`name` 自动加序号。
   * 展开在转换层完成，展开后的节点与原节点完全等价。
   */
  repeat?: AiRepeatSpec;
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

/** 整站规划里的一页（只有元信息，不含节点树） */
export interface AiSitePageSpec {
  /** 页面名（2~8 字中文短语）。**同时是导航串联的唯一依据**：别的页里出现同名文案即自动连到它 */
  name: string;
  /** 这一页放什么（一句话，喂给单页生成当需求） */
  brief: string;
  /** 入口页（有且只有一个；缺省取第一页） */
  entry?: boolean;
}

/**
 * 整站草稿：**只做规划，不含节点树**
 *
 * ## 为什么不塞进一次调用
 *
 * 三页节点树一次输出 ≈ 三倍 token，而输出预算是硬上限。实测（`docs/ai-ab-report.md` 附录 B）
 * 同一预算下模型会**先砍页数再砍内容**：日历从 3 周缩到 2 周、底部导航直接消失。
 * 一次画三页的结果是三页都残缺——比一页完整 + 两页空白还差，因为用户看不出哪里被砍了。
 *
 * 所以拆成「一次小输出的规划 + N 次单页生成」。规划那一次只输出页面名与一句话，
 * 几百 token 就够；每页生成复用同一条已验证的单页管线，质量与单页生成完全一致。
 *
 * ## 导航为什么不在契约里
 *
 * 「点导航项跳页」是**结构性事实**（导航文案 == 页面名），不是审美选择。
 * 让模型逐条写 `interactions` 只会多一个出错面：漏一条不会有任何报错，而跳不过去是硬伤。
 * 因此串联放在转换层（`site.ts` 的 `wireNavigation`），模型只负责把页面命名成用户会点的词。
 */
export interface AiSiteDraft {
  kind: 'site';
  /** 站点名 */
  name: string;
  /** 页面规划（2~6 页） */
  pages: AiSitePageSpec[];
}

/**
 * 编辑指令：白名单动作（plan W4：store action 子集）
 *
 * `updateStyle` / `updateLayout` 都接受 `className`，与生成侧同一套 Tailwind 方言：
 * 模型在编辑时也只会写 `flex items-center gap-3`，不会写 `{mode:'HORIZONTAL',align:'CENTER'}`。
 * className 先落地，显式字段再覆盖同名字段（与 `buildNodeFromSpec` 同序）。
 *
 * ## 批量（`targetIds`）
 *
 * 一条指令改多个节点。没有它时「把这 5 张卡的圆角都改成 12」要写 5 条指令——
 * 模型很容易漏一条，而漏掉不会有任何报错。
 * `targetId` 与 `targetIds` 至少给一个；两个都给时**合并去重**。
 *
 * ## 结构动作
 *
 * - `duplicate`：复制节点（含整棵子树）并插在原节点之后，`count` 份；
 * - `group`：把若干同父节点包进一个新 FRAME。
 */
export type AiEditOp =
  | { op: 'add'; parentId: string; index?: number; node: AiNodeSpec }
  | { op: 'remove'; targetId: string }
  | { op: 'move'; targetId: string; parentId: string; index?: number }
  | { op: 'setText'; targetId: string; text: string }
  | { op: 'duplicate'; targetId: string; count?: number }
  | { op: 'group'; targetIds: string[]; name?: string }
  | { op: 'updateStyle'; targetId?: string; targetIds?: string[]; style?: AiStyleSpec; className?: string }
  | { op: 'updateLayout'; targetId?: string; targetIds?: string[]; layout?: AiLayoutSpec; className?: string };

/** prompt + 选中 → 修改计划 */
export interface AiEditPlan {
  kind: 'edit';
  /** 一句话说明改了什么（面板展示 + 采纳前确认） */
  summary: string;
  actions: AiEditOp[];
}

export type AiOutput = AiPageDraft | AiSiteDraft | AiEditPlan;

/**
 * 设计参考（用户上传的 skill / 风格说明）。
 *
 * 它不是 AST 的一部分，也**不进** `UIProject` —— 它是「生成时的输入」，
 * 只影响审美，不影响输出契约。详见 `skills.ts` 顶部说明。
 */
export interface AiSkill {
  id: string;
  /** 面板显示名（默认取文件名） */
  name: string;
  /** 已归一化的正文（去 frontmatter、截断后的样子） */
  text: string;
  /** 关掉后仍保留在列表里，只是这次不注入 */
  enabled: boolean;
  addedAt: number;
}

/** 校验违例（喂回自修环的唯一形状） */
export interface AiViolation {
  /** 数据路径，如 `root.children[2].style.background` */
  path: string;
  /** 中文短句，直接可读可喂模型 */
  message: string;
  /** 违例类别：schema=结构不合契约 / token=未知令牌 / ref=引用了不存在的节点 */
  kind: 'schema' | 'token' | 'ref' | 'limit';
  /**
   * 归一化阶段**已经改好**的痕迹（`已改为…` 这类），产物本身合法。
   *
   * ## 为什么要区分
   *
   * 项目原则是「翻译成功就静默」：转换层能确定性地改对，就不该让模型再试一轮——
   * 产物一样，只多烧一次调用。但归一化又会顺手把「改了什么」记进违例数组，
   * 于是 `runPageGeneration` 看到数组非空就判失败、自修用尽后**整站生成抛异常**。
   *
   * 实测（零食商城 2026-10-29）：商品详情页把「顶部大图区」写成
   * `mode:ABSOLUTE` 却没给 x/y——归一化正确地改回跟随父容器排版，
   * 同时报了 3 条违例，两次重跑都在这一页失败，前 5 页全部白跑。
   *
   * 所以：`autoFixed` 的违例**不进自修环、不判失败**，只作为面板上的说明。
   * 真需要模型改的（未知令牌、不支持的 class、缺 height）不带这个标记。
   */
  autoFixed?: boolean;
}
