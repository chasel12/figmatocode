# 交接文档（HANDOFF）—— UI Compiler 项目快速上手

> 写给：接手本项目开发的 agent。日期：**2026-10-17（第三轮交接）** · 基线 HEAD：`50f8a67`（master，**工作区干净**，tsc 0 错）
> 本文档是**路线与纪律**；细节以 `docs/PRD.md`（需求唯一凭据）、`LOG.md`（逐日事实，读到最新一条）与 `docs/figma-parity-checklist.md`（矩阵账本）为准。

---

## 0. 三十秒定位

**UI Compiler**：Figma UI3 全对照可视化编辑器（React 18 + Konva 9 + Vite）+ 确定性「设计→代码」编译器（UI AST → Layout/Responsive Compiler → HTML+外链 CSS / Taro）。核心承诺：

- **AI = 0%**：全链路确定性编译，任何步骤双跑产物字节一致。
- **像素级还原**：19 测试页 e2e ≥98%；样片出码 vs reference 均值 ≥99%；画布 vs 出码 ≥95%。
- **完全对照 Figma**：唯一验收凭据 = `docs/figma-parity-checklist.md`（73 行走查矩阵，GA 线 ≥95% 且 ★核心 100%）。

**当前位置**：M6 收口段。**矩阵 73 行已全部执行：PASS 69 / FAIL 1 / P2 对照声明 3 → 通过率 98.6% ≥95% ✅（已越线）**。唯一 FAIL = FR-60 帧预算（性能攻坚，见 §6#1，含两轮实验记录）。★ 核心行（P0 级）零 FAIL。

## 1. 必读文件（按序）

| 文件 | 用途 |
|---|---|
| `docs/PRD.md`（v1.1，FR-1~62） | 需求/验收标准/里程碑/Stop and Escalate。P0=GA 必达；P1=承诺必交付；P2=Go/No-Go 后 |
| `LOG.md`（~1500 行，逐条「目标/修改/结果/验证/遗留」） | **从最后 6 条读起**（第十二~十四步）：m12 甄别结案→节点拖拽修复→矢量化接管→m5 复判结案。每条含文件锚点与踩坑 |
| `docs/figma-parity-checklist.md` | 矩阵逐行结果 + **差异与结论 #1-#17**（所有开放口径都登记在这）+ 修订历史 |
| `docs/schema-decisions.md` | types.ts 冻结文件的扩字段流程（**主线单点合入**）+ 轨道所有权 |
| `docs/wave1-prototype-plan.md` / `wave1-components-notes.md` | 口径引用用（P/C 线已按此落地） |
| `README.md` + `package.json` scripts | 命令入口全集 |

## 2. 项目铁律（违反即返工）

1. **每次修改后向 `LOG.md` 追加一条**（格式见文件头），不改历史；跨会话未记录的大批改动须补「补记」条。
2. **门禁全绿才许提交**：`npx tsc --noEmit` + `npx vitest run`（525 例）+ `npm run build` + `npm run e2e`（19 页 ≥98%）每次 src 改动后复跑；UI 改动加跑 `viewport`(76) `/ walkthrough`(9) `/ smoke-m1`(22) `/ smoke-m2`(27) `/ present-smoke`(18)。**改了 src 后跑 smoke/矩阵前必须先 `npm run precanvasdiff`**（hook 重建，见 §9）。
3. **`src/schema/types.ts` 冻结**：扩字段/枚举走主线单点（先例：StyleTokenKind 四类扩展）。热点文件（`store.ts` reducer、`Canvas.tsx`、`Editor.tsx`）改动串行。
4. **`html.ts` / `reference.ts` / `prototype.ts` 渲染分支成对改**（OVAL/POLYGON 切 SVG 通道时四处同步+e2e 19/19 不降即证；SLICE/VECTOR 历史两次事故）。
5. **浏览器验证用一次性探针**（`scripts/_*.mjs` 下划线前缀），验后删除、截图证据归档 `dist/<专项>/`；矩阵级脚本（m3/m4/m5-matrix）**保留落库**，结构=rows[{id,name,ok,note,shot}]+report.json。
6. **禁用 PowerShell 读写含中文源文件**（毁库先例）；改完扫 U+FFFD=0。
7. 提交直接进 **master**（无 remote）；信息格式照先例：**批次主题+关键修复+门禁数字**。
8. **报备纪律**：与 PRD/Figma 字面不同的口径（近似/降级/置灰）必须写进 LOG 报备段 + checklist 差异与结论表，不得静默；验证脚本判据与产品判据冲突时，以「复跑可重现」为准并回写脚本。

