/**
 * FR-81 uni-app 出口（docs/mall-miniapp-plan.md §6 W5）
 *
 * 与 Vue 出口的关系：**骨架复用，标签与载体不复用**。
 *
 * 能复用的：SFC 外壳、`scssFromPage` 的样式出口、`deriveTabBar` 的导航推导、
 * 树遍历/自闭合/空壳口径（三端 DOM 结构必须等价，否则像素关不可比）。
 *
 * 不能复用的三处，也是本文件存在的理由：
 *
 *  1. **标签**：mp-weixin 的 wxml 只认 `view/text/image/...`，`div/span/img/svg` 一律编译失败。
 *     故 `div/main/section → view`、`span → text`、`img → image`、`button → view`。
 *     为什么 button 也降成 view：uni 的 `<button>` 自带 border/margin/line-height 与
 *     `::after` 伪元素边框，重置成本高于收益；我们的样式全在 class 上，标签语义不影响视觉。
 *  2. **矢量**：wxml 没有 `<svg>`。VECTOR 与 OVAL/POLYGON/STAR 改为
 *     `view` + `background-image: url(data:image/svg+xml;base64,...)`，
 *     颜色在 `svgOfNodeVector` / `shapePathData` 里已烘进 markup，不依赖 class。
 *  3. **单位**：保持 px，**不转 rpx**。转 rpx 会让 375 宽的设计在 750 宽设备上错位，
 *     而我们的像素基线是 375 视口。
 *
 * 已知降级（写进产物 README，不藏着）：
 *  - `backdrop-filter`（BACKGROUND_BLUR）在 mp-weixin 不支持 → 毛玻璃退化为半透明底色；
 *  - `display:grid` 在部分基础库支持不全 → 等分网格在旧机型上可能塌成单列；
 *  - `@font-face` 在 mp-weixin 只能走网络或 base64 → 小程序端回退系统字体栈。
 *    因此 **小程序端只承诺「结构齐 + 编得过」，像素一致只在 H5 端承诺**（plan §7 L4）。
 */
import type { UINode, UIPage } from '../schema/types';
import { isContainer } from '../schema/types';
import { compilePage } from '../compiler/compile';
import { scssFromPage } from '../compiler/css-model';
import { fontFaceCss, FONT_STACK } from '../font';
import { IMAGE_PLACEHOLDER_CLASS, collectPlaceholderNodes, imagePlaceholderCss, placeholderClass } from './imagePlaceholder';
import { escapeAttr } from './attr';
import { svgOfNodeVector, svgOfVector } from './vector';
import { isShapeSvgNode, shapePathData, shapeFillOf, shapeStrokeOf } from '../compiler/shapePath';
import { assetBytes } from './zipKit';
import {
  collectAssets,
  makeEmitContext,
  deriveTabBar,
  hasFixedChrome,
  assetPathOf,
  type AssetRef,
  type EmitContext,
  type GeneratedFile,
} from './emit-context';
import { componentNameOf } from './tsx-emitter';
import { buildNavGraph, isPeerNav, navTargetOf, pageHasNavigation } from './navigation';
import type { FontPayload } from './react';

/** 语义标签 → uni 标签。缺键表示「原样使用」（本表覆盖了 semanticTag 的全部输出） */
export const UNIAPP_TAG_MAP: Record<string, string> = {
  main: 'view',
  section: 'view',
  div: 'view',
  span: 'text',
  button: 'view',
  img: 'image',
  svg: 'view',
};

