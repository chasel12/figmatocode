/**
 * fixture 工厂：规则表的「分母」。
 *
 * 每条规则必须声明 `pass[]` 与 `fail[]`（名字），名字在这里解析成真实的 `RuleContext`。
 * **为什么用名字而不是内联对象**：变异测试要把同一个 fixture 在「空实现」下重跑，
 * 名字让「同一个反例」有唯一身份，也让报告能直接指出「哪条 fixture 没红」。
 *
 * 纪律：fixture 必须**最小**——一个 fixture 只制造一条违规。多个违规混在一个页面里，
 * 断言就只能数总数，抓不住「规则命中错位置」。
 */
import { createNode, createPage } from '../schema/factory';
import { isContainer } from '../schema/types';
import type {
  ButtonNode,
  ContainerNode,
  ImageNode,
  NodeKind,
  StyleSchema,
  TextNode,
  UINode,
  UIPage,
} from '../schema/types';
import { buildContext } from './context';
import type { Platform, RuleContext, SiteContext } from './types';

interface Spec {
  kind: NodeKind;
  name?: string;
  style?: StyleSchema;
  layout?: Record<string, unknown>;
  text?: string;
  src?: string;
  alt?: string;
  children?: Spec[];
  interactions?: UINode['interactions'];
}

function mk(spec: Spec): UINode {
  const node = createNode(spec.kind, spec.name ? { name: spec.name } : {});
  if (spec.style) node.style = { ...(node.style ?? {}), ...spec.style };
  if (spec.layout) node.layout = { ...node.layout, ...(spec.layout as object) } as UINode['layout'];
  if (spec.text != null) (node as TextNode | ButtonNode).text = spec.text;
  if (spec.src != null) (node as ImageNode).src = spec.src;
  if (spec.alt != null) (node as ImageNode).alt = spec.alt;
  if (spec.interactions) node.interactions = spec.interactions;
  if (spec.children && isContainer(node)) (node as ContainerNode).children = spec.children.map(mk);
  return node;
}

/** 造一页；根容器默认白底（`generateHtml` 的缺省） */
export function fixturePage(children: Spec[], rootStyle?: StyleSchema): UIPage {
  const page = createPage('fixture', 375, 812);
  if (rootStyle) page.root.style = { ...(page.root.style ?? {}), ...rootStyle };
  page.root.children = children.map(mk);
  return page;
}

function ctxOf(page: UIPage, opts: { platform?: Platform; site?: SiteContext; css?: string } = {}): RuleContext {
  return buildContext(page, opts);
}

const WHITE = '#FFFFFF';
/** 造一个「白底 + 一段文字」的最小页 */
function textPage(text: string, style: StyleSchema = {}, opts: { platform?: Platform; bg?: string } = {}): RuleContext {
  const page = fixturePage(
    [{ kind: 'TEXT', text, style: { fontSize: 14, color: '#333333', ...style }, layout: { widthMode: 'HUG', heightMode: 'HUG' } }],
    opts.bg ? { background: opts.bg } : undefined,
  );
  return ctxOf(page, { platform: opts.platform });
}

const CLICK = [{ id: 'it-1', trigger: 'ON_CLICK' as const, action: 'NAVIGATE' as const, targetId: 'p-2' }];

/**
 * fixture 表。键名规则：`<规则简称>-<pass|fail>[-细节]`。
 * 新增规则时必须同时新增 pass 与 fail，否则 `standards-registry` 自检测试会红。
 */
