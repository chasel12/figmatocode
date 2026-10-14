# UI Compiler 完整产品与技术规划文档

> 版本：v1.0  
> 定位：结构化 UI 编译平台  
> 核心链路：UI Sources → UI AST → Layout Compiler → Responsive Compiler → Code Generator → Browser Renderer → Pixel Diff → Auto Fix

---

# 目录

1. 产品概述
2. 核心原则
3. 总体架构
4. 开发阶段总览
5. Phase 0：技术底座
6. Phase 1：本地 UI Editor MVP
7. Phase 2：UI → Taro 高还原编译器
8. Phase 3：Pixel Diff Engine
9. Phase 4：Figma Import
10. Phase 5：AI Compiler
11. Phase 6：产品化
12. Phase 7：多框架
13. MVP 明确范围
14. MVP 用户完整流程
15. MVP 成功标准
16. MVP 测试页面
17. 推荐项目目录
18. 开发顺序
19. 技术选型与开源复用
20. 画布方案决策
21. 输入源兼容性与信息损失风险
22. 最终产品形态
23. 核心技术壁垒
24. 第一阶段最终 Demo
25. 产品长期路线
26. 产品一句话定义
27. 附录：文档维护建议
28. 附录：术语表

---

# 1. 产品概述

## 1.1 产品名称

UI Compiler（暂定名）

## 1.2 产品定位

UI Compiler 是一个以**结构化 UI 编译**为核心的设计转代码工具。

产品不是采用“截图 → AI 视觉识别 → 猜测 HTML/CSS”的传统路线，而是：

> 将 UI 设计数据解析成统一的 UI AST / IR，再通过 Layout Compiler、Responsive Compiler 和 Code Generator，生成高还原度前端代码。

核心链路：

```text
UI 编辑器 / Figma / Stitch
          ↓
       UI AST
          ↓
   Layout Compiler
          ↓
 Responsive Compiler
          ↓
    Code Generator
          ↓
   Taro / React / Vue
          ↓
    Browser Renderer
          ↓
     Pixel Diff
          ↓
      Auto Fix
          ↓
      Compiler
```

## 1.3 核心目标

第一阶段目标：

> 在本地完成“创建 UI → 生成 Taro 代码 → H5 渲染 → 像素对比”的完整闭环，并达到非常高的视觉还原度。

长期目标：

> 构建一个能够将 Figma、Stitch、自有编辑器等多种 UI 来源统一编译为前端代码的 UI Compiler 平台。

## 1.4 产品一句话定义

> **UI Compiler 是一个把结构化 UI 设计数据直接编译成高还原前端代码的 UI 编译器，通过 UI AST、Layout Compiler、Responsive Compiler 和 Pixel Diff，解决传统 AI 截图转代码在布局、间距和响应式方面的不稳定问题。**

---

# 2. 产品核心原则

## 2.1 设计数据优先

不以图片作为主要输入，而是优先使用结构化设计数据。

传统方式：

```text
设计稿截图 → AI 视觉识别 → 猜测布局 → 生成代码
```

本产品：

```text
结构化 UI 数据 → UI AST → 确定性 Layout Compiler → 代码
```

## 2.2 Compiler 优先

产品真正的核心不是 Canvas，而是：

```text
UI AST
+
Layout Compiler
+
Responsive Compiler
+
Code Generator
+
Pixel Diff
```

Canvas、Figma、Stitch 都只是 UI AST 的输入来源。

## 2.3 AI 辅助而非核心

AI 后期用于：

- 组件命名
- 组件拆分
- 复杂布局分析
- 异常布局解释
- Pixel Diff 修复建议

AI 不负责直接猜测整个页面 CSS。AI 不直接修改 CSS，而是：

```text
UI AST → AI Suggestion → Compiler → Code
```

## 2.4 MVP 不做 AI

第一版明确：

```text
AI = 0%
```

先做到：

```text
确定性输入 → 确定性 AST → 确定性 Compiler → 确定性 Code
```

这样才能判断：到底是 Compiler 不行，还是 AI 不行。

## 2.5 先做编译器，再做编辑器

开发顺序必须是：

```text
UI AST → Layout Compiler → Taro Generator → Canvas → Pixel Diff
```

不要反过来先做 Canvas。Canvas 只是 AST 的输入工具，不是壁垒。

---

