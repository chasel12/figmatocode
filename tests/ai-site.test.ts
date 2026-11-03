/**
 * P3-3 · 整站多页生成
 *
 * 三个层次分别锁住：
 *  1. **规划闸门**（`checkSitePlan`）：形状合法但语义错的东西必须被拦——重名页、超长页名、
 *     多个入口、页数越界。这四条都不会让程序崩，只会让用户点了没反应，所以只能靠测试拦。
 *  2. **导航串联**（`wireNavigation`）：确定性、严格精确匹配、只给 TEXT/BUTTON 挂、
 *     不重复挂、不给自己挂。这些边界每一条都是「猜错比连不上更糟」的具体化。
 *  3. **整站管线**（`runSiteGeneration`）：用 FakeClient 走完「1 次规划 + N 次生成」，
 *     断言入口页排第一、每页都收到全部导航项、跳转真的连上了。
 *
 * 验收口径（backlog P3-3）：一次生成 3 页且页面间导航可点 —— 最后一个用例用**出码 HTML**
 * 验证「可点」，而不是只看 AST 里有没有 interactions 字段：字段存在但 runtime 找不到目标
 * 是典型的假绿。
 */
import { describe, expect, it } from 'vitest';
import { createPage, resetIdSeq } from '../src/schema/factory';
import type { ButtonNode, ContainerNode, TextNode, UIPage } from '../src/schema/types';
import { getPack } from '../src/tokens/packs';
import { checkSitePlan, SITE_MAX_PAGES, SITE_MIN_PAGES, validateAiOutput } from '../src/editor/ai/contract';
import { installTabBar, runSiteGeneration, stripBadge, wireNavigation, pagePromptOf, hasNavLabel } from '../src/editor/ai/site';
import { projectWithSite } from '../src/editor/ai/aiActions';
import { generatePrototypeProject } from '../src/generator/prototype';
import type { LlmClient, LlmRequest, LlmResult } from '../src/editor/ai/client';
import type { AiSiteDraft, AiPageDraft } from '../src/editor/ai/types';

resetIdSeq(900);

const pack = getPack('shadcn');

/* ---------------- 夹具 ---------------- */

/** 造一页：标题 + 一排导航按钮（文案由参数给） */
function navPage(name: string, labels: string[]): UIPage {
  const page = createPage(name);
  /**
   * `createPage` 的 id 是常量 `'page'`（demo/测试共用基线，改它会推翻 266 页像素基准）。
   * 整站场景里每页 id 必须唯一，否则 `wireNavigation` 会把「跳到别页」判成「跳自己」而全部跳过。
   */
  page.id = `pg-${name}`;
  page.root.id = `pg-${name}`;
  const title = {
    id: `t-${name}`,
    type: 'TEXT' as const,
    name: '标题',
    text: `${name}页`,
    layout: { mode: 'VERTICAL' as const, widthMode: 'FILL' as const, heightMode: 'HUG' as const, padding: [0, 0, 0, 0] as [number, number, number, number], gap: 0 },
    style: { fontSize: 20 },
  };
  page.root.children.push(title as unknown as TextNode);
  const bar = {
    id: `bar-${name}`,
    type: 'FRAME' as const,
    name: '导航栏',
    layout: { mode: 'HORIZONTAL' as const, widthMode: 'FILL' as const, heightMode: 'HUG' as const, padding: [0, 0, 0, 0] as [number, number, number, number], gap: 8 },
    children: labels.map((label, i) => ({
      id: `nav-${name}-${i}`,
      type: 'BUTTON' as const,
      name: label,
      text: label,
      layout: { mode: 'HORIZONTAL' as const, widthMode: 'HUG' as const, heightMode: 'HUG' as const, padding: [8, 12, 8, 12] as [number, number, number, number], gap: 0 },
      style: { fontSize: 12 },
    })),
  };
  page.root.children.push(bar as unknown as ContainerNode);
  return page;
}

const siteDraft = (): AiSiteDraft => ({
  kind: 'site',
  name: '健身打卡',
  pages: [
    { name: '首页', brief: '今日训练卡片 + 本周进度', entry: true },
    { name: '训练', brief: '动作清单，每项带组数次数' },
    { name: '我的', brief: '头像、连续打卡天数、设置项' },
  ],
});

