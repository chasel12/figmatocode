# 零食商城小程序 · 需求文档

> 状态：**待确认**（确认后按 §9 里程碑执行）
> 定位：本项目的第一个「端到端产品级验收」——不是又一个字段/通道修复，而是把
> AI 生成 → 多页整站 → 项目包 → 三端编译 → 完整性校验 这条链一次性跑通。

---

## 1. 一句话定义

用应用内的 AI 生成（注入**一个**风格 skill），产出一个 6 页的零食商城小程序设计；
导出成 React / Taro / uni-app 三份**可直接 `npm i && npm run build` 的完整工程**；
用脚本证明「包是完整的、三端都编得过、H5 产物与设计稿像素一致」。

---

## 2. 前提核对（三条，第一条是纠正）

### 2.1 ❗ uni-app 目前**不存在**，不是「已有三端里的一端」

现有出码目标只有三个：

```ts
// scripts/codegen.ts:31
export type Target = 'react' | 'vue' | 'taro';
```

uni-app 在 `docs/multi-target-codegen-plan.md` 里是 **FR-81 待办**，原文一句：
「uni-app 出口 —— Vue 语法的多端框架，复用 Vue emitter」。这句话只对一半：

| 能复用 | 不能复用 |
|---|---|
| Vue SFC 结构、`emitVueTemplate` 的模板骨架 | 标签映射：uni 要 `view/text/image`，不是 `div/span/img` |
| 页面路由思路 | 工程骨架：`pages.json` / `manifest.json` / `App.vue` 是 uni 专有 |
| 样式出口（`scssFromPage`） | 部分 CSS：`display:grid` 在 mp-weixin 支持有限，`backdrop-filter` 不支持 |

**结论**：uni-app 是**新增一个出码器**（估计 300~400 行，与 `vue.ts` 349 行同量级），
不是「打开一个开关」。它进本任务范围，但排在最后一个里程碑（§9 M4），
理由见 §8.4：它的失败不会污染前三个端。

### 2.2 「项目包」的拼装件都在，缺的是**入口**

三个多页项目生成器已经齐了：

```
src/generator/react.ts:137        generateReactProject(pages, options)
src/generator/vue.ts:167          generateVueProject(pages, options)
src/generator/taro-project.ts:116 generateTaroMultiPageProject(pages, options)
```

`deriveTabBar` 也已经在（`emit-context.ts:158`），从页面名推导 tabBar，词表固定：

```ts
const NAV_WORDS = ['首页', '发现', '消息', '购物车', '我的', '个人中心'];
// 命中 ≥2 项才生成，最多 5 项
```

**缺的两处**：

1. **应用内导不出「多页 + 多目标」工程**。`CodeModal`（Ctrl+E）的 zip 里装的是三样东西：
   **当前页**的 Taro 单页工程（`generateTaroProject(state.page, ...)`）、
   多页 HTML 原型（`generatePrototypeProject`，纯 HTML 无构建）、以及外提的 assets/。
   也就是说：多页的东西不能编译，能编译的东西只有一页，而且只有 Taro。
   react / vue / uni-app 的多页工程，应用内没有出口。
2. **`scripts/codegen.ts` 只喂 demo 页**：`const pages = allDemoPages();`（第 188 行），
   读不到 AI 生成的工程。

### 2.3 「完整项目」= 编译可用，**不含数据层**

本轮不做：接口、状态管理、真实购物车逻辑、登录、支付、SKU 规格联动。
产物是**静态 UI 工程**——页面齐全、样式完整、路由与 tabBar 正确、能构建能跑，
点按钮是页面跳转不是业务逻辑。这条必须先对齐，否则「完整」两个字会在验收时打架。

商品图用**确定性占位色块**（`imagePlaceholder.ts`，FNV-1a 名字→色相，零网络），
不引外链图。代价：商城看起来「没有商品照片」，这是已知限制，不是 bug。

---

## 3. 目标与非目标

### 目标（全部可判定）

