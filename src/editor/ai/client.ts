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

export type ProviderId = 'anthropic' | 'deepseek' | 'openai' | 'gemini' | 'ollama' | 'custom';

/** 线路协议：决定用哪个 client 实现（与「哪家公司」解耦，一家可能提供多种协议） */
export type Protocol = 'anthropic' | 'openai';

export interface ProviderDef {
  id: ProviderId;
  label: string;
  /** 该供应商默认走哪种协议 */
  protocol: Protocol;
  /** 非官方端点：Anthropic 走 Messages 兼容协议、OpenAI 走 /chat/completions */
  baseURL?: string;
  models: readonly string[];
  defaultModel: string;
  keyPlaceholder: string;
  /** 面板上的一行能力说明（诚实告知兼容层差异） */
  note: string;
  /** 本地端点（Ollama 等）不需要 key */
  keyOptional?: boolean;
  /** 模型名可自由填写：端点支持的模型清单会变，写死列表必然过期 */
  modelEditable?: boolean;
  /** 端点是否支持 `response_format = json_schema`（关掉时靠契约+闸门+自修环兜） */
  jsonSchema?: boolean;
  /** 端点地址由用户填写（custom） */
  baseURLEditable?: boolean;
}

/**
 * 供应商表。加一家的成本 = 往这里加一条；**只有协议不同才需要写新 client**。
 * 契约层 / 闸门 / 自修环 / 预览采纳与供应商无关，不用动。
 *
 * 关于模型名：OpenAI / Gemini / 本地推理的模型清单迭代很快，写死一份必然过期，
 * 所以这几家标 `modelEditable`，面板给输入框（下拉只是建议值）。找不到模型时的
 * 报错已被 `describeAiError` 翻成「模型不存在或不可用，请换一个档位」。
 */
export const PROVIDERS: readonly ProviderDef[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    protocol: 'anthropic',
    models: MODEL_OPTIONS,
    defaultModel: DEFAULT_MODEL,
    keyPlaceholder: 'sk-ant-…',
    note: '原生结构化输出（json_schema）+ 显式 prompt caching',
    jsonSchema: true,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    protocol: 'anthropic',
    baseURL: 'https://api.deepseek.com/anthropic',
    models: ['deepseek-flash', 'deepseek-v4-pro'],
    defaultModel: 'deepseek-flash',
    keyPlaceholder: 'sk-…',
    note: 'Anthropic 兼容端点：忽略 output_config，靠契约+闸门+自修环兜住',
    jsonSchema: false,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    protocol: 'openai',
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-5.1', 'gpt-5-mini'],
    defaultModel: 'gpt-5.1',
    keyPlaceholder: 'sk-…',
    note: 'OpenAI 协议（/chat/completions）：支持 response_format json_schema',
    modelEditable: true,
    jsonSchema: true,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    protocol: 'openai',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-3-pro', 'gemini-3-flash'],
    defaultModel: 'gemini-3-flash',
    keyPlaceholder: 'AIza…',
    note: 'Gemini 的 OpenAI 兼容层：json_schema 支持有限，默认走 prompt 契约',
    modelEditable: true,
    jsonSchema: false,
  },
  {
    id: 'ollama',
    label: 'Ollama（本机）',
    protocol: 'openai',
    baseURL: 'http://localhost:11434/v1',
    models: ['qwen3-coder', 'llama3.3'],
    defaultModel: 'qwen3-coder',
    keyPlaceholder: '（本地无需 key）',
    note: '本机推理，不需要 key、不联网；模型名填 `ollama list` 里的名字',
    keyOptional: true,
    modelEditable: true,
    jsonSchema: false,
  },
  {
    id: 'custom',
    label: '自定义端点',
    protocol: 'openai',
    models: ['（填端点支持的模型名）'],
    defaultModel: '',
    keyPlaceholder: '按端点要求填写，可留空',
    note: '任何 OpenAI 兼容端点（vLLM / LM Studio / 公司内网网关）：填 baseURL 与模型名',
    keyOptional: true,
    modelEditable: true,
    baseURLEditable: true,
    jsonSchema: false,
  },
];

export function providerDef(id?: ProviderId): ProviderDef {
  const want = id ?? getProvider();
  return PROVIDERS.find((p) => p.id === want) ?? PROVIDERS[0];
}

