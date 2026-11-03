/**
 * `.fig` 编解码适配层。
 *
 * `@open-pencil/kiwi`（MIT，623KB）只在真正导入/导出时按需加载——
 * 主包首屏不该为一个可选格式背上 600KB 运行时。用法：
 *
 * ```ts
 * const codec = await loadFigCodec();
 * const { pages } = importFig(bytes, codec.decode);
 * const { bytes: out } = await exportFig(pages, codec.encode);
 * ```
 */
import type { FigDecoded } from './import';
import type { OutNodeChange } from './export';
import { inflateSync } from 'fflate';
import { FIGMA_SCHEMA_VERSION, figmaSchemaDeflated } from './figma-schema';
import { zstdFrame } from './zstd';

type RuntimeCodec = {
  encodeMessage: (message: object) => Uint8Array;
  decodeMessage: (data: Uint8Array) => unknown;
};

/**
 * 拼 `.fig` 的 fig-kiwi 容器。
 *
 * 不复用 `@open-pencil/kiwi` 的 `buildFigKiwi`：它只在 Bun 下用 zstd，其它环境退化成
 * deflate，而 Figma 只认 zstd（详见 `zstd.ts` 的注释）。这里自己拼，两段压缩算法各按
 * 真实文件来 —— schema 用 deflate（`figmaSchemaDeflated` 已是 deflate 流），data 用 zstd。
 */
function buildContainer(schemaDeflated: Uint8Array, dataZstd: Uint8Array, version: number): Uint8Array {
  const out = new Uint8Array(16 + schemaDeflated.length + 4 + dataZstd.length);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  out.set(new TextEncoder().encode('fig-kiwi'), 0);
  view.setUint32(8, version, true);
  view.setUint32(12, schemaDeflated.length, true);
  out.set(schemaDeflated, 16);
  let offset = 16 + schemaDeflated.length;
  view.setUint32(offset, dataZstd.length, true);
  offset += 4;
  out.set(dataZstd, offset);
  return out;
}

export interface FigCodec {
  /** canvas.fig（fig-kiwi 容器）→ 节点变更列表 */
  decode: (canvas: Uint8Array) => FigDecoded;
  /** 节点变更列表 + 图片 blob → canvas.fig 字节 */
  encode: (nodeChanges: OutNodeChange[], blobs: Uint8Array[]) => Promise<Uint8Array>;
}

let cached: Promise<FigCodec> | null = null;

/**
 * 生成 `originFileKey`：真实文件是 `lk-` + 128 位 hex。
 *
 * 不是必需字段（少了 Figma 也读），但**真实文件恒有**，且它标识「这份内容来自哪个文件」。
 * 我们每次导出都当新文件，所以随机生成；同一进程内不复用，避免两份导出撞 key。
 */
function makeFileKey(): string {
  const bytes = new Uint8Array(64);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return `lk-${hex}`;
}

/**
 * 加载并缓存编解码器（首次调用编译 kiwi schema，约 100–200ms）
 *
 * **编码与解码必须都用文件内嵌的这份官方 schema**（2026-11-03 定案）。
 *
 * 库的 `initCodec()` 编译的是**它自带的 schema**（旧版本），而容器里嵌的是官方 101
 * schema——「声称按 A 编码、实际按 B 编码」。后果：`fillPaints[].authoredColor` 等
 * 库 schema 没有的字段被**静默丢弃**，字段编号错位的字段被 Figma 读成别的含义。
 * 实测（`.tmp/equiv-v2.ts`）：把真实文件喂给库 schema 编码，回读丢 `authoredColor`
 * 41 处；喂给官方 schema 编译的 runtime，三份真实文件往返**逐字段一致**。
 */
export function loadFigCodec(): Promise<FigCodec> {
  if (cached) return cached;
  cached = (async (): Promise<FigCodec> => {
    const [{ parseFigKiwiContainer }, { compileSchema, decodeBinarySchema }] = await Promise.all([
      import('@open-pencil/kiwi/fig/parse'),
      import('@open-pencil/kiwi/schema-runtime'),
    ]);
    const schema = decodeBinarySchema(inflateSync(figmaSchemaDeflated()));
    const runtime = (compileSchema as (s: unknown) => RuntimeCodec)(schema);

    /**
     * **用官方 Figma 的 schema，不用库自带那份**（2026-11-02 定案）。
     *
     * 库的 `getSchemaBytes()` 与官方不兼容：拿它解真实 `.fig` 会抛
     * `Attempted to parse invalid message`，而官方 schema 能解我们的消息。Figma 导入时按
     * 文件自带 schema 解码，所以文件里嵌错 schema = 它读出一堆错字段 / 直接判损坏。
     * 这一条比「补哪个字段」更底层，也是前面多轮补字段都没生效的原因。
     */
    const schemaDeflated = figmaSchemaDeflated();

    return {
      decode: (canvas) => {
        const payload = parseFigKiwiContainer(canvas);
        if (!payload) throw new Error('无法解析 fig-kiwi 容器');
        const msg = runtime.decodeMessage(payload.dataRaw) as {
          nodeChanges: FigDecoded['nodeChanges'];
          blobs: { bytes: Uint8Array }[];
        };
        return { nodeChanges: msg.nodeChanges, blobs: msg.blobs.map((b) => b.bytes) };
      },
      encode: async (nodeChanges, blobs) => {
        /**
         * 消息信封照抄真实文件（`circle-text` / `variable-override-precedence` / `slots` 三份
         * 实测一致的字段集）：
         *
         * - `sessionID` / `ackID` 恒 0（静态文件不是实时会话）；
         * - `nodeChangeOrder: 'GUID'` 决定 nodeChanges 的排序口径，缺了它 Figma 可能按
         *   PREORDER 重排；
         * - `originFileKey` 是 `lk-` + 128 hex；
         * - `blobs` **总是写**（空数组也写），真实文件从不省略这个键。
         *
         * 早先写的 `reconnectSequenceNumber` 是实时协同的会话字段，静态文件不该有，已去掉。
         */
        const message = {
          type: 'NODE_CHANGES',
          sessionID: 0,
          ackID: 0,
          originFileKey: makeFileKey(),
          nodeChangeOrder: 'GUID',
          nodeChanges,
          // schema 里 `Blob[] blobs`，Blob 是 struct { byte[] bytes }，所以每个元素要包一层
          blobs: blobs.map((bytes) => ({ bytes })),
        };
        const dataRaw = runtime.encodeMessage(message as object);
        /**
         * 版本号必须与内嵌 schema 同源：用 `FIGMA_SCHEMA_VERSION`（101，就是那份 schema 的版本）。
         * 早先写死 106 但装的是 101 的 schema，等于「声称自己是 106、内容按 101 编」。
         *
         * **data 段必须是 zstd**：Figma 只认 zstd，写成 deflate 会直接
         * `Internal error during import`（库的 `buildFigKiwi` 在非 Bun 环境就是这么干的）。
         */
        return buildContainer(schemaDeflated, zstdFrame(dataRaw), FIGMA_SCHEMA_VERSION);
      },
    };
  })();
  return cached;
}

/** 测试用：清掉缓存（换 codec 实现或想重新编译 schema 时） */
export function resetFigCodec(): void {
  cached = null;
}