| # | 目标 | 判定方式 |
|---|---|---|
| G1 | 6 页设计由 AI + 1 个 skill 一次整站生成，0 违例 | `report.json` 的 `violations: []` |
| G2 | 导航串联生效（页面间可跳转） | `wireNavigation` 命中数 == 预期跳转数 |
| G3 | 导出 React / Taro / uni-app 三份完整工程 | 三份 `package.json` 存在且 `scripts.build` 可执行 |
| G4 | 三端 `npm i && npm run build` 全过 | 退出码 0 + 产物存在 |
| G5 | 小程序端（weapp / mp-weixin）也能构建 | 退出码 0 + `app.json` 的 `pages` 数 == 6 |
| G6 | H5 产物与设计稿像素一致 | 每页 Pixel Diff ≥98% |
| G7 | 工程完整性有脚本证明，不靠肉眼 | `scripts/project-integrity.mjs` PASS |

### 非目标（明确不做）

- ❌ 真实商品数据 / 接口 / 后端
- ❌ 购物车增删改、下单、支付
- ❌ 微信开发者工具里的真机预览（无自动化通道，见 §7.4）
- ❌ Figma 侧回读（`.fig` 往返已有 19/19 基线，本任务不重测）
- ❌ 组件库 / 设计系统抽取（商城只用现有 17 条配方 + skill）

---

## 4. 端到端流程（现状标注）

```
① 应用内输入需求 ────────────────── ✅ AiDock 已有
② 注入 1 个风格 skill ────────────── ✅ aiSkills（SerializedProject 顶层）
③ 整站规划轮 → 页面清单 ─────────── ✅ runSiteGeneration（AiDock.tsx:271）
④ 逐页生成 6 页 ─────────────────── ✅ 复用单页管线
⑤ 导航串联 ──────────────────────── ✅ wireNavigation（文案 == 页面名精确匹配）
⑥ 导出三端工程包 ────────────────── ❌ 缺口（W1 + W2）
⑦ 完整性 + 三端构建 + 像素校验 ───── ⚠️ 有件无入口（W3 + W4）
```

⑥⑦ 是本任务的主要工作量。

---

## 5. 页面规格（6 页）

页面名**决定两件事**，必须逐字遵守：

1. **tabBar**：命中 `NAV_WORDS` 才进 tabBar（首页 / 购物车 / 我的 → 3 项）
2. **导航跳转**：`wireNavigation` 按「按钮文案 == 页面名」精确匹配，无包含、无同义词

| # | 页面名 | 必须有 | 导航要求 |
|---|---|---|---|
| 1 | `首页` | 品牌区、搜索框、分类入口（4~6 个）、今日推荐商品卡（≥4）、底部 tabBar | 点「购物车」→ 购物车页 |
| 2 | `分类` | 左侧品类栏（≥5 项）、右侧商品网格（≥6 个）、价格与加购按钮 | 点「首页」→ 首页 |
| 3 | `商品详情` | 大图区、标题与价格、规格选择（≥2 组）、加入购物车主按钮、详情段落 | 点「购物车」→ 购物车 |
| 4 | `购物车` | 商品行（≥3，含勾选/数量/小计）、合计金额、结算按钮 | 点「去结算」→ 订单确认 |
| 5 | `订单确认` | 收货地址卡、商品清单、金额明细、提交订单按钮 | 点「首页」→ 首页（流程页无底栏） |
| 6 | `我的` | 用户信息头、订单状态四宫格、功能列表（≥5 行） | 点「首页」→ 首页 |

**内容具体度要求**（新增，写进契约块）：禁止「项目标题」「内容」「商品名」这类泛称。
零食商城的商品文案必须是真名字（如「海盐焦糖爆米花」），价格必须是具体数字。

**风格 skill 选型**：`style-warm-editorial`（奶油纸底 + 赤陶橙 + 衬线标题）。
选它的依据是实测数据不是审美：附录 I 的 ④ 组用它跑到 **34 节点 / 0 违例 / 首轮通过**，
是六个风格里最稳的一个；暖色系也贴合食品品类。
备选 `style-neo-brutalist`（零食品牌常用高饱和 + 粗描边），但它依赖 `font-mono`——
那是已知边界（`font-family` 白名单外静默丢弃），会让「等宽大字距」只做到一半。**只在主选翻车时换。**

---

## 6. 技术缺口与工作项

### W1 · `codegen` 支持读工程文件（脚本层）

现在 `scripts/codegen.ts:188` 写死 `allDemoPages()`。改成：

