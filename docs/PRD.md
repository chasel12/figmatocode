---
artifact: prd
version: "1.1"
created: 2026-10-03
status: approved
---

# PRD: UI Compiler v1.1 — Figma 全对照编辑器与像素级转码平台

> 范围声明（v1.1）：在 v1.0「生产级」基础上，按用户指令升级为**「最接近可上线、UI 画布功能/细节/分类完全对照 Figma、转码像素级还原」**。三项核心升级：
> **① 对照基准明确为 Figma 当前 GA 版（UI3）**——工具轨形态、右栏分区、图层类型与参数全集、菜单分类逐项对照；新增「Figma 全量对照矩阵」作唯一验收凭据（替代 32 条草案清单的唯一凭据地位，清单并入矩阵）。
> **② 转码（出码）从「≥98% 相似」升级为「像素级还原」**——CSS 映射全集 + 字体度量对齐 + 画布/出码/基准三方一致性指标。
> **③ 样片（Showcase）为核心交付物**——组件种类、参数矩阵、多 Page 设计与原型跳转的完整演示页，像素验证入报告。
> 研究前置：本版 FR 基于 2026-10-03 对 Figma 官方文档/开发者文档/社区共 30+ 次检索的细节调研（结果沉淀于 `docs/figma-parity-checklist.md` 升级版与本 PRD 各 FR 的参数条款）。

## Overview

### Problem Statement

v1.0 完成了 M1（画布手感 = A 组）与 M2（界面骨架 = D 组的三栏/主题/菜单/状态栏/图层树部分），门禁全绿（73 单测 / 16 页 ≥98% / 64 视口 / walkthrough 8/8 / 双冒烟 40/40）。（注：v1.0 的 43 条 FR 编号已废止，本版 FR-1~62 为 v1.1 重新编号。）对照用户最终要求——「**UI 画板全细节、分类完全对照 Figma；转码像素级还原；样片要展示组件种类、参数、多页面设计和跳转**」——存在四层缺口：

1. **对照深度缺口**：M2 只完成了「三栏骨架 + 菜单 + 面板分区次序」的结构复刻。Figma 的**图层类型全集**（16 类：Frame/Group/Section/Rectangle/Ellipse/Polygon/Star/Line/Arrow/Vector/Boolean/Text/Image/Component/Instance/Slice）、**每类参数全集**（四角独立+cornerSmoothing、arcData 饼环、stroke 三对齐+dash+cap+join、Effects 8 类、Fill 多层+4 型渐变+图片 7 调整、Constraints 5 档、Auto Layout 全参数含 wrap/baseline/绝对子项、Layout grids 3 型）、**UI3 工具轨形态**（底部浮动工具轨 + 左侧 navigation bar）均未实现；对照凭据仅 32 条草案清单且 0 条执行。
2. **原型/跳转缺口（用户点名）**：Prototype 右栏 tab 是 disabled 占位。多 Page 管理、触发器/动作/动画/Overlay/Flow、演示模式全部为零——样片无法展示「多页面设计和跳转」。
3. **转码精度缺口**：≥98% 只是「reference 几何基准 vs 编译渲染」单向比对；画布（Konva 渲染）与导出页（DOM 渲染）之间无一致性指标；CSS 映射缺 stroke 三对齐、渐变 4 型、backdrop-filter、blend-mode、约束百分比等关键映射；字体度量未对齐（无 Inter 托管、无显式行高策略）。
4. **样片缺口**：无任何对外可看的「组件种类 + 参数 + 多页面跳转」演示物。

**Why now**：M1/M2 已把交互与结构底座立住，剩余缺口是**对照性工作**（逐字段实现 + 逐项验证）。此刻以「全量对照矩阵」为唯一验收框架一次性锁定范围，避免按 32 条草案清单打转；原型与样片是用户验收的直接对象，先于开发明确其 FR 可防止最后阶段返工。

### Solution Summary

```
Figma UI3 全对照编辑器（16 类图层×参数全集 + 原型跳转 + 多 Page）
        │
        ▼
   UI AST（DSL）──► Layout Compiler ──► index.html + index.css（像素级映射全集）
        │                                     │
        ▼                                     ▼
  画布截图（Konva）◄── 三方一致性 ──► 导出页截图（DOM） vs reference 几何基准
        │                                     │
        └────► 样片 Showcase（组件/参数/多页/跳转）+ 全量对照矩阵报告 ◄────┘
```

- **编辑器**：Figma UI3 结构（navigation bar / 左 sidebar / 底部浮动工具轨 / 右 properties panel / 顶部文件条）、16 类图层与参数全集、右栏分区逐字段对照、原型与演示模式、多 Page。
- **转码**：HTML + 外链 CSS，CSS 映射全集 + Inter 字体度量对齐 → 画布/出码/基准三方像素一致。
- **验收框架**：Figma 全量对照矩阵（图层×参数 / 分区×字段 / 工具 / 菜单 / 原型交互）≥95% 且 ★核心 100%；样片像素 ≥99%。

### Target Users

- **主要**：前端工程师——在 Figma 式画布搭多页面、配原型跳转、导出可直接交付的像素级 HTML+CSS。
- **次要**：设计师——以 Figma 同款功能与参数做设计，并量化验收还原度。
- **技术负责人**：以对照矩阵 + 三方像素指标 + 机器验证链作为交付质量依据。

## Goals & Success Metrics

### Goals

1. **完全对照 Figma（功能/细节/分类）**：建立并执行「Figma 全量对照矩阵」（16 类图层×参数、右栏分区×字段、工具×contextual 选项、菜单×条目、原型×交互），≥95% PASS 且 ★核心 100%。
2. **转码像素级还原**：CSS 映射全集 + 字体度量对齐；样片出码 vs reference **≥99%**，画布 vs 出码一致性 **≥95%**；16 页既有基线 **≥98% 不放松**。
3. **样片交付**：`npm run showcase` 一键打开——组件种类陈列、参数矩阵、≥3 Page 设计、≥5 类原型跳转（≥3 Flow），截图与像素报告入档。
4. **原型与多 Page 可用**：触发器/动作/动画/Overlay/Flow/演示模式达到走查可演示水平。
5. **确定性不破**：AI = 0%；双跑 diff 一致；既有门禁全绿保持。
6. **工程生产化**：git + CI + 静态部署 + 1000 节点 60fps 验收。
7. **协作 MVP（P2）**：过 Go/No-Go 后实施。

### Success Metrics

| Metric | Current Baseline | Target | Timeline |
|--------|-----------------|--------|----------|
| Figma 全量对照矩阵 | 无矩阵；32 条草案清单 0/32 执行 | 矩阵建立并执行 ≥95%（★核心 100%） | M6 GA |
| 样片像素级 | 无样片 | 样片出码 vs reference **≥99%**；画布 vs 出码 **≥95%** | M6 |
| Pixel Similarity（16 页） | 16/16 ≥98%（最低 98.55% = `03-商品列表`） | **保持 ≥98% 不放松**；双跑逐页一致 | 每次 `npm run e2e` |
| 图层类型×参数覆盖 | 9 工具；Frame 拖画；参数面板 7 分区 | 16 类图层全可创建、参数全集可调且进 DSL/出码 | M4 |
| 原型跳转 | 0（Prototype tab disabled 占位） | 样片 ≥5 交互 / ≥3 Flow 走查 100% PASS | M5 |
| 多 Page | 16 demo 页只读快速打开 | ≥3 Page 新建/编辑/切换 + 样片多页设计 | M5 |
| 交互性能 | 未测量 | 拖拽/缩放 60fps（95% 帧 <16.7ms）；1000 节点达标 | M6 |
| 单测 / 门禁 | 73/73 通过，tsc+build 全绿 | 保持全绿，新 FR 均有覆盖 | 每次 `npm test` |
| 版本控制与 CI | 非 git 仓库、无 CI | git 初始化 + 门禁 CI 绿（环境具备时） | M6 |
| 协作（P2） | 无 | Go/No-Go 后分享链接实时协作 | M7 |

