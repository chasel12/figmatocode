# Wave1 轨道C 组件/样式 tokens — 实施笔记（部分交付）

> 状态：**上下文与设计已定稿，代码改动未落盘**（本轮触发 deadline 中止，0 行代码写入）。
> 下一步执行者按本笔记第三节清单可直接开工，无需重读全部上下文。

## 一、已核实的上下文事实（全部为「读过代码」级证据）

- `src/schema/types.ts`（定稿，禁改）：`ComponentDef{id,name,root:ContainerNode,variantProps?,createdAt?}`；`InstanceOverride{path,value}`；`StyleToken{id,name,kind:'PAINT'|'TEXT',style:Partial<StyleSchema>,cssVar?}`；`NodeBase.componentId?/instanceOverrides?/styleTokenId?`；`UIProject{version:2,pages,components:Record<string,ComponentDef>,tokens:StyleToken[],flows}`。
- `src/editor/store.ts`（现状）：`EditorState{page,projectName,selectedIds,past,future,pendingBaseline,clipboard,tool}`，`useReducer` + `pushHistory`/`transientEdit`（页面克隆入历史，HISTORY_LIMIT=100）；节点操作全部 `clonePage(state.page)` 后 `findById` 就地改。`cloneNode`（JSON 深拷贝）在 `src/schema/factory.ts`；`nextId(prefix)` 可用；`resetIdSeq` 供测试。
- `src/editor/Editor.tsx`：`leftTab==='assets'` 时渲染 `<Palette />`（src/editor/Palette.tsx，占位「组件」面板）——替换点在 `{leftTab === 'assets' && <Palette />}` 一行。
- `src/editor/ContextMenu.tsx`：通用组件，`{x,y,items,onClose}`，`MenuItem{label,shortcut,disabled,danger,divider,onClick}`，Canvas.tsx 内有使用范例（禁碰）。Canvas 禁碰 ⇒ 右键菜单落点为 **Layers.tsx 行级 onContextMenu**（见三-6 边界报备）。
- `src/editor/PropertyPanel.tsx`：分区均为 `<div className="prop-section"><div className="prop-heading">…`，行内组件 `Row/NumField/SelectField/ColorField/mini-btn` 可复用；「样式」分区建议插在「效果」分区之后（约 L1236 前）、或「内容」分区之前。多选时面板只编辑最后一个。
- `src/editor/exporter.ts`：`exportSelection(page,geometry,selectedIds,projectName)` 用 `createZip(entries)+downloadBlob`，`ZipEntry{path,content:string|Uint8Array}`。tokens.css 挂进 entries 即可。
- `src/compiler/compile.ts` 填充→CSS 口径：SOLID→`linear-gradient(c,c)`（withAlpha 处理透明度）；渐变 `linear-gradient({angle+90}deg,stops)`/`radial-gradient(circle at 50% 50%,…)`/`conic-gradient(from {angle+90}deg,…)`；DIAMOND→线性近似。tokens.ts 变量值应复用同一形状（tokens.ts 独立实现、注释对齐口径，避免 import compile.ts 造成循环依赖）。
- 测试写法：`tests/m2-store.test.ts` 为范本——`initialState(createPage(),…)` → `editorReducer(state, action)` 断言；无字面量构造 EditorState（新增字段安全）；`noUnusedLocals: true` 注意未用导入。

## 二、设计定案（含拍板理由）

1. **组件表/样式表不进 past/future**（任务书建议采纳）：`EditorState` 增 `components: Record<string, ComponentDef>`、`tokens: StyleToken[]`、`styleSeq: number`（PAINT/TEXT 变量自增序号）。page 历史独立，UNDO/REDO/LOAD_PAGE 不触碰这两表；组件增删不受 Ctrl+Z 影响，与 Assets 语义一致。
2. **实例=深拷贝快照+componentId**（schema 口径②，画布零改动）。
3. **「改主组件→实例跟随」**：快照口径下由新 action **`PUSH_TO_COMPONENT`** 承载——把选中实例子树整体回写 `components[id].root`（清 instanceOverrides），所有实例因引用同表在下次读取时呈现新内容。**此 action 超出任务书枚举，按「store.ts 组件 action 段」授权实现，回报主线报备**；UI 入口本轮放 Assets 面板行内按钮（选中实例时可用）。
4. **CREATE_TOKEN 自动派生 cssVar**：`--uic-paint-1` / `--uic-text-2`（`styleSeq` 自增），token 表内唯一；tokens.css 导出直接用。
5. **tokens.css 纯函数**：`src/compiler/tokens.ts` 导出 `tokensToCss(tokens: StyleToken[]): string`。变量值口径：PAINT：SOLID→`withAlpha` 同款 hex/rgba；多层→各层 `fillLayerCss` 同形状逗号拼接；TEXT：fontSize/fontWeight/color/lineHeight(→px)/letterSpacing/fontFamily/textAlign → `--uic-text-2-font-size` 等复合变量。空表/全缺省 → `:root{}`。附 `tokenValue(token): string` 供复用。
6. **换 id 策略**：CREATE_COMPONENT root 子树重排 `nextId()`（factory 自增）；INSERT_INSTANCE 实例子树重排 id（copySeq 不污染 COPY 语义，独立重排）；DETACH_INSTANCE 仅删 `componentId/instanceOverrides` 不动 id。

