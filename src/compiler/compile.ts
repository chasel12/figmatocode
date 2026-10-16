import type { BoxPadding, FillLayer, LayoutSchema, UINode, UIPage } from '../schema/types';
import { hasText, isContainer } from '../schema/types';
import type { CompiledNode, CompiledPage, CSSDecl } from './css-model';
import { FONT_STACK } from '../font';
import { arcSpec, clipPathPolygon, polygonUnitPoints, starUnitPoints } from './shapes';
import { maskClipCss, maskDeclarations, maskIndexInGroup } from './mask';
import { imageAdjustFilter } from './imageAdjust';

const ROOT_FONT_FAMILY = FONT_STACK;

function px(value: number): string {
  return `${Math.round(value * 100) / 100}px`;
}

function isGradient(value: string): boolean {
  return value.includes('gradient');
}

function paddingValue(p: BoxPadding): string {
  const [t, r, b, l] = p;
  if (t === r && r === b && b === l) return px(t);
  if (t === b && r === l) return `${px(t)} ${px(r)}`;
  return `${px(t)} ${px(r)} ${px(b)} ${px(l)}`;
}

function hasPadding(p: BoxPadding): boolean {
  return p[0] !== 0 || p[1] !== 0 || p[2] !== 0 || p[3] !== 0;
}

function hasMargin(p: BoxPadding): boolean {
  return p[0] !== 0 || p[1] !== 0 || p[2] !== 0 || p[3] !== 0;
}

function radiusValue(r: number | [number, number, number, number]): string {
  if (typeof r === 'number') return px(r);
  return r.map(px).join(' ');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 颜色附加透明度：#hex/rgb(a) 解析；layerAlpha×stopOpacity 已乘好传入 */
function withAlpha(color: string, alpha: number): string {
  if (alpha >= 1) return color;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const h = hex[1];
    const r = parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16);
    const g = parseInt(h.length === 3 ? h[1] + h[1] : h.slice(2, 4), 16);
    const b = parseInt(h.length === 3 ? h[2] + h[2] : h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${round2(alpha)})`;
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(color);
  if (rgb) {
    const base = rgb[4] != null ? parseFloat(rgb[4]) : 1;
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${round2(base * alpha)})`;
  }
  return color;
}

/** FR-17 渐变停靠点出码（stop 色×层透明度） */
function stopsCss(f: FillLayer): string {
  const layerAlpha = f.opacity ?? 1;
  const stops = f.stops && f.stops.length ? f.stops : [
    { position: 0, color: '#000000' },
    { position: 1, color: '#FFFFFF' },
  ];
  return stops
    .map((s) => `${withAlpha(s.color, (s.opacity ?? 1) * layerAlpha)} ${round2(s.position * 100)}%`)
    .join(', ');
}

/** FR-17/FR-47 单层 fill→background-image 片段：Figma 向量角(0=右,顺时针) → CSS(+90) */
function fillLayerCss(f: FillLayer): string {
  if (f.type === 'SOLID') {
    const c = withAlpha(f.color ?? '#000000', f.opacity ?? 1);
    return `linear-gradient(${c}, ${c})`;
  }
  const stops = stopsCss(f);
  const angle = (((f.angle ?? 0) + 90) % 360 + 360) % 360;
  switch (f.type) {
    case 'GRADIENT_LINEAR':
      return `linear-gradient(${angle}deg, ${stops})`;
    case 'GRADIENT_RADIAL':
      return `radial-gradient(circle at 50% 50%, ${stops})`;
    case 'GRADIENT_ANGULAR':
      return `conic-gradient(from ${angle}deg, ${stops})`;
    case 'GRADIENT_DIAMOND':
      // FR-47：Diamond 无原生 CSS→线性近似（对照矩阵实测后再择优 SVG）
      return `linear-gradient(${angle}deg, ${stops})`;
    default:
      return `linear-gradient(${stops}, ${stops})`;
  }
}

function mapAlign(align: string): string {
  switch (align) {
    case 'CENTER':
      return 'center';
    case 'END':
      return 'flex-end';
    case 'STRETCH':
      return 'stretch';
    case 'BASELINE':
      return 'baseline';
    default:
      return 'flex-start';
  }
}

function mapJustify(justify: string): string {
  switch (justify) {
    case 'CENTER':
      return 'center';
    case 'END':
      return 'flex-end';
    case 'SPACE_BETWEEN':
      return 'space-between';
    default:
      return 'flex-start';
  }
}

