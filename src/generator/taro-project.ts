/**
 * FR-73/FR-74 Taro 4 多页出口（docs/multi-target-codegen-plan.md §2.4 / §3 P0 / §8 风险）
 *
 * 与 React 出口共用 `emitTsxBody`，只换两张表：
 *   标签表  main/section/div→View，span→Text，button→Button，img→Image，svg→内联 svg
 *   图片    `src={require('../../assets/x.svg')} mode="aspectFill"`
 *
 * 相比旧 `generator/project.ts`（单页硬编码 `pages: ['pages/index/index']`）的三处升级：
 *   ① `pages` 数组按页面数动态生成；
 *   ② `tabBar.list` 由 `deriveTabBar` 从页面名推导（非设计稿信息，命中导航词才出）；
 *   ③ 资源落盘到 `src/assets/`，`require` 用相对路径（webpack 静态解析）。
 *
 * **像素关口径说明**：Taro 的 Button/Image 是自定义组件（h5 下渲染为 `taro-button-core` 等），
 * 带内置样式。要逼近设计稿必须在 `app.scss` 里做组件级 reset——本文件已做最小 reset，
 * 但 Taro 版本升级会改变内置样式，故 Taro 的像素关结果按「尽力值」记录，不与 React/Vue 同口径比较。
 */
import type { UINode, UIPage } from '../schema/types';
import { compilePage } from '../compiler/compile';
import { scssFromPage } from '../compiler/css-model';
import { fontFaceCss, FONT_STACK } from '../font';
import { assetBytes } from './zipKit';
import {
  collectAssets,
  deriveTabBar,
  hasFixedChrome,
  makeEmitContext,
  makeTagFn,
  type AssetRef,
  type EmitContext,
  type GeneratedFile,
  type TagMap,
} from './emit-context';
import { componentNameOf, emitTsxBody } from './tsx-emitter';
import { buildNavGraph, isPeerNav, navTargetOf } from './navigation';
import { collectPlaceholderNodes, imagePlaceholderCss } from './imagePlaceholder';
import type { FontPayload } from './react';

export const TARO_TAG_MAP: TagMap = {
  main: 'View',
  section: 'View',
  div: 'View',
  span: 'Text',
  button: 'Button',
  img: 'Image',
  svg: 'svg',
};

/** Taro 图片：webpack require 静态解析（相对 src/pages/<NN>/）+ aspectFill
 *  走 require 而非 URL 字符串：小程序端没有 public 概念，资源必须参与打包。
 *  非内联资源（http/data 已落盘之外的）退回字符串 src。 */
const taroImageAttr = (_node: UINode, src: string): string =>
  src.startsWith('/assets/')
    ? `src={require('../../${src.slice(1)}')} mode="aspectFill"`
    : `src="${src}" mode="aspectFill"`;

/** 单页 TSX（`generateTaro(ctx)`，plan §2.3 统一签名）
 *
 *  注意：标签表在这里**强制覆盖**为 TARO_TAG_MAP，不依赖调用方传入的 ctx。
 *  Taro 出口的定义就是「语义标签 → Taro 组件」，若沿用 identity 会产出
 *  `<div>/<span>`（h5 能跑、小程序必挂），属静默错误。
 */
export function generateTaro(ctx: EmitContext): GeneratedFile[] {
  const dir = ctx.meta.path;
  const name = componentNameOf(ctx.meta);
  const taroCtx: EmitContext = { ...ctx, tag: makeTagFn(TARO_TAG_MAP) };

  /** 该页是否有会被发射的跳转（决定要不要 import Taro） */
  let hasNav = false;
  const navAttr = (node: UINode): string => {
    const target = navTargetOf(node, ctx.nav);
    if (!target) return '';
    hasNav = true;
    const url = `/${target.path}/index`;
    // 平级导航（底栏互链）走 reLaunch 清栈：navigateTo 每次压栈，
    // 小程序栈上限 10 层，连点底栏之后所有跳转都会静默失败
    const mode = isPeerNav(ctx.nav, ctx.page.id, target.pageId) ? 'reLaunch' : 'navigateTo';
    return ` onClick={() => { Taro.${mode}({ url: ${JSON.stringify(url)} }) }}`;
  };

  const body = emitTsxBody(taroCtx, {
    rootId: ctx.page.root.id,
    startDepth: 2,
    buttonType: false,
    imageAttr: taroImageAttr,
    navAttr,
  });

  const tsx = `import { View, Text, Image, Button } from '@tarojs/components'
${hasNav ? "import Taro from '@tarojs/taro'\n" : ''}import './index.scss'

export default function ${name}() {
  return (
${body}
  )
}
`;

  const pageConfig = `export default {
  navigationBarTitleText: ${JSON.stringify(ctx.meta.title)},
}
`;

  return [
    { path: `src/${dir}/index.tsx`, content: tsx },
    { path: `src/${dir}/index.scss`, content: scssFromPage(ctx.compiled) },
    { path: `src/${dir}/index.config.ts`, content: pageConfig },
  ];
}

