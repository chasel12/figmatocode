# UI 量测审计报告

> 生成时间 2026-11-01 12:57:43　·　页面 45 个　·　命中 18 条
>
> 这份报告读的是**渲染后的盒子**，不是节点树。`bugscan/` 那些检测器判的是「字段组合像不像 bug」，
> 而底栏被切、按钮换行、子项溢出父盒这些在 AST 里完全合法 —— 只有量出来才知道。

## 一、按类型

| 类型 | 命中 | 涉及页面 | 含义 |
|---|---|---|---|
| `size-ignored` | 0 | 0 | HUG 把声明的显式高度吞了（底栏被压扁的根因） |
| `below-fold` | 0 | 0 | 元素底边超出 812px 视口，用户看不到/点不到 |
| `wrap` | 11 | 2 | 单行短文案折成多行，盒子太窄 |
| `h-overflow` | 3 | 1 | 内容比自身盒宽长，横向被切 |
| `v-overflow` | 0 | 0 | 内容比自身盒高长且会裁，纵向被切 |
| `out-of-parent` | 4 | 2 | 子元素超出父盒边界 |

## 二、逐条明细

### `wrap`（11）

| 页面 | 节点 | 说明 |
|---|---|---|
| card-hscroll | Text 174(TEXT) | 「查看详情」折成 2 行（盒宽 33px，字号 12） |
| card-hscroll | Text 179(TEXT) | 「自动布局映射」折成 3 行（盒宽 33px，字号 14） |
| card-hscroll | Text 180(TEXT) | 「查看详情」折成 2 行（盒宽 33px，字号 12） |
| card-hscroll | Text 185(TEXT) | 「像素比对修复」折成 3 行（盒宽 33px，字号 14） |
| card-hscroll | Text 186(TEXT) | 「查看详情」折成 2 行（盒宽 33px，字号 12） |
| card-hscroll | Text 191(TEXT) | 「设计令牌体系」折成 3 行（盒宽 33px，字号 14） |
| card-hscroll | Text 192(TEXT) | 「查看详情」折成 2 行（盒宽 33px，字号 12） |
| card-hscroll | Text 197(TEXT) | 「组件变体生成」折成 3 行（盒宽 33px，字号 14） |
| card-hscroll | Text 198(TEXT) | 「查看详情」折成 2 行（盒宽 33px，字号 12） |
| layout-actionbar | Button 626(BUTTON) | 「加入购物车」折成 2 行（盒宽 86px，字号 14） |
| layout-actionbar | Button 627(BUTTON) | 「立即购买」折成 2 行（盒宽 84px，字号 14） |

### `h-overflow`（3）

| 页面 | 节点 | 说明 |
|---|---|---|
| state-skeleton | 骨架卡片 1(FRAME) | 内容 355px > 盒宽 341px |
| state-skeleton | 骨架卡片 2(FRAME) | 内容 355px > 盒宽 341px |
| state-skeleton | 骨架卡片 3(FRAME) | 内容 355px > 盒宽 341px |

### `out-of-parent`（4）

| 页面 | 节点 | 说明 |
|---|---|---|
| overlay-toast | 商品行 8(FRAME) | 超出父盒 68px（自身 343×91，父 375×756） |
| state-skeleton | 封面占位(RECTANGLE) | 超出父盒 13px（自身 343×120，父 343×198） |
| state-skeleton | 封面占位(RECTANGLE) | 超出父盒 13px（自身 343×120，父 343×198） |
| state-skeleton | 封面占位(RECTANGLE) | 超出父盒 13px（自身 343×120，父 343×198） |

## 三、按页面

| 页面 | 节点 | 命中 | 页高 |
|---|---|---|---|
| card-hscroll | 38 | 9 | 812px |
| state-skeleton | 17 | 6 | 812px |
| layout-actionbar | 47 | 2 | 863px |
| overlay-toast | 90 | 1 | 880px |
| btn-fab | 51 | 0 | 812px |
| btn-group | 27 | 0 | 812px |
| btn-icon | 13 | 0 | 812px |
| btn-variants | 7 | 0 | 812px |
| card-badge | 37 | 0 | 963px |
| card-grid | 28 | 0 | 812px |
| card-media | 50 | 0 | 812px |
| card-product | 30 | 0 | 909px |
| data-price | 19 | 0 | 812px |
| data-progress | 6 | 0 | 812px |
| data-rating | 12 | 0 | 812px |
| data-stat | 17 | 0 | 812px |
| data-timeline | 48 | 0 | 812px |
| form-checkbox | 47 | 0 | 812px |
| form-input | 17 | 0 | 812px |
| form-search | 23 | 0 | 812px |
| form-select | 40 | 0 | 812px |
| form-slider | 22 | 0 | 812px |
| form-stepper | 14 | 0 | 812px |
| form-switch | 34 | 0 | 812px |
| layout-carousel | 10 | 0 | 812px |
| layout-hero | 13 | 0 | 812px |
| layout-masonry | 38 | 0 | 812px |
| layout-split | 24 | 0 | 812px |
| list-divider | 25 | 0 | 812px |
| list-grouped | 79 | 0 | 898px |
| list-message | 62 | 0 | 812px |
| list-order | 59 | 0 | 908px |
| list-setting | 31 | 0 | 812px |
| nav-badge-icon | 20 | 0 | 812px |
| nav-breadcrumb | 69 | 0 | 915px |
| nav-header | 22 | 0 | 812px |
| nav-segmented | 52 | 0 | 812px |
| nav-tabbar | 62 | 0 | 812px |
| overlay-menu | 22 | 0 | 812px |
| overlay-modal | 23 | 0 | 812px |
| overlay-sheet | 54 | 0 | 812px |
| overlay-tooltip | 12 | 0 | 812px |
| state-empty | 7 | 0 | 812px |
| state-error | 8 | 0 | 812px |
| state-success | 7 | 0 | 812px |

