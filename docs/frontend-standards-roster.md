# 前端规范类资产总名单（非风格类）

> 2026-11-01。配套 `docs/frontend-skills-scan.md`（2026-10-25 生态扫描）。
>
> 两份的区别：
> - 那份按「**skill 干什么**」分 A 风格 / B 规范 / C 技术 / D 工具链，回答「生态长什么样」；
> - 这份按「**能不能被代码执行**」分 P0 / P1 / P2 / C，回答「哪些能进这个项目」。
>
> 40 项里 **12 项今天就能落地**（字段已有 + 产物可检测），**5 项加一个字段就能落地**，
> **3 项只值得抄范式**，**20 项落不了**。落不了的原因几乎都是同一个：
> **模型产 AST 不产代码，产物是静态页面，没有运行时。**

---

## 判据

这个项目的 AI 通道产出是 `AiPageDraft`（JSON 节点树），编译链 100% 确定性，产物是
单文件 HTML / 四端工程包（react / vue / taro / uniapp），静态、离线、无运行时。

所以判一条规范能不能用，只问三句：

1. **AST 里有承载字段吗？**（没有 → 要么加字段，要么落不了）
2. **能在产物上算出对错吗？**（算不出 → 只能进提示词，回到「不可验证」）
3. **违反了要不要拦？**（拦 = 违例进自修环；不拦 = normalizer 静默改）

三种结局：
- **P0**：字段有 + 可检测 → 直接做成闸门
- **P1**：可检测但字段缺 → 先加字段
- **P2**：范式值得抄，但不直接落地
- **C**：落不了，写进边界

---

## 一、总名单

### 组 1 · 界面规范 / 审查类（skill 形态）

| # | 名称 | 来源 | 体量 | 形态 | 判定 |
|---|---|---|---|---|---|
| 1 | **web-design-guidelines** | vercel-labs/agent-skills | 782.4K 装机 | 100+ 条审查规则，12 组 | **P0（主力）** |
| 2 | **Web Interface Guidelines**（1 的源仓库） | vercel-labs/web-interface-guidelines | MIT，547★ | 同上，纯 markdown | **P0** |
| 3 | **review-animations** | vercel-labs | 254.7K | 动效审查 | P0（子集） |
| 4 | **improve-animations** | vercel-labs | 222.5K | 动效改进 | C（要改代码） |
| 5 | **animation-vocabulary** | 社区 | 237.4K | 动效词汇表 | P2（做提示词词表） |
| 6 | **DESIGN.md** | 开放标准（2026-04 发布） | — | 设计意图的机器可读描述 | P2（可做项目元数据） |
| 7 | **emil-design-eng** | emilkowalski/skills | 386.1K | 动画决策 + 组件打磨 | C（A/C 之间，偏实现） |

> 组 1 是**唯一进前五的非风格类**（`web-design-guidelines` 782.4K）。
> 生态扫描那句判断在这里被验证：**「能指出哪里错」比「教怎么写」更容易被信任——因为它可验证。**

### 组 2 · 设计系统与令牌

| # | 名称 | 来源 | 体量 | 形态 | 判定 |
|---|---|---|---|---|---|
| 8 | **W3C DTCG Design Tokens Format** | design-tokens/community-group | W3C 社区组标准 | 令牌 JSON 格式 | **P2→P1（已有 StylePack，缺引用）** |
| 9 | **Style Dictionary** | Amazon | 开源工具 | 令牌 → 多平台产物 | P2（构建期可借） |
| 10 | **ux-ui-agent-skills** | plugin87 | 14 DTCG 令牌 + 52 组件规范 + 138 品牌系统 + **52 道会让构建真正失败的客观门禁** | skill + 数据 + 门禁脚本 | **P2（抄结构，最高优先）** |
| 11 | **Open Props** | 社区 | 已在用 | 阴影/字号/间距阶 | 已落地（StylePack 来源） |
| 12 | **Radix Colors** | 社区 | 已在用 | 语义色 | 已落地 |
| 13 | **daisyUI themes** | 社区 | 已在用 | dark 主题 | 已落地 |
| 14 | **Material Design 3** | Google | 巨量 | 组件级规范 | C（太重，且是组件不是页面） |
| 15 | **IBM Carbon** | IBM | 巨量 | 同上 | C |
| 16 | **Shopify Polaris** | Shopify | 巨量 | 同上 | C |
| 17 | **Microsoft Fluent 2** | MS | 巨量 | 同上 | C |

### 组 3 · 可访问性

