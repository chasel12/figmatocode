# 多目标代码生成（React / Vue / Taro）需求清单

> 定位：**一套 UI AST，三个框架出口，每个出口都必须「可构建 + 可验证」**。
> 原则：**开源优先**——有成熟实现直接用，不重造轮子；不引入 GPL 与重型框架。

---

## 0. 三十秒摘要

**现状**：`src/generator/taro.ts`（57 行）+ `project.ts`（92 行），只出**单页脚手架**，`app.config.ts` 的 `pages` 硬编码 `['pages/index/index']`，Taro 锁在 3.6.25。

**目标**：React 18 / Vue 3 / Taro 4 三出口，均产出**多页应用工程**，均通过**四关验收**（语法 / 类型 / 构建 / 像素）。

**关键判断**：`CompiledPage` 已经是 IR，**不新建中间层**，只补三样（语义标签、资源清单、页面元信息）。

---

## 1. 目标与非目标

### 1.1 目标

| 编号 | 目标 | 判据 |
|---|---|---|
| G1 | 三出口：React 18 / Vue 3 / Taro 4 | 同一 AST 三份产物 |
| G2 | 每个出口产出**多页应用工程** | `pages` 动态生成，非单页 |
| G3 | 每个出口产物**可构建** | 真跑 `npm run build`，退出码 0 |
| G4 | 每个出口产物**可验证** | 构建后截图 vs 设计稿 Pixel Diff ≥ 98% |
| G5 | `.fig` 导入导出 | 用 `@open-pencil/kiwi`，往返一致 |

### 1.2 非目标（明确不做）

- 业务逻辑（请求层 / 状态管理 / 路由守卫 / 数据 mock）
- 组件库映射（Code Connect 类，设计组件 ↔ 代码组件绑定）
- SSR / SSG
- 断点自动生成（设计稿里不存在这个信息）
- 单元测试生成

---

## 2. 架构：不新建 IR

### 2.1 现有资产

`src/compiler/css-model.ts` 已经提供了完整的中间表示：

```ts
interface CompiledNode {
  id: string;
  className: string;
  css: CSSDecl;        // { display: 'flex', gap: '16px', ... }
}

interface CompiledPage {
  pageId: string;
  viewport: { width: number; height: number };
  nodes: CompiledNode[];
}
```

**结论：这就是 IR。** 节点 id、类名、CSS 声明全都有，三个 generator 可以直接消费。

### 2.2 只补三样

| 缺的 | 补法 |
|---|---|
| **语义标签** | 加 `semanticTag(node: UINode): string`，按 `node.type` 映射 |
| **资源清单** | 加 `AssetRef[]`（图片 dataURL → hash + 扩展名，字体） |
| **页面元信息** | 加 `{ path, title, tabBar? }`，从 `UIPage` + Prototype Flow 推导 |

### 2.3 统一入口

```ts
interface EmitContext {
  page: UIPage;            // 树 + 节点类型
  compiled: CompiledPage;  // className + CSS
  tag: (n: UINode) => string;
  assets: AssetRef[];
  meta: { path: string; title: string; tabBar?: TabBarItem[] };
}

// 三个 generator 签名统一
generateReact(ctx: EmitContext): GeneratedFile[]
generateVue(ctx: EmitContext): GeneratedFile[]
generateTaro(ctx: EmitContext): GeneratedFile[]
```

### 2.4 React 与 Taro 共用 TSX emitter

两者都是 TSX，**差异只在标签表和图片引入方式**：

| AST type | React | Taro |
|---|---|---|
| FRAME / SECTION | `div` | `View` |
| TEXT | `span` | `Text` |
| BUTTON | `button` | `Button` |
| IMAGE | `img` | `Image`（`src={require()}`） |
| VECTOR | `svg` | 内联 `svg` |
| OVAL / POLYGON / STAR | `svg` | 内联 `svg` |

**做法**：抽一个 `emitTsx(ctx, tagMap)`，React 和 Taro 各传一张表。**省一半工作量。**

Vue 需要独立 emitter（SFC 的 `<template>` 语法、`v-if` / `v-for`、scoped style 都不同）。

---

## 3. 功能清单

### P0（必须，缺一不可）

| 编号 | 功能 | 说明 |
|---|---|---|
| FR-70 | `EmitContext` 与 `semanticTag` | 统一入口，三端共用 |
| FR-71 | React 出口 | TSX + SCSS Modules，多页 |
| FR-72 | Vue 出口 | SFC（`<script setup>`）+ scoped，多页 |
| FR-73 | Taro 出口升级 | 多页 + tabBar + 资源落盘 |
| FR-74 | 工程脚手架 | `package.json` / `tsconfig.json` / 入口 / 路由 / 构建配置 |
| FR-75 | 三端构建门禁 | 真跑 build，产物落 `dist/codegen/<target>/` |

### P1（应该）

| 编号 | 功能 | 说明 |
|---|---|---|
| FR-76 | `.fig` 导入 | `@open-pencil/kiwi`，映射到 AST |
| FR-77 | `.fig` 导出（视觉层） | 矩形 / 文本 / 图片 / frame / auto layout / 样式 |
| FR-78 | 代码格式化 | `prettier` 统一三端产物，避免 diff 噪声 |
| FR-79 | 资源落盘 | 图片进 `assets/`，字体进 `fonts/`，路径改写 |

