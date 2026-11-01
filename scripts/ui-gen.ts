/**
 * UI 场景批量生成（反 bug 审计的**输入**）
 *
 * `scenarios.ts` 里 45 个场景 → 逐条走真实模型 → 落 draft fixture。
 * 之后 `scripts/ui-audit.ts` 把这些 fixture 当「模型原始输出」扫描，
 * 得到「现在生成出来还有哪些坏形态」。
 *
 * 为什么要落 draft 而不是只落 page：
 *   `page` 已经过 `draftToPage`（含 normalize），bug 被修掉了一部分，
 *   看不出「模型本来写错了什么」。两份都留，才能分清
 *   「模型没写对」和「转换层没兜住」。
 *
 * 用法：
 *   AI_API_KEY=sk-xxx npx vite-node scripts/ui-gen.ts                    # priority 1（10 条）
 *   AI_API_KEY=sk-xxx npx vite-node scripts/ui-gen.ts --priority=all     # 全量 45 条
 *   AI_API_KEY=sk-xxx npx vite-node scripts/ui-gen.ts --only=nav-tabbar
 *   AI_API_KEY=sk-xxx npx vite-node scripts/ui-gen.ts --priority=2 --skip-existing
 *
 * 环境变量：
 *   AI_API_KEY    key（必填）
 *   AI_PROVIDER   缺省 qwen
 *   AI_MODEL      缺省供应商默认档
 *   AI_PACK       缺省 shadcn（与 ui-audit 的 draft 组同一包，否则两侧口径不一致）
 *   AI_CONCURRENCY 并发数，缺省 2（TPM 1.2M，够用；再高只是把自己打成 429）
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createLlmClient, providerDef, type ProviderId } from '../src/editor/ai/client';
import { runPageGeneration } from '../src/editor/ai/generate';
import { draftToPage } from '../src/editor/ai/specToPage';
import { extractJson } from '../src/editor/ai/contract';
import { loadFewShots } from '../src/editor/ai/promptPack';
import { UI_SCENARIOS, type UiScenario } from '../src/editor/ai/scenarios';
import { getPack } from '../src/tokens/packs';
import { loadIcons } from '../src/assets/icons';
import type { AiPageDraft } from '../src/editor/ai/types';
import type { UIPage } from '../src/schema/types';

const argv = process.argv.slice(2);
/**
 * 同时接受 `--flag=value` 与 `--flag value`。
 *
 * 早先只认后一种，而用法注释里写的是 `--only=nav-tabbar` —— 于是 `--only` 被静默忽略，
 * 「只跑 1 个场景」变成「跑完整个 priority 1」，白烧 10 次调用才从日志里看出来。
 * 参数解析的失败模式必须是显式的，不能是「照常跑，只是范围不对」。
 */
const argOf = (flag: string, dflt: string): string => {
  const eq = argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  return i >= 0 ? (argv[i + 1] ?? dflt) : dflt;
};
const has = (flag: string) => argv.includes(flag) || argv.some((a) => a.startsWith(`${flag}=`));

const OUT = resolve(argOf('--out', '.tmp/ui-gen'));
const priorityArg = argOf('--priority', '1');
const onlyArg = argOf('--only', '');
const skipExisting = has('--skip-existing');
const CONCURRENCY = Math.max(1, Number(argOf('--concurrency', process.env.AI_CONCURRENCY ?? '2')) || 2);
const VIEWPORT = { width: 375, height: 812 };

interface Row {
  id: string;
  group: string;
  priority: number;
  ok: boolean;
  /** 失败原因（契约违例摘要 / 网络错误） */
  error?: string;
  attempts?: number;
  nodes?: number;
  texts?: number;
  /** 落盘的 draft 是否可解析（true = 能进 ui-audit） */
  draftSaved?: boolean;
  costCny?: number;
  elapsedMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  /** 产物里出现过的文案，人工看「内容塌陷」用 */
  sampleTexts?: string[];
}

