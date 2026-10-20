/**
 * FR-52 ZIP 资产化单源（2026-10-20 对账专单）。
 * 出码 ZIP 此前把内联 dataURL 图片留在 HTML/SCSS 文本里（无 assets/ 概念=zip-assert 断言①欠账），
 * 且预览页字体走绝对 '/fonts'（断言②欠账）。本模块提供三件纯函数（浏览器/Node 双端可用、可单测）：
 *  1) collectDataUrls(pages) —— 按遍历序去重收集节点内联 dataURL（确定性：同输入同输出，双跑一致承诺不破）；
 *  2) assetBytes(dataUrl)    —— base64 与 URI 编码两种载荷解码为字节（svg 演示资产即 URI 编码）；
 *  3) rewriteEntryText()     —— 把各文本条目内的 dataURL 换成按条目深度定位的相对 assets/ 路径。
 * 装配方（CodeModal 浏览器侧 / zip-assert Node 侧）各自注入字体二进制（来源不同：fetch vs fs）。
 */
import type { UIPage, UINode } from '../schema/types';

export interface DataAsset {
  /** ZIP 内路径，如 assets/img-1.svg */
  file: string;
  dataUrl: string;
}

const EXT_BY_SUBTYPE: Record<string, string> = {
  png: 'png',
  jpeg: 'jpg',
  jpg: 'jpg',
  webp: 'webp',
  gif: 'gif',
  'svg+xml': 'svg',
};

/** 遍历序去重收集全部内联 dataURL 图（IMAGE 节点 src；未来 fill image 若落 src 同样覆盖） */
export function collectDataUrls(pages: UIPage[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const walk = (n: UINode): void => {
    const s = (n as { src?: string }).src;
    if (typeof s === 'string' && s.startsWith('data:') && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
    ((n as { children?: UINode[] }).children ?? []).forEach(walk);
  };
  pages.forEach((p) => walk(p.root));
  return out;
}

/** dataURL → 资产条目（扩展名按 MIME；未知类型落 .bin，序号从 1 起保证同序同名） */
export function assetFor(dataUrl: string, index: number): DataAsset {
  const mime = /^data:([\w.+-]+\/[\w.+-]+)/.exec(dataUrl)?.[1] ?? '';
  const ext = EXT_BY_SUBTYPE[mime.split('/')[1] ?? ''] ?? 'bin';
  return { file: `assets/img-${index + 1}.${ext}`, dataUrl };
}

/** 两种载荷解码：;base64 → 二进制；URI 编码（svg charset 常用）→ UTF-8 */
export function assetBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return new Uint8Array();
  const meta = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  if (/;base64/i.test(meta)) {
    const bin = atob(payload);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  return new TextEncoder().encode(decodeURIComponent(payload));
}

/** 文本条目内 dataURL → 相对 assets 路径（按条目所在目录深度加 ../ 前缀；根级条目直接用 assets/） */
export function rewriteEntryText(text: string, entryPath: string, assets: DataAsset[]): string {
  if (!assets.length) return text;
  const slash = entryPath.lastIndexOf('/');
  const dir = slash < 0 ? '' : entryPath.slice(0, slash);
  const depth = dir ? dir.split('/').length : 0;
  const prefix = depth === 0 ? '' : '../'.repeat(depth);
  let out = text;
  for (const a of assets) {
    out = out.split(a.dataUrl).join(`${prefix}${a.file}`);
  }
  return out;
}
