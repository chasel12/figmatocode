# UI Compiler · 展示工程

四个完整的小程序产品，UI 全部由「设计 → AST → 代码」编译器生成：模型只输出结构化的页面描述（JSON 节点树），出码链路 0% AI。

打开 `index.html` 可以先看效果（iframe 按 375×812 真实视口渲染，底栏是真的 `position: fixed`）。

## 目录

```
index.html            预览页（24 页并排 + 四端同源对照）
preview/<id>/         每页的独立 HTML（自包含，双击即可单独打开）
<id>/project.fig      设计文件（Figma 与本项目编辑器**共用这一份**）
<id>/figma-png/       每页一张 2 倍图（750×1624），不想走 .fig 时的兜底通道
<id>/react/           React MPA 工程
<id>/vue/             Vue 3 工程（仅 H5）
<id>/taro/            Taro 4 多页工程（H5 / 微信小程序）
<id>/uniapp/          uni-app 工程（H5 / 微信小程序，vue3 SFC）
<id>.zip              上面整包的压缩版
```

`<id>` 为 `music` / `ledger` / `coffee` / `ironlog`。

## `.fig` 里会看到什么

打开 `<id>/project.fig` 会看到**一个画布，上面并排 6 个 frame**（每个 375×812，间距 80），和 Figma 里的常规设计稿一样。

这不是一开始就对的。早先的映射是 `UIPage → CANVAS`（一页一个画布），相当于把「一个屏幕」当成了 Figma 的「页面分组」—— 打开后左侧是 6 个 page，一次只能看一个，而且页面根在 `.fig` 里**没有实体**（CANVAS 没有 fills / auto layout / padding），背景和内边距只能靠旁挂层补，那正是「深色页打开变白字白底」的来源。现在改成 `UIPage → FRAME`、整个工程 → 一个 CANVAS：

- 每个 frame 的**背景、内边距、自动布局模式**都是原生字段（Figma 里可见、可改），不再走旁挂；
- 子项坐标由自动布局排好（含 `position: fixed` 的底栏，它落在视口底部而不是被排到页面外）；
- 子项 `transform` 写的是**父内相对坐标**（Figma 的口径）。早先写的是页面绝对坐标 —— 第 2~6 页的每个子项都被加上了页面本身的 x 偏移，于是跑到父 frame 外被裁掉，打开就是「六个空 frame」；
- **图标是真实矢量路径**。`vector.d`（SVG path）被编码进 `fillGeometry[].commandsBlob`，和真实 Figma 文件同一套命令流（`01`=MoveTo / `02`=LineTo / `04`=Cubic / `00`=Close）。早先这一项没写，Figma 里按钮上只有空框。

## 一份 `.fig`，两边都能开、都能改

`<id>/project.fig` **同时**给 Figma 和本项目编辑器用，没有第二份：

| 打开方式 | 结果 |
|---|---|
| Figma（拖进 Files 列表） | 一个 Page，画布上并排 6 个 frame；文字、颜色、布局、图标都是可编辑的原生图层 |
| 本项目编辑器 | 6 个独立页面，逐页切换；能改、能再出码 |

做法上没有妥协，只是把三件事同时做对：

1. **内嵌 Figma 自己的 schema**。库自带的那份 `getSchemaBytes()` 与官方**不兼容**（拿它解真实 `.fig` 会抛 `Attempted to parse invalid message`），而 Figma 导入时按文件自带 schema 解码 —— 装错 schema 就等于「字段编号全对不上」，这是「拖进去打不开」的**根因**，比补哪个字段都更底层。现在用从真实文件提取的官方 schema（101 版，29.9KB）。
2. **消息信封照抄真实文件**：`type` / `sessionID:0` / `ackID:0` / `originFileKey`（`lk-`+128 hex）/ `nodeChangeOrder:'GUID'` / `nodeChanges` / `blobs`。早先多写了一个 `reconnectSequenceNumber`（实时协同字段，静态文件不该有）。
3. **AST 专有字段走独立条目** `ui_compiler_extras.json`（布局模式、`position:absolute` 脱流、`stickyBottom`、装饰层、组件关系…），不污染 `meta.json`。`meta.json` 只留 Figma 会读的 4 个键（约 300 字节）。