### P2（可选，看窗口）

| 编号 | 功能 | 说明 |
|---|---|---|
| FR-80 | Tailwind 输出选项 | React / Vue 各加一个 style 变体 |
| FR-81 | uni-app 出口 | Vue 语法的多端框架，复用 Vue emitter |
| FR-82 | ArkUI 出口 | 鸿蒙，需求更刚性，但生态差异大 |
| FR-83 | 组件映射 | 设计组件 ↔ 代码组件，需用户配置 |

---

## 4. 开源选型（开源优先）

| 环节 | 选型 | 许可 | 用途 | 备注 |
|---|---|---|---|---|
| `.fig` 编解码 | **`@open-pencil/kiwi`** | MIT | 读写 `.fig` | 直接 npm 装，不 fork 仓库 |
| 布局求解 | 现有 `layout.ts` | — | flex | 保持；如需 Grid 再评估 `yoga-layout`（MIT） |
| CSS 后处理 | `postcss` | MIT | 前缀 / 压缩 | 可选，先不上 |
| 代码格式化 | **`prettier`** | MIT | 三端统一 | 必装，否则产物难读 |
| TSX 语法校验 | **`@babel/parser`** | MIT | 断言 JSX/TSX 合法 | 门禁用 |
| Vue SFC 校验 | **`@vue/compiler-sfc`** | MIT | 断言 SFC 合法 | 门禁用 |
| 类型检查 | `typescript` | Apache-2.0 | `tsc --noEmit` | 已有 |
| ZIP 打包 | **`fflate`** | MIT | 工程导出 | 比 jszip 更小更快 |
| 截图 | `playwright` | Apache-2.0 | 已有 | — |
| 像素对比 | `pixelmatch` + `pngjs` | ISC / MIT | 已有 | — |
| 图标 | `lucide-static` | ISC | 已有 | — |
| 构建 | 各框架 CLI | MIT | 真跑 build | — |

**版本注意**：Taro 建议从 3.6.25 升到 **4.x**（3.6 已停止维护），否则构建关可能踩兼容坑。

**红线**（延续 wave2 原则）：不重造轮子 / 不上重型框架 / 禁用 GPL 与社区 kit。

---

## 5. 验收标准：四关

每个出口的产物都要独立通过：

| 关卡 | 判据 | 工具 |
|---|---|---|
| **语法关** | 解析 0 错 | `@babel/parser`（React/Taro）/ `@vue/compiler-sfc`（Vue） |
| **类型关** | `tsc --noEmit` 0 错 | typescript |
| **构建关** | `npm run build` 退出码 0 | 各框架 CLI |
| **像素关** | 构建产物截图 vs 设计稿 **≥ 98%** | playwright + pixelmatch |

### 5.1 像素关怎么做

```
生成工程 → npm i → npm run build → 起 preview → playwright 截图
                                                    │
                                          设计稿 reference 截图
                                                    │
                                              pixelmatch
                                                    │
                                    相似度 + diffRegions 归因
```

**复用现有 `diffRegions.ts`**，差异直接归因到 AST 节点，输出「哪个节点偏了几 px」。

**这是核心差异化**：别人只到构建关（"能跑"），你到像素关（"跑对了"）。

### 5.2 门禁脚本

```json
{
  "codegen:react": "vite-node scripts/codegen.ts --target react",
  "codegen:vue": "vite-node scripts/codegen.ts --target vue",
  "codegen:taro": "vite-node scripts/codegen.ts --target taro",
  "codegen:verify": "node scripts/codegen-verify.mjs",
  "codegen:all": "npm run codegen:react && npm run codegen:vue && npm run codegen:taro && npm run codegen:verify"
}
```

`codegen-verify.mjs` 逐 target 跑四关，输出 `dist/codegen/report.json`：

```json
{
  "target": "vue",
  "syntax": { "ok": true },
  "typecheck": { "ok": true, "errors": 0 },
  "build": { "ok": true, "exitCode": 0, "durationMs": 42000 },
  "pixel": { "ok": true, "similarity": 0.9842, "regions": 3 }
}
```

---

## 6. 阶段与工作量

| 阶段 | 内容 | 工作量 | 依赖 |
|---|---|---|---|
| **M1** | `EmitContext` + `semanticTag` + React 出口（复用 TSX emitter） | 3 人日 | 无 |
| **M2** | Vue 出口（SFC emitter + scoped 样式） | 5 人日 | M1 |
| **M3** | Taro 多页升级（`pages` 动态 + tabBar + 资源落盘） | 4 人日 | M1 |
| **M4** | 三端构建门禁 + 像素验证 | 4 人日 | M1–M3 |
| **M5** | `.fig` 导入（`@open-pencil/kiwi` → AST 映射） | 5 人日 | M1 |
| **M6** | `.fig` 导出（视觉层，跳过组件与矢量） | 4 人日 | M5 |
| **合计** | | **25 人日** | |

**建议顺序**：M1 → M4（先证明一个出口能过四关）→ M2 → M3 → M5 → M6。

理由：**先用 React 打通全链路**，验证"四关"这套验收真的可行，再复制到 Vue 和 Taro。反过来做会同时踩三个坑。