function pick(): UiScenario[] {
  let list = UI_SCENARIOS;
  if (onlyArg) list = list.filter((s) => s.id === onlyArg || s.id.startsWith(`${onlyArg}/`));
  else if (priorityArg !== 'all') {
    const want = new Set(priorityArg.split(',').map((s) => Number(s.trim())));
    list = list.filter((s) => want.has(s.priority));
  }
  if (onlyArg && list.length === 0) {
    console.error(`未找到场景 ${onlyArg}；可用：${UI_SCENARIOS.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }
  return list;
}

function countOf(page: UIPage): { nodes: number; texts: string[] } {
  let nodes = 0;
  const texts: string[] = [];
  const visit = (n: UIPage['root']): void => {
    nodes += 1;
    const t = (n as { text?: string }).text;
    if (typeof t === 'string' && t.trim()) texts.push(t.trim());
    for (const c of (n as { children?: UIPage['root'][] }).children ?? []) visit(c);
  };
  visit(page.root);
  return { nodes, texts };
}

async function main(): Promise<void> {
  const provider = (process.env.AI_PROVIDER ?? 'qwen') as ProviderId;
  const model = process.env.AI_MODEL ?? providerDef(provider).defaultModel;
  const pack = getPack(process.env.AI_PACK ?? 'shadcn');
  mkdirSync(OUT, { recursive: true });

  const iconAssets = await loadIcons();
  const icons = Object.fromEntries(Object.entries(iconAssets.icons).map(([k, v]) => [k, v.d]));

  /**
   * `--rebuild`：**不调模型**，拿已存的 draft 重跑一遍 `draftToPage`。
   *
   * 存在的理由：改了转换层（normalize）之后要验证「同样的模型输出，现在还会不会坏」。
   * 重新生成一遍是**换了输入**（模型非确定性），前后不可比；
   * 重跑管线才是同一份输入过新旧两版转换层，差多少就是规则的效果。
   */
  if (has('--rebuild')) {
    const drafts = readdirSync(OUT).filter((f) => f.endsWith('.draft.json'));
    let ok = 0;
    let bad = 0;
    for (const f of drafts) {
      const id = f.replace(/\.draft\.json$/, '');
      if (onlyArg && !id.startsWith(onlyArg)) continue;
      try {
        const draft = JSON.parse(readFileSync(resolve(OUT, f), 'utf8')) as AiPageDraft;
        const { page } = draftToPage(draft, { pack, icons });
        writeFileSync(resolve(OUT, `${id}.page.json`), `${JSON.stringify(page, null, 2)}\n`, 'utf8');
        ok += 1;
      } catch (e) {
        bad += 1;
        console.log(`  ${id} 失败：${(e as Error).message.slice(0, 80)}`);
      }
    }
    console.log(`重建 ${ok} 页${bad ? `，失败 ${bad}` : ''}（未调模型）`);
    return;
  }

  const apiKey = process.env.AI_API_KEY ?? '';
  if (!apiKey) {
    console.error('缺少 AI_API_KEY');
    process.exit(2);
  }

  const scenarios = pick();
  const fewShots = await loadFewShots();
  const client = await createLlmClient({ provider, apiKey, model });

  console.log(
    `provider=${provider} model=${model} pack=${pack.name} 图标 ${Object.keys(icons).length} 个 fewShot ${fewShots.length} 条`,
  );
  console.log(`场景 ${scenarios.length} 条（priority=${priorityArg}${onlyArg ? ` only=${onlyArg}` : ''}）→ ${OUT}\n`);

  const rows: Row[] = new Array(scenarios.length);
  let cursor = 0;
  let done = 0;
  const t0 = Date.now();

  const worker = async (): Promise<void> => {
    for (;;) {
      const i = cursor;
      cursor += 1;
      if (i >= scenarios.length) return;
      const s = scenarios[i];
      const draftPath = resolve(OUT, `${s.id}.draft.json`);
      const pagePath = resolve(OUT, `${s.id}.page.json`);

      if (skipExisting && existsSync(draftPath) && existsSync(pagePath)) {
        const prevPage = JSON.parse(readFileSync(pagePath, 'utf8')) as UIPage;
        rows[i] = {
          id: s.id,
          group: s.group,
          priority: s.priority,
          ok: true,
          draftSaved: true,
          nodes: countOf(prevPage).nodes,
        };
        done += 1;
        console.log(`[${done}/${scenarios.length}] ${s.id} 跳过（已存在）`);
        continue;
      }

      const started = Date.now();
      try {
        const res = await runPageGeneration({
          userPrompt: s.prompt,
          pack,
          viewport: VIEWPORT,
          client,
          icons,
          fewShots,
          model,
        });
        const parsed = extractJson(res.raw);
        let draftSaved = false;
        if (parsed.ok) {
          writeFileSync(draftPath, `${JSON.stringify(parsed.value, null, 2)}\n`, 'utf8');
          draftSaved = true;
        }
        writeFileSync(pagePath, `${JSON.stringify(res.data, null, 2)}\n`, 'utf8');
        const { nodes, texts } = countOf(res.data);
        rows[i] = {
          id: s.id,
          group: s.group,
          priority: s.priority,
          ok: true,
          attempts: res.attempts,
          nodes,
          texts: texts.length,
          draftSaved,
          costCny: res.costCny,
          elapsedMs: Date.now() - started,
          inputTokens: res.usage.inputTokens,
          outputTokens: res.usage.outputTokens,
          sampleTexts: texts.slice(0, 12),
        };
        done += 1;
        console.log(
          `[${done}/${scenarios.length}] ${s.id} ok · ${nodes} 节点 · ${res.attempts} 轮 · ¥${res.costCny.toFixed(3)} · ${Math.round((Date.now() - started) / 1000)}s${draftSaved ? '' : ' · ⚠ draft 未落盘（raw 不是合法 JSON）'}`,
        );
      } catch (err) {
        const e = err as Error & { violations?: { path: string; message: string }[]; raw?: string };
        const brief = (e.violations ?? [])
          .slice(0, 2)
          .map((v) => `${v.path} ${v.message}`)
          .join('；');
        /**
         * 失败也把模型原文落盘。
         *
         * 失败的产物恰恰是最该看的：只记「未通过契约校验」没法判断是
         * 「模型写错了」还是「转换层不认」。这里多存一个 `.raw.txt`，
         * 事后能直接搜 `{{` / `repeat` 定位（实测 `list-setting` 就是靠它看出
         * `{{icon}}` 没被替换掉的）。
         */
        if (typeof e.raw === 'string' && e.raw.trim()) {
          writeFileSync(resolve(OUT, `${s.id}.raw.txt`), e.raw, 'utf8');
        }
        rows[i] = {
          id: s.id,
          group: s.group,
          priority: s.priority,
          ok: false,
          error: `${e.message}${brief ? `（${brief}）` : ''}`,
          elapsedMs: Date.now() - started,
        };
        done += 1;
        console.log(`[${done}/${scenarios.length}] ${s.id} FAIL · ${e.message}${brief ? `（${brief}）` : ''}`);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, scenarios.length) }, () => worker()));

  const ok = rows.filter((r) => r.ok);
  const failed = rows.filter((r) => !r.ok);
  const cost = rows.reduce((n, r) => n + (r.costCny ?? 0), 0);
  const elapsed = Date.now() - t0;

  const report = {
    generatedAt: new Date().toISOString(),
    provider,
    model,
    pack: pack.id,
    viewport: VIEWPORT,
    concurrency: CONCURRENCY,
    elapsedMs: elapsed,
    scenarios: rows.length,
    ok: ok.length,
    failed: failed.length,
    firstPass: ok.filter((r) => r.attempts === 1).length,
    costCny: Math.round(cost * 1000) / 1000,
    rows,
  };
  writeFileSync(resolve(OUT, 'gen-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(
    `\n生成完成：${ok.length}/${rows.length} 成功 · 首轮通过 ${report.firstPass} · 合计 ¥${report.costCny.toFixed(3)} · ${Math.round(elapsed / 60000)} 分钟`,
  );
  if (failed.length) {
    console.log(`失败 ${failed.length} 条：`);
    for (const f of failed) console.log(`  ${f.id}: ${f.error}`);
  }
  console.log(`报告 → ${resolve(OUT, 'gen-report.json')}`);
  process.exit(failed.length ? 1 : 0);
}

await main();
