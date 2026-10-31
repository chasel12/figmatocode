/**
 * M7 · 生成 / 编辑管线（W3 / W4）
 *
 * 管线形状（plan §4-W3）：
 *   prompt → 模型 → 抠 JSON → schema 闸门 → 违例摘要 → 自修（≤2 轮）→ 归一化为 UIPage
 * 编辑管线（W4）：
 *   prompt + 选择上下文 → 模型 → 闸门 + 引用校验 → **克隆页干跑** → 差异摘要（等人采纳）
 *
 * 两条管线都**不碰 store**：产物是纯数据，采纳动作由面板负责（AI 只画草稿，编译 100% 确定性）。
 */
import type { UIPage } from '../../schema/types';
import type { StylePack } from '../../tokens/packs/types';
import type { LlmClient, AiUsage, LlmResult } from './client';
import { DEFAULT_MODEL, estimateCostCny } from './client';
import { buildPrompt, buildRepairPrompt, outlineOf, type FewShotEntry, type SelectionContext } from './promptPack';
import { extractJson, summarizeViolations, validateAiOutput } from './contract';
import { draftToPage, type BuildContext } from './specToPage';
import { applyEditOps, type EditDryRun } from './aiActions';
import type { AiEditPlan, AiPageDraft, AiViolation } from './types';

export type GenStage = 'prompt' | 'request' | 'validate' | 'repair' | 'convert' | 'done';

export interface ProgressEvent {
  stage: GenStage;
  /** 第几轮（0 = 首轮，1/2 = 自修轮） */
  attempt: number;
  message: string;
}

export interface PipelineOptions {
  userPrompt: string;
  pack: StylePack;
  viewport: { width: number; height: number };
  client: LlmClient;
  icons?: Record<string, string>;
  fewShots?: FewShotEntry[];
  signal?: AbortSignal;
  onProgress?: (e: ProgressEvent) => void;
  onDelta?: (chunk: string) => void;
  /** 自修轮数上限（plan §4-W3：≤2） */
  maxRepair?: number;
  /** 整站生成时每页都必须出现的导航文案（= 全部页面名）；单页生成时缺省 */
  navItems?: string[];
  /** 成本估算用的模型档位（缺省 opus 档） */
  model?: string;
  /**
   * 用户上传的设计参考正文（已合成）。两条管线都要透传 ——
   * 只在「生成新页」生效、编辑时不带，会让用户改同一页时风格突然跑掉。
   */
  designRef?: string;
}

export interface PipelineResult<T> {
  data: T;
  /** 实际调用轮数（1 = 一次过） */
  attempts: number;
  usage: AiUsage;
  costCny: number;
  elapsedMs: number;
  /** 最终仍存在的违例（通常为空；自修用尽时非空） */
  violations: AiViolation[];
  /** 最后一次模型原文（面板可展开查看） */
  raw: string;
  /** 首轮是否一次通过（评测 §6 指标） */
  firstPass: boolean;
}

const emptyUsage = (): AiUsage => ({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });

/**
 * 输出被截断（`finish_reason=length`）→ 一条 `limit` 违例，且**原文不进自修提示词**。
 *
 * 实测：把半截 JSON 喂回去之后模型会沿着断口继续写，产出 `"kind" , "kind" , …`
 * 这种退化文本，输出量反而翻倍（9K → 21K tokens），越修越烂。
 * 正确做法是当成「这一版没写完」：清空原文，让它重新完整输出。
 */
function truncatedViolation(res: LlmResult): AiViolation | null {
  if (res.finishReason !== 'length') return null;
  return {
    path: '(根)',
    kind: 'limit',
    message: `输出被截断（finish_reason=length，已写 ${res.usage.outputTokens} tokens）；请更精简地重新输出完整 JSON`,
  };
}

const addUsage = (a: AiUsage, b: AiUsage): AiUsage => ({
  inputTokens: a.inputTokens + b.inputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
  cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
  cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
});

