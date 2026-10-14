import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { ContainerNode, UIPage } from '../src/schema/types';
import { compilePage, scssFromPage } from '../src/compiler';
import { createApproxMeasure, resolveLayout } from '../src/compiler';
import { generateTaroProject, generateHtml, generateReferenceHtml } from '../src/generator';

function buildPage(): UIPage {
  resetIdSeq(0);
  const page = createPage('测试页', 375, 812);
  const root = page.root;

  const card = createNode('FRAME') as ContainerNode;
  card.id = 'card';
  card.name = 'Card';
  card.layout = {
    mode: 'VERTICAL',
    widthMode: 'FILL',
    heightMode: 'HUG',
    padding: [16, 16, 16, 16],
    gap: 12,
    align: 'START',
    justify: 'START',
  };
  card.style = { background: '#FFFFFF', borderRadius: 12 };

  const title = createNode('TEXT');
  title.id = 'title';
  title.type = 'TEXT';
  (title as any).text = '商品标题';
  title.style = { color: '#111111', fontSize: 18, fontWeight: 600, lineHeight: 26 };

  const price = createNode('TEXT');
  price.id = 'price';
  price.type = 'TEXT';
  (price as any).text = '¥ 99';
  price.style = { color: '#FF4D4F', fontSize: 24, fontWeight: 700, lineHeight: 32 };

  const btn = createNode('BUTTON');
  btn.id = 'buy';
  btn.type = 'BUTTON';
  (btn as any).text = '立即购买';
  btn.layout = {
    mode: 'HORIZONTAL',
    widthMode: 'FILL',
    heightMode: 'FIXED',
    height: 44,
    padding: [0, 16, 0, 16],
    gap: 0,
    align: 'CENTER',
    justify: 'CENTER',
  };

  card.children.push(title, price, btn);
  root.children.push(card);
  root.layout.padding = [16, 16, 16, 16];
  root.layout.gap = 16;
  return page;
}

describe('Schema', () => {
  it('创建页面与节点', () => {
    const page = buildPage();
    expect(page.viewport.width).toBe(375);
    expect(page.root.children).toHaveLength(1);
    expect(page.root.children[0].type).toBe('FRAME');
  });
});

describe('Layout Compiler (CSS)', () => {
  const page = buildPage();
  const compiled = compilePage(page);

  it('生成与节点一一对应的 CSS', () => {
    expect(compiled.nodes).toHaveLength(5);
    const root = compiled.nodes.find((n) => n.id === 'page')!;
    expect(root.css['display']).toBe('flex');
    expect(root.css['flex-direction']).toBe('column');
    expect(root.css['padding']).toBe('16px');
    expect(root.css['gap']).toBe('16px');
  });

  it('FILL 子节点 → width:100%（响应式，不写死 343px）', () => {
    const card = compiled.nodes.find((n) => n.id === 'card')!;
    expect(card.css['width']).toBe('100%');
    expect(card.css['padding']).toBe('16px');
    expect(card.css['border-radius']).toBe('12px');
    expect(card.css['box-sizing']).toBe('border-box');
  });

  it('根节点不固化视口宽度', () => {
    const root = compiled.nodes.find((n) => n.id === 'page')!;
    expect(root.css['width']).toBe('100%');
    expect(root.css['min-height']).toContain('100vh');
    expect(JSON.stringify(root.css)).not.toContain('375px');
  });

  it('BUTTON 在纵向父级中 FILL 宽度（交叉轴）→ 100%', () => {
    const btn = compiled.nodes.find((n) => n.id === 'buy')!;
    expect(btn.css['width']).toBe('100%');
    expect(btn.css['height']).toBe('44px');
    expect(btn.css['font-size']).toBe('16px');
    expect(btn.css['border-radius']).toBe('8px');
  });

  it('横向父级中 FILL 宽度（主轴）→ flex-grow', () => {
    resetIdSeq(0);
    const p = createPage('row', 375, 812);
    const row = createNode('FRAME') as ContainerNode;
    row.layout = { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 343, height: 44, padding: [0, 0, 0, 0], gap: 8 };
    const a = createNode('FRAME') as ContainerNode;
    a.layout = { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'FIXED', height: 44, padding: [0, 0, 0, 0] };
    const b = createNode('FRAME') as ContainerNode;
    b.layout = { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'FIXED', height: 44, padding: [0, 0, 0, 0] };
    row.children.push(a, b);
    p.root.children.push(row);
    const c = compilePage(p);
    const aCss = c.nodes.find((n) => n.id === a.id)!;
    const bCss = c.nodes.find((n) => n.id === b.id)!;
    expect(aCss.css['flex']).toBe('1 1 0'); // FR-47 字面口径：主轴 FILL→flex:1 1 0
    expect(bCss.css['flex']).toBe('1 1 0');
  });

  it('文本排版属性完整', () => {
    const title = compiled.nodes.find((n) => n.id === 'title')!;
    expect(title.css['font-size']).toBe('18px');
    expect(title.css['font-weight']).toBe('600');
    expect(title.css['line-height']).toBe('26px');
    expect(title.css['color']).toBe('#111111');
  });

  it('FIXED 宽度等于父内容宽度 → 响应式 100%', () => {
    resetIdSeq(0);
    const p = createPage('t', 375, 812);
    p.root.layout.padding = [16, 16, 16, 16];
    const child = createNode('FRAME') as ContainerNode;
    child.layout = { mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 343, height: 100, padding: [0, 0, 0, 0] };
    p.root.children.push(child);
    const c = compilePage(p);
    const childCss = c.nodes.find((n) => n.id === child.id)!;
    expect(childCss.css['width']).toBe('100%');
  });

  it('SCSS 输出可读', () => {
    const scss = scssFromPage(compiled);
    expect(scss).toContain('.frame-1 {');
    expect(scss).toContain('display: flex;');
  });
});

