# 全功能审计报告（参数级 + 用户流程 + Figma 对照缺口）

> 日期：**2026-10-18** · 基线 HEAD：`814378f` + 本次修复 · 执行：QA 验证轨
> 目的：回答三个问题——① 每个小参数是否都能改了就生效？② 与 Figma 哪里不一致？③ 从用户流程能否真做出一个页面？

---

## 一、结论速览

| 维度 | 结果 | 凭据 |
|---|---|---|
| **参数级审计（本轨）** | **51 / 51 = 100%** 通过（15 类节点 × 位置/尺寸/圆角/填充/描边/效果/排版/布局/导出/约束） | `dist/audit-params/report.json` |
| **深度参数审计（本轨）** | **146 / 152 = 96.1%** 通过（构建指纹 `index-BvAHcIvd.js @ 2026-10-19T12:00:32Z`），14 项未实现/近似（均为已声明口径），**0 页面错误** | `dist/audit-params-deep/report.json` + `run.log` |
| **四渠道参数审计（前序轨）** | **218 行**，数据/出码双通道**零反例** | `dist/param-audit/report{2,}.json` |
| **用户流程 E2E（本轨）** | **12 / 12** 通过：空白画布 → 建 375×812 画板 → 标题/副标题/主图/3 卡片/按钮 → 导出 → 独立渲染 | `dist/user-flow/` |
| **揪出并修复真缺陷** | **3 项**（矩形容纳子节点致出码丢失、文本截断开关无效、噪点颜色参数空转）+ **1 项 UX 静默空转防护**（HUG 下「垂直对」置灰） | 下文 §三 |
| 门禁 | tsc 0 · vitest **555/555** · build OK · e2e **19/19 ≥98%** · viewport **76/76** | — |

---

## 二、做了什么

### 2.1 参数级审计（`scripts/audit-params.mjs`，51 项）

对每类节点的每个可调字段做**三重验证**：控件接受输入 → 出码产物变化 → 语义正确。

覆盖：RECTANGLE（X/Y/W/H/圆角/不透明度/填充色/多层填充/描边宽度/混合模式）、TEXT（字号/字重/行高/字距/段间距/首行缩/对齐/垂直对/自动大小/形态/装饰/字形增强）、OVAL/LINE/POLYGON/STAR、FRAME（方向/定位/宽高模式/内边距/间距/对齐/分布/折行/裁剪/宽高限）、EFFECTS、EXPORT、CONSTRAINTS。

### 2.2 深度参数审计（`scripts/audit-params-deep.mjs`，152 项）

补覆盖面：5 种填充类型（含 4 种渐变）、渐变 stop/角度、渐变层可见性/透明度、描边 3 对齐 + dash/cap/join/miter、8 类效果全谱 + 参数 + 显隐/删除、文本 case/decoration/自动大小/换行/截断、形状 arcData/边数/内径/四角独立圆角/cornerSmoothing、图片 4 scaleMode + 7 调整、导出设置、约束 4 档 2 轴、Auto Layout wrap/min-max/clip。

分族通过率：FILL 16/16、STROKE 18/14、EFFECT 24/23、TYPO 34/33、SHAPE 9/9、IMAGE 12/12、EXPORT 7/7、AUTOLAYOUT 24/24、CONSTRAINT 6/6、CHANNEL 2/2。

**实现要点**（值得复用的测试工程经验）：
- `row(label, sectionHeading, nth)` 按分区去重名——「对齐」「颜色」「填充」等 label 跨区同名，只按 label 找会选错行。
- `setNum` 统一走 `.num-box`；`setRange` 用**原生 setter** 绕开 React 的 value tracker 去重（否则同值不触发）。
- `stateNode()` 读 autosave 快照**反查 store**，避免「控件显示变了但 store 没变」的误判（0.7s 防抖）。
- 报告带 `buildStamp`（bundle 指纹），**确保结论绑定的就是被测那个包**。

### 2.3 用户流程 E2E（`scripts/user-flow.mjs`，12 步）

**纯 UI 操作**（非 API 注入），模拟真实 Figma 用户从零做页面：

