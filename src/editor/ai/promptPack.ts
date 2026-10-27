/**
 * M7 · 提示词包（W2）
 *
 * 结构刻意分成 **稳定前缀** 与 **易变尾部**：
 *   稳定前缀 = 角色 + 契约 + 硬规则 + 风格包令牌表 + few-shot  → 命中 prompt caching（plan §7）
 *   易变尾部 = 用户这次的提示词 + 选中上下文
 * 因此 `buildSystemPrompt` 的返回值里 `stable` 段内**不允许出现任何本次请求相关的信息**。
 *
 * 硬规则来自 plan §4-W2：8pt 网格 / 只用所选包令牌 / 层级对比度。
 */
import type { StylePack } from '../../tokens/packs/types';
import type { AiEditPlan, AiNodeSpec } from './types';
import { iconVocabPrompt } from './iconVocab';

export interface FewShotEntry {
  id: string;
  /** 触发关键词（从页面名/结构提取，用于挑选最贴近的 2 个样例） */
  tags: string[];
  /** 归一化后的 AST 骨架（字符串，直接进提示词） */
  spec: string;
}

let fewShotCache: FewShotEntry[] | null = null;

/** 19 页语料 133KB——动态加载，不进主包（与图标资产同策略） */
export async function loadFewShots(): Promise<FewShotEntry[]> {
  if (fewShotCache) return fewShotCache;
  try {
    const mod = await import('./fewshots.json');
    fewShotCache = (mod.default ?? mod) as unknown as FewShotEntry[];
    return fewShotCache;
  } catch {
    return [];
  }
}

/** 风格包 → 提示词里的令牌表（紧凑、可数） */
export function packTokenBlock(pack: StylePack): string {
  const colors = Object.entries(pack.colors)
    .map(([k, v]) => `@color.${k}=${v}`)
    .join(' ');
  return [
    `风格包：${pack.name}（${pack.mode === 'dark' ? '暗色底' : '亮色底'}）`,
    `设计语言：${pack.description}`,
    `颜色令牌（只能用这些）：${colors}`,
    `字号阶：${pack.fontSizes.join(' / ')}`,
    `间距阶：${pack.spacings.join(' / ')}`,
    `圆角阶：${pack.radii.join(' / ')}`,
    `字体：${pack.fonts.map((f) => `${f.family}(${f.weights.join(',')})`).join(' / ')}`,
  ].join('\n');
}

