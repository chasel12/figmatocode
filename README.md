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
npm run dev         # 启动可视化编辑器
npm test            # 编译器单元测试（vitest，519 例）
npm run build       # 类型检查 + 构建编辑器到 dist/app
npm run e2e         # 全链路：生成 19 个测试页 → 截图 → Pixel Diff
npm run canvasdiff  # FR-51② 画布↔出码对比（需先 VITE_E2E_HOOK=1 npm run build）
npm run showcase    # FR-57 样片：对照卡 + 五区审计 → dist/showcase/
npm run walkthrough # 编辑器走查（9 步）
npm run smoke-m1    # M1 画布冒烟（22 项）
npm run smoke-m2    # M2 界面冒烟（27 项）
npm run present-smoke # FR-44 Present 演示模式走查（18 项）
npm run viewport    # 多断点无横向溢出 + 无兄弟重叠（76 项）
npm run perf-1000   # FR-60 千节点性能采样
npm run zip-assert  # FR-52 ZIP 产物断言
npm run ci-local    # 本地四门禁等价凭证（tsc/test/build/e2e）
```

> **链序提示**：改动 `src/` 后若直接跑 `present-smoke`/`canvasdiff`/矩阵脚本，须先
> `npm run precanvasdiff` 重建 e2e hook（`dist/app`），否则会拿旧构建得到假结果。
> 另：`build`/`vitest` 在系统 TEMP 下可能报 `[vite:esbuild-transpile] ... Access is denied`，
> 属环境限制非代码缺陷——将 `TEMP`/`TMP` 指向工作区内目录即可（验后删除该目录）。

`npm run e2e` 会在 `dist/pages/<页面>/` 下输出：

| 文件 | 说明 |
| --- | --- |
| `index.html` | 编译器输出的 flex CSS 渲染（render 侧） |
| `reference.html` | Layout Resolver 几何的绝对定位 DOM（reference 侧） |
| `reference.png` / `render.png` / `diff.png` | 两份截图与差异图 |
| `page.json` / `index.scss` | 页面 AST 快照与样式 |
| `geometry.json` | 节点几何快照（diff 区域归属） |
| `flows.json` | FR-57 原型 Flow 旁挂（仅含 Flow 的页产出） |
| `diff-report.json` | 逐页相似度报告（`dist/taro/<页面>/` 为 Taro 工程） |

当前结果：**19/19 测试页 ≥ 98% 相似度**（含 3 个 FR-57 样片页，其中原型跳转页 100.00%）；
**FR-51② 画布↔出码基线（M3 首跑，2026-10-14）：avg 98.12%，15/16 ≥ 95%**（报告 `dist/canvas-diff/report.json`）；
**FR-57 样片五区审计 5/5 通过**，avg 99.51%（报告 `dist/showcase/report.json`）。

## 测试页面（16 类布局场景 + 3 个 FR-57 样片页）

登录、注册、商品列表（双列网格）、商品详情（固定底栏）、订单列表、订单详情、个人中心（渐变头 + 统计）、设置（开关行）、Dashboard（柱状图）、表单（多行输入）、Card 列表（文字标签 chip）、Tab 页面（分段控件 + 底部栏）、绝对定位（海报）、长文本（换行）、图片密集（网格）、多层嵌套（FIXED/FILL/HUG 混合）。

样片三页（`src/demo/showcase.ts`，服务 FR-57 五区）：
`17-样片-图层种类`（12 类图层 + 矢量/切片/分组）、`18-样片-参数矩阵`（四角圆角/描边三对齐/4 型渐变/8 类效果/约束 5 档/AutoLayout/文本排版/blend）、`19-样片-原型跳转`（9 条交互 6 类动作 + 3 Flow）。

## 布局语义映射

| 设计语义 | CSS 输出 |
| --- | --- |
| `FIXED` | 固定像素；等于父内容宽时转为 `100%` |
| `FILL`（主轴） | `flex: 1 1 0` + `min-width/height: 0` |
| `FILL`（交叉轴） | `width/height: 100%` |
| `HUG` | `fit-content` + `flex: 0 0 auto`（绝对定位子节点为 `max-content`） |
| `ABSOLUTE` 容器 | `position: relative`，子节点 `position: absolute` + `left/top`（相对父级 padding box） |
| `layout.clipContent` | `overflow: hidden`；**同时是 FR-23 蒙版组的显式开关** |

## 目录结构

```
src/
├── schema/      # UI AST：类型（NodeKind/SizeMode/LayoutMode/VectorData/StyleToken…）与工厂
├── compiler/    # measure（文本度量）→ layout（几何引擎）→ compile（CSS 生成）
│                # boolean/mask/tokens/imageAdjust：布尔、蒙版、设计 token、图片调整（纯函数单源）
├── generator/   # Taro TSX/SCSS、HTML 预览、reference DOM、vector(SVG)、prototype+runtime(FR-50)
├── editor/      # 可视化编辑器（画布/图层/属性/撤销/代码/Diff/原型/演示/资产）
│                # present/（Present 演示 + 内联预览）、tools/penCore（矢量路径纯函数）
├── demo/        # DSL + 16 个测试页面 + showcase（FR-57 样片三页）
scripts/         # build-pages / screenshot / diff / canvasdiff / showcase / 走查与冒烟
tests/           # 编译器与 store 单元测试（519 例）
docs/            # PRD / 对照矩阵 / schema 定稿 / 轨道方案 / HANDOFF 交接手册
```

## 技术栈

TypeScript · React 18 · react-konva · Vite 5 · Vitest 2 · Playwright · pixelmatch / pngjs

## 限制与路线图

- Pixel Diff 基准视口为 375×812（`SHOT_WIDTH`/`SHOT_HEIGHT` 可覆盖）；多断点 diff 待接入。
- 字体度量基于 Canvas 近似（Arial + 权重匹配规则），与浏览器在部分中英混排文本上存在 <5% 宽度误差；画布↔出码在混排长文本上有换行点位差异（14 页 92.07%，已登记差异 #1 豁免）。
- 矢量布尔为 **SVG 填充规则近似**（Union=nonzero，其余=evenodd），Intersect 非严格几何交集；严格拓扑需引入裁剪库。
- 图片 7 项调整中，色温/色调/高光/阴影为 **CSS filter 近似**且画布不预览（Konva 无对应滤镜）。
- Layout grid 出码为 **CSS 可表达的等价网格**（Figma 的 Layout grid 本为编辑器辅助线）；入口挂在 FR-27 GRID 样式（与 Figma 的右栏独立分区不同，见 checklist 附 B 报备）。
- **FR-60 判据（已拍板，方案 A，2026-10-18）**：PRD 字面「95% 帧 <16.7ms」经实证为 rAF 量化噪声指标（空白页亦仅 75~86%），主判据改为「**拖拽采样 ≥95% 帧按时（<1.5×vsync≈25ms）**」——实测按时率 **95.27%**（掉帧 31/655）达标；原字面口径保留为参考信号 `fr60_legacyLiteral`。决议与实证见 `docs/go-no-go.md` 议题 1 / checklist 差异 #4。

**验收状态**：行走查矩阵 **100%（70 PASS / 0 FAIL / 3 P2 对照声明）**，**四模块全 100%**（附 A 19/19 · 附 B 11/11 · 附 C 7/7 · 样片五区 5/5），canvasdiff 19 页 18/19（唯一 MISS=已豁免换行差 #1）→ ✅ **GO**（2026-10-18，`docs/go-no-go.md`）。

进度与剩余队列见 `docs/HANDOFF.md`；需求唯一凭据 `docs/PRD.md`；逐日事实 `LOG.md`；评审纪要 `docs/go-no-go.md`。

