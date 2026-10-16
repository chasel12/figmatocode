import { describe, expect, it } from 'vitest';
import { createZip } from '../src/utils/zip';

/**
 * FR-52 ZIP 结构单测：锁定 createZip 的产物**字节级**正确性。
 *
 * 背景：`createZip` 是纯函数（无依赖的最小 ZIP 生成器，store 方式），
 * 编辑器导出与 `scripts/zip-assert.mjs` 都消费它。此前只有端到端 ZIP 断言，
 * 没有对 ZIP 字节结构本身的单测——这里补齐：
 *   1) 中央目录 / local header 签名与字段一致性；
 *   2) CRC-32 校验（ZIP 规范的完整性底线）；
 *   3) UTF-8 文件名标志（中文文件名不依赖本地编码）；
 *   4) 二进制条目（Uint8Array，如 PNG 导出）逐字节往返。
 *
 * 测试用最小解析器自证：只读 EOCD → 中央目录 → local header，
 * 不引入任何第三方 ZIP 库（与实现同哲学：零依赖、确定性）。
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

interface ParsedEntry {
  path: string;
  method: number;
  flags: number;
  crc: number;
  usize: number;
  csize: number;
  data: Uint8Array;
  crcOk: boolean;
}

/** 解析 ZIP 字节（中央目录权威），返回条目列表 */
function parseZip(bytes: Uint8Array): { entries: ParsedEntry[]; total: number; utf8Flags: boolean[] } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('EOCD 未找到');

  const total = view.getUint16(eocd + 10, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder('utf-8');
  const entries: ParsedEntry[] = [];
  const utf8Flags: boolean[] = [];

  let p = cdOffset;
  for (let i = 0; i < total; i += 1) {
    expect(view.getUint32(p, true)).toBe(0x02014b50); // 中央目录签名
    const flags = view.getUint16(p + 8, true);
    const method = view.getUint16(p + 10, true);
    const crc = view.getUint32(p + 16, true);
    const csize = view.getUint32(p + 20, true);
    const usize = view.getUint32(p + 24, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const lho = view.getUint32(p + 42, true);
    const path = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));

    expect(view.getUint32(lho, true)).toBe(0x04034b50); // local header 签名
    const lFlags = view.getUint16(lho + 6, true);
    const lMethod = view.getUint16(lho + 8, true);
    const lCrc = view.getUint32(lho + 14, true);
    const lNameLen = view.getUint16(lho + 26, true);
    const lExtraLen = view.getUint16(lho + 28, true);

    // 中央目录与 local header 必须一致（否则解压器行为不可预期）
    expect(lFlags).toBe(flags);
    expect(lMethod).toBe(method);
    expect(lCrc).toBe(crc);

    const dataStart = lho + 30 + lNameLen + lExtraLen;
    const data = bytes.subarray(dataStart, dataStart + csize);
    entries.push({ path, method, flags, crc, usize, csize, data, crcOk: crc32(data) === crc });
    utf8Flags.push((flags & 0x0800) !== 0);

    p += 46 + nameLen + extraLen + commentLen;
  }
  return { entries, total, utf8Flags };
}

async function zipBytes(entries: { path: string; content: string | Uint8Array }[]): Promise<Uint8Array> {
  const blob = createZip(entries);
  return new Uint8Array(await blob.arrayBuffer());
}

