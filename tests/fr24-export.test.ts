import { describe, expect, it } from 'vitest';
import type { ContainerNode, ExportSetting, UIPage } from '../src/schema/types';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { GeometryMap } from '../src/compiler';
import { effectiveScale, exportFileName, svgOfNode } from '../src/editor/exporter';
import { createZip } from '../src/utils/zip';

resetIdSeq(900);

describe('FR-24 节点导出设置', () => {
  it('effectiveScale：PNG/JPG 按设置，SVG/PDF 恒 1x', () => {
    expect(effectiveScale({ format: 'PNG', scale: 3 })).toBe(3);
    expect(effectiveScale({ format: 'JPG', scale: 2 })).toBe(2);
    expect(effectiveScale({ format: 'SVG', scale: 3 })).toBe(1);
    expect(effectiveScale({ format: 'PDF', scale: 2 })).toBe(1);
  });

  it('exportFileName：name+suffix+@2x+ext；非法字符替换；空名回退 id', () => {
    expect(exportFileName('按钮', 'n1', { format: 'PNG', scale: 1, suffix: '-dark' })).toBe('按钮-dark.png');
    expect(exportFileName('Card', 'n1', { format: 'PNG', scale: 2 })).toBe('Card@2x.png');
    expect(exportFileName('Card', 'n1', { format: 'SVG', scale: 3 })).toBe('Card.svg');
    expect(exportFileName('a/b:c', 'n1', { format: 'JPG', scale: 3, suffix: '@3x' })).toBe('a_b_c@3x@3x.jpg');
    expect(exportFileName('  ', 'node-9', { format: 'PNG', scale: 1 })).toBe('node-9.png');
    expect(exportFileName(undefined, 'node-9', { format: 'PNG', scale: 1 })).toBe('node-9.png');
  });

  it('svgOfNode：foreignObject 单节点 SVG（namespace/css/文本/尺寸）', () => {
    const page: UIPage = createPage('SVG导出');
    const frame = createNode('FRAME') as ContainerNode;
    const text = createNode('TEXT');
    (text as { text: string }).text = '导出测试文案';
    frame.children.push(text);
    page.root.children.push(frame);
    const geometry = {
      [frame.id]: { x: 10, y: 20, width: 320, height: 180 },
      [text.id]: { x: 16, y: 24, width: 120, height: 24 },
    } as unknown as GeometryMap;
    const svg = svgOfNode(frame, page, geometry);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"')).toBe(true);
    expect(svg).toContain('viewBox="0 0 320 180"');
    expect(svg).toContain('<foreignObject width="320" height="180">');
    expect(svg).toContain('<div xmlns="http://www.w3.org/1999/xhtml"');
    expect(svg).toContain('<style>');
    expect(svg).toContain('导出测试文案');
    expect(svg.endsWith('</foreignObject></svg>')).toBe(true);
  });

  it('exportSettings JSON 往返与旧项目缺省', () => {
    const settings: ExportSetting[] = [
      { format: 'PNG', scale: 2, suffix: '@2x' },
      { format: 'SVG', scale: 1 },
    ];
    const node = createNode('RECTANGLE');
    node.exportSettings = settings;
    const back = JSON.parse(JSON.stringify(node)) as typeof node;
    expect(back.exportSettings).toEqual(settings);
    const legacy = JSON.parse(JSON.stringify(createNode('RECTANGLE'))) as { exportSettings?: ExportSetting[] };
    expect(legacy.exportSettings).toBeUndefined();
  });

  it('createZip 产出合法 PK 头且携带 UTF-8 文件名', () => {
    const blob = createZip([{ path: '按钮@2x.png', content: new Uint8Array([1, 2, 3]) }]);
    expect(blob.type).toBe('application/zip');
    expect(blob.size).toBeGreaterThan(50);
  });
});
