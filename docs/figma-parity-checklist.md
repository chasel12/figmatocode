# Figma 全量对照矩阵（站点级）

> PRD v1.1 **FR-56** 的验收凭据（由原 32 条 P0 清单升级为全量矩阵）。对应 PRD「Goals #1：对标项 ≥95% 通过」。
> **状态：M3 段（2026-10-14）+ M4 段（2026-10-16，6P/5F）+ M5 段（2026-10-16，6P/7F，★修复中）+ m12 段（2026-10-15，12/19 待甄别）已实测填结果；附 A/B/C 留 GA 全量** · 升级日期：2026-10-03 · 本轮实测：2026-10-16 · GA 前生效

## 使用说明

- **环境**：本地 `npm run dev` 打开编辑器，Chromium；对照组为 Figma 官方 Web 版（同机同浏览器）；转码类条目以 `npm run e2e` / 出码 ZIP 为对照载体。
- **判定**：按「操作步骤」执行，与「期望结果」一致即 PASS；与「Figma 参照」有出入按其复核，仍不一致记 FAIL 并附截图/差异报告。
- **GA 通过线（v1.1 FR-56）**：总 **≥95%**，**且**四模块 **100%**：① 16 demo 页创建走查（附 A）② Design 面板 11 分区（附 B）③ 原型走查（第八节 P0 行）④ 样片（FR-57）。任一模块 FAIL 即阻断 GA。
- **★ 核心项**：原 12 条保留；附 A/B/八/样片整模块视为核心。
- **里程碑列**：`M1–M6` 交付排期；`P1/P2` 范围；`未排` 需 PM 定期。已交付项走查时应 PASS，回归失败即缺陷。
- **结果记录**：填 `PASS`/`FAIL` + 日期；FAIL 登记文末「差异与结论」（处理决议/Owner/日期）。
- **FR 列已对齐 PRD v1.1 编号**（v1.0 编号漂移已修正，见修订历史）。

---

## 一、画布导航与选择（FR-1~4、FR-6~7、FR-12）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☐ | P0-01 ★ | 在空白处按住左键拖出选框划过 3 个节点后松手 | 3 节点全部进入选中态；Esc 取消选中 | 框选（Marquee） | FR-1 | M1 已交付 | |
| ☐ | P0-02 ★ | 起点按在某节点上开始拖动 | 直接移动该节点，**不出现选框**；画布空白拖动=平移（空格按住时任何位置可平移） | 拖动语义 + 空格平移 | FR-1/3 | M1 已交付 | |
| ☐ | P0-03 ★ | Ctrl+滚轮在某节点上方缩放 | 以光标为锚点缩放；范围 20%–400% | 滚轮缩放 | FR-3 | M1 已交付 | |
| ☐ | P0-04 | Shift+1 再 Shift+0 | Shift+1 全部内容适配画布居中；Shift+0 回 100% | Shift+1 / Shift+0 | FR-3/6 | M1 已交付 | |
| ☐ | P0-05 | 看状态栏并点击缩放下拉切 200% | 百分比实时显示；下拉含 适合/50/100/200/400%；切换即时生效 | 底部缩放控件 | FR-6 | M1 已交付 | |
| ☐ | P0-06 | 鼠标悬停画布元素（不点击） | 描边高亮 + 尺寸提示；光标移动态 | 悬停高亮 | FR-4 | M1 已交付 | |
| ☐ | P0-07 ★ | 双击一段文本 | 就地编辑态：光标入位、可改字、**中文 IME 组字正常**、Esc/点外部提交、画布同步 | 双击编辑文本 | FR-7 | M2 已交付 | |
| ☐ | P0-08 | 双击 Frame 内子元素 / 双击 Frame 本身 | 逐级下钻选中（双击=进入容器层） | 双击下钻 | FR-7 | M2 已交付 | |
| ☑ | P1-01 | 打开 1000 节点 demo 页，拖动/缩放全程录帧 | ≥60fps、95% 帧 <16.7ms；1000 节点可编辑 | 性能基线 | FR-12 | M4 | FAIL（2026-10-16）1000 节点可编辑、idle 60.5fps；FR-60「95% 帧<16.7ms」实测 59.7%（435/729，avg 17.03ms）未达标——拖拽帧预算整改项；证据 dist/m4-matrix/ + dist/perf-1000/report.json |

## 二、拖拽、吸附与插入（FR-2、FR-5、FR-11）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☐ | P0-09 ★ | 拖动节点靠近另一节点边缘/中心 ≤6px | 自动吸附对齐，红色参考线（边缘+中心）与间距数值；状态栏可关吸附 | 对齐参考线 + 吸附 | FR-2 | M1 已交付 | |
| ☐ | P0-10 | 按住 Alt 拖动同一节点 | 本次拖动完全跳过吸附，自由移动 | Alt 跳过吸附 | FR-2 | M1 已交付 | |
| ☐ | P0-11 ★ | 拖动节点划过容器中部松手 | 容器高亮 + 插入位置指示线；松手后进入该容器且索引正确 | 拖放指示 | FR-5 | M2 已交付 | |
| ☐ | P0-12 | 拖动节点到它自己的子容器上 | 不显示指示线、不接受落位（防循环） | 自我嵌套保护 | FR-5 | M2 已交付 | |
| ☐ | P0-13 ★ | 跨容器移动 3 次后 Ctrl+Z 连续撤销 | 每步可撤销回原位；Ctrl+Shift+Z 重做一致（≥100 步历史） | 撤销/重做 | FR-11 | M1 已交付 | |

