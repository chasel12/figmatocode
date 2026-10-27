/**
 * 图标词表与名字归一（AI 通道）
 *
 * 为什么需要这一层：
 *
 * 1. **词表从未进过提示词**。图标库有 1545 个名字（lucide 0.470），全塞进提示词是
 *    几千 token 的噪声；结果模型根本不知道有哪些名字可用，写 `icon` 等于盲猜。
 *    猜错 = schema 违例 = 返工一轮，于是模型的理性策略是**干脆不写图标**——
 *    这正是「分类栏是一排空灰圆」的真实成因，不是模型不会画。
 *
 * 2. **只给清单不够**。模型会写 `home` / `cart` / `notification` 这些它以为存在的名字
 *    （lucide 里其实叫 house / shopping-cart / bell）。硬报错让模型返工，成本比
 *    在转换层兜住高得多，所以这里做一次**确定性归一**：
 *    精确 → 别名 → 规范化 → 前缀/包含 → 标签，全部命中不了才算失败。
 *
 * 3. **归一失败必须报错并给候选**。静默退化成默认图标，会让「模型写的」和
 *    「画布上看到的」不一致，比报错更糟。候选名喂给自修环，下一轮就能改对。
 *
 * 词表是**精选**而非全量：移动端界面 95% 的图标需求落在下面 80 个里。
 * 清单与别名表都在 tests/ai-icons.test.ts 里对着真实图标库校验，防止库升级后漂移。
 */

/** 提示词里给出的精选图标名（按语义分组，便于模型按用途检索） */
export const ICON_VOCAB: { group: string; names: string[] }[] = [
  {
    group: '导航/操作',
    names: [
      'house', 'search', 'map-pin', 'bell', 'user', 'users', 'settings', 'menu', 'ellipsis',
      'chevron-left', 'chevron-right', 'chevron-down', 'chevron-up',
      'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down',
      'x', 'plus', 'minus', 'check', 'sliders-horizontal',
    ],
  },
  {
    group: '电商/交易',
    names: [
      'shopping-cart', 'shopping-bag', 'store', 'ticket', 'receipt', 'credit-card',
      'wallet', 'tag', 'gift', 'package', 'truck', 'percent',
    ],
  },
  {
    group: '内容/媒体',
    names: [
      'image', 'camera', 'play', 'pause', 'music', 'video', 'mic', 'headphones',
      'book-open', 'file-text', 'download', 'upload', 'share-2', 'link',
    ],
  },
  {
    group: '社交/状态',
    names: ['heart', 'star', 'thumbs-up', 'message-circle', 'message-square', 'send', 'smile'],
  },
  {
    /**
     * 分类入口（宫格）是中文 App 首页的标配，而「药店」这类语义在通用词表里
     * 找不到对应名时，模型会退而选 shield 之类不相干的图标。单列一组更稳。
     */
    group: '分类入口',
    names: [
      'pill', 'stethoscope', 'dumbbell', 'scissors', 'shirt', 'car', 'bike', 'bus', 'plane',
      'hotel', 'banknote', 'coins', 'smartphone', 'laptop', 'gamepad-2', 'baby', 'paw-print',
      'leaf', 'cherry', 'carrot', 'fish', 'beef', 'wine', 'ice-cream-cone', 'sandwich',
      'hospital', 'briefcase', 'graduation-cap',
    ],
  },
  {
    group: '生活/其他',
    names: [
      'utensils', 'coffee', 'pizza', 'cake', 'apple', 'clock', 'calendar', 'phone', 'mail',
      'lock', 'eye', 'trash-2', 'pencil', 'filter', 'list', 'refresh-cw', 'log-out',
      'circle-help', 'info', 'circle-alert', 'shield', 'zap', 'flame', 'sun', 'moon',
      'cloud', 'wifi', 'battery', 'qr-code', 'scan-line', 'grid-3x3',
    ],
  },
];

/** 扁平化后的合法名字集合（供校验与提示词生成） */
export const ICON_NAMES: string[] = ICON_VOCAB.flatMap((g) => g.names);