const CONTRACT_BLOCK = `## 输出契约（只输出一个 JSON 对象，不要 markdown 围栏、不要解释）
新页面：
{"kind":"page","name":"页面名","width":375,"height":812,"background":"@color.background",
 "root":{"kind":"FRAME","layout":{"mode":"VERTICAL","widthMode":"FILL","heightMode":"HUG","padding":[0,0,0,0],"gap":0},"children":[ ...节点 ]}}
修改计划：
{"kind":"edit","summary":"一句话说明","actions":[ ...动作 ]}

节点（AiNodeSpec）可用字段：
kind: FRAME|TEXT|BUTTON|RECTANGLE|IMAGE|OVAL|LINE|VECTOR（必填）
name?: string  text?: TEXT/BUTTON 必填  src?: IMAGE 可选  icon?: VECTOR 图标名  vectorD?: VECTOR 路径
  IMAGE：缩略图/头像/商品图一律用它（src 留空即可，会渲染成占位块）。**不要用 RECTANGLE 假装图片**
  VECTOR：功能图标/分类图标用它，icon 从下方「图标」清单里选
className?: Tailwind 类名——**描述布局优先用它**，比手写 layout 更不容易出错。支持：
  方向 flex / flex-col；对齐 items-center|start|end|stretch、justify-center|between|end
  间距 gap-4 px-4 py-2 pt-3 pl-5（1 单位 = 4px，也接受 gap-[12px]）
  尺寸 w-full h-full w-24 h-14 w-auto、flex-1
  文字 text-sm|base|lg|xl|2xl、font-medium|semibold|bold、text-center|left|right
  外观 rounded-lg|xl|full、bg-primary|card|background、border border-2 border-border、opacity-60
  裁切 overflow-hidden
  颜色只写令牌名（bg-primary）或 hex（bg-[#1677FF]）；不要写 blue-500 这类默认色板
  不支持 md:/hover: 等变体前缀、grid、gap-x/gap-y、单角圆角——出现即被判违例
layout?: {mode:VERTICAL|HORIZONTAL（默认 VERTICAL；排版只用这两个）, widthMode:FIXED|FILL|HUG, heightMode:FIXED|FILL|HUG,
          width?:number, height?:number, padding?:[上,右,下,左], gap?:number,
          align?:START|CENTER|END|STRETCH, justify?:START|CENTER|END|SPACE_BETWEEN}
叠层专用：mode:ABSOLUTE 必须给**每个子项** x/y；子项都没 x/y 时会被自动改回 VERTICAL
（layout / style 的显式字段会**覆盖** className 的同名字段，用于精确控制）
style?: {background?:颜色, color?:颜色, borderRadius?:number,
         border?:{width:number,color:颜色,style?:solid|dashed|dotted},
         fontSize?:number, fontWeight?:number, lineHeight?:number, letterSpacing?:number,
         textAlign?:left|center|right|justify, opacity?:number,
         effects?:[{kind:DROP_SHADOW|INNER_SHADOW|LAYER_BLUR, x?,y?,blur?,spread?,radius?,color?}]}
children?: 节点数组（**仅 FRAME 可有**；RECTANGLE/OVAL 是纯形状，放子项会被丢弃）

className 写法示例（**推荐照这个风格写**，比 layout 手写更可靠）：
{"kind":"FRAME","name":"顶部导航","className":"flex items-center justify-between px-4 h-14 w-full bg-card","children":[
  {"kind":"TEXT","text":"附近商家","className":"text-lg font-semibold text-foreground"},
  {"kind":"FRAME","name":"搜索框","className":"flex items-center gap-2 px-3 h-9 rounded-full bg-background","children":[
    {"kind":"VECTOR","icon":"search","className":"w-4 h-4 text-muted-foreground"}]}]}

分类入口（图标 + 圆底 + 文字。**圆底必须用 FRAME**：RECTANGLE/OVAL 不能有子项，放进去会被丢弃）：
{"kind":"FRAME","name":"分类入口","className":"flex flex-col items-center gap-2","children":[
  {"kind":"FRAME","className":"flex items-center justify-center w-12 h-12 rounded-full bg-muted","children":[
    {"kind":"VECTOR","icon":"utensils","className":"w-6 h-6 text-foreground"}]},
  {"kind":"TEXT","text":"美食","className":"text-xs text-muted-foreground"}]}

颜色写法：必须是 @color.<令牌名> 或风格包内的 hex。禁止自造色值。
禁止输出 id、交互、原型、组件、变体、动画——这些不在契约内，出现即被校验拒绝。

编辑动作（actions 数组，按顺序执行）：
{"op":"add","parentId":"现有容器id","index":0,"node":{...}}
{"op":"remove","targetId":"id"}
{"op":"move","targetId":"id","parentId":"容器id","index":1}
{"op":"setText","targetId":"id","text":"新文案"}
{"op":"updateStyle","targetId":"id","className":"bg-primary rounded-lg","style":{...可选，覆盖 class}}
{"op":"updateLayout","targetId":"id","className":"flex items-center gap-3","layout":{...可选，覆盖 class}}
改布局/改样式**同样优先用 className**（和生成时是同一套写法），只有 className 表达不了的
（lineHeight、effects、精确 width/height、ABSOLUTE 的 x/y）才写显式字段。两个字段至少给一个。
**改容器方向（横排↔竖排）时，子项的 FILL 轴要一起改**：flex-1 / h-full 是相对主轴生效的，
原来横向撑满的子项在竖排下会塌成 0 高、内容溢出，必须同时给它们 w-full。`;

