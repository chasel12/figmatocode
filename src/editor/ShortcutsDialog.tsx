import { SHORTCUT_TABLE } from './shortcuts';

/** FR-9/FR-33 快捷键面板（Ctrl+Shift+?）：布局表驱动分组渲染 */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const groups = [...new Set(SHORTCUT_TABLE.map((e) => e.group))];
  return (
    <div
      className="shortcuts-backdrop"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="shortcuts-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="快捷键">
        <div className="shortcuts-head">
          <span>快捷键</span>
          <button type="button" className="mini-btn" onClick={onClose} title="关闭（Esc）">
            ×
          </button>
        </div>
        <div className="shortcuts-body">
          {groups.map((g) => (
            <div className="shortcuts-group" key={g}>
              <div className="shortcuts-group-title">{g}</div>
              {SHORTCUT_TABLE.filter((e) => e.group === g).map((e) => (
                <div className="shortcuts-row" key={`${e.group}-${e.keys}`}>
                  <span className="shortcuts-desc">{e.desc}</span>
                  <kbd className="shortcuts-keys">{e.keys}</kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