### Non-Goals

- 不做 AI：编译与出码保持确定性（AI = 0%）。
- 不做 Figma 文件导入（`.fig` 解析）。
- 不做多框架输出：仅 HTML + 外链 CSS。
- 不做 diff 自动修复回写 AST。
- 不做插件市场、组件市场、版本历史对比、移动端/桌面客户端。
- **不发明 Figma 没有的能力**：跨 Page 的 Navigate 跳转（Figma 原型仅限同 Page 内 Frame）——完全对照原则，见 Open Questions 口径确认。

<!-- AI Behavior and Evaluation 节省略：全链路为确定性编译，输出不来自模型，不触发该条件节。 -->

## User Stories

| ID | User Story | Priority |
|----|-----------|----------|
| US-1 | 作为设计师，我想拖空白框选、吸附出参考线、空格平移，像在 Figma 里一样 | P0 |
| US-2 | 作为设计师，我想 Ctrl+滚轮光标锚点缩放、Shift+1 适配、状态栏控缩放 | P0 |
| US-3 | 作为设计师，我想双击就地编辑中文文本（IME 正常）、右键菜单、全套快捷键 | P0 |
| US-4 | 作为设计师，我想用与 Figma UI3 一致的界面：底部工具轨、左侧导航、左栏 Pages/Layers/Assets、右栏 Design/Prototype | P0 |
| US-5 | 作为设计师，我想创建 Figma 全部 16 类图层（含 Section/Slice/箭头/多边形/星形/布尔/组件），并调节**每类的全部参数**（四角圆角、描边三对齐、8 类效果、4 型渐变、约束、Auto Layout 全项） | P0/P1 |
| US-6 | 作为设计师，我想用完整文本引擎（行高/字距/段落/两端对齐/截断/大小写/装饰/三种自适应模式）排版 | P0 |
| US-7 | 作为设计师，我想在 Prototype 面板配置触发器/动作/动画，把多个 Frame 串成可演示的跳转流 | P0 |
| US-8 | 作为设计师，我想管理多个 Page（新建/复制/重命名/切换），每个 Page 独立画布 | P0 |
| US-9 | 作为设计师，我想创建组件、插入实例、覆盖文字/图片/颜色、切换变体，并在 Assets 面板检索 | P1 |
| US-10 | 作为设计师，我想建立颜色/文字/效果/网格样式并导出 CSS variables（Design Tokens） | P1 |
| US-11 | 作为设计师，我想用钢笔画路径、做布尔运算、用蒙版裁切组 | P1 |
| US-12 | 作为前端工程师，我想一键导出 `index.html + index.css`，且**与画布像素级一致**（不是「大概像」） | P0 |
| US-13 | 作为前端工程师，我想导出页包含 assets 图片目录与 ZIP 打包，Export 设置（格式/倍率/后缀）生效 | P0 |
| US-14 | 作为前端工程师，我想打开样片：一眼看到全部组件种类、参数矩阵、3 个 Page 与 5 类跳转演示 | P0 |
| US-15 | 作为技术负责人，我想编辑器随手搭的页面也进像素验证环，三方一致性有量化报告 | P0 |
| US-16 | 作为技术负责人，我想仓库有 git 历史与 CI 门禁，构建产物可直接部署 | P1 |
| US-17 | 作为前端工程师，我想多人通过分享链接同时编辑同一项目 | P2 |

验收标准见各 FR 的 Requirement Verification Map；对照细节以「Figma 全量对照矩阵」（由 `docs/figma-parity-checklist.md` 升级而成，见 Timeline）为准。

## Scope

### In Scope

- **A 画布手感（P0，M1 已交付）**：框选、吸附参考线、空格平移、光标体系、插入指示、双击编辑、右键菜单、快捷键、对齐分布、全历史撤销、性能预算。
- **B 工具与创作参数（P0/P1）**：UI3 底部浮动工具轨与全部工具、Frame/Section/Slice、文本引擎全参数、形状参数全集（四角独立/arcData/多边形/星形/箭头）、Fill 多层与 4 型渐变与图片 7 调整、Stroke 三对齐与 dash/cap/join、Effects 8 类、图片置入、钢笔/布尔/蒙版（P1）、节点级 Export 设置。
- **C 组件与样式（P1）**：Component/Instance/Detach、四类覆盖、Assets 面板、Variants 变体、4 类样式与 tokens.css；Variables（P2）。
- **D 界面复刻 UI3（P0）**：UI3 五区结构、Figma 视觉 token（色值/Inter/11-12px）、7 菜单与快捷键面板、右栏 Design 分区逐字段全集（含 Constraints/Auto Layout 全参数/Layout grids/Selection colors/Export）、图层树/Pages、状态栏、标尺与网格。
- **E 原型与多 Page（P0）**：多 Page 管理、Prototype 面板（触发器/动作/动画/Overlay/Flow）、连接线可视化、内联预览与演示模式。
- **F 像素级出码（P0）**：HTML+外链 CSS、语义化 class、CSS 映射全集、字体度量对齐、三方像素一致性指标、VECTOR→SVG、ZIP 与预览。
- **G 验证与对标（P0）**：编辑器任意页进环、16 页基线保持、视口与产物断言、**Figma 全量对照矩阵**建立与执行。
- **H 样片（P0）**：`npm run showcase`——组件种类陈列 + 参数矩阵 + ≥3 Page 设计 + ≥5 类原型跳转 + 像素报告。
- **I 工程生产化（P1）**：git+CI、静态部署、1000 节点 60fps 验收。
- **J 协作（P2）**：分享链接 + 实时编辑；Go/No-Go 后执行。

### Out of Scope

- AI 生成/改写代码、AI 辅助布局（后续独立 PRD）。
- Figma `.fig` 文件导入、Stitch 导入。
- 多框架输出（Taro/Vue/Next/UniApp/Flutter）。
- diff 自动修复回写 AST。
- 插件市场、组件市场、版本历史对比、发布流。
- 移动端/桌面客户端（本版为 Web 应用）。
- 跨 Page Navigate 跳转（Figma 不支持，完全对照原则下不做）。

### Future Considerations

- **AI Compiler**：另立 PRD 并含 AI Behavior 节。
- **Figma 导入**：信息损失风险沿用源文档 §21 分析；导入前后必须过像素验证。
- **富文本 per-range 样式**（同段落混排字号/颜色）与行内样式覆盖——文本引擎完整版之后。
- **Figma Variables 完整版**（modes/aliasing/scopes）——P2 Go/No-Go 后评估入版或另立 PRD。
- **多断点像素 diff**、**多框架输出**：沿 v1.0。

## Solution Design

### Functional Requirements

> 优先级标注：**P0 = 本版必达（GA 前必须完成，否则不 GA；按里程碑分批交付，基线类 M1–M3 先行，验证/样片类随 M6 收口）；P1 = 本版承诺必交付（M4–M6，不再设 Go/No-Go）；P2 = Go/No-Go 后执行（M7 或评审）**。P0/P1 是「必交付」承诺，不等于实现顺序——实现顺序以 Timeline & Milestones 为准。
> 对照基准：Figma 当前 GA 版（UI3）实际行为。所有「与 Figma 有出入」的实现按 Stop and Escalate 上报，不得擅自接受差异。

#### A. 画布手感（对标 Figma 核心交互）— P0（M1 已交付，保持）

