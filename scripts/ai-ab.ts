/**
 * AI 双路径 A/B 对比（一次性实验脚本，不进产品代码）
 *
 * 目的：同一段用户提示词、同一个模型、同一视口，比较两条产品路线的**实际产出**。
 *
 *   路径 A · UI 生成器：promptPack 契约 → JSON 节点树 → UIPage AST → 确定性编译 → HTML
 *   路径 B · 直接生成前端：模型自由输出单文件 HTML（内联 CSS）
 *
 * 公平性约定：
 *  1. `user` 消息**逐字相同**（`PROMPT` 常量）。
 *  2. `system` 各自最优 —— 这正是两条产品路线本身的差异，不是实验瑕疵：
 *     A 用的是项目现成的 `buildPrompt`（契约 + 令牌表 + 19 条 few-shot）；
 *     B 用的是「资深前端工程师 + 单文件 HTML」的标准人设。
 *  3. 同一个 provider / model / baseURL；同一台 Chromium、同一视口、同一 deviceScaleFactor。
 *  4. A 用 `blackgreen` 风格包（本轮新加，因为原有三个包没有绿色，见 packs/index.ts 注释）。
 *
 * 用法：
 *   AI_API_KEY=sk-xxx AI_PROVIDER=deepseek AI_MODEL=deepseek-chat \
 *     npx vite-node scripts/ai-ab.ts
 *
 * 带设计参考（skill）跑：
 *   AI_SKILL_FILE=.tmp/skills/taste-skill.md AI_RUN_LABEL=skill \
 *     AI_API_KEY=sk-xxx AI_PROVIDER=qwen AI_MODEL=deepseek-v4.1-flash npx vite-node scripts/ai-ab.ts
 *
 * 产物落 `.tmp/ai-ab/`（带 label 时落 `.tmp/ai-ab-<label>/`）：两份 HTML、四张 PNG、`report.json`，
 * 外加 **A 侧的可再编辑源文件** `A-project.json` / `A-project.fig`（编辑器 `File → 打开` 直接载入）。
 * 只存 HTML 是不够的——编译器是单向的，没有 HTML→AST 的解析器，产物导不回画布。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createLlmClient, providerDef, type ProviderId } from '../src/editor/ai/client';
import { runPageGeneration } from '../src/editor/ai/generate';
import { loadFewShots } from '../src/editor/ai/promptPack';
import { composeDesignRef, makeSkill, skillNameFromFile } from '../src/editor/ai/skills';
import { compilePage } from '../src/compiler/compile';
import { generateHtml } from '../src/generator/html';
import { PACKS } from '../src/tokens/packs';
import { loadIcons } from '../src/assets/icons';
import { serializeProject, upgradeProjectV1 } from '../src/editor/project';
import { loadFigCodec } from '../src/fig/codec';
import { exportFig } from '../src/fig/export';
import type { UINode } from '../src/schema/types';

/**
 * 两条路径共用的用户提示词 —— 一个字都不能改。
 *
 * 可用 `AI_PROMPT` 覆盖（换题目跑同一套对比，不必改代码）：
 *   AI_PROMPT='生成一页电动车控制应用…' AI_RUN_LABEL=ev npx vite-node scripts/ai-ab.ts
 */
const PROMPT =
  process.env.AI_PROMPT ?? '做一个健身计划app，显示出日历表格，对应的日期备注动作在日期上，主色调用黑绿色';

const VIEWPORT = { width: 375, height: 812 };
const LABEL = process.env.AI_RUN_LABEL ?? '';
const OUT = resolve(LABEL ? `.tmp/ai-ab-${LABEL}` : '.tmp/ai-ab');

/**
 * 设计参考（可选）。给了就**两条路径都注入**——
 * 只给 A 不给 B，测的就不是「skill 有没有用」，而是「A 比 B 少一份参考」。
 */
function loadDesignRef(): { ref: string; name: string; rawChars: number } {
  const file = process.env.AI_SKILL_FILE;
  if (!file) return { ref: '', name: '', rawChars: 0 };
  const raw = readFileSync(resolve(file), 'utf8');
  const skill = makeSkill(skillNameFromFile(file.split(/[\\/]/).pop() ?? file), raw);
  return { ref: composeDesignRef([skill]), name: skill.name, rawChars: raw.length };
}

