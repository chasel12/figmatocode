/**
 * 颜色计算（WCAG 相对亮度 / 对比度 / CIE76 色差）。
 *
 * 这一层的测试必须自己算，不能拿被测函数当期望值：
 * 期望值都是手算或规范文档里的定值（#000 on #FFF = 21:1 是定义）。
 */
import { describe, expect, it } from 'vitest';
import { contrastRatio, deltaE, normalizeHex, parseColor, relativeLuminance } from '../src/standards/color';

describe('解析', () => {
  it('支持 hex 三/四/六/八位', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('#FF6600')).toEqual({ r: 255, g: 102, b: 0, a: 1 });
    expect(parseColor('#00000080')!.a).toBeCloseTo(0.502, 3);
    expect(parseColor('#f00f')!.a).toBe(1);
  });

  it('支持 rgb/rgba/hsl', () => {
    expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('rgba(0, 0, 0, 0.5)')!.a).toBeCloseTo(0.5, 5);
    const hsl = parseColor('hsl(0, 100%, 50%)')!;
    expect([hsl.r, hsl.g, hsl.b]).toEqual([255, 0, 0]);
  });

  it('解析不了的返回 null（**不猜**，调用方跳过）', () => {
    expect(parseColor('var(--color-primary)')).toBeNull();
    expect(parseColor('currentColor')).toBeNull();
    expect(parseColor('')).toBeNull();
    expect(parseColor(undefined)).toBeNull();
  });

  it('normalizeHex 把各种写法归一', () => {
    expect(normalizeHex('#FFF')).toBe('#ffffff');
    expect(normalizeHex('rgb(255,102,0)')).toBe('#ff6600');
  });
});

describe('对比度', () => {
  it('黑 on 白 = 21:1（定义值）', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('同色 = 1:1', () => {
    expect(contrastRatio('#FF6600', '#FF6600')).toBeCloseTo(1, 5);
  });

  it('#999 on 白 ≈ 2.85:1（低于正文门槛 4.5）', () => {
    expect(contrastRatio('#999999', '#FFFFFF')).toBeCloseTo(2.85, 2);
  });

  it('半透明文字先与背景合成再算', () => {
    const ratio = contrastRatio('rgba(0,0,0,0.5)', '#FFFFFF')!;
    // 合成后约 #808080，对比度约 3.95
    expect(ratio).toBeGreaterThan(3.9);
    expect(ratio).toBeLessThan(4.0);
  });

  it('不可判定时返回 null（不是 1:1）', () => {
    expect(contrastRatio(null, '#FFFFFF')).toBeNull();
    expect(contrastRatio('var(--x)', '#FFFFFF')).toBeNull();
  });

  it('亮度随灰度单调递增', () => {
    const l = (c: string): number => relativeLuminance(parseColor(c)!);
    expect(l('#000000')).toBeLessThan(l('#808080'));
    expect(l('#808080')).toBeLessThan(l('#FFFFFF'));
  });
});

describe('色差（近似色聚类）', () => {
  it('相邻两档灰 ΔE < 3（肉眼分不出）', () => {
    expect(deltaE('#808080', '#818181')!).toBeLessThan(3);
  });

  it('橙与灰 ΔE > 3（能分出）', () => {
    expect(deltaE('#808080', '#FF6600')!).toBeGreaterThan(3);
  });

  it('同色 ΔE = 0', () => {
    expect(deltaE('#FF6600', '#FF6600')).toBeCloseTo(0, 6);
  });
});
