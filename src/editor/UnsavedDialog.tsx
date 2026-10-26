import { useEffect, useRef } from 'react';
import type { UnsavedChoice } from './unsaved';

/**
 * 未保存三按钮弹窗（FR-60）
 *
 * 只用于**应用内**破坏性操作（新建 / 打开 / 关闭项目）。
 * 标签页关闭 / 刷新走浏览器原生两按钮弹窗 —— 原生弹窗文案与按钮数不可改，
 * 那边靠 `unsaved.ts` 的同步落盘兜底，不在这里假装能拦。
 */
export function UnsavedDialog({
  label,
  projectName,
  onChoose,
}: {
  /** 触发的动作名，如「新建项目」 */
  label: string;
  projectName: string;
  onChoose: (choice: UnsavedChoice) => void;
}) {
  const saveRef = useRef<HTMLButtonElement | null>(null);

  // 默认焦点落在「保存」：误按 Enter 也只会多存一份，不会丢数据
  useEffect(() => {
    saveRef.current?.focus();
  }, []);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        // 点遮罩 = 取消（保守选择：不改变现状）
        if (e.target === e.currentTarget) onChoose('cancel');
      }}
    >
      <div
        className="modal unsaved-modal"
        role="dialog"
        aria-modal="true"
        aria-label="未保存的改动"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onChoose('cancel');
          }
        }}
      >
        <div className="modal-head">
          <span className="modal-title">「{projectName || '未命名项目'}」有未保存的改动</span>
        </div>
        <div className="unsaved-body">
          <p>
            即将执行<b>{label}</b>。当前工程自上次保存以来的改动还没有写入文件。
          </p>
          <p className="unsaved-hint">
            本机自动保存副本仍在（关闭标签页不会丢），但它不进文件、不跨机器、清浏览器数据即失效。
          </p>
        </div>
        <div className="unsaved-actions">
          <button type="button" className="btn" onClick={() => onChoose('cancel')}>
            取消
          </button>
          <button type="button" className="btn" onClick={() => onChoose('discard')}>
            不保存
          </button>
          <button type="button" className="btn btn-primary" ref={saveRef} onClick={() => onChoose('save')}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