- FR-1: **框选（Marquee）**：拖空白拉框选中相交的未锁定节点；Esc 取消；空格+拖拽/抓手平移。
- FR-2: **智能吸附与参考线**：拖动相对兄弟/父容器边缘与中心吸附（≤6px），红色参考线 + 间距数值；状态栏可关；Alt 跳过。
- FR-3: **平移缩放体系**：Ctrl+滚轮光标锚点缩放（0.2×–4×）；普通滚轮平移；Shift+1 适配、Shift+2 缩放到选中、Shift+0 100%。
- FR-4: **悬停高亮与光标体系**：描边高亮 + 尺寸徽标；工具对应光标；容器边界悬停显示。
- FR-5: **拖拽插入指示**：目标容器高亮 + 插入指示线 + 索引落位；拒绝自后代（防循环）。
- FR-6: **缩放控件**：状态栏 % + 下拉（适合/50/100/200/400%）。
- FR-7: **双击就地编辑**：DOM overlay、光标定位、IME 中文组字正常、Esc/失焦提交、容器下钻。
- FR-8: **右键菜单**：剪切/复制/副本/粘贴/删除/成组/置顶·底/锁定，含快捷键提示，条目全生效。
- FR-9: **快捷键全集**：Ctrl+C/V/X/D/Z/Shift+Z/A/G、Delete、Esc、方向键 1px、Shift+方向键 10px、Tab 同级、工具字母（对照矩阵逐键核对）；快捷键表以**数据结构（布局表）驱动**而非散落硬编码，便于对照 Figma 快捷键偏好设置做重映射（自定义面板支持度按实测入对照矩阵）。
- FR-10: **多选与对齐分布**：Shift 点击/框选聚合；≥2 显示对齐 6 向 + 分布 2 向。
- FR-11: **全历史撤销重做**：全操作入栈，≥100 步，transient 合并语义保持。
- FR-12: **性能预算**：拖拽/缩放 ≥60fps（95% 帧 <16.7ms）；1000 节点可编辑；预览与提交分离。

#### B. 工具与创作参数（全集对照）— P0（除注明外）

- FR-13: **UI3 工具轨与工具全集**：底部浮动工具轨（对照 UI3 实测形态：Move/K、Frame 组（Frame/Slice/Section）、Shape 组（R 矩形/O 椭圆/…L 直线/多边形/星形/箭头，长按出子菜单）、Pen/P、Text/T、Comment（占位禁用）、Hand/H）；工具切换含快捷键与长按子菜单；**contextual options 栏**随工具切换显示该工具控件（如 Frame 尺寸、Shape 类型、Text 排版快捷、对齐分组）。
- FR-14: **Frame / Section / Slice**：拖画创建 + 设备预设（iPhone 15 Pro 393×852、iPhone SE 375×667、iPad 820×1180、Desktop 1440×900）；单击空白 100×100；Section 包裹容器（可命名/容纳 Frame）；Slice 圈定导出区域（无视觉样式，仅影响导出）；Clip content 复选语义。
- FR-15: **文本引擎（全参数）**：点击创建即进入编辑、拖画创建定宽文本；参数：字体族（Inter 托管 + 系统字体）、字号（≥1）、字重、行高（Auto/px/%）、字距（px/%）、段落间距、首行缩进、水平对齐 4（左/中/右/两端）、垂直对齐 3（上/中/下，定宽生效）、自动换行、Auto resize 3 模式（Auto width/Auto height/Fixed size）、Truncate+最大行数、Text case 5（Original/UPPER/lower/Title/Small caps）、Decoration（无/下划线/删除线）、OpenType 常用项；中西文混排换行规则沿用。
- FR-16: **形状参数全集**：矩形/Frame 四角独立 + cornerSmoothing（0–1）；椭圆 **arcData**（起止角+内径 → 饼/环）；直线 height=0 语义 + 端点 cap；**箭头**（Line arrow/Triangle 等端点样式）；**多边形** pointCount（默认 3）；**星形** pointCount（3–60）+ innerRadius；Polygon/Star 数值以画布把手为主（Figma 右栏无专属数值字段，对照实测确认）。
- FR-17: **Fill 系统（多层）**：一节点多层 fill 叠加（增删/排序/单层显隐/透明度）；类型 Solid、Linear/Radial/Angular/Diamond 四型渐变（多 stop、每 stop 色+透明度、角度把手）、Image；渐变角度出码用 `atan2` 公式换算。
- FR-18: **Stroke 系统**：宽度（**单值或四边独立**，per-side 权重）、**三对齐**（Inside/Center/Outside）、虚线 dash+gap、**cap**（None/Round/Square/5 种箭头）、join、Miter angle、颜色与每层透明度；默认 1px inside（对照 Figma 默认）。
- FR-19: **Effects 系统（8 类）**：Drop shadow（offset/blur/spread/color）、Inner shadow（同）、Layer blur、Background blur、Progressive blur（startRadius/offset，beta 口径以实测为准）、Texture、Noise（radius/density/opacity/双色）、Glass（7 参数；渲染限制按 Figma 行为：每层 1 个、SVG 不支持、与 Background blur 不共存）；效果可排序、单层显隐、入样式系统。
- FR-20: **图片置入**：Place image（Ctrl+Shift+K）、URL/data URI/本地文件；4 种 scaleMode（Fill/Fit/Crop/Tile）；**7 项调整滑杆**（Exposure/Contrast/Saturation/Temperature/Tint/Highlights/Shadows）；替换、裁切把手、空图占位。
- FR-21: **钢笔与路径（P1）**：直线段与贝塞尔、锚点选择/编辑、闭合路径、handleMirroring；描边/填充；**出码为内联 `<svg>`**。
- FR-22: **布尔运算（P1）**：Union/Intersect/Subtract/Exclude 四操作，结果节点类型 VECTOR，可继续编辑参与集。
- FR-23: **蒙版（P1）**：Use as mask（Ctrl+Alt+M），组内下方图层被上方蒙版裁切；出码为 `overflow:hidden` + 圆角/clip-path 等价。
- FR-24: **节点级 Export 设置（P0）**：每节点可配 exportSettings（format PNG/JPG/SVG/PDF、scale 1x/2x/3x、suffix）；右栏 Export 区配置；SVG/PDF 仅 1x（对照 Figma 限制）；导出物进 ZIP。

#### C. 组件与样式 — P1（M4，本版承诺）

- FR-25: **组件与实例**：选区创建 Component（紫色菱形图标 + #9747FF 徽标）、插入实例（Assets/快捷）、Detach instance；**四类覆盖**：文字、图片、颜色（fill/stroke）、可见性；覆盖持久化与重置覆盖。
- FR-26: **Assets 面板**：左栏 Assets tab，本地组件列表（分类：当前文件/本地）、搜索、点击或拖入插入；组件改名同步。
- FR-27: **样式系统**：Color/Text/Effect/Grid 四类样式创建、应用、编辑联动更新（改样式批量同步）、Detach style；样式面板位于右栏各分区顶部下拉。
- FR-28: **Design Tokens 导出**：样式与变量导出 `tokens.css`（CSS variables），命名语义化（色名/字号层级）；结构断言入单测。
- FR-29: **Variants 变体（P1）**：组件属性集（property×value 组合）、实例属性面板切换组合、默认变体、新建变体合并入组。
- FR-30: **Variables（P2）**：变量集合与 mode、颜色/数字/字符串变量绑定到参数（fill/圆角/间距等）；导出按 mode 出 class 变量组；Go/No-Go 后实施。

#### D. 界面复刻（UI3 全对照）— P0（M2 已交付骨架，M3 补全）

