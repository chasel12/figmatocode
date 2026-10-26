# 桌面化（窗口式应用）方案与任务清单

> 起因：「项目运行在浏览器局限太大，能不能用窗口式应用的效果」。
> 本文只做**选型与任务拆分**，不动代码。落地时按 D0→D3 顺序推进。
> 相关：`docs/expression-gap-plan.md`（表达力）、`docs/HANDOFF.md` §16（未保存守卫 FR-60）。

---

## 0. 结论

**做 Electron，不做 Tauri。** 理由不是体积或性能，而是**「应用能不能跑自己的门禁」**。

```
scripts/ 下 43 个脚本，43 个都 import 了 node: 或依赖 vite-node
src/   下 child_process / spawn 出现 0 次
```

也就是说：**应用永远跑不了自己的验收链路**。用户现在的动作序列是
「导出 → 切到终端 → `npm run codegen:verify:react` → 回来看数字」，
这个断点在浏览器里**补不了任何一部分**。

Electron 的主进程**就是 Node**，于是可以变成：

> 点「导出并验收」→ 主进程直接跑 `codegen-verify.mjs` → 四关红绿与 99.52% 显示在右栏。

这跟产品的核心叙事（**确定性编译 + 量化验收**）是**同构**的 —— 门禁不是外挂，是产品的一部分。
Tauri 是 Rust 后端，跑 Node 要打 sidecar，绕一圈还更脆，且不解决这个断点。

**代价**：安装包 ~150MB（Tauri ~8MB）。对一个要跑 Playwright 像素关的工具，这个体积不构成问题。

---

## 1. 三层能力边界（先分清再动手）

| 层 | 内容 | 谁能解 | 成本 |
|---|---|---|---|
| **外观** | 无地址栏、独立任务栏图标、标题栏合并 | `chrome --app` / PWA standalone | 0.5~1 天 |
| **浏览器可补** | 多工程、最近文件、真磁盘读写、`Ctrl+S` | File System Access API + IndexedDB | 1~2 天 |
| **只有桌面能给** | 系统字体枚举、多窗口、原生菜单、**进程内跑 Node 门禁** | Electron / Tauri | 2~3 天 |

**当前痛点分布**（实测，不是估计）：

| 痛点 | 证据 | 层 |
|---|---|---|
| 工程只能存在 localStorage 一个 key | `Editor.tsx` 的 `ui-compiler.autosave.v2` 单键 | 浏览器可补 |
| `.fig` 只能落到 Downloads | `utils/zip.ts:94` 的 `<a download>` | 浏览器可补 |
| 容量不是问题 | 19 页 demo 序列化 **151.7 KB**，占 5MB 配额 **5.9%**（≈600 页） | — |
| 读不到系统字体 | 只认 `public/fonts/*.woff2` | 只有桌面 |
| 门禁跑不了 | 43/43 脚本依赖 Node，`src/` 零 spawn | 只有桌面 |

**关键判断**：外观层是包装，浏览器可补层是能力补齐，桌面层是**新能力**。
三层不要混着做 —— 先做「外观」会得到一个「看起来像应用、用起来还是网页」的东西。

---

## 2. 任务清单

### 批次 D0 · 决策与探针（0.5~1 天）

| ID | 任务 | 验收 |
|---|---|---|
| D0.1 | 探针：Electron 空壳加载现有 `vite preview`，量首帧时间、拖动 FPS、常驻内存；与 Chrome 直开对比 | 一张四列对比表（启动 / 拖动 FPS / 内存 / 安装包体积），数字而非感觉 |
| D0.2 | 记录选型决策到本文 §0（含「为什么不是 Tauri」的反驳链） | 一条能被质疑、也能被验证的记录 |
| D0.3 | 探针：`konva` 在 Electron（Chromium 同源）下 `filter`/`globalCompositeOperation` 是否与 Chrome 逐像素一致 | 同一页面截图像素差 = 0（同 Chromium 内核，预期为 0，但要实测确认不是 WebView2 那种跨内核差异） |

### 批次 D1 · 壳与原生文件系统（1~1.5 天）

