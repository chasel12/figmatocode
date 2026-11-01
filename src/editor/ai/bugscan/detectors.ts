/**
 * 形态缺陷检测器集合（纯函数，不修改任何节点）
 *
 * 每一条都来自「已经发生过的错」或「一眼能看出不对」的形态，不是抽象美学。
 * 判据一律写成「结构 + 数值」，不猜意图：猜意图的规则误报率高到没法用。
 */

import type { UINode, UIPage } from '../../../schema/types';
import { hasBackdropLayer, ownBackground } from '../../../standards/context';
import { contrastRatio } from '../../../standards/color';
import type { BugDetector, BugHit } from './types';

/* =============================================================
 * 遍历工具
 * ============================================================= */

interface Visit {
  node: UINode;
  parent: UINode | null;
  /** `root/底部导航/导航-分类` 形式 */
  path: string;
  depth: number;
}

function walk(page: UIPage): Visit[] {
  const out: Visit[] = [];
  const go = (node: UINode, parent: UINode | null, prefix: string, depth: number): void => {
    const label = node.name || `${node.type}#${node.id.slice(-4)}`;
    const path = prefix ? `${prefix}/${label}` : label;
    out.push({ node, parent, path, depth });
    const kids = (node as { children?: UINode[] }).children;
    if (Array.isArray(kids)) for (const c of kids) go(c, node, path, depth + 1);
  };
  go(page.root, null, '', 0);
  return out;
}