- FR-31: **UI3 五区结构**：左侧 navigation bar（文件/搜索/图层/资产/菜单等图标项，对照 UI3 实测）、左 sidebar（Pages/Layers/Assets）、**底部浮动工具轨**（FR-13）、右 properties panel（Design/Prototype 双 tab）、顶部文件条（文件名 + File/Edit/View 菜单入口 + Present/Share/Export 操作区）；面板宽度可拖调、Ctrl+\\ 隐藏 UI；M2 顶栏工具条按此重排。
- FR-32: **视觉 token 对照**：编辑器采用 Figma 色板——暗色画布 `#1E1E1E`、面板 `#2C2C2C`、主蓝 `#0D99FF`、组件紫 `#9747FF`、浅色底 `#F5F5F5`；Inter 字体（本地托管 woff2）；UI 字号 11/12px、行高紧凑；按钮/输入/分隔线圆角与间距对照 Figma 实测截图。
- FR-33: **菜单栏全条目**：File（新建/打开/导入/导出/发布设置…）、Edit（剪切/复制/粘贴/选择相关/设置）、View（标尺/像素预览/缩放/网格/界面隐藏）、Object（排列/组/锁定/布尔/蒙版）、Text（对齐/大小写/排版）、Plugins（占位禁用）、Help（快捷键面板 Ctrl+Shift+?、帮助）；超范围条目**置灰 + tooltip 注明本版不支持**，置灰规则入对照矩阵。
- FR-34: **右栏 Design 分区逐字段全集**（次序对照 Figma）：①组件属性/实例覆盖（组件态置顶）②Auto Layout 分区（FR-36）③对齐快捷 6 向 + X/Y/W/H/旋转 + Constraints 下拉 + Hug 图标 ④Layer 分区（blend mode 20 种 + opacity）⑤Fill 分区（FR-17）⑥Stroke 分区（FR-18）⑦Effects 分区（FR-19）⑧Layout grids 分区（3 型：Columns/Rows/Grid，count/gutter/alignment/offset/section color/visible）⑨Typography 分区（FR-15 全字段）⑩Selection colors（选中集颜色汇总，点击定位）⑪Export 分区（FR-24）；分区可折叠；Tab/Enter 提交、方向键微调沿用。
- FR-35: **Constraints 约束**：5 档×2 轴（Left/Right/Center/Scale/Top/Bottom）；Ctrl 拖容器边缘忽略约束；与 Auto Layout 互斥时显示 Auto layout 占位语义（子项在布局内则约束不生效，对照 Figma）。
- FR-36: **Auto Layout 面板全参数**：方向（横/竖）、gap（含负值）、宽高 Auto/Fixed/Hug 三态、padding 四向、9 点定位、sizing FIXED/HUG/FILL×2 轴、min/max 宽高、**wrap（no/wrap，行间距）**、**baseline alignment（首行基线对齐）**、**space-between**、clip content、**绝对定位子项**（Ignore auto layout，子项恢复自由坐标）；容器自动识别（V/H/FIXED）与右栏标签沿用。
- FR-37: **图层树与 Pages/Assets 增强**：**16 类图层图标**（对照 Figma 图标表：Frame 容器菱形/Section 方块/文本 T/矩形/椭圆/线/星形/多边形/布尔组/组件菱形/实例空心菱形/图片/切片对角线等）；Z 序拖拽、嵌套、折叠/双击改名/显隐/锁定（M2 已交付，图标升级）；**Pages 全管理**：新建/复制/重命名/删除（确认框）/排序/切换，每 Page 独立图层根；画布选中→图层自动展开、图层选中→画布高亮（M2 已交付）。
- FR-38: **状态栏 + 标尺/网格**：缩放控件、选中数、吸附开关（M2 已交付）；**Shift+R 标尺**显隐 + 从标尺拖参考线；Shift+G Layout grid 显示；View 菜单「像素预览」（非整数缩放下马赛克对照）。

#### E. 原型与多 Page 跳转（用户点名核心）— P0（M5）

- FR-39: **多 Page 管理**：见 FR-37；样片以 ≥3 Page 演示；页签切换画布即时；「页面内全部节点」持久化隔离；演示模式可浏览各 Page（见 FR-45 口径）。
- FR-40: **Prototype 面板（右栏 tab 激活）**：选中 Frame 显示交互列表（add interaction 行）；**触发器 10 类**：On click、On drag、While hovering、While pressing、Mouse enter、Mouse leave、Mouse down、Mouse up、After delay（ms）、Key（按键）；**动作 P0 六类**：Navigate to（目标同 Page Frame 下拉）、Back、Scroll to（同 Frame 目标）、Open link（URL）、Open overlay、Close overlay；**P1 动作**：Swap overlay、**Change to**（实例切换变体，随 FR-29 变体，样片悬停切换依赖）；Set variable / Conditional 随 Variables（FR-30，P2）。
- FR-41: **动画**：Instant、Dissolve、Move in/out、Push、**Smart animate**（同名图层属性插值，命名匹配规则入对照矩阵）；easing：ease-in/out/in-out/linear/gentle（对照 Figma preset 实测）；duration ms（默认值以 Figma 实测为准，默认候选 300ms）；预览内生效。
- FR-42: **Overlay**：9 定位（居中/四角/四边+手动）、背景色+透明度、点击外部关闭、Close when clicking outside、Swap overlay；出码为绝对定位浮层 + JS 开关（见 FR-46 出码口径）。
- FR-43: **Flow 起点与多 Flow**：Frame 右键「Set/Remove flow starting point」、徽标显示；一 Page 多 Flow；原型设置（背景色/设备 frame 展示为对照项）。
- FR-44: **连接线与演示/预览**：选中 Frame 显示蓝色连接点 + 目标箭头线（hover 高亮目标）；**Shift+Space 内联预览**（画布内小窗运行）；**Present 演示模式**：全屏运行、←/→ 导航历史、R 重启、H 热点提示、Esc 退出、侧栏 Flows 列表切换、设备外框可选；未配置目标时的空状态提示。
- FR-45: **跳转对照口径（完全对照 Figma）**：Navigate 目标限定**同 Page 内 Frame**；跨 Page 浏览经「回画布切 Page 后 Present」或演示侧栏切换；Figma 不支持的跨 Page Navigate **不实现**，写入对照矩阵「不支持项」栏（防误实现/误验收）；删除目标 Frame 后交互显示 broken link 置灰并可清理。

#### F. 像素级转码（出码）— P0（M3 起，M6 收口）

- FR-46: **导出形态与运行时（沿 v1.0 口径 + 扩展）**：`index.html + index.css` 外链、语义化 class（`section`/`card`/`btn`…，中文回退+撞名消歧+确定性）；**新增最小运行时**：仅承载原型行为（交互绑定、overlay 开关、history、演示导航）与图片加载失败回退，**不含布局计算**（布局全部由编译期 CSS 承担），运行时进 `runtime.js`（可关，纯展示页不引用）；确定性双跑含 runtime。
- FR-47: **CSS 像素映射全集**（对照表逐项锁定，缺项=对照矩阵 FAIL）：Auto Layout→`display:flex` 全参数（gap 含负值→margin 修正、wrap、justify-content space-between、align-items baseline、FILL→`flex:1 1 0`、HUG→`flex:0 0 auto`、min/max→`min-width/height`）；padding→`padding`；sizing→显式 px；**Stroke 三对齐**→Inside→`inset box-shadow 0 0 0 w color`（或 border+box-sizing 等价），Center→双 border 技巧，Outside→`box-shadow 0 0 0 w`；**四边独立描边→各边 border / 分边 box-shadow 组合**（与圆角兼容走 Edge Case 10）；四角 radius→`border-radius`（四角独立/百分比）；Effects→`box-shadow` 多层含 spread/inset、blur→`filter:blur`、**background blur→`backdrop-filter`**、Noise/Texture→SVG filter 或预生成资产（对照实测择优）；Fill 4 型渐变→`linear-gradient`/`radial-gradient`/`conic-gradient`（角度 `atan2` 公式 + stop 色标含透明度），**Diamond 型无原生 CSS→SVG 渐变或分层近似方案（对照实测择优，像素差入矩阵行）**；blend mode→`mix-blend-mode`（20 种对照表）；opacity→`opacity`；**Constraints 5 档→定位**（Left/Right/Center/Scale/Top/Bottom→`left/right/top/bottom/transform/百分比宽高`，含与固定尺寸的组合规则）；图片→`object-fit`（4 scaleMode）+ 7 调整→`filter:brightness/contrast/saturate/hue-rotate/sepia` 组合映射；**文字→显式 `line-height:Npx`（Auto 用字体度量算定值）、`letter-spacing:Npx`、`text-align` 含 justify、`text-transform`、`-webkit-font-smoothing:antialiased`**；auto resize→`width:auto/max-width`；Truncate→`-webkit-line-clamp`；圆角蒙版→`overflow:hidden`。
- FR-48: **字体度量对齐（像素级前提）**：Inter woff2 **本地托管**（根 `public/fonts/`，**该目录待新建**；编辑器与出码同源）；编译期测量与渲染使用同一字体族；中文字体回退序列显式声明（编辑器与出码一致）；字重→CSS font-weight 数值对照。
- FR-49: **VECTOR/布尔出码**：路径数据序列化为内联 `<svg>`（含 stroke 属性：dash/cap/join/miter、fill-rule）；arcData 饼环→SVG path；序列化确定性入单测。
- FR-50: **原型出码（P0 范围）**：Navigate/Back/Overlay/Scroll→`runtime.js` 事件绑定 + 目标锚点；动画→CSS transition/animation（duration/easing 表达，Smart animate→类切换 + 过渡）；**无 JS 模式**下页面静态呈现完整（布局/样式不依赖 JS）。导出页浏览器打开无控制台报错。
- FR-51: **三方像素一致性验证**：指标①16 demo 页 `reference` vs `render` **≥98%（不放松）**；②**画布截图 vs 导出页截图 ≥95%**（新指标，基线于 M3 首跑后由 PM 确认终值，Konva 与 DOM 渲染差异在 Mitigation 中处理）；③**样片 vs reference ≥99%**；双跑 diff 一致；任一跌破先报告再动 `src/compiler/`。
- FR-52: **ZIP 与预览**：断言 ZIP 含 `assets/`、HTML 相对引用可解析、页面根 id；`预览` 弹层内嵌导出页运行；Export 设置影响导出物命名/格式/倍率（FR-24 联动）；`npm run pages` 产物断言全绿。