## 3. 环境与操作陷阱（Windows + Git Bash）

- **esbuild TEMP 拒绝访问**（构建报错）= 已知环境问题：`mkdir -p .tmp-esbuild && export TMP="$(pwd -W)/.tmp-esbuild" TEMP="$(pwd -W)/.tmp-esbuild"`；验完删（但见 §9 Playwright TEMP 坑）。
- **孤儿 preview = 假红灯**：各脚本 spawn 的 preview 进程会残留。端口表：**4173**(walkthrough/m1/m2/perf-1000) **4189**(present-smoke) **4192**(m12) **4193**(m4) **4194**(m5) 419x(探针)。红灯先 `netstat -ano | grep LISTENING` → `taskkill //PID x //F`。
- **e2e 通道（hook 构建专属）**：`window.__UIC_E2E__`（snapshot=仅根级子节点 / **geometryOf(id)=任意深度** / captureRegion）+ `window.__UIC_VIEW__`（{scale,x,y}）。page→屏幕 = `contentBox + view.x/y + page*scale`。**矩阵/探针一律用 geometryOf+VIEW，别再用「页面居中」假设标定**（10-17 甄别结案根因）。
- **Playwright 三定律**：① 树行按 `data-node-id` 定位（名称后缀跟 idSeq 不稳定，且 OVAL/TEXT 默认名如 "Text 415" 不含文案）；② HTML5 dnd（图层树拖序）要 `locator.dragTo` 或页内派发 `DragEvent`+`DataTransfer`（dragover 后**隔帧**再读 class）；③ Konva 画布上的东西（锚点/连接线/热区）**不在 DOM**——探测要用「功能断言」（拖一下看 DSL/几何变没变），innerHTML/选择器探测必假阴。
- **Konva 9 DD 不可信**：节点拖拽/锚点拖拽/拖线全部走应用层自管理（`handleDown 记意图 → stageMouseMove 驱动 → endInteraction 提交`，<3px 视为点击）；**新交互必须沿用此模式**（差异 #14/15 教训：Konva 自动 dragstart 在本事件结构下不达，且任何挂在 `listening={false}` 层里的可交互元素一律失效）。
- **拖拽/命中类断言起手点选择**：避开前景遮挡（例：装饰圆圆心被「活动说明」文本覆盖→拖错节点）；Konva 命中=最上层形状，椭圆角/边缘点不在形内。
- 子代理派遣：任务书=不相交文件+独立端口+禁跑构建门禁+「不绕权限」；回报模板=逐行 PASS/FAIL+可贴 markdown+归因。

## 4. 代码地图（改哪找哪）

```
src/schema/       types.ts（冻结）/ factory.ts（createNode/createPage/findById/walk/nextId——createPage 默认 id 恒 'page'，多页索引用 name 或 nextId）
src/compiler/     compile.ts（AST→CSS+响应式出码主战场；形状 SVG 通道判据 isShapeSvgNode）/ layout.ts measure.ts css-model.ts
                  boolean.ts（fillRule 拼接近似，Intersect/Exclude 非严格拓扑=报备）mask.ts（显式 clipContent 蒙版）
                  tokens.ts（tokens.css 四类样式单源）imageAdjust.ts（7 项调整→filter 单源）
                  shapes.ts（单位点集）shapePath.ts（★形状→路径单一事实源：椭圆四段贝塞尔/M L C Z 子集/布尔矢量化/translatePathD）
src/generator/    html.ts（预览 DOM）/ reference.ts（基准 DOM，与 html 成对）/ vector.ts（内联 <svg>，形状 SVG 复用）
                  taro.ts project.ts / prototype.ts + runtime.ts（FR-50 出码，ES5 字符串模板；Navigate 双语义=页切 section/同页 Frame 滚动）
src/editor/       store.ts（全部 action 单文件；出口 syncPages 回写 pages；effectiveParentId：选中容器→粘贴入容器内=Figma 语义）
                  Canvas.tsx（~2300 行：NodeView 递归/自管理拖拽 nodeDragRef+anchorDrag+connDraft 三分支在 stageMouseMove/endInteraction/
                  Escape 三点接线/Layer 栈: uic-content → guides+hover(listening=false) → marquee/pen → 选框标签 → 锚点(独立层) → handles → conn 旋钮)
                  Editor.tsx（键盘 effect/geometry=resolveLayout 单源/e2e hook/autosave v2 读写/Present+内联挂载）
                  Toolbar.tsx（File 保存打开 v2/Object 布尔蒙版/九宫）PropertyPanel.tsx（右栏 11 分区）
                  PrototypePanel.tsx（九宫 9 键/broken link/Flow toggle）AssetsPanel.tsx（组件+四类样式行内编辑）
                  Pages.tsx variants.ts project.ts（v1↔v2 水合单源：parseProject/stateFromProject/projectFromEditorState）
                  present/（PresentOverlay=全屏+inline 双模式/WAAPI 入场过渡/pages 切页）tools/penCore.ts（parsePathD/rebuild **subpaths 多子路径**）tools/connections.ts
scripts/          m3/m4/m5-matrix.mjs（矩阵判据库）m12-matrix（M1/M2 段）showcase.mjs（五区）perf-1000.mjs（FR-60）
                  canvas-diff viewport-check walkthrough m1/m2-smoke present-smoke zip-assert ci-local deploy-check
tests/            36 个 *.test.ts = 525 例（vitest，node 环境）
```