/** Taro h5 单页模板（SPA：多页靠 hash 路由，不产多 HTML） */
function h5Template(title: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<title>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>
</head>
<body>
<div id="app"></div>
</body>
</html>
`;
}

export interface TaroProjectOptions {
  name?: string;
  fonts?: FontPayload[];
}

/** 多页 Taro 4 工程装配 */
export function generateTaroMultiPageProject(
  pages: UIPage[],
  options: TaroProjectOptions = {},
): GeneratedFile[] {
  const appName = options.name ?? 'ui-compiler-taro-app';
  const assets = collectAssets(pages);
  const nav = buildNavGraph(pages);
  const files: GeneratedFile[] = [];
  const pageRoutes: string[] = [];

  pages.forEach((page, i) => {
    const compiled = compilePage(page);
    const ctx = makeEmitContext(page, compiled, { index: i, allPages: pages, assets, nav });
    files.push(...generateTaro(ctx));
    pageRoutes.push(`${ctx.meta.path}/index`);
  });

  // 资源：Taro 走 webpack require，必须落在 src 内
  for (const a of assets) {
    files.push({
      path: `src/${a.path}`,
      content: toBase64(a),
      encoding: 'base64',
    });
  }
  for (const f of options.fonts ?? []) {
    files.push({ path: `src/assets/fonts/${f.name}`, content: f.base64, encoding: 'base64' });
  }

  /**
   * 设计稿自带外壳（画了 FIXED 底栏/工具栏）时：不出框架 tabBar，导航栏也交给设计稿。
   * 否则 native 导航栏会把内容下推 47px、native tabBar 与设计稿底栏叠成两条。
   * 判据与理由见 `emit-context.hasFixedChrome`（demo 19 页 FIXED 数为 0，基线不动）。
   */
  const ownChrome = hasFixedChrome(pages);
  const tabBar = ownChrome ? undefined : deriveTabBar(pages);
  const appConfig = {
    pages: pageRoutes,
    window: {
      backgroundTextStyle: 'light',
      navigationBarBackgroundColor: '#ffffff',
      navigationBarTitleText: pages[0]?.name ?? appName,
      navigationBarTextStyle: 'black',
      ...(ownChrome ? { navigationStyle: 'custom' } : {}),
    },
    ...(tabBar
      ? {
          tabBar: {
            color: '#8a8a8a',
            selectedColor: '#0b6bcb',
            backgroundColor: '#ffffff',
            borderStyle: 'black',
            list: tabBar.map((t) => ({
              pagePath: `${t.pagePath}/index`,
              text: t.text,
            })),
          },
        }
      : {}),
  };

  files.push(
    { path: 'src/app.config.ts', content: `export default ${JSON.stringify(appConfig, null, 2)}\n` },
    {
      path: 'src/app.ts',
      content: `import { PropsWithChildren } from 'react'
import './app.scss'

function App({ children }: PropsWithChildren) {
  return children
}

export default App
`,
    },
    { path: 'src/app.scss', content: appScss(Boolean(options.fonts?.length), pages) },
    // Taro h5 的单页模板（SPA：多页靠 hash 路由 #/pages/<NN>/index）
    { path: 'src/index.html', content: h5Template(pages[0]?.name ?? appName) },
    ...scaffold(appName, pages.length, pageRoutes.length),
  );

  return files;
}

function toBase64(asset: AssetRef): string {
  const bytes = assetBytes(asset.dataUrl);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function appScss(hasFonts: boolean, pages: UIPage[]): string {
  return `${hasFonts ? fontFaceCss('./assets/fonts') + '\n' : ''}page,
.taro_page {
  background: #ffffff;
  font-family: ${FONT_STACK};
  -webkit-font-smoothing: antialiased;
}

/* Taro 组件最小 reset（h5）：内置 Button 带 padding/圆角/边框，Image 带 inline 基线间隙，
   不清掉就无法与设计稿对齐。weapp 侧由各自的默认样式接管，不做假设。 */
taro-button-core,
button {
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  line-height: inherit;
  font-size: inherit;
  color: inherit;
  overflow: visible;
}
taro-button-core::after,
button::after {
  border: 0;
}

/* Taro 内置「taro-button-core + taro-button-core { margin-top: 15px }」（模仿微信
   原生 button 的相邻间距）。它有两个标签名，特异性 0,0,2，压得过上面那条单选择器
   reset —— 于是「两个按钮上下排」会凭空多出 15px 间隙，整页从那里开始整体下移。
   实测：零食商城商品详情页因此比基准高 15px，taro 端相似度 92.88%，而 react /
   uni-app 都是 100%（同一份 AST、同一份 CSS，只差这一条组件默认值）。
   必须用同样两个标签名的相邻选择器才压得住。 */
taro-button-core + taro-button-core,
button + button {
  margin-top: 0;
}
taro-image-core,
img {
  display: inline-block;
  vertical-align: top;
}

/* 空 src 图片的占位样式（唯一权威定义在 imagePlaceholder.ts）。
   必须放全局 app.scss：页面级 index.scss 由 scssFromPage 生成，只含编译器的盒模型规则。
   曾经不发射这段、同时关掉色调类，理由是「Taro 的空图走 Image 组件而不是背景块」——
   实际 emitTsxBody 对空 src 出的是 View + 占位类，结果封面块透明、露出卡片底色，
   taro 端像素相似度被压在 92% 且只有截图能发现。 */
${imagePlaceholderCss(pages.flatMap((p) => collectPlaceholderNodes(p.root)))}
`;
}

function scaffold(appName: string, pageCount: number, routeCount: number): GeneratedFile[] {
  const pkg = {
    name: appName,
    version: '1.0.0',
    private: true,
    description: `UI Compiler 生成的 Taro 4 多页工程（${pageCount} 页）`,
    scripts: {
      'build:h5': 'taro build --type h5',
      'dev:h5': 'npm run build:h5 -- --watch',
      'build:weapp': 'taro build --type weapp',
      'dev:weapp': 'npm run build:weapp -- --watch',
    },
    browserslist: ['last 3 versions', 'Android >= 4.1', 'ios >= 8'],
    dependencies: {
      '@babel/runtime': '^7.24.4',
      '@tarojs/components': '4.0.9',
      '@tarojs/helper': '4.0.9',
      '@tarojs/plugin-framework-react': '4.0.9',
      '@tarojs/plugin-platform-h5': '4.0.9',
      '@tarojs/plugin-platform-weapp': '4.0.9',
      '@tarojs/react': '4.0.9',
      '@tarojs/runtime': '4.0.9',
      '@tarojs/shared': '4.0.9',
      '@tarojs/taro': '4.0.9',
      react: '^18.3.1',
      'react-dom': '^18.3.1',
    },
    devDependencies: {
      '@babel/core': '^7.24.4',
      /**
       * 两个 babel 包必须显式声明：babel-preset-taro@4.0.9 把它们放在 peerDependencies
       * （preset-react）或直接引用旧名（plugin-proposal-class-properties）却没进 dependencies，
       * 不装就是 `Cannot find module`，构建关必挂。
       * preset-react 锁 ^7：8.x 要求 @babel/core ^8，与本工程 core 7.x 冲突（ERESOLVE 实测）。
       */
      '@babel/plugin-proposal-class-properties': '^7.18.6',
      '@babel/preset-react': '^7.24.7',
      '@tarojs/cli': '4.0.9',
      '@tarojs/webpack5-runner': '4.0.9',
      '@types/react': '^18.3.12',
      '@types/webpack-env': '^1.18.5',
      'babel-preset-taro': '4.0.9',
      postcss: '^8.4.47',
      'react-refresh': '^0.14.2',
      typescript: '^5.6.3',
      // 精确版本：@tarojs/webpack5-runner@4.0.9 的 peer 要求就是 5.91.0，用 ^ 会 ERESOLVE
      webpack: '5.91.0',
    },
  };

  const tsconfig = {
    compilerOptions: {
      target: 'ES2017',
      module: 'ESNext',
      moduleResolution: 'node',
      jsx: 'react-jsx',
      strict: true,
      allowJs: true,
      esModuleInterop: true,
      skipLibCheck: true,
      noEmit: true,
      resolveJsonModule: true,
      baseUrl: '.',
      paths: { '@/*': ['./src/*'] },
      lib: ['ES2017', 'DOM'],
    },
    include: ['./src', './types', './config'],
  };

  const configIndex = `import { defineConfig } from '@tarojs/cli'
import type { UserConfigExport } from '@tarojs/cli'

export default defineConfig<'webpack5'>(async (merge) => {
  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: ${JSON.stringify(appName)},
    date: '2026-01-01',
    designWidth: 375,
    deviceRatio: { 375: 2, 640: 2.34 / 2, 750: 1, 828: 1.81 / 2 },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {},
    copy: { patterns: [], options: {} },
    framework: 'react',
    compiler: 'webpack5',
    cache: { enable: false },
    /**
     * 固定 module/chunk id：webpack 默认的 id 分配带运行时序号，会让 contenthash 每次都变，
     * 于是 dist/ 里的 css/js chunk 只增不减（越攒越多，CssMinimizer 处理量随之膨胀）。
     * deterministic 让同输入同 hash → 同名覆盖 → 不累积、也不需要清理。
     */
    optimization: {
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
    },
    mini: {
      postcss: {
        pxtransform: { enable: true, config: {} },
        cssModules: { enable: false },
      },
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      // hash 路由：SPA 产物用 #/pages/<NN>/index 定位页面，无需服务端 rewrite
      router: { mode: 'hash' },
      /**
       * 关掉 pxtransform：设计稿 CSS 已是最终 px（compile 输出精确像素），
       * 再让 Taro 按 designWidth 换算会把间距放大 2 倍 —— 像素关必挂。
       */
      postcss: {
        pxtransform: { enable: false, config: {} },
        autoprefixer: { enable: true, config: {} },
        cssModules: { enable: false },
      },
      /**
       * 压缩策略：默认开；环境变量 TARO_NO_MINIMIZE=1 时整体关掉压缩。
       *
       * 背景（实测，见 HANDOFF §11.4）：Terser / CssMinimizer 默认按 CPU 核数开 worker 池，
       * worker 由 child_process.fork 派生，会继承父进程的 NODE_OPTIONS 与已打开的 fd。
       * 在带 fs 拦截 / 沙箱的宿主里，个别 worker 会卡死在启动阶段 ——
       * 表现为「产物写了一半就不动了」（19 页里写完 12 个 css chunk 后永久等待，
       * 同一命令在普通终端里 21s 完成）。门禁因此以 TARO_NO_MINIMIZE=1 构建，
       * 只验证「能不能构建 + 产物像素对不对」，产物本身默认仍走压缩。
       */
      webpackChain(chain) {
        const anyChain = chain as unknown as { optimization: any }
        const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
        if (env?.TARO_NO_MINIMIZE === '1') {
          anyChain.optimization.minimize(false)
          return
        }
        const optimization = anyChain.optimization
        const store: Map<string, unknown> = optimization?.minimizers?.store ?? new Map()
        for (const name of store.keys()) {
          optimization.minimizer(name).tap((args: any[]) => {
            if (args[0] && typeof args[0] === 'object') args[0].parallel = false
            return args
          })
        }
      },
    },
  }
  return merge({}, baseConfig)
})
`;

  const globalDts = `/// <reference types="@tarojs/taro" />

