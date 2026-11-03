# 铁志 · 力量训练日志-react

由 UI Compiler 生成的多页 React 工程（6 页）。

## 运行

```bash
npm install
npm run dev       # 开发
npm run build     # 构建到 dist/
npm run preview   # 预览构建产物
```

## 页面

- `pages/p-1` — 今日（组件 `PageP1`）
- `pages/p-2` — 训练（组件 `PageP2`）
- `pages/p-3` — 动作库（组件 `PageP3`）
- `pages/p-4` — 记录（组件 `PageP4`）
- `pages/p-5` — 进度（组件 `PageP5`）
- `pages/p-6` — 我的（组件 `PageP6`）

## 说明

- 样式是普通 CSS，类名由编译器按节点 id 生成，全局唯一。
- 图片已落到 `assets/`，`src` 已改写为相对路径。
- 未注入字体文件，回退系统字体栈。
- 本工程只含视觉层，不含业务逻辑（plan §1.2 非目标）。
