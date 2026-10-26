import { downloadBlob, downloadText } from '../utils/zip';
import { projectFromEditorState, serializeProject } from './project';
import type { EditorState } from './store';

/**
 * 工程保存（FR-39/59）
 *
 * 从 Toolbar 抽出来：Toolbar 的菜单与 Editor 的「未保存弹窗 → 保存」要走**同一条**实现，
 * 否则两处口径迟早分叉（一处改文件名、另一处忘了改）。
 */

/** 保存为 `.uicproj.json`（工程文件；多页/组件/样式一体） */
export function saveProjectJson(state: EditorState): void {
  downloadText(
    JSON.stringify(serializeProject(projectFromEditorState(state)), null, 2),
    `${state.projectName || 'project'}.uicproj.json`,
    'application/json',
  );
}

/** 另存为 `.fig`（Figma 侧打开即多 Canvas）；返回导出统计 */
export async function saveProjectFig(
  state: EditorState,
): Promise<{ pages: number; nodes: number; images: number }> {
  const { exportFigBlob } = await import('../fig/project');
  const project = projectFromEditorState(state);
  const { blob, stats } = await exportFigBlob(project, state.projectName || 'project');
  downloadBlob(blob, `${state.projectName || 'project'}.fig`);
  return stats;
}
