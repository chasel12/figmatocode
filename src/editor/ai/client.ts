/**
 * M7 · 模型调用层（W3）
 *
 * 三条硬约束（plan §8）：
 *  1. **key 永不明文入库/入 LOG/git**：只存 localStorage，面板脱敏显示；
 *  2. 零后端定位：浏览器直连（SDK `dangerouslyAllowBrowser`），key 不进任何构建产物；
 *  3. 不满足直连条件时可切 vite 本地代理（`VITE_AI_PROXY_BASE`），仍是本机、不违零后端。
 *
 * 结构化输出用 SDK 的 `output_config.format = { type:'json_schema', schema }`，
 * schema 就是契约层生成的同一份文件——模型侧与闸门侧共用一份定义。
 */
import pageSchema from './contract.page.schema.json';
import editSchema from './contract.edit.schema.json';

/** plan §7：默认 claude-opus-5-5（adaptive thinking + structured outputs） */
export const DEFAULT_MODEL = 'claude-opus-5-5';
export const MODEL_OPTIONS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'] as const;

export type ProviderId = 'anthropic' | 'deepseek';

export interface ProviderDef {
  id: ProviderId;
  label: string;
  /** 非官方端点：走 Anthropic Messages 兼容协议 */
  baseURL?: string;
  models: readonly string[];
  defaultModel: string;
  keyPlaceholder: string;
  /** 面板上的一行能力说明（诚实告知兼容层差异） */
  note: string;
}

/**
 * 供应商表。加一家的成本 = 往这里加一条 + （若协议不同）实现一个 LlmClient。
 * 契约层 / 闸门 / 自修环 / 预览采纳与供应商无关，不用动。
 */
export const PROVIDERS: readonly ProviderDef[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    models: MODEL_OPTIONS,
    defaultModel: DEFAULT_MODEL,
    keyPlaceholder: 'sk-ant-…',
    note: '原生结构化输出（json_schema）+ 显式 prompt caching',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/anthropic',
    models: ['deepseek-flash', 'deepseek-v4-pro'],
    defaultModel: 'deepseek-flash',
    keyPlaceholder: 'sk-…',
    note: 'Anthropic 兼容端点：忽略 output_config，靠契约+闸门+自修环兜住',
  },
];

export function providerDef(id?: ProviderId): ProviderDef {
  const want = id ?? getProvider();
  return PROVIDERS.find((p) => p.id === want) ?? PROVIDERS[0];
}

const KEY_STORAGE = 'ui-compiler.ai.key';
const MODEL_STORAGE = 'ui-compiler.ai.model';
const PROVIDER_STORAGE = 'ui-compiler.ai.provider';

/** 旧键名沿用给 anthropic（已有用户不必重填），其它供应商加后缀隔离 */
const keySlot = (p: ProviderId): string => (p === 'anthropic' ? KEY_STORAGE : `${KEY_STORAGE}.${p}`);
const modelSlot = (p: ProviderId): string => (p === 'anthropic' ? MODEL_STORAGE : `${MODEL_STORAGE}.${p}`);

export function getProvider(): ProviderId {
  try {
    return localStorage.getItem(PROVIDER_STORAGE) === 'deepseek' ? 'deepseek' : 'anthropic';
  } catch {
    return 'anthropic';
  }
}

export function setProvider(id: ProviderId): void {
  try {
    localStorage.setItem(PROVIDER_STORAGE, id);
  } catch {
    /* 隐私模式下写入失败不阻塞 */
  }
}

export function getApiKey(provider?: ProviderId): string {
  const p = provider ?? getProvider();
  try {
    return localStorage.getItem(keySlot(p)) ?? '';
  } catch {
    return '';
  }
}

export function setApiKey(key: string, provider?: ProviderId): void {
  const p = provider ?? getProvider();
  try {
    if (key) localStorage.setItem(keySlot(p), key);
    else localStorage.removeItem(keySlot(p));
  } catch {
    /* 隐私模式下写入失败不阻塞 */
  }
}

export function getModel(provider?: ProviderId): string {
  const p = provider ?? getProvider();
  const fallback = providerDef(p).defaultModel;
  try {
    return localStorage.getItem(modelSlot(p)) || fallback;
  } catch {
    return fallback;
  }
}

