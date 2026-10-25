/**
 * B2 · 交互态（`docs/expression-gap-plan.md` 批次 2）
 *
 * 锁五件事：
 * 1. **伪类只在 `CompiledPage.rules`**：不进 `CompiledNode.css`（否则 reference DOM 会把
 *    伪类声明当静态样式渲染，基准图被污染）；
 * 2. **只许改视觉**：布局/尺寸属性一律被白名单挡住（类型层没有 + 运行时再筛一道）；
 * 3. **diff 口径**：与基础声明相同的属性不重复输出；覆盖后消失的视觉属性要显式清掉；
 * 4. **disabled 双入口**：`:disabled`（原生 button）+ `.is-disabled`（div 用）；
 * 5. **AI 契约**：`states` 走 applyColor，未知令牌记违例；空态不落字段。
 */
import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import type { ContainerNode, StateStyleSchema, StyleSchema } from '../src/schema/types';
import { compilePage, scssFromPage } from '../src/compiler';
import { draftToPage } from '../src/editor/ai/specToPage';
import type { StylePack } from '../src/tokens/packs/types';

resetIdSeq(4200);

function btnPage(style: Partial<StyleSchema>) {
  const page = createPage('B2 交互态');
  const b = createNode('BUTTON');
  (b as { text?: string }).text = 'Go';
  b.layout = { ...b.layout, width: 120, height: 40, widthMode: 'FIXED', heightMode: 'FIXED' };
  b.style = style as StyleSchema;
  page.root.children.push(b);
  return page;
}

function compiled(style: Partial<StyleSchema>) {
  return compilePage(btnPage(style));
}

function ruleOf(style: Partial<StyleSchema>, selectorPart: string) {
  return compiled(style).rules?.find((r) => r.selector.includes(selectorPart));
}

