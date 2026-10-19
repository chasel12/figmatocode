import { describe, expect, it } from 'vitest';
import { compilePage } from '../src/compiler/compile';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { TextNode, UIPage } from '../src/schema/types';

resetIdSeq(0);

/**
 * 回归：文本截断参数必须「开关 + 最大行」同时落库才产出 CSS。
 *
 * 历史缺陷（2026-10-18 全参数审计揪出）：
 *   面板「截断」开关只写 `textTruncation: 'ENDING'`，**不写 maxLines**；
 *   而「最大行」输入框显示的是 `S.maxLines ?? 2` 的**回退值**、不回写 store。
 *   compile.ts 的判据是 `textTruncation === 'ENDING' && maxLines > 0`，
 *   于是用户打开开关、面板显示「2」，产物却**没有任何** -webkit-line-clamp。
 *
 * 修复：开关开启时一并写入 `maxLines: S.maxLines ?? 2`（见 PropertyPanel 截断按钮）。
 * 本测试锁定 compile 侧判据，防止再次出现「开关无效」。
 */
function textPage(style: Record<string, unknown>): UIPage {
  const page = createPage('截断回归');
  const t = createNode('TEXT') as TextNode;
  (t as { text: string }).text = '一段足够长的文本用于测试截断行为';
  Object.assign(t.style ?? (t.style = {}), style);
  page.root.children.push(t);
  return page;
}

/** 把编译结果摊平成可搜索的字符串（含类名选择器与声明） */
function flatCss(page: UIPage): string {
  const compiled = compilePage(page);
  return compiled.nodes.map((n) => `${n.className} {\n${Object.entries(n.css).map(([k, v]) => `${k}: ${v};`).join('\n')}\n}`).join('\n\n');
}

describe('回归：文本截断（textTruncation + maxLines）', () => {
  it('ENDING + maxLines=2 → 产出 -webkit-line-clamp 与 ellipsis', () => {
    const all = flatCss(textPage({ textTruncation: 'ENDING', maxLines: 2 }));
    expect(all).toContain('-webkit-line-clamp: 2');
    expect(all).toContain('-webkit-box-orient: vertical');
    expect(all).toContain('text-overflow: ellipsis');
    expect(all).toContain('overflow: hidden');
  });

  it('ENDING 但 maxLines 缺失 → 不产出 clamp（这正是历史缺陷的形态）', () => {
    const all = flatCss(textPage({ textTruncation: 'ENDING' }));
    expect(all).not.toContain('-webkit-line-clamp');
  });

  it('DISABLED + maxLines=3 → 不产出 clamp（开关优先）', () => {
    const all = flatCss(textPage({ textTruncation: 'DISABLED', maxLines: 3 }));
    expect(all).not.toContain('-webkit-line-clamp');
  });

  it('ENDING + maxLines=0 → 不产出 clamp（0 行无意义）', () => {
    const all = flatCss(textPage({ textTruncation: 'ENDING', maxLines: 0 }));
    expect(all).not.toContain('-webkit-line-clamp');
  });
});
