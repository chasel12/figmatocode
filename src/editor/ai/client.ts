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
import siteSchema from './contract.site.schema.json';
import editSchema from './contract.edit.schema.json';

/** plan §7：默认 claude-opus-5-5（adaptive thinking + structured outputs） */
export const DEFAULT_MODEL = 'claude-opus-5-5';
export const MODEL_OPTIONS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'] as const;

export type ProviderId = 'anthropic' | 'deepseek' | 'qwen' | 'openai' | 'gemini' | 'ollama' | 'custom';

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
  /**
   * 端点只支持 `response_format = json_object`：保证是**合法 JSON**，但不约束字段。
   * 比「什么都不发」强一档（解析失败率低），比 `json_schema` 弱（字段全靠 prompt 契约）。
   * 阿里云百炼的 DeepSeek 属此列——实测 `json_schema` 直接回
   * `This response_format type is unavailable now`，`json_object` 正常。
   */
  jsonObject?: boolean;
  /**
   * 端点的思考模式**默认开着**，必须显式关（`enable_thinking: false`）。
   *
   * 为什么值得单独一个开关：思考 token 按**输出价**计费，而本项目只取 `delta.content`，
   * reasoning 全丢。实测百炼 deepseek-v4.1-flash 一次「只输出 {"ok":1}」的请求，
   * `completion_tokens: 60` 里 `reasoning_tokens: 54`、`text_tokens: 5` —— 关掉后
   * 输出直接降到 5 token，单次输出成本约 1/12。生成整页时差距只会更大。
   */
  disableThinking?: boolean;
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
    id: 'qwen',
    label: '千问/百炼',
    protocol: 'openai',
    /**
     * 阿里云百炼的 OpenAI 兼容端点（qianwenai.com 的模型页给的就是这个地址）。
     * 实测：CORS 允许浏览器直连（回显 Origin + allow-headers: authorization），
     * 不需要代理；`stream` / `stream_options.include_usage` / `system` role 均正常。
     */
    baseURL: 'https://cn-beijing.maas.qianwenaiapi.com/compatible-mode/v1',
    models: ['deepseek-v4.1-flash', 'deepseek-v4-pro', 'qwen3-coder'],
    defaultModel: 'deepseek-v4.1-flash',
    keyPlaceholder: 'sk-…（百炼控制台 API-KEY）',
    note: '百炼 OpenAI 兼容端点：仅支持 json_object（json_schema 不可用），默认关思考以省输出 token',
    modelEditable: true,
    jsonObject: true,
    disableThinking: true,
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
    models: ['qwen3-coder'],
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

/**
 * 请求类型 → 结构化输出的 JSON Schema。
 *
 * **必须只有这一个映射点**：曾经两处各写一遍三元表达式（`kind === 'page' ? pageSchema : editSchema`），
 * 加 `site` 时漏改就变成「规划请求被强塞页面 schema」——走结构化输出的供应商会
 * 强制模型吐一棵节点树，而 FakeClient 忽略 `kind`，单测完全看不见。
 */
export function schemaOfKind(kind: LlmRequest['kind']): unknown {
  return kind === 'page' ? pageSchema : kind === 'site' ? siteSchema : editSchema;
}