describe('B2 交互态 · 出码位置', () => {
  it('伪类规则进 rules，不进节点的 css', () => {
    const c = compiled({ background: '#1677FF', states: { hover: { background: '#4096FF' } } });
    const btn = c.nodes.find((n) => n.className.startsWith('button'))!;
    expect(JSON.stringify(btn.css)).not.toContain(':hover');
    expect(Object.keys(btn.css).some((k) => k.includes(':'))).toBe(false);
    expect(c.rules?.length).toBe(1);
    expect(c.rules?.[0].selector).toBe(`.${btn.className}:hover`);
    expect(c.rules?.[0].decls['background-color']).toBe('#4096FF');
  });

  it('scssFromPage 把规则追加在节点块之后', () => {
    const out = scssFromPage(compiled({ background: '#1677FF', states: { hover: { background: '#4096FF' } } }));
    expect(out).toMatch(/\.button-1:hover \{\n {2}background-color: #4096FF;\n\}/);
    // 规则必须在所有节点块之后
    expect(out.indexOf(':hover')).toBeGreaterThan(out.indexOf('.button-1 {'));
  });

  it('无 states 时 rules 是 undefined（旧产物深比较不受影响）', () => {
    expect(compiled({ background: '#1677FF' }).rules).toBeUndefined();
  });

  it('覆盖值等于基础值时不产出空规则', () => {
    expect(compiled({ background: '#1677FF', states: { hover: { background: '#1677FF' } } }).rules).toBeUndefined();
  });
});

describe('B2 交互态 · 只许改视觉', () => {
  it('布局/尺寸属性被白名单挡住', () => {
    // 类型层没有 layout 字段，这里强塞一个 width 模拟「越界写布局」
    const c = compiled({
      background: '#1677FF',
      states: { hover: { width: 999 } as unknown as StateStyleSchema },
    });
    expect(c.rules).toBeUndefined();
  });

  it('视觉属性正常出，且不含任何布局声明', () => {
    const r = ruleOf({ background: '#1677FF', states: { hover: { background: '#4096FF', borderRadius: 20 } } }, ':hover');
    expect(r?.decls['background-color']).toBe('#4096FF');
    expect(r?.decls['border-radius']).toBe('20px');
    for (const key of Object.keys(r?.decls ?? {})) {
      expect(['width', 'height', 'display', 'flex', 'gap', 'padding', 'margin', 'position']).not.toContain(key);
    }
  });
});

describe('B2 交互态 · diff 口径', () => {
  it('覆盖后消失的视觉属性被显式清掉（hover 去掉描边）', () => {
    const r = ruleOf(
      { background: '#1677FF', border: { width: 2, color: '#000000' }, states: { hover: { border: { width: 0, color: '#000000' } } } },
      ':hover',
    );
    expect(r?.decls['border']).toBe('none');
  });

  it('disabled 同时给 :disabled 与 .is-disabled 两个入口', () => {
    const c = compiled({ background: '#1677FF', states: { disabled: { background: '#D9D9D9', color: '#8C8C8C' } } });
    const sels = (c.rules ?? []).map((r) => r.selector);
    expect(sels).toContain('.button-1:disabled');
    expect(sels).toContain('.button-1.is-disabled');
  });

  it('fills 覆盖走多层渐变通道（复用填充映射，不另写一套）', () => {
    const r = ruleOf(
      { fills: [{ type: 'SOLID', color: '#111111' }], states: { hover: { fills: [{ type: 'SOLID', color: '#222222' }] } } },
      ':hover',
    );
    expect(r?.decls['background-image']).toBe('linear-gradient(#222222, #222222)');
  });
});

describe('B2 交互态 · AI 契约', () => {
  const pack = { colors: {}, fonts: {}, shadows: {} } as unknown as StylePack;

  function draft(style: Record<string, unknown>) {
    return {
      kind: 'page' as const,
      name: 'P',
      root: {
        kind: 'FRAME' as const,
        layout: { width: 320, height: 200 },
        children: [{ name: 'btn', kind: 'BUTTON' as const, text: 'Go', layout: { width: 120, height: 40 }, style }],
      },
    };
  }

  it('states 透传到 StyleSchema', () => {
    const r = draftToPage(
      draft({ background: '#1677FF', states: { hover: { background: '#4096FF', opacity: 0.9 } } }) as never,
      { pack },
    );
    const btn = (r.page.root as ContainerNode).children[0];
    expect(btn.style?.states?.hover?.background).toBe('#4096FF');
    expect(btn.style?.states?.hover?.opacity).toBe(0.9);
  });

  it('未知令牌记违例，该字段不落', () => {
    const r = draftToPage(draft({ states: { hover: { background: '@color.nope' } } }) as never, { pack });
    const btn = (r.page.root as ContainerNode).children[0];
    expect(r.violations.length).toBeGreaterThan(0);
    expect(btn.style?.states?.hover?.background).toBeUndefined();
    expect(btn.style?.states).toBeUndefined();
  });

  it('空 states 不落字段', () => {
    const r = draftToPage(draft({ states: {} }) as never, { pack });
    const btn = (r.page.root as ContainerNode).children[0];
    expect(btn.style?.states).toBeUndefined();
  });
});

describe('B2 交互态 · .fig 往返（已报备降级）', () => {
  it('states 无 Figma 原语：导出丢弃、导入不还原，其余样式不受影响', async () => {
    const { exportFig } = await import('../src/fig/export');
    const { importFig } = await import('../src/fig/import');
    const { loadFigCodec } = await import('../src/fig/codec');
    const codec = await loadFigCodec();
    const page = btnPage({ background: '#1677FF', borderRadius: 8, states: { hover: { background: '#4096FF' } } });
    const exported = await exportFig([page], codec.encode, { exportedAt: '2026-01-01T00:00:00.000Z' });
    const back = importFig(exported.bytes, codec.decode);
    const btn = (back.pages[0].root as ContainerNode).children[0];
    expect(btn.style?.states).toBeUndefined();
    expect(btn.style?.borderRadius).toBe(8);
  });
});
