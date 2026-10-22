/**
 * M7 · AI 评测轨（W6，plan §6 质量线）
 *
 * 两档运行：
 *  - **离线档（默认）**：不需要 key。跑确定性指标——契约同步、19 页语料通过率、
 *    令牌引用可解析率、提示词预算、生成产物可出码、编辑干跑、资产完整性。
 *    这些指标回归时最有价值（不受模型随机性影响）。
 *  - **实跑档（设置 ANTHROPIC_API_KEY 后）**：跑 10 个 golden prompt 的真实生成，
 *    记录 §6 的一次通过率 / 自修后通过率 / 风格符合度 / 单页成本。
 *
 * 产物：dist/ai-matrix/report.json（rows 结构与其他矩阵脚本一致：id/name/ok/note）
 * 用法：npm run ai-matrix
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compilePage } from '../src/compiler';
import { generateHtml } from '../src/generator';
import { draftToPage } from '../src/editor/ai/specToPage';
import { buildPrompt, pickFewShots, type FewShotEntry } from '../src/editor/ai/promptPack';
import { validateAiOutput, summarizeViolations } from '../src/editor/ai/contract';
import { applyEditOps } from '../src/editor/ai/aiActions';
import { runPageGeneration } from '../src/editor/ai/generate';
import { createAnthropicClient, DEFAULT_MODEL, estimateCostCny } from '../src/editor/ai/client';
import { getPack, PACKS, packTokens } from '../src/tokens/packs';
import { LUCIDE_ICONS } from '../src/assets/icons/lucide';
import { createPage } from '../src/schema/factory';
import type { AiEditPlan } from '../src/editor/ai/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'dist/ai-matrix');

interface Row {
  id: string;
  name: string;
  ok: boolean;
  note: string;
}

const rows: Row[] = [];
const add = (id: string, name: string, ok: boolean, note: string): void => {
  rows.push({ id, name, ok, note });
};

const pack = getPack('shadcn');
const fewshots = JSON.parse(fs.readFileSync(path.join(root, 'src/editor/ai/fewshots.json'), 'utf8')) as FewShotEntry[];

/** §6 的 10 个 golden prompt（覆盖 10 类页面意图） */
const GOLDEN = [
  '登录页：手机号 + 密码 + 记住我 + 登录按钮 + 注册入口',
  '商品列表页：顶部搜索、双列商品卡（图片/标题/价格）、底部导航',
  '数据看板：本周新增、活跃、留存三张指标卡 + 柱状图占位 + 最近订单列表',
  '设置页：头像行、账号安全、通知开关三行、退出登录',
  '订单详情：状态、商品行、金额明细、底部两个操作按钮',
  '个人中心：渐变头部、统计三列、功能宫格九宫格',
  '表单页：姓名/手机/地址三个输入、两个开关、提交按钮',
  '音乐播放器：唱片封面、波形、进度条、播放控制、播放列表',
  '咖啡馆点单页：门店卡、分类胶囊、商品卡三张、底部结算栏',
  '健身训练计划：本周进度条、三张训练卡、底部开始按钮',
];

/* ---------------- 1. 契约同步（schema 与 types 不脱节） ---------------- */
{
  const files = ['src/editor/ai/contract.page.schema.json', 'src/editor/ai/contract.edit.schema.json'];
  const before = files.map((f) => fs.readFileSync(path.join(root, f), 'utf8'));
  execFileSync(process.execPath, [path.join(root, 'scripts/gen-ai-schema.mjs')], { cwd: root, stdio: 'ignore' });
  const after = files.map((f) => fs.readFileSync(path.join(root, f), 'utf8'));
  const drift = before.filter((b, i) => b !== after[i]).length;
  add('A1', '契约 schema 与 types.ts 同步', drift === 0, drift === 0 ? '重新生成后字节一致' : `${drift} 份 schema 已过期，已自动重生成（请提交）`);
}

/* ---------------- 2. 19 页语料契约通过率 ---------------- */
{
  const bad: string[] = [];
  for (const entry of fewshots) {
    const res = validateAiOutput(JSON.parse(entry.spec), { expect: 'page', pack, icons: Object.fromEntries(Object.entries(LUCIDE_ICONS).map(([k, v]) => [k, v.d])) });
    if (!res.ok) bad.push(`${entry.id}: ${summarizeViolations(res.violations, 2)}`);
  }
  add('A2', '19 页 few-shot 语料 schema 通过率 100%', bad.length === 0, bad.length ? bad.join(' | ') : '19/19');
}

