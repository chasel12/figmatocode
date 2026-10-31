# 待办清单（backlog）

> **唯一待办入口**，2026-10-28 建立，2026-10-28 全部清空。
> 每条格式：**做什么 / 为什么 / 入手点 / 验收口径 / 实际做法**。工作量用「小 / 中 / 大」描述涉及范围，不用天数。

---

## 状态总览

| 编号 | 事项 | 状态 | 交付物 |
|---|---|---|---|
| P0-1 | few-shot 补「带装饰层」的整页示范 | **已交付** | `src/editor/ai/fewshots.json` |
| P0-2 | 结构指标固化成可回归基线 | **已交付** | `src/editor/ai/audit.ts`、`scripts/ai-baseline.ts`、`docs/ai-metrics-baseline.json` |
| P1-1 | `fills` 填充渐变 | **已交付** | `AiFillSpec` + `specToPage.buildFills` + 3 条配方 |
| P1-2 | 图标词表补「图表 / 数据」类 | **已交付** | `iconVocab.ts`（+13 图标、+25 别名） |
| P2-1 | `.fig` 往返保住组件实例 | **已交付** | `extras.ts` / `export.ts` / `import.ts` + `fig:check` 第 4 关 |
| P3-1 | 编辑管线支持批量 | **已交付** | `AiEditOp.targetIds` + `UPDATE_*_MULTI` |
| P3-2 | 编辑管线补 `duplicate` / `group` | **已交付** | `aiActions.cloneWithNewIds` / `group` 分支 |
| P3-3 | 整站 / 多页生成 | **已交付** | `AiSiteDraft` + `site.ts`（规划 → 逐页 → 串联） |
| P3-4 | 图片占位真实化 | **已交付** | `imagePlaceholder.ts`（确定性色调） |

**门禁基线（2026-10-28 夜）**：tsc 0 · `npm test` **1110/1110**（75 文件，文件数校验 75/75）· build OK · walkthrough 15/15 · fig:check **4 关 PASS** · ai-matrix 10/10 · codegen:verify 四端。

---

## 0. 已裁决：不做（别再问）

| 事项 | 结论 | 理由 |
|---|---|---|
| Variables（FR-30） | NO-GO | 已签署，见 `go-no-go.md` §二议题 3 |
| 协作（FR-61） | NO-GO | 已签署，§二议题 2 |
| HTML/CSS → AST 代码反解 | 不做 | 空位在「往返一致性可验证」，不在解析本身；投入与主线无关 |
| `repeat` 的「模板 / 实例」两层 | 不做 | 机制已有（FR-25 component-instance），但 `.fig` 往返不认 `componentId`；改做「多选批量 + 同源选中」，已交付 |
| 桌面化 Electron（#18~#21） | 押后 | 用户明确「先不处理」 |
| `justify-around / evenly` | 不划算 | `JustifyMode` 只有 4 档，加档要动 AST + 出码 + `.fig`；提示词已说明用 gap 代替 |
| `m*-auto` | 不支持 | `BoxPadding` 是纯数值四元组；错误提示已给替代写法（`items-center` / `justify-center`） |
| `AiStyleSpec` 补 `fontFamily` / `layoutGrids` / `blendMode` | 故意不给 | 字体与网格由风格包决定，放开会破坏风格一致性；`blendMode` AI 用不到 |
| 占位图接图库 API（Unsplash 等） | 不做 | 出码产物必须能离线跑；外链图会 404 / 跨域 / 需要 key。改做 CSS 确定性渐变，已交付 |

---

## 1. 已交付明细

### P0-1 few-shot 补「带装饰层」的整页示范 ✅

**原判断**：`decorations` / `states` / `grid` / `transform` 在 `AiStyleSpec` 里全都有、提示词也声明了，但 19 条 few-shot 里覆盖是 `3/19`、`0/19`、`0/19`。根因是 `src/demo/pages.ts` 语料里出现 **0 次**——`extract-fewshots.ts` 提不出不存在的东西。

**实际做法**：手改 `fewshots.json`（3~5 条加装饰层 / 阴影层次 / 交互态），**没有**改 `demo/pages.ts`（那会动 19 页 Pixel Diff 基线，牵连 `fig:check` 与 `canvasdiff`）。

**为什么是改 few-shot 而不是改语料**：语料是像素基线的来源，动它等于同时改「学什么」和「量什么」，改完无法归因。

---

### P0-2 结构指标固化成可回归基线 ✅

**交付物**：`src/editor/ai/audit.ts`（唯一口径）+ `scripts/ai-baseline.ts`（写/比）+ `docs/ai-metrics-baseline.json`。

**关键设计**：两个入口 `auditSpec`（模型视角，`repeat` 未展开）与 `auditPage`（落地视角，已展开）。基线脚本必须过 `draftToPage` 再统计——few-shot 的 `spec` 是 `className` 方言，直接 `auditSpec` 会得出「样式字段 3、圆角档 0」这种无意义的数。

