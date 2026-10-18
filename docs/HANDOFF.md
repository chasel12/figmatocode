# 交接文档（HANDOFF）—— UI Compiler 项目快速上手

> 写给：接手本项目后续工作的 agent。日期：**2026-10-18（收官交接）** · **项目已正式关闭**：矩阵 70/70=100%，Go/No-Go 议题 1-5 全部 PM 签署完毕，**GO 生效**。基线见 `git log -1`（master，工作区应干净，tsc 0 错）
> 本文档是**路线与纪律**；细节以 `docs/PRD.md`（需求唯一凭据）、`LOG.md`（逐日事实，读到最新一条）与 `docs/figma-parity-checklist.md`（矩阵账本）为准。

---

## 0. 三十秒定位

**UI Compiler**：Figma UI3 全对照可视化编辑器（React 18 + Konva 9 + Vite）+ 确定性「设计→代码」编译器（UI AST → Layout/Responsive Compiler → HTML+外链 CSS / Taro）。核心承诺：

- **AI = 0%**：全链路确定性编译，任何步骤双跑产物字节一致。
- **像素级还原**：19 测试页 e2e ≥98%；样片出码 vs reference 均值 ≥99%；画布 vs 出码 ≥95%。
- **完全对照 Figma**：唯一验收凭据 = `docs/figma-parity-checklist.md`（73 行走查矩阵 + 附 A/B/C，GA 线 ≥95% 且四模块 100%）。

**当前位置**：**项目已关闭（GO 正式生效）**。行走查 **70/70 = 100% ✅**；**四模块全 100% ✅**（附 A 19/19 · 附 B 11/11 · 附 C 7/7 · FR-57 样片 5/5 avg 99.51%）。FR-60 判据=方案 A（按时率 95.27% 达标）；协作/Variables 按 PM 三决 NO-GO 转 Future。后续只做 §6 的 GA 后增强清单。

## 1. 必读文件（按序）

| 文件 | 用途 |
|---|---|
| `docs/go-no-go.md` | **M6 评审纪要（FR-62）**：5 项议题、决议汇总、GA 后增强清单、唯一 GO 前置条件 |
| `docs/PRD.md`（v1.1，FR-1~62） | 需求/验收标准/里程碑/Stop and Escalate。P0=GA 必达；P1=承诺必交付；P2=Go/No-Go 后 |
| `LOG.md`（~1400 行） | **从最后 2 条读起**（M6 收口包① / FR-60 判据实证）。每条含文件锚点与踩坑 |
| `docs/figma-parity-checklist.md` | 矩阵逐行结果 + 附 A/B/C 实测 + **差异与结论 #1-#17** + 修订历史（矩阵 7） |
| `docs/schema-decisions.md` | types.ts 冻结文件的扩字段流程（**主线单点合入**）+ 轨道所有权 |
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

## 5. 进度快照（2026-10-18 收官实况；下列 10-17 明细为历史基线）

- **HEAD `50f8a67`**；10-16 晚~10-17 提交链：第十二步(89fbb75) m12 甄别结案 24/24+**节点拖拽自管理修复** → 第十三步(ff0d680) 接管矢量化包（shapePath：P1-05 形状布尔+P1-14 形状 SVG+P1-12 已裁决改判）→ 第十四步(50f8a67) m5 复判 16/16+**锚点层修复**+**布尔多子路径毁形修复**。
- **门禁（=HEAD 实测）**：tsc 0 · vitest **525/525** · build OK · e2e **19/19≥98%** · viewport 76/76 · walkthrough 9/9 · m1 22 · m2 27 · present-smoke 18/18 · showcase 五区 5/5 avg **99.51%** · **m4 11/12**（FAIL 仅 P1-01 FR-60）· m5 **16/16** · m12 **24/24** · **m6-appendix 附A 19/19 · 附B 11/11 · 附C 7/7** · canvasdiff **18/19**（avg 97.87%）· ci-local **4/4**。
- **矩阵总账（10-17 时点）**：69/1=98.6%；**10-18 方案 A 拍板后终态 = PASS 70 / FAIL 0 / P2 声明 3 = 100%**；**四模块全 100% ✅**。
- **开放差异（10-18 终态）**：#4 **已结案**（方案 A 签署，95.27% 达标）；#1 换行豁免**已终签**；#11 残留（overlay 拖拽定位+遮罩透明度）→ 已入 GA 后增强清单。
- canvasdiff 基线已按 **19 页**复跑（18/19，avg 97.87%；唯一 MISS=14 页=差异 #1）。

