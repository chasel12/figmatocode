/**
 * 出码侧的导航投影：`node.interactions`（画布原型连线）→ 各端的点击跳转。
 *
 * ## 为什么需要这个文件
 *
 * `interactions` 此前是「字段在、通道不在」的第 7 例：
 *   - schema 里定义完整（`PrototypeInteraction`，10 种 trigger × 8 种 action）；
 *   - 画布上能连线、属性面板能改；
 *   - **HTML 原型出口**（`generator/prototype.ts` + `runtime.js`）能点，同文档切 section；
 *   - **四个工程出口（react / vue / taro / uniapp）一个都没消费**。
 *
 * 后果是导出的工程里所有按钮、底栏、卡片入口全是死图：点「分类」没反应。
 * 而违例机制抓不到它——产物 schema 合法、构建通过、像素 100%（点击不改渲染），
 * 只有人真的去点才发现。这正是 MEMORY 里那条「假绿比假红更危险」的形态。
 *
 * ## 分工
 *
 * 本文件只负责**算目标**（页面 id → 各端可用的路径形态）与**选跳转方式**；
 * 「发射成什么代码」留在各自的 emitter 里（JSX 的 onClick、模板的 @tap / @click）。
 *
 * ## 为什么不是所有 interactions 都发射
 *
 * 只处理 `trigger: ON_CLICK` + `action: NAVIGATE`。其余动作（BACK / OPEN_OVERLAY /
 * CHANGE_TO / SCROLL）在各端语义差异太大，硬映射只会产出「编得过但行为错」的代码。
 * 宁可先不发射，也不要在产物里留一个假实现的跳转——那比没有更糟。
 */
import type { UINode, UIPage } from '../schema/types';
import { isContainer } from '../schema/types';
import { pagePathOf } from './emit-context';

/** 一个可跳转目标 */
export interface NavRoute {
  pageId: string;
  /** 不带前导斜杠的页面路径，如 `pages/02-category`（与 `pagePathOf` 同口径） */
  path: string;
  /** 页面名（产物注释与可读性用） */
  name: string;
}

export type RouteTable = Record<string, NavRoute>;

/** 页面间导航图：路由表 + 双向互链对 + 点击热区归属 */
export interface NavGraph {
  routes: RouteTable;
  /** 双向互链对，键 `a>b`（两个方向都写入）。见 `isPeerNav` 的用途说明 */
  peers: Set<string>;
  /**
   * 「应当绑点击事件的节点 id」→ 目标页面 id。
   *
   * 键集合**不等于**「带 interactions 的节点集合」：`liftHitAreas` 会把文字上的跳转
   * 上提到它所在的整格容器，上提后文字自己不再出现在这里。详见 `liftHitAreas`。
   */
  hitAreas: Map<string, string>;
}

/** 跳转方式：平级导航用 reLaunch（清栈），其余用 navigateTo（可返回） */
export type NavMode = 'navigateTo' | 'reLaunch';

function walk(root: UINode, visit: (n: UINode) => void): void {
  visit(root);
  if (isContainer(root)) (root as { children: UINode[] }).children.forEach((c) => walk(c, visit));
}

/** 该节点是否声明了「点击跳页」 */
function navTargetIdOf(node: UINode): string | null {
  for (const it of node.interactions ?? []) {
    if (it.trigger !== 'ON_CLICK' || it.action !== 'NAVIGATE') continue;
    if (it.targetId) return it.targetId;
  }
  return null;
}

/**
 * 子树内所有「点击跳页」目标的集合（带 memo，O(n)）。
 *
 * 用来判断「能不能把交互上提到某个祖先」：祖先子树里目标唯一时上提不会串味，
 * 出现第二个不同目标就说明这个祖先里有多个可点区域，必须停下。
 */
function subtreeTargets(node: UINode, memo: Map<string, Set<string>>): Set<string> {
  const cached = memo.get(node.id);
  if (cached) return cached;
  const set = new Set<string>();
  const self = navTargetIdOf(node);
  if (self) set.add(self);
  if (isContainer(node)) {
    for (const child of (node as { children: UINode[] }).children) {
      for (const t of subtreeTargets(child, memo)) set.add(t);
    }
  }
  memo.set(node.id, set);
  return set;
}

/** 只包一组原子节点的容器（子节点里没有容器）—— 即「一格」而不是「一排」 */
function isLeafContainer(node: UINode): boolean {
  if (!isContainer(node)) return false;
  const kids = (node as { children: UINode[] }).children;
  return kids.length > 0 && kids.every((c) => !isContainer(c));
}

