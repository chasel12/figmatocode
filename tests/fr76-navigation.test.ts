/**
 * 导航投影（`src/generator/navigation.ts`）单测。
 *
 * ## 为什么要这一层
 *
 * `interactions` 在 schema 里、画布上能连线、HTML 原型出口能点，
 * **但四个工程出口（react / vue / taro / uniapp）此前一个都没消费它**——
 * 导出的工程里所有底栏和卡片入口都是死图。这类缺陷门禁全绿：
 * schema 合法、构建通过、像素 100%（点击不改渲染），只有人真去点才发现。
 *
 * ## 锁什么
 *
 * 1. 只发射 `ON_CLICK` + `NAVIGATE`，其余动作不发射（宁可没有，也不要假实现）
 * 2. 目标页不存在时静默跳过（不抛错、不产出指向空路径的跳转）
 * 3. 四端产物都真的带上跳转（每个出口各一条断言，避免「抽了公共函数但某端没接」）
 * 4. **无 interactions 时产物字节不变**——这是既有 19 页 demo 基线的保护
 * 5. 平级导航（双向互链）走清栈 API：小程序页面栈上限 10 层，
 *    连点底栏堆满之后所有 `navigateTo` 静默失败
 */
import { describe, it, expect } from 'vitest';
import {
  buildNavGraph,
  isPeerNav,
  navTargetOf,
  pageHasNavigation,
  relativeHtmlHref,
} from '../src/generator/navigation';
import { generateReactProject } from '../src/generator/react';
import { generateVueProject } from '../src/generator/vue';
import { generateTaroMultiPageProject } from '../src/generator/taro-project';
import { generateUniappProject } from '../src/generator/uniapp';
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

function text(id: string, content: string, targetId?: string): UINode {
  return node('TEXT', {
    id,
    text: content,
    ...(targetId
      ? {
          interactions: [
            { id: `i-${id}`, trigger: 'ON_CLICK', action: 'NAVIGATE', targetId },
          ],
        }
      : {}),
  });
}

function page(id: string, name: string, children: UINode[]): UIPage {
  return {
    id,
    name,
    viewport: { width: 375, height: 812 },
    root: {
      id: `root-${id}`,
      name: 'Root',
      type: 'FRAME',
      layout: layout({ width: 375, height: 812 }),
      style: {},
      children,
    } as never,
  };
}

/**
 * 两页互链（模拟底栏）：首页 ↔ 分类。
 * 页面名用中文，`pagePathOf` 走 slug 兜底 → `pages/p-1` / `pages/p-2`。
 */
function twoPeerPages(): UIPage[] {
  return [
    page('p1', '首页', [text('t1', '分类', 'p2')]),
    page('p2', '分类', [text('t2', '首页', 'p1')]),
  ];
}

/** 两页单向（模拟卡片入口）：首页 → 详情 */
function twoLinearPages(): UIPage[] {
  return [page('p1', '首页', [text('t1', '商品详情', 'p2')]), page('p2', '商品详情', [text('t2', '标题')])];
}

const fileOf = (files: { path: string; content: string }[], suffix: string): string =>
  files.find((f) => f.path.endsWith(suffix))?.content ?? '';

describe('buildNavGraph（路由表与互链图）', () => {
  it('路由表与 pagePathOf 同源（页面 id → 路径）', () => {
    const graph = buildNavGraph(twoPeerPages());
    expect(graph.routes.p1.path).toBe('pages/p-1');
    expect(graph.routes.p2.path).toBe('pages/p-2');
    expect(graph.routes.p1.name).toBe('首页');
  });

  it('双向互链进 peers，单向不进', () => {
    const peer = buildNavGraph(twoPeerPages());
    expect(isPeerNav(peer, 'p1', 'p2')).toBe(true);
    expect(isPeerNav(peer, 'p2', 'p1')).toBe(true);

    const linear = buildNavGraph(twoLinearPages());
    expect(isPeerNav(linear, 'p1', 'p2')).toBe(false);
  });
});

describe('navTargetOf（只认点击跳页）', () => {
  const graph = buildNavGraph(twoLinearPages());

  it('ON_CLICK + NAVIGATE 命中', () => {
    const t = navTargetOf(text('t1', '商品详情', 'p2'), graph);
    expect(t?.path).toBe('pages/p-2');
  });

  it('其它动作不发射（宁可没有，也不要假实现）', () => {
    const back = node('TEXT', {
      id: 'tb',
      text: '返回',
      interactions: [{ id: 'ib', trigger: 'ON_CLICK', action: 'BACK' }],
    });
    expect(navTargetOf(back, graph)).toBeNull();

    const hover = node('TEXT', {
      id: 'th',
      text: '分类',
      interactions: [{ id: 'ih', trigger: 'ON_HOVER', action: 'NAVIGATE', targetId: 'p2' }],
    });
    expect(navTargetOf(hover, graph)).toBeNull();
  });

  it('目标页不存在时静默跳过', () => {
    const orphan = text('to', '幽灵页', 'not-a-page');
    expect(navTargetOf(orphan, graph)).toBeNull();
  });

  it('无 graph 时（单页出码）一律 null', () => {
    expect(navTargetOf(text('t1', '商品详情', 'p2'), undefined)).toBeNull();
  });
});

