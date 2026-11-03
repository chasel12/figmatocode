/**
 * 展示项目生成（配置驱动）—— `gen-mall.ts` 的泛化版。
 *
 * 为什么不在 `gen-mall.ts` 上加参数：那份脚本的页面名、导航别名、tabBar 归属、
 * 期望跳转全是零食商城硬编码的（`PAGE_NAMES` / `NAV_ALIASES` / `TAB_PAGES` /
 * `EXPECTED_LINKS`）。硬塞三个行业进去，四张表会互相污染，且每次改一个行业都要
 * 动到另外两个的断言——这正是「配置驱动」要解决的问题。
 *
 * 管线本身一行不改：仍然走 `runSiteGeneration`
 * （规划轮 → 逐页复用单页管线 → 确定性 `wireNavigation` 串联），
 * 仍然吃 `AiPageDraft` 契约，仍然由 `specToPage` 归一化。
 *
 * 用法：
 *   AI_API_KEY=sk-xxx npx vite-node scripts/gen-showcase.ts --project=music
 *   AI_API_KEY=sk-xxx npx vite-node scripts/gen-showcase.ts --all
 *
 * 可选：
 *   --out=.tmp/showcase        产物根目录
 *   --skip-existing            已存在 project.json 的项目跳过（断点续跑，不重复烧钱）
 *   AI_PROVIDER / AI_MODEL     同 gen-mall
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createLlmClient, providerDef, type ProviderId } from '../src/editor/ai/client';
import { runSiteGeneration, wireNavigation } from '../src/editor/ai/site';
import { loadFewShots } from '../src/editor/ai/promptPack';
import { composeDesignRef, makeSkill, skillNameFromFile } from '../src/editor/ai/skills';
import { PACKS } from '../src/tokens/packs';
import { loadIcons } from '../src/assets/icons';
import { serializeProject } from '../src/editor/project';
import { loadFigCodec } from '../src/fig/codec';
import { exportFig } from '../src/fig/export';
import { compilePage } from '../src/compiler';
import type { UINode, UIPage, UIProject } from '../src/schema/types';

/* ------------------------------------------------------------------ */
/* 配置                                                                */
/* ------------------------------------------------------------------ */

interface ShowcaseConfig {
  /** 目录名 + 报告主键 */
  id: string;
  /** 工程名（会写进 project.json 与 .fig） */
  title: string;
  /** `src/tokens/packs` 的 pack id */
  pack: string;
  /** 风格 skill 路径，相对仓库根 */
  skill: string;
  /** 形如 375x812 */
  viewport: string;
  /**
   * 喂给规划轮的需求正文。二选一：
   *
   * ① `promptFile` —— 指向一个 .md（**推荐**）。需求里要写 `repeat` 的 JSON 示例，
   *    塞进 JSON 字符串要转义一堆引号，改一次错一次；写成独立文件可以直接读改。
   * ② `prompt` —— 行数组或单个字符串，适合三五行的短需求。
   */
  promptFile?: string;
  prompt?: string | string[];
  /** 页面名白名单，逐字固定（决定 tabBar 归属与跳转匹配） */
  pages: string[];
  /** 必须有底部导航的页面 */
  tabPages: string[];
  /**
   * 底栏视觉（可选）。缺省走 `DEFAULT_TAB_BAR_STYLE`。
   *
   * 底栏是管线**确定性安装**的（`installTabBar`），所以配色不能靠提示词描述 ——
   * 要跟风格 skill 的令牌表对齐，只能从这里给。
   */
  tabBar?: {
    background: string;
    border: string;
    activeColor: string;
    idleColor: string;
    fontSize?: number;
    height?: number;
  };
  /** 界面动作文案 → 页面名（闭合表，只做完全相等匹配） */
  navAliases: Record<string, string>;
  /** 结构性跳转断言：[来源页, 动作文案, 目标页] */
  expectedLinks: [string, string, string][];
}

const CONFIG_DIR = resolve('showcase/configs');

/** 需求正文归一：优先 promptFile，其次行数组，最后原样字符串 */
function promptText(cfg: ShowcaseConfig): string {
  if (cfg.promptFile) return readFileSync(resolve(cfg.promptFile), 'utf8').trim();
  if (Array.isArray(cfg.prompt)) return cfg.prompt.join('\n');
  return cfg.prompt ?? '';
}