**完成状态（2026-10-23）**：M1–M4 已全绿（提交 `d0f7797`，三端四关实跑）；
M5/M6 已落地（提交 `70459e3`，导入 4/4 真实文件 · 往返 18/19 · CSS 18/19）。
落地细节与偏差见 §10（M1–M4）与 §11（M5/M6）。**六个里程碑全部完成**。

---

## 7. 明确不做

写进路线图的「不做」清单，和「做」一样重要：

- 业务逻辑（请求 / 状态 / 路由守卫 / 数据 mock）
- 组件库映射（Code Connect 类）
- SSR / SSG
- 断点自动生成
- 单元测试生成
- 实时协作
- Variables 变量系统（除非转 B 端设计系统）
- CSS Grid 布局（flex 覆盖 90% 场景）
- 设计 lint（与「验证」定位不同）

---

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| **Taro 版本兼容** | 3.6 与 4.x 配置差异大，构建关可能持续失败 | 锁 4.x，先跑通空模板再生成 |
| **Vue scoped 样式与 Pixel Diff** | scoped 会加 `[data-v-xxx]`，可能影响选择器权重 | 用 CSS Modules 或 BEM 类名替代 |
| **`.fig` 必需字段未知** | Figma 打开后显示异常，难定位 | 阶段化：先视觉层，用 Figma 免费版验证 |
| **构建耗时** | 三端 × 19 页，全量跑可能 10+ 分钟 | 抽样验证 + 增量构建 + CI 并行 |
| **字体度量差异** | 三端渲染字体不同，像素关难达 98% | 字体随包分发（已有 `fonts/` 方案） |

---

## 9. 与现有文档的关系

- 需求唯一凭据仍是 `docs/PRD.md`，本文是 **FR-70 ~ FR-83 的详细清单**，落地后并入 PRD
- 门禁纪律沿用 `docs/HANDOFF.md` §2（每次改动跑 tsc / vitest / build / e2e）
- 新增门禁需登记到 `docs/figma-parity-checklist.md` 附表
- 每条实现完成后向 `LOG.md` 追加一条，格式照旧

---

## 10. 实施记录（2026-10-22 落地）

> 本节是落地后回填的**实跑档**，不是计划。正文 §0–§9 保持原样，与计划的偏差集中在 §10.4。

### 10.1 完成范围

| 阶段 | 状态 | 交付物 |
|---|---|---|
| **M1** | ✅ | `src/generator/emit-context.ts`（FR-70）、`tsx-emitter.ts`、`react.ts`（FR-71） |
| **M2** | ✅ | `src/generator/vue.ts`（FR-72） |
| **M3** | ✅ | `src/generator/taro-project.ts`（FR-73 + FR-79） |
| **M4** | ✅ | `scripts/codegen.ts`（FR-74）、`scripts/codegen-verify.mjs`（FR-75） |
| **M5/M6** | ⏸ 未开始 | `.fig` 导入导出（P1，依赖 M1 已完成） |

**红线遵守**：`src/schema/types.ts`、`src/compiler/compile.ts` **零改动**（冻结文件未触碰）。
`CompiledPage` 直接当 IR 用，未新建中间层（§2.1 的判断成立）。

**新增测试**：`tests/codegen.test.ts` 20 例，锁语义标签 / 路径推导 / tabBar 推导 / 资源双口径 /
**三出口 DOM 同构** / 脚手架完整性 / Taro 必须用 Taro 组件。

### 10.2 四关实跑（2026-10-23 复跑，19 页全量）

| target | 语法关 | 类型关 | 构建关 | 像素关 | 备注 |
|---|---|---|---|---|---|
| **react** | PASS · 39 文件 | PASS · 0 错 | PASS · 19 html / 7.1s | **PASS · 99.52%** · 19/19 | 依赖工程自装（70 包） |
| **vue** | PASS · 19 文件 | PASS · 0 错 | PASS · 19 html / 6.5s | **PASS · 99.52%** · 19/19 | 依赖工程自装（34 包） |
| **taro** | PASS · 42 文件 | PASS · 0 错 | PASS · 1 html / 36.4s | **PASS · 99.38%** · 18/19（豁免 1） | Taro 4.0.9 · 1176 包 · SPA 单 html |

`npm run codegen:verify -- --target all` 端到端 2m25s（每端一个独立子进程，见 §10.4 第 7 条）。

**最值得记的一条**：React 与 Vue 的像素值**逐页完全一致**——最差三页都是
`04-商品详情 98.79%` / `13-绝对定位页 98.89%` / `05-订单列表 99.00%`，平均都是 99.52%。
这不是巧合，是两个出口的 DOM 盒子树同构的直接证据（`#root{display:contents}` + 同一套 CSS +
同一份字体 + 同一套标签选择）。**像素关真正验证的是「结构等价」，不是「两个框架渲染一致」。**

> 对照基线：HTML 出口的 e2e 是 19/19 ≥98%，canvasdiff（画布 vs 参考图）平均 98.13%。
> 三出口的 99.52% 是**产物 vs 参考图**，与 e2e 同口径、比画布更严（画布有 Konva 文本基线差）。

### 10.3 Taro 的像素关口径与唯一 MISS

**构建关判据不同**：React/Vue 是多页 MPA（19 个 html），Taro h5 是 SPA（1 个 `index.html` +
hash 路由 `#/pages/<NN>/index`）。故 Taro 的构建判据是「`dist/index.html` 存在」，
像素关按 hash 路由逐页 goto——不是「19 个 html」。

