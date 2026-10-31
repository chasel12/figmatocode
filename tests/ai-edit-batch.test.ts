/**
 * AI 编辑管线 · 批量与结构动作（P3-1 / P3-2）
 *
 * 三件事在这里被锁住：
 *  1. `updateStyle`/`updateLayout` 支持 `targetIds`（批量），干跑与落库**逐字段一致**；
 *  2. 批量落库是**一条** MULTI 动作（一次撤销），不是 N 条单节点动作；
 *  3. `duplicate` / `group` 两条新指令，同样「干跑 == 落库」，且 group 之后子树结构正确。
 *
 * 为什么值得单独一个文件：这三条都是「模型能写、但以前只能写单目标」的能力缺口。
 * 缺口补上后最容易出的错不是崩溃，而是**干跑给用户看的预览和真正 dispatch 的结果不一样**
 * （历史上 updateLayout 的 kind 参数就分叉过一次）。所以每个用例都成对断言。
 */
import { describe, expect, it } from 'vitest';
import { createPage, findById, resetIdSeq } from '../src/schema/factory';
import type { ContainerNode, UIPage } from '../src/schema/types';
import { editorReducer, initialState } from '../src/editor/store';
import { getPack } from '../src/tokens/packs';
import { draftToPage } from '../src/editor/ai/specToPage';
import { applyEditOps, opsToStoreActions } from '../src/editor/ai/aiActions';
import { checkEditTargets } from '../src/editor/ai/contract';
import type { AiEditPlan, AiPageDraft } from '../src/editor/ai/types';

resetIdSeq(700);

const pack = getPack('shadcn');

/** 一个「标题 + 三张同构卡片」的页：批量改的天然场景 */
function cardListPage(): UIPage {
  const page = createPage('批量编辑页');
  const draft: AiPageDraft = {
    kind: 'page',
    name: '批量编辑页',
    width: 375,
    height: 812,
    background: '@color.background',
    root: {
      kind: 'FRAME',
      name: '页面内容',
      layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', padding: [16, 16, 16, 16], gap: 12 },
      children: [
        { kind: 'TEXT', name: '标题', text: '今日训练', style: { fontSize: 20, fontWeight: 700, color: '@color.foreground' } },
        ...[1, 2, 3].map((n) => ({
          kind: 'FRAME' as const,
          name: `卡片 ${n}`,
          layout: { mode: 'VERTICAL' as const, widthMode: 'FILL' as const, heightMode: 'HUG' as const, padding: [12, 12, 12, 12] as [number, number, number, number], gap: 8 },
          style: { background: '@color.card', borderRadius: 8 },
          children: [{ kind: 'TEXT' as const, name: '说明', text: `第 ${n} 组`, style: { fontSize: 14, color: '@color.muted-foreground' } }],
        })),
      ],
    },
  };
  page.root.children = draftToPage(draft, { pack }).page.root.children;
  return page;
}

const cardIds = (page: UIPage): string[] => page.root.children.slice(1).map((c) => c.id);

/** 把计划落到 store，返回最终页面（走的是真实 reducer，不是干跑的克隆） */
function commit(page: UIPage, plan: AiEditPlan): UIPage {
  let state = initialState(page, '批量测试');
  for (const a of opsToStoreActions(plan, { pack }).actions) state = editorReducer(state, a);
  return state.page;
}

