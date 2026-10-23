/**
 * FR-70 统一出口上下文（docs/multi-target-codegen-plan.md §2.2 / §2.3）
 *
 * 三个 generator（React / Vue / Taro）共用同一份 `EmitContext`：
 *   page      原树 —— 类型信息只有这里才有（VECTOR 的 vector.d、IMAGE 的 src、TEXT 的文案）
 *   compiled  IR   —— className + CSS 声明，**出码的唯一样式来源**（不二次推导样式）
 *   tag       语义标签 —— semanticTag + 框架 tagMap 合成
 *   assets    资源清单 —— dataURL → assets/ 相对路径
 *   meta      页面元信息 —— 输出路径 / 标题 / tabBar
 *
 * 纪律：
 * 1. 本文件只读 `schema/types` 与 `compiler/css-model`，不反向依赖任何 generator，
 *    避免三个出口互相 import 成环。
 * 2. **标签选择影响布局**：`semanticTag` 对文本返回 `span` 而非 `p`/`h1`，
 *    因为 compile 不输出 `display`（父容器非 flex 时默认 display 生效），
 *    块级标签会让文本块化，与画布 Konva 渲染不一致 → 像素关必挂。
 *    语义化收益由容器标签（main/section）+ 图片/按钮/矢量标签承担。
 * 3. 同一份 `UIPage` 三次调用必须得到同一 tag 序列（无随机、无时间戳）——
 *    像素关的基准可比性依赖这条。
 */
import type { UINode, UIPage } from '../schema/types';
import type { CompiledPage } from '../compiler/css-model';
import { collectDataUrls, assetFor } from './zipKit';

/** 生成产物文件（多出口共用；encoding=base64 表示 content 是 base64 载荷，写盘时按字节落） */
export interface GeneratedFile {
  path: string;
  content: string;
  encoding?: 'utf8' | 'base64';
}

/** 语义标签：由节点类型映射，框架侧再映射到具体组件 */
export type SemanticTag = 'main' | 'section' | 'div' | 'span' | 'button' | 'img' | 'svg';

/** 资源引用（FR-70）：工程内路径 + 运行时 URL + 原始 dataURL */
export interface AssetRef {
  /** 工程内相对路径，如 assets/img-1.png（落盘用；webpack require 也用它） */
  path: string;
  /** 运行时 URL，如 /assets/img-1.png（HTML/JSX 引用用；走 public/ 让 Vite 自动套 base） */
  url: string;
  /** 原始 dataURL（生成期替换用） */
  dataUrl: string;
  /** 扩展名（不含点），如 png / svg / bin */
  ext: string;
}

/** tabBar 单项（FR-73：Taro app.config 的 tabBar.list 同构） */
export interface TabBarItem {
  /** 页面路径，与 PageMeta.path 同口径（不含前导斜杠、不含扩展名） */
  pagePath: string;
  text: string;
  /** 图标名（来自 lucide 风格包；缺省不输出 iconPath） */
  icon?: string;
}

export interface PageMeta {
  /** 输出路径（不含扩展名），如 pages/01-login */
  path: string;
  /** 页面标题（取 page.name） */
  title: string;
  /** 推导出的底部导航；无导航语义时为 undefined */
  tabBar?: TabBarItem[];
}

export interface EmitContext {
  page: UIPage;
  compiled: CompiledPage;
  tag: (n: UINode) => string;
  assets: AssetRef[];
  meta: PageMeta;
}

/** 框架标签表：语义标签 → 框架实际标签（缺省 identity，即 HTML 原生） */
export type TagMap = Partial<Record<SemanticTag, string>>;

/**
 * 语义标签映射。
 *
 * 文本保持 `span`（见文件头纪律 2）；其余按类型给语义：
 * PAGE→main（文档主区）、SECTION→section、图片→img、按钮→button、矢量→svg。
 * FRAME/RECTANGLE 是纯容器，无更好语义，落 div。
 */
export function semanticTag(node: UINode): SemanticTag {
  switch (node.type) {
    case 'PAGE':
      return 'main';
    case 'SECTION':
      return 'section';
    case 'FRAME':
    case 'RECTANGLE':
      return 'div';
    case 'TEXT':
      return 'span';
    case 'BUTTON':
      return 'button';
    case 'IMAGE':
      return 'img';
    case 'VECTOR':
    case 'OVAL':
    case 'LINE':
    case 'POLYGON':
    case 'STAR':
      return 'svg';
    default:
      return 'div';
  }
}