## 6. GA 后待办（发布不阻断，按优先级）

| # | 任务 | 入手点 | 备注 |
|---|---|---|---|
| ~~1~~ | ~~go-no-go 决议栏补签~~ **已完成（2026-10-18 第十七步：PM 三决全部落笔，议题 1-5 签署完毕，差异 #1 终签）** | — | ✅ |
| 2 | **GA 后增强清单**（纪要已录 8 项）：stretch 约束档、arcData→SVG path、Present 换帧与导出页导航双语义统一、overlay 拖拽定位+遮罩透明度、手柄独立调曲率、Flows 多分组/设备外框、14 页换行收敛（DOM 文本测量）、多断点 diff | checklist 差异表各行为锚点 | 全部有报备登记 |
| 3 | 工程遗留：git remote + Actions 实跑（当前替代凭证口径）、P2 协作若 Go 另立里程碑 | `.github/workflows/ci.yml` | 环境依赖 |

> **本轮（第四~五轮）新交付（勿重做）**：FR-60 三项真优化（拖拽层提升/悬停幂等/签名门控，真掉帧 11→1）+ **方案 A 判据落地（perf-1000 主判据切换+WARMUP 排除启动成本，实测 95.27% 达标）**+ **附 A/B/C 采样脚本 m6-appendix（全 100% 入册）**+ canvasdiff 19 页基线（18/19）+ ci-local 4/4 + **go-no-go 纪要（GO）**+ m4-matrix 12/12 + 工程卫生（.gitignore 补 .tmp-esbuild，清 576 个误提交缓存）。

## 7. 口径裁决记录与剩余拍板

**已在 `docs/go-no-go.md` 正式立项并全部签署完毕**（2026-10-18 PM 三决「a，不做，全接受」，§二议题 1-5）。此处仅索引：

| 议题 | 状态 | 是否阻断 GA |
|---|---|---|
| 1 FR-60 判据口径（A/B/C 三案） | ✅ 已签：方案 A，实测 95.27% 达标 | 已解除 |
| 2 P2 协作 FR-61 Go/No-Go | ✅ 已签：NO-GO（PM「不做」） | 否 |
| 3 Variables FR-30 | ✅ 已签：NO-GO | 否 |
| 4 变体扩展 | ✅ 已签：GA 后增强 | 否 |

**已裁决闭环（勿再问，go-no-go.md §二议题 5 归档）**：① P1-12「5 向」=按 FR-35 枚举 **4 档 2 轴**，改判 PASS（stretch 档列 GA 后增强）；② P1-05 形状布尔=「自动矢量化」方案，已实做；③ P1-14 形状 SVG=已实做（矩形/直线留 CSS 通道，弧 OVAL 留 conic——均报备）；④ 样片 ≥99%=**按均值口径**（99.51%），两 B 档卡如实登记；⑤ 差异 #1 14 页 92.07% 接受豁免。

## 8. 快速自检（接手后 10 分钟）

```bash
git log --oneline -4                 # 头应为 624ce71 或更新，工作区 clean
npx tsc --noEmit && npx vitest run   # 0 错 + 525/525
npm run e2e                          # 19/19 ≥98%（esbuild 报错→§3 TEMP 旁路）
node scripts/m6-appendix.mjs         # 附A 19/19 · 附B 11/11 · 附C 7/7
node scripts/m12-matrix.mjs          # 24/24（先 precanvasdiff！）
```

然后读 `docs/go-no-go.md`（已全部签署，GO 生效）+ `LOG.md` 最后 2 条 → 后续工作只剩 §6 的 GA 后增强清单与工程遗留（#2/#3）。

## 9. 环境/操作陷阱（10-17 批次新增）

- **precanvasdiff 是 smoke/矩阵的必需前置**（改 src 不重建=假结果，14/16 假摔实证）。
- **`.tmp-esbuild` 别在 Playwright 跑完前删**（mkdtemp ENOENT）。
- **矩阵脚本判据会过期**：产品修复后判据要「对齐真实语义」（P0-41 transitionDuration→getAnimations；P0-42 拖拽定位不再 gate ★；P0-43 蓝标=代码+前缀双证；P0-48 锚点解析判据）——写死 false/旧探测方式的断言=假 FAIL 温床。
- **探针里 `page.close()` 之后不得再 evaluate**（「browser has been closed」FATAL 实证）。
- perf-1000 测量噪声 ±5pp：单轮 <10pp 的「改善」不作数，跑两轮再判。
