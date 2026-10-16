import { describe, expect, it } from 'vitest';
import { defaultVarName, fillLayerCss, tokenDecls, tokensToCss, withAlpha } from '../src/compiler/tokens';
import type { StyleSchema, StyleToken } from '../src/schema/types';

function paint(style: Partial<StyleSchema>, over: Partial<StyleToken> = {}): StyleToken {
  return { id: 't1', name: 'Primary', kind: 'PAINT', style, ...over };
}
function text(style: Partial<StyleSchema>, over: Partial<StyleToken> = {}): StyleToken {
  return { id: 't2', name: 'Heading', kind: 'TEXT', style, ...over };
}

describe('FR-28 tokens：withAlpha 与 compile.ts 同口径', () => {
  it('alpha>=1 原样返回', () => {
    expect(withAlpha('#FF0000', 1)).toBe('#FF0000');
  });
  it('hex 短/长 → rgba', () => {
    expect(withAlpha('#F00', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    expect(withAlpha('#00FF00', 0.25)).toBe('rgba(0, 255, 0, 0.25)');
  });
  it('rgb/rgba 叠乘 alpha', () => {
    expect(withAlpha('rgb(10, 20, 30)', 0.5)).toBe('rgba(10, 20, 30, 0.5)');
    expect(withAlpha('rgba(10, 20, 30, 0.5)', 0.5)).toBe('rgba(10, 20, 30, 0.25)');
  });
  it('无法解析的颜色原样返回（不抛错）', () => {
    expect(withAlpha('var(--x)', 0.5)).toBe('var(--x)');
  });
});

describe('FR-17/28 tokens：fillLayerCss 与 compile 同形状', () => {
  it('SOLID → linear-gradient 双停靠（透明度进色值）', () => {
    expect(fillLayerCss({ type: 'SOLID', color: '#FF0000' })).toBe('linear-gradient(#FF0000, #FF0000)');
    expect(fillLayerCss({ type: 'SOLID', color: '#FF0000', opacity: 0.5 })).toBe(
      'linear-gradient(rgba(255, 0, 0, 0.5), rgba(255, 0, 0, 0.5))',
    );
  });
  it('LINEAR：Figma 向量角 +90 → CSS 角', () => {
    expect(fillLayerCss({ type: 'GRADIENT_LINEAR', angle: 0 })).toContain('linear-gradient(90deg');
    expect(fillLayerCss({ type: 'GRADIENT_LINEAR', angle: 90 })).toContain('linear-gradient(180deg');
  });
  it('RADIAL / ANGULAR 形态', () => {
    expect(fillLayerCss({ type: 'GRADIENT_RADIAL' })).toContain('radial-gradient(circle at 50% 50%');
    expect(fillLayerCss({ type: 'GRADIENT_ANGULAR', angle: 0 })).toContain('conic-gradient(from 90deg');
  });
  it('停靠点含位置百分比与透明度', () => {
    const css = fillLayerCss({
      type: 'GRADIENT_LINEAR',
      angle: 0,
      stops: [
        { position: 0, color: '#000000' },
        { position: 0.5, color: '#FF0000', opacity: 0.5 },
      ],
    });
    expect(css).toContain('#000000 0%');
    expect(css).toContain('rgba(255, 0, 0, 0.5) 50%');
  });
});

describe('FR-27/28 tokens：tokenDecls 与 tokensToCss', () => {
  it('PAINT 取 fills 首层组合', () => {
    const d = tokenDecls(paint({ fills: [{ type: 'SOLID', color: '#123456' }] }), '--uic-paint-1');
    expect(d['--uic-paint-1']).toBe('linear-gradient(#123456, #123456)');
  });

  it('PAINT 无 fills 回退 background', () => {
    const d = tokenDecls(paint({ background: '#ABCDEF' }), '--uic-paint-1');
    expect(d['--uic-paint-1']).toBe('#ABCDEF');
  });

  it('PAINT 全空 → 无声明（不产空变量）', () => {
    expect(tokenDecls(paint({}), '--uic-paint-1')).toEqual({});
  });

  it('TEXT 复合变量逐项展开', () => {
    const d = tokenDecls(
      text({ fontSize: 16, fontWeight: 600, color: '#111111', lineHeight: 24, letterSpacing: 0.5, textAlign: 'left' }),
      '--uic-text-1',
    );
    expect(d['--uic-text-1-font-size']).toBe('16px');
    expect(d['--uic-text-1-font-weight']).toBe('600');
    expect(d['--uic-text-1-color']).toBe('#111111');
    expect(d['--uic-text-1-line-height']).toBe('24px');
    expect(d['--uic-text-1-letter-spacing']).toBe('0.5px');
    expect(d['--uic-text-1-text-align']).toBe('left');
  });

  it('defaultVarName：PAINT/TEXT 前缀 + 1 基序号', () => {
    expect(defaultVarName(paint({}), 0)).toBe('--uic-paint-1');
    expect(defaultVarName(text({}), 1)).toBe('--uic-text-2');
  });

  it('tokensToCss：空表 → :root {}（结构可断言）', () => {
    expect(tokensToCss([])).toBe(':root {}');
  });

  it('tokensToCss：多 token 展开进 :root，显式 cssVar 优先', () => {
    const css = tokensToCss([
      paint({ fills: [{ type: 'SOLID', color: '#FF0000' }] }, { cssVar: '--color-primary' }),
      text({ fontSize: 20 }, {}),
    ]);
    expect(css.startsWith(':root {')).toBe(true);
    expect(css).toContain('--color-primary: linear-gradient(#FF0000, #FF0000);');
    expect(css).toContain('--uic-text-2-font-size: 20px;'); // 序号按数组下标（第 2 项）
    expect(css.trim().endsWith('}')).toBe(true);
  });

  it('tokensToCss：确定性（同输入两次字节一致）', () => {
    const list = [paint({ fills: [{ type: 'SOLID', color: '#FF0000' }] }), text({ fontSize: 14 })];
    expect(tokensToCss(list)).toBe(tokensToCss(list));
  });
});
