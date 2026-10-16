# 部署说明（FR-59）

> 口径：**`npm run build` 产物静态托管可用；导出页脱离服务端可打开。**
> 本文所有结论均为**本机实测**（Windows / Node v24.12.0 / Chromium via Playwright），
> 证据报告：`dist/deploy-check/report.json`（`node scripts/deploy-check.mjs` 产出）。

## 一、构建产物构成

| 命令 | 产物目录 | 内容 | 部署形态 |
| --- | --- | --- | --- |
| `npm run build` | `dist/app/` | 可视化编辑器（Vite 打包的 SPA：`index.html` + `assets/*.js|css`） | 静态托管（任意静态服务器） |
| `npm run pages` | `dist/pages/<页>/` | 16 个测试页导出的独立 HTML（`index.html` / `reference.html` / `page.json` / `index.scss` / `geometry.json`） | 静态托管 **或** `file://` 直开 |
| `npm run pages` | `dist/taro/<页>/` | Taro 工程文件集（需自行接 Taro 构建链） | 非静态托管物（源码工程） |
| `npm run pages` | `dist/fonts/` | Inter woff2 本地托管字体（FR-48） | 需挂在站点根 `/fonts/` |
| `npm run showcase` | `dist/showcase/` | 样片对照卡 `card.png` + 像素报告 `report.json` | 证据归档（非运行物） |

> `npm run e2e` = `pages` + `shot` + `diff`；`shot`/`diff` 会向 `dist/pages/<页>/` 追加
> `reference.png` / `render.png` / `diff.png` / `diff-report.json`，属**验证证据**，不是运行依赖。

## 二、静态托管（推荐路径）

编辑器是纯前端 SPA，无服务端依赖、无后端接口，**任意静态服务器**均可：

```bash
npm run build
npx vite preview --outDir dist/app   # 或：npx serve dist/app
```

**部署要点：**

1. **站点根即 `dist/app/`**。Vite 默认 `base: '/'`，若部署在子路径（如 `/ui-compiler/`）需在
   `vite.config.ts` 设 `base: '/ui-compiler/'` 后再构建。
2. **SPA 回退**：编辑器为单页应用，服务器需把未命中路径回退到 `index.html`。
   - nginx：`try_files $uri $uri/ /index.html;`
   - Netlify/Vercel：`/* → /index.html 200`
3. **字体路径**：编辑器与导出页的 `@font-face` 均引用站点绝对路径 `/fonts/…`
   （`src/font.ts` 的 `FONT_FACE_CSS`，单源）。因此**站点根必须存在 `/fonts/`**
   ——由 `npm run pages` 生成到 `dist/fonts/`。若把 `dist/app/` 单独部署，需一并把
   `dist/fonts/` 放到站点根，否则 Inter 回退系统字体（像素基线会漂移）。

## 三、导出页脱离服务端（`file://` 实测）

PRD FR-59 后半句要求「导出页脱离服务端可打开」。实测方式：**不经任何 HTTP 服务**，
用 Playwright 以 `file://` 协议直接打开 `dist/pages/<页>/index.html`，逐页采集
导航结果、控制台错误、失败请求、字体就绪与首屏几何。

命令：

```bash
npm run pages             # 先产出 16 页
node scripts/deploy-check.mjs
```

### 实测结果（2026-10-15 本机）

| 指标 | 结果 |
| --- | --- |
| `file://` 可打开并渲染出结构 | **16/16** |
| 导航失败 | 0/16 |
| 未捕获页面异常（pageerror） | 0/16 |
| 首屏根节点几何 | 全部非零（如 `page-1` 1280×812，`body` 812px） |
| **严格自包含（资源引用零失败）** | **0/16** |
| 字体引用失败页数 | **16/16** |

**结论：**

- ✅ **「脱离服务端可打开」成立**：16/16 页在 `file://` 下正常加载，DOM 渲染完整
  （布局与样式全部是编译期内联 CSS，**零 JS 依赖**，故无脚本即完整）。
- ❌ **但资源引用不自包含**：每页 1 条字体请求失败 + 1 条控制台错误：

  ```
  console: "Failed to load resource: net::ERR_FILE_NOT_FOUND"
  requestfailed: file:///C:/fonts/inter-latin-wght-normal.woff2  (net::ERR_FILE_NOT_FOUND)
  ```

  根因是 `src/font.ts` 的 `FONT_FACE_CSS` 用了**站点绝对路径** `/fonts/…`；
  `file://` 下 `/fonts/` 会被解析为**盘符根**（`C:/fonts/`），必然 404。
  表现是可接受的降级——`font-display: swap` 让文本回退系统字体后照常渲染，
  但**像素基线会与 HTTP 下不一致**（Inter 未加载）。

### 修复建议（需改 `src/`，本轨道无写权限，交由主线）

```diff
--- a/src/font.ts
+++ b/src/font.ts
- src:url('/fonts/inter-latin-wght-normal.woff2') format('woff2');
+ src:url('./fonts/inter-latin-wght-normal.woff2') format('woff2');
```

改相对路径后，还需 `scripts/build-pages.ts` 把 `public/fonts/` 拷到
`dist/pages/<页>/fonts/`（当前只拷到 `dist/fonts/`），导出 ZIP 亦需含该目录
（详见 `dist/zip-assert/report.json` 的 `suggestDiff`）。

> 注意：该改动会让**编辑器**（跑在站点根）的字体路径也需要相应处理，
> 属跨模块改动，须由主线统一评估后再落地——**禁止单轨私改**。

## 四、导出 ZIP 的部署形态（FR-52 关联）

`CodeModal` 的「导出项目 ZIP」产出：Taro 工程 + `preview/index.html` +
`preview/reference.html` + `prototype/`（FR-50 原型工程，含 `runtime.js`）。

- **原型工程（`prototype/`）自包含**：`index.html` + `index.css` +（有交互时）`runtime.js`，
  相对引用，解压后 `file://` 直开可用——这是「脱离服务端」表现最好的一条导出路径。
- **`preview/index.html` 依赖 `/fonts/`**：同 §三，`file://` 直开将回退字体。
- **ZIP 当前不含 `assets/`**：FR-52 断言① 实测 16/16 FAIL，
  详见 `dist/zip-assert/report.json`（含 `src/` 侧建议 diff）。

## 五、验证清单

| 项 | 命令 | 期望 |
| --- | --- | --- |
| 编辑器构建 | `npm run build` | 成功，产出 `dist/app/` |
| 导出产物 | `npm run pages` | 16 页，`assert-pages` 224/224 |
| 脱离服务端 | `node scripts/deploy-check.mjs` | `file://` 可打开 16/16（字体回退见上） |
| ZIP 结构 | `npx vite-node scripts/zip-assert.mjs` | 见报告（当前 3 项断言 FAIL，待主线接入） |
| 全链路像素 | `npm run e2e` | 16/16 ≥98% |

## 六、已知限制（如实记录）

1. **`file://` 下字体不加载**（§三），影响像素基线一致性，非功能性阻断。
2. **子路径部署需改 `base`**（§二.1），当前默认站点根。
3. **`dist/taro/` 非静态可运行物**：是 Taro 源码工程，需 `npm install` + Taro 构建链。
4. **SPA 回退依赖服务器配置**：纯静态文件服务器（如 `file://` 打开 `dist/app/index.html`）会因
   `file://` 模块加载限制失败——编辑器**必须**经 HTTP 托管，仅**导出页**支持 `file://`。