/** 单页模板（不含 <template> 外壳） */
export function emitUniappTemplate(ctx: EmitContext): string {
  const classNames = new Map(ctx.compiled.nodes.map((n) => [n.id, n.className]));

  /**
   * 跳转属性：`@tap="go('/pages/02-cat/index')"`。
   *
   * 用 `@tap` 而不是 `@click`：小程序端 click 在旧基础库上不触发，
   * 而 uni 的 tap 在 H5 端会映射成 click，两端同一份代码。
   */
  const navAttrOf = (node: UINode): string => {
    const target = navTargetOf(node, ctx.nav);
    if (!target) return '';
    const url = `/${target.path}/index`;
    // 平级导航（底栏互链）走 reLaunch：小程序页面栈上限 10 层，
    // navigateTo 连点底栏会把栈堆满，之后所有跳转静默失败
    const fn = isPeerNav(ctx.nav, ctx.page.id, target.pageId) ? 'switchTo' : 'go';
    return ` @tap="${fn}('${url}')"`;
  };

  const renderNode = (node: UINode, depth: number): string => {
    const indent = '  '.repeat(depth);
    const cls = classNames.get(node.id) ?? node.id;
    const tag = ctx.tag(node);
    const idAttr = node.id === ctx.page.root.id ? ` id="${node.id}"` : '';
    const nav = navAttrOf(node);

    if (node.type === 'TEXT') {
      return `${indent}<${tag}${idAttr} class="${cls}"${nav}>${escapeText(node.text ?? '')}</${tag}>`;
    }
    if (node.type === 'BUTTON') {
      return `${indent}<${tag}${idAttr} class="${cls}"${nav}>${escapeText(node.text ?? '')}</${tag}>`;
    }
    if (node.type === 'IMAGE') {
      const raw = node.src || '';
      const src = raw ? assetPathOf(raw, ctx.assets) : '';
      if (src) {
        if ((node.style?.imageScaleMode ?? 'FILL') === 'TILE') {
          return `${indent}<view${idAttr} class="${cls}" style="background-image:url('${src}');background-repeat:repeat;"></view>`;
        }
        // 小程序没有 alt 语义，替代文本走 aria-label（微信/uni-app 都认）
        return `${indent}<image${idAttr} class="${cls}" src="${src}" mode="aspectFill"${
          node.alt ? ` aria-label="${escapeAttr(node.alt)}"` : ''
        } />`;
      }
      // 占位色块：仍走 view + class（与 HTML 端同一个 placeholder class，像素关才可比）
      return `${indent}<view${idAttr} class="${cls} ${IMAGE_PLACEHOLDER_CLASS} ${placeholderClass(node.name)}"></view>`;
    }
    if (node.type === 'SLICE') return '';
    if (node.type === 'VECTOR') {
      const svg = svgOfNodeVector(node, cls);
      return svg ? `${indent}${svgAsBackground(svg, cls, node, idAttr)}` : '';
    }
    if (isShapeSvgNode(node)) {
      const sp = shapePathData(node);
      if (sp) {
        const svg = svgOfVector(
          { d: sp.d, width: sp.width, height: sp.height },
          node.layout.width ?? sp.width,
          node.layout.height ?? sp.height,
          { className: cls, border: shapeStrokeOf(node.style?.border), fill: shapeFillOf(node.style) },
        );
        if (svg) return `${indent}${svgAsBackground(svg, cls, node, idAttr)}`;
      }
      return `${indent}<view${idAttr} class="${cls}"></view>`;
    }
    if (!isContainer(node) || node.type === 'RECTANGLE') {
      return `${indent}<${tag}${idAttr} class="${cls}"${nav}></${tag}>`;
    }
    if (!node.children.length) return `${indent}<${tag}${idAttr} class="${cls}"${nav}></${tag}>`;

    const children = node.children
      .map((c) => renderNode(c, depth + 1))
      .filter(Boolean)
      .join('\n');
    return `${indent}<${tag}${idAttr} class="${cls}"${nav}>\n${children}\n${indent}</${tag}>`;
  };

  return renderNode(ctx.page.root, 1);
}

/** 把 svg 串成 background-image（wxml 没有 <svg>，这是唯一能保住矢量外观的载体） */
function svgAsBackground(svg: string, cls: string, node: UINode, idAttr: string): string {
  const data = base64Of(svg);
  // background-size:100% 100% —— 尺寸已由 class 的 width/height 决定，这里只负责拉伸填满
  return `<view${idAttr} class="${cls}" style="background-image:url('data:image/svg+xml;base64,${data}');background-size:100% 100%;background-repeat:no-repeat;"></view>`;
}

function base64Of(text: string): string {
  // btoa 只吃 Latin1；我们的 svg 全是 ASCII（颜色是 hex，路径是数字与命令字母）
  return btoa(text);
}

