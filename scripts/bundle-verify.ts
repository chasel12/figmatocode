/**
 * 项目包（CodeModal「导出项目包」）的端到端验收。
 *
 * ## 为什么需要这个脚本
 * 「导出项目包」原先只有一句 `downloadBlob(createZip(entries))`，没有任何断言：
 * 按钮能点、文件能下，但**没人证明包能解压、解压出来能编译**。这类缺口和
 * 「字段在、通道不在」同构 —— 功能在，验证不在，绿灯是假的。
 *
 * ## 验什么（四段，逐段独立可判）
 *   B1 打包：三端条目齐、每端都有 package.json / 页面目录 / codegen-manifest.json
 *   B2 解压：`unzip -t` 独立实现逐条目 CRC 校验（不是自写 reader，避免自己验自己）
 *   B3 结构：解压出的目录直接交给 `project-integrity.mjs` 跑 A1~A6
 *   B4 体积：报告 zip 字节数与条目数（无压缩 store，体积≈内容总和，便于发现重复条目）
 *
 * 用法：
 *   npx vite-node scripts/bundle-verify.ts --project .tmp/mall/project.json
 *   npx vite-node scripts/bundle-verify.ts --project .tmp/mall/project.json --keep
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseProject } from '../src/editor/project';
import { buildBundleEntries } from '../src/generator/bundle';
import { createZip } from '../src/utils/zip';
import type { FontPayload } from '../src/generator/react';

const argv = process.argv.slice(2);
const argOf = (flag: string, dflt: string): string => {
  const i = argv.indexOf(flag);
  return i >= 0 ? (argv[i + 1] ?? dflt) : dflt;
};
const has = (flag: string) => argv.includes(flag);

const ROOT = process.cwd();
const PROJECT = resolve(argOf('--project', '.tmp/mall/project.json'));
const OUT = resolve(argOf('--out', '.tmp/mall/bundle'));
const TARGETS = ['react', 'vue', 'taro', 'uniapp'];
/** 页面目录在工程根下的位置：vite MPA（react/vue）是 `pages/`，跨端框架是 `src/pages/` */
const PAGE_BASE: Record<string, string> = {
  react: 'pages',
  vue: 'pages',
  taro: 'src/pages',
  uniapp: 'src/pages',
};

const checks: { id: string; ok: boolean; message: string }[] = [];
const check = (id: string, ok: boolean, message: string) => {
  checks.push({ id, ok, message });
  console.log(`  ${ok ? '✓' : '✗'} ${id} ${message}`);
};

/** 与 CodeModal 同源：`public/fonts` 全量注入（缺字体 → 工程回退系统字体栈） */
function readFonts(): FontPayload[] {
  const dir = join(ROOT, 'public', 'fonts');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.woff2'))
    .sort()
    .map((name) => ({ name, base64: readFileSync(join(dir, name)).toString('base64') }));
}

/**
 * 取一个**确定干净**的解压目录。
 *
 * 为什么不直接 `rmSync` 后重建：宿主沙箱的批量删除守卫（`node-safe-delete-shim`）在
 * **进程启动时**就把 `CODEBUDDY_SAFE_DELETE_ENABLED` 读成模块级常量，运行时改
 * `process.env` 是空操作（`scripts/codegen.ts` 里那句赋值其实一直没生效）。而删 98 个
 * 条目必然触发守卫。
 *
 * 所以策略是「删得掉就复用，删不掉就换号」：`unzipped` → `unzipped-2` → `unzipped-3`…
 * 保证每次解压都落在一个空目录里。宁可多留几个目录，也不能在脏目录上跑断言
 * ——那会产出两种假绿：残留页面被当成「包里有」（A2 反向误判），或残留旧文件被当成新产物。
 */
function freshDir(base: string): string {
  for (let i = 1; i <= 20; i += 1) {
    const dir = i === 1 ? base : `${base}-${i}`;
    try {
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      return dir;
    } catch {
      /* 删不掉（沙箱守卫）→ 换下一个号 */
    }
  }
  throw new Error(`找不到可用的空解压目录：${base}（已试到 ${base}-20）`);
}