# 3. 产品总体架构

```text
                    UI SOURCES
                        │
       ┌────────────────┼────────────────┐
       │                │                │
      Figma           Editor           Stitch
       │                │                │
       └────────────────┼────────────────┘
                        ↓
                   UI AST / IR
                        ↓
               ┌─────────────────┐
               │ Layout Compiler │
               ├─────────────────┤
               │ Flex            │
               │ Grid            │
               │ Absolute        │
               │ Constraint      │
               │ Responsive      │
               │ Typography      │
               │ Component       │
               └────────┬────────┘
                        ↓
                 Code Generator
                        ↓
       ┌────────────────┼────────────────┐
       ↓                ↓                ↓
     Taro             React             Vue
       │                │                │
       └────────────────┼────────────────┘
                        ↓
                   Browser
                        ↓
                   Screenshot
                        ↓
                    Pixel Diff
                        ↓
                  Auto Fix Engine
                        │
                        └────────→ Compiler
```

---

# 4. 开发阶段总览

产品分为 8 个阶段（含 Phase 0）：

| 阶段 | 名称 | 核心目标 | 结果 |
|---|---|---|---|
| Phase 0 | 技术底座 | UI Schema + Compiler 基础 | JSON → CSS |
| Phase 1 | 本地 UI Editor MVP | 本地创建 UI | 可视化编辑 |
| Phase 2 | 高还原代码生成 | UI → Taro | Taro 项目 |
| Phase 3 | Pixel Diff | 自动检测视觉差异 | 差异报告 + Auto Fix |
| Phase 4 | Figma Import | Figma → UI AST | Figma 输入 |
| Phase 5 | AI Compiler | AI 辅助编译 | 语义增强 |
| Phase 6 | 产品化 | 项目、组件、版本、云端 | SaaS 能力 |
| Phase 7 | 多框架 | Taro / React / Vue 等 | 多目标输出 |

---

# 5. Phase 0：技术底座

## 5.1 阶段目标

建立整个产品的核心数据模型和编译能力。这一阶段不要求完整 UI 编辑器。

目标：

```text
UI AST → Layout Compiler → CSS Model
```

## 5.2 UI Schema

统一定义 UI Node。

基础 Node 类型：

```text
PAGE
FRAME
TEXT
IMAGE
RECTANGLE
BUTTON
```

后续扩展：

```text
INPUT
ICON
COMPONENT
INSTANCE
LIST
SCROLL
```

示例：

```json
{
  "id": "page",
  "type": "FRAME",
  "layout": {
    "mode": "VERTICAL",
    "width": "FIXED",
    "height": "FIXED",
    "gap": 16,
    "padding": [16, 16, 16, 16]
  },
  "style": {
    "background": "#FFFFFF",
    "borderRadius": 12
  },
  "children": []
}
```

## 5.3 Layout Schema

支持：

```text
FIXED
FILL
HUG
```

布局：

```text
VERTICAL
HORIZONTAL
ABSOLUTE
```

属性：

```text
width
height
padding
margin
gap
align
justify
flexGrow
flexShrink
position
x
y
```

## 5.4 Style Schema

支持：

```text
background
color
border
borderRadius
opacity
boxShadow
fontFamily
fontSize
fontWeight
lineHeight
letterSpacing
textAlign
```

## 5.5 Compiler

输入：

```text
UI AST
```

输出：

```text
CSS Model
```

例如：

```text
VERTICAL
gap = 16
padding = 16
```

转换为：

```css
display: flex;
flex-direction: column;
gap: 16px;
padding: 16px;
```

## 5.6 Auto Layout → CSS 映射表

这是 MVP 最值得做的部分，因为设计数据明确，不需要猜测。

| UI 属性 | CSS 输出 |
|---|---|
| `VERTICAL + gap=8` | `display: flex; flex-direction: column; gap: 8px;` |
| `HORIZONTAL + gap=12` | `display: flex; flex-direction: row; gap: 12px;` |
| `padding: [16,16,16,16]` | `padding: 16px;` |
| `layoutGrow = 1` | `flex: 1;` |
| `SPACE_BETWEEN` | `justify-content: space-between;` |
| `CENTER` | `align-items: center;` |
| `FILL + parent padding=16` | `width: 100%; box-sizing: border-box;` |
| `HUG` | `width: fit-content;` |
| `FIXED` | `width: <value>px;` |
| `ABSOLUTE + x + y` | `position: absolute; left: x; top: y;` |