/**
 * 别名表：模型常写、但 lucide 里不叫这个名字的 → 真实名字。
 *
 * 只收「语义明确无歧义」的映射。像 `star` 到底指收藏还是评分这种，就不猜。
 */
export const ICON_ALIASES: Record<string, string> = {
  // 导航
  home: 'house',
  homepage: 'house',
  index: 'house',
  find: 'search',
  magnifier: 'search',
  'magnifying-glass': 'search',
  location: 'map-pin',
  'location-pin': 'map-pin',
  gps: 'map-pin',
  pin: 'map-pin',
  notification: 'bell',
  notifications: 'bell',
  alarm: 'bell',
  profile: 'user',
  person: 'user',
  account: 'user',
  avatar: 'user',
  cog: 'settings',
  gear: 'settings',
  config: 'settings',
  hamburger: 'menu',
  dots: 'ellipsis',
  more: 'ellipsis',
  'more-horizontal': 'ellipsis',
  'more-vertical': 'ellipsis-vertical',
  back: 'chevron-left',
  forward: 'chevron-right',
  close: 'x',
  add: 'plus',
  remove: 'minus',
  ok: 'check',
  done: 'check',
  confirm: 'check',
  // 电商
  cart: 'shopping-cart',
  basket: 'shopping-basket',
  bag: 'shopping-bag',
  shop: 'store',
  market: 'store',
  coupon: 'ticket',
  voucher: 'ticket',
  order: 'receipt',
  orders: 'receipt',
  invoice: 'receipt',
  pay: 'credit-card',
  payment: 'credit-card',
  money: 'wallet',
  price: 'tag',
  label: 'tag',
  discount: 'percent',
  delivery: 'truck',
  shipping: 'truck',
  box: 'package',
  // 内容
  photo: 'image',
  picture: 'image',
  gallery: 'image',
  movie: 'video',
  film: 'video',
  microphone: 'mic',
  headset: 'headphones',
  support: 'headphones',
  book: 'book-open',
  document: 'file-text',
  doc: 'file-text',
  save: 'download',
  // 社交/状态
  favourite: 'heart',
  favorite: 'heart',
  like: 'heart',
  rating: 'star',
  score: 'star',
  comment: 'message-circle',
  chat: 'message-circle',
  feedback: 'message-square',
  share: 'share-2',
  // 生活
  restaurant: 'utensils',
  food: 'utensils',
  dish: 'utensils',
  meal: 'utensils',
  drink: 'coffee',
  beverage: 'coffee',
  dessert: 'cake',
  fruit: 'apple',
  time: 'clock',
  history: 'clock',
  date: 'calendar',
  call: 'phone',
  tel: 'phone',
  email: 'mail',
  security: 'lock',
  password: 'lock',
  view: 'eye',
  delete: 'trash-2',
  remove2: 'trash-2',
  edit: 'pencil',
  sort: 'filter',
  'help-circle': 'circle-help',
  help: 'circle-help',
  question: 'circle-help',
  faq: 'circle-help',
  'alert-circle': 'circle-alert',
  alert: 'circle-alert',
  warning: 'circle-alert',
  error: 'circle-alert',
  safe: 'shield',
  power: 'zap',
  hot: 'flame',
  fire: 'flame',
  light: 'sun',
  dark: 'moon',
  night: 'moon',
  network: 'wifi',
  scan: 'scan-line',
  qr: 'qr-code',
  grid: 'grid-3x3',
  // 中文（中文提示词下模型偶尔直接写中文）
  首页: 'house',
  搜索: 'search',
  定位: 'map-pin',
  地址: 'map-pin',
  通知: 'bell',
  我的: 'user',
  用户: 'user',
  个人中心: 'user',
  设置: 'settings',
  更多: 'ellipsis',
  返回: 'chevron-left',
  关闭: 'x',
  添加: 'plus',
  确认: 'check',
  购物车: 'shopping-cart',
  购物袋: 'shopping-bag',
  店铺: 'store',
  商家: 'store',
  优惠券: 'ticket',
  订单: 'receipt',
  支付: 'credit-card',
  钱包: 'wallet',
  标签: 'tag',
  礼物: 'gift',
  配送: 'truck',
  折扣: 'percent',
  图片: 'image',
  相机: 'camera',
  视频: 'video',
  耳机: 'headphones',
  客服: 'headphones',
  消息: 'message-circle',
  分享: 'share-2',
  收藏: 'heart',
  评分: 'star',
  餐饮: 'utensils',
  美食: 'utensils',
  超市: 'shopping-bag',
  水果: 'apple',
  甜品: 'cake',
  药店: 'pill',
  药品: 'pill',
  医院: 'hospital',
  健身: 'dumbbell',
  服饰: 'shirt',
  打车: 'car',
  出行: 'car',
  酒店: 'hotel',
  理财: 'coins',
  数码: 'smartphone',
  游戏: 'gamepad-2',
  母婴: 'baby',
  宠物: 'paw-print',
  生鲜: 'fish',
  蔬菜: 'carrot',
  时间: 'clock',
  日历: 'calendar',
  电话: 'phone',
  邮件: 'mail',
  帮助: 'circle-help',
  扫码: 'scan-line',
  二维码: 'qr-code',
};

