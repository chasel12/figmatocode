/**
 * FR-70~FR-73 多目标出口单测（docs/multi-target-codegen-plan.md §2）
 *
 * 锁三件事：
 * 1. 语义标签与页面路径推导是**确定性纯函数**（多页工程的可预测性依赖它）；
 * 2. **三出口 DOM 结构等价**——React/Vue/Taro 的标签序列必须同构，
 *    否则像素关的基准不可比（React 与 Vue 实测 99.52% 完全一致，就是这条的证据）；
 * 3. TSX emitter 与 HTML 出口（generator/html.ts）逐节点等价（根节点语义升级除外）。
 */
import { describe, it, expect } from 'vitest';
import { compilePage } from '../src/compiler/compile';
import { buildPreviewDom } from '../src/generator/html';
import {
  semanticTag,
  makeTagFn,
  pagePathOf,
  deriveTabBar,
  collectAssets,
  assetPathOf,
  makeEmitContext,
} from '../src/generator/emit-context';
import { emitTsxBody, componentNameOf } from '../src/generator/tsx-emitter';
import { emitVueTemplate } from '../src/generator/vue';
import { TARO_TAG_MAP } from '../src/generator/taro-project';
import { generateReactProject } from '../src/generator/react';
import { generateVueProject } from '../src/generator/vue';
import { generateTaroMultiPageProject } from '../src/generator/taro-project';
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

/** 从标记串里提取标签序列（忽略大小写差异，Taro 的 View/Text 归一为小写） */
function tagSequence(markup: string): string[] {
  return [...markup.matchAll(/<([a-zA-Z][\w-]*)/g)].map((m) => m[1].toLowerCase());
}

describe('semanticTag（FR-70）', () => {
  it('按类型给语义标签，文本保持 span（块级标签会改变布局）', () => {
    expect(semanticTag(node('PAGE'))).toBe('main');
    expect(semanticTag(node('SECTION'))).toBe('section');
    expect(semanticTag(node('FRAME'))).toBe('div');
    expect(semanticTag(node('RECTANGLE'))).toBe('div');
    expect(semanticTag(node('TEXT'))).toBe('span');
    expect(semanticTag(node('BUTTON'))).toBe('button');
    expect(semanticTag(node('IMAGE'))).toBe('img');
    expect(semanticTag(node('VECTOR'))).toBe('svg');
    expect(semanticTag(node('OVAL'))).toBe('svg');
    expect(semanticTag(node('STAR'))).toBe('svg');
  });

  it('框架标签表只改标签名，不改语义（Taro 全量映射）', () => {
    const taroTag = makeTagFn(TARO_TAG_MAP);
    expect(taroTag(node('FRAME'))).toBe('View');
    expect(taroTag(node('TEXT'))).toBe('Text');
    expect(taroTag(node('IMAGE'))).toBe('Image');
    expect(taroTag(node('BUTTON'))).toBe('Button');
    expect(taroTag(node('VECTOR'))).toBe('svg');
    // 缺省 identity
    expect(makeTagFn({})(node('FRAME'))).toBe('div');
  });
});

describe('pagePathOf（FR-70 多页路径）', () => {
  it('带序号的名字直接用 ASCII 片段，不重复加序号', () => {
    expect(pagePathOf(page('01 登录', []), 0)).toBe('pages/01');
    expect(pagePathOf(page('09 Dashboard', []), 8)).toBe('pages/09-dashboard');
  });

  it('纯中文名退化为 p-<序号>，保证唯一', () => {
    expect(pagePathOf(page('登录', []), 0)).toBe('pages/p-1');
    expect(pagePathOf(page('商品列表', []), 4)).toBe('pages/p-5');
  });

  it('空名/符号名同样退化，不产出空路径', () => {
    expect(pagePathOf(page('', []), 2)).toBe('pages/p-3');
    expect(pagePathOf(page('···', []), 1)).toBe('pages/p-2');
  });
});

