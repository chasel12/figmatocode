/**
 * 无 src 图片的占位样式：单一权威定义 + 四个出口一致性
 *
 * 这条规则原来在 html / react / reference / vue 里各抄了一份 `background: #e0e0e0`。
 * 四份拷贝的风险不是丑，是**漂移**：reference 是像素比的基准图，它一旦和 render
 * 不一致，`npm run diff` 掉分却看不出是谁改的。所以这里用测试把「只有一个定义」
 * 这件事锁住，而不是靠自觉。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { ImageNode, UIProject, UIPage } from '../src/schema/types';
import { compilePage } from '../src/compiler';
import { generateHtml, generateReactProject, generateReferenceHtml } from '../src/generator';
import { generateVueProject } from '../src/generator/vue';
import { generatePrototypeProject } from '../src/generator/prototype';
import { IMAGE_PLACEHOLDER_CLASS, IMAGE_PLACEHOLDER_CSS } from '../src/generator/imagePlaceholder';

resetIdSeq(500);

/** 只含一页的最小工程（原型出口要 UIProject） */
function projectWith(pages: UIPage[]): UIProject {
  return { version: 2, name: '占位图工程', pages, components: {}, tokens: [], flows: [] };
}

/** 一个只有空 IMAGE 的最小页面 */
function emptyImagePage(): UIPage {
  const page = createPage('占位图页');
  const img = createNode('IMAGE') as ImageNode;
  img.src = '';
  img.layout = { ...img.layout, width: 200, height: 100, widthMode: 'FIXED', heightMode: 'FIXED' };
  page.root.children.push(img);
  return page;
}

describe('图片占位样式', () => {
  it('类名与规则同源（常量里带着类名，不会各写各的）', () => {
    expect(IMAGE_PLACEHOLDER_CSS).toContain(`.${IMAGE_PLACEHOLDER_CLASS}`);
  });

  it('data URI 里的 # 必须转义成 %23（否则会被当成 URL 片段截断）', () => {
    const dataUri = IMAGE_PLACEHOLDER_CSS.match(/url\("data:image\/svg\+xml[^"]*"\)/)?.[0] ?? '';
    expect(dataUri).not.toBe('');
    // stroke='#a8a8b4' 这种写法会让浏览器在 # 处截断，图标直接不显示
    expect(dataUri).not.toMatch(/#[0-9a-f]{6}/i);
    expect(dataUri).toContain('%23');
  });

  it('五个出码出口都输出同一条规则（含像素基准图 reference 与原型）', () => {
    const page = emptyImagePage();
    const compiled = compilePage(page);
    const cssOf = (files: { path: string; content: string }[]): string =>
      files.filter((f) => f.path.endsWith('.css')).map((f) => f.content).join('\n');

    const outputs: Record<string, string> = {
      html: generateHtml(page, compiled, { title: 't' }),
      reference: generateReferenceHtml(page, compiled, {}),
      react: cssOf(generateReactProject([page])),
      vue: cssOf(generateVueProject([page])),
      prototype: cssOf(generatePrototypeProject(projectWith([page]))),
    };
    for (const [name, text] of Object.entries(outputs)) {
      expect(text, `${name} 缺占位规则`).toContain(IMAGE_PLACEHOLDER_CSS);
    }
  });

  it('空 IMAGE 出占位 div；有 src 时不出占位', () => {
    const empty = emptyImagePage();
    expect(generateHtml(empty, compilePage(empty), { title: 't' })).toContain(IMAGE_PLACEHOLDER_CLASS);

    const withSrc = emptyImagePage();
    (withSrc.root.children[0] as ImageNode).src = 'data:image/png;base64,AAAA';
    const html = generateHtml(withSrc, compilePage(withSrc), { title: 't' });
    expect(html).toContain('<img');
  });

  it('出码器源码里不再残留旧的硬编码色值（防止有人改回去一半）', () => {
    const files = [
      '../src/generator/html.ts',
      '../src/generator/react.ts',
      '../src/generator/reference.ts',
      '../src/generator/vue.ts',
    ];
    for (const f of files) {
      const src = readFileSync(new URL(f, import.meta.url), 'utf8');
      expect(src, `${f} 里还有硬编码占位样式`).not.toContain('.ui-image-placeholder { background');
    }
  });
});
