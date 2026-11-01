/**
 * 场景期望（`scenarios.ts` 的 `expect`）的**机器可判**部分
 *
 * 为什么单独一个文件：`expect` 是写给人看的自然语言（「三格等高」「箭头在最右」），
 * 机器判不了；能判的是其中可量化那部分。这里把它拆成一套小原语，
 * 每个场景挂 2~4 条 —— **判不了的不硬判**，那部分交给截图人工看。
 *
 * 判据只吃 `UIPage`（不读 CSS、不起浏览器），所以能在没有渲染环境的地方跑，
 * 也能作为单测的输入。
 *
 * 三条设计约束：
 *  1. **零误报优先**：宁可漏判，不可误判。误报会让人不再看报告（`docs/` 里已有两次教训）。
 *     所以 `texts` 默认「至少命中 min 条」，而不是「必须全中」——模型换个近义词不该判死。
 *  2. **只判「该有的有没有」**，不判「好不好看」：好看没有客观判据。
 *  3. **默认值兜底也算 bug**：`BUTTON` 文案是「按钮」、`TEXT` 是「文本」时，
 *     说明模型漏写 `text`，转换层填了默认值 —— 那是**确定**的错，直接判红。
 */
import type { UINode, UIPage } from '../../schema/types';

export type ScenarioCheck =
  /** 产物文案里至少出现 min 条（默认全部） */
  | { t: 'texts'; any: string[]; min?: number }
  /** 文本节点数 ≥ n */
  | { t: 'textCount'; min: number }
  /** 节点总数区间 */
  | { t: 'nodeCount'; min: number; max?: number }
  /** 某类型节点数区间 */
  | { t: 'count'; type: UINode['type']; min: number; max?: number }
  /** 存在 n 个以上指定定位方式的节点（FIXED / ABSOLUTE） */
  | { t: 'positioned'; kind: 'FIXED' | 'ABSOLUTE'; min?: number }
  /** 互不相同的图标路径数 ≥ n（repeat 的 values 没给 → N 份同一个图标） */
  | { t: 'distinctIcons'; min: number }
  /** 互不相同的文案数 ≥ n */
  | { t: 'distinctTexts'; min: number }
  /** 所有节点宽度 ≤ n（横向溢出） */
  | { t: 'maxWidth'; max: number }
  /** 没有重复过多的长文案（repeat values 塌陷成同一句） */
  | { t: 'noDupText' }
  /** 没有泛称/占位文案漏进产物（「列表标题占位」「示例文本」这类） */
  | { t: 'noPlaceholderText' };

export interface CheckResult {
  pass: boolean;
  /** 人话说明（失败时写清差在哪） */
  detail: string;
  check: ScenarioCheck;
}

interface NodeInfo {
  type: UINode['type'];
  text: string;
  width: number;
  position?: string;
  vectorD?: string;
}

function flatten(page: UIPage): NodeInfo[] {
  const out: NodeInfo[] = [];
  const visit = (n: UINode): void => {
    out.push({
      type: n.type,
      text: typeof (n as { text?: string }).text === 'string' ? ((n as { text?: string }).text as string).trim() : '',
      width: n.layout.width ?? 0,
      position: n.layout.position,
      vectorD: (n as { vector?: { d?: string } }).vector?.d,
    });
    for (const c of (n as { children?: UINode[] }).children ?? []) visit(c);
  };
  visit(page.root);
  return out;
}

/** 转换层的兜底文案：出现即说明模型漏写 `text` */
const DEFAULT_TEXTS = new Set(['按钮', '文本']);

/**
 * 每张卡都出现一次的**界面文案**，不算「内容塌陷」。
 *
 * `card-hscroll` 5 张卡各有一个「查看详情」是**正确的**——不排掉就会把好产物判成坏产物。
 * 只排固定词表，商品名/标题这类内容词重复 >3 次仍然判红。
 */
const UI_WORDS = new Set([
  '加入购物车', '立即购买', '查看详情', '去结算', '立即领取', '确认收货', '再次购买',
  '提醒发货', '去支付', '查看物流', '重新加载', '查看订单', '确定', '取消', '删除', '编辑', '分享', '更多',
]);