describe('deriveTabBar（FR-73 导航推导）', () => {
  it('命中 <2 项不出 tabBar（宁缺勿错）', () => {
    expect(deriveTabBar([page('01 登录', []), page('03 商品列表', [])])).toBeUndefined();
    expect(deriveTabBar([page('01 首页', [])])).toBeUndefined();
  });

  it('命中 ≥2 项按导航词优先级排序', () => {
    const pages = [page('我的', []), page('01 首页', []), page('03 商品列表', [])];
    const bar = deriveTabBar(pages);
    expect(bar?.map((t) => t.text)).toEqual(['01 首页', '我的']);
    expect(bar?.[0].pagePath).toBe('pages/01');
  });

  it('最多 5 项', () => {
    const pages = ['首页', '发现', '消息', '购物车', '我的', '个人中心'].map((n, i) => page(n, [], `p${i}`));
    expect(deriveTabBar(pages)).toHaveLength(5);
  });
});

describe('assets（FR-79 资源落盘）', () => {
  const svg = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";

  it('dataURL → 工程路径 + 运行时 URL 双口径', () => {
    const assets = collectAssets([page('p', [node('IMAGE', { src: svg })])]);
    expect(assets).toHaveLength(1);
    expect(assets[0].path).toBe('assets/img-1.svg');
    expect(assets[0].url).toBe('/assets/img-1.svg');
    expect(assetPathOf(svg, assets)).toBe('/assets/img-1.svg');
  });

  it('非 dataURL 原样返回（http 图不落盘）', () => {
    const assets = collectAssets([page('p', [node('IMAGE', { src: 'https://x/y.png' })])]);
    expect(assets).toHaveLength(0);
    expect(assetPathOf('https://x/y.png', assets)).toBe('https://x/y.png');
  });
});

describe('三出口 DOM 结构等价（像素关前提）', () => {
  const mixed = page('01 混合页', [
    node('FRAME', {
      children: [
        node('TEXT', { text: '标题' }),
        node('BUTTON', { text: '按钮' }),
        node('IMAGE', { src: 'https://x/y.png' }),
        node('VECTOR', { vector: { d: 'M0 0 L10 10', width: 10, height: 10 } }),
        node('OVAL'),
        node('SLICE'),
      ],
    }),
    node('RECTANGLE'),
  ]);

  it('React 与 Vue 的标签序列完全一致', () => {
    const compiled = compilePage(mixed);
    const ctx = makeEmitContext(mixed, compiled, { index: 0 });
    const tsx = emitTsxBody(ctx, {});
    const vue = emitVueTemplate(ctx);
    expect(tagSequence(tsx)).toEqual(tagSequence(vue));
  });

  it('Taro 只是换了标签名，结构位置一一对应', () => {
    const compiled = compilePage(mixed);
    const ctx = makeEmitContext(mixed, compiled, { index: 0, tagMap: TARO_TAG_MAP });
    const tsx = emitTsxBody(ctx, { buttonType: false });
    const reactCtx = makeEmitContext(mixed, compiled, { index: 0 });
    const reactTsx = emitTsxBody(reactCtx, {});
    expect(tagSequence(tsx)).toHaveLength(tagSequence(reactTsx).length);
    expect(tagSequence(tsx)).toContain('view');
    expect(tagSequence(tsx)).toContain('text');
  });

  it('与 HTML 出口逐节点等价（根为 PAGE 时语义升级 div→main）', () => {
    // demo/真实工程的 root 常是 PAGE 类型，此时 TSX 出 main、html.ts 出 div
    const pageRooted = { ...mixed, root: { ...mixed.root, type: 'PAGE' } } as UIPage;
    const compiled = compilePage(pageRooted);
    const { bodyHtml } = buildPreviewDom(pageRooted, compiled);
    const ctx = makeEmitContext(pageRooted, compiled, { index: 0 });
    const tsx = emitTsxBody(ctx, {});
    const htmlTags = tagSequence(bodyHtml);
    const tsxTags = tagSequence(tsx);
    expect(htmlTags[0]).toBe('div');
    expect(tsxTags[0]).toBe('main');
    expect(tsxTags.slice(1)).toEqual(htmlTags.slice(1));
  });

  it('根为 FRAME 时两侧完全一致（都出 div）', () => {
    const compiled = compilePage(mixed);
    const { bodyHtml } = buildPreviewDom(mixed, compiled);
    const ctx = makeEmitContext(mixed, compiled, { index: 0 });
    expect(tagSequence(emitTsxBody(ctx, {}))).toEqual(tagSequence(bodyHtml));
  });

  it('SLICE 不产出 DOM（两侧同口径跳过）', () => {
    const compiled = compilePage(mixed);
    const ctx = makeEmitContext(mixed, compiled, { index: 0 });
    expect(emitTsxBody(ctx, {})).not.toContain('slice');
  });
});