```
打开编辑器 → 建 375×812 主画板（流式纵向）
 → 顶部标题「周末去哪里」22px/700
 → 副标题「为你精选 12 个近郊目的地」13px
 → 主图卡片 335×180 圆角16 蓝底
 → 横向容器 + 3 张信息卡 100×64 圆角12（不同底色）
 → 主按钮 335×48 圆角24 蓝底
 → 生成代码（4477 字节 HTML）
 → File→保存 JSON（下载 .uicproj.json）
 → 导出的 index.html 用 file:// 独立打开渲染
```

**产物**：`dist/user-flow/index.html` + `04-导出页渲染.png`（视觉见下）

![导出页渲染](dist/user-flow/04-导出页渲染.png)

---

## 三、揪出并修复的真缺陷（3 项）

### 缺陷 1：矩形容纳子节点 → 出码**静默丢失**（严重）

- **现象**：选中矩形后点 Palette「添加 文本」，文本进画布可见，但出码产物里**只剩矩形**，文本消失。画布↔出码不一致。
- **根因**：`store.ts` 的 `effectiveParentId()` 只判 `isContainer()`，而 `isContainer(RECTANGLE)` 为 true；但 **5 处出码/布局路径都把 RECTANGLE 当叶子跳过递归**（`compile.ts:196` / `layout.ts:272` / `html.ts:69` / `taro.ts:36` / `prototype.ts:136`）。`findContainerAt()` 已显式排除矩形作落点，唯独 Palette 路径漏了。
- **修复**：`effectiveParentId` 排除 RECTANGLE（与 Figma 一致：矩形不可容纳子节点）。
- **守护**：`tests/rect-container.test.ts`（7 例，含「Frame 仍正确嵌套」防误伤）。

### 缺陷 2：文本「截断」开关点亮但**产物无变化**

- **现象**：打开截断开关，「最大行」显示「2」，但出码无任何 `-webkit-line-clamp`。
- **根因**：开关只写 `textTruncation:'ENDING'`，**不写 `maxLines`**；「最大行」输入框显示的是 `S.maxLines ?? 2` 的**回退值**、不回写 store。而 `compile.ts:620` 判据要求 `maxLines > 0`。
- **修复**：开启截断时一并写入 `maxLines: S.maxLines ?? 2`。
- **守护**：`tests/text-truncate.test.ts`（4 例）+ 端到端复测（点开关后出码出现 `-webkit-line-clamp: 2`）。

### 缺陷 3：噪点「颜色」参数空转

- **现象**：面板「噪点」有颜色控件、写入 store，但 SVG 滤镜完全不读 `color`，改色出码字节不变。
- **根因**：`html.ts` 的 NOISE 分支只用 `feColorMatrix saturate(0)` 出灰度。
- **修复**：有 `color` 时把灰度噪点与实色 `feFlood` + `feBlend multiply` 着色；无 `color` 保持原灰度路径（**向后兼容**，既有视觉与测试不变）。`reference.ts` 复用 `collectFxDefs`，一处修复双端生效。
- **守护**：`tests/fr19-effects.test.ts` 新增 1 例。

> 另核查一处**假 FAIL**：填充层「上移」——实测出码从 `red, green` 变为 `green, red`，功能正常，属验证方法误判。

### 附带修复：UX 静默空转防护（HUG 下「垂直对」置灰）

- **现象**：文本「垂直对」在「高模式=自动高度」时可任意改，但出码毫无变化。
- **判定**：**行为本身正确** —— `compile.ts:635` 要求 `heightMode==='FIXED' && height != null`，自动高度没有多余竖直空间，对齐语义为空（**Figma 在 auto-height 下同样禁用此控件**）。
- **真问题在 UI**：控件保持可点且无提示 → 用户改完发现没反应，与截断开关属同一类「静默空转」体验缺口。
- **修复**：`SelectField` 增加 `disabled`/`title` 支持；HUG 下置灰并给出 tooltip「垂直对齐仅在『高度模式=固定』时生效（自动高度无多余竖直空间，同 Figma 口径）」。实测：HUG 下 `disabled=true` 且有提示，切到固定高度后恢复可用。

---

## 四、Figma 对照缺口报告（**未完全对应项**）

> 口径：只列「Figma 有、本项目对应不完整」的项。**Figma 有而本项目完全没有的功能**单列 §4.4。
> 分类：**A=CSS 无法原生表达**（技术天花板，不可修）、**B=近似实现**（已声明降级）、**C=画布不预览**（出码正确）、**D=真未实现**。