**唯一 MISS：`pages/06`（订单详情）97.68%，差 0.32pp。** 已定位到根因，不是结构缺口：

- 差异带 y=476–530 占全部差异像素的 **83%**，正是底部两个 `Button` 的位置；
- 该页两个按钮（申请退款/查看物流）在 Taro 下渲染为 `taro-button-core` 自定义元素，
  盒子实测 `y=483.5 h=40 padding=10px 20px display:flex align-items:center` —— **盒子与设计稿完全一致**；
- 但元素内文本是匿名 flex item，行盒受自定义元素内置 `line-height` 影响，文本垂直位置比
  绝对定位基准（`reference.html`）偏约 8px，导致文字重影；
- 对照：HTML 出口同一按钮与基准只差 190px（0.65%），说明**基准本身没坏**，是 Taro 组件层差异。

**处理决议：接受并记录，不改基准。** 理由与项目既有口径一致（canvasdiff 18/19 唯一 MISS 同样豁免）：
① 盒子尺寸/位置/颜色/圆角全部正确，只有文本垂直基线差；
② 要消除它就得给 `taro-button-core` 打补丁式 hack，Taro 小版本升级即失效，维护成本 > 收益；
③ 本出口的价值在「构建得出来 + 结构对」，不追求与 DOM 出口逐像素等价。

Taro 的 `Button`/`Image` 在 h5 下是自定义元素，带内置样式；产物已做组件级 reset（`src/app.scss`），
但 **Taro 版本升级会改变内置样式**，故 Taro 像素值按「尽力值」记录，不与 React/Vue 同口径比较。
这是 §8 风险表「Taro 版本兼容」的兑现方式：**构建关必须过，像素关记录实测不虚报**。

### 10.4 与计划的偏差报备（16 条）

| # | 计划口径 | 实际实现 | 理由 |
|---|---|---|---|
| 1 | FR-71「TSX + **SCSS Modules**」 | 普通 `.css`，全局类名 | 类名由 compiler 按节点 id 生成、天然唯一；跳过 sass 依赖换取构建关稳定（少一个失败点） |
| 2 | FR-72「SFC + **scoped**」 | SFC 内联 `<style>`（**非 scoped**） | §8 自己把「scoped 与像素关」列为风险；类名已唯一，非 scoped 少一层 `[data-v-xxx]` 属性选择器，像素变量更少 |
| 3 | §2.4「React 与 Taro 共用 TSX emitter」 | ✅ 已实现，但 Taro 侧**强制覆盖标签表** | 装配路径漏传 tagMap 会静默产出 `<div>/<span>`（h5 能跑、小程序必挂）。已在 `generateTaro` 内部兜底 + 单测锁死 |
| 4 | FR-74「路由」 | vite **MPA**（每页独立 HTML 入口），非 react-router | 构建关与像素关都最稳：真实 HTML 文件可直接 goto，无需等 hydration；接入方要 SPA 时自行换 router，不被我们的路由约定绑死 |
| 5 | §4「Taro 建议升 4.x」 | Taro **4.0.9** + webpack **5.91.0 精确锁** | `@tarojs/webpack5-runner@4.0.9` 的 peer 就是 `5.91.0`，用 `^` 直接 ERESOLVE |
| 6 | FR-79「图片进 assets/」 | 图片进 **`public/assets/`**，URL 用 `/assets/x` | 相对路径会被 Rollup 当 import 解析（Vue 实测报错 `Rollup failed to resolve import "assets/img-1.svg"`）；走 public 让 Vite 按 base 自动改写 |
| 7 | FR-75「真跑 build」 | 门禁跑 Taro 时注入 **`TARO_NO_MINIMIZE=1`**（关压缩），产物默认仍压缩 | 压缩器的 worker 池在带 fs 拦截的宿主里会死锁：19 页里写完 12 个 css chunk 后永久等待（同一命令在普通终端 21s 完成）。门禁验证的是「能不能构建 + 产物像素对不对」，压缩与否不影响这两件事；产物本身默认走压缩，不受影响 |
| 8 | G5「`.fig` 往返一致」 | 往返**结构 18/19 无损 + 1 页报备降级**（渐进模糊） | Figma 的 `EffectType` 没有渐进模糊原语，只能降级成 `FOREGROUND_BLUR`；门禁把它列进 `KNOWN_LOSS` 白名单并打印原因，不静默吞掉 |
| 9 | 导入「组件实例展开为普通 Frame」 | ✅ 但**组件/Variables/Prototype 语义不写** | 与 §7「明确不做」一致：只做视觉层。实例被摊平成 Frame，名字保留 |
| 10 | 矢量节点 | 导出写 `VECTOR` 但**不写命令几何**（`d` 丢失） | Figma 的矢量几何是独立命令 blob（需额外解码器），当前只保留节点与描边样式；门禁比对口径不含 `vector.d` |
| 11 | AST 的 `FILL` 尺寸模式 | 导出换算成**具体像素** + `stackChildPrimaryGrow` / `stackChildAlignSelf` 标记 | Figma 的 `StackSize` 没有 FILL，不换算 frame 会以 0 宽塌陷；标记让导入能还原 FILL（否则主轴 flex 语义丢失） |
| 12 | AST 的 `BUTTON` | 导出拆成 **FRAME + 唯一 `Label` 文本子节点**，导入按同一约定合回 | Figma 无 BUTTON 原语；不拆文字会直接消失（视觉层最大坑）。约定：只有「单 TEXT 子节点且名为 Label」才判为按钮 |
| 13 | AST 的 `IMAGE` 无 src | 导出写 **1×1 透明 PNG + 哨兵 hash**（40 个 0） | Figma 没有「空图片节点」，写不出填充就退化成矩形，往返后 `object-fit`/`border-radius` 全丢 |
| 14 | 旧 `boxShadow` 字符串 | demo 数据迁移到 FR-19 `effects`；导出按 CSS 颜色串（含 `rgba()`）解析 | `.fig` 存不下原始 CSS 串；`effects` 才是迁移目标（compile.ts 注释即此口径）。迁移后 `box-shadow` 变成合法 CSS，像素关 99.52% 不变 |
| 15 | 显式 `fontFamily: 'Inter'` | 导出把「未指定字体族」写成 `Inter`，导入把 `Inter` 还原成 undefined | Figma 的 `fontName.family` 必填；AST「不写」会落到 `FONT_STACK`，两者编译结果不同。代价：真实文件里显式指定 Inter 会退化成默认栈 |
| 16 | FR-75 门禁的日志落盘方式 | 子进程 `data` 事件只在**内存**累积，退出时一次性 `writeFileSync`；`--target all` 的子进程用异步 `spawn` + await | 第 4 条「假死」死路：只要「跑的过程中写文件」（`pipe(createWriteStream)` 或 `appendFileSync` 都算），宿主 fs shim 的写调用就迟迟不返回 → 管道无人消费 → 子进程永久阻塞在 write（日志停在 279 字节、CPU 6~25s 后归零，而同命令 `> file` 34~44s 完成）。另外 `spawnSync` 会堵死父进程事件循环，taro 从 40s 拖成 6 分钟。改后 `all` 端到端 3m07s |