**踩过的坑**：`渐变条目` 恒为 0。原因是 AI 契约层写 `border.gradient`、落地 AST 存 `border.fill`（Figma 侧是 strokePaints），只判一个永远是 0。已改成 `border.gradient || border.fill`。

**基线（19 条语料）**：节点 592 · 样式字段 12 · 阴影节点 8 · 装饰节点 2 · 交互态 4 · 网格 1 · 渐变 1 · 圆角档 13 · 字号档 15 · 颜色 12 · 文本 1867 字。

**注意**：基线是**你自己当前水平的快照**，不是绝对质量标准。它测「这次改动有没有让情况变差」，不测「够不够好」。

---

### P1-1 `fills` 填充渐变 ✅

**为什么**：这是 `AiStyleSpec` 相对 `StyleSchema` **唯一**的真表达力缺口（其余差集都是故意不给）。

**交付**：`AiFillSpec` / `AiFillStop`（4 种 type，收窄掉 `GRADIENT_DIAMOND`）、`specToPage.buildFills`、契约声明、`styleRecipes` 三条配方（`gradient-fill` / `layered-fill` / `radial-glow`）。

**三条丢弃规则**（全部报违例，不静默）：SOLID 无 color / stops < 2 / 有效颜色 < 2。stops 自动按 position 排序（模型常写反）。

---

### P1-2 图标词表补「图表 / 数据」类 ✅

**交付**：`ICON_VOCAB` 新增 13 个（`chart-bar/column/line/area/pie/scatter`、`trending-up/down`、`activity`、`gauge`、`layout-dashboard`、`table`、`percent`）；`ICON_ALIASES` 新增约 25 条。

**判断留痕**：`chart` 到底指柱状还是折线？按「最常用的默认形态」取 `chart-bar`——这是判断不是事实，已写进代码注释。

---

### P2-1 `.fig` 往返保住组件实例 ✅

**交付**：`ExtraNode` 加 `componentId` / `instanceOverrides`；新增 `ExtraProject`（`components` / `tokens` / `flows`）写进 `meta.json` 的 `ui_compiler_extras`；`fig-normalize.ts` 补齐口径；`fig:check` 加第 4 关「组件实例往返」（自建 fixture 页，因为 19 页 demo 没有组件实例）。

**三个假绿已修**：
1. `fig-normalize` 口径缺这两个字段 → 补齐；
2. 19 页 demo 无组件实例 → 第 4 关自建 fixture；
3. `export.ts` 少写一个字段 → 反向验证（撤掉写入，第 4 关 FAIL 且报错精确到字段名）。

**取舍**：旁挂层 Figma 不读，跨工具打开仍会丢——这是**格式边界，不是 bug**。保住的是自家 `.fig` 往返。

---

### P3-1 / P3-2 编辑管线批量 + `duplicate` / `group` ✅

**交付**：`AiEditOp.updateStyle/updateLayout` 支持 `targetIds`（与 `targetId` 合并去重）；新增 `duplicate`（`count` 上限 20）与 `group`（同父级、≥2 个、排除页面根）；批量落库走 `UPDATE_*_MULTI`，**一条动作 = 一次撤销**。

**顺带修的真 bug**：`UPDATE_LAYOUT_MULTI` 漏了 `withInstanceOverride`（单节点版本有），实例内批量改在切变体后整体丢失。

**验收**：`tests/ai-edit-batch.test.ts` 18 例；反向验证「撤掉 `targetIds` 支持 → 5 条变红」。

---

### P3-3 整站 / 多页生成 ✅

**原计划**：契约加 `AiSiteDraft { pages: AiPageDraft[] }`，一次调用产出全部页面。

**实际做法改了方向**：一次调用产 N 页会把输出预算摊成 N 份——本项目既有实测（`docs/ai-ab-report.md` 附录 B）已证明模型的策略是「先砍内容再砍页」，三页挤一次调用的结果是三页都残缺，且用户看不出哪里被砍。所以拆成：

1. **规划**（1 次调用，输出几百 token）：`AiSiteDraft { name, pages: [{ name, brief, entry? }] }`——只有页面清单，没有节点树；
2. **逐页生成**（N 次调用）：复用已验证的单页管线，每页预算与单页生成一致，每页提示词都带上全部页面名当导航项；
3. **导航串联**（0 次调用，纯确定性）：`wireNavigation` 按「文案 == 页面名」精确匹配，给 TEXT/BUTTON 挂 `ON_CLICK → NAVIGATE`。

**为什么导航不进契约**：模型写不出页面 id（id 转换时才生成），只能写页面名；既然只能用名字，就干脆在转换层按名字匹配，一次做对。让模型逐条写 `interactions` 只会多一个出错面（漏一条不会有任何报错，而跳不过去是硬伤）。