## 5.7 Responsive Compiler（Phase 0 原型）

例如设计：

```text
375px
左右 16px
```

不应生成：

```css
width: 343px;
```

而应生成：

```css
width: 100%;
padding-inline: 16px;
box-sizing: border-box;
```

或：

```css
width: calc(100% - 32px);
margin: 0 16px;
```

这样 375 / 390 / 414 / 768 都能正常变化。

## 5.8 Phase 0 验收标准

必须实现：

- UI Tree 正确
- Layout 计算正确
- CSS 计算正确
- 子节点尺寸正确
- Padding 正确
- Gap 正确
- Flex 正确
- Absolute 正确

能够使用手写 JSON 创建至少 5～10 个页面进行编译测试。

---

# 6. Phase 1：本地 UI Editor MVP

## 6.1 阶段目标

实现一个轻量级本地 UI 编辑器。

用户能够：

```text
新建项目 → 创建 UI → 调整布局 → 保存项目
```

第一版不追求 Figma 的完整能力。

## 6.2 MVP 界面草图

```text
┌──────────────────────────────────────────────┐
│ UI Compiler             Preview    Generate │
├────────┬───────────────────────┬─────────────┤
│        │                       │             │
│ Frame  │                       │   Layout    │
│ Text   │       Canvas          │   Width     │
│ Image  │                       │   Height    │
│ Button │      ┌─────────┐      │   Padding   │
│        │      │         │      │   Gap       │
│        │      │  Card   │      │   Font      │
│        │      │         │      │   Color     │
│        │      └─────────┘      │             │
│        │                       │             │
└────────┴───────────────────────┴─────────────┘
                 [生成 Taro]
```

## 6.3 Canvas

核心功能：

- 画布
- 缩放
- 平移
- 单选
- 多选
- 删除
- 复制
- 粘贴
- 撤销
- 重做

**关键设计原则**：不要让 Canvas 直接产生 HTML。Canvas 只负责产生 UI Node Tree。

## 6.4 创建元素

左侧组件栏：

```text
Frame
Text
Image
Button
Rectangle
```

支持拖拽或点击创建。

## 6.5 Selection

选中元素显示：

```text
Width
Height
X
Y
```

并提供可视化边框。

## 6.6 Resize

支持：

- 拖动四角
- 拖动边
- 输入数字
- 保持比例
- 自动吸附

## 6.7 属性面板

### Layout

```text
Width
Height
Padding
Gap
Direction
Align
Justify
```

### Style

```text
Background
Border
Radius
Shadow
Opacity
```

### Typography

```text
Font
Size
Weight
Line Height
Color
Text Align
```

## 6.8 Layers

提供层级树：

```text
Page
 ├── Header
 │    ├── Back
 │    └── Title
 │
 ├── Card
 │    ├── Image
 │    └── Text
 │
 └── Button
```

## 6.9 本地项目

第一版不需要服务器。

项目结构：

```text
my-project/
├── project.json
├── assets/
└── preview/
```

支持：

- 新建
- 打开
- 保存
- 另存为

## 6.10 Phase 1 验收标准

用户必须能够完成：

```text
新建项目
 ↓
创建 Frame
 ↓
创建 Text
 ↓
创建 Image
 ↓
创建 Button
 ↓
调整尺寸
 ↓
调整 Padding
 ↓
调整 Gap
 ↓
保存 JSON
 ↓
重新打开
```

重新打开后布局和属性不能丢失。

---

# 7. Phase 2：UI → Taro 高还原编译器

## 7.1 阶段目标

这是第一版 MVP 最核心的阶段。

实现：

```text
UI AST → Taro TSX + SCSS + Assets
```

## 7.2 Node 映射

| UI Node | Taro |
|---|---|
| Frame | View |
| Text | Text |
| Image | Image |
| Button | View / Button |
| Rectangle | View |

例如：

```text
Frame
 ├── Text
 └── Image
```

生成：

```tsx
<View className="container">
  <Text className="title">
    Hello
  </Text>

  <Image className="image" />
</View>
```

## 7.3 CSS Compiler

重点不是机械翻译属性，而是理解布局意图。

例如：

```text
width = FILL
parent padding = 16
```

