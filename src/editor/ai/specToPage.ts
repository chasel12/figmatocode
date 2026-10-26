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
import type { AiBorderSpec, AiLayoutSpec, AiNodeSpec, AiPageDraft, AiStatesSpec, AiStyleSpec, AiViolation } from './types';
import { parseClassNames } from './tailwind';

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
  '（只接受受控子集：flex/flex-col、items-*/justify-*、p*/gap-*、w-*/h-*、text-*/font-*、rounded*、bg-*/border-*、opacity-*、overflow-hidden）';

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

/** AiStyleSpec → StyleSchema（逐字段白名单搬运，不做任何隐式推断） */
export function buildStyle(spec: AiStyleSpec | undefined, pack: StylePack, path: string, violations: AiViolation[]): StyleSchema {
  const style: StyleSchema = {};
  if (!spec) return style;

  const bg: { value?: string } = {};
  applyColor(bg, `${path}.background`, spec.background, pack, violations);
  if (bg.value != null) style.background = bg.value;

  const fg: { value?: string } = {};
  applyColor(fg, `${path}.color`, spec.color, pack, violations);
  if (fg.value != null) style.color = fg.value;

  if (spec.borderRadius != null) style.borderRadius = Math.max(0, spec.borderRadius);
  const border = buildBorder(spec.border, pack, `${path}.border`, violations);
  if (border) style.border = border;
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
  if (spec.gap != null) layout.gap = Math.max(0, spec.gap);
  if (spec.align) layout.align = spec.align;
  if (spec.justify) layout.justify = spec.justify;
  if (spec.x != null) layout.x = spec.x;
  if (spec.y != null) layout.y = spec.y;
  // 叶子节点默认不参与主轴伸缩（避免模型漏写导致被压扁）
  if ((kind === 'TEXT' || kind === 'OVAL' || kind === 'IMAGE') && !spec.widthMode) {
    layout.widthMode = kind === 'TEXT' ? 'HUG' : 'FIXED';
  }
  return layout;
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
  node.style = {
    ...(node.style ?? {}),
    ...classStyle,
    ...buildStyle(spec.style, ctx.pack, `${path}.style`, violations),
  };

  if (node.type === 'TEXT' || node.type === 'BUTTON') {
    node.text = spec.text ?? (node.type === 'BUTTON' ? '按钮' : '文本');
  }
  if (node.type === 'IMAGE') {
    node.src = spec.src ?? '';
  }
  if (node.type === 'VECTOR') {
    const vectorNode = node as VectorNode;
    const d = spec.vectorD ?? (spec.icon ? ctx.icons?.[spec.icon] : undefined);
    if (spec.icon && !ctx.icons) {
      violations.push({ path: `${path}.icon`, kind: 'limit', message: `图标库未加载，无法解析 "${spec.icon}"` });
    } else if (spec.icon && !d) {
      violations.push({ path: `${path}.icon`, kind: 'limit', message: `图标库中不存在 "${spec.icon}"` });
    }
    vectorNode.vector = { d: d ?? 'M 0 0', width: 24, height: 24 };
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
      const stroke = resolveColorRef(spec.style?.color, ctx.pack).value ?? '#111111';
      vectorNode.style = { ...(vectorNode.style ?? {}), border: { width: 2, color: stroke, style: 'solid' } };
    }
  }

  if ('children' in node) {
    const kids = spec.children ?? [];
    (node as ContainerNode).children = kids.map((child, i) => buildNodeFromSpec(child, ctx, `${path}.children[${i}]`, violations));
  } else if (spec.children?.length) {
    violations.push({ path: `${path}.children`, kind: 'schema', message: `${spec.kind} 是叶子节点，不能有 children` });
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
 * 两条判定，只有**真给了坐标**才放行：
 *  1. 容器声明 ABSOLUTE，但没有任何子项带 x/y → 它没有坐标意图 → 降级 VERTICAL；
 *  2. 节点声明 ABSOLUTE 却无 x/y，且父是流式 → 会被放到父左上角压住兄弟 → 降级为父的 mode。
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
      });
    }

    if (!isContainer(node)) return;
    const kids = node.children;

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
      node.layout.mode = 'VERTICAL';
      violations.push({
        path: `${path}.layout.mode`,
        kind: 'schema',
        message: sameXY
          ? 'ABSOLUTE 容器内所有子项坐标完全相同，已改为 VERTICAL（否则子项会全部重叠）'
          : 'ABSOLUTE 容器内没有任何子项带 x/y，已改为 VERTICAL（否则子项会全部重叠在左上角）',
      });
    }

    const mode = node.layout.mode;
    kids.forEach((c, i) => visit(c, mode, `${path}.children[${i}]`));
  };

  visit(root, null, 'root');
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

  // root 单独处理（不走 buildNodeFromSpec），className 通道要在这里补齐
  const rootClass = parseClassNames(draft.root.className);
  reportUnknownClasses(rootClass.unknown, 'root', violations);
  Object.assign(page.root.layout, rootClass.layout);
  const rootClassStyle = rootClass.style;
  resolveClassColors(rootClassStyle, ctx.pack, 'root', violations);
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

  page.root.children = (draft.root.children ?? []).map((child, i) =>
    buildNodeFromSpec(child, ctx, `root.children[${i}]`, violations),
  );
  // 兜底规范化：必须在 children 建好之后（判定依赖子项是否带 x/y）
  normalizeAbsolute(page.root, violations);
  return { page, violations };
}

/** 统计节点数（面板显示 / 评测用） */
export function countNodes(node: UINode): number {
  let n = 1;
  if ('children' in node) for (const c of node.children) n += countNodes(c);
  return n;
}
