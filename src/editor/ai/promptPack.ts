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
import { styleRecipeBlock } from './styleRecipes';

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
**页面底色 background 按需求/风格参考决定**（有参考就写它给的具体 hex，如 "background":"#F7F4EF"）；
只在没有任何配色依据时才写 "@color.background"。写在根节点 root.style.background 里同样生效。
修改计划：
{"kind":"edit","summary":"一句话说明","actions":[ ...动作 ]}

节点（AiNodeSpec）可用字段：
kind: FRAME|TEXT|BUTTON|RECTANGLE|IMAGE|OVAL|LINE|VECTOR（必填）
name?: string  text?: TEXT/BUTTON 必填  src?: IMAGE 可选  alt?: IMAGE 替代文本  icon?: VECTOR 图标名  vectorD?: VECTOR 路径
  IMAGE：缩略图/头像/商品图一律用它（src 留空即可，会渲染成占位块）。**不要用 RECTANGLE 假装图片**
  **内容图必须写 alt**（一句说清画面是什么，如 "芒果干包装正面"）；纯装饰的图写 alt:""
  VECTOR：功能图标/分类图标用它，icon 从下方「图标」清单里选
className?: Tailwind 类名——**描述布局优先用它**，比手写 layout 更不容易出错。支持：
  方向 flex / flex-col；对齐 items-center|start|end|stretch、justify-center|between|end
  （**justify 只有 start/center/end/between 四档，没有 around/evenly**，需要均分就用 gap）
  间距 gap-4 px-4 py-2 pt-3 pl-5 m-4 mt-2 mx-4（1 单位 = 4px，也接受 gap-[12px]）
  **m*-auto 不支持**（margin 是纯数值）：水平居中用父容器 items-center，垂直居中用 justify-center
  尺寸 w-full h-full w-24 h-14 w-auto、flex-1
  文字 text-sm|base|lg|xl|2xl、font-medium|semibold|bold、text-center|left|right
  外观 rounded-lg|xl|full、bg-primary|card|background、border border-2 border-border、opacity-60
  阴影 shadow-sm|md|lg|xl|2xl、shadow-none、shadow-inner；硬边/自定义用任意值
       shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]（**卡片、浮层、按钮都要给阴影**，没有阴影整页是平的）
  字距行高 tracking-tight（大标题收紧）|tracking-wide（小字放开）、leading-tight|relaxed
  裁切 overflow-hidden
  颜色只写令牌名（bg-primary）或 hex（bg-[#1677FF]）；不要写 blue-500 这类默认色板
  不支持 md:/hover: 等变体前缀、gap-x/gap-y、单角圆角、shadow-red-500 彩色阴影——出现即被判违例。
  font-mono/font-sans 会被静默忽略（字体由风格包决定，不用写）。
  **grid 不能写进 className**（写「grid grid-cols-7」会被判违例），必须写 style.grid。
layout?: {mode:VERTICAL|HORIZONTAL（默认 VERTICAL；排版只用这两个）, widthMode:FIXED|FILL|HUG, heightMode:FIXED|FILL|HUG,
          width?:number, height?:number, padding?:[上,右,下,左], margin?:[上,右,下,左], gap?:number,
          align?:START|CENTER|END|STRETCH, justify?:START|CENTER|END|SPACE_BETWEEN,
          position?:FIXED|STICKY|ABSOLUTE, x?:number, y?:number, stickyBottom?:number, stickyTop?:number}
固定底栏/顶栏用 position:"FIXED" + stickyBottom:0（或 stickyTop:0），**mode 仍写 HORIZONTAL/VERTICAL**
—— 这样内部还能正常 flex 排布。不要用 ABSOLUTE 做底栏：ABSOLUTE 下不输出 flex 排布，子项会叠在一起。
**用 FIXED 底栏时，根容器的 padding 底部要留出底栏高度**（如 padding:[0,0,64,0]），
否则页面最后一块内容会被底栏永久压住——滚动也救不了，因为底栏是固定的。
**挂角元素**（数字角标、关闭按钮、浮层）用 position:"ABSOLUTE" + x/y，mode 保持 VERTICAL/HORIZONTAL：
  {"name":"角标","layout":{"mode":"VERTICAL","position":"ABSOLUTE","x":28,"y":-4,
   "width":18,"height":18,"widthMode":"FIXED","heightMode":"FIXED","align":"CENTER","justify":"CENTER"}}
只脱流、不占父容器排版，内部照常居中；x/y 相对父内容区，可为负。
用 mode:"ABSOLUTE" 挂角会把内部也变绝对（数字落到左上角），**不要**这么写。
叠层专用：mode:ABSOLUTE 必须给**每个子项** x/y；子项都没 x/y 时会被自动改回 VERTICAL
（HUG 与 width+height 同时写时按 FIXED 算——固定尺寸的盒子直接写 FIXED，别配 HUG）
（layout / style 的显式字段会**覆盖** className 的同名字段，用于精确控制）
style?: {background?:颜色（单色底）, color?:颜色, borderRadius?:number,
         fills?:[{type:SOLID|GRADIENT_LINEAR|GRADIENT_RADIAL|GRADIENT_ANGULAR,
                  color?（SOLID 用）, opacity?:0-1, visible?:bool, angle?:number（渐变角 deg，90=自上而下）,
                  stops?:[{position:0-1, color:颜色, opacity?:0-1}]}]
                ——**渐变/多层填充**：数组序=层序（首层在上）；渐变至少 2 个 stops。
                渐变按钮、渐变卡片底、头图、进度环**用它**；background 是它下面的底色，可同时给。
                只要一个纯色就写 background，别用 fills 包一层。
         border?:{width:number,color:颜色,style?:solid|dashed|dotted,
                 gradient?:{from:颜色,to:颜色,angle?:number}},
         fontSize?:number, fontWeight?:number, lineHeight?:number, letterSpacing?:number,
         fontFamily?:受控字体 —— sans|serif|kai|round|mono（也认 黑体/宋体/楷体/圆体/等宽），
                或上面列出的风格包字体名。**不接受任意字体名**：没装的字体会静默退化成默认字体。
                中文排版里宋体/楷体与黑体的差别比配色更明显，需要「书法感/印刷感」时用它。
         textCase?:UPPER|LOWER|TITLE|SMALL_CAPS（中文无效果，只用于西文眉标/编号）,
         textDecoration?:UNDERLINE|STRIKETHROUGH（下划线强调、删除价）,
         textAlign?:left|center|right|justify, opacity?:number,
         effects?:[{kind:DROP_SHADOW|INNER_SHADOW|LAYER_BLUR|BACKGROUND_BLUR,
                    x?,y?,blur?,spread?,radius?,color?}],
                ——三种模糊别混用：**LAYER_BLUR = filter:blur()，糊元素自己**，只用于光晕/发光垫层；
                **BACKGROUND_BLUR = backdrop-filter:blur()，毛玻璃**，用于压在背景上的浮层/底栏。
                色条、图标、文字上绝不能加 LAYER_BLUR（加了就看不见）。
         decorations?:[{kind:SPOTLIGHT|VIGNETTE|MESH_GRADIENT|DIAGONAL_CUT|DUOTONE,
                        intensity?:0-1, color?:颜色, points?:[{x,y,radius,color}],
                        at?:{x,y}, stop?:{from,to}, cut?:number}],
         states?:{hover?|active?|focus?|disabled?:{background?,fills?,color?,borderRadius?,
                  border?,opacity?,effects?}},
         transform?:{rotate?,scaleX?,scaleY?,translateX?,translateY?,origin?},
         grid?:{columns?,rows?,columnGap?,rowGap?,autoFlow?}}
children?: 节点数组（**仅 FRAME 可有**；RECTANGLE/OVAL 是纯形状，放子项会被丢弃）
repeat?: {count:1~60,
         values?:string[] | {键名:string[]},
         styles?:[{background?,color?,borderRadius?,opacity?,border?}]}
  —— **重复模板**：本节点复制 count 份，每份里
  {{value}}（依次取 values，长度不够循环）/ {{index}}（从 1 起）/ {{index0}}（从 0 起）被替换，
  name 自动补序号。values 写在**带 repeat 的那一层**上，子节点直接引用即可。
  **values 两种形态**：
  ① 位置式 string[] → 只喂 {{value}}，一张卡里**只有一个格子**能变；
  ② 命名式 {键名:string[]} → 喂 {{键名}}，一张卡里**几个格子各自变**。
  商品卡/订单行这类「名称 + 价格 + 数量都要逐项不同」的，**必须用命名式**：
  例：{"kind":"FRAME","name":"商品卡","repeat":{"count":6,
        "values":{"name":["海盐焦糖爆米花 120g","冻干草莓脆 60g","炭烧腰果 168g",
                          "芒果干 100g","黄油曲奇 200g","柠檬茶冻 150g"],
                  "price":["¥19.9","¥26.8","¥29.9","¥22.5","¥18.8","¥15.9"],
                  "desc":["焦糖裹身，咸甜交错","整颗冻干，酸甜脆","低温慢烤","厚切果肉","丹麦风味","清爽解腻"]}},
       "children":[{"kind":"TEXT","text":"{{name}}"},{"kind":"TEXT","text":"{{price}}"},
                   {"kind":"TEXT","text":"{{desc}}"}]}
  → 6 张卡，每张名称/价格/描述都不同（这是**内容质量**要求，不是可选优化）。
  **values 能喂任何字符串字段（text / icon），样式字段拿不到逐项值**——要「每条颜色不同」（色条、色卡、图例），
  必须用 styles 按 index 对齐给（styles[0] 配 values[0]，长度可短于 count）。
  styles 只放配色/圆角/透明度，**别放布局**（布局逐项不同请拆成独立节点）。
  日历、列表、宫格、标签栏、图例、**商品网格**一律用它，不要手写 N 份——
  省下的输出预算拿去画更多内容（多画两周日历比多写两遍格式值得）。
  例：{"kind":"TEXT","text":"{{index}}","repeat":{"count":30}} → 30 个文本，依次 1~30
  例：{"kind":"FRAME","name":"格","repeat":{"count":7,"values":["一","二","三","四","五","六","日"]},
       "children":[{"kind":"TEXT","text":"{{value}}"}]} → 7 个格，文字依次是 一~日
  **图标也要逐项给**（这一条最容易被漏掉）：
  例：{"kind":"FRAME","name":"分类入口","repeat":{"count":5,
        "values":{"label":["坚果炒货","果干蜜饯","饼干糕点","巧克力","肉干卤味"],
                  "icon":["nut","cherry","cookie","candy","beef"]}},
       "children":[{"kind":"VECTOR","icon":"{{icon}}","className":"w-6 h-6"},
                   {"kind":"TEXT","text":"{{label}}","className":"text-xs"}]}
  → 5 个入口 5 个不同图标。**漏掉 icon 这一项 = 5 个一模一样的图标**
  （模板里 icon 是固定值时，repeat 出来的每一份都长一样，这是最常见的「图标复用」缺陷）。

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
{"op":"duplicate","targetId":"id","count":2}
{"op":"group","targetIds":["id1","id2"],"name":"卡片组"}
{"op":"updateStyle","targetId":"id","className":"bg-primary rounded-lg","style":{...可选，覆盖 class}}
{"op":"updateLayout","targetId":"id","className":"flex items-center gap-3","layout":{...可选，覆盖 class}}
{"op":"updateStyle","targetIds":["id1","id2","id3"],"className":"rounded-xl"}
批量改**同一批同类节点**（三张卡片一起换底色、一排标签一起缩字号）时用 targetIds，
不要写三条 updateStyle——那会让用户按三次撤销。group 的成员必须**同一个父级**下的至少 2 个。
改布局/改样式**同样优先用 className**（和生成时是同一套写法），只有 className 表达不了的
（lineHeight、effects、精确 width/height、ABSOLUTE 的 x/y）才写显式字段。两个字段至少给一个。
**改容器方向（横排↔竖排）时，子项的 FILL 轴要一起改**：flex-1 / h-full 是相对主轴生效的，
原来横向撑满的子项在竖排下会塌成 0 高、内容溢出，必须同时给它们 w-full。`;

/**
 * 整站规划契约：**只输出页面清单，不输出节点树**。
 *
 * 单独一段而不是塞进 CONTRACT_BLOCK：两条提示词的输出形状完全不同（一个只有 6 个字段的数组，
 * 一个几千 token 的树），混在一段里模型会按「熟悉的那个」输出，等于让闸门去兜底。
 */
const SITE_CONTRACT_BLOCK = `## 输出契约（只输出一个 JSON 对象，不要 markdown 围栏、不要解释）
{"kind":"site","name":"站点名","pages":[
  {"name":"首页","brief":"这一页放什么，一句话","entry":true},
  {"name":"训练","brief":"..."},
  {"name":"我的","brief":"..."}]}

规则：
1. 页面 **2~6 页**。少于 2 页不算整站，多于 6 页每页都会画残（输出预算被摊薄）。
2. **name 是导航文案，也是页面之间唯一的连接依据**：别的页面里出现同名文字，就会被自动连到这一页。
   所以 name 要短（2~4 字最好，最多 8 字）、要口语化（用户会去点的词：首页 / 训练 / 我的 / 订单 / 详情）、
   **不能重复**。
3. entry 只标一个页面（其余留空或省略），缺省视为第一页。
4. brief 写这一页的具体内容（放哪些区块、几个卡片、什么数据），不要写「好看的页面」这种空话——
   它会被当作单页生成的需求原文。
5. 不要输出任何节点、样式、颜色、布局字段。这一轮只做规划。`;

const RULES_BLOCK = `## 硬规则（违反会被 schema 闸门拦下并返工）
1. 只用风格包令牌：颜色写 @color.xxx；不要出现包外色值。
   **唯一例外**：阴影/模糊的 color 写 rgba(0,0,0,α)——那是阴影不是填充色，用纯 hex 会变成死黑块。
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
  mode: 'page' | 'site' | 'edit';
  pack: StylePack;
  userPrompt: string;
  viewport: { width: number; height: number };
  selection?: SelectionContext;
  /**
   * 整站生成时，**每一页都必须出现**的导航文案（= 全部页面名）。
   *
   * 为什么是提示词而不是转换层：导航栏「有没有这一项」是内容，不是合法性。
   * 转换层能做的是「有同名文案就连上去」（见 `site.ts`），做不了「替模型补一个导航栏」——
   * 补出来的位置、样式、层级全是猜的，比缺更糟。所以这里只说「说什么」。
   */
  navItems?: string[];
  /** few-shot 语料（由 loadFewShots() 注入，缺省则不带样例） */
  fewShots?: FewShotEntry[];
  fewShotLimit?: number;
  /**
   * 用户上传的「设计参考」正文（已由 `composeDesignRef` 合成）。
   *
   * **只能进 `user` 段，不能进 `system`**：它按项目变、随时会改，
   * 进了稳定前缀就等于每次请求都让 prompt cache 失效。
   * 空串/缺省 = 完全不带这段，提示词与没有该功能时逐字节一致（可被单测锁住）。
   */
  designRef?: string;
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

/**
 * 设计参考段（用户上传的 skill 正文）。
 *
 * 硬隔离句不是客套话：前端 skill 的正文里**天然带代码**（HTML/CSS/JSX 示例、
 * 甚至完整的组件片段）。不明确说「这不是输出格式」，模型很容易把参考里的
 * 代码当成输出样式，于是开始吐 HTML —— 契约闸门会全部判违例，自修两轮也救不回来。
 *
 * **配色这条改过一次，别再改回去（2026-10-29）。** 原来写的是
 * 「参考里出现的新色值一律不采纳」，理由是「skill 自带 hex 色板会冲掉令牌体系」。
 * 这个顾虑只对**一半**：真正的危险是参考去改写令牌表的含义，而不是参考给出具体色值。
 * 而「配色」恰恰是风格类 skill 的主要内容 —— 否决色值等于让这个通道对
 * 风格 skill 完全失效。三组 A/B 实测：珊瑚红 #FF4F40 在 A 产物里 0 命中、
 * B 产物里精确命中，24 条色条全被填成同一个包令牌色。
 * 现在放行显式 hex（`bg-[#hex]` / `color:"#hex"`，`colorOf` 本来就支持），
 * 只禁止改写令牌语义。
 */
export function designRefBlock(text: string): string {
  const body = text.trim();
  if (!body) return '';
  return [
    '## 设计参考（用户上传的风格 / 技法说明）',
    '下面这段内容只用来决定「长什么样」：配色倾向、阴影与层次、圆角与描边、留白节奏、字号对比、装饰手法。',
    '**它不是输出格式示例**。其中的 HTML / CSS / JSX / 代码片段 / JSON 都不是你要输出的东西；',
    '你的输出仍然只能是上文契约规定的那个 JSON 节点树，一个字节的代码都不要写。',
    '**配色是参考的职责范围，要照做**：参考里给的具体色值请写成显式 hex（`bg-[#FF4F40]`、`color:"#FF4F40"`），',
    '字号对比、圆角档位、描边粗细同理。但**不要改写上文令牌表的含义**（`@color.primary` 仍然指风格包的那个色）。',
    '参考与契约在**结构、字段名、输出格式**上冲突时以契约为准；配色与视觉参数不在此列。',
    '<<<参考开始',
    body,
    '参考结束>>>',
  ].join('\n');
}

export function buildPrompt(opts: PromptBuildOptions): BuiltPrompt {
  const shots = pickFewShots(opts.fewShots ?? [], opts.userPrompt, opts.fewShotLimit ?? 2);
  const fewShotBlock = shots.length
    ? `## 参考样例（同风格、可直接借鉴层级与间距；不要照抄文案）\n${shots
        .map((s) => `### 样例 ${s.id}\n${s.spec}`)
        .join('\n\n')}`
    : '';

  /**
   * 整站规划**不能带节点级规则**：那一轮只输出页面清单，
   * 把 `RULES_BLOCK`（8pt 网格、层级对比度、图标词表）塞进去，
   * 模型会以为这一轮也要画页面，于是开始输出节点树 —— 直接被 schema 拒。
   * 同理 few-shot 也不带（样例是页面树，与「只列页名」形状冲突）。
   */
  const isSite = opts.mode === 'site';

  const system = isSite
    ? [
        '你是 UI Compiler 的整站规划器。你这一轮**只规划页面**，不画任何界面。',
        '你的唯一任务是输出符合下述契约的 JSON。页面数宁少勿多，brief 宁具体勿空泛。',
        SITE_CONTRACT_BLOCK,
        '## 当前风格包（仅用于命名语气参考，这一轮不要输出样式）',
        packTokenBlock(opts.pack),
      ].join('\n\n')
    : [
    '你是 UI Compiler 的设计草稿生成器。你产出的不是代码，而是结构化 UI AST（JSON），由确定性编译器出码。',
    '你的唯一任务是输出符合下述契约的 JSON。宁可结构简单也不要越界。',
    CONTRACT_BLOCK,
    RULES_BLOCK,
    /**
     * 字段级配方必须进提示词。此前契约块只列到 `effects`，
     * `decorations`/`states`/`transform`/`grid` 四个字段在 schema 里存在、转换器和编译器
     * 也都实现了，但**提示词里一个字都没有**——模型不知道能写，就永远不会写。
     * 实测结果：整页产出阴影元素 0 个（直接写代码的对照组 57 个），
     * `decorations`/`states` 覆盖 0/19。这是典型的假绿：门禁全过，字段从没被用过。
     */
    styleRecipeBlock(opts.pack.mode === 'dark' ? 'dark' : 'light'),
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
      : opts.mode === 'site'
        ? `## 任务：规划一个整站\n视口：${opts.viewport.width}×${opts.viewport.height}\n用户需求：${opts.userPrompt}`
        : `## 任务：修改现有页面\n视口：${opts.viewport.width}×${opts.viewport.height}\n用户需求：${opts.userPrompt}`;

  /**
   * 整站生成时的固定导航项。**必须逐字出现在页面里**——转换层按「文案 == 页面名」连跳转，
   * 差一个字就连不上（`wireNavigation` 只做精确匹配，不做模糊猜测：猜错比连不上更糟，
   * 用户点「训练」跳到「我的」会直接判定产品坏了）。
   */
  const navBlock =
    opts.navItems && opts.navItems.length
      ? [
          '## 本站导航（整站生成）',
          `全部页面：${opts.navItems.join(' / ')}`,
          `本页是「${opts.userPrompt.split('：')[0]}」。底部（或顶部）导航栏必须包含上面**全部** ${opts.navItems.length} 个文案，逐字一致、顺序一致，当前页那一项用主色高亮。`,
          '不要改写导航文案（不要写「训练计划」代替「训练」），否则页面之间连不上。',
        ].join('\n')
      : '';

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
      : opts.mode === 'site'
        ? '现在只输出一个 kind=site 的 JSON 对象（只有页面清单，没有节点树）。'
        : '现在只输出一个 kind=edit 的 JSON 对象；只改用户要求的部分，不要重画整页。';

  /** 参考段放易变尾部（`system` 保持逐字节稳定，缓存前缀不受影响） */
  const refBlock = designRefBlock(opts.designRef ?? '');

  const user = [head, refBlock, navBlock, selBlock, tail].filter(Boolean).join('\n\n');
  return { system, user };
}

/** 自修提示词：把违例喂回去，要求只输出修正后的完整 JSON */
export function buildRepairPrompt(params: {
  previousOutput: string;
  violationsText: string;
  attempt: number;
}): string {
  /**
   * `previousOutput` 为空 = 上一版**被截断**（调用方故意不传，见 `truncatedViolation`）。
   * 这时候不能贴「上一次输出」——半截 JSON 会把模型引到断口上继续写，越修越烂。
   */
  if (!params.previousOutput.trim()) {
    return [
      `你上一次的输出被截断，没有写完（第 ${params.attempt} 次自修）。`,
      '违例清单：',
      params.violationsText,
      '',
      '请**更精简地**重新输出完整 JSON（同一 kind）：少画一些次要元素、合并重复结构，',
      '保证 JSON 完整闭合。不要解释、不要 diff、不要从断点续写。',
    ].join('\n');
  }
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