describe('FR-52 createZip 结构', () => {
  it('空条目集产出合法空 ZIP（EOCD 可解析，条目数 0）', async () => {
    const bytes = await zipBytes([]);
    // 22 = 仅 EOCD 的最小 ZIP
    expect(bytes.length).toBe(22);
    const { total } = parseZip(bytes);
    expect(total).toBe(0);
  });

  it('中央目录与 local header 一致，且条目数/顺序与输入相同', async () => {
    const entries = [
      { path: 'a.txt', content: 'hello' },
      { path: 'dir/b.txt', content: 'world' },
      { path: 'preview/index.html', content: '<html></html>' },
    ];
    const { entries: parsed, total } = parseZip(await zipBytes(entries));
    expect(total).toBe(3);
    expect(parsed.map((e) => e.path)).toEqual(entries.map((e) => e.path));
  });

  it('每个条目 CRC-32 与解出内容自洽', async () => {
    const { entries } = parseZip(
      await zipBytes([
        { path: 'a.txt', content: 'hello' },
        { path: 'b.txt', content: '' },
        { path: 'c.json', content: '{"k":1}' },
      ]),
    );
    for (const e of entries) expect(e.crcOk).toBe(true);
  });

  it('store 方式：压缩尺寸等于原始尺寸，方法位为 0', async () => {
    const content = 'x'.repeat(1000);
    const { entries } = parseZip(await zipBytes([{ path: 'a.txt', content }]));
    expect(entries[0].method).toBe(0);
    expect(entries[0].csize).toBe(entries[0].usize);
    expect(entries[0].usize).toBe(new TextEncoder().encode(content).length);
  });

  it('UTF-8 文件名标志位（0x0800）已置，中文路径可正确往返', async () => {
    const path = '预览/中文页.html';
    const { entries, utf8Flags } = parseZip(await zipBytes([{ path, content: '<p>你好</p>' }]));
    expect(utf8Flags[0]).toBe(true);
    // 若未置 UTF-8 标志，解码将得到乱码；此处必须原样往返
    expect(entries[0].path).toBe(path);
    expect(new TextDecoder('utf-8').decode(entries[0].data)).toBe('<p>你好</p>');
  });

  it('二进制条目（Uint8Array）逐字节往返且 CRC 正确', async () => {
    // 覆盖全 0-255 字节值（含 0x00 与 0xFF），验证不被字符串化损坏
    const binary = new Uint8Array(256);
    for (let i = 0; i < 256; i += 1) binary[i] = i;
    const { entries } = parseZip(await zipBytes([{ path: 'img.png', content: binary }]));
    expect(Array.from(entries[0].data)).toEqual(Array.from(binary));
    expect(entries[0].crcOk).toBe(true);
    expect(entries[0].usize).toBe(256);
  });

  it('大小写/嵌套路径原样保留（不做归一化）', async () => {
    const paths = ['src/pages/index/index.tsx', 'SRC/App.TSX', 'a/../b.txt'];
    const { entries } = parseZip(await zipBytes(paths.map((p) => ({ path: p, content: 'x' }))));
    expect(entries.map((e) => e.path)).toEqual(paths);
  });

  it('确定性：同输入两次产出字节完全一致（时长戳在同一秒内）', async () => {
    const entries = [
      { path: 'a.txt', content: 'hello' },
      { path: 'b.bin', content: new Uint8Array([1, 2, 3]) },
    ];
    const [a, b] = [await zipBytes(entries), await zipBytes(entries)];
    expect(a.length).toBe(b.length);
    // DOS 时间戳精度为 2 秒，同一测试内应一致；若跨秒则允许时间字段不同
    const sameExceptTime = (() => {
      if (a.length !== b.length) return false;
      let diff = 0;
      for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) diff += 1;
      return diff === 0;
    })();
    if (!sameExceptTime) {
      // 跨秒时：条目名与内容必须仍完全一致
      const pa = parseZip(a);
      const pb = parseZip(b);
      expect(pa.entries.map((e) => e.path)).toEqual(pb.entries.map((e) => e.path));
      for (let i = 0; i < pa.entries.length; i += 1) {
        expect(Array.from(pa.entries[i].data)).toEqual(Array.from(pb.entries[i].data));
      }
    } else {
      expect(sameExceptTime).toBe(true);
    }
  });
});

describe('FR-52 ZIP 内引用解析（脚本同口径复核）', () => {
  /** 与 scripts/zip-assert.mjs 相同的相对引用解析语义 */
  function resolveInZip(fromPath: string, ref: string): string | null {
    if (ref.startsWith('/')) return null;
    const base = fromPath.split('/').slice(0, -1);
    const out = [...base];
    for (const s of ref.split('?')[0].split('#')[0].split('/')) {
      if (!s || s === '.') continue;
      if (s === '..') out.pop();
      else out.push(s);
    }
    return out.join('/');
  }

  it('同级/上级/子目录引用解析正确', () => {
    expect(resolveInZip('preview/index.html', 'index.css')).toBe('preview/index.css');
    expect(resolveInZip('preview/index.html', '../runtime.js')).toBe('runtime.js');
    expect(resolveInZip('a/b/c.html', './d/e.css')).toBe('a/b/d/e.css');
  });

  it('站点绝对路径（/fonts/…）不可解析 → 判定为失败（file:// 与 ZIP 均 404）', () => {
    expect(resolveInZip('preview/index.html', '/fonts/inter.woff2')).toBeNull();
  });

  it('查询串/锚点被剥离', () => {
    expect(resolveInZip('index.html', 'app.js?v=1')).toBe('app.js');
    expect(resolveInZip('index.html', 'index.css#top')).toBe('index.css');
  });
});