**另两条环境事实（非设计偏差，写进 HANDOFF 免得复跑踩）**：

- Taro 的 `babel-preset-taro@4.0.9` 把 `@babel/preset-react` 放在 **peerDependencies**、
  又直接引用 **`@babel/plugin-proposal-class-properties`（旧名，不在自己的 deps 里）**——
  两个都得显式写进 devDependencies，否则 `Cannot find module`。`preset-react` 必须锁 `^7`（8.x 要 core ^8）。
- 本机 npm 全局配了 `proxy=http://127.0.0.1:7890` 但代理未启动，`npm install` 全量 `ECONNREFUSED`。
  处置：写一个只含 registry 的临时 npmrc，`npm install --userconfig .tmp/npmrc-noproxy`。
- **同一进程里连跑三端会卡死第三端**（`--target all` 原实现）：react + vue 的构建与截图跑完后，
  taro 的 webpack 会停在 emit 阶段（CPU 21s 后不再前进）。现改为 `all` 模式**每端起一个独立子进程**，
  端到端 3m07s 稳定通过。详见 HANDOFF §11.2 坑 8。

### 10.5 门禁怎么跑

```bash
npm run codegen:all        # 三端产物 → dist/codegen/<target>/
npm run codegen:verify     # 逐 target 跑四关，报告 → dist/codegen/<target>/report.json
npm run codegen:verify -- --target react --only pixel   # 单关调试
```

**依赖策略**：目标工程有 `node_modules` 就用它（`deps=local`），否则复用主仓（`deps=workspace`）。
这样门禁在无网环境也能跑——「能不能构建」是代码问题，「能不能下载」是网络问题，不该混为一谈。
`report.json` 里 `deps` 字段如实标注来源。

### 10.6 M5/M6 的启动方式（原「未开始」说明，已被 §11 取代）

M1–M4 打通了「一套 AST → 三个可构建可验证出口」的主干，M5/M6 是在主干上**增加输入输出格式**。
按 §6 的建议顺序（先证明四关可行再复制），当时停在 M4 是符合计划的。

2026-10-23 已启动并完成，见 §11。

---

## 11. 实施记录：`.fig` 导入导出（M5/M6，2026-10-23 落地）

### 11.1 完成范围

| 文件 | 作用 |
|---|---|
| `src/fig/codec.ts` | `@open-pencil/kiwi` 适配层（动态 import + 缓存，主包不背 600KB） |
| `src/fig/paint.ts` | 颜色 / 填充 / 描边 / 效果双向映射（含 `rgba()`、`transparent`、渐变角度 ↔ transform） |
| `src/fig/import.ts` | `.fig` 字节 → `UIPage[]`：zip 解包、节点树、兄弟序、FILL 还原、BUTTON 合回、占位图识别 |
| `src/fig/export.ts` | `UIPage[]` → `.fig` 字节：尺寸解析、fractional index、图片 blob、meta.json |
| `src/fig/index.ts` | 统一出口 |
| `scripts/fig-check.ts` | 三关门禁（导入 / 往返 / CSS），报告 → `dist/fig/report.json` |
| `tests/fig.test.ts` | 16 例：真实文件解码、paint 互逆、导出约定、往返一致 |

### 11.2 三关实跑（2026-10-23）

