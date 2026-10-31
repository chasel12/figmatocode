/**
 * 整站生成（多页）→ 落工程文件 + 报告。
 *
 * 这是 A/B 脚本 `ai-ab.ts` 的多页版本：同样走项目自己的 AI 管线
 * （`runSiteGeneration`：规划轮 → 逐页复用单页管线 → 确定性导航串联），
 * 区别是产出**一个工程**（多页）而不是一页对照。
 *
 * 用法：
 *   AI_API_KEY=sk-xxx npx vite-node scripts/gen-mall.ts
 *
 * 可选环境变量：
 *   AI_PROMPT       需求描述（缺省是零食商城）
 *   AI_SKILL_FILE   风格 skill 路径（缺省 .tmp/skills/style-warm-editorial.md）
 *   AI_PACK         风格包（缺省 openprops）
 *   AI_RUN_LABEL    产物目录后缀，落 `.tmp/<label>/`（缺省 mall）
 *   AI_EXPECT_PAGES 逗号分隔的期望页面名，用于断言（缺省不检查）
 *   AI_VIEWPORT     视口，形如 375x812
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createLlmClient, providerDef, type ProviderId } from '../src/editor/ai/client';
import { runSiteGeneration } from '../src/editor/ai/site';
import { loadFewShots } from '../src/editor/ai/promptPack';
import { composeDesignRef, makeSkill, skillNameFromFile } from '../src/editor/ai/skills';
import { PACKS } from '../src/tokens/packs';
import { loadIcons } from '../src/assets/icons';
import { serializeProject } from '../src/editor/project';
import { loadFigCodec } from '../src/fig/codec';
import { exportFig } from '../src/fig/export';
import { compilePage } from '../src/compiler';
import type { UINode, UIPage, UIProject } from '../src/schema/types';

const PROMPT =
  process.env.AI_PROMPT ??
  [
    '做一个卖零食的小程序商城，共 6 个页面，页面名必须严格用这几个，不要改名、不要加序号：',
    '「首页」「分类」「商品详情」「购物车」「订单确认」「我的」。',
    '页面名只能是这 6 个词本身：**不要加品牌名或站点名前缀、不要加空格**',
    '（写成「零食小铺 首页」会让这一页进不了底部导航、也跳不过去）。品牌名放在页面内容里。',
    '首页：品牌区、搜索框、4~6 个分类入口、今日推荐商品卡（至少 6 个）、底部导航栏。',
    '分类：左侧品类栏至少 5 项，右侧商品网格至少 6 个商品。',
    '商品详情：大图区、标题与价格、至少 2 组规格选择、加入购物车主按钮、详情段落。',
    '购物车：至少 3 个商品行（勾选、数量、小计）、合计金额、去结算按钮。',
    '订单确认：收货地址卡、商品清单、金额明细、提交订单按钮。',
    '我的：用户信息头、订单状态四宫格、至少 5 行功能列表。',
    '',
    '内容硬要求（不满足就是不合格）：',
    '1. 商品卡必须用 repeat 的**命名式 values** 生成，每个商品的名称、价格、描述都要不同：',
    '   "repeat":{"count":6,"values":{"name":[...6 个不同商品名...],"price":[...6 个不同价格...],"desc":[...6 条不同描述...]}}，',
    '   子节点里分别写 {{name}} / {{price}} / {{desc}}。不许 6 张卡都写同一个商品，',
    '   也不许只给一条 values（那样 8 张卡会全一样）。',
    '   **常见错误**：只把 name 写成 6 个不同的，price 却全是「¥29.9」、desc 却全是「低温慢烤」。',
    '   这是不合格的——6 个商品要 6 个不同价位（¥15.9 / ¥18.8 / ¥22.5 / ¥26.8 / ¥29.9 / ¥32.5），',
    '   desc 要 6 句不同卖点（各自讲自己的口感/工艺/场景，不要复用同一句）。',
    '2. 价格用具体数字（¥19.9 / ¥26.8），不要用「¥xx」。',
    '3. 页面里的底部导航栏只画一次，不要画两条。',
    '4. 「首页」「分类」「购物车」「我的」这 4 页都必须有底部导航栏（含「首页」「分类」「购物车」「我的」四项），',
    '   少画一页那一页就成了死页，用户进去出不来。',
    '   商品详情、订单确认是流程页，**不要**画底部导航栏（它们靠返回/提交按钮进出）。',
    '5. 只输出契约里有的字段，不要自己加解释性键（如 note / comment / fix_note）。',
  ].join('\n');

/** §5 的 6 个页面名，逐字固定（决定 tabBar 归属与跳转匹配） */
const PAGE_NAMES = ['首页', '分类', '商品详情', '购物车', '订单确认', '我的'];