| # | 名称 | 来源 | 体量 | 形态 | 判定 |
|---|---|---|---|---|---|
| 18 | **WCAG 2.2 AA** | W3C | 标准 | 可测判据（对比度、目标尺寸、焦点可见） | **P0（对比度）/ P1（alt）/ C（键盘）** |
| 19 | **WAI-ARIA Authoring Practices (APG)** | W3C | 标准 | 组件 role/状态模式 | **P1（加 `role` 字段）** |
| 20 | **The A11y Project checklist** | a11yproject | 社区 | 清单 | P1（抄条目） |
| 21 | **Inclusive Components** | Heydon Pickering | 书 | 组件模式 | C（无组件层） |
| 22 | **axe-core** | Deque | 工具 | 运行时 DOM 扫描 | C（产物无 DOM 断言通道；但**可对 dist 跑**，见 §四） |
| 23 | **Pa11y / Lighthouse a11y** | 社区 / Google | 工具 | 同上 | C（同上） |

### 组 4 · 质量审计（性能 / SEO）

| # | 名称 | 来源 | 体量 | 形态 | 判定 |
|---|---|---|---|---|---|
| 24 | **web-quality-skills `best-practices`** | addyosmani | 150+ checks：Perf 40% / A11y 30% / SEO 15% / BP 15% | 分级审计（Critical→Low） | **P0（A11y+SEO 子集）** |
| 25 | **seo-audit** | skills.sh 生态 | 23.4K | SEO 审计 | **P0（title/description/heading）** |
| 26 | **Core Web Vitals** | Google | 指标 | LCP/INP/CLS | C（无运行时） |
| 27 | **Lighthouse budgets** | Google | 配置 | 体积预算 | P2（可做产物体积门禁） |
| 28 | **web-vitals** | Google | 库 | 运行时上报 | C |

### 组 5 · 框架技术规范（C 类）

| # | 名称 | 来源 | 体量 | 形态 | 判定 |
|---|---|---|---|---|---|
| 29 | **vercel-react-best-practices** | vercel-labs/agent-skills | **837.3K**（榜首级） | 40+ 条 / 8 类 / 按 impact 分级 | **C（模型不写 React）** |
| 30 | **vercel-composition-patterns** | vercel-labs | 417.1K | 复合组件 / 状态提升 | C |
| 31 | **next-best-practices** | vercel-labs/next-skills | 8.2K | Next.js 路由与渲染 | C |
| 32 | **react-native-guidelines** | vercel-labs | 254.2K | RN 优化 | C |
| 33 | **shadcn** | 社区 | 271.1K | 组件库 CLI | C（产物不引组件库） |
| 34 | **remotion-best-practices** | remotion-dev | 680.0K | 视频生成 | C |
| 35 | **ESLint / Stylelint / Prettier / TS strict** | 生态 | 工具 | 源码 lint | **C（产物是机器生成的，风格无意义）** |
| 36 | **ybyc/frontend-guidelines** | 社区 | 仓库 | 命名/注释/目录约定 | C |

### 组 6 · 文案与排版

| # | 名称 | 来源 | 体量 | 形态 | 判定 |
|---|---|---|---|---|---|
| 37 | **中文文案排版指北** | sparanoid/chinese-copywriting-guidelines | 中文社区事实标准 | 空格 / 标点 / 全半角 / 数字 | **P0（纯字符串，零字段成本）** |
| 38 | **Practical Typography** | Butterick | 书 | 排版原则 | P2（抄度量） |
| 39 | **Microsoft Writing Style Guide** | MS | 官方 | 文案风格 | **P0（按钮/错误文案子集）** |
| 40 | **Chicago Manual of Style**（Title Case 来源） | — | 标准 | 大小写规则 | P2（中文项目无关） |

### 组 7 · 平台设计指南（移动端 / 小程序）

| # | 名称 | 来源 | 体量 | 形态 | 判定 |
|---|---|---|---|---|---|
| 41 | **微信小程序设计指南** | 微信官方 | 5 章（友好礼貌 / 清晰明确 / 便捷优雅 / 统一稳定 / 视觉规范） | 设计原则 + 视觉规范 | **P0（导航/反馈条款）/ P1（其余）** |
| 42 | **支付宝小程序设计规范** | 蚂蚁 | 官方 | 同上 | P2（交叉参考） |
| 43 | **Ant Design Mobile** | 蚂蚁 | 组件库 | 移动端组件规范 | P2（抄间距/字号阶） |
| 44 | **TDesign** | 腾讯 | 组件库 | 同上 | P2 |
| 45 | **Apple HIG** | Apple | 官方 | 平台设计语言 | C（自然语言，无判据） |

