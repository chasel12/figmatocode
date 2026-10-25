# 前端类 Agent Skill 生态扫描（2026-10-25）

> 数据口径：**skills.sh 实时排行榜**（Vercel 维护的开放索引，按 CLI 安装次数统计）。
> 抓取时间 2026-10-25。榜单全站榜首 `find-skills` 4.0M，第 294 名约 219K。
>
> 三点必须提醒：
> 1. **安装量 ≠ 独立用户数**，也不等于质量。skills.sh 每次「某个 agent × 某个项目」安装都计一次。
> 2. 风格类 skill 的复制成本接近零，存在「一个仓库拆 11 个变体」的刷量现象（见 taste-skill）。
> 3. 不同第三方快照数字差异很大（同一技能从 371K 到 923K 都出现过），本文统一用 10-25 实时榜。

---

## 一、前端相关 Top 20（按安装量）

| # | Skill | 仓库 | 安装量 | 一句话 | 分类 |
|---|---|---|---|---|---|
| 1 | `frontend-design` | anthropics/skills | **1.0M** | 写 UI 前先定视觉方向，压掉默认「AI 味」 | **A 风格** |
| 2 | `design-mobile-apps` | designed-by-ai/skills | **1.0M** | 移动端 App 界面设计与版式 | **A 风格** |
| 3 | `vercel-react-best-practices` | vercel-labs/agent-skills | **837.3K** | 40+ 条 React/Next 性能规则，8 类按 impact 排序 | **C 技术** |
| 4 | `web-design-guidelines` | vercel-labs/agent-skills | **782.4K** | 100+ 条界面规范审查（a11y/排版/图片/暗色） | **B 规范** |
| 5 | `ui-taste` | uizze.sh | **729.4K** | UI 品味判断层 | **A 风格** |
| 6 | `remotion-best-practices` | remotion-dev/skills | **680.0K** | 用 React 生成视频的 API 与最佳实践 | **D 工具链** |
| 7 | `design-taste-frontend` | leonxlnx/taste-skill | **674.4K** | 反模板（anti-generic）布局/字体/间距约束 | **A 风格** |
| 8 | `high-end-visual-design` | leonxlnx/taste-skill | **458.8K** | 高级感预设：字体/间距/阴影/动效的具体取值 | **A 风格** |
| 9 | `redesign-existing-projects` | leonxlnx/taste-skill | **458.7K** | 审计现有站点、识别 AI 套路并替换 | **A 风格** |
| 10 | `minimalist-ui` | leonxlnx/taste-skill | **425.1K** | 极简风格预设 | **A 风格** |
| 11 | `vercel-composition-patterns` | vercel-labs/agent-skills | **417.1K** | 复合组件/状态提升/避免布尔 prop 爆炸 | **C 技术** |
| 12 | `ios-design` | uizze.sh | **414.4K** | iOS 设计语言（HIG 风格） | **A 风格** |
| 13 | `ui-ux-pro-max` | nextlevelbuilder | **414.1K** | 内置数据库：84 风格 / 192 调色板 / 74 字体对 / 98 UX 模式 | **A 风格（数据型）** |
| 14 | `gpt-taste` | leonxlnx/taste-skill | **399.5K** | 品味层（面向 GPT 系模型调校） | **A 风格** |
| 15 | `industrial-brutalist-ui` | leonxlnx/taste-skill | **396.9K** | 工业粗野主义风格预设 | **A 风格** |
| 16 | `stitch-design-taste` | leonxlnx/taste-skill | **394.9K** | 品味层（Stitch 路线适配） | **A 风格** |
| 17 | `brandkit` | leonxlnx/taste-skill | **390.7K** | 品牌套件：色彩/字体/语气一致化 | **A 风格** |
| 18 | `emil-design-eng` | emilkowalski/skills | **386.1K** | 设计工程：动画决策、缓动、弹簧、组件打磨 | **A/C 之间** |
| 19 | `image-to-code` | leonxlnx/taste-skill | **385.9K** | 截图/图片 → 前端代码 | **D 工具链** |
| 20 | `imagegen-frontend-web` | leonxlnx/taste-skill | **380.1K** | 先生成 Web 视觉稿再落地 | **A 风格（带图生）** |

紧跟其后（21–28）：`imagegen-frontend-mobile` 373.8K（A）· `design-taste-frontend-v1` 330.3K（A）·
`shadcn` 271.1K（D，组件库 CLI）· `vercel-react-native-skills` 254.2K（C）· `review-animations` 254.7K（B）·
`apple-design` 242.7K（A）· `animation-vocabulary` 237.4K（B/A）· `improve-animations` 222.5K（B）。

---

## 二、分类统计（Top 20）