生成：

```css
width: 100%;
```

而不是：

```css
width: 343px;
```

## 7.4 Responsive Compiler

必须支持：

```text
Fixed
Fill
Hug
Flex
Absolute
```

例如设计：

```text
375px
左右 16px
```

优先生成：

```css
width: 100%;
padding-inline: 16px;
box-sizing: border-box;
```

而不是固化为：

```css
width: 343px;
```

## 7.5 命名系统

第一版：

```text
Frame → frame-1
Text → text-1
```

后续 AI 优化：

```text
Header
ProductCard
ProductTitle
Price
PrimaryButton
```

## 7.6 Asset 系统

支持：

```text
PNG
JPG
SVG
WebP
```

输出：

```text
assets/
├── logo.png
├── product.png
└── icon.svg
```

## 7.7 一键生成

顶部提供：

```text
[预览] [生成代码]
```

生成：

```text
dist/
├── pages/
│   └── index/
│       ├── index.tsx
│       └── index.scss
├── components/
└── assets/
```

## 7.8 Phase 2 验收标准

准备至少 10 个测试页面：

1. 登录页
2. 注册页
3. 商品列表
4. 商品详情
5. 订单列表
6. 订单详情
7. 个人中心
8. Dashboard
9. 表单页
10. 复杂嵌套页面

必须实现：

```text
UI Editor → UI AST → Taro → H5
```

并达到高视觉还原度。

---

# 8. Phase 3：Pixel Diff Engine

## 8.1 阶段目标

建立：

```text
设计 → 代码 → 截图 → 对比 → 修正
```

的闭环。

## 8.2 Browser Renderer

使用 Playwright：

```text
Taro → H5 → Playwright → Screenshot
```

## 8.3 Reference Image

Canvas 生成：

```text
reference.png
```

代码页面生成：

```text
render.png
```

## 8.4 Pixel Diff

比较：

```text
reference.png VS render.png
```

输出：

```text
Similarity: 98.6%
```

## 8.5 差异区域

展示：

```text
Card
位置误差：2px
宽度误差：1px
高度误差：0px
字体误差：0px
```

同时生成 Diff Overlay。

## 8.6 差异分类

自动分类：

```text
Layout
Typography
Color
Spacing
Size
Position
```

## 8.7 分级输出示例

```text
Pixel Match: 98.7%
Layout: 99.6%
Typography: 98.2%
Color: 99.9%
```

## 8.8 Auto Fix

第一版只处理确定性较高的属性：

```text
width
height
padding
gap
margin
font-size
line-height
```

例如：

```text
发现：Card width + 2px
修改：width -= 2
```

重新编译并截图。

## 8.9 Phase 3 验收标准

完整跑通：

```text
设计 → 生成代码 → 运行 H5 → 截图 → Pixel Diff → 定位差异 → 修改 → 重新截图
```

注意：MVP 阶段先不要把“自动修正”做得很复杂，先做到**可检测、可定位**。

---

# 9. Phase 4：Figma Import

## 9.1 阶段目标

将 Figma 作为 UI AST 的输入源。

流程：

```text
Figma → Figma Parser → UI AST → Layout Compiler → Taro
```

## 9.2 Figma Node

重点读取：

```text
Frame
Group
Text
Image
Component
Instance
Auto Layout
Constraints
Styles
Variables
```

## 9.3 Figma Adapter

示例：

```text
Figma Auto Layout
 ↓
UI AST

layout.mode = horizontal
gap = 12
padding = 16
```

## 9.4 Responsive

重点处理：

```text
Constraints
Auto Layout
Fill
Hug
Fixed
```

不能简单把：

```text
x
y
width
height
```

直接变成绝对定位。

## 9.5 Figma Component

流程：

```text
Figma Component → UI Component → Taro Component
```

## 9.6 Figma Asset

支持：

```text
Images
SVG
Icons
Fonts
```

## 9.7 Phase 4 验收标准

实现：

```text
Figma → Import → UI AST → Taro → H5 → Pixel Diff
```

视觉结果与 Figma 设计稿高度一致。

---

# 10. Phase 5：AI Compiler

## 10.1 阶段目标

AI 作为 Compiler 的辅助能力，而不是直接生成页面。

AI 不负责“看图片猜 CSS”，而负责：

```text
UI AST → AI → 语义理解
```

