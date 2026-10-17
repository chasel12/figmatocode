import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { ContainerNode, ShapeNode, UIPage, UINode } from '../src/schema/types';
import { compilePage, scssFromPage } from '../src/compiler';
import { generateHtml, generateReferenceHtml, generateTaroProject } from '../src/generator';

resetIdSeq(300);

function withNode(node: UINode): UIPage {
  const page = createPage('FR-16 OVAL/LINE');
  (page.root as ContainerNode).children.push(node);
  return page;
}

function shapeNode(kind: 'OVAL' | 'LINE'): ShapeNode {
  const n = createNode(kind) as ShapeNode;
  n.layout = { ...n.layout, width: 100, height: kind === 'LINE' ? 0 : 60, widthMode: 'FIXED', heightMode: 'FIXED' };
  return n;
}

describe('FR-16 OVAL/LINE 节点类型（schema 演进）', () => {
  it('factory：OVAL/LINE 叶子（isContainer=false）、命名、LINE 高 0 与默认描边', () => {
    const oval = createNode('OVAL');
    const line = createNode('LINE') as ShapeNode;
    expect(oval.type).toBe('OVAL');
    expect('children' in oval).toBe(false);
    expect((oval.name ?? '').startsWith('Oval')).toBe(true);
    expect(line.type).toBe('LINE');
    expect(line.layout.height).toBe(0);
    expect(line.layout.width).toBeGreaterThan(0);
    expect(line.style?.border).toEqual({ width: 1, color: '#000000', style: 'solid' });
  });

  it('OVAL 出码（P1-14）：SVG 通道（四段 C 贝塞尔），不出 border-radius/corner-shape', () => {
    const oval = shapeNode('OVAL');
    oval.style = { borderRadius: 12, cornerSmoothing: 100 };
    const page = withNode(oval);
    const compiled = compilePage(page);
    const css = scssFromPage(compiled);
    expect(css).not.toContain('border-radius');
    expect(css).not.toContain('corner-shape');
    const html = generateHtml(page, compiled);
    expect(html).toContain('<svg');
    const d = /path d="([^"]+)"/.exec(html)![1];
    expect((d.match(/C /g) ?? []).length).toBe(4); // 椭圆 = 四段三次贝塞尔
    const ref = generateReferenceHtml(page, compiled, { page: { x: 0, y: 0, width: 375, height: 812 } });
    expect(ref).toContain('<svg');
  });

  it('LINE 出码：height 0 + border-top + rotation rotate + origin（0=无 transform）', () => {
    const line = shapeNode('LINE');
    line.style = { border: { width: 2, color: '#ff0000' }, rotation: 30 };
    const css = scssFromPage(compilePage(withNode(line)));
    expect(css).toContain('height: 0');
    expect(css).toContain('border-top: 2px solid #ff0000');
    expect(css).toContain('transform: rotate(30deg)');
    expect(css).toContain('transform-origin: 0 50%');
    expect(css).not.toContain('border:');

    const flat = shapeNode('LINE');
    const css0 = scssFromPage(compilePage(withNode(flat)));
    expect(css0).not.toContain('transform:');
    expect(css0).toContain('border-top: 1px solid #000000');
  });

  it('reference/主出码：OVAL 走 SVG 通道（P1-14）、无 undefined 泄漏', () => {
    const page = withNode(shapeNode('OVAL'));
    const compiled = compilePage(page);
    const ref = generateReferenceHtml(page, compiled, { page: { x: 0, y: 0, width: 375, height: 812 } });
    expect(ref).toContain('<svg');
    expect(ref).not.toContain('undefined');
    const html = generateHtml(page, compiled);
    expect(html).toContain('<svg');
    const taro = generateTaroProject(page, compiled);
    expect(JSON.stringify(taro)).not.toContain('undefined');
  });

  it('JSON 往返：ShapeNode 与 rotation 保序、旧项目无新字段', () => {
    const line = shapeNode('LINE');
    line.style = { ...(line.style ?? {}), rotation: -45 };
    const json = JSON.parse(JSON.stringify(withNode(line))) as typeof line extends never ? never : ReturnType<typeof withNode>;
    const back = json.root.children[0] as ShapeNode;
    expect(back.type).toBe('LINE');
    expect(back.style?.rotation).toBe(-45);
    const legacy = JSON.parse(JSON.stringify({ type: 'RECTANGLE' })) as ContainerNode;
    expect(legacy.type).toBe('RECTANGLE');
  });
});