/**
 * 交互热区上提：把「文字上的跳转」提到它所在的那一格容器上。
 *
 * ## 为什么必须上提
 *
 * 模型/`wireNavigation` 习惯把 `interactions` 写在**文字节点**上。产物里于是变成
 * `<Text className="text-31" onClick={...}>分类</Text>` —— 可点区域只有 24×14 的字，
 * 而用户点的是 90×50 的整格（图标 + 文字 + 留白）。
 *
 * 结果就是「底栏切换不了」：点图标没反应、点格子空白没反应，只有精确点在两个字上才行。
 * 这一层门禁永远抓不到——像素不变、schema 合法、构建通过，连 e2e 都容易漏
 * （按文字定位点击 = 精确命中文字，天然绕过热区问题）。
 *
 * ## 判据
 *
 * 自底向上爬，同时满足才上提：
 *   1. 祖先不是页面根（否则整页可点）；
 *   2. 祖先子树内「点击跳页」目标**唯一**（多个不同目标 = 这一层里有好几块可点区域）；
 *   3. 祖先是**叶子容器**（子节点全是原子节点）—— 保证上提的是「一格」，
 *      而不是「一排 tab」或整个页面。
 *
 * 对底栏：`TEXT 分类` → 父 `FRAME 导航-分类`（子节点只有文字，目标唯一）✓ 停在这里；
 * 再往上的 `FRAME 底部导航` 子节点是三个 FRAME（不是叶子容器）、且有三个不同目标 ✗ 停。
 *
 * ## 已知边界（第 3 条偏保守）
 *
 * 对「卡片 = 图片 + 信息区」这种结构，`信息区` 是叶子容器、`卡片` 的子节点含容器，
 * 所以跳转只提到 `信息区`——点图片区仍然不跳。
 *
 * 为什么不再激进：去掉第 3 条就只剩「目标唯一」，而**只有单个跳转的页面**（详情页的
 * 「加入购物车」）会一路提到 root 的下一层，等于整页可点。要安全地覆盖卡片场景，
 * 需要节点的实际几何尺寸来卡「热区不超过视口 60%」，但 HUG/FILL 节点的 `layout.width`
 * 是 undefined，拿不到可信面积。**宁可热区偏小，也不要整页变可点**——后者会让
 * 「点哪里都跳」变成更难查的缺陷。
 *
 * 返回值覆盖**所有**会被绑定的节点：未上提的节点键就是它自己。
 */
export function liftHitAreas(pages: UIPage[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const page of pages) {
    const memo = new Map<string, Set<string>>();
    const parentOf = new Map<string, UINode>();
    walk(page.root, (n) => {
      if (isContainer(n)) {
        for (const c of (n as { children: UINode[] }).children) parentOf.set(c.id, n);
      }
    });

    walk(page.root, (n) => {
      const target = navTargetIdOf(n);
      if (!target) return;
      let owner = n;
      let cur = parentOf.get(n.id);
      while (cur && cur.id !== page.root.id) {
        if (subtreeTargets(cur, memo).size !== 1) break;
        if (!isLeafContainer(cur)) break;
        owner = cur;
        cur = parentOf.get(cur.id);
      }
      // 同一 owner 只可能有一个目标（上面 size===1 已保证），重复写入无害
      out.set(owner.id, target);
    });
  }
  return out;
}

/**
 * 建导航图。
 *
 * `peers`（双向互链）用来区分「底栏切换」与「进入下一页」：
 * 底栏的几项**互相**都连着（首页↔分类↔购物车），而卡片进详情是单向的。
 *
 * 为什么必须区分：小程序的页面栈上限是 10 层，`navigateTo` 每次压栈。
 * 用户连点底栏 10 次之后，**所有** `navigateTo` 静默失败——症状又是「点了没反应」，
 * 而且这时候连正常入口也一起坏了，比一开始就不跳更难查。
 */
export function buildNavGraph(pages: UIPage[]): NavGraph {
  const routes: RouteTable = {};
  pages.forEach((p, i) => {
    routes[p.id] = { pageId: p.id, path: pagePathOf(p, i), name: p.name ?? '' };
  });

  /** from → to 的有向边集合（只记「目标页存在」的边） */
  const edges = new Map<string, Set<string>>();
  for (const page of pages) {
    const out = new Set<string>();
    walk(page.root, (n) => {
      const tid = navTargetIdOf(n);
      if (tid && tid !== page.id && routes[tid]) out.add(tid);
    });
    edges.set(page.id, out);
  }

  const peers = new Set<string>();
  for (const [from, tos] of edges) {
    for (const to of tos) {
      if (edges.get(to)?.has(from)) {
        peers.add(`${from}>${to}`);
        peers.add(`${to}>${from}`);
      }
    }
  }
  return { routes, peers, hitAreas: liftHitAreas(pages) };
}

/**
 * 节点 → 跳转目标。
 *
 * 只查 `hitAreas`，**不再回退读 `node.interactions`**：上提之后文字节点不该再绑，
 * 回退会让文字和整格各绑一次（H5 上冒泡触发两次、小程序上嵌套 bindtap）。
 * `hitAreas` 已覆盖所有会被绑定的节点（含未上提的），所以不会漏。
 */
export function navTargetOf(node: UINode, graph: NavGraph | undefined): NavRoute | null {
  if (!graph) return null;
  const tid = graph.hitAreas.get(node.id);
  if (!tid) return null;
  return graph.routes[tid] ?? null;
}

/** 两页是否双向互链（平级导航项） */
export function isPeerNav(graph: NavGraph | undefined, fromPageId: string, toPageId: string): boolean {
  return graph?.peers.has(`${fromPageId}>${toPageId}`) ?? false;
}

/** 该页是否有任何会被发射的跳转（决定要不要注入 script 块） */
export function pageHasNavigation(page: UIPage, graph: NavGraph | undefined): boolean {
  if (!graph) return false;
  let found = false;
  walk(page.root, (n) => {
    if (!found && navTargetOf(n, graph)) found = true;
  });
  return found;
}

/**
 * MPA 页面间的相对 href（react / vue 出口用）。
 *
 * 起点是**目录**（`pages/01-home`，页面文件在该目录下的 `index.html`），
 * 所以共同前缀按目录段算，不能先去掉最后一段——那会得到
 * `02-cat/index.html`，被浏览器解析成 `pages/01-home/02-cat/index.html`。
 */
export function relativeHtmlHref(fromPath: string, toPath: string): string {
  const fromSegs = fromPath.split('/').filter(Boolean);
  const toSegs = toPath.split('/').filter(Boolean);
  let i = 0;
  while (i < fromSegs.length && i < toSegs.length - 1 && fromSegs[i] === toSegs[i]) i += 1;
  const ups = fromSegs.length - i;
  return `${'../'.repeat(ups)}${toSegs.slice(i).join('/')}/index.html`;
}