/** 合成 `EmitContext.tag`：语义标签先查框架表，缺省用语义标签本身 */
export function makeTagFn(tagMap: TagMap = {}): (n: UINode) => string {
  return (n: UINode) => tagMap[semanticTag(n)] ?? semanticTag(n);
}

/** 收集工程内全部内联 dataURL 资源（遍历序去重，确定性：同输入同输出） */
export function collectAssets(pages: UIPage[]): AssetRef[] {
  return collectDataUrls(pages).map((dataUrl, i) => {
    const a = assetFor(dataUrl, i);
    return {
      path: a.file,
      url: `/${a.file}`,
      dataUrl: a.dataUrl,
      ext: a.file.split('.').pop() ?? 'bin',
    };
  });
}

/** dataURL → 运行时资源 URL（emitter 改写 src 用；未收录的 dataURL 与非 dataURL 原样返回） */
export function assetPathOf(src: string, assets: AssetRef[]): string {
  if (!src.startsWith('data:')) return src;
  return assets.find((a) => a.dataUrl === src)?.url ?? src;
}

const ASCII_KEEP = /[a-z0-9]+/g;

/** 页面名 → ASCII 路径片段（纯中文名返回空串，由调用方退化为序号） */
function asciiSlug(name: string): string {
  return (name.toLowerCase().match(ASCII_KEEP) ?? []).join('-').slice(0, 24);
}

/**
 * 输出路径：`pages/<ascii 片段>`。
 * demo/真实页面名普遍自带序号（"01 登录"），故不重复加序号；
 * 纯中文名（无 ASCII 片段）退化为 `pages/p-<序号>`，保证唯一且可预测。
 */
export function pagePathOf(page: UIPage, index: number): string {
  const slug = asciiSlug(page.name);
  return `pages/${slug || `p-${index + 1}`}`;
}

/**
 * tabBar 推导（plan §2.2「从 UIPage + Prototype Flow 推导」）。
 *
 * 只认明确的导航词，命中 ≥2 才生成——宁可不出 tabBar，也不要把「订单列表」误判成导航项。
 * 顺序按导航词表的固定优先级（首页 → 发现 → 消息 → 购物车 → 我的），保证多页工程稳定。
 */
const NAV_WORDS = ['首页', '发现', '消息', '购物车', '我的', '个人中心'] as const;

export function deriveTabBar(pages: UIPage[]): TabBarItem[] | undefined {
  const hits: { order: number; item: TabBarItem }[] = [];
  pages.forEach((p, i) => {
    const order = NAV_WORDS.findIndex((w) => p.name.includes(w));
    if (order >= 0) hits.push({ order, item: { pagePath: pagePathOf(p, i), text: p.name } });
  });
  if (hits.length < 2) return undefined;
  hits.sort((a, b) => a.order - b.order || a.item.pagePath.localeCompare(b.item.pagePath));
  return hits.slice(0, 5).map((h) => h.item);
}

export interface MakeContextOptions {
  /** 页面在工程中的序号（决定输出路径） */
  index?: number;
  /** 全部页面（用于资产去重与 tabBar 推导） */
  allPages?: UIPage[];
  tagMap?: TagMap;
  /** 显式覆盖 meta（优先级最高） */
  meta?: Partial<PageMeta>;
  /** 显式覆盖资产清单（避免每页重算） */
  assets?: AssetRef[];
}

/** 装配一页的 EmitContext（三个出口的唯一入口） */
export function makeEmitContext(
  page: UIPage,
  compiled: CompiledPage,
  opts: MakeContextOptions = {},
): EmitContext {
  const index = opts.index ?? 0;
  const allPages = opts.allPages ?? [page];
  const tabBar = opts.meta?.tabBar ?? deriveTabBar(allPages);
  return {
    page,
    compiled,
    tag: makeTagFn(opts.tagMap),
    assets: opts.assets ?? collectAssets(allPages),
    meta: {
      path: opts.meta?.path ?? pagePathOf(page, index),
      title: opts.meta?.title ?? page.name,
      ...(tabBar ? { tabBar } : {}),
    },
  };
}