const KEY_STORAGE = 'ui-compiler.ai.key';
const MODEL_STORAGE = 'ui-compiler.ai.model';
const PROVIDER_STORAGE = 'ui-compiler.ai.provider';
const BASEURL_STORAGE = 'ui-compiler.ai.baseurl';

/** 旧键名沿用给 anthropic（已有用户不必重填），其它供应商加后缀隔离 */
const keySlot = (p: ProviderId): string => (p === 'anthropic' ? KEY_STORAGE : `${KEY_STORAGE}.${p}`);
const modelSlot = (p: ProviderId): string => (p === 'anthropic' ? MODEL_STORAGE : `${MODEL_STORAGE}.${p}`);

export function getProvider(): ProviderId {
  try {
    const raw = localStorage.getItem(PROVIDER_STORAGE);
    // 旧版本只认识 anthropic/deepseek；表里没有的一律回退默认，避免脏值把面板卡死
    return raw && PROVIDERS.some((p) => p.id === raw) ? (raw as ProviderId) : 'anthropic';
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

/** 自定义端点地址（仅 `baseURLEditable` 的供应商会用到；空串表示用表里的默认值） */
export function getBaseURL(provider?: ProviderId): string {
  const p = provider ?? getProvider();
  try {
    return localStorage.getItem(`${BASEURL_STORAGE}.${p}`) ?? '';
  } catch {
    return '';
  }
}

export function setBaseURL(url: string, provider?: ProviderId): void {
  const p = provider ?? getProvider();
  try {
    if (url) localStorage.setItem(`${BASEURL_STORAGE}.${p}`, url);
    else localStorage.removeItem(`${BASEURL_STORAGE}.${p}`);
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

/** 该模型是否有参考价（表里没有就别显示金额——回退成别家的价只会给出错误印象） */
export function isPriced(model: string): boolean {
  return model in MODEL_PRICES;
}

/** 单次调用成本估算（人民币，保留 3 位；缓存读按折扣价）。未收录的模型返回 0，UI 显示「未计价」 */
export function estimateCostCny(usage: AiUsage, model: string): number {
  const p = MODEL_PRICES[model];
  if (!p) return 0;
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
  const p = provider ?? getProvider();
  // 本地/自建端点不需要 key：只要有端点就允许跑（401 由 describeAiError 翻译）
  if (providerDef(p).keyOptional) return true;
  return getApiKey(p).length > 0;
}

/* ============================ OpenAI 兼容协议 ============================ */

/** 端点用量字段（各家兼容层命名不一，按出现顺序取第一个有值的） */
interface OpenAiUsageRaw {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
  prompt_cache_hit_tokens?: number;
}

function mapOpenAiUsage(u: OpenAiUsageRaw): AiUsage {
  // 口径与 Anthropic 侧一致：inputTokens 含缓存命中部分，estimateCostCny 内部会做拆分
  return {
    inputTokens: u.prompt_tokens ?? 0,
    outputTokens: u.completion_tokens ?? 0,
    cacheReadTokens: u.prompt_tokens_details?.cached_tokens ?? u.prompt_cache_hit_tokens ?? 0,
    cacheWriteTokens: 0,
  };
}

/** 错误体里取一段人类可读的 message（各家格式不同，取不到就截原始文本） */
function messageOf(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } | string; message?: string };
    if (typeof parsed.error === 'string') return parsed.error;
    return parsed.error?.message ?? parsed.message ?? raw.slice(0, 300);
  } catch {
    return raw.slice(0, 300);
  }
}

/**
 * OpenAI 兼容端点客户端（`POST {baseURL}/chat/completions`，SSE 流式）。
 *
 * 为什么手写而不引 SDK：`openai` 包会与 `@anthropic-ai/sdk` 的 fetch/stream 依赖叠加，
 * 而且我们只需要一个 POST + SSE 解析，手写约 60 行、零新增依赖、行为完全可控。
 *
 * 兼容层差异的处置（与 DeepSeek 那次同一思路：能力探测 + 降级，不假装支持）：
 *  - `response_format.json_schema`：只有标注 `jsonSchema` 的供应商才发；其余走 prompt 契约，
 *    由闸门 + 自修环兜住。`strict: false`——我们的契约 schema 不满足 OpenAI 严格子集
 *    （要求所有字段 required + additionalProperties:false），开 strict 会被直接拒。
 *  - `max_completion_tokens` 是新一代字段，老端点只认 `max_tokens`：先发新字段，
 *    400 且报文提到该字段时自动重试一次旧字段。
 */
export async function createOpenAiCompatClient(options: ClientOptions = {}): Promise<LlmClient> {
  const env = envOf();
  const providerId = options.provider ?? getProvider();
  const def = providerDef(providerId);
  const apiKey = options.apiKey ?? getApiKey(providerId);
  const model = options.model ?? getModel(providerId);
  // 注意用 `||` 而不是 `??`：getBaseURL 对「没存过」返回的是空串（不是 null），
  // 用 `??` 会把空串当成有效值，导致默认端点永远不生效（实测踩过）。
  const baseURL = (options.baseURL || env.AI_BASE_URL || getBaseURL(providerId) || def.baseURL || '').replace(/\/+$/, '');
  const jsonSchema = options.structuredOutput ?? def.jsonSchema ?? false;

  if (!apiKey && !def.keyOptional) throw new Error('未配置 API key');
  if (!baseURL) throw new Error('未配置端点地址（请在供应商旁填写 baseURL）');
  if (!model) throw new Error('未填写模型名');

  const post = async (body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> => {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });
    if (res.ok) return res;
    const raw = await res.text().catch(() => '');
    const err = new Error(messageOf(raw) || `HTTP ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  };

  return {
    async run(req: LlmRequest): Promise<LlmResult> {
      const schema = req.kind === 'page' ? pageSchema : editSchema;
      const jsonOnlyReminder = jsonSchema
        ? ''
        : '\n\n（再提醒一次：只输出一个 JSON 对象，严格遵守 system 里的契约；不要 markdown 围栏、不要任何解释文字。）';

      const base: Record<string, unknown> = {
        model,
        stream: true,
        stream_options: { include_usage: true },
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user + jsonOnlyReminder },
        ],
        ...(jsonSchema
          ? {
              response_format: {
                type: 'json_schema',
                json_schema: { name: req.kind === 'page' ? 'page' : 'edit', schema: schema as Record<string, unknown>, strict: false },
              },
            }
          : {}),
      };
      // 输出上限：显式给了才发，避免不同端点的默认上限/字段名差异把请求打 400
      const withLimit = req.maxTokens
        ? { ...base, max_completion_tokens: req.maxTokens }
        : base;

      let res: Response;
      try {
        res = await post(withLimit, req.signal);
      } catch (e) {
        const err = e as Error & { status?: number };
        const legacyLimit = req.maxTokens && err.status === 400 && /max_completion_tokens/i.test(err.message);
        if (!legacyLimit) throw e;
        // 老端点：退回 max_tokens 重试一次
        const { max_completion_tokens: _drop, ...rest } = withLimit as Record<string, unknown> & { max_completion_tokens?: number };
        res = await post({ ...rest, max_tokens: req.maxTokens }, req.signal);
      }

      if (!res.body) throw new Error('端点没有返回流式响应体（可能是非流式端点）');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let text = '';
      let usage: AiUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE 事件以空行分隔（兼容 \r\n）；最后一段可能是半截，留在 buffer 里
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? '';
        for (const evt of events) {
          for (const line of evt.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            let chunk: {
              choices?: { delta?: { content?: string | null } }[];
              usage?: OpenAiUsageRaw;
            };
            try {
              chunk = JSON.parse(payload);
            } catch {
              continue; // 心跳/注释行
            }
            const delta = chunk.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta) {
              text += delta;
              req.onDelta?.(delta);
            }
            if (chunk.usage) usage = mapOpenAiUsage(chunk.usage);
          }
        }
      }

      return { text, model, usage };
    },
  };
}

/**
 * 统一工厂：按供应商的 `protocol` 选实现。
 * 调用方（AiDock / 评测轨）只认这个入口，加协议时不用改调用点。
 */
export async function createLlmClient(options: ClientOptions = {}): Promise<LlmClient> {
  const id = options.provider ?? getProvider();
  return providerDef(id).protocol === 'openai' ? createOpenAiCompatClient(options) : createAnthropicClient(options);
}