/* ---------------- 1. 规划闸门 ---------------- */

describe('整站规划闸门', () => {
  it('合法规划：schema + 语义都通过', () => {
    const res = validateAiOutput(siteDraft(), { expect: 'site', pack });
    expect(res.ok).toBe(true);
    expect(res.kind).toBe('site');
  });

  it('重名页被拦（导航按名字匹配，重名必然连错）', () => {
    const d = siteDraft();
    d.pages[2].name = '首页';
    const v = checkSitePlan(d);
    expect(v.some((x) => /重复/.test(x.message))).toBe(true);
  });

  it('页名超 8 字被拦（导航栏放不下，模型会自己缩写 → 连不上）', () => {
    const d = siteDraft();
    d.pages[1].name = '训练计划详情列表页';
    const v = checkSitePlan(d);
    expect(v.some((x) => /超过 8 字/.test(x.message))).toBe(true);
  });

  it('两个入口页被拦', () => {
    const d = siteDraft();
    d.pages[1].entry = true;
    const v = checkSitePlan(d);
    expect(v.some((x) => /入口页只能有一个/.test(x.message))).toBe(true);
  });

  it('页数越界被拦（1 页 / 7 页）', () => {
    expect(checkSitePlan({ kind: 'site', name: 'x', pages: [{ name: 'a', brief: 'b' }] }).some((v) => /至少/.test(v.message))).toBe(true);
    const many = Array.from({ length: SITE_MAX_PAGES + 1 }, (_, i) => ({ name: `p${i}`, brief: 'b' }));
    expect(checkSitePlan({ kind: 'site', name: 'x', pages: many }).some((v) => /最多/.test(v.message))).toBe(true);
  });

  it('brief 为空被拦（空 brief 会让单页生成自由发挥，整站风格立刻散掉）', () => {
    const d = siteDraft();
    d.pages[0].brief = '  ';
    expect(checkSitePlan(d).some((v) => /缺少 brief/.test(v.message))).toBe(true);
  });

  it('schema 层：多了节点树字段直接拒（这一轮只规划）', () => {
    const bad = { ...siteDraft(), pages: [{ name: '首页', brief: 'x', root: { kind: 'FRAME' } }] };
    const res = validateAiOutput(bad, { expect: 'site', pack });
    expect(res.ok).toBe(false);
  });

  it('auto 模式能识别 kind=site', () => {
    const res = validateAiOutput(siteDraft(), { expect: 'auto', pack });
    expect(res.kind).toBe('site');
    expect(res.ok).toBe(true);
  });

  it('页数下限常量是 2（少于一页不叫整站）', () => {
    expect(SITE_MIN_PAGES).toBe(2);
  });
});

/* ---------------- 2. 导航串联 ---------------- */

