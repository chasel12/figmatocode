import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { compilePage } from '../src/compiler';
import {
  IMG_ADJ_FIELDS,
  hasImageAdjustments,
  imageAdjField,
  imageAdjustCanvasParams,
  imageAdjustFilter,
  normalizeImageAdjustments,
} from '../src/compiler/imageAdjust';
import type { ImageAdjustments, UINode } from '../src/schema/types';

resetIdSeq(0);

function imageCss(adj: ImageAdjustments | undefined): Record<string, string> {
  const page = createPage('P1-03 页面');
  const img = createNode('IMAGE') as UINode;
  (img as { src: string }).src = 'data:image/png;base64,AAA';
  (img as { imageAdjustments?: ImageAdjustments }).imageAdjustments = adj;
  page.root.children.push(img);
  return compilePage(page).nodes.find((n) => n.id === img.id)!.css;
}

describe('P1-03 映射表完整性（7 项全部可出码）', () => {
  it('恰好 7 个字段，key 无重复', () => {
    expect(IMG_ADJ_FIELDS).toHaveLength(7);
    const keys = IMG_ADJ_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(7);
  });

  it('7 项值域一致（-100..100，默认 0）', () => {
    for (const f of IMG_ADJ_FIELDS) {
      expect(f.min).toBe(-100);
      expect(f.max).toBe(100);
      expect(f.def).toBe(0);
    }
  });

  it('**7 项全部能产出 CSS（无 null 占位）**——这是 P1-03 的核心修复', () => {
    for (const f of IMG_ADJ_FIELDS) {
      expect(f.css(50), `${f.key} 应在非 0 时产声明`).toBeTruthy();
      expect(f.css(-50), `${f.key} 应在负值也产声明`).toBeTruthy();
    }
  });

  it('默认值 0 → 不产声明（避免无谓 filter）', () => {
    for (const f of IMG_ADJ_FIELDS) {
      expect(f.css(0), `${f.key}=0 不应产声明`).toBeNull();
    }
  });

  it('精确/近似标记：前三项精确、后四项近似且带说明', () => {
    const exactKeys = IMG_ADJ_FIELDS.filter((f) => f.exact).map((f) => f.key);
    expect(exactKeys).toEqual(['exposure', 'contrast', 'saturation']);
    for (const f of IMG_ADJ_FIELDS.filter((x) => !x.exact)) {
      expect(f.approx, `${f.key} 近似项必须有说明`).toBeTruthy();
    }
  });

  it('imageAdjField 查表可用', () => {
    expect(imageAdjField('exposure')?.label).toBe('曝光');
    expect(imageAdjField('shadows')?.label).toBe('阴影');
  });
});

describe('P1-03 imageAdjustFilter 合成', () => {
  it('未设置 / 全 0 → null', () => {
    expect(imageAdjustFilter(undefined)).toBeNull();
    expect(imageAdjustFilter({})).toBeNull();
    expect(imageAdjustFilter({ exposure: 0, contrast: 0 })).toBeNull();
  });

  it('单字段精确映射', () => {
    expect(imageAdjustFilter({ exposure: 50 })).toBe('brightness(1.500)');
    expect(imageAdjustFilter({ contrast: -30 })).toBe('contrast(0.700)');
    expect(imageAdjustFilter({ saturation: 20 })).toBe('saturate(1.200)');
  });

  it('多字段按表序合成（确定性）', () => {
    const out = imageAdjustFilter({ saturation: 20, exposure: 50, contrast: -30 });
    expect(out).toBe('brightness(1.500) contrast(0.700) saturate(1.200)');
  });

  it('色温正负产不同近似串', () => {
    const warm = imageAdjustFilter({ temperature: 50 })!;
    const cool = imageAdjustFilter({ temperature: -50 })!;
    expect(warm).toContain('sepia');
    expect(cool).toContain('hue-rotate');
    expect(warm).not.toBe(cool);
  });

  it('色调 / 高光 / 阴影各自可产声明', () => {
    expect(imageAdjustFilter({ tint: 40 })).toContain('hue-rotate');
    expect(imageAdjustFilter({ highlights: 60 })).toContain('contrast');
    expect(imageAdjustFilter({ shadows: -60 })).toContain('brightness');
  });

  it('7 项全开 → 全部出现在结果中', () => {
    const out = imageAdjustFilter({
      exposure: 10,
      contrast: 10,
      saturation: 10,
      temperature: 10,
      tint: 10,
      highlights: 10,
      shadows: 10,
    })!;
    for (const piece of ['brightness', 'contrast', 'saturate', 'sepia', 'hue-rotate']) {
      expect(out, `应含 ${piece}`).toContain(piece);
    }
  });

  it('非有限值被跳过（不产 NaN）', () => {
    const out = imageAdjustFilter({ exposure: Number.NaN, contrast: 50 });
    expect(out).toBe('contrast(1.500)');
    expect(out).not.toContain('NaN');
  });

  it('确定性：同输入两次字节一致', () => {
    const adj = { exposure: 12, temperature: -34, shadows: 56 };
    expect(imageAdjustFilter(adj)).toBe(imageAdjustFilter(adj));
  });
});

