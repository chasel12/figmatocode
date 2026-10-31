/**
 * AI 生成质量的**结构指标**（唯一口径）。
 *
 * ## 为什么不用 Pixel Diff
 *
 * 同一个 prompt 跑两次，模型的输出不同（节点顺序、类名、装饰多少都会变），
 * 像素比对只会比出噪音，得不出「这次改动变好还是变坏」的结论。
 * 能稳定复现的只有结构量：节点数、用到了哪些字段、视觉元素的个数。
 *
 * ## 它测什么、不测什么
 *
 * 测：**回归**——「改了提示词 / few-shot 之后，模型是不是变懒了、字段是不是用得更少了」。
 * 不测：绝对质量。「节点多」不等于「好看」，指标只负责发现退化。
 *
 * ## 两个入口
 *
 * - `auditSpec`：对**模型输出**（`AiNodeSpec`，展开 repeat 之前）统计。
 *   能额外看到 `repeat` 的使用情况，是「模型怎么表达」的视角。
 * - `auditPage`：对**落地 AST**（`UIPage`，repeat 已展开）统计。
 *   这是「用户最终看到什么」的视角，用于对比生成结果与语料基线。
 */
import type { AiNodeSpec, AiPageDraft } from './types';
import type { UINode, UIPage } from '../../schema/types';

export interface AiMetrics {
  /** 节点总数 */
  nodes: number;
  /** 各节点类型计数（TEXT/FRAME/…） */
  kinds: Record<string, number>;
  /** 出现过的 layout 字段名 */
  layoutFields: string[];
  /** 出现过的 style 字段名 */
  styleFields: string[];
  /** 带效果的节点数（阴影/模糊） */
  effectNodes: number;
  /** 效果条目总数 */
  effectCount: number;
  /** 渐变条目数（填充渐变 + 描边渐变） */
  gradientCount: number;
  /** 带多层填充的节点数 */
  fillsNodes: number;
  /** 带装饰层的节点数 */
  decorationNodes: number;
  /** 装饰类型集合（SPOTLIGHT / MESH_GRADIENT …） */
  decorationKinds: string[];
  /** 带交互态的节点数 */
  statesNodes: number;
  /** 用 CSS Grid 的容器数 */
  gridNodes: number;
  /** 用 transform 的节点数 */
  transformNodes: number;
  /** 出现过的圆角值 */
  radii: number[];
  /** 出现过的字号 */
  fontSizes: number[];
  /** 出现过的字重 */
  fontWeights: number[];
  /** 出现过的颜色字面量（令牌解析后的 hex） */
  colors: string[];
  /** 带描边的节点数 */
  borderNodes: number;
  /** 文本字符总数 */
  textChars: number;
  /** 用 `repeat` 压缩的节点数（仅 spec 视角有值，page 视角恒为 0） */
  repeatNodes: number;
}

/** 累加器：两个遍历器共用的统计核心 */
class Tally {
  nodes = 0;
  kinds = new Map<string, number>();
  layout = new Set<string>();
  style = new Set<string>();
  effectNodes = 0;
  effectCount = 0;
  gradientCount = 0;
  fillsNodes = 0;
  decorationNodes = 0;
  decorationKinds = new Set<string>();
  statesNodes = 0;
  gridNodes = 0;
  transformNodes = 0;
  radii = new Set<number>();
  fontSizes = new Set<number>();
  fontWeights = new Set<number>();
  colors = new Set<string>();
  borderNodes = 0;
  textChars = 0;
  repeatNodes = 0;

  /** 两个视角的 style 结构一致（字段同名），统一在这里收 */
  addStyle(kind: string, s: Record<string, unknown> | undefined): void {
    this.kinds.set(kind, (this.kinds.get(kind) ?? 0) + 1);
    this.nodes += 1;
    if (!s) return;
    for (const [k, v] of Object.entries(s)) if (v !== undefined) this.style.add(k);

    const effects = s.effects as unknown[] | undefined;
    if (effects?.length) {
      this.effectNodes += 1;
      this.effectCount += effects.length;
    }
    const fills = s.fills as { gradient?: unknown; type?: string }[] | undefined;
    if (fills?.length) {
      this.fillsNodes += 1;
      this.gradientCount += fills.filter((f) => f.gradient || (f.type && f.type !== 'SOLID')).length;
    }
    const border = s.border as { color?: string; gradient?: unknown; fill?: unknown } | undefined;
    if (border) {
      this.borderNodes += 1;
      /**
       * 渐变描边有两个来源：AI 契约层写 `border.gradient`（`AiBorderSpec`），
       * 落地 AST 存 `border.fill`（`BorderSchema`，因为 Figma 那边是 strokePaints）。
       * 只判其中一个，统计出来永远是 0——这是「两套口径」的典型坑。
       */
      if (border.gradient || border.fill) this.gradientCount += 1;
      if (border.color) this.colors.add(border.color);
    }
    const decorations = s.decorations as { kind?: string }[] | undefined;
    if (decorations?.length) {
      this.decorationNodes += 1;
      for (const d of decorations) if (d.kind) this.decorationKinds.add(d.kind);
    }
    if (s.states && Object.keys(s.states as object).length) this.statesNodes += 1;
    if (s.grid && Object.keys(s.grid as object).length) this.gridNodes += 1;
    if (s.transform && Object.keys(s.transform as object).length) this.transformNodes += 1;

    const br = s.borderRadius as number | number[] | undefined;
    if (typeof br === 'number') this.radii.add(br);
    else if (Array.isArray(br)) br.forEach((r) => this.radii.add(r));
    if (typeof s.fontSize === 'number') this.fontSizes.add(s.fontSize);
    if (typeof s.fontWeight === 'number') this.fontWeights.add(s.fontWeight);
    if (typeof s.background === 'string') this.colors.add(s.background);
    if (typeof s.color === 'string') this.colors.add(s.color);
  }