describe('导航串联（确定性）', () => {
  const threePages = (): UIPage[] => [navPage('首页', ['首页', '训练', '我的']), navPage('训练', ['首页', '训练', '我的']), navPage('我的', ['首页', '训练', '我的'])];

  it('按页面名精确匹配，连出 6 条跳转（每页 2 条，不连自己）', () => {
    const pages = threePages();
    const res = wireNavigation(pages);
    expect(res.links).toHaveLength(6);
    // 没有一条指向自己
    for (const l of res.links) expect(l.fromPageId).not.toBe(l.toPageId);
    expect(res.missing).toEqual([]);
  });

  it('跳转目标是页面 id（runtime 按 data-uic-page 找，不是节点 id）', () => {
    const pages = threePages();
    const res = wireNavigation(pages);
    const pageIds = new Set(pages.map((p) => p.id));
    for (const l of res.links) expect(pageIds.has(l.toPageId)).toBe(true);
  });

  it('幂等：跑第二遍要报出同样的链接，不能因为「边已存在」就一条都不报', () => {
    /**
     * 管线里 `wireNavigation` 被调两次（首次串联 → 死页重画 → 再串联）。
     * 早先第二遍会把已有的边直接 `return` 掉、连 `links.push` 一起跳过，
     * 于是调用方拿到的是「只有这一趟新加的」那一小撮，看起来像导航断了。
     * 实测音乐播放器 6 页：实际 3 条出边，报告 0 条，被判成死页。
     */
    const pages = threePages();
    const first = wireNavigation(pages);
    const second = wireNavigation(pages);
    expect(first.links).toHaveLength(6);
    expect(second.links.map((l) => `${l.fromPageId}|${l.toPageName}`).sort()).toEqual(
      first.links.map((l) => `${l.fromPageId}|${l.toPageName}`).sort(),
    );
    // 且不能把 interaction 写重
    const btn = (pages[0].root.children[1] as ContainerNode).children[1] as ButtonNode;
    expect(btn.interactions ?? []).toHaveLength(1);
  });

  it('只给 TEXT/BUTTON 挂：FRAME 包裹层不变成大按钮', () => {
    const pages = threePages();
    wireNavigation(pages);
    const bar = pages[0].root.children[1] as ContainerNode;
    expect(bar.interactions ?? []).toHaveLength(0);
    const btn = bar.children[1] as ButtonNode;
    expect(btn.interactions?.[0]).toMatchObject({ trigger: 'ON_CLICK', action: 'NAVIGATE', targetId: pages[1].id });
  });

  it('同一页里两个同名入口只挂一条（不产生重复连线）', () => {
    const page = navPage('首页', ['训练', '训练']);
    const target = navPage('训练', ['首页']);
    wireNavigation([page, target]);
    const bar = page.root.children[1] as ContainerNode;
    const first = bar.children[0] as ButtonNode;
    const second = bar.children[1] as ButtonNode;
    // 两个节点各自有一条（它们本来就是两个不同节点）
    expect(first.interactions).toHaveLength(1);
    expect(second.interactions).toHaveLength(1);
    // 同一节点重复 wire 不会叠加
    const again = wireNavigation([page, target]);
    expect(first.interactions).toHaveLength(1);
    expect(again.links.length).toBeLessThanOrEqual(4);
  });

  it('近似文案不连（「训练计划」≠「训练」）：猜错比连不上更糟', () => {
    const page = navPage('首页', ['训练计划']);
    const target = navPage('训练', ['首页']);
    const res = wireNavigation([page, target]);
    // 「首页」页里没有任何文案等于「训练」→ 一条都不连（反向那条「训练→首页」是合法的）
    expect(res.links.filter((l) => l.fromPageId === page.id)).toHaveLength(0);
    expect(res.missing.find((m) => m.pageName === '首页')?.missing).toContain('训练');
  });

  it('缺导航项如实上报，不静默', () => {
    const page = navPage('首页', ['首页']); // 少了训练、我的
    const pages = [page, navPage('训练', ['首页', '训练', '我的']), navPage('我的', ['首页', '训练', '我的'])];
    const res = wireNavigation(pages);
    const m = res.missing.find((x) => x.pageName === '首页');
    expect(m?.missing.sort()).toEqual(['我的', '训练'].sort());
  });

  it('当前页那一项点了不跳（跳自己等于没反应，用户会以为坏了）', () => {
    const pages = threePages();
    wireNavigation(pages);
    const bar = pages[0].root.children[1] as ContainerNode;
    expect(bar.children[0].interactions ?? []).toHaveLength(0);
  });

  /**
   * 数字角标 + 别名表（2026-10-29 补）。
   *
   * 真实产物缺陷：零食商城的结算按钮文案是「去结算(3)」（角标是件数，是好文案），
   * 而页面名叫「订单确认」。按「文案 == 页面名」精确匹配，订单确认页在导出工程里
   * 一条入边都没有——**整页点不到**，而所有门禁都是绿的。
   */
  it('尾部数字角标不参与匹配：「去结算(3)」能连到「去结算」', () => {
    const page = navPage('购物车', ['去结算(3)']);
    const target = navPage('去结算', ['购物车']);
    const res = wireNavigation([page, target]);
    expect(res.links.some((l) => l.fromPageId === page.id && l.toPageId === target.id)).toBe(true);
  });

  it('尾部装饰（角标 / 价格）不参与匹配，裸尾数字不剥（「满 99 减 10」是真文案）', () => {
    expect(stripBadge('去结算(3)')).toBe('去结算');
    expect(stripBadge('购物车（2）')).toBe('购物车');
    expect(stripBadge('提交订单 ¥126.5')).toBe('提交订单');
    expect(stripBadge('立即购买￥68')).toBe('立即购买');
    expect(stripBadge('3 件商品')).toBe('3 件商品');
    expect(stripBadge('满 99 减 10')).toBe('满 99 减 10');
    expect(stripBadge('购物车 2')).toBe('购物车 2');
  });

  it('尾部带金额的按钮也能连（「提交订单 ¥126.5」→「我的」）', () => {
    const page = navPage('订单确认', ['提交订单 ¥126.5']);
    const target = navPage('我的', ['首页']);
    const res = wireNavigation([page, target], { aliases: { 提交订单: '我的' } });
    expect(res.links.some((l) => l.fromPageId === page.id && l.toPageId === target.id)).toBe(true);
  });

  it('别名表只在目标页存在时生效（否则按连不上处理，不报错）', () => {
    const page = navPage('购物车', ['去结算(3)']);
    const other = navPage('首页', ['购物车']);
    // 没有「订单确认」页 → 不该凭空造一条跳转
    const res = wireNavigation([page, other], { aliases: { 去结算: '订单确认' } });
    expect(res.links.filter((l) => l.fromPageId === page.id)).toHaveLength(0);
  });

  it('页面名优先于别名（别名不能盖掉真实同名页）', () => {
    const page = navPage('购物车', ['去结算']);
    const real = navPage('去结算', ['购物车']);
    const aliased = navPage('订单确认', ['购物车']);
    const res = wireNavigation([page, real, aliased], { aliases: { 去结算: '订单确认' } });
    const out = res.links.filter((l) => l.fromPageId === page.id);
    expect(out).toHaveLength(1);
    expect(out[0].toPageId).toBe(real.id);
  });

  it('别名仍是完全相等：不做包含匹配（「去结算并付款」不连）', () => {
    const page = navPage('购物车', ['去结算并付款']);
    const target = navPage('订单确认', ['购物车']);
    const res = wireNavigation([page, target], { aliases: { 去结算: '订单确认' } });
    expect(res.links.filter((l) => l.fromPageId === page.id)).toHaveLength(0);
  });

  it('每页需求串带上站点名与页名（让模型知道自己在画整站的哪一页）', () => {
    expect(pagePromptOf('健身打卡', { name: '训练', brief: '动作清单' })).toBe('训练：健身打卡 的「训练」页。动作清单');  });
});

