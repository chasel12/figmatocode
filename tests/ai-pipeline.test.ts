import { describe, expect, it } from 'vitest';
import { createPage, findById, nextId } from '../src/schema/factory';
import type { UIPage } from '../src/schema/types';
import { editorReducer, initialState } from '../src/editor/store';
import { getPack } from '../src/tokens/packs';
import { runEditPlan, runPageGeneration } from '../src/editor/ai/generate';
import { buildPrompt, pickFewShots, type FewShotEntry } from '../src/editor/ai/promptPack';
import { resolveColorRef, draftToPage } from '../src/editor/ai/specToPage';
import { applyEditOps, opsToStoreActions, projectWithNewPage } from '../src/editor/ai/aiActions';
import { buildSelectionContext, collectExistingIds } from '../src/editor/ai/selectionContext';
import type { LlmClient, LlmRequest, LlmResult } from '../src/editor/ai/client';
import type { AiEditPlan, AiPageDraft } from '../src/editor/ai/types';

const pack = getPack('shadcn');

class FakeClient implements LlmClient {
  calls: LlmRequest[] = [];
  constructor(private responses: string[]) {}
  async run(req: LlmRequest): Promise<LlmResult> {
    this.calls.push(req);
    const text = this.responses.shift() ?? '';
    return {
      text,
      model: 'fake',
      usage: { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 800, cacheWriteTokens: 0 },
    };
  }
}

const validDraft = (): AiPageDraft => ({
  kind: 'page',
  name: '训练计划',
  width: 375,
  height: 812,
  background: '@color.background',
  root: {
    kind: 'FRAME',
    name: '页面内容',
    layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', padding: [16, 16, 16, 16], gap: 16 },
    children: [
      { kind: 'TEXT', name: '标题', text: '本周训练', style: { fontSize: 24, fontWeight: 700, color: '@color.foreground' } },
      {
        kind: 'FRAME',
        name: '卡片',
        layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', padding: [16, 16, 16, 16], gap: 8 },
        style: { background: '@color.card', borderRadius: 12, border: { width: 1, color: '@color.border' } },
        children: [{ kind: 'TEXT', text: '力量训练 · 45 分钟', style: { fontSize: 14, color: '@color.muted-foreground' } }],
      },
      { kind: 'BUTTON', name: '主按钮', text: '开始训练', style: { background: '@color.primary', color: '@color.primary-foreground', fontSize: 16, borderRadius: 8 } },
    ],
  },
});

describe('M7 W3 生成管线', () => {
  it('一次通过：schema 通过 → 归一化为 UIPage（令牌已解析为 hex）', async () => {
    const client = new FakeClient([JSON.stringify(validDraft())]);
    const res = await runPageGeneration({ userPrompt: '训练计划页', pack, viewport: { width: 375, height: 812 }, client });

    expect(res.attempts).toBe(1);
    expect(res.firstPass).toBe(true);
    expect(res.violations).toEqual([]);
    expect(res.data.name).toBe('训练计划');
    // 页面 id 唯一（不能是 createPage 的硬编码 'page'）
    expect(res.data.id).not.toBe('page');
    expect(res.data.root.children).toHaveLength(3);

    const title = res.data.root.children[0];
    expect(title.style?.color).toBe(pack.colors.foreground);
    const button = res.data.root.children[2];
    expect(button.style?.background).toBe(pack.colors.primary);
    // 成本按 token 量估算（>0）
    expect(res.costCny).toBeGreaterThan(0);
  });

  it('首轮违例 → 把违例喂回 → 第二轮通过（firstPass=false）', async () => {
    const bad = validDraft();
    bad.root.children![0].style = { color: '@color.nonexistent' };
    const client = new FakeClient([JSON.stringify(bad), JSON.stringify(validDraft())]);
    const res = await runPageGeneration({ userPrompt: '训练计划页', pack, viewport: { width: 375, height: 812 }, client });

    expect(res.attempts).toBe(2);
    expect(res.firstPass).toBe(false);
    expect(client.calls).toHaveLength(2);
    expect(client.calls[1].user).toContain('未通过契约校验');
    expect(client.calls[1].user).toContain('@color.nonexistent');
    // 稳定前缀在自修轮保持不变（prompt caching 前提）
    expect(client.calls[1].system).toBe(client.calls[0].system);
  });

  it('自修用尽仍不合格 → 抛出带违例的错误（不产出半成品页面）', async () => {
    const bad = validDraft();
    bad.root.children![0].style = { color: '@color.nope' };
    const client = new FakeClient([JSON.stringify(bad), JSON.stringify(bad), JSON.stringify(bad)]);
    await expect(
      runPageGeneration({ userPrompt: 'x', pack, viewport: { width: 375, height: 812 }, client }),
    ).rejects.toMatchObject({ message: expect.stringContaining('未通过契约校验') });
    expect(client.calls).toHaveLength(3); // 首轮 + 2 轮自修
  });

  it('响应不是 JSON → 也算违例并进入自修', async () => {
    const client = new FakeClient(['抱歉我做不到', JSON.stringify(validDraft())]);
    const res = await runPageGeneration({ userPrompt: 'x', pack, viewport: { width: 375, height: 812 }, client });
    expect(res.attempts).toBe(2);
    expect(client.calls[1].user).toContain('JSON');
  });

  it('图标名解析成 vector 路径（图标库注入）', () => {
    const draft = validDraft();
    draft.root.children!.push({ kind: 'VECTOR', name: '图标', icon: 'house' });
    const { page, violations } = draftToPage(draft, { pack, icons: { house: 'M3 10L12 3L21 10V21H3Z' } });
    expect(violations).toEqual([]);
    const icon = page.root.children[3];
    expect(icon.type).toBe('VECTOR');
    expect(icon.vector?.d).toContain('M3 10');
    expect(icon.style?.border?.width).toBe(2);
  });
});

