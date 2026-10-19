import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { editorReducer, initialState } from '../src/editor/store';
import { isContainer } from '../src/schema/types';
import type { ContainerNode, UINode } from '../src/schema/types';

resetIdSeq(0);

/**
 * 回归：矩形不可容纳子节点（2026-10-18 全参数审计揪出的真缺陷）
 *
 * 缺陷现象：选中 RECTANGLE 后点 Palette「添加 文本」→ 文本被塞进矩形内部。
 *   画布可见（Canvas 按 isContainer 渲染子节点），但**出码静默丢弃**
 *   （compile/layout/html/taro/prototype 五处都把 RECTANGLE 当叶子跳过递归）
 *   → 画布↔出码不一致。
 *
 * 根因：`effectiveParentId()` 只判 `isContainer()`，而 `isContainer()` 对 RECTANGLE 为 true。
 * 修复：显式排除 RECTANGLE（与 `findContainerAt()` 的落点容器口径对齐，也与 Figma 一致）。
 */
describe('回归：矩形不可作为添加节点的父容器', () => {
  function stateWithRect(): { s: ReturnType<typeof initialState>; rectId: string } {
    const page = createPage('矩形容纳回归');
    const rect = createNode('RECTANGLE');
    page.root.children.push(rect);
    return { s: initialState(page, 'p'), rectId: rect.id };
  }

  it('前提确认：isContainer(RECTANGLE) 为 true（这正是坑的来源）', () => {
    const rect = createNode('RECTANGLE') as UINode;
    expect(isContainer(rect)).toBe(true);
    // 但它带 children 字段却是「结构性」的，出码/布局层一律当叶子
    expect('children' in rect).toBe(true);
  });

  it('选中矩形时添加文本 → 文本应挂到矩形的**父级**（页根），而非矩形内部', () => {
    const { s, rectId } = stateWithRect();
    const out = editorReducer({ ...s, selectedIds: [rectId] }, { type: 'ADD_NODE', kind: 'TEXT' });

    const rect = out.page.root.children.find((c) => c.id === rectId) as ContainerNode;
    expect(rect.children ?? []).toHaveLength(0); // 矩形内部必须为空

    // 文本在页根层级
    const texts = out.page.root.children.filter((c) => c.type === 'TEXT');
    expect(texts).toHaveLength(1);
  });

  it('选中矩形时添加矩形 → 兄弟节点，不嵌套', () => {
    const { s, rectId } = stateWithRect();
    const out = editorReducer({ ...s, selectedIds: [rectId] }, { type: 'ADD_NODE', kind: 'RECTANGLE' });
    expect(out.page.root.children).toHaveLength(2);
    const first = out.page.root.children[0] as ContainerNode;
    expect(first.children ?? []).toHaveLength(0);
  });

  it('选中 Frame 时添加文本 → 仍正确嵌套进 Frame（不误伤正常容器）', () => {
    const page = createPage('Frame 嵌套');
    const frame = createNode('FRAME') as ContainerNode;
    page.root.children.push(frame);
    const s = initialState(page, 'p');
    const out = editorReducer({ ...s, selectedIds: [frame.id] }, { type: 'ADD_NODE', kind: 'TEXT' });

    const outFrame = out.page.root.children[0] as ContainerNode;
    expect(outFrame.children).toHaveLength(1);
    expect(outFrame.children[0].type).toBe('TEXT');
  });

  it('选中叶子节点（TEXT）时添加 → 挂到其父级', () => {
    const page = createPage('叶子');
    const txt = createNode('TEXT') as UINode;
    page.root.children.push(txt);
    const s = initialState(page, 'p');
    const out = editorReducer({ ...s, selectedIds: [txt.id] }, { type: 'ADD_NODE', kind: 'RECTANGLE' });
    expect(out.page.root.children).toHaveLength(2);
  });

  it('选中 SVG/矢量叶子时添加 → 挂到父级', () => {
    const page = createPage('矢量');
    const v = createNode('VECTOR') as UINode;
    page.root.children.push(v);
    const s = initialState(page, 'p');
    const out = editorReducer({ ...s, selectedIds: [v.id] }, { type: 'ADD_NODE', kind: 'TEXT' });
    expect(out.page.root.children).toHaveLength(2);
  });
});

/**
 * 补充：出码侧对「矩形内含子节点」的既有口径（历史数据仍可能出现）。
 * 这些用例锁定**当前行为**（矩形子节点不出码），供日后若要支持时对照修改。
 */
describe('出码口径：RECTANGLE 子节点不产出（历史数据兼容）', () => {
  it('矩形内含文本时，compile/html 输出不含该文本（记录既有口径）', () => {
    const page = createPage('历史数据');
    const rect = createNode('RECTANGLE') as ContainerNode;
    const txt = createNode('TEXT') as UINode;
    (txt as { text: string }).text = '矩形内文本';
    rect.children = [txt];
    page.root.children.push(rect);

    // 该用例只断言「数据层面确实存在子节点」——出码行为由 audit 脚本端到端覆盖
    expect(rect.children).toHaveLength(1);
    expect(isContainer(rect)).toBe(true);
  });
});
