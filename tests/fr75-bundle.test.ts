/**
 * FR-75 项目包（`src/generator/bundle.ts`）单测。
 *
 * ## 为什么要这一层
 * 「导出项目包」原先只有 `CodeModal` 里的一个闭包，没有断言 —— 按钮能点、zip 能下，
 * 但**没人证明包里有几页、每页在哪、三端齐不齐**。抽成纯函数后必须锁住形状，
 * 否则下次改生成器（比如给 taro 加文件）会静默改变包结构，而 UI 上看不出来。
 *
 * ## 锁什么
 * 1. 三端条目齐：每端 `package.json` + `codegen-manifest.json` + `pages.length` 个页面目录
 * 2. 单端清单与 `pagePathOf` 同源（页面路径不能两处各推一份）
 * 3. `bytes` 按**解码后字节**累加（base64 条目不能拿字符串长度充数，差 4/3）
 * 4. 空工程直接抛错（打一个 0 页的包是无效产物，不该静默成功）
 */
import { describe, it, expect } from 'vitest';
import { buildBundleEntries, buildTargetManifest, BUNDLE_TARGETS, countNodes } from '../src/generator/bundle';
import { pagePathOf } from '../src/generator/emit-context';
import type { UINode, UIPage } from '../src/schema/types';

const pad4 = [0, 0, 0, 0] as [number, number, number, number];
const layout = (extra: Record<string, unknown> = {}) => ({
  mode: 'VERTICAL' as const,
  widthMode: 'FIXED' as const,
  heightMode: 'FIXED' as const,
  padding: pad4,
  gap: 0,
  ...extra,
});

function node(type: string, extra: Record<string, unknown> = {}): UINode {
  return { id: `n-${type}`, name: type, type, layout: layout(), style: {}, children: [], ...extra } as unknown as UINode;
}

function page(name: string, children: UINode[], id = 'page'): UIPage {
  return {
    id,
    name,
    viewport: { width: 375, height: 812 },
    root: {
      id: 'root',
      name: 'Root',
      type: 'FRAME',
      layout: layout({ width: 375, height: 812 }),
      style: {},
      children,
    } as never,
  };
}

/** 两页：首页 + 分类（页面名用中文，走 `pagePathOf` 的 slug 兜底 → pages/p-N） */
function twoPages(): UIPage[] {
  const text = node('TEXT', { content: '你好' } as Record<string, unknown>);
  return [
    page('首页', [node('FRAME', { children: [text] }) as UINode], 'p1'),
    page('分类', [node('SECTION', { children: [text] }) as UINode], 'p2'),
  ];
}

describe('buildBundleEntries（FR-75 项目包）', () => {
  const pages = twoPages();

  it('四端齐全，且 vue 是独立一端（不能悄悄减回三端）', () => {
    expect([...BUNDLE_TARGETS]).toEqual(['react', 'vue', 'taro', 'uniapp']);
  });

  it('三端齐全：每端有 package.json / codegen-manifest.json / 与页面数一致的页面目录', async () => {
    const { entries } = await buildBundleEntries(pages, 'demo');
    const paths = new Set(entries.map((e) => e.path));

    for (const target of BUNDLE_TARGETS) {
      expect(paths.has(`${target}/package.json`), `${target} 缺 package.json`).toBe(true);
      const man = entries.find((e) => e.path === `${target}/codegen-manifest.json`);
      expect(man, `${target} 缺 codegen-manifest.json`).toBeTruthy();
      expect((JSON.parse(String(man!.content)) as { pages: unknown[] }).pages).toHaveLength(pages.length);

      // react/vue 的页面在 pages/ 下，taro/uniapp 在 src/pages/ 下
      const base = target === 'react' || target === 'vue' ? 'pages' : 'src/pages';
      const prefix = `${target}/${base}/`;
      const dirs = new Set(
        [...paths].filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length).split('/')[0]),
      );
      expect([...dirs].filter(Boolean), `${target} 页面目录数`).toHaveLength(pages.length);
    }
    expect(paths.has('manifest.json')).toBe(true);
  });

  it('单端清单的页面路径与 pagePathOf 同源（不许两处各推一份）', async () => {
    const { entries } = await buildBundleEntries(pages, 'demo');
    const man = JSON.parse(
      String(entries.find((e) => e.path === 'react/codegen-manifest.json')!.content),
    ) as { pages: { path: string; nodes: number; html: string }[] };
    expect(man.pages.map((p) => p.path)).toEqual(pages.map((p, i) => pagePathOf(p, i)));
    // html 必须由 path 推导，不能另写一套
    for (const p of man.pages) expect(p.html).toBe(`${p.path}/index.html`);
    for (const p of man.pages) expect(p.nodes).toBeGreaterThan(0);
  });

  it('bytes 按解码后字节累加（base64 条目不能拿字符串长度充数）', async () => {
    const { entries, manifest } = await buildBundleEntries(pages, 'demo');
    for (const t of manifest.targets) {
      const actual = entries
        .filter((e) => e.path.startsWith(`${t.id}/`))
        .reduce((sum, e) => sum + (typeof e.content === 'string' ? Buffer.byteLength(e.content, 'utf8') : e.content.length), 0);
      // targets.bytes 只统计生成器产出的文件，不含我们追加的 codegen-manifest.json
      expect(t.bytes).toBeLessThanOrEqual(actual);
      expect(t.bytes).toBeGreaterThan(0);
    }
  });

  it('根 manifest 的页面清单带节点数（与 countNodes 同口径）', async () => {
    const { manifest } = await buildBundleEntries(pages, 'demo');
    expect(manifest.pages.map((p) => p.name)).toEqual(['首页', '分类']);
    expect(manifest.pages.map((p) => p.nodes)).toEqual(pages.map((p) => countNodes(p.root)));
    expect(manifest.notes.length).toBeGreaterThan(0);
  });

  it('空工程抛错（0 页的包是无效产物，不能静默成功）', async () => {
    await expect(buildBundleEntries([], 'empty')).rejects.toThrow(/至少要有一页/);
  });
});

describe('buildTargetManifest', () => {
  it('与 scripts/codegen.ts 共用：target 放宽成 string，vue 也能出同构清单', () => {
    const m = buildTargetManifest('vue', twoPages(), 12, 3456);
    expect(m.target).toBe('vue');
    expect(m.files).toBe(12);
    expect(m.bytes).toBe(3456);
    expect(m.pages).toHaveLength(2);
    expect(m.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