/** 规范化：大小写/下划线/空格/前后缀（`lucide-`、`-icon`、`_icon`） */
function normalize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/^lucide-/, '')
    .replace(/-icon$/, '')
    .replace(/^-+|-+$/g, '');
}

/** 编辑距离（只用于「失败时给候选」，不参与判定，故不追求性能） */
function distance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    const cur = [i];
    for (let j = 1; j <= n; j += 1) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** 最接近的 n 个图标名（给违例提示用，让自修环有的放矢） */
export function nearestIconNames(query: string, icons: Record<string, unknown>, n = 3): string[] {
  const q = normalize(query);
  return Object.keys(icons)
    .map((name) => {
      const prefix = name.startsWith(q.slice(0, 3)) ? -2 : 0;
      const contains = q.length >= 3 && name.includes(q) ? -2 : 0;
      return { name, score: distance(q, name) + prefix + contains };
    })
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, n)
    .map((x) => x.name);
}

export interface ResolvedIcon {
  /** 命中的真实图标名；解析失败时为空 */
  name?: string;
  /** 解析失败时的最近候选 */
  candidates: string[];
}

/**
 * 把模型写的图标名归一到图标库里的真实名字。
 *
 * 判定顺序（先精确后宽松，每步都要求**唯一**命中，避免「猜得太狠」）：
 * 精确 → 别名 → 规范化 → 前缀唯一 → 包含唯一 → 标签唯一。
 */
export function resolveIconName(raw: string, icons: Record<string, unknown>): ResolvedIcon {
  const key = raw.trim();
  if (icons[key]) return { name: key, candidates: [] };

  const norm = normalize(key);
  if (icons[norm]) return { name: norm, candidates: [] };

  const alias = ICON_ALIASES[key] ?? ICON_ALIASES[norm];
  if (alias && icons[alias]) return { name: alias, candidates: [] };

  const names = Object.keys(icons);
  const startsWith = names.filter((n) => n.startsWith(norm));
  if (startsWith.length === 1) return { name: startsWith[0], candidates: [] };

  if (norm.length >= 3) {
    const includes = names.filter((n) => n.includes(norm) || norm.includes(n));
    if (includes.length === 1) return { name: includes[0], candidates: [] };
  }

  // 标签命中：图标库里每个条目带一组英文标签（如 "location map pin"）
  const tagged = names.filter((n) => {
    const tags = (icons[n] as { t?: string })?.t;
    if (typeof tags !== 'string') return false;
    return tags.split(' ').includes(norm);
  });
  if (tagged.length === 1) return { name: tagged[0], candidates: [] };

  return { candidates: nearestIconNames(key, icons) };
}

/** 提示词用的紧凑词表（分组一行一个，省 token 又好检索） */
export function iconVocabPrompt(): string {
  const total = ICON_NAMES.length;
  const lines = ICON_VOCAB.map((g) => `${g.group}：${g.names.join(' ')}`);
  return `图标（VECTOR 的 icon 只能从下面 ${total} 个里选；写了近义名会被自动纠正，写无关名字会被判违例）：\n${lines.join('\n')}`;
}