/* ---------------- 3. 整站管线 ---------------- */

class ScriptedClient implements LlmClient {
  calls: LlmRequest[] = [];
  constructor(private make: (req: LlmRequest, i: number) => string) {}
  async run(req: LlmRequest): Promise<LlmResult> {
    this.calls.push(req);
    const text = this.make(req, this.calls.length - 1);
    return { text, model: 'fake', usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 } };
  }
}

/** 单页草稿：标题 + 一排导航按钮（按钮文案来自提示词里的 navItems） */
function pageDraftFor(name: string, nav: string[]): AiPageDraft {
  return {
    kind: 'page',
    name,
    width: 375,
    height: 812,
    background: '@color.background',
    root: {
      kind: 'FRAME',
      name: '页面内容',
      className: 'flex flex-col gap-4 p-4',
      children: [
        { kind: 'TEXT', name: '标题', text: `${name}页`, className: 'text-xl font-bold text-foreground' },
        {
          kind: 'FRAME',
          name: '导航栏',
          className: 'flex flex-row items-center gap-2',
          children: nav.map((label) => ({ kind: 'BUTTON' as const, name: label, text: label, className: 'px-3 py-2 rounded-md text-sm' })),
        },
      ],
    },
  };
}

describe('整站管线（规划 → 逐页 → 串联）', () => {
  const nav = ['首页', '训练', '我的'];

  const makeClient = (): ScriptedClient =>
    new ScriptedClient((req) => {
      // 按 kind 分流（不是按提示词文案）：这才和真实客户端挑 schema 的口径一致
      if (req.kind === 'site') return JSON.stringify(siteDraft());
      // 单页：从提示词里抠出页面名（「XX：站点 的「XX」页」）
      const name = nav.find((n) => req.user.includes(`的「${n}」页`)) ?? '首页';
      return JSON.stringify(pageDraftFor(name, nav));
    });

  /**
   * 这些用例只验证管线**结构**（页序 / 提示词 / 成本汇总），不验证内容质量。
   * 关掉「内容过薄重画」：mock 页面只有几个节点，否则每页都会多一次调用，
   * 把「1 次规划 + N 次生成」的调用数断言全打乱。
   */
  const runSite = (o: Parameters<typeof runSiteGeneration>[0]) =>
    runSiteGeneration(o, { minNodesPerPage: 0 });

  it('一次生成 3 页，入口页排第一', async () => {
    const client = makeClient();
    const res = await runSite({
      userPrompt: '一个健身打卡 App，三页：首页 / 训练 / 我的',
      pack,
      viewport: { width: 375, height: 812 },
      client,
    });

    expect(res.pages).toHaveLength(3);
    expect(res.pages[0].name).toBe('首页');
    expect(res.pages.map((p) => p.name)).toEqual(['首页', '训练', '我的']);
    // 1 次规划 + 3 次生成
    expect(client.calls).toHaveLength(4);
    expect(client.calls[0].user).toContain('规划');
  });

  /**
   * 死页重画：**只对流程页生效**，且提示词必须走 `navFor`，不能写「用全部页面名」。
   *
   * 实测 bug（2026-11-01，记账小程序）：重画提示词无条件写「请补上底部导航栏，文案用
   * 全部 6 个页面名」——而 `navItems` 已经按 `navItemsFor` 给流程页发了空数组。两条指令
   * 打架，模型听提示词的：「记一笔」「预算」两页各长出 6 项底栏。
   *
   * 2026-11-02 补一层：底栏改成管线确定性安装（`installTabBar`）之后，**tab 页天然有出边**，
   * 不再可能被判死页。所以这里同时锁两件事——
   *   ① 只有流程页会被重画（tab 页白重画 = 白烧钱）；
   *   ② 流程页的重画提示词说「不要画底栏，补返回 + 下一步按钮」。
   */
  it('死页重画只发生在流程页，且明确要求不画底栏', async () => {
    const plan: AiSiteDraft = {
      kind: 'site',
      name: '健身打卡',
      pages: [
        { name: '首页', brief: '今日训练', entry: true },
        { name: '训练', brief: '动作清单' },
        { name: '我的', brief: '设置项' },
      ],
    };
    const client = new ScriptedClient((req) => {
      if (req.kind === 'site') return JSON.stringify(plan);
      const name = nav.find((n) => req.user.includes(`的「${n}」页`)) ?? '首页';
      // 第一遍全部给空导航（制造死页），重画时才给内容
      if (!req.user.includes('一条导航都没有')) return JSON.stringify(pageDraftFor(name, []));
      return JSON.stringify(pageDraftFor(name, name === '首页' ? nav : ['返回']));
    });

    await runSiteGeneration(
      {
        userPrompt: '健身 App',
        pack,
        viewport: { width: 375, height: 812 },
        client,
      },
      // 内容过薄重画关掉（mock 页节点少），否则每页多一次调用会打乱调用数断言
      { minNodesPerPage: 0, navItemsFor: (n: string) => (n === '首页' ? nav : []) },
    );

    const retries = client.calls.filter((c) => c.kind === 'page' && c.user.includes('一条导航都没有'));
    // 首页是 tab 页 —— 底栏由管线装，天然有出边，不该被重画
    expect(retries.map((c) => nav.find((n) => c.user.includes(`的「${n}」页`)))).toEqual(['训练', '我的']);

    for (const flow of ['训练', '我的']) {
      const call = retries.find((c) => c.user.includes(`的「${flow}」页`))!;
      expect(call.user, `${flow} 是流程页`).toContain('不要画底部导航栏');
      // 关键回归：不能再出现「文案用「全部页面名」」这种反向指令
      expect(call.user).not.toContain('文案用「');
    }
  });

  it('入口页不在规划第一位时会被提到第一位（原型 runtime 只默认展示第一页）', async () => {
    // 规划故意把「我的」写在最前，entry 标在「首页」上
    const plan: AiSiteDraft = {
      kind: 'site',
      name: '健身打卡',
      pages: [
        { name: '我的', brief: '设置项' },
        { name: '训练', brief: '动作清单' },
        { name: '首页', brief: '今日训练', entry: true },
      ],
    };
    const client = new ScriptedClient((req) => {
      if (req.kind === 'site') return JSON.stringify(plan);
      const name = nav.find((n) => req.user.includes(`的「${n}」页`)) ?? '首页';
      return JSON.stringify(pageDraftFor(name, nav));
    });
    const res = await runSite({ userPrompt: '健身 App', pack, viewport: { width: 375, height: 812 }, client });
    expect(res.pages[0].name).toBe('首页');
    // 其余保持规划顺序
    expect(res.pages.map((p) => p.name)).toEqual(['首页', '我的', '训练']);
  });

  /**
   * 这条不是「多测一遍」，是抓一个**测试本身抓不到**的 bug：
   * 规划请求原来传 `kind:'page'`，而结构化输出端点会用 `kind` 挑 JSON Schema ——
   * 于是规划请求被强塞**页面** schema，模型被逼着吐一棵节点树。
   * FakeClient 忽略 `kind`，所以只看结果的断言全绿，必须直接断言请求的 kind。
   */
  it('规划请求的 kind 是 site（结构化输出端点按它挑 schema，传 page 会逼模型吐节点树）', async () => {
    const client = makeClient();
    await runSite({ userPrompt: '健身 App', pack, viewport: { width: 375, height: 812 }, client });
    expect(client.calls[0].kind).toBe('site');
    expect(client.calls.slice(1).every((c) => c.kind === 'page')).toBe(true);
  });

  it('kind → schema 的映射只有一处，且 site 走的是整站 schema（不是页面 schema）', async () => {
    const { schemaOfKind } = await import('../src/editor/ai/client');
    const site = schemaOfKind('site') as { properties: Record<string, unknown>; required: string[] };
    const page = schemaOfKind('page') as { properties: Record<string, unknown> };
    // 整站 schema 只有 kind/name/pages，没有 root（页面才有）
    expect(Object.keys(site.properties).sort()).toEqual(['kind', 'name', 'pages']);
    expect(page.properties).toHaveProperty('root');
    expect(site.properties).not.toHaveProperty('root');
  });

  it('每页提示词都带全部导航项（少一项那一页就点不动）', async () => {
    const client = makeClient();
    await runSite({ userPrompt: '健身 App', pack, viewport: { width: 375, height: 812 }, client });
    const pageCalls = client.calls.filter((c) => c.user.includes('本站导航'));
    expect(pageCalls).toHaveLength(3);
    for (const c of pageCalls) for (const label of nav) expect(c.user).toContain(label);
  });

  it('页面间导航真的连上了（6 条，无缺失）', async () => {
    const client = makeClient();
    const res = await runSite({ userPrompt: '健身 App', pack, viewport: { width: 375, height: 812 }, client });
    expect(res.links).toHaveLength(6);
    expect(res.missing).toEqual([]);
    // 每条链接的目标页都在结果里
    const ids = new Set(res.pages.map((p) => p.id));
    for (const l of res.links) expect(ids.has(l.toPageId)).toBe(true);
  });

  it('【验收】出码 HTML 里导航可点：runtime 能找到目标页', async () => {
    const client = makeClient();
    const res = await runSite({ userPrompt: '健身 App', pack, viewport: { width: 375, height: 812 }, client });
    const files = generatePrototypeProject({ version: 2, name: '健身打卡', pages: res.pages, components: {}, tokens: [], flows: [] });
    const html = files.find((f) => f.path.endsWith('.html'));
    expect(html).toBeDefined();
    const body = html!.content;

    // 三页都渲染成 section，且带 data-uic-page
    for (const p of res.pages) expect(body).toContain(`data-uic-page="${p.id}"`);
    // 跳转写进了 data-interaction，且目标是真实页 id（不是死的 undefined）
    expect(body).toContain('data-interaction');
    // 属性用单引号包裹，值里的双引号不需要转义
    for (const p of res.pages) expect(body).toContain(`"targetId":"${p.id}"`);
  });

  it('成本与轮数如实汇总（每页明细可定位「哪一页拖后腿」）', async () => {
    const client = makeClient();
    const res = await runSite({ userPrompt: '健身 App', pack, viewport: { width: 375, height: 812 }, client });
    expect(res.perPage.map((p) => p.name)).toEqual(['首页', '训练', '我的']);
    expect(res.perPage.every((p) => p.attempts === 1)).toBe(true);
    expect(res.costCny).toBeGreaterThan(0);
    expect(res.firstPass).toBe(true);
  });

  it('规划失败会抛错，而不是拿一个空站点继续画', async () => {
    const client = new ScriptedClient(() => JSON.stringify({ kind: 'site', name: 'x', pages: [] }));
    await expect(runSite({ userPrompt: 'x', pack, viewport: { width: 375, height: 812 }, client, maxRepair: 0 })).rejects.toMatchObject({
      message: expect.stringContaining('规划未通过'),
    });
  });
});

