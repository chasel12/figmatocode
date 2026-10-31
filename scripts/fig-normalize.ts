/**
 * `.fig` 往返的**唯一比对口径**。
 *
 * 为什么单独抽一个文件：这套口径原先在 `scripts/fig-check.ts`（门禁）和
 * `tests/fig.test.ts`（单测）各写了一份，而且两份不一样 ——
 * 单测少了 12 个布局字段、门禁少了「自绝对定位子项的 x/y」。结果就是
 * **同一个 bug 在一个地方红、在另一个地方绿**，而绿的那个还给了虚假的安全感。
 *
 * 现在两边都从这里 import，改口径只改一处。口径本身的设计见下面每段的注释。
 */
import type { UINode } from '../src/schema/types';

/**
 * 节点规范化：只比「结构与视觉属性」，抹掉三类必然差异。
 *
 * 1. **id / name**：往返后 id 重新分配，名字只影响图层列表，不影响渲染；
 * 2. **流式子项的 x/y**：父容器 HORIZONTAL / VERTICAL 时位置由 flex 决定，
 *    x/y 不参与编译（例外：自绝对定位子项，见下）；
 * 3. **缺省值**：AST 里 undefined 表示「按默认」，`.fig` 里一律是具体数值（0 / START / 空 padding）。
 */
export function normalize(node: UINode, parentMode?: string): unknown {
  const isContainer = 'children' in node;
  const pad = node.layout.padding ?? [0, 0, 0, 0];
  const rawWm = node.layout.widthMode;
  const rawHm = node.layout.heightMode;
  const layout = {
    // 叶子与容器统一比真实模式：`.fig` 不存「叶子自身的布局模式」，导入侧回落到工厂默认值，
    // 与 AST 的约定一致（TEXT=VERTICAL / BUTTON=HORIZONTAL / 矩形=VERTICAL）
    mode: node.layout.mode,
    // Figma 的 StackSize 没有 FILL（填充由 grow/stretch 表达），归一成 FIXED
    widthMode: rawWm === 'FILL' ? 'FIXED' : rawWm,
    heightMode: rawHm === 'FILL' ? 'FIXED' : rawHm,
    // HUG / FILL 的尺寸由布局决定；TEXT 的尺寸由字体度量决定（`.fig` 里存的是估算值，
    // 真实尺寸要 Figma 自己算）。这两类都不比数值，只比模式 —— 数值由 CSS 关兜底。
    width: rawWm === 'FIXED' && node.type !== 'TEXT' ? (node.layout.width ?? 0) : 0,
    height: rawHm === 'FIXED' && node.type !== 'TEXT' ? (node.layout.height ?? 0) : 0,
    /**
     * 流式子项（父容器 HORIZONTAL / VERTICAL）的 x/y **不参与编译** —— 位置由 flex 排布决定。
     * 这类节点在 AST 里可能残留 x/y（编辑器里先拖出来再加进流容器），`.fig` 不写、读回来是 0，
     * 属于等价差异，比对时统一抹成 0。
     *
     * **例外：自绝对定位子项**（`node.layout.mode === 'ABSOLUTE'`）不参与流，x/y 是它唯一的
     * 位置来源 —— 必须比。原先只看父容器模式，于是「VERTICAL 页里的自由摆放子项」往返丢
     * 坐标也一直是绿的。
     */
    x: node.layout.mode === 'ABSOLUTE' || !parentMode || parentMode === 'ABSOLUTE' ? (node.layout.x ?? 0) : 0,
    y: node.layout.mode === 'ABSOLUTE' || !parentMode || parentMode === 'ABSOLUTE' ? (node.layout.y ?? 0) : 0,
    padding: pad,
    gap: node.layout.gap ?? 0,
    gapCross: node.layout.gapCross ?? 0,
    align: node.layout.align ?? 'START',
    justify: node.layout.justify ?? 'START',
    clipContent: node.layout.clipContent ?? false,
    /**
     * Constraints 必须比 —— 曾经 `.fig` 往返完全没写这两个字段，而这里也没比，
     * 于是「另存再打开约束消失」这件事在门禁里一直是绿的。
     * 缺省（LEFT/TOP）两侧都规范成 undefined，等价即相等。
     */
    constraints:
      node.layout.constraints && !(node.layout.constraints.horizontal === 'LEFT' && node.layout.constraints.vertical === 'TOP')
        ? `${node.layout.constraints.horizontal}/${node.layout.constraints.vertical}`
        : undefined,
    /**
     * 下面这批原先**不在白名单里**，于是往返丢了也没人知道（`wrap` / min/max 甚至
     * 是「导入侧写了读取、导出侧从没写」的单向死代码）。现在靠 `meta.json` 旁挂层保住了。
     */
    position: node.layout.position ?? null,
    stickyTop: node.layout.stickyTop ?? null,
    stickyBottom: node.layout.stickyBottom ?? null,
    margin: node.layout.margin ?? null,
    flexGrow: node.layout.flexGrow ?? null,
    flexShrink: node.layout.flexShrink ?? null,
    wrap: node.layout.wrap ?? null,
    minWidth: node.layout.minWidth ?? null,
    maxWidth: node.layout.maxWidth ?? null,
    minHeight: node.layout.minHeight ?? null,
    maxHeight: node.layout.maxHeight ?? null,
    prevMode: node.layout.prevMode ?? null,
  };
  // 无 src 的 IMAGE 用 1×1 透明图 + 哨兵 hash 表达，能原样还原成 IMAGE，不再需要降级成 RECTANGLE
  const type = node.type;
  const base = {
    type,
    layout,
    style: normalizeStyle(node.style),
    visible: node.visible ?? true,
    locked: node.locked ?? false,
    ...(node.type === 'TEXT' ? { text: (node as { text: string }).text } : {}),
    ...(node.type === 'IMAGE' && (node as { src?: string }).src ? { hasSrc: true } : {}),
    /**
     * FR-25 组件实例。**曾经完全不在这个口径里**，于是「另存为 .fig 再打开，
     * 组件实例变成普通节点、组件表清空」这件事在门禁里一直是绿的
     * ——因为 19 页 demo 没有组件实例，而口径本身也看不见这两个字段。
     *
     * 现在导出侧写进 `meta.json` 旁挂、导入侧读回，这里必须一起比，
     * 否则「修了但没人验证」等于没修。
     */
    ...(node.componentId ? { componentId: node.componentId } : {}),
    ...(node.instanceOverrides?.length ? { instanceOverrides: node.instanceOverrides } : {}),
  };
  if (isContainer) {
    const kids = (node as { children: UINode[] }).children.map((k) => normalize(k, node.layout.mode));
    // 空 children 与「没有 children」等价（.fig 的矩形读回来是容器，但可能一个子项都没有）
    return kids.length > 0 ? { ...base, children: kids } : base;
  }
  return base;
}