async function main(): Promise<void> {
  const { project } = parseProject(JSON.parse(readFileSync(PROJECT, 'utf8')));
  const pages = project.pages;
  if (!pages.length) throw new Error(`${PROJECT} 里没有页面`);
  console.log(`[project] ${project.name} · ${pages.length} 页`);
  console.log(`[pages] ${pages.map((p) => p.name).join(' / ')}`);

  /* ---- B1 打包 ---- */
  console.log('\n[B1] 打包');
  const { entries, manifest } = await buildBundleEntries(pages, project.name || 'ui-project', readFonts());
  const blob = createZip(entries);
  mkdirSync(OUT, { recursive: true });
  const zipPath = join(OUT, `${project.name || 'ui-project'}-project.zip`);
  writeFileSync(zipPath, Buffer.from(await blob.arrayBuffer()));
  const zipBytes = statSync(zipPath).size;
  console.log(`  · ${entries.length} 条目 / ${(zipBytes / 1024).toFixed(1)} KB → ${zipPath.replace(ROOT, '.').replace(/\\/g, '/')}`);

  // 每端必须有：package.json + codegen-manifest.json + 页面目录（页数 == pages.length）
  const paths = new Set(entries.map((e) => e.path));
  for (const t of TARGETS) {
    const pkg = paths.has(`${t}/package.json`);
    const man = entries.find((e) => e.path === `${t}/codegen-manifest.json`);
    const declared = man ? (JSON.parse(String(man.content)) as { pages: { path: string }[] }).pages : [];
    const pagesOk = declared.length === pages.length;
    /**
     * 页面目录：react/vue 在 `pages/` 下，taro/uniapp 在 `src/pages/` 下。
     * 段数必须按 `base` 自己算（`src/pages` 是两段），写死 3 会把 6 个页面目录归并成 1 个
     * —— 上一版就是这么误报的：包是好的，断言错了。
     */
    const base = PAGE_BASE[t];
    const prefix = `${t}/${base}/`;
    const dirSet = new Set(
      [...paths]
        .filter((p) => p.startsWith(prefix))
        .map((p) => p.slice(prefix.length).split('/')[0])
        .filter(Boolean),
    );
    check(
      `B1-${t}`,
      pkg && Boolean(man) && pagesOk && dirSet.size === pages.length,
      `package.json ${pkg ? '✓' : '✗'} · manifest ${man ? '✓' : '✗'} ${declared.length}/${pages.length} 页 · ${base}/ 下 ${dirSet.size} 个页面目录`,
    );
  }
  check(
    'B1-root',
    paths.has('manifest.json'),
    `根 manifest.json ${paths.has('manifest.json') ? '✓' : '✗'} · targets: ${manifest.targets.map((t) => `${t.id}(${t.files} 文件/${(t.bytes / 1024).toFixed(0)}KB)`).join(' ')}`,
  );

  /* ---- B2 解压（独立实现验 CRC） ---- */
  console.log('\n[B2] 解压校验（unzip -t，逐条目 CRC）');
  const unzipped = freshDir(join(OUT, 'unzipped'));
  let testOut = '';
  try {
    testOut = execFileSync('unzip', ['-t', zipPath], { encoding: 'utf8', timeout: 120_000 });
  } catch (e) {
    testOut = String((e as { stdout?: string }).stdout ?? '');
  }
  const tail = testOut.trim().split('\n').slice(-2).join(' ');
  check('B2', /No errors detected/i.test(testOut), `unzip -t: ${tail || '无输出'}`);

  execFileSync('unzip', ['-o', '-q', zipPath, '-d', unzipped], { timeout: 120_000 });
  const onDisk = [...paths].filter((p) => existsSync(join(unzipped, p))).length;
  check('B2-files', onDisk === paths.size, `解压出 ${onDisk}/${paths.size} 个条目`);

  /* ---- B3 结构（交给 project-integrity，口径唯一） ---- */
  console.log('\n[B3] 解压目录跑工程完整性 A1~A6');  let integrityOut = '';
  let integrityCode = 0;
  try {
    integrityOut = execFileSync(
      process.execPath,
      [
        join(ROOT, 'scripts', 'project-integrity.mjs'),
        '--root',
        unzipped,
        '--targets',
        TARGETS.join(','),
        '--json',
        join(OUT, 'integrity-report.json'),
      ],
      { encoding: 'utf8', timeout: 120_000 },
    );
  } catch (e) {
    const err = e as { stdout?: string; status?: number };
    integrityOut = String(err.stdout ?? '');
    integrityCode = err.status ?? 1;
  }
  for (const line of integrityOut.split('\n')) if (line.trim()) console.log(`    ${line}`);
  check('B3', integrityCode === 0 && /PASS 工程完整性/.test(integrityOut), `project-integrity 退出码 ${integrityCode}`);

  /* ---- 汇总 ---- */
  const allOk = checks.every((c) => c.ok);
  writeFileSync(
    join(OUT, 'bundle-report.json'),
    JSON.stringify({ project: PROJECT, zip: zipPath, zipBytes, entries: entries.length, manifest, checks }, null, 2) + '\n',
    'utf8',
  );
  console.log(`\n[out] ${join(OUT, 'bundle-report.json').replace(ROOT, '.').replace(/\\/g, '/')}`);
  console.log(allOk ? '\nPASS 项目包可解压、结构完整、可交 project-integrity' : '\nFAIL 项目包验收未过');
  process.exit(allOk ? 0 : 1);
}

await main();
