import { useEffect, useRef } from 'react';

export interface MenuItem {
  /** divider 为 true 时其余字段忽略 */
  divider?: boolean;
  label?: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
}

interface ContextMenuProps {
  /** 视口坐标 */
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

const MENU_WIDTH = 216;
const ITEM_HEIGHT = 28;

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    // capture=true 保证右键菜单打开期间的第一下点击就能关闭
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  const height = items.reduce((h, it) => h + (it.divider ? 9 : ITEM_HEIGHT), 8);
  const left = Math.min(x, window.innerWidth - MENU_WIDTH - 8);
  const top = Math.min(y, window.innerHeight - height - 8);

  return (
    <div className="context-menu" ref={ref} style={{ left, top, width: MENU_WIDTH }} role="menu">
      {items.map((item, i) =>
        item.divider ? (
          <div key={`d-${i}`} className="menu-divider" />
        ) : (
          <button
            key={`${item.label}-${i}`}
            type="button"
            role="menuitem"
            className={`menu-item${item.danger ? ' is-danger' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.onClick?.();
              onClose();
            }}
          >
            <span className="menu-label">{item.label}</span>
            {item.shortcut ? <span className="menu-shortcut">{item.shortcut}</span> : null}
          </button>
        ),
      )}
    </div>
  );
}