## 10.2 自动命名

例如：

```text
Frame 123 → ProductCard
```

## 10.3 自动组件拆分

识别：

```text
Header
ProductCard
BottomNavigation
```

自动形成组件。

## 10.4 布局分析

当结构无法确定时：

```text
两个元素关系不明确
```

AI 提供：

```text
建议使用 Flex
```

## 10.5 Pixel Diff AI

例如：

```text
标题向下偏移 3px
```

AI 分析：

```text
可能原因：line-height
```

再交给 Compiler 修改。

## 10.6 AI 安全原则

不要：

```text
AI → 直接修改 CSS
```

推荐：

```text
UI AST → AI Suggestion → Compiler → Code
```

这样能够保证可控性和可复现性。

---

# 11. Phase 6：产品化

## 11.1 用户系统

支持：

- 登录
- 注册
- 用户中心

## 11.2 项目管理

```text
我的项目
Project A
Project B
Project C
```

## 11.3 云端保存

```text
Project
 ├── Pages
 ├── Components
 ├── Assets
 └── Versions
```

## 11.4 Version

支持：

```text
Version 1
Version 2
Version 3
```

功能：

- Preview
- Compare
- Restore

## 11.5 Component Library

建立：

```text
Button
Card
Input
Navbar
Tabbar
Modal
```

支持复用。

## 11.6 Design Tokens

支持：

```text
Colors
Typography
Spacing
Radius
Shadow
```

例如：

```text
primary = #1677FF
spacing-md = 16
radius-md = 8
```

代码：

```css
var(--primary)
var(--spacing-md)
var(--radius-md)
```

---

# 12. Phase 7：多框架

统一：

```text
UI AST
```

不同：

```text
Code Generator
```

架构：

```text
             UI AST
                │
      ┌─────────┼─────────┐
      ↓         ↓         ↓
    Taro      React      Vue
      ↓         ↓         ↓
    TSX       JSX       Vue
```

后续可支持：

```text
Taro
React
Vue
Next.js
UniApp
Flutter
```

---

# 13. MVP 明确范围

## 13.1 MVP 必须有

```text
✅ 本地运行
✅ Canvas
✅ Frame
✅ Text
✅ Image
✅ Button
✅ Rectangle
✅ Vertical Layout
✅ Horizontal Layout
✅ Absolute Layout
✅ Fixed
✅ Fill
✅ Hug
✅ Padding
✅ Gap
✅ Alignment
✅ Typography
✅ Color
✅ Border
✅ Radius
✅ Shadow
✅ 图片资源
✅ UI AST
✅ Taro Generator
✅ SCSS Generator
✅ H5 Preview
✅ Playwright
✅ Pixel Diff
```

## 13.2 MVP 不做

```text
❌ 登录
❌ 云端
❌ 团队协作
❌ 在线数据库
❌ AI
❌ Figma
❌ 多框架
❌ 插件市场
❌ 复杂组件市场
❌ 权限系统
```

## 13.3 MVP 组件范围

只做 5 个组件：

```text
Frame
Text
Rectangle
Image
Button
```

## 13.4 MVP 布局范围

只做 3 种布局：

```text
Vertical
Horizontal
Absolute
```

## 13.5 MVP 属性范围

```text
width
height
padding
margin
gap
x
y
background
border
border-radius
font-size
font-weight
line-height
letter-spacing
color
opacity
box-shadow
align
justify
flex-grow
```

---

# 14. MVP 用户完整流程

```text
打开 UI Compiler
        ↓
创建项目
        ↓
创建 375 × 812 页面
        ↓
拖入 Frame
        ↓
设置 Padding 16
        ↓
设置 Vertical
        ↓
加入图片
        ↓
加入标题
        ↓
加入价格
        ↓
加入按钮
        ↓
点击「生成 Taro」
        ↓
自动生成项目
        ↓
启动 H5
        ↓
Playwright 截图
        ↓
Pixel Diff
        ↓
自动定位差异
        ↓
修正 Compiler / AST
        ↓
重新生成
        ↓
得到高还原页面
```

---

# 15. MVP 成功标准

不要以“代码可以运行”为唯一标准。需要分层验证：

### Level 1：结构

```text
UI 结构正确
```

### Level 2：尺寸

```text
Width / Height 正确
```

### Level 3：间距

