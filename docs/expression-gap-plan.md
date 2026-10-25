# 表达力补账：工程量与任务拆分（2026-10-25）

> 背景：项目产出的 UI 视觉丰富度明显低于「LLM 直接写代码」。根因不是组件化，而是
> **AST 是「属性闭包」**（Figma 属性集的笛卡尔积），LLM 的搜索空间是 CSS 规范全集。
> 本文只算账：补表达力要动多少地方、分几批、每批的验收是什么。

## 0. 先修正一个错误建议

上一轮我提的「raw CSS 逃生舱」（`raw: { css?, html? }`）**有硬伤**：

- `src/editor/Canvas.tsx`（2642 行，Konva）**渲染不了 `::before`/`::after`**，
  也无法执行任意 CSS。一旦允许任意 CSS，画布与导出立刻不一致 → 「画布↔出码 95%」这条承诺破。
- .fig 往返无从映射 → 只能整块进 KNOWN_LOSS。
- AI 契约里多一个「任意字符串」字段 = 给模型开了一个可以注入任意 CSS 的口子，
  确定性卖点直接失效。

**正确形态：装饰层 DSL**——枚举 8~12 种高频装饰，每种同时实现三件事：
① CSS 精确实现 ② Konva 近似实现 ③ .fig 降级策略。
表达力有上界（枚举），但画布、导出、往返三边一致，像素关仍可兜。

## 1. 单属性成本模型（为什么"加一个字段"不便宜）

每加一个样式能力要动 **7 处**：

| # | 位置 | 行数 | 说明 |
|---|---|---|---|
| 1 | `src/schema/types.ts` | 2~5 | 加字段 |
| 2 | `src/compiler/compile.ts` | 5~20 | `compileDeclarations()` 里加一段 |
| 3 | `src/editor/Canvas.tsx` | 10~30 | Konva 渲染（最费时，经常要"近似"） |
| 4 | `src/editor/PropertyPanel.tsx` | 20~40 | 面板控件（1912 行） |
| 5 | `src/editor/ai/types.ts` + `specToPage.ts` + `npm run ai:schema` | 5~15 | **AI 契约比 AST 窄，不同步 = 白做** |
| 6 | `src/fig/export.ts` + `import.ts` + `fig-check` 归一化白名单 | 10~25 | 往返 |
| 7 | 测试 + 三端四关 + fig 三关 | — | 每项都要重跑 |

**≈ 60~130 行真实代码 / 项**；简单项 0.5~1.5 人日，Grid / 伪元素级 2~3 人日。

## 2. 三种做法的总量对比

| 方案 | 范围 | 人日 | 风险 |
|---|---|---|---|
| A. raw CSS 逃生舱 | 1 字段 + 导出直插 | 3~5 | ❌ 画布不可见、往返丢失、AI 可注入任意 CSS |
| **B. 装饰层 DSL（推荐）** | 10 种装饰 × 三端映射 | **12~18** | 中：每种都要画布近似 |
| C. 逐属性补 CSS 闭包 | grid / hover / sticky / 伪元素 / transform 组合 | 25~35 | 高：.fig 往返要全扩，部分无原语 |

## 3. 任务清单

### 批次 0 · 决策与探针（1~2 天）✅ 已完成

产出：**`docs/decorations-rfc.md`**（装饰层 DSL 设计 RFC）。

| ID | 任务 | 结果 |
|---|---|---|
| T0.1 | 装饰 DSL RFC：枚举 + CSS/Konva/.fig 三列对照 | 完成。**12 种里 6 种已由 `effects`/`layoutGrids` 覆盖，真缺口只有 5 种 + 1 种应并入 `border`** |
| T0.2 | 像素口径探针 | 完成。基准图与出码同源（`buildReferenceDom` 复用同一 `compiled`），装饰进 CSS 后差值不增；但**跑关顺序有坑**（见下） |

**B0 的三条硬约束**（读代码得出，非设计偏好）：

1. **自包含**：禁止 `filter: url(#…)` 类跨文档引用。已发现既有违规——`taro-project.ts` 不注入 fx defs，Taro 端 noise/texture 静默丢失。
2. **禁止伪元素叠加层**：像素关的 reference DOM 是**扁平**的（`reference.ts:63-68`），`::after` 的层级语义与嵌套导出不一致。装饰只能做「节点自身视觉」。
3. **必须可降级**：`.fig` 无对应字段时进 `KNOWN_LOSS`，禁止静默丢弃。

**跑关顺序（新坑）**：`codegen:verify` 只读 `dist/pages/<slug>/reference.png` 不重算。加装饰后必须 `npm run pages && npm run shot` 再跑 verify，否则拿旧基准图比新导出 → 全端假 FAIL。

### 批次 1 · 装饰层（5.5 天，5 种缺口 + 1 项描边）

> 内容已按 RFC 修订：不是「从零建装饰层」，而是「补 5 个真缺口 + 补渐变描边」。

