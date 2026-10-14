import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { compilePage, scssFromPage } from '../src/compiler';
import { createApproxMeasure, resolveLayout } from '../src/compiler';
import { allDemoPages } from '../src/demo/pages';
import { createZip } from '../src/utils/zip';
import type { StyleSchema, UINode } from '../src/schema/types';

resetIdSeq(0);

describe('FR-1 Schema 工厂：5 类节点合法且结构完整', () => {
  it('FRAME/TEXT/IMAGE/BUTTON/RECTANGLE 均产出 id/type/layout，id 全局唯一', () => {
    const kinds = ['FRAME', 'TEXT', 'IMAGE', 'BUTTON', 'RECTANGLE'] as const;
    const nodes = kinds.map((k) => createNode(k));
    const ids = nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(5);
    for (const n of nodes) {
      expect(typeof n.id).toBe('string');
      expect(n.id.length).toBeGreaterThan(0);
      expect(n.layout).toBeTruthy();
      expect(n.layout.mode).toBeTruthy();
      expect(n.layout.widthMode).toBeTruthy();
      expect(n.layout.heightMode).toBeTruthy();
    }
    expect(nodes[0].type).toBe('FRAME');
    expect(nodes[1].type).toBe('TEXT');
    expect(nodes[2].type).toBe('IMAGE');
    expect(nodes[3].type).toBe('BUTTON');
    expect(nodes[4].type).toBe('RECTANGLE');
  });

  it('容器节点含 children 数组，创建页面含 PAGE 根与视口', () => {
    const page = createPage('FR1 页面');
    expect(page.root.type).toBe('PAGE');
    expect(Array.isArray(page.root.children)).toBe(true);
    expect(page.viewport.width).toBe(375);
    expect(page.viewport.height).toBe(812);
    const frame = createNode('FRAME') as UINode & { children: unknown[] };
    expect(Array.isArray(frame.children)).toBe(true);
    frame.children.push(createNode('TEXT'));
    expect(page.root.children).toHaveLength(0);
  });
});

describe('FR-3 Style 字段序列化往返不丢字段', () => {
  const boxStyle: StyleSchema = {
    background: '#ff0000',
    border: { width: 2, color: '#0000ff', style: 'dashed' },
    borderRadius: [1, 2, 3, 4],
    opacity: 0.5,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  };
  const textStyle: StyleSchema = {
    color: '#00ff00',
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 30,
    letterSpacing: 2,
    textAlign: 'center',
  };

  function styledPage() {
    const page = createPage('FR3 页面');
    const rect = createNode('RECTANGLE', { name: '盒子' });
    rect.style = { ...boxStyle };
    const text = createNode('TEXT', { name: '文案' });
    if (text.type !== 'TEXT') throw new Error('应为 TEXT');
    text.text = '往返';
    text.style = { ...textStyle };
    page.root.children.push(rect, text);
    return { page, rect, text };
  }

  it('JSON 序列化往返后 style 字段完全一致', () => {
    const { page } = styledPage();
    const round = JSON.parse(JSON.stringify(page));
    expect(round.root.children[0].style).toEqual(boxStyle);
    expect(round.root.children[1].style).toEqual(textStyle);
  });

  it('编译输出 CSS 覆盖全部 Style 字段（Box）', () => {
    const { page, rect } = styledPage();
    const compiled = compilePage(page);
    const css = compiled.nodes.find((n) => n.id === rect.id)!.css;
    expect(css['background-color']).toBe('#ff0000');
    expect(css['border']).toBe('2px dashed #0000ff');
    expect(css['border-radius']).toContain('1px');
    expect(css['opacity']).toBe('0.5');
    expect(css['box-shadow']).toBe('0 2px 4px rgba(0,0,0,0.2)');
  });

  it('编译输出 CSS 覆盖全部 Style 字段（Typography）', () => {
    const { page, text } = styledPage();
    const compiled = compilePage(page);
    const css = compiled.nodes.find((n) => n.id === text.id)!.css;
    expect(css['color']).toBe('#00ff00');
    expect(css['font-family']).toBe('Georgia');
    expect(css['font-size']).toBe('20px');
    expect(css['font-weight']).toBe('700');
    expect(css['line-height']).toBe('30px');
    expect(css['letter-spacing']).toBe('2px');
    expect(css['text-align']).toBe('center');
  });

  it('SCSS 输出含 style 字段声明', () => {
    const { page } = styledPage();
    const scss = scssFromPage(compilePage(page));
    expect(scss).toContain('background-color: #ff0000');
    expect(scss).toContain('font-size: 20px');
  });
});

describe('FR-5 确定性：同一 AST 两次编译产出一致', () => {
  it('全部 16 个演示页：几何与 CSS 两次解析/编译完全一致', () => {
    const measure = createApproxMeasure();
    for (const page of allDemoPages()) {
      const g1 = JSON.stringify(resolveLayout(page, measure));
      const g2 = JSON.stringify(resolveLayout(page, measure));
      expect(g2, `${page.name} 几何不确定`).toBe(g1);
      const c1 = JSON.stringify(compilePage(page));
      const c2 = JSON.stringify(compilePage(page));
      expect(c2, `${page.name} CSS 不确定`).toBe(c1);
    }
  });
});

describe('FR-12 ZIP 导出：结构合法且 store 内容可还原', () => {
  it('createZip 产出 EOCD/本地头，解压（store 直读）内容与输入一致', async () => {
    const entries = [
      { path: 'src/pages/index/index.tsx', content: 'export default function Page() { return null }\n' },
      { path: '中文目录/说明.txt', content: '中文内容——ZIP 往返校验' },
      { path: 'src/app.scss', content: 'page { background: #fff; }\n' },
    ];
    const blob = createZip(entries);
    expect(blob.type).toBe('application/zip');
    const buf = new Uint8Array(await blob.arrayBuffer());
    const view = new DataView(buf.buffer);

    // EOCD 固定在文件尾 22 字节（无注释）
    const eocd = buf.length - 22;
    expect(view.getUint32(eocd, true)).toBe(0x06054b50);
    expect(view.getUint16(eocd + 10, true)).toBe(entries.length);

    // 顺序遍历本地文件头（store 方式：压缩后内容 = 原文，即"解压"直读）
    const decoder = new TextDecoder();
    let off = 0;
    const decoded: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      expect(view.getUint32(off, true)).toBe(0x04034b50);
      expect(view.getUint16(off + 8, true)).toBe(0); // store
      const nameLen = view.getUint16(off + 26, true);
      const extraLen = view.getUint16(off + 28, true);
      const size = view.getUint32(off + 18, true);
      const nameStart = off + 30;
      const dataStart = nameStart + nameLen + extraLen;
      decoded.push(decoder.decode(buf.subarray(dataStart, dataStart + size)));
      off = dataStart + size;
    }
    expect(decoded).toEqual(entries.map((e) => e.content));
    // 中央目录起点 = 本地区总长
    expect(view.getUint32(eocd + 16, true)).toBe(off);
  });
});