/* ---------------- 4. 落库 ---------------- */

describe('整站落库', () => {
  const proj = (pages: UIPage[]) => ({ projectName: 'P', pages, components: {}, tokens: [] });

  it('同名页替换、新页追加（避免「首页」「首页 2」并存导致导航连到旧页）', () => {
    const oldHome = createPage('首页');
    const oldOther = createPage('关于');
    const newHome = createPage('首页');
    const newTrain = createPage('训练');
    const res = projectWithSite(proj([oldHome, oldOther]), [newHome, newTrain]);
    expect(res.replaced).toBe(1);
    expect(res.added).toBe(1);
    expect(res.project.pages.map((p) => p.name)).toEqual(['首页', '关于', '训练']);
    expect(res.project.pages[0].id).toBe(newHome.id);
  });

  it('页名带空白也认作同名（模型常多打一个空格）', () => {
    const oldHome = createPage('首页');
    const newHome = createPage('首页 ');
    const res = projectWithSite(proj([oldHome]), [newHome]);
    expect(res.replaced).toBe(1);
    expect(res.project.pages).toHaveLength(1);
  });

  it('空工程：全部新增', () => {
    const res = projectWithSite(proj([]), [createPage('首页'), createPage('我的')]);
    expect(res.replaced).toBe(0);
    expect(res.added).toBe(2);
  });
});