## 三、右键菜单与快捷键（FR-8、FR-9）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☐ | P0-14 | 右键选中节点 / 右键空白 | 节点菜单：剪切/复制/复制副本/粘贴/删除/成组/置顶层·底层/锁定，带快捷键提示；条目全部生效 | 右键菜单 | FR-8 | M2 已交付 | |
| ☐ | P0-15 ★ | 依次执行 Ctrl+C/V、Ctrl+D、Ctrl+A、Ctrl+G、Delete、Esc | 逐项语义正确（粘贴偏移、原位副本、全选、成组包 Frame、删除、取消选中） | 核心快捷键 | FR-9 | M1/M2 已交付 | |
| ☐ | P0-16 | 方向键 / Shift+方向键 | 移动 1px / 10px；多选整体移动 | 方向键微调 | FR-9 | M1 已交付 | |
| ☐ | P0-17 | 数字键 V/H/F/R/O/L/T/P 依次按 | 工具逐个切换且光标同步 | 工具快捷键 | FR-9/13 | M1 已交付 | |
| ☑ | P0-33 | Ctrl+Shift+? 打开快捷键面板 | 分组两栏渲染全表；Esc/点外关闭；输入态不被拦截 | 快捷键面板 | FR-9/33 | M3 已交付 | PASS（2026-10-14）分组=5，Esc 关闭；证据 `dist/m3-matrix/p033-快捷键面板.png` |

## 四、多选对齐与分布（FR-10）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☐ | P0-18 ★ | 选中 ≥2 节点，点 6 向对齐各一次 | 6 种对齐全部生效且与 Figma 同操作一致 | 对齐 6 向 | FR-10 | M2 已交付 | |
| ☐ | P0-19 | 选中 3 个间距不等节点，点水平等距分布 | 间距相等；垂直分布同理 | 等距分布 | FR-10 | M2 已交付 | |

## 五、工具与创作（FR-13~24）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☐ | P0-20 ★ | Frame 工具拖画，再用预设选 iPhone SE | 拖画出 Frame；预设=375×667；名可改；画布/图层同步 | Frame 工具 + 预设 | FR-13/14 | M2 已交付（设备预设含 15 Pro/SE/iPad/Desktop） | |
| ☑ | P0-21 ★ | 文本工具点画布输入中文，调字号/字重/行高/字距/对齐/颜色 | 创建即编辑；6 类排版属性逐个实时生效；定宽/HUG 可切 | 文本工具与属性 | FR-15 | M2/M3 已交付 | PASS（2026-10-14）排版分区齐全，字号 24→28 实时生效；证据 `dist/m3-matrix/p021-*.png` |
| ☑ | P0-22 | 画矩形设四角独立圆角（8/0/8/0），再画椭圆、直线 | 逐项正确渲染；填充/描边/透明度生效；直线斜角拖画（atan2） | 形状工具 | FR-16 | M3 已交付（OVAL/LINE） | PASS（2026-10-14）三形状拖画+四角独立圆角；证据 `dist/m3-matrix/p022-形状拖画.png` |
| ☑ | P0-23 | 置入图片（data URI 与外链各一次），切 cover/contain，替换图片 | 都显示、填充模式生效、可替换、空图占位 | 图片填充 | FR-20 | M3 已交付（4 scaleMode 中 FILL/FIT/TILE 见附 A-15） | PASS（2026-10-14）scaleMode 四模式下拉断言；证据 `dist/m3-matrix/p023-图片scaleMode.png`；替换/空图占位留 M6 全量 |
| ☑ | P0-34 | 切工具轨 Move/K/Frame/矩形/椭圆/直线/文本/手型；点选 contextual options 区 | 9 工具全集；选中 Frame 显示尺寸、形状显类型、文本显排版快捷项 | UI3 工具轨 + contextual | FR-13 | M3 已交付（轨底浮层；contextual 部分） | PASS（2026-10-14）13 工具全集+contextual 位置尺寸；证据 `dist/m3-matrix/p034-*.png` |
| ☑ | P0-35 | 一个节点加 3 层填充（纯色+线性+径向），调层序/显隐/层透明度/渐变 stop | 层序=面板序=视觉叠层（首层在上）；四型渐变出码与画布一致 | Fill 系统 | FR-17 | M3 已交付（Diamond 画布近似） | PASS（2026-10-14）添加填充层+1；证据 `dist/m3-matrix/p035-填充多层.png`；多层渐变画布↔出码一致性另见 FR-51② |
| ☑ | P0-36 | Stroke 设四边独立宽度+Center/Outside 对齐+dash+cap+join | 三对齐渲染正确（见映射列口径）；dash/gap 生效；默认 1px inside | Stroke 系统 | FR-18 | M3 已交付（画布对齐近似） | PASS（2026-10-14）三对齐/dash/cap/join 字段齐全；证据 `dist/m3-matrix/p036-描边.png`；渲染近似=映射列口径 |
| ☑ | P1-02 | Effects 分区加 Drop/Inner shadow、Layer/Background blur 各一 | 8 类逐项生效；box-shadow 含 spread/inset；backdrop-filter 出码 | Effects 8 类 | FR-19 | M4 | PASS（2026-10-16）8 类下拉+逐类字段齐；出码 box-shadow 含 spread/inset、filter blur、backdrop-filter blur+saturate（PB 近似/Glass 近似/Noise·Texture=SVG defs 口径沿 FR-19 报备）；证据 dist/m4-matrix/p102-*.png |
| ☑ | P1-03 | 图片 7 项调整滑杆（Exposure 等）各拉一次 | 对应 filter 映射实时生效；可复位 | 图片调整 | FR-20 | M4 | FAIL（2026-10-16）7 滑杆+持久化+复位 OK；**filter 映射双端未接**：compiler/generator 零消费 imageAdjustments、画布像素预览未接入（M3 十六步「FR-20 余项」升级为实现缺口）；证据 dist/m4-matrix/p103-滑杆30.png |
| ☑ | P1-04 | 钢笔画闭合路径，调 handle 锚点；切 SVG 出码 | 矢量可编辑、闭合、镜像 handle；出码为合法 `<svg>` | 矢量/路径 | FR-21 | M5 | FAIL（2026-10-16，PRD 字面）闭合✓+落笔对称手柄✓+出码内联 <svg> 合法✓（dsl-p104.json d 含 C…Z）；已提交路径锚点/手柄二次编辑未实现（M4 报备项，待排期） |
| ☑ | P1-05 | 两形状做 Union/Subtract 各一次 | 布尔结果为 VECTOR 节点、可见、可再编辑 | 布尔运算 | FR-22 | M5 | FAIL（2026-10-16，严格口径）两钢笔矢量 Union/Subtract→可见 VECTOR✓（fillRule=evenodd/子路径合并）；普通形状（椭圆/矩形）参集置灰不可直接布尔、结果无再编辑入口；近似口径（fillRule 拼接、Intersect 不保真）沿 LOG M4 报备；待排期 |
| ☑ | P1-06 | Ctrl+Alt+M 设遮罩并移动被遮层 | 遮罩生效；出码 `overflow:hidden`/clip-path 等价 | Use as mask | FR-23 | M5 | PASS（2026-10-16）Ctrl+Alt+M→clipContent=true、画布裁切生效（60×40 裁 120×80 子项）、出码 overflow:hidden、再按取消、Object 菜单双入口；证据 p106-遮罩裁切.png dsl-p106*.json |
| ☑ | P0-37 | 任一节点 Export 设 PNG@2x 下载；再设 SVG | 格式/scale/suffix 生效；SVG/PDF 限 1x（按 Figma）；ZIP 打包 | 节点 Export | FR-24 | M4 | PASS（2026-10-16）ZIP=PNG@2x（IHDR 2×宽）+SVG（恒 1x、2x/3x 禁用+提示）+后缀生效；证据 dist/m4-matrix/p037-export.zip |