#### G. 验证与对标框架 — P0（贯穿，M6 收口）

- FR-53: **编辑器任意页进环**：菜单「验证当前页」→ 该页导出 render 与画布截图比对，弹出相似度；人为降页 e2e exit 1。
- FR-54: **基线保持**：`npm run e2e` 16/16 ≥98% 且双跑一致；`npm test`/`tsc`/`build` 全绿；失败页数不减、阈值不降。
- FR-55: **视口与产物断言**：`npm run viewport` 64/64；`npm run pages` 断言 + ZIP 校验；walkthrough ≥8 项、双冒烟（m1 22/m2 18）持续绿。
- FR-56: **Figma 全量对照矩阵（新验收框架）**：`docs/figma-parity-checklist.md` 升级为矩阵——维度：①16 类图层×每类参数行（创建方式、右栏字段、DSL 字段、出码映射四列）②右栏 Design 分区×字段（逐字段：可见/可编辑/默认值/对照截图）③工具轨×contextual 选项 ④菜单×条目（含置灰规则）⑤快捷键逐键 ⑥原型触发器/动作/动画逐项 ⑦刻意不实现项（跨 Page Navigate、Variables 等）单独列「对照声明」；每行含：操作步骤、期望结果（可复现）、Figma 参照（截图/文档链接）、PASS/FAIL；**GA 通过线 ≥95% 且 ★核心（16 类创建+右栏 11 分区+原型基础+样片）100%**；逐条归档走查记录。

#### H. 样片（Showcase）— P0（M6，样片是用户验收对象）

- FR-57: **`npm run showcase` 一键交付**：构建并打开样片，含五区且像素报告入档：
  1. **组件种类陈列区**：16 类图层每类 ≥1 示例（含 Section 分组陈列、组件+实例+变体、布尔四操作、钢笔路径、Slice）；
  2. **参数矩阵区**：四角圆角差异、stroke 三对齐并排、8 类效果逐个、4 型渐变并排、blend mode 抽样、约束 5 档示意、Auto Layout 8 组合（wrap/baseline/space-between/绝对子项）、文本排版对照（对齐/case/truncate/三 resize 模式）；
  3. **多 Page 设计**：≥3 Page（如「列表页/详情页/设置页」）各自 Frame 布局完整；
  4. **原型跳转**：≥5 类交互（点击 Navigate + 动画、返回、悬停态切换、overlay 弹层、After delay/Scroll to 至少覆盖 1 项）+ ≥3 Flow + 演示模式可完整走通；
  5. **验证**：样片**初始态（无交互）**出码 vs reference ≥99%、画布 vs 出码 ≥95%（交互态走 Flow 4 走查，不入静态像素比对），截图与 diff 报告存 `dist/showcase/`。

#### I. 工程生产化 — P1（M6）

- FR-58: **git + CI**：仓库初始化 + 规范提交；门禁 CI（tsc/test/build/e2e）绿（环境具备时；不可用则记录替代本地执行凭证）。
- FR-59: **部署**：`npm run build` 产物静态托管可用；导出页脱离服务端可打开。
- FR-60: **性能验收**：1000 节点页拖拽/缩放采样 60fps（95% 帧 <16.7ms）；测量脚本入 `scripts/`。

#### J. 协作 — P2（M7，Go/No-Go 后）

- FR-61: **协作 MVP**：分享链接、双浏览器同页实时编辑（多人光标）、冲突合并、断线重连不丢数据；账号/云基础设施为本项前置（成本与隐私）。
- FR-62: **Go/No-Go**：M6 评审纪要记录协作/变体扩展/Variables 等 P2 决策；GO → 里程碑落位；NO-GO → 记录并转 Future Considerations。

### UX Flows

- **Flow 1 创作→出码**（沿 v1.0）：开文件 → 框选/拖/属性编辑（右栏逐字段）→ 对齐分布 → `生成代码` → 预览/ZIP → 像素验证入口。
- **Flow 2 对标走查**：按对照矩阵行执行操作 → 与 Figma 并排对照 → 矩阵打 PASS/FAIL → FAIL 入修复清单；GA 前矩阵 ≥95%。
- **Flow 3（新）多 Page + 原型**：Pages 新建/切换 → 各 Page 搭 Frame → Prototype tab 选 Frame → 配触发器/动作/动画 → 连接线确认 → Shift+Space 内联预览 → Present 全屏走通跳转 → 演示侧栏切 Flow/Page。
- **Flow 4（新）样片验收**：`npm run showcase` → 五区逐区目检（组件种类/参数/多页/跳转）→ 打开 `dist/showcase/` 像素报告核对 ≥99%/≥95% → 对照矩阵核心行 100% 签字。

### Edge Cases

**沿 v1.0 全部（稀疏容器命中父边界、image 占位不吞测量、9px 层级虚线、负 gap、FILL 序、底部重叠、AMP 归一化、sticky/scroll 语义、首屏稳定、non-map 入口、技术债 goto/fakeClick、IME 分词、autoplay 限制、class 升位撞名、预览层透明子项、SVG 字节序、打开不存在、路径分隔符、容器相对坐标在嵌套变换下重导、Marquee 走面板下方、空格键态串扰、TOGGLE_VISIBLE 三态、双冒烟选择器）**

**新增（原型/多 Page/像素级）**：

