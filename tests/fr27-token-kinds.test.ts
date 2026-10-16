import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { editorReducer, initialState } from '../src/editor/store';
import { defaultVarName, tokenDecls, tokensToCss } from '../src/compiler/tokens';
import type { LayoutGridSchema, StyleToken, UINode } from '../src/schema/types';

resetIdSeq(0);

function rect(): UINode {
  const n = createNode('RECTANGLE');
  n.layout.width = 50;
  n.layout.height = 50;
  return n;
}

function stateWith(node: UINode = rect()) {
  const page = createPage('FR27 页面');
  page.root.children.push(node);
  return { s: initialState(page, 'FR27 项目'), nodeId: node.id };
}

describe('FR-27 四类 kind（M6 主线单点扩枚举）', () => {
  it('CREATE_TOKEN 支持 EFFECT / GRID', () => {
    let { s } = stateWith();
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'EFFECT', style: { effects: [{ kind: 'LAYER_BLUR', radius: 4 }] } });
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'GRID', style: {}, grids: [{ pattern: 'COLUMNS', count: 12, gutter: 16 }] });
    expect(s.tokens.map((t) => t.kind)).toEqual(['EFFECT', 'GRID']);
  });

  it('cssVar 前缀按 kind 派生（四类各不同）', () => {
    let { s } = stateWith();
    for (const kind of ['PAINT', 'TEXT', 'EFFECT', 'GRID'] as const) {
      s = editorReducer(s, { type: 'CREATE_TOKEN', kind, style: {}, ...(kind === 'GRID' ? { grids: [{ pattern: 'GRID' as const }] } : {}) });
    }
    expect(s.tokens.map((t) => t.cssVar)).toEqual([
      '--uic-paint-1',
      '--uic-text-2',
      '--uic-effect-3',
      '--uic-grid-4',
    ]);
  });

  it('defaultVarName 四类前缀', () => {
    const mk = (kind: StyleToken['kind']): StyleToken => ({ id: 'x', name: 'n', kind, style: {} });
    expect(defaultVarName(mk('PAINT'), 0)).toBe('--uic-paint-1');
    expect(defaultVarName(mk('TEXT'), 0)).toBe('--uic-text-1');
    expect(defaultVarName(mk('EFFECT'), 0)).toBe('--uic-effect-1');
    expect(defaultVarName(mk('GRID'), 0)).toBe('--uic-grid-1');
  });

  it('CREATE_TOKEN 默认名按 kind 中文前缀 + 序号', () => {
    let { s } = stateWith();
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'EFFECT', style: {} });
    expect(s.tokens[0].name).toBe('Effect 1');
  });

  it('GRID 创建带 grids 字段；PAINT 不带', () => {
    let { s } = stateWith();
    const grids: LayoutGridSchema[] = [{ pattern: 'COLUMNS', count: 12, gutter: 16, offset: 0, alignment: 'STRETCH', color: 'rgba(255,0,0,0.1)' }];
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'GRID', style: {}, grids });
    expect(s.tokens[0].grids).toHaveLength(1);
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'PAINT', style: { background: '#fff' } });
    expect(s.tokens[1].grids).toBeUndefined();
  });

  it('GRID 创建即应用 → 节点 style.layoutGrids 写入', () => {
    const { s, nodeId } = stateWith();
    const out = editorReducer(s, {
      type: 'CREATE_TOKEN',
      kind: 'GRID',
      style: {},
      grids: [{ pattern: 'ROWS', count: 8, gutter: 8 }],
      nodeId,
    });
    const node = out.page.root.children[0];
    expect(node.style?.layoutGrids).toHaveLength(1);
    expect(node.styleTokenId).toBe(out.tokens[0].id);
  });

  it('UPDATE_TOKEN 改 grids → 引用者 layoutGrids 同步', () => {
    const { s, nodeId } = stateWith();
    let out = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'GRID', style: {}, grids: [{ pattern: 'GRID', sectionSize: 8 }], nodeId });
    const tokenId = out.tokens[0].id;
    out = editorReducer(out, { type: 'UPDATE_TOKEN', id: tokenId, grids: [{ pattern: 'GRID', sectionSize: 24 }] });
    expect(out.tokens[0].grids?.[0].sectionSize).toBe(24);
    expect(out.page.root.children[0].style?.layoutGrids?.[0].sectionSize).toBe(24);
  });

  it('EFFECT 改效果 → 引用者 effects 同步', () => {
    const { s, nodeId } = stateWith();
    let out = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'EFFECT', style: { effects: [{ kind: 'LAYER_BLUR', radius: 4 }] }, nodeId });
    const tokenId = out.tokens[0].id;
    out = editorReducer(out, { type: 'UPDATE_TOKEN', id: tokenId, style: { effects: [{ kind: 'LAYER_BLUR', radius: 12 }] } });
    expect(out.page.root.children[0].style?.effects?.[0].radius).toBe(12);
  });
});

