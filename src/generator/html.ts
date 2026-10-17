import type { UINode, UIPage } from '../schema/types';
import { isContainer } from '../schema/types';
import type { CompiledPage } from '../compiler/css-model';
import { scssFromPage } from '../compiler/css-model';
import { FONT_FACE_CSS, FONT_STACK } from '../font';
import { svgOfVector } from './vector';
import { isShapeSvgNode, shapePathData, shapeFillOf, shapeStrokeOf } from '../compiler/shapePath';

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface DomParts {
  bodyHtml: string;
  css: string;
}

function makeRenderer(classNames: Map<string, string>, indentUnit = '  ', startDepth = 1) {
  const renderNode = (node: UINode, depth: number): string => {
    const indent = indentUnit.repeat(depth);
    const cls = classNames.get(node.id) ?? node.id;

    if (node.type === 'TEXT') {
      return `${indent}<span class="${cls}">${escapeHtml(node.text)}</span>`;
    }
    if (node.type === 'BUTTON') {
      return `${indent}<button class="${cls}" type="button">${escapeHtml(node.text)}</button>`;
    }
    if (node.type === 'IMAGE') {
      const src = node.src || '';
      if (src) {
        if ((node.style?.imageScaleMode ?? 'FILL') === 'TILE') {
          return `${indent}<div class="${cls}" style="background-image:url('${escapeHtml(src)}');background-repeat:repeat;"></div>`;
        }
        return `${indent}<img class="${cls}" src="${escapeHtml(src)}" alt="" />`;
      }
      return `${indent}<div class="${cls} ui-image-placeholder"></div>`;
    }
    if (node.type === 'SLICE') {
      return ''; // FR-14：Slice 不生成出码 DOM（compileNode 同步跳过——classNames 缺失会出无样式 div）
    }
    if (node.type === 'VECTOR') {
      // FR-49：矢量走内联 <svg>（唯一权威表达）；空 d 不产物流
      const svg = svgOfVector(node.vector, node.layout.width ?? 0, node.layout.height ?? 0, {
        className: cls,
        border: node.style?.border,
        fill: node.style?.background,
      });
      return svg ? `${indent}${svg}` : '';
    }
    if (isShapeSvgNode(node)) {
      // P1-14：圆/多边形/星形切 SVG 通道（shapePathData 单一事实源，与编辑器自动矢量化同几何）
      const sp = shapePathData(node);
      if (sp) {
        const svg = svgOfVector(
          { d: sp.d, width: sp.width, height: sp.height },
          node.layout.width ?? sp.width,
          node.layout.height ?? sp.height,
          { className: cls, border: shapeStrokeOf(node.style?.border), fill: shapeFillOf(node.style) },
        );
        if (svg) return `${indent}${svg}`;
      }
      return `${indent}<div class="${cls}"></div>`;
    }
    if (!isContainer(node) || node.type === 'RECTANGLE') {
      return `${indent}<div class="${cls}"></div>`;
    }
    if (!node.children.length) return `${indent}<div class="${cls}"></div>`;
    const children = node.children.map((c) => renderNode(c, depth + 1)).join('\n');
    return `${indent}<div class="${cls}">\n${children}\n${indent}</div>`;
  };
  return (root: UINode) => renderNode(root, startDepth);
}

/** flex CSS 渲染（render 侧）：body 片段 + CSS */
export function buildPreviewDom(page: UIPage, compiled: CompiledPage): DomParts {
  const classNames = new Map(compiled.nodes.map((n) => [n.id, n.className]));
  const render = makeRenderer(classNames);
  return {
    bodyHtml: render(page.root),
    css: scssFromPage(compiled),
  };
}

/** FR-19：Noise/Texture 的 SVG 滤镜 defs（按节点参数生成，compile 输出 url(#fx-noise-<nodeId>)） */
export function collectFxDefs(page: UIPage): string {
  const defs: string[] = [];
  const walk = (n: UINode): void => {
    for (const e of n.style?.effects ?? []) {
      if (e.visible === false) continue;
      if (e.kind === 'NOISE') {
        const freq = (1 / Math.max(1, e.radius ?? 8)).toFixed(3);
        const oct = Math.min(5, Math.max(1, Math.round(e.density ?? 2)));
        const alpha = (e.opacity ?? 0.5).toFixed(2);
        defs.push(
          `<filter id="fx-noise-${n.id}" x="0%" y="0%" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="7" result="n"/><feColorMatrix in="n" type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="${alpha}"/></feComponentTransfer></filter>`,
        );
      } else if (e.kind === 'TEXTURE') {
        const freq = (1 / Math.max(1, e.radius ?? 8)).toFixed(3);
        const oct = Math.min(5, Math.max(1, Math.round(e.density ?? 2)));
        const alpha = (e.opacity ?? 0.6).toFixed(2);
        // 双色 texture 近似：turbulence 亮度遮罩 + 主色着色（color2 降级记 LOG）
        defs.push(
          `<filter id="fx-texture-${n.id}" x="0%" y="0%" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="3" result="t"/><feColorMatrix in="t" type="luminanceToAlpha" result="a"/><feFlood flood-color="${e.color ?? '#000000'}" result="c"/><feComposite in="c" in2="a" operator="in"/><feComponentTransfer><feFuncA type="linear" slope="${alpha}"/></feComponentTransfer></filter>`,
        );
      }
    }
    if ('children' in n) n.children.forEach(walk);
  };
  walk(page.root);
  if (!defs.length) return '';
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${defs.join('')}</defs></svg>`;
}

export function generateHtml(page: UIPage, compiled: CompiledPage, options: { title?: string } = {}): string {
  const { bodyHtml, css } = buildPreviewDom(page, compiled);
  const rootCss = compiled.nodes.find((n) => n.id === page.root.id);
  const minH = rootCss?.css['min-height'] ?? '100vh';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(options.title ?? page.name)}</title>
<style>
html, body { margin: 0; padding: 0; }
body { font-family: ${FONT_STACK}; background: #ffffff; min-height: ${minH === '100vh' ? '812px' : minH.replace('max(', '').replace(/, 100vh\)/, '')}; }
.ui-image-placeholder { background: #e0e0e0; }
</style>
<style>
${FONT_FACE_CSS}
</style>
<style>
${css}</style>
</head>
<body>
${collectFxDefs(page)}
${bodyHtml}
</body>
</html>
`;
}