```text
Padding / Gap / Margin 正确
```

### Level 4：Typography

```text
字体
字号
字重
行高
```

### Level 5：视觉

```text
颜色
圆角
边框
阴影
透明度
```

### Level 6：Responsive

```text
375
390
414
768
```

等不同 viewport 下保持合理布局。

### Level 7：Pixel Similarity

目标为高还原度，例如 98%+。

具体阈值需要根据浏览器、字体、抗锯齿、截图环境等因素建立统一测试环境后确定。

---

# 16. MVP 测试页面

建议至少准备 10～20 个测试页面：

```text
01 登录页
02 注册页
03 商品列表
04 商品详情
05 订单列表
06 订单详情
07 个人中心
08 设置页
09 Dashboard
10 表单页
11 Card 列表
12 Tab 页面
13 Navbar 页面
14 长文本页面
15 图片密集页面
16 多层嵌套页面
```

重点覆盖：

```text
Flex
Padding
Gap
Image
Text
Long Text
Short Text
Button
Nested Layout
Fixed
Fill
Hug
Absolute
```

---

# 17. 推荐项目目录

```text
ui-compiler/
│
├── editor/
│   ├── canvas/
│   ├── selection/
│   ├── drag/
│   ├── resize/
│   └── property-panel/
│
├── schema/
│   ├── node.ts
│   ├── layout.ts
│   ├── style.ts
│   └── component.ts
│
├── compiler/
│   ├── layout/
│   │   ├── flex.ts
│   │   ├── absolute.ts
│   │   └── responsive.ts
│   │
│   ├── style/
│   ├── typography/
│   └── assets/
│
├── generator/
│   └── taro/
│       ├── tsx.ts
│       ├── scss.ts
│       └── project.ts
│
├── renderer/
│   └── playwright/
│
├── diff/
│   ├── image-diff/
│   └── auto-fix/
│
├── adapters/
│   └── figma/
│
└── ai/
    ├── naming/
    ├── component/
    └── diff/
```

---

# 18. 开发顺序

严格建议按照：

```text
① UI AST
      ↓
② Layout Compiler
      ↓
③ Taro Generator
      ↓
④ Canvas
      ↓
⑤ Pixel Diff
      ↓
⑥ Responsive Compiler
      ↓
⑦ Figma Import
      ↓
⑧ Component System
      ↓
⑨ AI
      ↓
⑩ 云端产品化
```

不要一开始同时做：

```text
Canvas
+
AI
+
Figma
+
云端
+
团队协作
```

因为真正决定“代码质量”的 Compiler 反而会很弱。

---

# 19. 技术选型与开源复用

## 19.1 技术栈建议

| 层次 | 技术选型 | 理由 |
|---|---|---|
| 语言 | TypeScript | 类型安全对编译器项目至关重要 |
| 前端框架 | React | 生成目标包含 React/Taro，生态成熟 |
| 画布 | React Konva（推荐） | 声明式、MIT、事件系统完善 |
| 构建工具 | Vite | 快速冷启动 |
| 编译器 | 自研 | Layout Compiler 是核心壁垒 |
| 截图 | Playwright | 成熟稳定 |
| 像素对比 | pixelmatch + SSIM | 业界标准 |

## 19.2 值得复用的开源项目

| 项目 | 用途 | 适用阶段 | 复用价值 |
|---|---|---|---|
| Bricks | Figma 插件 + VS Code 扩展 + 转换引擎 | Phase 2 / 4 | 高 |
| figma-to-react | Auto Layout → React | Phase 2 / 4 | 高 |
| FigmaToCode | HTML / React / Svelte / Tailwind 转换 | Phase 2 | 高 |
| openfig-core | .fig 解码 | Phase 4 | 中 |
| figma2html | HTML/CSS 导出 + 响应式 Frame | Phase 4 | 中 |
| Playwright | 浏览器截图 | Phase 3 | 高 |
| VisiDiff | 多视口截图 + 差异报告 | Phase 3 | 高 |
| Code-To-Figma-Plugin | Stitch HTML/CSS → 中间设计树 → Figma | Phase 4 备选 | 中 |

## 19.3 模块与开源项目对应关系

