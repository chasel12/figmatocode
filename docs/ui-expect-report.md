# UI 场景期望校验

> 生成时间 2026-11-01 14:33:05　·　场景 45 个　·　判据 243 条
>
> 判的是「提示词里明确给了字面量/数量」的那部分。`expect` 里「三格等高」「箭头在最右」
> 这类视觉判断**不在这里判**（没有客观判据，硬判只会制造误报），看 `ui-shots` 的截图。

**结论：39/45 场景全过；判据 235/243 通过**

## 未通过

| 场景 | 组 | 失败判据 |
|---|---|---|
| `nav-badge-icon` | 导航 | 0/1 命中（要求 ≥1）；缺 消息 |
| `nav-badge-icon` | 导航 | 0 个 ABSOLUTE（要求 ≥1） |
| `nav-badge-icon` | 导航 | 1 个 VECTOR（要求 4~∞） |
| `card-hscroll` | 卡片 | 「查看专题」重复 5 次（>3 说明 repeat 的 values 只给了一条） |
| `list-order` | 列表 | 「共 1 件商品」重复 4 次（>3 说明 repeat 的 values 只给了一条） |
| `list-order` | 列表 | 0/4 命中（要求 ≥3）；缺 去支付、提醒发货、确认收货、再次购买 |
| `btn-fab` | 按钮 | 0 个 ABSOLUTE（要求 ≥1） |
| `overlay-toast` | 浮层 | 0/1 命中（要求 ≥1）；缺 已加入购物车 |

## 缺产物

`btn-group`

## 全量

| 场景 | 组 | 优先级 | 判据 | 结果 |
|---|---|---|---|---|
| `nav-tabbar` | 导航 | 1 | 7 | ✓ |
| `nav-header` | 导航 | 2 | 5 | ✓ |
| `nav-badge-icon` | 导航 | 1 | 7 | ✗ 3 条 |
| `nav-segmented` | 导航 | 2 | 5 | ✓ |
| `nav-breadcrumb` | 导航 | 3 | 6 | ✓ |
| `card-product` | 卡片 | 2 | 6 | ✓ |
| `card-grid` | 卡片 | 1 | 6 | ✓ |
| `card-hscroll` | 卡片 | 3 | 6 | ✗ 1 条 |
| `card-media` | 卡片 | 2 | 5 | ✓ |
| `card-badge` | 卡片 | 3 | 5 | ✓ |
| `list-setting` | 列表 | 1 | 6 | ✓ |
| `list-order` | 列表 | 1 | 6 | ✗ 2 条 |
| `list-message` | 列表 | 2 | 5 | ✓ |
| `list-grouped` | 列表 | 2 | 5 | ✓ |
| `list-divider` | 列表 | 3 | 5 | ✓ |
| `form-input` | 表单 | 1 | 6 | ✓ |
| `form-search` | 表单 | 2 | 6 | ✓ |
| `form-switch` | 表单 | 3 | 5 | ✓ |
| `form-checkbox` | 表单 | 3 | 5 | ✓ |
| `form-slider` | 表单 | 3 | 5 | ✓ |
| `form-stepper` | 表单 | 1 | 5 | ✓ |
| `form-select` | 表单 | 3 | 5 | ✓ |
| `btn-variants` | 按钮 | 2 | 5 | ✓ |
| `btn-group` | 按钮 | 2 | 6 | 缺产物 |
| `btn-fab` | 按钮 | 3 | 5 | ✗ 1 条 |
| `btn-icon` | 按钮 | 2 | 6 | ✓ |
| `state-empty` | 状态 | 1 | 5 | ✓ |
| `state-skeleton` | 状态 | 2 | 5 | ✓ |
| `state-error` | 状态 | 3 | 5 | ✓ |
| `state-success` | 状态 | 3 | 5 | ✓ |
| `data-price` | 数据 | 1 | 6 | ✓ |
| `data-rating` | 数据 | 3 | 6 | ✓ |
| `data-progress` | 数据 | 3 | 5 | ✓ |
| `data-stat` | 数据 | 3 | 5 | ✓ |
| `data-timeline` | 数据 | 3 | 5 | ✓ |
| `overlay-sheet` | 浮层 | 1 | 6 | ✓ |
| `overlay-modal` | 浮层 | 2 | 5 | ✓ |
| `overlay-toast` | 浮层 | 3 | 5 | ✗ 1 条 |
| `overlay-tooltip` | 浮层 | 3 | 5 | ✓ |
| `overlay-menu` | 浮层 | 3 | 5 | ✓ |
| `layout-hero` | 布局 | 2 | 5 | ✓ |
| `layout-split` | 布局 | 2 | 5 | ✓ |
| `layout-masonry` | 布局 | 3 | 5 | ✓ |
| `layout-carousel` | 布局 | 3 | 5 | ✓ |
| `layout-actionbar` | 布局 | 2 | 6 | ✓ |