/**
 * 界面动作 → 页面名（闭合表，只做完全相等匹配）。
 *
 * 设计稿上「去结算(3)」才是好文案，但 `wireNavigation` 只认「文案 == 页面名」，
 * 于是订单确认页在导出工程里根本点不到。把领域映射放在脚本里、管线保持通用，
 * 换一个行业改这张表即可。
 */
const NAV_ALIASES: Record<string, string> = {
  去结算: '订单确认',
  结算: '订单确认',
  立即结算: '订单确认',
  去支付: '订单确认',
  立即购买: '商品详情',
  马上抢: '商品详情',
  查看全部: '分类',
  全部商品: '分类',
  加入购物车: '购物车',
  加购: '购物车',
  提交订单: '我的',
  确认支付: '我的',
};

/**
 * 必须有底部导航、因而必须有出边的页面（tabBar 那 4 页）。
 *
 * 不要求**所有**页都有出边：订单确认是流程页，真实 App 里它只有「提交订单」和返回，
 * 没有 tabBar。把「无死页」套到它头上，会逼模型把底栏画到不该画的地方。
 * 商品详情同理（返回键是图标，不是文案，连不上也不算缺陷）。
 */
const TAB_PAGES = ['首页', '分类', '购物车', '我的'];

/**
 * §5 的**结构性**导航要求：5 条。
 *
 * 只列结构性的（tabBar 互通 + 商品详情进购物车 + 购物车进结算）。
 * 不要求「每页都要有出口」——订单确认是流程页，没有底栏，它的真实出口是「提交订单」，
 * 而按钮文案会带金额（`提交订单 ¥126.5`），能不能命中别名是运气，不该当硬指标。
 * 把它写进硬指标，只会逼模型把底栏画到流程页上。
 */
const EXPECTED_LINKS: [from: string, label: string, to: string][] = [
  ['首页', '购物车', '购物车'],
  ['分类', '首页', '首页'],
  ['商品详情', '购物车', '购物车'],
  ['购物车', '去结算', '订单确认'],
  ['我的', '首页', '首页'],
];

const VIEWPORT = (() => {
  const raw = process.env.AI_VIEWPORT ?? '375x812';
  const [w, h] = raw.split('x').map(Number);
  return { width: w || 375, height: h || 812 };
})();

const LABEL = process.env.AI_RUN_LABEL ?? 'mall';
const OUT = resolve(`.tmp/${LABEL}`);

function loadDesignRef(): { ref: string; name: string; rawChars: number } {
  const file = process.env.AI_SKILL_FILE ?? '.tmp/skills/style-warm-editorial.md';
  const raw = readFileSync(resolve(file), 'utf8');
  const skill = makeSkill(skillNameFromFile(file.split(/[\\/]/).pop() ?? file), raw);
  return { ref: composeDesignRef([skill]), name: skill.name, rawChars: raw.length };
}

/** 内容具体度：泛称文案是模型「省事」的典型症状，扫描出来当断言 */
const GENERIC = ['项目标题', '内容', '商品名', '标题文字', '正文内容', '示例文本', '这里放', '占位'];

/**
 * 允许重复的**界面文案**。
 *
 * `dupHeavy` 的靶子是「values 只给了一条 → N 张卡同一个商品」，
 * 但按钮、数量步进、勾选这类控件文案在每张卡上都出现一次是**正确的**，
 * 不排掉就会把好产物判成坏产物（假红和假绿一样会让人不再看门禁）。
 */
