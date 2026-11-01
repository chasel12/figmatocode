# 前端规范最终名单（取舍后）+ 落地测试方案

> 2026-11-01。基于 `docs/frontend-standards-roster.md`（45 项原始名单）与
> `docs/frontend-skills-scan.md`（生态扫描）取舍。
>
> 本文回答两个问题：**① 哪一份是唯一权威（不冲突）② 怎么证明它真的生效了。**

---

## 零、取舍原则

### 0.1 三级优先（冲突时的裁决顺序）

| 优先级 | 层 | 理由 |
|---|---|---|
| **P1** | 本项目已裁决的边界（`docs/ai-ab-report.md` 附录、memory「已裁决勿再问」） | 已经用实测换来的结论，不能被外部规范推翻 |
| **P2** | 平台硬约束（小程序标签白名单、像素基线、离线性） | 违反了直接编不过 / 验收挂 |
| **P3** | W3C 标准（WCAG 2.2 / DTCG） | 有正式判据，可测 |
| **P4** | 大厂可判定规范（Vercel WIG） | 每条写成布尔句，但覆盖英文语境 |
| **P5** | 中文本地化规范（中文文案排版指北） | **覆盖 P4 的标点/空格/大小写条款** |
| **P6** | 设计系统数据（StylePack：Open Props / Radix / daisy） | 已在用，是数据源不是规范 |
| **P7** | 组件库规范（Ant Design Mobile / TDesign / Material） | 只作参考，**不进代码** |

### 0.2 一域一主（消除冲突的根本办法）

**冲突的来源不是规则本身，是同一件事有两个 owner。** 所以取舍的落点是：
**每个规则域只允许一个权威，其余全部降为「条目来源」或「参考」。**

降级 ≠ 删除。比如 Vercel WIG 的 a11y 组仍然用，但它的**判据**来自 WCAG，
WIG 只贡献「条目清单」。这样「对比度该不该 4.5」不会有两个答案。

---

## 一、冲突矩阵（16 组真实冲突 + 裁决）

### 1.1 内容冲突（两份规范说了不同的话）

| # | 冲突 | 双方 | 裁决 |
|---|---|---|---|
| **C1** | 正文对比度必须 4.5:1 | WCAG 1.4.3 vs StylePack 语义色（shadcn `muted-foreground` 在浅底约 3.9:1） | **分级**：正文 4.5 / 大字（≥24px 或 ≥18.66px bold）3.0 / 禁用态豁免 / 占位符文本降 `warn` |
| **C2** | 中英文之间必须加空格 | 中文排版指北 vs 品牌名与代码标识符（`iPhone15`、`useState`、`10MB`） | **白名单豁免**：数字+单位、产品名、URL、代码 token 不加 |
| **C3** | 省略号用 `…` 不用 `...` | Vercel WIG（英文） vs 中文排版指北（中文用「……」六点） | **按语言分流**：中文语境「……」；英文/数字后 `…` |
| **C4** | 标题用 Title Case | Vercel WIG（Chicago） vs 中文无大小写 | **中文项目整条关闭**，不注册 |
| **C5** | `text-wrap: balance` 防孤字 | Vercel WIG vs 固定高度容器会被撑破 | 只在 `heightMode: HUG` 的 TEXT 上启用 |
| **C6** | 图片必须显式 width/height 防 CLS | Vercel WIG vs 设计稿里图片是自适应的 | IMAGE 若 HUG，**必须有 `aspectRatio` 或 min 尺寸**；否则要求显式 |
| **C7** | 颜色必须走令牌 | DTCG vs AI 会写显式 hex（且 memory 明确「参考里的显式 hex 必须放行」） | **显式 hex 放行**；只对「同页 >6 个近似色（ΔE<3）」发 `warn` |
| **C8** | 可点元素必须有 hover 态 | Vercel WIG vs 小程序没有 hover | **按端分流**：H5 查 `:hover`，小程序查 `:active`（tap 触发） |
| **C9** | 必须有可见焦点 | Vercel WIG vs 小程序无 `:focus-visible` | 小程序端跳过；H5 端**已天然合规**（见 1.2 修正） |
| **C10** | axe 报「缺 label / role 错」 | WCAG vs AST 无表单节点 | axe 只启用**可修规则白名单**（对比度/标题层级/alt/可访问名），其余进 baseline 忽略 |
| **C11** | 小程序字号规范 | 微信指南 vs StylePack 字号阶 | StylePack 为准，微信只作**下限**（正文 ≥11px） |
| **C12** | 间距阶 | Open Props vs Ant Design Mobile vs 8pt 栅格 | **只用 Open Props**（已在 StylePack）；其余作参考不进代码 |
| **C13** | 必须有 tabBar | 微信指南 vs 单页生成 | **只在整站生成时检查** |
| **C14** | 禁止 `outline:none` 无替代 | Vercel WIG vs `states.focus` 可能只改 outline | 判据改为「**focus 态必须改变至少一个视觉属性**」，不判具体属性 |
| **C15** | 禁止 `transition: all` | Vercel WIG vs AST 目前没有 `transition` 字段 | 先做 normalizer 拒绝；等有字段再升级为闸门 |
| **C16** | 数字用阿拉伯数字 | Vercel WIG vs 中文序号（第一章 / 第一步） | **中文序号豁免** |