describe('relativeHtmlHref（MPA 相对路径）', () => {
  it('同层页面用一级 ../（不能少，否则解析成 pages/p-1/p-2/index.html）', () => {
    expect(relativeHtmlHref('pages/p-1', 'pages/p-2')).toBe('../p-2/index.html');
    expect(relativeHtmlHref('pages/01-home', 'pages/09-dashboard')).toBe('../09-dashboard/index.html');
  });

  it('自跳退化为同目录（不该出现在产物里，但算错不能算出绝对路径）', () => {
    expect(relativeHtmlHref('pages/p-1', 'pages/p-1')).toBe('../p-1/index.html');
  });
});

describe('四端出口都真的发射跳转', () => {
  const pages = twoPeerPages();

  it('react：onClick + window.location.href', () => {
    const files = generateReactProject(pages);
    const tsx = fileOf(files, 'PageP1.tsx');
    expect(tsx).toContain('onClick');
    // href 走 JSON.stringify，产物里是双引号
    expect(tsx).toContain('window.location.href = "../p-2/index.html"');
  });

  it('vue：@click + go()，且注入了 script setup', () => {
    const files = generateVueProject(pages);
    const sfc = fileOf(files, 'PageP1.vue');
    expect(sfc).toContain("<script setup>");
    expect(sfc).toContain("@click=\"go('../p-2/index.html')\"");
  });

  it('taro：Taro 跳转 + import Taro', () => {
    const files = generateTaroMultiPageProject(pages);
    const tsx = fileOf(files, 'pages/p-1/index.tsx');
    expect(tsx).toContain("import Taro from '@tarojs/taro'");
    // url 走 JSON.stringify，产物里是双引号
    expect(tsx).toMatch(/Taro\.(navigateTo|reLaunch)\(\{ url: "\/pages\/p-2\/index" \}\)/);
  });

  it('uniapp：@tap + uni 跳转', () => {
    const files = generateUniappProject(pages);
    const sfc = fileOf(files, 'pages/p-1/index.vue');
    expect(sfc).toContain('<script setup>');
    expect(sfc).toContain("@tap=\"switchTo('/pages/p-2/index')\"");
    expect(sfc).toContain('uni.reLaunch({ url })');
  });
});

describe('平级导航走清栈 API', () => {
  it('互链 → reLaunch / switchTo（连点底栏不会堆满页面栈）', () => {
    const files = generateTaroMultiPageProject(twoPeerPages());
    expect(fileOf(files, 'pages/p-1/index.tsx')).toContain('Taro.reLaunch');
  });

  it('单向（卡片进详情）→ navigateTo / go（保留返回栈）', () => {
    const files = generateTaroMultiPageProject(twoLinearPages());
    expect(fileOf(files, 'pages/p-1/index.tsx')).toContain('Taro.navigateTo');

    const uni = generateUniappProject(twoLinearPages());
    expect(fileOf(uni, 'pages/p-1/index.vue')).toContain("@tap=\"go('/pages/p-2/index')\"");
  });
});

describe('无交互工程：产物字节不变（既有 19 页 demo 的基线保护）', () => {
  const plain = [page('p1', '首页', [text('t1', '你好')]), page('p2', '分类', [text('t2', '世界')])];

  it('pageHasNavigation 为 false', () => {
    const graph = buildNavGraph(plain);
    expect(pageHasNavigation(plain[0], graph)).toBe(false);
  });

  it('vue 不注入 script setup', () => {
    const sfc = fileOf(generateVueProject(plain), 'PageP1.vue');
    expect(sfc).not.toContain('<script setup>');
    expect(sfc).not.toContain('@click');
  });

  it('uniapp 不注入 script setup、不带 @tap', () => {
    const sfc = fileOf(generateUniappProject(plain), 'pages/p-1/index.vue');
    expect(sfc).not.toContain('<script setup>');
    expect(sfc).not.toContain('@tap');
  });

  it('taro 不 import Taro', () => {
    const tsx = fileOf(generateTaroMultiPageProject(plain), 'pages/p-1/index.tsx');
    expect(tsx).not.toContain('@tarojs/taro');
  });

  it('react 不带 onClick', () => {
    const tsx = fileOf(generateReactProject(plain), 'PageP1.tsx');
    expect(tsx).not.toContain('onClick');
  });
});

/**
 * 交互热区上提（`liftHitAreas`）。
 *
 * ## 为什么必须有这一组
 *
 * `wireNavigation` 把 `interactions` 写在**文字节点**上。产物于是是
 * `<Text onClick={...}>分类</Text>` —— 可点区域只有 24×14 的字，
 * 而用户点的是 90×50 的整格（图标 + 文字 + 留白）。
 * 症状是「底栏切换不了」：点图标没反应、点空白没反应。
 *
 * 上一版 e2e 用 `getByText('分类').click()` 精确点文字，天然绕过了这个问题
 * —— **门禁验的和用户做的不一样**。这组测试锁的是「绑定落在哪」。
 */