const RULES_BLOCK = `## 硬规则（违反会被 schema 闸门拦下并返工）
1. 只用风格包令牌：颜色写 @color.xxx；不要出现包外色值。
2. 8pt 网格：padding/gap/width/height 用 4 的倍数（8 的倍数优先）；字号用风格包字号阶。
3. 层级对比度：页面主标题 fontSize ≥ 20 且 fontWeight ≥ 600；正文 13–16；辅助文字用 muted 令牌。
   暗色包上文字必须用 @color.foreground 系；亮色包同理。禁止同色叠同色。
4. 移动端单列：页面宽 375；内容左右 padding 16–24；横向排列只用于导航行/图标+文案/按钮组。
5. 结构自洽：FRAME 必带 layout 或 className；TEXT 必带 text；FILL 只在父容器为 VERTICAL/HORIZONTAL 时使用。
   **排版用 VERTICAL/HORIZONTAL**：页面结构一律靠嵌套 + gap + padding 表达（优先写 className），
   不要用 ABSOLUTE 摆位置（绝对定位只用于叠层，且每个子项都必须给 x/y，否则会全部叠在左上角）。
6. 图标：功能图标（搜索/返回/铃铛/分类入口/底部标签栏/评分）必须画成 VECTOR + icon，
   **不要留空圆或空方块当图标**——空占位等于没设计。
   尺寸用 w-4 / w-5 / w-6（16/20/24px）。**图标上不要写 w-full、h-12、bg-* 或 rounded-full**
   ——VECTOR 只画图标本体，被拉伸会糊。
   要圆底就套一层 FRAME（RECTANGLE/OVAL 是纯形状、**不能有 children**，
   圆底一律写成 className 为 flex items-center justify-center w-12 h-12 rounded-full bg-muted 的 FRAME），
   图标放进去，下方再放 TEXT。
7. 规模：节点 ≤ 80，嵌套 ≤ 6 层；重复卡片用同样的子结构复制，不要为每个卡片另造一套层级。
8. 表达边界（诚实边界）：不做 hover/focus 运行时态、不做滚动吸顶、不做真实交互；只画静态视觉。
9. 命名：name 用简短中文语义（"顶部导航"/"商品卡"），便于后续人工定位。`;

/** 按用户提示词挑最贴近的 few-shot（关键词命中数 + 顺序稳定） */
export function pickFewShots(entries: FewShotEntry[], userPrompt: string, limit = 2): FewShotEntry[] {
  const text = userPrompt.toLowerCase();
  const scored = entries.map((f, i) => {
    let score = 0;
    for (const tag of f.tags) if (text.includes(tag.toLowerCase())) score += 1;
    return { f, score, i };
  });
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  return scored.slice(0, limit).map((s) => s.f);
}

export interface SelectionContext {
  pageId: string;
  pageName: string;
  /** 选中节点的紧凑摘要（id/kind/name/text/关键样式） */
  targets: {
    id: string;
    kind: string;
    name: string;
    text?: string;
    parentId?: string;
    box: { x: number; y: number; width: number; height: number };
    style?: Record<string, unknown>;
  }[];
  /** 页面结构骨架（供模型定位 parentId） */
  outline: string;
}

export interface PromptBuildOptions {
  mode: 'page' | 'edit';
  pack: StylePack;
  userPrompt: string;
  viewport: { width: number; height: number };
  selection?: SelectionContext;
  /** few-shot 语料（由 loadFewShots() 注入，缺省则不带样例） */
  fewShots?: FewShotEntry[];
  fewShotLimit?: number;
}

export interface BuiltPrompt {
  /** 稳定前缀（缓存友好）：角色 + 契约 + 规则 + 令牌 + few-shot */
  system: string;
  /** 易变尾部 */
  user: string;
}

