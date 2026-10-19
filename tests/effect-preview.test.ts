/**
 * FR-19/34 画布效果预览映射单测（差异 #18/#19 修复锁，node 环境——仅测纯函数，贴片生成有 document 守卫不在此域）。
 */
import { describe, it, expect } from 'vitest';
import { effectPreviewFor, BLEND_TO_GCO } from '../src/editor/tools/effectPreview';
import type { Effect, StyleSchema } from '../src/schema/types';

const s = (over: Partial<StyleSchema>): StyleSchema => ({ fills: [{ type: 'SOLID', color: '#fff' }], ...over });

describe('effectPreviewFor：blendMode → globalCompositeOperation', () => {
  it('NORMAL/未设 不输出 blend；16 模式映射全为小写连字符串', () => {
    expect(effectPreviewFor(s({ blendMode: 'NORMAL' })).blend).toBeUndefined();
    expect(effectPreviewFor(s({})).blend).toBeUndefined();
    expect(Object.values(BLEND_TO_GCO).every((v) => typeof v === 'string' && /^[a-z-]+$/.test(v))).toBe(true);
    expect(Object.keys(BLEND_TO_GCO).length).toBe(15); // 16 模式除 NORMAL
    expect(effectPreviewFor(s({ blendMode: 'COLOR_BURN' })).blend).toBe('color-burn');
    expect(effectPreviewFor(s({ blendMode: 'LUMINOSITY' })).blend).toBe('luminosity');
  });
});

describe('effectPreviewFor：模糊类', () => {
  it('LAYER_BLUR → radius；缺省 12', () => {
    expect(effectPreviewFor(s({ effects: [{ kind: 'LAYER_BLUR', radius: 6 }] })).blurRadius).toBe(6);
    expect(effectPreviewFor(s({ effects: [{ kind: 'LAYER_BLUR' }] })).blurRadius).toBe(12);
  });
  it('PROGRESSIVE_BLUR → (radius+startRadius)/2 —— 与 compile.ts 均值口径一致', () => {
    expect(effectPreviewFor(s({ effects: [{ kind: 'PROGRESSIVE_BLUR', radius: 10, startRadius: 2 }] })).blurRadius).toBe(6);
    expect(effectPreviewFor(s({ effects: [{ kind: 'PROGRESSIVE_BLUR' }] })).blurRadius).toBe(6);
  });
  it('多模糊取最大值；BACKGROUND_BLUR 不算（模糊的是背景，节点自身不该糊——导出为准口径）', () => {
    const st = s({ effects: [{ kind: 'LAYER_BLUR', radius: 4 }, { kind: 'PROGRESSIVE_BLUR', radius: 12, startRadius: 0 }] });
    expect(effectPreviewFor(st).blurRadius).toBe(6);
    expect(effectPreviewFor(s({ effects: [{ kind: 'BACKGROUND_BLUR', radius: 20 }] })).blurRadius).toBeUndefined();
  });
  it('visible=false 的效果全部排除', () => {
    expect(effectPreviewFor(s({ effects: [{ kind: 'LAYER_BLUR', radius: 8, visible: false }] }))).toEqual({});
  });
});

describe('effectPreviewFor：覆盖层（噪声/纹理/玻璃）', () => {
  it('NOISE → pattern 覆盖：cell=clamp(radius,2,64)、opacity=density clamp', () => {
    const fx = effectPreviewFor(s({ effects: [{ kind: 'NOISE', radius: 6, density: 0.5, color: '#888888' }] }));
    expect(fx.overlay).toMatchObject({ mode: 'pattern', cell: 6, opacity: 0.5, color: '#888888' });
  });
  it('覆盖层强度 = density × 效果层 opacity（#18 修复复测：面板 opacity 行需画布可见）', () => {
    const fx = effectPreviewFor(s({ effects: [{ kind: 'NOISE', radius: 6, density: 0.8, opacity: 0.5 }] }));
    expect((fx.overlay as { opacity: number }).opacity).toBeCloseTo(0.4, 10);
  });
  it('TEXTURE → pattern 覆盖（缺省二色白）', () => {
    const fx = effectPreviewFor(s({ effects: [{ kind: 'TEXTURE', radius: 200, density: 0 }] }));
    const o = fx.overlay as { mode: 'pattern'; cell: number; opacity: number; color2: string };
    expect([o.mode, o.cell, o.opacity]).toEqual(['pattern', 64, 0.05]); // clamp 边界
    expect(o.color2).toBe('#ffffff');
  });
  it('GLASS → tint 覆盖：opacity=min(.6, .2+radius/60)', () => {
    const fx = effectPreviewFor(s({ effects: [{ kind: 'GLASS', radius: 30, color: '#f0f8ff' }] }));
    expect(fx.overlay).toEqual({ mode: 'tint', color: '#f0f8ff', opacity: 0.6 }); // 0.2+0.5=0.7 → clamp 0.6
  });
  it('首命中优先：NOISE 在前取 NOISE；INNER/BACKGROUND 不产覆盖', () => {
    const effects = [
      { kind: 'NOISE', radius: 4 } as Effect,
      { kind: 'GLASS', radius: 10 } as Effect,
    ];
    expect((effectPreviewFor(s({ effects })).overlay as { mode: string }).mode).toBe('pattern');
    expect(effectPreviewFor(s({ effects: [{ kind: 'INNER_SHADOW', x: 0, y: 2, blur: 6 }] })).overlay).toBeUndefined();
  });
  it('投影不重复输出（既有 shadowProps 通道）；空 effects 返回 {}', () => {
    expect(effectPreviewFor(s({ effects: [{ kind: 'DROP_SHADOW', x: 0, y: 6, blur: 12 }] }))).toEqual({});
    expect(effectPreviewFor(s({}))).toEqual({});
  });
});
