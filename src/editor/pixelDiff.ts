import pixelmatch from 'pixelmatch';
import type { UIPage } from '../schema/types';
import type { CompiledPage } from '../compiler/css-model';
import type { GeometryMap } from '../compiler/layout';
import { buildPreviewDom } from '../generator/html';
import { buildReferenceDom } from '../generator/reference';
import { analyzeDiffRegions, buildDiffMask, type DiffAnalysis } from './diffRegions';
import { FONT_STACK } from '../font';

export interface DiffResult {
  similarity: number;
  width: number;
  height: number;
  diffPixels: number;
  referenceUrl: string;
  renderUrl: string;
  diffUrl: string;
  passed: boolean;
  analysis: DiffAnalysis;
}

export const SIMILARITY_TARGET = 0.98;

async function renderDomToCanvas(bodyHtml: string, css: string, width: number, height: number): Promise<HTMLCanvasElement> {
  // 注：svg-as-img 沙箱不加载外链字体，Inter 未载入时回退 Arial（编辑器内 Pixel Diff 近似，e2e 严格 diff 不走此路径）；
  // 属性内引号须单引号（FONT_STACK 双引号会截断 style="…"）
  const xhtml = `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;position:relative;background:#ffffff;font-family:${FONT_STACK.replace(/"/g, "'")};"><style>${css}</style>${bodyHtml}</div>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject x="0" y="0" width="100%" height="100%">${xhtml}</foreignObject></svg>`;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('SVG 渲染失败'));
  });
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

/**
 * 浏览器内 Pixel Diff：
 * reference = Layout Resolver 几何（设计意图，绝对定位渲染）
 * render    = 编译器输出的 flex CSS（真实代码路径）
 * 两者逐像素对比 → 验证 Layout/Responsive Compiler 的还原度。
 */
export async function runPixelDiff(
  page: UIPage,
  compiled: CompiledPage,
  geometry: GeometryMap,
): Promise<DiffResult> {
  const rootGeom = geometry[page.root.id];
  const width = page.viewport.width;
  const height = Math.max(rootGeom ? Math.round(rootGeom.height) : page.viewport.height, 1);

  const referenceDom = buildReferenceDom(page, compiled, geometry);
  const renderDom = buildPreviewDom(page, compiled);

  const [refCanvas, renderCanvas] = await Promise.all([
    renderDomToCanvas(referenceDom.bodyHtml, referenceDom.css, width, height),
    renderDomToCanvas(renderDom.bodyHtml, renderDom.css, width, height),
  ]);

  const refCtx = refCanvas.getContext('2d')!;
  const renderCtx = renderCanvas.getContext('2d')!;
  const refData = refCtx.getImageData(0, 0, width, height);
  const renderData = renderCtx.getImageData(0, 0, width, height);

  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const diffCtx = diffCanvas.getContext('2d')!;
  const diffData = diffCtx.createImageData(width, height);

  const diffPixels = pixelmatch(refData.data, renderData.data, diffData.data, width, height, {
    threshold: 0.1,
    includeAA: false,
  });
  diffCtx.putImageData(diffData, 0, 0);

  const total = width * height;
  const similarity = 1 - diffPixels / total;

  const mask = buildDiffMask(diffData.data, total);
  const analysis = analyzeDiffRegions(page, geometry, mask, width, height);

  return {
    similarity,
    width,
    height,
    diffPixels,
    referenceUrl: refCanvas.toDataURL('image/png'),
    renderUrl: renderCanvas.toDataURL('image/png'),
    diffUrl: diffCanvas.toDataURL('image/png'),
    passed: similarity >= SIMILARITY_TARGET,
    analysis,
  };
}
