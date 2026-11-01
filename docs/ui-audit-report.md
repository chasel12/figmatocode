# UI 形态审计报告

> 生成时间 2026-11-01 11:09:58　·　检测器 9 个　·　页面 37 个
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
| draft | 6 | 353 | draft（模型原始输出 → 同管线） |

## 二、按检测器

| 检测器 | 严重度 | demo | mall 存量 | mall 重跑 | draft | 合计 | 判定 |
|---|---|---|---|---|---|---|---|
| `badge-inline` | bug | 0 | 0 | 0 | 0 | 0 | 回归基线（normalizeAbsolute 规则 4） |
| `vector-ratio` | bug | 0 | 0 | 0 | 1 | 1 | 仅 AI 产物命中，可信 |
| `empty-frame` | taste | 0 | 0 | 0 | 0 | 0 | 产物里无此形态 |
| `abs-no-size` | bug | 0 | 0 | 0 | 0 | 0 | 回归基线（normalizeAbsolute 规则 3） |
| `fixed-occlude` | bug | 0 | 1 | 0 | 0 | 1 | 仅 AI 产物命中，可信 |
| `text-invisible` | bug | 0 | 0 | 0 | 0 | 0 | 回归基线（normalizeInvisibleText） |
| `gap-scatter` | taste | 0 | 0 | 0 | 1 | 1 | 仅 AI 产物命中，可信 |
| `flat-hierarchy` | taste | 0 | 0 | 0 | 0 | 0 | 产物里无此形态 |
| `text-clip` | taste | 0 | 0 | 0 | 0 | 0 | 产物里无此形态 |

**0 命中有两种含义，必须分开看：**

- **回归基线**（有 normalize 负责修，0 命中说明那条修复在跑）：`badge-inline`, `abs-no-size`, `text-invisible`
- **产物里真没有这种形态**（没有 normalize 负责）：`empty-frame`, `flat-hierarchy`, `text-clip`

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
| ai-ab-diancai/A-draft | 97 | 1 | 1 | vector-ratio×1 gap-scatter×1 |
| ai-ab-diancai/C-brutalist-draft | 21 | 0 | 0 | — |
| ai-ab-ev-scooter/A-draft | 61 | 0 | 0 | — |
| ai-ab-ev-scooter-verify/A-draft | 61 | 0 | 0 | — |
| ai-ab-manga/A-draft | 92 | 0 | 0 | — |
| ai-brutalist/A-draft | 21 | 0 | 0 | — |

## 四、bug 级明细

| 检测器 | 页面 | 节点 | 说明 |
|---|---|---|---|
| `fixed-occlude` | 商品详情 | 商品详情/底部导航 | 底栏高 64px，根容器 padding-bottom 只有 0px，差 64px 内容被遮 |
| `vector-ratio` | ai-ab-diancai/A-draft | 点菜小程序/状态栏/系统图标/电量 | viewBox 24×24 渲染成 18×14，横向偏差 29% |

## 五、taste 级分布

### `gap-scatter`（1 条）

- ai-ab-diancai/A-draft · root · 7 种 gap：1×1 2×1 3×7 4×2 8×2 10×2 12×5

## 六、基线

本次作为基线写入 `docs/ui-audit-baseline.json`。

