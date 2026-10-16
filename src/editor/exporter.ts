import type { ContainerNode, ExportSetting, StyleToken, UINode, UIPage } from '../schema/types';
import { findById } from '../schema/factory';
import { compilePage, tokensToCss, type GeometryMap } from '../compiler';
import { buildPreviewDom } from '../generator/html';
import { canvasBus } from './canvasBus';
import { createZip, downloadBlob, type ZipEntry } from '../utils/zip';

/** SVG/PDF 恒 1x（FR-24 对照 Figma 限制）；其余按设置 */
export function effectiveScale(s: ExportSetting): 1 | 2 | 3 {
  return s.format === 'SVG' || s.format === 'PDF' ? 1 : s.scale;
}

/** Figma 命名约定：<name><suffix><@2x>.<ext>；非法文件名字符替换为 _ */
export function exportFileName(name: string | undefined, id: string, s: ExportSetting): string {
  const base = (name && name.trim() ? name : id).replace(/[\\/:*?"<>|\s]+/g, '_');
  const scale = effectiveScale(s);
  const at = scale > 1 ? `@${scale}x` : '';
  return `${base}${s.suffix ?? ''}${at}.${s.format.toLowerCase()}`;
}

/** 单节点 SVG（foreignObject 包裹出码 DOM+CSS，浏览器可渲染同款像素；矢量级导出留工程侧） */
export function svgOfNode(node: UINode, page: UIPage, geometry: GeometryMap): string {
  const g = geometry[node.id];
  const w = Math.max(1, Math.round(g?.width ?? 100));
  const h = Math.max(1, Math.round(g?.height ?? 100));
  // 独立导出：外层固定尺寸 ABSOLUTE 容器，内层节点坐标归零（原 x/y/margin 相对原父，导出区域已对齐节点 bbox）
  const inner = { ...node, layout: { ...node.layout, x: 0, y: 0, margin: undefined } } as UINode;
  const root: ContainerNode = {
    id: `${node.id}~export`,
    type: 'FRAME',
    layout: { mode: 'ABSOLUTE', widthMode: 'FIXED', heightMode: 'FIXED', width: w, height: h },
    style: {},
    children: [inner],
  };
  const mini: UIPage = { ...page, root };
  const compiled = compilePage(mini);
  const { bodyHtml, css } = buildPreviewDom(mini, compiled);
  const divStyle = `width:${w}px;height:${h}px;overflow:hidden;`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<foreignObject width="${w}" height="${h}">`,
    `<div xmlns="http://www.w3.org/1999/xhtml" style="${divStyle}">`,
    `<style>${css}</style>`,
    bodyHtml,
    `</div></foreignObject></svg>`,
  ].join('');
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  const bin = dataUrl.slice(comma + 1);
  const raw = atob(bin);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export interface ExportOutcome {
  /** ZIP 内文件路径列表 */
  files: string[];
  /** 未产出（PDF 等）与原因 */
  skipped: { file: string; reason: string }[];
}

/**
 * FR-24 导出：对选区中带 exportSettings 的节点逐条产物流，打包 ZIP 下载。
 * PNG/JPG 走画布 region 截取（scale 与画布缩放无关）；SVG 出 foreignObject 单节点；
 * PDF 浏览器侧无法生成 → 记 skipped（设置仍持久化）。
 */
export async function exportSelection(
  page: UIPage,
  geometry: GeometryMap,
  selectedIds: string[],
  projectName = 'export',
  tokens?: StyleToken[],
): Promise<ExportOutcome> {
  const entries: ZipEntry[] = [];
  const files: string[] = [];
  const skipped: { file: string; reason: string }[] = [];

  // FR-28：非空样式表随导出附 tokens.css（即使无带导出设置的节点也产出）
  if (tokens && tokens.length) {
    entries.push({ path: 'tokens.css', content: tokensToCss(tokens) });
    files.push('tokens.css');
  }

  const nodes: UINode[] = [];
  for (const id of selectedIds) {
    const hit = findById(page.root, id);
    if (hit && hit.node.id !== page.root.id && hit.node.exportSettings?.length) nodes.push(hit.node);
  }
  if (!nodes.length) {
    if (entries.length) {
      // 只有 tokens.css：仍然打包（FR-28 独立导出路径）
      const zipOnly = createZip(entries);
      downloadBlob(zipOnly, `${(projectName || 'export').replace(/[\\/:*?"<>|]/g, '_')}.zip`);
      return { files, skipped };
    }
    throw new Error('选区无导出设置（在右栏 Export 区添加）');
  }

  for (const node of nodes) {
    for (const raw of node.exportSettings ?? []) {
      const s: ExportSetting = { ...raw, scale: effectiveScale(raw) };
      const file = exportFileName(node.name, node.id, s);
      if (s.format === 'PDF') {
        skipped.push({ file, reason: 'PDF 需工程侧渲染（浏览器侧不生成）' });
        continue;
      }
      if (s.format === 'SVG') {
        entries.push({ path: file, content: svgOfNode(node, page, geometry) });
        files.push(file);
        continue;
      }
      const g = geometry[node.id];
      if (!g) {
        skipped.push({ file, reason: '缺少几何信息' });
        continue;
      }
      const mime = s.format === 'JPG' ? 'image/jpeg' : 'image/png';
      const dataUrl = await canvasBus.requestCapture(
        { x: g.x, y: g.y, width: g.width, height: g.height },
        s.scale,
        mime,
      );
      entries.push({ path: file, content: dataUrlToBytes(dataUrl) });
      files.push(file);
    }
  }

  if (!entries.length) {
    throw new Error('无可导出条目' + (skipped.length ? `（${skipped.length} 项跳过）` : ''));
  }
  const zip = createZip(entries);
  const zipName = `${(projectName || 'export').replace(/[\\/:*?"<>|]/g, '_')}.zip`;
  downloadBlob(zip, zipName);
  return { files, skipped };
}