/* ---------------- 3. 令牌引用可解析率（风格符合度） ---------------- */
{
  let refs = 0;
  let resolved = 0;
  const literal = new Set<string>();
  const walk = (node: { style?: Record<string, unknown>; children?: unknown[] }): void => {
    const s = node.style ?? {};
    for (const field of ['background', 'color']) {
      const v = s[field];
      if (typeof v === 'string') {
        if (v.startsWith('@')) {
          refs += 1;
          if (pack.colors[v.slice(1).replace(/^color\./, '')]) resolved += 1;
        } else if (/^#/.test(v)) {
          literal.add(v.toLowerCase());
        }
      }
    }
    (node.children as { style?: Record<string, unknown>; children?: unknown[] }[] | undefined)?.forEach(walk);
  };
  for (const entry of fewshots) walk((JSON.parse(entry.spec) as { root: { style?: Record<string, unknown>; children?: unknown[] } }).root);
  const compliance = refs === 0 ? 1 : resolved / refs;
  add(
    'A3',
    '风格符合度：令牌引用全部可解析',
    compliance === 1,
    `令牌引用 ${refs} 处，解析成功 ${resolved}（${(compliance * 100).toFixed(1)}%）；字面色值 ${literal.size} 种`,
  );
}

/* ---------------- 4. 提示词预算（缓存前缀规模） ---------------- */
{
  let maxStable = 0;
  let minStable = Number.POSITIVE_INFINITY;
  for (const p of GOLDEN) {
    const { system } = buildPrompt({ mode: 'page', pack, userPrompt: p, viewport: { width: 375, height: 812 }, fewShots: fewshots });
    maxStable = Math.max(maxStable, system.length);
    minStable = Math.min(minStable, system.length);
  }
  // 粗估：中文/JSON 混合 ≈ 2.6 字符/token
  const maxTokens = Math.round(maxStable / 2.6);
  add('A4', '稳定前缀规模（prompt caching 前提）', maxTokens <= 12000, `稳定前缀 ${minStable}–${maxStable} 字符 ≈ ${maxTokens} tokens（阈值 12000）`);
}

/* ---------------- 5. few-shot 检索命中 ---------------- */
{
  const hits = GOLDEN.filter((p) => {
    const top = pickFewShots(fewshots, p, 1)[0];
    return !!top && top.tags.some((t) => p.includes(t));
  }).length;
  add('A5', 'few-shot 检索命中率 ≥ 60%', hits / GOLDEN.length >= 0.6, `${hits}/${GOLDEN.length} 个 golden prompt 首选样例标签命中`);
}

/* ---------------- 6. 生成产物可出码（确定性链路） ---------------- */
{
  let compiledOk = 0;
  let nodes = 0;
  const icons = Object.fromEntries(Object.entries(LUCIDE_ICONS).map(([k, v]) => [k, v.d]));
  for (const entry of fewshots) {
    const built = draftToPage(JSON.parse(entry.spec), { pack, icons });
    if (built.violations.length) continue;
    try {
      const html = generateHtml(built.page, compilePage(built.page));
      if (html.length > 2000 && html.includes('<body')) {
        compiledOk += 1;
        nodes += built.page.root.children.length;
      }
    } catch {
      /* 计入失败 */
    }
  }
  add('A6', '语料页可确定性出码', compiledOk === fewshots.length, `${compiledOk}/${fewshots.length} 页出码成功（根级子项合计 ${nodes}）`);
}

/* ---------------- 7. 编辑指令干跑（白名单 + 引用） ---------------- */
{
  const page = draftToPage(JSON.parse(fewshots[0].spec), { pack }).page;
  const target = page.root.children[0];
  const plan: AiEditPlan = {
    kind: 'edit',
    summary: '把第一个区块背景改为主色并新增一行说明',
    actions: [
      { op: 'updateStyle', targetId: target.id, style: { background: '@color.primary', borderRadius: 16 } },
      { op: 'add', parentId: page.root.id, node: { kind: 'TEXT', text: 'AI 追加说明', style: { fontSize: 12, color: '@color.muted-foreground' } } },
    ],
  };
  const dry = applyEditOps(page, plan, { pack });
  add('A7', '编辑指令干跑无违例', dry.violations.length === 0, `${dry.report.length} 条指令，节点 ${dry.stats.nodesBefore} → ${dry.stats.nodesAfter}`);
}

