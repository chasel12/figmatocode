/**
 * 诊断工具：一份风格 skill 里的 Tailwind token，有多少能被本项目吃进去。
 *
 * 为什么需要它：`skill-probe.ts` 只看「注入了哪些章节」，不看「注入的东西能不能解析」。
 * 风格规格（StyleKit / taste-skill 之类）是写给**通用 Tailwind 工程**的，里面大量
 * `hover:` / `active:` / `focus:` / `dark:` 变体、`shadow-[#hex]/10` 任意值、`grid-cols-3`
 * 这类本项目受控子集之外的写法。
 *
 * 而 `parseClassNames` 把所有带 `:` 的类直接判 unknown，`reportUnknownClasses` 再把
 * unknown 变成 `kind:'token'` 的**违例**。也就是说：一份「看起来很美」的风格规格，
 * 可能让每一页都带着十几条违例出门，然后触发自修轮——每轮都是钱和时间。
 *
 * 所以选 skill 之前先跑这个，把「审美取向」换算成「解析通过率」。
 *
 * 用法：
 *   npx vite-node scripts/skill-tokens.ts .tmp/skills/styles/linear-style.md [更多文件...]
 *   npx vite-node scripts/skill-tokens.ts .tmp/skills/styles/*.md --top=12
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseClassNames } from '../src/editor/ai/tailwind';

const argv = process.argv.slice(2);
const topN = Number((argv.find((a) => a.startsWith('--top=')) ?? '--top=10').split('=')[1]) || 10;
const files = argv.filter((a) => !a.startsWith('--'));
if (!files.length) {
  console.error('用法：npx vite-node scripts/skill-tokens.ts <skill.md> [更多...] [--top=10]');
  process.exit(2);
}

/**
 * 单词类名白名单。
 *
 * 风格规格里的反引号不只标 class，还标属性名与令牌名（`size` / `padding` / `fullWidth`）。
 * 判据：**Tailwind 类要么带 `-`，要么是下面这些单词形式**。不在其中的单词一律不算 token ——
 * 否则「不支持率」会被一堆属性名稀释，看数字的人会去修不存在的问题。
 */
const SINGLE_WORD_CLASSES = new Set([
  'flex', 'grid', 'block', 'inline', 'hidden', 'contents', 'relative', 'absolute', 'fixed',
  'sticky', 'static', 'truncate', 'italic', 'underline', 'uppercase', 'lowercase', 'capitalize',
  'border', 'rounded', 'shadow', 'ring', 'outline', 'container', 'grow', 'shrink',
]);

/**
 * 从反引号片段里抽候选类名。
 *
 * 只认「看起来像 class」的片段：允许 `[#hex]`、`/10`、`-`、`:`，排除中文、括号说明、
 * 纯数值。
 */
function extractTokens(md: string): string[] {
  const out: string[] = [];
  for (const m of md.matchAll(/`([^`\n]{2,80})`/g)) {
    const span = m[1].trim();
    if (/[\u4e00-\u9fa5]/.test(span)) continue; // 中文说明
    for (const raw of span.split(/\s+/)) {
      const c = raw.trim().replace(/^["'`]+|["'`,.;]+$/g, '');
      if (!c) continue;
      if (!/^[a-z][a-z0-9:_[\]/.#%-]*$/i.test(c)) continue; // hex 纯值 / 路径 / 说明文字都排除
      if (/^\d/.test(c)) continue;
      if (!c.includes('-') && !SINGLE_WORD_CLASSES.has(c)) continue; // 属性名/令牌名，不是 class
      out.push(c);
    }
  }
  return out;
}

interface Stat {
  file: string;
  total: number;
  ok: number;
  unknown: string[];
}

const stats: Stat[] = [];
const globalUnknown = new Map<string, number>();

for (const f of files) {
  const md = readFileSync(resolve(f), 'utf8');
  const tokens = extractTokens(md);
  const unknown: string[] = [];
  let ok = 0;
  for (const t of tokens) {
    const res = parseClassNames(t);
    if (res.unknown.length) {
      unknown.push(t);
      globalUnknown.set(t, (globalUnknown.get(t) ?? 0) + 1);
    } else {
      ok += 1;
    }
  }
  stats.push({ file: f.split(/[\\/]/).pop() ?? f, total: tokens.length, ok, unknown });
}

console.log('文件'.padEnd(26) + 'token'.padStart(7) + '通过'.padStart(8) + '通过率'.padStart(9));
console.log('-'.repeat(52));
for (const s of stats) {
  const rate = s.total ? ((s.ok / s.total) * 100).toFixed(1) : '—';
  console.log(s.file.padEnd(26) + String(s.total).padStart(7) + String(s.ok).padStart(8) + `${rate}%`.padStart(9));
}

console.log('\n出现最多的不支持写法：');
const sorted = [...globalUnknown.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);
if (!sorted.length) console.log('  （无——全部通过）');
for (const [t, n] of sorted) console.log(`  ${String(n).padStart(3)}×  ${t}`);

/** 按「为什么被拒」归类：结论比逐条列表有用 */
const buckets = new Map<string, number>();
for (const [t, n] of globalUnknown) {
  const why = t.includes(':')
    ? '变体前缀（hover:/active:/focus:/dark:/md:）'
    : /\[[^\]]+\]/.test(t)
      ? '任意值 [#hex] / [12px]'
      : t.startsWith('grid-cols-') || t.startsWith('col-span-')
        ? 'grid 轨道（本项目用 layout.grid 表达）'
        : /^shadow/.test(t)
          ? 'shadow 组合'
          : /^ring/.test(t)
            ? 'ring（本项目无 ring，用 border 代替）'
            : '其它';
  buckets.set(why, (buckets.get(why) ?? 0) + n);
}
console.log('\n按原因归类：');
for (const [why, n] of [...buckets.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}×  ${why}`);
}