describe('工程装配（FR-74 脚手架）', () => {
  const pages = [page('01 首页', [node('TEXT', { text: 'a' })], 'p1'), page('02 我的', [node('TEXT', { text: 'b' })], 'p2')];

  it('React：多页 input 全量展开，tsconfig/package 齐备', () => {
    const files = generateReactProject(pages, { name: 'demo' });
    const byPath = new Map(files.map((f) => [f.path, f.content]));
    const vite = byPath.get('vite.config.ts') ?? '';
    expect(vite).toContain("'01': fileURLToPath");
    expect(vite).toContain("'02': fileURLToPath");
    expect(byPath.has('tsconfig.json')).toBe(true);
    expect(byPath.has('src/global.css')).toBe(true);
    // 每页四件套
    expect(byPath.has('pages/01/index.html')).toBe(true);
    expect(byPath.has('pages/01/main.tsx')).toBe(true);
    expect(byPath.has('pages/01/Page01.tsx')).toBe(true);
    expect(byPath.has('pages/01/page.css')).toBe(true);
  });

  it('Vue：每页 SFC + env.d.ts shim（tsc 认 .vue 的前提）', () => {
    const files = generateVueProject(pages, { name: 'demo' });
    const byPath = new Map(files.map((f) => [f.path, f.content]));
    expect(byPath.has('pages/01/Page01.vue')).toBe(true);
    expect(byPath.get('env.d.ts')).toContain("declare module '*.vue'");
    expect(byPath.get('pages/01/Page01.vue')).toContain('<template>');
    expect(byPath.get('pages/01/Page01.vue')).toContain('<style>');
  });

  it('Taro：pages 动态生成 + tabBar 推导 + 资源在 src 内', () => {
    const files = generateTaroMultiPageProject(pages, { name: 'demo' });
    const byPath = new Map(files.map((f) => [f.path, f.content]));
    const appConfig = byPath.get('src/app.config.ts') ?? '';
    expect(appConfig).toContain('pages/01/index');
    expect(appConfig).toContain('pages/02/index');
    // 首页/我的 命中 2 个导航词 → 出 tabBar
    expect(appConfig).toContain('tabBar');
    expect(byPath.has('src/pages/01/index.tsx')).toBe(true);
    expect(byPath.has('config/index.ts')).toBe(true);
    // pxtransform 必须关（否则间距翻倍，像素关必挂）
    expect(byPath.get('config/index.ts')).toContain('pxtransform: { enable: false');
  });

  it('Taro 产物必须用 Taro 组件而非原生标签（装配路径也要覆盖）', () => {
    const files = generateTaroMultiPageProject([page('01 首页', [node('TEXT', { text: 'a' })], 'p1')], { name: 'demo' });
    const tsx = files.find((f) => f.path === 'src/pages/01/index.tsx')?.content ?? '';
    expect(tsx).toContain('<View');
    expect(tsx).toContain('<Text');
    // 原生标签一个都不许漏（小程序端 div/span 不存在）
    expect(tsx).not.toMatch(/<div[\s>]/);
    expect(tsx).not.toMatch(/<span[\s>]/);
    expect(tsx).toContain("from '@tarojs/components'");
  });

  it('componentNameOf：路径 → 合法 TSX 标识符', () => {
    expect(componentNameOf({ path: 'pages/01' })).toBe('Page01');
    expect(componentNameOf({ path: 'pages/09-dashboard' })).toBe('Page09Dashboard');
    expect(componentNameOf({ path: 'pages/p-3' })).toBe('PageP3');
  });
});
