/**
 * FR-76/77 产品入口层：`.fig` 文件 ↔ 编辑器工程。
 *
 * 与 `import.ts` / `export.ts` 的分工：
 *  - 那两个模块只认 `UIPage[]`（纯数据，可在 node 里跑门禁）；
 *  - 本模块负责「浏览器侧的那点脏活」：File/Blob、按需加载 codec、把 pages 包成 `UIProject`。
 *
 * 为什么单独一层：`schema/types.ts` 与 `compile.ts` 是冻结区（计划书硬约束），
 * 所以 `.fig` 的工程语义（components/tokens/flows 从哪来）只能在这里显式补，
 * 不能顺手往 AST 上加字段。
 */
import type { UIPage, UIProject } from '../schema/types';
import { importFig, type FigImportStats } from './import';
import { exportFig } from './export';
import { loadFigCodec } from './codec';

/**
 * `UIPage[]` → `UIProject`。
 *
 * 组件 / 样式 / 原型流一律空表：`.fig` 的组件与实例在导入时已摊平成 Frame（plan §11.6
 * 明确不做组件语义），此时再编造 components 只会让面板显示一堆「有定义无实例」的孤儿。
 */
export function pagesToProject(pages: UIPage[], name?: string): UIProject {
  return {
    version: 2,
    name: name || pages[0]?.name || '未命名项目',
    pages,
    components: {},
    tokens: [],
    flows: [],
  };
}

export interface FigOpenResult {
  project: UIProject;
  warnings: string[];
  stats: FigImportStats;
}

/**
 * 打开一个 `.fig` 文件（浏览器侧入口）。
 *
 * 首次调用会加载 `@open-pencil/kiwi`（约 100–200ms 编译 schema），之后走缓存。
 * 页面为空时直接抛错——空工程载入编辑器只会让人以为「文件坏了」。
 */
export async function importFigFile(file: File): Promise<FigOpenResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const codec = await loadFigCodec();
  const result = importFig(bytes, codec.decode);
  if (result.pages.length === 0) throw new Error('文件里没有可用的页面');
  return {
    project: pagesToProject(result.pages, file.name.replace(/\.fig$/i, '')),
    warnings: result.warnings,
    stats: result.stats,
  };
}

export interface FigSaveResult {
  blob: Blob;
  stats: { pages: number; nodes: number; images: number };
}

/** 把当前工程写成 `.fig`（浏览器侧入口，多页一并写出） */
export async function exportFigBlob(project: UIProject, fileName?: string): Promise<FigSaveResult> {
  const codec = await loadFigCodec();
  const { bytes, stats } = await exportFig(project.pages, codec.encode, {
    fileName: fileName || project.name || 'project',
  });
  // 复制成独立 ArrayBuffer：Uint8Array 可能是大 buffer 的视图，直接传会让 Blob 带上整块内存
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return { blob: new Blob([copy], { type: 'application/octet-stream' }), stats };
}
