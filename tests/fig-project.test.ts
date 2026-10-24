/**
 * `.fig` 产品入口层（`src/fig/project.ts`）：
 * 文件 ↔ 编辑器工程的这层「脏活」——File/Blob、工程包装、空页兜底。
 *
 * 格式本身的往返正确性由 `tests/fig.test.ts` 与 `npm run fig:check` 负责，
 * 这里只测「接进产品之后还成立吗」。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exportFigBlob, importFigFile, pagesToProject } from '../src/fig/project';
import { createPage } from '../src/schema/factory';

const FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'fig');

function fileOf(name: string): File {
  const bytes = readFileSync(join(FIXTURES, name));
  return new File([new Uint8Array(bytes)], name);
}

describe('pagesToProject', () => {
  it('包成 v2 工程，组件/样式/原型流一律空表（.fig 没有这些语义）', () => {
    const page = createPage('首页');
    const project = pagesToProject([page], '我的工程');
    expect(project).toMatchObject({ version: 2, name: '我的工程' });
    expect(project.pages).toHaveLength(1);
    expect(project.components).toEqual({});
    expect(project.tokens).toEqual([]);
    expect(project.flows).toEqual([]);
  });

  it('工程名缺省时回退首页名，再回退占位名（不产出空串）', () => {
    expect(pagesToProject([createPage('详情页')]).name).toBe('详情页');
    expect(pagesToProject([], '').name).toBe('未命名项目');
  });
});

describe('importFigFile', () => {
  it('真实 Figma 文件 → 工程（页名来自文件名，不带 .fig 后缀）', async () => {
    const { project, stats } = await importFigFile(fileOf('circle-text.fig'));
    expect(project.name).toBe('circle-text');
    expect(project.pages.length).toBeGreaterThanOrEqual(1);
    expect(stats.imported).toBeGreaterThan(0);
    // 每页都要有 root 与 viewport，否则载入编辑器会炸
    for (const p of project.pages) {
      expect(p.root).toBeTruthy();
      expect(p.viewport.width).toBeGreaterThan(0);
    }
  });

  it('多页文件页数保留（slots.fig 是 2 页）', async () => {
    const { project } = await importFigFile(fileOf('slots.fig'));
    expect(project.pages).toHaveLength(2);
  });
});

describe('exportFigBlob', () => {
  it('工程 → .fig → 再打开，页数一致（产品链路的闭环）', async () => {
    const first = await importFigFile(fileOf('gold-preview.fig'));
    const { blob, stats } = await exportFigBlob(first.project, 'roundtrip');
    expect(blob.size).toBeGreaterThan(0);
    expect(stats.pages).toBe(first.project.pages.length);

    const again = await importFigFile(new File([blob], 'roundtrip.fig'));
    expect(again.project.pages).toHaveLength(first.project.pages.length);
  });

  it('空工程直接报错，而不是产出打不开的坏文件', async () => {
    await expect(exportFigBlob(pagesToProject([], 'empty'))).rejects.toThrow(/没有可导出的页面/);
  });
});
