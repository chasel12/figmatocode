# 前端规范门禁报告

> 生成于 2026-11-01T05:29:50.802Z · `npm run standards:check`
> 规则 12 条 / 8 域（D8 是结构本身）

**结论：通过**

## S1 规则表自检

- ✅ 12 条规则，每条都有 pass/fail fixture

## S2 fixture（T1 正例 / T2 反例）

- 共 34 个 fixture 运行（正例 18 / 反例 16）
- ✅ 全部通过

## S3 变异测试（空实现下反例必须变红）

- 共 16 次变异
- ✅ 全部变红（断言确实依赖实现）

## S4 真产物命中率

- 产物：demo-19(19 页) + mall-6(6 页)，共 25 页 × 2 端，节点 2266 个

| 域 | 规则 | 命中 | 每千节点 | 命中/页 | 判定 |
|---|---|---|---|---|---|
| D1 | wcag-1.4.3-contrast | 406 | 179.17 | 8.12 | 偏严 |
| D1 | wcag-1.1.1-image-alt | 82 | 36.19 | 1.64 | 健康 |
| D1 | wcag-2.5.8-target-size | 0 | 0.00 | 0.00 | 0%（查是否真跑过） |
| D2 | wig-interaction-state | 88 | 38.83 | 1.76 | 健康 |
| D2 | wig-focus-visual-change | 0 | 0.00 | 0.00 | 0%（查是否真跑过） |
| D3 | cjk-latin-spacing | 2 | 0.88 | 0.04 | 健康 |
| D3 | cjk-fullwidth-punctuation | 0 | 0.00 | 0.00 | 0%（查是否真跑过） |
| D3 | cjk-ellipsis | 0 | 0.00 | 0.00 | 0%（查是否真跑过） |
| D4 | dtcg-color-drift | 0 | 0.00 | 0.00 | 0%（查是否真跑过） |
| D5 | wig-no-transition-all | 0 | 0.00 | 0.00 | 0%（查是否真跑过） |
| D6 | wechat-min-font-size | 41 | 36.19 | 0.82 | 健康 |
| D7 | seo-page-title | 0 | 0.00 | 0.00 | 0%（查是否真跑过） |

- ⚠ 0 命中且未被跳过的规则：wcag-2.5.8-target-size, cjk-fullwidth-punctuation, cjk-ellipsis, dtcg-color-drift, wig-no-transition-all, seo-page-title（按 §4.4 必须确认它真的被调用过）
- 端跳过统计：wechat-min-font-size×25, wig-focus-visual-change×25

## baseline diff

- 无变化

## 命中样例（每条规则最多 3 条）

### wcag-1.4.3-contrast（D1 · WCAG 2.2 SC 1.4.3）

- `demo-19/01 登录` · h5 · `root/children[1]/children[0]/children[0]/children[0]` — 文字对比度 2.63:1 低于 4.5:1
- `demo-19/01 登录` · h5 · `root/children[1]/children[0]/children[1]/children[0]` — 文字对比度 2.63:1 低于 4.5:1
- `demo-19/01 登录` · h5 · `root/children[1]/children[0]/children[2]/children[1]` — 文字对比度 3.80:1 低于 4.5:1

### wcag-1.1.1-image-alt（D1 · WCAG 2.2 SC 1.1.1）

- `demo-19/03 商品列表` · h5 · `root/children[1]/children[1]/children[0]/children[0]/children[0]` — 图片缺少替代文本（alt）
- `demo-19/03 商品列表` · h5 · `root/children[1]/children[1]/children[1]/children[0]/children[0]` — 图片缺少替代文本（alt）
- `demo-19/03 商品列表` · h5 · `root/children[1]/children[2]/children[0]/children[0]/children[0]` — 图片缺少替代文本（alt）

### wig-interaction-state（D2 · Vercel WIG「Interactive states」+ C8 按端分流）

- `demo-19/01 登录` · h5 · `root/children[1]/children[0]/children[3]` — 可点元素缺少hover态（h5）
- `demo-19/01 登录` · mini · `root/children[1]/children[0]/children[3]` — 可点元素缺少active态（mini）
- `demo-19/02 注册` · h5 · `root/children[1]/children[3]` — 可点元素缺少hover态（h5）

### cjk-latin-spacing（D3 · 中文文案排版指北「中英文之间加空格」+ C2 白名单）

- `demo-19/03 商品列表` · h5 · `root/children[1]/children[3]/children[1]/children[0]/children[1]` — 中英文之间缺少空格："纯棉基础T恤" → "纯棉基础 T 恤"
- `demo-19/03 商品列表` · mini · `root/children[1]/children[3]/children[1]/children[0]/children[1]` — 中英文之间缺少空格："纯棉基础T恤" → "纯棉基础 T 恤"

### wechat-min-font-size（D6 · 微信小程序设计指南「字号」+ C11）

- `demo-19/04 商品详情` · mini · `root/children[2]/children[0]/children[1]` — 字号 10px 低于小程序下限 11px
- `demo-19/04 商品详情` · mini · `root/children[2]/children[0]/children[3]` — 字号 10px 低于小程序下限 11px
- `demo-19/09 Dashboard` · mini · `root/children[1]/children[1]/children[2]/children[0]` — 字号 10px 低于小程序下限 11px