describe('FR-27 EFFECT token → CSS 声明', () => {
  const effectToken: StyleToken = {
    id: 't1',
    name: 'Shadow',
    kind: 'EFFECT',
    style: {
      effects: [
        { kind: 'DROP_SHADOW', x: 0, y: 4, blur: 8, spread: 0, color: 'rgba(0,0,0,0.2)' },
        { kind: 'LAYER_BLUR', radius: 6 },
        { kind: 'BACKGROUND_BLUR', radius: 10 },
      ],
    },
  };

  it('box-shadow / filter / backdrop-filter 三类各自产出', () => {
    const d = tokenDecls(effectToken, '--uic-effect-1');
    expect(d['--uic-effect-1-box-shadow']).toContain('0px 4px 8px 0px rgba(0,0,0,0.2)');
    expect(d['--uic-effect-1-filter']).toBe('blur(6px)');
    expect(d['--uic-effect-1-backdrop-filter']).toBe('blur(10px)');
  });

  it('INNER_SHADOW 加 inset 前缀', () => {
    const t: StyleToken = { id: 't', name: 'n', kind: 'EFFECT', style: { effects: [{ kind: 'INNER_SHADOW', x: 1, y: 1, blur: 2, spread: 0, color: '#000' }] } };
    expect(tokenDecls(t, '--v')['--v-box-shadow']).toContain('inset ');
  });

  it('不可见效果被过滤', () => {
    const t: StyleToken = { id: 't', name: 'n', kind: 'EFFECT', style: { effects: [{ kind: 'LAYER_BLUR', radius: 4, visible: false }] } };
    expect(tokenDecls(t, '--v')).toEqual({});
  });

  it('空 effects → 不产声明', () => {
    const t: StyleToken = { id: 't', name: 'n', kind: 'EFFECT', style: {} };
    expect(tokenDecls(t, '--v')).toEqual({});
  });
});

describe('FR-27 GRID token → CSS 声明', () => {
  const gridToken: StyleToken = {
    id: 'g1',
    name: 'Grid 12',
    kind: 'GRID',
    style: {},
    grids: [
      { pattern: 'COLUMNS', count: 12, gutter: 16, color: 'rgba(255,0,0,0.1)' },
      { pattern: 'ROWS', count: 8, gutter: 12, color: 'rgba(0,0,255,0.1)' },
      { pattern: 'GRID', sectionSize: 8 },
    ],
  };

  it('COLUMNS / ROWS 出 repeating-linear-gradient，GRID 出 size', () => {
    const d = tokenDecls(gridToken, '--uic-grid-1');
    expect(d['--uic-grid-1-columns']).toContain('repeating-linear-gradient(to right');
    expect(d['--uic-grid-1-rows']).toContain('repeating-linear-gradient(to bottom');
    expect(d['--uic-grid-1-size']).toBe('8px');
  });

  it('缺色值时用默认半透明红', () => {
    const t: StyleToken = { id: 't', name: 'n', kind: 'GRID', style: {}, grids: [{ pattern: 'COLUMNS', gutter: 10 }] };
    expect(tokenDecls(t, '--v')['--v-columns']).toContain('rgba(255, 0, 0, 0.1)');
  });

  it('空 grids → 不产声明', () => {
    const t: StyleToken = { id: 't', name: 'n', kind: 'GRID', style: {} };
    expect(tokenDecls(t, '--v')).toEqual({});
  });

  it('回退读 style.layoutGrids（兼容另一种承载）', () => {
    const t: StyleToken = { id: 't', name: 'n', kind: 'GRID', style: { layoutGrids: [{ pattern: 'COLUMNS', gutter: 20 }] } };
    expect(tokenDecls(t, '--v')['--v-columns']).toContain('20px');
  });
});

describe('FR-28 tokens.css 四类全量导出', () => {
  it('四类混合导出进 :root，变量前缀各自正确', () => {
    const tokens: StyleToken[] = [
      { id: 'a', name: 'Primary', kind: 'PAINT', style: { background: '#FF0000' } },
      { id: 'b', name: 'Heading', kind: 'TEXT', style: { fontSize: 24 } },
      { id: 'c', name: 'Shadow', kind: 'EFFECT', style: { effects: [{ kind: 'LAYER_BLUR', radius: 4 }] } },
      { id: 'd', name: 'Grid', kind: 'GRID', style: {}, grids: [{ pattern: 'COLUMNS', gutter: 16 }] },
    ];
    const css = tokensToCss(tokens);
    expect(css).toContain('--uic-paint-1');
    expect(css).toContain('--uic-text-2-font-size: 24px');
    expect(css).toContain('--uic-effect-3-filter: blur(4px)');
    expect(css).toContain('--uic-grid-4-columns');
  });

  it('确定性：两次导出字节一致', () => {
    const tokens: StyleToken[] = [
      { id: 'c', name: 'Shadow', kind: 'EFFECT', style: { effects: [{ kind: 'LAYER_BLUR', radius: 4 }] } },
      { id: 'd', name: 'Grid', kind: 'GRID', style: {}, grids: [{ pattern: 'ROWS', gutter: 8 }] },
    ];
    expect(tokensToCss(tokens)).toBe(tokensToCss(tokens));
  });
});