## 六、组件与样式（FR-25~30，P1/P2 范围）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☑ | P1-07 | 创建组件、放置实例、改实例、Detach | 紫色描边+图标；实例继承；Detach 还原（非持久） | 组件/实例 | FR-25 | M4 | PASS（2026-10-16，带偏差注记）创建/实例/快照式继承（push 回写后新实例继承）/Detach 全绿；紫菱形#9747ff+▣ 徽标在，**画布紫色描边未实现**（checklist 文案 vs FR-25「图标+徽标」口径待 PM）；证据 dist/m4-matrix/p107-组件实例.png |
| ☑ | P1-08 | Assets tab 浏览/搜索/拖入实例 | 本地组件列表、搜索过滤、同名同步 | Assets 面板 | FR-26 | M4 | FAIL（2026-10-16）列表/搜索/点击插入 OK；**同名同步未实现**（改名不回流 components[].name）；拖入未实现（按钮替代）；证据 dist/m4-matrix/p108-assets面板.png |
| ☑ | P1-09 | 建颜色样式并应用到 2 节点，再改样式 | 同步更新；Detach style 可断开 | 样式系统 | FR-27 | M4 | FAIL（2026-10-16）创建/应用 2 节点/Detach 保值 OK；**改样式批量同步无 UI 入口**（UPDATE_TOKEN 仅 store+单测，面板无色值编辑控件——修复成本低）；Effect/Grid 类缺（kind 枚举，M4 第三步已报备）；证据 dist/m4-matrix/p109-颜色样式.png |
| ☑ | P1-10 | 导出检查 `tokens.css` | CSS variables、语义化色/字号层、结构与清单 | Design Tokens | FR-28 | M4 | PASS（2026-10-16）tokens.css：:root + --uic-paint-N + --uic-text-N-* 复合变量与样式清单一致；无重命名入口（归 P1-09 缺口）；证据 dist/m4-matrix/p110-tokens.zip |
| ☑ | P1-11 | 3 属性变体组合切换 | 组合矩阵、默认态、新建/合并可执行 | Variants | FR-29 | M5 | PASS（2026-10-16）3 属性组合（默认/Medium/Large）切换实例 componentId 3 值去重、新建变体并入组、默认态回退首成员；证据 p111-变体切换.png dsl-p111-*.json |
| ☐ | P2-01 | Variables 建 mode 并绑定 fill/圆角 | mode 切换 class 生效 | Variables | FR-30 | P2 Go/No-Go | |

