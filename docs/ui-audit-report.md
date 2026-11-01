# UI 形态审计报告

> 生成时间 2026-11-01 14:51:06　·　检测器 11 个　·　页面 81 个
>
> `mall` 有两列：**存量**是已存盘的 `project.json`（规则改动对它无效），**重跑**是补跑一遍 `normalizePage` 的结果。两列之差 = 现有 normalize 能修多少。
>
> 本报告**只检测不修复**。它回答「现在生成出来的东西有哪些坏形态」，
> 不回答「怎么修」——修不修、写哪条 normalize，看完全部数字再定。

## 一、扫描范围

| 组 | 页面 | 节点 | 说明 |
|---|---|---|---|
| demo | 19 | 596 | demo（人工设计，误报防线） |
| mall | 6 | 537 | mall 存量（已存盘，规则改动对它无效） |
| mall+ | 6 | 537 | mall 重跑（补跑 normalizePage，等于「现在重新生成」） |
| draft | 50 | 1799 | draft（模型原始输出 → 同管线） |

## 二、按检测器

| 检测器 | 严重度 | demo | mall 存量 | mall 重跑 | draft | 合计 | 判定 |
|---|---|---|---|---|---|---|---|
| `badge-inline` | bug | 0 | 0 | 0 | 2 | 2 | 仅 AI 产物命中，可信 |
| `vector-ratio` | bug | 0 | 0 | 0 | 2 | 2 | 仅 AI 产物命中，可信 |
| `empty-frame` | taste | 0 | 0 | 0 | 0 | 0 | 产物里无此形态 |
| `abs-no-size` | bug | 0 | 0 | 0 | 0 | 0 | 回归基线（normalizeAbsolute 规则 3） |
| `fixed-occlude` | bug | 0 | 1 | 0 | 0 | 1 | 仅 AI 产物命中，可信 |
| `text-invisible` | bug | 0 | 0 | 0 | 0 | 0 | 回归基线（normalizeInvisibleText） |
| `gap-scatter` | taste | 0 | 0 | 0 | 1 | 1 | 仅 AI 产物命中，可信 |
| `flat-hierarchy` | taste | 0 | 0 | 0 | 11 | 11 | 仅 AI 产物命中，可信 |
| `text-clip` | taste | 0 | 0 | 0 | 0 | 0 | 产物里无此形态 |
| `state-collapse` | bug | 0 | 0 | 0 | 1 | 1 | 仅 AI 产物命中，可信 |
| `template-leak` | bug | 0 | 0 | 0 | 0 | 0 | 产物里无此形态 |

**0 命中有两种含义，必须分开看：**

- **回归基线**（有 normalize 负责修，0 命中说明那条修复在跑）：`abs-no-size`, `text-invisible`
- **产物里真没有这种形态**（没有 normalize 负责）：`empty-frame`, `text-clip`, `template-leak`

两者都不是「检测器没跑」：`scanPages` 会记录每个检测器是否被调用，
从未调用的会出现在下面「未调用」清单里 —— 那才是真的接错了。

## 三、按页面

### demo

| 页面 | 节点 | bug | taste | 主要命中 |
|---|---|---|---|---|
| 01 登录 | 20 | 0 | 0 | — |
| 02 注册 | 22 | 0 | 0 | — |
| 03 商品列表 | 53 | 0 | 0 | — |
| 04 商品详情 | 24 | 0 | 0 | — |
| 05 订单列表 | 43 | 0 | 0 | — |
| 06 订单详情 | 35 | 0 | 0 | — |
| 07 个人中心 | 45 | 0 | 0 | — |
| 08 设置 | 31 | 0 | 0 | — |
| 09 Dashboard | 50 | 0 | 0 | — |
| 10 表单页 | 23 | 0 | 0 | — |
| 11 卡片列表 | 41 | 0 | 0 | — |
| 12 页签页面 | 32 | 0 | 0 | — |
| 13 绝对定位页 | 13 | 0 | 0 | — |
| 14 长文本页面 | 14 | 0 | 0 | — |
| 15 图片密集页面 | 26 | 0 | 0 | — |
| 16 多层嵌套页面 | 22 | 0 | 0 | — |
| 17-样片-图层种类 | 24 | 0 | 0 | — |
| 18-样片-参数矩阵 | 60 | 0 | 0 | — |
| 19-样片-原型跳转 | 18 | 0 | 0 | — |

### mall

| 页面 | 节点 | bug | taste | 主要命中 |
|---|---|---|---|---|
| 商品详情 | 86 | 1 | 0 | fixed-occlude×1 |
| 首页 | 100 | 0 | 0 | — |
| 分类 | 97 | 0 | 0 | — |
| 购物车 | 96 | 0 | 0 | — |
| 订单确认 | 68 | 0 | 0 | — |
| 我的 | 90 | 0 | 0 | — |

### mall+

| 页面 | 节点 | bug | taste | 主要命中 |
|---|---|---|---|---|
| 首页 | 100 | 0 | 0 | — |
| 分类 | 97 | 0 | 0 | — |
| 商品详情 | 86 | 0 | 0 | — |
| 购物车 | 96 | 0 | 0 | — |
| 订单确认 | 68 | 0 | 0 | — |
| 我的 | 90 | 0 | 0 | — |

### draft

