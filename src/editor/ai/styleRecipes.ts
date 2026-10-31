/**
 * 字段级配方（style recipes）
 *
 * ## 为什么需要这一层
 *
 * 提示词里原本只有两层示范：
 * - `CONTRACT_BLOCK`：告诉模型「有哪些字段」（声明）
 * - `fewshots.json`：整页结构示范（一条 2~6K 字符，模型要在一大坨里找某个字段怎么写）
 *
 * 中间缺一层：**某个字段具体长什么样**。
 * 实测证据（`docs/ai-ab-report.md`）：19 条整页 few-shot 里带 `effects` 的只有 3 条、
 * 带 `decorations` 的 0 条、带 `states` 的 0 条，结果整页产出里阴影元素 **0 个**
 * （直接写代码的对照组 57 个）。字段在契约里，模型不知道怎么写，于是就不用。
 *
 * 本文件与 skill 通道（`skills.ts`）分工明确：
 * - skill 说「**想要什么**」——「阴影要分三层，不要单层重阴影」
 * - 配方说「**怎么写**」——三层阴影的 JSON 长什么样
 * 前者是自然语言的期望，后者是同格式的示范。模型缺的是后者。
 *
 * ## 硬约束
 *
 * 每条 `json` 必须能被契约校验通过（`tests/ai-style-recipes.test.ts` 逐条锁死）。
 * 示例不合法会教坏模型——比不给示例更糟。
 */
export interface StyleRecipe {
  id: string;
  /** 触发语：模型靠这句判断「现在该不该用」 */
  when: string;
  /** 可直接照抄的节点 JSON（必须过契约校验） */
  json: string;
}