### 1.2 对前一份名单的两条修正

跑代码核对后发现两条判错：

| 原判 | 实际 | 修正 |
|---|---|---|
| 「禁止 `outline:none` 无替代」是 P0 待做 | `compile.ts:383` 已经出 **`:focus-visible`**（不是 `:focus`），天然满足 WIG 那条 | **删除该条**，只保留 C14 的「focus 必须改变视觉属性」 |
| 「数字列 `tabular-nums`」是 P0 | `StyleSchema` **没有** `fontVariantNumeric` 字段（只有 `textWrap`，语义还是「是否换行」） | **降为 P1**，需加字段；或先做 normalizer 推断（纯数字列自动加） |

---

## 二、最终名单（8 域，每域一个 owner）

**这是「完整功能齐全不冲突」的答案：8 个域，8 个权威，互不重叠。**

| 域 | 唯一权威（owner） | 覆盖范围 | 降为「条目来源」的 | 明确排除的 |
|---|---|---|---|---|
| **D1 可访问性判据** | **WCAG 2.2 AA** | 对比度、图片替代文本、可访问名、标题层级、目标尺寸 | Vercel WIG 的 Accessibility 组、A11y Project checklist | WCAG AAA、Inclusive Components、键盘陷阱（无表单） |
| **D2 界面行为规范** | **Vercel Web Interface Guidelines**（MIT，547★） | 交互态、动效、图片、安全区、暗色、内容承载、文案 | web-quality-skills 的 UX 组 | Forms、Performance、Navigation&State、Locale/i18n、Title Case、英文标点 |
| **D3 中文文案与标点** | **中文文案排版指北**（sparanoid） | 中英文空格、全角标点、数字与单位、省略号 | Microsoft Writing Style Guide（按钮/错误文案子集） | Chicago Manual、Practical Typography |
| **D4 设计令牌** | **W3C DTCG + 现有 StylePack** | 颜色/字号/间距/圆角的令牌口径 | Open Props / Radix Colors / daisyUI（**数据源**） | Ant Design Mobile / TDesign / Material 3 的间距阶 |
| **D5 动效** | **Vercel WIG Animation 组** | `prefers-reduced-motion`、禁 `transition:all`、只动 transform/opacity | emil-design-eng、review-animations | remotion |
| **D6 移动端 / 小程序** | **微信小程序设计指南** | 导航明确、反馈及时、字号下限 | 支付宝小程序规范、Ant Design Mobile、TDesign | 微信视觉规范的完整视觉体系（与 StylePack 冲突） |
| **D7 质量审计** | **addyosmani/web-quality-skills** | a11y 30% + SEO 15% 两维 | seo-audit | Perf 40%（无运行时）、Best-practices 15%（无依赖/无 CSP） |
| **D8 门禁结构** | **ux-ui-agent-skills 的「会失败的客观门禁」范式** | **只抄结构**：规则表 + fixture + 构建失败 | — | 它的 52 条内容、138 套品牌系统、14 个令牌文件 |

