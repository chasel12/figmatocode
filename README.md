# UI Compiler — 结构化 UI 编译平台

> 把结构化的设计数据（UI AST）编译成**高还原、可维护、响应式**的前端代码，并用**像素级对比（Pixel Diff）**量化验收。

设计稿到代码的主流做法是"截图 + 视觉猜测"，生成结果在间距、对齐和响应式上不可控。UI Compiler 反其道而行：先将设计数据解析为统一的 **UI AST**，交给确定性的 **Layout Compiler** 计算几何，再由 **Code Generator** 输出目标框架代码——链路上每一步都可测试、可回归。

```
UI AST ──► Layout Compiler ──► Code Generator ──► Taro / HTML
   │            │                                      │
   │            ▼                                      ▼
   │      几何基准 (reference)  ◄──── Pixel Diff ────►  渲染截图 (render)
   └── Responsive Compiler（固定宽度 = 父宽 → 100%）
```

## 核心能力

- **Layout Compiler**：FIXED / FILL / HUG 三种尺寸语义 + HORIZONTAL / VERTICAL / ABSOLUTE 三种布局模式，解析出每个节点的绝对几何，作为像素对比的基准。
- **Responsive Compiler**：确定性规则保证输出 CSS 是响应式的——固定宽度恰好等于父级内容宽时自动转为 `100%`；根节点 `width: 100%` + `min-height: max(Hpx, 100vh)`，**绝不写死视口宽度**。
- **Code Generator**：同一份 AST 同时生成 **Taro 工程**（TSX + SCSS + 配置文件）与**独立 HTML 预览**，另生成 reference.html（绝对定位几何 DOM）供 diff。
- **Pixel Diff**：reference（几何渲染）与 render（编译产物渲染）在同一浏览器、同视口下光栅化，pixelmatch 逐像素对比，**相似度阈值 98%**。
- **可视化编辑器**：基于 React + Konva 的画布编辑器，支持拖拽、缩放、resize、图层树、属性面板、撤销/重做、代码生成与一键 ZIP 导出。

## 快速开始

```bash
npm install
npm run dev        # 启动可视化编辑器
npm test           # 编译器单元测试（vitest）
npm run build      # 类型检查 + 构建编辑器到 dist/app
npm run e2e        # 全链路：生成 16 个测试页 → 截图 → Pixel Diff
npm run canvasdiff # FR-51② 画布↔出码对比（需先 VITE_E2E_HOOK=1 npm run build）
```

`npm run e2e` 会在 `dist/pages/<页面>/` 下输出：

| 文件 | 说明 |
| --- | --- |
| `index.html` | 编译器输出的 flex CSS 渲染（render 侧） |
| `reference.html` | Layout Resolver 几何的绝对定位 DOM（reference 侧） |
| `reference.png` / `render.png` / `diff.png` | 两份截图与差异图 |
| `page.json` / `index.scss` | 页面 AST 快照与样式 |
| `diff-report.json` | 逐页相似度报告（`dist/taro/<页面>/` 为 Taro 工程） |

当前结果：**16/16 测试页 ≥ 98% 相似度**（最低 98.55%，多数 > 99.5%）；**FR-51② 画布↔出码首跑基线（2026-10-14）：avg 98.12%，15/16 ≥ 95%**（报告 `dist/canvas-diff/report.json`，`npm run canvasdiff` 可复跑）。

## 测试页面（覆盖 16 类布局场景）

登录、注册、商品列表（双列网格）、商品详情（固定底栏）、订单列表、订单详情、个人中心（渐变头 + 统计）、设置（开关行）、Dashboard（柱状图）、表单（多行输入）、Card 列表（文字标签 chip）、Tab 页面（分段控件 + 底部栏）、绝对定位（海报）、长文本（换行）、图片密集（网格）、多层嵌套（FIXED/FILL/HUG 混合）。

## 布局语义映射

| 设计语义 | CSS 输出 |
| --- | --- |
| `FIXED` | 固定像素；等于父内容宽时转为 `100%` |
| `FILL`（主轴） | `flex: 1 1 auto` + `min-width/height: 0` |
| `FILL`（交叉轴） | `width/height: 100%` |
| `HUG` | `fit-content`（绝对定位子节点为 `max-content`） |
| `ABSOLUTE` 容器 | `position: relative`，子节点 `position: absolute` + `left/top`（相对父级 padding box） |

## 目录结构

```
src/
├── schema/      # UI AST：类型（NodeKind/SizeMode/LayoutMode）与工厂
├── compiler/    # measure（文本度量）→ layout（几何引擎）→ compile（CSS 生成）
├── generator/   # Taro TSX/SCSS、HTML 预览、reference DOM、工程文件集
├── editor/      # 可视化编辑器（画布/图层/属性/撤销/代码/Diff 面板）
├── demo/        # DSL + 16 个测试页面定义
scripts/         # build-pages / screenshot / diff（Node + Playwright）
tests/           # 编译器单元测试
```

## 技术栈

TypeScript · React 18 · react-konva · Vite 5 · Vitest 2 · Playwright · pixelmatch / pngjs

## 限制与路线图

- Pixel Diff 基准视口为 375×812（`SHOT_WIDTH`/`SHOT_HEIGHT` 可覆盖）；多断点 diff 待接入。
- 字体度量基于 Canvas 近似（Arial + 权重匹配规则），与浏览器在部分中英混排文本上存在 <5% 宽度误差；画布↔出码在混排长文本上有换行点位差异（14 页 92.07%，归因豁免待 M6 终验）。
- 后续规划见需求文档 `deepseek_markdown_20261001_fd1659.md`（Figma 插件接入、组件库映射、diff 驱动的自动修复回写）。
