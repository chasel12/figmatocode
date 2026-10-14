import { describe, expect, it } from 'vitest';
import { createApproxMeasure, resolveLayout } from '../src/compiler';
import { compilePage } from '../src/compiler';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { ContainerNode, UIPage, UINode } from '../src/schema/types';

/** 横向容器：FIXED 宽 200 + HUG 高，wrap 折行（gap 10 / gapCross 20） */
function buildWrapPage(): UIPage {
  resetIdSeq(0);
  const page = createPage('wrap', 375, 812);
  page.root.layout = { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED' };

  const box = createNode('FRAME') as ContainerNode;
  box.id = 'box';
  box.layout = {
    mode: 'HORIZONTAL',
    widthMode: 'FIXED',
    width: 200,
    heightMode: 'HUG',
    padding: [0, 0, 0, 0],
    gap: 10,
    wrap: 'WRAP',
    gapCross: 20,
  };
  for (let i = 0; i < 3; i++) {
    const r = createNode('RECTANGLE') as ContainerNode;
    r.id = `r${i}`;
    r.layout = { mode: 'VERTICAL', widthMode: 'FIXED', width: 80, heightMode: 'FIXED', height: 30 };
    box.children.push(r);
  }
  page.root.children.push(box);
  return page;
}

/** min/max 夹紧：FIXED 10→min40、FIXED 100→max60 */
function buildClampPage(): UIPage {
  resetIdSeq(0);
  const page = createPage('clamp', 375, 812);
  page.root.layout = { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED' };
  const a = createNode('RECTANGLE') as ContainerNode;
  a.id = 'a';
  a.layout = { mode: 'VERTICAL', widthMode: 'FIXED', width: 10, heightMode: 'FIXED', height: 10, minWidth: 40, minHeight: 35 };
  const b = createNode('RECTANGLE') as ContainerNode;
  b.id = 'b';
  b.layout = { mode: 'VERTICAL', widthMode: 'FIXED', width: 100, heightMode: 'FIXED', height: 50, maxWidth: 60, maxHeight: 45 };
  page.root.children.push(a, b);
  return page;
}

/** Ignore auto layout：flow 子 + ABSOLUTE 子（mode=ABSOLUTE, x/y） */
function buildIgnorePage(): UIPage {
  resetIdSeq(0);
  const page = createPage('ignore', 375, 812);
  page.root.layout = { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED' };
  const box = createNode('FRAME') as ContainerNode;
  box.id = 'box';
  box.layout = { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG', padding: [0, 0, 0, 0], gap: 10 };
  const a = createNode('RECTANGLE') as ContainerNode;
  a.id = 'a';
  a.layout = { mode: 'VERTICAL', widthMode: 'FIXED', width: 80, heightMode: 'FIXED', height: 30 };
  const b = createNode('RECTANGLE') as ContainerNode;
  b.id = 'b';
  b.layout = { mode: 'VERTICAL', widthMode: 'FIXED', width: 80, heightMode: 'FIXED', height: 30 };
  const ghost = createNode('RECTANGLE') as ContainerNode;
  ghost.id = 'ghost';
  ghost.layout = { mode: 'ABSOLUTE', widthMode: 'FIXED', width: 80, heightMode: 'FIXED', height: 30, x: 400, y: 5 };
  box.children.push(a, b, ghost);
  page.root.children.push(box);
  return page;
}

describe('FR-36 min/max 宽高夹紧', () => {
  it('FIXED 尺寸被 minWidth/minHeight 抬升、被 maxWidth/maxHeight 压低', () => {
    const page = buildClampPage();
    const g = resolveLayout(page, createApproxMeasure());
    expect(g['a'].width).toBe(40);
    expect(g['a'].height).toBe(35);
    expect(g['b'].width).toBe(60);
    expect(g['b'].height).toBe(45);
  });

  it('容器 HUG 尺寸（含子 clamp 结果）同步生效', () => {
    resetIdSeq(0);
    const page = createPage('clamp2', 375, 812);
    page.root.layout = { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED' };
    const box = createNode('FRAME') as ContainerNode;
    box.id = 'box';
    box.layout = { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG', padding: [0, 0, 0, 0], gap: 0, maxWidth: 60 };
    const a = createNode('RECTANGLE') as ContainerNode;
    a.id = 'a';
    a.layout = { mode: 'VERTICAL', widthMode: 'FIXED', width: 80, heightMode: 'FIXED', height: 30 };
    box.children.push(a);
    page.root.children.push(box);
    const g = resolveLayout(page, createApproxMeasure());
    expect(g['box'].width).toBe(60); // HUG(80) 被容器 maxWidth 夹到 60
    expect(g['box'].height).toBe(30);
  });
});

describe('FR-36 wrap 折行几何', () => {
  it('HUG 高度=两行（30+20+30）；FIXED 宽 200', () => {
    const page = buildWrapPage();
    const g = resolveLayout(page, createApproxMeasure());
    expect(g['box'].width).toBe(200);
    expect(g['box'].height).toBe(80);
  });

  it('行内排布：r0 x=0、r1 x=90、r2 换行 y=50 x=0', () => {
    const page = buildWrapPage();
    const g = resolveLayout(page, createApproxMeasure());
    expect(g['r0'].x).toBe(0);
    expect(g['r0'].y).toBe(0);
    expect(g['r1'].x).toBe(90);
    expect(g['r2'].x).toBe(0);
    expect(g['r2'].y).toBe(50);
  });
});

describe('FR-36 Ignore auto layout（子 mode=ABSOLUTE）', () => {
  it('flow 子按游标；ignore 子按 x/y 相对父内容区', () => {
    const page = buildIgnorePage();
    const g = resolveLayout(page, createApproxMeasure());
    expect(g['a'].x).toBe(0);
    expect(g['b'].x).toBe(90);
    expect(g['ghost'].x).toBe(400);
    expect(g['ghost'].y).toBe(5);
  });

  it('容器 HUG 不计入 ignore 子（宽=80+10+80=170，高=30）', () => {
    const page = buildIgnorePage();
    const g = resolveLayout(page, createApproxMeasure());
    expect(g['box'].width).toBe(170);
    expect(g['box'].height).toBe(30);
  });
});

describe('FR-36 出码（compile）', () => {
  it('wrap→flex-wrap + gap 行列两值（横向：row=gapCross, col=gap）', () => {
    const page = buildWrapPage();
    const compiled = compilePage(page);
    const box = compiled.nodes.find((n) => n.id === 'box')!;
    expect(box.css['flex-wrap']).toBe('wrap');
    expect(box.css['gap']).toBe('20px 10px');
  });

  it('负 gap 出码（gap: -4px）', () => {
    resetIdSeq(0);
    const page = createPage('neggap', 375, 812);
    page.root.layout = { mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'FIXED' };
    const box = createNode('FRAME') as ContainerNode;
    box.id = 'box';
    box.layout = { mode: 'VERTICAL', widthMode: 'HUG', heightMode: 'HUG', gap: -4 };
    const kidA = createNode('FRAME');
    kidA.id = 'ka';
    kidA.layout = { ...(kidA.layout as object), mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 20, height: 20 } as typeof kidA.layout;
    const kidB = createNode('FRAME');
    kidB.id = 'kb';
    kidB.layout = { ...(kidB.layout as object), mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 20, height: 20 } as typeof kidB.layout;
    box.children.push(kidA, kidB);
    page.root.children.push(box);
    const compiled = compilePage(page);
    const found = compiled.nodes.find((n) => n.id === 'box')!;
    // FR-47 口径：CSS gap 不收负值——父不出 gap，转首个之后子的主轴负 margin（重叠语义）
    expect(found.css['gap']).toBeUndefined();
    const a = compiled.nodes.find((n) => n.id === 'ka')!;
    const b = compiled.nodes.find((n) => n.id === 'kb')!;
    expect(a.css['margin']).toBeUndefined(); // 首子不加
    expect(String(b.css['margin'])).toContain('-4px'); // 次子主轴负 margin
  });

  it('min/max 宽高出码', () => {
    const page = buildClampPage();
    const compiled = compilePage(page);
    const a = compiled.nodes.find((n) => n.id === 'a')!;
    expect(a.css['min-width']).toBe('40px');
    expect(a.css['min-height']).toBe('35px');
    const b = compiled.nodes.find((n) => n.id === 'b')!;
    expect(b.css['max-width']).toBe('60px');
    expect(b.css['max-height']).toBe('45px');
  });

  it('BASELINE 对齐与 clipContent 出码', () => {
    resetIdSeq(0);
    const page = createPage('misc', 375, 812);
    page.root.layout = { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED', align: 'BASELINE' };
    const box = createNode('FRAME') as ContainerNode;
    box.id = 'box';
    box.layout = { mode: 'VERTICAL', widthMode: 'HUG', heightMode: 'HUG', clipContent: true };
    page.root.children.push(box);
    const compiled = compilePage(page);
    const root = compiled.nodes.find((n) => n.id === page.root.id)!;
    expect(root.css['align-items']).toBe('baseline');
    const found = compiled.nodes.find((n) => n.id === 'box')!;
    expect(found.css['overflow']).toBe('hidden');
  });

  it('ignore 子出码 position:absolute（流父内）', () => {
    const page = buildIgnorePage();
    const compiled = compilePage(page);
    const ghost = compiled.nodes.find((n) => n.id === 'ghost')!;
    expect(ghost.css['position']).toBe('absolute');
    expect(ghost.css['left']).toBe('400px');
    expect(ghost.css['top']).toBe('5px');
    const a = compiled.nodes.find((n) => n.id === 'a')!;
    expect(a.css['position']).toBeUndefined();
  });
});

describe('FR-36 字段 JSON 往返', () => {
  it('wrap/gapCross/min/max/clipContent/prevMode 序列化保留', () => {
    const layout = {
      mode: 'ABSOLUTE' as const,
      widthMode: 'FIXED' as const,
      heightMode: 'HUG' as const,
      wrap: 'WRAP' as const,
      gapCross: 8,
      minWidth: 10,
      maxWidth: 500,
      minHeight: 20,
      maxHeight: 400,
      clipContent: true,
      prevMode: 'HORIZONTAL' as const,
    };
    const back = JSON.parse(JSON.stringify(layout)) as UINode['layout'];
    expect(back).toMatchObject(layout);
  });
});
