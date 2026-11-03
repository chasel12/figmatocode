/**
 * 差异 #20 回归锁：外部/手改 v2 工程**容器**缺 children 数组 → parseProject 必须补齐为 []，
 * 不得把畸形形状透传给画布（历史表现：NodeView children.map 抛错、编辑器白屏）。
 *
 * 2026-11-03 补一条反向锁：**叶子不得被补 children** —— 补了会让 `'children' in node`
 * 这类判据把 TEXT 当成容器（丢文字 bug 的源头，见 `src/editor/project.ts` 注释）。
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
            { id: 'n1', name: '无 children 叶子', type: 'TEXT', text: '叶子', layout: { mode: 'ABSOLUTE', x: 10, y: 10, width: 50, height: 50, widthMode: 'FIXED', heightMode: 'FIXED', padding: [0, 0, 0, 0], gap: 0 }, style: { fills: [{ type: 'SOLID', color: '#ff0000' }] } },
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
  it('容器 children=null → 归一为 []；叶子**不补** children（补了会被导出侧误判成容器）', () => {
    const project = parseProjectOnly(JSON.parse(JSON.stringify(leafMissingChildren)));
    const root = project.pages[0].root as unknown as { children: Array<Record<string, unknown>> };
    expect(Array.isArray(root.children)).toBe(true);
    const n1 = root.children.find((c) => c.id === 'n1') as { children: unknown };
    const f2 = root.children.find((c) => c.id === 'f2') as { children: unknown };
    /**
     * 2026-11-03 反转：早先这里断言叶子必须被补成 `[]`，那正是丢文字 bug 的源头。
     * `src/fig/export.ts` 用 `'children' in node` 判容器，叶子一旦被补上 `children`，
     * TEXT 就变成「容器」，`textFieldsOf` 整块跳过 → `.fig` 里一个字符都没有。
     */
    expect('children' in n1).toBe(false);
    expect(Array.isArray(f2.children)).toBe(true);
    expect(f2.children).toEqual([]);
  });

  it('叶子上的脏 children 键会被删掉（旧版护栏留下的）', () => {
    const data = JSON.parse(JSON.stringify(leafMissingChildren));
    // 模拟被旧版 ensureChildren 污染过的工程文件
    (data.project.pages[0].root.children[0] as Record<string, unknown>).children = [];
    const project = parseProjectOnly(data);
    const root = project.pages[0].root as unknown as { children: Array<Record<string, unknown>> };
    expect('children' in root.children[0]!).toBe(false);
  });

  it('深层嵌套同样归一（递归覆盖孙子层）', () => {
    const data = JSON.parse(JSON.stringify(leafMissingChildren));
    data.project.pages[0].root.children[1].children = [
      { id: 'g1', name: '孙叶子', type: 'TEXT', layout: data.project.pages[0].root.children[1].layout, style: {} },
    ];
    const project = parseProjectOnly(data);
    const root = project.pages[0].root as unknown as { children: Array<{ id: string; children?: unknown[] }> };
    const f2 = root.children[1];
    const g1 = (f2.children as Array<{ id: string; children?: unknown[] }>)[0]!;
    // 孙层是 TEXT 叶子：同样不补 children
    expect('children' in g1).toBe(false);
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

/**
 * 页面 id 去重兜底（2026-11-02）
 *
 * 修复前 `.fig` 导入器直接用 `createPage()` 的固定 id `'page'`，六页全同。
 * 编辑器 `SELECT_PAGE` 的分支是 `if (action.id === state.currentPageId) return state;`
 * —— 点任意一页都命中早退，**永远切不了页**，用户看到的是「打开 fig 只有一页」。
 * 导入侧已修，但**修复前存下的 `project.json` 里就是重复 id**，读侧必须兜住。
 */
describe('parseProject：页面 id 去重兜底', () => {
  const dupProject = (ids: string[]) => ({
    version: 2,
    project: {
      version: 2,
      name: '重复 id 工程',
      pages: ids.map((id, i) => ({
        id,
        name: `页${i + 1}`,
        viewport: { width: 375, height: 812 },
        root: {
          id, // 与页面 id 相等（createPage 的既有语义）
          name: `页${i + 1}`,
          type: 'FRAME',
          layout: { mode: 'VERTICAL', width: 375, height: 812, widthMode: 'FIXED', heightMode: 'FIXED', padding: [0, 0, 0, 0], gap: 0 },
          style: {},
          children: [],
        },
      })),
      components: {},
      tokens: [],
      flows: [],
    },
    currentPageId: 'page',
  });

  it('六页同 id → 去重后两两不同，第一页保留原 id', () => {
    const project = parseProjectOnly(dupProject(['page', 'page', 'page', 'page', 'page', 'page']));
    const ids = project.pages.map((p) => p.id);
    expect(new Set(ids).size).toBe(6);
    // 第一页的 id 不动：currentPageId 大概率指向它，改了会「打开就跳页」
    expect(ids[0]).toBe('page');
    // 页面名与顺序不变
    expect(project.pages.map((p) => p.name)).toEqual(['页1', '页2', '页3', '页4', '页5', '页6']);
  });

  it('根 id 原本与页面 id 相等时同步改（几何 map 按根 id 索引）', () => {
    const project = parseProjectOnly(dupProject(['page', 'page', 'page']));
    for (const p of project.pages) expect(p.root.id).toBe(p.id);
    expect(new Set(project.pages.map((p) => p.root.id)).size).toBe(3);
  });

  it('id 本来就唯一时零改动（幂等）', () => {
    const project = parseProjectOnly(dupProject(['p-1', 'p-2', 'p-3']));
    expect(project.pages.map((p) => p.id)).toEqual(['p-1', 'p-2', 'p-3']);
    expect(project.pages.map((p) => p.root.id)).toEqual(['p-1', 'p-2', 'p-3']);
  });
});
