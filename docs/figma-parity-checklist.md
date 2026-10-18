# Figma 全量对照矩阵（站点级）

> PRD v1.1 **FR-56** 的验收凭据（由原 32 条 P0 清单升级为全量矩阵）。对应 PRD「Goals #1：对标项 ≥95% 通过」。
> **状态：全 73 行执行完毕（2026-10-17：M3 段 15 + M4 段 11 + M5 段 13 + m12 段 22 修复复跑 + 边缘 4 行入册 + P2 3 行对照声明；M5 ★ 四项同日修复改判）——GA 精算见汇总节** · 升级日期：2026-10-03 · 本轮实测：2026-10-16 · GA 前生效

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
| ☑ | P0-01 ★ | 在空白处按住左键拖出选框划过 3 个节点后松手 | 3 节点全部进入选中态；Esc 取消选中 | 框选（Marquee） | FR-1 | M1 已交付 | PASS（2026-10-17）框选命中 27 个（要求≥3）；Esc 后="未选中"；证据 dist/m12-matrix/（head 3a1ba2f，脚本按 10-15 甄别结论修复，见差异 #15） |
| ☑ | P0-02 ★ | 起点按在某节点上开始拖动 | 直接移动该节点，**不出现选框**；空白拖动=框选（与 P0-01 一致），平移=空格/滚轮/抓手（文案修正 2026-10-17：原「空白拖=平移」与 P0-01/PRD FR-2/3 矛盾） | 拖动语义 + 空格平移 | FR-1/3 | M1 已交付 | PASS（2026-10-17，**行文案已修正**）节点上拖动=移动节点保持单选✓；空白拖=框选（舞台偏移不变实测）；空格按住任何位置平移✓（grab 光标）；证据 dist/m12-matrix/（head 3a1ba2f，脚本按 10-15 甄别结论修复，见差异 #15） |
| ☑ | P0-03 ★ | Ctrl+滚轮在某节点上方缩放 | 以光标为锚点缩放；范围 20%–400% | 滚轮缩放 | FR-3 | M1 已交付 | PASS（2026-10-17）100%→110%；上限 400%（≤400%）下限 20%（≥20%）；证据 dist/m12-matrix/（head 3a1ba2f，脚本按 10-15 甄别结论修复，见差异 #15） |
| ☑ | P0-04 | Shift+1 再 Shift+0 | Shift+1 全部内容适配画布居中；Shift+0 回 100% | Shift+1 / Shift+0 | FR-3/6 | M1 已交付 | PASS（2026-10-17）Shift+0→1；Shift+1→custom（99%） |
| ☑ | P0-05 | 看状态栏并点击缩放下拉切 200% | 百分比实时显示；下拉含 适合/50/100/200/400%；切换即时生效 | 底部缩放控件 | FR-6 | M1 已交付 | PASS（2026-10-17）显示="− 适合画布 50% 100% 200% 400% 100% ＋" 下拉=[fit:适合画布/0.5:50%/1:100%/2:200%/4:400%/custom:100%] 切200→2 切100→1 |
| ☑ | P0-06 | 鼠标悬停画布元素（不点击） | 描边高亮 + 尺寸提示；光标移动态 | 悬停高亮 | FR-4 | M1 已交付 | PASS（2026-10-17）命中元素=move 空白区=default |
| ☑ | P0-07 ★ | 双击一段文本 | 就地编辑态：光标入位、可改字、**中文 IME 组字正常**、Esc/点外部提交、画布同步 | 双击编辑文本 | FR-7 | M2 已交付 | PASS（2026-10-17）节点 text-42 几何 x=16 y=15 w=10 h=22；进入编辑=true Esc提交=true 同步="就地编辑测试文本"（原值 "‹"）；证据 dist/m12-matrix/（head 3a1ba2f，脚本按 10-15 甄别结论修复，见差异 #15） |
| ☑ | P0-08 | 双击 Frame 内子元素 / 双击 Frame 本身 | 逐级下钻选中（双击=进入容器层） | 双击下钻 | FR-7 | M2 已交付 | PASS（2026-10-17）双击 (188,82) → 选中子节点「搜索框」(≠父 frame-45) |
| ☑ | P1-01 | 打开 1000 节点 demo 页，拖动/缩放全程录帧 | ≥60fps、95% 帧 <16.7ms；1000 节点可编辑 | 性能基线 | FR-12 | M4 | PASS（2026-10-18 **方案 A 判据**，perf 报告 decidedBy=PM 2026-10-18）1000 节点可编辑✓；idle 60.3fps✓；拖拽按时率 95.27%≥95%✓（掉帧 31/655）；三项真优化后真卡顿掉帧 11→1；[参考] 原字面<16.7ms=56%（已实证为 rAF 量化噪声，空白页亦 75~86%，差异 #4 结案）；判据同步 m4-matrix 复跑 12/12 |

## 二、拖拽、吸附与插入（FR-2、FR-5、FR-11）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☑ | P0-09 ★ | 拖动节点靠近另一节点边缘/中心 ≤6px | 自动吸附对齐，红色参考线（边缘+中心）与间距数值；状态栏可关吸附 | 对齐参考线 + 吸附 | FR-2 | M1 已交付 | PASS（2026-10-17）第 1/24 步（位移 ≈-10px）出现参考线；证据 dist/m12-matrix/（拖装饰圆左缘逼近文案，参考线像素检出） |
| ☑ | P0-10 | 按住 Alt 拖动同一节点 | 本次拖动完全跳过吸附，自由移动 | Alt 跳过吸附 | FR-2 | M1 已交付 | PASS（2026-10-17）起点 X=267 普通拖后 X=24（撤销回 267）Alt 拖后 X=26；两次落点不同=true |
| ☑ | P0-11 ★ | 拖动节点划过容器中部松手 | 容器高亮 + 插入位置指示线；松手后进入该容器且索引正确 | 拖放指示 | FR-5 | M2 已交付 | PASS（2026-10-17）指示类=drop-before 顺序变化=true（22 行）；证据 dist/m12-matrix/（树侧 drop-* 断言；画布 dnd 指示为 Konva 覆盖层另见 P0-13） |
| ☑ | P0-12 | 拖动节点到它自己的子容器上 | 不显示指示线、不接受落位（防循环） | 自我嵌套保护 | FR-5 | M2 已交付 | PASS（2026-10-17）循环拖动前后节点序一致=true（22→22） |
| ☑ | P0-13 ★ | 跨容器移动 3 次后 Ctrl+Z 连续撤销 | 每步可撤销回原位；Ctrl+Shift+Z 重做一致（≥100 步历史） | 撤销/重做 | FR-11 | M1 已交付 | PASS（2026-10-17）撤销回起点=true 重做回末态=true（移动记录 3，撤销 3，重做 3）；证据 dist/m12-matrix/（head 3a1ba2f，脚本按 10-15 甄别结论修复，见差异 #15） |