export const STYLE_RECIPES: StyleRecipe[] = [
  {
    id: 'card-shadow',
    when: '卡片、弹层、悬浮条要「浮起来」时。**简单场景直接在 className 写 shadow-sm|md|lg 一行即可**；要大卡片/模态框那种精细层次才照抄下面三层写法（单层重阴影会发脏）',
    json: `{"kind":"FRAME","name":"卡片","className":"p-4 rounded-xl bg-card","style":{"effects":[
  {"kind":"DROP_SHADOW","x":0,"y":1,"blur":2,"color":"rgba(0,0,0,0.06)"},
  {"kind":"DROP_SHADOW","x":0,"y":4,"blur":12,"color":"rgba(0,0,0,0.08)"},
  {"kind":"DROP_SHADOW","x":0,"y":16,"blur":32,"color":"rgba(0,0,0,0.10)"}]}}`,
  },
  {
    id: 'inner-shadow',
    when: '输入框、凹陷容器、按下的按钮',
    json: `{"kind":"FRAME","name":"输入框","className":"h-10 px-3 rounded-lg bg-background border border-border","style":{"effects":[
  {"kind":"INNER_SHADOW","x":0,"y":1,"blur":2,"color":"rgba(0,0,0,0.06)"}]}}`,
  },
  {
    id: 'glass-blur',
    when: '悬浮在内容之上的导航栏、浮层。注意 LAYER_BLUR 用 radius 不是 blur',
    json: `{"kind":"FRAME","name":"底部导航","className":"h-16 w-full bg-card","style":{"opacity":0.92,"effects":[
  {"kind":"LAYER_BLUR","radius":16}]}}`,
  },
  {
    id: 'gradient-border',
    when: '主按钮、选中卡、AI 高亮框的**描边**渐变。要整块填充渐变请用 gradient-fill',
    json: `{"kind":"FRAME","name":"高亮卡","className":"p-4 rounded-xl bg-card","style":{"border":{"width":1,"color":"@color.border","gradient":{"from":"@color.primary","to":"@color.accent","angle":135}}}}`,
  },
  {
    id: 'gradient-fill',
    when: '主按钮、Hero 区、强调卡片要**整块**渐变时。background 只能单色，渐变必须用 fills',
    json: `{"kind":"FRAME","name":"主按钮","className":"h-12 px-6 rounded-xl items-center justify-center","style":{"fills":[
  {"type":"GRADIENT_LINEAR","angle":135,"stops":[
    {"position":0,"color":"@color.primary"},
    {"position":1,"color":"@color.accent"}]}],
 "effects":[{"kind":"DROP_SHADOW","x":0,"y":6,"blur":16,"spread":-4,"color":"rgba(0,0,0,0.24)"}]}}`,
  },
  {
    id: 'layered-fill',
    when: '渐变要「透出」底色（如半透明渐变叠在卡片底上）。fills 数组序 = 层序，首层在上，background 是最底',
    json: `{"kind":"FRAME","name":"渐变卡片","className":"p-4 rounded-xl","style":{"background":"@color.card","fills":[
  {"type":"GRADIENT_LINEAR","angle":160,"opacity":0.9,"stops":[
    {"position":0,"color":"@color.primary","opacity":0.35},
    {"position":1,"color":"@color.primary","opacity":0}]}],
 "border":{"width":1,"color":"@color.border"}}}`,
  },
  {
    id: 'radial-glow',
    when: '需要「中心亮、四周暗」的聚焦感（头像底、成就徽章、图表背景）',
    json: `{"kind":"RECTANGLE","name":"光晕底","className":"w-full h-32 rounded-2xl","style":{"fills":[
  {"type":"GRADIENT_RADIAL","stops":[
    {"position":0,"color":"@color.primary","opacity":0.5},
    {"position":1,"color":"@color.background","opacity":0}]}]}}`,
  },
  {
    id: 'spotlight',
    when: '顶部或主视觉需要一束光。intensity 取 0.2~0.4，超过 0.5 会盖住内容',
    json: `{"kind":"FRAME","name":"头部光晕","className":"w-full h-40","style":{"decorations":[
  {"kind":"SPOTLIGHT","color":"@color.primary","intensity":0.3,"at":{"x":50,"y":0},"stop":{"from":0,"to":70}}]}}`,
  },
  {
    id: 'mesh-gradient',
    when: '大面积背景要彩色弥散。points 必填 2~4 个，没有色斑会被直接丢弃',
    json: `{"kind":"FRAME","name":"主视觉","className":"w-full h-48 rounded-xl","style":{"decorations":[
  {"kind":"MESH_GRADIENT","intensity":0.6,"points":[
    {"x":20,"y":30,"radius":60,"color":"@color.primary"},
    {"x":80,"y":20,"radius":50,"color":"@color.accent"}]}]}}`,
  },
  {
    id: 'hover-state',
    when: '按钮、可点卡片。出码成 :hover/:active 伪类，画布不预览',
    json: `{"kind":"BUTTON","text":"开始训练","className":"h-11 rounded-lg bg-primary text-background","style":{"states":{
  "hover":{"opacity":0.9},
  "active":{"opacity":0.8,"effects":[{"kind":"INNER_SHADOW","x":0,"y":1,"blur":2,"color":"rgba(0,0,0,0.2)"}]}}}}`,
  },
  {
    id: 'grid-calendar',
    when: '日历、表格、等分宫格。grid 只能写在 style.grid（写 className="grid grid-cols-7" 会被判违例）；格子一律用 repeat，不要手写 N 份',
    json: `{"kind":"FRAME","name":"日历","className":"w-full","style":{"grid":{"columns":"repeat(7, 1fr)","columnGap":4,"rowGap":4}},"children":[
  {"kind":"TEXT","text":"{{value}}","className":"text-xs text-muted-foreground text-center","repeat":{"count":7,"values":["一","二","三","四","五","六","日"]}},
  {"kind":"FRAME","name":"日期格","className":"flex flex-col items-center gap-1 py-2 rounded-lg bg-card","layout":{"widthMode":"FILL"},"repeat":{"count":35},"children":[
    {"kind":"TEXT","text":"{{index}}","className":"text-sm font-medium"},
    {"kind":"TEXT","text":"训练","className":"text-xs text-primary"}]}]}`,
  },
  {
    /**
     * 排版密度（2026-10-28 加，来自「字体/间距不如手写代码」那次追问的复核）。
     *
     * `lineHeight` / `letterSpacing` 在契约块里**有声明**、`specToPage` 里**有实现**，
     * 但 12 条配方里一条都没示范 → 实测产出里这两个字段从未被用过，
     * 于是文字排得比手写代码「紧、平、没有层次」。这是「示范有没有」的缺口，不是表达力缺口。
     *
     * 三条经验值（按 375 宽移动端）：
     * - 大标题**负字距**（-0.2~-0.5）：字号越大字距越显松，负值是排版常识；
     * - 正文行高 1.5、标题行高 1.2~1.3：行高跟字号成反比，别全用 1.5；
     * - 小字（≤12px）**正字距**（0.1~0.3）+ 次要色：让它在视觉上和正文分层。
     */
    id: 'type-rhythm',
    when: '任何带标题 + 说明文字的区块。lineHeight/letterSpacing 不写会得到「紧、平、没层次」的排版；大标题要负字距，小字要正字距',
    json: `{"kind":"FRAME","name":"标题区","className":"flex flex-col","layout":{"gap":6,"padding":[0,0,14,0]},"children":[
  {"kind":"TEXT","text":"今日训练","className":"text-2xl font-semibold","style":{"lineHeight":1.2,"letterSpacing":-0.4}},
  {"kind":"TEXT","text":"已完成 3 组 · 建议休息 90 秒","className":"text-xs text-muted-foreground","style":{"lineHeight":1.5,"letterSpacing":0.2}}]}`,
  },
  {
    /**
     * 立体物件（产品图 / 车辆 / 设备 / 吉祥物）居中展示。
     *
     * 这条配方来自 2026-10-28 的一次实测（`docs/ai-ab-report.md` 附录 D：
     * 提示词「生成一页电动车控制应用，显示电量位置，还要一个 3d 的电动车居中位置」）。
     * 三条硬知识，不写进配方模型一定会踩：
     *
     * 1. **图标可以缩放，但不适合当大图形**：2026-10-28 修掉了「恒为 24×24」的 bug
     *    （`svgOfNodeVector` 拆开 viewBox 与渲染尺寸，`strokeScale` 反算保视觉粗细），
     *    现在写 `{"kind":"VECTOR","icon":"bike","layout":{"width":152}}` 真的会出 152px。
     *    但 24 坐标系里的线性图标放大 6 倍后是**极细线条**（描边反算到视觉 2px，相对 152px 的盒子像发丝），
     *    所以「一个大图形」仍然建议用 OVAL / RECTANGLE / LINE 拼装。
     * 2. **OVAL 上的 effects 会变方框**：OVAL 走 SVG 通道（`isShapeSvgNode`），
     *    而 `box-shadow` 作用在 SVG 元素的**矩形盒**上，圆环外面会出现一个方形光斑。
     *    要发光就在它下面垫一层「圆角矩形 + LAYER_BLUR」。
     * 3. **ABSOLUTE 容器必须写 `heightMode:"FIXED"`**：缺省是 HUG，而 ABSOLUTE 子项不占流，
     *    HUG 会算出 0 高度，整个舞台塌成一条线（`height:260` 被忽略）。
     *    现在 `normalizeAbsolute` 规则 3 会自动补 FIXED 并报违例，但仍要主动写。
     */
    id: 'faux-3d-object',
    when: '要表现一个立体物件（产品图、车辆、设备、吉祥物）居中展示时。图标能缩放了但放大后线条过细，大图形要用几何形状拼装；光晕用圆角矩形垫层，不要给 OVAL 加 effects',
    json: `{"kind":"FRAME","name":"立体舞台","layout":{"mode":"VERTICAL","widthMode":"FILL","heightMode":"FIXED","height":260},"style":{"decorations":[
  {"kind":"SPOTLIGHT","intensity":0.38,"color":"@color.primary","at":{"x":50,"y":58},"stop":{"from":0,"to":74}}]},"children":[
  {"kind":"RECTANGLE","name":"地面光晕","layout":{"mode":"ABSOLUTE","x":58,"y":214,"width":260,"height":54},"style":{"borderRadius":999,"fills":[
    {"type":"GRADIENT_RADIAL","stops":[{"position":0,"color":"@color.primary","opacity":0.5},{"position":1,"color":"@color.background","opacity":0}]}],
    "effects":[{"kind":"LAYER_BLUR","radius":18}]}},
  {"kind":"RECTANGLE","name":"地面阴影","layout":{"mode":"ABSOLUTE","x":104,"y":236,"width":168,"height":20},"style":{"background":"#000000","borderRadius":999,"opacity":0.6,"effects":[{"kind":"LAYER_BLUR","radius":10}]}},
  {"kind":"RECTANGLE","name":"轮子光晕","layout":{"mode":"ABSOLUTE","x":64,"y":144,"width":80,"height":80},"style":{"background":"@color.primary","borderRadius":999,"opacity":0.2,"effects":[{"kind":"LAYER_BLUR","radius":16}]}},
  {"kind":"OVAL","name":"轮子","layout":{"mode":"ABSOLUTE","x":72,"y":152,"width":64,"height":64},"style":{"border":{"width":6,"color":"@color.primary"}}},
  {"kind":"RECTANGLE","name":"踏板","layout":{"mode":"ABSOLUTE","x":100,"y":176,"width":178,"height":16},"style":{"background":"@color.muted","borderRadius":8,"border":{"width":4,"color":"@color.primary"}}},
  {"kind":"RECTANGLE","name":"立杆","layout":{"mode":"ABSOLUTE","x":276,"y":74,"width":12,"height":110},"style":{"background":"@color.primary","borderRadius":6,"transform":{"rotate":14,"origin":"50% 100%"}}}]}`,
  },
  /**
   * 以下四条是**结构类**配方（2026-10-29 补）。
   *
   * 上面 12 条全是质感类（阴影/模糊/渐变/发光/日历/字律），一条都没教「页面骨架怎么搭」。
   * 三风格对照实测（`docs/ai-ab-report.md` 附录 H）暴露的差距恰好全在这一层：
   * 直接写码的对照组会用「单边细线 + 背景分区 + 产品外壳 + 大写眉标」搭出一页式结构，
   * AST 通道则把每个元素都做成圆角小卡片，整页读起来像一堆并排的标签。
   *
   * 这不是字段缺失（RECTANGLE / background / position:FIXED 全都在），是**没示范**。
   */
  {
    id: 'rule-line',
    when: '区块之间要有规则线（列表分组、编辑式排版、表格、时间轴）。**不要用 border 把每块围起来**——围框会让页面变成一堆独立标签；单边细线才是「一页式」观感的来源',
    json: `{"kind":"RECTANGLE","name":"分隔线","layout":{"widthMode":"FILL","height":1},"style":{"background":"@color.border"}}`,
  },
  {
    id: 'section-tint',
    when: '页面要有区块层次、但不想把每个元素做成圆角小卡片时。用**整宽背景色分区**（无圆角 + 大内边距）承载一组内容；每块都加圆角描边会让页面变成一堆方块标签',
    json: `{"kind":"FRAME","name":"区块","layout":{"mode":"VERTICAL","widthMode":"FILL","heightMode":"HUG","padding":[28,24,28,24],"gap":14},"style":{"background":"@color.muted","borderRadius":0},"children":[
  {"kind":"TEXT","text":"SECTION","className":"text-xs","style":{"textCase":"UPPER","letterSpacing":1.8,"fontWeight":600,"color":"@color.muted-foreground"}},
  {"kind":"TEXT","text":"这一区的内容放这里","className":"text-sm","style":{"lineHeight":1.7,"color":"@color.foreground"}}]}`,
  },
  {
    id: 'app-shell',
    when: '移动端页面（App 首页、小程序页、H5）需要「产品外壳」时：**底部导航栏** + 顶部状态条。两条硬约束：① `position:"FIXED"` **只用于导航栏/工具栏**，内容区块（列表、色条、卡片组）必须留在文档流里——做成 FIXED 会盖住内容、且滚动时不动，整块变成一层浮罩；② 根容器 padding 底部要留出底栏高度（如 padding:[0,0,80,0]），否则最后一块内容被永久压住。图标库只有图表类，导航图标用 vectorD 自绘',
    json: `{"kind":"FRAME","name":"底部导航","layout":{"mode":"HORIZONTAL","position":"FIXED","stickyBottom":0,"widthMode":"FILL","height":64,"justify":"SPACE_BETWEEN","align":"CENTER","padding":[0,28,0,28]},"style":{"background":"@color.card","border":{"width":1,"color":"@color.border"}},"children":[
  {"kind":"VECTOR","name":"图标-首页","vectorD":"M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z","layout":{"width":22,"height":22},"style":{"color":"@color.primary"}},
  {"kind":"VECTOR","name":"图标-账单","vectorD":"M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1z","layout":{"width":22,"height":22},"style":{"color":"@color.muted-foreground"}},
  {"kind":"VECTOR","name":"图标-我的","vectorD":"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1","layout":{"width":22,"height":22},"style":{"color":"@color.muted-foreground"}}]}`,
  },
  {
    id: 'eyebrow-label',
    when: '区块上方的小标签（英文眉标、分类名、编号）。大写 + 正字距 + 小字号 + 低对比色是专业排版的标志手法；中文没有大小写，改用两位编号 01 / 02 配 letterSpacing',
    json: `{"kind":"TEXT","text":"CAPABILITIES","className":"text-xs","style":{"textCase":"UPPER","letterSpacing":1.8,"fontWeight":600,"color":"@color.muted-foreground"}}`,
  },
];