### 2.1 为什么不冲突

三个机制共同保证：

1. **一个域只有一个 owner** —— 同一句话不会有两个出处
2. **owner 之间职责正交** —— D1 管「能不能被感知」，D2 管「行为对不对」，D3 管「中文写得对不对」，D5 管「动不动」，D6 管「小程序像不像小程序」，D4 管「值从哪来」，D7 管「整体质量」，D8 管「怎么拦」
3. **冲突条款已在 §1 显式裁决** —— 16 组都有结论，不留「看情况」

### 2.2 完整覆盖度自检

8 个域覆盖了原 45 项里的 **27 项**（60%），裁掉 18 项。裁掉的全部有明确理由（§三）。

**关键：裁掉的不是「不重要」，是「对这个项目没有着力点」。**

---

## 三、被裁掉的（18 项）与理由

| 裁掉 | 理由 | 是否会后悔 |
|---|---|---|
| vercel-react-best-practices（837.3K） | 模型不写 React | 不会。除非将来加「AI 直接出组件代码」通道 |
| vercel-composition-patterns | 同上 | 不会 |
| next-best-practices / react-native-guidelines | 同上 | 不会 |
| shadcn / remotion | 产物不引组件库、不做视频 | 不会 |
| ESLint / Stylelint / Prettier | 产物是机器生成的，风格无意义 | 不会。**但可以 lint 出码器自己的源码**，那是另一件事 |
| Core Web Vitals / web-vitals / Lighthouse | 产物静态，无运行时数据 | 可能。若将来上真机测量 |
| axe-core（直连 AST） | AST 无 DOM | **不裁**，改为「对 dist 跑」（见 roster §四） |
| Pa11y | 同上，功能被 axe 覆盖 | 不会 |
| Inclusive Components / Apple HIG / Material 3 / Carbon / Polaris / Fluent 2 | 无组件层，且是自然语言 | 不会 |
| DESIGN.md | 想法好，但等价于「页面 meta 加字段」，不值一个独立规范 | 不会 |
| Chicago Manual of Style | 中文项目无大小写 | 不会 |
| Practical Typography | 度量可取，但无判据 | 不会 |
| 支付宝小程序规范 / Ant Design Mobile / TDesign | 与微信指南 + StylePack 重叠，引入即冲突（C12） | 不会 |
| web-quality-skills 的 Perf 40% / BP 15% | 无运行时、无依赖清单 | 不会 |

---

## 四、落地测试方案

这一节回答「怎么证明 skill 真的生效了」，而不是「配上了」。

### 4.1 落地四问（每条规则必须能回答）

| 问 | 不合格的表现 |
|---|---|
| **① 有 fixture 证明它在跑吗？** | 只有实现没有测试 → 无法区分「没生效」和「没违规」 |
| **② 撤掉它会不会红？** | 注释掉实现测试仍绿 → **假绿**，这条规则等于不存在 |
| **③ 真产物命中率多少？** | 0% = 太松或没跑；100% = 太严，模型永远改不完 |
| **④ 它拦的问题模型能改吗？** | 不能改的（需加字段）做成 `block` → 无限自修，烧钱 |

第 ④ 条是硬约束：**违例必须可修复，否则降级为 `warn`。** 这是 `autoFixed` 那条纪律的延伸。

### 4.2 规则注册表（唯一真相源）

新建 `src/standards/rules.ts`：

```ts
export type Domain = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7';
export type Platform = 'h5' | 'mini' | 'all';

export interface StandardRule {
  id: string;                    // 'wcag-1.4.3-contrast'
  domain: Domain;                // 归属域（唯一 owner）
  source: string;                // 'WCAG 2.2 SC 1.4.3'
  severity: 'block' | 'warn';    // block 进自修环；warn 只记录
  platform: Platform[];
  /** 判据：返回空数组 = 合规 */
  check(ctx: RuleContext): StandardViolation[];
  /** 必须有 fixture，否则自检测试失败 */
  fixtures: { pass: string[]; fail: string[] };
}
```

