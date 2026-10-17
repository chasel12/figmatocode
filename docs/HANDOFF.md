# 交接文档（HANDOFF）—— UI Compiler 项目快速上手

> 写给：接手本项目开发的 agent。日期：**2026-10-17 第三轮收口** · 基线 HEAD：本文件随 M6 第十四步提交（ff0d680 后两批：接管 shapePath 矢量化 + m5 段复判结案）
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
6. 含中文文件的编码校验：大改后扫 U+FFFD（替换字符），改动文件应为 0（历史门禁项）。
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

## 5. 当前进度快照（2026-10-16 第二轮收工时）

- **HEAD `6cad745`**；本轮 6 提交：#1 P1-03 图片调整双端(9f0f7e5) → #2 P1-08/09 面板小修(c0beec3) → #7 FR-27 四类样式(bd13034) → #8 每页历史(eb97413) → #3 **FR-57 样片五区**(5f58d4d) → #6① P1-04 锚点二次编辑(6cad745)。
- **门禁**：tsc 0 · vitest **519/519** · build OK · e2e **19/19 ≥98%** · viewport **76/76** · walkthrough 9/9 · m1 22 · m2 27 · present-smoke 18/18 · showcase **五区 5/5**（avg 99.51%，A/B/C=17/2/0）。
- **★ GA 阻断已全清**（FR-57 五区补齐全过；样片 16→19 页，新增 `src/demo/showcase.ts` 三页）。
- **已闭环差异**：#5 imageAdjustments 双端消费、#6 组件改名回流+样式编辑入口、#9-#12（上轮）。**仍开放**：#1（14 页 92.07% 豁免待 M6 终验）、#4 帧预算、#7 约束档位口径（待拍板）、#13 矢量三件之②③（待拍板）。

## 6. 剩余任务队列（2026-10-17 刷新，仅剩 3 项）

| # | 任务 | 入手点 | 预估 |
|---|---|---|---|
| 1 | **FR-60 帧预算专项**（差异 #4，唯一 ★外 FAIL=矩阵 69/70=98.6% 的最后缺口）：1000 节点拖拽 95% 帧<16.7ms 实测 55.0%。方向：自管理拖拽下 stageMouseMove 每帧只 position 无 setState（已具备）→ 瓶颈在 computeSnap 兄弟遍历与 transient dispatch 链；候选：拖拽期快照 refs、rAF 合帧、guides 仅变化时 setState。改完必须复跑 perf-1000 + 全量门禁 | `Canvas.tsx`（nodeDragRef/anchorDrag 分支）+ `snapping.ts` | 4-8h，开口 |
| 2 | **附 A/B/C 采样归档**（GA 四模块 100% 线的站点级凭据）：附A 19 页×9 要素（canvasdiff 已按 19 页基建）、附B 右栏 11 分区逐字段、附C 7 菜单——写 m6-appendix.mjs 型脚本采样+截图入 dist/ | `docs/figma-parity-checklist.md` 附表 + matrix 模板 | 6-10h，机械 |
| 3 | **收口包**：canvasdiff 19 页基线复跑（现为 16 页旧口径）、ci-local 刷新、矩阵汇总终版、Go/No-Go 纪要（FR-62）、m4-matrix P1-12 判据同步「4 档」、README/HANDOFF 终刷 | 各脚本 | 2-3h |

> 已交付（勿重做）：图片 7 项调整双端、组件改名回流、样式行内编辑、FR-27 四类样式、每页历史、FR-57 样片五区、P1-04 锚点二次编辑（含拖拽真生效）、**P1-05 形状布尔（shapePath 自动矢量化）**、**P1-14 形状 SVG 出码**、m12 段 24/24、**画布节点拖拽（自管理，修 Konva DD 不达）**、**布尔多子路径编辑（penCore subpaths）**。

> 已交付（勿重做）：图片 7 项调整双端出码+画布、组件改名回流、样式行内编辑、FR-27 四类样式（含 types.ts 扩 kind）、每页独立历史完整形态、FR-57 样片五区、P1-04 锚点二次编辑。

## 7. 待用户/PM 拍板（做之前先问）

1. **#7 约束档位口径**：checklist「5 向」文案 vs FR-35 枚举 4 档——按枚举则 P1-12 直接改判 PASS（推荐）。
2. **#13 之 P1-14**：圆/多边形出码要不要切 SVG（影响像素管线）还是行文案降级为「CSS 通道 + 有 cap/join 需求时手工矢量化」。
3. **#13 之 P1-05**：普通形状做布尔需「创建时自动矢量化」——是否接受该方案（会改变形状节点类型语义）。
4. **Present vs 导出页 Frame 导航语义**：已按「导出页=滚动定位、Present=换帧」双口径落地并报备；严格统一=Frame 视口容器化（大工程，建议 GA 后）。
5. P2 协作（FR-61）Go/No-Go 与 Variables 等——M6 评审纪要处理。

## 8. 快速自检（接手后 10 分钟）

```bash
git log --oneline -4                   # 头应为 6cad745 或更新
npx tsc --noEmit && npx vitest run     # 0 错 + 519/519
npm run e2e                            # 19/19 ≥98%（含构建，约 3-4 分钟；esbuild 报错→§3 TEMP 旁路）
npm run showcase                       # FR-57 五区 5/5
```

然后读 `LOG.md` 最后 6 条 + checklist「差异与结论」表——即与本交接文档对齐的完整现场。

## 9. 本轮新增的环境/操作陷阱

- **改 `src/` 后跑 `present-smoke`/`canvasdiff`/矩阵脚本前，必须先 `npm run precanvasdiff`** 重建 `dist/app`（e2e hook）。本轮实测：不重建则 `present-smoke` 14/16 假摔（`view=null`），重建后 18/18。**这是必需前置，非可选。**
- **`TEMP` 指向工作区目录时，验完不要立刻删**——Playwright 需要它创建 `playwright-artifacts-*`；删早了报 `ENOENT: mkdtemp`。
- **样片页加节点后记得跑 `npm run viewport`**：flow 兄弟重叠（如负 margin 做叠放）会触发 `no-flow-sibling-overlap` 不变量；叠放请用 `mode:'ABSOLUTE'`，不要为样片放宽门禁。
- **`createPage`/`createNewPage` 的 id 语义**：`createPage` 默认 id 恒为 `'page'`（demo 页全部同名 id）；按 `page.id` 做索引/分组会**串页**（本轮踩坑：`SHOWCASE_FLOWS` 按 id 索引致 19 页共用同一份 flows）。多页场景请用 `nextId()` 或按 `page.name` 索引。