/* ---------------- 5. 与单页生成不互相污染 ---------------- */

describe('整站模式不影响单页模式', () => {
  it('不带 navItems 时提示词里没有导航段（逐字节一致，缓存前缀不受影响）', async () => {
    const { buildPrompt } = await import('../src/editor/ai/promptPack');
    const withoutNav = buildPrompt({ mode: 'page', pack, userPrompt: '训练页', viewport: { width: 375, height: 812 } });
    expect(withoutNav.user).not.toContain('本站导航');
    const withNav = buildPrompt({ mode: 'page', pack, userPrompt: '训练页', viewport: { width: 375, height: 812 }, navItems: ['首页', '训练'] });
    expect(withNav.user).toContain('本站导航');
    // system 段（缓存前缀）必须完全不变
    expect(withNav.system).toBe(withoutNav.system);
  });

  it('site 模式的 system 段不含节点级规则（否则模型会以为这一轮也要画树）', async () => {
    const { buildPrompt } = await import('../src/editor/ai/promptPack');
    const site = buildPrompt({ mode: 'site', pack, userPrompt: '健身 App', viewport: { width: 375, height: 812 } });
    expect(site.system).toContain('只规划页面');
    expect(site.system).not.toContain('8pt 网格');
    expect(site.user).toContain('kind=site');
  });

  it('hasNavLabel 只看 TEXT/BUTTON 文案', () => {
    const page = navPage('首页', ['训练']);
    expect(hasNavLabel(page, '训练')).toBe(true);
    expect(hasNavLabel(page, '导航栏')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* 底栏确定性安装（installTabBar）                                      */
/* ------------------------------------------------------------------ */

describe('底栏确定性安装（installTabBar）', () => {
  const items = ['首页', '训练', '我的'];

  /**
   * 为什么这组测试必须存在：底栏是「跨页共享组件 × N 次独立生成」，
   * 2026-11-02 铁志实跑 8 轮，每轮漂移点都不同（图标三页三套 / 手写 vectorD 坐标越界 /
   * 流程页照样长出底栏 / 长页里底栏跟着内容滚走）。提示词改不动它，只能靠代码装。
   *
   * 所以这里锁的不是「装出来的样子好看」，而是**结构性事实**：
   * 装完必须「三页结构一致 + 流程页没有 + 幂等」。
   */
  it('装完的底栏三页结构一致（同 items，只差选中项）', () => {
    const pages = items.map((n) => navPage(n, []));
    for (const p of pages) installTabBar(p, items);

    const shapes = pages.map((p) => {
      const bar = (p.root as ContainerNode).children.find((c) => c.name === '底部导航') as ContainerNode;
      expect(bar, `${p.name} 应有底栏`).toBeTruthy();
      // 吸底：长页滚动时不能跟着走
      expect(bar.layout.position).toBe('FIXED');
      return bar.children.map((cell) => {
        const kids = (cell as ContainerNode).children;
        const text = kids.find((k) => k.type === 'TEXT') as TextNode;
        // 有下划线 = 选中项；三页各自选中自己，其余两项无下划线
        return `${text.text}${kids.some((k) => k.type === 'RECTANGLE') ? '*' : ''}`;
      });
    });
    expect(shapes[0]).toEqual(['首页*', '训练', '我的']);
    expect(shapes[1]).toEqual(['首页', '训练*', '我的']);
    expect(shapes[2]).toEqual(['首页', '训练', '我的*']);
  });

  it('流程页（items 为空）会把模型画的底栏删掉', () => {
    // 平铺 BUTTON 形态 —— 模型最常见的写法
    const page = navPage('训练', items);
    const before = (page.root as ContainerNode).children.length;
    expect(installTabBar(page, [], {}, items)).toBe(true);
    const after = (page.root as ContainerNode).children;
    expect(after.length).toBe(before - 1);
    expect(after.some((c) => c.name === '导航栏')).toBe(false);
    expect(hasNavLabel(page, '我的')).toBe(false);
  });

  it('幂等：第二次调用不改动任何节点（否则 wireNavigation 的幂等性会被打破）', () => {
    const page = navPage('首页', []);
    expect(installTabBar(page, items)).toBe(true);
    const bar = (page.root as ContainerNode).children.find((c) => c.name === '底部导航') as ContainerNode;
    const ids = [bar.id, ...bar.children.map((c) => c.id)];
    expect(installTabBar(page, items)).toBe(false);
    const again = (page.root as ContainerNode).children.find((c) => c.name === '底部导航') as ContainerNode;
    expect([again.id, ...again.children.map((c) => c.id)]).toEqual(ids);
  });

  it('模型画的底栏会被替换而不是并存（否则一页出现两条底栏）', () => {
    const page = navPage('首页', items);
    installTabBar(page, items);
    const bars = (page.root as ContainerNode).children.filter((c) => c.name === '底部导航' || c.name === '导航栏');
    expect(bars).toHaveLength(1);
    // 只剩我们装的那一条，且它是最后一个子项（视觉上贴底）
    const kids = (page.root as ContainerNode).children;
    expect(kids[kids.length - 1].name).toBe('底部导航');
  });

  it('整站串联后每个 tab 页的出边数 = items.length - 1（不给自己挂）', () => {
    const pages = items.map((n) => navPage(n, []));
    const res = wireNavigation(pages, { tabItemsFor: (n) => (items.includes(n) ? items : []) });
    for (const p of pages) {
      const out = res.links.filter((l) => l.fromPageId === p.id);
      expect(out, `${p.name} 的出边`).toHaveLength(items.length - 1);
      expect(out.every((l) => l.toPageId !== p.id)).toBe(true);
    }
  });
});