/** 路径 B 的系统提示：标准前端人设，不做任何「受控子集」限制 */
const SYSTEM_B = [
  '你是一位资深前端工程师。',
  '根据用户需求，输出**一个完整的单文件 HTML**（不要拆成多个文件）。',
  '',
  '硬性要求：',
  '1. 样式写在内联 `<style>` 里，不引用外部 CSS / JS 文件，双击即可在浏览器打开；',
  '2. 目标视口 375×812（移动端），页面按手机屏宽设计；',
  '3. 不使用任何外部图片资源，需要图片的地方用 CSS 渐变、纯色块或内联 SVG 占位；',
  '4. 可以自由使用任意 CSS：flex / grid / 渐变 / 阴影 / 圆角 / 伪类 / 绝对定位 / 自定义属性；',
  '5. 只输出 HTML 源码本身，不要 markdown 围栏，不要任何解释文字。',
].join('\n');

interface Usage {
  inputTokens: number;
  outputTokens: number;
}

/** 直接调模型拿自由文本（绕过 LlmClient 的「只输出 JSON」强约束） */
async function callRaw(system: string, user: string): Promise<{ text: string; usage: Usage; truncated: boolean }> {
  const provider = (process.env.AI_PROVIDER ?? 'deepseek') as ProviderId;
  const apiKey = process.env.AI_API_KEY ?? '';
  const def = providerDef(provider);
  const model = process.env.AI_MODEL ?? def.defaultModel;
  const baseURL = process.env.AI_BASE_URL ?? def.baseURL ?? '';
  const maxTokens = Number(process.env.AI_MAX_TOKENS ?? 8192);

  if (def.protocol === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey, ...(baseURL ? { baseURL } : {}), dangerouslyAllowBrowser: true });
    const msg = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    return {
      text,
      usage: {
        inputTokens: msg.usage.input_tokens ?? 0,
        outputTokens: msg.usage.output_tokens ?? 0,
      },
      truncated: msg.stop_reason === 'max_tokens',
    };
  }

  // OpenAI 兼容协议：直接 fetch，不引额外 SDK
  const url = `${baseURL.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      /**
       * 与路径 A **必须同参**：项目的 `createOpenAiCompatClient` 对标了 `disableThinking`
       * 的供应商会发 `enable_thinking:false`（百炼方言）。这里漏掉就等于给 B 开了思考链 ——
       * 既多花钱，又让 B 多一层推理优势，对比不公平。
       */
      ...(def.disableThinking ? { enable_thinking: false } : {}),
    }),
  });
  if (!res.ok) throw new Error(`路径 B 请求失败 ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    text: json.choices?.[0]?.message?.content ?? '',
    usage: {
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
    },
    truncated: json.choices?.[0]?.finish_reason === 'length',
  };
}

/** 从模型输出里抠 HTML（容忍 markdown 围栏与前后废话） */
function extractHtml(raw: string): string {
  const fenced = /```(?:html)?\s*([\s\S]*?)```/i.exec(raw);
  const body = fenced ? fenced[1] : raw;
  const start = body.search(/<!DOCTYPE html|<html/i);
  return (start >= 0 ? body.slice(start) : body).trim();
}

/** 遍历 AST，统计实际用到的字段 + 视觉密度指标 */
interface AstAudit {
  nodes: number;
  layout: Set<string>;
  style: Set<string>;
  kinds: Set<string>;
  /** 带效果的节点数（阴影/模糊） */
  effectNodes: number;
  /** 效果条目总数 */
  effectCount: number;
  /** 渐变条目数（填充渐变 / 描边渐变） */
  gradientCount: number;
  /** 多层填充节点数 */
  fillsNodes: number;
  /** 出现过的圆角值 */
  radii: Set<number>;
  /** 出现过的字号 */
  fontSizes: Set<number>;
  /** 出现过的字重 */
  fontWeights: Set<number>;
  /** 出现过的颜色字面量（含令牌解析后的 hex） */
  colors: Set<string>;
  /** 描边节点数 */
  borderNodes: number;
}

