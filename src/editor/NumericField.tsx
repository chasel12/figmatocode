import { useEffect, useState } from 'react';

/**
 * NumericField：滑条 + 数值文本二合一（P1 数控评审）。
 * - 所有数值调配不再使用原生上下按钮（spinner）：滑条承担拖调，文本框保留精确输入；
 * - 文本框 `type="number"` 的原生箭头由 CSS appearance:none 隐藏（styles.css .num-box）；
 * - 滑条范围与文本输入相互独立：文本可越界输入（如 fontSize=250），滑条仅按范围内显示，松手不回写越界值；
 * - onInput 过程态（transient）、onCommit 提交历史，语义与旧 NumField 完全一致；onClear 保留删字段行为。
 */
export function NumField({
  value,
  onInput,
  onCommit,
  onClear,
  min,
  max,
  step,
  suffix,
  label,
  title,
  className,
  disabled,
}: {
  value: number | undefined;
  onInput: (v: number) => void;
  onCommit: () => void;
  /** FR-36：输入清空时回调（删字段，如 min/max 约束） */
  onClear?: () => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  /** 多格布局（pad/radius grid）中的单字标签：上/右/下/左、左上… */
  label?: string;
  title?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(value != null ? String(value) : '');
  useEffect(() => {
    setText(value != null ? String(value) : '');
  }, [value]);

  const lo = min ?? 0;
  const hi = max ?? 100;
  const clamp = (n: number): number => Math.min(hi, Math.max(lo, n));
  const display = text === '' ? '' : clamp(Number(text));

  return (
    <span className={`num-field ${className ?? ''}`} title={title}>
      {label && <span className="num-label">{label}</span>}
      <input
        className="num-range"
        type="range"
        min={lo}
        max={hi}
        step={step ?? 1}
        value={disabled ? lo : display === '' ? lo : display}
        disabled={disabled}
        title={`${lo}–${hi}`}
        onChange={(e) => {
          setText(e.target.value);
          onInput(Number(e.target.value));
        }}
        onBlur={onCommit}
        // 拖动滑条松手 / 键盘步进松键：立即提交（范围输入原生不触发 blur）
        onPointerUp={onCommit}
        onKeyUp={onCommit}
      />
      <input
        className="num-box"
        type="number"
        value={text}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value === '') {
            if (onClear) onClear();
            return;
          }
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onInput(n);
        }}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit();
        }}
      />
      {suffix && <span className="num-suffix">{suffix}</span>}
    </span>
  );
}
