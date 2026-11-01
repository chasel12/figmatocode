/**
 * FR-70/FR-71 通用 TSX emitter（docs/multi-target-codegen-plan.md §2.4）
 *
 * React 与 Taro 都是 TSX，**差异只在标签表和图片引入方式**，故抽一个 emitter，
 * 两侧各传一张 `TagMap` + 一个 `imageAttr` 函数即可。
 *
 * 与 `generator/html.ts` 的关系：这是 DOM 出口的**逐节点等价改写**，
 * 标签选择、自闭合时机、SLICE 跳过、Taro/Rectangle 空 div 口径全部对齐——
 * 像素关的可达性依赖「同一套 CSS + 同一 DOM 结构 + 同一字体」三者一致。
 *
 * 与 html.ts 的两处必要差异（JSX 语法所迫，不改变渲染结果）：
 * 1. `class` → `className`；
 * 2. 文本走 `{JSON.stringify(text)}` 而非 HTML 实体转义——JSX 文本里的 `{`/`}` 是表达式边界，
 *    实体转义挡不住，而字符串字面量对 `&`/`<`/`"` 全部安全。
 */
import type { UINode } from '../schema/types';
import { isContainer } from '../schema/types';
import { escapeAttr } from './attr';
import { svgOfNodeVector, svgOfVector } from './vector';
import { IMAGE_PLACEHOLDER_CLASS, placeholderClass } from './imagePlaceholder';
import { isShapeSvgNode, shapePathData, shapeFillOf, shapeStrokeOf } from '../compiler/shapePath';
import { assetPathOf, semanticTag, type EmitContext } from './emit-context';

/** SVG 连字符属性 → JSX camelCase（svgOfVector 输出面固定，无 data-/aria- 前缀属性） */
function svgToJsx(svg: string): string {
  return svg
    .replace(/\s([a-z]+(?:-[a-z]+)+)=/g, (_m, name: string) => {
      const camel = name.replace(/-([a-z])/g, (_x, c: string) => c.toUpperCase());
      return ` ${camel}=`;
    })
    .replace(/(\s)class=/g, '$1className=');
}

export interface TsxEmitOptions {
  /** 缩进单位（缺省两空格） */
  indent?: string;
  /** 根节点起始深度（缺省 1，即函数体一级缩进） */
  startDepth?: number;
  /** 根节点 id 锚点（与 HTML 出口同口径，供外部工具定位） */
  rootId?: string;
  /** 图片属性片段（除 className 外的全部属性；缺省 `src="path" alt=""`；Taro 传 require+mode 版本） */
  imageAttr?: (node: UINode, src: string) => string;
  /** BUTTON 是否输出 type="button"（Taro 的 Button 不认该属性） */
  buttonType?: boolean;
  /** 无 src 图片的占位类名（缺省 ui-image-placeholder，与 html.ts 同口径） */
  imagePlaceholderClass?: string;
  /**
   * 是否同时挂上 P3-4 的色调类（`ui-image-ph-<tone>-<hue>`）。
   *
   * 缺省 true（React 出口的 index.css 里带着占位规则）。Taro 出口传 false：
   * 它的 `index.scss` 不含占位规则（空图走 `Image` 组件而不是背景块），
   * 挂一个没有对应规则的类只会让产物里多一串查不到定义的类名。
   */
  imageToneClass?: boolean;
  /**
   * 节点级附加属性（导航用）：返回串直接拼在 `className` 之后。
   *
   * 为什么是回调而不是布尔：React 与 Taro 的跳转写法完全不同
   * （`window.location.href` vs `Taro.navigateTo`），emitter 不该知道这些。
   * 目标推导与方式选择由 `generator/navigation.ts` 负责，各端只做字符串拼装。
   *
   * 只挂在 TEXT / BUTTON / 容器上：`wireNavigation` 只给 TEXT/BUTTON 挂跳转，
   * 而 IMAGE / VECTOR 分支返回的是整段 svg 或自闭合标签，往里拼属性容易拼坏。
   */
  navAttr?: (node: UINode) => string;
}

const defaultImageAttr = (node: UINode, src: string): string =>
  `src="${src}" alt="${escapeAttr((node as { alt?: string }).alt ?? '')}"`;

