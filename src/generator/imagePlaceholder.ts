/**
 * 无 `src` 图片的占位样式（唯一权威定义）
 *
 * 为什么单独抽出来：这条规则原来在 4 个出码器里**各抄了一份**
 * （html / react / reference / vue，全是 `background: #e0e0e0`）。
 * 四份拷贝的问题是漂移——改一处、其余三处照旧，而 reference 是像素比的基准图，
 * 它一旦和 render 不一致，`npm run diff` 就会掉分且极难反查「是谁改的」。
 * 现在只有一个常量，所有出口都拼它。
 *
 * 视觉上刻意不用纯色块：纯灰读起来像「图挂了」，而设计评审时这块占位应该读成
 * 「这里要放图」。所以给一点斜向高光 + 居中的图片图标——**纯 CSS**，不引外部资源、
 * 不加 DOM 子节点（加子节点会改变盒子树，四个出口都得跟着改，还影响像素基线）。
 *
 * 图标是 data URI 内联 SVG：`#` 必须写成 `%23`，否则会被当成 URL 片段截断。
 *
 * ## P3-4：按图层名给出确定性色调
 *
 * 原来所有空图都是**同一个灰色块**，于是 AI 生成的页面（头像位、封面位、商品图位各三四个）
 * 在评审时完全分不出哪块是头像、哪块是封面——「这里要放图」的信息是有了，
 * 「这里要放什么图」没有。P3-4 让占位色**由图层名确定性推导**：
 *
 *  - 色调 = `name` 的 FNV-1a 哈希 → 色相（0~359）。同名必同色，改名才变色；
 *  - 形态 = `name` 里的语义词 → 4 档（头像 / 封面 / 品牌 / 普通图），决定渐变角度与饱和度。
 *
 * 三条硬约束，都是「不做会出事」而不是「做了更好看」：
 *  1. **确定性**：只吃 `name`，不吃 `id`（id 每次生成都变，同一份设计两次出码会得到两种颜色）；
 *  2. **零网络**：只用 CSS 渐变，不引占位图服务（离线/内网/出码产物要能直接跑）；
 *  3. **不碰盒子**：只改 `background-*`，不新增 DOM、不改尺寸（像素基线不动）。
 *
 * 无 `name` 的图落到固定中性色（色相 220），而不是随机——「没有名字」本身是确定的事实。
 */

export const IMAGE_PLACEHOLDER_CLASS = 'ui-image-placeholder';

/**
 * 占位形态（由图层名的语义词决定）。
 *
 * 只分 4 档而不是更多：档位越多，模型/用户越难预期「这个名字会长什么样」，
 * 而占位块的作用是**让人一眼认出这里要放什么类别的图**，不是当插画。
 */
export type PlaceholderTone = 'photo' | 'hero' | 'avatar' | 'logo';

/** 语义词表：命中即归到对应形态（顺序即优先级，先命中的赢） */
const TONE_WORDS: { tone: PlaceholderTone; words: string[] }[] = [
  { tone: 'avatar', words: ['头像', 'avatar', '用户头像', '人物', 'profile', 'member', '头像位'] },
  { tone: 'hero', words: ['封面', '头图', '背景图', 'banner', 'cover', 'hero', '主图', '海报'] },
  { tone: 'logo', words: ['logo', '图标', 'icon', '品牌', '商标', 'badge'] },
  { tone: 'photo', words: ['图', 'photo', 'image', '图片', '商品', 'product', '缩略图', 'thumb'] },
];

/** 由图层名判形态；判不出来按普通图（`photo`）处理 */
export function placeholderTone(name?: string): PlaceholderTone {
  const n = (name ?? '').trim().toLowerCase();
  if (!n) return 'photo';
  for (const g of TONE_WORDS) {
    if (g.words.some((w) => n.includes(w.toLowerCase()))) return g.tone;
  }
  return 'photo';
}

/**
 * 图层名 → 色相（0~359）。FNV-1a 32 位，纯函数、跨平台一致。
 *
 * 为什么不用 `name.length` 或首字符码点：中文名长度撞得厉害（「头像」「封面」都是 2 字），
 * 首字符码点又会让所有「图」开头的名字同色。FNV 分布均匀且实现只有三行，没有理由不用。
 */
