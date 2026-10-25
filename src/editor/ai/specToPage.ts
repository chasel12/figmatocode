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
import type { BorderSchema, ContainerNode, DecorationSpec, LayoutSchema, StyleSchema, UINode, UIPage, VectorNode } from '../../schema/types';
import { createNode, createPage, nextId } from '../../schema/factory';
import type { StylePack } from '../../tokens/packs/types';
import type { AiLayoutSpec, AiNodeSpec, AiPageDraft, AiStyleSpec, AiViolation } from './types';

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
  if (spec.border) {
    const bc: { value?: string } = {};
    applyColor(bc, `${path}.border.color`, spec.border.color, pack, violations);
    const border: BorderSchema = {
      width: Math.max(0, spec.border.width),
      color: bc.value ?? '#000000',
      style: spec.border.style ?? 'solid',
    };
    if (spec.border.gradient) {
      const g = spec.border.gradient;
      const fc: { value?: string } = {};
      const tc: { value?: string } = {};
      applyColor(fc, `${path}.border.gradient.from`, g.from, pack, violations);
      applyColor(tc, `${path}.border.gradient.to`, g.to, pack, violations);
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
    style.border = border;
  }
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

  Object.assign(node.layout, buildLayout(spec.layout, spec.kind));
  node.style = { ...(node.style ?? {}), ...buildStyle(spec.style, ctx.pack, `${path}.style`, violations) };

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
    // 图标默认 24×24 定尺；描边来自 style.color（Lucide 是描边型图标）
    if (spec.layout?.width == null) node.layout.width = 24;
    if (spec.layout?.height == null) node.layout.height = 24;
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
  return { page, violations };
}

/** 统计节点数（面板显示 / 评测用） */
export function countNodes(node: UINode): number {
  let n = 1;
  if ('children' in node) for (const c of node.children) n += countNodes(c);
  return n;
}