export interface LlmRequest {
  kind: 'page' | 'site' | 'edit';
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
  /**
   * 流式响应的结束原因（`stop` / `length` / `content_filter` / …）。
   *
   * 为什么必须暴露：`length` 表示**输出被截断**——拿到的是一个残缺 JSON。
   * 早先这里不读这个字段，截断被当成正常回答，于是「解析失败 → 自修」
   * 把半截 JSON 喂回模型，模型沿着断口继续写，产出 `"kind" , "kind" , …` 这种退化文本，
   * 越修越烂（实测零食商城购物车页连挂两次，outputTokens 从 9K 涨到 21K）。
   */
  finishReason?: string;
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
  // 百炼定价 ¥1 / ¥4 / ¥0.1 per MTok（忙时；东八区 22:00–次日 8:00 错峰更低）→ USD
  'deepseek-v4.1-flash': { input: 0.139, output: 0.556, cacheRead: 0.014 },
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
  /**
   * 「端点没收到 key」——和「key 无效」是两件事，必须分开说。
   * 常见于：key 只填在输入框没点「保存 key」、或切换供应商后填到了上一家的槽位。
   * 端点原文形如 `No API-key provided.` / `Missing API key` / `api key is required`。
   */
  if (/no\s+api[-_ ]?key|missing\s+(the\s+)?api[-_ ]?key|api[-_ ]?key\s+(is\s+)?(missing|required|not\s+provided)/i.test(msg)) {
    return '端点没有收到 API key：请确认已点「保存 key」，且填 key 时选的供应商与当前一致';
  }
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
 * 兼容层能力探测（纯 URL 启发式）：是否支持 `output_config.format = json_schema`。
 * DeepSeek 的 Anthropic 端点官方文档写明 `output_config` **仅支持 `effort`**，实测传 format
 * 不报错也不生效（静默忽略）。传了只会让人误以为有强约束，故直接关掉并靠 prompt 契约兜。
 *
 * **不要直接调它做判定** —— 用 `structuredOutputFor()`。原因见那个函数的注释。
 */
export function supportsJsonSchema(baseURL: string | undefined): boolean {
  if (!baseURL) return true; // 官方 Anthropic
  if (/deepseek/i.test(baseURL)) return false;
  return true;
}

/**
 * 结构化输出判定的**唯一权威**。
 *
 * ## 为什么要这个函数
 * 供应商表里早就有 `jsonSchema` 字段，但 anthropic 协议那条路径**从来没读过它** ——
 * 只看 `supportsJsonSchema(baseURL)` 这个 URL 正则。于是同一件事有两个权威：
 * 表里写 `jsonSchema:false` 的供应商，只要 baseURL 里不含 "deepseek" 就会被判成支持，
 * 而端点其实会**静默忽略** `output_config`（不报错、不生效）。这比「明确不支持」更糟：
 * 它会让人以为有强约束。
 *
 * ## 现在的顺序
 * 1. 表里有显式声明 → 用表（人对端点能力的判断优先于正则）；
 * 2. 表里没写 → 退回 URL 启发式。
 *
 * `tests/ai-providers.test.ts` 有一条漂移守卫：所有 anthropic 协议的供应商，
 * 两种判定必须一致。加新供应商时表写错会当场红。
 */
export function structuredOutputFor(providerId: ProviderId, baseURL: string | undefined): boolean {
  const def = providerDef(providerId);
  if (def.jsonSchema !== undefined) return def.jsonSchema;
  return supportsJsonSchema(baseURL);
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
  const structuredOutput = options.structuredOutput ?? structuredOutputFor(providerId, baseURL);
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
      const schema = schemaOfKind(req.kind);
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
 * 本地/内网端点：允许不带 key（Ollama、LM Studio、vLLM、公司内网网关）。
 *
 * 存在的理由：`keyOptional` 这个标志位只说「这家供应商**可以**不要 key」，
 * 但没说「所有地址都可以不要」。早先把两者当成一回事，于是填了公网地址又没填 key 时，
 * 请求会**照发**，只是少了 Authorization 头 —— 服务端回 `No API-key provided`，
 * 用户看到的是「key 无效」，实际是「key 根本没发出去」（实测踩过）。
 */
function isLocalEndpoint(baseURL: string): boolean {
  try {
    const host = new URL(baseURL).hostname;
    if (host === 'localhost' || host === '::1' || host === '0.0.0.0' || host === '[::1]') return true;
    if (/^127\./.test(host)) return true;
    if (/^10\./.test(host)) return true;
    if (/^192\.168\./.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
    return false;
  } catch {
    // 地址不是合法 URL（例如填了相对路径的代理前缀）：交给后面的 fetch 报错，这里不猜
    return false;
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
  // json_schema 优先；不支持时才退到 json_object（有约束总比没有强，但两者不叠加）
  const jsonObject = !jsonSchema && (def.jsonObject ?? false);

  if (!apiKey && !def.keyOptional) throw new Error('未配置 API key');
  if (!baseURL) throw new Error('未配置端点地址（请在供应商旁填写 baseURL）');
  if (!model) throw new Error('未填写模型名');
  /**
   * 空 key + 公网端点 = 必然失败。**必须在发请求前拦下**，否则报的是服务端的
   * 「No API-key provided」，会把人引到「key 填错了」的错误方向。
   * 本地/内网端点保持免 key（那是 keyOptional 的本意）。
   */
  if (!apiKey && !isLocalEndpoint(baseURL)) {
    throw new Error(`未配置 API key：请在面板填写 ${def.label} 的 key 并点「保存 key」`);
  }

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
      const schema = schemaOfKind(req.kind);
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
                json_schema: { name: req.kind, schema: schema as Record<string, unknown>, strict: false },
              },
            }
          : jsonObject
            ? { response_format: { type: 'json_object' } }
            : {}),
        /**
         * 关思考：这类端点的 reasoning token 按输出价计费，而我们只取 `delta.content`，
         * 思考部分等于白花钱（实测 54/60 的输出 token 是 reasoning）。
         * 用 `enable_thinking` 而非 `thinking` 是百炼/DashScope 的方言；只有标了
         * `disableThinking` 的供应商才会发，避免把方言字段甩给不认识的端点。
         */
        ...(def.disableThinking ? { enable_thinking: false } : {}),
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
      let finishReason: string | undefined;
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
              choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[];
              usage?: OpenAiUsageRaw;
            };
            try {
              chunk = JSON.parse(payload);
            } catch {
              continue; // 心跳/注释行
            }
            const choice = chunk.choices?.[0];
            const delta = choice?.delta?.content;
            if (typeof delta === 'string' && delta) {
              text += delta;
              req.onDelta?.(delta);
            }
            if (choice?.finish_reason) finishReason = choice.finish_reason;
            if (chunk.usage) usage = mapOpenAiUsage(chunk.usage);
          }
        }
      }

      return { text, model, usage, finishReason };
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