export function setModel(model: string, provider?: ProviderId): void {
  const p = provider ?? getProvider();
  try {
    localStorage.setItem(modelSlot(p), model);
  } catch {
    /* 同上 */
  }
}

/** 面板脱敏：sk-ant-…abcd（绝不整串回显，也不进日志） */
export function maskKey(key: string): string {
  if (!key) return '未配置';
  if (key.length <= 10) return `${key.slice(0, 2)}***`;
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface LlmRequest {
  kind: 'page' | 'edit';
  /** 稳定前缀（缓存命中区） */
  system: string;
  /** 易变尾部 */
  user: string;
  /** 流式增量回调（面板显示进度） */
  onDelta?: (chunk: string) => void;
  signal?: AbortSignal;
  /** 输出上限：plan §4-W3 要求 64K */
  maxTokens?: number;
}

export interface LlmResult {
  text: string;
  usage: AiUsage;
  model: string;
}

export interface LlmClient {
  run(req: LlmRequest): Promise<LlmResult>;
}

/**
 * 参考价（USD / MTok）。**不是官方报价**，而是按 plan §7 的单页成本口径（¥0.3–1.5）反推的量级值，
 * 只用于面板上的"这次大概花了多少"提示，不参与任何质量判定。
 * 正式对账请以官方价目页为准，替换本表即可（成本展示与 ai-matrix 会同步生效）。
 *
 * DeepSeek 两档为**人民币价按 7.2 折算**，且取**高峰时段**（周一至周五 9–12、14–18）价，
 * 空闲时段为其一半——宁可高估，避免成本看板给出过于乐观的数。
 * 来源：api-docs.deepseek.com/zh-cn/quick_start/pricing（2026-10-22 查）
 */
const MODEL_PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-opus-5-5': { input: 3, output: 15, cacheRead: 0.2 },
  'claude-sonnet-5-5': { input: 1.5, output: 7.5, cacheRead: 0.15 },
  'claude-haiku-5-5': { input: 0.5, output: 2.5, cacheRead: 0.05 },
  // ¥2 / ¥8 / ¥0.04 per MTok（高峰）→ USD
  'deepseek-flash': { input: 0.278, output: 1.111, cacheRead: 0.006 },
  // ¥9 / ¥27 / ¥0.30 per MTok（高峰）→ USD
  'deepseek-v4-pro': { input: 1.25, output: 3.75, cacheRead: 0.042 },
};

const USD_CNY = 7.2;

/** 单次调用成本估算（人民币，保留 3 位；缓存读按折扣价） */
export function estimateCostCny(usage: AiUsage, model: string): number {
  const p = MODEL_PRICES[model] ?? MODEL_PRICES[DEFAULT_MODEL];
  const usd =
    ((usage.inputTokens - usage.cacheReadTokens) * p.input +
      usage.cacheReadTokens * p.cacheRead +
      usage.outputTokens * p.output) /
    1_000_000;
  return Math.round(usd * USD_CNY * 1000) / 1000;
}

/** 错误 → 中文可操作提示（面板直接展示） */
export function describeAiError(err: unknown): string {
  const e = err as { status?: number; message?: string; name?: string };
  if (e?.name === 'AbortError') return '已取消';
  switch (e?.status) {
    case 401:
      return 'API key 无效或已过期，请在设置里重新填写';
    case 403:
      return '该 key 无权访问此模型，请检查模型档位';
    case 404:
      return '模型不存在或不可用，请在设置里换一个档位';
    case 429:
      return '触发限流（429），稍后重试或换轻档模型';
    case 413:
      return '请求过大，请缩短提示词或减少选中范围';
    case 500:
    case 529:
      return '模型服务暂时不可用，稍后重试';
    default:
      break;
  }
  const msg = e?.message ?? '未知错误';
  if (/Failed to fetch|NetworkError|CORS/i.test(msg)) {
    return '网络/跨域失败：浏览器直连被拦截，可改用本地代理（VITE_AI_PROXY_BASE）';
  }
  return msg;
}

/**
 * 真实客户端：浏览器直连。
 * 代理兜底：构建时设 `VITE_AI_PROXY_BASE=http://localhost:5173/anthropic` 即走 vite 代理，
 * 此时不再需要 dangerouslyAllowBrowser（key 由代理转发，仍在用户本机）。
 *
 * 第三方兼容端点（如 DeepSeek `https://api.deepseek.com/anthropic`）同样走 baseURL，
 * 但**兼容层能力有差异**：DeepSeek 会静默忽略 `output_config.format`（实测同一提示词 4 次
 * 返回 4 种不同形状），因此按端点能力降级为「prompt 契约 + 闸门 + 自修环」——
 * 这也是为什么闸门层必须模型无关（它本来就是）。
 */