/** 文本转义：`<text>` 里出现 `<` 会把 wxml 解析坏 */
function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 单页产物：`src/pages/<slug>/index.vue`（plan §2.3 统一签名）
 *
 * 为什么带 `src/` 前缀：uni-app 的 vite 工程把**源码根**定在 `src/`，
 * `@dcloudio/vite-plugin-uni` 的 CLI 启动时就去读 `src/manifest.json`，
 * 放在工程根会直接 ENOENT（实测：`open .../uniapp/src/manifest.json`）。
 */
export function generateUniapp(ctx: EmitContext): GeneratedFile[] {
  const dir = `src/${ctx.meta.path}`;
  const template = emitUniappTemplate(ctx);
  const css = scssFromPage(ctx.compiled);
  const hasNav = pageHasNavigation(ctx.page, ctx.nav);

  // 只有真有跳转才注入 <script setup>：无 interactions 的单页产物字节不变
  const script = hasNav
    ? `<script setup>
// 平级导航（底栏互链）走 reLaunch：小程序页面栈上限 10 层，
// navigateTo 连点底栏会把栈堆满，之后所有跳转静默失败
const go = (url) => {
  uni.navigateTo({ url })
}
const switchTo = (url) => {
  uni.reLaunch({ url })
}
</script>

`
    : '';

  const sfc = `${script}<template>
${template}
</template>

<style>
${css}</style>
`;
  return [{ path: `${dir}/index.vue`, content: sfc }];
}

export interface UniappProjectOptions {
  name?: string;
  fonts?: FontPayload[];
  /** 小程序 appid；缺省空串（开发者工具里可「测试号」打开） */
  appid?: string;
}

/** 多页工程装配（脚手架 + 全部页面 + 资产 + 字体 + pages.json/manifest.json） */
export function generateUniappProject(pages: UIPage[], options: UniappProjectOptions = {}): GeneratedFile[] {
  const appName = options.name ?? 'ui-compiler-uniapp';
  const assets = collectAssets(pages);
  const nav = buildNavGraph(pages);
  const files: GeneratedFile[] = [];
  const metas: { path: string; title: string; name: string }[] = [];

  pages.forEach((page, i) => {
    const compiled = compilePage(page);
    const ctx = makeEmitContext(page, compiled, { index: i, allPages: pages, assets, tagMap: UNIAPP_TAG_MAP, nav });
    files.push(...generateUniapp(ctx));
    metas.push({ path: ctx.meta.path, title: ctx.meta.title, name: componentNameOf(ctx.meta) });
  });

  // 资产落 src/static/：uni 把 static 原样拷到产物根，H5 与小程序端路径一致
  for (const a of assets) {
    files.push({ path: `src/static/${a.path}`, content: toBase64(a), encoding: 'base64' });
  }
  for (const f of options.fonts ?? []) {
    files.push({ path: `src/static/fonts/${f.name}`, content: f.base64, encoding: 'base64' });
  }

  files.push(...scaffold(appName, metas, pages, Boolean(options.fonts?.length), options.appid ?? ''));
  return files;
}

