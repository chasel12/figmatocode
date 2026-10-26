/**
 * 未保存守卫（FR-60）
 *
 * 三条职责，全部落在浏览器能力边界内：
 *
 * 1. **脏标记**：以「整份工程 JSON 与上次保存点逐字节比对」为准。
 *    不用 undo 栈长度 —— 撤销回到保存点应当算干净，栈长度算不出来这个。
 *    比对只在 state 变更的 effect 里做；151 KB 工程 `JSON.stringify` ≈ 1 ms，量级可接受。
 *
 * 2. **关闭拦截**：`beforeunload` 只在脏时触发。
 *    **浏览器原生弹窗只有「离开 / 取消」两个按钮，第三个「保存」在浏览器里不存在**
 *    （Electron 的 `before-quit` 才有三选项能力）。所以：
 *    - 应用内的破坏性操作（新建 / 打开 / 关闭项目）→ 自绘三按钮弹窗（`UnsavedDialog`）；
 *    - 标签页关闭 / 刷新 → 原生两按钮 + 同步落盘兜底（见 3）。
 *    这个差异是能力边界，不是实现偷懒，写在这里免得以后误以为是 bug。
 *
 * 3. **最后机会落盘**：`beforeunload` / `pagehide` / `visibilitychange(hidden)` 时
 *    **同步**写 localStorage。localStorage 是同步 API，调用返回即已落盘；
 *    异步的 IndexedDB 在强制关闭时可能来不及 —— 这是「进程被杀前」唯一能保证完成的写。
 */

import type { EditorState } from './store';
import { projectFromEditorState, serializeProject } from './project';

export const AUTOSAVE_KEY = 'ui-compiler.autosave.v2';
/** 破坏性操作前的回滚点（新建/打开/不保存 之前 stash，供「撤销误操作」用） */
export const AUTOSAVE_PREV_KEY = 'ui-compiler.autosave.v2.prev';

export type UnsavedChoice = 'save' | 'discard' | 'cancel';

/** 落盘包体：与 Editor 的 autosave 同一形状，保证「手动保存」与「自动保存」写的是同一份东西 */
export function autosaveEnvelope(state: EditorState): string {
  return JSON.stringify({
    ...serializeProject(projectFromEditorState(state)),
    currentPageId: state.currentPageId,
  });
}

/**
 * 同步落盘。配额不足时先丢掉回滚点再重试一次（回滚点 151 KB 白占配额）。
 * 返回是否成功 —— 失败不静默，调用方负责提示。
 */
export function flushSnapshot(json: string): boolean {
  try {
    localStorage.setItem(AUTOSAVE_KEY, json);
    return true;
  } catch {
    try {
      localStorage.removeItem(AUTOSAVE_PREV_KEY);
      localStorage.setItem(AUTOSAVE_KEY, json);
      return true;
    } catch {
      return false;
    }
  }
}

/** 破坏性操作前的回滚点；失败（配额/隐私模式）静默，不阻塞主流程 */
export function stashRollback(json: string): void {
  try {
    localStorage.setItem(AUTOSAVE_PREV_KEY, json);
  } catch {
    /* 回滚点是尽力而为，失败不影响操作本身 */
  }
}

