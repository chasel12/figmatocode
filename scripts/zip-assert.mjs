import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { allDemoPages } from '../src/demo/pages';
import { compilePage } from '../src/compiler';
import { resolveLayout } from '../src/compiler/layout';
import { createApproxMeasure } from '../src/compiler/measure';
import { generateTaroProject, generateHtml, generateReferenceHtml } from '../src/generator';
import { FONT_FILES } from '../src/font';
import { collectDataUrls, assetFor, assetBytes, rewriteEntryText } from '../src/generator/zipKit';
import { createZip } from '../src/utils/zip';

/**
 * FR-52 ZIP 与预览产物断言（M6 生产化）。
 *
 * 口径来源：PRD FR-52「断言 ZIP 含 assets/、HTML 相对引用可解析、页面根 id」。
 *
 * 做法（不依赖浏览器）：
 *   1) 直接调用真实 `createZip(entries)`（src/utils/zip.ts，纯函数）产出 ZIP 字节；
 *   2) 按 ZIP 规范解析 **中央目录**（End of Central Directory → Central Directory → 各 local header），
 *      逐条校验 CRC-32 / 压缩方式 / 偏移，确保不是「看起来像 ZIP 的字节」；
 *   3) 对 ZIP 内每个 HTML 条目抽取 `src=` / `href=` / `url()` 引用，逐条判定能否在 ZIP 内解析；
 *   4) 断言页面根节点渲染出**根 id**。
 *
 * 三条断言（assets/、相对引用、根 id）曾按「已知差距」如实记 FAIL 输出建议 diff；**2026-10-20 对账专单已在 src/ 接线**（zipKit 资产外提 + fontsBase 相对基座随包 + 根元素 id），本脚本改为断言真实装配（与 CodeModal 同构）。
 * 用法：node scripts/zip-assert.mjs   （产物落 dist/zip-assert/report.json）
 */

const root = process.cwd();
const outDir = join(root, 'dist', 'zip-assert');
mkdirSync(outDir, { recursive: true });

