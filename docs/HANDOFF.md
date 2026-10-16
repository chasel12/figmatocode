# 交接文档（HANDOFF）—— UI Compiler 项目快速上手

> 写给：接手本项目开发的 agent。日期：2026-10-16 · 基线 HEAD：`9bdc5f5`（master，工作区干净）
> 本文档是**路线与纪律**；细节以 `docs/PRD.md`（需求唯一凭据）与 `LOG.md`（逐日事实）为准。

---

## 0. 三十秒定位

**UI Compiler**：Figma UI3 全对照可视化编辑器（React 18 + Konva 9 + Vite）+ 确定性「设计→代码」编译器（UI AST → Layout/Responsive Compiler → HTML+外链 CSS / Taro）。核心承诺：

- **AI = 0%**：全链路确定性编译，任何步骤双跑产物字节一致。
- **像素级还原**：16 测试页 e2e ≥98%；样片出码 vs reference ≥99%；画布 vs 出码 ≥95%。
- **完全对照 Figma**：唯一验收凭据 = `docs/figma-parity-checklist.md`（73 行走查矩阵，GA 线 ≥95% 且 ★核心 100%）。

当前处于 **M6（样片+矩阵+生产化 → GA）**。M1~M5 功能主体已交付并矩阵实测（★GA 阻断 2026-10-16 已清零）。

## 1. 必读文件（按序）

| 文件 | 用途 |
|---|---|
| `docs/PRD.md`（v1.1，FR-1~62） | 需求/验收标准/里程碑/Stop and Escalate 条款。P0=GA 必达；P1=承诺必交付；P2=Go/No-Go 后 |
| `LOG.md`（935→1100+ 行，逐条「目标/修改/结果/验证/遗留」） | **从最后 5 条读起**：清账批→FR-44→autosave v2→★四项修复。每条含文件锚点与踩坑记录 |
| `docs/figma-parity-checklist.md` | 矩阵现状：哪些行 PASS/FAIL、差异与结论 #1-#13（开放 FAIL 都在这）、修订历史 |
| `docs/schema-decisions.md` | D0 Schema 定稿：types.ts 冻结文件的扩字段流程（**主线单点合入**）+ 轨道所有权边界 |
| `docs/wave1-prototype-plan.md` / `wave1-components-notes.md` | 原型线/组件线实施方案（P/C 轨已按此落地，剩余价值=口径引用） |
| `README.md` + `package.json` scripts | 命令入口 |

## 2. 项目铁律（违反即返工）

1. **每次修改完成后向 `LOG.md` 追加一条**（格式见文件头），不修改历史条目。大批次若跨会话未记录，须补「补记」条。
2. **门禁全绿才许提交**：`npx tsc --noEmit` + `npx vitest run` + `npm run build` + `npm run e2e`（16 页 ≥98%）**每次 src 改动后复跑**；`viewport/walkthrough/smoke-m1/smoke-m2/present-smoke` 对编辑器 UI 改动必跑。
3. **`src/schema/types.ts` 已定稿冻结**：扩字段/枚举必须「主线单点合入」，然后消费轨再动（历史先例：D0 定稿、Wave2 共享 action）。多轨并行的热点文件（store.ts reducer 入口、Canvas.tsx、Editor.tsx）同此规则。
4. **浏览器验证用一次性探针脚本**（`scripts/` 下临时 .mjs），验证后删除、截图证据归档 `dist/<专项>/`（照 pen-check/p-track-check 先例）。矩阵级验证脚本（m3/m4/m5-matrix.mjs）**保留落库**，结构：rows[{id,name,ok,note,shot}] + report.json + 截图。
5. **禁止用 PowerShell 读写含中文源文件**（LOG 有编码毁库事故记录）；编辑一律用文件工具。
6. 含中文的 U+FFFD 扫描：大改后 `grep -c $'�'` 改动文件应为 0（历史门禁项）。
7. 提交直接进 **master**（项目惯例，历史 10 条全在 master；无 remote）。提交信息照先例：**批次主题 + 关键修复 + 门禁数字**。
8. **报备纪律**：与 PRD 字面不同的实现口径（近似/降级/置灰）必须写进 LOG「报备」段 + checklist 差异与结论表，不得静默。

## 3. 环境与操作陷阱（本机 Windows + Git Bash）

