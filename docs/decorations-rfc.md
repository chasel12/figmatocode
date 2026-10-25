# 装饰层 DSL · 设计 RFC（B0 / T0.1 + T0.2）

> 目标：在**不引入 raw CSS 逃生舱**的前提下，把「现代 UI 视觉」从「物块堆叠」里解放出来。
> 本文是 `docs/expression-gap-plan.md` 批次 0 的交付物，也是 B1 的施工图。
> 结论先行：**真缺口只有 5 个，不是 12 个**；且**伪元素叠加层这条路必须放弃**（理由见 §2.2，是读代码读出来的，不是设计偏好）。

---

## 0. 一页结论

| 问题 | 答案 |
|---|---|
| 装饰要做几种 | 枚举 12 种，其中 **6 种已由 `effects` / `layoutGrids` 覆盖**，真缺口 **5 种** + 1 种并入 `border` |
| 能不能用 raw CSS | 不能。契约是封闭枚举，AI 无法注入任意字符串 |
| 能不能用 `::before/::after` 做叠加层 | **不能**。像素关的 reference DOM 是扁平的，伪元素层级语义与嵌套导出不一致（§2.2） |
| 唯一安全的实现面 | **`background-image` 多层叠加** + **`box-shadow` / `filter` 自包含链** |
| 需要改 `css-model.ts` 吗 | 需要，加 `CompiledPage.rules`，但**服务的是 B2 伪类**，不是 B1 装饰 |
| 像素关会不会被装饰打破 | 不会。基准图与出码共用同一份 `compiled`（§4 有代码引用）；但**跑关顺序有坑**（§4.3） |
| .fig 往返 | 6/12 精确、2/12 近似、4/12 `KNOWN_LOSS`（§6） |

---

## 1. 现状盘点：一半的「缺口」其实已经有了

先做减法。`docs/expression-gap-plan.md` §0 列了 10 种待做装饰，但 grep 实测后要划掉一半：

| 装饰 | 现状 | 证据 |
|---|---|---|
| 外发光 glow | **已有** `EffectKind.DROP_SHADOW`（offset=0 即发光） | `compile.ts:610-611` → `box-shadow: 0 0 B S c` |
| 内发光 inner-glow | **已有** `EffectKind.INNER_SHADOW` | `compile.ts:612-613` → `box-shadow: inset …` |
| 颗粒 noise | **已有** `EffectKind.NOISE` | `compile.ts:622-623` + `html.ts:113` `feTurbulence` |
| 纹理 texture | **已有** `EffectKind.TEXTURE` | `compile.ts:624-625` + `html.ts:121` `feFlood` |
| 毛玻璃 glass | **已有** `EffectKind.GLASS` | `compile.ts:626-631` → `backdrop-filter: blur saturate brightness` |
| 网格叠加 grid-overlay | **已有** `layoutGrids` | `compile.ts:483-504` → `repeating-linear-gradient` 叠层 |

所以「画布/出码表达力弱」的归因要修正：**弱的是「多层任意渐变」和「形状裁剪」，不是「效果种类」**。已有 8 类 effect + 4 型渐变 + 多层 fill + 网格，这套能力放在同类工具里不算薄。

真缺口（grep 0 命中，逐一确认）：

| 缺口 | 为什么现在做不了 |
|---|---|
| **多点渐变 mesh** | `fillLayerCss` 的 `GRADIENT_RADIAL` 硬编码 `circle at 50% 50%`（`compile.ts:87`），圆心不可移；`FillLayer` 无 `x/y` 字段（`types.ts:148-160`） |
| **聚光 spotlight** | 同上：需要「椭圆 + 圆心在画布外上方」，现有 fill 无法表达 |
| **暗角 vignette** | 同上：需要「中心透明 → 边缘有色」的反向 radial，`stops` 可表达颜色但圆心锁死 |
| **渐变描边 gradient-border** | `BorderSchema.color` 是单值 string（`types.ts:119-136`），无渐变 paint |
| **斜切角 diagonal-cut** | `clip-path` 已被 mask 与 POLYGON/STAR 占用（`compile.ts:511-518` 有互斥仲裁），无第二个裁剪通道 |
| **双色调 duotone** | 无 `filter` 颜色映射链（现有 `filter` 只装 `blur` 与 `url(#…)`） |