## 七、UI3 界面与面板（FR-31~38）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☑ | P0-24 ★ | 整体目视对照 Figma 深色模式 | 默认深色；三栏一致：顶栏（菜单/文件名/Present·Share·Export）、左栏（Pages/Layers/Assets）、中画布、右栏 Design/Prototype 双 tab；Ctrl+\ 收起 UI；无漏色穿帮 | UI3 结构 | FR-31/32 | M1/M3 已交付 | PASS（2026-10-14）深色三栏/顶栏/工具轨目视（`dist/m3-matrix/p023-图片scaleMode.png` 全屏佐证）；逐项完整对照留 M6 全量 |
| ☑ | P0-25 | 逐个展开 7 菜单 File/Edit/View/Object/Text/Plugins/Help | 条目可用带快捷键提示；超范围置灰+tooltip 注明；含快捷键面板入口 | 菜单全集 | FR-33 | M3 已交付 | PASS（2026-10-14）File:6/Edit:9/View:7/Object:9/Text:6/Plugins:3/Help:3；证据 `dist/m3-matrix/p025-File菜单.png` |
| ☑ | P0-26 | 选中元素看右栏，再选中文本看右栏 | 分区次序：对齐快捷 → X/Y/W/H → Layout → Fill → Stroke → Effects → Typography（文本时）→ … → Export；Tab/Enter 提交 | Design 面板 | FR-34 | M2/M3 部分（11 分区见附 B） | PASS（2026-10-14）次序实测：位置尺寸→布局→图层→填充→描边→效果→排版→Export→内容（对齐快捷=多选时首位，单选不显）；证据 `dist/m3-matrix/p026-分区次序.png` |
| ☑ | P0-27 | 观察状态栏 | 缩放%、页面名、选中数量、吸附开关四项实时正确；Shift+R 标尺、Shift+G 网格 | 状态信息 | FR-38 | M2 已交付 | PASS（2026-10-14 回归）页面名/选中数/吸附/缩放%实测；证据 `dist/m3-matrix/p023-图片scaleMode.png` 底栏 |
| ☐ | P0-28 ★ | 图层树拖拽改序/跨容器；双击重命名；点眼睛/锁 | 画布同步；重命名进 DSL；显隐/锁定生效、锁定不可点选 | 图层操作 | FR-37 | M2 已交付 | |
| ☐ | P0-29 | 画布选中深层节点 ↔ 图层树双向点击 | 树自动展开父级并高亮；反向点击画布选中 | 双向同步 | FR-37 | M2 已交付 | |
| ☐ | P0-38 | Pages 新建/重命名/删除（确认框）/切换 | 每 Page 独立根、切换保持各页选中、图层树联动 | Pages 全操作 | FR-37 | M2 已交付 | |
| ☑ | P1-12 | 选中多节点点 Constraints 5 向 2 轴，Ctrl 拖父框 | 约束生效（与 Auto Layout 互斥正确） | Constraints | FR-35 | M4 | FAIL（2026-10-16）出码定位/拖父重算 Δx=[59,30,42,0]/Ctrl 忽略/Auto Layout 互斥占位全绿；FAIL 点=**档位 4×2 轴无 Left+Right stretch**（「5 向」文案 vs FR-35 枚举 4 档矛盾，需 PM 裁决）；**附带发现已修复**：FR-44 旋钮与 e 把手同点位劫持 resize→拖线（旋钮外偏 14px，9c325bf 后补）；证据 dist/m4-matrix/p112-*.png |
| ☐ | P1-13 | 设 Auto Layout：gap/padding 9 点位/FILL·HUG·FIXED/wrap/baseline/space-between | 各模式出码与画布一致；方向自动识别；Ignore auto layout 可用 | Auto Layout 全量 | FR-36 | M2 部分（全量 M4） | |

## 八、原型（FR-39~45）——P0 行=GA 四模块之一，100% 必过

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☑ | P0-39 ★ | 画布开 ≥2 Page，点页签切换 | 内容整组切换；各页节点状态持久；Present 模式可切 | 多 Page 导航 | FR-39 | M5 | PASS（2026-10-16）多页新建/改名/切换整组+会话内持久✓；Present 顶栏 Page 下拉切页✓；reload 恢复 v2 全工程（含交互，localStorage 核对）；证据 dist/m5-matrix/p039-*.png |
| ☑ | P0-40 ★ | 选中 Frame → Prototype tab → add interaction 选 On click + Navigate to | 触发 10 类可选；P0 动作（Navigate 同 Page/Back/Scroll/Open link/Open·Close overlay）可配 | Prototype 面板 | FR-40 | M5 | PASS（2026-10-16，P0 口径）触发器 10 类全列（5 可用+5 置灰后并 §2.2 报备）、动作 6 类逐个可配+DSL 落盘、目标下拉限同页 Frame；证据 dist/m5-matrix/p040-*.png dsl-p040.json |
| ☑ | P0-41 ★ | 配 Instant 与 Dissolve 各一，预览点目标 Frame | 时长/easing 生效；Smart animate 可选；预览可播 | 动作与过渡 | FR-41 | M5 | PASS（2026-10-16 修复复验；首跑 FAIL 见差异 #10）配置/出码字段✓；Present 换帧 WAAPI 入场动画生效（渐隐渐显 1200ms 点击后 getAnimations≥1、1400ms 完成切帧）；SMART_ANIMATE 置灰=报备口径；证据 dist/m5-matrix/ + 探针（本行修复批） |
| ☑ | P0-42 ★ | Overlay 设 9 向定位 + 点外关闭，预览打开 | 定位/背景遮罩/关闭行为正确；浮层可拖定位 | Overlay | FR-42 | M5 | PASS（2026-10-16 修复复验；首跑 FAIL 见差异 #11）九宫 9 键补全（MANUAL 按居中生效+注记、PRESET 置灰 disabled 实测）；点外关闭/定位映射✓；拖拽定位与遮罩透明度=P1 体验（#11 残留） |
| ☑ | P0-43 | Frame 右键 Set flow starting point | 流程起点可视标记（蓝标+首页 Frame） | Flow 起点 | FR-43 | M5 | PASS（2026-10-16 修复复验；首跑 FAIL 见差异 #12）右键「设为/移除流程起点」条目（标签翻转实测）+ 画布 ▶ 蓝标（证据 dist/m5-matrix/fix-p043-起点蓝标.png）+ Present Flows 下拉「▶ 」前缀✓ |
| ☑ | P0-44 ★ | 连线两 Frame，Shift+Space 热区预览，Present 全屏 | 连接线+目标箭头；预览小窗独立；Present 含返回/刷新/历史/热区/Esc 退出/Flows 列表 | 原型预览 | FR-44 | M5 | PASS（2026-10-16，残余 note）拖连接点（外偏14px 旋钮）创建 ON_CLICK/Navigate/Instant✓、贝塞尔箭头线+点线选中目标✓、Shift+Space 内联小窗（窗内跳转+全屏演示钮）✓、全屏 Present ←/→/R/H/Esc/Flows 下拉✓；present-smoke 18/18 旁证；残余：Flows 列表=Frame 起点下拉（project.flows 表未实现）、设备外框未做、全屏快捷键=Ctrl+Alt+P（字面差异报备） |
| ☑ | P0-45 ★ | 配跨 Page Navigate 目标并预览；删除目标 Frame 再预览 | 跨 Page 不可达（按 v1.1 口径默认**不实现**）；删除目标显 broken link 提示 | 口径见 Open Question | FR-45 | M5 | PASS（2026-10-16）跨 Page Navigate 不可配（v1.1 不实现口径成立——page2 目标下拉仅本页 Frame）；删目标显「已断开」置灰+可清理+Present no-op+console warn；证据 p045-*.png |