1. **Navigate 目标被删/移动**：交互行显示 broken（红点 + 目标缺失），Present 点击不跳转并提示；对照矩阵含「删除目标后行为」行。
2. **Overlay 目标被删**：同上 broken；Present 打开失败静默回退 + console 无未捕获报错。
3. **循环导航（A→B→A）**：history 栈上限（如 50）防无限增长；←/→ 行为可预期。
4. **Smart animate 匹配失败**：两页无同名层 → 回退 Dissolve（对照 Figma 行为，走查确认）。
5. **After delay 嵌套**：仅 Frame 级生效；演示中切换 Frame 后计时器重置，防悬挂定时器。
6. **删除 Page 含 Frame/Flow/交互**：确认框列出受影响对象数；其他 Page 指向本 Page Frame 的交互（若有，按对照口径应不存在）不产生悬挂引用。
7. **图层拖拽到其他 Page**：不支持跨 Page 拖拽（对照 Figma），拖到 Pages 列表项无落点提示。
8. **非整数缩放下文本编辑**：overlay 字号按缩放换算，光标与基线不错位（承接 FR-7/9）。
9. **图片 7 调整 + 渐变 + blend 叠加出码**：映射顺序与 Figma 渲染顺序一致（对照矩阵验证行）；`filter` 与 `mix-blend-mode` 同节点共存时出码层级正确。
10. **Center stroke 出码在圆角/渐变下**：双 border 技巧与渐变 border 的兼容（`border-image`/伪元素方案择优），对照矩阵逐案。
11. **字体未加载时首屏**：`font-display: swap` + 编译期度量用已加载字体（无 FOUT 位移导致的像素下降）；出码验证在字体就绪后截图。
12. **画布与出码截图像素差异超阈值**：先归因（字体抗锯齿/阴影模糊半径取整/子像素位移），归因报告入 `dist/` 再判定实现缺陷，禁止直接调阈值。
13. **用户意外关标签/断电（承接 v1.0）**：本地草稿自动恢复；原型编辑同样入 undo 栈。
14. **长 Press 慢速拖动**：400ms 前后行为一致（复制 vs 滚动），touch-action 禁用手势。

## Technical Considerations

- **架构约束（不改变）**：编辑器→UI AST（DSL）→Layout Compiler→`index.html + index.css`；布局语义、无头验证链、确定性（AI=0%）不变。
- **UI3 重排风险（M3）**：M2 顶栏工具条改底部浮动工具轨 + navigation bar 属**结构性返工**——选择器耦合（walkthrough/m1-smoke/m2-smoke/`toolbar button:has-text`/`.brand` 锚点）必须**同批同步**；重排后立即跑三脚本守绿。
- **Konva vs DOM 双渲染（像素级核心难点）**：画布 canvas 渲染与出码 DOM 渲染天然有抗锯齿/次像素差——对策：①字体同源同度量（FR-48）②几何值出码取整策略与画布一致（px 统一）③阴影/模糊半径映射取整规则入对照矩阵 ④画布↔出码指标独立于 reference 指标（FR-51 ①②③分离），差异先归因再修。
- **原型运行时边界**：布局零 JS、行为最小 runtime、无 JS 静态完整（FR-50）；runtime 与布局解耦便于 diff 确定性。
- **Schema 演进**：新增参数（arcData/effects 8 类/原型字段/pages 结构/exportSettings）必须**可选字段 + 默认值**，旧项目打开不破（Stop and Escalate 约束沿用）。
- **性能**：16 类图层 + 效果多层渲染走 Konva 分层缓存；连接线/参考线为覆盖层不入主渲染循环；60fps 不达标触发渲染架构 ADR（沿 v1.0 升级路径）。
- **编码铁律（全期）**：中文文件禁 PS `Get-Content`/`Set-Content`；日志 `cmd /c "… > file 2>&1"`；结论 JSON 用 `writeFileSync`；LOG/PRD 用 Read/Edit 工具；收尾扫 U+FFFD 必须为 0。

## Agent Execution Contract

### Authoritative Sources (read first)

- 产品与技术规划（**只读**）：`deepseek_markdown_20261001_fd1659.md`
- 本 PRD：`docs/PRD.md`（v1.1，本文件）
- 对照矩阵（**验收唯一凭据**）：`docs/figma-parity-checklist.md`（升级为全量矩阵）
- 修改与事故日志：`LOG.md`
- 架构事实：`src/layout/layout.ts`、`src/layout/measure.ts`、`scripts/diff.mjs`、`README.md`
- Figma 权威参照：Figma 官方 Help/Developers 文档（FR 中标注「实测为准」的字段以实际产品为准）

### Do Not Touch (without approval)

- `src/layout/layout.ts` / `src/layout/measure.ts` 的**语义**（VERTICAL/HORIZONTAL/FIXED + FIXED-FILL-HUG + margin + contentOrigin 计算）。
- `scripts/diff.mjs` 的 **98% 阈值与页数**（任何放松先走 Stop and Escalate）；FR-51 新指标（95%/99%）发布后同级锁定。
- `tests/` **只增不删**（可改断言须先报备）；`scripts/` 允许改但须同步三冒烟脚本选择器。
- 源文档 `deepseek_markdown_20261001_fd1659.md` 只读。
- P2 项（Variables/协作/跨框架）未过 Go/No-Go 不实现。
- 中文文件编码铁律（Stop and Escalate 表内）。

### Requirement Verification Map

| FR | Verification Method |
|----|---------------------|
| FR-1 | 框选命中/空选清除单测 + 走查 |
| FR-2 | 吸附距离单测 + 参考线走查（含关吸附/Alt） |
| FR-3 | 锚点缩放单测（缩放中心误差）+ 走查 |
| FR-4 | 工具光标映射单测 + 悬停走查 |
| FR-5 | 插入索引单测（含防循环/矩形规则/同父空间） |
| FR-6 | 缩放下拉走查 |
| FR-7 | IME 中文组字走查（Windows） |
| FR-8 | 右键菜单逐条走查 |
| FR-9 | 对照矩阵快捷键逐键执行 |
| FR-10 | 对齐/分布单测 + 走查 |
| FR-11 | ≥100 步撤销往返单测 |
| FR-12 / FR-60 | 1000 节点帧率采样脚本 ≥60fps |
| FR-13 | 对照矩阵工具轨逐工具 + contextual 选项走查 |
| FR-14 | 预设尺寸断言 + Section/Slice 创建走查 |
| FR-15 | 文本参数逐字段走查 + wrap/对齐单测 |
| FR-16 | 形状参数→DSL/出码单测（四角/arcData/多边形/星形/箭头） |
| FR-17 | 多层 fill/4 型渐变出码断言 + 走查 |
| FR-18 | stroke 三对齐/dash/cap/join 出码断言 + 走查 |
| FR-19 | 8 类效果参数→CSS/SVG 出码断言 + 走查 |
| FR-20 | 4 scaleMode + 7 调整出码断言 + 走查 |
| FR-21 | 路径→SVG 序列化确定性单测 + 钢笔走查 |
| FR-22 | 布尔四操作→VECTOR 出码单测 + 走查 |
| FR-23 | 蒙版→clip 等价出码断言 + 走查 |
| FR-24 | Export 设置→导出物断言（格式/倍率/后缀） |
| FR-25 | 实例覆盖持久化单测 + 四类覆盖走查 |
| FR-26 | Assets 列表/搜索/插入走查 |
| FR-27 | 样式联动更新单测 + 走查 |
| FR-28 | `tokens.css` 结构断言 |
| FR-29 | 变体组合切换单测 + 走查 |
| FR-30 | Go/No-Go 后补验证方案（PM 于 M6 评审确定） |
| FR-31 | UI3 五区对照截图走查（并排 Figma） |
| FR-32 | 色值/字号/字体断言（CSS 变量比对 Figma 色板表） |
| FR-33 | 菜单逐条走查（含置灰规则对照行） |
| FR-34 | 右栏 11 分区逐字段对照行 + Tab/Enter 走查 |
| FR-35 | 约束 5 档出码定位断言 + Ctrl 忽略走查 |
| FR-36 | Auto Layout 全参数出码断言（wrap/baseline/space-between/绝对子项） |
| FR-37 | 16 类图标对照行 + Pages 管理走查 + 双向同步回归 |
| FR-38 | 标尺/网格/像素预览走查（快捷键对照行） |
| FR-39 | 多 Page 新建/切换/隔离持久化单测 + 走查 |
| FR-40 | 触发器/动作逐项配置走查 + DSL 字段断言 |
| FR-41 | 动画/easing/duration 出码断言 + 演示走查 |
| FR-42 | Overlay 9 定位 + 关闭语义走查 + 出码断言 |
| FR-43 | 多 Flow 起点设置/显示走查 |
| FR-44 | 连接线走查 + Present（←/→/R/H/Esc）走查 + 内联预览走查 |
| FR-45 | broken link 走查 + 对照矩阵「不支持项」行核对 |
| FR-46 | 语义化 class 单测（回退/消歧/确定性）+ 无 JS 静态完整性断言 |
| FR-47 | 映射表逐项出码断言（单测锁定）+ 对照行 |
| FR-48 | 字体就绪后截图 + 编译测量与渲染同族断言 |
| FR-49 | VECTOR/布尔/arcData→SVG 确定性单测 + ≥98% 像素 |
| FR-50 | 导出页交互走查（跳转/overlay/动画）+ 控制台零报错断言 |
| FR-51 | ①16 页 ≥98% 双跑 ②画布↔出码 ≥95% ③样片 ≥99%（报告入 `dist/`）。**② M3 首跑完成（2026-10-14）：avg 98.12%、15/16≥95%、min 92.07%（14 页混排换行归因豁免，PM 终值确认待 M6）；管线 `npm run canvasdiff`** |
| FR-52 | ZIP 断言 + 预览走查 + `npm run pages` 全绿 |
| FR-53 | 「验证当前页」走查 + 人为降页 e2e exit 1 |
| FR-54 | `npm run e2e` 16/16 ≥98% 双跑 + test/tsc/build 全绿 |
| FR-55 | `npm run viewport` 64/64 + walkthrough ≥8 + 双冒烟 40/40 |
| FR-56 | 对照矩阵归档（≥95%、★100%、含 FAIL 清单） |
| FR-57 | `npm run showcase` 五区走查 + 像素报告（99%/95%） |
| FR-58 | `git log` 规范提交 + CI 绿（环境具备时） |
| FR-59 | 构建产物本地静态托管打开可用 |
| FR-61 | 协作走查：双浏览器合并一致 + 断线重连 |
| FR-62 | M6 评审纪要含 Go/No-Go 决策 |

