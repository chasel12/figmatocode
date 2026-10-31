/**
 * `.fig` 的**旁挂层**（`meta.json` 里的 `ui_compiler_extras`）。
 *
 * 为什么需要它：`.fig` 的节点字段集由 Figma 的 kiwi schema 固定，不能随便加键；
 * 而 AST 里有相当一批字段 Figma 根本没有对应原语（装饰层、交互态、CSS Grid、
 * 段落缩进、flexShrink…），或者有原语但编码器会丢（非 FRAME 节点上的 `clipsContent`）。
 *
 * `meta.json` 是我们自己写的 JSON，Figma 不读，所以可以安全地放任意结构 ——
 * 代价只有一个：**换到别的工具打开时这些字段不可见**（但不影响 Figma 里的视觉）。
 *
 * 读取规则：版本号不符就整体忽略（宁可丢扩展字段，也不按错的结构读）。
 */
import type { ComponentDef, FlowDef, InstanceOverride, LayoutSchema, StyleSchema, StyleToken } from '../schema/types';

export const EXTRAS_VERSION = 1;

export interface ExtraNode {
  /* ---- 布局 ---- */
  /**
   * **叶子节点**自身的布局模式。Figma 只有容器的 `stackMode`，叶子没有这个概念，
   * 导入侧只能回落工厂默认值（TEXT=VERTICAL / BUTTON=HORIZONTAL）。
   * 但 `compile.ts` 恰恰用 `child.layout.mode === 'ABSOLUTE'` 判断「这个子项要绝对定位」，
   * 所以叶子模式丢了会直接改变出码 —— 必须存。
   */
  mode?: LayoutSchema['mode'];
  /**
   * 自身定位方式，直接复用 AST 的枚举（含 `ABSOLUTE`：脱流但内部仍走 flex）。
   * 旁挂而非原生：Figma 没有「相对父容器绝对定位但内部保留 auto layout」这个原语。
   */
  position?: LayoutSchema['position'];
  stickyTop?: number;
  stickyBottom?: number;
  margin?: [number, number, number, number];
  flexGrow?: number;
  flexShrink?: number;
  prevMode?: LayoutSchema['mode'];
  /**
   * `clipContent` 的旁挂补位。
   *
   * 原生有 `clipsContent`，但 **kiwi 只对 FRAME 类节点保留它** —— 写在 RECTANGLE /
   * ELLIPSE / TEXT 上会被编码器丢掉（实测探针读回来是 undefined）。非容器补一份旁挂。
   */
  clipContent?: boolean;

  /* ---- 样式 ---- */
  /**
   * 底色，仅在 `fills` 非空时旁挂。
   *
   * 原因：`fills` 非空时底色不再是独立 paint，而是「渐变叠层下面的那层颜色」，
   * 重建时无法与 `fills[0]` 区分 —— `fillsToStyle` 只能靠「首层是不是纯色」猜。
   * `null` 表示**明确没有底色**（区别于「这个字段没存过」）。
   */
  background?: string | null;
  /**
   * 描边的两个「Figma 的 NodeChange 里没有」的参数。
   * 其余描边字段（宽度/四边权重/颜色/对齐/虚线/端点/转角/渐变）都有原生字段，走原生。
   * `miterLimit` 只存在于矢量路径的 `StrokeData` 里，不在 NodeChange 上。
   */
  borderMiterLimit?: number;
  borderOpacity?: number;
  /**
   * 渐变描边时的**降级回退色**。
   * 渐变走 `strokePaints` 原生表达，但 `border.color` 是另一层语义（无渐变能力时的兜底），
   * 重建时只能从渐变的首个停靠色猜 —— 猜不到原值，只能旁挂。
   */
  borderColor?: string;
  /**
   * 描边线型。`dashPattern` 能表达「虚线」，但分不出 `dashed` 与 `dotted`
   * （Figma 没有 border-style，两者都只是不同的 dash 数组），所以单独记一份。
   */
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  rotation?: number;
  cornerSmoothing?: number;
  boxShadow?: string;
  imageScaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  arcData?: { startingAngle: number; endingAngle: number; innerRadius: number };
  paragraphIndent?: number;
  openType?: { liga?: boolean; kern?: boolean; dlig?: boolean };
  /**
   * B1/B2/B3 三类「Figma 没有可逆原语」的整块能力：装饰层、交互态、transform/grid。
   * 早先的做法是**直接丢弃并登记 KNOWN_LOSS**；有了旁挂层就不必丢了。
   */
  decorations?: StyleSchema['decorations'];
  states?: StyleSchema['states'];
  transform?: StyleSchema['transform'];
  grid?: StyleSchema['grid'];
  /**
   * 布局网格与效果：Figma 有 `layoutGrids` / `effects`，但字段集是子集 ——
   * `Effect.startRadius` / `beta` / `density` / `color2` / Glass 七参数、
   * 以及 `EffectType` 的多对一（`LAYER_BLUR` 与 `PROGRESSIVE_BLUR` 都写 `FOREGROUND_BLUR`）
   * 都表达不了。整份存下来，导入时「原生优先、旁挂补齐」。
   */
  layoutGrids?: StyleSchema['layoutGrids'];
  effects?: StyleSchema['effects'];

  /* ---- 组件实例（FR-25） ---- */
  /**
   * 实例标记。Figma 原生有 SYMBOL/INSTANCE 节点类型，但我们的导入器**没有**实现
   * 那套语义（`componentId` 在导入导出两侧曾完全不存在），所以组件关系一直丢：
   * 编辑器里做的实例，存 `.fig` 再打开就变成普通节点，切变体/更新主组件的传播能力全没。
   *
   * 旁挂一份是**最小可信修法**：自家往返保住，Figma 里看到的仍是普通帧（格式边界）。
   */
  componentId?: string;
  /** 实例覆盖（与 `componentId` 同用） */
  instanceOverrides?: InstanceOverride[];
}

/**
 * 项目级旁挂（`ui_compiler_extras.project`）。
 *
 * 节点级那张表按 nodeId 索引，装不下「组件表 / 样式表 / 流程表」这种项目级数据。
 * 早先这些**整个不写进 `.fig`**：`exportFig(pages, ...)` 的签名里就没有它们，
 * 于是存盘再打开，组件、命名样式、原型流程全部消失。
 */
export interface ExtraProject {
  /** FR-25 主组件表 */
  components?: Record<string, ComponentDef>;
  /** FR-27 命名样式表 */
  tokens?: StyleToken[];
  /** FR-39 原型流程 */
  flows?: FlowDef[];
}

/** 从 `meta.json` 里取出项目级旁挂；版本不符或结构不对返回空对象 */
export function readProjectExtras(meta: Record<string, unknown> | undefined): ExtraProject {
  const raw = meta?.ui_compiler_extras as { version?: number; project?: ExtraProject } | undefined;
  if (!raw || raw.version !== EXTRAS_VERSION || !raw.project) return {};
  return raw.project;
}

/** 从 `meta.json` 里取出旁挂表；版本不符或结构不对一律当空表 */
export function readExtras(meta: Record<string, unknown> | undefined): Record<string, ExtraNode> {
  const raw = meta?.ui_compiler_extras as { version?: number; nodes?: Record<string, ExtraNode> } | undefined;
  if (!raw || raw.version !== EXTRAS_VERSION || !raw.nodes) return {};
  return raw.nodes;
}