**规则表自检测试**（防「加了规则没测试」）：

```ts
it('每条规则都有 pass 与 fail fixture', () => {
  for (const r of RULES) {
    expect(r.fixtures.pass.length, `${r.id} 缺 pass fixture`).toBeGreaterThan(0);
    expect(r.fixtures.fail.length, `${r.id} 缺 fail fixture`).toBeGreaterThan(0);
  }
});
```

这和 `vitest-run.mjs` 校验「收集文件数 == tests 目录文件数」是同一思路：
**先锁分母，再谈比例。** 分母缩水的绿灯比红灯更危险。

### 4.3 三类测试（T1/T2/T3）

| 类 | 做什么 | 断言落点 |
|---|---|---|
| **T1 正例** | 合规 fixture 跑规则 | `violations.length === 0` |
| **T2 反例** | 注入一条违规 | `violations[0].ruleId === 'xxx'` 且 `path` 精确匹配 |
| **T3 撤销（变异测试）** | 把 `check` 换成 `() => []`，重跑 T2 | **T2 必须变红** |

**T3 是关键，也是这个项目已有的纪律**（「修 bug 要验证撤掉修复会变红」）。因为规则是**数据**（对象 + 函数），变异测试可以完全自动：

```ts
// scripts/standards-mutation.ts
for (const rule of RULES) {
  const mutated = { ...rule, check: () => [] };
  const violations = runFixtures(mutated, rule.fixtures.fail);
  if (violations.length === 0) throw new Error(`${rule.id}: 反例在空实现下仍然通过 → 测试假绿`);
}
```

**这一步能抓住 90% 的假绿**，因为假绿的本质是「断言不依赖被测实现」。

### 4.4 真产物基线（命中率区间）

规则跑真实产物（6 页零食商城 + 19 页 demo），记录命中率：

| 命中率 | 判定 | 动作 |
|---|---|---|
| **0%** | 规则没跑 / 太松 / fixture 造假 | 必查。先确认规则被调用（打点计数） |
| **1%~5%** | 健康 | 保持 |
| **5%~30%** | 偏严 | 复核判据，考虑降 `warn` |
| **>30%** | 太严 或 产物真的差 | 分两批：能改的 `block`，改不了的 `warn` |

**基线要落盘成 JSON 并可 diff**（`docs/standards-baseline.json`），和 `ai-metrics-baseline.json` 同格式。
下次改动如果命中率突变，diff 立刻可见。

### 4.5 防假绿清单（针对这个项目踩过的坑）

| 坑 | 表现 | 防法 |
|---|---|---|
| 断言落在文案 | `expect(msg).toContain('对比度')` → 改文案就假绿 | 断言 `ruleId` + `path` + `severity`，不断言 message |
| 同一文件既有 CSS 又有 DOM | `toContain(类名)` 几乎永远为真 | 用 `rules` 数组精确匹配选择器 |
| 分母缩水 | `73 passed (73)`，比例仍 100% | 用 `npm test`，不用 `npx vitest run`；规则表另加自检 |
| 像素关抓不到 | 设计本身错时两边一起错 | **这类规则必须有单测**，不能只靠视觉验收 |
| 只测合规样本 | 全绿但没证明能抓错 | 每条规则必须有 fail fixture（§4.2 自检锁死） |
| 规则互相抵消 | A 加空格、B 删空格，净效果为零 | 规则表按 `domain` 分组，同域内加「幂等测试」：跑两遍结果相同 |

最后一条尤其重要：**排版类规则最容易互相打架**（加空格 vs 保持原样）。幂等测试 =
`apply(apply(x)) === apply(x)`，能抓出震荡。

### 4.6 门禁接入

新增 `npm run standards:check`，四段：