function loadConfigs(): ShowcaseConfig[] {
  const files = readdirSync(CONFIG_DIR).filter((f) => f.endsWith('.json')).sort();
  return files.map((f) => {
    const raw = JSON.parse(readFileSync(resolve(CONFIG_DIR, f), 'utf8')) as ShowcaseConfig;
    if (!raw.id || !(raw.prompt || raw.promptFile) || !raw.pages?.length) {
      throw new Error(`${f} 缺字段（id / prompt|promptFile / pages 必填）`);
    }
    // 路径类字段在这里就验：跑到一半才发现 skill 路径写错，前面几页的钱已经烧掉了
    for (const [key, p] of [['promptFile', raw.promptFile], ['skill', raw.skill]] as const) {
      if (p && !existsSync(resolve(p))) throw new Error(`${f} 的 ${key} 不存在：${p}`);
    }
    if (!raw.tabPages?.length) throw new Error(`${f} 缺 tabPages（决定哪些页必须画底栏）`);
    return raw;
  });
}

/* ------------------------------------------------------------------ */
/* 内容审计（沿用 gen-mall 的判据）                                     */
/* ------------------------------------------------------------------ */

/**
 * 泛称文案：模型「省事」的典型症状。
 *
 * 注意「占位」这条——它是本项目历史上最贵的一类失败：模型把指令语原样写成 text，
 * 渲染出来就是界面上印着「列表占位」「这里放标题」。
 */
const GENERIC = ['项目标题', '内容', '商品名', '标题文字', '正文内容', '示例文本', '这里放', '占位'];

/**
 * 允许重复的**界面文案**。
 *
 * 「重复 > 3 次 = 内容塌陷」的靶子是 `repeat` 的 values 只给了一条，
 * 但按钮、单位、箭头这类控件文案在每张卡上都出现一次是**正确的**，
 * 不排掉就会把好产物判成坏产物——假红和假绿一样会让人不再看门禁。
 */
/**
 * 「重复也不算出错」的通用界面词。
 *
 * 判据本来是抓「模型把泛称写重复了」（商品名全是「商品1」），但**重复的 CTA 是正常的**：
 * 商品网格 4 张卡各带一个「查看详情」、订单卡各带一个「再来一单」、列表每行一个「加入购物车」
 * —— 这些不是内容贫乏，是真实产品的写法。不放进白名单，每次生成都会报一堆假警，
 * 真问题反而被淹没。
 */
const UI_WORDS = new Set([
  '加入购物车', '立即购买', '去结算', '提交订单', '查看全部', '更多', '全选', '编辑', '删除',
  '确定', '取消', '已售', '件', '份', '+', '-', '−', '×', '✓', '›', '>', '播放', '收藏', '下载',
  '查看详情', '再来一单', '查看更多', '查看明细', '全部', '去支付', '继续记一笔', '立即支付',
]);

function auditContent(page: UIPage): {
  texts: number;
  generic: string[];
  nodes: number;
  dupHeavy: [string, number][];
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
  // 只数够长的文案（≥4 字）：数量步进器的「1」、单位「件」重复是正常的
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const dupHeavy = sorted.filter(([t, c]) => c > 3 && t.length >= 4 && !UI_WORDS.has(t));
  return { texts, generic, nodes, dupHeavy };
}

/* ------------------------------------------------------------------ */
/* 主流程                                                              */
/* ------------------------------------------------------------------ */

/**
 * 导航断言（生成后与 `--rewire` 共用一份，避免两处漂移）。
 *
 * 只查「结构性必连」（`expectedLinks`）与「tab 页死页」，不要求全连接 ——
 * 流程页本来就不该有全站底栏。
 */