describe('批量 updateStyle / updateLayout', () => {
  it('targetIds 一次改三张卡片：干跑与落库逐字段一致', () => {
    const page = cardListPage();
    const ids = cardIds(page);
    const plan: AiEditPlan = {
      kind: 'edit',
      summary: '三张卡片统一换底色与圆角',
      actions: [{ op: 'updateStyle', targetIds: ids, style: { background: '@color.accent', borderRadius: 16 } }],
    };

    const dry = applyEditOps(page, plan, { pack });
    expect(dry.violations).toEqual([]);
    expect(dry.report).toHaveLength(1);
    expect(dry.report[0].text).toContain('卡片 1');

    const real = commit(page, plan);
    for (const id of ids) {
      const d = findById(dry.page.root, id)?.node;
      const r = findById(real.root, id)?.node;
      expect(r?.style?.background).toBe(d?.style?.background);
      expect(r?.style?.background).toBe(pack.colors.accent);
      expect(r?.style?.borderRadius).toBe(16);
      expect(d?.style?.borderRadius).toBe(16);
    }
  });

  it('批量落库是一条 MULTI 动作 → 一次撤销全部回退', () => {
    const page = cardListPage();
    const ids = cardIds(page);
    const original = JSON.stringify(page);
    const plan: AiEditPlan = {
      kind: 'edit',
      summary: 'x',
      actions: [{ op: 'updateLayout', targetIds: ids, layout: { gap: 24 } }],
    };

    const { actions, undoSteps } = opsToStoreActions(plan, { pack });
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('UPDATE_LAYOUT_MULTI');
    expect(undoSteps).toBe(1);

    let state = initialState(page, '批量测试');
    for (const a of actions) state = editorReducer(state, a);
    for (const id of ids) expect(findById(state.page.root, id)?.node.layout.gap).toBe(24);

    state = editorReducer(state, { type: 'UNDO' });
    expect(JSON.stringify(state.page)).toBe(original);
  });

  it('className 与 targetIds 同时给：布局与外观都落到每个目标', () => {
    const page = cardListPage();
    const ids = cardIds(page);
    const plan: AiEditPlan = {
      kind: 'edit',
      summary: 'x',
      actions: [{ op: 'updateLayout', targetIds: ids, className: 'flex items-center gap-3 px-4 bg-primary' }],
    };

    const dry = applyEditOps(page, plan, { pack });
    expect(dry.violations).toEqual([]);
    const real = commit(page, plan);

    for (const id of ids) {
      const r = findById(real.root, id)?.node;
      expect(r?.layout.mode).toBe('HORIZONTAL');
      expect(r?.layout.gap).toBe(12);
      expect(r?.layout.padding).toEqual([0, 16, 0, 16]);
      // className 里的外观部分不能被吞掉（干跑与落库都要有）
      expect(r?.style?.background).toBe(pack.colors.primary);
      const d = findById(dry.page.root, id)?.node;
      expect(d?.style?.background).toBe(pack.colors.primary);
    }
  });

  it('targetId 与 targetIds 混给：合并去重，不会改两次', () => {
    const page = cardListPage();
    const ids = cardIds(page);
    const plan: AiEditPlan = {
      kind: 'edit',
      summary: 'x',
      actions: [{ op: 'updateStyle', targetId: ids[0], targetIds: [ids[0], ids[1]], style: { borderRadius: 20 } }],
    };

    const dry = applyEditOps(page, plan, { pack });
    expect(dry.violations).toEqual([]);
    // 去重后是 2 个目标，文案里各出现一次
    expect(dry.report[0].text).toContain('卡片 1');
    expect(dry.report[0].text).toContain('卡片 2');
    expect(dry.report[0].text.match(/卡片 1/g)).toHaveLength(1);
  });

  it('批量里有一个 id 不存在 → 其余照改，违例精确指向那个 id', () => {
    const page = cardListPage();
    const ids = cardIds(page);
    const plan: AiEditPlan = {
      kind: 'edit',
      summary: 'x',
      actions: [{ op: 'updateStyle', targetIds: [...ids, 'ghost'], style: { borderRadius: 4 } }],
    };

    const dry = applyEditOps(page, plan, { pack });
    expect(dry.violations).toHaveLength(1);
    expect(dry.violations[0].message).toContain('ghost');
    for (const id of ids) expect(findById(dry.page.root, id)?.node.style?.borderRadius).toBe(4);
  });

  it('两个目标字段都不给 → 语义违例（不是静默什么都不做）', () => {
    const page = cardListPage();
    const plan: AiEditPlan = {
      kind: 'edit',
      summary: 'x',
      actions: [{ op: 'updateStyle', style: { borderRadius: 4 } }],
    };

    const dry = applyEditOps(page, plan, { pack });
    expect(dry.violations.some((v) => /targetId 或 targetIds/.test(v.message))).toBe(true);
  });
});