describe('交互热区上提（TEXT → 整格容器）', () => {
  /** 一格：图标 + 文字（叶子容器，子节点全是原子节点） */
  const tab = (key: string, label: string, targetId: string) =>
    node('FRAME', {
      id: `tab-${key}`,
      name: `导航-${label}`,
      children: [node('VECTOR', { id: `ic-${key}`, name: 'icon' }), text(`tx-${key}`, label, targetId)],
    });

  /** 底栏：三个不同目标的格子（首页当前页无跳转，所以只放两个可点格 + 一格自身） */
  const bar = () =>
    node('FRAME', {
      id: 'bar',
      name: '底部导航',
      position: 'FIXED',
      children: [tab('a', '分类', 'p2'), tab('b', '我的', 'p3')],
    });

  const threePages = (): UIPage[] => [
    page('p1', '首页', [node('TEXT', { id: 'body', text: '正文' }), bar()]),
    page('p2', '分类', [text('t2', '首页', 'p1')]),
    page('p3', '我的', [text('t3', '首页', 'p1')]),
  ];

  it('文字上的跳转上提到「一格」容器，文字自己不再绑定', () => {
    const graph = buildNavGraph(threePages());
    expect(graph.hitAreas.get('tab-a')).toBe('p2');
    expect(graph.hitAreas.get('tab-b')).toBe('p3');
    // 上提后文字不该再出现在 hitAreas（否则 H5 冒泡两次、小程序嵌套 bindtap）
    expect(graph.hitAreas.has('tx-a')).toBe(false);
    expect(graph.hitAreas.has('tx-b')).toBe(false);
  });

  it('不上提到整条底栏、更不上提到页面根', () => {
    const graph = buildNavGraph(threePages());
    // 底栏有三个不同目标 → 子树目标不唯一，必须停
    expect(graph.hitAreas.has('bar')).toBe(false);
    expect(graph.hitAreas.has('root-p1')).toBe(false);
  });

  it('navTargetOf 只认 hitAreas，回退读 interactions 会让文字重复绑定', () => {
    const graph = buildNavGraph(threePages());
    const page1 = threePages()[0];
    const bar = (page1.root.children as UINode[]).find((n) => n.id === 'bar') as UINode & { children: UINode[] };
    const tabA = bar.children[0] as UINode & { children: UINode[] };
    const textA = (tabA.children as UINode[]).find((n) => n.type === 'TEXT')!;
    expect(navTargetOf(tabA, graph)?.path).toBe('pages/p-2');
    expect(navTargetOf(textA, graph)).toBeNull();
  });

  it('产物里事件落在整格容器上，不在文字上（四端）', () => {
    const pages = threePages();

    const uni = fileOf(generateUniappProject(pages), 'pages/p-1/index.vue');
    expect(uni).toMatch(/<view class="frame-\d+" @tap="switchTo\('\/pages\/p-2\/index'\)">/);
    expect(uni).not.toMatch(/<text[^>]*@tap/);

    const vue = fileOf(generateVueProject(pages), 'PageP1.vue');
    expect(vue).toMatch(/<div class="frame-\d+" @click="go\('\.\.\/p-2\/index\.html'\)">/);
    expect(vue).not.toMatch(/<span[^>]*@click/);

    const taro = fileOf(generateTaroMultiPageProject(pages), 'pages/p-1/index.tsx');
    const react = fileOf(generateReactProject(pages), 'PageP1.tsx');
    for (const tsx of [taro, react]) {
      // onClick 挂在容器上：同一行既有 class 又有 onClick
      expect(tsx).toMatch(/className="frame-\d+"\s+onClick=/);
    }
  });

  it('嵌套容器里的文字：上提到最近的一格，不跨层', () => {
    // FRAME 外层 > FRAME 内层 > TEXT。外层子节点含容器 → 不是叶子容器，不能上提到外层
    const pages = [
      page('p1', '首页', [
        node('FRAME', {
          id: 'outer',
          name: '外层',
          children: [node('FRAME', { id: 'inner', name: '内层', children: [text('t1', '去分类', 'p2')] })],
        }),
      ]),
      page('p2', '分类', [text('t2', '回首页', 'p1')]),
    ];
    const graph = buildNavGraph(pages);
    expect(graph.hitAreas.get('inner')).toBe('p2');
    expect(graph.hitAreas.has('outer')).toBe(false);
    expect(graph.hitAreas.has('t1')).toBe(false);
  });

  it('无交互页面：hitAreas 为空（不误伤 19 页 demo 基线）', () => {
    const plain = [page('p1', '首页', [text('t1', '你好')])];
    expect(buildNavGraph(plain).hitAreas.size).toBe(0);
  });
});
