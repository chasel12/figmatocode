import { createContext, useContext } from 'react';
import type { Geometry, GeometryMap } from '../compiler';
import type { UIPage } from '../schema/types';

/**
 * Canvas 向外暴露的已解析几何（FR-10 对齐工具在右栏属性面板使用）。
 * Canvas 每次 state.page 变化时更新；无 Canvas 时为 null。
 *
 * **只含当前页**。多页并排渲染时，非当前页的几何在 `CanvasPagesContext` 里按页分开存 ——
 * 不能合并成一张表：AI 生成的多页里节点 id 是各页独立编号的（`frame-1` 每页都有），
 * 合并会互相覆盖。
 */
export const CanvasGeometryContext = createContext<GeometryMap | null>(null);

export function useCanvasGeometry(): GeometryMap | null {
  return useContext(CanvasGeometryContext);
}

/**
 * 画布上的一页（含它在并排布局里的位置）。
 *
 * 为什么 `geometry` 是**页面内坐标**而不是画布坐标：渲染时外层套一个
 * `Group x={offsetX}`，里面全用页面内坐标 —— 这样 NodeView / 命中 / 吸附
 * 这些既有逻辑一行都不用改，偏移只发生在最外层。
 */
export interface PageFrame {
  page: UIPage;
  /** 该页所有节点的几何（页面内坐标，原点 = 页面左上角） */
  geometry: GeometryMap;
  /** 该页 root 的几何（页面内坐标；缺省 = 页面还没测量出来） */
  rootGeom: Geometry | undefined;
  /** 该页在画布上的横向偏移 */
  offsetX: number;
}

/**
 * 画布上相邻两页的水平间距（px）。
 *
 * 取 80 与 `.fig` 导出侧一致（`src/fig/export.ts` 的 `PAGE_GAP`）——
 * 编辑器画布和 Figma 里打开同一份文件，页与页的疏密应该看起来一样。
 */
export const PAGE_GAP = 80;

/** 并排布局的所有页，顺序与左侧「页面」面板一致 */
export const CanvasPagesContext = createContext<PageFrame[] | null>(null);

export function useCanvasPages(): PageFrame[] | null {
  return useContext(CanvasPagesContext);
}

/**
 * 把所有页按 `(页宽 + PAGE_GAP)` 横排，返回每页的几何 + 偏移。
 *
 * 抽成纯函数是为了**能测**：这段逻辑有两个只有多页才暴露的坑，
 * 光靠肉眼截图很难守住回归 ——
 *
 * 1. **几何必须按页分开存**。AI 生成的多页里节点 id 是各页独立编号的
 *    （每页都有 `frame-1`），合并成一张大表会互相覆盖，非当前页的节点会
 *    画到当前页的坐标上（表现为「第 2 页起整页内容错乱」）。
 * 2. **偏移只累加页宽 + 间距**，不能加节点几何的 x（页面根未必在原点）。
 *
 * `cache` 按**页面对象引用**缓存解析结果：`syncPages` 只替换被改的那一页，
 * 其余页引用不变 → 拖动当前页时 19 页 demo 不用每帧重跑 19 次完整布局。
 */
export function stackPages(
  pages: UIPage[],
  resolve: (page: UIPage) => GeometryMap,
  cache?: WeakMap<UIPage, GeometryMap>,
): PageFrame[] {
  const list: PageFrame[] = [];
  let offsetX = 0;
  for (const page of pages) {
    let geometry = cache?.get(page);
    if (!geometry) {
      geometry = resolve(page);
      cache?.set(page, geometry);
    }
    list.push({ page, geometry, rootGeom: geometry[page.root.id], offsetX });
    offsetX += page.viewport.width + PAGE_GAP;
  }
  return list;
}