对齐过的格式细节（都用 `zipfile.infolist()` / 二进制 dump 实测）：

- `canvas.fig` / `thumbnail.png` / `images/*` 是 **store（不压缩）**，只有 JSON 是 deflate；
- `DOCUMENT` guid `0:0`、首个 `CANVAS` `0:1`；这两类节点**不带 `size`**（0×0 = 画布没有边界）；
- 节点默认字段显式写出：`visible` / `opacity` / `strokeAlign` / `strokeJoin` / `strokeWeight`；
- TEXT 的 `textData.lines` 与 `fontName.postscript` 必填；
- `meta.client_meta.render_coordinates` 是真实包围盒，`background_color` 跟首页根背景。

**字段编号兼容性单独验证过**：用三份不同版本（101 / 106）的官方 schema 去解我们的产物，474 / 495 / 462 个节点逐个正确 —— 不是「大概能读」，是官方解码器认这份内容。

### 在 Figma 里打开

Figma **没有「打开本地文件」菜单**。正确姿势只有两条：

1. 打开 Figma 的 **Files / Drafts** 列表页，把 `<id>/project.fig` 直接**拖进文件列表**（不是拖进编辑器画布）；
2. 或者 Files 页右上角 **Import → Import from computer**，选文件。

导入后是**一个新文件**，左侧只有一个 Page，画布上并排 6 个 frame。

### 往返一致性

`.fig` 回到本项目编辑器继续改、改完再出码，由 `npm run fig:check` 的四道关守着（导入关 / 往返关 20 页 / CSS 关 / 组件实例关）。往返关里有一页**矢量探针**：两条真实图标路径（含弧命令）走一遍往返，断言几何不能退化成空路径 —— 这条断言曾经不存在，于是「图标变空框」在门禁里一直是绿的。

**逐页验收**：`fig-canvas-sheet.png` 是三个工程各 6 页在编辑器画布上的实拍（18 页全部切换过、逐页截图）。

**兜底通道**：`<id>/figma-png/` 是每页一张 2 倍图（750×1624）。全选 6 张拖进 Figma 就是 6 个 frame —— 不可编辑，但「让人看到设计长什么样」100% 成立。


每个 `<id>/<target>/` 都是**独立可跑的工程**：

```bash
cd music/taro
npm i
npm run dev:h5       # 或 build:weapp 出小程序
```

各端都带一份 `codegen-manifest.json`，记录页面清单、视口与产物路径。

## 三个产品

| 产品 | 页数 | 主题包 | 风格规格 | 页面 |
|---|---|---|---|---|
| 回声 · 音乐播放 | 6 | `daisy-dark`（深色 / 紫） | `linear-style.md` | 发现 / 播放 / 歌单详情 / 搜索 / 我的音乐 / 歌词 |
| 青柠账本 · 记账 | 6 | `forest`（浅色 / 墨绿） | `data-dense.md` | 概览 / 明细 / 记一笔 / 预算 / 统计 / 我的 |
| 拾豆咖啡 · 点单 | 6 | `openprops`（浅色 / 陶土橙） | `terracotta.md` | 点单 / 商品详情 / 购物车 / 确认订单 / 订单 / 我的 |
| 铁志 · 力量训练日志 | 6 | `shadcn`（纸白 / 墨黑 / 强调红） | `swiss-editorial.md` | 今日 / 训练 / 动作库 / 记录 / 进度 / 我的 |

「风格规格」是一份写给通用 Tailwind 工程的审美文档（配色偏好、字号阶梯、间距节奏、阴影与圆角取向）。它作为**参考材料**注入提示词，实际落地要经过一层受控映射：文档里的 Tailwind 类名会被查表翻译回 AST 的布局与样式字段，能翻的补上、翻译成功就静默、翻不了的按三类分别处理（补 / 静默丢弃 / 继续拒）。

