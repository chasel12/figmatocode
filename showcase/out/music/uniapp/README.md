# 回声 · 音乐播放-uniapp

由 UI Compiler 生成的多页 uni-app 工程（6 页）。

## 运行

```bash
npm install
npm run build:h5          # 产物 dist/build/h5
npm run build:mp-weixin   # 产物 dist/build/mp-weixin（用微信开发者工具打开）
```

## 页面

- `pages/p-1` — 发现
- `pages/p-2` — 播放
- `pages/p-3` — 歌单详情
- `pages/p-4` — 搜索
- `pages/p-5` — 我的音乐
- `pages/p-6` — 歌词

## 已知降级（与 H5 的差异，不是 bug）

- 标签映射：`div/main/section → view`、`span → text`、`img → image`、`button → view`。
- 矢量：wxml 无 `<svg>`，VECTOR / OVAL / POLYGON / STAR 以
  `background-image: url(data:image/svg+xml;base64,...)` 承载。
- 单位保持 px（`transformPx: false`），不转 rpx。
- `backdrop-filter`（毛玻璃）在 mp-weixin 不支持 → 退化为半透明底色。
- `display:grid` 在部分基础库支持不全 → 旧机型上等分网格可能塌成单列。
- 未注入字体文件，回退系统字体栈。
- 本工程只含视觉层，不含业务逻辑。
