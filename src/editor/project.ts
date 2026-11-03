import type { ComponentDef, StyleToken, UIProject, UIPage } from '../schema/types';
import { createPage } from '../schema/factory';
import { initialState, type EditorState } from './store';
import { sanitizeSkills, type AiSkill } from './ai/skills';

/** 本模块承载 v1（单页 JSON）→ v2（UIProject）的**唯一**升级路径。
 *  消费方三处共用：autosave 读侧、File→打开、旧 fixture 单测（wave1-prototype-plan §1.3）。
 *  schema-decisions §二：本文件为 P 轨独占，其他轨道只读消费。 */
export interface SerializedProject {
  version: 2;
  project: UIProject;
  /**
   * AI 设计参考（skill）。**刻意不放进 `UIProject`**：
   * `UIProject` 是 `.fig` 往返比对的唯一口径（`scripts/fig-normalize.ts`），
   * 往里加键就等于给往返门禁加一个 Figma 表达不了的字段。
   * 放在包体顶层既能让工程文件带着参考一起分享，又完全不碰 AST 契约。
   * 空列表时**不写这个键**——保证「没用到该功能」的工程文件与旧版逐字节一致。
   */
  aiSkills?: AiSkill[];
}

/**
 * v1 单页 → v2 工程。
 *
 * 口径（wave1-prototype-plan §1.3）：
 * - `components` 空表、`tokens` 空数组、`flows` 空数组（M5 时点 C 线未合入，写空表保证 v2 形状自洽）；
 * - `projectName` 缺省时回退页面名，再回退「未命名项目」——不产出空串工程名；
 * - **不深拷贝 page**：保持既有 store 的引用语义（LOAD_PAGE 直接吃同一对象），
 *   需要隔离时由调用方自行 clonePage。
 */
export function upgradeProjectV1(page: UIPage, projectName?: string): UIProject {
  return {
    version: 2,
    name: projectName || page?.name || '未命名项目',
    pages: page ? [page] : [],
    components: {},
    tokens: [],
    flows: [],
  };
}

/** File→保存：固定写 v2 形状（文件里不再出现 version:1；单页 JSON 只保留在打开路径） */
export function serializeProject(project: UIProject, aiSkills?: AiSkill[]): SerializedProject {
  const skills = sanitizeSkills(aiSkills);
  return skills.length ? { version: 2, project, aiSkills: skills } : { version: 2, project };
}

function isPageLike(value: unknown): value is UIPage {
  const p = value as UIPage | null;
  return !!p && typeof p === 'object' && typeof p.id === 'string' && !!p.root && !!p.viewport;
}

function isProjectLike(value: unknown): value is UIProject {
  const p = value as UIProject | null;
  return !!p && typeof p === 'object' && Array.isArray(p.pages);
}

/** 缺字段的 v2 工程按定稿形状补齐（旧文件可能尚未写 flows/tokens 段） */
function normalizeProject(project: UIProject): UIProject {
  return {
    version: 2,
    name: project.name || project.pages[0]?.name || '未命名项目',
    pages: project.pages,
    components: project.components ?? {},
    tokens: project.tokens ?? [],
    flows: project.flows ?? [],
  };
}

/** v2 包体形状：`{version:2, project}` 或裸 UIProject（外系统产物缺包体时兼容） */
function parseV2(data: unknown): UIProject | null {
  const d = data as (Partial<SerializedProject> & Partial<UIProject>) | null;
  if (!d || typeof d !== 'object') return null;
  if (isProjectLike(d.project)) return normalizeProject(d.project);
  if (isProjectLike(d)) return normalizeProject(d as UIProject);
  return null;
}

/** v1 包体形状：`{version:1, page}`；无 version 裸单页（Toolbar 旧路径写法）也兼容 */
function parseV1(data: unknown): UIPage | null {
  const d = data as { version?: number; page?: unknown } | null;
  if (!d || typeof d !== 'object') return null;
  if (isPageLike(d.page)) return d.page;
  if (isPageLike(d)) return d;
  return null;
}

/**
 * 差异 #20 健壮性护栏（2026-10-19 四渠道审计发现）：外部/手改 v2 文件叶子节点缺 `children` 数组时，
 * 画布 NodeView 按容器迭代 children 会抛错白屏。应用自产 JSON 恒带该字段，故历轮未暴露。
 * 统一在解析出口补齐为 `[]`。
 *
 * **2026-11-03 修正：只给真正的容器补，叶子上的 `children` 一律删掉。**
 *
 * 旧版给**每个**节点都补 `children: []`（连 TEXT 也补），注释当时写的是「是否容器按 type 判定，
 * 与本补丁前一致」—— 但那个前提立刻被推翻了：`src/fig/export.ts` 用 `'children' in node`
 * 判容器，于是浏览器路径下（必然经过本函数）每个 TEXT 都被当成容器，`textFieldsOf`
 * 整块跳过，导出的 `.fig` 里 174 个 TEXT 一个字符都没写，也没有 fontSize / fontName /
 * lineHeight / letterSpacing。打开后 6 个 frame 都在、节点数 386/386 一个不少，但整页
 * 只剩细线和色块 —— 用户原话「残次的组件，没有一个完整的页面frame」。
 *
 * 教训：**`'children' in node` 不是容器判据，`isContainer()` 才是**。这里的补丁既然会
 * 篡改「有没有 children 键」这个事实，就必须让它与 `isContainer()` 的判定一致，
 * 否则全仓 17 处 `'children' in n` 的读法全被悄悄污染。
 */