- **esbuild TEMP 拒绝访问**：`npm run build`/vite 构建在系统 TEMP 下报 `[vite:esbuild-transpile] remove ...: Access is denied` = **已知环境问题非代码回归**。解法：`mkdir -p .tmp-esbuild && export TMP="$PWD/.tmp-esbuild" TEMP="$(pwd -W)/.tmp-esbuild"`，**验完必须删临时目录**（勿留进 git status）。
- **孤儿 preview 进程 = 门禁假红灯**：各走查脚本 spawn `npm run preview -- --port X --strictPort`，shell 包装导致脚本 kill 不掉 node 子进程。历史占用：**4173**(walkthrough/m1/m2) **4189**(present-smoke) **4193**(m4-matrix) **4194**(m5-matrix) 4191/4196/4197/4198(探针)。红灯先 `netstat -ano | grep LISTENING` 查端口，`taskkill //PID <pid> //F` 清孤儿。
- **链序教训（2026-10-16）**：present-smoke/matrix 依赖 dist/app——**改 src 后必须先 `npm run precanvasdiff`（hook 重建）再跑 smoke/matrix**，否则拿旧构建出假结果（曾 18/18→14/16 假摔）。
- **e2e 通道**：`window.__UIC_E2E__`（snapshot/captureRegion，页坐标）+ `window.__UIC_VIEW__`（{scale,x,y} 舞台变换）仅 `VITE_E2E_HOOK=1` 构建挂载（precanvasdiff 脚本）。page→屏幕换算 = `stageBox + view.x/y + page*scale`。
- **Playwright 选择器稳定性**：图层/树行**按 `data-node-id` 定位**，别按名称子串（`hasText('Frame')` 会命中 'Frame 2'；默认名后缀跟随 idSeq 跨会话不稳定）。
- 子代理并行：代理只给不相交文件任务书（scripts/新文件+证据目录），端口分池、禁跑构建/门禁；回报按「逐行 PASS/FAIL + 可贴结果列 markdown + FAIL 归因」模板。分类器偶发拒绝时**不得教代理绕权限**。

## 4. 代码地图（改哪找哪）

```
src/schema/       types.ts（冻结）/ factory.ts（createNode/createPage/findById/walk/nextId）
src/compiler/     compile.ts（AST→CSS+响应式，出码主战场）/ layout.ts measure.ts css-model.ts
                  boolean.ts mask.ts tokens.ts（矢量布尔/蒙版显式 clipContent/tokens.css 单源）
src/generator/    html.ts（预览 DOM）/ reference.ts（基准 DOM，**两侧必须同改**否则 e2e 崩）
                  taro.ts project.ts / vector.ts（内联 SVG）/ prototype.ts+runtime.ts（FR-50 出码，ES5 字符串模板）
src/editor/       store.ts（reducer 单文件全部 action；~60 case 读写 state.page；出口 syncPages 回写 pages[]）
                  Canvas.tsx（2200 行 Konva：NodeView 递归/工具状态机 modeRef+refs/连接线与旋钮/Layer 栈: guides→marquee+pen→选框→handles→conn）
                  Editor.tsx（键盘 effect/geometry=resolveLayout 单源/e2e hook/autosave v2/Present+内联预览挂载）
                  Toolbar.tsx（菜单/File 保存打开/Object 布尔蒙版/Present 钮） PropertyPanel.tsx（右栏 11 分区）
                  PrototypePanel.tsx（三段选择器九宫 broken link） AssetsPanel.tsx Pages.tsx variants.ts project.ts(序列化单源)
                  present/（PresentOverlay=Present+内联预览同引擎双模式 / presentRuntime 纯函数 / presentBus）
                  tools/penCore.ts + tools/connections.ts（矢量/连接线纯函数单源，可测）
scripts/          build-pages.ts(m3-matrix 型样本)/ screenshot+diff(e2e)/ canvas-diff(FR-51②)/ viewport-check
                  walkthrough m1-smoke m2-smoke present-smoke / m3-matrix m4-matrix m5-matrix(矩阵模板)
                  showcase.mjs(16 卡) perf-1000.mjs zip-assert ci-local deploy-check
tests/            31 个 *.test.ts = 434 例（vitest，node 环境，不依赖浏览器）
```

**热点文件规则**：`store.ts` 新 action = 主线加（含 EditorAction union + case + 必要时 PAGE_ACTIONS 白名单）；`Canvas.tsx`/`Editor.tsx` 改动串行不并轨；reference.ts 与 html.ts 渲染分支必须成对改（SLICE/VECTOR 两次事故先例）。

## 5. 当前进度快照（2026-10-16 收工时）

- **HEAD `9bdc5f5`**；今日 4 提交：清账批(3c9141e)→FR-44 补齐(9c325bf)→autosave v2(077b52c)→M5 入册+★四项修复(9bdc5f5)。
- **门禁**：tsc 0 · vitest 434/434 · build OK · e2e 16/16≥98% · viewport 64/64 · walkthrough 9/9 · m1 22 · m2 27 · present-smoke 18/18 · canvasdiff 基线 avg 98.12%（M3 口径）。
- **矩阵**：M3 段 15P；M4 段 11 行 6P/5F；M5 段 13 行首跑 6P/7F→**★P0-41/42/43/48 修复改判 PASS**（现 10P/3F，F=P1-04/05/14 矢量挂账）；m12 段 19 行 12P/7 待甄别。
- **差异与结论开放项**：#4 帧预算（FR-60 判据 95% 帧<16.7ms 实测 59.7%）、#5 imageAdjustments 双端零消费、#6 组件改名回流+样式编辑入口、#7 约束档位口径（待拍板）、#11 残留（overlay 拖拽/遮罩透明度 P1）、#13 矢量三件（待拍板+专项）、#1 14 页 92.07% 豁免（M6 终验复核）。