**5 个真缺口**，加 1 个「应并入 border 而非装饰」的 gradient-border，共 6 项工程量。

---

## 2. 三条硬约束（从代码里读出来的，不是拍的）

### 2.1 自包含：禁止依赖文档级 `<defs>`

现状已有一个违规案例：`NOISE`/`TEXTURE` 出码成 `filter: url(#fx-noise-<id>)`（`compile.ts:623,625`），而 `<filter>` 定义由 `collectFxDefs()` 注入 HTML。

实测注入点覆盖：

```
src/generator/html.ts:155        ← 注入
src/generator/reference.ts:165   ← 注入
src/generator/react.ts:91        ← 注入
src/generator/vue.ts:132         ← 注入
src/generator/taro-project.ts    ← ❌ 无（grep defs/<svg>/filter 全 0 命中）
src/generator/project.ts         ← ❌ 无（只写 scssFromPage）
```

**后果**：Taro 端 `noise` / `texture` 效果静默丢失（`url(#…)` 解析不到 → filter 无效）。这是已存在的缺陷，不是本轮引入的。

**约束**：新增装饰的产物必须是「一个选择器 + 自身声明」即可生效的 CSS。禁止新增 `url(#…)` 类跨文档引用。

> B1 处置：`noise`/`texture` 的 Taro 缺口**只报备不改**（进 `KNOWN_LOSS` + checklist 附表）。理由：改实现会动已通过像素关的 html 路径，风险 > 收益。自包含版本（`background-image: url(data:image/svg+xml,…)` 平铺 tile）列为 B1 可选项，不进验收。

### 2.2 层级一致性：禁止伪元素叠加层（**关键发现**）

像素关的基准图不是人工标注的，是 `buildReferenceDom(page, compiled, geometry)` 渲染出来的。而它的 DOM 是**扁平**的：

```ts
// src/generator/reference.ts:63-68
/**
 * 扁平渲染：所有节点作为根节点的直接子元素（DFS 顺序）。
 * 几何坐标为文档绝对坐标，若 DOM 嵌套则 position:absolute 的包含块
 * 会逐层累加导致坐标错误，因此 reference 侧必须扁平化。
 */
function renderFlat(page, classNames) {
  ...
  out.push(`${indent}<div class="${cls}"></div>`);   // 容器只出一个空 div
  for (const child of container.children) emit(child, depth + 1);  // 子节点是兄弟，不是子元素
}
```

于是：

| 机制 | reference（扁平） | 导出（嵌套） | 一致？ |
|---|---|---|---|
| 节点自身 `background-image` | 画在自己身上，兄弟节点后绘制 → 在上 | 画在自己身上，子元素后绘制 → 在上 | ✅ 语义相同 |
| 节点自身 `box-shadow`/`filter`/`border` | 自包含 | 自包含 | ✅ |
| 节点 `::after` 叠加层 | 空 div 的伪元素，**被后续兄弟节点盖住** | 伪元素在子元素之上（`position:absolute` + 后绘制） | ❌ **不一致** |

**结论**：装饰只能做「节点自身的视觉」，不能做「盖在子节点之上的叠加层」。这条约束把 `vignette` / `spotlight` 的实现方式从「伪元素遮罩」改判为「`background-image` 最底层之上的叠加层」——而后者恰好语义正确：背景层在自身背景色之上、子元素之下。

> 副产品：`CompiledPage.rules` 这个扩展点对 B1 **不需要**，只有 B2（`:hover` 等伪类，作用于节点自身、不涉及层级）才需要。B1 的风险面因此显著缩小。

### 2.3 可降级：.fig 无对应字段时必须显式报备

`@open-pencil/kiwi` 无 `pluginData` / `sharedPluginData` 字段（dist 内 0 命中），`FigEffect` 只能承载 `type/visible/color/offset/radius/spread/blendMode`（`src/fig/paint.ts:287-305`）。

**约束**：每个装饰必须在三处有确定行为——`fig/export.ts` 映射或丢弃、`fig/import.ts` 反向或忽略、`KNOWN_LOSS` 登记一行。禁止「静默丢失」。

