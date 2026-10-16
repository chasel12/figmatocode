/**
 * FR-23 蒙版：组内「下方图层被上方蒙版裁切」的出码等价。
 *
 * 等价映射（Figma → CSS）：
 *   圆角矩形/矩形  → target 上 `overflow: hidden` + `border-radius: <蒙版圆角>`
 *   椭圆(OVAL)     → target 上 `overflow: hidden` + `border-radius: 50%`
 *   矢量(VECTOR)   → target 上 `clip-path: path('<蒙版 d>')`
 *   不支持/退化    → 返回 clipPath:null，调用方不改 target 出码（宁可不动也不画错）
 *
 * 近似口径（报备）：
 *   - 只描述**形状裁切**，不描述亮度/alpha 蒙版（Figma 类型 != MASK 的亮度蒙版不保真）；
 *   - 蒙版节点的平移以绝对 left/top 表达，等价 CSS 的 clip-path 原点为**元素 border-box 左上角**，
 *     故在本模块内把 `path()` / `border-radius` 的坐标换算到 target 本地系；
 *   - VECTOR 蒙版的 d 直接进 `path()`：仅支持 px 绝对坐标语法，
 *     与 docs/schema-decisions.md §四.1（SVG 为矢量唯一权威表达）口径一致；
 *   - `clip-path` 与 `border-radius+overflow` 二选一——蒙版为矢量时圆角不再叠加表达。
 */
import type { UINode } from '../schema/types';
import { hasVectorPath } from '../generator/vector';

/** 蒙版目标几何（target 本地系的蒙版外接矩形，缺省 0 即与 target 同域） */
export interface MaskTargetGeom {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface MaskClipResult {
  /** `path('…')` / `inset(…)` / `circle(…)`；null = 该蒙版无可表达的裁切 */
  clipPath: string | null;
  /** 与 clipPath 并用的 overflow: hidden（Figma 组裁切语义） */
  overflow: 'hidden' | null;
  /** 圆角矩形类蒙版的 border-radius（px 或 50%） */
  borderRadius: string | null;
  /** 该等价来自哪种蒙版形态，供测试与报备追溯 */
  kind: 'RECT' | 'ROUNDED_RECT' | 'OVAL' | 'VECTOR' | 'NONE';
}

const num = (n: number): string => String(Math.round(n * 100) / 100);

function radiusValue(r: number | [number, number, number, number]): string {
  if (typeof r === 'number') return `${num(r)}px`;
  return r.map((v) => `${num(v)}px`).join(' ');
}

/** 四值圆角是否全为 0（含缺省） */
function radiusIsZero(r: number | [number, number, number, number] | undefined): boolean {
  if (r == null) return true;
  return typeof r === 'number' ? r === 0 : r.every((v) => v === 0);
}

/**
 * 蒙版节点 → 施加在**组内下方图层**上的裁切等价出码。
 *
 * 返回 null 语义：蒙版形状无法用 CSS 等价表达（如空 d 的矢量），
 * 调用方应保持 target 原出码不变（不吞异常、不产出半吊子 clip）。
 */
export function maskClipCss(
  maskNode: UINode | null | undefined,
  targetGeom: MaskTargetGeom = {},
): MaskClipResult | null {
  if (!maskNode || maskNode.visible === false) return null;
  const S = maskNode.style ?? {};
  const tx = targetGeom.x ?? 0;
  const ty = targetGeom.y ?? 0;

  if (maskNode.type === 'VECTOR') {
    if (!hasVectorPath(maskNode.vector)) return null;
    const d = (maskNode.vector as { d: string }).d.trim();
    // 蒙版本地系 → target 本地系（蒙版自身的 left/top 平移）
    const shift = tx !== 0 || ty !== 0 ? `translate(${num(-tx)} ${num(-ty)}) ` : '';
    return { clipPath: `path('${shift}${d}')`, overflow: 'hidden', borderRadius: null, kind: 'VECTOR' };
  }

  if (maskNode.type === 'OVAL') {
    // 椭圆蒙版等价：border-radius:50% + overflow:hidden（非正圆蒙版为近似——CSS 50% 恒正椭圆）
    return { clipPath: null, overflow: 'hidden', borderRadius: '50%', kind: 'OVAL' };
  }

  if (maskNode.type === 'RECTANGLE' || maskNode.type === 'FRAME' || maskNode.type === 'SECTION' || maskNode.type === 'IMAGE') {
    const w = maskNode.layout.width;
    const h = maskNode.layout.height;
    const r = S.borderRadius;
    if (!radiusIsZero(r)) {
      // 圆角矩形：target 直接吃同一组圆角 + overflow hidden（与 Figma 组裁切视觉一致）
      return { clipPath: null, overflow: 'hidden', borderRadius: radiusValue(r!), kind: 'ROUNDED_RECT' };
    }
    if (w != null && h != null) {
      // 直角矩形且已知尺寸 → inset() 精确表达「蒙版比 target 小」的偏移裁切
      return {
        clipPath: `inset(${num(ty)}px ${num(Math.max(0, tx))}px 0 0)`,
        overflow: 'hidden',
        borderRadius: null,
        kind: 'RECT',
      };
    }
    return { clipPath: null, overflow: 'hidden', borderRadius: null, kind: 'RECT' };
  }

  // 其余节点类型（TEXT/BUTTON/LINE/POLYGON/STAR/容器等）无 CSS 等价裁切——返回 null 让调用方保持原出码
  return null;
}

/**
 * 蒙版节点对 target 的裁切是否**可等价表达**——组渲染层用它决定是否跳过该层。
 * 与 maskClipCss 同口径，抽出来避免两处判定漂移。
 */
export function isMaskExpressible(maskNode: UINode | null | undefined): boolean {
  return maskClipCss(maskNode) !== null;
}

/**
 * 组内「上方蒙版」定位：Figma 蒙版取组内**最上方**可见图层（数组最后一个，与 zOrder 末位在上一致）。
 * 返回索引；无可见子项 → -1。
 */
export function maskIndexInGroup(children: UINode[] | undefined): number {
  if (!children || !children.length) return -1;
  for (let i = children.length - 1; i >= 0; i--) {
    if (children[i].visible !== false) return i;
  }
  return -1;
}

/**
 * 蒙版等价出码 → CSS 声明片段（合入 target 的 CSSDecl）。
 * 不产声明时返回空对象（调用方 {...x} 合并不受影响）。
 */
export function maskDeclarations(result: MaskClipResult | null): Record<string, string> {
  if (!result) return {};
  const out: Record<string, string> = {};
  if (result.clipPath) out['clip-path'] = result.clipPath;
  if (result.borderRadius) out['border-radius'] = result.borderRadius;
  if (result.overflow) out['overflow'] = result.overflow;
  return out;
}
