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

export interface FigCodec {
  /** canvas.fig（fig-kiwi 容器）→ 节点变更列表 */
  decode: (canvas: Uint8Array) => FigDecoded;
  /** 节点变更列表 + 图片 blob → canvas.fig 字节 */
  encode: (nodeChanges: OutNodeChange[], blobs: Uint8Array[]) => Promise<Uint8Array>;
}

let cached: Promise<FigCodec> | null = null;

/** 加载并缓存编解码器（首次调用编译 kiwi schema，约 100–200ms） */
export function loadFigCodec(): Promise<FigCodec> {
  if (cached) return cached;
  cached = (async (): Promise<FigCodec> => {
    const [{ decodeFigKiwiCanvas }, codec, container, fflate] = await Promise.all([
      import('@open-pencil/kiwi/fig/parse'),
      import('@open-pencil/kiwi/fig/codec'),
      import('@open-pencil/kiwi/fig/container'),
      import('fflate'),
    ]);
    await codec.initCodec();
    const schemaDeflated = fflate.deflateSync(codec.getSchemaBytes());

    return {
      decode: (canvas) => {
        const result = decodeFigKiwiCanvas(canvas);
        return { nodeChanges: result.nodeChanges as unknown as FigDecoded['nodeChanges'], blobs: result.blobs };
      },
      encode: async (nodeChanges, blobs) => {
        const message = {
          type: 'NODE_CHANGES',
          sessionID: 1,
          ackID: 1,
          reconnectSequenceNumber: 1,
          nodeChanges,
          // schema 里 `Blob[] blobs`，Blob 是 struct { byte[] bytes }，所以每个元素要包一层
          ...(blobs.length > 0 ? { blobs: blobs.map((bytes) => ({ bytes })) } : {}),
        };
        const dataRaw = codec.encodeMessage(message as unknown as Parameters<typeof codec.encodeMessage>[0]);
        return container.buildFigKiwi(schemaDeflated, dataRaw, 106);
      },
    };
  })();
  return cached;
}

/** 测试用：清掉缓存（换 codec 实现或想重新编译 schema 时） */
export function resetFigCodec(): void {
  cached = null;
}
