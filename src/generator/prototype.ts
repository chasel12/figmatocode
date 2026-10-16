/**
 * FR-50 / FR-46 原型工程出码：UIProject → 可独立打开的静态工程。
 *
 * 结构决策（wave1-prototype-plan §4.3）：**单 HTML 内嵌全部 Page 容器**
 *   `<section data-uic-page="<pageId>" hidden>`
 * 理由：① 同文档内过渡动画可行（location 跳转丢过渡与 Back 语义）；② ZIP 单文件预览闭环。
 *
 * 无 JS 模式（FR-50）：交互为纯声明式 `data-interaction` 属性；**无交互工程不引用 runtime.js**，
 * 删除 runtime.js 后页面静态首帧仍完整——布局/样式全部编译期 CSS。
 */
import type { UINode, UIProject, PrototypeInteraction } from '../schema/types';
import { isContainer } from '../schema/types';
import { compilePage } from '../compiler/compile';
import { scssFromPage } from '../compiler/css-model';
import { escapeHtml } from './html';
import { svgOfVector } from './vector';
import { buildRuntimeJs, buildRuntimeCss, RUNTIME_FILE } from './runtime';

/** ZIP 条目形状（与 generator/project.ts 的 TaroFile 同构） */
export interface PrototypeFile {
  path: string;
  content: string;
}

/**
 * §4.1 data-interaction 协议：**白名单投影**的 JSON 数组。
 * - `id` 不进投影（数组序=执行序，id 无运行时意义）；
 * - 编码两处替换：值内 `'`→`\u0027`、`&`→`\u0026`；
 * - HTML 属性用**单引号**包裹（JSON 双引号因此合法）。
 */
export const INTERACTION_FIELDS = [
  'trigger',
  'action',
  'targetId',
  'url',
  'timeoutMs',
  'key',
  'scrollBehavior',
  'transition',
  'overlayPosition',
  'overlayCloseOnOutside',
  'changeToVariant',
] as const;

/** 单条交互 → 白名单投影对象（缺省字段不写入，保持产出确定性） */
export function projectInteraction(interaction: PrototypeInteraction): Record<string, unknown> {
  const src = interaction as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of INTERACTION_FIELDS) {
    const v = src[k];
    if (v === undefined || v === null) continue;
    if (k === 'transition' && typeof v === 'object') {
      // 过渡同样白名单投影（避免把未来字段漏进产物）
      const t = v as Record<string, unknown>;
      const tt: Record<string, unknown> = {};
      for (const tk of ['kind', 'duration', 'easing', 'bezier', 'direction']) {
        if (t[tk] !== undefined && t[tk] !== null) tt[tk] = t[tk];
      }
      if (Object.keys(tt).length) out[k] = tt;
      continue;
    }
    out[k] = v;
  }
  return out;
}