interface NodeContext {
  isRoot: boolean;
  parentMode: LayoutSchema['mode'] | null;
  parentContentW: number | null;
  parentContentH: number | null;
  parentPadding: BoxPadding;
  parentIsAbsoluteContainer: boolean;
  /** FR-47：父级负 gap（CSS gap 不收负值——转子项主轴负 margin，仅首个非首子生效） */
  parentNegGap: number;
  /** FR-47：同父下的流式子序号（首个=0 不加负 margin） */
  childIndex: number;
  /** FR-23：父组内的蒙版节点（组内最上方可见图层）；null = 本节点未被蒙版裁切 */
  maskNode: UINode | null;
  viewport: { width: number; height: number };
}

/** FR-23 蒙版查取：ctx 里携带的兄弟蒙版；蒙版自身不裁切自己（compileNode 传 null） */
function maskNodeOf(ctx: NodeContext): UINode | null {
  return ctx.maskNode;
}

/**
 * Layout + Responsive + Style Compiler：UI AST → CSS Model。
 *
 * 响应式规则：
 * - 根节点 width → 100%，绝不固化视口宽度
 * - FIXED 尺寸等于父级内容尺寸 → 100%（等价 FILL）
 * - FILL 主轴 → flex-grow，交叉轴 → 100%
 * - HUG → fit-content
 */
export function compilePage(page: UIPage): CompiledPage {
  const nodes: CompiledNode[] = [];
  const classNames = buildClassNames(page);

  const root = page.root;
  const [, pr, , pl] = root.layout.padding ?? [0, 0, 0, 0];
  const rootContentW = (root.layout.width ?? page.viewport.width) - pl - pr;

  compileNode(root, classNames, nodes, {
    isRoot: true,
    parentMode: null,
    parentContentW: null,
    parentContentH: null,
    parentPadding: [0, 0, 0, 0],
    parentIsAbsoluteContainer: false,
    parentNegGap: 0,
    childIndex: 0,
    maskNode: null,
    viewport: page.viewport,
  });
  void rootContentW;

  return {
    pageId: page.id,
    viewport: page.viewport,
    nodes,
  };
}

function compileNode(
  node: UINode,
  classNames: Record<string, string>,
  out: CompiledNode[],
  ctx: NodeContext,
): void {
  // FR-14：Slice 仅圈定导出区域（画布虚线框），不生成出码节点——父 flow 自然不占位
  if (node.type === 'SLICE') return;
  const css = compileDeclarations(node, ctx);
  out.push({ id: node.id, className: classNames[node.id], css });

  if (!isContainer(node) || node.type === 'RECTANGLE') return;

  const L = node.layout;
  const [pt, pr, pb, pl] = L.padding ?? [0, 0, 0, 0];
  const baseW =
    L.widthMode === 'FIXED' && L.width != null ? L.width : ctx.isRoot ? ctx.viewport.width : ctx.parentContentW;
  const contentW = baseW != null ? baseW - pl - pr : null;
  const baseH =
    L.heightMode === 'FIXED' && L.height != null ? L.height : ctx.parentContentH;
  const contentH = baseH != null ? baseH - pt - pb : null;

  // FR-47：负 gap→margin 修正（CSS gap 不收负值；WRAP 行列模型不适用——报备走 gap 原值口径）
  const negGap = L.mode !== 'ABSOLUTE' && L.wrap !== 'WRAP' && (L.gap ?? 0) < 0 ? L.gap! : 0;
  // FR-23：蒙版组**显式声明**才生效。
  // 显式条件：容器自身 `layout.clipContent = true`（=「本容器裁切子项」，语义天然吻合，
  // 且是既有字段、无需改 types.ts）。**不做「末位子即蒙版」的隐式推断**——
  // 那会把任何「矩形后跟圆角矩形/椭圆」的普通 Frame 误当蒙版组，给前位子注入
  // border-radius/overflow/clip-path，静默改变正常页面出码（已由探针测试证实）。
  const maskIdx = L.clipContent ? maskIndexInGroup(node.children) : -1;
  const groupMask = maskIdx >= 0 ? node.children[maskIdx] : null;
  let childIndex = 0;
  for (const child of node.children) {
    compileNode(child, classNames, out, {
      isRoot: false,
      parentMode: L.mode,
      parentContentW: contentW != null && !Number.isNaN(contentW) ? contentW : null,
      parentContentH: contentH,
      parentPadding: L.padding ?? [0, 0, 0, 0],
      parentIsAbsoluteContainer: L.mode === 'ABSOLUTE' || child.layout.mode === 'ABSOLUTE',
      parentNegGap: negGap,
      childIndex: child.layout.mode === 'ABSOLUTE' ? 0 : childIndex,
      maskNode: child === groupMask ? null : groupMask,
      viewport: ctx.viewport,
    });
    if (child.layout.mode !== 'ABSOLUTE') childIndex += 1;
  }
}

