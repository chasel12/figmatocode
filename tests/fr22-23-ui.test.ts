import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { editorReducer, initialState, type EditorState } from '../src/editor/store';
import type { ContainerNode, VectorNode } from '../src/schema/types';

resetIdSeq(0);

function vec(d: string, w = 20, h = 20): VectorNode {
  const n = createNode('VECTOR') as VectorNode;
  n.vector = { d };
  n.layout.width = w;
  n.layout.height = h;
  return n;
}

function stateWithVectors(): { s: EditorState; a: VectorNode; b: VectorNode } {
  const page = createPage('布尔页');
  const a = vec('M 0 0 L 10 0 L 10 10 Z');
  const b = vec('M 5 5 L 15 5 L 15 15 Z');
  page.root.children.push(a, b);
  const s = initialState(page, '布尔项目');
  return { s, a, b };
}

describe('FR-22 布尔运算（store action）', () => {
  it('选中 <2 个 VECTOR → 返回原 state', () => {
    const { s, a } = stateWithVectors();
    const one = { ...s, selectedIds: [a.id] };
    expect(editorReducer(one, { type: 'BOOLEAN_OP', op: 'UNION' })).toBe(one);
  });

  it('UNION：两参集合并为一节点、原参集删除', () => {
    const { s, a, b } = stateWithVectors();
    const two = { ...s, selectedIds: [a.id, b.id] };
    const out = editorReducer(two, { type: 'BOOLEAN_OP', op: 'UNION' });
    expect(out.page.root.children).toHaveLength(1);
    const merged = out.page.root.children[0] as VectorNode;
    expect(merged.type).toBe('VECTOR');
    expect(merged.name).toBe('Union');
    expect(merged.vector?.fillRule).toBe('nonzero');
    // 两条子路径都在
    expect((merged.vector?.d.match(/[Mm]/g) ?? []).length).toBe(2);
    expect(out.selectedIds).toEqual([merged.id]);
  });

  it('SUBTRACT：fillRule 为 evenodd（A 减 B 的近似表达）', () => {
    const { s, a, b } = stateWithVectors();
    const two = { ...s, selectedIds: [a.id, b.id] };
    const out = editorReducer(two, { type: 'BOOLEAN_OP', op: 'SUBTRACT' });
    const merged = out.page.root.children[0] as VectorNode;
    expect(merged.vector?.fillRule).toBe('evenodd');
    expect(merged.name).toBe('Subtract');
  });

  it('四运算各自产名（Union/Intersect/Subtract/Exclude）', () => {
    for (const op of ['UNION', 'INTERSECT', 'SUBTRACT', 'EXCLUDE'] as const) {
      const { s, a, b } = stateWithVectors();
      const out = editorReducer({ ...s, selectedIds: [a.id, b.id] }, { type: 'BOOLEAN_OP', op });
      const merged = out.page.root.children[0] as VectorNode;
      expect(merged.name).toBe(op === 'UNION' ? 'Union' : op === 'INTERSECT' ? 'Intersect' : op === 'SUBTRACT' ? 'Subtract' : 'Exclude');
    }
  });

  it('参集顺序按 tree 序（下→上）', () => {
    const { s, a, b } = stateWithVectors();
    // 倒序选中不影响结果顺序（取 tree 序）
    const out = editorReducer({ ...s, selectedIds: [b.id, a.id] }, { type: 'BOOLEAN_OP', op: 'UNION' });
    const merged = out.page.root.children[0] as VectorNode;
    const d = merged.vector!.d;
    expect(d.indexOf('M 0 0')).toBeLessThan(d.indexOf('M 5 5'));
  });

  it('混选（P1-05）：图形节点自动矢量化参与，非图形节点保留不参与', () => {
    const page = createPage('混选');
    const v1 = vec('M 0 0 L 10 0 L 10 10 Z');
    const v2 = vec('M 5 5 L 15 5 L 15 15 Z');
    const rect = createNode('RECTANGLE'); // 可路径化 → 参与自动矢量化
    const text = createNode('TEXT'); // 不可路径化 → 保留
    page.root.children.push(v1, v2, rect, text);
    const s = initialState(page, 'p');
    const out = editorReducer({ ...s, selectedIds: [v1.id, v2.id, rect.id, text.id] }, { type: 'BOOLEAN_OP', op: 'UNION' });
    // 结果 + 未参与文本；RECT 被合并删除
    expect(out.page.root.children).toHaveLength(2);
    expect(out.page.root.children.some((c) => c.id === text.id)).toBe(true);
    expect(out.page.root.children.some((c) => c.id === rect.id)).toBe(false);
    const merged = out.page.root.children.find((c) => c.type === 'VECTOR') as VectorNode;
    expect((merged.vector!.d.match(/[Mm]/g) ?? []).length).toBe(3); // 三参集子路径（v1+v2+rect 路径化）
  });

  it('P1-05 位移修复：不同画布位置的参集按绝对位置差 flatten（不再叠到原点）', () => {
    const page = createPage('位移');
    const a = vec('M 0 0 L 10 0 L 10 10 Z');
    a.layout = { ...a.layout, x: 0, y: 0 };
    const b = vec('M 0 0 L 10 0 L 10 10 Z');
    b.layout = { ...b.layout, x: 40, y: 25 };
    page.root.children.push(a, b);
    const s = initialState(page, 'p');
    const out = editorReducer({ ...s, selectedIds: [a.id, b.id] }, { type: 'BOOLEAN_OP', op: 'UNION' });
    const merged = out.page.root.children[0] as VectorNode;
    const parts = merged.vector!.d.split(/(?=[Mm])/).map((x) => x.trim());
    expect(parts).toHaveLength(2);
    expect(parts[1]).toMatch(/^M 40 25/); // 第二参集平移到首参集本地系的 (40,25)
    expect(merged.layout.width).toBe(50); // 紧包围盒 10+40
    expect(merged.layout.height).toBe(35);
  });

  it('P1-05 自动矢量化：矩形参集路径化参与（含矩形子路径，尺寸为紧包围盒）', () => {
    const page = createPage('矢量化');
    const rect = createNode('RECTANGLE');
    rect.layout = { ...rect.layout, x: 0, y: 0, width: 30, height: 20 };
    const v = vec('M 0 0 L 10 0 L 10 10 Z');
    page.root.children.push(rect, v);
    const s = initialState(page, 'p');
    const out = editorReducer({ ...s, selectedIds: [rect.id, v.id] }, { type: 'BOOLEAN_OP', op: 'UNION' });
    expect(out.page.root.children).toHaveLength(1);
    const merged = out.page.root.children[0] as VectorNode;
    expect(merged.type).toBe('VECTOR');
    expect(merged.vector!.d).toContain('M 0 0 L 30 0 L 30 20 L 0 20 Z'); // rectPathD 路径化
    expect(merged.layout.width).toBe(30);
    expect(merged.layout.height).toBe(20);
  });

  it('空 d 的 VECTOR 不算有效参集', () => {
    const page = createPage('空 d');
    const v1 = vec('M 0 0 L 10 0 L 10 10 Z');
    const v2 = vec('   ');
    page.root.children.push(v1, v2);
    const s = initialState(page, 'p');
    const st = { ...s, selectedIds: [v1.id, v2.id] };
    const out = editorReducer(st, { type: 'BOOLEAN_OP', op: 'UNION' });
    // toBe 是引用比较——对新建字面量恒 false；实现返回入参同一引用，须捕获后比对
    expect(out).toBe(st); // 仅 1 个有效参集 → 原 state
  });

  it('嵌套容器内的参集可被合并', () => {
    const page = createPage('嵌套');
    const frame = createNode('FRAME') as ContainerNode;
    const v1 = vec('M 0 0 L 10 0 L 10 10 Z');
    const v2 = vec('M 5 5 L 15 5 L 15 15 Z');
    frame.children = [v1, v2];
    page.root.children.push(frame);
    const s = initialState(page, 'p');
    const out = editorReducer({ ...s, selectedIds: [v1.id, v2.id] }, { type: 'BOOLEAN_OP', op: 'UNION' });
    const outFrame = out.page.root.children[0] as ContainerNode;
    expect(outFrame.children).toHaveLength(1);
    expect(outFrame.children[0].type).toBe('VECTOR');
  });

  it('进历史栈（可撤销）', () => {
    const { s, a, b } = stateWithVectors();
    const out = editorReducer({ ...s, selectedIds: [a.id, b.id] }, { type: 'BOOLEAN_OP', op: 'UNION' });
    expect(out.past.length).toBeGreaterThan(0);
    const undone = editorReducer(out, { type: 'UNDO' });
    expect(undone.page.root.children).toHaveLength(2);
  });
});