describe('P1-03 出码接线（compile.ts IMAGE 段）', () => {
  it('有调整 → 节点 CSS 含 filter', () => {
    const css = imageCss({ exposure: 50, contrast: 20 });
    expect(css['filter']).toBe('brightness(1.500) contrast(1.200)');
  });

  it('无调整 → 不出 filter（零回归）', () => {
    expect(imageCss(undefined)['filter']).toBeUndefined();
    expect(imageCss({})['filter']).toBeUndefined();
    expect(imageCss({ exposure: 0 })['filter']).toBeUndefined();
  });

  it('filter 与 object-fit 并存（互不覆盖）', () => {
    const css = imageCss({ exposure: 30 });
    expect(css['filter']).toBeTruthy();
    expect(css['object-fit']).toBe('cover');
  });
});

describe('P1-03 画布侧可表达性（Konva 近似边界）', () => {
  it('前三项 → 可表达，无近似标记', () => {
    const p = imageAdjustCanvasParams({ exposure: 50, contrast: 20, saturation: 10 });
    expect(p.brightness).toBeCloseTo(0.5, 5);
    expect(p.contrast).toBe(20);
    expect(p.saturation).toBeCloseTo(0.1, 5);
    expect(p.canvasApproximated).toBe(false);
  });

  it('后四项任一 → 标记画布不可表达', () => {
    for (const key of ['temperature', 'tint', 'highlights', 'shadows'] as const) {
      expect(imageAdjustCanvasParams({ [key]: 30 }).canvasApproximated, `${key} 应标记`).toBe(true);
    }
  });

  it('全 0 / undefined → 无近似标记且参数为 0', () => {
    const p = imageAdjustCanvasParams(undefined);
    expect(p.canvasApproximated).toBe(false);
    expect(p.brightness).toBe(0);
    expect(p.contrast).toBe(0);
    expect(p.saturation).toBe(0);
  });
});

describe('P1-03 辅助函数', () => {
  it('hasImageAdjustments：仅非默认值算有', () => {
    expect(hasImageAdjustments(undefined)).toBe(false);
    expect(hasImageAdjustments({})).toBe(false);
    expect(hasImageAdjustments({ exposure: 0 })).toBe(false);
    expect(hasImageAdjustments({ exposure: 1 })).toBe(true);
  });

  it('normalizeImageAdjustments：剔除默认值；全默认返回 undefined', () => {
    expect(normalizeImageAdjustments({ exposure: 0, contrast: 5 })).toEqual({ contrast: 5 });
    expect(normalizeImageAdjustments({ exposure: 0, contrast: 0 })).toBeUndefined();
    expect(normalizeImageAdjustments(undefined)).toBeUndefined();
  });

  it('normalize 后与原值产同一 filter（语义等价）', () => {
    const raw = { exposure: 0, contrast: 25, tint: 0 };
    expect(imageAdjustFilter(normalizeImageAdjustments(raw))).toBe(imageAdjustFilter(raw));
  });
});