describe('duplicate', () => {
  it('复制一份：紧跟原节点，新 id，内容一致', () => {
    const page = cardListPage();
    const target = page.root.children[1];
    const plan: AiEditPlan = {
      kind: 'edit',
      summary: 'x',
      actions: [{ op: 'duplicate', targetId: target.id }],
    };

    const dry = applyEditOps(page, plan, { pack });
    expect(dry.violations).toEqual([]);
    expect(dry.page.root.children).toHaveLength(5);
    expect(dry.page.root.children[1].id).toBe(target.id);
    expect(dry.page.root.children[2].id).not.toBe(target.id);
    expect(dry.page.root.children[2].name).toBe(target.name);

    const real = commit(page, plan);
    expect(real.root.children).toHaveLength(5);
    expect(real.root.children[2].id).not.toBe(target.id);
    // 整树 id 重分配：子节点也不能撞
    const a = (real.root.children[1] as ContainerNode).children[0].id;
    const b = (real.root.children[2] as ContainerNode).children[0].id;
    expect(a).not.toBe(b);
  });

  it('count=3 复制三份，按顺序排列', () => {
    const page = cardListPage();
    const plan: AiEditPlan = {
      kind: 'edit',
      summary: 'x',
      actions: [{ op: 'duplicate', targetId: page.root.children[1].id, count: 3 }],
    };
    const dry = applyEditOps(page, plan, { pack });
    expect(dry.page.root.children).toHaveLength(7);
    const ids = dry.page.root.children.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('count 超上限被夹到 20（防止一条指令把画布撑爆）', () => {
    const page = cardListPage();
    const plan: AiEditPlan = {
      kind: 'edit',
      summary: 'x',
      actions: [{ op: 'duplicate', targetId: page.root.children[1].id, count: 999 }],
    };
    const dry = applyEditOps(page, plan, { pack });
    expect(dry.page.root.children).toHaveLength(4 + 20);
    expect(dry.report[0].text).toContain('×20');
  });

  it('根节点不能复制（没有父容器）→ 违例', () => {
    const page = cardListPage();
    const plan: AiEditPlan = {
      kind: 'edit',
      summary: 'x',
      actions: [{ op: 'duplicate', targetId: page.root.id }],
    };
    const dry = applyEditOps(page, plan, { pack });
    expect(dry.violations.some((v) => /没有父容器/.test(v.message))).toBe(true);
  });
});

describe('group', () => {
  it('三张卡片成组：同父级、顺序保持、组本身是容器', () => {
    const page = cardListPage();
    const ids = cardIds(page);
    const plan: AiEditPlan = {
      kind: 'edit',
      summary: 'x',
      actions: [{ op: 'group', targetIds: ids, name: '卡片组' }],
    };

    const dry = applyEditOps(page, plan, { pack });
    expect(dry.violations).toEqual([]);
    // 标题 + 一个组
    expect(dry.page.root.children).toHaveLength(2);
    const group = dry.page.root.children[1] as ContainerNode;
    expect(group.name).toBe('卡片组');
    expect(group.children.map((c) => c.id)).toEqual(ids);
    // 跟随父容器排版模式 + HUG（AI 给不出包围盒）
    expect(group.layout.mode).toBe('VERTICAL');
    expect(group.layout.widthMode).toBe('HUG');
    expect(group.layout.heightMode).toBe('HUG');

    const real = commit(page, plan);
    expect(real.root.children).toHaveLength(2);
    expect((real.root.children[1] as ContainerNode).children.map((c) => c.id)).toEqual(ids);
  });

  it('落库走 GROUP 动作，与人工成组同一管道', () => {
    const page = cardListPage();
    const ids = cardIds(page);
    const plan: AiEditPlan = { kind: 'edit', summary: 'x', actions: [{ op: 'group', targetIds: ids }] };
    const { actions } = opsToStoreActions(plan, { pack });
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('GROUP');
  });

  it('只有一个节点 → 违例（成组需要至少 2 个）', () => {
    const page = cardListPage();
    const plan: AiEditPlan = { kind: 'edit', summary: 'x', actions: [{ op: 'group', targetIds: [cardIds(page)[0]] }] };
    const dry = applyEditOps(page, plan, { pack });
    expect(dry.violations.some((v) => /至少 2 个/.test(v.message))).toBe(true);
  });

  it('跨父级的 id 只收同父级那几个（不会把别处的节点拽过来）', () => {
    const page = cardListPage();
    const outer = cardIds(page)[0];
    const inner = (findById(page.root, outer)?.node as ContainerNode).children[0].id;
    const plan: AiEditPlan = {
      kind: 'edit',
      summary: 'x',
      actions: [{ op: 'group', targetIds: [outer, inner, cardIds(page)[1]] }],
    };
    const dry = applyEditOps(page, plan, { pack });
    expect(dry.violations).toEqual([]);
    const group = dry.page.root.children[1] as ContainerNode;
    // 只收到同一父级下的 outer 与第二张卡，inner 留在原处
    expect(group.children.map((c) => c.id).sort()).toEqual([outer, cardIds(page)[1]].sort());
    expect(findById(dry.page.root, inner)).not.toBeNull();
  });

  it('页面根节点被排除在成员之外（不能把自己塞进组里）', () => {
    const page = cardListPage();
    const plan: AiEditPlan = {
      kind: 'edit',
      summary: 'x',
      actions: [{ op: 'group', targetIds: [page.root.id, ...cardIds(page)] }],
    };
    const dry = applyEditOps(page, plan, { pack });
    expect(dry.violations).toEqual([]);
    expect(dry.page.root.children).toHaveLength(2);
  });
});

describe('契约层：编辑目标引用检查', () => {
  const idsOf = (page: UIPage): Set<string> => {
    const set = new Set<string>();
    const walk = (n: { id: string; children?: unknown[] }): void => {
      set.add(n.id);
      for (const c of (n.children ?? []) as { id: string; children?: unknown[] }[]) walk(c);
    };
    walk(page.root);
    return set;
  };

  it('group 只有 targetIds 也能被正确校验（以前会读 targetId 而崩）', () => {
    const page = cardListPage();
    const existing = idsOf(page);
    const plan: AiEditPlan = { kind: 'edit', summary: 'x', actions: [{ op: 'group', targetIds: cardIds(page) }] };
    expect(checkEditTargets(plan, existing)).toEqual([]);
  });

  it('批量里任一 id 不存在 → 报 ref 违例', () => {
    const page = cardListPage();
    const existing = idsOf(page);
    const plan: AiEditPlan = {
      kind: 'edit',
      summary: 'x',
      actions: [{ op: 'updateStyle', targetIds: [...cardIds(page), 'ghost'], style: { borderRadius: 4 } }],
    };
    const v = checkEditTargets(plan, existing);
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('ref');
    expect(v[0].message).toContain('ghost');
  });

  it('一个目标都不给 → schema 违例（空指令不算合法）', () => {
    const page = cardListPage();
    const existing = idsOf(page);
    const plan: AiEditPlan = { kind: 'edit', summary: 'x', actions: [{ op: 'duplicate', targetId: '' }] };
    const v = checkEditTargets(plan, existing);
    expect(v.some((x) => x.kind === 'ref' || x.kind === 'schema')).toBe(true);
  });
});