/** 白名单投影数组 → 属性值串（转义 + 单引号包裹由调用方负责） */
export function encodeInteractions(interactions: PrototypeInteraction[]): string {
  const projected = interactions.map(projectInteraction);
  return JSON.stringify(projected).replace(/'/g, '\\u0027').replace(/&/g, '\\u0026');
}

/** 反序列化（单测往返用；与 runtime 的 JSON.parse 同语义） */
export function decodeInteractions(raw: string): Record<string, unknown>[] {
  return JSON.parse(raw) as Record<string, unknown>[];
}

/** 节点树是否含任意交互声明（决定是否注入 runtime） */
export function hasAnyInteraction(node: UINode): boolean {
  if ((node.interactions?.length ?? 0) > 0) return true;
  return isContainer(node) ? node.children.some(hasAnyInteraction) : false;
}

export function projectHasPrototype(project: UIProject): boolean {
  return project.pages.some((p) => hasAnyInteraction(p.root));
}

/* ---------------- DOM 渲染 ---------------- */

function renderNode(node: UINode, classNames: Map<string, string>, depth: number): string {
  const indent = '  '.repeat(depth);
  const cls = classNames.get(node.id) ?? node.id;
  // FR-50：每节点补 data-node 锚点（runtime 按它定位 NAVIGATE/OVERLAY/SCROLL 目标）
  const anchor = ` data-node="${escapeHtml(node.id)}"`;
  const raw = node.interactions?.length ? node.interactions : null;
  // §4.1：属性用单引号包裹，值内已把 ' 与 & 转义
  const inter = raw ? ` data-interaction='${encodeInteractions(raw)}'` : '';

  if (node.type === 'TEXT') return `${indent}<span class="${cls}"${anchor}${inter}>${escapeHtml(node.text)}</span>`;
  if (node.type === 'BUTTON')
    return `${indent}<button class="${cls}" type="button"${anchor}${inter}>${escapeHtml(node.text)}</button>`;
  if (node.type === 'IMAGE') {
    const src = node.src || '';
    if (!src) return `${indent}<div class="${cls} ui-image-placeholder"${anchor}${inter}></div>`;
    if ((node.style?.imageScaleMode ?? 'FILL') === 'TILE')
      return `${indent}<div class="${cls}" style="background-image:url('${escapeHtml(src)}');background-repeat:repeat;"${anchor}${inter}></div>`;
    return `${indent}<img class="${cls}" src="${escapeHtml(src)}" alt=""${anchor}${inter} />`;
  }
  if (node.type === 'SLICE') return ''; // FR-14：Slice 无出码 DOM
  if (node.type === 'VECTOR') {
    // FR-49：矢量走内联 <svg>（与 html.ts/reference.ts 同口径）
    const svg = svgOfVector(node.vector, node.layout.width ?? 0, node.layout.height ?? 0, {
      className: cls,
      border: node.style?.border,
      fill: node.style?.background,
    });
    if (!svg) return '';
    // data-node / data-interaction 挂在 svg 外层包装上（svg 自身不吃自定义属性语义）
    return `${indent}<span${anchor}${inter}>${svg}</span>`;
  }
  if (!isContainer(node) || node.type === 'RECTANGLE')
    return `${indent}<div class="${cls}"${anchor}${inter}></div>`;

  if (!node.children.length) return `${indent}<div class="${cls}"${anchor}${inter}></div>`;
  const kids = node.children.map((c) => renderNode(c, classNames, depth + 1)).filter(Boolean).join('\n');
  return `${indent}<div class="${cls}"${anchor}${inter}>\n${kids}\n${indent}</div>`;
}

/**
 * UIProject → 原型工程文件集：`index.html` + `index.css`（+ 有交互时 `runtime.js`）。
 *
 * 起始页：首个含 root 的页；其余页 `hidden`（runtime 负责切换与过渡）。
 */
export function generatePrototypeProject(project: UIProject): PrototypeFile[] {
  const pages = project.pages;
  if (!pages.length) throw new Error('工程无页面，无法出码');

  const compiledAll = pages.map((p) => ({ page: p, compiled: compilePage(p) }));
  const classNames = new Map<string, string>();
  for (const { compiled } of compiledAll) for (const n of compiled.nodes) classNames.set(n.id, n.className);

  const needsRuntime = projectHasPrototype(project);
  const startId = pages[0].id;

  const sections = compiledAll
    .map(({ page }) => {
      const isStart = page.id === startId;
      const body = renderNode(page.root, classNames, 2);
      const active = isStart ? ' data-uic-active=""' : '';
      const hidden = isStart ? '' : ' hidden';
      return `  <section data-uic-page="${escapeHtml(page.id)}"${hidden}${active}>\n${body}\n  </section>`;
    })
    .join('\n');

  const css = [
    ...compiledAll.map(({ compiled }) => scssFromPage(compiled)),
    needsRuntime ? buildRuntimeCss() : '',
  ]
    .filter(Boolean)
    .join('\n');

  const firstPage = pages[0];
  const width = firstPage.viewport?.width ?? 375;
  const height = firstPage.viewport?.height ?? 812;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(project.name || 'UI 原型')}</title>
<link rel="stylesheet" href="index.css" />
</head>
<body>
<div data-uic-root style="width:${width}px;min-height:${height}px;margin:0 auto;">
${sections}
</div>
${needsRuntime ? `<script src="${RUNTIME_FILE}"></script>` : ''}
</body>
</html>
`;

  const files: PrototypeFile[] = [
    { path: 'index.html', content: html },
    { path: 'index.css', content: css },
  ];
  // FR-50 无 JS 模式：无交互工程不产 runtime.js（纯展示页零依赖）
  if (needsRuntime) files.push({ path: RUNTIME_FILE, content: buildRuntimeJs() });
  return files;
}