---

## 3. 装饰清单与三列对照

`K` = 装饰类型标识；`强` = 强度 0-1。

### 3.1 需要新增的 5 种

| K | 语义 | CSS 实现（自包含） | Konva 近似 | .fig 往返 |
|---|---|---|---|---|
| `SPOTLIGHT` | 顶部/单点聚光 | `radial-gradient(ellipse <rx> <ry> at <x>% <y>%, c 0%, transparent <stop>%)` 插到 `background-image` **最上层** | 单 radial 可精确（`Canvas.tsx:219-223` 已有 radial 通道）；椭圆靠 `EndRadius` 取长边近似 | `GRADIENT_RADIAL` fill，圆心锁 50%/50% → **近似**（位置丢失，报备） |
| `VIGNETTE` | 四角压暗 | `radial-gradient(ellipse at center, transparent <in>%, c <out>%)` 叠最上层 | 同上，可近似 | 无对应 → **KNOWN_LOSS** |
| `MESH_GRADIENT` | 多点混色（2~4 点） | N 条 `radial-gradient(circle at X% Y%, c 0%, transparent R%)` 按点序叠层 | 单节点只能 1 个 gradient fill（`Canvas.tsx:210-223` 单通道）→ **只画最强一点** + 角标提示 | Figma 无 mesh → **KNOWN_LOSS** |
| `DIAGONAL_CUT` | 斜切角（1~4 角） | 复用 `clip-path: polygon(...)`，与既有 mask/shape 裁剪**仲裁**（已有通道，`compile.ts:511-518`） | 需新增 `clipFunc`（当前未用）→ 可精确 | 无对应 → **KNOWN_LOSS** |
| `DUOTONE` | 双色调映射 | `filter: grayscale(1) sepia(1) hue-rotate(…) saturate(…)` 链，与既有 `filter` 串接 | Konva `Filters.Grayscale` + 近似 → 方向对 | 无对应 → **KNOWN_LOSS** |

### 3.2 并入 `border` 而非装饰的 1 种

`GRADIENT_BORDER` 单独立项是错的，理由三条：

1. **Figma 原生支持渐变描边** → 走 `BorderSchema.fill?: FillLayer` 可**精确往返**，走装饰只能 `KNOWN_LOSS`
2. **Konva 原生支持** `strokeLinearGradientColorStops` → 画布可**精确**，不是近似
3. **CSS 侧反而是最难的一层**，但可解，且不需要伪元素：

```css
/* 有渐变描边时：既有填充层全部裁到 padding-box，最后追加一条 border-box 的渐变层 */
border: 2px solid transparent;
background-image: <既有 fills…>, linear-gradient(<angle>deg, <stops>);
background-origin: padding-box, …, border-box;
background-clip: padding-box, …, border-box;
```

透明 border 让底层渐透露出来，圆角由 `border-radius` 正常裁切。**~15 行改动，无新机制，无层级风险。**

> 决策：`BorderSchema.fill` 归入 **B1**，但它不是「装饰」，是「描边补全」。改动面比装饰小得多，先做。

### 3.3 已覆盖、不重复做的 6 种

`glow` / `inner-glow` / `noise` / `texture` / `glass` / `grid-overlay` —— 只补**面板语义预设**（一个下拉「添加效果预设」），不新增 AST 字段。这是纯 UI 改动，~40 行，可放 B1 尾部。

---

## 4. 像素口径（T0.2）

### 4.1 结论：装饰不会破像素关，因为基准图与出码同源

```
scripts/build-pages.ts:76   referenceHtml = generateReferenceHtml(page, compiled, geometry)
                            ↓ 写 dist/pages/<slug>/reference.html
scripts/screenshot.mjs:68   截 reference.html → reference.png
                            ↓
scripts/codegen-verify.mjs:453  比对 构建产物截图 vs reference.png（pixelmatch ≥98%）
```

`compiled` 是同一个对象、同一份 `compileDeclarations` 产物。装饰只要写进 `CompiledNode.css`，**基准图和导出同时变化**，差值不增。