function ensureChildren(project: UIProject): UIProject {
  const CONTAINERS = new Set(['PAGE', 'FRAME', 'RECTANGLE', 'SECTION']);
  const fix = (node: unknown): void => {
    const n = node as { type?: string; children?: unknown };
    if (!n || typeof n !== 'object') return;
    if (CONTAINERS.has(n.type ?? '')) {
      if (!Array.isArray(n.children)) n.children = [];
      (n.children as unknown[]).forEach(fix);
      return;
    }
    // 叶子：children 是旧版护栏留下的脏数据（TEXT 上挂 `children: []` 会被导出侧误判成容器）
    if (Array.isArray(n.children)) {
      (n.children as unknown[]).forEach(fix);
      delete n.children;
    }
  };
  project.pages.forEach((p) => fix(p.root));
  return ensureUniquePageIds(project);
}

/**
 * 页面 id 去重兜底（2026-11-02）。
 *
 * `.fig` 导入器早先直接用 `createPage()` 的固定 id `'page'`，六页全同 →
 * 编辑器 `SELECT_PAGE` 判 `p.id === state.currentPageId` 时六页全中，点任意页都走
 * 「已经是当前页」的早退分支，**永远切不了页**（用户看到的：「打开 fig 只有一页」）。
 * 导入侧已修，但**修复前存下来的 `project.json` 里就是重复 id**，读侧必须再兜一层，
 * 否则用户打开旧工程仍然是一页。
 *
 * 只改页面 id，**不动根节点 id**：`createPage` 的既有语义是 `page.id === root.id`
 * （几何 map / 选中态按根 id 索引），拆开会让 `geo[page.id]` 取不到。两者相等时同步改。
 */
function ensureUniquePageIds(project: UIProject): UIProject {
  const used = new Set<string>();
  let seq = 0;
  for (const p of project.pages) {
    if (p.id && !used.has(p.id)) {
      used.add(p.id);
      continue;
    }
    const prev = p.id;
    let next = '';
    do {
      seq += 1;
      next = `page-fix-${seq}`;
    } while (used.has(next));
    p.id = next;
    if (p.root.id === prev) p.root.id = next;
    used.add(next);
  }
  return project;
}

/**
 * File→打开 / autosave 读侧统一入口：**同时解析** v1（`data.page`）与 v2（`data.project`），
 * 两者都统一走 upgradeProjectV1 归一，返回 `{project, upgradedFromV1, aiSkills}` 供调用方决定回写策略。
 * 无法识别 → 抛错（沿既有 File→打开 的 alert 先例）。
 *
 * `aiSkills` 由调用方负责写回本机（`restoreSkillsFromEnvelope`）——解析函数保持无副作用。
 */
export function parseProject(raw: unknown): { project: UIProject; upgradedFromV1: boolean; aiSkills: AiSkill[] } {
  const data = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw;
  const aiSkills = sanitizeSkills((data as { aiSkills?: unknown } | null)?.aiSkills);
  const v2 = parseV2(data);
  if (v2) return { project: ensureChildren(v2), upgradedFromV1: false, aiSkills };
  const v1 = parseV1(data);
  if (v1) {
    const projectName = typeof (data as { projectName?: unknown })?.projectName === 'string'
      ? (data as { projectName: string }).projectName
      : undefined;
    return { project: ensureChildren(upgradeProjectV1(v1, projectName)), upgradedFromV1: true, aiSkills };
  }
  throw new Error('无效的工程文件：既非 v2 工程（project）也非 v1 单页（page）');
}

/** 便捷包装：只要工程本体（不关心是否由 v1 升级而来） */
export function parseProjectOnly(raw: unknown): UIProject {
  return parseProject(raw).project;
}

/** 当前工程里存在交互的页数（出码 / 走查用；纯声明，不参与编译） */
export function pagesWithInteractions(project: UIProject): UIPage[] {
  return project.pages.filter((p) => hasInteractions(p.root));
}

/** EditorState → UIProject（autosave 写侧与 File→保存共用单源；flows 数组不持久——Flow 以节点 flowStart 为准，随 pages 往返） */
export function projectFromEditorState(s: {
  projectName: string;
  pages: UIPage[];
  components: Record<string, ComponentDef>;
  tokens: StyleToken[];
}): UIProject {
  return { version: 2, name: s.projectName, pages: s.pages, components: s.components, tokens: s.tokens, flows: [] };
}

/** UIProject → EditorState 水合（§1.3：pages 为权威、currentPageId 缺省回首页；styleSeq 抬高到表长+1 防撞；历史清空） */
export function stateFromProject(project: UIProject, currentPageId?: string): EditorState {
  const pages = project.pages.length ? project.pages : [createPage('未命名页面')];
  const first = pages.find((p) => p.id === currentPageId) ?? pages[0];
  const base = initialState(first, project.name);
  return {
    ...base,
    pages,
    currentPageId: first.id,
    components: project.components ?? {},
    tokens: project.tokens ?? [],
    styleSeq: (project.tokens?.length ?? 0) + 1,
    history: {},
  };
}

function hasInteractions(node: { interactions?: unknown[]; children?: unknown[] }): boolean {
  if ((node.interactions?.length ?? 0) > 0) return true;
  const kids = node.children as { interactions?: unknown[]; children?: unknown[] }[] | undefined;
  return (kids ?? []).some(hasInteractions);
}