/* ---------------- 最小 ZIP 解析器（中央目录权威） ---------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** 解析 ZIP 字节 → 条目列表（走中央目录，校验签名/CRC/偏移） */
function parseZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // 1) EOCD：从尾部回扫 0x06054b50（注释最长 65535）
  let eocd = -1;
  const minEocd = Math.max(0, bytes.length - 22 - 65535);
  for (let i = bytes.length - 22; i >= minEocd; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('EOCD 未找到（非法 ZIP）');
  const total = view.getUint16(eocd + 10, true);
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);

  const decoder = new TextDecoder('utf-8');
  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < total; i += 1) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error(`中央目录签名非法 @${p}`);
    const method = view.getUint16(p + 10, true);
    const crc = view.getUint32(p + 16, true);
    const csize = view.getUint32(p + 20, true);
    const usize = view.getUint32(p + 24, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const lho = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (view.getUint32(lho, true) !== 0x04034b50) throw new Error(`local header 签名非法: ${name}`);
    const lNameLen = view.getUint16(lho + 26, true);
    const lExtraLen = view.getUint16(lho + 28, true);
    const dataStart = lho + 30 + lNameLen + lExtraLen;
    const data = bytes.subarray(dataStart, dataStart + csize);
    entries.push({
      path: name,
      method,
      crc,
      csize,
      usize,
      offset: lho,
      data,
      text: method === 0 ? decoder.decode(data) : null,
      crcOk: crc32(data) === crc,
      sizeOk: method === 0 ? data.length === usize : true,
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return { entries, cdSize, cdOffset, total, trailing: bytes.length - (cdOffset + cdSize) - 22 };
}

/* ---------------- HTML 引用抽取 ---------------- */

/** 抽取 HTML 中的外链引用（src/href/url()），忽略 data: / http(s): / # / 空 */
function extractRefs(html) {
  const refs = [];
  const push = (raw, kind) => {
    const v = raw.trim();
    if (!v || v.startsWith('data:') || v.startsWith('http://') || v.startsWith('https://') || v.startsWith('#')) return;
    refs.push({ kind, raw: v });
  };
  for (const m of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) push(m[1], 'attr');
  for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) push(m[1], 'css-url');
  return refs;
}

/** ZIP 内相对引用解析（POSIX 语义；返回解析后的条目路径或 null） */
function resolveInZip(fromPath, ref) {
  if (ref.startsWith('/')) return null; // 站点绝对路径在 ZIP / file:// 下均不可解析
  const base = fromPath.split('/').slice(0, -1);
  const segs = ref.split('?')[0].split('#')[0].split('/');
  const out = [...base];
  for (const s of segs) {
    if (!s || s === '.') continue;
    if (s === '..') out.pop();
    else out.push(s);
  }
  return out.join('/');
}

/* ---------------- 断言主体 ---------------- */

const pages = allDemoPages();
const checks = [];
const fail = (scope, msg) => checks.push({ scope, pass: false, msg });
const ok = (scope, msg) => checks.push({ scope, pass: true, msg });

const zipReports = [];

for (const page of pages) {
  const compiled = compilePage(page);
  const geometry = resolveLayout(page, createApproxMeasure());
  // FR-52 对账专单（2026-10-20）：预览页字体相对基座 + woff2 随包 + dataURL 图片外提 assets/——与 CodeModal.exportZip 同构
  const html = generateHtml(page, compiled, { fontsBase: '../assets/fonts' });
  const reference = generateReferenceHtml(page, compiled, geometry, { fontsBase: '../assets/fonts' });
  const taro = generateTaroProject(page, compiled);
  const assets = collectDataUrls([page]).map(assetFor);
  const rw = (path, content) => rewriteEntryText(content, path, assets);
  const fontEntries = FONT_FILES.map((f) => ({
    path: `assets/fonts/${f}`,
    content: new Uint8Array(readFileSync(join(process.cwd(), 'public', 'fonts', f))),
  }));

  // 与 CodeModal.exportZip 同构的条目集（编辑器和工程侧导出同源）
  const entries = [
    ...taro.map((f) => ({ ...f, content: rw(f.path, f.content) })),
    { path: 'preview/index.html', content: rw('preview/index.html', html) },
    { path: 'preview/reference.html', content: rw('preview/reference.html', reference) },
    ...fontEntries,
    ...assets.map((a) => ({ path: a.file, content: assetBytes(a.dataUrl) })),
  ];

  const blob = createZip(entries);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const zip = parseZip(bytes);
  const paths = zip.entries.map((e) => e.path);
  const scope = page.name;

  // --- 完整性 ---
  const badCrc = zip.entries.filter((e) => !e.crcOk);
  const badSize = zip.entries.filter((e) => !e.sizeOk);
  const badMethod = zip.entries.filter((e) => e.method !== 0);
  if (zip.total !== entries.length) fail(scope, `ZIP 条目数 ${zip.total} != 输入 ${entries.length}`);
  if (badCrc.length) fail(scope, `CRC-32 校验失败 ${badCrc.length} 条: ${badCrc.map((e) => e.path).join(', ')}`);
  if (badSize.length) fail(scope, `长度字段不一致: ${badSize.map((e) => e.path).join(', ')}`);
  if (badMethod.length) fail(scope, `非 store(0) 压缩方式: ${badMethod.map((e) => e.path).join(', ')}`);
  if (!badCrc.length && !badSize.length) ok(scope, `${zip.total} 条目 CRC/长度校验通过`);

  // --- 断言①：ZIP 含 assets/ ---
  const assetEntries = paths.filter((p) => p.startsWith('assets/'));
  const assetsOk = assetEntries.length > 0;
  if (assetsOk) ok(scope, `ZIP 含 assets/（${assetEntries.length} 条）`);
  else fail(scope, 'ZIP 不含 assets/ 目录（FR-52 断言①；当前实现无 assets/ 概念，见报告 suggestDiff）');

  // --- 断言②：HTML 相对引用可解析 ---
  let refTotal = 0;
  const unresolved = [];
  for (const e of zip.entries) {
    if (!e.path.endsWith('.html') || e.text === null) continue;
    for (const r of extractRefs(e.text)) {
      refTotal += 1;
      const resolved = resolveInZip(e.path, r.raw);
      if (resolved === null || !paths.includes(resolved)) {
        unresolved.push({ in: e.path, kind: r.kind, ref: r.raw, resolved });
      }
    }
  }
  if (unresolved.length === 0) ok(scope, `${refTotal} 条 HTML 相对引用全部可解析`);
  else {
    const sample = unresolved.slice(0, 3).map((u) => `${u.ref} (in ${u.in})`).join('; ');
    fail(scope, `${unresolved.length}/${refTotal} 条引用不可解析: ${sample}`);
  }

  // --- 断言③：页面根 id ---
  const rootClass = compiled.nodes.find((n) => n.id === page.root.id)?.className;
  const hasRootId = /<[a-z]+[^>]*\bid=["']/.test(html);
  const rootIdMatches = new RegExp(`\\bid=["']${page.root.id}["']`).test(html);
  // 根容器带 id= 或 data-node=（FR-50 原型运行时协议用 data-node 锚点）
  const hasRootAnchor = rootIdMatches || new RegExp(`data-node=["']${page.root.id}["']`).test(html);
  if (hasRootId && hasRootAnchor) ok(scope, `页面根 id 存在（${page.root.id}）`);
  else if (!hasRootId)

    fail(
      scope,
      `导出 HTML 无任何 id 属性（FR-52 断言③）；根节点仅输出 class="${rootClass}"，page.root.id="${page.root.id}" 未落盘`,
    );
  else fail(scope, `导出 HTML 有 id 但非根 id（期望 ${page.root.id}）`);

  zipReports.push({
    page: page.name,
    bytes: bytes.length,
    entries: zip.total,
    assetEntries: assetEntries.length,
    refTotal,
    unresolved: unresolved.length,
    rootId: page.root.id,
    rootClass,
    hasRootIdInHtml: hasRootId,
  });
}

/* ---------------- 汇总 ---------------- */

const failures = checks.filter((c) => !c.pass);
const byAssertion = {
  '① ZIP 含 assets/': zipReports.filter((r) => r.assetEntries > 0).length,
  '② HTML 相对引用可解析': zipReports.filter((r) => r.unresolved === 0).length,
  '③ 页面根 id': zipReports.filter((r) => r.hasRootIdInHtml).length,
};

const report = {
  feature: 'FR-52 · ZIP 与预览产物断言',
  pages: pages.length,
  checks: checks.length,
  pass: checks.length - failures.length,
  fail: failures.length,
  // 三项断言逐项通过页数（阈值：=pages 才算该项通过）
  assertions: {
    assetsDir: { pass: byAssertion['① ZIP 含 assets/'], total: pages.length, ok: byAssertion['① ZIP 含 assets/'] === pages.length },
    relativeRefs: { pass: byAssertion['② HTML 相对引用可解析'], total: pages.length, ok: byAssertion['② HTML 相对引用可解析'] === pages.length },
    rootId: { pass: byAssertion['③ 页面根 id'], total: pages.length, ok: byAssertion['③ 页面根 id'] === pages.length },
  },
  failures: failures.map((f) => ({ scope: f.scope, msg: f.msg })),
  pages_: zipReports,
  // src/ 禁改轨道：给出主线接入建议 diff（本脚本不改 src/）
  suggestDiff: [
    {
      file: 'src/generator/html.ts',
      point: 'generateHtml 输出的根容器补 id（FR-52 断言③）',
      diff: "  return `<!DOCTYPE html>\n  ...\n  <body>\n  ${collectFxDefs(page)}\n- ${bodyHtml}\n+ <div id=\"${page.root.id}\">${bodyHtml}</div>\n  </body>`",
      note: '或改 makeRenderer：根节点（node.id === page.root.id）渲染时附加 id 属性',
    },
    {
      file: 'src/font.ts',
      point: 'FONT_FACE_CSS 用站点绝对路径 /fonts/…，file:// 与 ZIP 相对解析均失败（FR-52②/FR-59）',
      diff: "- src:url('/fonts/inter-latin-wght-normal.woff2') format('woff2');\n+ src:url('assets/fonts/inter-latin-wght-normal.woff2') format('woff2');",
      note: '同时 build-pages.ts 需把 public/fonts 拷到 dist/pages/<id>/assets/fonts/，导出 ZIP 需含 assets/fonts/',
    },
    {
      file: 'src/editor/CodeModal.tsx',
      point: 'exportZip 未打包 assets/（FR-52 断言①）',
      diff: "  const zip = createZip([\n    ...files.taro,\n    { path: 'preview/index.html', content: files.html },\n    { path: 'preview/reference.html', content: files.reference },\n+   ...FONT_ASSETS.map((f) => ({ path: `assets/fonts/${f}`, content: readFontBytes(f) })),\n    ...files.protoFiles.map(...)\n  ]);",
      note: 'createZip 已支持 Uint8Array content，无需改 zip.ts',
    },
  ],
  generatedAt: new Date().toISOString(),
};

writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

for (const c of checks.filter((x) => !x.pass)) console.error(`FAIL  [${c.scope}] ${c.msg}`);
console.log(
  `assertions: assets/=${report.assertions.assetsDir.pass}/${pages.length}  relativeRefs=${report.assertions.relativeRefs.pass}/${pages.length}  rootId=${report.assertions.rootId.pass}/${pages.length}`,
);
console.log(`zip-assert: ${report.pass}/${report.checks} checks pass → dist/zip-assert/report.json`);
if (report.fail > 0) {
  console.log(`（${report.fail} 项 FAIL 已记入 report.json 的 suggestDiff：需主线在 src/ 接入，本轨道只读）`);
  process.exitCode = 1;
}