function auditAst(root: UINode): AstAudit {
  const layout = new Set<string>();
  const style = new Set<string>();
  const kinds = new Set<string>();
  const radii = new Set<number>();
  const fontSizes = new Set<number>();
  const fontWeights = new Set<number>();
  const colors = new Set<string>();
  let nodes = 0;
  let effectNodes = 0;
  let effectCount = 0;
  let gradientCount = 0;
  let fillsNodes = 0;
  let borderNodes = 0;
  const walk = (n: UINode): void => {
    nodes += 1;
    kinds.add(n.type);
    for (const [k, v] of Object.entries(n.layout ?? {})) if (v !== undefined) layout.add(k);
    for (const [k, v] of Object.entries(n.style ?? {})) if (v !== undefined) style.add(k);
    const s = n.style as
      | {
          effects?: unknown[];
          fills?: { gradient?: unknown }[];
          borderRadius?: number | number[];
          fontSize?: number;
          fontWeight?: number;
          background?: string;
          color?: string;
          border?: { color?: string; gradient?: unknown };
        }
      | undefined;
    if (s?.effects?.length) {
      effectNodes += 1;
      effectCount += s.effects.length;
    }
    if (s?.fills?.length) {
      fillsNodes += 1;
      gradientCount += s.fills.filter((f) => f.gradient).length;
    }
    if (s?.border?.gradient) gradientCount += 1;
    if (s?.border) borderNodes += 1;
    if (typeof s?.borderRadius === 'number') radii.add(s.borderRadius);
    else if (Array.isArray(s?.borderRadius)) s.borderRadius.forEach((r) => radii.add(r));
    if (typeof s?.fontSize === 'number') fontSizes.add(s.fontSize);
    if (typeof s?.fontWeight === 'number') fontWeights.add(s.fontWeight);
    if (s?.background) colors.add(s.background);
    if (s?.color) colors.add(s.color);
    if (s?.border?.color) colors.add(s.border.color);
    for (const c of (n as { children?: UINode[] }).children ?? []) walk(c);
  };
  walk(root);
  return { nodes, layout, style, kinds, effectNodes, effectCount, gradientCount, fillsNodes, radii, fontSizes, fontWeights, colors, borderNodes };
}

