/**
 * zstd 帧编码（raw block，不压缩）。
 *
 * ## 为什么必须有这个文件
 *
 * Figma 的 `.fig` 容器是：
 *
 * ```
 * "fig-kiwi"(8) | version u32 | schemaLen u32 | schema(deflate) | dataLen u32 | data(zstd)
 * ```
 *
 * **注意两段用的压缩算法不一样**：schema 是 deflate，data 是 **zstd**。三份真实文件
 * （`slots.fig` / `variable-override-precedence.fig` / `gold-preview.fig`）的 data 段
 * 开头一律是 `28 b5 2f fd`（zstd magic），无一例外。
 *
 * 而 `@open-pencil/kiwi` 的 `buildFigKiwi` 是这么写的：
 *
 * ```js
 * const zstdCompress = globalThis.Bun?.zstdCompressSync;
 * if (zstdCompress) dataCompressed = zstdCompress(dataRaw);
 * else dataCompressed = deflateSync(dataRaw);   // ← Node / 浏览器全走这条
 * ```
 *
 * 也就是说**只有跑在 Bun 下才产出 zstd**，其余环境一律退化 deflate。Figma 按 zstd 解压
 * 一段 deflate 流 → 直接 `Internal error during import`。
 *
 * 这个缺陷从第一天就存在，而且**自家往返测试永远发现不了**：我们的 `decode` 用的是
 * `decodeFigKiwiData`，它会两种都试（先 zstd 再 deflate），所以自家导出自家导入永远通。
 * 用户实际把文件拖进 Figma 才暴露 —— 又一次印证「往返绿灯 ≠ 文件能用」。
 *
 * ## 为什么用 raw block 而不是接一个 wasm zstd
 *
 * 导出发生在**浏览器**（编辑器「另存为」），Node 22 虽有 `zlib.zstdCompressSync` 但浏览器没有；
 * 接 `@bokuweb/zstd-wasm` 要多背 300KB wasm 并处理异步初始化。而 zstd 规范里的
 * **raw block（不压缩块）是标准格式**，任何合规解码器都必须支持 —— 几十行、同步、零依赖，
 * Figma 一定解得开。代价只是 data 段不压缩（73KB vs 10KB），外层 `.fig` 从 40KB 变 90KB 左右，
 * 对一个设计文件完全可以接受。
 *
 * 格式（RFC 8878）：
 * ```
 * Magic 28 B5 2F FD
 * Frame_Header_Descriptor  0xA0 = FCS_flag(2 → 4 字节) + Single_Segment(1)
 * Frame_Content_Size       u32 LE（原文字节数）
 * 每块：Block_Header(3 字节 LE) = (size << 3) | (type << 1) | last，type 0 = Raw
 *        + 原文字节
 * ```
 */

const MAGIC = [0x28, 0xb5, 0x2f, 0xfd];
/** raw block 上限 128 KB（规范约束） */
const MAX_BLOCK = 128 * 1024;

/** 把明文包成一个合法的 zstd 帧（不压缩）。空输入也产出合法的空帧。 */
export function zstdFrame(data: Uint8Array): Uint8Array {
  const blockCount = Math.max(1, Math.ceil(data.length / MAX_BLOCK));
  const out = new Uint8Array(4 + 1 + 4 + blockCount * 3 + data.length);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);

  out[0] = MAGIC[0]!;
  out[1] = MAGIC[1]!;
  out[2] = MAGIC[2]!;
  out[3] = MAGIC[3]!;
  // FCS_Field_Size = 2（4 字节）+ Single_Segment = 1 → 0b1010_0000
  out[4] = 0xa0;
  view.setUint32(5, data.length, true);

  let off = 9;
  let src = 0;
  for (let i = 0; i < blockCount; i += 1) {
    const size = Math.min(MAX_BLOCK, data.length - src);
    const last = i === blockCount - 1 ? 1 : 0;
    // bit0 = last, bit1-2 = block type(0=raw), bit3-23 = size
    const header = (size << 3) | last;
    out[off] = header & 0xff;
    out[off + 1] = (header >>> 8) & 0xff;
    out[off + 2] = (header >>> 16) & 0xff;
    off += 3;
    if (size > 0) {
      out.set(data.subarray(src, src + size), off);
      off += size;
      src += size;
    }
  }
  return out;
}
