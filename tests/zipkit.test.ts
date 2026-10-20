/**
 * FR-52 zipKit 单源锁（2026-10-20 对账专单）：确定性收集 / MIME 扩展名 / 双载荷解码 / 深度前缀改写。
 */
import { describe, it, expect } from 'vitest';
import { collectDataUrls, assetFor, assetBytes, rewriteEntryText } from '../src/generator/zipKit';
import type { UIPage } from '../src/schema/types';

const svg = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
const png = 'data:image/png;base64,iVBORw0KGgo=';

const mkPage = (srcs: (string | undefined)[]): UIPage => ({
  id: 'p', name: '页', viewport: { width: 100, height: 100 },
  root: {
    id: 'r', name: 'r', type: 'FRAME', layout: { mode: 'VERTICAL', width: 100, height: 100, widthMode: 'FIXED', heightMode: 'FIXED', padding: [0, 0, 0, 0] as [number, number, number, number], gap: 0 }, style: {},
    children: srcs.map((s, i) => ({ id: `n${i}`, name: `图${i}`, type: 'IMAGE', layout: { mode: 'ABSOLUTE', x: 0, y: 0, width: 10, height: 10, widthMode: 'FIXED', heightMode: 'FIXED', padding: [0, 0, 0, 0] as [number, number, number, number], gap: 0 }, style: {}, src: s, children: [] } as never)),
  },
} as UIPage);

describe('zipKit（FR-52）', () => {
  it('收集：遍历序+去重+跳过非 dataURL', () => {
    const page = mkPage([svg, svg, undefined, 'https://x/y.png']);
    expect(collectDataUrls([page])).toEqual([svg]);
  });
  it('扩展名映射：svg+xml→svg、png→png、未知→bin，序号确定性', () => {
    expect(assetFor(svg, 0).file).toBe('assets/img-1.svg');
    expect(assetFor(png, 1).file).toBe('assets/img-2.png');
    expect(assetFor('data:application/octet-stream;base64,AA==', 2).file).toBe('assets/img-3.bin');
  });
  it('解码：URI 编码 svg 还原原文；base64 还原字节', () => {
    const s = new TextDecoder().decode(assetBytes(svg));
    expect(s).toContain("<svg xmlns='http://www.w3.org/2000/svg'/>");
    const b = assetBytes('data:image/png;base64,AAABAgM=');
    expect(Array.from(b)).toEqual([0, 0, 1, 2, 3]); // AAABAgM= 实为 5 字节
  });
  it('改写：按条目目录深度加 ../ 前缀，全部出现处替换，非资产不受影响', () => {
    const assets = [assetFor(svg, 0)];
    expect(rewriteEntryText(`url(${svg}) + ${svg}`, 'preview/index.html', assets)).toBe('url(../assets/img-1.svg) + ../assets/img-1.svg'); // 嵌套条目必须 ../ 回根
    expect(rewriteEntryText(`src="${svg}"`, 'src/pages/index.tsx', assets)).toBe('src="../../assets/img-1.svg"');
    expect(rewriteEntryText(`url(${svg})`, 'index.html', assets)).toBe('url(assets/img-1.svg)'); // 根级条目无前缀
    expect(rewriteEntryText('no assets here', 'a/b.txt', [])).toBe('no assets here');
  });
});