export const FIXTURES: Record<string, () => RuleContext> = {
  /* ---------- D1 对比度（C1 分级） ---------- */
  // #333 on #FFF = 12.63:1
  'contrast-pass-body': () => textPage('商品详情'),
  // #999 on #FFF = 2.85:1 < 4.5
  'contrast-fail-body': () => textPage('商品详情', { color: '#999999' }),
  // #8c8c8c on #FFF = 3.36:1，24px 大字门槛 3.0 → 过
  'contrast-pass-large': () => textPage('今日推荐', { color: '#8c8c8c', fontSize: 24 }),
  // #b0b0b0 on #FFF = 2.17:1，24px 大字 3.0 → 挂
  'contrast-fail-large': () => textPage('今日推荐', { color: '#b0b0b0', fontSize: 24 }),
  // 19px/700 属大字（≥18.66 bold），#767676 = 4.54 → 过
  'contrast-pass-bold-large': () => textPage('立即购买', { color: '#767676', fontSize: 19, fontWeight: 700 }),
  // 占位符文本降级为 warn（C1「占位符文本降 warn」）
  'contrast-warn-placeholder': () => textPage('请输入手机号', { color: '#999999' }),
  // 渐变背景 → 不可判定，必须跳过而不是报 1:1
  'contrast-skip-gradient': () => {
    const page = fixturePage(
      [{ kind: 'TEXT', text: '限时秒杀', style: { fontSize: 14, color: '#999999' }, layout: { widthMode: 'HUG', heightMode: 'HUG' } }],
      {
        fills: [
          {
            type: 'GRADIENT_LINEAR',
            angle: 90,
            stops: [
              { position: 0, color: '#FF6600' },
              { position: 1, color: '#FFAA00' },
            ],
          },
        ],
      },
    );
    return ctxOf(page);
  },
  // 整体降透明度（禁用视觉）→ 豁免
  'contrast-skip-disabled': () => textPage('已售罄', { color: '#cccccc', opacity: 0.4 }),

  /* ---------- D1 图片替代文本（WCAG 1.1.1） ---------- */
  'alt-pass': () => {
    const page = fixturePage([
      { kind: 'IMAGE', name: '商品主图', src: 'data:image/png;base64,AA', alt: '芒果干包装正面' },
    ]);
    return ctxOf(page);
  },
  'alt-fail': () => {
    const page = fixturePage([{ kind: 'IMAGE', name: '商品主图', src: 'data:image/png;base64,AA' }]);
    return ctxOf(page);
  },

  /* ---------- D1 目标尺寸（WCAG 2.5.8，24×24） ---------- */
  'target-pass': () => {
    const page = fixturePage([
      { kind: 'BUTTON', text: '去结算', layout: { widthMode: 'FIXED', heightMode: 'FIXED', width: 120, height: 44 }, interactions: CLICK },
    ]);
    return ctxOf(page);
  },
  'target-fail': () => {
    // 22×18：实测底栏图标热区的形态（`docs` 导航热区那次的数字）
    const page = fixturePage([
      { kind: 'BUTTON', text: '分类', layout: { widthMode: 'FIXED', heightMode: 'FIXED', width: 22, height: 18 }, interactions: CLICK },
    ]);
    return ctxOf(page);
  },

  /* ---------- D2 交互态（C8 按端分流） ---------- */
  'state-pass-h5': () => {
    const page = fixturePage([
      { kind: 'BUTTON', text: '去结算', style: { states: { hover: { background: '#E85D04' } } } },
    ]);
    return ctxOf(page, { platform: 'h5' });
  },
  'state-fail-h5': () => {
    const page = fixturePage([{ kind: 'BUTTON', text: '去结算' }]);
    return ctxOf(page, { platform: 'h5' });
  },
  'state-pass-mini': () => {
    const page = fixturePage([
      { kind: 'BUTTON', text: '去结算', style: { states: { active: { background: '#E85D04' } } } },
    ]);
    return ctxOf(page, { platform: 'mini' });
  },
  'state-fail-mini': () => {
    const page = fixturePage([{ kind: 'BUTTON', text: '去结算' }]);
    return ctxOf(page, { platform: 'mini' });
  },

  /* ---------- D2 焦点必须改变视觉属性（C14） ---------- */
  'focus-pass': () => {
    const page = fixturePage([
      { kind: 'BUTTON', text: '去结算', style: { states: { focus: { background: '#FFF1E6' } } } },
    ]);
    return ctxOf(page);
  },
  'focus-fail': () => {
    // focus 态写了，但和基础样式一模一样 → 等于没写
    const page = fixturePage([
      { kind: 'BUTTON', text: '去结算', style: { background: '#FF6600', states: { focus: { background: '#FF6600' } } } },
    ]);
    return ctxOf(page);
  },

  /* ---------- D3 中英文空格（C2 白名单） ---------- */
  'cjk-space-pass': () => textPage('已在 3 个页面中使用'),
  'cjk-space-pass-unit': () => textPage('剩余 10MB 空间'),
  'cjk-space-fail': () => textPage('使用iPhone打开'),

  /* ---------- D3 全角标点 ---------- */
  'cjk-punct-pass': () => textPage('价格：29 元，包邮'),
  'cjk-punct-fail': () => textPage('价格:29 元,包邮'),

  /* ---------- D3 省略号（C3 按语言分流） ---------- */
  'cjk-ellipsis-pass': () => textPage('加载中……'),
  'cjk-ellipsis-fail': () => textPage('加载中...'),

  /* ---------- D4 同页近似色聚类（C7） ---------- */
  'drift-pass': () => {
    const page = fixturePage([
      { kind: 'RECTANGLE', style: { background: '#FF6600' } },
      { kind: 'RECTANGLE', style: { background: '#333333' } },
      { kind: 'RECTANGLE', style: { background: '#FFFFFF' } },
    ]);
    return ctxOf(page);
  },
  'drift-fail': () => {
    // 8 个 ΔE<3 的近灰：肉眼分不出，说明是「随手调出来的色」
    const greys = ['#808080', '#818181', '#828282', '#838383', '#848484', '#858585', '#868686', '#878787'];
    const page = fixturePage(greys.map((g) => ({ kind: 'RECTANGLE', style: { background: g } })));
    return ctxOf(page);
  },

  /* ---------- D5 动效（C15：禁 transition: all） ---------- */
  'motion-pass': () => {
    const page = fixturePage([{ kind: 'RECTANGLE', style: { background: '#FF6600' } }]);
    return ctxOf(page, { css: '.a{transition:transform .2s ease;}' });
  },
  'motion-fail': () => {
    const page = fixturePage([{ kind: 'RECTANGLE', style: { background: '#FF6600' } }]);
    return ctxOf(page, { css: '.a{transition:all .2s ease;}' });
  },

  /* ---------- D6 小程序字号下限（C11） ---------- */
  'minfont-pass': () => textPage('规格', { fontSize: 12 }, { platform: 'mini' }),
  'minfont-fail': () => textPage('规格', { fontSize: 10 }, { platform: 'mini' }),

  /* ---------- D7 页面标题（SEO 15% 维度） ---------- */
  'seo-pass': () => {
    const page = createPage('商品详情', 375, 812);
    return ctxOf(page, { site: { pageNames: ['首页', '分类', '商品详情'], sitewide: true } });
  },
  'seo-fail-dup': () => {
    const page = createPage('首页', 375, 812);
    return ctxOf(page, { site: { pageNames: ['首页', '分类', '首页'], sitewide: true } });
  },
  'seo-fail-long': () => {
    // 35 字：超过中文标题 30 字的经验上限
    const long = '零食小铺品牌官方旗舰店首页推荐商品列表页面含限时秒杀与新人专享券领取入口';
    const page = createPage(long, 375, 812);
    return ctxOf(page, { site: { pageNames: [long], sitewide: true } });
  },
};

/** 按名字解析 fixture；名字不存在直接抛错（**不要静默跳过**，那是分母缩水） */
export function fixture(name: string): RuleContext {
  const f = FIXTURES[name];
  if (!f) throw new Error(`fixture 不存在：${name}`);
  return f();
}

export function fixturesOf(names: string[]): RuleContext[] {
  return names.map(fixture);
}

export const WHITE_BG = WHITE;