function toBase64(asset: AssetRef): string {
  const bytes = assetBytes(asset.dataUrl);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function scaffold(
  appName: string,
  metas: { path: string; title: string; name: string }[],
  pages: UIPage[],
  hasFonts: boolean,
  appid: string,
): GeneratedFile[] {
  // 设计稿自带外壳时不出框架 tabBar + 导航栏交给设计稿（理由见 emit-context.hasFixedChrome）
  const ownChrome = hasFixedChrome(pages);
  const tabBar = ownChrome ? undefined : deriveTabBar(pages);

  const pkg = {
    name: appName,
    private: true,
    version: '1.0.0',
    scripts: {
      dev: 'uni',
      'dev:h5': 'uni',
      'build:h5': 'uni build',
      'dev:mp-weixin': 'uni -p mp-weixin',
      'build:mp-weixin': 'uni build -p mp-weixin',
    },
    dependencies: {
      '@dcloudio/uni-app': '3.0.0-4080420251103001',
      '@dcloudio/uni-h5': '3.0.0-4080420251103001',
      '@dcloudio/uni-mp-weixin': '3.0.0-4080420251103001',
      vue: '^3.4.21',
    },
    devDependencies: {
      '@dcloudio/vite-plugin-uni': '3.0.0-4080420251103001',
      vite: '^5.2.8',
    },
  };

  const pagesJson = {
    pages: metas.map((m) => ({
      path: `${m.path}/index`,
      style: { navigationBarTitleText: m.title },
    })),
    globalStyle: {
      navigationBarTextStyle: 'black',
      navigationBarTitleText: appName,
      navigationBarBackgroundColor: '#FFFFFF',
      backgroundColor: '#F7F7F7',
      ...(ownChrome ? { navigationStyle: 'custom' as const } : {}),
    },
    ...(tabBar
      ? {
          tabBar: {
            color: '#7A7E83',
            selectedColor: '#1C7ED6',
            backgroundColor: '#FFFFFF',
            borderStyle: 'black',
            list: tabBar.map((t) => ({ pagePath: `${t.pagePath}/index`, text: t.text })),
          },
        }
      : {}),
  };

  const manifest = {
    name: appName,
    appid,
    description: '由 UI Compiler 生成的多页 uni-app 工程',
    versionName: '1.0.0',
    versionCode: '100',
    // 不启用 px→rpx 自动转换：像素基线是 375 视口，转 rpx 会在大屏上整体放大
    transformPx: false,
    'mp-weixin': { appid, setting: { urlCheck: false }, usingComponents: true },
  };

  const viteConfig = `import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
})
`;

  const appVue = `<script>
export default {
  onLaunch() {
    // 静态 UI 工程：不拉数据、不初始化状态
  },
}
</script>

<style>
${globalCss(pages, hasFonts)}
</style>
`;

  const mainTs = `import { createSSRApp } from 'vue'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  return { app }
}
`;

  const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${appName}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;

  const readme = `# ${appName}

由 UI Compiler 生成的多页 uni-app 工程（${metas.length} 页）。

## 运行

\`\`\`bash
npm install
npm run build:h5          # 产物 dist/build/h5
npm run build:mp-weixin   # 产物 dist/build/mp-weixin（用微信开发者工具打开）
\`\`\`

## 页面

${metas.map((m) => `- \`${m.path}\` — ${m.title}`).join('\n')}
${tabBar ? `\n## 底部导航（由页面名推导，非设计稿信息）\n\n${tabBar.map((t) => `- ${t.text} → \`${t.pagePath}\``).join('\n')}\n` : ''}
## 已知降级（与 H5 的差异，不是 bug）

- 标签映射：\`div/main/section → view\`、\`span → text\`、\`img → image\`、\`button → view\`。
- 矢量：wxml 无 \`<svg>\`，VECTOR / OVAL / POLYGON / STAR 以
  \`background-image: url(data:image/svg+xml;base64,...)\` 承载。
- 单位保持 px（\`transformPx: false\`），不转 rpx。
- \`backdrop-filter\`（毛玻璃）在 mp-weixin 不支持 → 退化为半透明底色。
- \`display:grid\` 在部分基础库支持不全 → 旧机型上等分网格可能塌成单列。
${hasFonts ? '- 字体落 `static/fonts/`：H5 端生效；mp-weixin 的 `@font-face` 只支持网络或 base64，回退系统字体。\n' : '- 未注入字体文件，回退系统字体栈。\n'}- 本工程只含视觉层，不含业务逻辑。
`;

  return [
    { path: 'package.json', content: JSON.stringify(pkg, null, 2) + '\n' },
    { path: 'src/pages.json', content: JSON.stringify(pagesJson, null, 2) + '\n' },
    { path: 'src/manifest.json', content: JSON.stringify(manifest, null, 2) + '\n' },
    { path: 'vite.config.ts', content: viteConfig },
    { path: 'index.html', content: indexHtml },
    { path: 'src/App.vue', content: appVue },
    { path: 'src/main.ts', content: mainTs },
    { path: 'README.md', content: readme },
    { path: '.gitignore', content: 'node_modules\ndist\nunpackage\n' },
  ];
}

function globalCss(pages: UIPage[], hasFonts: boolean): string {
  // 字体走 /static/fonts：uni 把 static 原样拷到产物根，H5 的绝对路径才成立
  const face = hasFonts ? fontFaceCss('/static/fonts') : '';
  return `${face}page, body { margin: 0; padding: 0; }
page {
  font-family: ${FONT_STACK};
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
}
${imagePlaceholderCss(pages.flatMap((p) => collectPlaceholderNodes(p.root)))}
`;
}