```
导入关  PASS  4 个真实 Figma 文件
        ✓ circle-text.fig                    1 页 / 5 节点 / 44ms
        ✓ gold-preview.fig                   1 页 / 58 节点 / 394ms
        ✓ slots.fig                          2 页 / 40 节点 / 34ms
        ✓ variable-override-precedence.fig   2 页 / 32 节点 / 10ms

往返关  PASS  18/19 页结构无损 · 1 页已报备降级
        ⚠ 18-样片-参数矩阵: PROGRESSIVE_BLUR 无 Figma 原语，降级为 LAYER_BLUR

CSS 关  PASS  18/19 页样式一致 · 1 页已报备降级
```

**样本来源**：`github.com/open-pencil/open-pencil` 的 `tests/fixtures/*.fig`（Git LFS，需走
`media.githubusercontent.com/media/...`）。仓库里放了 4 个（含 550KB 的 gold-preview），
6.8MB 的 material3 / nuxtui 两次下载均被截断（`invalid zip data`），未纳入。

### 11.3 往返比对口径（`scripts/fig-check.ts` 的 `normalize`）

`.fig` 是 Figma 的格式，不可能 1:1 装下我们的 AST。比对前抹掉的是**「表达方式差异」**，
不是**「信息丢失」**——后者一律进 `KNOWN_LOSS` 白名单并打印原因：

| 归一化 | 原因 |
|---|---|
| id / name | 往返后 id 重新分配（`fig-N`），名字只影响图层列表 |
| `FILL` → `FIXED` | Figma 的 StackSize 没有 FILL，用 grow/stretch 表达 |
| HUG / FILL 轴的尺寸数值 → 0 | 尺寸由布局决定，`.fig` 里存的是换算后的绝对值 |
| TEXT 的宽高 → 0 | 尺寸由字体度量决定，`.fig` 里只是估算缓存 |
| 叶子布局模式 → 工厂默认值 | `.fig` 不存「叶子自身布局模式」；写 ABSOLUTE 会被编译器当成绝对定位 |
| 单层 SOLID `fills` 与 `background` 二选一 | AST 两种写法同义 |
| `borderRadius: 0` / `border.style: 'solid'` / `border.align: 'INSIDE'` / `dash: [4,4]` / `opacity: 1` / `visible: true` | 都是各自系统的默认值，写与不写等价 |
| 数值保留 4 位小数 | `.fig` 数值字段是 **float32**，`0.42` 读回来是 `0.41999998688697815` |
| 空 `children` ≡ 无 `children` | 矩形读回来是容器，但可能一个子项都没有 |

CSS 关只比**声明体集合**（类名由 id 生成，选择器必然不同），并抹掉三类等价写法：
颜色大小写、`border-radius:0`、`0px` 的单位。

### 11.4 踩过的坑（同步在 HANDOFF §12.2）

1. **`localeCompare` 不能用来排 Figma 的 fractional index**：ICU 给标点的权重与码点序不一致
   （实测 `'$'.localeCompare('%') === 1`），会把兄弟顺序排乱。改用码点比较 + 定长 3 位 base62
   （变长编码在进位处同样会排错：`'10' < 'B'` 但 62 应排在 11 之后）。
2. **`Image.hash` 是 `byte[]` 不是字符串**：写 hex 串会被 kiwi 直接拒（`Expected byte array`）。
   导出要把 40 位 hex 展开成 20 字节（Figma 的 sha1 长度），导入要把字节拼回 hex 才能查 `images/`。
3. **`Blob` 是 struct 不是裸 byte[]**：`blobs: blobs.map(b => ({ bytes: b }))`，直接给
   `Uint8Array[]` 会报 `Missing required field "bytes"`。
4. **`StackSize` 没有 FILL、`StackAlign` 没有 STRETCH**：FILL 走
   `stackChildPrimaryGrow` / 子项 `stackChildAlignSelf`；父容器的交叉轴拉伸也只能写在子项上。
5. **主轴是「排列方向」不是「宽度」**：VERTICAL 容器的 `stackPrimarySizing` 是**高度**。
   写反了会让所有 HUG 容器的宽高模式互换。
6. **`fontName.postscript` 必填**（可空串）、**`EffectType` 是 `FOREGROUND_BLUR` 不是 `LAYER_BLUR`**。

### 11.5 门禁怎么跑

```bash
npm run fig:check                                   # 三关 + 报告 → dist/fig/report.json
npm run fig:check -- --samples .tmp/fig-samples     # 追加外部真实样本目录
npx vitest run tests/fig.test.ts                    # 16 例单测
```

### 11.6 已知不做（与 §7 一致）

组件与实例语义（摊平成 Frame）、Variables、Prototype、矢量命令几何、样式 token。


---

## 12. 延伸交付：任意模型接入 + `.fig` 产品入口（2026-10-24）

M1–M6 完成后，核对「产品愿景 vs 代码」时发现两处**计划书未覆盖**的缺口：
① 只能接 Anthropic 协议的模型，「可接任意大模型 API」只兑现一半；
② `.fig` 能力只到库层，编辑器里没有入口（用户摸不到）。
两项都不在 §6 里程碑内，作为延伸交付补齐，本节记录口径与实跑。

### 12.1 任意模型：按**协议**分层，而不是按公司堆表

原实现只有 `createAnthropicClient`，供应商表里两家都走 Anthropic Messages 协议。
这次改成 **协议 × 供应商** 两层：

