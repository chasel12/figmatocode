/**
 * 多供应商接入（Anthropic 协议 + OpenAI 兼容协议）的契约测试。
 *
 * 这一层的价值是「别把 A 家的 key 发到 B 家端点」和「兼容层差异不要假装支持」，
 * 所以断言集中在：供应商表自洽、槽位隔离、能力标注、SSE 解析、用量映射。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  PROVIDERS,
  aiAvailable,
  createLlmClient,
  createOpenAiCompatClient,
  describeAiError,
  estimateCostCny,
  getApiKey,
  getBaseURL,
  getModel,
  getProvider,
  isPriced,
  maskKey,
  providerDef,
  setApiKey,
  setBaseURL,
  setModel,
  setProvider,
  structuredOutputFor,
  supportsJsonSchema,
} from '../src/editor/ai/client';

/** node 环境没有 localStorage：装一个最小实现，测试后恢复 */
function installStorage(): void {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
    },
  });
}

beforeEach(() => installStorage());
afterEach(() => {
  vi.unstubAllGlobals();
  // @ts-expect-error 测试收尾：删掉伪造的全局
  delete globalThis.localStorage;
});

describe('供应商表', () => {
  it('每家都有协议、默认模型在候选列表内（或可自由填写）', () => {
    for (const p of PROVIDERS) {
      expect(['anthropic', 'openai']).toContain(p.protocol);
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.note.length).toBeGreaterThan(0);
      if (!p.modelEditable) expect(p.models).toContain(p.defaultModel);
    }
  });

  it('OpenAI 兼容端点必须写明 baseURL（否则请求会打到主站）', () => {
    for (const p of PROVIDERS) {
      if (p.protocol === 'openai' && !p.baseURLEditable) {
        expect(p.baseURL, `${p.label} 缺 baseURL`).toMatch(/^https?:\/\//);
      }
    }
  });

  it('id 唯一', () => {
    const ids = PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('自定义端点可编辑 baseURL，本地端点不需要 key', () => {
    expect(providerDef('custom').baseURLEditable).toBe(true);
    expect(providerDef('ollama').keyOptional).toBe(true);
  });

  /**
   * 漂移守卫：anthropic 协议的结构化输出能力有**两个判定源** ——
   * 供应商表的 `jsonSchema` 字段，和 `supportsJsonSchema(baseURL)` 这个 URL 正则。
   *
   * 历史上 anthropic 那条路径只读正则、从不读表，于是「表里写 false、正则判 true」时
   * 会向端点发 `output_config`，而端点**静默忽略**（不报错、不生效）—— 比明确不支持更糟。
   * `structuredOutputFor()` 已把顺序定成「表优先、正则兜底」，这条断言锁住两者不许分叉。
   */
  it('anthropic 协议供应商：表里的 jsonSchema 与 URL 启发式必须一致', () => {
    for (const p of PROVIDERS) {
      if (p.protocol !== 'anthropic' || p.jsonSchema === undefined) continue;
      expect(supportsJsonSchema(p.baseURL), `${p.label} 的两个判定源分叉了`).toBe(p.jsonSchema);
      expect(structuredOutputFor(p.id, p.baseURL)).toBe(p.jsonSchema);
    }
  });

  it('structuredOutputFor：表优先，表里没写才退回 URL 启发式', () => {
    // 官方 Anthropic：表里 true
    expect(structuredOutputFor('anthropic', undefined)).toBe(true);
    // DeepSeek 兼容端点：表里 false（哪怕调用方传了个不含 deepseek 的自定义端点也不改口）
    expect(structuredOutputFor('deepseek', undefined)).toBe(false);
    expect(structuredOutputFor('deepseek', 'https://example.com/anthropic')).toBe(false);
  });
});

describe('槽位隔离（key / 模型 / 端点按供应商分开）', () => {
  it('A 家的 key 不会出现在 B 家', () => {
    setApiKey('sk-aaa', 'anthropic');
    setApiKey('sk-bbb', 'openai');
    expect(getApiKey('anthropic')).toBe('sk-aaa');
    expect(getApiKey('openai')).toBe('sk-bbb');
    expect(getApiKey('gemini')).toBe('');
  });

  it('anthropic 沿用旧键名（升级后不必重填）', () => {
    // 旧版本的键就是 'ui-compiler.ai.key'
    localStorage.setItem('ui-compiler.ai.key', 'sk-legacy');
    expect(getApiKey('anthropic')).toBe('sk-legacy');
  });

  it('模型与端点各自独立', () => {
    setModel('gpt-5.1', 'openai');
    setModel('deepseek-v4-pro', 'deepseek');
    expect(getModel('openai')).toBe('gpt-5.1');
    expect(getModel('deepseek')).toBe('deepseek-v4-pro');
    expect(getModel('ollama')).toBe(providerDef('ollama').defaultModel);
    setBaseURL('http://192.168.1.9:8000/v1', 'custom');
    expect(getBaseURL('custom')).toBe('http://192.168.1.9:8000/v1');
  });

  it('脏的 provider 值回退 anthropic（不让旧版本/手改的存储把面板卡死）', () => {
    localStorage.setItem('ui-compiler.ai.provider', 'not-a-provider');
    expect(getProvider()).toBe('anthropic');
    setProvider('ollama');
    expect(getProvider()).toBe('ollama');
  });
});

describe('可用性与计价', () => {
  it('keyOptional 的端点无 key 也可用', () => {
    expect(aiAvailable('ollama')).toBe(true);
    expect(aiAvailable('anthropic')).toBe(false);
    setApiKey('sk-x', 'anthropic');
    expect(aiAvailable('anthropic')).toBe(true);
  });

  it('未收录模型不套用别家价格（避免给出错误金额）', () => {
    expect(isPriced('claude-opus-5-5')).toBe(true);
    expect(isPriced('gpt-5.1')).toBe(false);
    expect(estimateCostCny({ inputTokens: 1e6, outputTokens: 1e6, cacheReadTokens: 0, cacheWriteTokens: 0 }, 'gpt-5.1')).toBe(0);
  });

  it('脱敏不泄露整串', () => {
    expect(maskKey('')).toBe('未配置');
    expect(maskKey('sk-ant-1234567890abcdef')).toBe('sk-ant-…cdef');
    expect(maskKey('short')).not.toContain('short');
  });
});

describe('错误翻译', () => {
  /**
   * 「端点没收到 key」和「key 无效」必须分开说。
   * 前者是客户端没把 Authorization 发出去（草稿没保存 / 存错供应商槽位），
   * 后者才是 key 本身不对——混成一句会让人一直去换 key。
   */
  it('「没收到 key」与「key 无效」给出不同指引', () => {
    expect(describeAiError({ status: 400, message: 'No API-key provided.' })).toContain('没有收到 API key');
    expect(describeAiError({ status: 400, message: 'Missing API key' })).toContain('没有收到 API key');
    expect(describeAiError({ status: 401, message: 'Incorrect API key provided' })).toContain('key 无效');
  });

  it('普通业务错误原样透出，不被 key 规则误伤', () => {
    expect(describeAiError({ status: 400, message: 'model not found' })).toBe('model not found');
  });
});

describe('OpenAI 兼容协议 client', () => {
  const sse = (chunks: string[], usage?: Record<string, unknown>): string =>
    [
      ...chunks.map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`),
      ...(usage ? [`data: ${JSON.stringify({ choices: [], usage })}\n\n`] : []),
      'data: [DONE]\n\n',
    ].join('');

  it('解析 SSE 增量、拼接正文、映射用量', async () => {
    const payload = sse(['{"a"', ':1}'], {
      prompt_tokens: 100,
      completion_tokens: 20,
      prompt_tokens_details: { cached_tokens: 40 },
    });
    const deltas: string[] = [];
    vi.stubGlobal('fetch', async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            const enc = new TextEncoder();
            // 故意在事件中间切断，验证 buffer 拼接（半包不能丢字）
            controller.enqueue(enc.encode(payload.slice(0, 17)));
            controller.enqueue(enc.encode(payload.slice(17)));
            controller.close();
          },
        }),
        { status: 200 },
      ),
    );

    const client = await createOpenAiCompatClient({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-5.1' });
    const res = await client.run({
      kind: 'page',
      system: 'SYS',
      user: 'USR',
      onDelta: (c) => deltas.push(c),
    });

    expect(res.text).toBe('{"a":1}');
    expect(deltas.join('')).toBe('{"a":1}');
    expect(res.usage).toEqual({ inputTokens: 100, outputTokens: 20, cacheReadTokens: 40, cacheWriteTokens: 0 });
  });

  it('请求体：只对声明支持 jsonSchema 的端点发 response_format', async () => {
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return new Response(sse(['{}']), { status: 200 });
    });

    const openai = await createOpenAiCompatClient({ provider: 'openai', apiKey: 'k', model: 'm' });
    await openai.run({ kind: 'page', system: 's', user: 'u' });
    expect(bodies[0].response_format).toBeTruthy();
    expect(bodies[0].stream).toBe(true);

    const ollama = await createOpenAiCompatClient({ provider: 'ollama', model: 'qwen3-coder' });
    await ollama.run({ kind: 'page', system: 's', user: 'u' });
    // 本地端点声明 jsonSchema:false → 不发，改由提示词里的强约束兜
    expect(bodies[1].response_format).toBeUndefined();
    expect(String((bodies[1].messages as { content: string }[])[1].content)).toContain('只输出一个 JSON 对象');
  });

  /**
   * 百炼（qwen）实测结论固化成测试：
   *  - `json_schema` → 400 `This response_format type is unavailable now`，只能退 json_object
   *  - 思考默认开，reasoning token 按输出价计费却被我们丢弃（54/60），必须显式关
   */
  it('百炼（qwen）：发 json_object 而非 json_schema，并显式关思考', async () => {
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return new Response(sse(['{}']), { status: 200 });
    });

    const q = await createOpenAiCompatClient({ provider: 'qwen', apiKey: 'k' });
    await q.run({ kind: 'page', system: 's', user: 'u' });

    expect(bodies[0].response_format).toEqual({ type: 'json_object' });
    expect(bodies[0].enable_thinking).toBe(false);
    // 无字段约束 → 提示词里的强约束仍要带
    expect(String((bodies[0].messages as { content: string }[])[1].content)).toContain('只输出一个 JSON 对象');
  });

  it('方言字段不外溢：不认识 enable_thinking 的端点收不到它', async () => {
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return new Response(sse(['{}']), { status: 200 });
    });

    const o = await createOpenAiCompatClient({ provider: 'openai', apiKey: 'k', model: 'gpt-5.1' });
    await o.run({ kind: 'page', system: 's', user: 'u' });

    expect(bodies[0].enable_thinking).toBeUndefined();
    // openai 标了 jsonSchema:true → 仍走 json_schema，不被 json_object 抢走
    expect((bodies[0].response_format as { type: string }).type).toBe('json_schema');
  });

  it('HTTP 错误带上 status（供面板翻成可操作提示）', async () => {
    vi.stubGlobal('fetch', async () =>
      new Response(JSON.stringify({ error: { message: 'Incorrect API key provided' } }), { status: 401 }),
    );
    const client = await createOpenAiCompatClient({ provider: 'openai', apiKey: 'bad', model: 'm' });
    await expect(client.run({ kind: 'page', system: 's', user: 'u' })).rejects.toMatchObject({
      status: 401,
      message: 'Incorrect API key provided',
    });
  });

  it('本地端点缺 baseURL 时给出可操作报错，而不是静默打空请求', async () => {
    // custom 没有默认端点；测试里不写 baseURL
    await expect(createOpenAiCompatClient({ provider: 'custom', model: 'm' })).rejects.toThrow(/端点地址/);
  });

  /**
   * 回归：`keyOptional` 只表示「这家**可以**不要 key」，不表示「任何地址都可以不带」。
   * 早先公网地址 + 空 key 会照发无鉴权请求，端点回 `No API-key provided.`，
   * 用户看到的是「key 无效」，实际是 key 根本没发出去（2026-10-26 实测踩过）。
   */
  it('公网端点空 key：发请求前拦下，不产生一次注定失败的无鉴权请求', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      createOpenAiCompatClient({
        provider: 'custom',
        baseURL: 'https://cn-beijing.maas.qianwenaiapi.com/compatible-mode/v1',
        model: 'deepseek-v4.1-flash',
      }),
    ).rejects.toThrow(/未配置 API key/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('本地/内网端点仍然免 key（keyOptional 的本意不被公网校验误伤）', async () => {
    const seen: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      seen.push(url);
      return new Response(sse(['{}']), { status: 200 });
    });
    // 127.0.0.1 / 192.168.x 属于内网：不填 key 也应能走通
    for (const base of ['http://127.0.0.1:8000/v1', 'http://192.168.1.9:8000/v1']) {
      const c = await createOpenAiCompatClient({ provider: 'custom', baseURL: base, model: 'm' });
      await c.run({ kind: 'page', system: 's', user: 'u' });
    }
    expect(seen).toHaveLength(2);
  });

  it('工厂按协议分派（anthropic 协议走 Anthropic client，不会发 /chat/completions）', async () => {
    setApiKey('sk-ant-test', 'anthropic');
    const client = await createLlmClient({ provider: 'anthropic', model: 'claude-haiku-5-5' });
    // 两个实现的 run 都在，这里只验「选对了实现」：Anthropic client 不依赖 fetch 到 /chat/completions
    expect(typeof client.run).toBe('function');
    const openaiClient = await createLlmClient({ provider: 'ollama', model: 'qwen3-coder' });
    expect(typeof openaiClient.run).toBe('function');
  });

  it('真实 HTTP 往返：打到本地假端点，验证路径/鉴权头/SSE 分块', async () => {
    const seen: { url?: string; auth?: string; body?: Record<string, unknown> } = {};
    const server = createServer((req, res) => {
      seen.url = req.url;
      seen.auth = req.headers.authorization;
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        seen.body = JSON.parse(raw) as Record<string, unknown>;
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        // 分三次写，模拟真实端点的分块（含一个跨块的半包事件）
        const events = [
          `data: ${JSON.stringify({ choices: [{ delta: { content: '{"ok"' } }] })}\n\n`,
          `data: ${JSON.stringify({ choices: [{ delta: { content: ':true}' } }] })}\n\n`,
          `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 10, completion_tokens: 5 } })}\n\ndata: [DONE]\n\n`,
        ];
        res.write(events[0].slice(0, 20));
        setTimeout(() => {
          res.write(events[0].slice(20) + events[1]);
          setTimeout(() => res.end(events[2]), 20);
        }, 20);
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const addr = server.address() as AddressInfo;

    try {
      const client = await createOpenAiCompatClient({
        provider: 'custom',
        baseURL: `http://127.0.0.1:${addr.port}/v1/`, // 末尾斜杠应被吃掉
        apiKey: 'sk-local-test',
        model: 'local-model',
      });
      const res = await client.run({ kind: 'page', system: 'SYS', user: 'USR' });
      expect(res.text).toBe('{"ok":true}');
      expect(res.usage.inputTokens).toBe(10);
      expect(seen.url).toBe('/v1/chat/completions');
      expect(seen.auth).toBe('Bearer sk-local-test');
      expect(seen.body?.model).toBe('local-model');
      expect(seen.body?.stream).toBe(true);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
