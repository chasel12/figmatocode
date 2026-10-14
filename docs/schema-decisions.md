# D0 Schema 定稿（2026-10-14）— M4/M5/M6 分轨建设的单一事实源

> 本文档是各轨道的**引用依据**：类型已单点写入 `src/schema/types.ts`（tsc 零错、vitest 234/234 兼容旧数据）。
> 各轨道**只消费这些类型，不得重定义/改名/改字段语义**；发现缺口回到本文件登记，由主线单点补写。

## 一、已落盘类型速查（全部可选字段，旧 JSON 缺省即旧行为）

| 域 | 类型 | 用途 | 归属轨道 |
|---|---|---|---|
| 矢量 | `VectorNode`（NodeKind 增 `VECTOR`）+ `NodeBase.vector: VectorData` | 钢笔/布尔产出；`VectorData{d,width?,height?,fillRule?}`，d 为 SVG path 本地坐标 | V 矢量线 |
| 组件 | `ComponentDef`（root: ContainerNode + variantProps）+ `NodeBase.componentId/instanceOverrides` | 主组件表挂 UIProject；实例=快照+componentId | C 组件线 |
| 样式 | `StyleToken{kind:'PAINT'\|'TEXT', style:Partial<StyleSchema>, cssVar?}` + `NodeBase.styleTokenId` | tokens 表挂 UIProject；引用=style 浅合并 | C 组件线 |
| 图片调整 | `ImageAdjustments`（7 可选字段）+ `NodeBase.imageAdjustments` | FR-20 余项；出码合成 CSS filter | C/基建线 |
| 原型 | `PrototypeInteraction`（trigger 十类/action 八类/transition/overlay 九宫）+ `NodeBase.interactions/flowStart` | 挂 Frame 节点 | P 原型线 |
| Flow | `FlowDef{id,name,startNodeId?,pageIds?}` | 挂 UIProject.flows | P 原型线 |
| 工程 | `UIProject{version:2, pages[], components:Record, tokens[], flows[]}` | File→保存 v2 / 打开兼容 v1 单页 | P 线先行，C 线消费 |

## 二、轨道文件所有权（互斥边界，违反即合并冲突）

| 轨道 | 独占写 | 禁碰 |
|---|---|---|
| V 矢量 | `src/editor/tools/pen*`（新建）、`Canvas.tsx` 工具状态机 VECTOR 段、`src/generator/vector.ts`（新建）、`src/compiler/compile.ts` VECTOR 出码段 | store.ts、PropertyPanel 组件/原型分区 |
| C 组件 | `src/editor/store.ts` 组件/tokens action 段、`src/editor/Assets.tsx`（新建）、`PropertyPanel.tsx` 组件/样式分区、`src/editor/variants.ts`（新建）、exporter | Canvas.tsx 工具状态机、types.ts |
| P 原型 | `src/editor/project.ts`（新建 v1/v2 序列化）、`src/editor/PrototypePanel.tsx`（新建）、`src/editor/present/`（新建）、store.ts 多页 action 段 | Canvas.tsx、types.ts |
| 基建 | `scripts/showcase.mjs`（新建）、`scripts/perf-1000.mjs`（新建）、矩阵附 A/B、FR-20 图片调整面板段 | src/ 全部（只读消费） |

**共享热点规则**：`types.ts`（已定稿，Wave 1 全线禁改）；`store.ts` 若必须新增 action，在任务书回报主线，由主线在两波之间单点合入。

## 三、消费示例（各轨道直接复制）

```ts
import type { VectorNode, ComponentDef, PrototypeInteraction, UIProject } from '../schema/types';

// V：钢笔提交一个路径
const pen: VectorNode = { id, name, type: 'VECTOR', layout, style, vector: { d: 'M 0 0 C 10 0 20 10 30 30', fillRule: 'nonzero' } };

// C：主组件注册
components['comp-1'] = { id: 'comp-1', name: 'Button/Primary', root: pageWrap, variantProps: { State: 'default' }, createdAt: Date.now() };

// P：点击导航交互
frame.interactions = [{ id: 'pi-1', trigger: 'ON_CLICK', action: 'NAVIGATE', targetId: 'frame-9', transition: { kind: 'DISSOLVE', duration: 300, easing: 'EASE_IN_OUT' } }];
```

## 四、口径决定（已拍板，轨道内不再讨论）

1. **矢量出码**：`vector.d` 直接进 SVG `<path>`（FR-49），CSS 侧 `clip-path: path()` 仅作回退注记；
2. **组件实例**：出码按快照展开（不做 CSS 复用链接，与 Figma Dev Mode 口径一致）；
3. **原型出码**：v2 工程才含 runtime 交互；单页 v1 出码保持静态（FR-50 无 JS 模式即此口径）；
4. **多 Page**：UIProject.pages 为唯一权威，编辑器内部 state.page 为「当前页视图」，切换即替换（含每页选中态记忆，P 线实现）；
5. **CHANGE_TO/SMART_ANIMATE/DRAG 等**：schema 留位、P0 不实现（P 线走查时报备「可选」）。