```
vite-node scripts/codegen.ts --target all --project .tmp/mall/project.json
```

`project.json` 就是编辑器 `File → 保存` 的 v2 工程格式（`parseProject` 读）。
不传 `--project` 时行为完全不变（demo 页基线不能动，`codegen:verify` 靠它）。

### W2 · 应用内「导出可编译项目包」

`CodeModal` 加一个 `项目包` 页签：勾选目标端 → 调三个 `generate*Project` → `createZip` → 下载。

- 一个 zip 内分 `react/` `taro/` `uniapp/` 三个目录，各自独立可跑
- 附 `manifest.json`（页面清单 / 视口 / 目标端 / 文件数）
- **不新增 AST 字段，不动 `.fig` 往返口径**（这是硬约束，见 §8.3）

### W3 · `scripts/project-integrity.mjs`（新增）

拿一个解压后的工程目录，做**结构断言**（不构建，秒级）：

- `package.json` 有 `scripts.build`，依赖里没有 `latest` / 本地路径
- 页面清单 == 目录里页面文件数 == manifest 页面数
- 无 0 字节文件、无残留 `data:` URL（FR-52 要求图片外提 `assets/`）
- 字体引用全为 `/fonts/*.woff2` 相对资源，不出现 `file:///`
- tabBar 项数 ∈ {3, 4, 5}，且每项 `pagePath` 都能在 pages 里找到

### W4 · 三端构建 + 像素校验的编排

复用 `codegen-verify.mjs` 的四关（syntax / typecheck / build / pixel），但输入换成
W2 导出的包。**已知硬约束**：Taro 必须**第一个**跑——同进程里先跑过 react/vue
（各含一次 playwright 启停）之后，taro 的 webpack 会卡死在 emit 阶段
（`codegen-verify.mjs:106` 有两次复现记录）。

### W5 · uni-app 出码器（M4）

新增 `src/generator/uniapp.ts` + `uniapp-project.ts`：

| 项 | 内容 |
|---|---|
| 标签映射 | `FRAME→view`、`TEXT→text`、`IMAGE→image`、`BUTTON→button`、`VECTOR→` 内联 svg |
| 工程骨架 | `pages.json`（含 tabBar）、`manifest.json`、`App.vue`、`main.ts`、`pages/<name>/index.vue` |
| 单位 | 保持 px 输出（uni 支持 px），**不转 rpx**——转 rpx 会让 375 宽设计在 750 宽设备上错位 |
| 构建脚本 | `build:h5`、`build:mp-weixin` |
| 已知降级 | `backdrop-filter` 不支持 → 毛玻璃层退化为半透明底色；`display:grid` 在 mp-weixin 支持不全 → 等分网格降级 flex |

---

## 7. 验收标准（四级，全部可执行）

### L1 · 生成质量

| 判据 | 阈值 |
|---|---|
| 违例 | `violations.length === 0` |
| 轮次 | ≤2 轮自修（超过即视为失败，记录后重跑） |
| 每页节点数 | ≥30（低于说明内容被模型主动压缩） |
| 页面名 | 6 个页面名与 §5 表格逐字一致 |
| 导航命中 | `wireNavigation` 命中数 == §5「导航要求」列的总条数（6 条） |
| 跨页一致性 | 6 页的根背景色 / 主色 / 字体栈来自同一 skill，不出现两套色板 |

### L2 · 工程完整性（`project-integrity.mjs`）

见 W3 的五条断言，三端各跑一遍。

### L3 · 三端可编译

| 端 | 命令 | 通过条件 |
|---|---|---|
| React | `npm i && npm run build` | 退出码 0，`dist/` 有 **6 个页面 HTML**（React 出的是 MPA，不是 SPA——`react.ts:7` 明确「不选 react-router，MPA 的构建关与像素关都最稳」） |
| Taro | `npm i && npm run build:h5` | 退出码 0，`dist/index.html` 存在，`dist/app.json` 的 `pages` 数 == 6（H5 是单入口 + 路由，别按 HTML 数判） |
| Taro | `npm i && npm run build:weapp` | 退出码 0，`dist/app.json` 的 `pages` 数 == 6 |
| uni-app | `npm i && npm run build:h5` | 退出码 0，`dist/build/h5/index.html` 存在 |
| uni-app | `npm i && npm run build:mp-weixin` | 退出码 0，`dist/build/mp-weixin/app.json` 的 `pages` 数 == 6 |