/**
 * 样式规范化：
 * - 颜色小写；
 * - 单层 SOLID `fills` 与 `background` 是同一件事的两种写法（AST 两者都允许），统一成只留 background；
 * - 数值 0 与缺省等价（圆角 0 / 描边宽 0 / 透明度 1 都不该出现在差异里）；
 * - 「显式写出缺省值」与「不写」等价（见 `DEFAULTS`）。
 *
 * 装饰层 / 交互态 / transform / grid 曾经在这里被 `delete` 掉 —— 那等于把「必然丢失」
 * 写进口径。现在它们都由 `meta.json` 旁挂层保住，所以**保留比对**。
 */
export function normalizeStyle(style: UINode['style']): Record<string, unknown> {
  const out = { ...(lowerHex(style ?? {}) as Record<string, unknown>) };
  const fills = out.fills as { type?: string; color?: string }[] | undefined;
  if (Array.isArray(fills)) {
    if (fills.length === 1 && fills[0].type === 'SOLID' && (fills[0].color ?? '').toLowerCase() === String(out.background ?? '').toLowerCase()) {
      delete out.fills;
    }
  }
  if (out.borderRadius === 0) delete out.borderRadius;
  if (out.opacity === 1) delete out.opacity;
  const DEFAULTS: Record<string, unknown> = {
    textWrap: true,
    textCase: 'ORIGINAL',
    textDecoration: 'NONE',
    textTruncation: 'DISABLED',
    textAlignVertical: 'TOP',
    lineHeightMode: 'PIXELS',
    letterSpacingMode: 'PIXELS',
    imageScaleMode: 'FILL',
    blendMode: 'NORMAL',
    rotation: 0,
    cornerSmoothing: 0,
    letterSpacing: 0,
    paragraphSpacing: 0,
    paragraphIndent: 0,
  };
  for (const [k, v] of Object.entries(DEFAULTS)) {
    if (out[k] === v) delete out[k];
  }
  const border = out.border as { width?: number; style?: string; align?: string; dash?: number[] } | undefined;
  if (border && border.width === 0) {
    delete out.border;
  } else if (border) {
    // 实线 / INSIDE（AST 缺省对齐）/ 默认 dash 在两边都不写出来，比对前抹掉
    if (border.style === 'solid') delete border.style;
    if (border.align === 'INSIDE') delete border.align;
    if (Array.isArray(border.dash) && border.dash[0] === 4 && border.dash[1] === 4) delete border.dash;
  }
  return out;
}