/** prompt → 新页面草稿 → UIPage（自修 ≤2 轮） */
export async function runPageGeneration(opts: PipelineOptions): Promise<PipelineResult<UIPage>> {
  const started = Date.now();
  const maxRepair = opts.maxRepair ?? 2;
  const { system, user } = buildPrompt({
    mode: 'page',
    pack: opts.pack,
    userPrompt: opts.userPrompt,
    viewport: opts.viewport,
    fewShots: opts.fewShots,
    designRef: opts.designRef,
    navItems: opts.navItems,
  });
  opts.onProgress?.({ stage: 'prompt', attempt: 0, message: `提示词就绪（${Math.round((system.length + user.length) / 1000)}K 字符）` });

  let usage = emptyUsage();
  let lastRaw = '';
  let lastViolations: AiViolation[] = [];
  let firstPass = false;

  for (let attempt = 0; attempt <= maxRepair; attempt += 1) {
    const userMessage = attempt === 0 ? user : buildRepairPrompt({ previousOutput: lastRaw, violationsText: summarizeViolations(lastViolations), attempt });
    opts.onProgress?.({
      stage: attempt === 0 ? 'request' : 'repair',
      attempt,
      message: attempt === 0 ? '模型生成中…' : `自修第 ${attempt} 轮（${lastViolations.length} 条违例）`,
    });

    const res = await opts.client.run({
      kind: 'page',
      system,
      user: userMessage,
      onDelta: opts.onDelta,
      signal: opts.signal,
    });
    usage = addUsage(usage, res.usage);
    lastRaw = res.text;

    const trunc = truncatedViolation(res);
    if (trunc) {
      lastViolations = [trunc];
      lastRaw = '';
      opts.onProgress?.({ stage: 'validate', attempt, message: trunc.message });
      continue;
    }

    const parsed = extractJson(res.text);
    if (!parsed.ok) {
      lastViolations = [{ path: '(根)', kind: 'schema', message: parsed.error }];
      opts.onProgress?.({ stage: 'validate', attempt, message: parsed.error });
      continue;
    }

    const checked = validateAiOutput(parsed.value, { expect: 'page', pack: opts.pack, icons: opts.icons });
    lastViolations = checked.violations;
    if (!checked.ok) {
      opts.onProgress?.({ stage: 'validate', attempt, message: `${checked.violations.length} 条违例` });
      continue;
    }

    const draft = checked.data as AiPageDraft;
    const built = draftToPage(draft, { pack: opts.pack, icons: opts.icons } satisfies BuildContext);
    /**
     * 只把**需要模型改**的违例算作失败。
     *
     * 归一化顺手改对的那些（`autoFixed`）已经体现在产物里了，再让模型重写一遍
     * 只会得到同一份产物、多烧一次调用；而自修用尽后是**抛异常**，整站生成会连坐
     * （实测：商品详情页 3 条 autoFixed 违例让前 5 页全部白跑）。详见 `AiViolation.autoFixed`。
     */
    const fatal = built.violations.filter((v) => !v.autoFixed);
    const fixedCount = built.violations.length - fatal.length;
    lastViolations = fatal;
    if (fatal.length) {
      opts.onProgress?.({ stage: 'validate', attempt, message: `转换阶段 ${fatal.length} 条违例` });
      continue;
    }

    firstPass = attempt === 0;
    opts.onProgress?.({
      stage: 'done',
      attempt,
      message: `生成完成（${attempt + 1} 轮${fixedCount ? `，自动修复 ${fixedCount} 处` : ''}）`,
    });
    return {
      data: built.page,
      attempts: attempt + 1,
      usage,
      costCny: estimateCostCny(usage, opts.model ?? DEFAULT_MODEL),
      elapsedMs: Date.now() - started,
      violations: [],
      raw: lastRaw,
      firstPass,
    };
  }

  opts.onProgress?.({ stage: 'done', attempt: maxRepair, message: '自修用尽，仍未通过校验' });
  throw Object.assign(new Error('生成结果未通过契约校验'), { violations: lastViolations, raw: lastRaw, usage });
}

/** prompt + 选中 → 编辑计划 → 克隆页干跑（不落库） */
export async function runEditPlan(
  opts: PipelineOptions & { page: UIPage; selection: SelectionContext; existingIds: Set<string> },
): Promise<PipelineResult<EditDryRun & { plan: AiEditPlan }>> {
  const started = Date.now();
  const maxRepair = opts.maxRepair ?? 2;
  const { system, user } = buildPrompt({
    mode: 'edit',
    pack: opts.pack,
    userPrompt: opts.userPrompt,
    viewport: opts.viewport,
    selection: opts.selection,
    fewShots: opts.fewShots,
    designRef: opts.designRef,
  });
  opts.onProgress?.({ stage: 'prompt', attempt: 0, message: '编辑提示词就绪' });

  let usage = emptyUsage();
  let lastRaw = '';
  let lastViolations: AiViolation[] = [];
  let firstPass = false;

  for (let attempt = 0; attempt <= maxRepair; attempt += 1) {
    const userMessage = attempt === 0 ? user : buildRepairPrompt({ previousOutput: lastRaw, violationsText: summarizeViolations(lastViolations), attempt });
    opts.onProgress?.({
      stage: attempt === 0 ? 'request' : 'repair',
      attempt,
      message: attempt === 0 ? '模型生成修改计划…' : `自修第 ${attempt} 轮`,
    });

    const res = await opts.client.run({ kind: 'edit', system, user: userMessage, onDelta: opts.onDelta, signal: opts.signal });
    usage = addUsage(usage, res.usage);
    lastRaw = res.text;

    const trunc = truncatedViolation(res);
    if (trunc) {
      lastViolations = [trunc];
      lastRaw = '';
      opts.onProgress?.({ stage: 'validate', attempt, message: trunc.message });
      continue;
    }

    const parsed = extractJson(res.text);
    if (!parsed.ok) {
      lastViolations = [{ path: '(根)', kind: 'schema', message: parsed.error }];
      continue;
    }
    const checked = validateAiOutput(parsed.value, {
      expect: 'edit',
      pack: opts.pack,
      icons: opts.icons,
      existingIds: opts.existingIds,
    });
    lastViolations = checked.violations;
    if (!checked.ok) {
      opts.onProgress?.({ stage: 'validate', attempt, message: `${checked.violations.length} 条违例` });
      continue;
    }

    const plan = checked.data as AiEditPlan;
    const dry = applyEditOps(opts.page, plan, { pack: opts.pack, icons: opts.icons });
    if (dry.violations.length) {
      lastViolations = dry.violations;
      opts.onProgress?.({ stage: 'validate', attempt, message: `干跑 ${dry.violations.length} 条违例` });
      continue;
    }

    firstPass = attempt === 0;
    opts.onProgress?.({ stage: 'done', attempt, message: `修改计划就绪（${plan.actions.length} 条指令）` });
    return {
      data: { ...dry, plan },
      attempts: attempt + 1,
      usage,
      costCny: estimateCostCny(usage, opts.model ?? DEFAULT_MODEL),
      elapsedMs: Date.now() - started,
      violations: [],
      raw: lastRaw,
      firstPass,
    };
  }

  opts.onProgress?.({ stage: 'done', attempt: maxRepair, message: '自修用尽' });
  throw Object.assign(new Error('修改计划未通过校验'), { violations: lastViolations, raw: lastRaw, usage });
}

export { outlineOf };