describe('M7 W3 令牌解析', () => {
  it('@color.x / @x / hex / rgb() 四种写法', () => {
    expect(resolveColorRef('@color.primary', pack).value).toBe(pack.colors.primary);
    expect(resolveColorRef('@primary', pack).value).toBe(pack.colors.primary);
    expect(resolveColorRef('#123456', pack).value).toBe('#123456');
    expect(resolveColorRef('rgba(0,0,0,0.5)', pack).value).toBe('rgba(0,0,0,0.5)');
    expect(resolveColorRef('@color.ghost', pack)).toEqual({ unknown: 'ghost' });
  });
});

/* ---------------- W4 编辑管线 ---------------- */

function seededPage(): UIPage {
  const page = createPage('编辑测试页');
  const draft = validDraft();
  draft.name = '编辑测试页';
  const built = draftToPage(draft, { pack });
  // 用生成页的子树替换，保证 id 唯一且结构真实
  page.root.children = built.page.root.children;
  return page;
}

const editPlan = (page: UIPage): AiEditPlan => {
  const card = page.root.children[1];
  const textId = (card as { children: { id: string }[] }).children[0].id;
  return {
    kind: 'edit',
    summary: '改卡片背景与文案，并新增一行提示',
    actions: [
      { op: 'updateStyle', targetId: card.id, style: { background: '@color.accent', borderRadius: 16 } },
      { op: 'setText', targetId: textId, text: '力量训练 · 60 分钟' },
      { op: 'add', parentId: card.id, node: { kind: 'TEXT', text: '新增提示', style: { fontSize: 12, color: '@color.muted-foreground' } } },
    ],
  };
};

