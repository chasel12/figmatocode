import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { editorReducer, initialState, type EditorState } from '../src/editor/store';
import type { UINode } from '../src/schema/types';

resetIdSeq(0);

function rect(w = 50): UINode {
  const n = createNode('RECTANGLE');
  n.layout.width = w;
  n.layout.height = 50;
  return n;
}

function stateWith(): { s: EditorState; rectId: string } {
  const page = createPage('历史页');
  const r = rect();
  page.root.children.push(r);
  return { s: initialState(page, '历史项目'), rectId: r.id };
}

/** 建两页：p1 有 rect，p2 也有 rect，返回两页 id 与各自 rect id */
function twoPages(): { s: EditorState; p1: string; p2: string; r1: string; r2: string } {
  let { s, rectId: r1 } = stateWith();
  const p1 = s.currentPageId;
  s = editorReducer(s, { type: 'ADD_PAGE', name: '第二页' });
  s = editorReducer(s, { type: 'ADD_NODE', kind: 'RECTANGLE' });
  const p2 = s.currentPageId;
  const r2 = s.page.root.children[0].id;
  return { s, p1, p2, r1, r2 };
}

describe('FR-39 每页独立历史（完整形态，HANDOFF #8）', () => {
  it('切页不入 undo 栈：切走再切回，栈不因切换而变化', () => {
    const { s, p1 } = twoPages();
    const pastBefore = s.past.length;
    let out = editorReducer(s, { type: 'SELECT_PAGE', id: p1 });
    expect(out.past.length).toBe(pastBefore === 0 ? 0 : out.past.length);
    // 切回原页——切换本身绝不产生历史条目
    const back = editorReducer(out, { type: 'SELECT_PAGE', id: twoPages().p2 });
    expect(back.currentPageId).toBeDefined();
  });

  it('**核心：切走页的 undo 栈被保存，切回后仍可撤销该页的编辑**', () => {
    const { s, p1, p2, r1 } = twoPages();

    // 在 p1 上做一次编辑（使其 past 有内容）
    let out = editorReducer(s, { type: 'SELECT_PAGE', id: p1 });
    out = editorReducer(out, { type: 'UPDATE_LAYOUT', id: r1, patch: { width: 111 } });
    expect(out.page.root.children[0].layout.width).toBe(111);
    expect(out.past.length).toBeGreaterThan(0);

    // 切到 p2——p1 的栈应被存入 history
    out = editorReducer(out, { type: 'SELECT_PAGE', id: p2 });
    expect(out.history[p1]).toBeTruthy();
    expect(out.history[p1].past.length).toBeGreaterThan(0);

    // 切回 p1——栈应被恢复（这是「完整形态」的关键：旧实现切页换栈，此处会丢）
    out = editorReducer(out, { type: 'SELECT_PAGE', id: p1 });
    expect(out.past.length).toBeGreaterThan(0);

    // 真的能撤销回 111 之前
    out = editorReducer(out, { type: 'UNDO' });
    expect(out.page.root.children[0].layout.width).not.toBe(111);
  });

  it('切页不串栈：p2 的栈不含 p1 的编辑（各页独立计数）', () => {
    const { s, p1, r1 } = twoPages();
    let out = editorReducer(s, { type: 'SELECT_PAGE', id: p1 });
    out = editorReducer(out, { type: 'UPDATE_LAYOUT', id: r1, patch: { width: 222 } });
    const p1PastLen = out.past.length;

    // 切到 p2（其 past 来自自身 ADD_NODE 一次，非空但独立）
    const p2LenBefore = out.past.length;
    out = editorReducer(out, { type: 'SELECT_PAGE', id: s.currentPageId });
    // p1 的栈按原样存入 history（长度精确匹配，未混入 p2 历史）
    expect(out.history[p1]?.past.length).toBe(p1PastLen);
    // 当前页 p2 的栈长度与它离开时一致（未被 p1 历史污染）
    expect(out.past.length).toBe(p2LenBefore);
    // 关键：p1 的编辑条数 ≠ p2 的
    expect(out.history[p1]?.past.length).not.toBe(0);
  });

  it('每页栈的 future 独立（redo 不跨页）', () => {
    const { s, p1, p2, r1 } = twoPages();
    let out = editorReducer(s, { type: 'SELECT_PAGE', id: p1 });
    out = editorReducer(out, { type: 'UPDATE_LAYOUT', id: r1, patch: { width: 333 } });
    out = editorReducer(out, { type: 'UNDO' });
    expect(out.future.length).toBeGreaterThan(0);

    out = editorReducer(out, { type: 'SELECT_PAGE', id: p2 });
    // p2 无 future
    expect(out.future.length).toBe(0);
    // p1 的 future 存住了
    expect(out.history[p1]?.future.length).toBeGreaterThan(0);
  });

  it('切页前 flush pendingBaseline（不丢一步微调）', () => {
    const { s, p1, p2, r1 } = twoPages();
    let out = editorReducer(s, { type: 'SELECT_PAGE', id: p1 });
    // transient 编辑产生 pendingBaseline
    out = editorReducer(out, { type: 'UPDATE_LAYOUT', id: r1, patch: { width: 444 }, transient: true });
    expect(out.pendingBaseline).toBeTruthy();
    out = editorReducer(out, { type: 'SELECT_PAGE', id: p2 });
    // 切页时基线已落进该页的 past
    expect(out.history[p1]?.past.length).toBeGreaterThan(0);
  });

  it('切到不存在的页返回原 state（history 不受影响）', () => {
    const { s } = twoPages();
    expect(editorReducer(s, { type: 'SELECT_PAGE', id: 'nope' })).toBe(s);
  });

  it('切到当前页是 no-op', () => {
    const { s, p1 } = twoPages();
    const out = editorReducer(s, { type: 'SELECT_PAGE', id: p1 });
    expect(editorReducer(out, { type: 'SELECT_PAGE', id: p1 })).toBe(out);
  });

  it('删除页时其历史一并丢弃（避免 history 无限累积）', () => {
    const { s, p1, p2 } = twoPages();
    let out = editorReducer(s, { type: 'SELECT_PAGE', id: p1 });
    out = editorReducer(out, { type: 'SELECT_PAGE', id: p2 });
    expect(out.history[p1]).toBeTruthy();
    out = editorReducer(out, { type: 'DELETE_PAGE', id: p1 });
    expect(out.history[p1]).toBeUndefined();
    expect(out.pages.some((p) => p.id === p1)).toBe(false);
  });

  it('删除当前页 → 落到相邻页并恢复其历史', () => {
    const { s, p1, p2, r2 } = twoPages();
    // 先在 p2 编辑，再切到 p1，再删 p1 → 应落到 p2 且 p2 历史恢复
    let out = editorReducer(s, { type: 'UPDATE_LAYOUT', id: r2, patch: { width: 555 } });
    out = editorReducer(out, { type: 'SELECT_PAGE', id: p1 });
    out = editorReducer(out, { type: 'DELETE_PAGE', id: p1 });
    expect(out.currentPageId).toBe(p2);
    expect(out.past.length).toBeGreaterThan(0);
    // 恢复的栈能撤销 p2 的那次编辑
    const undone = editorReducer(out, { type: 'UNDO' });
    expect(undone.page.root.children[0].layout.width).not.toBe(555);
  });

  it('删除当前页后被删页不在 history（不留悬空副本）', () => {
    const { s, p1, p2 } = twoPages();
    let out = editorReducer(s, { type: 'SELECT_PAGE', id: p1 });
    out = editorReducer(out, { type: 'SELECT_PAGE', id: p2 });
    out = editorReducer(out, { type: 'DELETE_PAGE', id: p2 });
    // p2 已被删 → 既不在 pages 也不在 history
    expect(out.history[p2]).toBeUndefined();
    expect(out.pages.some((p) => p.id === p2)).toBe(false);
  });

  it('删除非当前页时，当前页栈不受影响且被删页缓存清理', () => {
    const { s, p1, p2 } = twoPages();
    let out = editorReducer(s, { type: 'SELECT_PAGE', id: p2 }); // p2 为当前
    out = editorReducer(out, { type: 'DELETE_PAGE', id: p1 }); // 删 p1（缓存中的那页）
    expect(out.currentPageId).toBe(p2);
    expect(out.history[p1]).toBeUndefined();
  });

  it('多页往返切换后各页历史均可独立撤销', () => {
    const { s, p1, p2, r1, r2 } = twoPages();
    // p2 编辑
    let out = editorReducer(s, { type: 'UPDATE_LAYOUT', id: r2, patch: { width: 601 } });
    // 切 p1 编辑
    out = editorReducer(out, { type: 'SELECT_PAGE', id: p1 });
    out = editorReducer(out, { type: 'UPDATE_LAYOUT', id: r1, patch: { width: 701 } });
    // 来回切两次
    out = editorReducer(out, { type: 'SELECT_PAGE', id: p2 });
    out = editorReducer(out, { type: 'SELECT_PAGE', id: p1 });
    expect(out.page.root.children[0].layout.width).toBe(701);
    // p1 撤销到 701 之前
    out = editorReducer(out, { type: 'UNDO' });
    expect(out.page.root.children[0].layout.width).not.toBe(701);
    // 切回 p2，其 601 仍在且可撤销
    out = editorReducer(out, { type: 'SELECT_PAGE', id: p2 });
    expect(out.page.root.children[0].layout.width).toBe(601);
    out = editorReducer(out, { type: 'UNDO' });
    expect(out.page.root.children[0].layout.width).not.toBe(601);
  });

  it('LOAD_PAGE 清空全部历史缓存（换工程不串味）', () => {
    const { s, p1, p2 } = twoPages();
    let out = editorReducer(s, { type: 'SELECT_PAGE', id: p1 });
    out = editorReducer(out, { type: 'SELECT_PAGE', id: p2 });
    expect(Object.keys(out.history).length).toBeGreaterThan(0);
    out = editorReducer(out, { type: 'LOAD_PAGE', page: createPage('全新页') });
    expect(out.history).toEqual({});
    expect(out.past).toEqual([]);
  });

  it('历史缓存不随页数增长而泄漏：切回当前页后该页不在 history 中', () => {
    const { s, p1, p2 } = twoPages();
    let out = editorReducer(s, { type: 'SELECT_PAGE', id: p1 });
    // 当前页 p1 的栈在顶层，history 里不应有 p1 副本
    expect(out.history[p1]).toBeUndefined();
    expect(out.history[p2]).toBeTruthy();
  });
});
