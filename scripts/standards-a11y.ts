/**
 * B7 · axe on dist（`docs/frontend-standards-final.md` §1.1 C10）。
 *
 * 为什么 AST 层已经有 D1 规则了还要跑 axe：**两者查的不是一件事。**
 * - AST 规则查「设计有没有问题」（颜色、尺寸、字段缺失），在编译前，判据我们自己的；
 * - axe 查「产物 DOM 有没有问题」（真实标签、真实属性、真实层叠后的对比度），在编译后。
 * 只有 axe 能抓到「AST 对但出口漏了」这一类 —— 例如某个出口忘了把 `alt` 写出去。
 *
 * 范围按 C10 收敛为**可修规则白名单**：AST 没有表单节点，axe 的 forms 组
 * 与 `aria-*` 结构组在这里只会产生噪声。基线外的规则一律不参与判定。
 *
 * 用法：
 *   npm run standards:a11y              # 比对基线
 *   npm run standards:a11y -- --update  # 重写基线
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { compilePage } from '../src/compiler';
import { generateHtml } from '../src/generator/html';
import { allDemoPages } from '../src/demo/pages';
import { parseProjectOnly } from '../src/editor/project';
import type { UIPage } from '../src/schema/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const UPDATE = argv.includes('--update');
const OUT_DIR = path.join(root, '.tmp', 'standards-a11y');
const BASELINE = path.join(root, 'docs', 'standards-a11y-baseline.json');

/**
 * 可修规则白名单（C10）。判据是「模型/出码器改得动」：
 * 对比度改颜色、alt 补文案、lang/title 是出口常量、标题层级与可访问名改结构。
 * 键盘陷阱、ARIA 关系、表单校验这些**本 AST 表达不了**，放进来只会永远红。
 */
const WHITELIST = [
  'color-contrast',
  'image-alt',
  'html-has-lang',
  'document-title',
  'heading-order',
  'button-name',
  'link-name',
];

function loadProducts(): { name: string; pages: UIPage[] }[] {
  const out: { name: string; pages: UIPage[] }[] = [];
  try {
    out.push({ name: 'demo-19', pages: allDemoPages() });
  } catch (err) {
    console.warn(`⚠ demo 语料加载失败：${String(err)}`);
  }
  const mall = path.join(root, '.tmp', 'mall', 'project.json');
  if (fs.existsSync(mall)) {
    try {
      out.push({ name: 'mall-6', pages: parseProjectOnly(fs.readFileSync(mall, 'utf8')).pages });
    } catch (err) {
      console.warn(`⚠ 商城工程解析失败：${String(err)}`);
    }
  }
  return out;
}

interface Row {
  ruleId: string;
  page: string;
  nodes: number;
  target: string;
}

async function main(): Promise<void> {
  const axeSource = fs.readFileSync(path.join(root, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
  const products = loadProducts();
  if (!products.length) {
    console.error('✗ 没有可检查的产物');
    process.exit(1);
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files: { label: string; file: string }[] = [];
  for (const product of products) {
    const dir = path.join(OUT_DIR, product.name);
    fs.mkdirSync(dir, { recursive: true });
    product.pages.forEach((page, i) => {
      const html = generateHtml(page, compilePage(page));
      const file = path.join(dir, `${String(i + 1).padStart(2, '0')}.html`);
      fs.writeFileSync(file, html, 'utf8');
      files.push({ label: `${product.name}/${page.name}`, file });
    });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const rows: Row[] = [];

  for (const f of files) {
    await page.goto(`file://${f.file.replace(/\\/g, '/')}`);
    await page.addScriptTag({ content: axeSource });
    const result = (await page.evaluate(
      async (whitelist: string[]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axe = (window as any).axe;
        const r = await axe.run(document, {
          runOnly: { type: 'rule', values: whitelist },
          resultTypes: ['violations'],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return r.violations.map((v: any) => ({
          ruleId: v.id as string,
          nodes: v.nodes.length as number,
          target: (v.nodes[0]?.target?.[0] ?? '') as string,
        }));
      },
      WHITELIST,
    ));
    for (const v of result) rows.push({ ...v, page: f.label });
  }

  await browser.close();

  /** 聚合：规则 → 命中节点数 + 涉及页数 */
  const agg = new Map<string, { nodes: number; pages: Set<string>; sample: string }>();
  for (const r of rows) {
    const cur = agg.get(r.ruleId) ?? { nodes: 0, pages: new Set<string>(), sample: `${r.page} ${r.target}` };
    cur.nodes += r.nodes;
    cur.pages.add(r.page);
    agg.set(r.ruleId, cur);
  }

  const current = {
    version: 1,
    pages: files.length,
    whitelist: WHITELIST,
    rules: Object.fromEntries([...agg.entries()].map(([id, v]) => [id, { nodes: v.nodes, pages: v.pages.size }])),
  };

  console.log(`axe on dist：${files.length} 页，白名单 ${WHITELIST.length} 条规则`);
  if (!agg.size) console.log('· 0 条违例');
  for (const [id, v] of agg) console.log(`  ${id}: ${v.nodes} 个节点 / ${v.pages.size} 页（例：${v.sample}）`);

  const problems: string[] = [];
  if (!fs.existsSync(BASELINE)) {
    fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n', 'utf8');
    console.log(`\n首次运行，已写入 ${path.relative(root, BASELINE)}`);
  } else {
    const prev = JSON.parse(fs.readFileSync(BASELINE, 'utf8')) as { rules: Record<string, { nodes: number }> };
    for (const [id, v] of Object.entries(current.rules)) {
      const before = prev.rules?.[id]?.nodes;
      if (before === undefined) {
        console.log(`  🆕 ${id}：基线里没有，命中 ${v.nodes}`);
        problems.push(`${id}：新出现的违规类型（${v.nodes} 个节点）`);
      } else if (before !== v.nodes) {
        console.log(`  ${v.nodes > before ? '↑' : '↓'} ${id}：${before} → ${v.nodes}`);
      }
    }
    if (UPDATE) {
      fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n', 'utf8');
      console.log(`\n已用 --update 覆盖 ${path.relative(root, BASELINE)}`);
      problems.length = 0;
    }
  }

  if (problems.length) {
    console.error(`\n✗ ${problems.length} 项需要确认（确认后跑 --update）：`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log('\n✓ axe 结果与基线一致');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