/**
 * 阴影色例外说明。
 *
 * 硬规则第 1 条是「不要出现包外色值」，而阴影必须是半透明黑——
 * 不显式开这个口子，模型要么不敢写阴影（实测就是这样：0 个），
 * 要么把阴影写成纯 hex（`#000000`），出码后是一块死黑而不是阴影。
 */
const SHADOW_COLOR_NOTE =
  '阴影色固定写 rgba(0,0,0,α)，**不算包外色值**：亮色底 α=0.04~0.12，暗色底 α=0.30~0.60。不要用纯 hex 写阴影。';

/** 拼成提示词块（稳定前缀，随 system 常驻，不随用户提示词变化） */
export function styleRecipeBlock(packMode: 'light' | 'dark' = 'light'): string {
  const lines = STYLE_RECIPES.map(
    (r, i) => `${i + 1}. 当${r.when}\n${r.json}`,
  ).join('\n');
  const alphaHint =
    packMode === 'dark'
      ? '当前是暗色底，阴影 α 取 0.30~0.60（暗底上浅阴影看不见）'
      : '当前是亮色底，阴影 α 取 0.04~0.12';
  return [
    '## 视觉配方（字段级示范：照抄字段写法，数值按当前内容调整）',
    '这些字段在契约里都有，但只有照着写才会生效。**有阴影需求的元素必须给 effects**，不要留白。',
    lines,
    `注意：${SHADOW_COLOR_NOTE}${alphaHint}。`,
  ].join('\n\n');
}
