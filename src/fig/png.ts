/**
 * 极简 PNG 编码：只生成**纯色**图，用于 `.fig` 的 `thumbnail.png`。
 *
 * 真实 Figma 文件恒带 `thumbnail.png`，且 `meta.client_meta.thumbnail_size` 与它同尺寸。
 * 我们早先两样都不写（0×0 + 无条目）——虽然多半不是「打不开」的根因，但既然要跟真实
 * 文件对齐，就不该留一个「真实文件 100% 有、我们 0% 有」的条目差异。
 *
 * 不做真实渲染：导出层在 Node 里跑（测试 / 脚本），没有 canvas。纯背景色缩略图在
 * Figma 文件列表里就是个色块，但文件本身能正常打开、内容由 `canvas.fig` 决定。
 */
import { zlibSync } from 'fflate';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

const SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** 生成 `width × height` 的纯色 RGB PNG */
export function solidPng(width: number, height: number, rgb: readonly [number, number, number]): Uint8Array {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));

  const ihdr = new Uint8Array(13);
  const iv = new DataView(ihdr.buffer);
  iv.setUint32(0, w);
  iv.setUint32(4, h);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  // 10..12 = compression / filter / interlace，全 0

  const stride = 1 + w * 3;
  const raw = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    const off = y * stride;
    raw[off] = 0; // filter type: None
    for (let x = 0; x < w; x++) {
      const p = off + 1 + x * 3;
      raw[p] = rgb[0];
      raw[p + 1] = rgb[1];
      raw[p + 2] = rgb[2];
    }
  }

  const parts = [SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', zlibSync(raw)), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** 缩略图尺寸：最长边 400（真实文件 `thumbnail_size` 实测 400×244），等比 */
export function thumbnailSize(width: number, height: number): { width: number; height: number } {
  const max = 400;
  if (width <= 0 || height <= 0) return { width: max, height: max };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