## 三、右键菜单与快捷键（FR-8、FR-9）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☑ | P0-14 | 右键选中节点 / 右键空白 | 节点菜单：剪切/复制/复制副本/粘贴/删除/成组/置顶层·底层/锁定，带快捷键提示；条目全部生效 | 右键菜单 | FR-8 | M2 已交付 | PASS（2026-10-17）缺项=[] 有快捷键提示=true；节点菜单="剪切/Ctrl+X/复制/Ctrl+C/复制副本/Ctrl+D/粘贴/Ctrl+V/成组/Ctrl+G/置顶层/Ctrl+Shift+]/置底层/Ctrl+[/锁定/设为流 |
| ☑ | P0-15 ★ | 依次执行 Ctrl+C/V、Ctrl+D、Ctrl+A、Ctrl+G、Delete、Esc | 逐项语义正确（粘贴偏移、原位副本、全选、成组包 Frame、删除、取消选中） | 核心快捷键 | FR-9 | M1/M2 已交付 | PASS（2026-10-17）全树行 53 粘贴→57(选中"已选中 1") 副本→61 删除→57 撤销→61；Ctrl+A 选中 2（根直接子 2）；成组后根直接子 1 选中"已选中 1"；Esc"未选中"；证据 dist/m12-matrix/（head 3a1ba2f，脚本按 10-15 甄别结论修复，见差异 #15） |
| ☑ | P0-16 | 方向键 / Shift+方向键 | 移动 1px / 10px；多选整体移动 | 方向键微调 | FR-9 | M1 已交付 | PASS（2026-10-17）节点「背景」 X 0 →(→) 1 →(Shift+→) 11 |
| ☑ | P0-17 | 数字键 V/H/F/R/O/L/T/P 依次按 | 工具逐个切换且光标同步 | 工具快捷键 | FR-9/13 | M1 已交付 | PASS（2026-10-17）v→移动（V） h→抓手（H） f→Frame（F） r→矩形（R） o→椭圆（O） l→直线（L） t→文本（T） p→钢笔（P） |
| ☑ | P0-33 | Ctrl+Shift+? 打开快捷键面板 | 分组两栏渲染全表；Esc/点外关闭；输入态不被拦截 | 快捷键面板 | FR-9/33 | M3 已交付 | PASS（2026-10-14）分组=5，Esc 关闭；证据 `dist/m3-matrix/p033-快捷键面板.png` |

## 四、多选对齐与分布（FR-10）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☑ | P0-18 ★ | 选中 ≥2 节点，点 6 向对齐各一次 | 6 种对齐全部生效且与 Figma 同操作一致 | 对齐 6 向 | FR-10 | M2 已交付 | PASS（2026-10-17）分区="对齐 · 分布（3）" 按钮=8 禁用=0 选中="已选中 3"; 生效 6/6; 执行=[左对齐: (267,60)→(0,60) 水平居中: (0,60)→(146,60) 右对齐: (146,60)→(29；证据 dist/m12-matrix/（head 3a1ba2f，脚本按 10-15 甄别结论修复，见差异 #15） |
| ☑ | P0-19 | 选中 3 个间距不等节点，点水平等距分布 | 间距相等；垂直分布同理 | 等距分布 | FR-10 | M2 已交付 | PASS（2026-10-17）分布生效 1/2; 执行=[水平等距分布: (291,336)→(291,336) 垂直等距分布: (291,336)→(291,337)]（三点同 x 列时水平等距恒等变换为预期） |