## 生成链路

```
需求稿 + 风格规格 + 主题包
        ↓  模型（只出 JSON 节点树，schema 强约束 additionalProperties:false）
   AiPageDraft
        ↓  方言翻译（className → layout/style）+ 契约校验 + 自修轮
     UI AST
        ↓  纯确定性编译器（0% AI）
HTML / React / Vue / Taro / uni-app
```

整站是三步：先规划页面清单 → 逐页复用单页管线 → 导航串联（文案与页面名精确匹配，不做模糊匹配 —— 猜错比连不上更糟）。

## 已知边界

- **图片是占位色块**。编译器的 IMAGE 节点输出的是按名字哈希取色的占位块，不抓网络图。三个产品都刻意选了图片不密集的题材，商品图用「浅色矩形 + 图标」代替。
- **流程页没有底栏**。只有 tab 页有底部导航，播放 / 详情 / 购物车这类页面靠返回和页面内按钮进出。
- **底栏由编译器安装，不是模型画的**。整站生成是「N 次独立调用」，跨页共享组件被独立复现 N 次必然漂移 —— 铁志连跑 8 轮，每轮漂移点都不同（三页三套图标 / 手写 `vectorD` 坐标越界 / 流程页照样长出底栏 / 长页里底栏跟着内容滚走）。提示词是「请求」不是「保证」，所以改成 `installTabBar` 在串联末尾**删掉模型画的那一条、装一份标准的**（结构、配色、选中态全一致，`position: fixed` 吸底），并做幂等（第二趟不动任何节点）。这条也顺带修掉一个旧账：tab 页天然有出边，不再被判「死页」白重画一次。
- **「预算」页六条进度条长度几乎一样**。百分比数字是对的，但条的宽度没跟着走。原因是「一份模板 N 份、每份长度不同」要靠 `repeat.styles[i].width`（本轮新加的能力），模型三次采样都没稳定用上：一次全写 258、一次把「86%」当成 86px 还把所有行标成「已超支」。**能力在、模型用不稳**，属采样问题不是编译器缺陷。重跑会换一套采样，可能连累已经通过的其它页，所以保留了内容最正确的那一版。
- 每页节点数在 55~145 之间。模型单次输出上限约 8192 tokens，单页超过 ~120 节点有截断风险（会报 `finish_reason=length` 并重来）。
- **`.fig` 里的图标是真实路径，但没有「矢量网络」**。`vector.d` 会被编码进 `fillGeometry`，所以 Figma 里图标**画得出来、能选中、能改填充和描边**；但 Figma 的「编辑矢量节点」面板（拖锚点、调手柄）依赖另一套 `vectorData.vectorNetworkBlob` 编码，本轮没有可靠依据去反推，所以那里面板可能把整条路径当成一个整体。视觉与出码不受影响。

## 同源证明

预览页底部有一节「同源证明」：把音乐工程「发现」页的**同一个节点**（`frame-8`，播放按钮）在四份产物里的样子并排放。四段代码是构建时从产物里抓的，不是手写的：

| 端 | 落地方式 |
|---|---|
| React (H5) | `onClick={() => { window.location.href = "../p-2/index.html" }}` |
| Vue 3 (H5) | `@click="go('../p-2/index.html')"` |
| Taro (小程序) | `onClick={() => { Taro.navigateTo({ url: "/pages/p-2/index" }) }}` |
| uni-app (小程序) | `@tap="go('/pages/p-2/index')"` |

AST 里只有一条 `ON_CLICK + NAVIGATE` 声明，四端的路由语义全由出码器补。

## 成本

四套各生成一次（含失败重试与自修轮）：music ¥0.143 / ledger ¥0.144 / coffee ¥0.203 / ironlog ¥0.139，合计约 **¥0.63**。
记账页在调进度条那次又多跑了 3 轮（¥0.13 / ¥0.134 / ¥0.103），最终回滚到内容最正确的一版。