### 4.1 A 类：CSS 无法原生表达（建议接受差异）

| # | 参数 | 现状 | 说明 |
|---|---|---|---|
| A1 | 描边虚线**间隔值**（dash gap） | 面板可改，产物不变 | CSS `border-style: dashed` 不接收 dash/gap 数值；SVG 通道（LINE/VECTOR）可表达 |
| A2 | 描边**端点 cap**（盒模型节点） | 面板 8 档可设，产物无 | CSS `border` 无 linecap 语义；仅 LINE 的 6 种箭头与 SVG 通道出 `stroke-linecap` |
| A3 | 描边**连接 join / miterLimit**（盒模型/LINE） | 面板可改，产物无 | 同上；POLYGON/STAR/OVAL/VECTOR 的 SVG 通道正常出 `stroke-linejoin` |
| A4 | 文本**段间距**（paragraphSpacing） | 仅影响 HUG 高度测量，CSS 零声明 | CSS 无原生段间距；Figma 的段落模型在国内 CSS 无对应 |
| A5 | **菱形渐变** GRADIENT_DIAMOND | 回落 `linear-gradient` | CSS 无菱形渐变原生；可用 `conic-gradient` 或 SVG 近似 |
| A6 | **渐进模糊** PROGRESSIVE_BLUR | 用 `(startRadius+radius)/2` 均匀 `backdrop-filter` 近似 | CSS 无分区渐变模糊 |

### 4.2 B 类：近似实现（已报备）

| # | 参数 | 近似方式 |
|---|---|---|
| B1 | 图片 scaleMode **CROP** | 与 FILL 同为 `object-fit: cover`，无裁剪矩形/焦点参数 |
| B2 | 图片调整 **色温** | `sepia(0.25)` 近似 |
| B3 | 图片调整 **色调** | `hue-rotate(10deg)` 近似 |
| B4 | 图片调整 **高光** | `contrast(1.125)` 近似 |
| B5 | 图片调整 **阴影** | `brightness(1.10)` 近似 |
| B6 | **Glass 玻璃** 7 参数 | 只有 refraction/depth/saturation/highlight 参与 `blur/saturate/brightness` 链 |
| B7 | 矢量布尔 | SVG 填充规则近似（Union=nonzero，其余=evenodd），非严格几何拓扑 |

### 4.3 C 类：画布不预览（出码正确，所见非所得）

| # | 参数 | 说明 |
|---|---|---|
| C1 | cornerSmoothing（平滑） | 设值后数据✓出码✓，**编辑画布不反映** |
| C2 | blendMode 部分模式 | 已接 `globalCompositeOperation`；少数模式画布与浏览器合成有细微差 |
| C3 | paragraphIndent（首行缩） | 数据✓出码✓，画布文本不缩进 |
| C4 | 效果：INNER_SHADOW / BACKGROUND_BLUR / PROGRESSIVE_BLUR 等 | 仅 DROP_SHADOW 在 Konva 画布实时预览（差异 #18，另有报告）【**对账勘误 2026-10-20（HEAD=115afe6 实测）**：本行系旧口径转述、非本轨实测（§五.6 已自认断言不含画布列）。四渠道轨复跑证实：LAYER_BLUR 2/3、PROGRESSIVE 5/5、NOISE 8/8（含你们噪点着色修复的增益 +1）、blendMode 全响应——模糊/噪声/纹理/玻璃覆盖/16 混合模式的画布实时预览已在 `814378f` 落地且双方合并后无退化（vitest 555/555、canvasdiff 18/19 avg 98.13% 零漂移）。仍保留「以导出为准」的仅=INNER_SHADOW/BACKGROUND_BLUR/shadow spread/cornerSmoothing/paragraphIndent，与 C1/C3 行一致】 |
| C5 | 图片调整 色温/色调/高光/阴影 | Konva 无对应滤镜，面板已提示「画布不显示近似项」 |

> C 类共同性质：**不是功能缺失，是编辑器预览保真度**。出码（用户最终交付物）正确。已登记差异 #18/#19。

### 4.4 D 类：真未实现 / 面板有控件但无产物