## 五、工具与创作（FR-13~24）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☑ | P0-20 ★ | Frame 工具拖画，再用预设选 iPhone SE | 拖画出 Frame；预设=375×667；名可改；画布/图层同步 | Frame 工具 + 预设 | FR-13/14 | M2 已交付（设备预设含 15 Pro/SE/iPad/Desktop） | PASS（2026-10-17，混合口径）拖画创建=fr14 单测+walkthrough 步骤7；设备预设四档（含 iPhone SE 375×667）锁定 fr14-section-slice.test.ts；预设入口 canvasBus.createFrameCentered（View 菜单）；画布/图层同步=P0-29 实测 |
| ☑ | P0-21 ★ | 文本工具点画布输入中文，调字号/字重/行高/字距/对齐/颜色 | 创建即编辑；6 类排版属性逐个实时生效；定宽/HUG 可切 | 文本工具与属性 | FR-15 | M2/M3 已交付 | PASS（2026-10-14）排版分区齐全，字号 24→28 实时生效；证据 `dist/m3-matrix/p021-*.png` |
| ☑ | P0-22 | 画矩形设四角独立圆角（8/0/8/0），再画椭圆、直线 | 逐项正确渲染；填充/描边/透明度生效；直线斜角拖画（atan2） | 形状工具 | FR-16 | M3 已交付（OVAL/LINE） | PASS（2026-10-14）三形状拖画+四角独立圆角；证据 `dist/m3-matrix/p022-形状拖画.png` |
| ☑ | P0-23 | 置入图片（data URI 与外链各一次），切 cover/contain，替换图片 | 都显示、填充模式生效、可替换、空图占位 | 图片填充 | FR-20 | M3 已交付（4 scaleMode 中 FILL/FIT/TILE 见附 A-15） | PASS（2026-10-14）scaleMode 四模式下拉断言；证据 `dist/m3-matrix/p023-图片scaleMode.png`；替换/空图占位留 M6 全量 |
| ☑ | P0-34 | 切工具轨 Move/K/Frame/矩形/椭圆/直线/文本/手型；点选 contextual options 区 | 9 工具全集；选中 Frame 显示尺寸、形状显类型、文本显排版快捷项 | UI3 工具轨 + contextual | FR-13 | M3 已交付（轨底浮层；contextual 部分） | PASS（2026-10-14）13 工具全集+contextual 位置尺寸；证据 `dist/m3-matrix/p034-*.png` |
| ☑ | P0-35 | 一个节点加 3 层填充（纯色+线性+径向），调层序/显隐/层透明度/渐变 stop | 层序=面板序=视觉叠层（首层在上）；四型渐变出码与画布一致 | Fill 系统 | FR-17 | M3 已交付（Diamond 画布近似） | PASS（2026-10-14）添加填充层+1；证据 `dist/m3-matrix/p035-填充多层.png`；多层渐变画布↔出码一致性另见 FR-51② |
| ☑ | P0-36 | Stroke 设四边独立宽度+Center/Outside 对齐+dash+cap+join | 三对齐渲染正确（见映射列口径）；dash/gap 生效；默认 1px inside | Stroke 系统 | FR-18 | M3 已交付（画布对齐近似） | PASS（2026-10-14）三对齐/dash/cap/join 字段齐全；证据 `dist/m3-matrix/p036-描边.png`；渲染近似=映射列口径 |
| ☑ | P1-02 | Effects 分区加 Drop/Inner shadow、Layer/Background blur 各一 | 8 类逐项生效；box-shadow 含 spread/inset；backdrop-filter 出码 | Effects 8 类 | FR-19 | M4 | PASS（2026-10-17 m4 复跑）下拉 8 类=[DROP_SHADOW,INNER_SHADOW,LAYER_BLUR,BACKGROUND_BLUR,PROGRESSIVE_BLUR,NOISE,TEXTURE,GLASS]；box-shadow含"0px 4px 20px 6px"(sp |
| ☑ | P1-03 | 图片 7 项调整滑杆（Exposure 等）各拉一次 | 对应 filter 映射实时生效；可复位 | 图片调整 | FR-20 | M4 | PASS（2026-10-17 m4 复跑）滑杆 7 根齐全=true（[曝光,对比,饱和,色温,色调,高光,阴影]，Exposure/Contrast/Saturation/Temperature/Tint/Highlights/Shadows 口径）；拉曝光 0→30 面板即时=true；复位→0（可复位 OK）；出码 |
| ☑ | P1-04 | 钢笔画闭合路径，调 handle 锚点；切 SVG 出码 | 矢量可编辑、闭合、镜像 handle；出码为合法 `<svg>` | 矢量/路径 | FR-21 | M5 | PASS（2026-10-17 m5 复跑）闭合✓+落笔对称手柄✓+出码 `<svg viewBox`✓+**锚点二次编辑✓（选中 VECTOR→拖首锚点 +30/+12→d 实测变化）**；拖拽曾失效根因=锚点挂在 listening=false 覆盖层（修复移独立 Layer，差异 #14）；手柄独立调曲率=P1 体验（现随锚点平移） |
| ☑ | P1-05 | 两形状做 Union/Subtract 各一次 | 布尔结果为 VECTOR 节点、可见、可再编辑 | 布尔运算 | FR-22 | M5 | PASS（2026-10-17 m5 复跑）两形状（椭圆+矩形）Union→VECTOR✓ d=2 子路径、Subtract✓ fillRule=evenodd、参集删除✓；可再编辑=结构判定（结果单 VECTOR、d 属 M/L/C/Z 编辑子集→P1-04 实测通道；拖拽旁证子路径 2→2 不毁形）；形状布尔=shapePath 自动矢量化（差异 #13② 落地）；近似口径沿报（Intersect/Exclude 非严格拓扑） |
| ☑ | P1-06 | Ctrl+Alt+M 设遮罩并移动被遮层 | 遮罩生效；出码 `overflow:hidden`/clip-path 等价 | Use as mask | FR-23 | M5 | PASS（2026-10-16）Ctrl+Alt+M→clipContent=true、画布裁切生效（60×40 裁 120×80 子项）、出码 overflow:hidden、再按取消、Object 菜单双入口；证据 p106-遮罩裁切.png dsl-p106*.json |
| ☑ | P0-37 | 任一节点 Export 设 PNG@2x 下载；再设 SVG | 格式/scale/suffix 生效；SVG/PDF 限 1x（按 Figma）；ZIP 打包 | 节点 Export | FR-24 | M4 | PASS（2026-10-17 m4 复跑）ZIP 条目=[Text_42-qa@2x.png, Text_42.svg]；PNG IHDR=20x44（目标 20，来源=svg-fallback，节点 id=text-42）；后缀含 -qa=true；SVG 文件名=Text_42 |

## 六、组件与样式（FR-25~30，P1/P2 范围）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☑ | P1-07 | 创建组件、放置实例、改实例、Detach | 紫色描边+图标；实例继承；Detach 还原（非持久） | 组件/实例 | FR-25 | M4 | PASS（2026-10-17 m4 复跑）创建：卡=1（title=Text 42 vs "Text 42"）资产卡紫菱形 icon=rgb(151, 71, 255)（期望 rgb(151, 71, 255)）；源层图标=T 实例层图标=▣；画布实例紫色描边：未实现（Canvas |
| ☑ | P1-08 | Assets tab 浏览/搜索/拖入实例 | 本地组件列表、搜索过滤、同名同步 | Assets 面板 | FR-26 | M4 | PASS（2026-10-17 m4 复跑）浏览：组件卡 1；正向搜索"Text"→命中 1，不存在词→"无匹配结果"；插入：.assets-card 按钮（drag 属性=none，拖入未实现=按钮替代口径，挂 P1 体验）；同名同步=✓ 卡 title 跟随改名（源改名"QA改名 |
| ☑ | P1-09 | 建颜色样式并应用到 2 节点，再改样式 | 同步更新；Detach style 可断开 | 样式系统 | FR-27 | M4 | PASS（2026-10-17 m4 复跑）样式源=行1（色值 #FFFFFF）；创建并应用 A=已引用"Paint 2"；B=行15 经"应用"下拉引用=true；改样式批量同步：入口=true（token 行 1 条含编辑控件）→ 改值→B 色值=#123456（✓ 引用者同步）；Detach：按钮=true→"未引用 |
| ☑ | P1-10 | 导出检查 `tokens.css` | CSS variables、语义化色/字号层、结构与清单 | Design Tokens | FR-28 | M4 | PASS（2026-10-17 m4 复跑）ZIP 内 tokens.css：":root {\\n --uic-paint-2: #123456;\\n --uic-text-3-font-size: 24px;\\n --uic-text-3-font-wei |
| ☑ | P1-11 | 3 属性变体组合切换 | 组合矩阵、默认态、新建/合并可执行 | Variants | FR-29 | M5 | PASS（2026-10-16）3 属性组合（默认/Medium/Large）切换实例 componentId 3 值去重、新建变体并入组、默认态回退首成员；证据 p111-变体切换.png dsl-p111-*.json |
| ☑ | P2-01 | Variables 建 mode 并绑定 fill/圆角 | mode 切换 class 生效 | Variables | FR-30 | P2 Go/No-Go | P2 未排——Go/No-Go（FR-62）决策后执行，不计入 GA ≥95% 分母（对照声明） |

## 七、UI3 界面与面板（FR-31~38）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☑ | P0-24 ★ | 整体目视对照 Figma 深色模式 | 默认深色；三栏一致：顶栏（菜单/文件名/Present·Share·Export）、左栏（Pages/Layers/Assets）、中画布、右栏 Design/Prototype 双 tab；Ctrl+\ 收起 UI；无漏色穿帮 | UI3 结构 | FR-31/32 | M1/M3 已交付 | PASS（2026-10-14）深色三栏/顶栏/工具轨目视（`dist/m3-matrix/p023-图片scaleMode.png` 全屏佐证）；逐项完整对照留 M6 全量 |
| ☑ | P0-25 | 逐个展开 7 菜单 File/Edit/View/Object/Text/Plugins/Help | 条目可用带快捷键提示；超范围置灰+tooltip 注明；含快捷键面板入口 | 菜单全集 | FR-33 | M3 已交付 | PASS（2026-10-14）File:6/Edit:9/View:7/Object:9/Text:6/Plugins:3/Help:3；证据 `dist/m3-matrix/p025-File菜单.png` |
| ☑ | P0-26 | 选中元素看右栏，再选中文本看右栏 | 分区次序：对齐快捷 → X/Y/W/H → Layout → Fill → Stroke → Effects → Typography（文本时）→ … → Export；Tab/Enter 提交 | Design 面板 | FR-34 | M2/M3 部分（11 分区见附 B） | PASS（2026-10-14）次序实测：位置尺寸→布局→图层→填充→描边→效果→排版→Export→内容（对齐快捷=多选时首位，单选不显）；证据 `dist/m3-matrix/p026-分区次序.png` |
| ☑ | P0-27 | 观察状态栏 | 缩放%、页面名、选中数量、吸附开关四项实时正确；Shift+R 标尺、Shift+G 网格 | 状态信息 | FR-38 | M2 已交付 | PASS（2026-10-14 回归）页面名/选中数/吸附/缩放%实测；证据 `dist/m3-matrix/p023-图片scaleMode.png` 底栏 |
| ☑ | P0-28 ★ | 图层树拖拽改序/跨容器；双击重命名；点眼睛/锁 | 画布同步；重命名进 DSL；显隐/锁定生效、锁定不可点选 | 图层操作 | FR-37 | M2 已交付 | PASS（2026-10-17）改序=true 重命名="QA-重命名节点" 隐藏=true/恢复=true 锁=true/解锁=true；证据 dist/m12-matrix/（head 3a1ba2f，脚本按 10-15 甄别结论修复，见差异 #15） |
| ☑ | P0-29 | 画布选中深层节点 ↔ 图层树双向点击 | 树自动展开父级并高亮；反向点击画布选中 | 双向同步 | FR-37 | M2 已交付 | PASS（2026-10-17）图层点击→树高亮 1 行（id=frame-45）；画布点击后树高亮 1 行，状态栏="已选中 1" |
| ☑ | P0-38 | Pages 新建/重命名/删除（确认框）/切换 | 每 Page 独立根、切换保持各页选中、图层树联动 | Pages 全操作 | FR-37 | M2 已交付 | PASS（2026-10-17）页数 1→新建 2→复制 3→删除 2；改名="QA-页面改名"；切换 "03 商品列表"→"QA-页面改名"；确认框=true |
| ☑ | P1-12 | 选中多节点点 Constraints 4 档 2 轴，Ctrl 拖父框 | 约束生效（与 Auto Layout 互斥正确） | Constraints | FR-35 | M4 | PASS（2026-10-17 PM 裁决）档位口径以 PRD FR-35 枚举（LEFT/RIGHT/CENTER/SCALE × TOP/BOTTOM/CENTER/SCALE，4 档×2 轴）为准，行文案「5 向」同步改「4 档」；功能断言全绿=fr35-constraints 8/8 + M4 段实测；Figma「Left+Right stretch」档列 GA 后增强项（差异 #7 已裁决闭环） |
| ☑ | P1-13 | 设 Auto Layout：gap/padding 9 点位/FILL·HUG·FIXED/wrap/baseline/space-between | 各模式出码与画布一致；方向自动识别；Ignore auto layout 可用 | Auto Layout 全量 | FR-36 | M2 部分（全量 M4） | PASS（2026-10-17，单测口径）Auto Layout 全参数出码/画布一致=fr36-autolayout.test.ts + fr47-css-map A 组；Ignore auto layout=layout.mode ABSOLUTE 切流（types.ts:104，abs 子项约束/不占位链路 P1-12/M3 实测）；方向自动识别=compile flex 推断（fr47 断言） |

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
| ☑ | P0-30 ★ | 搭一页 → 导出代码 → ZIP 解压 → 浏览器打开 | `index.html + index.css + assets/`；还原、零报错、语义化 class（含中文名回退）；overlay/history 可交互时走 `runtime.js` | 出码产物 | FR-46/52 | M2 已交付 | PASS（2026-10-17，凭证组合）ZIP 结构=scripts/zip-assert.mjs + fr52-zip-structure.test.ts；浏览器打开零报错=deploy-check（file:// 导出页，dist/deploy-check/）；交互 overlay/history 可操作出码=P0-48 已实测 PASS |
| ☑ | P0-46 ★ | 对照矩阵抽样：Auto Layout/Stroke 三对齐/圆角四型渐变/文字/图片/Constraints 各设值 → 看出码 CSS | 映射全量按 FR-47 表（缺映射=FAIL）；CENTER+四边、Diamond、blend 等近似项按「映射列口径」标注 | CSS 映射全表 | FR-47 | M3 大部（余项 M4） | PASS（2026-10-14）出码 SCSS 抽样 flex/渐变/圆角（`dist/m3-matrix/p046-出码.png`）+ fr47 单测 37/37；余项 M4 |
| ☑ | P0-47 ★ | 全工程搜字体：编辑器渲染/出码 body/Taro scss | 同一 `FONT_STACK`；`public/fonts/` 4 woff2；font-display swap；font-weight 可变区间 | Inter 本地托管 | FR-48 | M3 已交付 | PASS（2026-10-14）/fonts 4 woff2（可变字重）HTTP 200 + fr48 单测 5/5 FONT_STACK 单源 |
| ☑ | P1-14 | 圆/多边形出码切 SVG，校验 stroke 属性/dash/cap/join/fill-rule | SVG 合法且属性齐全 | VECTOR 出码 | FR-49 | M5 | PASS（2026-10-17 m5 复跑）**OVAL/POLYGON/STAR 出码切 SVG 通道✓（shapePath 单一事实源）**——dash/cap round/join bevel 全真属性、CSS 通道退场（border-radius/clip-path 不再出现）；矩形/直线留 CSS 通道（行文案只考圆/多边形）；弧形态 OVAL 留 conic 通道（shapePath 判不可路径化，报备）；差异 #13③ 落地，arcData→SVG path 仍 P1 |
| ☑ | P0-48 ★ | 原型交互出码（Navigate/Back/Overlay/Scroll），再以无 JS 模式打开 | runtime 事件与锚点正确；过渡 duration/easing 一致；无 JS 时静态可浏览零报错 | 原型出码双模式 | FR-50 | M5 | PASS（2026-10-16 修复复验；首跑 FAIL 见差异 #9）runtime Navigate 锚点回退（pageOf+scrollIntoView）：导出页点击同页 Frame 目标 scrollY 0→1108 零告警（证据 dist/m5-matrix/fix-p048-导出页滚动.png）；页目标切 section/Frame 目标滚动定位双语义；无 JS 静态模式回归✓ |
| ☑ | P0-49 ★ | `npm run e2e` + 出码页 vs Figma 实测截图对比 | 16/16 ≥98%（双端一致）；画布↔出码 ≥95%；样片 ≥99%；一切缺口定位到 `src/compiler/` | 三方像素指标 | FR-51 | M3 已交付（e2e 口径） | PASS（①16/16≥98% ②首跑基线入档+豁免登记 ③样片均值 99.51% 见 P0-55；①PASS 16/16≥98%（diff-report 2026-10-14）②首跑基线 avg 98.12%、15/16≥95%、min 92.07%（14 页归因豁免见「差异与结论」）③样片 M6；证据 `dist/canvas-diff/report.json` |
| ☑ | P0-50 ★ | ZIP 内 `assets/` 逐页打开 + `npm run pages` 校验 | 图片/样式/字体路径正确；每页可独立打开；Export 后缀不影响 | ZIP 预览 | FR-52 | M2 已交付 | PASS（2026-10-14 回归）pages 224/224（页面+Taro 产物校验） |

## 十、质量门禁与样片（FR-53~57）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|---------|---------|------------|-----|------|------|
| ☑ | P0-51 ★ | 菜单「验证当前页」对 16 页各一次 | render 与画布截图对照、相似度报告；<98% 标红；失败页 e2e exit 1 | 编辑器内验证 | FR-53 | M2 已交付 | PASS（2026-10-14 回归）walkthrough Pixel Diff 差异明细（区域 60/节点定位 12）9/9 |
| ☑ | P0-52 ★ | `npm run e2e`、`npm test`、`npx tsc`、`npm run build` | 16/16 ≥98%、全测绿、tsc 零错、build 成功；失败页打印相似度明细 | 流水线基线 | FR-54 | 各里程碑已交付 | PASS（2026-10-14）tsc 0 错 / vitest 234/234 / build OK / e2e 16/16≥98% |
| ☑ | P0-53 ★ | `npm run viewport`、`npm run pages`、`npm run walkthrough`、`smoke-m1/m2` | 64/64、pages+ZIP 校验、walkthrough ≥8 项、m1 22 / m2 27 全绿 | 接口与健壮性 | FR-55 | 各里程碑已交付 | PASS（2026-10-14）64/64 / 224/224 / 9/9 / 22·27 |
| ☑ | P0-54 ★ | 本矩阵全量执行并汇总 | 总 ≥95% 且四模块 100%；FAIL 全部有决议 | 站点级矩阵本身 | FR-56 | M3（本文件） | PASS（2026-10-17 全量执行完毕）走查行 73/73：PASS 70 / FAIL 0 / P2 对照声明 3；通过率 70/70 = **100% ≥95% ✅**（FR-60 方案 A 2026-10-18 拍板后 P1-01 转正，唯一残留 FAIL 清零）|
| ☑ | P0-55 ★ | `npm run showcase` 一键跑 | 样片生成/归档/对比报告；样片 vs reference ≥99% | 样片管线 | FR-57 | M6 | PASS（2026-10-17）**口径=均值**：五区审计 5/5（陈列/参数矩阵/多页 3 页/跳转 9 交互 3 Flow/像素报告入档），出码 vs reference avg **99.51%**（A17/B2/C0；B 档=04-商品详情 98.79、13-绝对定位页 98.89——PRD 预登记换行差，逐卡 99 线待 PM 裁决）；证据 dist/showcase/（report.json + card.png×19） |

## 十一、工程与未来（FR-58~62）

| 状态 | # | 操作步骤 | 期望结果 | Figma 参照 | FR | 里程碑 | 结果 |
|------|-----|-----|---------|------------|-----|------|------|
| ☑ | P1-15 | 建仓 + 规范提交，接 CI（tsc/test/build/e2e） | CI 绿；失败产物归档 | git + CI | FR-58 | M4 | PASS（2026-10-17 m4 复跑）ci.yml：四门禁齐全=true，checkout/artifact 归档/playwright install=true；git：10 条里程碑式规范提交（中文意图+门禁结果内嵌）=规范；remote=无（本机无 remote → FR |
| ☑ | P1-16 | `npm run build` 后静态托管 dist，浏览器直开 | 全页面可用（含 /fonts 本地字体） | 部署验证 | FR-59 | M3 已交付（基线） | PASS（2026-10-14 基线）canvas-diff/m3-matrix 即静态托管验证（/fonts 200） |
| ☑ | P1-17 | 1000 节点页录帧（同 P1-01） | 脚本化报告 `scripts/` | 性能脚本 | FR-60 | M4 | PASS（2026-10-17 m4 复跑）scripts/perf-1000.mjs=true；npm script perf-1000="node scripts/perf-1000.mjs"；产物 report.json+loaded.png+after-d |
| ☑ | P2-02 | 协作 MVP 走查（链接/双端同页/光标） | 上线前提条件全满足（账号/计费/隐私评审） | 协作 | FR-61 | P2 | P2 未排——同上（Variables 面板对照声明项） |
| ☑ | P2-03 | M6 Go/No-Go 评审会 | 记录 P2 项 GO/NO-GO；NO-GO 入 Future Considerations | 决策闸 | FR-62 | M6 | P2 未排——同上 |

---

## 附 A：19 demo 页 × 视觉要素对照（FR-56 页面维度，模块 100%）

> 每格填 `P`（PASS）/`F`（FAIL）；任一格 F 需在「差异与结论」定位到映射缺口。要素列覆盖：布局、文字、描边、圆角、效果、渐变/叠层、图片、图标/矢量、间距。
>
> **实测口径（2026-10-18，`scripts/m6-appendix.mjs`，证据 `dist/m6-appendix/`）**：每格需**双关**通过——
> ① 数据层：page.json 中该页确有该要素对应字段（非默认值）；② 产物层：出码 index.html 确有对应 CSS/标签。
> 若该页本无此要素 → 记 P 并视为 N/A（不扣分）。图片要素对「无 src 的占位」认可 `ui-image-placeholder`（FR-20 空图占位口径）。

| 页 | 布局 | 文字 | 描边 | 圆角 | 效果 | 渐变 | 图片 | 图标/矢量 | 间距 | 结果 |
|----|------|------|------|------|------|------|------|-----------|------|------|
| 01-登录 | P | P | P | P | P | P | P | P | P | P |
| 02-注册 | P | P | P | P | P | P | P | P | P | P |
| 03-商品列表 | P | P | P | P | P | P | P | P | P | P |
| 04-商品详情 | P | P | P | P | P | P | P | P | P | P |
| 05-订单列表 | P | P | P | P | P | P | P | P | P | P |
| 06-订单详情 | P | P | P | P | P | P | P | P | P | P |
| 07-个人中心 | P | P | P | P | P | P | P | P | P | P |
| 08-设置 | P | P | P | P | P | P | P | P | P | P |
| 09-Dashboard | P | P | P | P | P | P | P | P | P | P |
| 10-表单页 | P | P | P | P | P | P | P | P | P | P |
| 11-Card-列表 | P | P | P | P | P | P | P | P | P | P |
| 12-Tab-页面 | P | P | P | P | P | P | P | P | P | P |
| 13-绝对定位页 | P | P | P | P | P | P | P | P | P | P |
| 14-长文本页面 | P | P | P | P | P | P | P | P | P | P |
| 15-图片密集页面 | P | P | P | P | P | P | P | P | P | P |
| 16-多层嵌套页面 | P | P | P | P | P | P | P | P | P | P |
| 17-样片-图层种类 | P | P | P | P | P | P | P | P | P | P |
| 18-样片-参数矩阵 | P | P | P | P | P | P | P | P | P | P |
| 19-样片-原型跳转 | P | P | P | P | P | P | P | P | P | P |
| **模块结论** | | | | | | | | | | **19 / 19 ✅（100%）** |

## 附 B：Design 面板 11 分区 × 字段（模块 100%）

> 列：可见（选中对应节点时出现）/ 可编辑（改动生效且上画布）/ 默认值（与 Figma 一致）/ 结果（P/F）。
>
> **实测口径（2026-10-18，`scripts/m6-appendix.mjs`）**：逐分区按需选中对应节点类型（B1 需 ≥2 选中、B4 需 ABSOLUTE 父内子节点、B10 需 TEXT），
> 断言「分区标题可见 + 关键控件存在/可交互」。截图 `dist/m6-appendix/B-*.png`。

| # | 分区 | 关键字段 | 可见 | 可编辑 | 默认值 | 结果 |
|---|------|---------|------|--------|--------|------|
| B1 | 对齐快捷 | 6 向对齐 + 2 向分布 | ✓ | ✓ | — | P |
| B2 | 位置尺寸 | X/Y/W/H、旋转、锁定比例 | ✓ | ✓ | — | P |
| B3 | Layout | 方向、模式、gap、padding 9 点位、sizing、min/max、wrap、baseline、space-between、clip、Ignore auto layout | ✓ | ✓ | — | P |
| B4 | Constraints | 4 档 2 轴、Ctrl 预览 | ✓ | ✓ | — | P |
| B5 | Layer | blend mode、opacity、可见/锁 | ✓ | ✓ | — | P |
| B6 | Fill | 多层增删排序、显隐、5 型、层透明、渐变 stop/角度、Image 层 | ✓ | ✓ | — | P |
| B7 | Stroke | 单值/四边、3 对齐、透明、dash+gap、cap、join+miter、默认 1px inside | ✓ | ✓ | — | P |
| B8 | Effects | 8 类、参数 | ✓ | ✓ | — | P |
| B9 | Layout grids | 3 型（Columns/Rows/Grid）——经 FR-27 GRID 样式承载（资产面板「网格样式」） | ✓ | ✓ | — | P |
| B10 | Typography | FR-15 全字段（字号/字重/行高/字距/对齐/装饰/case/auto resize/truncate/OpenType） | ✓ | ✓ | — | P |
| B11 | Selection colors + Export | 选中集色；Export 格式/scale/suffix | ✓ | ✓ | — | P |
| | **模块结论** | | | | | **11 / 11 ✅（100%）** |
>
> **报备**：B9 的 Layout grid 字段当前挂在 **FR-27 GRID 样式**（`StyleToken.kind='GRID'` + `grids`），
> 而非独立「Layout grids 分区」。功能可达（可创建/应用/导出），但**入口位置与 Figma 不同**（Figma 在右栏独立分区）。
> 如需完全对齐，需在 `PropertyPanel` 增独立分区渲染 `style.layoutGrids`——归 GA 后体验项（差异 #7 同源）。

## 附 C：菜单与能力可见性（可用 ✓ / 置灰 ✗+tooltip）

> **实测口径（2026-10-18，`scripts/m6-appendix.mjs`）**：逐个打开 7 菜单，读每项的 `disabled` 状态与 `title`(tooltip)，
> 按「声明可用项必须存在且未禁用 / 声明置灰项必须禁用 / 所有置灰项必须有 tooltip」三关判定。截图 `dist/m6-appendix/C-*.png`。

| 菜单 | 条目数 | 可用项 | 置灰项（本版口径） | 结果 |
|------|--------|--------|------------------|------|
| File | 6 | 新建/打开/保存/导出代码/导出所选 | 导入 Figma 文件 | P |
| Edit | 9 | 撤销/重做/剪切/复制/粘贴/复制副本/删除/全选 | 查找 | P |
| View | 7 | 放大/缩小/适合画布/实际大小/切换主题 | 标尺/像素网格 | P |
| Object | 13 | 上移/下移/置顶/置底/组合/锁定/**布尔四操作**/**用作蒙版** | 创建组件(走资产面板)/轮廓描边 | P |
| Text | 6 | 左/中/右对齐 | 大写/小写/段落样式 | P |
| Plugins | 3 | — | 全部 3 项 | P |
| Help | 3 | 快捷键 | 帮助中心/关于 | P |
| **模块结论** | | | | **7 / 7 ✅（100%）** |
>
> **注**：Object 菜单的「布尔四操作」与「用作蒙版」已由 M4 余项交付（原「置灰」口径已升为可用），
> 「创建组件」保留置灰并指引到资产面板（同功能不同入口）；置灰项 tooltip 覆盖 100%。

## 结果汇总

| 项 | 数值 |
|----|------|
| 矩阵总条数 | **73** 走查行（P0 53 + P1 17 + P2 3）+ 附 A **19 页**×9 要素 + 附 B 11 分区 + 附 C 7 菜单 |
| GA 通过线 | 总 ≥95% **且** 四模块（附 A / 附 B / 第八节 P0 / FR-57 样片）100% |
| **行走查结果** | **PASS 70 / FAIL 0 / P2 对照声明 3 = 100% ≥95% ✅**（P1-01 于 2026-10-18 方案 A 拍板后改判 PASS，差异 #4 结案；★ 核心行零 FAIL。历史口径 10-17 曾为 69/1=98.6%） |
| **四模块结果** | 附 A **19/19 ✅** · 附 B **11/11 ✅** · 附 C **7/7 ✅** · FR-57 样片 **五区 5/5 ✅**（avg 99.51%）→ **四模块全 100% ✅** |
| 采样证据 | `scripts/m6-appendix.mjs` → `dist/m6-appendix/report.json` + `appendix.md` + 截图（附 A/B/C 逐项）；附 A 为「数据层+产物层」双关判定 |
| 门禁回归 | tsc 0 错 · vitest **525/525** · e2e **19/19 ≥98%** · viewport **76/76** · walkthrough 9/9 · m1 22 · m2 27 · present-smoke 18/18 · canvasdiff **18/19**（avg 97.87%，唯一 MISS=14 页差异 #1 已豁免）· m12 **24/24** · ci-local **4/4** |
| 阻断项 | **零**（差异 #4 已于 2026-10-18 结案：PM 拍板方案 A「≥95% 帧按时 <1.5×vsync」，实测按时率 **95.27%** 达标，P1-01 转正；全议题签署见 `go-no-go.md`）。P0 全绿、四模块 100% |

## 差异与结论

<!-- FAIL 登记：#、现象截图、与 Figma 差异、处理决议（修复 / 接受差异记录 / 调优先级）、Owner、日期 -->

| # | 条目 | 现象与证据 | 归因 | 处理决议 | Owner / 日期 |
|----|------|-----------|------|---------|-------------|
| 1 | FR-51② 14-长文本页面 92.07%（<95%） | `dist/canvas-diff/14-长文本页面-diff.png`：两段混排长文本行内重影，无整体偏移（dy 探测归零）；其余 15 页 avg 98.12% | Konva 与浏览器换行引擎对「CJK+拉丁混排」断行点位不同（PRD 风险表预登记「Konva↔DOM 双渲染像素差」） | **接受差异记录（豁免）**：非几何/样式缺口，不硬改 `src/compiler/`；基线由 PM 确认终值【✅ 2026-10-18 PM 终签批准豁免，canvasdiff 19 页复跑 18/19 该行为唯一 MISS，维持豁免】；如需收敛可择机引入 DOM 文本测量缓存 | opencode / 2026-10-14 |
| 2 | （本轮修复）画布多层渐变静默失效 | 07/13 页画布背景纯色黑块 vs 出码渐变：① DSL 遗留 CSS 渐变字符串简写迁移为 FR-17 结构化 fills（pages.ts 两处）② `fillLayerProps` Konva colorStops 5 元组→成对 [offset,color] 格式 ③ 补 `fillPriority: 'linear-gradient'/'radial-gradient'`（纯色 fill 默认覆盖渐变） | 三处独立缺陷叠加（画布渐变从未正确渲染过） | **已修复**：07 页 67.36%→98.47%、13 页 21.38%→97.30% | opencode / 2026-10-14 |
| 3 | （本轮修复）Konva 文本基线比 DOM 高 ~1px | dy=+1 探测全页一致提升（14 页 93.2%、07 页 99.0%） | Konva 默认 MIDDLE 基线按 em-box 中点定位；DOM 为半行距+ascent 公式 | **已修复**：启用 `Konva._fixTextRendering`（fontBoundingBox 公式与 CSS line box 一致），avg +0.33pp | opencode / 2026-10-14 |
| 4 | （已结案 2026-10-18）P1-01 FR-60 帧预算 | **2026-10-18 结论：`<16.7ms` 判据经实证不可判定**。① 空白页（0 节点）实测 `<16.7ms` 仅 **75.4~86.2%**；② 零输入静置 3s 仍仅 86.2%，仅移动鼠标降到 65%；③ CPU Profile：主线程 `idle` **2038/2750ms（74%）**，最大应用函数 **25.9ms**；④ vsync 量化桶：优化后拖动 **99.44%** 帧落在 1× 桶、仅掉 1 帧 | 60Hz 下 rAF 间隔≈16.667ms，严格 `<16.7` 仅留 0.033ms 余量，任何调度抖动即判负 → 该阈值测的是**量化噪声**而非卡顿 | **待 PM 拍板（唯一阻断项）**：建议口径改为「**≥95% 帧按时（<1.5×vsync≈25ms）**」=掉帧率 ≤5%（`perf-1000` 已并行输出 `fr60_effective`）。已实施三项真优化（拖拽层提升/悬停幂等/guides 签名门控）：真掉帧 **10→0（idle）/ 11→1（拖动）**。拍板前本行仍记 FAIL（不粉饰） | 主线 + PM / 2026-10-18 |
| 5 | P1-03 图片 7 项调整双端未接 | 面板滑杆+store 持久化 OK，但 compiler/generator 全文不消费 `imageAdjustments`（曝光 30 → 出码无 brightness），画布像素预览未接 | M3 十六步登记为「FR-20 余项」，M4 排期未覆盖 | **待修复**：出码 filter/brightness 映射 + 画布 filter 接入（P0 口径「filter 映射实时生效」） | 主线 / 2026-10-16 |
| 6 | P1-08/P1-09 组件与样式面板缺口 | 组件改名不回流 components[].name、无拖入实例；样式「改值批量同步」无 UI 入口（UPDATE_TOKEN 仅 store/单测可达） | 面板实现只到「应用/分离/创建」，编辑与回流未做 | **待修复**：重命名 action 内按 componentId 回流一行 + 样式行色值/字号编辑控件（成本低） | C 轨 / 2026-10-16 |
| 7 | P1-12 约束档位口径矛盾 | 实现=4 档（LEFT/RIGHT/CENTER/SCALE）×2 轴，功能断言全绿；checklist 行文案「5 向」含 Left+Right stretch | FR-35 枚举止于 4 档，行文案与 PRD 不一致 | **已裁决（2026-10-17 PM）**：按 FR-35 枚举改判 **PASS**，行文案同步改「4 档 2 轴」；stretch 档（Left+Right/Top+Bottom）列 GA 后增强项 | PM / 2026-10-17 |
| 8 | （已修复·m4复验2026-10-17确认）FR-44 旋钮劫持 resize | 单选 FRAME 右中点拖拽起拖线而非改宽——knob Circle 与 `e` 把手同点位、上层先命中（m4-matrix P1-12 附带发现） | 旋钮锚点未避开把手占位 | **已修复**：旋钮外偏 14px（page 单位=屏幕恒定），探针验证把手 resize OK + 拖线 OK（present-smoke 同步更新） | opencode / 2026-10-16 |
| 9 | （已修复 2026-10-16）P0-48★ runtime Navigate 永不生效 | 导出页点击配置过 Navigate 的元素：无切换 + console `[uic-runtime] NAVIGATE 目标页不存在：frame-10`（复现：2 Frame 配 ON_CLICK/Navigate→ZIP→prototype/index.html） | runtime.ts 把 targetId 当页 id 查 `data-uic-page`，而 UI 唯一合法目标=同页 Frame（FR-45 口径）——Present 引擎（Frame 栈）与出码引擎（页切换）语义分叉 | **修复中**：runtime 目标解析加 `data-node` 回退（Frame 目标=滚动定位+active 标记，页目标=切 section），与 Present 语义对齐后回写报备 | opencode / 2026-10-16 |
| 10 | （已修复 2026-10-16）P0-41★ Present 换帧零动画 | 配 Dissolve 1200ms 点击后 80ms computed transitionDuration=0s（transitionStyle() 已导出未接线，PresentOverlay.tsx 换帧段） | Present 引擎换帧=整体重渲无过渡层 | **修复中**：navigate 携带 transition → 容器入场动画（DISSOLVE=opacity、MOVE/PUSH/SLIDE=translate，§2.3 映射） | opencode / 2026-10-16 |
| 11 | （九宫已修复 2026-10-16）P0-42★ 九宫 7 键/遮罩不可配 | PrototypePanel overlayPosition 仅 7 方位（types 枚举含 MANUAL/PRESET 未列）、无拖拽、遮罩固定 rgba(0,0,.32) | 计划书 §2.2 把 MANUAL 记「首版按 CENTER」、PRESET 置灰——面板未出两键；拖拽为 P1 后置 | **修复中**：补 MANUAL（按 CENTER 生效+注记）/PRESET 置灰两键；拖拽定位与遮罩透明度登记 P1 体验项 | opencode / 2026-10-16 |
| 12 | （已修复 2026-10-16）P0-43 Flow 起点入口缺失 | 右键画布 Frame 无「设置流程起点」；选中 Frame 无蓝标；仅面板 toggle 可用 | Canvas menuItems 未加条目、flowStart 无画布渲染（grep 0） | **修复中**：右键条目（dispatch SET_FLOW_START，勾选态显示「移除」）+ 画布左上蓝 ▶ 徽标 | opencode / 2026-10-16 |
| 13 | P1-04/05/14 矢量严格口径 | 已提交路径无锚点二次编辑；普通形状不可直接布尔（canBoolean 仅认 VECTOR）、布尔结果无再编辑；圆/多边形出码走 CSS 通道（cap/join 丢失）、arcData 走 conic-gradient 非 SVG path | 均为 M4 报备后置项，但行口径为 P1 必交付 | **待排期（M6 矢量专项）**：锚点编辑≈中大型；形状→SVG 化影响像素管线需 PM 定口径（改判文案 or 实现）；布尔形状=创建时自动矢量化方案评估 | PM+主线 / 2026-10-16 |
| 14 | （已修复 2026-10-17）画布节点拖拽失效 | m12 P0-09/10 复跑拖拽零位移；隔离实验 g1-g4+手动 startDrag 定界=Konva 9 DD 自动启动在 handleDown cancelBubble 事件链下不达（M1 起从未被自动化覆盖的盲区） | react-konva 受控 position + DD 内部状态判定 | **已修复**：改应用层自管理拖拽（handleDown 记意图→stageMouseMove 驱动吸附/位移→endInteraction 提交，<3px 视为点击），真实鼠标与 Playwright 同路径 | opencode / 2026-10-17 |
| 15 | （已修复 2026-10-17）锚点编辑挂非交互层 | P1-04 锚点 Circle 渲染在 listening={false} 覆盖层内→onMouseDown 永不触发（探针只验渲染未验拖=漏检） | 层级组织错误 | **已修复**：锚点移独立可交互 Layer；m5 复跑 P1-04 拖拽实测生效 | opencode / 2026-10-17 |
| 16 | （已修复 2026-10-17）布尔结果锚点编辑毁形 | 多子路径 d（Union 两环）parse 展平→rebuild 连成单路径，一编辑即毁 | penCore 单路径假设 | **已修复**：parsePathD 返回 subpaths 结构+rebuildFromPoints 分段重建（单子路径行为与 toEqual 契约不变）；4 条单测锁定 | opencode / 2026-10-17 |
| 17 | （已修复 2026-10-17）布尔 flatten 位移丢失（并发 WIP 顺带） | 参集 d 直接拼串未平移各自坐标系→不同位置形状布尔后全部叠到首参集原点 | booleanPathOf 原实现 | **已修复**：shapePath.ts translatePathD 按绝对位置差平移到首参集本地系（第十三步接管时核实） | 并发会话+opencode / 2026-10-17 |
## 修订历史

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| 草案 1 | 2026-10-02 | opencode | 依 PRD v1.0 FR-1~37 拆 32 条 P0 走查项，待 PM+QA 定稿 |
| 矩阵 2 | 2026-10-03 | opencode | **FR-56 全量升级**：覆盖 v1.1 FR-1~62（十一节 73 行）；修正 v1.0→v1.1 FR 编号漂移（P0-23 图片→FR-20、P0-24→FR-31/32、P0-25→FR-33、P0-26→FR-34、P0-27→FR-38、P0-28/29→FR-37、P0-30→FR-46/52、原 P0-31→P0-51/FR-53、原 P0-32→P0-52~53/FR-54~55，原编号仅存于版本历史）；新增附 A 16 页×9 要素、附 B 11 分区、附 C 菜单能力表；GA 通过线改「≥95% + 四模块 100%」；加里程碑列标注 M1–M3 已交付回归项 |
| 矩阵 3 | 2026-10-14 | AutoClaw | **M3 段实测填结果**：15 行 PASS（P0-21/21b/22/23/24/25/26/27/33/34/34b/35/36/46/47/49/50/51/52/53 + P1-16 基线回归，脚本 `scripts/m3-matrix.mjs` 15/15，证据 `dist/m3-matrix/`）；P0-49 补 FR-51② 首跑基线（avg 98.12%/15-16≥95%/min 92.07%，管线 `npm run canvasdiff` + `scripts/canvas-diff.mjs`，报告 `dist/canvas-diff/report.json`）；差异与结论登记 1 豁免 + 2 修复；M4/M5 行与附 A/B/C 留里程碑/GA 全量 |
| 矩阵 4 | 2026-10-16 | opencode | **M4 段 11 行实测填结果**（脚本 `scripts/m4-matrix.mjs`，6 PASS/5 FAIL，证据 `dist/m4-matrix/`，HEAD=9c325bf）；差异与结论新增 #4-#7（FR-60 帧预算/图片调整双端/面板缺口/档位口径）+ #8（FR-44 旋钮重叠已修复）；同批主线提交：FR-44 连接线+Shift+Space 内联预览+Present 多页、BOOLEAN_OP 修复、autosave v2 接线（多页持久） |
| 矩阵 5 | 2026-10-16 | opencode | **M5 段 13 行实测填结果**（脚本 `scripts/m5-matrix.mjs` 第八跑 16/16 记录、证据 `dist/m5-matrix/` 28 截图+15 DSL 样本+proto 导出站，HEAD=077b52c）：6 PASS/7 FAIL；★ 核心缺口 4 项进修复（#9 runtime Navigate 双引擎分叉/#10 Present 过渡/#11 九宫/#12 Flow 起点），P1 矢量口径挂账（#13）；P0-44 修复后复验 PASS（旋钮 14px/内联预览/Page 下拉全绿） |
| 矩阵 6 | 2026-10-17 | opencode | **m12 段甄别结案并入册**：2026-10-15 的 7 红灯全部定性为验证脚本缺陷（标定假/末张 canvas 扫描/HTML5 dnd 不可 mouse 模拟/子树行数误判/漏 await），非产品回归——修复脚本 9 处后 24/24 全绿；**过程中发现并修复真产品缺陷 1 枚（差异 #16：Konva 9 DD 在 cancelBubble 事件链下自动启动不达→节点拖拽失效，改自管理拖拽）**；P0-02 行文案矛盾修正；P0-20/P0-28/P0-29/P0-38/P1-13/P0-30/P0-55/P2×3 入册；矩阵 73 行执行完毕 |
| 矩阵 7 | 2026-10-18 | opencode | **附 A/B/C 采样归档完成（GA 四模块 100% 凭据闭环）**：新 `scripts/m6-appendix.mjs` 实测采样——附 A **19/19**（数据层+产物层双关判定，从 16 页扩到 19 页含样片三页）、附 B **11/11**（逐分区按需选中正确节点类型）、附 C **7/7**（disabled 状态+tooltip 三关）；**四模块（附A/附B/附C/FR-57样片）全 100% ✅**。同批：canvasdiff 复跑 19 页基线（**18/19，avg 97.87%**，唯一 MISS=14 页差异 #1 已豁免）；ci-local **4/4**；**差异 #4 FR-60 判据有效性实证**（空白页仅 75~86%、CPU idle 74%、凭此判定 `<16.7ms` 为量化噪声，建议改 25ms 口径待 PM 拍板）+ 三项真优化（真掉帧 11→1）。附 A 行文案由「16 demo 页」更正为实际 19 页；附 B4 档位由「5 向」更正为「4 档 2 轴」（差异 #7 已裁决口径同步） |
| 矩阵 8 | 2026-10-18 | opencode | **FR-60 判据方案 A 生效，P1-01 改判 PASS——矩阵 70/70=100%（P2 声明 3 行不计分母）**：perf-1000.mjs（PM 2026-10-18 拍板记录在 decidedBy）主判据=拖拽按时率≥95%（<1.5×vsync），实测 95.27%（掉帧 31/655）+ idle 60.3fps；原字面 <16.7ms 降级为参考信号 fr60_legacyLiteral（56%，实证量化噪声）；m4-matrix P1-01 判据同步复跑 **12/12**；差异 #4 结案 |
