import { describe, expect, it } from 'vitest';
import { createNode, createPage, nextId, resetIdSeq } from '../src/schema/factory';
import { editorReducer, initialState, type EditorState } from '../src/editor/store';
import { parseProject, parseProjectOnly, projectFromEditorState, serializeProject, stateFromProject, upgradeProjectV1 } from '../src/editor/project';
import {
  decodeInteractions,
  encodeInteractions,
  generatePrototypeProject,
  hasAnyInteraction,
  projectHasPrototype,
  projectInteraction,
} from '../src/generator/prototype';
import { buildRuntimeJs, RUNTIME_FILE } from '../src/generator/runtime';
import type { ContainerNode, PrototypeInteraction, UIPage, UIProject } from '../src/schema/types';

resetIdSeq(0);

function page(name = 'Page 1', withRect = true): UIPage {
  const p = createPage(name);
  // 多页工程要求页 id 唯一——createPage 的默认 id 恒为 'page'，这里显式区分
  const uid = nextId('page');
  p.id = uid;
  p.root.id = uid;
  if (withRect) p.root.children.push(createNode('RECTANGLE'));
  return p;
}

function project(pages: UIPage[] = [page()]): UIProject {
  return { version: 2, name: '测试工程', pages, components: {}, tokens: [], flows: [] };
}

function stateWith(): EditorState {
  return initialState(page(), 'P 轨项目');
}

describe('FR-39 多 Page 管理', () => {
  it('ADD_PAGE：尾插 + 切为当前页 + 干净历史', () => {
    let s = stateWith();
    s = editorReducer(s, { type: 'ADD_PAGE', name: '第二页' });
    expect(s.pages).toHaveLength(2);
    expect(s.currentPageId).toBe(s.pages[1].id);
    expect(s.page.name).toBe('第二页');
    expect(s.past).toEqual([]);
  });

  it('SELECT_PAGE：切页换 page 视图且不进历史', () => {
    let s = stateWith();
    const firstId = s.currentPageId;
    s = editorReducer(s, { type: 'ADD_PAGE' });
    const before = s.past.length;
    s = editorReducer(s, { type: 'SELECT_PAGE', id: firstId });
    expect(s.currentPageId).toBe(firstId);
    expect(s.past.length).toBe(before);
  });

  it('SELECT_PAGE：切到不存在的页返回原 state', () => {
    const s = stateWith();
    expect(editorReducer(s, { type: 'SELECT_PAGE', id: 'nope' })).toBe(s);
  });

  it('DELETE_PAGE：至少保留 1 页', () => {
    const s = stateWith();
    expect(editorReducer(s, { type: 'DELETE_PAGE', id: s.currentPageId })).toBe(s);
  });

  it('DELETE_PAGE：删当前页后落到相邻页', () => {
    let s = stateWith();
    s = editorReducer(s, { type: 'ADD_PAGE', name: 'B' });
    const bId = s.currentPageId;
    s = editorReducer(s, { type: 'DELETE_PAGE', id: bId });
    expect(s.pages).toHaveLength(1);
    expect(s.currentPageId).toBe(s.pages[0].id);
    expect(s.page.id).toBe(s.pages[0].id);
  });

  it('DELETE_PAGE：删非当前页不动当前视图', () => {
    let s = stateWith();
    const aId = s.currentPageId;
    s = editorReducer(s, { type: 'ADD_PAGE', name: 'B' });
    const bId = s.currentPageId;
    s = editorReducer(s, { type: 'DELETE_PAGE', id: aId });
    expect(s.currentPageId).toBe(bId);
    expect(s.pages).toHaveLength(1);
  });

  it('DUPLICATE_PAGE：副本全树重排 id（不与源撞号）', () => {
    let s = stateWith();
    s = editorReducer(s, { type: 'DUPLICATE_PAGE' });
    expect(s.pages).toHaveLength(2);
    const [src, copy] = s.pages;
    expect(copy.name).toContain('副本');
    const collect = (n: import('../src/schema/types').UINode, acc: string[]): string[] => {
      acc.push(n.id);
      if ('children' in n) n.children.forEach((c) => collect(c, acc));
      return acc;
    };
    const srcIds = collect(src.root, []);
    const copyIds = collect(copy.root, []);
    expect(copyIds.some((id) => srcIds.includes(id))).toBe(false);
    expect(copy.id).not.toBe(src.id);
  });

  it('RENAME_PAGE_BY_ID：改当前页名同步 page/projectName', () => {
    let s = stateWith();
    const id = s.currentPageId;
    s = editorReducer(s, { type: 'RENAME_PAGE_BY_ID', id, name: '改名后' });
    expect(s.page.name).toBe('改名后');
    expect(s.pages[0].name).toBe('改名后');
    expect(s.projectName).toBe('改名后');
  });

  it('REORDER_PAGE：移到目标索引；越界被夹紧', () => {
    let s = stateWith();
    s = editorReducer(s, { type: 'ADD_PAGE', name: 'B' });
    s = editorReducer(s, { type: 'ADD_PAGE', name: 'C' });
    const firstId = s.pages[0].id;
    s = editorReducer(s, { type: 'REORDER_PAGE', id: firstId, toIndex: 2 });
    expect(s.pages.map((p) => p.name)).toEqual(['B', 'C', 'Page 1']);
    // 越界夹紧
    const s2 = editorReducer(s, { type: 'REORDER_PAGE', id: firstId, toIndex: 99 });
    expect(s2.pages.map((p) => p.name)).toEqual(['B', 'C', 'Page 1']);
  });

  it('出口回写：编辑当前页后 pages[currentPageId] 同步新引用', () => {
    let s = stateWith();
    const rectId = s.page.root.children[0].id;
    s = editorReducer(s, { type: 'UPDATE_LAYOUT', id: rectId, patch: { width: 321 } });
    expect(s.pages[0].root.children[0].layout.width).toBe(321);
  });

  it('出口回写：切页后编辑只改新当前页，不回写旧页', () => {
    let s = stateWith();
    const aId = s.currentPageId;
    const aWidthBefore = s.pages[0].root.children[0].layout.width;
    s = editorReducer(s, { type: 'ADD_PAGE' });
    // 新页为空 → 先放一个节点再改（避免空页越界）
    s = editorReducer(s, { type: 'ADD_NODE', kind: 'RECTANGLE' });
    const bRect = s.page.root.children[0];
    expect(bRect).toBeTruthy();
    s = editorReducer(s, { type: 'UPDATE_LAYOUT', id: bRect.id, patch: { width: 999 } });
    const aPage = s.pages.find((p) => p.id === aId)!;
    expect(aPage.root.children[0].layout.width).toBe(aWidthBefore);
    const bPage = s.pages.find((p) => p.id === s.currentPageId)!;
    expect(bPage.root.children[0].layout.width).toBe(999);
  });
});

