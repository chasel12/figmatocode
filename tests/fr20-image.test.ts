import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { ImageNode } from '../src/schema/types';
import { compilePage, scssFromPage, createApproxMeasure, resolveLayout } from '../src/compiler';
import { generateHtml, generateReferenceHtml } from '../src/generator';

resetIdSeq(100);

function imagePage(scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE') {
  const page = createPage('FR-20 图片');
  const img = createNode('IMAGE') as ImageNode;
  img.src = 'https://example.com/a.png';
  img.layout = { ...img.layout, width: 200, height: 100, widthMode: 'FIXED', heightMode: 'FIXED' };
  img.style = { ...(img.style ?? {}), ...(scaleMode ? { imageScaleMode: scaleMode } : {}) };
  page.root.children.push(img);
  return page;
}

describe('FR-20 图片 scaleMode 出码（FR-47 object-fit 映射）', () => {
  it('FILL → object-fit: cover（显式与缺省一致）', () => {
    for (const mode of ['FILL', undefined] as const) {
      const compiled = compilePage(imagePage(mode));
      const css = scssFromPage(compiled);
      expect(css).toContain('object-fit: cover');
    }
  });

  it('FIT → object-fit: contain', () => {
    const css = scssFromPage(compilePage(imagePage('FIT')));
    expect(css).toContain('object-fit: contain');
    expect(css).not.toContain('object-fit: cover');
  });

  it('CROP → 近似 cover（裁切把手后续）', () => {
    const css = scssFromPage(compilePage(imagePage('CROP')));
    expect(css).toContain('object-fit: cover');
  });

  it('TILE → 不出 object-fit，出码转背景平铺 div（html 与 reference 同步）', () => {
    const page = imagePage('TILE');
    const compiled = compilePage(page);
    const css = scssFromPage(compiled);
    expect(css).not.toContain('object-fit');
    const html = generateHtml(page, compiled);
    expect(html).toContain('background-image:');
    expect(html).toContain('background-repeat:repeat');
    expect(html).toContain('https://example.com/a.png');
    expect(html).not.toContain('<img');
    const ref = generateReferenceHtml(page, compiled, resolveLayout(page, createApproxMeasure()));
    expect(ref).toContain('background-image:');
    expect(ref).not.toContain('<img');
  });

  it('非 TILE → 出码为 <img>（html 与 reference 同步）', () => {
    const page = imagePage('FIT');
    const compiled = compilePage(page);
    expect(generateHtml(page, compiled)).toContain('<img');
    expect(generateReferenceHtml(page, compiled, resolveLayout(page, createApproxMeasure()))).toContain('<img');
  });

  it('JSON 往返：imageScaleMode 可选字段保序、旧项目缺省 FILL', () => {
    const page = imagePage('TILE');
    const json = JSON.parse(JSON.stringify(page)) as typeof page;
    expect((json.root.children[0] as ImageNode).style?.imageScaleMode).toBe('TILE');
    const old = JSON.parse(JSON.stringify(imagePage())) as ReturnType<typeof imagePage>;
    expect((old.root.children[0] as ImageNode).style?.imageScaleMode).toBeUndefined();
    expect(scssFromPage(compilePage(old))).toContain('object-fit: cover');
  });
});