```
S1  规则表自检（每条有 fixture）
S2  fixture 全跑（T1 正例 / T2 反例）
S3  变异测试（T3：空实现下反例必须失败）
S4  真产物跑（6 页商城 + 19 页 demo）→ 命中率对比 baseline
```

任一失败 → 非零退出。输出 `docs/standards-report.md`（人读）+ `docs/standards-baseline.json`（机读可 diff）。

**不并进 `npm test`**：它要起真实产物，慢。但 `S1~S3` 是纯内存的，可以进单测；
`S4` 单独跑。这和现有分工一致（`npm test` 快，`mall-verify` / `nav:e2e` 慢）。

### 4.7 「skill 是否生效」的终极判据

前面都是**规则层**的测试。但用户真正要问的是「**这份 skill 有没有用**」——这是另一个问题。

判据只有一条：

> **注入前后，同一个 prompt 的产物差异，能不能用规则表解释？**

- 能解释（比如注入后对比度违规从 12 条降到 0）→ skill 生效，且**可归因**
- 不能解释（产物变了但规则命中数不变）→ 那只是审美漂移，和附录 A 的结论一致

所以每个 skill 的验收不是「产物更好看」，是：

```
AI_SKILL_FILE=xxx → 生成 → 跑规则表 → 命中数变化
```

**这比像素比对更适合评 skill**：像素比对证明「产物 = 设计」，规则命中数证明「设计变对了」。

---

## 五、实施顺序

| 批 | 内容 | 域 | 改动面 | 风险 |
|---|---|---|---|---|
| **B1** | 规则注册表骨架 + 自检 + 变异测试脚本 | D8 | 新目录，~200 行 | 零（纯新增） |
| **B2** | 对比度规则（`contrast.ts` + 分级） | D1 | 2 文件，~150 行 | 零（纯新增，不改产物） |
| **B3** | 中文排版 + 文案 lint（含幂等测试） | D3 | 1 文件，~10 条 | 零 |
| **B4** | 交互态闸门（按端分流） | D2 | 1 文件，~60 行 | 零 |
| **B5** | CSS 侧补丁（`color-scheme` / safe-area） | D2 | `compile.ts`，~40 行 | **中**：改产物字节，要复跑像素关 |
| **B6** | SEO 脚本（title 唯一/长度/description） | D7 | 新脚本 | 零 |
| **B7** | axe on dist（可修规则白名单） | D1 | 新脚本 + baseline | 零 |
| **B8** | `alt` 字段（P1 第一条） | D1 | 5 处 + `.fig` 旁挂 | **中**：动 AST 与往返 |

B1 必须先做——没有规则注册表和变异测试，后面每条规则都可能是假绿。

B2/B3/B4 是纯新增检查器，不动 AST、不动出码器、不碰像素基线，可以一次做完。

B5/B8 会改产物或 AST，要单独跑门禁。

---

## 六、一句话总结

**「不冲突」不是靠挑规则挑出来的，是靠「一域一主 + 显式裁决冲突条款」设计出来的。**
**「真落地」不是靠配上了，是靠「每条规则都有 fail fixture + 空实现下必须变红」证出来的。**

---

## 七、实施记录（2026-11-01，B1~B8 全部落地）

### 7.1 交付物

| 批 | 落点 | 说明 |
|---|---|---|
| B1 | `src/standards/{types,context,color,runner,audit,fixtures,rules,index}.ts` | 规则注册表 + 上下文构建 + 自检/变异（测试与脚本**共用同一份** `audit.ts`） |
| B2 | `src/standards/rules/d1-a11y.ts` | 对比度（分级）、图片 alt、目标尺寸 |
| B3 | `src/standards/rules/d3-typography.ts` | 三条规则 + 幂等归一化（空格/全角标点/省略号） |
| B4 | `src/standards/rules/d2-behavior.ts` | 交互态（按端分流）、焦点必须改视觉 |
| B5 | `src/compiler/compile.ts` + 各端 HTML 壳 | 贴底固定元素安全区；`:root { color-scheme }`；`viewport-fit=cover` |
| B6 | `src/standards/rules/d7-seo.ts` | 标题唯一/长度（**折进规则表**，见 7.3） |
| B7 | `scripts/standards-a11y.ts` + `docs/standards-a11y-baseline.json` | axe on dist，7 条可修规则白名单 |
| B8 | schema → AI 契约 → 4 端出口 → `.fig` 旁挂 → 规则 | `alt` 全链路，12 条断言逐层验 |

