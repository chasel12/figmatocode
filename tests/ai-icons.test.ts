/**
 * 图标词表与归一器
 *
 * 两个「防漂移」断言（词表/别名必须指向真实图标）是重点：
 * lucide 升级会改名（0.470 里 `help-circle` 已变 `circle-help`），
 * 一旦词表指向不存在的名字，模型抄到的就是错的——而错在提示词里，
 * 运行期只会表现为「模型又不会画图标了」，极难反查。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ICON_ALIASES, ICON_NAMES, iconVocabPrompt, nearestIconNames, resolveIconName } from '../src/editor/ai/iconVocab';
import { checkDraftSemantics } from '../src/editor/ai/contract';
import { draftToPage } from '../src/editor/ai/specToPage';
import { getPack } from '../src/tokens/packs';
import type { AiPageDraft } from '../src/editor/ai/types';

/** 直接从生成源里取图标表（与运行时 loadIcons 同一份数据，但无需动态 import） */
function realIcons(): Record<string, { d: string; t: string }> {
  const src = readFileSync(new URL('../src/assets/icons/lucide.ts', import.meta.url), 'utf8');
  const marker = 'export const LUCIDE_ICONS: Record<string, IconEntry> = ';
  const at = src.indexOf(marker);
  return JSON.parse(src.slice(at + marker.length).replace(/;\s*$/, ''));
}

const icons = realIcons();
const paths = Object.fromEntries(Object.entries(icons).map(([k, v]) => [k, v.d]));
const pack = getPack('shadcn');

describe('图标词表', () => {
  it('每个名字都真实存在于图标库（防止 lucide 升级后词表悬空）', () => {
    const missing = ICON_NAMES.filter((n) => !icons[n]);
    expect(missing, `词表里这些名字已不存在：${missing.join(' ')}`).toEqual([]);
  });

  it('别名表的每个目标都真实存在', () => {
    const bad = Object.entries(ICON_ALIASES).filter(([, v]) => !icons[v]);
    expect(bad, `别名指向不存在的图标：${bad.map(([k, v]) => `${k}->${v}`).join(' ')}`).toEqual([]);
  });

  it('提示词块列出全部名字，且带分组标题', () => {
    const text = iconVocabPrompt();
    expect(text).toContain(`下面 ${ICON_NAMES.length} 个`);
    for (const name of ICON_NAMES) expect(text).toContain(name);
    expect(text).toContain('导航/操作');
    expect(text).toContain('电商/交易');
  });
});

describe('图标名归一', () => {
  it('精确命中原样返回', () => {
    expect(resolveIconName('house', icons).name).toBe('house');
    expect(resolveIconName('shopping-cart', icons).name).toBe('shopping-cart');
  });

  it('别名命中：模型常写但 lucide 不叫这个的名字', () => {
    expect(resolveIconName('home', icons).name).toBe('house');
    expect(resolveIconName('cart', icons).name).toBe('shopping-cart');
    expect(resolveIconName('notification', icons).name).toBe('bell');
    expect(resolveIconName('location', icons).name).toBe('map-pin');
    expect(resolveIconName('help-circle', icons).name).toBe('circle-help');
    expect(resolveIconName('alert-circle', icons).name).toBe('circle-alert');
  });

  it('中文名也能归一（中文提示词下模型偶尔直接写中文）', () => {
    expect(resolveIconName('首页', icons).name).toBe('house');
    expect(resolveIconName('购物车', icons).name).toBe('shopping-cart');
    expect(resolveIconName('客服', icons).name).toBe('headphones');
  });

  it('规范化：大小写 / 下划线 / `lucide-` 前缀 / `-icon` 后缀', () => {
    expect(resolveIconName('  HOUSE  ', icons).name).toBe('house');
    expect(resolveIconName('shopping_cart', icons).name).toBe('shopping-cart');
    expect(resolveIconName('lucide-house', icons).name).toBe('house');
    expect(resolveIconName('search-icon', icons).name).toBe('search');
    expect(resolveIconName('search_icon', icons).name).toBe('search');
  });

  it('前缀唯一时命中（chevron-r → chevron-right）', () => {
    expect(resolveIconName('chevron-r', icons).name).toBe('chevron-right');
  });

  it('前缀有歧义时不猜（chevron → 多个候选，判失败）', () => {
    expect(resolveIconName('chevron', icons).name).toBeUndefined();
  });

  it('完全无关的名字判失败，并给出最近候选', () => {
    const hit = resolveIconName('zzzz-not-an-icon', icons);
    expect(hit.name).toBeUndefined();
    expect(hit.candidates.length).toBe(3);
    expect(hit.candidates.every((c) => !!icons[c])).toBe(true);
  });

  it('最近候选确实相近（searc → search 类）', () => {
    const near = nearestIconNames('seach', icons);
    expect(near).toContain('search');
  });
});