### Stop and Escalate

| Condition | Escalate to |
|-----------|-------------|
| 任一测试页跌破 98% 且无法在不改映射语义下修复 | PM，先报告再动 `src/compiler/` |
| 画布↔出码或样片像素指标跌破（95%/99%） | PM + 编译器负责人，先出归因报告再动实现；**禁止调阈值** |
| 想修改布局语义映射 / FIXED-FILL-HUG 语义 | PM + 编译器负责人 |
| 想放宽 diff 阈值、删减测试页或跳过失败页 | PM——阈值与页数是成功指标 |
| 对照矩阵行与 Figma 实际行为不一致且无法复刻 | 记入矩阵差异栏，报 PM 定夺（接受差异/重排优先级/降级为「不支持项」声明） |
| 想实现 Figma 不支持的「扩展能力」（如跨 Page Navigate） | PM——完全对照原则，扩展须显式批准并改 PRD |
| UI3 重排导致冒烟/走查脚本大面积失败 | 先修脚本同步选择器，门禁未绿不动下一步 |
| 为达 60fps 需更换渲染架构（弃 Konva/上 WebGL/自绘） | 架构 ADR + PM 评审后执行 |
| P2 项（Variables/协作）在 Go/No-Go 前被要求实现 | PM——范围决策属 PM |
| 协作引入账号/付费云服务/数据上云 | PM——成本与隐私决策 |
| Schema 破坏性变更致旧项目打不开 | PM——向后兼容是持久化隐含要求 |
| 中文文件出现乱码/截断 | 停止操作，用编辑工具修复并记 LOG，知会项目负责人 |

## Dependencies & Risks

### Dependencies

| Dependency | Owner | Status | Impact if Delayed |
|------------|-------|--------|-------------------|
| Playwright Chromium（npmmirror 镜像） | 开发 | 已安装 | 验证链无法运行 |
| npm 镜像 registry.npmmirror.com | 开发 | 可用 | 依赖安装受阻 |
| **Figma 全量对照矩阵**（由 32 条清单升级：16 类图层×参数、右栏×字段、工具、菜单、原型） | PM + QA | **草案 32 条待升级**（研究结论已具备） | 验收凭据不稳，FR-56 无法执行 |
| Figma 实测细节（标注「实测为准」字段：UI3 面板宽度/动画默认时长/preset 表/图标表） | 设计 | **待取截图/录屏对照** | 对照行无法判定 PASS/FAIL |
| Inter woff2 字体文件（本地托管） | 开发 | 待引入 | 字体度量对齐（FR-48）无法达成，像素级受挫 |
| 版本控制与 CI | 项目负责人 | **未建立**（非 git、无 CI） | FR-58 延后，门禁仅本地人工执行 |
| 60fps 帧率采样脚本 | 开发 | 未建立 | FR-12/60 无量化验证 |
| 协作基础设施选型与成本（P2） | PM + 架构 | 未评估 | FR-61 Go/No-Go 无法决策，M7 顺延 |
| 样片素材（多 Page 示例内容文案/图片） | 设计 | 待准备 | 样片区 3/4 内容空壳，验收走查打折 |

### Risks

| Risk | Likelihood | Impact | Owner | Mitigation |
|------|------------|--------|-------|------------|
| 「完全对照 Figma」范围失控（全量矩阵行数膨胀） | H | H | PM | 矩阵分 ★核心（100%）与普通（95%）两级；P0/P1/P2 优先级锁定；新请求走 Stop and Escalate |
| UI3 底部工具轨重排破坏 M2 成果与冒烟脚本 | M | H | 开发 | 重排与脚本选择器**同批同步**，三冒烟守绿后才合入 |
| Konva↔DOM 双渲染像素差导致 95% 指标难达 | H | H | 架构 | 字体同源/取整规则统一/先归因再修（FR-51 注记），归因报告豁免机制；极端差触发渲染 ADR |
| 对标改体验破坏 16/16 像素基线 | M | H | 编译器负责人 | Do-Not-Touch + e2e 门禁先行；编辑器改动与编译改动隔离 |
| 原型 runtime 引入不确定性破坏双跑 diff | M | H | 编译器负责人 | runtime 无布局职责、事件表静态生成、确定性单测锁定 |
| 60fps 在 1000 节点+效果多层下不达标 | M | M | 架构 | Konva 分层缓存、覆盖层分离；超标触发渲染架构 ADR |
| 中文 IME 就地编辑丢字/误提交 | M | M | 开发 | FR-7 Windows+IME 走查为验收项 |
| 对照矩阵「实测为准」字段无参照图无法判定 | M | M | 设计 | M3 前集中取 Figma 参照截图，矩阵行必须带证据链接 |
| 协作 CRDT 与单机撤销栈/Schema 冲突 | H | M | 架构 | P2 前置 spike；Go/No-Go；失败移出本版 |
| 编码事故复发（PowerShell 处理中文） | L | H | 项目负责人 | 编码铁律 + LOG 教训 + 收尾 U+FFFD 扫描 |
| 范围蔓延（导入/AI/多框架/跨 Page 扩展） | M | M | PM | Out of Scope + Stop and Escalate |

## Timeline & Milestones