describe('FR-46/§1.3-1.4 工程序列化（v1 → v2）', () => {
  it('upgradeProjectV1：v2 形状自洽（空 components/tokens/flows）', () => {
    const p = page('旧页');
    const proj = upgradeProjectV1(p, '旧工程');
    expect(proj.version).toBe(2);
    expect(proj.name).toBe('旧工程');
    expect(proj.pages).toHaveLength(1);
    expect(proj.components).toEqual({});
    expect(proj.tokens).toEqual([]);
    expect(proj.flows).toEqual([]);
  });

  it('upgradeProjectV1：工程名回退页名再回退缺省', () => {
    expect(upgradeProjectV1(page('页名')).name).toBe('页名');
    const nameless = { ...page(), name: '' };
    expect(upgradeProjectV1(nameless).name).toBe('未命名项目');
  });

  it('serializeProject：固定 version 2 包体', () => {
    const s = serializeProject(project());
    expect(s.version).toBe(2);
    expect(s.project.pages).toHaveLength(1);
  });

  it('parseProject：v1 单页 → v2 升级（upgradedFromV1=true）', () => {
    const p = page('旧页');
    const raw = JSON.stringify({ version: 1, page: p, projectName: '旧工程' });
    const { project: proj, upgradedFromV1 } = parseProject(raw);
    expect(upgradedFromV1).toBe(true);
    expect(proj.version).toBe(2);
    expect(proj.name).toBe('旧工程');
    expect(proj.pages[0].id).toBe(p.id);
  });

  it('parseProject：v2 包体直接解析（upgradedFromV1=false）', () => {
    const raw = JSON.stringify(serializeProject(project([page('A'), page('B')])));
    const { project: proj, upgradedFromV1 } = parseProject(raw);
    expect(upgradedFromV1).toBe(false);
    expect(proj.pages).toHaveLength(2);
  });

  it('parseProject：缺 flows/tokens 的旧 v2 按定稿形状补齐', () => {
    const bare = { version: 2, project: { version: 2, name: 'X', pages: [page()] } };
    const proj = parseProjectOnly(JSON.stringify(bare));
    expect(proj.flows).toEqual([]);
    expect(proj.tokens).toEqual([]);
    expect(proj.components).toEqual({});
  });

  it('parseProject：裸单页（无 version 无 page 包裹）兼容', () => {
    const p = page();
    const { upgradedFromV1 } = parseProject(JSON.stringify(p));
    expect(upgradedFromV1).toBe(true);
  });

  it('parseProject：无法识别抛错', () => {
    expect(() => parseProject(JSON.stringify({ nothing: true }))).toThrow();
  });

  it('v1→v2→序列化→再解析：往返稳定', () => {
    const p = page('往返页');
    const first = parseProject(JSON.stringify({ version: 1, page: p, projectName: '往返' })).project;
    const round = parseProjectOnly(JSON.stringify(serializeProject(first)));
    expect(round.name).toBe(first.name);
    expect(round.pages[0].id).toBe(first.pages[0].id);
    expect(round.pages[0].root.children.length).toBe(first.pages[0].root.children.length);
  });
});