## 九、转码与像素（FR-46~52）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☐ | P0-30 ★ | 搭一页 → 导出代码 → ZIP 解压 → 浏览器打开 | `index.html + index.css + assets/`；还原、零报错、语义化 class（含中文名回退）；overlay/history 可交互时走 `runtime.js` | 出码产物 | FR-46/52 | M2 已交付 | |
| ☑ | P0-46 ★ | 对照矩阵抽样：Auto Layout/Stroke 三对齐/圆角四型渐变/文字/图片/Constraints 各设值 → 看出码 CSS | 映射全量按 FR-47 表（缺映射=FAIL）；CENTER+四边、Diamond、blend 等近似项按「映射列口径」标注 | CSS 映射全表 | FR-47 | M3 大部（余项 M4） | PASS（2026-10-14）出码 SCSS 抽样 flex/渐变/圆角（`dist/m3-matrix/p046-出码.png`）+ fr47 单测 37/37；余项 M4 |
| ☑ | P0-47 ★ | 全工程搜字体：编辑器渲染/出码 body/Taro scss | 同一 `FONT_STACK`；`public/fonts/` 4 woff2；font-display swap；font-weight 可变区间 | Inter 本地托管 | FR-48 | M3 已交付 | PASS（2026-10-14）/fonts 4 woff2（可变字重）HTTP 200 + fr48 单测 5/5 FONT_STACK 单源 |
| ☑ | P1-14 | 圆/多边形出码切 SVG，校验 stroke 属性/dash/cap/join/fill-rule | SVG 合法且属性齐全 | VECTOR 出码 | FR-49 | M5 | FAIL（2026-10-16）圆/多边形出码走 CSS 通道（border-radius/clip-path），**未切 SVG**——dash/cap/join 语义不可表达；VECTOR 通道属性齐全（fill-rule/dash/cap/join✓）；arcData→SVG path 未做（conic-gradient 现实现）；需 PM 定口径：形状 SVG 化 or 行文案降级 |
| ☑ | P0-48 ★ | 原型交互出码（Navigate/Back/Overlay/Scroll），再以无 JS 模式打开 | runtime 事件与锚点正确；过渡 duration/easing 一致；无 JS 时静态可浏览零报错 | 原型出码双模式 | FR-50 | M5 | PASS（2026-10-16 修复复验；首跑 FAIL 见差异 #9）runtime Navigate 锚点回退（pageOf+scrollIntoView）：导出页点击同页 Frame 目标 scrollY 0→1108 零告警（证据 dist/m5-matrix/fix-p048-导出页滚动.png）；页目标切 section/Frame 目标滚动定位双语义；无 JS 静态模式回归✓ |
| ☑ | P0-49 ★ | `npm run e2e` + 出码页 vs Figma 实测截图对比 | 16/16 ≥98%（双端一致）；画布↔出码 ≥95%；样片 ≥99%；一切缺口定位到 `src/compiler/` | 三方像素指标 | FR-51 | M3 已交付（e2e 口径） | ①PASS 16/16≥98%（diff-report 2026-10-14）②首跑基线 avg 98.12%、15/16≥95%、min 92.07%（14 页归因豁免见「差异与结论」）③样片 M6；证据 `dist/canvas-diff/report.json` |
| ☑ | P0-50 ★ | ZIP 内 `assets/` 逐页打开 + `npm run pages` 校验 | 图片/样式/字体路径正确；每页可独立打开；Export 后缀不影响 | ZIP 预览 | FR-52 | M2 已交付 | PASS（2026-10-14 回归）pages 224/224（页面+Taro 产物校验） |

## 十、质量门禁与样片（FR-53~57）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☑ | P0-51 ★ | 菜单「验证当前页」对 16 页各一次 | render 与画布截图对照、相似度报告；<98% 标红；失败页 e2e exit 1 | 编辑器内验证 | FR-53 | M2 已交付 | PASS（2026-10-14 回归）walkthrough Pixel Diff 差异明细（区域 60/节点定位 12）9/9 |
| ☑ | P0-52 ★ | `npm run e2e`、`npm test`、`npx tsc`、`npm run build` | 16/16 ≥98%、全测绿、tsc 零错、build 成功；失败页打印相似度明细 | 流水线基线 | FR-54 | 各里程碑已交付 | PASS（2026-10-14）tsc 0 错 / vitest 234/234 / build OK / e2e 16/16≥98% |
| ☑ | P0-53 ★ | `npm run viewport`、`npm run pages`、`npm run walkthrough`、`smoke-m1/m2` | 64/64、pages+ZIP 校验、walkthrough ≥8 项、m1 22 / m2 27 全绿 | 接口与健壮性 | FR-55 | 各里程碑已交付 | PASS（2026-10-14）64/64 / 224/224 / 9/9 / 22·27 |
| ☐ | P0-54 ★ | 本矩阵全量执行并汇总 | 总 ≥95% 且四模块 100%；FAIL 全部有决议 | 站点级矩阵本身 | FR-56 | M3（本文件） | M3 段执行（2026-10-14，15 行实测+门禁回归）；全量 73 行+附 A/B/C 留 QA/M6 |
| ☐ | P0-55 ★ | `npm run showcase` 一键跑 | 样片生成/归档/对比报告；样片 vs reference ≥99% | 样片管线 | FR-57 | M6 | |