const kidsOf = (n: UINode): UINode[] => {
  const k = (n as { children?: UINode[] }).children;
  return Array.isArray(k) ? k : [];
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** 圆角归一（`borderRadius` 可能是四角数组，取首角即可判「是不是圆」） */
const radiusOf = (n: UINode): number => {
  const r = n.style?.borderRadius;
  if (typeof r === 'number') return r;
  if (Array.isArray(r)) return Math.max(...r);
  return 0;
};

/** 视觉上「有东西」：有背景、有描边、有阴影、有装饰层，任一成立 */
function isPainted(n: UINode): boolean {
  const s = n.style;
  if (!s) return false;
  if (s.background) return true;
  if (s.fills?.some((f) => f.visible !== false)) return true;
  if (s.border) return true;
  if (s.effects?.some((e) => e.visible !== false)) return true;
  if (s.decorations?.length) return true;
  return false;
}

const hasText = (n: UINode): n is UINode & { text: string } =>
  (n.type === 'TEXT' || n.type === 'BUTTON') && typeof (n as { text?: unknown }).text === 'string';

const textOf = (n: UINode): string => (hasText(n) ? n.text : '');

/* =============================================================
 * A. 角标排成一行（本项目最典型的形态 bug）
 * ============================================================= */

/**
 * 判据（四条同时成立）：
 * 1. 父容器是横向流式（`mode === 'HORIZONTAL'`）
 * 2. 子节点是个「小圆」：≤28×28、宽高比 0.75~1.33、圆角 ≥6
 * 3. 圆内是**数字**（1~3 位）—— 这一条把「圆形图标按钮」排除掉
 * 4. 该子节点**没有脱流**（`position` 不是 ABSOLUTE，`mode` 不是 ABSOLUTE）
 *
 * 为什么第 3 条必须是「数字」：圆形 + 文字的组合里，只有计数角标和图标按钮两种。
 * 图标按钮的文字通常是符号（`+`、`×`、`⋯`）或汉字，计数角标是数字。
 * 用「数字」当判据比用「文字短」精确得多 —— 后者会把 `+` 也算进来。
 */
const badgeInline: BugDetector = {
  id: 'badge-inline',
  title: '角标被排进流里（应脱流挂角）',
  severity: 'bug',
  rationale: '计数角标必须 position:ABSOLUTE 挂在图标右上角，不能参与父容器的横排',
  /**
   * 规则 4 只覆盖「给了 x/y 却没声明定位」那一半。
   * **完全没给坐标的角标它管不了**（不敢替模型编 x/y），所以这条仍会命中 —— 不是回归。
   */
  coveredBy: 'normalizeAbsolute 规则 4（只覆盖「有坐标没声明」的一半）',
  check(page) {
    const hits: BugHit[] = [];
    for (const { node, path } of walk(page)) {
      if (node.layout.mode !== 'HORIZONTAL') continue;
      const kids = kidsOf(node);
      if (kids.length < 2) continue;
      const hasIconSibling = kids.some(
        (k) => k.type === 'VECTOR' || (num(k.layout.width) ?? 0) >= 32 || (num(k.layout.height) ?? 0) >= 32,
      );
      if (!hasIconSibling) continue;

      for (const kid of kids) {
        const w = num(kid.layout.width);
        const h = num(kid.layout.height);
        if (w == null || h == null || w > 28 || h > 28) continue;
        if (w <= 0 || h <= 0) continue;
        const ratio = w / h;
        if (ratio < 0.75 || ratio > 1.33) continue;
        if (radiusOf(kid) < 6) continue;
        // 圆内的文字
        const inner = kidsOf(kid);
        const label = inner.map(textOf).join('').trim() || textOf(kid).trim();
        if (!/^\d{1,3}$/.test(label)) continue;
        if (kid.layout.position === 'ABSOLUTE' || kid.layout.mode === 'ABSOLUTE') continue;

        hits.push({
          bugId: badgeInline.id,
          severity: 'bug',
          page: page.name,
          path: `${path}/${kid.name || '角标'}`,
          nodeId: kid.id,
          detail: `数字角标「${label}」${w}×${h} 参与横排，未脱流挂角`,
          meta: { width: w, height: h, radius: radiusOf(kid), label },
        });
      }
    }
    return hits;
  },
};

/* =============================================================
 * B. 图标被拉伸
 * ============================================================= */

/**
 * 判据：`vector.width/height`（原 viewBox 比）与 `layout.width/height`（渲染尺寸）比例偏离 >8%。
 *
 * 8% 这个阈值的来历：24×24 图标缩到 20×20 是 1:1，不会命中；
 * 而「宽 24 高 12」（被压扁一半）偏离 100%，必中。中间地带（如 24×22，偏离 9%）
 * 肉眼几乎看不出，但既然判据是「比例失真」就该报 —— 它是同一个错误的轻微版本。
 */
const vectorRatio: BugDetector = {
  id: 'vector-ratio',
  title: '图标宽高比失真（被拉伸）',
  severity: 'bug',
  rationale: 'VECTOR 的渲染尺寸必须与原 viewBox 同比，否则图标变形',
  check(page) {
    const hits: BugHit[] = [];
    for (const { node, path } of walk(page)) {
      if (node.type !== 'VECTOR') continue;
      const vw = num(node.vector?.width);
      const vh = num(node.vector?.height);
      const lw = num(node.layout.width);
      const lh = num(node.layout.height);
      if (vw == null || vh == null || lw == null || lh == null) continue;
      if (vw <= 0 || vh <= 0 || lw <= 0 || lh <= 0) continue;
      const distortion = (lw / lh) / (vw / vh);
      const pct = Math.abs(distortion - 1);
      if (pct <= 0.08) continue;
      hits.push({
        bugId: vectorRatio.id,
        severity: 'bug',
        page: page.name,
        path,
        nodeId: node.id,
        detail: `viewBox ${vw}×${vh} 渲染成 ${lw}×${lh}，横向偏差 ${(pct * 100).toFixed(0)}%`,
        meta: { viewW: vw, viewH: vh, layoutW: lw, layoutH: lh, distortion: +distortion.toFixed(3) },
      });
    }
    return hits;
  },
};

/* =============================================================
 * C. 空容器
 * ============================================================= */

/**
 * 判据：FRAME 无子节点、无任何可见绘制（背景/描边/阴影/装饰）。
 *
 * 排除两类不该报的：
 * - **零尺寸**（宽或高 < 2）：那是分隔线/占位，渲染上无意义但也不占空间
 * - **间距占位**（名字含 spacer/占位/间距/blank/gap）：刻意的留白节点
 *
 * 严重度定为 `taste` 而不是 `bug`：空容器渲染出来是「什么都没有」，
 * 用户看不见，只是 AST 脏。叫 bug 会高估它的危害。
 */
const emptyFrame: BugDetector = {
  id: 'empty-frame',
  title: '空容器（无内容也无绘制）',
  severity: 'taste',
  rationale: 'FRAME 没有子节点也没有背景/描边/阴影时，渲染上不存在，属于冗余节点',
  check(page) {
    const SPACER = /spacer|占位|间距|blank|gap|divider|分隔/i;
    const hits: BugHit[] = [];
    for (const { node, path } of walk(page)) {
      if (node.type !== 'FRAME') continue;
      if (kidsOf(node).length > 0) continue;
      if (isPainted(node)) continue;
      if (SPACER.test(node.name ?? '')) continue;
      const w = num(node.layout.width) ?? 0;
      const h = num(node.layout.height) ?? 0;
      if (w < 2 || h < 2) continue;
      hits.push({
        bugId: emptyFrame.id,
        severity: 'taste',
        page: page.name,
        path,
        nodeId: node.id,
        detail: `空 FRAME ${w}×${h}，无子节点也无背景/描边/阴影`,
        meta: { width: w, height: h },
      });
    }
    return hits;
  },
};

/* =============================================================
 * D. 脱流容器高度塌 0（回归基线）
 * ============================================================= */

/**
 * 判据：`mode === 'ABSOLUTE'` + `heightMode === 'HUG'` + 无 `height` + 有子节点。
 *
 * **只判 `mode`，不判 `position`** —— 这一条被实测纠正过一次（2026-11-01）：
 * 原判据写成 `position === 'ABSOLUTE' || mode === 'ABSOLUTE'`，于是 `overlay-menu` 的
 * 下拉菜单（`mode: VERTICAL` + `position: ABSOLUTE` + HUG）被报成「高度会塌 0」，
 * 而截图里它明明正常显示。原因是 `position: ABSOLUTE` 仍会发射 `height: fit-content`，
 * 绝对定位元素的 fit-content 按内容算，不会塌；真正塌 0 的是 `mode: ABSOLUTE`
 * （那条路径下编译层不输出内部排版，高度没有来源）。
 * `normalizeAbsolute` 规则 3 也只处理 `mode`，检测器必须与它同口径，否则「回归基线」是假的。
 *
 * `normalizeAbsolute` 已经会补 `heightMode: 'FIXED'`，所以**存量应为 0 命中**。
 * 留着它的作用不是「找 bug」，是「证明那条 normalize 真的在跑」——
 * 一旦哪天有人动了调用顺序，这条会立刻从 0 变成 N，比单测更早发现。
 */
const absNoSize: BugDetector = {
  id: 'abs-no-size',
  title: '脱流容器缺省 HUG（高度会塌 0）',
  severity: 'bug',
  rationale: 'mode:ABSOLUTE 的容器若 heightMode 仍是 HUG，父级不提供高度参考，实际渲染为 0 高',
  coveredBy: 'normalizeAbsolute 规则 3',
  check(page) {
    const hits: BugHit[] = [];
    for (const { node, path } of walk(page)) {
      if (node.layout.mode !== 'ABSOLUTE') continue;
      if (node.layout.heightMode !== 'HUG') continue;
      if (node.layout.height != null) continue;
      if (kidsOf(node).length === 0) continue;
      hits.push({
        bugId: absNoSize.id,
        severity: 'bug',
        page: page.name,
        path,
        nodeId: node.id,
        detail: '脱流容器 heightMode=HUG 且无 height，高度会塌成 0',
        meta: { mode: node.layout.mode, position: node.layout.position ?? null },
      });
    }
    return hits;
  },
};

/* =============================================================
 * E. 固定底栏压住内容
 * ============================================================= */

/**
 * 判据：root 子树里存在 `position === 'FIXED'` 且贴底的节点，其高度 H 大于 root 的 `padding-bottom`。
 *
 * 为什么这是 bug 而不是 taste：底栏是 `position:fixed`，脱离文档流，
 * 根容器不给 `padding-bottom` 的话，页面最后一段内容会被永久压住 ——
 * 滚动到底也看不到（这是已经发生过的一次：最后一张卡的价格行被底栏压住）。
 *
 * 「贴底」的判据：`y + height >= viewport.height - 2`，或者没有 `y` 但 `stickyBottom === 0`。
 */
const fixedOcclude: BugDetector = {
  id: 'fixed-occlude',
  title: '固定底栏压住页面内容',
  severity: 'bug',
  rationale: 'position:FIXED 脱离文档流，根容器必须留出等高的 padding-bottom，否则内容永远被遮',
  coveredBy: 'normalizeSticky',
  check(page) {
    const hits: BugHit[] = [];
    const vh = page.viewport.height;
    const rootPadBottom = page.root.layout.padding?.[2] ?? 0;
    const all = walk(page);
    // 只在 root 的直接子树里找底栏：深层节点设 FIXED 极罕见，且容易和遮罩层混淆
    const bars = all.filter(({ node }) => {
      if (node.layout.position !== 'FIXED') return false;
      const h = num(node.layout.height);
      if (h == null || h <= 0) return false;
      const y = num(node.layout.y);
      if (y != null) return y + h >= vh - 2;
      return node.layout.stickyBottom === 0;
    });
    for (const { node, path } of bars) {
      const h = num(node.layout.height) ?? 0;
      if (rootPadBottom >= h) continue;
      hits.push({
        bugId: fixedOcclude.id,
        severity: 'bug',
        page: page.name,
        path,
        nodeId: node.id,
        detail: `底栏高 ${h}px，根容器 padding-bottom 只有 ${rootPadBottom}px，差 ${h - rootPadBottom}px 内容被遮`,
        meta: { barHeight: h, rootPadBottom, viewportHeight: vh },
      });
    }
    return hits;
  },
};

/* =============================================================
 * F. 文字与背景几乎同色
 * ============================================================= */

/**
 * 判据：对比度 < 1.2（**不是 WCAG 的 4.5**）。
 *
 * 1.2 的含义是「肉眼几乎分不出」—— 这是「文字消失」级别，不是「对比度不够」级别。
 * 4.5 那一档已经由 `standards/` 的 `wcag-1.4.3-contrast` 负责，这里不重复。
 *
 * 三态背景处理沿用 `ownBackground`：`unknown`（渐变/图片/半透明）时**跳过**，
 * 因为此时算出来的比值没有意义 —— 上一轮就是这里误报了 12 条。
 */
const sameColor: BugDetector = {
  id: 'text-invisible',
  title: '文字与背景几乎同色（不可见）',
  severity: 'bug',
  rationale: '对比度 < 1.2 时文字等于消失，属于渲染事故而不是风格问题',
  coveredBy: 'normalizeInvisibleText',
  check(page) {
    const hits: BugHit[] = [];
    const go = (node: UINode, inherited: string | null, path: string): void => {
      const own = ownBackground(node);
      const bg = own.state === 'color' ? own.value : own.state === 'unknown' ? null : inherited;
      const label = node.name || `${node.type}#${node.id.slice(-4)}`;
      const here = path ? `${path}/${label}` : label;

      if (hasText(node) && node.style?.color && bg && node.text.trim()) {
        const ratio = contrastRatio(node.style.color, bg);
        if (ratio != null && ratio < 1.2) {
          hits.push({
            bugId: sameColor.id,
            severity: 'bug',
            page: page.name,
            path: here,
            nodeId: node.id,
            detail: `「${node.text.slice(0, 12)}」${node.style.color} 压 ${bg}，对比度 ${ratio.toFixed(2)}:1`,
            meta: { ratio: +ratio.toFixed(3), color: node.style.color, background: bg },
          });
        }
      }
      // 背景画在**同级绝对定位层**上时（海报结构），子树的实际底色不可判定，必须跳过。
      // 这条与 `normalizeInvisibleText` 共用同一个 `hasBackdropLayer`，口径不能分叉。
      const covered = own.state === 'inherit' && hasBackdropLayer(node);
      for (const c of kidsOf(node)) go(c, covered ? null : bg, here);
    };
    go(page.root, page.root.style?.background ?? '#FFFFFF', '');
    return hits;
  },
};

/* =============================================================
 * G. 间距档位过多
 * ============================================================= */

/**
 * 判据：整页 `gap > 0` 的唯一值超过 6 种。
 *
 * 6 这个数来自实测：demo 19 页里绝大多数是 2~6 种（4/8/12/16 这类阶梯），
 * 超过 6 种基本就是「随手写」而不是「有节奏」。
 *
 * 定为 `taste`：不违反任何标准，只是看起来没章法。
 */
const gapScatter: BugDetector = {
  id: 'gap-scatter',
  title: '间距档位过多（没有节奏）',
  severity: 'taste',
  rationale: '同一页面 gap 出现超过 6 种不同取值，说明间距不是按阶梯取的',
  check(page) {
    const values = new Map<number, number>();
    for (const { node } of walk(page)) {
      const g = num(node.layout.gap);
      if (g != null && g > 0) values.set(g, (values.get(g) ?? 0) + 1);
    }
    if (values.size <= 6) return [];
    const sorted = [...values.entries()].sort((a, b) => a[0] - b[0]);
    return [
      {
        bugId: gapScatter.id,
        severity: 'taste',
        page: page.name,
        path: 'root',
        nodeId: page.root.id,
        detail: `${values.size} 种 gap：${sorted.map(([v, n]) => `${v}×${n}`).join(' ')}`,
        meta: { distinct: values.size, values: sorted.map(([v]) => v).join(',') },
      },
    ];
  },
};

/* =============================================================
 * H. 字号层次不足
 * ============================================================= */

/**
 * 判据：整页 `fontSize` 唯一值少于 3 种。
 *
 * 一个页面至少要有「标题 / 正文 / 辅助」三档，少于 3 档意味着没有层次。
 * 这是最粗糙的层次判据 —— 真正的层次要靠字号+字重+颜色的组合，但 AST 里
 * 字重和颜色的搭配无法可靠判「意图」，只有字号档数能确定判。
 *
 * 定为 `taste`：三档是常识，不是标准。
 */
const flatHierarchy: BugDetector = {
  id: 'flat-hierarchy',
  title: '字号层次不足',
  severity: 'taste',
  rationale: '整页字号少于 3 档时，标题与正文分不开，视觉上是一片平',
  check(page) {
    const sizes = new Map<number, number>();
    for (const { node } of walk(page)) {
      const f = num(node.style?.fontSize);
      if (f != null && f > 0) sizes.set(f, (sizes.get(f) ?? 0) + 1);
    }
    if (sizes.size === 0 || sizes.size >= 3) return [];
    const sorted = [...sizes.entries()].sort((a, b) => a[0] - b[0]);
    return [
      {
        bugId: flatHierarchy.id,
        severity: 'taste',
        page: page.name,
        path: 'root',
        nodeId: page.root.id,
        detail: `只有 ${sizes.size} 档字号：${sorted.map(([v, n]) => `${v}×${n}`).join(' ')}`,
        meta: { distinct: sizes.size, sizes: sorted.map(([v]) => v).join(',') },
      },
    ];
  },
};

/* =============================================================
 * I. 文字超出固定宽度
 * ============================================================= */

/**
 * 判据：TEXT 的 `widthMode === 'FIXED'` 且估算文本宽 > 声明宽 × 1.05。
 *
 * **估算公式是有损的**：中文按 1.0×字号、其余按 0.55×字号，不考虑字重、
 * letter-spacing、标点挤压。所以它只能抓「明显超出一截」的情况，
 * 阈值给到 1.05（留 5% 余量）而不是 1.0。
 *
 * 定为 `taste` 而非 `bug`：估算可能错，报出来要人再确认。
 * 真正准确的判据是浏览器里 `scrollWidth > clientWidth`，那要渲染才行。
 */
const textClip: BugDetector = {
  id: 'text-clip',
  title: '文字估算超出固定宽度',
  severity: 'taste',
  rationale: 'TEXT 声明了固定宽度但没有 overflow 处理，长文本会被裁切或撑破',
  check(page) {
    const hits: BugHit[] = [];
    const estWidth = (text: string, fontSize: number): number => {
      let w = 0;
      for (const ch of text) w += /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(ch) ? fontSize : fontSize * 0.55;
      return w;
    };
    for (const { node, path } of walk(page)) {
      if (!hasText(node)) continue;
      const text = node.text.trim();
      if (!text) continue;
      if (node.layout.widthMode !== 'FIXED') continue;
      const w = num(node.layout.width);
      const fs = num(node.style?.fontSize);
      if (w == null || fs == null || w <= 0 || fs <= 0) continue;
      // `clipContent` 为真说明「裁切是有意的」，此时超宽是设计而非缺陷
      if (node.layout.clipContent) continue;
      const need = estWidth(text, fs);
      if (need <= w * 1.05) continue;
      hits.push({
        bugId: textClip.id,
        severity: 'taste',
        page: page.name,
        path,
        nodeId: node.id,
        detail: `「${text.slice(0, 10)}」估算 ${Math.round(need)}px > 声明 ${w}px（${fs}px 字号）`,
        meta: { declared: w, estimated: Math.round(need), fontSize: fs, chars: [...text].length },
      });
    }
    return hits;
  },
};

/* =============================================================
 * J. 列表里 N 项同时显示「选中」标记（repeat 把状态位写死）
 * ============================================================= */

/** 会被当成「选中 / 勾选」的图标名 */
const STATE_ICON = /^(check|tick|done|radio|circle-check|circle-dot|square-check|dot)/;

/** 方框勾选框（多选合法）：边长 ≤28 且近似正方 */
function isCheckboxBox(n: UINode): boolean {
  const w = num(n.layout.width);
  const h = num(n.layout.height);
  if (w == null || h == null || w <= 0 || h <= 0 || w > 28 || h > 28) return false;
  const r = w / h;
  return r >= 0.8 && r <= 1.25;
}

/** 结构签名（只看两层：行的形状决定「同构」，再深就会把文案差异也算进去） */
function shapeOf(n: UINode, depth = 2): string {
  if (depth === 0) return n.type;
  return `${n.type}(${kidsOf(n)
    .map((c) => shapeOf(c, depth - 1))
    .join(',')})`;
}

/**
 * 判据：同一父容器下 ≥3 个**同构兄弟**（同类型 + 同子结构），每个兄弟子树里都出现
 * **同一个**「选中标记」图标（`d` 完全相同）。
 *
 * 为什么这是 bug 而不是 taste：单选列表不可能同时选中 3 项。真实来源是
 * `form-select` 场景 —— 模型把 `{"kind":"VECTOR","icon":"check"}` 写进了 `repeat` 模板，
 * 展开出的 4 行每行一个勾，同时 4 行背景还完全一样，于是「当前选中项」根本看不出来。
 * 对照 `form-checkbox`（手写 3 行，只有第一行带勾）—— 说明模型会写，是 `repeat` 把它带偏的。
 *
 * 三条防误报：
 * 1. **必须同构**：结构不同的兄弟（标题行 + 数据行）不参与判定。
 * 2. **必须是状态图标**：靠 `ctx.icons` 把 `d` 反查回图标名再匹配；没有图标表时退化成
 *    看节点 name（`选中勾` / `checkbox` 这类），看不住就不报 —— 宁可漏判。
 * 3. **排除方框勾选**：标记的父容器是边长 ≤28 的方框时那是 checkbox（多选合法），不报。
 *
 * **不自动修**：把哪一项留下是无解的（模型没给任何选中线索），删错三行比留四个勾更糟。
 * 正解在提示词侧（`repeat` 段已写明「表达不了其中一项特殊」），这里只负责让问题可见。
 */
const stateCollapse: BugDetector = {
  id: 'state-collapse',
  title: '列表里 N 项同时显示选中标记',
  severity: 'bug',
  rationale:
    '同构列表 ≥3 行各带同一个勾/选中图标 —— 单选不可能多选，是 repeat 模板把状态位写死的形态',
  check(page, ctx) {
    // d → 图标名（一个 d 可能对应多个别名，优先取命中「状态图标」的那个）
    const byD = new Map<string, string[]>();
    for (const [name, d] of Object.entries(ctx?.icons ?? {})) {
      const arr = byD.get(d);
      if (arr) arr.push(name);
      else byD.set(d, [name]);
    }
    const resolve = (n: UINode): string | null => {
      const d = (n as { vector?: { d?: string } }).vector?.d;
      /**
       * 只认「真路径」。`draftToPage` 在**没有传 `icons`** 时会把每个图标降级成
       * 占位路径 `M 0 0`（单测环境就是这样），此时所有 VECTOR 共用同一个 `d`，
       * 反查表会把它匹配成某个状态图标 → 整页误报。所以短路径一律不参与反查。
       */
      if (d && d.length >= 10 && d !== 'M 0 0') {
        const hit = byD.get(d)?.find((x) => STATE_ICON.test(x));
        if (hit) return hit;
      }
      // 名称兜底：编译后图标名会丢，但节点 name 还在（`选中勾` / `checkbox` 这类）
      const nm = n.name ?? '';
      return /勾|选中|已选|checked|checkbox|radio|tick/i.test(nm) ? nm : null;
    };

    /** 行内所有「状态标记」图标：d（或 name）→ 节点 */
    const markersOf = (row: UINode): Map<string, UINode> => {
      const out = new Map<string, UINode>();
      const go = (n: UINode, parent: UINode): void => {
        if (n.type === 'VECTOR' && !isCheckboxBox(parent)) {
          const name = resolve(n);
          if (name) {
            const key = (n as { vector?: { d?: string } }).vector?.d || `name:${name}`;
            if (!out.has(key)) out.set(key, n);
          }
        }
        for (const c of kidsOf(n)) go(c, n);
      };
      for (const c of kidsOf(row)) go(c, row);
      return out;
    };

    const hits: BugHit[] = [];
    for (const { node, path } of walk(page)) {
      const kids = kidsOf(node);
      if (kids.length < 3) continue;
      const groups = new Map<string, UINode[]>();
      for (const k of kids) {
        if (kidsOf(k).length === 0) continue; // 叶子不可能是「一行」
        const sig = shapeOf(k);
        const arr = groups.get(sig);
        if (arr) arr.push(k);
        else groups.set(sig, [k]);
      }
      for (const rows of groups.values()) {
        if (rows.length < 3) continue;
        const count = new Map<string, { n: number; mark: UINode }>();
        for (const r of rows) {
          for (const [key, mark] of markersOf(r)) {
            const cur = count.get(key);
            if (cur) cur.n += 1;
            else count.set(key, { n: 1, mark });
          }
        }
        for (const [key, { n, mark }] of count) {
          if (n < 3) continue;
          hits.push({
            bugId: stateCollapse.id,
            severity: 'bug',
            page: page.name,
            path: `${path}/${mark.name || '选中标记'}`,
            nodeId: mark.id,
            detail: `${rows.length} 行同构列表里有 ${n} 行各带一个「${resolve(mark) ?? key}」图标，选中项无法区分`,
            meta: { rows: rows.length, marked: n, icon: resolve(mark) ?? key },
          });
        }
      }
    }
    return hits;
  },
};

/* =============================================================
 * K. 模板占位符漏进产物（`{{title}}` 没被展开）
 * ============================================================= */

/**
 * 判据：TEXT/BUTTON 的文案里还带 `{{...}}`。
 *
 * **零误报**：`{{xxx}}` 只可能是 `repeat` 的模板占位符，展开后必然被替换；
 * 没被替换只有两种原因 —— ① 写了 `{{title}}` 却没写 `repeat`（占位符没人喂）；
 * ② `repeat` 的 `values` 里没有这个键。两种都是确定的错，界面上会直接显示 `{{title}}`。
 *
 * **这条是预防性的，不是实测出来的**：45 场景 3 批样本里 0 命中（模型确实会忘写 `repeat`，
 * 但忘写时通常连 `{{}}` 也不写）。留着它的理由只有一条 —— 判据是恒真的逻辑等式，
 * 加进来零风险；哪天真漏了，界面会直接印出 `{{title}}`，而像素比对查不出
 * （产物与设计一致），AST 字段扫描也查不出（字段全都合法）。
 */
const templateLeak: BugDetector = {
  id: 'template-leak',
  title: '模板占位符漏进产物（{{…}} 未展开）',
  severity: 'bug',
  rationale: '{{xxx}} 是 repeat 的模板占位符，出现在产物文案里说明 repeat 或 values 漏了',
  check(page) {
    const hits: BugHit[] = [];
    for (const { node, path } of walk(page)) {
      if (!hasText(node)) continue;
      const m = node.text.match(/\{\{\s*([A-Za-z_][\w-]*)\s*\}\}/);
      if (!m) continue;
      hits.push({
        bugId: templateLeak.id,
        severity: 'bug',
        page: page.name,
        path,
        nodeId: node.id,
        detail: `文案里残留占位符「${m[0]}」——没有 repeat，或 values 里没有键 ${m[1]}`,
        meta: { key: m[1] },
      });
    }
    return hits;
  },
};

/* =============================================================
 * 注册表
 * ============================================================= */

export const BUG_DETECTORS: BugDetector[] = [
  badgeInline,
  vectorRatio,
  emptyFrame,
  absNoSize,
  fixedOcclude,
  sameColor,
  gapScatter,
  flatHierarchy,
  textClip,
  stateCollapse,
  templateLeak,
];

export function detectorById(id: string): BugDetector | undefined {
  return BUG_DETECTORS.find((d) => d.id === id);
}