| 模块 | 可复用技术 | 仍需自研 |
|---|---|---|
| 获取 Figma 节点和布局数据 | Figma REST API / Plugin API | 数据统一与异常处理 |
| 解码本地 .fig | openfig-core | 验证 Stitch 文件兼容性 |
| 解析 Auto Layout | figma-to-react、Bricks | 补充复杂布局和约束规则 |
| 生成 JSX/CSS | FigmaToCode、Bricks | 适配 Taro 和项目现有组件 |
| 导出图片、SVG、字体样式 | Figma API、现有转换器 | 资源映射与完整性校验 |
| 自动截图和像素对比 | Playwright、Pixel Diff | 自动修复策略和误差报告 |

## 19.4 核心自研模块（壁垒）

```text
UI AST
Layout Compiler
Responsive Compiler
Auto Fix
```

---

# 20. 画布方案决策

## 20.1 三条路线对比

### 路线 A：沿用 Figma（通过插件）

**优势**：
- 零画布开发成本
- Figma Auto Layout 数据天然结构化
- 插件 API 可读取 ComponentNode、InstanceNode 等

**劣势**：
- 受制于 Figma 平台，API 变更风险高
- 无法控制编辑体验
- 无法做实时编译预览、Pixel Diff 叠加层
- 与 MVP 的“本地运行”目标冲突

**结论**：适合 Phase 4 Figma Import，不适合 Phase 1 本地编辑器。

### 路线 B：基于开源项目改造（OpenPencil / Penpot）

**OpenPencil 优势**：
- CanvasKit（Skia WASM）+ Yoga 布局引擎
- 支持 .fig 文件读写
- 单进程架构，约 26K LOC
- MIT 协议

**劣势**：
- 仍处于早期开发阶段
- 需要投入时间理解代码架构
- 可能需要裁剪大量不需要的功能

**结论**：值得在 Phase 6 阶段评估，但不适合作为 MVP 起点。

### 路线 C：自建画布（推荐用于 MVP）

**技术选型**：

| 方案 | 适合场景 | 理由 |
|---|---|---|
| React Konva | 推荐首选 | 声明式 React 组件、场景图清晰、MIT |
| Fabric.js | 快速原型 | 功能丰富但对象模型偏重 |
| 原生 Canvas | 极致控制 | 开发成本高，MVP 不推荐 |

**自建理由**：
1. MVP 不做云端、不做协作，只需覆盖基础编辑功能
2. UI Compiler 画布不需要 Figma 的全部能力
3. 自建画布可以深度集成编译链路
4. 避免平台风险

## 20.2 推荐决策

| 阶段 | 画布方案 | 理由 |
|---|---|---|
| Phase 0～1（MVP） | 自建，基于 React Konva | 快速可控，深度集成编译链路 |
| Phase 4（Figma Import） | Figma Plugin / REST API | 只读取，不依赖 Figma 画布做编辑 |
| Phase 6（产品化） | 可选迁移到 OpenPencil 架构 | 如需更完整的编辑器能力 |

---

# 21. 输入源兼容性与信息损失风险

## 21.1 Stitch → Figma → 前端代码的风险

```text
原始 HTML/CSS
  ↓ 丢失部分 CSS 规则
中间设计树
  ↓ 丢失响应式约束
Figma 图层 / Auto Layout
  ↓ 丢失原始语义
Figma Parser
  ↓
UI AST
```

**关键判断**：

> 导入 Figma 时如果丢失了原始 CSS 规则或响应式约束，后续编译器无法凭空还原这些信息。

## 21.2 更符合架构的路线

直接编译，不绕 Figma：

```text
Stitch
  ↓
Stitch Adapter
  ↓
UI AST
  ↓
Layout Compiler
  ↓
Taro
```

## 21.3 Phase 4 核心风险

- Figma Auto Layout 无法完全表达原始 CSS 意图
- Constraints 与响应式约束可能丢失
- Component / Instance 语义可能降级
- 字体、图标、SVG 资源可能不完整

这些风险应写进 Phase 4 的风险章节，并在 Figma Import 前后做 Pixel Diff 验证。

---

# 22. 最终产品形态