| 层 | 内容 |
|---|---|
| `Protocol` | `'anthropic' \| 'openai'`，决定用哪个 client 实现 |
| `ProviderDef.protocol` | 每家声明自己默认走哪种协议 |
| `createLlmClient()` | 统一工厂，调用方只认它（加协议时不动调用点） |
| `createOpenAiCompatClient()` | 手写 `POST {baseURL}/chat/completions` + SSE 解析，约 130 行、**零新增依赖** |

现有 6 家：Anthropic / DeepSeek（anthropic 协议）、OpenAI / Gemini / Ollama / 自定义端点（openai 协议）。

**为什么不引 `openai` SDK**：只需要一个 POST + SSE 解析，手写行为完全可控，也避免与
`@anthropic-ai/sdk` 的 fetch/stream 依赖叠加。代价是要自己处理兼容层差异（见 12.2）。

### 12.2 兼容层差异：探测 + 降级，不假装支持

| 差异 | 处置 |
|---|---|
| `response_format.json_schema` | 只有 `jsonSchema: true` 的供应商才发；且 `strict: false`——我们的契约 schema 不满足 OpenAI 严格子集（要求所有字段 required + `additionalProperties:false`），开 strict 会被直接拒。不支持的端点走 prompt 契约，由闸门 + 自修环兜住（与 DeepSeek 那次同一思路） |
| `max_completion_tokens` vs `max_tokens` | 新字段优先；400 且报文提到该字段时自动退回旧字段重试一次 |
| 用量字段命名 | `prompt_tokens_details.cached_tokens` / `prompt_cache_hit_tokens` 两种都认 |
| 本地端点无 key | `keyOptional: true`（Ollama / 自定义），`aiAvailable` 不再要求 key 非空 |
| 模型清单会过期 | OpenAI / Gemini / Ollama / 自定义标 `modelEditable`，面板给输入框，下拉只作建议值 |
| 未知模型的价格 | `isPriced()` 判否时面板显示「未计价」，**不回退成别家价格**（回退会给出错误印象） |

### 12.3 `.fig` 产品入口

新增 `src/fig/project.ts`（产品入口层），与 `import.ts` / `export.ts`（纯数据层）分工：

| 函数 | 职责 |
|---|---|
| `pagesToProject(pages, name)` | `UIPage[]` → `UIProject`（components/tokens/flows 一律空表——`.fig` 的实例已摊平成 Frame，再编造组件定义只会产出孤儿） |
| `importFigFile(file)` | `File` → 工程；空页直接抛错（空工程载入只会让人以为文件坏了） |
| `exportFigBlob(project, name)` | 工程 → `Blob`（多页一并写出，Figma 侧就是多 Canvas） |

Toolbar 两处接线：
- 「打开…（含 .fig）」与「导入 Figma 文件（.fig）…」共用同一个隐藏 input，按扩展名分派；
- 新增「另存为 Figma 文件（.fig）」。
- **动态 `import('../fig/project')`**：`.fig` 是可选格式，主包不为它背体积（实测独立 chunk 58.7KB / gzip 22.5KB，首次打开时按需加载）。

`schema/types.ts` 与 `compile.ts` **零改动**（§1 铁律）：工程语义在入口层显式补齐，不往 AST 上加字段。

### 12.4 实跑

```
单测       726/726（54 文件）· 新增 ai-providers 17 例 + fig-project 6 例
类型       tsc --noEmit 0 错
构建       主包 914.36 kB（+6.7 kB，来自 OpenAI client）/ .fig 独立 chunk 58.70 kB
UI 真跑    PASS 3/3（Playwright）
           ✓ 文件菜单含 .fig 导入/另存两项且可点
           ✓ 导入 slots.fig → 2 页（Page 1 / Slots fixture）· 7 图层行 · 画布渲染 · 0 弹窗
           ✓ 另存 → slots.fig 29,947 B
```

单测里有一条**真实 HTTP 往返**（本地起 http server 模拟端点，分三块写 SSE，含跨块半包），
验证路径 `/v1/chat/completions`、`Bearer` 头、末尾斜杠归一、正文拼接与用量映射。

### 12.5 三个坑

1. **`getBaseURL()` 返回空串，用 `??` 不会回退默认端点**
   `'' ?? def.baseURL` 结果是 `''`——OpenAI / Ollama 一上来就报「未配置端点地址」。
   必须用 `||`。这个是单测抓到的（第一次跑 4 例红）。
2. **OpenAI 的 `prompt_tokens` 含缓存命中部分**（cached 是子集），而 Anthropic 的
   `input_tokens` 不含 `cache_read`。`estimateCostCny` 的公式按 Anthropic 口径写，
   映射时保持同形（input 含 cached），否则成本会被算低一半。
3. **`.fig` 不能静态 import 进 Toolbar**：会把 import/export/paint 全拖进首屏。
   改为动态 import 后主包只涨了 OpenAI client 的 6.7 kB。

### 12.6 收尾：评测轨与走查都跟上协议层

协议层加完后，有两处「还在按单供应商写」的地方，一并补齐——否则能力是通的，验收路径还是旧的：