| Milestone | Description | Target Date |
|-----------|-------------|-------------|
| **PRD v1.1 定稿** | 全量对照/像素级/样片口径确认，三遍 review 通过后 draft → approved | 2026-10-06 |
| M1 画布手感 P0（✅ 已交付 2026-10-03） | FR-1~12 | 2026-10-16（提前） |
| M2 界面骨架 P0（✅ 已交付 2026-10-03） | FR-31 三栏骨架（顶栏形态，待 M3 重排为 UI3）、FR-32 主题、FR-33 菜单、FR-34 分区次序、FR-37 图层树、FR-38 状态栏、FR-13/14 部分 | 2026-10-30（提前） |
| M3 **UI3 全对照 + 创作参数全集 + 像素级出码基础** | FR-13~20、24、31~38、46~48（工具轨重排、形状/文本/fill/stroke/effects/约束/Auto Layout 全参数、右栏 11 分区、CSS 映射全集、字体对齐）+ FR-51 ② 画布↔出码指标**首跑定基线** + 对照矩阵升级与 M3 执行段 | 2026-11-14 |
| M4 **组件/样式/矢量** | FR-21~23、25~29（钢笔/布尔/蒙版/组件/Assets/样式/tokens/变体）+ FR-49 矢量出码 | 2026-11-28 |
| M5 **原型与多 Page** | FR-39~45（多 Page、触发器/动作/动画/Overlay/Flow、连接线、预览/演示）+ FR-50 原型出码 | 2026-12-12 |
| M6 **样片 + 全量矩阵 + 生产化 → GA** | FR-52~60（样片五区、对照矩阵 ≥95%/★100%、FR-51 三方像素**终验**、git/CI/部署/60fps）+ P2 Go/No-Go | 2027-01-09 |
| M7 协作 P2 | FR-61~62（仅 Go 后执行） | 2027-02-06 |

（日期为计划决策，逐里程碑可重排；M1/M2 已提前交付；**GA = M6**，P2 延期不影响 GA。）

## Open Questions

- [ ] **跨 Page 跳转口径**：用户点名「多页面设计和跳转」，Figma 原生仅支持同 Page 内 Frame 跳转——**默认决策：完全对照 Figma（同 Page 导航 + 演示侧栏切 Page/Flow）**；若用户需要字面跨 Page Navigate，属「扩展能力」，需批准并改 PRD。Owner: PM（定稿前与用户确认）
- [ ] **Figma 实测字段取值**（UI3 面板默认宽、动画默认时长、easing preset 表、图标表、Glass/Progressive blur 实测参数）——Owner: 设计（M3 前补参照截图）
- [ ] 对照矩阵升级完成（32 条 → 全量矩阵，★核心行标定）——Owner: PM + QA（M3 启动前）
- [ ] 画布↔出码 95% 终值确认（M3 首跑基线后由 PM 定稿）——Owner: PM（M3 评审）
- [ ] 协作技术选型与成本（Yjs 自建 vs 托管；账号体系）——Owner: PM + 架构（M6 Go/No-Go 输入）
- [ ] 60fps 场景节点数与机器基线——Owner: 架构（M6 验收前）
- [ ] 文本引擎中文字体族范围（系统字体 vs 引入 Web 字体）——Owner: 设计
- [x] 转码输出口径？——**决策：HTML + 外链 CSS、语义化 class（v1.0 定稿）**
- [x] Taro 是否保留在本版？——**决策：移出，转 Future Considerations**
- [x] 验证链去留？——**决策：保留并扩大到编辑器任意页（FR-53）**
- [x] 对标深度？——**决策：v1.1 升级为「Figma 全量对照矩阵」，P0/P1 承诺 + P2 Go/No-Go**
- [x] 98% 阈值按页分级？——**决策（v1.1）：不分级，16 页统一 ≥98% 保持**；新增 95%/99% 为独立指标不与既有阈值互替

## Appendix

### Related Documents

- 产品与技术规划（**只读**源文档）：`deepseek_markdown_20261001_fd1659.md`
- 产品介绍与命令：`README.md`
- 修改与事故日志：`LOG.md`
- 像素基线报告：`dist/pages/diff-report.json`
- 对照验收唯一凭据（待升级为全量矩阵）：`docs/figma-parity-checklist.md`
- 走查/重叠判据/文档偏差三证据：`dist/walkthrough/index.html`
- M2 冒烟：`dist/walkthrough/m2-smoke.json`（18/18）
- 架构决策记录（ADR）：待建 `docs/architecture/`（渲染架构等决策落此处）

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-10-02 | opencode | 基于源规划文档 v1.0 与当前实现基线起草，覆盖 Phase 0–3 |
| 0.2 | 2026-10-02 | opencode | deliver-prd 质量清单修正：删空 AI 节、补 Why now、Risks 加 Owner、测试页 ID 纠错、§16 差异声明、Palette 口径、FR 拆分验证行、里程碑对齐 |
| 0.3 | 2026-10-02 | opencode | 二轮评审（代码库事实核查）：门禁措辞去 git/CI 假设并新增依赖行、补确定性指标行、FR-9/FR-7 口径精确化、FR-13 补粘贴、验证表加口径注、基线最低页精确到 `03-商品列表` |
| 1.0 | 2026-10-02 | opencode | **范围重构为生产级产品**：反转「不追求 Figma 级画布」决策（画布手感/界面复刻/创作工具/组件系统全部入范围，P0/P1/P2 分批）；转码目标改 HTML+外链 CSS、语义化 class，Taro 移出；验证链保留并扩大（编辑器任意页进环 FR-35）；协作首入范围（P2 过 Go/No-Go）；43 条 FR 全量重排并逐条配验证；里程碑延展至 2027-02（GA = M6） |
| 1.1 | 2026-10-03 | opencode | **Figma 全对照 + 像素级 + 样片三大升级**（基于 30+ 次 Figma 官方/社区检索研究）：对照基准明确 UI3；16 类图层×参数全集、右栏 11 分区逐字段、工具轨 contextual 选项、菜单置灰规则全部入 FR（FR-13~24、31~38）；**Prototype/多 Page/演示模式从 0 入范围（FR-39~45，P0）**；**样片为核心交付（FR-57，五区+99%/95% 像素指标）**；转码升级 CSS 映射全集+字体度量对齐+三方像素一致性（FR-46~51）；32 条清单升级为全量对照矩阵作唯一验收凭据（FR-56）；变体/布尔/多边形/星形/钢笔/蒙版从 P2 提升为 P1 承诺；FR 扩至 62 条并逐条配验证；里程碑重排（M3=UI3+参数+像素基础，M5=原型，M6=样片+矩阵 GA）；新增原型/像素级 Edge Case 14 条与对应 Stop and Escalate |
| 1.1r1 | 2026-10-03 | opencode | **三遍评审通过，draft → approved**。Pass1 结构/清晰度：修正 Problem Statement 旧 FR 编号引用（v1.0 编号废止注记）、P0 定义与 M5/M6 交付矛盾（改为「GA 前必达，按里程碑分批」）、FR-51 补齐 M3 首跑/M6 终验映射、M2 里程碑交付行补全。Pass2 对照研究：补四边独立描边（FR-18/47）、Change to 动作（FR-40，随变体）、Shift+2 缩放到选中（FR-3）、快捷键布局表驱动与重映射（FR-9）。Pass3 可实现性/事实核对：Diamond 渐变无原生 CSS 出码方案（FR-47）、`public/fonts/` 待新建注记（FR-48，实测目录不存在）、样片像素比对限定初始态（FR-57）。U+FFFD 扫描 0 |
| 1.1r2 | 2026-10-14 | AutoClaw | **FR-51② M3 首跑落盘（里程碑收口注记，非范围变更）**：②画布↔出码基线首跑 avg 98.12%、15/16≥95%、min 92.07%（14 页混排换行归因豁免，矩阵差异与结论 #1）；管线 `npm run canvasdiff`（`scripts/canvas-diff.mjs`，e2e 通道 `VITE_E2E_HOOK=1` 构建注入 `window.__UIC_E2E__` 只读快照+既有 captureRegion 导出 API）；顺带修复画布渐变静默失效（fills 迁移+colorStops 成对格式+fillPriority）与 Konva 文本基线 ~1px 偏移（`_fixTextRendering`）两缺陷；验证映射表 FR-51 行补首跑结果 |