/** 颜色统一小写（AST 里 "#FFFFFF" 与 "#ffffff" 是同一个颜色） */
export function lowerHex<T>(value: T): T {
  if (typeof value === 'string') return (value.startsWith('#') ? value.toLowerCase() : value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => lowerHex(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = lowerHex(v);
    return out as unknown as T;
  }
  return value;
}

/**
 * 数值统一保留 4 位小数。
 *
 * `.fig` 的数值字段是 **float32**（kiwi 编码决定），0.42 读回来是 0.41999998688697815；
 * 这不是信息丢失，只是精度表示不同，比对前必须归一。
 */
export function roundDeep<T>(value: T, digits: number): T {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return value;
    return Number(value.toFixed(digits)) as unknown as T;
  }
  if (Array.isArray(value)) return value.map((v) => roundDeep(v, digits)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = roundDeep(v, digits);
    return out as unknown as T;
  }
  return value;
}

/** 深比较，返回第一处差异的可读描述（无差异返回 null） */
export function deepEqual(a: unknown, b: unknown, path = ''): string | null {
  if (a === b) return null;
  if (typeof a !== typeof b) return `${path}: 类型不同 ${typeof a} vs ${typeof b}`;
  if (a === null || b === null || typeof a !== 'object') return `${path}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: 数组/对象不匹配`;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${path}: 长度 ${a.length} ≠ ${b.length}`;
    for (let i = 0; i < a.length; i += 1) {
      const diff = deepEqual(a[i], b[i], `${path}[${i}]`);
      if (diff) return diff;
    }
    return null;
  }
  const ka = Object.keys(a as Record<string, unknown>);
  const kb = Object.keys(b as Record<string, unknown>);
  for (const k of new Set([...ka, ...kb])) {
    const va = (a as Record<string, unknown>)[k];
    const vb = (b as Record<string, unknown>)[k];
    if (va === undefined && vb === undefined) continue;
    const diff = deepEqual(va, vb, `${path}.${k}`);
    if (diff) return diff;
  }
  return null;
}

/**
 * CSS 比较口径：只比**声明体集合**，不比选择器。
 * 理由：类名由节点 id 生成，往返后 id 重新分配（fig-N），选择器必然不同；
 * 但「每个盒子长什么样」应当逐条一致。
 * 页面根容器那条规则剔除——`.fig` 不承载页面底色。
 */
export function normalizeCss(css: string): string {
  const bodies = css.match(/\{[^}]*\}/g) ?? [];
  // 颜色大小写不影响渲染（AST 里 "#1677FF" 与 "#1677ff" 同色），比对前统一小写；
  // border-radius:0 与「不写圆角」等价（`.fig` 里圆角缺省就是 0，无法区分「显式 0」）
  const cleaned = bodies.map((b) =>
    b
      .replace(/\s+/g, '')
      .replace(/#[0-9a-fA-F]{3,8}/g, (m) => m.toLowerCase())
      .replace(/border-radius:0(px)?;?/g, '')
      // 0 带不带单位在 CSS 里等价（编译器对「无 x/y」与「x/y=0」会出两种写法）
      .replace(/0px(?=;|\}|$)/g, '0')
      // 效果滤镜的 id 由节点 id 派生（`fx-noise-<id>`），往返后 id 重新分配，
      // 抹掉后缀只留种类 —— 否则「同一个滤镜」会被记成两条差异
      .replace(/url\(#fx-([a-z]+)-[^)]*\)/g, 'url(#fx-$1)'),
  );
  if (cleaned.length > 0) cleaned.shift();
  return cleaned.sort().join('|');
}
