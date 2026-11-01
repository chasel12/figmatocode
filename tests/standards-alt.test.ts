/**
 * B8 · `alt` 全链路（WCAG 1.1.1）。
 *
 * 这个字段是本项目**第 8 类**「字段在、通道不在」的预防性检查：一个字段要真的有用，
 * 必须同时满足四层 —— ① schema 在 ② 模型知道能写 ③ 通道通 ④ **出口读**。
 * 缺任何一层都会出现「门禁全绿但产物没有」的假绿。
 *
 * 所以这里逐层断言，而不是只测「能存能读」：
 *   schema → AI 契约 → AST → 四个工程出口 → `.fig` 往返 → 规则命中
 */
import { describe, expect, it } from 'vitest';
import { compilePage } from '../src/compiler/compile';
import { generateHtml } from '../src/generator/html';
import { generateReactProject } from '../src/generator/react';
import { generateVueProject } from '../src/generator/vue';
import { generateTaroMultiPageProject } from '../src/generator/taro-project';
import { generateUniappProject } from '../src/generator/uniapp';
import { draftToPage } from '../src/editor/ai/specToPage';
import { exportFigBlob, importFigFile, pagesToProject } from '../src/fig/project';
import { createNode, createPage } from '../src/schema/factory';
import { buildContext } from '../src/standards/context';
import { runRules } from '../src/standards/runner';
import { ruleById } from '../src/standards/rules';
import { getPack } from '../src/tokens/packs';
import type { AiPageDraft } from '../src/editor/ai/types';
import type { ImageNode, UIPage } from '../src/schema/types';
import pageSchema from '../src/editor/ai/contract.page.schema.json';

const ALT = '芒果干包装正面，净含量 100g';

/** 一页一个带 alt 的图片（其余字段走工厂缺省，避免测试被无关样式干扰） */
function pageWithAlt(alt?: string): UIPage {
  const page = createPage('商品详情', 375, 812);
  const img = createNode('IMAGE', { name: '商品主图' }) as ImageNode;
  img.src = 'data:image/png;base64,iVBORw0KGgo=';
  img.layout.widthMode = 'FIXED';
  img.layout.heightMode = 'FIXED';
  img.layout.width = 200;
  img.layout.height = 200;
  if (alt !== undefined) img.alt = alt;
  page.root.children = [img];
  return page;
}

const all = (files: { path: string; content: string }[]): string => files.map((f) => f.content).join('\n');

describe('① schema / AI 契约：模型知道能写', () => {
  it('AiNodeSpec 的 alt 进了契约（additionalProperties:false 下不在 schema = 直接判违例）', () => {
    const def = pageSchema as unknown as { definitions?: Record<string, { properties?: Record<string, unknown> }> };
    const spec = def.definitions?.AiNodeSpec;
    expect(spec?.properties, 'schema 里没有 AiNodeSpec').toBeTruthy();
    expect(Object.keys(spec!.properties!)).toContain('alt');
  });

  it('draft → AST：alt 原样落地', () => {
    const draft = {
      kind: 'page',
      name: '商品详情',
      width: 375,
      height: 812,
      root: {
        kind: 'FRAME',
        layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', padding: [0, 0, 0, 0], gap: 0 },
        children: [{ kind: 'IMAGE', src: '', alt: ALT, layout: { width: 200, height: 200 } }],
      },
    } as unknown as AiPageDraft;
    const { page } = draftToPage(draft, { pack: getPack('shadcn') });
    const img = page.root.children[0] as ImageNode;
    expect(img.type).toBe('IMAGE');
    expect(img.alt).toBe(ALT);
  });

  it('没写 alt 时 AST 不落这个键（与显式空串区分）', () => {
    const page = pageWithAlt(undefined);
    expect('alt' in page.root.children[0]).toBe(false);
    const empty = pageWithAlt('');
    expect((empty.root.children[0] as ImageNode).alt).toBe('');
  });
});

describe('④ 出口读：四个工程出口 + 单文件 HTML', () => {
  it('HTML：出 alt，且引号被转义', () => {
    const html = generateHtml(pageWithAlt(ALT), compilePage(pageWithAlt(ALT)));
    expect(html).toContain(`alt="${ALT}"`);

    const quoted = generateHtml(pageWithAlt('他说"好吃"'), compilePage(pageWithAlt('他说"好吃"')));
    expect(quoted).toContain('alt="他说&quot;好吃&quot;"');
  });

  it('没写 alt 时仍然出 alt=""（对读屏器等于「装饰图」，不是读出文件名）', () => {
    const page = pageWithAlt(undefined);
    expect(generateHtml(page, compilePage(page))).toContain('alt=""');
  });

  it('React / Vue：alt 属性', () => {
    const page = pageWithAlt(ALT);
    expect(all(generateReactProject([page]))).toContain(`alt="${ALT}"`);
    expect(all(generateVueProject([page]))).toContain(`alt="${ALT}"`);
  });

  it('Taro / uni-app：小程序没有 alt，走 aria-label', () => {
    const page = pageWithAlt(ALT);
    expect(all(generateTaroMultiPageProject([page]))).toContain(`aria-label="${ALT}"`);
    expect(all(generateUniappProject([page]))).toContain(`aria-label="${ALT}"`);
  });

  it('装饰图（alt 为空串）不出 aria-label', () => {
    const page = pageWithAlt('');
    expect(all(generateUniappProject([page]))).not.toContain('aria-label');
  });
});

describe('③ 通道：.fig 往返（Figma 无 alt 原语 → 旁挂）', () => {
  it('存盘再打开，alt 不丢', async () => {
    const project = pagesToProject([pageWithAlt(ALT)], 'alt-roundtrip');
    const { blob } = await exportFigBlob(project, 'alt-roundtrip');
    const again = await importFigFile(new File([blob], 'alt-roundtrip.fig'));
    const imgs: ImageNode[] = [];
    const walk = (n: { type: string; children?: unknown[] }): void => {
      if (n.type === 'IMAGE') imgs.push(n as unknown as ImageNode);
      for (const c of (n.children ?? []) as { type: string; children?: unknown[] }[]) walk(c);
    };
    walk(again.project.pages[0].root as unknown as { type: string; children?: unknown[] });
    expect(imgs.length).toBeGreaterThan(0);
    expect(imgs.some((i) => i.alt === ALT)).toBe(true);
  });
});

describe('规则层：缺 alt 会被 a11y 规则抓到', () => {
  const rule = ruleById('wcag-1.1.1-image-alt')!;

  it('有 alt → 0 命中', () => {
    const res = runRules(buildContext(pageWithAlt(ALT)), [rule]);
    expect(res.violations).toEqual([]);
  });

  it('没写 alt → 命中，且路径精确到节点', () => {
    const res = runRules(buildContext(pageWithAlt(undefined)), [rule]);
    expect(res.violations).toHaveLength(1);
    expect(res.violations[0].ruleId).toBe('wcag-1.1.1-image-alt');
    expect(res.violations[0].path).toBe('root/children[0]');
  });

  it('装饰性命名（背景/分割线）豁免', () => {
    const page = pageWithAlt(undefined);
    page.root.children[0].name = '背景光晕';
    expect(runRules(buildContext(page), [rule]).violations).toEqual([]);
  });
});
