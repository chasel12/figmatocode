import type { UIPage } from '../schema/types';
import type { CompiledPage } from '../compiler/css-model';
import type { GeometryMap } from '../compiler/layout';
import { escapeHtml, collectFxDefs, type DomParts } from './html';
import { svgOfVector } from './vector';
import { FONT_FACE_CSS, FONT_STACK } from '../font';

/**
 * 几何（Layout Resolver）→ 绝对定位 DOM（reference 侧）。
 * Pixel Diff 用它对比 flex CSS 渲染，验证 Layout/Responsive Compiler 正确性。
 */
export function buildReferenceDom(
  page: UIPage,
  compiled: CompiledPage,
  geometry: GeometryMap,
): DomParts {
  const classNames = new Map(compiled.nodes.map((n) => [n.id, n.className]));
  const rootGeom = geometry[page.root.id];
  const ox = rootGeom ? rootGeom.x : 0;
  const oy = rootGeom ? rootGeom.y : 0;

  const cssParts = compiled.nodes.map((node) => {
    const g = geometry[node.id];
    if (!g) return '';
    const decls = Object.entries(node.css)
      .filter(
        ([prop]) =>
          prop !== 'width' &&
          prop !== 'height' &&
          prop !== 'min-height' &&
          prop !== 'max-width' &&
          prop !== 'display' &&
          prop !== 'flex-direction' &&
          prop !== 'gap' &&
          prop !== 'align-items' &&
          prop !== 'justify-content' &&
          prop !== 'flex' &&
          prop !== 'min-width' &&
          prop !== 'min-height',
      )
      .map(([prop, value]) => `  ${prop}: ${value};`)
      .join('\n');
    const geo = [
      '  position: absolute;',
      `  left: ${Math.round(g.x - ox)}px;`,
      `  top: ${Math.round(g.y - oy)}px;`,
      `  width: ${Math.round(g.width)}px;`,
      `  height: ${Math.round(g.height)}px;`,
      '  box-sizing: border-box;',
      '  margin: 0;',
    ].join('\n');
    return `.${node.className} {\n${geo}${decls ? '\n' + decls : ''}\n}`;
  });

  const bodyHtml = renderFlat(page, classNames);
  return {
    bodyHtml,
    css: cssParts.join('\n\n'),
  };
}

/**
 * 扁平渲染：所有节点作为根节点的直接子元素（DFS 顺序）。
 * 几何坐标为文档绝对坐标，若 DOM 嵌套则 position:absolute 的包含块
 * 会逐层累加导致坐标错误，因此 reference 侧必须扁平化。
 */
function renderFlat(page: UIPage, classNames: Map<string, string>): string {
  const out: string[] = [];
  const emit = (node: import('../schema/types').UINode, depth: number): void => {
    const indent = '  '.repeat(depth);
    const cls = classNames.get(node.id) ?? node.id;
    if (node.type === 'TEXT') {
      out.push(`${indent}<span class="${cls}">${escapeHtml(node.text)}</span>`);
      return;
    }
    if (node.type === 'BUTTON') {
      out.push(`${indent}<button class="${cls}" type="button">${escapeHtml(node.text)}</button>`);
      return;
    }
    if (node.type === 'IMAGE') {
      const src = node.src || '';
      if (src) {
        if ((node.style?.imageScaleMode ?? 'FILL') === 'TILE') {
          out.push(`${indent}<div class="${cls}" style="background-image:url('${escapeHtml(src)}');background-repeat:repeat;"></div>`);
        } else {
          out.push(`${indent}<img class="${cls}" src="${escapeHtml(src)}" alt="" />`);
        }
      } else out.push(`${indent}<div class="${cls} ui-image-placeholder"></div>`);
      return;
    }
    if (node.type === 'SLICE') {
      return; // FR-14：Slice 无视觉样式、不进 diff（与出码跳过同口径）
    }
    if (node.type === 'VECTOR') {
      // FR-49：reference 侧同样出内联 <svg>，与 render 侧同形状方可逐像素对比
      const svg = svgOfVector(node.vector, node.layout.width ?? 0, node.layout.height ?? 0, {
        className: cls,
        border: node.style?.border,
        fill: node.style?.background,
      });
      if (svg) out.push(`${indent}${svg}`);
      return;
    }
    if (node.type === 'RECTANGLE' || node.type === 'OVAL' || node.type === 'LINE' || node.type === 'POLYGON' || node.type === 'STAR') {
      out.push(`${indent}<div class="${cls}"></div>`);
      return;
    }
    const container = node as import('../schema/types').ContainerNode;
    out.push(`${indent}<div class="${cls}"></div>`);
    for (const child of container.children) emit(child, depth + 1);
  };
  for (const child of page.root.children) emit(child, 1);
  return `<div class="${classNames.get(page.root.id) ?? page.root.id}">\n${out.join('\n')}\n</div>`;
}

export function generateReferenceHtml(
  page: UIPage,
  compiled: CompiledPage,
  geometry: GeometryMap,
  options: { title?: string } = {},
): string {
  const { bodyHtml, css } = buildReferenceDom(page, compiled, geometry);
  const rootGeom = geometry[page.root.id];
  const pageH = rootGeom ? Math.round(rootGeom.height) : page.viewport.height;
  const pageW = page.viewport.width;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(options.title ?? `${page.name} - reference`)}</title>
<style>
html, body { margin: 0; padding: 0; }
body { font-family: ${FONT_STACK}; background: #ffffff; min-height: ${pageH}px; width: ${pageW}px; }
.ui-image-placeholder { background: #e0e0e0; }
</style>
<style>
${FONT_FACE_CSS}
</style>
<style>
${css}
</style>
</head>
<body>
${collectFxDefs(page)}
${bodyHtml}
</body>
</html>
`;
}
