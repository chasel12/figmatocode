/**
 * 拼对比图（一次性，实验留痕用）
 *
 * 每栏必须来自同一提示词、同一模型、同一视口，否则并排没有意义。
 *
 * 用法：
 *   npx vite-node scripts/ai-ab-compare.ts              # 缺省拼 skill 实验（三栏）
 *   AI_CMP_SET=recipes npx vite-node scripts/ai-ab-compare.ts   # 拼配方实验
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

interface Panel {
  label: string;
  file: string;
  /** 面板下方的量化脚注（可选） */
  note?: string;
}

interface PanelSet {
  out: string;
  title: string;
  panels: Panel[];
}

const SETS: Record<string, PanelSet> = {
  skill: {
    out: 'docs/images/ai-ab-skill-compare.png',
    title: '设计参考（skill 注入）对比',
    panels: [
      { label: 'A · UI 生成器（无参考）', file: '.tmp/ai-ab-noskill/shot-A-full.png' },
      { label: 'A · UI 生成器（带 taste-skill）', file: '.tmp/ai-ab-skill/shot-A-full.png' },
      { label: 'B · 直接生成前端代码', file: '.tmp/ai-ab-skill/shot-B-full.png' },
    ],
  },
  recipes: {
    out: 'docs/images/ai-ab-recipes-compare.png',
    title: '字段级配方（styleRecipes）对比',
    panels: [
      {
        label: 'A · 改动前（无配方）',
        file: '.tmp/ai-ab-noskill/shot-A-full.png',
        note: '样式 8/37 · 阴影 0 · 日历 3 周',
      },
      {
        label: 'A · 改动后（带配方）',
        file: '.tmp/ai-ab-recipes/shot-A-full.png',
        note: '样式 13/37 · 阴影 4 · 日历 2 周',
      },
      {
        label: 'B · 直接生成前端代码（参照）',
        file: '.tmp/ai-ab-recipes/shot-B-full.png',
        note: '无约束 · 阴影 57 · 日历 6 周',
      },
    ],
  },
  repeat: {
    out: 'docs/images/ai-ab-repeat-compare.png',
    title: 'repeat 上线前后对比（同提示词 · 同模型）',
    panels: [
      {
        label: '改动前（基线）',
        file: '.tmp/ai-ab-noskill/shot-A-full.png',
        note: '节点 118 · 阴影 0 · 日历 3 周（21 格）',
      },
      {
        label: 'repeat 第 1 次（5 周）',
        file: '.tmp/ai-ab-repeat/shot-A-full.png',
        note: '节点 171 · 阴影 8 · 日历 5 周（35 格）',
      },
      {
        label: 'repeat 第 2 次（3 周）',
        file: '.tmp/ai-ab-final/shot-A-full.png',
        note: '节点 127 · 阴影 4 · 日历 3 周（21 格）',
      },
      {
        label: 'B · 直接生成前端代码（参照）',
        file: '.tmp/ai-ab-noskill/shot-B-full.png',
        note: '无约束 · 阴影 57 · 日历 6 周',
      },
    ],
  },
};

const toDataUrl = (p: string): string => `data:image/png;base64,${readFileSync(resolve(p)).toString('base64')}`;

function buildHtml(set: PanelSet): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 22px; background: #12151b; font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif; }
  h1 { color: #e6ecf5; font-size: 15px; font-weight: 600; margin: 0 0 16px; letter-spacing: .3px; }
  .row { display: flex; gap: 18px; align-items: flex-start; }
  .col { display: flex; flex-direction: column; gap: 6px; width: 300px; }
  .label { color: #cfd6e4; font-size: 12.5px; font-weight: 600; letter-spacing: .2px; }
  .note { color: #7d8798; font-size: 11.5px; font-variant-numeric: tabular-nums; }
  .shot { width: 300px; border-radius: 10px; border: 1px solid #2a3140; display: block; }
</style></head><body>
  <h1>${set.title}</h1>
  <div class="row">
    ${set.panels
      .map(
        (p) => `<div class="col">
      <div class="label">${p.label}</div>
      <img class="shot" src="${toDataUrl(p.file)}">
      ${p.note ? `<div class="note">${p.note}</div>` : ''}
    </div>`,
      )
      .join('\n    ')}
  </div>
</body></html>`;
}

async function main(): Promise<void> {
  const key = process.env.AI_CMP_SET ?? 'skill';
  const set = SETS[key];
  if (!set) {
    console.error(`未知 AI_CMP_SET="${key}"，可选：${Object.keys(SETS).join(' / ')}`);
    process.exit(1);
  }
  const html = buildHtml(set);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1040, height: 800 }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  mkdirSync(resolve('docs/images'), { recursive: true });
  await page.screenshot({ path: resolve(set.out), fullPage: true });
  await browser.close();

  // 顺手把 HTML 也落一份，方便以后改标注重出
  mkdirSync(resolve('.tmp/ai-ab-compare'), { recursive: true });
  writeFileSync(resolve(`.tmp/ai-ab-compare/${key}.html`), html, 'utf-8');
  console.log(`已生成 ${set.out}`);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