function reportLinks(
  cfg: ShowcaseConfig,
  pages: UIPage[],
  links: { fromPageId: string; toPageName: string }[],
): { missingLinks: [string, string, string][]; deadEnds: UIPage[] } {
  const linkSet = new Set(links.map((l) => `${l.fromPageId}|${l.toPageName}`));
  const pageByName = new Map(pages.map((p) => [p.name, p]));
  const missingLinks = cfg.expectedLinks.filter(([from, , to]) => {
    const p = pageByName.get(from);
    return !p || !linkSet.has(`${p.id}|${to}`);
  });
  const deadEnds = pages.filter((p) => cfg.tabPages.includes(p.name) && !links.some((l) => l.fromPageId === p.id));
  console.log(
    missingLinks.length
      ? `  [nav] ✗ 缺 ${missingLinks.length} 条：${missingLinks.map(([f, l, t]) => `${f}「${l}」→${t}`).join('；')}`
      : `  [nav] ${cfg.expectedLinks.length} 条结构性跳转全连上`,
  );
  if (deadEnds.length) console.log(`  [nav] ✗ 死页：${deadEnds.map((p) => p.name).join('、')}`);
  return { missingLinks, deadEnds };
}

function parseArgs(): { project: string; all: boolean; out: string; skipExisting: boolean; splitOnly: boolean; rewire: boolean } {
  const argv = process.argv.slice(2);
  const val = (flag: string, dflt: string): string => {
    const eq = argv.find((a) => a.startsWith(`${flag}=`));
    if (eq) return eq.slice(flag.length + 1);
    const i = argv.indexOf(flag);
    return i >= 0 ? (argv[i + 1] ?? dflt) : dflt;
  };
  return {
    project: val('--project', ''),
    all: argv.includes('--all'),
    out: val('--out', '.tmp/showcase'),
    skipExisting: argv.includes('--skip-existing'),
    splitOnly: argv.includes('--split-only'),
    rewire: argv.includes('--rewire'),
  };
}

