import { createContext, useContext } from 'react';
import type { GeometryMap } from '../compiler';

/**
 * Canvas 向外暴露的已解析几何（FR-10 对齐工具在右栏属性面板使用）。
 * Canvas 每次 state.page 变化时更新；无 Canvas 时为 null。
 */
export const CanvasGeometryContext = createContext<GeometryMap | null>(null);

export function useCanvasGeometry(): GeometryMap | null {
  return useContext(CanvasGeometryContext);
}
