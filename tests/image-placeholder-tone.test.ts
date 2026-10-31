/**
 * P3-4 · 图片占位真实化（按图层名确定性配色）
 *
 * 这条能力最容易做成「看起来能跑、实际不可复现」：用随机色、用 `Date.now()`、
 * 用 `id` 当种子，都能让占位块变好看，但**同一份设计两次出码会得到两种颜色**，
 * 于是像素比对永远抖、用户改一个字整页颜色全变。
 *
 * 所以这里的断言全是「确定性 + 语义」两类，而不是「好看」：
 *  - 同 name 必同色，跨进程/跨顺序都一致（纯函数，不读环境）；
 *  - 换 name 必须换色（否则等于没做，还是一个大灰块）；
 *  - 语义词决定形态（头像走径向、封面更饱和、logo 极浅）；
 *  - 只影响 `background`，不改盒子（像素基线不动）；
 *  - 有 `src` 的图完全不受影响（不能给真实图叠一层色）。
 */
import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { ImageNode, UIProject, UIPage } from '../src/schema/types';
import { compilePage } from '../src/compiler';
import { generateHtml, generateReactProject, generateReferenceHtml } from '../src/generator';
import { generateVueProject } from '../src/generator/vue';
import { generatePrototypeProject } from '../src/generator/prototype';
import {
  IMAGE_PLACEHOLDER_CLASS,
  IMAGE_PLACEHOLDER_CSS,
  collectPlaceholderNodes,
  imagePlaceholderCss,
  placeholderClass,
  placeholderHue,
  placeholderTint,
  placeholderTone,
} from '../src/generator/imagePlaceholder';

resetIdSeq(1200);

function pageWith(images: { name?: string; src?: string }[]): UIPage {
  const page = createPage('占位测试页');
  for (const spec of images) {
    const img = createNode('IMAGE') as ImageNode;
    img.src = spec.src ?? '';
    if (spec.name !== undefined) img.name = spec.name;
    img.layout = { ...img.layout, width: 160, height: 120, widthMode: 'FIXED', heightMode: 'FIXED' };
    page.root.children.push(img);
  }
  return page;
}

const projectWith = (pages: UIPage[]): UIProject => ({ version: 2, name: 'P', pages, components: {}, tokens: [], flows: [] });
const cssOf = (files: { path: string; content: string }[]): string => files.filter((f) => f.path.endsWith('.css')).map((f) => f.content).join('\n');

describe('确定性：同名字必同色', () => {
  it('同名 → 同色相同 class（纯函数，与调用顺序无关）', () => {
    expect(placeholderHue('封面图')).toBe(placeholderHue('封面图'));
    expect(placeholderClass('封面图')).toBe(placeholderClass('封面图'));
    // 顺序无关：先算别的再算它，结果一样
    placeholderHue('头像');
    expect(placeholderHue('封面图')).toBe(placeholderHue('封面图'));
  });

  it('不同名 → 不同色（否则等于还是一个大灰块）', () => {
    const names = ['封面图', '头像', '商品图', 'banner', 'photo-1', 'photo-2'];
    const hues = names.map((n) => placeholderHue(n));
    // 允许极端碰撞，但 6 个名字里至少要出现 4 种不同色相
    expect(new Set(hues).size).toBeGreaterThanOrEqual(4);
  });

  it('色相落在 0~359（CSS 合法值）', () => {
    for (const n of ['', 'a', '很长的中文图层名字用来测试哈希分布', '😀 emoji', '123']) {
      const h = placeholderHue(n);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
    }
  });

  it('无名图落到固定中性色（不是随机：没有名字是确定的事实）', () => {
    expect(placeholderHue(undefined)).toBe(220);
    expect(placeholderHue('')).toBe(220);
    expect(placeholderHue('   ')).toBe(220);
    // 无名与空名同色同 class
    expect(placeholderClass('')).toBe(placeholderClass(undefined));
  });

  it('id 不参与配色（id 每次都变，吃 id 就等于不可复现）', () => {
    const a = pageWith([{ name: '封面图' }]);
    const b = pageWith([{ name: '封面图' }]);
    // 两个页面/节点 id 不同，但占位 class 必须一致
    expect(a.root.children[0].id).not.toBe(b.root.children[0].id);
    expect(placeholderClass(a.root.children[0].name)).toBe(placeholderClass(b.root.children[0].name));
  });
});

