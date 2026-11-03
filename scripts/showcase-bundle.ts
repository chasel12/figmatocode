/**
 * 展示项目 → 四端工程包（react / vue / taro / uniapp）
 *
 *   vite-node scripts/showcase-bundle.ts --project music
 *   vite-node scripts/showcase-bundle.ts --all
 *
 * 产物落 `showcase/out/<id>/`（解压形态，可直接 cd 进去 npm i）与 `showcase/out/<id>.zip`。
 *
 * 为什么不复用 `scripts/codegen.ts`：那个脚本的页面来源是 `allDemoPages()`（19 页 demo），
 * 而这里要出的是 `.tmp/showcase/<id>/project.json` —— AI 生成的三套小程序。
 * 出码链路本身完全复用（`buildBundleEntries` 是纯函数，见 bundle.ts 的头注释）。
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildBundleEntries } from '../src/generator/bundle';
import { createZip } from '../src/utils/zip';
import type { UIPage } from '../src/schema/types';

const ROOT = process.cwd();

function argValue(flag: string, dflt?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : dflt;
}

interface Cfg {
  id: string;
  title: string;
}

function loadConfigs(): Cfg[] {
  const dir = join(ROOT, 'showcase', 'configs');
  const one = argValue('--project');
  const files = one ? [`${one}.json`] : readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  return files.map((f) => {
    const p = join(dir, f);
    if (!existsSync(p)) throw new Error(`找不到配置：${p}`);
    const raw = JSON.parse(readFileSync(p, 'utf8')) as Cfg;
    return { id: raw.id, title: raw.title };
  });
}

async function main(): Promise<void> {
  const outRoot = resolve(ROOT, argValue('--out', 'showcase/out')!);
  const cfgs = loadConfigs();
  for (const cfg of cfgs) {
    const src = join(ROOT, '.tmp', 'showcase', cfg.id, 'project.json');
    if (!existsSync(src)) {
      console.error(`[${cfg.id}] 没有 project.json：${src}`);
      continue;
    }
    const env = JSON.parse(readFileSync(src, 'utf8')) as { project?: { pages?: UIPage[] } };
    const pages = env.project?.pages ?? [];
    if (!pages.length) {
      console.error(`[${cfg.id}] project.json 里没有页面`);
      continue;
    }
    const { entries, manifest } = await buildBundleEntries(pages, cfg.title);

    // ① 解压形态：目录树直接落盘，用户 cd 进去就能 npm i
    const dir = join(outRoot, cfg.id);
    for (const e of entries) {
      const file = join(dir, e.path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, typeof e.content === 'string' ? e.content : Buffer.from(e.content));
    }
    // ② 压缩包：与编辑器「导出项目包」同一份 `createZip`，避免两套 zip 实现漂移
    const blob = createZip(entries as { path: string; content: string | Uint8Array }[]);
    const zipBytes = Buffer.from(await blob.arrayBuffer());
    mkdirSync(outRoot, { recursive: true });
    writeFileSync(join(outRoot, `${cfg.id}.zip`), zipBytes);

    console.log(
      `[${cfg.id}] ${manifest.pages.length} 页 → ${manifest.targets.map((t) => `${t.id}(${t.files})`).join(' / ')} · ${(
        zipBytes.length / 1024
      ).toFixed(0)} KB → ${dir}`,
    );
  }
}

await main();