reference 侧会剥离布局属性（`width/height/display/flex*/gap/align-items/justify-content/min-*/max-*`，`reference.ts:27-41`），但**保留** `background-image` / `box-shadow` / `filter` / `border` / `clip-path` / `mask` —— 正好是装饰要用的全部属性。

### 4.2 验收口径（新增，写进 checklist）

| 项 | 口径 |
|---|---|
| 像素关 | 装饰上线后，三端仍须 ≥98%，**且与装饰上线前的差值变化 ≤0.2pp**（防止「基准图和导出一起错」的假绿） |
| 画布一致性 | 画布无法精确渲染的装饰（`MESH_GRADIENT`）必须在右栏标注「画布近似」角标，沿用「色散置灰」先例（`PropertyPanel.tsx:1370`） |
| 出码可验证 | 每个装饰必须有断言：`index.scss` 里出现预期声明 + `reference.html` 里出现同一份声明 |

### 4.3 跑关顺序的坑（**必须写进 HANDOFF**）

`codegen:verify` **只读** `dist/pages/<slug>/reference.png`，不会重算。加装饰后若直接跑 `npm run codegen:verify:react`，会拿**旧基准图**比对**新导出** → 全端假 FAIL。

正确顺序：

```bash
npm run pages && npm run shot && npm run codegen:verify:react
#                  ↑ 必须重截，否则基准图是上一版的
```

`npm run e2e`（= `pages && shot && diff`）已包含重截，但它跑的是画布 diff，不是三端出码关。

---

## 5. 数据结构与注入点

### 5.1 AST（`src/schema/types.ts`）

```ts
/** 装饰类型：封闭枚举，AI 只能选不能写 */
export type DecorationKind =
  | 'SPOTLIGHT'
  | 'VIGNETTE'
  | 'MESH_GRADIENT'
  | 'DIAGONAL_CUT'
  | 'DUOTONE';

export interface MeshPoint {
  /** 相对节点宽高的百分比 0-100 */
  x: number;
  y: number;
  /** 半径占长边百分比 0-100 */
  radius: number;
  color: string;
}

export interface DecorationSpec {
  kind: DecorationKind;
  /** 缺省 true */
  visible?: boolean;
  /** 强度 0-1（映射到 alpha 或 filter 幅度），缺省 1 */
  intensity?: number;
  /** 主色 */
  color?: string;
  /** 次色（duotone 高光色） */
  color2?: string;
  /** mesh 点位，2~4 个；kind=MESH_GRADIENT 时必填 */
  points?: MeshPoint[];
  /** spotlight 光源位置（百分比，可负 = 画布外） */
  at?: { x: number; y: number };
  /** spotlight/vignette 衰减起止（百分比） */
  stop?: { from: number; to: number };
  /** diagonal-cut 切角像素（单值或四角 [tl,tr,br,bl]） */
  cut?: number | [number, number, number, number];
}

// StyleSchema 内新增
decorations?: DecorationSpec[];
```

**为什么不用 `Record<string, any>`**：`ts-json-schema-generator` 会把它变成 `additionalProperties: true` 的开放对象，等于给 AI 开了注入口。枚举 + 具名可选字段是唯一安全形态。

### 5.2 编译（`src/compiler/compile.ts`）

新增一个纯函数，在 `compileDeclarations` 末尾调用：

```ts
/** 装饰出码：只写自身声明，禁止伪元素/文档级引用（RFC §2） */
function compileDecorations(S: StyleSchema, node: UINode, css: CSSDecl): void {
  const decos = (S.decorations ?? []).filter((d) => d.visible !== false);
  if (!decos.length) return;
  // 背景层类：按数组序 prepend 到 background-image（首项在最上层）
  // 裁剪类：clip-path 仲裁（已有 clip-path 时不覆写，报备）
  // filter 类：append 到既有 filter 链
}
```

插入点：`compile.ts` 中 `background-image` 组装之后（第 504 行 `}` 之后）、`border` 之前。因为 `background-image` 已完成 fills + layoutGrids 两轮拼装，此处 prepend 才能保证装饰在**最上层**。

### 5.3 出码（`src/compiler/css-model.ts`）

B1 **不需要**改。B2 需要：