describe('语义：图层名决定形态', () => {
  it('四档语义词各自命中', () => {
    expect(placeholderTone('用户头像')).toBe('avatar');
    expect(placeholderTone('avatar-1')).toBe('avatar');
    expect(placeholderTone('课程封面')).toBe('hero');
    expect(placeholderTone('Banner 主图')).toBe('hero');
    expect(placeholderTone('品牌 logo')).toBe('logo');
    expect(placeholderTone('商品图')).toBe('photo');
  });

  it('判不出来按普通图（不猜）', () => {
    expect(placeholderTone('xyz')).toBe('photo');
    expect(placeholderTone(undefined)).toBe('photo');
  });

  it('头像走径向、封面走线性（形态不同 → 渐变类型不同）', () => {
    expect(placeholderTint('用户头像')).toContain('radial-gradient');
    expect(placeholderTint('课程封面')).toContain('linear-gradient');
  });

  it('封面比 logo 更暗（大图需要更强存在感，品牌位不能抢前景）', () => {
    const lightnessOf = (tint: string): number[] => [...tint.matchAll(/hsl\(\d+ \d+% (\d+)%\)/g)].map((m) => Number(m[1]));
    const hero = lightnessOf(placeholderTint('课程封面'));
    const logo = lightnessOf(placeholderTint('品牌 logo'));
    expect(Math.min(...hero)).toBeLessThan(Math.min(...logo));
  });

  it('class 名同时编码形态与色相（可读、可断言、可复用）', () => {
    const cls = placeholderClass('用户头像');
    expect(cls).toMatch(/^ui-image-ph-avatar-\d+$/);
  });
});

describe('CSS 产出：只含本页用到的规则', () => {
  it('基础规则永远在（图标 + 高光 + 变量默认值）', () => {
    const css = imagePlaceholderCss([]);
    expect(css).toBe(IMAGE_PLACEHOLDER_CSS);
    expect(css).toContain(`.${IMAGE_PLACEHOLDER_CLASS}`);
    expect(css).toContain('--ph-tint');
  });

  it('有占位图时追加该图的色调规则，没有就不追加', () => {
    const css = imagePlaceholderCss([{ type: 'IMAGE', name: '课程封面', src: '' }]);
    expect(css).toContain(`.${placeholderClass('课程封面')} { --ph-tint:`);
    expect(css.length).toBeGreaterThan(IMAGE_PLACEHOLDER_CSS.length);
  });

  it('有 src 的图不产生色调规则（不能给真图叠色）', () => {
    const css = imagePlaceholderCss([{ type: 'IMAGE', name: '课程封面', src: 'https://x/y.png' }]);
    expect(css).toBe(IMAGE_PLACEHOLDER_CSS);
  });

  it('同名图只出一条规则（20 张同名卡片不会产生 20 条重复 CSS）', () => {
    const nodes = Array.from({ length: 20 }, () => ({ type: 'IMAGE', name: '商品图', src: '' }));
    const css = imagePlaceholderCss(nodes);
    const hits = css.match(new RegExp(`\\.${placeholderClass('商品图')} \\{`, 'g')) ?? [];
    expect(hits).toHaveLength(1);
  });

  it('非 IMAGE 节点被忽略（不会被误当成图）', () => {
    const css = imagePlaceholderCss([{ type: 'FRAME', name: '课程封面', src: '' }]);
    expect(css).toBe(IMAGE_PLACEHOLDER_CSS);
  });

  it('默认 --ph-tint 不能用 none（background-image 列表项不接受 none，整条声明会被丢弃）', () => {
    expect(IMAGE_PLACEHOLDER_CSS).not.toMatch(/--ph-tint:\s*none/);
  });
});