export interface ClientOptions {
  apiKey?: string;
  model?: string;
  /** 供应商：决定默认端点、模型档与 key 槽位 */
  provider?: ProviderId;
  /** 覆盖端点：任何兼容 Anthropic Messages 协议的服务 */
  baseURL?: string;
  /** 是否启用 Anthropic 原生结构化输出；默认按端点能力推断 */
  structuredOutput?: boolean;
}

/** 读构建/运行环境变量（浏览器走 import.meta.env，node 评测轨走 process.env） */
function envOf(): Record<string, string | undefined> {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  const nodeEnv = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env ?? {};
  return { ...nodeEnv, ...viteEnv };
}

/**
 * 兼容层能力探测：是否支持 `output_config.format = json_schema`。
 * DeepSeek 的 Anthropic 端点官方文档写明 `output_config` **仅支持 `effort`**，实测传 format
 * 不报错也不生效（静默忽略）。传了只会让人误以为有强约束，故直接关掉并靠 prompt 契约兜。
 */
export function supportsJsonSchema(baseURL: string | undefined): boolean {
  if (!baseURL) return true; // 官方 Anthropic
  if (/deepseek/i.test(baseURL)) return false;
  return true;
}

export async function createAnthropicClient(options: ClientOptions = {}): Promise<LlmClient> {
  // SDK 约 200KB：动态 import，只有真正生成时才加载（主包零增量）
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const env = envOf();
  const providerId = options.provider ?? getProvider();
  const def = providerDef(providerId);
  const apiKey = options.apiKey ?? getApiKey(providerId);
  const model = options.model ?? getModel(providerId);
  const baseURL = options.baseURL ?? env.AI_BASE_URL ?? env.VITE_AI_PROXY_BASE ?? def.baseURL;
  const structuredOutput = options.structuredOutput ?? supportsJsonSchema(baseURL);
  // 结构化输出关闭时，在易变尾部（不动 system 稳定前缀）补一句强约束
  const jsonOnlyReminder = structuredOutput
    ? ''
    : '\n\n（再提醒一次：只输出一个 JSON 对象，严格遵守 system 里的契约；不要 markdown 围栏、不要任何解释文字。）';

  if (!apiKey) throw new Error('未配置 API key');

  const client = new Anthropic({
    apiKey,
    // 只有走**本地代理**（VITE_AI_PROXY_BASE）时浏览器才不直接持有请求，可以关掉；
    // 第三方兼容端点（如 DeepSeek）是浏览器直连、key 来自 localStorage，必须允许，
    // 否则 SDK 会直接抛「browser-like environment ... disabled by default」。
    dangerouslyAllowBrowser: !env.VITE_AI_PROXY_BASE,
    ...(baseURL ? { baseURL } : {}),
  });

  return {
    async run(req: LlmRequest): Promise<LlmResult> {
      const schema = req.kind === 'page' ? pageSchema : editSchema;
      const stream = client.messages.stream(
        {
          model,
          max_tokens: req.maxTokens ?? 64000,
          system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: req.user + jsonOnlyReminder }],
          ...(structuredOutput
            ? { output_config: { format: { type: 'json_schema', schema: schema as Record<string, unknown> } } }
            : {}),
        },
        { signal: req.signal },
      );

      if (req.onDelta) stream.on('text', (chunk: string) => req.onDelta?.(chunk));

      const message = await stream.finalMessage();
      const text = message.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('');
      const usage = message.usage as unknown as {
        input_tokens?: number;
        output_tokens?: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
      };
      return {
        text,
        model,
        usage: {
          inputTokens: usage.input_tokens ?? 0,
          outputTokens: usage.output_tokens ?? 0,
          cacheReadTokens: usage.cache_read_input_tokens ?? 0,
          cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
        },
      };
    },
  };
}

/** 未配置 key 时面板整体置灰（plan §8.1：复用静默空转模式，不弹错） */
export function aiAvailable(provider?: ProviderId): boolean {
  return getApiKey(provider).length > 0;
}