| ID | 任务 | 验收 |
|---|---|---|
| T1.0 | `BorderSchema.fill?: FillLayer` → CSS 用 `background-clip: padding-box…, border-box` 叠层；Konva `strokeLinearGradientColorStops`；.fig 渐变 `strokes` | 渐变描边三端精确，.fig 往返精确 |
| T1.1 | `StyleSchema.decorations?: DecorationSpec[]`（`SPOTLIGHT/VIGNETTE/MESH_GRADIENT/DIAGONAL_CUT/DUOTONE`） | tsc 0 错；旧 JSON 无字段行为不变 |
| T1.2 | `compileDecorations()` 在 `background-image` 拼装后（`compile.ts:504` 后）注入 | 单页产物含对应声明，且新层在 `background-image` 首位 |
| T1.3 | Canvas 近似（radial 叠层 / `clipFunc` / filter 链），`MESH_GRADIENT` 标「画布近似」角标 | 画布肉眼可见，角标生效 |
| T1.4 | PropertyPanel 加「装饰」折叠区 + 「效果预设」下拉（补 6 种已有能力的语义入口） | 改参数画布实时变 |
| T1.5 | AI 契约同步（`AiStyleSpec` 复用同一 `DecorationSpec` + `specToPage` + `npm run ai:schema`） | schema 里 `kind` 是 `enum`；`ai-matrix` 离线 10/10 |
| T1.6 | .fig 导出：`SPOTLIGHT`→radial fill（近似）、其余 4 种进 `KNOWN_LOSS` | 往返关不失败，报备非静默 |
| T1.7 | .fig 导入：反向识别 spotlight，其余忽略并打印原因 | 报告有降级条目 |
| T1.8 | 门禁：fig 三关 + 三端四关 | 像素 ≥98%，且与 B1 前差值变化 ≤0.2pp；taro 豁免仍 1 |

### 批次 2 · 交互态（5~6 天，收益最高）

| ID | 任务 | 验收 |
|---|---|---|
| T2.1 | `states?: { hover?, active?, focus?, disabled? }`，**只允许覆盖样式子集，禁止改布局** | 越界写布局被闸门拒 |
| T2.2 | compile 出 `:hover/:focus-visible/:active/:disabled` | 产物含伪类，且类名唯一（已满足） |
| T2.3 | 画布不做交互态预览，面板标注「预览需导出」 | 文档说明，不假装支持 |
| T2.4 | .fig：Figma 无交互态原语 → 全部 KNOWN_LOSS 报备 | fig 关仍 PASS |
| T2.5 | AI 契约允许 hover 覆盖 | 契约校验通过 |

### 批次 3 · 布局表达力（8~12 天）

| ID | 任务 | 说明 |
|---|---|---|
| T3.1 | CSS Grid | Figma 有 grid 但语义不同 → 导出 Figma 时降级 flex，导入侧不反推 |
| T3.2 | transform 组合（scale/rotate/translate + 任意 origin） | 画布可渲染，往返靠 `transform` 近似 |
| T3.3 | `position: sticky / fixed` | 画布无概念 → 仅导出侧，面板标「仅出码」 |

**不做**：任意 SVG path（等于重写矢量编辑器）、`::selection` 之类长尾伪元素。

## 4. 总账

| 范围 | 人日 | 覆盖的"单薄感" |
|---|---|---|
| 批次 0 + 1 | **6.5 天**（1 + 5.5） | ≈45%。装饰补的是「高级感」的**渐变侧**（多点/聚光/暗角/渐变描边）；颗粒/毛玻璃/发光本来就有 |
| + 批次 2 | **+5~6 天** | 让界面"活"（悬停/焦点）——**这是收益最高的一批**，因为没有交互态的 UI 一眼就是"静态稿" |
| + 批次 3 | **+8~12 天** | 复杂栅格与位移 |
| 全量 | **19.5~24.5 天** | — |

> B0 修正了原估的两个数：① 装饰缺口从 10 种缩到 5 种（6 种已有）；② 因此「B1 覆盖 80% 单薄感」不成立，改判 ≈45%，**真正的杠杆在 B2 交互态**。建议排期时把 B2 提前到 B1 之后立刻做，而不是等 B3。

## 5. 三条风险（必须先决策）

1. **破铁律**：plan §1 写明 `schema/types.ts` 与 `compile.ts` **零改动**。本方案必然要动，
   属里程碑外新增范围，需要在 §10.4 报备并获授权。
2. **「95%」要重新定义**：一旦画布只能"近似"装饰，`画布↔出码` 的一致性口径必须说清是
   「画布 vs 代码」还是「代码 vs 参考图」。否则数字会变成自欺。
3. **AI 契约最容易漏**：`AiStyleSpec` 比 `StyleSchema` 窄。只加 AST 字段不同步契约，
   AI 依旧表达不出来——**这是本方案最可能"做完等于没做"的地方**，T1.5 必须和 T1.2 同批完成。
