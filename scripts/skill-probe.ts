/**
 * 诊断工具：看一份真实 skill 经「归一化 + 按章节节选」后到底保留了哪些内容。
 *
 * 为什么需要它：真实 skill 通常 20~40K 字符，注入前会被 `selectSkillBody` 节选。
 * 用户觉得「我上传了 skill 但没效果」时，第一件事应该是看**实际注入了什么**，
 * 而不是猜模型不听话。
 *
 * 用法：
 *   npx vite-node scripts/skill-probe.ts .tmp/skills/taste-skill.md
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { composeDesignRef, makeSkill } from '../src/editor/ai/skills';

const file = process.argv[2] ?? '.tmp/skills/taste-skill.md';
const raw = readFileSync(resolve(file), 'utf8');
const skill = makeSkill(file.split(/[\\/]/).pop() ?? 'skill', raw);
const ref = composeDesignRef([skill]);

console.log(`文件      ${file}`);
console.log(`原文      ${raw.length} 字符`);
console.log(`归一化后  ${skill.text.length} 字符（去 frontmatter + 按章节节选 + 上限截断）`);
console.log(`实际注入  ${ref.length} 字符`);
console.log('');
console.log('保留的二级标题：');
const headings = [...skill.text.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1]);
if (!headings.length) console.log('  （无二级标题——按纯文本硬截断）');
for (const h of headings) console.log('  ·', h);
console.log('');
console.log('--- 开头 200 字 ---');
console.log(skill.text.slice(0, 200));