/** 页面结构骨架：缩进树，含 id（编辑模式必须给 id，模型才能写 parentId/targetId） */
export function outlineOf(root: AiNodeSpec | { id: string; type: string; name?: string; text?: string; children?: unknown[] }): string {
  const lines: string[] = [];
  const walk = (node: { id: string; type: string; name?: string; text?: string; children?: unknown[] }, depth: number): void => {
    const label = node.text ? `${node.name ?? node.type} "${node.text.slice(0, 24)}"` : (node.name ?? node.type);
    lines.push(`${'  '.repeat(depth)}- ${node.id} [${node.type}] ${label}`);
    const kids = node.children as { id: string; type: string; name?: string; text?: string; children?: unknown[] }[] | undefined;
    kids?.forEach((c) => walk(c, depth + 1));
  };
  walk(root as { id: string; type: string; name?: string; text?: string; children?: unknown[] }, 0);
  return lines.join('\n');
}

export function buildPrompt(opts: PromptBuildOptions): BuiltPrompt {
  const shots = pickFewShots(opts.fewShots ?? [], opts.userPrompt, opts.fewShotLimit ?? 2);
  const fewShotBlock = shots.length
    ? `## 参考样例（同风格、可直接借鉴层级与间距；不要照抄文案）\n${shots
        .map((s) => `### 样例 ${s.id}\n${s.spec}`)
        .join('\n\n')}`
    : '';

  const system = [
    '你是 UI Compiler 的设计草稿生成器。你产出的不是代码，而是结构化 UI AST（JSON），由确定性编译器出码。',
    '你的唯一任务是输出符合下述契约的 JSON。宁可结构简单也不要越界。',
    CONTRACT_BLOCK,
    RULES_BLOCK,
    /**
     * 图标词表必须进提示词。此前它从未出现过，模型只能猜名字；猜错=违例=返工，
     * 于是它的理性策略是**干脆不写图标**，界面上就出现一排空灰圆。
     * 清单放在稳定前缀里（缓存友好），一次约 300 token。
     */
    iconVocabPrompt(),
    '## 当前风格包',
    packTokenBlock(opts.pack),
    fewShotBlock,
  ]
    .filter(Boolean)
    .join('\n\n');

  const head =
    opts.mode === 'page'
      ? `## 任务：生成一个新页面\n视口：${opts.viewport.width}×${opts.viewport.height}\n用户需求：${opts.userPrompt}`
      : `## 任务：修改现有页面\n视口：${opts.viewport.width}×${opts.viewport.height}\n用户需求：${opts.userPrompt}`;

  const selBlock = opts.selection
    ? [
        '## 当前页面上下文',
        `页面：${opts.selection.pageName}（${opts.selection.pageId}）`,
        '结构骨架（缩进=层级，方括号内是 id，写 parentId/targetId 时必须用这些 id）：',
        opts.selection.outline,
        '选中节点：',
        JSON.stringify(opts.selection.targets, null, 1),
      ].join('\n')
    : '';

  const tail =
    opts.mode === 'page'
      ? '现在只输出一个 kind=page 的 JSON 对象。'
      : '现在只输出一个 kind=edit 的 JSON 对象；只改用户要求的部分，不要重画整页。';

  const user = [head, selBlock, tail].filter(Boolean).join('\n\n');
  return { system, user };
}

/** 自修提示词：把违例喂回去，要求只输出修正后的完整 JSON */
export function buildRepairPrompt(params: {
  previousOutput: string;
  violationsText: string;
  attempt: number;
}): string {
  return [
    `你上一次的输出未通过契约校验（第 ${params.attempt} 次自修）。`,
    '违例清单：',
    params.violationsText,
    '',
    '请输出**修正后的完整 JSON**（同一 kind），不要解释、不要 diff、不要省略未改动的部分。',
    '上一次输出（仅供定位，不要原样返回错误部分）：',
    params.previousOutput.slice(0, 6000),
  ].join('\n');
}

/** 面板展示用：编辑计划摘要 */
export function describeEditPlan(plan: AiEditPlan): string {
  const counts = plan.actions.reduce<Record<string, number>>((acc, a) => {
    acc[a.op] = (acc[a.op] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([op, n]) => `${op}×${n}`)
    .join(' · ');
}