## 三、实施清单（改动点 + 验收映射）

1. `src/editor/store.ts`（组件/tokens action 段）：
   - `EditorState` 增 `components/tokens/styleSeq`；`initialState` 置 `{},{},0`；`LOAD_PAGE/NEW_PAGE` 重置 components/tokens/styleSeq（clipboard 同款保留策略）；类型层兼容面已核实安全。
   - Actions：`CREATE_COMPONENT{id?,name?}`（选中节点→root 重排入表，节点挂 componentId）；`INSERT_INSTANCE{componentId,parentId,index?}`；`DETACH_INSTANCE{id}`；`PUSH_TO_COMPONENT{id}`（报备项）；`CREATE_TOKEN{kind,name?,style}`；`UPDATE_TOKEN{id,style?}`（同步全部 `styleTokenId` 引用者，走 transientEdit）；`DELETE_TOKEN{id}`；`APPLY_TOKEN{tokenId,nodeId?}`。
   - 防御：叶子节点建组件包 FRAME root；root/不存在节点/未知 token → 返回原 state。
2. `src/editor/AssetsPanel.tsx`（新建）：组件卡网格（icon+name+count+插入按钮）+ PUSH_TO_COMPONENT 按钮（选中实例）+ PAINT/TEXT「+」按钮（取当前选中 style）+ 搜索框（name includes 过滤）。
3. `src/editor/PropertyPanel.tsx`（只增「样式」分区）：显示 `styleTokenId` 引用与「分离」按钮；两个「从选中创建样式」按钮（PAINT 提取 background/fills；TEXT 提取 fontFamily/fontSize/…）；APPLY_TOKEN 下拉。**不动其他分区。**
4. `src/editor/Editor.tsx`：仅 `{leftTab === 'assets' && <Palette />}` → `<AssetsPanel />` 一行 + import。
5. `src/editor/exporter.ts`：`exportSelection` 增第 5 参 `tokens?: StyleToken[]`；非空时 push `{path:'tokens.css', content: tokensToCss(tokens)}`；调用点 `Toolbar.tsx` 传 `state.tokens`（Toolbar 禁碰，若不许改则本轮先加可选参数不接线——**待主线裁定，倾向改 Toolbar 一行**）。
6. **边界报备**：任务②「右键菜单」落在 `src/editor/Layers.tsx` 行级 onContextMenu（Canvas 禁碰）；Layers 不在独占写清单也不在禁碰清单，改动为最小增量（引 ContextMenu + menu state + 两个 dispatch）。如主线不同意，可退化为 Assets/属性面板入口，功能等价。
7. `tests/fr25-28-components.test.ts`（新建 ≥8 条）：①CREATE_COMPONENT 入表+componentId+选中不变 ②叶子包 FRAME root ③INSERT_INSTANCE 深拷贝+新 id+树外位置 ④改主组件(PUSH_TO_COMPONENT)后插入的新实例内容跟随 ⑤DETACH_INSTANCE 还原 ⑥CREATE_TOKEN→UPDATE_TOKEN 同步两个引用节点 ⑦DELETE_TOKEN 清引用 ⑧APPLY_TOKEN 浅合并不清其余字段 ⑨tokensToCss PAINT/TEXT/空表 ⑩tokens 不进 past/future。
8. `src/styles.css` 追加 `.assets-panel` 小段（既有 token 变量 `--panel/--border/--text` 已核实）。
9. 验收命令：`npx tsc --noEmit` → `npx vitest run`（含新 8 条）→ `npm run build`；手动链路 reducer 层由③④覆盖；不跑 e2e。

## 四、未验证 / 未完成（诚实清单）

- **全部代码改动未落盘**：上述 1–8 均未写入（本轮仅完成读取与设计，0 文件修改）。
- tsc/vitest/build/手动链路均未执行——下一执行者完成后按第三节第 9 条补齐证据。
- 本笔记中的「改动点行号」（如 PropertyPanel L1236）以本轮读到的版本为准，落盘前需重新定位。
