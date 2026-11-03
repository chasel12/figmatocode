import { defineConfig } from '@tarojs/cli'
import type { UserConfigExport } from '@tarojs/cli'

export default defineConfig<'webpack5'>(async (merge) => {
  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: "拾豆咖啡 · 点单-taro",
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