**热点规则**：新 action=union+case+（涉页则 PAGE_ACTIONS 白名单）；`parsePathD` 单路径返回**不带** subpaths 键（toEqual 契约，测试锁）。

## 5. 进度快照（2026-10-17）

- **HEAD `50f8a67`**；10-16 晚~10-17 提交链：第十二步(89fbb75) m12 甄别结案 24/24+**节点拖拽自管理修复** → 第十三步(ff0d680) 接管矢量化包（shapePath：P1-05 形状布尔+P1-14 形状 SVG+P1-12 已裁决改判）→ 第十四步(50f8a67) m5 复判 16/16+**锚点层修复**+**布尔多子路径毁形修复**。
- **门禁（=HEAD 实测）**：tsc 0 · vitest **525/525** · build OK · e2e **19/19≥98%** · viewport 76/76 · walkthrough 9/9 · m1 22 · m2 27 · present-smoke 18/18 · showcase 五区 5/5 avg **99.51%**（A17/B2/C0）· m4 **10/12**（FAIL=P1-01 真+P1-12 脚本判据待同步 4 档）· m5 **16/16** · m12 **24/24**。
- **矩阵总账**：73 行走查行全执行，**PASS 69 / FAIL 1 / P2 声明 3 = 98.6% ≥95% ✅**。开放差异：#1（14 页画布↔出码 92.07% 豁免，M6 终验复核）、#4（帧预算）、#11 残留（overlay 拖拽定位+遮罩透明度，P1 体验）、#13 已闭环（②③落地，arcData→SVG 留报）。
- **canvasdiff 基线仍是 10-14 的 16 页口径**（收口时须按 19 页复跑，见 §6#3）。

## 6. 剩余任务队列（就这 3 项）

| # | 任务 | 入手点 / 实验记录 | 预估 |
|---|---|---|---|
| 1 | **FR-60 帧预算攻坚**（唯一 FAIL）：1000 节点拖拽「95% 帧<16.7ms」实测 **50~55%**（测量噪声 ±5pp，判改善需 >10pp）。**已排除假设**：① hit canvas 每帧重画——拖拽期 `listening(false)+hitEnabled(false)` 实测 55.0%→50.4% **无改善**（代码已回滚，不在 HEAD）→ **真瓶颈=拖拽期内容层 scene 整层 O(n) 重绘**（每次 `grp.position()` → Konva batchDraw 全层 1000 形状）。**已设计未实施方案（半成品思路记录）**：A 拖拽幻影——起手把原 `grp.visible(false)`（imperative，勿走 React）+ 在独立监听层放单 `<Rect>` 代理跟手（改 `nodeDragRef` 携带 geom 副本+`info`，stageMouseMove 首帧切换、endInteraction/Escape 恢复+提交），每帧重绘降 O(1)；B 导引签名门控——`onNodeDragMove` 里 `setGuides(res.guides)` 每帧新数组触发 React 重渲染，按 guides 签名（axis+pos 串）变化才 setState；C 若仍不达标评估 `perfectDrawEnabled=false`（形状均无阴影）+ 向 PM 报备 avg≈17~20ms 边缘证据申请口径。**红线**：不改视觉输出（e2e 19/19 与 canvasdiff 必须仍绿）；`snapping.ts` 纯函数勿动语义（22/24 段有单测）。 | `Canvas.tsx`（nodeDragRef 三接线点）`snapping.ts` `perf-1000.mjs` | 4-8h，开口 |
| 2 | **附 A/B/C 采样归档**（GA「四模块 100%」站点凭据）：附A 19 页×9 要素、附B 右栏 11 分区逐字段、附C 7 菜单条目+置灰。写 `m6-appendix.mjs`（照 m5-matrix 模板）采样+截图入 `dist/`，结果填附表。 | checklist 附表 + matrix 模板 | 6-10h，机械零风险 |
| 3 | **收口包**：`npm run canvasdiff` 19 页基线复跑（刷 #1 豁免行数据）→ ci-local 重跑 → 矩阵汇总终版（含附 A/B/C）→ **Go/No-Go 纪要（FR-62，含 P2 协作/Variables 决策+已裁 4 项口径归档）** → m4-matrix P1-12 判据同步「4 档」→ README/HANDOFF 终刷。 | 各脚本 | 2-3h |