```text
                  ┌───────────────┐
                  │  UI Editor    │
                  └───────┬───────┘
                          │
                  ┌───────▼───────┐
                  │    UI AST     │
                  └───────┬───────┘
                          │
             ┌────────────▼────────────┐
             │    Layout Compiler      │
             │                         │
             │ Flex / Grid / Absolute │
             │ Responsive              │
             │ Typography              │
             │ Component               │
             └────────────┬────────────┘
                          │
                  ┌───────▼───────┐
                  │ Code Generator│
                  └───────┬───────┘
                          │
             ┌────────────┼────────────┐
             ↓            ↓            ↓
           Taro         React         Vue
             │            │            │
             └────────────┼────────────┘
                          ↓
                     Browser
                          ↓
                    Pixel Diff
                          ↓
                    Auto Fix
```

---

# 23. 核心技术壁垒

最终产品真正的技术壁垒不是：

> “做了一个类似 Figma 的编辑器。”

而是：

```text
UI AST
+
Layout Compiler
+
Responsive Compiler
+
Code Generator
+
Pixel Diff
```

其中最重要的是：

> **Layout Compiler。**

它决定设计中的：

```text
位置
尺寸
间距
布局关系
伸缩关系
响应式关系
字体
组件结构
```

最终如何变成：

```text
HTML
CSS
Taro
React
Vue
```

---

# 24. 第一阶段最终 Demo

第一阶段只需要证明：

```text
本地 UI Editor
       ↓
      UI AST
       ↓
Layout Compiler
       ↓
 Taro Generator
       ↓
     H5
       ↓
Playwright
       ↓
 Pixel Diff
```

用户能够：

```text
创建一个复杂 UI
        ↓
一键生成 Taro
        ↓
直接运行
        ↓
视觉效果高度接近设计
```

完成这个闭环后，再进入 Figma Import。

---

# 25. 产品长期路线

```text
Phase 0
技术底座
    ↓
Phase 1
本地 UI Editor
    ↓
Phase 2
高还原 Taro Compiler
    ↓
Phase 3
Pixel Diff / Auto Fix
    ↓
Phase 4
Figma Import
    ↓
Phase 5
AI Compiler
    ↓
Phase 6
云端产品化
    ↓
Phase 7
多框架
```

最终形成：

```text
Figma
Stitch
UI Editor
HTML
其他设计工具
      ↓
    UI AST
      ↓
Layout Compiler
      ↓
Taro / React / Vue / ...
```

---

# 26. 产品一句话定义

> **UI Compiler 是一个把结构化 UI 设计数据直接编译成高还原前端代码的 UI 编译器，通过 UI AST、Layout Compiler、Responsive Compiler 和 Pixel Diff，解决传统 AI 截图转代码在布局、间距和响应式方面的不稳定问题。**

---

# 27. 附录：文档维护建议

## 27.1 文档拆分

建议将本文档拆分为：

```text
docs/
├── PRD.md                                # 本文档
├── architecture/
│   ├── ADR-001-ui-ast.md
│   ├── ADR-002-layout-compiler.md
│   ├── ADR-003-canvas-selection.md
│   └── ADR-004-figma-import.md
├── research/
│   ├── open-source-evaluation.md         # 开源项目调研
│   └── input-source-compatibility.md     # 输入源兼容性
└── roadmap/
    ├── phase-0.md
    ├── phase-1.md
    └── ...
```

## 27.2 ADR 建议记录字段

| 字段 | 说明 |
|---|---|
| 决策 | 做了什么决定 |
| 背景 | 为什么需要决定 |
| 选项 | 考虑了哪些方案 |
| 结论 | 选择哪个方案 |
| 理由 | 为什么这么选 |
| 风险 | 有什么风险 |
| 状态 | 提议 / 已接受 / 已废弃 |

---

# 28. 附录：术语表

| 术语 | 含义 |
|---|---|
| UI AST / IR | UI 中间表示，产品核心数据结构 |
| Layout Compiler | 将 UI AST 中的布局意图编译为 CSS 的核心模块 |
| Responsive Compiler | 处理 Fill / Hug / Fixed / Constraint 等响应式关系 |
| Code Generator | 将编译结果生成为目标框架代码 |
| Pixel Diff | 设计稿与渲染结果的像素级对比 |
| Auto Fix | 根据 Pixel Diff 结果自动修正 AST / Compiler |
| Auto Layout | Figma 的自动布局能力 |
| Fill / Hug / Fixed | 尺寸模式：填充父级 / 包裹内容 / 固定尺寸 |
| Design Tokens | 设计变量：颜色、字号、间距、圆角、阴影 |

---

**文档结束**