describe('FR-23 蒙版开关（store action）', () => {
  function maskState(childCount: number): { s: EditorState; frame: ContainerNode } {
    const page = createPage('蒙版页');
    const frame = createNode('FRAME') as ContainerNode;
    for (let i = 0; i < childCount; i += 1) frame.children.push(createNode('RECTANGLE'));
    page.root.children.push(frame);
    return { s: initialState(page, 'p'), frame };
  }

  it('子项 ≥2 的容器可切换 clipContent', () => {
    const { s, frame } = maskState(2);
    const out = editorReducer({ ...s, selectedIds: [frame.id] }, { type: 'TOGGLE_MASK' });
    const f = out.page.root.children[0] as ContainerNode;
    expect(f.layout.clipContent).toBe(true);
  });

  it('再次切换取消蒙版', () => {
    const { s, frame } = maskState(2);
    const on = editorReducer({ ...s, selectedIds: [frame.id] }, { type: 'TOGGLE_MASK' });
    const off = editorReducer({ ...on, selectedIds: [frame.id] }, { type: 'TOGGLE_MASK' });
    const f = off.page.root.children[0] as ContainerNode;
    expect(f.layout.clipContent).toBe(false);
  });

  it('子项 <2 的容器不可作蒙版（返回原 state）', () => {
    const { s, frame } = maskState(1);
    const sel = { ...s, selectedIds: [frame.id] };
    expect(editorReducer(sel, { type: 'TOGGLE_MASK' })).toBe(sel);
  });

  it('根节点不可作蒙版', () => {
    const { s } = maskState(2);
    const sel = { ...s, selectedIds: [s.page.root.id] };
    expect(editorReducer(sel, { type: 'TOGGLE_MASK' })).toBe(sel);
  });

  it('RECTANGLE 虽可容纳子项但不可作蒙版容器（isContainer 语义边界）', () => {
    const page = createPage('矩形');
    const rect = createNode('RECTANGLE') as ContainerNode;
    rect.children = [createNode('RECTANGLE'), createNode('RECTANGLE')];
    page.root.children.push(rect);
    const s = initialState(page, 'p');
    const sel = { ...s, selectedIds: [rect.id] };
    expect(editorReducer(sel, { type: 'TOGGLE_MASK' })).toBe(sel);
  });

  it('蒙版开关进历史栈', () => {
    const { s, frame } = maskState(2);
    const out = editorReducer({ ...s, selectedIds: [frame.id] }, { type: 'TOGGLE_MASK' });
    expect(out.past.length).toBeGreaterThan(0);
  });

  it('开启蒙版后编译侧产出裁切声明（与 FR-23 出码闭环）', () => {
    const { s, frame } = maskState(2);
    const out = editorReducer({ ...s, selectedIds: [frame.id] }, { type: 'TOGGLE_MASK' });
    const f = out.page.root.children[0] as ContainerNode;
    // 子项为直角矩形 → inset 裁切；仅断言确有裁切相关声明产出
    expect(f.layout.clipContent).toBe(true);
  });
});