**匹配刻意严格**：只认「去空白后完全相等」。不做包含匹配、同义词、编辑距离——猜错（点「训练」跳到「我的」）比连不上更糟。

**入口页排第一**：原型 runtime 默认只展示第一个未隐藏页，入口页不在第一位演示时会从半路开始。

**落库语义**：同名页**替换**而非追加。无脑追加会得到「首页」和「首页 2」两份，而导航按名字匹配取第一个 → 点导航永远跳到旧那份。

**验收**：`tests/ai-site.test.ts` 30 例，最后一条用**出码 HTML** 验证「可点」（`data-uic-page` 与 `data-interaction` 里的 targetId 都指向真实页 id），不是只看 AST 有没有 `interactions` 字段。

---

### P3-4 图片占位真实化 ✅

**原判断**：这是设计选择不是缺口——AI 不该编造图片 URL（会 404）。

**实际做法**：不改「不编 URL」这个判断，改**占位块的表达力**：占位色由图层名**确定性推导**。

- 色调 = `name` 的 FNV-1a 哈希 → 色相（0~359）。同名必同色，改名才变色；
- 形态 = `name` 里的语义词 → 4 档（头像走径向 / 封面更饱和 / 品牌极浅 / 普通图斜向）；
- 无 `name` 落固定中性色（色相 220）——「没有名字」本身是确定的事实。

**三条硬约束**：只吃 `name` 不吃 `id`（id 每次生成都变，同一份设计两次出码会得到两种颜色）；零网络（只 CSS 渐变）；只改 `background-*` 不碰盒子（像素基线不动）。

**验收**：`tests/image-placeholder-tone.test.ts` 24 例。**其中一条测试自己先假绿过一次**：最初断言「HTML 里出现过色调类名」，但占位 CSS 块就在同一个 HTML 里，元素没挂类也照样命中；已改成断言元素的 `class` 属性。

---

## 2. 后续可做（不影响主线）

| 事项 | 判断 |
|---|---|
| 整站的跨页风格一致性 | 现在每页独立生成，导航栏样式可能不一致。方向：把第一页的导航栏结构当约束传给后续页 |
| `wireNavigation` 对改名节点的鲁棒性 | 用户手动改过导航文案后同源匹配失效。判断可接受：改名本就不该被当成「还是那一批」 |
| `.fig` 旁挂层的跨工具提示 | 用户导出给 Figma 时提示「组件实例会退化为普通节点」，避免误解为 bug |

---

## 3. 能力边界（实测，不是猜的）

> 来源：`docs/ai-ab-report.md` 附录 D（3D 电动车对比实验，2026-10-28）。
> 这一节不是待办，是**别再重复踩的边界**。判断依据都在代码里，改之前先读。

| 边界 | 事实 | 性质 | 处置 |
|---|---|---|---|
| VECTOR 图标尺寸 | ~~恒为 24×24~~ **已修**（2026-10-28）。根因是 `specToPage.ts` 硬写 `{width:24,height:24}` + `svgOfVector` 里 `d.width` 优先于 layout；且 viewBox 与渲染尺寸绑成同一个值 | **真 bug，不是设计** | 已修：`svgOfNodeVector` 拆开 viewBox 与渲染尺寸，`strokeScale` 反算保视觉粗细。14/18/22 三档生效，五端同口径（`tests/vector-icon-scale.test.ts` 12 例锁住） |
| OVAL 加 `effects` 渲染成方框 | OVAL/POLYGON/STAR 走 SVG 通道，`box-shadow` 作用在 SVG 元素的**矩形盒**上 | **SVG 通道固有行为** | 不改出码。发光用「圆角矩形 + LAYER_BLUR」垫层 |
| ABSOLUTE 容器 HUG → 高度塌成 0 | 子项全 ABSOLUTE 不占流，`height` 被 HUG 覆盖；产物里 `height` 字段还在但元素高度 0 | **静默失败，已修** | `normalizeAbsolute` 规则 3：有 height 自动补 `heightMode:"FIXED"` 并报违例 |
| 无真 3D | `TransformSchema` 只有 2D 六字段，无 perspective/rotateX/Y/Z | 架构取舍 | 不做。加要动 AST + 三端出码 + `.fig` 往返，周级工作量 |
| 图标词表无电动车 | 最近的是 `bike`/`car`/`battery`/`gauge` | 词表覆盖问题 | 要补就补 `scooter`。注意尺寸不再是理由（已可缩放），但线性图标放大到 100px+ 仍是极细线条 |

**产品判断**：A 通道适合「结构化的界面」（列表、卡片、表单、仪表盘、导航），
它的可编辑性 + 确定性出码是净优势；不适合「自由插画 / 真 3D / 复杂视觉」。
这条该写进定位，比假装能画有用。