门禁入口：`npm run standards:check`（S1~S4）、`npm run standards:a11y`（B7）、
`npm run standards`（两者串联）。报告落 `docs/standards-report.md`，
基线落 `docs/standards-baseline.json`（可 diff）。

### 7.2 实测（2026-11-01）

| 项 | 结果 |
|---|---|
| `tsc --noEmit` | 0 错 |
| `npm test` | **1289/1289（85 文件，校验 85/85）**，新增 4 文件 / 52 例 |
| `standards:check` | S1 12 条规则全有 fixture · S2 34 个 fixture 全过 · S3 16 次变异全变红 · S4 25 页×2 端 |
| `standards:a11y` | 25 页，`color-contrast` 176 节点 / 22 页 |
| `build` | OK |
| `fig:check` | 4 关（导入 4 文件 / 往返 19 页 / CSS 19 页 / 组件 4 项） |
| `ai-matrix` | 10/10；稳定前缀 **11363 / 12000** tokens（+28，只剩 637） |
| `recovery` | 12/12 |
| demo 像素 | **19/19 ≥ 98%**（16 层嵌套 99.18% 最低） |

### 7.3 与原方案的四处偏离（都是「两份实现会漂移」这一类）

1. **`check` 返回 `RuleHit[]` 而非完整 `StandardViolation`**：`ruleId/domain/severity/source`
   由 runner 统一盖章。语义不变（空 = 合规），好处是规则不可能标错自己的 id。
2. **不另建 `scripts/standards-mutation.ts`**：变异测试实现在 `src/standards/audit.ts`，
   被 `tests/standards-registry.test.ts`（T3）和 `standards:check` 的 S3 **共用**。
   另写一份的结局一定是两份漂移，而漂移的永远是更松的那份。
3. **B6 不另写 SEO 脚本**：`seo-page-title` 已经是 D7 规则，S4 带 `site` 上下文跑整站。
   `description` 一项**放弃**——AST 没有这个字段，加它等于再造一个「字段在、通道不在」。
4. **D5 跑在产物 CSS 上，不在 AST 上**：`StyleSchema` 没有 `transition` 字段（C15 的裁决），
   所以在 `ctx.css` 上查 `transition: all`；`ctx.css` 缺失时规则返回空并在报告里显式标注。

### 7.4 两条实测换来的判据修正

- **`ownBackground` 必须区分「没有填充」与「填充不可判定」**。第一版把两者都返回 `null`，
  于是渐变背景的卡片**继承了祖先白底**，报出一条根本不成立的对比度违例
  （`contrast-skip-gradient` 正例命中 1 条就是这么发现的）。现返回
  `{inherit | color | unknown}` 三态，`unknown` 一路传下去让规则跳过。
- **`10MB` 这类「数字+单位」必须整体保护**。第一版只保护了 token 内部，
  结果 `剩余10MB空间` → `剩余10MB 空间`（左边不加右边加），比不加更难看。
  单位词是一个整体，整体两侧都不动。

### 7.5 axe 与 AST 规则为什么不能互相替代（实测证据）

axe 在 25 页上**只报出 `color-contrast` 一条**，`image-alt` 一条都没有。
原因：出口在缺 alt 时写的是 `alt=""`，而 `alt=""` 在 HTML 语义里等于
**「这张图是装饰性的」**——axe 判定合规。于是：

- **axe 查不出「设计漏了 alt」**，它只能查「产物里的 alt 合不合法」；
- **AST 规则查不出「出口忘了写 alt」**，它只看得到 AST 字段。

两条必须同时在：AST 规则负责「该不该有」，axe 负责「出口有没有真的写出去」。
这正是 C10 要收敛白名单、而不是拿 axe 一把梭的原因。