async function main(): Promise<void> {
  const apiKey = process.env.AI_API_KEY ?? '';
  if (!apiKey) {
    console.error('缺少 AI_API_KEY。用法：AI_API_KEY=sk-xxx npx vite-node scripts/ai-ab.ts');
    process.exit(2);
  }
  const provider = (process.env.AI_PROVIDER ?? 'deepseek') as ProviderId;
  const model = process.env.AI_MODEL ?? providerDef(provider).defaultModel;
  mkdirSync(OUT, { recursive: true });
  console.log(`provider=${provider} model=${model}`);
  console.log(`prompt=${PROMPT}\n`);
  const skill = loadDesignRef();
  if (skill.ref) {
    console.log(`[skill] ${skill.name}：原文 ${skill.rawChars} 字 → 注入 ${skill.ref.length} 字`);
  } else {
    console.log('[skill] 未提供设计参考（AI_SKILL_FILE 未设置）');
  }

  /* ---------------- 路径 A：UI 生成器 ---------------- */
  /**
   * 风格包可换（`AI_PACK`）。默认 blackgreen 是历史基线，别改；
   * 跑「多风格对照」时用最中性的 openprops，让三组之间唯一变量是 skill 而不是包。
   */
  const packId = process.env.AI_PACK ?? 'blackgreen';
  const pack = PACKS.find((p) => p.id === packId) ?? PACKS[0];
  console.log(`[A] 风格包 = ${pack.name}（primary=${pack.colors.primary}）`);
  /**
   * 图标库必须传：模型写 `icon: "dumbbell"` 是**词表名**，不是 path。
   * 不传就全是「图标库未加载」违例，VECTOR 节点没有 `vector.d`，出码是空 svg。
   * AiDock 里也是这么做的（`loadIcons()` → name→d 映射）。
   */
  const iconAssets = await loadIcons();
  const iconMap = Object.fromEntries(Object.entries(iconAssets.icons).map(([k, v]) => [k, v.d]));
  console.log(`[A] 图标库 ${Object.keys(iconMap).length} 个`);
  const tA = Date.now();
  const client = await createLlmClient({ provider, apiKey, model });
  const result = await runPageGeneration({
    userPrompt: PROMPT,
    pack,
    viewport: VIEWPORT,
    client,
    icons: iconMap,
    fewShots: await loadFewShots(),
    model,
    designRef: skill.ref || undefined,
    onProgress: (e) => console.log(`[A] ${e.stage} #${e.attempt} ${e.message}`),
  });
  const elapsedA = Date.now() - tA;
  const page = result.data;
  const compiled = compilePage(page);
  const htmlA = generateHtml(page, compiled, { title: 'A · UI 生成器' });
  writeFileSync(resolve(OUT, 'A-ui-generator.html'), htmlA, 'utf-8');
  /**
   * 同时落**可再编辑的源文件**：工程 JSON 与 `.fig`。
   *
   * 只有 HTML 是「编译产物」——编辑器没有 HTML→AST 解析器，导不回去。
   * 工程 JSON 走 `File → 打开`（`parseProject`，与 `.fig` 同一个入口），
   * `.fig` 走 `importFigFile`，两条都能把这一页原样载进画布继续改。
   */
  const projectA = upgradeProjectV1(page, `AI-A · ${LABEL || 'default'}`);
  writeFileSync(resolve(OUT, 'A-project.json'), JSON.stringify(serializeProject(projectA), null, 2), 'utf-8');
  try {
    const codec = await loadFigCodec();
    const fig = await exportFig(projectA.pages, codec.encode, { fileName: projectA.name });
    writeFileSync(resolve(OUT, 'A-project.fig'), fig.bytes);
    console.log(`[A] 工程文件：A-project.json / A-project.fig（${fig.stats.nodes} 节点）`);
  } catch (e) {
    console.warn(`[A] .fig 导出失败（工程 JSON 仍可用）：${e instanceof Error ? e.message : e}`);
  }
  const astA = auditAst(page.root);
  console.log(`[A] 完成：${astA.nodes} 节点，${elapsedA}ms，违例 ${result.violations.length} 条，首轮通过 ${result.firstPass}\n`);

  /* ---------------- 路径 B：直接生成前端 ---------------- */
  console.log('[B] 直接生成单文件 HTML…');
  /**
   * 公平性：给了 skill 就必须两条路都给。只给 A 不给 B，测的就不是「参考有没有用」，
   * 而是「A 比 B 少一份参考」——那种对比对结论毫无意义。
   */
  const systemB = skill.ref
    ? [SYSTEM_B, '', '## 设计参考（风格 / 技法说明）', '以下是审美参考，**不是输出格式**：你仍然只输出一个单文件 HTML。', skill.ref].join('\n')
    : SYSTEM_B;
  const tB = Date.now();
  const rawB = await callRaw(systemB, PROMPT);
  const elapsedB = Date.now() - tB;
  const htmlB = extractHtml(rawB.text);
  writeFileSync(resolve(OUT, 'B-direct-code.html'), htmlB, 'utf-8');
  console.log(`[B] 完成：${htmlB.length} 字符，${elapsedB}ms，截断 ${rawB.truncated}\n`);

  /* ---------------- 截图 ---------------- */
  const browser = await chromium.launch();
  const shots: Record<string, { viewport: string; full: string; fullHeight: number }> = {};
  for (const [key, file] of [
    ['A', 'A-ui-generator.html'],
    ['B', 'B-direct-code.html'],
  ] as const) {
    const p = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
    await p.goto(`file://${resolve(OUT, file)}`, { waitUntil: 'load' });
    await p.waitForTimeout(800);
    const viewportShot = resolve(OUT, `shot-${key}-viewport.png`);
    await p.screenshot({ path: viewportShot });
    const fullShot = resolve(OUT, `shot-${key}-full.png`);
    await p.screenshot({ path: fullShot, fullPage: true });
    const fullHeight = await p.evaluate(() => document.documentElement.scrollHeight);
    shots[key] = { viewport: viewportShot, full: fullShot, fullHeight };
    console.log(`[${key}] 截图：视口 ${VIEWPORT.width}×${VIEWPORT.height}，整页高 ${fullHeight}px`);
    await p.close();
  }
  await browser.close();

  /* ---------------- 报告 ---------------- */
  const report = {
    prompt: PROMPT,
    provider,
    model,
    viewport: VIEWPORT,
    pack: { id: pack.id, primary: pack.colors.primary, background: pack.colors.background },
    skill: skill.ref
      ? { name: skill.name, rawChars: skill.rawChars, injectedChars: skill.ref.length }
      : null,
    a: {
      elapsedMs: elapsedA,
      nodes: astA.nodes,
      kinds: [...astA.kinds].sort(),
      layoutFields: [...astA.layout].sort(),
      styleFields: [...astA.style].sort(),
      layoutCoverage: `${astA.layout.size}/26`,
      styleCoverage: `${astA.style.size}/37`,
      /** 视觉密度：这一组才是「参考有没有被听进去」的证据 */
      effectNodes: astA.effectNodes,
      effectCount: astA.effectCount,
      gradientCount: astA.gradientCount,
      fillsNodes: astA.fillsNodes,
      borderNodes: astA.borderNodes,
      radii: [...astA.radii].sort((x, y) => x - y),
      fontSizes: [...astA.fontSizes].sort((x, y) => x - y),
      fontWeights: [...astA.fontWeights].sort((x, y) => x - y),
      colorCount: astA.colors.size,
      colors: [...astA.colors].sort(),
      violations: result.violations,
      firstPass: result.firstPass,
      attempts: result.attempts,
      usage: result.usage,
      costCny: result.costCny,
      htmlBytes: htmlA.length,
      /**
       * A 通道的 3D 表达力边界：**静态事实，不是本次生成的结果**。
       * `TransformSchema` 只有 2D 六字段，AST 里没有 perspective / rotateX/Y/Z。
       * 所以「要一个 3D 的电动车」在 A 通道上最多只能做到伪 3D
       * （SVG 图标 + 投影 + 渐变模拟体积感），这是架构取舍不是本次运气。
       */
      capability3d: 'none' as const,
      /** A 出码里的矢量 path 数（VECTOR 节点，来自图标词表而非手绘） */
      svgPathCount: (htmlA.match(/<path\b/gi) ?? []).length,
    },
    b: {
      elapsedMs: elapsedB,
      htmlBytes: htmlB.length,
      usage: rawB.usage,
      truncated: rawB.truncated,
      divCount: (htmlB.match(/<div\b/g) ?? []).length,
      hasGradient: /gradient\(/i.test(htmlB),
      hasShadow: /box-shadow/i.test(htmlB),
      hasGrid: /display:\s*grid|grid-template/i.test(htmlB),
      hasPseudo: /:hover|::?before|::?after/i.test(htmlB),
      colorLiterals: [...new Set(htmlB.match(/#[0-9a-f]{6}\b/gi) ?? [])].length,
      /**
       * 3D 表达力检测。A 通道的 `TransformSchema` 只有 2D
       * （rotate / scaleX / scaleY / translateX / translateY / origin），
       * 没有 perspective / rotateX / rotateY / translateZ —— 这条指标对 B 有意义，对 A 恒为 false。
       * 记在这里是为了让「题目要求 3D 时两条路径的差距」有据可查，而不是靠印象。
       */
      has3d: /perspective|rotate3d|rotate[XY]\s*\(|translateZ|matrix3d/i.test(htmlB),
      hasCanvas: /<canvas\b/i.test(htmlB),
      hasSvg: /<svg\b/i.test(htmlB),
      /** 内联 SVG 里的 path 数：粗略衡量「手绘矢量细节」的规模 */
      svgPathCount: (htmlB.match(/<path\b/gi) ?? []).length,
    },
    shots,
  };
  writeFileSync(resolve(OUT, 'report.json'), JSON.stringify(report, null, 2), 'utf-8');

  console.log('\n===== 对比 =====');
  console.log(`节点数       A ${astA.nodes}  |  B ${report.b.divCount} 个 div（近似）`);
  console.log(`HTML 体积    A ${htmlA.length} 字符 |  B ${htmlB.length} 字符`);
  console.log(`字段覆盖     A 布局 ${report.a.layoutCoverage} · 样式 ${report.a.styleCoverage} | B 无约束`);
  console.log(`视觉密度     A 阴影节点 ${astA.effectNodes} · 渐变 ${astA.gradientCount} · 圆角档 ${astA.radii.size} · 字号档 ${astA.fontSizes.size} · 颜色 ${astA.colors.size}`);
  console.log(`耗时         A ${elapsedA}ms | B ${elapsedB}ms`);
  console.log(`整页高度     A ${shots.A.fullHeight}px | B ${shots.B.fullHeight}px`);
  console.log(
    `3D 表达力    A 结构上不支持（TransformSchema 仅 2D）| B perspective/rotate3d=${report.b.has3d} · canvas=${report.b.hasCanvas} · svg path=${report.b.svgPathCount}`,
  );
  console.log(`产物：${OUT}`);
}

void main().catch((err) => {
  console.error('\n[FATAL]', err instanceof Error ? `${err.name}: ${err.message}` : err);
  if (err instanceof Error && err.stack) console.error(err.stack.split('\n').slice(0, 12).join('\n'));
  process.exit(1);
});