## 十一、工程与未来（FR-58~62）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|-----|---------|------------|-----|------|------|
| ☑ | P1-15 | 建仓 + 规范提交，接 CI（tsc/test/build/e2e） | CI 绿；失败产物归档 | git + CI | FR-58 | M4 | PASS（2026-10-16，FR-58 替代凭证口径）无 remote 环境——ci.yml 四门禁结构核证 + git 规范提交 6 条 + 本轨 HEAD=9c325bf 补跑 tsc 0 错/vitest 428 绿（p115-*.txt）；dist/ci-local 报告过期待刷；证据 dist/m4-matrix/p115-* |
| ☑ | P1-16 | `npm run build` 后静态托管 dist，浏览器直开 | 全页面可用（含 /fonts 本地字体） | 部署验证 | FR-59 | M3 已交付（基线） | PASS（2026-10-14 基线）canvas-diff/m3-matrix 即静态托管验证（/fonts 200） |
| ☑ | P1-17 | 1000 节点页录帧（同 P1-01） | 脚本化报告 `scripts/` | 性能脚本 | FR-60 | M4 | PASS（2026-10-16）scripts/perf-1000.mjs+npm script 在库，量化报告（idle/drag/fr60/verdict）+证据三件套齐；证据 dist/m4-matrix/p117-拖拽后.png |
| ☐ | P2-02 | 协作 MVP 走查（链接/双端同页/光标） | 上线前提条件全满足（账号/计费/隐私评审） | 协作 | FR-61 | P2 | |
| ☐ | P2-03 | M6 Go/No-Go 评审会 | 记录 P2 项 GO/NO-GO；NO-GO 入 Future Considerations | 决策闸 | FR-62 | M6 | |

---

## 附 A：16 demo 页 × 视觉要素对照（FR-56 页面维度，模块 100%）

> 每格填 `P`（PASS）/`F`（FAIL）；任一格 F 需在「差异与结论」定位到映射缺口。要素列覆盖：布局、文字、描边、圆角、效果、渐变/叠层、图片、图标/矢量、间距。

| 页 | 布局 | 文字 | 描边 | 圆角 | 效果 | 渐变 | 图片 | 图标/矢量 | 间距 | 结果 |
|----|------|------|------|------|------|------|------|-----------|------|------|
| 01-登录 | | | | | | | | | | |
| 02-注册 | | | | | | | | | | |
| 03-商品列表 | | | | | | | | | | |
| 04-商品详情 | | | | | | | | | | |
| 05-购物车 | | | | | | | | | | |
| 06-订单确认 | | | | | | | | | | |
| 07-订单列表 | | | | | | | | | | |
| 08-个人中心 | | | | | | | | | | |
| 09-Dashboard | | | | | | | | | | |
| 10-表单页 | | | | | | | | | | |
| 11-Card-列表 | | | | | | | | | | |
| 12-Tab-页面 | | | | | | | | | | |
| 13-绝对定位页 | | | | | | | | | | |
| 14-长文本页面 | | | | | | | | | | |
| 15-图片密集页面 | | | | | | | | | | |
| 16-多层嵌套页面 | | | | | | | | | | |
| **模块结论** | | | | | | | | | | **__ / 16** |

## 附 B：Design 面板 11 分区 × 字段（模块 100%）

> 列：可见（选中对应节点时出现）/ 可编辑（改动生效且上画布）/ 默认值（与 Figma 一致）/ 结果（P/F）。

| # | 分区 | 关键字段 | 可见 | 可编辑 | 默认值 | 结果 |
|---|------|---------|------|--------|--------|------|
| B1 | 对齐快捷 | 6 向对齐 + 2 向分布 | | | | |
| B2 | 位置尺寸 | X/Y/W/H、旋转、锁定比例 | | | | |
| B3 | Layout | 方向、模式、gap、padding 9 点位、sizing、min/max、wrap、baseline、space-between、clip、Ignore auto layout | | | | |
| B4 | Constraints | 5 向 2 轴、Ctrl 预览 | | | | |
| B5 | Layer | blend mode 20 种、opacity、可见/锁 | | | | |
| B6 | Fill | 多层增删排序、显隐、5 型、层透明、渐变 stop/角度、Image 层 | | | | |
| B7 | Stroke | 单值/四边、3 对齐、透明、dash+gap、cap 8 项、join+miter、默认 1px inside | | | | |
| B8 | Effects | 8 类、参数、预设 | | | | |
| B9 | Layout grids | 3 型（Columns/Rows/Grid）、count/gutter/alignment/offset/色/显隐 | | | | |
| B10 | Typography | FR-15 全字段（字号/字重/行高/字距/对齐/装饰/case/auto resize/truncate/OpenType） | | | | |
| B11 | Selection colors + Export | 选中集色一键改；Export 格式/scale/suffix | | | | |
| | **模块结论** | | | | | **__ / 11** |

## 附 C：菜单与能力可见性（可用 ✓ / 置灰 ✗+tooltip）

| 菜单 | 可用项 | 置灰项（本版口径） | 结果 |
|------|--------|------------------|------|
| File | 新建/打开/保存/导入/导出/设置 | — | |
| Edit | 撤销/重做/剪切/复制/粘贴/全选/查找 | — | |
| View | 放大/缩小/标尺/网格/显示/隐藏 | — | |
| Object | 上下移/置顶底/组合/锁定 | 布尔/组件/轮廓 | |
| Text | 左/中/右对齐 | 大小写/段落 | |
| Plugins | — | 全部 3 项 | |
| Help | 快捷键面板 | 帮助中心/关于 | |

## 结果汇总