function compileDeclarations(node: UINode, ctx: NodeContext): CSSDecl {
  const css: CSSDecl = {};
  const L = node.layout;
  const S = node.style ?? {};
  const isRoot = ctx.isRoot;
  const isText = hasText(node);
  const isButton = node.type === 'BUTTON';
  const absChild = ctx.parentIsAbsoluteContainer;

  css['box-sizing'] = 'border-box';

  // ---- 容器布局 ----
  if (isContainer(node) && node.type !== 'RECTANGLE') {
    if (L.mode === 'VERTICAL') {
      css['display'] = 'flex';
      css['flex-direction'] = 'column';
    } else if (L.mode === 'HORIZONTAL') {
      css['display'] = 'flex';
      css['flex-direction'] = 'row';
    } else {
      css['position'] = 'relative';
    }

    if (L.mode !== 'ABSOLUTE') {
      // FR-36：wrap 折行（gap 主轴 / gapCross 交叉轴，缺省交叉轴沿用 gap）；负 gap 按 Figma 允许
      if (L.wrap === 'WRAP') {
        css['flex-wrap'] = 'wrap';
        const cross = L.gapCross ?? L.gap ?? 0;
        const rowGap = L.mode === 'VERTICAL' ? L.gap ?? 0 : cross;
        const colGap = L.mode === 'VERTICAL' ? cross : L.gap ?? 0;
        if (rowGap !== 0 || colGap !== 0) css['gap'] = `${px(rowGap)} ${px(colGap)}`;
      } else if ((L.gap ?? 0) > 0) {
        css['gap'] = px(L.gap ?? 0);
      }
      // FR-47：负 gap 不出 gap（CSS 不收负值）——转子项主轴负 margin（见下方 margin 段）
      const align = L.align ?? 'START';
      if (align !== 'START') css['align-items'] = mapAlign(align);
      const justify = L.justify ?? 'START';
      if (justify !== 'START') css['justify-content'] = mapJustify(justify);
      if (L.clipContent) css['overflow'] = 'hidden';
    } else if (L.clipContent) {
      css['overflow'] = 'hidden';
    }
  }

  // padding（叶子节点同样生效；BUTTON 必须显式输出以覆盖 UA 默认 padding）
  const padding = L.padding ?? [0, 0, 0, 0];
  if (hasPadding(padding) || isButton) css['padding'] = paddingValue(padding);

  // ---- 尺寸（Responsive Compiler）----
  const margin = L.margin ?? [0, 0, 0, 0];
  const [mt, mr, mb, ml] = margin;
  const hasSideMargin = ml !== 0 || mr !== 0;
  const hasBlockMargin = mt !== 0 || mb !== 0;

  const parentContentW = ctx.parentContentW;
  const parentContentH = ctx.parentContentH;
  const mainAxis = ctx.parentMode === 'VERTICAL' ? 'height' : 'width';
  // FR-47 flex 映射：主轴 FILL→1 1 0；HUG→0 0 auto（FILL 优先，避免 HUG 分支覆盖）
  let flexDecl: string | undefined;
  let hugFlex: string | undefined;

  // width
  if (isRoot) {
    css['width'] = '100%';
  } else if (L.widthMode === 'FIXED' && L.width != null) {
    const equalsParent = parentContentW != null && Math.abs(L.width - parentContentW) < 0.5;
    if (equalsParent) {
      css['width'] = hasSideMargin ? `calc(100% - ${px(ml + mr)})` : '100%';
    } else if (absChild) {
      css['width'] = px(L.width);
    } else {
      css['width'] = px(L.width);
    }
  } else if (L.widthMode === 'FILL') {
    if (absChild) {
      css['width'] = hasSideMargin ? `calc(100% - ${px(ml + mr)})` : '100%';
    } else if (mainAxis === 'width') {
      // 主轴 FILL → 交给 flex-grow（FR-47 字面：1 1 0）
      flexDecl = '1 1 0';
      css['min-width'] = '0';
    } else {
      css['width'] = hasSideMargin ? `calc(100% - ${px(ml + mr)})` : '100%';
    }
  } else if (L.widthMode === 'HUG' && !absChild) {
    css['width'] = 'fit-content';
    hugFlex = '0 0 auto';
  } else if (L.widthMode === 'HUG' && absChild) {
    css['width'] = 'max-content';
  }

  // height
  if (isRoot) {
    const rootH = L.heightMode === 'FIXED' && L.height != null ? L.height : null;
    css['min-height'] = rootH != null ? `max(${px(rootH)}, 100vh)` : '100vh';
  } else if (L.heightMode === 'FIXED' && L.height != null) {
    const equalsParent = parentContentH != null && Math.abs(L.height - parentContentH) < 0.5;
    if (equalsParent && !absChild) {
      css['height'] = hasBlockMargin ? `calc(100% - ${px(mt + mb)})` : '100%';
    } else {
      css['height'] = px(L.height);
    }
  } else if (L.heightMode === 'FILL') {
    if (absChild) {
      css['height'] = hasBlockMargin ? `calc(100% - ${px(mt + mb)})` : '100%';
    } else if (mainAxis === 'height') {
      flexDecl = '1 1 0';
      css['min-height'] = '0';
    } else if (parentContentH != null) {
      css['height'] = hasBlockMargin ? `calc(100% - ${px(mt + mb)})` : '100%';
    }
  } else if (L.heightMode === 'HUG' && !absChild) {
    css['height'] = 'fit-content';
    hugFlex = hugFlex ?? '0 0 auto';
  }

  // FR-47 flex 统一声明（FILL 主轴压过 HUG；后续 flex-grow 显式属性仍可覆盖 grow）
  const flexOut = flexDecl ?? hugFlex;
  if (flexOut) css['flex'] = flexOut;

  // flex-grow 显式属性
  if (L.flexGrow && L.flexGrow > 0 && !absChild) {
    css['flex-grow'] = String(L.flexGrow);
  }

  // FR-36 min/max 宽高约束（根除外：根 min-height 由 100vh 规则占用）
  if (!isRoot) {
    if (L.minWidth != null) css['min-width'] = px(L.minWidth);
    if (L.maxWidth != null) css['max-width'] = px(L.maxWidth);
    if (L.minHeight != null) css['min-height'] = px(L.minHeight);
    if (L.maxHeight != null) css['max-height'] = px(L.maxHeight);
  }

  // margin（FR-47：负 gap→首个流式子之后的主轴负 margin 修正）
  const negFix = !absChild && ctx.parentNegGap < 0 && ctx.childIndex > 0;
  const effMargin: BoxPadding = negFix
    ? ctx.parentMode === 'VERTICAL'
      ? [mt + ctx.parentNegGap, mr, mb, ml]
      : [mt, mr, mb, ml + ctx.parentNegGap]
    : margin;
  if (hasMargin(effMargin)) css['margin'] = paddingValue(effMargin);

  // ---- 绝对定位（FR-47：Constraints 5 档→定位映射）----
  if (absChild) {
    css['position'] = 'absolute';
    const hc = L.constraints?.horizontal ?? 'LEFT';
    const vc = L.constraints?.vertical ?? 'TOP';
    const x0 = (L.x ?? 0) + ml;
    const y0 = (L.y ?? 0) + mt;
    const pct = (v: number): string => `${Math.round(v * 10000) / 100}%`;
    // horizontal：LEFT=left px（缺省）/ RIGHT=right 边距 / CENTER=相对父中心 calc / SCALE=百分比 left+width
    if (hc === 'RIGHT' && parentContentW != null && L.width != null) {
      css['right'] = px(parentContentW - x0 - L.width);
      if (L.x == null && ml === 0) css['right'] = px(parentContentW - L.width);
    } else if (hc === 'CENTER' && parentContentW != null) {
      css['left'] = `calc(50% + ${px(x0 - parentContentW / 2)})`;
    } else if (hc === 'SCALE' && parentContentW != null) {
      css['left'] = pct(x0 / parentContentW);
      if (L.width != null) css['width'] = pct(L.width / parentContentW);
    } else {
      if (L.x != null || ml !== 0) css['left'] = px(x0);
      if (L.x == null && ml === 0) css['left'] = '0';
    }
    // vertical：TOP=top px（缺省）/ BOTTOM=bottom 边距 / CENTER=相对父中心 calc / SCALE=百分比 top+height
    if (vc === 'BOTTOM' && parentContentH != null && L.height != null) {
      css['bottom'] = px(parentContentH - y0 - L.height);
      if (L.y == null && mt === 0) css['bottom'] = px(parentContentH - L.height);
    } else if (vc === 'CENTER' && parentContentH != null) {
      css['top'] = `calc(50% + ${px(y0 - parentContentH / 2)})`;
    } else if (vc === 'SCALE' && parentContentH != null) {
      css['top'] = pct(y0 / parentContentH);
      if (L.height != null) css['height'] = pct(L.height / parentContentH);
    } else {
      if (L.y != null || mt !== 0) css['top'] = px(y0);
      if (L.y == null && mt === 0) css['top'] = '0';
    }
  }

  // ---- 样式 ----
  const arcN = S.arcData ? arcSpec(S.arcData.startingAngle, S.arcData.endingAngle) : null;
  const arcShaped =
    node.type === 'OVAL' && !!S.arcData && !!arcN && (arcN.sweep < 360 || (S.arcData?.innerRadius ?? 0) > 0);
  if (arcShaped && arcN && S.arcData) {
    // FR-16 弧形：conic-gradient 接管 fills（多层/渐变近似首色，LOG 报备），无内径=扇/环由 mask 打孔
    const a = S.arcData;
    const spec = arcN;
    const f0 = (S.fills ?? []).find((x) => x.visible !== false);
    const color = f0
      ? f0.type === 'SOLID'
        ? (f0.color ?? '#E8E8E8')
        : (f0.stops?.[0]?.color ?? f0.color ?? '#E8E8E8')
      : S.background && !isGradient(S.background)
        ? S.background
        : '#E8E8E8';
    // CSS conic 0=北顺时针；Figma 0=东 → from = 归一化起点 + 90
    const from = (spec.from + 90) % 360;
    css['background-image'] = `conic-gradient(from ${from}deg, ${color} 0deg ${spec.sweep}deg, transparent ${spec.sweep}deg 360deg)`;
    css['border-radius'] = '50%';
    const inner = Math.max(0, Math.min(1, a.innerRadius));
    if (inner > 0) {
      const pct = (inner * 100).toFixed(1);
      const mask = `radial-gradient(circle closest-side, transparent ${pct}%, black ${pct}%)`;
      css['mask-image'] = mask;
      css['-webkit-mask-image'] = mask;
    }
  } else if (node.type === 'VECTOR') {
    // FR-49：矢量视觉全在 <svg> 内（fill/stroke 由 svgOfVector 表达）——
    // 此处不出 background/border，否则会画出矩形底破坏逐像素对比。
  } else {
    if (S.fills && S.fills.length) {
      // FR-17 多层填充：数组序=面板序=CSS 层序（background-image 首项在上）；fills 接管旧 background
      const parts = S.fills.filter((f) => f.visible !== false).map(fillLayerCss);
      if (parts.length) css['background-image'] = parts.join(', ');
    } else if (S.background) {
      if (isGradient(S.background)) css['background'] = S.background;
      else css['background-color'] = S.background;
    }
  }
  if (node.type === 'OVAL') css['border-radius'] = '50%';
  else if (S.borderRadius != null) css['border-radius'] = radiusValue(S.borderRadius);
  if (node.type === 'POLYGON') css['clip-path'] = clipPathPolygon(polygonUnitPoints(S.pointCount ?? 3));
  else if (node.type === 'STAR') css['clip-path'] = clipPathPolygon(starUnitPoints(S.pointCount ?? 5, S.innerRadius ?? 0.38));
  if (S.cornerSmoothing != null && S.cornerSmoothing > 0 && node.type !== 'OVAL') css['corner-shape'] = 'squircle';
  // FR-23 蒙版出码：组内上方蒙版 → 下方图层裁切等价；与 clipContent 互斥（后者已出 overflow:hidden，不叠加 clip-path 以免双重裁切）
  if (node.type !== 'VECTOR' && !L.clipContent) {
    const maskDecls = maskDeclarations(maskClipCss(maskNodeOf(ctx)));
    for (const [prop, value] of Object.entries(maskDecls)) {
      // clip-path 已被 POLYGON/STAR 形状占用时不覆写（形状自身的轮廓优先）
      if (prop === 'clip-path' && css['clip-path']) continue;
      css[prop] = value;
    }
  }
  if (node.type === 'IMAGE') {
    // FR-20/FR-47 scaleMode→object-fit：Tile 走背景平铺（html 侧），Crop 近似 cover（裁切把手后续）
    const mode = S.imageScaleMode ?? 'FILL';
    if (mode !== 'TILE') css['object-fit'] = mode === 'FIT' ? 'contain' : 'cover';
    // FR-20 余项 7 项调整 → CSS filter（映射表单一事实源 src/compiler/imageAdjust.ts）
    const adjFilter = imageAdjustFilter(node.imageAdjustments);
    if (adjFilter) css['filter'] = adjFilter;
  }
  let outsideShadow = '';
  const b = S.border;
  const hasWidths = b?.widths && b.widths.some((w) => w > 0);
  if (node.type === 'LINE') {
    // LINE：height=0 + border-top 画线；rotation 出码 rotate（origin 0 50% 与画布端点一致）
    const lw = b?.width ?? 1;
    const lc = withAlpha(b?.color ?? '#000000', b?.opacity ?? 1);
    const ls = b?.dash ? 'dashed' : b?.style ?? 'solid';
    const headCap = b?.cap && b.cap.startsWith('ARROW') ? b.cap : null;
    if (headCap) {
      // FR-16 箭头端点：data-URI SVG 替代 border-top（两端同款；盒高含箭头头，LOG 报备几何差）
      const len = Math.max(L.width ?? 100, 1);
      const hl = Math.max(lw * 3, 8);
      const pad = Math.ceil(hl + lw);
      const h = pad * 2;
      const dash = b?.dash && b.dash[0] > 0 ? ` stroke-dasharray="${b.dash[0]} ${b.dash[1]}"` : '';
      const lcE = lc.replace(/#/g, '%23');
      const head = (cx: number, dir: number): string => {
        const y = pad;
        if (headCap === 'ARROW_CIRCLE') return `<circle cx="${cx}" cy="${y}" r="${(hl * 0.55).toFixed(1)}" fill="${lcE}"/>`;
        if (headCap === 'ARROW_DIAMOND' || headCap === 'ARROW_POLYGON') {
          const n = headCap === 'ARROW_DIAMOND' ? 4 : 6;
          const r = hl * 0.75;
          const base = dir > 0 ? 0 : Math.PI;
          const pts: string[] = [];
          for (let i = 0; i < n; i++) {
            const ang = base + (i * Math.PI * 2) / n;
            pts.push(`${(cx + r * Math.cos(ang)).toFixed(1)},${(y + r * Math.sin(ang)).toFixed(1)}`);
          }
          return `<polygon points="${pts.join(' ')}" fill="${lcE}" stroke="${lcE}" stroke-width="${lw}"/>`;
        }
        const tri = [
          `${cx},${y}`,
          `${cx - dir * hl},${(y - hl * 0.45).toFixed(1)}`,
          `${cx - dir * hl},${(y + hl * 0.45).toFixed(1)}`,
        ].join(' ');
        if (headCap === 'ARROW_LINES') return `<polygon points="${tri}" fill="none" stroke="${lcE}" stroke-width="${lw}"/>`;
        return `<polygon points="${tri}" fill="${lcE}"/>`;
      };
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${len}" height="${h}" viewBox="0 0 ${len} ${h}">` +
        `<line x1="0" y1="${pad}" x2="${len}" y2="${pad}" stroke="${lcE}" stroke-width="${lw}" stroke-linecap="${b?.cap === 'ROUND' ? 'round' : b?.cap === 'SQUARE' ? 'square' : 'butt'}"${dash}/>` +
        head(len, 1) +
        head(0, -1) +
        `</svg>`;
      css['height'] = px(h);
      css['background-image'] = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      css['background-repeat'] = 'no-repeat';
      css['background-size'] = '100% 100%';
    } else {
      css['height'] = '0';
      css['border-top'] = `${px(lw)} ${ls} ${lc}`;
    }
    if (S.rotation) css['transform'] = `rotate(${S.rotation}deg)`;
    css['transform-origin'] = '0 50%';
  } else if (node.type !== 'VECTOR' && !arcShaped && b && (b.width > 0 || hasWidths)) {
    // FR-18/FR-47：INSIDE→border（box-sizing:border-box）；CENTER→border 半宽+outline 外半；OUTSIDE→box-shadow 外扩
    // FR-49：VECTOR 排除——描边已由 <svg> 的 stroke 表达（避免 CSS border 重复描一圈矩形）
    const lineStyle = b.dash ? 'dashed' : b.style ?? 'solid';
    const color = withAlpha(b.color, b.opacity ?? 1);
    const align = b.align ?? 'INSIDE';
    if (hasWidths && b.widths) {
      // 四边独立：per-side border（CENTER/OUTSIDE 与分边组合的完全体依赖 SVG，近似 per-side，Edge Case 10 记录）
      const names = ['border-top', 'border-right', 'border-bottom', 'border-left'] as const;
      b.widths.forEach((w, i) => {
        if (w > 0) css[names[i]] = `${px(w)} ${lineStyle} ${color}`;
      });
    } else if (align === 'OUTSIDE') {
      outsideShadow = `0 0 0 ${px(b.width)} ${color}`;
    } else if (align === 'CENTER') {
      css['border'] = `${px(b.width / 2)} ${lineStyle} ${color}`;
      css['outline'] = `${px(b.width / 2)} ${lineStyle} ${color}`;
      css['outline-offset'] = '0';
    } else {
      css['border'] = `${px(b.width)} ${lineStyle} ${color}`;
    }
  }
  // FR-19 效果出码：数组序=渲染序；有 effects 时旧 boxShadow 不叠加（面板添加首条即迁移）
  const eff = (S.effects ?? []).filter((e) => e.visible !== false);
  const shadowParts: string[] = outsideShadow ? [outsideShadow] : [];
  const chainFilters: string[] = [];
  const backdropFilters: string[] = [];
  for (const e of eff) {
    if (e.kind === 'DROP_SHADOW') {
      shadowParts.push(`${px(e.x ?? 0)} ${px(e.y ?? 4)} ${px(e.blur ?? 4)} ${px(e.spread ?? 0)} ${e.color ?? 'rgba(0,0,0,0.2)'}`);
    } else if (e.kind === 'INNER_SHADOW') {
      shadowParts.push(`inset ${px(e.x ?? 0)} ${px(e.y ?? 4)} ${px(e.blur ?? 4)} ${px(e.spread ?? 0)} ${e.color ?? 'rgba(0,0,0,0.2)'}`);
    } else if (e.kind === 'LAYER_BLUR') {
      chainFilters.push(`blur(${px(e.radius ?? 4)})`);
    } else if (e.kind === 'BACKGROUND_BLUR') {
      backdropFilters.push(`blur(${px(e.radius ?? 12)})`);
    } else if (e.kind === 'PROGRESSIVE_BLUR') {
      // CSS 无渐进模糊原生：起始与主半径均值近似（对照矩阵标黄）
      const r = Math.max(1, Math.round(((e.startRadius ?? 0) + (e.radius ?? 16)) / 2));
      backdropFilters.push(`blur(${px(r)})`);
    } else if (e.kind === 'NOISE') {
      chainFilters.push(`url(#fx-noise-${node.id})`);
    } else if (e.kind === 'TEXTURE') {
      chainFilters.push(`url(#fx-texture-${node.id})`);
    } else if (e.kind === 'GLASS') {
      // Glass 7 参数→CSS 近似链（dispersion/chroma/edge 无原生，对照矩阵标黄）
      const b = Math.max(4, Math.round((e.depth ?? 8) + (e.refraction ?? 10) / 4));
      const sat = Math.round(e.saturation ?? 140);
      const bright = 100 + Math.round((e.highlight ?? 0) / 2);
      backdropFilters.push(`blur(${px(b)}) saturate(${sat}%) brightness(${bright}%)`);
    }
  }
  if (!eff.length && S.boxShadow) shadowParts.push(S.boxShadow); // 旧字段兼容：无 effects 时与 outsideStroke 并存
  if (shadowParts.length) css['box-shadow'] = shadowParts.join(', ');  if (chainFilters.length) css['filter'] = chainFilters.join(' ');
  if (backdropFilters.length) css['backdrop-filter'] = backdropFilters.join(' ');
  if (S.blendMode && S.blendMode !== 'NORMAL') css['mix-blend-mode'] = S.blendMode.toLowerCase().replace(/_/g, '-');
  if (S.opacity != null && S.opacity !== 1) css['opacity'] = String(S.opacity);

  // ---- 排版 ----
  if (isText || isButton) {
    const fontSize = S.fontSize ?? 16;
    css['font-family'] = S.fontFamily ?? ROOT_FONT_FAMILY;
    css['font-size'] = px(fontSize);
    css['font-weight'] = String(S.fontWeight ?? 400);
    // FR-15 行高单位：Auto 不输出（浏览器 normal≈1.2，画布/测量按 1.4 近似——LOG 报备）
    if (S.lineHeightMode === 'PERCENT') css['line-height'] = String((S.lineHeight ?? 140) / 100);
    else if (S.lineHeightMode !== 'AUTO') css['line-height'] = px(S.lineHeight ?? Math.round(fontSize * 1.4));
    // FR-47：文字出码平滑（macOS WebKit 渲染口径）
    css['-webkit-font-smoothing'] = 'antialiased';
    if (S.letterSpacing != null && S.letterSpacing !== 0) {
      // FR-15 字距 % = 字号百分比（CSS letter-spacing 不收 %，换算 em）
      css['letter-spacing'] = S.letterSpacingMode === 'PERCENT' ? `${S.letterSpacing / 100}em` : px(S.letterSpacing);
    }
    if (S.color) css['color'] = S.color;
    if (S.textAlign && S.textAlign !== 'left') css['text-align'] = S.textAlign;
    if (S.textWrap === false) {
      css['white-space'] = 'pre'; // FR-15 关自动换行：保留 \n 不折行
    } else {
      css['white-space'] = 'pre-wrap';
      css['word-break'] = 'break-word';
    }
    if (S.paragraphIndent) css['text-indent'] = px(S.paragraphIndent);
    if (S.textCase && S.textCase !== 'ORIGINAL') {
      css['text-transform'] =
        S.textCase === 'UPPER' ? 'uppercase' : S.textCase === 'LOWER' ? 'lowercase' : S.textCase === 'TITLE' ? 'capitalize' : 'small-caps';
    }
    if (S.textDecoration && S.textDecoration !== 'NONE') {
      css['text-decoration'] = S.textDecoration === 'UNDERLINE' ? 'underline' : 'line-through';
    }
    if (S.textTruncation === 'ENDING' && S.maxLines != null && S.maxLines > 0) {
      css['display'] = '-webkit-box';
      css['-webkit-line-clamp'] = String(S.maxLines);
      css['-webkit-box-orient'] = 'vertical';
      css['overflow'] = 'hidden';
      css['text-overflow'] = 'ellipsis';
    }
    if (S.openType) {
      const feats: string[] = [];
      if (S.openType.liga != null) feats.push(`"liga" ${S.openType.liga ? 1 : 0}`);
      if (S.openType.dlig != null) feats.push(`"dlig" ${S.openType.dlig ? 1 : 0}`);
      if (feats.length) css['font-feature-settings'] = feats.join(', ');
      if (S.openType.kern != null) css['font-kerning'] = S.openType.kern ? 'normal' : 'none';
    }
    // FR-15 垂直对齐（定高文本；truncate 的 -webkit-box 优先不叠加）
    if (
      isText &&
      S.textAlignVertical &&
      S.textAlignVertical !== 'TOP' &&
      L.heightMode === 'FIXED' &&
      L.height != null &&
      css['display'] !== '-webkit-box'
    ) {
      css['display'] = 'flex';
      css['flex-direction'] = 'column';
      css['justify-content'] = S.textAlignVertical === 'CENTER' ? 'center' : 'flex-end';
    }
  }

  if (isButton) {
    css['appearance'] = 'none';
    if (!css['border'] && !css['border-top']) css['border'] = 'none'; // 四边独立时不被 shorthand 重置
    css['cursor'] = 'pointer';
    css['display'] = css['display'] ?? 'flex';
    if (css['display'] === 'flex' && !css['align-items']) css['align-items'] = 'center';
    if (css['display'] === 'flex' && !css['justify-content']) css['justify-content'] = 'center';
  }

  if (isRoot && S.background) {
    css['font-family'] = S.fontFamily ?? ROOT_FONT_FAMILY;
  }

  return css;
}

function buildClassNames(page: UIPage): Record<string, string> {
  const counters: Record<string, number> = {};
  const map: Record<string, string> = {};
  const visit = (node: UINode): void => {
    const base = node.type.toLowerCase();
    counters[base] = (counters[base] ?? 0) + 1;
    map[node.id] = `${base}-${counters[base]}`;
    if (isContainer(node)) node.children.forEach(visit);
  };
  visit(page.root);
  return map;
}

export { buildClassNames };