describe('接入转换层与契约闸门', () => {
  const draft = (icon: string): AiPageDraft =>
    ({
      kind: 'page',
      name: '图标页',
      root: {
        kind: 'FRAME',
        className: 'flex flex-col gap-2 p-4',
        children: [{ kind: 'VECTOR', icon, className: 'w-6 h-6' }],
      },
    }) as AiPageDraft;

  it('模型写 home，产物用的是 house 的路径（不是空白）', () => {
    const { page, violations } = draftToPage(draft('home'), { pack, icons: paths });
    expect(violations).toEqual([]);
    const vec = (page.root as unknown as { children: { vector?: { d: string } }[] }).children[0];
    expect(vec.vector?.d).toBe(icons.house.d);
  });

  it('契约闸门对近义名放行（与转换层同一归一器，不能一处严一处松）', () => {
    const violations = checkDraftSemantics(draft('cart'), { pack, icons: paths });
    expect(violations).toEqual([]);
  });

  it('真正无关的名字：闸门报违例，且提示里带候选图标名', () => {
    const violations = checkDraftSemantics(draft('zzzz-not-an-icon'), { pack, icons: paths });
    const iconViolation = violations.find((v) => v.path.endsWith('.icon'));
    expect(iconViolation).toBeDefined();
    expect(iconViolation?.message).toMatch(/相近的有：.+/);
  });
});

describe('图标 ≠ 形状', () => {
  const withVector = (vector: Record<string, unknown>): AiPageDraft =>
    ({
      kind: 'page',
      name: '图标页',
      root: { kind: 'FRAME', className: 'flex flex-col gap-2 p-4', children: [vector] },
    }) as unknown as AiPageDraft;

  it('VECTOR 用 FILL 尺寸 → 违例（图标会被拉伸成色块）', () => {
    const { violations } = draftToPage(withVector({ kind: 'VECTOR', icon: 'utensils', className: 'w-full h-12' }), {
      pack,
      icons: paths,
    });
    expect(violations.some((v) => /不能用 FILL 尺寸/.test(v.message))).toBe(true);
  });

  it('又大又带底色的 VECTOR → 违例（把图标当形状用了）', () => {
    const { violations } = draftToPage(
      withVector({ kind: 'VECTOR', icon: 'utensils', className: 'w-12 h-12 rounded-full bg-muted' }),
      { pack, icons: paths },
    );
    expect(violations.some((v) => /过大且带底色/.test(v.message))).toBe(true);
  });

  it('24px 带底色不算错——实心星标/心形就是靠底色填充的', () => {
    const { violations } = draftToPage(withVector({ kind: 'VECTOR', icon: 'star', className: 'w-6 h-6 text-warning bg-warning' }), {
      pack,
      icons: paths,
    });
    expect(violations).toEqual([]);
  });

  it('契约教的分入口写法（FRAME 圆底 + 内层 VECTOR 24）零违例，图标保持 24×24', () => {
    const spec = {
      kind: 'page',
      name: '分类入口',
      root: {
        kind: 'FRAME',
        className: 'flex flex-col items-center gap-2',
        children: [
          {
            kind: 'FRAME',
            className: 'flex items-center justify-center w-12 h-12 rounded-full bg-muted',
            children: [{ kind: 'VECTOR', icon: 'utensils', className: 'w-6 h-6 text-foreground' }],
          },
          { kind: 'TEXT', text: '美食', className: 'text-xs text-muted-foreground' },
        ],
      },
    } as unknown as AiPageDraft;

    expect(checkDraftSemantics(spec, { pack, icons: paths })).toEqual([]);
    const { page, violations } = draftToPage(spec, { pack, icons: paths });
    expect(violations).toEqual([]);

    const entry = (page.root as unknown as { children: { children: { layout: { width: number; height: number } }[] }[] }).children[0];
    expect(entry.children[0].layout.width).toBe(24);
    expect(entry.children[0].layout.height).toBe(24);
  });

  it('RECTANGLE 放子项 → 违例（出码器会丢弃，不能静默通过）', () => {
    const spec = {
      kind: 'page',
      name: '错写法',
      root: {
        kind: 'FRAME',
        className: 'flex flex-col',
        children: [
          {
            kind: 'RECTANGLE',
            className: 'flex items-center justify-center w-12 h-12 rounded-full bg-muted',
            children: [{ kind: 'VECTOR', icon: 'utensils', className: 'w-6 h-6' }],
          },
        ],
      },
    } as unknown as AiPageDraft;

    const violations = checkDraftSemantics(spec, { pack, icons: paths });
    expect(violations.some((v) => /RECTANGLE 是纯形状/.test(v.message))).toBe(true);

    // 转换层也不能把它写进 AST（写进去就会被出码器静默丢掉）
    const built = draftToPage(spec, { pack, icons: paths });
    const rect = (built.page.root as unknown as { children: { children?: unknown[] }[] }).children[0];
    expect(rect.children ?? []).toEqual([]);
  });
});