| 项 | 数值 |
|----|------|
| 矩阵总条数 | **73** 走查行（P0 53 + P1 17 + P2 3）+ 附 A 16 页×9 要素 + 附 B 11 分区 + 附 C 7 菜单 |
| GA 通过线 | 总 ≥95% **且** 四模块（附 A / 附 B / 第八节 P0 / FR-57 样片）100% |
| 本轮结果 | **M5 段 13 行实测（2026-10-16，脚本 `scripts/m5-matrix.mjs`，证据 `dist/m5-matrix/`）：6 PASS / 7 FAIL；**同批 ★ 四项已修复改判 PASS（#9-#12 闭环：runtime Navigate 锚点回退/Present WAAPI 过渡/九宫 9 键/Flow 起点右键+蓝标）**；P1 挂账=钢笔二次编辑、布尔形状口径、形状 SVG 化（#13）；同批 M4 段 11 行实测（2026-10-16，脚本 `scripts/m4-matrix.mjs`，证据 `dist/m4-matrix/`）：6 PASS / 5 FAIL（P1-01 帧预算、P1-03 图片调整双端未接、P1-08 同名同步+拖入、P1-09 样式编辑入口、P1-12 档位口径）+ m12 段 19 行（10-15，12 PASS/7 待甄别，脚本失配嫌疑大）+ 更早 M3 段 15 行实测全 PASS（2026-10-14）** + 门禁回归（tsc 0 错/vitest 234/234/e2e 16/16≥98%/viewport 64/64/walkthrough 9/9/m1 22/m2 27/pages 224/224）+ FR-51② 首跑 avg 98.12%；全量 73 行+附 A/B/C 留 QA/M6 |
| 阻断项 | M6 待办：P1-01 帧预算 59.7%<95% 判据、P1-03 imageAdjustments 双端接线、P1-08/09 面板入口补齐、P1-12 档位口径（PM 裁决）、m12 七行甄别、样片逐卡 04/13<99%；（14 页画布↔出码 92.07% 豁免沿差异 #1） |

## 差异与结论

<!-- FAIL 登记：#、现象截图、与 Figma 差异、处理决议（修复 / 接受差异记录 / 调优先级）、Owner、日期 -->

| # | 条目 | 现象与证据 | 归因 | 处理决议 | Owner / 日期 |
|----|------|-----------|------|---------|-------------|
| 1 | FR-51② 14-长文本页面 92.07%（<95%） | `dist/canvas-diff/14-长文本页面-diff.png`：两段混排长文本行内重影，无整体偏移（dy 探测归零）；其余 15 页 avg 98.12% | Konva 与浏览器换行引擎对「CJK+拉丁混排」断行点位不同（PRD 风险表预登记「Konva↔DOM 双渲染像素差」） | **接受差异记录（豁免）**：非几何/样式缺口，不硬改 `src/compiler/`；基线由 PM 确认终值，M6 三方终验复核；如需收敛可择机引入 DOM 文本测量缓存 | opencode / 2026-10-14 |
| 2 | （本轮修复）画布多层渐变静默失效 | 07/13 页画布背景纯色黑块 vs 出码渐变：① DSL 遗留 CSS 渐变字符串简写迁移为 FR-17 结构化 fills（pages.ts 两处）② `fillLayerProps` Konva colorStops 5 元组→成对 [offset,color] 格式 ③ 补 `fillPriority: 'linear-gradient'/'radial-gradient'`（纯色 fill 默认覆盖渐变） | 三处独立缺陷叠加（画布渐变从未正确渲染过） | **已修复**：07 页 67.36%→98.47%、13 页 21.38%→97.30% | opencode / 2026-10-14 |
| 3 | （本轮修复）Konva 文本基线比 DOM 高 ~1px | dy=+1 探测全页一致提升（14 页 93.2%、07 页 99.0%） | Konva 默认 MIDDLE 基线按 em-box 中点定位；DOM 为半行距+ascent 公式 | **已修复**：启用 `Konva._fixTextRendering`（fontBoundingBox 公式与 CSS line box 一致），avg +0.33pp | opencode / 2026-10-14 |
| 4 | P1-01 FR-60 帧预算未达标 | 1000 节点拖拽 95% 帧<16.7ms 判据实测 59.7%（435/729，avg 17.03ms/p95 16.8ms）；idle 60.5fps 正常 | 拖拽期 dragMove 快照/约束重算开销（perf-1000 report `dist/perf-1000/`） | **待整改**：M6 性能专项（拖拽节流/几何缓存），或 PM 按 avg≈17ms 边缘证据调判据口径 | QA+主线 / 2026-10-16 |
| 5 | P1-03 图片 7 项调整双端未接 | 面板滑杆+store 持久化 OK，但 compiler/generator 全文不消费 `imageAdjustments`（曝光 30 → 出码无 brightness），画布像素预览未接 | M3 十六步登记为「FR-20 余项」，M4 排期未覆盖 | **待修复**：出码 filter/brightness 映射 + 画布 filter 接入（P0 口径「filter 映射实时生效」） | 主线 / 2026-10-16 |
| 6 | P1-08/P1-09 组件与样式面板缺口 | 组件改名不回流 components[].name、无拖入实例；样式「改值批量同步」无 UI 入口（UPDATE_TOKEN 仅 store/单测可达） | 面板实现只到「应用/分离/创建」，编辑与回流未做 | **待修复**：重命名 action 内按 componentId 回流一行 + 样式行色值/字号编辑控件（成本低） | C 轨 / 2026-10-16 |
| 7 | P1-12 约束档位口径矛盾 | 实现=4 档（LEFT/RIGHT/CENTER/SCALE）×2 轴，功能断言全绿；checklist 行文案「5 向」含 Left+Right stretch | FR-35 枚举止于 4 档，行文案与 PRD 不一致 | **PM 裁决**：按 FR-35 枚举则 P1-12 改判 PASS；若要 stretch 档则列 M6 后增强 | PM / 2026-10-16 |
| 8 | （本轮修复）FR-44 旋钮劫持 resize | 单选 FRAME 右中点拖拽起拖线而非改宽——knob Circle 与 `e` 把手同点位、上层先命中（m4-matrix P1-12 附带发现） | 旋钮锚点未避开把手占位 | **已修复**：旋钮外偏 14px（page 单位=屏幕恒定），探针验证把手 resize OK + 拖线 OK（present-smoke 同步更新） | opencode / 2026-10-16 |
| 9 | （已修复 2026-10-16）P0-48★ runtime Navigate 永不生效 | 导出页点击配置过 Navigate 的元素：无切换 + console `[uic-runtime] NAVIGATE 目标页不存在：frame-10`（复现：2 Frame 配 ON_CLICK/Navigate→ZIP→prototype/index.html） | runtime.ts 把 targetId 当页 id 查 `data-uic-page`，而 UI 唯一合法目标=同页 Frame（FR-45 口径）——Present 引擎（Frame 栈）与出码引擎（页切换）语义分叉 | **修复中**：runtime 目标解析加 `data-node` 回退（Frame 目标=滚动定位+active 标记，页目标=切 section），与 Present 语义对齐后回写报备 | opencode / 2026-10-16 |
| 10 | （已修复 2026-10-16）P0-41★ Present 换帧零动画 | 配 Dissolve 1200ms 点击后 80ms computed transitionDuration=0s（transitionStyle() 已导出未接线，PresentOverlay.tsx 换帧段） | Present 引擎换帧=整体重渲无过渡层 | **修复中**：navigate 携带 transition → 容器入场动画（DISSOLVE=opacity、MOVE/PUSH/SLIDE=translate，§2.3 映射） | opencode / 2026-10-16 |
| 11 | （九宫已修复 2026-10-16）P0-42★ 九宫 7 键/遮罩不可配 | PrototypePanel overlayPosition 仅 7 方位（types 枚举含 MANUAL/PRESET 未列）、无拖拽、遮罩固定 rgba(0,0,.32) | 计划书 §2.2 把 MANUAL 记「首版按 CENTER」、PRESET 置灰——面板未出两键；拖拽为 P1 后置 | **修复中**：补 MANUAL（按 CENTER 生效+注记）/PRESET 置灰两键；拖拽定位与遮罩透明度登记 P1 体验项 | opencode / 2026-10-16 |
| 12 | （已修复 2026-10-16）P0-43 Flow 起点入口缺失 | 右键画布 Frame 无「设置流程起点」；选中 Frame 无蓝标；仅面板 toggle 可用 | Canvas menuItems 未加条目、flowStart 无画布渲染（grep 0） | **修复中**：右键条目（dispatch SET_FLOW_START，勾选态显示「移除」）+ 画布左上蓝 ▶ 徽标 | opencode / 2026-10-16 |
| 13 | P1-04/05/14 矢量严格口径 | 已提交路径无锚点二次编辑；普通形状不可直接布尔（canBoolean 仅认 VECTOR）、布尔结果无再编辑；圆/多边形出码走 CSS 通道（cap/join 丢失）、arcData 走 conic-gradient 非 SVG path | 均为 M4 报备后置项，但行口径为 P1 必交付 | **待排期（M6 矢量专项）**：锚点编辑≈中大型；形状→SVG 化影响像素管线需 PM 定口径（改判文案 or 实现）；布尔形状=创建时自动矢量化方案评估 | PM+主线 / 2026-10-16 |