| # | 参数 | 现象 | 建议 |
|---|---|---|---|
| D1 | **Glass 色散** dispersion | 控件写 store，出码零变化；另 chroma/edge 两参数**面板未暴露** | **✅ 已处置 2026-10-20（`d5eb5d7`）**：置灰+tooltip（复用 §三 HUG 垂直对静默空转模式，数据保留、无产物口径明示）；chroma/edge 维持未暴露 |
| D2 | **导出页字体路径** | 导出 html 用绝对路径 `/fonts/*.woff2`；`file://` 或子目录部署时 404，回退系统字体 | **✅ 已修复 2026-10-20（`d5eb5d7` + FR-52 专单）**：fontFaceCss(base) 参数化 + ZIP 根 `assets/fonts/` 随包 4 woff2 + preview 页相对基座 `../assets/fonts`（缺省站点根口径不动，e2e/dist-pages 零变化）；同批接线 **zip-assert FR-52 三断言 76/76 全绿达成**（assets/ 19·相对引用 19·根 id 19——图片 dataURL 经 zipKit 外提 assets/img-*、根元素落 id、深度前缀改写；zipKit 纯函数 4 例锁） |

### 4.5 Figma 有、本项目**完全没有**（矩阵外，供决策）

| 功能 | 说明 |
|---|---|
| 多人协作 / 实时光标 / 评论（FR-61 P2） | 需后端基础设施，与「零后端确定性编译」定位冲突，建议 NO-GO |
| Variables（变量 mode 切换，FR-30 P2） | FR-27 四类样式 + `tokens.css` 已覆盖主要场景；mode 属高级特性 |
| 变体属性**增量合并** | 现为整体替换内容 + 清 overrides |
| Constraints **stretch 档**（Left+Right / Top+Bottom） | 现为 4 档 2 轴（PM 已裁决按 FR-35 枚举，stretch 列 GA 后增强） |
| Layout grid **独立分区入口** | 功能可达，入口在 FR-27 GRID 样式（资产面板），与 Figma 右栏分区位置不同 |
| 矢量**独立手柄调曲率** / arcData→SVG path | 现走 CSS conic-gradient 通道 |
| Overlay **拖拽定位 + 遮罩透明度** | 九宫 9 键已支持，自由拖拽未做 |
| 组件**拖入实例** | 现只能「应用/分离/创建」 |

---

## 五、诚实边界（未覆盖 / 测不到）

1. **Taro 出码通道未纳入本次参数审计**（本次只验 HTML/CSS 通道）。
2. **PDF/SVG 导出产物的像素级校验**未做（只验 UI 可配置；`npm run zip-assert` 覆盖打包结构）。
3. **性能类参数**（1000 节点帧预算）不在本次范围，见 `dist/perf-1000/`。
4. **跨浏览器**：全部实测在 Chromium；Firefox/Safari 未跑。
5. **画布视觉与出码的逐像素比对**由 `npm run canvasdiff` 负责（本轨未替代它）。
6. **断言口径是「控件读回 + 出码文本」**，不是像素级比对——产物文本一致 ≠ 渲染像素一致。
7. 深度审计 14 项「未实现」中，有数项无法判定**是否属于真缺口**（面板根本不暴露对应控件，如 `Effect.color2`/`scale`、描边 solid/dotted 无入口），已如实归为「测不到」而非 PASS。
8. 未做几何验证的项：段间距对多段文本 HUG 高度的真实影响、AutoLayout wrap 的真实换行坐标、约束在「父容器 resize」时的重算（只验了下拉→出码映射）。

### 5.1 补充观察（非缺陷，供后续排期）

| 观察 | 说明 |
|---|---|
| `约束=水平居中` 出码 `left: calc(50% + -146.5px)` | 合法但可读性差，规范写法为 `calc(50% - 146.5px)`；纯代码美观问题 |
| `cornerSmoothing` 出码 `corner-shape: squircle` | 该属性为 **Chrome 139+**，旧浏览器静默无效且无回退——建议在 README 兼容性段补一句 |
| POLYGON/STAR/整圆 OVAL 走 SVG `<path>` 而非 `clip-path` | P1-14 已报备口径，非遗漏 |
| 描边 `style=solid/dotted` 面板无入口 | 只有 dash 开关；若 Figma 对齐需要，应补下拉 |

---

## 六、复现方式

