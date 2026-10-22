/**
 * M7 · 编辑上下文注入（W4）
 *
 * 模型要改"选中那个卡片"，就必须知道：页面结构（含 id）、选中了谁、它们在哪、当前样式是什么。
 * 本文件只做**只读投影**——从 store 状态与几何表里抽一份紧凑 JSON，不产生任何副作用。
 *
 * 安全（plan §8.4）：用户素材只作为**数据段**注入，且 id 白名单由 `existingIds` 单独收集，
 * 模型在数据段里写的任何"指令性文字"都不会被当作指令执行（执行侧只认 op 白名单）。
 */
import type { EditorState } from '../store';
import type { GeometryMap } from '../../compiler';
import type { UINode } from '../../schema/types';
import { findById } from '../../schema/factory';
import type { SelectionContext } from './promptPack';
import { outlineOf } from './promptPack';

/** 页面内所有节点 id（编辑指令引用校验用） */
export function collectExistingIds(state: EditorState): Set<string> {
  const ids = new Set<string>();
  const walk = (n: UINode): void => {
    ids.add(n.id);
    if ('children' in n) n.children.forEach(walk);
  };
  walk(state.page.root);
  return ids;
}

function compactStyle(node: UINode): Record<string, unknown> | undefined {
  const s = node.style;
  if (!s) return undefined;
  const out: Record<string, unknown> = {};
  if (s.background) out.background = s.background;
  if (s.color) out.color = s.color;
  if (s.fontSize) out.fontSize = s.fontSize;
  if (s.fontWeight) out.fontWeight = s.fontWeight;
  if (s.borderRadius != null) out.borderRadius = s.borderRadius;
  return Object.keys(out).length ? out : undefined;
}

/** 选中节点上下文（默认最多 6 个，避免上下文膨胀） */
export function buildSelectionContext(
  state: EditorState,
  geometry: GeometryMap,
  opts: { maxTargets?: number } = {},
): SelectionContext {
  const maxTargets = opts.maxTargets ?? 6;
  const ids = state.selectedIds.filter((id) => id !== state.page.root.id).slice(0, maxTargets);
  const targets: SelectionContext['targets'] = [];

  for (const id of ids) {
    const found = findById(state.page.root, id);
    if (!found) continue;
    const g = geometry[id] ?? { x: 0, y: 0, width: 0, height: 0 };
    const node = found.node;
    targets.push({
      id,
      kind: node.type,
      name: node.name ?? node.type,
      text: 'text' in node ? node.text : undefined,
      parentId: found.parent?.id,
      box: { x: Math.round(g.x), y: Math.round(g.y), width: Math.round(g.width), height: Math.round(g.height) },
      style: compactStyle(node),
    });
  }

  return {
    pageId: state.page.id,
    pageName: state.page.name,
    targets,
    outline: outlineOf(state.page.root as unknown as { id: string; type: string; name?: string; children?: unknown[] }),
  };
}