| 位置 | 原来的问题 | 现在 |
|---|---|---|
| `scripts/ai-matrix.ts` 实跑档 | 硬编码 `createAnthropicClient`，只认 `ANTHROPIC_API_KEY` / `DEEPSEEK_API_KEY` | 改用统一工厂 `createLlmClient`；供应商解析 `AI_PROVIDER` 显式 > 按 key 自动挑（anthropic → deepseek → openai → gemini）> 跳过；`AI_PROVIDER=ollama` 可**无 key 实跑**（`keyOptional`） |
| `scripts/walkthrough.mjs` | `.fig` 入口只用手写的一次性探针验过（`.tmp/fig-ui-probe.mjs`），不进任何门禁 | 走查末尾加三步：文件菜单两项可点 → 导入 `slots.fig` 得 2 页/图层 → 另存出非空 `.fig`；每次 `npm run walkthrough` 都验 |

`jsonSchema` 能力判定也按协议分开：OpenAI 协议看供应商表声明的 `jsonSchema`，
Anthropic 协议沿用按端点推断（DeepSeek 兼容层不认 `json_schema`）。

两条「以为实跑过了」的防线（都在 CLI 侧，不靠人记）：
- `AI_PROVIDER` 拼错 → **直接退出 1** 并列出可选值（`providerDef` 对未知 id 的兜底是给 UI 用的，CLI 不能静默变成 anthropic）；
- 点名了供应商但没给 key → 打一行 warn 再退回离线档，报告里 `mode` 仍是 `offline`。

实跑：离线档 **10/10**；拼错供应商 `REAL_EXIT=1`；`AI_PROVIDER=openai` 无 key 时 warn + 退回离线档。
走查 **14/14**（新增三步全过）。

### 12.7 仍然不做

- 浏览器直连仍受 CORS 限制：OpenAI 官方端点允许浏览器直连（SDK 侧已 `dangerouslyAllowBrowser`），
  但部分网关会拦；拦了就填「自定义端点」走自己的代理（`VITE_AI_PROXY_BASE` 亦可）。
- 组件 / Variables / Prototype / 矢量几何语义（与 §7、§11.6 一致）。
- 没有后端：key 只在本机 localStorage，生成时只有提示词与选中节点结构出网。

### 12.8 门禁根因修正：`--target all` 的父进程不能加载 playwright

`all` 模式下 taro 构建**必卡**（两次 240s 超时、CPU 归零、0 html），单跑 34~68s 正常。
此前两次归因都不对：

| 曾经的判断 | 实际 | 结果 |
|---|---|---|
| 「同一进程连跑三端状态累积」→ 改独立子进程 | 部分正确但不够 | 仍卡 |
| 「`spawnSync` 阻塞事件循环」→ 改异步 `spawn` | 真实存在但不是本次根因 | 仍卡 |
| **父进程顶层 `import { chromium } from 'playwright'`** | ✅ 根因 | 改按需加载后 **2m03s 全绿** |

**判定实验**（`\.tmp/layer-probe.mjs`）：多包一层 node、但不加载 playwright，跑 taro → **99s 通过**。
说明「层数」和「父进程存活」都不是问题，**父进程里有什么**才是。

处置：`playwright` / `pngjs` / `pixelmatch` 全部改成像素关内的 `await import()`。
父进程只留 `spawn` + fs + babel parser，起完子进程就等。

**复跑（2026-10-24）**：`--target all --allow-miss taro:1`，端到端 **2m03s**

| target | 语法 | 类型 | 构建（attempts） | 像素 |
|---|---|---|---|---|
| react | 39 文件 | 0 错 | 6.3s（1 次） | 99.52% 19/19 |
| vue | 19 文件 | 0 错 | 6.6s（1 次） | 99.52% 19/19 |
| taro | 42 文件 | 0 错 | **33.8s（1 次）** | 99.38% 18/19（豁免 1） |

顺带补的两道保险（都不是本次根因，但留着）：
- 构建超时 900s → 180s/240s，让卡死尽快暴露；
- 失败自动**重试一次**，`attempts` 写进 `report.json` 并打日志（不静默重试）；
- 超时杀**整棵进程树**（`taskkill /T /F`）——`child.kill()` 只杀 shell，npm/taro 作为孙进程
  会继续持有 stdout 管道，导致 `close` 永不触发，「超时」形同虚设（实测超时后又被拖 4 分钟）。

### 12.9 门禁入口：按端跑是主路径（2026-10-25）

`--target all` 是便利入口，但**不能当唯一入口**：同一版代码里，`all` 下 taro 构建仍偶发卡死
（300s 超时 ×2、日志 279 字节、CPU 归零），而 `--target taro` 单跑一次过（构建 128.2s）。
卡点与「父进程里有什么」相关，属环境层，未彻底定位；**产物本身没问题**。

因此补了三条按端脚本，作为门禁主路径：

```bash
npm run codegen:verify:react   # 语法 39 / 类型 0 错 / 构建 11.1s 19 html / 像素 99.52% 19/19
npm run codegen:verify:vue     # 语法 19 / 类型 0 错 / 构建 9.9s  19 html / 像素 99.52% 19/19
npm run codegen:verify:taro    # 语法 42 / 类型 0 错 / 构建 128.2s 1 html / 像素 99.38% 18/19（豁免 1）
```

判定口径不变：taro 的 06 页（97.68%）是 `taro-button-core` 文本基线差 8px，属已知豁免，需显式
`--allow-miss taro:1` 才通过——不豁免时仍然会红，避免「默认容忍」。
