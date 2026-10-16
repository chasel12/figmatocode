/**
 * FR-20 余项：图片 7 项调整 → CSS filter 映射**单一事实源**。
 *
 * 消费方三处共用（避免口径漂移）：
 *   1. `PropertyPanel` 滑杆表（标签/值域/默认值）；
 *   2. `compile.ts` 出码（IMAGE 节点合成 `filter:`）；
 *   3. `Canvas.tsx` 画布预览（Konva 侧近似，见该处注释）。
 *
 * 近似口径（报备）：
 * - **Exposure / Contrast / Saturation**：直接映射 CSS 原生 filter（brightness/contrast/saturate），
 *   1:1 语义，`v=0` 不产声明（避免无谓的 filter 串）。
 * - **Temperature（色温）**：CSS 无原生色温，用 `sepia()` 暖化 + `hue-rotate()` 微调近似。
 *   正值偏暖（sepia 增强）、负值偏冷（反向 hue-rotate）。**非线性近似，非 Figma 精确模型**。
 * - **Tint（色调）**：CSS 无原生 tint，用 `hue-rotate()` + 少量 `saturate()` 近似绿-品红轴向偏移。
 * - **Highlights / Shadows**：CSS filter 无分区调整能力（需 LUT/多通道曲线）。
 *   以 `contrast()` 双向微调近似：Highlights 提亮影响整体对比、Shadows 抬暗部影响整体亮度。
 *   **这是有意降级**——精确实现需 SVG feComponentTransfer 或 canvas 像素处理，不在本期范围。
 *
 * 输出确定性：字段按固定顺序（FIELDS 序）合成，同输入两次字节一致。
 */
import type { ImageAdjustments } from '../schema/types';

export interface ImageAdjField {
  key: keyof ImageAdjustments;
  label: string;
  min: number;
  max: number;
  step: number;
  def: number;
  suffix: string;
  /** 单字段 → CSS filter 片段（null = 该值不产声明） */
  css: (v: number) => string | null;
  /** 是否为精确映射（false = 近似，供 UI 提示与矩阵口径区分） */
  exact: boolean;
  /** 近似说明（仅 exact=false 时给） */
  approx?: string;
}

const n3 = (v: number): string => v.toFixed(3);

export const IMG_ADJ_FIELDS: ImageAdjField[] = [
  {
    key: 'exposure',
    label: '曝光',
    min: -100,
    max: 100,
    step: 1,
    def: 0,
    suffix: '',
    exact: true,
    css: (v) => (v ? `brightness(${n3(1 + v / 100)})` : null),
  },
  {
    key: 'contrast',
    label: '对比',
    min: -100,
    max: 100,
    step: 1,
    def: 0,
    suffix: '',
    exact: true,
    css: (v) => (v ? `contrast(${n3(1 + v / 100)})` : null),
  },
  {
    key: 'saturation',
    label: '饱和',
    min: -100,
    max: 100,
    step: 1,
    def: 0,
    suffix: '',
    exact: true,
    css: (v) => (v ? `saturate(${n3(1 + v / 100)})` : null),
  },
  {
    key: 'temperature',
    label: '色温',
    min: -100,
    max: 100,
    step: 1,
    def: 0,
    suffix: '',
    exact: false,
    approx: 'sepia + hue-rotate 近似（CSS 无原生色温）',
    css: (v) => {
      if (!v) return null;
      // 暖：sepia 增强 + 轻微反向 hue 偏移；冷：仅 hue 偏移（不 sepia）
      const amt = Math.abs(v) / 100;
      if (v > 0) return `sepia(${n3(amt * 0.5)}) hue-rotate(${n3(-amt * 12)}deg)`;
      return `hue-rotate(${n3(amt * 18)}deg)`;
    },
  },
  {
    key: 'tint',
    label: '色调',
    min: -100,
    max: 100,
    step: 1,
    def: 0,
    suffix: '',
    exact: false,
    approx: 'hue-rotate + saturate 近似（绿-品红轴向）',
    css: (v) => (v ? `hue-rotate(${n3((v / 100) * 20)}deg) saturate(${n3(1 + Math.abs(v) / 300)})` : null),
  },
  {
    key: 'highlights',
    label: '高光',
    min: -100,
    max: 100,
    step: 1,
    def: 0,
    suffix: '',
    exact: false,
    approx: 'contrast 近似（CSS filter 无分区调整）',
    css: (v) => (v ? `contrast(${n3(1 + v / 400)})` : null),
  },
  {
    key: 'shadows',
    label: '阴影',
    min: -100,
    max: 100,
    step: 1,
    def: 0,
    suffix: '',
    exact: false,
    approx: 'brightness 近似抬暗部（CSS filter 无分区调整）',
    css: (v) => (v ? `brightness(${n3(1 + v / 500)})` : null),
  },
];

/** 字段查表（按 key） */
export function imageAdjField(key: keyof ImageAdjustments): ImageAdjField | undefined {
  return IMG_ADJ_FIELDS.find((f) => f.key === key);
}

/**
 * 7 项调整 → CSS `filter` 值串。
 * 无任何有效字段（全 0 / 未设置）→ 返回 null（不产 filter 声明）。
 * 片段顺序 = IMG_ADJ_FIELDS 序（确定性）。
 */
export function imageAdjustFilter(adj: ImageAdjustments | undefined): string | null {
  if (!adj) return null;
  const parts: string[] = [];
  for (const f of IMG_ADJ_FIELDS) {
    const v = adj[f.key];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const piece = f.css(v);
    if (piece) parts.push(piece);
  }
  return parts.length ? parts.join(' ') : null;
}

/** 是否存在任一非默认值（UI 折叠态/清除按钮可用性） */
export function hasImageAdjustments(adj: ImageAdjustments | undefined): boolean {
  if (!adj) return false;
  return IMG_ADJ_FIELDS.some((f) => {
    const v = adj[f.key];
    return typeof v === 'number' && v !== f.def;
  });
}

/** 归一化：剔除默认值字段（存储瘦身 + 确定性） */
export function normalizeImageAdjustments(adj: ImageAdjustments | undefined): ImageAdjustments | undefined {
  if (!adj) return undefined;
  const out: ImageAdjustments = {};
  for (const f of IMG_ADJ_FIELDS) {
    const v = adj[f.key];
    if (typeof v === 'number' && Number.isFinite(v) && v !== f.def) out[f.key] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * 画布侧近似参数（Konva）：返回 Konva.Filters 可用的参数集。
 * Konva 内建滤镜有限（Brighten/Contrast/HSL），色温/色调/高光/阴影无对应项 → 报备为「仅出码精确」。
 */
export interface CanvasAdjParams {
  /** Konva Brighten 的 brightness 增量（-1..1 量级） */
  brightness: number;
  /** Konva Contrast 的 contrast 增量（-100..100） */
  contrast: number;
  /** Konva HSL 的 saturation 增量（-1..1） */
  saturation: number;
  /** 是否有画布无法表达的字段（色温/色调/高光/阴影） */
  canvasApproximated: boolean;
}

export function imageAdjustCanvasParams(adj: ImageAdjustments | undefined): CanvasAdjParams {
  const exposure = adj?.exposure ?? 0;
  const contrast = adj?.contrast ?? 0;
  const saturation = adj?.saturation ?? 0;
  const unrepresentable = [adj?.temperature, adj?.tint, adj?.highlights, adj?.shadows].some(
    (v) => typeof v === 'number' && v !== 0,
  );
  return {
    brightness: exposure / 100,
    contrast,
    saturation: saturation / 100,
    canvasApproximated: unrepresentable,
  };
}