describe('Layout Resolver (几何)', () => {
  const page = buildPage();
  const measure = createApproxMeasure();
  const geo = resolveLayout(page, measure);

  it('根节点尺寸 = 视口', () => {
    expect(geo['page'].width).toBe(375);
    expect(geo['page'].height).toBe(812);
  });

  it('FILL 卡片横向占满内容区（375 - 32 = 343）', () => {
    expect(geo['card'].x).toBe(16);
    expect(geo['card'].width).toBe(343);
  });

  it('卡片内子节点纵向堆叠，gap 生效', () => {
    const title = geo['title'];
    const price = geo['price'];
    expect(title.x).toBe(32); // 16 page + 16 card padding
    expect(price.y).toBe(title.y + title.height + 12);
  });

  it('BUTTON FILL 宽度 = 卡片内容宽度', () => {
    expect(geo['buy'].width).toBe(343 - 32);
    expect(geo['buy'].height).toBe(44);
  });

  it('绝对布局定位正确', () => {
    resetIdSeq(0);
    const p = createPage('abs', 375, 812);
    p.root.layout.mode = 'ABSOLUTE';
    p.root.layout.padding = [10, 10, 10, 10];
    const box = createNode('RECTANGLE') as ContainerNode;
    box.layout = {
      mode: 'VERTICAL',
      widthMode: 'FIXED',
      heightMode: 'FIXED',
      width: 100,
      height: 50,
      padding: [0, 0, 0, 0],
      x: 20,
      y: 30,
    };
    p.root.children.push(box);
    const g = resolveLayout(p, measure);
    expect(g[box.id].x).toBe(30); // 10 padding + 20
    expect(g[box.id].y).toBe(40);
    expect(g[box.id].width).toBe(100);
  });
});

describe('Generator', () => {
  const page = buildPage();
  const compiled = compilePage(page);

  it('Taro TSX 包含组件映射与 className', () => {
    const files = generateTaroProject(page, compiled);
    const tsx = files.find((f) => f.path.endsWith('index.tsx'))!;
    expect(tsx.content).toContain("import { View, Text, Image, Button } from '@tarojs/components'");
    expect(tsx.content).toContain('className="frame-1"');
    expect(tsx.content).toContain('className="text-1"');
    expect(tsx.content).toContain('商品标题');
    expect(tsx.content).toContain('立即购买');
  });

  it('Taro 项目包含完整文件集', () => {
    const files = generateTaroProject(page, compiled);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('package.json');
    expect(paths).toContain('src/pages/index/index.tsx');
    expect(paths).toContain('src/pages/index/index.scss');
    expect(paths).toContain('src/app.config.ts');
  });

  it('HTML 预览含相同 class 与 CSS', () => {
    const html = generateHtml(page, compiled);
    expect(html).toContain('class="frame-1"');
    expect(html).toContain('.frame-1 {');
    expect(html).toContain('商品标题');
  });

  it('reference HTML 为绝对定位几何', () => {
    const geo = resolveLayout(page, createApproxMeasure());
    const html = generateReferenceHtml(page, compiled, geo);
    expect(html).toContain('position: absolute;');
    expect(html).toContain('left: 16px;');
    expect(html).toContain('width: 343px;');
  });
});