---

## 二、判定汇总

### P0 · 今天就能做（12 条，字段已有 + 可检测）

| 规则 | 判据（可写成布尔表达式） | 落点 |
|---|---|---|
| **WCAG 1.4.3 文本对比度 ≥ 4.5:1** | `contrastRatio(node.style.color, ancestorBg) >= 4.5`（大字 ≥3:1） | 新 `src/compiler/contrast.ts`，闸门调用 |
| **中文排版：中英文之间加空格** | `/[\u4e00-\u9fa5][A-Za-z0-9]/` 命中且无空格 | `checkDraftSemantics` |
| **中文排版：全角标点** | 中文语境里出现 `,.;:!?()` | 同上 |
| **Typography：`…` 不 `...`** | `text.includes('...')` | 同上 |
| **Typography：弯引号** | 中文文本含直引号 `"` `'` | 同上 |
| ~~Typography：数字列 `tabular-nums`~~ | ~~连续数字列未设 `fontVariantNumeric`~~ → **降 P1**：`StyleSchema` 没有这个字段（见 `frontend-standards-final.md` §1.2） | 需先加字段 |
| **Hover & Focus：可点元素必须有 hover 态** | `node.interactions?.length && !node.states?.hover` | 同上 |
| ~~Focus：禁止 `outline:none` 无替代~~ | ~~`states.focus` 只改 outline 为 none~~ → **已天然合规**：`compile.ts:383` 出的是 `:focus-visible`（见 §1.2） | 无需实现 |
| **Animation：禁止 `transition: all`** | `style.transition === 'all'` | 同上 |
| **Images：显式 width/height（防 CLS）** | `node.type==='IMAGE' && (widthMode==='HUG' \|\| !width)` | 同上 |
| **Dark Mode：`color-scheme` 与根背景一致** | 根背景暗 && 未出 `color-scheme: dark` | `compile.ts` 根规则 |
| **Safe Areas：全出血布局要 `env(safe-area-inset-*)`** | 根容器 `padding` 全 0 且存在 `position:FIXED` 底栏 | `compile.ts` 根规则 |
| **SEO：title 唯一、非空、≤60 字符** | 跨页 `meta.title` 去重 | 新 `scripts/seo-check.ts` |
| **Content & Copy：按钮文案不能是「确定/继续/提交」** | 可点节点的 TEXT 命中黑名单 | `checkDraftSemantics` |
| **微信指南「导航明确」：必须有 tabBar 且层级 ≤5** | `deriveTabBar(pages)` 为空 && 页面数 >1 | `site.ts` 落库前 |

> 数出来 15 条，其中 12 条互不重叠（对比度、中文排版、Typography、Hover、Focus、Animation、
> Images、DarkMode、SafeArea、SEO、Copy、小程序导航）。

### P1 · 加一个字段就能做（5 条）

| 规则 | 需要加的字段 | 代价 |
|---|---|---|
| **WCAG 1.1.1 图片替代文本** | `ImageNode.alt?: string`（现在四端写死 `alt=""`） | 加字段 + 4 个出码器各 1 行 + `.fig` 旁挂 |
| **WAI-ARIA：role** | `UINode.role?: string`（白名单枚举） | 加字段 + `semanticTag` 分支 |
| **Images：below-fold lazy** | `ImageNode.loading?: 'lazy' \| 'eager'` | 同上 |
| **SEO：description** | `UIPage.meta.description` | 加字段 + html head |
| **小程序：加载/空/错误三态** | `states.loading / empty / error` | 重（要加节点类型） |

### P2 · 只值得抄范式（3 条）

| 名称 | 抄什么 |
|---|---|
| **W3C DTCG** | 「AST 存令牌引用而非字面值」——`{token:'color.primary'}` 编译时解析。收益：可换主题 + 可校验「不许出现令牌外的颜色」 |
| **ux-ui-agent-skills 的 52 道门禁** | **结构**，不是内容。它和你已有的 `fig:check` 四关 / 像素关 / `nav:e2e` 是同一范式，只是把范围扩到了「规范」 |
| **DESIGN.md** | 把「设计意图」写成机器可读文件，和 AST 一起进包 |

### C · 落不了（20 条）

统一原因三类：

