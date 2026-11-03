import { describe, it, expect } from 'vitest';
import { PAGE_GAP, stackPages } from '../src/editor/canvasContext';
import { createPage } from '../src/schema/factory';
import type { GeometryMap } from '../src/compiler';
import type { UIPage } from '../src/schema/types';

/**
 * 多页并排画布的布局计算。
 *
 * 这段逻辑的两个坑都**只有多页才暴露**，单页工程下恒等于旧行为：
 *  - 几何按页分开存（否则同名节点 id 互相覆盖）
 *  - 偏移只累加页宽 + 间距（页面根未必在原点）
 */
function page(id: string, name: string, w = 375, h = 812): UIPage {
  const p = createPage(name, w, h);
  p.id = id;
  p.root.id = id;
  return p;
}

/** 桩：root 铺满视口，原点在 (0,0) */
const resolve = (p: UIPage): GeometryMap => ({
  [p.root.id]: { x: 0, y: 0, width: p.viewport.width, height: p.viewport.height },
});

describe('多页并排布局（stackPages）', () => {
  it('六页按「页宽 + 间距」依次排开', () => {
    const pages = ['今日', '训练', '动作库', '记录', '进度', '我的'].map((n, i) => page(`p${i}`, n));
    const frames = stackPages(pages, resolve);
    expect(frames.map((f) => f.offsetX)).toEqual([0, 455, 910, 1365, 1820, 2275]);
    expect(frames.map((f) => f.page.name)).toEqual(['今日', '训练', '动作库', '记录', '进度', '我的']);
  });

  it('间距与 .fig 导出侧一致（PAGE_GAP）', () => {
    const frames = stackPages([page('a', 'A'), page('b', 'B')], resolve);
    expect(frames[1].offsetX).toBe(375 + PAGE_GAP);
  });

  it('页宽不同时按各自宽度累加', () => {
    const frames = stackPages([page('a', 'A', 375), page('b', 'B', 414), page('c', 'C', 320)], resolve);
    expect(frames.map((f) => f.offsetX)).toEqual([0, 375 + PAGE_GAP, 375 + PAGE_GAP + 414 + PAGE_GAP]);
  });

  it('几何按页分开存：同名节点 id 不会互相覆盖', () => {
    // AI 生成的多页里节点 id 是各页独立编号的，`frame-1` 每页都有
    const pages = [page('p0', '第一页'), page('p1', '第二页')];
    const frames = stackPages(pages, (p) => ({
      [p.root.id]: { x: 0, y: 0, width: p.viewport.width, height: p.viewport.height },
      'frame-1': { x: p.id === 'p0' ? 12 : 34, y: 0, width: 100, height: 40 },
    }));
    expect(frames[0].geometry['frame-1'].x).toBe(12);
    expect(frames[1].geometry['frame-1'].x).toBe(34);
    // 两张表是不同对象，合并就会退化成「后者覆盖前者」
    expect(frames[0].geometry).not.toBe(frames[1].geometry);
  });

  it('rootGeom 取的是**自己那页**的根，不是第一页的', () => {
    const pages = [page('p0', 'A'), page('p1', 'B')];
    const frames = stackPages(pages, (p) => ({
      [p.root.id]: { x: p.id === 'p0' ? 0 : 7, y: p.id === 'p0' ? 0 : 9, width: 375, height: 812 },
    }));
    expect(frames[0].rootGeom).toEqual({ x: 0, y: 0, width: 375, height: 812 });
    expect(frames[1].rootGeom).toEqual({ x: 7, y: 9, width: 375, height: 812 });
  });

  it('页面根不在原点时，偏移只按页宽算（不把根的 x 算进去）', () => {
    const pages = [page('p0', 'A'), page('p1', 'B')];
    const frames = stackPages(pages, (p) => ({
      [p.root.id]: { x: 40, y: 24, width: 375, height: 812 },
    }));
    expect(frames[1].offsetX).toBe(375 + PAGE_GAP);
  });

  it('按页面对象引用缓存：未改动的页不重跑布局', () => {
    const a = page('p0', 'A');
    const b = page('p1', 'B');
    const cache = new WeakMap<UIPage, GeometryMap>();
    let calls = 0;
    const counting = (p: UIPage): GeometryMap => {
      calls += 1;
      return resolve(p);
    };

    const first = stackPages([a, b], counting, cache);
    expect(calls).toBe(2);

    // 模拟 syncPages：只替换被改的那一页
    const b2 = page('p1', 'B');
    const second = stackPages([a, b2], counting, cache);
    expect(calls).toBe(3); // 只有 b2 重算
    expect(second[0].geometry).toBe(first[0].geometry); // a 命中缓存
    expect(second[1].geometry).not.toBe(first[1].geometry);
  });

  it('空页表返回空数组（不抛错）', () => {
    expect(stackPages([], resolve)).toEqual([]);
  });
});
