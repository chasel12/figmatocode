import type { NodeKind } from '../schema/types';
import { useEditor } from './store';

const ITEMS: { kind: NodeKind; label: string; icon: string }[] = [
  { kind: 'FRAME', label: 'Frame', icon: '▣' },
  { kind: 'TEXT', label: 'Text', icon: 'T' },
  { kind: 'IMAGE', label: 'Image', icon: '🖼' },
  { kind: 'BUTTON', label: 'Button', icon: '◉' },
  { kind: 'RECTANGLE', label: 'Rectangle', icon: '▭' },
  { kind: 'OVAL', label: 'Oval', icon: '⬭' },
  { kind: 'LINE', label: 'Line', icon: '╱' },
];

export function Palette() {
  const { dispatch } = useEditor();
  return (
    <div className="palette">
      <div className="panel-title">组件</div>
      <div className="palette-grid">
        {ITEMS.map((item) => (
          <button
            key={item.kind}
            className="palette-item"
            title={`添加 ${item.label}`}
            onClick={() => dispatch({ type: 'ADD_NODE', kind: item.kind })}
          >
            <span className="palette-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="palette-tip">点击添加到当前选中容器（未选中则添加到页面）</div>
    </div>
  );
}
