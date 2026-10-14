import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { ContainerNode, FillLayer } from '../src/schema/types';
import { compilePage, scssFromPage } from '../src/compiler';

resetIdSeq(200);

function rectPage(style: Record<string, unknown>) {
  const page = createPage('FR-17/18');
  const rect = createNode('RECTANGLE');
  rect.layout = { ...rect.layout, width: 100, height: 60, widthMode: 'FIXED', heightMode: 'FIXED' };
  rect.style = style as ContainerNode['style'];
  page.root.children.push(rect);
  return page;
}

function css(style: Record<string, unknown>): string {
  return scssFromPage(compilePage(rectPage(style)));
}

describe('FR-17 Fill 多层与四型渐变出码', () => {
  it('多层 SOLID：background-image 按数组序逗号连接，首层在上', () => {
    const out = css({ fills: [{ type: 'SOLID', color: '#ff0000' }, { type: 'SOLID', color: '#00ff00' }] as FillLayer[] });
    expect(out).toContain('background-image: linear-gradient(#ff0000, #ff0000), linear-gradient(#00ff00, #00ff00)');
  });

  it('层显隐：visible:false 过滤；全隐不出 background-image', () => {
    const out = css({
      fills: [
        { type: 'SOLID', color: '#111111', visible: false },
        { type: 'SOLID', color: '#222222' },
      ] as FillLayer[],
    });
    expect(out).toContain('#222222');
    expect(out).not.toContain('#111111');
    const none = css({ fills: [{ type: 'SOLID', color: '#111111', visible: false }] as FillLayer[] });
    expect(none).not.toContain('background-image');
  });

  it('层透明度：30% → rgba alpha 0.3', () => {
    const out = css({ fills: [{ type: 'SOLID', color: '#336699', opacity: 0.3 }] as FillLayer[] });
    expect(out).toContain('rgba(51, 102, 153, 0.3)');
  });

  it('线性渐变角度：Figma 0=右 → CSS 90deg；90=下 → 180deg（atan2 换算 +90）', () => {
    const c0 = css({ fills: [{ type: 'GRADIENT_LINEAR', angle: 0, stops: [{ position: 0, color: '#000000' }, { position: 1, color: '#ffffff' }] }] as FillLayer[] });
    expect(c0).toContain('linear-gradient(90deg, #000000 0%, #ffffff 100%)');
    const c90 = css({ fills: [{ type: 'GRADIENT_LINEAR', angle: 90, stops: [{ position: 0, color: '#000000' }, { position: 1, color: '#ffffff' }] }] as FillLayer[] });
    expect(c90).toContain('linear-gradient(180deg,');
  });

  it('四型渐变出码：radial / angular(conic from) / diamond(线性近似)', () => {
    const stops = [{ position: 0, color: '#ff0000' }, { position: 1, color: '#0000ff' }];
    expect(css({ fills: [{ type: 'GRADIENT_RADIAL', angle: 0, stops }] as FillLayer[] })).toContain('radial-gradient(circle at 50% 50%,');
    expect(css({ fills: [{ type: 'GRADIENT_ANGULAR', angle: 45, stops }] as FillLayer[] })).toContain('conic-gradient(from 135deg,');
    expect(css({ fills: [{ type: 'GRADIENT_DIAMOND', angle: 0, stops }] as FillLayer[] })).toContain('linear-gradient(90deg,');
  });

  it('stops：位置百分比与 stop 透明度', () => {
    const out = css({
      fills: [
        {
          type: 'GRADIENT_LINEAR',
          angle: 0,
          stops: [
            { position: 0.25, color: '#ff0000', opacity: 0.5 },
            { position: 0.75, color: '#0000ff' },
          ],
        },
      ] as FillLayer[],
    });
    expect(out).toContain('rgba(255, 0, 0, 0.5) 25%');
    expect(out).toContain('#0000ff 75%');
  });

  it('fills 接管旧 background；无 fills 走旧路径（回归）', () => {
    const taken = css({ background: '#123456', fills: [{ type: 'SOLID', color: '#abcdef' }] as FillLayer[] });
    expect(taken).not.toContain('#123456');
    expect(taken).toContain('#abcdef');
    const legacy = css({ background: '#123456' });
    expect(legacy).toContain('background-color: #123456');
    expect(legacy).not.toContain('background-image');
  });
});

describe('FR-18 Stroke 三对齐/四边/dash 出码', () => {
  it('INSIDE（缺省）→ border 单条', () => {
    const out = css({ border: { width: 2, color: '#000000' } });
    expect(out).toContain('border: 2px solid #000000');
    expect(out).not.toContain('box-shadow');
    expect(out).not.toContain('outline');
  });

  it('CENTER → border 半宽 + outline 外半', () => {
    const out = css({ border: { width: 4, color: '#ff0000', align: 'CENTER' } });
    expect(out).toContain('border: 2px solid #ff0000');
    expect(out).toContain('outline: 2px solid #ff0000');
    expect(out).toContain('outline-offset: 0');
  });

  it('OUTSIDE → box-shadow 0 0 0 w 外扩，与 boxShadow 合并', () => {
    const out = css({ border: { width: 3, color: '#00ff00', align: 'OUTSIDE' }, boxShadow: '0 4 12 rgba(0,0,0,0.15)' });
    expect(out).toContain('box-shadow: 0 0 0 3px #00ff00, 0 4 12 rgba(0,0,0,0.15)');
    expect(out).not.toContain('border:');
  });

  it('四边独立 → per-side border（[1,2,3,4] top/right/bottom/left）', () => {
    const out = css({ border: { width: 1, color: '#000000', widths: [1, 2, 3, 4] } });
    expect(out).toContain('border-top: 1px');
    expect(out).toContain('border-right: 2px');
    expect(out).toContain('border-bottom: 3px');
    expect(out).toContain('border-left: 4px');
    expect(out).not.toContain('border:');
  });

  it('dash → dashed；描边透明度 → rgba', () => {
    const out = css({ border: { width: 2, color: '#000000', dash: [6, 4], opacity: 0.5 } });
    expect(out).toContain('border: 2px dashed rgba(0, 0, 0, 0.5)');
  });

  it('旧 JSON（{width,color}）出码不变（回归）', () => {
    const out = css({ border: { width: 1, color: '#abcdef' } });
    expect(out).toContain('border: 1px solid #abcdef');
    expect(out).not.toContain('outline');
    expect(out).not.toContain('border-top');
  });

  it('JSON 往返：fills/border 扩展字段保序、旧项目缺省无 fills', () => {
    const page = rectPage({ fills: [{ type: 'GRADIENT_LINEAR', angle: 90, stops: [{ position: 0, color: '#000' }, { position: 1, color: '#fff' }] }] as FillLayer[] });
    const json = JSON.parse(JSON.stringify(page)) as typeof page;
    const back = (json.root.children[0] as ContainerNode).style;
    expect(back?.fills?.[0].type).toBe('GRADIENT_LINEAR');
    expect(back?.fills?.[0].angle).toBe(90);
    const legacy = (rectPage({ background: '#111111' }).root.children[0] as ContainerNode).style;
    expect(legacy?.fills).toBeUndefined();
  });
});