async function runOne(cfg: ShowcaseConfig, opts: { out: string; apiKey: string; provider: ProviderId; model: string }): Promise<{ ok: boolean; bad: string[] }> {
  const OUT = resolve(opts.out, cfg.id);
  if (opts.apiKey === '') throw new Error('缺少 AI_API_KEY');

  const pack = PACKS.find((p) => p.id === cfg.pack) ?? PACKS[0];
  const [vw, vh] = cfg.viewport.split('x').map(Number);
  const viewport = { width: vw || 375, height: vh || 812 };

  const rawSkill = readFileSync(resolve(cfg.skill), 'utf8');
  const skill = makeSkill(skillNameFromFile(cfg.skill.split(/[\\/]/).pop() ?? cfg.skill), rawSkill);

  console.log(`\n${'='.repeat(64)}`);
  console.log(`[${cfg.id}] ${cfg.title}`);
  console.log(`  pack=${pack.id} viewport=${viewport.width}×${viewport.height} 页数=${cfg.pages.length}`);
  console.log(`  skill=${skill.name}：原文 ${rawSkill.length} 字 → 注入 ${skill.text.length} 字`);
  console.log('='.repeat(64));

  const iconAssets = await loadIcons();
  const iconMap = Object.fromEntries(Object.entries(iconAssets.icons).map(([k, v]) => [k, v.d]));

  const client = await createLlmClient({ provider: opts.provider, apiKey: opts.apiKey, model: opts.model });
  const t0 = Date.now();
  const result = await runSiteGeneration(
    {
      userPrompt: promptText(cfg),
      pack,
      viewport,
      client,
      icons: iconMap,
      fewShots: await loadFewShots(),
      model: opts.model,
      designRef: composeDesignRef([skill]) || undefined,
      onProgress: (e) => console.log(`  [site] ${e.stage} #${e.attempt} ${e.message}`),
    },
    {
      aliases: cfg.navAliases,
      requirePageNames: cfg.pages,
      navItemsFor: (name) => (cfg.tabPages.includes(name) ? cfg.tabPages : []),
      tabBarStyle: cfg.tabBar,
    },
  );
  const elapsed = Date.now() - t0;

  const pages = result.pages;
  console.log(`\n  → ${pages.length} 页 / ${(elapsed / 1000).toFixed(1)}s / ¥${result.costCny.toFixed(3)} / 首轮通过 ${result.firstPass}`);
  console.log(`  → 导航连接 ${result.links.length} 条`);

  /* 导航断言：只查「结构性必连」与「死页」，不要求全连接 */
  const nav = reportLinks(cfg, pages, result.links);
  const missingLinks = nav.missingLinks;
  const deadEnds = nav.deadEnds;

  const gotNames = pages.map((p) => p.name);
  const missingNames = cfg.pages.filter((p) => !gotNames.includes(p));
  const extraNames = gotNames.filter((g) => !cfg.pages.includes(g));
  const nameOk = missingNames.length === 0 && extraNames.length === 0;
  console.log(
    nameOk
      ? `  [names] ${cfg.pages.length} 页名与期望一致`
      : `  [names] ✗ 缺 ${missingNames.join('/') || '无'} · 多 ${extraNames.join('/') || '无'}`,
  );

  const audits = pages.map((p) => {
    const a = auditContent(p);
    const compiled = compilePage(p);
    console.log(
      `    ${p.name.padEnd(8)} ${String(a.nodes).padStart(4)} 节点 · ${compiled.nodes.length} 编译节点 · ${a.texts} 段文字` +
        (a.generic.length ? ` · ⚠ 泛称 ${a.generic.length}` : '') +
        (a.dupHeavy.length ? ` · ⚠ 重复文案 ${a.dupHeavy.length}（${a.dupHeavy[0][0]}×${a.dupHeavy[0][1]}）` : ''),
    );
    return { name: p.name, ...a };
  });

  /* 落工程 */
  mkdirSync(OUT, { recursive: true });
  const project: UIProject = {
    version: 2,
    name: cfg.title,
    pages,
    components: {},
    tokens: [],
    flows: [],
  };
  writeFileSync(resolve(OUT, 'project.json'), JSON.stringify(serializeProject(project), null, 2), 'utf-8');

  /**
   * 同时吐一份**单页文件**（`pages/NN-页名.page.json`）。
   *
   * `ui-shots` / `ui-measure` / `ui-audit` 的输入口径都是「一页一个文件」，
   * 而这里产出的是一个多页工程。不拆出来的话，想看一眼渲染结果就得手工转格式，
   * 于是「断言过了」就成了唯一的验收手段 —— 而断言只能证明结构合法，证明不了好看。
   */
  const pagesDir = resolve(OUT, 'pages');
  mkdirSync(pagesDir, { recursive: true });
  pages.forEach((p, i) => {
    const safe = p.name.replace(/[\\/:*?"<>|]/g, '_');
    writeFileSync(resolve(pagesDir, `${String(i + 1).padStart(2, '0')}-${safe}.page.json`), JSON.stringify(p, null, 2), 'utf-8');
  });
  try {
    const codec = await loadFigCodec();
    const fig = await exportFig(pages, codec.encode, { fileName: project.name });
    writeFileSync(resolve(OUT, 'project.fig'), fig.bytes);
    console.log(`  [out] project.json / project.fig（${fig.stats.nodes} 节点）`);
  } catch (e) {
    console.warn(`  [out] .fig 导出失败：${e instanceof Error ? e.message : e}`);
  }

  const report = {
    id: cfg.id,
    title: cfg.title,
    prompt: promptText(cfg),
    provider: opts.provider,
    model: opts.model,
    pack: { id: pack.id, name: pack.name, primary: pack.colors.primary, background: pack.colors.background },
    skill: { name: skill.name, file: cfg.skill, rawChars: rawSkill.length, injectedChars: skill.text.length },
    viewport,
    elapsedMs: elapsed,
    costCny: result.costCny,
    firstPass: result.firstPass,
    pages: audits,
    links: result.links,
    missingLinks,
    deadEnds: deadEnds.map((p) => p.name),
    perPage: result.perPage,
    usage: result.usage,
    nameOk,
  };
  writeFileSync(resolve(OUT, 'site-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf-8');
  console.log(`  [out] site-report.json`);

  const bad: string[] = [];
  if (audits.some((a) => a.nodes < 30)) bad.push('节点过少（<30）');
  if (audits.some((a) => a.dupHeavy.length > 0)) bad.push('重复文案');
  if (audits.some((a) => a.generic.length > 0)) bad.push('泛称文案');
  if (!nameOk) bad.push('页面名不符');
  if (missingLinks.length) bad.push('结构性跳转缺失');
  if (deadEnds.length) bad.push('死页');
  console.log(bad.length ? `  ⚠ 未过：${bad.join(' / ')}` : `  ✓ 断言全过`);
  return { ok: bad.length === 0, bad };
}

/**
 * 取 key：环境变量优先，其次 `.tmp/ai-key.txt`（整个 `.tmp/` 已在 .gitignore 里）。
 *
 * 为什么支持文件：这个 Bash 工具每次调用都是新 shell，`export` 不跨调用存活；
 * 每次都把 key 拼进命令行，既会留在 shell 历史里，也容易被复制到别处。
 * 落一个已忽略的文件，命令里就只剩路径。
 */
function resolveApiKey(): string {
  const fromEnv = (process.env.AI_API_KEY ?? '').trim();
  if (fromEnv) return fromEnv;
  const file = resolve('.tmp/ai-key.txt');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  return '';
}

async function main(): Promise<void> {
  const args = parseArgs();

  /**
   * `--rewire`：不调模型，只按当前的 `navAliases` 重新串联导航。
   *
   * 为什么需要：导航串联是**纯确定性**的（`wireNavigation` 文案精确匹配 + 幂等），
   * 而生成一次要 ¥0.14~0.23。改一个别名表条目（比如把「保存」映射到「明细」）
   * 不该重跑模型 —— 那等于为了改一个字符串重画六个页面，且新产物还会换采样。
   *
   * `wireNavigation` 幂等：已有的边保留，只补新别名能连上的那些。
   */
  if (args.rewire) {
    const all = loadConfigs();
    const targets = args.all ? all : all.filter((c) => c.id === args.project);
    for (const cfg of targets) {
      const src = resolve(args.out, cfg.id, 'project.json');
      if (!existsSync(src)) {
        console.error(`[${cfg.id}] 没有 project.json：${src}`);
        continue;
      }
      const env = JSON.parse(readFileSync(src, 'utf8')) as { project?: UIProject };
      const project = env.project;
      const pages = project?.pages ?? [];
      if (!pages.length) {
        console.error(`[${cfg.id}] project.json 里没有页面`);
        continue;
      }
      const wired = wireNavigation(pages, { aliases: cfg.navAliases });
      const { missingLinks, deadEnds } = reportLinks(cfg, pages, wired.links);
      console.log(`  [nav] 重新串联后共 ${wired.links.length} 条`);
      writeFileSync(resolve(args.out, cfg.id, 'project.json'), JSON.stringify(serializeProject({ ...project!, pages }), null, 2), 'utf-8');
      try {
        const codec = await loadFigCodec();
        const fig = await exportFig(pages, codec.encode, { fileName: cfg.title });
        writeFileSync(resolve(args.out, cfg.id, 'project.fig'), fig.bytes);
        console.log(`  [out] project.json / project.fig 已更新（${fig.stats.nodes} 节点）`);
      } catch (e) {
        console.error(`  [${cfg.id}] .fig 重导失败：${e instanceof Error ? e.message : e}`);
      }
      console.log(`  ${missingLinks.length === 0 && deadEnds.length === 0 ? '✓ 导航断言全过' : '⚠ 仍有缺失'}`);
    }
    return;
  }

  /**
   * `--split-only`：不调模型，只把已有的 `project.json` 拆成单页文件。
   *
   * 为什么需要：拆页是纯本地的确定性操作，而生成一次要花钱。改一下拆页逻辑
   * （换文件名、补字段）不该重跑一遍模型 —— 那等于为了改一个字符串付 ¥0.14。
   */
  if (args.splitOnly) {
    const all = loadConfigs();
    const targets = args.all ? all : all.filter((c) => c.id === args.project);
    for (const cfg of targets) {
      const src = resolve(args.out, cfg.id, 'project.json');
      if (!existsSync(src)) {
        console.error(`[${cfg.id}] 没有 project.json：${src}`);
        continue;
      }
      const env = JSON.parse(readFileSync(src, 'utf8')) as { project?: { pages?: UIPage[] } };
      const pages = env.project?.pages ?? [];
      const pagesDir = resolve(args.out, cfg.id, 'pages');
      mkdirSync(pagesDir, { recursive: true });
      pages.forEach((p, i) => {
        const safe = p.name.replace(/[\\/:*?"<>|]/g, '_');
        writeFileSync(
          resolve(pagesDir, `${String(i + 1).padStart(2, '0')}-${safe}.page.json`),
          JSON.stringify(p, null, 2),
          'utf-8',
        );
      });
      console.log(`[${cfg.id}] 拆出 ${pages.length} 页 → ${pagesDir}`);

      /**
       * 顺手重导 `.fig`。
       *
       * 改导出逻辑（比如修「根级子项全落在 (0,0)」那个 bug）之后，已有的 `.fig`
       * 还是旧产物。重跑模型要 ¥0.14，而重导是纯本地计算——不该为一个坐标修复付这笔钱。
       */
      try {
        const codec = await loadFigCodec();
        const fig = await exportFig(pages, codec.encode, { fileName: cfg.title });
        writeFileSync(resolve(args.out, cfg.id, 'project.fig'), fig.bytes);
        console.log(`[${cfg.id}] 重导 project.fig（${fig.stats.nodes} 节点）`);
      } catch (e) {
        console.error(`[${cfg.id}] .fig 重导失败：${e instanceof Error ? e.message : e}`);
      }
    }
    return;
  }

  // 先验配置再查 key：配置错误是本地问题，不该让人以为「给了 key 就能跑」
  const all = loadConfigs();
  const targets = args.all ? all : all.filter((c) => c.id === args.project);
  if (!targets.length) {
    console.error(`没有匹配的项目。可选：${all.map((c) => c.id).join(' / ')}（或 --all）`);
    process.exit(2);
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.error(
      '缺少 AI_API_KEY。两种给法：\n' +
        '  ① 环境变量：AI_API_KEY=sk-xxx npm run showcase:gen -- --project=music\n' +
        '  ② 文件（推荐）：把 key 写进 .tmp/ai-key.txt（该目录已 gitignore）',
    );
    process.exit(2);
  }
  const provider = (process.env.AI_PROVIDER ?? 'qwen') as ProviderId;
  const model = process.env.AI_MODEL ?? providerDef(provider).defaultModel;

  const summary: { id: string; ok: boolean; bad: string[] }[] = [];
  for (const cfg of targets) {
    if (args.skipExisting && existsSync(resolve(args.out, cfg.id, 'project.json'))) {
      console.log(`\n[${cfg.id}] 已有产物，跳过（--skip-existing）`);
      continue;
    }
    try {
      const r = await runOne(cfg, { out: args.out, apiKey, provider, model });
      summary.push({ id: cfg.id, ok: r.ok, bad: r.bad });
    } catch (e) {
      /**
       * 失败时把违例与**模型原始输出**落盘。
       *
       * `runSitePlan` 抛的 Error 上挂了 `violations` 与 `raw`（见 `site.ts` 末尾的
       * `Object.assign`），但默认只打 message —— 「整站规划未通过契约校验」这句话
       * 对定位零帮助，真正有用的是「模型到底写了哪几个页面名」。
       */
      const err = e as Error & { violations?: { message?: string }[]; raw?: string };
      console.error(`\n[${cfg.id}] ✗ 失败：${err.message}`);
      for (const v of err.violations ?? []) console.error(`  · ${v.message ?? JSON.stringify(v)}`);
      if (typeof err.raw === 'string' && err.raw) {
        const dump = resolve(args.out, cfg.id, 'failed-raw.txt');
        mkdirSync(dirname(dump), { recursive: true });
        writeFileSync(dump, err.raw, 'utf-8');
        console.error(`  模型原始输出已存：${dump}（${err.raw.length} 字）`);
      }
      summary.push({ id: cfg.id, ok: false, bad: [err.message] });
    }
  }

  console.log(`\n${'='.repeat(64)}\n汇总`);
  for (const s of summary) {
    console.log(`  ${s.id.padEnd(10)} ${s.ok ? '✓ 通过' : `⚠ ${s.bad.join(' / ')}`}`);
  }
  process.exit(summary.every((s) => s.ok) ? 0 : 1);
}

await main();