/** 单页 body（不含 import / 组件壳）：供 React、Taro 两侧复用 */
export function emitTsxBody(ctx: EmitContext, options: TsxEmitOptions = {}): string {
  const indentUnit = options.indent ?? '  ';
  const startDepth = options.startDepth ?? 1;
  const imageAttr = options.imageAttr ?? defaultImageAttr;
  const buttonType = options.buttonType ?? true;
  const placeholder = options.imagePlaceholderClass ?? IMAGE_PLACEHOLDER_CLASS;
  const withTone = options.imageToneClass ?? true;
  const navAttr = options.navAttr;
  const classNames = new Map(ctx.compiled.nodes.map((n) => [n.id, n.className]));

  const renderNode = (node: UINode, depth: number): string => {
    const indent = indentUnit.repeat(depth);
    const cls = classNames.get(node.id) ?? node.id;
    const tag = ctx.tag(node);
    // 根节点 id 锚点（对齐 html.ts buildPreviewDom 的注入口径）
    const idAttr = options.rootId && node.id === ctx.page.root.id ? ` id="${node.id}"` : '';
    const nav = navAttr ? navAttr(node) : '';

    if (node.type === 'TEXT') {
      return `${indent}<${tag}${idAttr} className="${cls}"${nav}>{${JSON.stringify(node.text)}}</${tag}>`;
    }
    if (node.type === 'BUTTON') {
      const typeAttr = buttonType ? ' type="button"' : '';
      return `${indent}<${tag}${idAttr} className="${cls}"${typeAttr}${nav}>{${JSON.stringify(node.text)}}</${tag}>`;
    }
    if (node.type === 'IMAGE') {
      const raw = node.src || '';
      const src = raw ? assetPathOf(raw, ctx.assets) : '';
      if (src) {
        if ((node.style?.imageScaleMode ?? 'FILL') === 'TILE') {
          // TILE 走背景平铺（与 html.ts 同口径：img 无法平铺）
          const style = `{{ backgroundImage: ${JSON.stringify(`url('${src}')`)}, backgroundRepeat: 'repeat' }}`;
          return `${indent}<div${idAttr} className="${cls}" style=${style}></div>`;
        }
        return `${indent}<${tag}${idAttr} className="${cls}" ${imageAttr(node, src)} />`;
      }
      return `${indent}<div${idAttr} className="${cls} ${placeholder}${withTone ? ` ${placeholderClass(node.name)}` : ''}"></div>`;
    }
    if (node.type === 'SLICE') {
      return ''; // FR-14：Slice 不生成出码 DOM（与 html.ts 一致）
    }
    if (node.type === 'VECTOR') {
      const svg = svgOfNodeVector(node, cls);
      return svg ? `${indent}${svgToJsx(svg)}` : '';
    }
    if (isShapeSvgNode(node)) {
      // P1-14：圆/多边形/星形切 SVG 通道（shapePathData 单一事实源）
      const sp = shapePathData(node);
      if (sp) {
        const svg = svgOfVector(
          { d: sp.d, width: sp.width, height: sp.height },
          node.layout.width ?? sp.width,
          node.layout.height ?? sp.height,
          { className: cls, border: shapeStrokeOf(node.style?.border), fill: shapeFillOf(node.style) },
        );
        if (svg) return `${indent}${svgToJsx(svg)}`;
      }
      return `${indent}<div${idAttr} className="${cls}"></div>`;
    }
    if (!isContainer(node) || node.type === 'RECTANGLE') {
      return `${indent}<${tag}${idAttr} className="${cls}"${nav}></${tag}>`;
    }
    if (!node.children.length) return `${indent}<${tag}${idAttr} className="${cls}"${nav}></${tag}>`;

    const children = node.children
      .map((c) => renderNode(c, depth + 1))
      .filter(Boolean)
      .join('\n');
    return `${indent}<${tag}${idAttr} className="${cls}"${nav}>\n${children}\n${indent}</${tag}>`;
  };

  return renderNode(ctx.page.root, startDepth);
}

/** 页面组件名：pages/01-login → Pages01Login（TSX 标识符，纯 ASCII 可预测） */
export function componentNameOf(meta: { path: string }): string {
  const base = meta.path.replace(/^pages\//, '');
  const parts = base.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  return name ? `Page${name}` : 'Page';
}

/** 语义标签导出（供单测断言三出口 tag 序列一致） */
export { semanticTag };