```ts
export interface CompiledRule {
  selector: string;   // 完整选择器，已含 .class 前缀
  decls: CSSDecl;
}
export interface CompiledPage {
  pageId: string;
  viewport: { width: number; height: number };
  nodes: CompiledNode[];
  /** B2 交互态 / B3 媒体查询产出的附加规则 */
  rules?: CompiledRule[];
}
```

`scssFromPage` 在 nodes 之后追加 `rules` 块 → 六个出码器（html/project/prototype/react/vue/taro-project）一次全支持，因为它们都只调 `scssFromPage(compiled)`。

> 这条是 B0 最重要的结构性结论：**伪类不需要碰任何一个出码器**。

### 5.4 AI 契约（`src/editor/ai/`）

`AiStyleSpec` 必须同批加 `decorations?: DecorationSpec[]`（复用同一 interface，不复制字段），否则 `--additional-properties` 会拒绝 AI 输出 → 等于做了没做。

同步三件：`ai/types.ts` 加字段 → `ai/specToPage.ts` 透传 → `npm run ai:schema` 重生成 JSON Schema。验收：`ai-matrix` 离线档仍 10/10，且新 schema 里 `decorations` 的 `kind` 是 `enum` 而非 `string`。

---

## 6. .fig 往返矩阵

| K | export | import | 归类 |
|---|---|---|---|
| `SPOTLIGHT` | `GRADIENT_RADIAL` fill 追加一层 | 反向识别（圆心在 50/50 且外层透明） | **近似**，报备「位置丢失」 |
| `VIGNETTE` | 丢弃 | 忽略 | `KNOWN_LOSS` |
| `MESH_GRADIENT` | 丢弃（或降级为单 radial） | 忽略 | `KNOWN_LOSS` |
| `DIAGONAL_CUT` | 丢弃 | 忽略 | `KNOWN_LOSS` |
| `DUOTONE` | 丢弃 | 忽略 | `KNOWN_LOSS` |
| `border.fill` | `strokes[0].paint` 写渐变 | 反向读渐变 paint | **精确** |

`KNOWN_LOSS` 落点：`src/fig/export.ts` 现有报备表 + `docs/figma-parity-checklist.md` 附表各一行。

---

## 7. B1 施工顺序与工作量（修订版）

原计划 `docs/expression-gap-plan.md` §4 给 B1 估 5~6 天。按本文修订后：

| 序 | 任务 | 人日 | 理由 |
|---|---|---|---|
| 1 | `border.fill`（渐变描边） | 0.5 | 三条链路都原生支持，只有 CSS 一层要写 |
| 2 | `SPOTLIGHT` + `VIGNETTE`（共用 radial 叠层代码） | 1.0 | 同一机制，参数不同 |
| 3 | `MESH_GRADIENT` | 1.0 | 多点叠层 + 画布角标 |
| 4 | `DUOTONE` | 0.5 | filter 链，纯映射 |
| 5 | `DIAGONAL_CUT` + clip-path 仲裁 | 1.0 | 要处理与 mask/形状裁剪的冲突 |
| 6 | AI 契约同步 + 断言 | 0.5 | 强制同批 |
| 7 | .fig 双向 + KNOWN_LOSS | 0.5 | 4 项进 LOSS，1 项近似 |
| 8 | 面板「效果预设」下拉（补 6 种已有能力的语义入口） | 0.5 | 纯 UI |
| | **合计** | **5.5** | 与原估 5~6 天一致，但**内容不同**：不是「建装饰层」，是「补 5 个缺口 + 1 个描边」 |

B2 / B3 不受本文影响，仍按原计划。

---

## 8. 风险与待授权项

| 风险 | 处置 |
|---|---|
| 破 `docs/plan.md` §1 铁律（`schema/types.ts` 与 `compile.ts` 零改动） | **必须授权**。本轮全部改动集中在这两个文件，无法规避 |
| `background-image` 层序错误导致 fills 被遮 | 断言：装饰上线前后，同一节点的 fills 层数 +1，且新层在 `background-image` 首位 |
| `clip-path` 三方仲裁（mask / POLYGON / DIAGONAL_CUT） | 显式优先级：形状 > mask > 装饰，被压制时进报备，不静默 |
| 画布 `MESH_GRADIENT` 只画一点，用户以为出码也这样 | 右栏角标 + 画布 hover 提示「多点渐变仅导出生效」 |
| Taro 端 `noise`/`texture` 已存在的 defs 缺失 | 本轮**只报备**，列入 `KNOWN_LOSS`，不动已过像素关的路径 |