describe('M7 W4 编辑管线', () => {
  it('干跑：克隆页被改，原页不变（预览不污染文档）', () => {
    const page = seededPage();
    const before = JSON.stringify(page);
    const dry = applyEditOps(page, editPlan(page), { pack });
    expect(dry.violations).toEqual([]);
    expect(dry.report).toHaveLength(3);
    expect(JSON.stringify(page)).toBe(before);
    expect(dry.page.root.children[1].style?.background).toBe(pack.colors.accent);
    expect(dry.stats.nodesAfter).toBe(dry.stats.nodesBefore + 1);
  });

  it('指令 → store action 同管道：应用后页面变化，UNDO N 次完整回退', () => {
    const page = seededPage();
    const plan = editPlan(page);
    const original = JSON.stringify(page);

    let state = initialState(page, '测试');
    const { actions, undoSteps } = opsToStoreActions(plan, { pack });
    expect(undoSteps).toBe(3);
    for (const a of actions) state = editorReducer(state, a);

    const card = state.page.root.children[1];
    expect(card.style?.background).toBe(pack.colors.accent);
    expect(card.style?.borderRadius).toBe(16);
    expect((card as { children: unknown[] }).children).toHaveLength(2);

    for (let i = 0; i < undoSteps; i += 1) state = editorReducer(state, { type: 'UNDO' });
    expect(JSON.stringify(state.page)).toBe(original);
  });

  it('编辑计划引用不存在的节点 → 自修后仍失败则抛错', async () => {
    const page = seededPage();
    const badPlan: AiEditPlan = { kind: 'edit', summary: 'x', actions: [{ op: 'setText', targetId: 'ghost', text: 'y' }] };
    const client = new FakeClient([JSON.stringify(badPlan), JSON.stringify(badPlan), JSON.stringify(badPlan)]);
    const state = initialState(page, '测试');
    await expect(
      runEditPlan({
        userPrompt: '改文案',
        pack,
        viewport: page.viewport,
        client,
        page,
        selection: buildSelectionContext(state, {}),
        existingIds: collectExistingIds(state),
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining('未通过校验') });
  });

  it('选中上下文注入：outline 含 id、targets 含几何与样式', () => {
    const page = seededPage();
    let state = initialState(page, '测试');
    const cardId = page.root.children[1].id;
    state = editorReducer(state, { type: 'SELECT', id: cardId });
    const ctx = buildSelectionContext(state, { [cardId]: { x: 16, y: 100, width: 343, height: 120 } });
    expect(ctx.targets).toHaveLength(1);
    expect(ctx.targets[0].id).toBe(cardId);
    expect(ctx.targets[0].box.width).toBe(343);
    expect(ctx.outline).toContain(cardId);
    expect(ctx.pageId).toBe(page.id);
  });

  it('白名单外动作不进 store 映射（防注入执行）', () => {
    const plan = { kind: 'edit', summary: 'x', actions: [{ op: 'runScript', targetId: 'a' }] } as unknown as AiEditPlan;
    const { actions } = opsToStoreActions(plan, { pack });
    expect(actions).toHaveLength(0);
  });
});

describe('M7 W5 采纳新页面（工程级）', () => {
  it('尾插新页：既有页与组件/样式引用不变，页面数 +1', () => {
    const existing = createPage('既有页');
    const state = initialState(existing, '我的工程');
    const generated = draftToPage(validDraft(), { pack }).page;
    const project = projectWithNewPage(state, generated);
    expect(project.pages).toHaveLength(2);
    expect(project.pages[0]).toBe(existing);
    expect(project.pages[1].id).toBe(generated.id);
    expect(project.name).toBe('我的工程');
    expect(project.components).toBe(state.components);
    expect(project.tokens).toBe(state.tokens);
  });
});

describe('M7 W2 提示词包', () => {
  it('稳定前缀不含本次用户提示词（缓存命中的前提）', () => {
    const { system, user } = buildPrompt({
      mode: 'page',
      pack,
      userPrompt: '生成一个非常独特的冥想计时页',
      viewport: { width: 375, height: 812 },
    });
    expect(system).not.toContain('非常独特的冥想计时页');
    expect(user).toContain('非常独特的冥想计时页');
    expect(system).toContain('@color.primary');
    expect(system).toContain('8pt 网格');
    expect(system).toContain('只用风格包令牌');
  });

  it('few-shot 按关键词命中挑选（同分保持顺序稳定）', () => {
    const entries: FewShotEntry[] = [
      { id: 'a', tags: ['登录'], spec: '{"a":1}' },
      { id: 'b', tags: ['商品'], spec: '{"b":1}' },
      { id: 'c', tags: ['商品', '列表'], spec: '{"c":1}' },
    ];
    expect(pickFewShots(entries, '做一个商品列表页', 1)[0].id).toBe('c');
    expect(pickFewShots(entries, '随便', 2).map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('编辑模式注入结构骨架与选中信息', () => {
    const page = seededPage();
    const state = initialState(page, '测试');
    const ctx = buildSelectionContext(state, {});
    const { user } = buildPrompt({
      mode: 'edit',
      pack,
      userPrompt: '把标题改大',
      viewport: page.viewport,
      selection: ctx,
    });
    expect(user).toContain('结构骨架');
    expect(user).toContain(page.root.id);
    expect(user).toContain('kind=edit');
  });
});

describe('M7 生成页 id 纪律', () => {
  it('两次生成得到不同页面 id（多页共存不串）', () => {
    const a = draftToPage(validDraft(), { pack }).page;
    const b = draftToPage(validDraft(), { pack }).page;
    expect(a.id).not.toBe(b.id);
    expect(findById(a.root, a.id)?.node.type).toBe('PAGE');
    expect(nextId('x')).toMatch(/^x-\d+$/);
  });
});