export function readRollback(): string | null {
  try {
    return localStorage.getItem(AUTOSAVE_PREV_KEY);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 脏标记                                                              */
/* ------------------------------------------------------------------ */

let savedJson: string | null = null;
let dirty = false;
const dirtySubs = new Set<(d: boolean) => void>();

function setDirty(next: boolean): void {
  if (dirty === next) return;
  dirty = next;
  dirtySubs.forEach((fn) => fn(next));
}

export function subscribeDirty(fn: (d: boolean) => void): () => void {
  dirtySubs.add(fn);
  return () => {
    dirtySubs.delete(fn);
  };
}

export function isDirty(): boolean {
  revalidate();
  return dirty;
}

/** 记保存点：此后所有 state 都以此为「干净」基准 */
export function markSaved(json: string): void {
  savedJson = json;
  setDirty(false);
}

/** 与保存点比对。首帧尚无基准时视为干净（空项目没有可丢的东西） */
export function recomputeDirty(currentJson: string): void {
  if (savedJson === null) {
    savedJson = currentJson;
    setDirty(false);
    return;
  }
  setDirty(currentJson !== savedJson);
}

/* ------------------------------------------------------------------ */
/* 最后机会落盘                                                        */
/* ------------------------------------------------------------------ */

let snapshotSource: (() => string) | null = null;
let revalidator: (() => void) | null = null;

/** Editor 注册「当前工程 → JSON」取数器；生命周期事件里用它同步落盘 */
export function registerSnapshotSource(fn: (() => string) | null): void {
  snapshotSource = fn;
}

/** Editor 注册「从最新 state 重算脏标记」；`isDirty()` 调用前会先跑它，避免 effect 滞后一帧 */
export function registerRevalidator(fn: (() => void) | null): void {
  revalidator = fn;
}

function revalidate(): void {
  revalidator?.();
}

/** 立即同步落盘；无取数器或写失败返回 false */
export function flushNow(): boolean {
  if (!snapshotSource) return false;
  try {
    return flushSnapshot(snapshotSource());
  } catch {
    return false;
  }
}

/**
 * 装生命周期钩子（Editor 挂载一次，返回卸载函数）。
 *
 * - `beforeunload`：脏 → 先同步落盘，再弹原生确认。即使用户选「离开」，数据也已落盘，
 *   下次启动能恢复 —— 这把原生两按钮的「离开」从「丢数据」变成「安全离开」。
 * - `pagehide` / `visibilitychange(hidden)`：不弹窗，只落盘。这是移动端与系统级 kill
 *   唯一稳定触发的事件，也是「强制关闭」场景里真正起作用的那一道。
 */
export function installLifecycleGuard(): () => void {
  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (!isDirty()) return;
    flushNow();
    e.preventDefault();
    // Chrome 要求设置 returnValue（空串即可）才弹原生确认框
    e.returnValue = '';
  };
  const onPageHide = () => {
    if (dirty) flushNow();
  };
  const onVisibility = () => {
    if (document.visibilityState === 'hidden' && dirty) flushNow();
  };

  window.addEventListener('beforeunload', onBeforeUnload);
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    window.removeEventListener('beforeunload', onBeforeUnload);
    window.removeEventListener('pagehide', onPageHide);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/* ------------------------------------------------------------------ */
/* 待确认意图（三按钮弹窗）                                             */
/* ------------------------------------------------------------------ */

export interface PendingIntent {
  /** 弹窗标题里显示的动作用语，如「新建项目」「打开文件」 */
  label: string;
  run: () => void;
}

let pending: PendingIntent | null = null;
const pendingSubs = new Set<(p: PendingIntent | null) => void>();

function emitPending(): void {
  pendingSubs.forEach((fn) => fn(pending));
}

export function subscribePending(fn: (p: PendingIntent | null) => void): () => void {
  pendingSubs.add(fn);
  return () => {
    pendingSubs.delete(fn);
  };
}

/** 干净 → 直接执行；脏 → 挂起等用户选（保存/不保存/取消） */
export function guard(label: string, run: () => void): void {
  if (!isDirty()) {
    run();
    return;
  }
  pending = { label, run };
  emitPending();
}

export function resolvePending(choice: UnsavedChoice): PendingIntent | null {
  const p = pending;
  pending = null;
  emitPending();
  if (!p) return null;
  if (choice === 'cancel') return null;
  // 「不保存」才需要回滚点；「保存」是已经落过盘了，不需要
  if (choice === 'discard') stashRollback(snapshotSource?.() ?? '');
  p.run();
  return p;
}

/* ------------------------------------------------------------------ */
/* 「下一次变更即视为干净」—— 打开/导入文件后调用                        */
/* ------------------------------------------------------------------ */

let cleanOnNextChange = false;

export function requestCleanOnNextChange(): void {
  cleanOnNextChange = true;
}

/** Editor 在 effect 里消费：命中则把当前 JSON 记为保存点，而不是判脏 */
export function consumeCleanRequest(): boolean {
  if (!cleanOnNextChange) return false;
  cleanOnNextChange = false;
  return true;
}

/** 仅供测试重置模块级状态 */
export function __resetGuardForTest(): void {
  savedJson = null;
  dirty = false;
  dirtySubs.clear();
  pending = null;
  pendingSubs.clear();
  snapshotSource = null;
  revalidator = null;
  cleanOnNextChange = false;
}