export function runChecks(page: UIPage, checks: ScenarioCheck[]): CheckResult[] {
  const nodes = flatten(page);
  const texts = nodes.map((n) => n.text).filter(Boolean);

  return checks.map((check): CheckResult => {
    switch (check.t) {
      case 'texts': {
        const want = check.min ?? check.any.length;
        const hit = check.any.filter((w) => texts.some((t) => t.includes(w)));
        return {
          pass: hit.length >= want,
          detail: `${hit.length}/${check.any.length} 命中（要求 ≥${want}）${hit.length < check.any.length ? `；缺 ${check.any.filter((w) => !hit.includes(w)).join('、')}` : ''}`,
          check,
        };
      }
      case 'textCount':
        return { pass: texts.length >= check.min, detail: `${texts.length} 段文字（要求 ≥${check.min}）`, check };
      case 'nodeCount': {
        const ok = nodes.length >= check.min && (check.max == null || nodes.length <= check.max);
        return { pass: ok, detail: `${nodes.length} 节点（要求 ${check.min}~${check.max ?? '∞'}）`, check };
      }
      case 'count': {
        const n = nodes.filter((x) => x.type === check.type).length;
        const ok = n >= check.min && (check.max == null || n <= check.max);
        return { pass: ok, detail: `${n} 个 ${check.type}（要求 ${check.min}~${check.max ?? '∞'}）`, check };
      }
      case 'positioned': {
        const n = nodes.filter((x) => x.position === check.kind).length;
        const want = check.min ?? 1;
        return { pass: n >= want, detail: `${n} 个 ${check.kind}（要求 ≥${want}）`, check };
      }
      case 'distinctIcons': {
        const set = new Set(nodes.map((x) => x.vectorD).filter((d): d is string => Boolean(d)));
        return { pass: set.size >= check.min, detail: `${set.size} 个不同图标（要求 ≥${check.min}）`, check };
      }
      case 'distinctTexts': {
        const set = new Set(texts);
        return { pass: set.size >= check.min, detail: `${set.size} 段不同文案（要求 ≥${check.min}）`, check };
      }
      case 'maxWidth': {
        const worst = nodes.reduce((m, x) => Math.max(m, x.width), 0);
        return { pass: worst <= check.max, detail: `最宽节点 ${Math.round(worst)}px（上限 ${check.max}）`, check };
      }
      case 'noPlaceholderText': {
        /**
         * 泛称漏进产物是**确定**的错，不是风格问题。
         *
         * 实测来源：`btn-fab` 的提示词写「页面主体是列表占位」，模型把「列表占位」
         * 当成了文案直接写进 TEXT，于是界面上出现 6 行「列表标题占位」。
         * 转换层无法区分「这是内容」还是「这是占位符」，所以只能在这里判。
         */
        /**
         * `\{\{` 也算：模板占位符漏进产物是**确定**的错（`repeat` 漏了或 values 少键），
         * 界面上会直接印出 `{{title}}`。与 `bugscan` 的 `template-leak` 同口径 ——
         * 那一层管存量页面，这一层管场景校验，两处都不该放过。
         */
        const hits = texts.filter((t) => /占位|示例文本|项目标题|正文内容|这里放|标题文字|\{\{/.test(t));
        return {
          pass: hits.length === 0,
          detail: hits.length ? `${hits.length} 处泛称文案：${[...new Set(hits)].slice(0, 3).join('、')}` : '无泛称文案',
          check,
        };
      }
      case 'noDupText': {
        const counts = new Map<string, number>();
        for (const t of texts) if (t.length >= 4 && !DEFAULT_TEXTS.has(t) && !UI_WORDS.has(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
        const worst = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
        const ok = !worst || worst[1] <= 3;
        return { pass: ok, detail: ok ? '无重复塌陷' : `「${worst[0]}」重复 ${worst[1]} 次（>3 说明 repeat 的 values 只给了一条）`, check };
      }
      default:
        return { pass: false, detail: '未知判据', check };
    }
  });
}

/** 所有场景都适用的底线（不含任何设计判断） */
export const BASE_CHECKS: ScenarioCheck[] = [
  { t: 'nodeCount', min: 6 },
  { t: 'noDupText' },
  { t: 'noPlaceholderText' },
  { t: 'maxWidth', max: 375 },
];

/**
 * 场景专属判据。键 = `UiScenario.id`。
 *
 * 只写「提示词里明确给了字面量 / 数量」的期望；`expect` 里那些
 * 「三格等高」「箭头在最右」属于视觉判断，机器不判（见文件头约束 1）。
 */
export const SCENARIO_CHECKS: Record<string, ScenarioCheck[]> = {
  'nav-tabbar': [
    { t: 'texts', any: ['首页', '分类', '购物车', '消息', '我的'] },
    { t: 'positioned', kind: 'FIXED' },
    { t: 'count', type: 'IMAGE', min: 3 },
  ],
  'nav-header': [{ t: 'texts', any: ['订单详情', '更多'] }],
  'nav-badge-icon': [
    { t: 'texts', any: ['消息'] },
    { t: 'positioned', kind: 'ABSOLUTE' },
    { t: 'count', type: 'VECTOR', min: 4 },
  ],
  'nav-segmented': [{ t: 'texts', any: ['全部', '待付款', '已完成'] }],
  'nav-breadcrumb': [
    { t: 'texts', any: ['首页', '女装', '连衣裙', '夏季新款'] },
    { t: 'distinctTexts', min: 6 },
  ],
  'card-product': [
    { t: 'texts', any: ['加入购物车'] },
    { t: 'count', type: 'IMAGE', min: 3 },
  ],
  'card-grid': [
    { t: 'count', type: 'IMAGE', min: 6 },
    { t: 'nodeCount', min: 20 },
  ],
  'card-hscroll': [
    { t: 'nodeCount', min: 20 },
    { t: 'maxWidth', max: 375 },
  ],
  'card-media': [{ t: 'count', type: 'IMAGE', min: 4 }],
  'card-badge': [{ t: 'texts', any: ['限时'] }],
  'list-setting': [
    { t: 'textCount', min: 8 },
    { t: 'count', type: 'VECTOR', min: 5 },
  ],
  'list-order': [
    { t: 'texts', any: ['待付款', '待发货', '待收货', '已完成'], min: 3 },
    { t: 'texts', any: ['去支付', '提醒发货', '确认收货', '再次购买'], min: 3 },
  ],
  'list-message': [{ t: 'textCount', min: 8 }],
  'list-grouped': [{ t: 'textCount', min: 8 }],
  'list-divider': [{ t: 'textCount', min: 8 }],
  'form-input': [
    { t: 'texts', any: ['手机号'] },
    { t: 'nodeCount', min: 10 },
  ],
  'form-search': [
    { t: 'texts', any: ['搜索商品'] },
    { t: 'count', type: 'VECTOR', min: 1 },
  ],
  'form-switch': [{ t: 'textCount', min: 4 }],
  'form-checkbox': [{ t: 'textCount', min: 6 }],
  'form-slider': [{ t: 'textCount', min: 3 }],
  'form-stepper': [{ t: 'texts', any: ['1'] }],
  'form-select': [{ t: 'textCount', min: 6 }],
  'btn-variants': [{ t: 'count', type: 'BUTTON', min: 3 }],
  'btn-group': [
    { t: 'texts', any: ['加入购物车', '立即购买'] },
    { t: 'positioned', kind: 'FIXED' },
  ],
  'btn-fab': [{ t: 'positioned', kind: 'ABSOLUTE' }],
  'btn-icon': [
    { t: 'count', type: 'VECTOR', min: 5 },
    { t: 'distinctIcons', min: 5 },
  ],
  'state-empty': [{ t: 'texts', any: ['还没有收藏的商品', '去逛逛发现好物', '去首页'] }],
  'state-skeleton': [{ t: 'nodeCount', min: 10 }],
  'state-error': [{ t: 'texts', any: ['加载失败', '重新加载'] }],
  'state-success': [{ t: 'texts', any: ['支付成功', '查看订单'] }],
  'data-price': [
    { t: 'texts', any: ['¥128.00', '¥198.00'], min: 1 },
    { t: 'distinctTexts', min: 4 },
  ],
  'data-rating': [
    { t: 'texts', any: ['4.8'] },
    { t: 'count', type: 'VECTOR', min: 5 },
  ],
  'data-progress': [{ t: 'texts', any: ['60%'] }],
  'data-stat': [{ t: 'textCount', min: 6 }],
  'data-timeline': [{ t: 'textCount', min: 8 }],
  'overlay-sheet': [
    { t: 'texts', any: ['选择规格', '确定'] },
    { t: 'positioned', kind: 'ABSOLUTE' },
  ],
  'overlay-modal': [{ t: 'texts', any: ['确认删除', '取消', '删除'] }],
  'overlay-toast': [{ t: 'texts', any: ['已加入购物车'] }],
  'overlay-tooltip': [{ t: 'texts', any: ['点击查看使用指南'] }],
  'overlay-menu': [{ t: 'texts', any: ['更多', '编辑', '分享', '删除'], min: 3 }],
  'layout-hero': [{ t: 'count', type: 'IMAGE', min: 1 }],
  'layout-split': [{ t: 'textCount', min: 9 }],
  'layout-masonry': [{ t: 'nodeCount', min: 20 }],
  'layout-carousel': [{ t: 'count', type: 'IMAGE', min: 3 }],
  'layout-actionbar': [
    { t: 'texts', any: ['加入购物车', '立即购买'] },
    { t: 'positioned', kind: 'FIXED' },
  ],
};