describe('FR-50 §4.1 data-interaction 协议', () => {
  const inter: PrototypeInteraction = {
    id: 'pi-1',
    trigger: 'ON_CLICK',
    action: 'NAVIGATE',
    targetId: 'frame-9',
    transition: { kind: 'DISSOLVE', duration: 300, easing: 'EASE_IN_OUT' },
  };

  it('白名单投影：id 不进投影，声明字段保留', () => {
    const p = projectInteraction(inter);
    expect(p.id).toBeUndefined();
    expect(p.trigger).toBe('ON_CLICK');
    expect(p.action).toBe('NAVIGATE');
    expect(p.targetId).toBe('frame-9');
    expect((p.transition as Record<string, unknown>).kind).toBe('DISSOLVE');
  });

  it('白名单投影：未知字段被丢弃', () => {
    const dirty = { ...inter, hackerField: 'x', another: 1 } as unknown as PrototypeInteraction;
    const p = projectInteraction(dirty);
    expect(p.hackerField).toBeUndefined();
    expect(p.another).toBeUndefined();
  });

  it('投影：缺省字段不写入（产出确定性）', () => {
    const p = projectInteraction({ id: 'a', trigger: 'ON_CLICK', action: 'BACK' });
    expect(Object.keys(p).sort()).toEqual(['action', 'trigger']);
  });

  it('编码：单引号与 & 被转义（HTML 属性用单引号包裹的前提）', () => {
    const tricky: PrototypeInteraction = {
      id: 't',
      trigger: 'ON_CLICK',
      action: 'OPEN_LINK',
      url: "https://x.com/?a=1&b='2'",
    };
    const enc = encodeInteractions([tricky]);
    expect(enc).not.toContain("'");
    expect(enc).not.toContain('&');
    expect(enc).toContain('\\u0027');
    expect(enc).toContain('\\u0026');
  });

  it('编码→解码往返：URL 原值还原', () => {
    const tricky: PrototypeInteraction = {
      id: 't',
      trigger: 'ON_CLICK',
      action: 'OPEN_LINK',
      url: "https://x.com/?a=1&b='2'",
    };
    const json = JSON.stringify([projectInteraction(tricky)]).replace(/'/g, '\\u0027').replace(/&/g, '\\u0026');
    const back = decodeInteractions(json) as { url: string }[];
    expect(back[0].url).toBe("https://x.com/?a=1&b='2'");
  });

  it('中文与引号混合往返安全', () => {
    const t: PrototypeInteraction = { id: 'z', trigger: 'KEYDOWN', action: 'BACK', key: "Esc'键&中文" };
    const enc = encodeInteractions([t]);
    const back = decodeInteractions(enc) as { key: string }[];
    expect(back[0].key).toBe("Esc'键&中文");
  });
});

describe('FR-50 原型工程出码（§4.3 单 HTML 多容器）', () => {
  it('无交互工程：不产 runtime.js（无 JS 模式）', () => {
    const files = generatePrototypeProject(project([page('A'), page('B')]));
    expect(files.map((f) => f.path)).toEqual(['index.html', 'index.css']);
    expect(files.some((f) => f.path === RUNTIME_FILE)).toBe(false);
  });

  it('有交互工程：产 runtime.js 且 HTML 引用', () => {
    const p = page();
    p.root.children[0].interactions = [{ id: 'i', trigger: 'ON_CLICK', action: 'BACK' }];
    const files = generatePrototypeProject(project([p]));
    expect(files.some((f) => f.path === RUNTIME_FILE)).toBe(true);
    const html = files.find((f) => f.path === 'index.html')!.content;
    expect(html).toContain(`<script src="${RUNTIME_FILE}"></script>`);
  });

  it('多页：每页一个 section，非首页 hidden', () => {
    const files = generatePrototypeProject(project([page('A'), page('B'), page('C')]));
    const html = files.find((f) => f.path === 'index.html')!.content;
    const sections = html.match(/<section[^>]*data-uic-page="[^"]*"[^>]*>/g) ?? [];
    expect(sections).toHaveLength(3);
    // 首页无 hidden、其余页含 hidden（只数 section 开标签内的属性）
    const hiddenCount = sections.filter((t) => /\shidden(\s|>)/.test(t)).length;
    expect(hiddenCount).toBe(2);
    expect(/\shidden(\s|>)/.test(sections[0]!)).toBe(false);
  });

  it('每节点带 data-node 锚点', () => {
    const p = page();
    const files = generatePrototypeProject(project([p]));
    const html = files.find((f) => f.path === 'index.html')!.content;
    expect(html).toContain(`data-node="${p.root.children[0].id}"`);
  });

  it('交互节点出 data-interaction 单引号属性', () => {
    const p = page();
    p.root.children[0].interactions = [{ id: 'i', trigger: 'ON_CLICK', action: 'NAVIGATE', targetId: 'x' }];
    const files = generatePrototypeProject(project([p]));
    const html = files.find((f) => f.path === 'index.html')!.content;
    expect(html).toContain("data-interaction='");
    expect(html).toContain('ON_CLICK');
  });

  it('确定性：两次出码字节一致', () => {
    const p = page();
    p.root.children[0].interactions = [{ id: 'i', trigger: 'ON_CLICK', action: 'BACK' }];
    const proj = project([p]);
    const a = generatePrototypeProject(proj);
    const b = generatePrototypeProject(proj);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('空工程抛错（不产半吊子产物）', () => {
    expect(() => generatePrototypeProject(project([]))).toThrow();
  });

  it('hasAnyInteraction / projectHasPrototype：嵌套子树可检出', () => {
    const p = page();
    const frame = createNode('FRAME') as ContainerNode;
    frame.children = [createNode('RECTANGLE')];
    frame.children[0].interactions = [{ id: 'i', trigger: 'ON_CLICK', action: 'BACK' }];
    p.root.children.push(frame);
    expect(hasAnyInteraction(p.root)).toBe(true);
    expect(projectHasPrototype(project([p]))).toBe(true);
    expect(projectHasPrototype(project([page()]))).toBe(false);
  });
});

describe('FR-46 runtime.js 边界（无布局计算）', () => {
  const js = buildRuntimeJs();

  it('不含任何布局读写（布局全由编译期 CSS 承担）', () => {
    // 断言「不作为代码出现」——注释里提到这些名字是允许的（运行时有显式边界声明注释）
    for (const bad of ['offsetWidth', 'offsetHeight', 'getBoundingClientRect', 'clientWidth', 'clientHeight', 'scrollWidth']) {
      const usage = new RegExp(`\\.${bad}\\b`);
      expect(js).not.toMatch(usage);
    }
  });

  it('不含样式尺寸赋值', () => {
    expect(js).not.toMatch(/style\.(width|height)\s*=/);
  });

  it('已实现的触发器与动作在产物中可见', () => {
    for (const t of ['ON_CLICK', 'ON_HOVER', 'MOUSE_ENTER', 'MOUSE_LEAVE', 'ON_PRESS', 'AFTER_TIMEOUT', 'KEYDOWN', 'ON_LOAD']) {
      expect(js).toContain(t);
    }
    for (const a of ['NAVIGATE', 'BACK', 'SCROLL', 'OPEN_LINK', 'OPEN_OVERLAY', 'CLOSE_OVERLAY']) {
      expect(js).toContain(a);
    }
  });

  it('确定性：两次构建字节一致', () => {
    expect(buildRuntimeJs()).toBe(buildRuntimeJs());
  });
});

describe('FR-39/59 §1.3/§1.4 工程水合接线（autosave v2 / LOAD_PROJECT）', () => {
  function twoPageProject(): UIProject {
    const p1 = page('甲页');
    const p2 = page('乙页');
    p1.id = 'pg-a';
    p2.id = 'pg-b';
    return { version: 2, name: '双页工程', pages: [p1, p2], components: {}, tokens: [], flows: [] };
  }

  it('stateFromProject：多页装载 + 当前页选择 + 页缺省回落首页', () => {
    const proj = twoPageProject();
    const s2 = stateFromProject(proj, 'pg-b');
    expect(s2.pages).toHaveLength(2);
    expect(s2.currentPageId).toBe('pg-b');
    expect(s2.page.id).toBe('pg-b');
    const s1 = stateFromProject(proj, 'ghost');
    expect(s1.currentPageId).toBe('pg-a');
    expect(s1.page.id).toBe('pg-a');
  });

  it('stateFromProject：空 pages 兜底新建页（不产空工程）', () => {
    const empty: UIProject = { version: 2, name: '空', pages: [], components: {}, tokens: [], flows: [] };
    const s = stateFromProject(empty);
    expect(s.pages).toHaveLength(1);
    expect(s.page).toBe(s.pages[0]);
  });

  it('projectFromEditorState ↔ stateFromProject 往返：pages/名/组件/样式保真', () => {
    const proj = twoPageProject();
    proj.tokens = [{ id: 't1', kind: 'PAINT', name: '主色', value: '#1677FF' } as never];
    proj.components = { c1: { id: 'c1', name: '按钮', root: createNode('FRAME') as ContainerNode } as never };
    const s = stateFromProject(proj, 'pg-b');
    const back = projectFromEditorState(s);
    expect(back.pages.map((p) => p.id)).toEqual(['pg-a', 'pg-b']);
    expect(back.name).toBe('双页工程');
    expect(Object.keys(back.components)).toEqual(['c1']);
    expect(back.tokens).toHaveLength(1);
    const s2 = stateFromProject(back);
    expect(s2.tokens).toHaveLength(1);
    expect(s2.styleSeq).toBeGreaterThan(0);
  });

  it('reducer LOAD_PROJECT：page=首页、历史清空、组件样式表装载（PAGE_ACTIONS 白名单成员）', () => {
    const s0 = initialState(page('旧页'), '旧');
    const proj = twoPageProject();
    const s = editorReducer(s0, { type: 'LOAD_PROJECT', project: proj });
    expect(s.page.id).toBe('pg-a');
    expect(s.currentPageId).toBe('pg-a');
    expect(s.pages).toHaveLength(2);
    expect(s.past).toHaveLength(0);
    expect(s.future).toHaveLength(0);
    expect(s.selectedIds).toEqual([s.page.root.id]);
    expect(s.projectName).toBe('双页工程');
  });

  it('v1 autosave 包体经 parseProject 升级水合（读侧兼容，§1.3 不删 v1 键口径）', () => {
    const legacy = JSON.stringify({ page: page('v1页'), projectName: '老项目' });
    const { project, upgradedFromV1 } = parseProject(legacy);
    expect(upgradedFromV1).toBe(true);
    const s = stateFromProject(project);
    expect(s.projectName).toBe('老项目');
    expect(s.pages).toHaveLength(1);
    // v2 写侧信封（含 currentPageId）可被读侧 parseProject 直取
    const env = JSON.stringify({ ...serializeProject(projectFromEditorState(s)), currentPageId: s.currentPageId });
    expect(parseProject(env).upgradedFromV1).toBe(false);
  });
});