| 分类 | 含义 | 数量 | 占比 | 代表 |
|---|---|---|---|---|
| **A 风格 / 审美** | 告诉 agent「做成什么样」 | **12** | 60% | frontend-design、taste-skill 全家桶、ui-ux-pro-max |
| **B 规范 / 审查** | 告诉 agent「哪里不合格」 | 1 | 5% | web-design-guidelines |
| **C 进阶技术** | 教框架/性能/架构的正确做法 | 3 | 15% | react-best-practices、composition-patterns |
| **D 工具链** | 打通某个工具/格式（组件库、视频、图→码） | 2 | 10% | remotion、shadcn、image-to-code |
| A/C 混合 | 审美 + 工程细节 | 1 | 5% | emil-design-eng |

**一句话结论：前端 skill 生态里，六成是「教 agent 审美的」，只有一成半是「教前端技术的」。**

---

## 三、技术构成拆解（为什么 A 类能刷榜）

| 分类 | 目录构成 | 技术含量 | 复制门槛 |
|---|---|---|---|
| **A 风格** | `SKILL.md`（规则 + 反模式黑名单 + 词汇表）± `references/`（风格预设、令牌表） | **纯文本资产，零代码** | 极低 → 所以出现「一个仓库 11 个变体」 |
| **A 数据型**（ui-ux-pro-max） | 结构化数据库（84 风格 / 192 调色板 / 74 字体对 / 98 UX 模式）+ 检索说明 | 数据工程 | 中（要人工整理） |
| **B 规范** | 规则表（100+ 条分 11 类）+ 可选检测脚本 | 规则枚举 + 少量脚本 | 中 |
| **C 技术** | 按 impact 分级的规则清单（40+ 条 / 8 类）+ 代码示例 + 反例 | 领域经验编码 | 中高（要有真实工程判断） |
| **D 工具链** | 调 CLI 的步骤（`shadcn add` / `tailwind` 配置）+ API 参考 + 脚本 | 集成 + 脚本 | 中（依赖具体工具版本） |

**关键观察**：A 类几乎没有「可执行部分」——它改的是模型的**先验**，不改工具链。
所以它能一夜之间被复制、被拆成风格变体、被刷量；而 C/D 类必须绑定具体版本与真实代码，复制慢但更耐久。

---

## 四、热度规律（5 条）

1. **越「不可验证」的越火。** 审美没有客观标准，但痛感最直接（"一看就是 AI 做的"），
   所以 12/20 都是风格类；性能与架构类收益延迟、需要项目上下文，安装量反而分散。
2. **供给端通胀。** taste-skill 一个仓库贡献了 top20 里 8 个位置（design-taste / high-end /
   redesign / minimalist / gpt-taste / brutalist / stitch / brandkit），本质是同一套规则换皮。
   安装量在这里衡量的是**分发能力**，不是差异化。
3. **官方三家分工清晰。** Anthropic 只出 1 个（frontend-design，做「视觉方向」）；
   Vercel 出工程规范（react-best-practices / web-design-guidelines / composition-patterns）；
   Figma 出 MCP skills（建文件、按设计系统搭屏、从设计生成代码）。**没人做「可验证的确定性出码」。**
4. **「设计→代码」是明显的洼地。** 全生态只有 `image-to-code` 385.9K 一个像样的，
   而它仍是提示词变体（让模型看着图写代码），不是编译器。
5. **审查类被低估。** `web-design-guidelines` 782.4K 是唯一进前五的非风格类，
   说明「能指出哪里错」比「教怎么写」更容易被信任——因为它可验证。

---

## 五、对 figmacode 的含义（3 条）

1. **别做第 13 个风格 skill。** A 类是红海，且赢家靠分发不靠质量；一个独立开发者进去只能拼文案。
2. **空位在「确定性 + 证据」。** 生态里所有 skill 都是「给模型加规则」，没有一个能输出
   *可复现的产物 + 像素级验收证据*。你有 `AST → 三端代码` + `Pixel Diff 98%` 这条链路，
   这正好是 A 类永远给不了的东西。
3. **skill 的技术构成应该像 C/D 类，不像 A 类。** 即：`SKILL.md` 只写触发条件与用法，
   真正干活的是 `scripts/`（编译 + 起服务 + 截图 + 比对），让 agent 拿到的是**结论和证据**，
   而不是又一段「请遵守 8px 栅格」的劝告。

---

## 六、来源

- skills.sh 实时榜（All Time）：https://www.skills.sh/
- skills.sh 排行榜续页（第 65–294 名，含 taste-skill / emil / vercel 系列）：https://www.skills.sh/?page=2
- vercel-labs/agent-skills 仓库（各 skill 的分类与规则数）：https://github.com/vercel-labs/agent-skills
- Developer Toolkit《25 Most-Installed Development-Practice Skills》(2026-09-26)：
  https://developertoolkit.ai/en/ecosystem/skills/top-practice-skills/
- Figma 官方 MCP skills 说明：https://help.figma.com/hc/en-us/articles/39166810751895
