/**
 * 差异 #20 回归锁：外部/手改 v2 工程叶子节点缺 children 数组 → parseProject 必须补齐为 []，
 * 不得把畸形形状透传给画布（历史表现：NodeView children.map 抛错、编辑器白屏）。
 */
import { describe, it, expect } from 'vitest';
import { parseProject, parseProjectOnly } from '../src/editor/project';

const leafMissingChildren = {
  version: 2,
  project: {
    version: 2,
    name: '畸形工程',
    pages: [
      {
        id: 'p1',
        name: '页一',
        viewport: { width: 375, height: 812 },
        root: {
          id: 'root', name: '页一', type: 'FRAME',
          layout: { mode: 'ABSOLUTE', x: 0, y: 0, width: 375, height: 812, widthMode: 'FIXED', heightMode: 'FIXED', padding: [0, 0, 0, 0], gap: 0 },
          style: { fills: [{ type: 'SOLID', color: '#ffffff' }] },
          children: [
            { id: 'n1', name: '无 children 叶子', type: 'RECTANGLE', layout: { mode: 'ABSOLUTE', x: 10, y: 10, width: 50, height: 50, widthMode: 'FIXED', heightMode: 'FIXED', padding: [0, 0, 0, 0], gap: 0 }, style: { fills: [{ type: 'SOLID', color: '#ff0000' }] } },
            { id: 'f2', name: '容器但 children=null', type: 'FRAME', layout: { mode: 'VERTICAL', x: 0, y: 0, width: 100, height: 100, widthMode: 'FIXED', heightMode: 'FIXED', padding: [0, 0, 0, 0], gap: 0 }, style: {}, children: null },
          ],
        },
      },
    ],
    components: {}, tokens: [], flows: [],
  },
  currentPageId: 'p1',
};

describe('parseProject：children 畸形护栏（差异 #20）', () => {
  it('叶子缺 children → 补为 []；children=null 容器 → 归一为 []', () => {
    const project = parseProjectOnly(JSON.parse(JSON.stringify(leafMissingChildren)));
    const root = project.pages[0].root as unknown as { children: Array<Record<string, unknown>> };
    expect(Array.isArray(root.children)).toBe(true);
    const n1 = root.children.find((c) => c.id === 'n1') as { children: unknown };
    const f2 = root.children.find((c) => c.id === 'f2') as { children: unknown };
    expect(Array.isArray(n1.children)).toBe(true);
    expect(n1.children).toEqual([]);
    expect(Array.isArray(f2.children)).toBe(true);
  });

  it('深层嵌套同样补齐（递归覆盖孙子层）', () => {
    const data = JSON.parse(JSON.stringify(leafMissingChildren));
    data.project.pages[0].root.children[1].children = [
      { id: 'g1', name: '孙叶子', type: 'TEXT', layout: data.project.pages[0].root.children[1].layout, style: {} },
    ];
    const project = parseProjectOnly(data);
    const root = project.pages[0].root as unknown as { children: Array<{ id: string; children?: unknown[] }> };
    const f2 = root.children[1];
    const g1 = (f2.children as Array<{ id: string; children?: unknown[] }>)[0];
    expect(Array.isArray(g1.children)).toBe(true);
  });

  it('正常工程零改动（幂等）', () => {
    const good = {
      version: 2,
      project: {
        version: 2, name: 'g', pages: [{ id: 'p', name: 'p', viewport: { width: 10, height: 10 }, root: { id: 'r', name: 'r', type: 'FRAME', layout: { mode: 'VERTICAL', width: 10, height: 10, widthMode: 'FIXED', heightMode: 'FIXED', padding: [0, 0, 0, 0] as [number, number, number, number], gap: 0 }, style: {}, children: [] } }],
        components: {}, tokens: [], flows: [],
      },
    };
    const before = JSON.stringify(good.project);
    const after = JSON.stringify(parseProject(good).project);
    expect(JSON.parse(after).pages[0].root.children).toEqual([]);
    expect(before.length > 0 && after.length > 0).toBe(true);
  });
});