```bash
npm run build                      # 或 npm run precanvasdiff（矩阵类脚本需要 e2e hook）
npm run audit-params               # 51 项基础参数审计 → dist/audit-params/
npm run audit-params-deep          # 152 项深度审计     → dist/audit-params-deep/
npm run user-flow                  # 12 步用户流程 E2E   → dist/user-flow/
npm run zip-file-verify            # D2 定案：真 ZIP→解压→file://→字体 0 404
```

**环境提示**：构建报 `Access is denied` 时设 `TEMP/TMP` 到 `.tmp-esbuild`（见 HANDOFF §3），验完删除。

---

## 七、独立复验记录（2026-10-20，对 D1/D2 与全部门禁的第三方复测）

对主线三笔提交（`8b975e4` / `d5eb5d7` / `560c881`）**逐项独立复跑**，不采信转述：

| 声称 | 复验结果 |
|---|---|
| tsc 0 | ✅ 0 错 |
| vitest 560/560 | ✅ **560/560**（41 文件） |
| e2e 19/19 | ✅ **19/19 ≥98%** |
| viewport 76/76 | ✅ **76/76** |
| canvasdiff 98.13% 零漂移 | ✅ **avg 98.13%**（14 页 92.06%，较 92.07% 属抖动） |
| **zip-assert 19/76→76/76** | ✅ **76/76**（assets 19/19 · 相对引用 19/19 · 根 id 19/19） |
| walkthrough / m1 / m2 / present | ✅ 9/9 · 22 · 27 · 18/18 |
| m4 / m5 / m12 | ✅ 12/12 · 16/16 · 24/24 |
| 附 A/B/C | ✅ 19/19 · 11/11 · 7/7 |
| 参数审计 / 深度 / 用户流程 | ✅ 51/51 · **146/152** · 12/12 |
| 四渠道 98 全通 | ✅ 98（明细见下「口径补充」） |
| **D1 玻璃色散置灰** | ✅ 实测 `.eff-field` 中「色散」`disabled=true`，折射/深度/高光/饱和仍可编辑 |
| **D2 字体随包** | ✅ **端到端定案**：UI 导出真 ZIP → 解压 16 条目含 `assets/fonts/*.woff2` ×4 → `file://` 打开 `preview/index.html` → **请求失败 0、字体 404 0、console 错误 0**，`document.fonts` 4 面已加载 |

**新增回归脚本**：`scripts/zip-file-verify.mjs`（`npm run zip-file-verify`）——补上此前只验「ZIP 结构」不验「解压后能否脱离服务端用」的空档。

### 7.1 口径补充（对「四渠道 98 全通」的补全，非产品缺陷）

`dist/param-audit/report2.json` 原始明细为：160 行 / 156 有效 / **98 三渠道全通** / 54「数据出码通、画布不响应」/ **4 数据通未进码** / 3 SKIP / **1 ERROR**。逐条核实：

| 行 | 性质 |
|---|---|
| 段间距 ×2（before=0 → 60 / 5） | **真缺口**，即本报告 A4（CSS 无原生段间距），已知已声明 |
| 字距（before=PIXELS → after=%） | **测试伪影**：改的是「单位模式」下拉且数值仍为 0，0 值本就不出 CSS（`compile.ts:600` 有 `!== 0` 门槛）。字距功能实测正常（`letter-spacing` 支持 px/em 换算） |
| 名称（before=审计文案 → after=-995） | **测试伪影**：`name` 是元数据不参与出码，C3 判 false 属预期 |
| 填充#2 `locator.evaluate TypeError` | **脚本错误**（该轨自身缺陷），非产品问题 |

结论：**无新增产品缺陷**；「98 全通」的表述少报了 4 条未进码与 1 条脚本错误，其中 2 条为测试伪影、2 条为已声明的 A4——已在此如实补全。

### 7.2 本次复验未推翻的诚实边界

§五 所列 8 条仍然成立（Taro 通道、PDF/SVG 像素级、跨浏览器、断言口径非像素级等均未覆盖）。另：`user-flow` 里 `file://` 仍会看到 1 条字体 404——那是**模态内展示的 preview.html 文本**（站点根口径 `/fonts`），与已自包含的 ZIP 交付物是两回事，脚本注释已随之更新，不再标记为「已知缺口」。