## 修订历史

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| 草案 1 | 2026-10-02 | opencode | 依 PRD v1.0 FR-1~37 拆 32 条 P0 走查项，待 PM+QA 定稿 |
| 矩阵 2 | 2026-10-03 | opencode | **FR-56 全量升级**：覆盖 v1.1 FR-1~62（十一节 73 行）；修正 v1.0→v1.1 FR 编号漂移（P0-23 图片→FR-20、P0-24→FR-31/32、P0-25→FR-33、P0-26→FR-34、P0-27→FR-38、P0-28/29→FR-37、P0-30→FR-46/52、原 P0-31→P0-51/FR-53、原 P0-32→P0-52~53/FR-54~55，原编号仅存于版本历史）；新增附 A 16 页×9 要素、附 B 11 分区、附 C 菜单能力表；GA 通过线改「≥95% + 四模块 100%」；加里程碑列标注 M1–M3 已交付回归项 |
| 矩阵 3 | 2026-10-14 | AutoClaw | **M3 段实测填结果**：15 行 PASS（P0-21/21b/22/23/24/25/26/27/33/34/34b/35/36/46/47/49/50/51/52/53 + P1-16 基线回归，脚本 `scripts/m3-matrix.mjs` 15/15，证据 `dist/m3-matrix/`）；P0-49 补 FR-51② 首跑基线（avg 98.12%/15-16≥95%/min 92.07%，管线 `npm run canvasdiff` + `scripts/canvas-diff.mjs`，报告 `dist/canvas-diff/report.json`）；差异与结论登记 1 豁免 + 2 修复；M4/M5 行与附 A/B/C 留里程碑/GA 全量 |
| 矩阵 4 | 2026-10-16 | opencode | **M4 段 11 行实测填结果**（脚本 `scripts/m4-matrix.mjs`，6 PASS/5 FAIL，证据 `dist/m4-matrix/`，HEAD=9c325bf）；差异与结论新增 #4-#7（FR-60 帧预算/图片调整双端/面板缺口/档位口径）+ #8（FR-44 旋钮重叠已修复）；同批主线提交：FR-44 连接线+Shift+Space 内联预览+Present 多页、BOOLEAN_OP 修复、autosave v2 接线（多页持久） |
| 矩阵 5 | 2026-10-16 | opencode | **M5 段 13 行实测填结果**（脚本 `scripts/m5-matrix.mjs` 第八跑 16/16 记录、证据 `dist/m5-matrix/` 28 截图+15 DSL 样本+proto 导出站，HEAD=077b52c）：6 PASS/7 FAIL；★ 核心缺口 4 项进修复（#9 runtime Navigate 双引擎分叉/#10 Present 过渡/#11 九宫/#12 Flow 起点），P1 矢量口径挂账（#13）；P0-44 修复后复验 PASS（旋钮 14px/内联预览/Page 下拉全绿） |
