/**
 * M7 · 契约 Schema 生成（W1）
 *
 * plan §3：用 **ts-json-schema-generator** 从 `src/editor/ai/types.ts` **自动**生成 JSON Schema，
 * 保证「合同与 schema 永不脱节」。手写 schema 是禁止项。
 *
 * 产物：
 *   src/editor/ai/contract.page.schema.json   ← AiPageDraft
 *   src/editor/ai/contract.edit.schema.json   ← AiEditPlan
 *
 * 关键参数：
 *   --additional-properties  契约外字段一律拒绝（模型爱自造字段，必须在闸门拦掉）
 *   --strict-tuples          padding 必须恰好 4 项
 *   --no-top-ref             不产生顶层 $ref，ajv 直接编译
 *
 * 用法：npm run ai:schema
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = 'src/editor/ai/types.ts';

const targets = [
  { type: 'AiPageDraft', out: 'src/editor/ai/contract.page.schema.json', title: 'UI Compiler AI · 页面草稿契约' },
  { type: 'AiEditPlan', out: 'src/editor/ai/contract.edit.schema.json', title: 'UI Compiler AI · 编辑指令契约' },
];

for (const t of targets) {
  // 直接调本地 bin 的 JS 入口（Windows 下 execFileSync('npx.cmd') 在 Git Bash 里 spawn 失败）
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules/ts-json-schema-generator/bin/ts-json-schema-generator.js'),
      '--path',
      SRC,
      '--type',
      t.type,
      '--no-top-ref',
      '--additional-properties',
      '--strict-tuples',
      '--minify',
      '--out',
      t.out,
    ],
    { cwd: root, stdio: 'inherit' },
  );

  const abs = path.join(root, t.out);
  const schema = JSON.parse(fs.readFileSync(abs, 'utf8'));
  schema.title = t.title;
  schema.description = `由 scripts/gen-ai-schema.mjs 从 ${SRC} 自动生成，请勿手改。`;

  /**
   * 加固：生成器的 `--additional-properties` 语义是「允许额外字段」（默认不加该关键字＝宽松），
   * 而我们要的是**严格拒绝**。故统一给所有含 properties 的对象补 `additionalProperties: false`。
   * 契约里没有索引签名类型，此操作无副作用（单测 `ai-contract` 锁定越界字段必须被拦）。
   */
  let hardened = 0;
  const harden = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(harden);
      return;
    }
    if (node.properties && node.type === 'object' && node.additionalProperties === undefined) {
      node.additionalProperties = false;
      hardened += 1;
    }
    for (const v of Object.values(node)) harden(v);
  };
  harden(schema);

  // 顶层固定 $schema（ajv 默认 draft-07）
  const ordered = { $schema: 'http://json-schema.org/draft-07/schema#', ...schema };
  fs.writeFileSync(abs, `${JSON.stringify(ordered, null, 2)}\n`, 'utf8');
  console.log(`✓ ${t.type} → ${t.out}（严格模式：${hardened} 个对象已关闭额外字段）`);
}