export function placeholderHue(name?: string): number {
  const n = (name ?? '').trim();
  if (!n) return 220; // 无名 → 中性蓝灰（不是随机：没有名字是确定的事实）
  let h = 0x811c9dc5;
  for (let i = 0; i < n.length; i += 1) {
    h ^= n.charCodeAt(i);
    // FNV 质数 16777619，用移位加法避免 32 位溢出精度问题
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h % 360;
}

/** 每个形态的渐变配方：角度 + 两端 HSL 的 (饱和度, 亮度) 与色相偏移 */
const TONE_RECIPE: Record<PlaceholderTone, { kind: 'linear' | 'radial'; angle: number; s1: number; l1: number; s2: number; l2: number; shift: number }> = {
  // 普通图：斜向双色，最通用
  photo: { kind: 'linear', angle: 135, s1: 44, l1: 89, s2: 40, l2: 77, shift: 26 },
  // 封面/头图：更饱和、更暗的收尾，读起来像「大图」
  hero: { kind: 'linear', angle: 152, s1: 52, l1: 86, s2: 48, l2: 68, shift: 32 },
  // 头像：径向，中心亮，暗示「人像居中」
  avatar: { kind: 'radial', angle: 0, s1: 38, l1: 91, s2: 34, l2: 79, shift: 16 },
  // 品牌/图标：极浅，避免抢走前景图标
  logo: { kind: 'radial', angle: 0, s1: 28, l1: 96, s2: 22, l2: 87, shift: 12 },
};

/**
 * 暗色底的配方（2026-10-29 加）。
 *
 * 上面的亮色配方亮度在 68~96%，直接用在暗色包（blackgreen / daisy-dark）上就是
 * **往近黑的页面里贴白纸**——实测点菜小程序里 8 张菜品图全成了米黄/浅蓝/浅粉的亮块，
 * 比正文还抢眼，一眼就看出「这是渲染坏了」而不是「这里要放图」。
 *
 * 暗色版把亮度压到 16~30%、饱和度略降：占位块读起来像「比卡片亮一档的空位」，
 * 既区分得出，又不跳出画面。色相仍然由名字确定性推导，形态语义不变。
 */
const TONE_RECIPE_DARK: Record<PlaceholderTone, { kind: 'linear' | 'radial'; angle: number; s1: number; l1: number; s2: number; l2: number; shift: number }> = {
  photo: { kind: 'linear', angle: 135, s1: 26, l1: 24, s2: 24, l2: 16, shift: 26 },
  hero: { kind: 'linear', angle: 152, s1: 30, l1: 27, s2: 28, l2: 15, shift: 32 },
  avatar: { kind: 'radial', angle: 0, s1: 22, l1: 28, s2: 20, l2: 18, shift: 16 },
  logo: { kind: 'radial', angle: 0, s1: 18, l1: 21, s2: 16, l2: 14, shift: 12 },
};

/** 暗色底的兜底底色（亮色版是 #ececf1） */
const BASE_BG_DARK = '#1a2420';

/**
 * 判断一个颜色是不是「暗底」。
 *
 * 为什么不从风格包取 `mode`：出码器拿不到 pack（`generateHtml(page, compiled)` 里
 * 已经没有主题信息，颜色在 AI 阶段就被解析成 hex 了）。所以从**根背景色**反推——
 * 这个值一定在，且它就是用户最终看到的底色，比旁路传参更可靠。
 *
 * 亮度用 sRGB 相对亮度的粗化版（不做 gamma 校正）：这里只需要「暗/亮」二值判断，
 * 精确色差计算没有意义。阈值 0.45 让 #767676 这类中灰落到亮色侧。
 */
export function isDarkColor(color?: string): boolean {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((color ?? '').trim());
  if (!m) return false;
  const hex = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45;
}

/** 占位节点的 class（形态 + 色相 → 一个类；同名同色，CSS 也可复用） */
export function placeholderClass(name?: string): string {
  return `ui-image-ph-${placeholderTone(name)}-${placeholderHue(name)}`;
}

/** 生成单个 class 的 `--ph-tint` 声明（不含选择器） */
export function placeholderTint(name?: string, dark = false): string {
  const tone = placeholderTone(name);
  const r = (dark ? TONE_RECIPE_DARK : TONE_RECIPE)[tone];
  const h = placeholderHue(name);
  const h2 = (h + r.shift) % 360;
  const c1 = `hsl(${h} ${r.s1}% ${r.l1}%)`;
  const c2 = `hsl(${h2} ${r.s2}% ${r.l2}%)`;
  return r.kind === 'linear'
    ? `linear-gradient(${r.angle}deg, ${c1} 0%, ${c2} 100%)`
    : `radial-gradient(circle at 50% 42%, ${c1} 0%, ${c2} 100%)`;
}

/**
 * 基础规则（与具体图层无关的那一半）。
 *
 * 三层 `background-image`：图标 / 斜向高光 / 色调。色调走 `--ph-tint` 变量，
 * 默认给一个**全透明渐变**而不是 `none`——`none` 不能作为 `background-image` 列表里的一项
 * （只能整体使用），写进去整条声明会被浏览器丢弃，连图标一起消失。
 */
export const IMAGE_PLACEHOLDER_CSS = basePlaceholderCss(false);

/** 基础规则本体（暗色只换兜底底色，图标灰在暗底上同样可读，不动） */
function basePlaceholderCss(dark: boolean): string {
  return `.${IMAGE_PLACEHOLDER_CLASS} {
  --ph-tint: linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 100%);
  background-color: ${dark ? BASE_BG_DARK : '#ececf1'};
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23a8a8b4' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='16' rx='2'/><circle cx='8.5' cy='9.5' r='1.5'/><path d='M21 15l-5-5L5 20'/></svg>"), linear-gradient(135deg, rgba(255,255,255,${dark ? '0.10' : '0.75'}) 0%, rgba(255,255,255,0) 55%), var(--ph-tint);
  background-repeat: no-repeat, no-repeat, no-repeat;
  background-position: center, center, center;
  background-size: 24px 24px, cover, cover;
}`;
}

/** 需要占位色的节点形状（避免 generator 传错类型；也便于测试构造） */
export interface PlaceholderNodeLike {
  type: string;
  name?: string;
  src?: string;
}

/** 从节点集合里挑出「空 src 的 IMAGE」，去重成 (tone,hue) 集合 */
function tintRules(nodes: Iterable<PlaceholderNodeLike>, dark: boolean): string {
  const seen = new Set<string>();
  const rules: string[] = [];
  for (const n of nodes) {
    if (n.type !== 'IMAGE') continue;
    if ((n.src ?? '') !== '') continue;
    const cls = placeholderClass(n.name);
    if (seen.has(cls)) continue;
    seen.add(cls);
    rules.push(`.${cls} { --ph-tint: ${placeholderTint(n.name, dark)}; }`);
  }
  return rules.join('\n');
}

/**
 * 出码用的完整占位样式块 = 基础规则 + 本页实际用到的色调规则。
 *
 * 只输出**本页用到的**色调：一页 20 张图里可能有 5 种色，全量输出会让 CSS 里
 * 出现几十条用不上的规则（并且让两份本该相同的产物因为多了一张图而整块 diff）。
 *
 * `dark` 由调用方用根背景色判断（`isDarkColor`），缺省 false —— 亮色是历史行为，
 * 缺省值保持它，这样既有 19 页的像素基线不受影响。
 */
export function imagePlaceholderCss(nodes: Iterable<PlaceholderNodeLike>, dark = false): string {
  const extra = tintRules(nodes, dark);
  const base = dark ? basePlaceholderCss(true) : IMAGE_PLACEHOLDER_CSS;
  return extra ? `${base}\n${extra}` : base;
}

/** 收集树里所有节点（generator 侧的公共小工具，避免每个出口各写一遍 walk） */
export function collectPlaceholderNodes(root: PlaceholderNodeLike & { children?: unknown[] }): PlaceholderNodeLike[] {
  const out: PlaceholderNodeLike[] = [];
  const walk = (n: PlaceholderNodeLike & { children?: unknown[] }): void => {
    out.push(n);
    for (const c of (n.children ?? []) as (PlaceholderNodeLike & { children?: unknown[] })[]) walk(c);
  };
  walk(root);
  return out;
}