| 原因 | 条目 |
|---|---|
| **模型不写代码**（只产 AST） | vercel-react-best-practices、composition-patterns、next、react-native、shadcn、remotion、ESLint/Stylelint、frontend-guidelines |
| **产物是静态 MPA，没有运行时** | Core Web Vitals、web-vitals、axe-core（直连）、Pa11y、Intl 格式化、URL 状态/deep-link、表单类全部 |
| **无组件层 / 太重** | Material 3、Carbon、Polaris、Fluent 2、Inclusive Components、Apple HIG |

---

## 三、落地映射表

| 层 | 文件 | 现在干什么 | 该加什么 |
|---|---|---|---|
| 语义闸门 | `src/editor/ai/contract.ts` `checkDraftSemantics` | schema + 图标名 + className + 节点数/深度 | 文案/排版/交互态 12 条 |
| 转换层 | `src/editor/ai/specToPage.ts` `normalize*`（5 个） | 静默翻译意图 | 能自动改的（`…`、空格、`tabular-nums`） |
| CSS 输出 | `src/compiler/compile.ts` | 出 CSS 声明 | `color-scheme`、`env(safe-area-inset-*)` |
| 新增 | `src/compiler/contrast.ts` | — | WCAG 相对亮度 + 对比度（可复用 `imagePlaceholder.ts:121` 的 `isDarkColor`） |
| 新增 | `scripts/seo-check.ts` | — | 跨页 title 唯一性 / 长度 |
| 门禁 | `package.json` | `fig:check` / `ai-matrix` / `nav:e2e` | `npm run standards:check` |

**关键分工**（沿用既有原则「约束放转换层，不放提示词」）：

- **能自动改对的** → `normalize*`，静默，不报违例（`…`、中英文空格、`color-scheme`、safe-area）
- **改不对、只能拒绝的** → `checkDraftSemantics`，进自修环（对比度、可点元素缺 hover、图片缺尺寸）
- **跨页 / 跨产物的** → 独立脚本（SEO title 唯一、tabBar 存在）

---

## 四、一个被低估的通道：对 dist 跑 axe

组 3 里 axe-core / Pa11y 被我判了 C，理由是「产物没有 DOM 断言通道」——**这条判错了**。

产物是**真 HTML**，Playwright 已经在用（`nav:e2e` 真点按钮）。所以可以：

```
起 dist 静态服务 → 注入 axe-core → 逐页扫 → 按 severity 出报告
```

这是**唯一能覆盖「AST 里没有字段」那一类 a11y 问题的通道**（键盘可达、role 语义、
焦点顺序、对比度实算）。代价是要维护一份「哪些违规可接受」的基线，否则 6 页能报出上百条。

**但它有个致命边界**：只覆盖 H5。小程序端没有这个通道，和小程序像素关的处境一样。

---

## 五、优先级与代价

| 批 | 内容 | 改动面 | 预期收益 |
|---|---|---|---|
| **B1** | 对比度闸门（`contrast.ts` + 闸门调用） | 2 文件，~150 行 | 最高。纯数值、零歧义、真实可访问性 |
| **B2** | 文案/排版 lint（中文排版 + Typography + Copy） | 1 文件，~10 条 | 高。**不占前缀预算**（代码检查而非提示词） |
| **B3** | 交互态闸门（hover/focus 缺失） | 1 文件，~60 行 | 中高。和 `liftHitAreas` 同一层 |
| **B4** | CSS 侧补丁（`color-scheme` / safe-area / `tabular-nums`） | `compile.ts`，~40 行 | 中。改产物字节，要复跑像素关 |
| **B5** | SEO 脚本（title 唯一/长度/description） | 新脚本 | 中。MPA 直接受益 |
| **B6** | axe on dist | 新脚本 + 基线 | 中。但只覆盖 H5 |
| **B7** | `alt` 字段（P1 第一条） | 5 处 + `.fig` 旁挂 | 中。**当前所有图片都被标成装饰性** |

---

## 六、一个反直觉的结论

这份名单里**安装量最高的一批（vercel-react-best-practices 837.3K、composition-patterns 417.1K）
对这个项目全部无效**，而安装量只有 547★ 的 `vercel-labs/web-interface-guidelines` 才是主力。

原因不是质量差异，是**形态差异**：

> 前者教「怎么写代码」，后者写「怎么判代码」。

你的模型不写代码，所以前者没有着力点；你的产物可以被检测，所以后者每一条都能变成断言。

**这也是生态扫描那份文档里那条结论的延伸**：审查类被低估，因为「能指出哪里错」可验证。
对这个项目而言，可验证性不是加分项，是**唯一的准入条件**。
