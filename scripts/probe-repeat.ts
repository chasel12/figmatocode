/**
 * 探针：连跑 N 次，统计首轮违例的**种类分布**。
 * 单次结果有随机性，看不出「主要失败原因」。
 *
 * 用法：AI_API_KEY=... AI_PROBE_RUNS=3 npx vite-node scripts/probe-repeat.ts
 */
import { createLlmClient, type ProviderId } from '../src/editor/ai/client';
import { runPageGeneration } from '../src/editor/ai/generate';
import { loadFewShots } from '../src/editor/ai/promptPack';
import { countNodes } from '../src/editor/ai/specToPage';
import { auditDraft, formatMetrics } from '../src/editor/ai/audit';
import { PACKS } from '../src/tokens/packs';
import { loadIcons } from '../src/assets/icons';
import type { AiViolation } from '../src/editor/ai/types';

const PROMPT = '做一个健身计划app，显示出日历表格，对应的日期备注动作在日期上，主色调用黑绿色';

/** 把违例归一化成「种类」，便于统计 */
function kindOf(v: AiViolation): string {
  const m = v.message;
  if (m.includes('图标库中不存在')) return '图标名不存在';
  if (m.includes('不支持的 class')) return 'className 不在白名单';
  if (m.includes('没给 values')) return 'repeat 缺 values';
  if (m.includes('repeat.count')) return 'repeat.count 非法';
  if (m.includes('未知风格令牌')) return '未知颜色令牌';
  if (m.includes('展开后节点数超过上限')) return 'repeat 展开超限';
  return `其他：${m.slice(0, 60)}`;
}

async function main(): Promise<void> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error('缺 AI_API_KEY');
  const provider = (process.env.AI_PROVIDER ?? 'qwen') as ProviderId;
  const model = process.env.AI_MODEL ?? 'deepseek-v4.1-flash';
  const runs = Number(process.env.AI_PROBE_RUNS ?? 1);
  const maxRepair = Number(process.env.AI_MAX_REPAIR ?? 0);
  const pack = PACKS.find((p) => p.id === 'blackgreen') ?? PACKS[0];

  const iconAssets = await loadIcons();
  const iconMap = Object.fromEntries(Object.entries(iconAssets.icons).map(([k, v]) => [k, v.d]));
  const client = await createLlmClient({ provider, apiKey, model });
  const fewShots = await loadFewShots();

  const tally = new Map<string, number>();
  let passed = 0;
  let firstPass = 0;
  const nodeSamples: number[] = [];
  const cellSamples: number[] = [];

  for (let k = 0; k < runs; k += 1) {
    console.log(`\n===== 第 ${k + 1}/${runs} 轮（maxRepair=${maxRepair}）=====`);
    try {
      const r = await runPageGeneration({
        userPrompt: PROMPT,
        pack,
        viewport: { width: 375, height: 812 },
        client,
        icons: iconMap,
        fewShots,
        model,
        maxRepair,
        onProgress: (e) => console.log(`[${e.stage} #${e.attempt}] ${e.message}`),
      });
      passed += 1;
      if (r.firstPass) firstPass += 1;
      const cells = JSON.stringify(r.data.root).match(/"text":"\d+"/g)?.length ?? 0;
      const total = countNodes(r.data.root);
      nodeSamples.push(total);
      cellSamples.push(cells);
      /**
       * 结构指标走 `audit.ts`（与 `ai-baseline.ts` 同一套口径）。
       * 别在这里另算一份——两套口径比不出东西，是「假绿」的经典成因。
       */
      const metrics = auditDraft(r.data);
      console.log(
        `✓ 通过（${r.attempts} 轮，首轮 ${r.firstPass ? '是' : '否'}），节点 ${total}，数字文本 ${cells} 个`,
      );
      console.log(`   ${formatMetrics(metrics)}`);
    } catch (e) {
      const err = e as { violations?: AiViolation[] };
      console.log('✗ 失败，违例：');
      for (const v of err.violations ?? []) {
        const kk = kindOf(v);
        tally.set(kk, (tally.get(kk) ?? 0) + 1);
        console.log(`   - ${kk}  @ ${v.path}`);
        // className 与 repeat 类必须看原文，否则不知道该补哪条白名单
        if (kk.startsWith('其他') || kk.includes('repeat') || kk.includes('className')) console.log(`     ${v.message}`);
      }
    }
  }

  console.log(`\n===== 汇总（${runs} 轮，maxRepair=${maxRepair}）=====`);
  console.log(`通过 ${passed}/${runs}，首轮通过 ${firstPass}/${runs}`);
  const stat = (arr: number[], name: string): void => {
    if (!arr.length) return;
    const sorted = [...arr].sort((a, b) => a - b);
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    console.log(`${name}：均值 ${avg.toFixed(1)} · 范围 ${sorted[0]}~${sorted[sorted.length - 1]} · 样本 [${arr.join(', ')}]`);
  };
  stat(nodeSamples, '节点数');
  stat(cellSamples, '日历数字文本');
  if (tally.size) {
    console.log('违例分布：');
    for (const [k, n] of [...tally.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${n} × ${k}`);
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