| 页面 | 节点 | bug | taste | 主要命中 |
|---|---|---|---|---|
| list-message | 75 | 2 | 0 | badge-inline×2 |
| ai-ab-diancai/A-draft | 97 | 1 | 1 | vector-ratio×1 gap-scatter×1 |
| btn-icon | 14 | 0 | 1 | flat-hierarchy×1 |
| data-progress | 6 | 0 | 1 | flat-hierarchy×1 |
| form-checkbox | 26 | 0 | 1 | flat-hierarchy×1 |
| form-select | 27 | 1 | 0 | state-collapse×1 |
| layout-hero | 8 | 0 | 1 | flat-hierarchy×1 |
| layout-masonry | 26 | 0 | 1 | flat-hierarchy×1 |
| list-divider | 44 | 0 | 1 | flat-hierarchy×1 |
| nav-badge-icon | 9 | 0 | 1 | flat-hierarchy×1 |
| overlay-tooltip | 28 | 1 | 0 | vector-ratio×1 |
| state-empty | 7 | 0 | 1 | flat-hierarchy×1 |
| state-error | 7 | 0 | 1 | flat-hierarchy×1 |
| state-skeleton | 19 | 0 | 1 | flat-hierarchy×1 |
| state-success | 6 | 0 | 1 | flat-hierarchy×1 |
| btn-fab | 68 | 0 | 0 | — |
| btn-variants | 7 | 0 | 0 | — |
| card-badge | 49 | 0 | 0 | — |
| card-grid | 41 | 0 | 0 | — |
| card-hscroll | 43 | 0 | 0 | — |
| card-media | 45 | 0 | 0 | — |
| card-product | 36 | 0 | 0 | — |
| data-price | 20 | 0 | 0 | — |
| data-rating | 12 | 0 | 0 | — |
| data-stat | 22 | 0 | 0 | — |
| data-timeline | 40 | 0 | 0 | — |
| form-input | 23 | 0 | 0 | — |
| form-search | 18 | 0 | 0 | — |
| form-slider | 13 | 0 | 0 | — |
| form-stepper | 23 | 0 | 0 | — |
| form-switch | 25 | 0 | 0 | — |
| layout-actionbar | 44 | 0 | 0 | — |
| layout-carousel | 10 | 0 | 0 | — |
| layout-split | 45 | 0 | 0 | — |
| list-grouped | 96 | 0 | 0 | — |
| list-order | 65 | 0 | 0 | — |
| list-setting | 31 | 0 | 0 | — |
| nav-breadcrumb | 67 | 0 | 0 | — |
| nav-header | 21 | 0 | 0 | — |
| nav-segmented | 61 | 0 | 0 | — |
| nav-tabbar | 59 | 0 | 0 | — |
| overlay-menu | 21 | 0 | 0 | — |
| overlay-modal | 34 | 0 | 0 | — |
| overlay-sheet | 56 | 0 | 0 | — |
| overlay-toast | 49 | 0 | 0 | — |
| ai-ab-diancai/C-brutalist-draft | 21 | 0 | 0 | — |
| ai-ab-ev-scooter/A-draft | 61 | 0 | 0 | — |
| ai-ab-ev-scooter-verify/A-draft | 61 | 0 | 0 | — |
| ai-ab-manga/A-draft | 92 | 0 | 0 | — |
| ai-brutalist/A-draft | 21 | 0 | 0 | — |

## 四、bug 级明细

| 检测器 | 页面 | 节点 | 说明 |
|---|---|---|---|
| `fixed-occlude` | 商品详情 | 商品详情/底部导航 | 底栏高 64px，根容器 padding-bottom 只有 0px，差 64px 内容被遮 |
| `state-collapse` | form-select | 选择项与下拉面板/下拉面板/Vector 488 | 4 行同构列表里有 4 行各带一个「check」图标，选中项无法区分 |
| `badge-inline` | list-message | 消息列表/消息列表/消息行（含未读） 1/未读角标 | 数字角标「1」18×18 参与横排，未脱流挂角 |
| `badge-inline` | list-message | 消息列表/消息列表/消息行（含未读） 2/未读角标 | 数字角标「2」18×18 参与横排，未脱流挂角 |
| `vector-ratio` | overlay-tooltip | 帮助气泡提示/内容区/操作区/帮助按钮组/气泡小三角 | viewBox 24×24 渲染成 12×6，横向偏差 100% |
| `vector-ratio` | ai-ab-diancai/A-draft | 点菜小程序/状态栏/系统图标/电量 | viewBox 24×24 渲染成 18×14，横向偏差 29% |

## 五、taste 级分布

### `flat-hierarchy`（11 条）

- btn-icon · root · 只有 1 档字号：18×1
- data-progress · root · 只有 2 档字号：13×1 20×1
- form-checkbox · root · 只有 2 档字号：14×6 20×2
- layout-hero · root · 只有 2 档字号：14×2 20×1
- layout-masonry · root · 只有 2 档字号：14×6 17×1
- list-divider · root · 只有 2 档字号：15×8 17×1
- nav-badge-icon · root · 只有 1 档字号：12×2
- state-empty · root · 只有 2 档字号：14×2 18×1
- …… 另有 3 条

### `gap-scatter`（1 条）

- ai-ab-diancai/A-draft · root · 7 种 gap：1×1 2×1 3×7 4×2 8×2 10×2 12×5

## 六、基线

本次作为基线写入 `docs/ui-audit-baseline.json`。