> **已交付（勿重做、勿重修）**：图片 7 调整双端 · 组件改名回流 · 样式行内编辑（含批量同步实测）· FR-27 四类样式（types.ts 已扩 kind）· 每页独立历史 · FR-57 样片五区 · P1-04 锚点二次编辑 · P1-05 形状布尔（shapePath 自动矢量化）· P1-14 形状出码切 SVG · autosave v2（多页/组件/样式 reload 不丢，v1 只读升级）· FR-44 连接线+旋钮拖线+Shift+Space 内联预览+Present 切页 · runtime Navigate 锚点回退 · Present WAAPI 过渡 · 九宫 9 键 · Flow 起点右键+蓝标 · 画布节点拖拽自管理 · 布尔多子路径编辑（penCore subpaths）· m12/m4/m5 三套矩阵判据库（24/10-12/16）。

## 7. 口径裁决记录与剩余拍板

**已裁决闭环（勿再问）**：① P1-12「5 向」=按 FR-35 枚举 4 档，改判 PASS（stretch 档列 GA 后增强）；② P1-05 形状布尔=「自动矢量化」方案，已实做；③ P1-14 形状 SVG=已实做（矩形/直线留 CSS 通道，弧 OVAL 留 conic——均报备）；④ 样片 ≥99%=**按均值口径**（99.51%），两 B 档卡（04=98.79、13=98.89）如实登记（差异 #1 同源换行差）。

**待拍板（做之前先问）**：① P2 协作 FR-61 Go/No-Go + Variables（M6 纪要议题）；② 帧预算若攻坚后仍 55~70%：申请调口径（判据「95% 帧<16.7ms」→「avg≥55fps 或 90% 帧<20ms」）vs 继续投入——PM 决定；③ Present 换帧 vs 导出页滚动双语义严格统一（Frame 视口容器化）——建议 GA 后。

## 8. 快速自检（接手后 10 分钟）

```bash
git log --oneline -4                 # 头应为 50f8a67 或更新，工作区 clean
npx tsc --noEmit && npx vitest run   # 0 错 + 525/525
npm run e2e                          # 19/19 ≥98%（esbuild 报错→§3 TEMP 旁路）
node scripts/m12-matrix.mjs          # 24/24（先 precanvasdiff！红灯先查 4192 孤儿）
```

然后读 `LOG.md` 最后 3 条（第十二~十四步）+ 本文 §6#1 实验记录 → 直接开工帧预算。

## 9. 环境/操作陷阱（10-17 批次新增）

- **precanvasdiff 是 smoke/矩阵的必需前置**（改 src 不重建=假结果，14/16 假摔实证）。
- **`.tmp-esbuild` 别在 Playwright 跑完前删**（mkdtemp ENOENT）。
- **矩阵脚本判据会过期**：产品修复后判据要「对齐真实语义」（P0-41 transitionDuration→getAnimations；P0-42 拖拽定位不再 gate ★；P0-43 蓝标=代码+前缀双证；P0-48 锚点解析判据）——写死 false/旧探测方式的断言=假 FAIL 温床。
- **探针里 `page.close()` 之后不得再 evaluate**（「browser has been closed」FATAL 实证）。
- perf-1000 测量噪声 ±5pp：单轮 <10pp 的「改善」不作数，跑两轮再判。
