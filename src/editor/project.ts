import type { UIProject, UIPage } from '../schema/types';

/** 本模块承载 v1（单页 JSON）→ v2（UIProject）的**唯一**升级路径。
 *  消费方三处共用：autosave 读侧、File→打开、旧 fixture 单测（wave1-prototype-plan §1.3）。
 *  schema-decisions §二：本文件为 P 轨独占，其他轨道只读消费。 */
export interface SerializedProject {
  version: 2;
  project: UIProject;
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
export function serializeProject(project: UIProject): SerializedProject {
  return { version: 2, project };
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
 * File→打开 / autosave 读侧统一入口：**同时解析** v1（`data.page`）与 v2（`data.project`），
 * 两者都统一走 upgradeProjectV1 归一，返回 `{project, upgradedFromV1}` 供调用方决定回写策略。
 * 无法识别 → 抛错（沿既有 File→打开 的 alert 先例）。
 */
export function parseProject(raw: unknown): { project: UIProject; upgradedFromV1: boolean } {
  const data = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw;
  const v2 = parseV2(data);
  if (v2) return { project: v2, upgradedFromV1: false };
  const v1 = parseV1(data);
  if (v1) {
    const projectName = typeof (data as { projectName?: unknown })?.projectName === 'string'
      ? (data as { projectName: string }).projectName
      : undefined;
    return { project: upgradeProjectV1(v1, projectName), upgradedFromV1: true };
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

function hasInteractions(node: { interactions?: unknown[]; children?: unknown[] }): boolean {
  if ((node.interactions?.length ?? 0) > 0) return true;
  const kids = node.children as { interactions?: unknown[]; children?: unknown[] }[] | undefined;
  return (kids ?? []).some(hasInteractions);
}