declare module '*.png' {
  const value: string
  export default value
}
declare module '*.jpg' {
  const value: string
  export default value
}
declare module '*.jpeg' {
  const value: string
  export default value
}
declare module '*.gif' {
  const value: string
  export default value
}
declare module '*.svg' {
  const value: string
  export default value
}
declare module '*.css'
declare module '*.scss'
`;

  const babelConfig = `module.exports = {
  presets: [
    ['taro', { framework: 'react', ts: true, compiler: 'webpack5' }],
  ],
}
`;

  const projectConfig = {
    miniprogramRoot: 'dist/',
    projectname: appName,
    description: `UI Compiler 生成（${routeCount} 路由）`,
    appid: 'touristappid',
    setting: { urlCheck: false, es6: true, minified: true },
    compileType: 'miniprogram',
  };

  const readme = `# ${appName}

由 UI Compiler 生成的 Taro 4 多页工程（${pageCount} 页）。

## 运行

\`\`\`bash
npm install
npm run dev:h5      # 浏览器预览
npm run build:h5    # 构建 h5
npm run dev:weapp   # 微信小程序（需开发者工具打开 dist/）
\`\`\`

## 说明

- \`src/app.config.ts\` 的 \`pages\` 由页面数动态生成，非单页硬编码。
- tabBar 由页面名推导（命中「首页/发现/消息/购物车/我的/个人中心」≥2 项才生成），属**推导信息**，非设计稿内容。
- h5 侧关闭了 \`pxtransform\`：设计稿 CSS 已是最终 px，不需要二次换算。
- 图片走 \`require()\` 静态引用，落在 \`src/assets/\`。
- 只含视觉层，不含业务逻辑。
`;

  return [
    { path: 'package.json', content: JSON.stringify(pkg, null, 2) + '\n' },
    { path: 'tsconfig.json', content: JSON.stringify(tsconfig, null, 2) + '\n' },
    { path: 'config/index.ts', content: configIndex },
    { path: 'types/global.d.ts', content: globalDts },
    { path: 'babel.config.js', content: babelConfig },
    { path: 'project.config.json', content: JSON.stringify(projectConfig, null, 2) + '\n' },
    { path: 'README.md', content: readme },
    { path: '.gitignore', content: 'node_modules\ndist\n.temp\n.rn_temp\n' },
  ];
}
