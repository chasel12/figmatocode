# 回声 · 音乐播放-taro

由 UI Compiler 生成的 Taro 4 多页工程（6 页）。

## 运行

```bash
npm install
npm run dev:h5      # 浏览器预览
npm run build:h5    # 构建 h5
npm run dev:weapp   # 微信小程序（需开发者工具打开 dist/）
```

## 说明

- `src/app.config.ts` 的 `pages` 由页面数动态生成，非单页硬编码。
- tabBar 由页面名推导（命中「首页/发现/消息/购物车/我的/个人中心」≥2 项才生成），属**推导信息**，非设计稿内容。
- h5 侧关闭了 `pxtransform`：设计稿 CSS 已是最终 px，不需要二次换算。
- 图片走 `require()` 静态引用，落在 `src/assets/`。
- 只含视觉层，不含业务逻辑。