/* ---------------- 8. 资产完整性 ---------------- */
{
  const iconCount = Object.keys(LUCIDE_ICONS).length;
  const tokenCounts = PACKS.map((p) => packTokens(p).length).join('/');
  add('A8', '风格包 3 套 + 图标库齐备', PACKS.length === 3 && iconCount >= 1500, `包 ${PACKS.map((p) => p.id).join(',')}；样式条数 ${tokenCounts}；图标 ${iconCount}`);
}

/* ---------------- 9. 成本量级（§7 单页 ¥0.3–1.5） ---------------- */
{
  const typical = { inputTokens: 12000, outputTokens: 6000, cacheReadTokens: 9000, cacheWriteTokens: 0 };
  const cost = estimateCostCny(typical, DEFAULT_MODEL);
  add('A9', '单页成本落在 §7 量级（¥0.3–1.5）', cost >= 0.3 && cost <= 1.5, `典型用量（入 12K/缓存 9K/出 6K）≈ ¥${cost.toFixed(2)}（${DEFAULT_MODEL}，参考价）`);
}

/* ---------------- 10. 实跑档（可选） ---------------- */
const apiKey = process.env.ANTHROPIC_API_KEY;
if (apiKey) {
  const client = await createAnthropicClient({ apiKey, model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL });
  const icons = Object.fromEntries(Object.entries(LUCIDE_ICONS).map(([k, v]) => [k, v.d]));
  let firstPass = 0;
  let repairedPass = 0;
  let totalCost = 0;
  const failures: string[] = [];
  for (const [i, prompt] of GOLDEN.entries()) {
    try {
      const res = await runPageGeneration({
        userPrompt: prompt,
        pack,
        viewport: { width: 375, height: 812 },
        client,
        icons,
        fewShots: fewshots,
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      });
      if (res.firstPass) firstPass += 1;
      repairedPass += 1;
      totalCost += res.costCny;
      process.stdout.write(`  · L${i + 1} ok（${res.attempts} 轮，¥${res.costCny.toFixed(3)}）\n`);
    } catch (err) {
      failures.push(`L${i + 1}: ${(err as Error).message}`);
      process.stdout.write(`  · L${i + 1} fail\n`);
    }
  }
  add(
    'B1',
    '§6 一次通过率 ≥60%',
    firstPass / GOLDEN.length >= 0.6,
    `${firstPass}/${GOLDEN.length}（${((firstPass / GOLDEN.length) * 100).toFixed(0)}%）`,
  );
  add(
    'B2',
    '§6 自修后通过率 ≥90%',
    repairedPass / GOLDEN.length >= 0.9,
    `${repairedPass}/${GOLDEN.length}（${((repairedPass / GOLDEN.length) * 100).toFixed(0)}%）`,
  );
  add('B3', '实跑单页均成本', true, `合计 ¥${totalCost.toFixed(2)}，均 ¥${(totalCost / Math.max(1, repairedPass)).toFixed(3)}/页`);
  if (failures.length) add('B4', '实跑失败明细', false, failures.join(' | '));
} else {
  add('B0', '实跑档（需要 ANTHROPIC_API_KEY）', true, '未设置 key，跳过；离线档指标已覆盖确定性部分');
}

/* ---------------- 输出 ---------------- */
fs.mkdirSync(OUT, { recursive: true });
const passed = rows.filter((r) => r.ok).length;
const report = {
  generatedAt: new Date().toISOString(),
  mode: apiKey ? 'live' : 'offline',
  pack: pack.id,
  model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
  summary: { total: rows.length, pass: passed, fail: rows.length - passed },
  rows,
};
fs.writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('\n=== AI 评测轨（M7 §6）===');
for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id.padEnd(3)} ${r.name} — ${r.note}`);
console.log(`\n合计 ${passed}/${rows.length} 通过；报告 ${path.relative(root, path.join(OUT, 'report.json'))}`);
if (passed !== rows.length) process.exitCode = 1;