---

## 附：本 RFC 的代码证据索引

| 结论 | 文件:行 |
|---|---|
| `CompiledPage` 结构 / `scssFromPage` 是六出码器唯一样式出口 | `src/compiler/css-model.ts:9-24`；`project.ts:21`、`prototype.ts:173`、`react.ts`、`vue.ts`、`taro-project.ts:87` |
| radial 圆心锁死 50/50 | `src/compiler/compile.ts:87` |
| `FillLayer` 无圆心字段 | `src/schema/types.ts:148-160` |
| `BorderSchema.color` 单值 | `src/schema/types.ts:119-136` |
| `clip-path` 已有仲裁 | `src/compiler/compile.ts:511-518` |
| `background-image` 拼装完成点 | `src/compiler/compile.ts:465-504` |
| `filter` 链组装点 | `src/compiler/compile.ts:607-635` |
| fx defs 注入点（taro 缺失） | `html.ts:155`、`reference.ts:165`、`react.ts:91`、`vue.ts:132`；`taro-project.ts` 无 |
| reference DOM 扁平化 | `src/generator/reference.ts:56-68` |
| reference 剥离的属性白名单 | `src/generator/reference.ts:27-41` |
| 基准图链路 | `build-pages.ts:76,82` → `screenshot.mjs:68` → `codegen-verify.mjs:453` |
| Konva 单 gradient fill 通道 | `src/editor/Canvas.tsx:210-223` |
| 色散置灰先例（面板「无 CSS 原生对应」tip） | `src/editor/PropertyPanel.tsx:1370` |
| `FigEffect` 承载字段上限 | `src/fig/paint.ts:287-305` |
| kiwi 无 pluginData | `@open-pencil/kiwi` dist grep 0 命中 |

---

## 附 2：实施状态（2026-10-25）

| 项 | 状态 | 落点 |
|---|---|---|
| `CompiledPage.rules` 扩展 | **未做，也不需要**（B1） | 留给 B2 伪类；装饰全走「节点自身声明」 |
| `BorderSchema.fill` 渐变描边 | ✅ 三端精确 | `compile.ts:applyGradientBorder` / `Canvas.tsx:strokeLayerProps` / `paint.ts:fillToPaint`+`strokesToStyle` / `export.ts` |
| `SPOTLIGHT` / `VIGNETTE` / `MESH_GRADIENT` | ✅ 出码 + 画布近似 + 面板 | `compile.ts:compileDecorations` / `Canvas.tsx:decorationOverlays` / `PropertyPanel.tsx` 装饰分区 |
| `DIAGONAL_CUT` / `DUOTONE` | ✅ 出码；画布不预览（面板标注） | 同上 |
| AI 契约 | ✅ 同批完成（`AiBorderSpec.gradient` + `AiStyleSpec.decorations`） | `ai/types.ts` + `specToPage.ts` + `ai:schema` |
| `.fig` 往返 | `border.fill` 精确；5 种装饰全 `KNOWN_LOSS`（`fig-check.ts` 显式 `delete`） | `fig-check.ts:normalizeStyle` |
| 测试 | ✅ 28 例 | `tests/b1-gradient-border.test.ts`（12）+ `tests/b1-decorations.test.ts`（16） |

**实施中修正了 RFC 的两处判断**：

1. §5.2 原写「装饰插在 `background-image` 拼装之后（504 行）」。实际必须更晚，放到 `S.opacity` 之后 ——
   否则 `DUOTONE` 的 `filter` 会被 effects 块（`compile.ts:635`）整体覆写。
2. §3.2 曾担心渐变描边要靠伪元素。实际不需要：`background-clip: padding-box…, border-box` 一条声明即可，
   且能保住 `border-radius`。这让 B1 **完全不用碰 `CompiledPage`**，风险面比 RFC 预估更小。
