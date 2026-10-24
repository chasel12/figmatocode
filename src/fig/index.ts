/**
 * FR-76 / FR-77 `.fig` 导入导出（视觉层）。
 *
 * 导入：`.fig` → `UIPage[]`；导出：`UIPage[]` → `.fig`。
 * 编解码器按需加载（见 `codec.ts`），产品链路不依赖 kiwi 运行时体积。
 */
export {
  importFig,
  openFigArchive,
  firstPageOf,
  collectImageSources,
  type FigArchive,
  type FigDecoded,
  type FigImportOptions,
  type FigImportResult,
  type FigImportStats,
  type FigNode,
} from './import';
export { exportFig, positionOf, countImageNodes, figBlobOf, type FigExportOptions, type FigExportResult, type OutNodeChange } from './export';
export { loadFigCodec, resetFigCodec, type FigCodec } from './codec';
export {
  pagesToProject,
  importFigFile,
  exportFigBlob,
  type FigOpenResult,
  type FigSaveResult,
} from './project';
export { colorToHex, hexToColor, gradientAngle, angleToTransform, type FigColor } from './paint';