const UI_WORDS = new Set([
  '加入购物车', '立即购买', '去结算', '提交订单', '查看全部', '更多', '全选', '编辑', '删除',
  '确定', '取消', '已售', '件', '份', '+', '-', '−', '×', '✓', '›', '>',
]);

function auditContent(page: UIPage): {
  texts: number;
  generic: string[];
  nodes: number;
  dupHeavy: [string, number][];
  topDup: [string, number][];
} {
  const generic: string[] = [];
  const counts = new Map<string, number>();
  let texts = 0;
  let nodes = 0;
  const visit = (n: UINode): void => {
    nodes += 1;
    const t = (n as { text?: string }).text;
    if (typeof t === 'string' && t.trim()) {
      texts += 1;
      counts.set(t, (counts.get(t) ?? 0) + 1);
      for (const g of GENERIC) if (t.includes(g)) generic.push(`${n.name}: ${t.slice(0, 20)}`);
    }
    for (const c of (n as { children?: UINode[] }).children ?? []) visit(c);
  };
  visit(page.root);
  // 同一段文案出现 >3 次：`repeat` 的 values 只给了一条，8 张商品卡会全一样。
  // 这不是「重复是设计语言」能解释的——商品名重复到 4 次以上一定是内容塌陷。
  //
  // 只数**够长的**文案（≥4 字）：数量步进器的「1」、标签「优惠券」这类短词重复是正常的，
  // 商品名/价格/描述才有「每项都该不同」的要求。短文案重复由人眼看截图确认，不进断言。
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const dupHeavy = sorted.filter(([t, c]) => c > 3 && t.length >= 4 && !UI_WORDS.has(t));
  return { texts, generic, nodes, dupHeavy, topDup: sorted.slice(0, 5) };
}

