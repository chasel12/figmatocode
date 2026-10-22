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

const KEY_STORAGE = 'ui-compiler.ai.key';
const MODEL_STORAGE = 'ui-compiler.ai.model';

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* 隐私模式下写入失败不阻塞 */
  }
}

export function getModel(): string {
  try {
    return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export function setModel(model: string): void {
  try {
    localStorage.setItem(MODEL_STORAGE, model);
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
 */
const MODEL_PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-opus-5-5': { input: 3, output: 15, cacheRead: 0.2 },
  'claude-sonnet-5-5': { input: 1.5, output: 7.5, cacheRead: 0.15 },
  'claude-haiku-5-5': { input: 0.5, output: 2.5, cacheRead: 0.05 },
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
 */
export async function createAnthropicClient(options: { apiKey?: string; model?: string } = {}): Promise<LlmClient> {
  // SDK 约 200KB：动态 import，只有真正生成时才加载（主包零增量）
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const apiKey = options.apiKey ?? getApiKey();
  const model = options.model ?? getModel();
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  const proxyBase = env.VITE_AI_PROXY_BASE;

  if (!apiKey) throw new Error('未配置 API key');

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: !proxyBase,
    ...(proxyBase ? { baseURL: proxyBase } : {}),
  });

  return {
    async run(req: LlmRequest): Promise<LlmResult> {
      const schema = req.kind === 'page' ? pageSchema : editSchema;
      const stream = client.messages.stream(
        {
          model,
          max_tokens: req.maxTokens ?? 64000,
          system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: req.user }],
          output_config: { format: { type: 'json_schema', schema: schema as Record<string, unknown> } },
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
export function aiAvailable(): boolean {
  return getApiKey().length > 0;
}