## 6. 剩余任务队列（按此顺序推，均为 GA 线内）

| # | 任务 | 入手点 | 预估 |
|---|---|---|---|
| 1 | **P1-03 图片 7 调整双端接线**（差异 #5）：出码 `filter:` 映射 + 画布 Konva 像素预览 | 数据已通（store UPDATE_IMAGE_ADJUSTMENTS、DSL 字段 7 项）；compile.ts 文本/节点出码段加 filter（Exposure→brightness、Contrast、Saturation、Temperature→sepia/hue-rotate 近似、Tint、Highlights/Shadows 报备近似）；Canvas 侧可用 Konva image filter 或报备仅出码生效 | 2-3h |
| 2 | **P1-08/09 面板小修**（差异 #6）：①组件/实例改名回流 `components[].name`（改名 action 内按 componentId 同步）②AssetsPanel 样式行加色值/字号编辑控件（dispatch UPDATE_TOKEN 已存在且引用者同步已实现——只差 UI 入口）| store CREATE_COMPONENT/改名路径 + AssetsPanel.tsx 样式 tab | 1-2h |
| 3 | **FR-57 样片五区扩展**（★最后一块，P0-55）：showcase.mjs 现仅参数矩阵区（16 卡 avg 99.49%）。需：①16 类图层陈列区（含组件+实例+变体、布尔、钢笔路径、Slice）③≥3 Page 设计 ④≥5 类跳转+≥3 Flow+演示走通（用已交付的原型引擎）⑤像素报告入 dist/showcase/。**04/13 两卡 <99% 逐卡收敛含在内**（先看 diff.png 归因） | scripts/showcase.mjs + dist/showcase/report.json | 4-8h |
| 4 | **m12 段 7 行甄别**：P0-07/10/15 快照通道只给根级子节点（`__UIC_E2E__.snapshot` 设计限制）→ 脚本改走 `__UIC_VIEW__`+DOM 或扩 snapshot；P0-09/11 吸附参考线/插入指示像素扫描需复跑甄别（m1/m2 smoke 同断言是绿的——大概率脚本失配）；FATAL `btn.getAttribute`=脚本 bug | scripts/m12-matrix.mjs | 1.5-3h |
| 5 | **FR-60 帧预算专项**（差异 #4，最不确定）：1000 节点拖拽 95% 帧<16.7ms 实测 59.7%。方向：Canvas onDragMove→dragMove 快照/约束重算节流（transientEdit 已有基线机制）、ContentLayer memo 命中率剖析、几何 resolve 增量化。改完必须复跑 perf-1000 + 全像素门禁（不得动视觉） | Canvas.tsx + compiler/measure/layout | 4-8h，开口 |
| 6 | **P1 矢量三件**（差异 #13）：P1-04 锚点二次编辑（Canvas 对已提交 VECTOR 的锚点命中+拖拽，penCore 数据已有）；P1-05 普通形状布尔（形状→路径自动矢量化入口）；P1-14 形状 SVG 化口径（先拍板：改行文案 or 实现——动出码管线有像素回归风险） | Canvas.tsx / boolean.ts / compile.ts | 各 3-5h |
| 7 | **FR-27 Effect/Grid 样式**：前置=**types.ts 扩 `StyleToken.kind`（主线单点合入）**→ tokens.ts 两类型 + 面板创建 + 导出 | 见 LOG M4 第三步报备 | 2-4h |
| 8 | **每页历史完整形态**：store 切页换栈 → `EditorState.history: Record<pageId,栈>`（字段已在）| SELECT_PAGE case | 1-2h |
| 9 | 收口：ci-local 重跑刷新、矩阵全量汇总行（≥95% 精算）、Go/No-Go 纪要（FR-62）、README 补 canvasdiff/showcase/探针命令 | 计划 §步骤 8 | 2-3h |

## 7. 待用户/PM 拍板（做之前先问）

1. **#7 约束档位口径**：checklist「5 向」文案 vs FR-35 枚举 4 档——按枚举则 P1-12 直接改判 PASS（推荐）。
2. **#13 之 P1-14**：圆/多边形出码要不要切 SVG（影响像素管线）还是行文案降级为「CSS 通道 + 有 cap/join 需求时手工矢量化」。
3. **Present vs 导出页 Frame 导航语义**：已按「导出页=滚动定位、Present=换帧」双口径落地并报备；严格统一=Frame 视口容器化（大工程，建议 GA 后）。
4. P2 协作（FR-61）Go/No-Go 与 Variables 等——M6 评审纪要处理。

## 8. 快速自检（接手后 10 分钟）

```bash
git log --oneline -4          # 头应为 9bdc5f5 或更新
npx tsc --noEmit && npx vitest run   # 0 错 + 434/434
npm run e2e                   # 16/16 ≥98%（含构建，约 3-4 分钟；esbuild 报错→§3 TEMP 旁路）
# 红灯先查端口孤儿（§3），别急着改代码
```

然后读 `LOG.md` 最后 4 条 + checklist「差异与结论」表——即与本交接文档对齐的完整现场。