**不设 allow-miss**。现有 `codegen:verify` 对 Taro 有 `--allow-miss taro:1`
（06 页 Button 文本垂直差 8px），那是**像素**豁免；本任务的构建关是硬门禁，不接受豁免。

### L4 · 视觉一致性

| 端 | 能做的校验 | 做不到的 |
|---|---|---|
| React H5 | 6 页截图 vs 画布基线，Pixel Diff ≥98% | — |
| Taro H5 | 同上 | — |
| uni-app H5 | 同上 | — |
| weapp / mp-weixin | 静态断言：`app.json` pages 数、tabBar 项数、`wxml` 里节点数 ≥ 阈值 | **像素对比**：没有微信开发者工具的自动化截图通道 |

这条要写进报告：**小程序端的像素一致本轮无法证明**，只能证明「结构齐 + 编得过」。
把「编得过」冒充「看起来一样」是假绿，不干。

---

## 8. 风险与对策

### 8.1 AI 首轮通过率（已知 0/2 的那类）

金融组历史首轮 0/2，今天重跑又一次直接失败（违例 1→8→4，三轮用尽）。
对策：**每页允许 2 次重跑**，记录实际轮次进报告；连续 2 次失败就停下来查
是 skill 的问题还是契约的问题，不要闷头重试烧额度。

### 8.2 单页节点上限 800 / `repeat` 计数 ≤60

商城首页商品卡用 `repeat` 生成（模板 + 计数），6 页 × 单页 ≤800 节点够用。
但 `repeat.styles[i]` 要逐项变色时，`styles` 数组必须显式给全，漏项就回落共用色。

### 8.3 「别为了让包能编译去改 AST」

这是最容易走歪的地方。三端编译失败时的第一反应往往是「加个字段/加个开关」，
而任何新增的会往返字段都要连带改 `.fig` 往返与 `fig-normalize.ts`（新开假绿口子）。
**约束：本轮只改出码器与脚本，不动 schema、不动 `.fig`。** 真需要动，先单独立项。

### 8.4 uni-app 排最后

理由不是「优先级低」，而是**失败隔离**：uni 的标签映射（`view/text`）和 CSS 支持度
与前三个端完全不同，它一旦翻车会连带质疑「包是不是不完整」。放在 M4，
前三个端已经拿到干净证据，uni 只影响它自己那一列。

### 8.5 商城内容的具体度

模型对「商品名」这种占位文案有强烈倾向（写少违例风险低）。对策：契约块加硬要求
（§5 末），并在 L1 里加一条自动断言——扫描所有 TEXT 节点，若出现「商品名」「标题」
「内容」「项目」这类词即判失败。

---

## 9. 里程碑

| # | 交付物 | 验收 |
|---|---|---|
| **M0** | `scripts/codegen.ts --project` 支持读工程 JSON | demo 页基线不变（`codegen:verify` 仍全绿） |
| **M1** | 单页闭环：首页 → react + taro 包 → 双端构建 → 像素对比 | 双端构建退出码 0，Pixel Diff ≥98% |
| **M2** | 6 页整站生成 + tabBar + 导航串联 | L1 全过；6 页名与 §5 一致；导航命中 6/6 |
| **M3** | 项目包导出（应用内 + `project-integrity.mjs`） | L2 三端 PASS；zip 解压即 `npm i` 可跑 |
| **M4** | uni-app 出码器（H5 + mp-weixin） | L3 五条全过；uni 两端的静态断言通过 |

M1 的价值是**尽早暴露构建问题**：如果 react 包在 M1 就跑不起来，M2 的 6 页白做。

---

## 10. 需要你确认的三件事

1. **uni-app 是新增出码器**（§2.1），不是打开开关。按 M4 排期接受吗？
   若不接受，本任务收缩为 React + Taro 两端，uni 另立。
2. **「完整项目」= 编译可用的静态 UI**，无接口无购物车逻辑（§2.3）。这个边界确认吗？
3. **小程序端只验「编得过 + 结构齐」，不验像素**（§7 L4）。接受这个降级吗？

三条都确认后，我按 M0 开始。
