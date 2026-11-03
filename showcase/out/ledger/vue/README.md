# 青柠账本 · 记账-vue

由 UI Compiler 生成的多页 Vue 3 工程（6 页）。

## 运行

```bash
npm install
npm run dev
npm run build
npm run preview
```

## 页面

- `pages/p-1` — 概览（组件 `PageP1`）
- `pages/p-2` — 明细（组件 `PageP2`）
- `pages/p-3` — 记一笔（组件 `PageP3`）
- `pages/p-4` — 预算（组件 `PageP4`）
- `pages/p-5` — 统计（组件 `PageP5`）
- `pages/p-6` — 我的（组件 `PageP6`）

## 说明

- 每页一个 SFC，样式内联在 `<style>`（**非 scoped**：类名已全局唯一，避免 `[data-v-]` 干扰像素比对）。
- 图片已落到 `assets/`，`src` 已改写为相对路径。
- 未注入字体文件，回退系统字体栈。
- 本工程只含视觉层，不含业务逻辑。