  addLayout(layout: Record<string, unknown> | undefined): void {
    if (!layout) return;
    for (const [k, v] of Object.entries(layout)) if (v !== undefined) this.layout.add(k);
  }

  done(): AiMetrics {
    return {
      nodes: this.nodes,
      kinds: Object.fromEntries([...this.kinds.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
      layoutFields: [...this.layout].sort(),
      styleFields: [...this.style].sort(),
      effectNodes: this.effectNodes,
      effectCount: this.effectCount,
      gradientCount: this.gradientCount,
      fillsNodes: this.fillsNodes,
      decorationNodes: this.decorationNodes,
      decorationKinds: [...this.decorationKinds].sort(),
      statesNodes: this.statesNodes,
      gridNodes: this.gridNodes,
      transformNodes: this.transformNodes,
      radii: [...this.radii].sort((a, b) => a - b),
      fontSizes: [...this.fontSizes].sort((a, b) => a - b),
      fontWeights: [...this.fontWeights].sort((a, b) => a - b),
      colors: [...this.colors].sort(),
      borderNodes: this.borderNodes,
      textChars: this.textChars,
      repeatNodes: this.repeatNodes,
    };
  }
}

/** 对**模型输出**统计（repeat 未展开；`repeatNodes` 有意义） */
export function auditSpec(node: AiNodeSpec): AiMetrics {
  const t = new Tally();
  const visit = (n: AiNodeSpec): void => {
    t.addLayout(n.layout as unknown as Record<string, unknown> | undefined);
    t.addStyle(n.kind, n.style as unknown as Record<string, unknown> | undefined);
    if (n.repeat) t.repeatNodes += 1;
    const text = (n.text ?? '') as string;
    t.textChars += text.length;
    for (const c of n.children ?? []) visit(c);
  };
  visit(node);
  return t.done();
}

export function auditDraft(draft: AiPageDraft): AiMetrics {
  return auditSpec(draft.root);
}

/** 对**落地 AST**统计（repeat 已展开；`repeatNodes` 恒 0） */
export function auditPage(page: UIPage | UINode): AiMetrics {
  const t = new Tally();
  const root: UINode = 'root' in page ? (page as UIPage).root : (page as UINode);
  const visit = (n: UINode): void => {
    t.addLayout(n.layout as unknown as Record<string, unknown> | undefined);
    t.addStyle(n.type, n.style as unknown as Record<string, unknown> | undefined);
    const text = (n as { text?: string }).text ?? '';
    t.textChars += text.length;
    for (const c of (n as { children?: UINode[] }).children ?? []) visit(c);
  };
  visit(root);
  return t.done();
}

/** 指标里「越大越好」的那几个——用于基线的涨跌判定 */
export const HIGHER_IS_BETTER: readonly (keyof AiMetrics)[] = [
  'nodes',
  'effectNodes',
  'effectCount',
  'gradientCount',
  'fillsNodes',
  'decorationNodes',
  'statesNodes',
  'gridNodes',
  'transformNodes',
  'borderNodes',
  'textChars',
];

/** 一条指标的可读摘要（脚本与测试共用，避免两处各写一份格式） */
export function formatMetrics(m: AiMetrics): string {
  return [
    `节点 ${m.nodes}`,
    `样式字段 ${m.styleFields.length}`,
    `阴影节点 ${m.effectNodes}`,
    `装饰节点 ${m.decorationNodes}`,
    `交互态 ${m.statesNodes}`,
    `网格 ${m.gridNodes}`,
    `渐变 ${m.gradientCount}`,
    `圆角档 ${m.radii.length}`,
    `字号档 ${m.fontSizes.length}`,
    `颜色 ${m.colors.length}`,
    `文本 ${m.textChars} 字`,
  ].join(' · ');
}