describe('出码出口一致性', () => {
  const page = pageWith([{ name: '课程封面' }, { name: '用户头像' }, { name: '商品图' }]);

  it('五个出口都输出基础规则 + 三个色调规则', () => {
    const compiled = compilePage(page);
    const outputs: Record<string, string> = {
      html: generateHtml(page, compiled, { title: 't' }),
      reference: generateReferenceHtml(page, compiled, {}),
      react: cssOf(generateReactProject([page])),
      vue: cssOf(generateVueProject([page])),
      prototype: cssOf(generatePrototypeProject(projectWith([page]))),
    };
    for (const [name, text] of Object.entries(outputs)) {
      expect(text, `${name} 缺基础规则`).toContain(IMAGE_PLACEHOLDER_CSS);
      for (const n of ['课程封面', '用户头像', '商品图']) {
        expect(text, `${name} 缺「${n}」的色调规则`).toContain(`.${placeholderClass(n)} {`);
      }
    }
  });

  /**
   * 必须断言**元素的 class 属性**，不能断言「HTML 里出现过这个类名」——
   * 占位 CSS 块本身就在同一个 HTML 里，元素没挂上类也照样命中，那是假绿。
   * （这条断言写错过一次：撤掉 html.ts 的 placeholderClass 调用，测试仍然全绿。）
   */
  const divClasses = (html: string): string[] => [...html.matchAll(/<div class="([^"]*)"/g)].map((m) => m[1]);

  it('HTML 里空图元素挂了色调类，有 src 的图没有', () => {
    const mixed = pageWith([{ name: '课程封面' }, { name: '真图', src: 'data:image/png;base64,AAAA' }]);
    const html = generateHtml(mixed, compilePage(mixed), { title: 't' });
    const classes = divClasses(html);
    const withTone = classes.filter((c) => c.split(/\s+/).includes(placeholderClass('课程封面')));
    expect(withTone, '空图元素没挂色调类').toHaveLength(1);
    // 有 src 的图走 <img>，不参与占位
    expect(html).toContain('<img');
    expect(classes.some((c) => c.includes(placeholderClass('真图')))).toBe(false);
  });

  it('React / Vue / 原型出口的元素也挂了色调类', () => {
    const p2 = pageWith([{ name: '课程封面' }]);
    const tone = placeholderClass('课程封面');
    const reactTsx = generateReactProject([p2]).filter((f) => f.path.endsWith('.tsx')).map((f) => f.content).join('\n');
    const vue = generateVueProject([p2]).filter((f) => f.path.endsWith('.vue')).map((f) => f.content).join('\n');
    const proto = generatePrototypeProject(projectWith([p2])).find((f) => f.path.endsWith('.html'))?.content ?? '';
    for (const [name, text] of Object.entries({ react: reactTsx, vue, prototype: proto })) {
      const attrs = [...text.matchAll(/class(?:Name)?="([^"]*)"/g)].map((m) => m[1]);
      expect(attrs.some((c) => c.split(/\s+/).includes(tone)), `${name} 的空图元素没挂色调类`).toBe(true);
    }
  });

  it('像素基准图与渲染图用同一份占位 CSS（否则 diff 会莫名其妙掉分）', () => {
    const compiled = compilePage(page);
    const render = generateHtml(page, compiled, { title: 't' });
    const reference = generateReferenceHtml(page, compiled, {});
    const blockOf = (s: string): string => s.slice(s.indexOf(`.${IMAGE_PLACEHOLDER_CLASS}`), s.indexOf(`.${IMAGE_PLACEHOLDER_CLASS}`) + 4000);
    for (const n of ['课程封面', '用户头像', '商品图']) {
      expect(blockOf(render)).toContain(`.${placeholderClass(n)} {`);
      expect(blockOf(reference)).toContain(`.${placeholderClass(n)} {`);
    }
  });

  /**
   * 2026-10-29 反转：Taro 出口**必须**挂色调类，并且**必须**在 app.scss 里发射占位规则。
   *
   * 原来的断言是「不挂」——理由是「Taro 的 index.scss 不含占位规则，挂了就是死类名」。
   * 但这个理由推错了方向：正确做法是**把规则补上**，不是把类名去掉。
   * 代价是实测出来的——零食商城商品详情页的封面块变成透明、露出卡片底色，
   * taro 端像素相似度被压在 91.92%（react / uni-app 都是 100%），
   * 而且所有门禁都是绿的，只有截图能发现。
   */
  it('Taro 出口挂色调类，且 app.scss 里有对应规则（否则封面变透明）', async () => {
    const { generateTaro, generateTaroMultiPageProject } = await import('../src/generator/taro-project');
    const { makeEmitContext } = await import('../src/generator/emit-context');
    const compiled = compilePage(page);
    const files = generateTaro(makeEmitContext(page, compiled, { index: 0, allPages: [page] }));
    const tsx = files.find((f) => f.path.endsWith('.tsx'))?.content ?? '';
    expect(tsx).toContain(IMAGE_PLACEHOLDER_CLASS);
    expect(tsx).toContain(placeholderClass('课程封面'));

    const project = generateTaroMultiPageProject([page], { name: 'demo' });
    const scss = project.find((f) => f.path === 'src/app.scss')?.content ?? '';
    // 基础规则 + 本页用到的色调规则都要在
    expect(scss).toContain(`.${IMAGE_PLACEHOLDER_CLASS} {`);
    expect(scss).toContain(`.${placeholderClass('课程封面')} {`);
  });
});

describe('不动盒子（像素基线前提）', () => {
  it('色调只写 --ph-tint，不写尺寸/位置/圆角', () => {
    const css = imagePlaceholderCss([{ type: 'IMAGE', name: '课程封面', src: '' }]);
    const rule = css.slice(css.indexOf(`.${placeholderClass('课程封面')}`));
    expect(rule).not.toMatch(/width|height|margin|padding|border-radius|position/);
  });

  it('基础规则只碰 background-*（不新增 DOM、不改布局）', () => {
    expect(IMAGE_PLACEHOLDER_CSS).not.toMatch(/(^|[^-])width:|(^|[^-])height:|display:/);
  });

  it('collectPlaceholderNodes 收全整棵树（含嵌套）', () => {
    const outer = pageWith([{ name: '外图' }]);
    const inner = createNode('IMAGE') as ImageNode;
    inner.src = '';
    inner.name = '内图';
    (outer.root.children[0] as unknown as { children: unknown[] }).children = [inner];
    const names = collectPlaceholderNodes(outer.root).map((n) => n.name);
    expect(names).toContain('外图');
    expect(names).toContain('内图');
  });
});