| ID | 任务 | 验收 |
|---|---|---|
| D1.1 | `electron/main.ts` + `preload.ts`：`BrowserWindow`、单实例锁、窗口尺寸/位置记忆；`contextIsolation: true`、`nodeIntegration: false` | `npm run dev:desktop` 能起；两次启动只出一个窗口 |
| D1.2 | IPC 文件层：`dialog.showOpenDialog` / `showSaveDialog` / `fs.readFile` / `fs.writeFile`；把 `utils/zip.ts` 的 `downloadBlob` 改为可注入的 `saveBlob`（浏览器 fallback 保留） | `.fig` 能存到任意目录；同一个文件能「保存」回原路径（不再产生 `xxx (1).fig`） |
| D1.3 | 多工程 + 最近文件：`userData/recent.json`，打开时校验文件是否还在 | 能开两个工程来回切；最近列表能点开 |
| D1.4 | 原生菜单：File / Edit / View 映射到既有 `canvasBus` 与 dispatch；`Ctrl+S` 走真保存 | 菜单项与网页版一一对应，`Ctrl+S` 不再弹「保存网页」 |
| D1.5 | **FR-60 升级**：`before-quit` 挂三按钮弹窗（浏览器给不了的第三按钮，在这里补上） | 关窗口时脏 → 弹「保存/不保存/取消」，选「取消」窗口不关 |

### 批次 D2 · 门禁桥（1 天）

| ID | 任务 | 验收 |
|---|---|---|
| D2.1 | `child_process.spawn` 跑 `scripts/codegen-verify.mjs --target <t>`，stdout 流回渲染层（复用 `codegen-verify` 已有的 fd 直连写法） | 应用内能跑完 react 四关并看到 `PASS` |
| D2.2 | 右栏「验收」面板：四关红绿 + 像素百分比，数据来自 `report.json`（不重新解析 stdout） | 数字与终端跑的一致 |
| D2.3 | 失败可下钻：点某页看 `diff.png` | 点进去能看到差异图 |

### 批次 D3 · 分发与回归（0.5~1 天）

| ID | 任务 | 验收 |
|---|---|---|
| D3.1 | `electron-builder` 打包（nsis + portable），`.fig` 文件关联 | 双击 `.fig` 直接进应用 |
| D3.2 | 回归口径不变：`tsc` / vitest / fig 三关 / 三端四关**仍走 Node 侧脚本**，不因壳而改 | 四关数字与桌面化前一致 |
| D3.3 | 壳内冒烟：一条 `npm run smoke:desktop`（起壳 → 建节点 → 保存 → 退出 → 重开校验） | 进 `ci-local` |

**合计：3~4.5 天**（不含签名与自动更新）。

---

## 3. 三条必须提前定死的口径

**① 四关不能变成「壳里看着对」。**
像素关依赖 `vite preview` + Playwright 跑 `dist/` 产物。桌面化之后**不能**把「Electron 里打开没问题」当作验收 ——
那会把「跨端一致性」这个核心卖点换成「我这个壳里能跑」。D3.2 就是守这条。

**② 文件写入必须收敛到一个入口。**
现在 `downloadBlob`（`utils/zip.ts:94`）是唯一出口，`.fig` / ZIP / 图片全走它。
桌面化只需把**这一个函数**换成可注入实现（浏览器 `<a download>` / 桌面 `dialog+fs`），
不要在 Toolbar / exporter / CodeModal 里各写一套。

**③ FR-60 的「三按钮」在浏览器里不存在，桌面里才有。**
浏览器 `beforeunload` 只有「离开/取消」两键且文案不可改；
Electron `before-quit` + `event.preventDefault()` 才能真正给出「保存 / 不保存 / 取消」。
现在的实现已经把三按钮弹窗抽成 `UnsavedDialog` + `unsaved.ts` 的 `guard()` 总线，
D1.5 只是把触发源从「应用内动作」扩到「窗口关闭」，不需要重写。

---

## 4. 风险

| 风险 | 影响 | 处置 |
|---|---|---|
| 安装包 150MB + Windows SmartScreen 未签名警告 | 分发摩擦 | 先出 portable 版；要正式分发再上代码签名 |
| Electron 与 Chrome 版本差 → Konva 渲染细节不一致 | 画布观感差异 | D0.3 先量；不一致就锁 Electron 的 Chromium 版本 |
| 主进程跑门禁时 CPU 打满拖慢 UI | 体验 | 门禁放 `utilityProcess` 或低优先级 `spawn`，面板显示进度 |
| 双份代码路径（浏览器 / 桌面） | 维护成本 | 只允许 `utils/zip.ts` 与 `unsaved.ts` 两处 `if (isDesktop)`，其余共用 |

---

## 5. 不建议做的事

- **不建议先做 PWA**：能拿到「独立窗口 + 可安装」，但**一条痛点都不解决**，且会和后面的 Electron 争同一块 UI 心智。
- **不建议做 Tauri**：体积优势换不到「进程内跑 Node」，而后者是这个项目唯一的桌面化理由。
- **不建议把编译器搬进主进程**：编译链路现在是纯函数、可被 vitest 直接测；搬进主进程会让 667→798 条测试失去直接可测性，收益为零。
