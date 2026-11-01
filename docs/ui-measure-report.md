# UI 量测审计报告

> 生成时间 2026-11-01 14:32:53　·　页面 44 个　·　命中 0 条
>
> 这份报告读的是**渲染后的盒子**，不是节点树。`bugscan/` 那些检测器判的是「字段组合像不像 bug」，
> 而底栏被切、按钮换行、子项溢出父盒这些在 AST 里完全合法 —— 只有量出来才知道。

## 一、按类型

| 类型 | 命中 | 涉及页面 | 含义 |
|---|---|---|---|
| `size-ignored` | 0 | 0 | HUG 把声明的显式高度吞了（底栏被压扁的根因） |
| `below-fold` | 0 | 0 | 元素底边超出 812px 视口，用户看不到/点不到 |
| `wrap` | 0 | 0 | 单行短文案折成多行，盒子太窄 |
| `h-overflow` | 0 | 0 | 内容比自身盒宽长，横向被切 |
| `v-overflow` | 0 | 0 | 内容比自身盒高长且会裁，纵向被切 |
| `out-of-parent` | 0 | 0 | 子元素超出父盒边界 |

## 二、逐条明细

## 三、按页面

| 页面 | 节点 | 命中 | 页高 |
|---|---|---|---|
| btn-fab | 68 | 0 | 812px |
| btn-icon | 14 | 0 | 812px |
| btn-variants | 7 | 0 | 812px |
| card-badge | 49 | 0 | 919px |
| card-grid | 41 | 0 | 849px |
| card-hscroll | 43 | 0 | 812px |
| card-media | 45 | 0 | 839px |
| card-product | 36 | 0 | 974px |
| data-price | 20 | 0 | 812px |
| data-progress | 6 | 0 | 812px |
| data-rating | 12 | 0 | 812px |
| data-stat | 22 | 0 | 812px |
| data-timeline | 40 | 0 | 812px |
| form-checkbox | 26 | 0 | 812px |
| form-input | 23 | 0 | 812px |
| form-search | 18 | 0 | 812px |
| form-select | 27 | 0 | 812px |
| form-slider | 13 | 0 | 812px |
| form-stepper | 23 | 0 | 812px |
| form-switch | 25 | 0 | 812px |
| layout-actionbar | 44 | 0 | 812px |
| layout-carousel | 10 | 0 | 812px |
| layout-hero | 8 | 0 | 812px |
| layout-masonry | 26 | 0 | 812px |
| layout-split | 45 | 0 | 812px |
| list-divider | 44 | 0 | 812px |
| list-grouped | 96 | 0 | 997px |
| list-message | 75 | 0 | 812px |
| list-order | 65 | 0 | 923px |
| list-setting | 31 | 0 | 812px |
| nav-badge-icon | 9 | 0 | 812px |
| nav-breadcrumb | 67 | 0 | 1854px |
| nav-header | 21 | 0 | 812px |
| nav-segmented | 61 | 0 | 812px |
| nav-tabbar | 59 | 0 | 1138px |
| overlay-menu | 21 | 0 | 812px |
| overlay-modal | 34 | 0 | 812px |
| overlay-sheet | 56 | 0 | 812px |
| overlay-toast | 11 | 0 | 812px |
| overlay-tooltip | 28 | 0 | 812px |
| state-empty | 7 | 0 | 812px |
| state-error | 7 | 0 | 812px |
| state-skeleton | 19 | 0 | 812px |
| state-success | 6 | 0 | 812px |