async function main(): Promise<void> {
  const apiKey = process.env.AI_API_KEY ?? '';
  if (!apiKey) {
    console.error('缺少 AI_API_KEY');
    process.exit(2);
  }
  const provider = (process.env.AI_PROVIDER ?? 'qwen') as ProviderId;
  const model = process.env.AI_MODEL ?? providerDef(provider).defaultModel;
  const packId = process.env.AI_PACK ?? 'openprops';
  const pack = PACKS.find((p) => p.id === packId) ?? PACKS[0];
  mkdirSync(OUT, { recursive: true });

  const skill = loadDesignRef();
  console.log(`provider=${provider} model=${model} pack=${pack.name} viewport=${VIEWPORT.width}×${VIEWPORT.height}`);
  console.log(`[skill] ${skill.name}：原文 ${skill.rawChars} 字 → 注入 ${skill.ref.length} 字`);

  const iconAssets = await loadIcons();
  const iconMap = Object.fromEntries(Object.entries(iconAssets.icons).map(([k, v]) => [k, v.d]));
  console.log(`[icons] ${Object.keys(iconMap).length} 个`);

  const client = await createLlmClient({ provider, apiKey, model });
  const t0 = Date.now();
  const result = await runSiteGeneration(
    {
      userPrompt: PROMPT,
      pack,
      viewport: VIEWPORT,
      client,
      icons: iconMap,
      fewShots: await loadFewShots(),
      model,
      designRef: skill.ref || undefined,
      onProgress: (e) => console.log(`[site] ${e.stage} #${e.attempt} ${e.message}`),
    },
    { aliases: NAV_ALIASES, requirePageNames: PAGE_NAMES },
  );
  const elapsed = Date.now() - t0;

  const pages = result.pages;
  console.log(`\n===== 整站结果 =====`);
  console.log(`页面 ${pages.length} 个 / ${elapsed}ms / ¥${result.costCny.toFixed(3)} / 首轮通过 ${result.firstPass}`);
  console.log(`导航连接 ${result.links.length} 条`);

  /**
   * 导航断言分两条，都不要求「全连接」。
   *
   * `result.missing` 是「这一页没有指向其余每一页的入口」——真实 App 本来就不成立
   * （底部 tabBar 只有 4 项，商品详情靠点卡片进）。拿它当失败条件等于要求全连接，
   * 反而会逼出「把 6 个页面名全塞进底栏」这种坏设计。
   *
   * 真正会坏的是两种：① §5 明确要求的 6 条跳转没连上（点了没反应）；
   * ② 某页一条出边都没有（死页，用户进去出不来）。
   */
  const linkSet = new Set(result.links.map((l) => `${l.fromPageId}|${l.toPageName}`));
  const pageByName = new Map(pages.map((p) => [p.name, p]));
  const missingLinks = EXPECTED_LINKS.filter(([from, , to]) => {
    const p = pageByName.get(from);
    return !p || !linkSet.has(`${p.id}|${to}`);
  });
  const deadEnds = pages.filter(
    (p) => TAB_PAGES.includes(p.name) && !result.links.some((l) => l.fromPageId === p.id),
  );
  console.log(
    missingLinks.length
      ? `[nav] ✗ §5 缺 ${missingLinks.length} 条：${missingLinks.map(([f, l, t]) => `${f}「${l}」→${t}`).join('；')}`
      : `[nav] §5 的 ${EXPECTED_LINKS.length} 条跳转全连上`,
  );
  if (deadEnds.length) console.log(`[nav] ✗ 死页（无任何出边）：${deadEnds.map((p) => p.name).join('、')}`);

  const audits = pages.map((p) => {
    const a = auditContent(p);
    const compiled = compilePage(p);
    console.log(
      `  ${p.name.padEnd(8)} ${String(a.nodes).padStart(4)} 节点 · ${compiled.nodes.length} 编译节点 · ${a.texts} 段文字` +
        (a.generic.length ? ` · ⚠ 泛称 ${a.generic.length}` : '') +
        (a.dupHeavy.length ? ` · ⚠ 重复文案 ${a.dupHeavy.length}（${a.dupHeavy[0][0]}×${a.dupHeavy[0][1]}）` : ''),
    );
    return { name: p.name, ...a };
  });

  /* 期望页面名断言（可选） */
  const expect = (process.env.AI_EXPECT_PAGES ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  let nameOk = true;
  if (expect.length) {
    const got = pages.map((p) => p.name);
    const missing = expect.filter((e) => !got.includes(e));
    const extra = got.filter((g) => !expect.includes(g));
    nameOk = missing.length === 0 && extra.length === 0;
    console.log(nameOk ? `[names] 6 页名与期望一致` : `[names] ✗ 缺 ${missing.join('/') || '无'} · 多 ${extra.join('/') || '无'}`);
  }

  /* 落工程文件 */
  const project: UIProject = {
    version: 2,
    name: `零食商城 · ${LABEL}`,
    pages,
    components: {},
    tokens: [],
    flows: [],
  };
  writeFileSync(resolve(OUT, 'project.json'), JSON.stringify(serializeProject(project), null, 2), 'utf-8');
  try {
    const codec = await loadFigCodec();
    const fig = await exportFig(pages, codec.encode, { fileName: project.name });
    writeFileSync(resolve(OUT, 'project.fig'), fig.bytes);
    console.log(`[out] project.json / project.fig（${fig.stats.nodes} 节点）`);
  } catch (e) {
    console.warn(`[out] .fig 导出失败：${e instanceof Error ? e.message : e}`);
  }

  const report = {
    prompt: PROMPT,
    provider,
    model,
    pack: { id: pack.id, name: pack.name, primary: pack.colors.primary, background: pack.colors.background },
    skill,
    viewport: VIEWPORT,
    elapsedMs: elapsed,
    costCny: result.costCny,
    firstPass: result.firstPass,
    pages: audits,
    links: result.links,
    missing: result.missing,
    missingLinks,
    deadEnds: deadEnds.map((p) => p.name),
    perPage: result.perPage,
    usage: result.usage,
    nameOk,
  };
  writeFileSync(resolve(OUT, 'site-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf-8');
  console.log(`[out] site-report.json`);

  const bad =
    audits.some((a) => a.nodes < 30) ||
    audits.some((a) => a.dupHeavy.length > 0) ||
    !nameOk ||
    missingLinks.length > 0 ||
    deadEnds.length > 0;
  console.log(bad ? '\n⚠ 有断言未过（见上）' : '\n✓ 断言全过');
  process.exit(bad ? 1 : 0);
}

await main();
