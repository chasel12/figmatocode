import { useMemo } from 'react';
import { useEditor } from './store';
import { findById } from '../schema/factory';
import { NumField } from './NumericField';
import { nextInteractionId } from './tools/connections';
import type {
  PrototypeActionKind,
  PrototypeInteraction,
  PrototypeTransition,
  PrototypeTriggerKind,
  UINode,
  ContainerNode,
} from '../schema/types';

/**
 * FR-40~43 Prototype 面板。
 *
 * 口径（docs/wave1-prototype-plan.md §2）：
 * - P0 仅对 `type==='FRAME'` 的选中节点开放编辑；其他节点显示空态（FR-45 目标口径）。
 * - 触发器列 5 类（ON_CLICK/ON_HOVER/ON_PRESS/AFTER_TIMEOUT/KEYDOWN），其余置灰「后并」。
 * - 动作列 6 类（NAVIGATE/BACK/SCROLL/OPEN_LINK/OPEN_OVERLAY/CLOSE_OVERLAY）；CLOSE 与 CHANGE_TO 置灰。
 * - 过渡列 7 类，SMART_ANIMATE 置灰。
 * - broken link：目标 id 查不到 → 显示「已断开」并置灰，可清除（§2.4）。
 */

const TRIGGER_OPTIONS: { value: PrototypeTriggerKind; label: string; enabled: boolean }[] = [
  { value: 'ON_CLICK', label: '单击', enabled: true },
  { value: 'ON_HOVER', label: '悬停', enabled: true },
  { value: 'ON_PRESS', label: '按住', enabled: true },
  { value: 'AFTER_TIMEOUT', label: '延时后', enabled: true },
  { value: 'KEYDOWN', label: '按键', enabled: true },
  { value: 'MOUSE_ENTER', label: '鼠标进入（后并）', enabled: false },
  { value: 'MOUSE_LEAVE', label: '鼠标离开（后并）', enabled: false },
  { value: 'ON_DRAG', label: '拖动（后并）', enabled: false },
  { value: 'TOUCH', label: '触摸（后并）', enabled: false },
  { value: 'ON_LOAD', label: '加载时（后并）', enabled: false },
];

const ACTION_OPTIONS: { value: PrototypeActionKind; label: string; enabled: boolean }[] = [
  { value: 'NAVIGATE', label: '跳转到', enabled: true },
  { value: 'BACK', label: '返回', enabled: true },
  { value: 'SCROLL', label: '滚动到', enabled: true },
  { value: 'OPEN_LINK', label: '打开链接', enabled: true },
  { value: 'OPEN_OVERLAY', label: '打开浮层', enabled: true },
  { value: 'CLOSE_OVERLAY', label: '关闭浮层', enabled: true },
  { value: 'CLOSE', label: '关闭（后并）', enabled: false },
  { value: 'CHANGE_TO', label: '切换变体（随 FR-29）', enabled: false },
];

const TRANSITION_OPTIONS: { value: PrototypeTransition['kind']; label: string; enabled: boolean }[] = [
  { value: 'INSTANT', label: '立即', enabled: true },
  { value: 'DISSOLVE', label: '渐隐渐显', enabled: true },
  { value: 'MOVE_IN', label: '移入', enabled: true },
  { value: 'MOVE_OUT', label: '移出', enabled: true },
  { value: 'PUSH', label: '推入', enabled: true },
  { value: 'SLIDE_IN', label: '滑入', enabled: true },
  { value: 'SLIDE_OUT', label: '滑出', enabled: true },
  { value: 'SMART_ANIMATE', label: '智能动画（后并）', enabled: false },
];

const EASING_OPTIONS: { value: NonNullable<PrototypeTransition['easing']>; label: string }[] = [
  { value: 'LINEAR', label: '线性' },
  { value: 'EASE_IN', label: '缓入' },
  { value: 'EASE_OUT', label: '缓出' },
  { value: 'EASE_IN_OUT', label: '缓入缓出' },
  { value: 'EASE_IN_BACK', label: '回弹' },
  { value: 'CUSTOM', label: '自定义' },
];

const DIRECTION_OPTIONS: { value: NonNullable<PrototypeTransition['direction']>; label: string }[] = [
  { value: 'LEFT', label: '从左侧' },
  { value: 'RIGHT', label: '从右侧' },
  { value: 'TOP', label: '从上方' },
  { value: 'BOTTOM', label: '从下方' },
];

const OVERLAY_POSITIONS: NonNullable<PrototypeInteraction['overlayPosition']>[] = [
  'TOP_LEFT', 'TOP_CENTER', 'TOP_RIGHT',
  'CENTER', 'MANUAL', 'PRESET',
  'BOTTOM_LEFT', 'BOTTOM_CENTER', 'BOTTOM_RIGHT',
];

const OVERLAY_LABEL: Record<string, string> = {
  TOP_LEFT: '左上', TOP_CENTER: '中上', TOP_RIGHT: '右上',
  CENTER: '居中', MANUAL: '手动（首版按居中）',
  BOTTOM_LEFT: '左下', BOTTOM_CENTER: '中下', BOTTOM_RIGHT: '右下',
  PRESET: '预设（置灰）',
};

const NEEDS_TARGET: PrototypeActionKind[] = ['NAVIGATE', 'OPEN_OVERLAY'];

// FR-44：id 生成移入 tools/connections.ts 单源（画布拖线创建与面板共用同规格）

export function PrototypePanel() {
  const { state, dispatch } = useEditor();

  const primaryId = state.selectedIds[state.selectedIds.length - 1] ?? state.page.root.id;
  const found = useMemo(() => findById(state.page.root, primaryId), [state.page, primaryId]);
  const node: UINode | null = found?.node ?? null;

  // 同页 Frame 列表（NAVIGATE / OVERLAY 目标下拉）
  const frames = useMemo(() => {
    const out: { id: string; name: string }[] = [];
    const walk = (n: UINode): void => {
      if (n.type === 'FRAME') out.push({ id: n.id, name: n.name ?? n.id });
      if ('children' in n) (n as ContainerNode).children.forEach(walk);
    };
    walk(state.page.root);
    return out;
  }, [state.page]);

  const flowStart = node?.flowStart ?? false;

  const setInteractions = (list: PrototypeInteraction[]) => {
    if (!node) return;
    dispatch({ type: 'UPDATE_INTERACTIONS', id: node.id, interactions: list });
  };

  const patchAt = (idx: number, patch: Partial<PrototypeInteraction>) => {
    if (!node) return;
    const list = (node.interactions ?? []).map((it, i) => (i === idx ? { ...it, ...patch } : it));
    setInteractions(list);
  };

  const addInteraction = () => {
    if (!node) return;
    const list = node.interactions ?? [];
    setInteractions([
      ...list,
      { id: nextInteractionId(list), trigger: 'ON_CLICK', action: 'NAVIGATE', transition: { kind: 'INSTANT' } },
    ]);
  };

  const removeAt = (idx: number) => {
    if (!node) return;
    setInteractions((node.interactions ?? []).filter((_, i) => i !== idx));
  };

  const isConnected = (it: PrototypeInteraction): boolean => {
    if (!NEEDS_TARGET.includes(it.action)) return true;
    if (!it.targetId) return false;
    return !!findById(state.page.root, it.targetId);
  };

  if (node && node.type !== 'FRAME') {
    return (
      <div className="props-empty">
        选中 Frame 以配置交互
        <div className="props-note">FR-40 P0：交互挂载点为 Frame（其他节点类型后续扩展）</div>
      </div>
    );
  }
  if (!node) {
    return <div className="props-empty">未选中节点</div>;
  }

  const list = node.interactions ?? [];

  return (
    <div className="proto-panel">
      <div className="prop-section">
        <div className="prop-heading">原型</div>
        <div className="props-note">{node.name ?? node.id} 的交互（数组序 = 执行序）</div>
        <button className="mini-btn proto-add" onClick={addInteraction}>
          ＋ 添加交互
        </button>
      </div>

      {list.length === 0 && <div className="props-note proto-empty">尚无交互</div>}

      {list.map((it, idx) => {
        const connected = isConnected(it);
        const t = it.transition ?? { kind: 'INSTANT' };
        const showDirection = ['MOVE_IN', 'MOVE_OUT', 'PUSH', 'SLIDE_IN', 'SLIDE_OUT'].includes(t.kind);
        return (
          <div key={it.id} className={`proto-row ${connected ? '' : 'is-broken'}`}>
            <div className="proto-row-head">
              <span className="proto-index">{idx + 1}</span>
              {!connected && <span className="proto-broken-tag">已断开</span>}
              <button className="mini-btn proto-del" title="删除交互" onClick={() => removeAt(idx)}>
                ✕
              </button>
            </div>

            {/* 触发器 */}
            <div className="proto-field">
              <span className="proto-label">触发器</span>
              <select
                value={it.trigger}
                onChange={(e) => patchAt(idx, { trigger: e.target.value as PrototypeTriggerKind })}
              >
                {TRIGGER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} disabled={!o.enabled}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {it.trigger === 'AFTER_TIMEOUT' && (
              <div className="proto-field">
                <span className="proto-label">延时</span>
                <NumField
                  className="proto-num"
                  value={it.timeoutMs ?? 300}
                  min={0}
                  max={5000}
                  onInput={(v) => patchAt(idx, { timeoutMs: Math.max(0, v) })}
                  onCommit={() => {}}
                />
                <span className="proto-unit">ms</span>
              </div>
            )}
            {it.trigger === 'KEYDOWN' && (
              <div className="proto-field">
                <span className="proto-label">按键</span>
                <input
                  type="text"
                  value={it.key ?? ''}
                  placeholder="Escape"
                  onChange={(e) => patchAt(idx, { key: e.target.value })}
                />
              </div>
            )}

            {/* 动作 */}
            <div className="proto-field">
              <span className="proto-label">动作</span>
              <select value={it.action} onChange={(e) => patchAt(idx, { action: e.target.value as PrototypeActionKind })}>
                {ACTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} disabled={!o.enabled}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {NEEDS_TARGET.includes(it.action) && (
              <div className="proto-field">
                <span className="proto-label">目标</span>
                <select value={it.targetId ?? ''} onChange={(e) => patchAt(idx, { targetId: e.target.value || undefined })}>
                  <option value="">（未选择）</option>
                  {frames.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {it.action === 'OPEN_LINK' && (
              <div className="proto-field">
                <span className="proto-label">URL</span>
                <input
                  type="text"
                  value={it.url ?? ''}
                  placeholder="https://"
                  onChange={(e) => patchAt(idx, { url: e.target.value })}
                />
              </div>
            )}
            {it.action === 'SCROLL' && (
              <div className="proto-field">
                <span className="proto-label">滚动</span>
                <select
                  value={it.scrollBehavior ?? 'TOP'}
                  onChange={(e) => patchAt(idx, { scrollBehavior: e.target.value as 'TOP' | 'BOTTOM' | 'POINT' })}
                >
                  <option value="TOP">到顶部</option>
                  <option value="BOTTOM">到底部</option>
                  <option value="POINT">到目标点位</option>
                </select>
              </div>
            )}

            {/* 过渡 */}
            <div className="proto-field">
              <span className="proto-label">过渡</span>
              <select
                value={t.kind}
                onChange={(e) => patchAt(idx, { transition: { ...t, kind: e.target.value as PrototypeTransition['kind'] } })}
              >
                {TRANSITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} disabled={!o.enabled}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {t.kind !== 'INSTANT' && (
              <>
                <div className="proto-field">
                  <span className="proto-label">时长</span>
                  <NumField
                    className="proto-num"
                    value={t.duration ?? 300}
                    min={0}
                    max={2000}
                    onInput={(v) => patchAt(idx, { transition: { ...t, duration: Math.max(0, v) } })}
                    onCommit={() => {}}
                  />
                  <span className="proto-unit">ms</span>
                </div>
                <div className="proto-field">
                  <span className="proto-label">缓动</span>
                  <select
                    value={t.easing ?? 'EASE_IN_OUT'}
                    onChange={(e) =>
                      patchAt(idx, { transition: { ...t, easing: e.target.value as NonNullable<PrototypeTransition['easing']> } })
                    }
                  >
                    {EASING_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {t.easing === 'CUSTOM' && (
                  <div className="proto-field">
                    <span className="proto-label">贝塞尔</span>
                    <input
                      type="text"
                      value={(t.bezier ?? [0, 0, 1, 1]).join(', ')}
                      onChange={(e) => {
                        const parts = e.target.value
                          .split(',')
                          .map((s) => Number(s.trim()))
                          .filter((n) => !Number.isNaN(n));
                        if (parts.length === 4) {
                          patchAt(idx, { transition: { ...t, bezier: [parts[0], parts[1], parts[2], parts[3]] } });
                        }
                      }}
                    />
                  </div>
                )}
              </>
            )}
            {showDirection && t.kind !== 'INSTANT' && (
              <div className="proto-field">
                <span className="proto-label">方向</span>
                <select
                  value={t.direction ?? 'LEFT'}
                  onChange={(e) =>
                    patchAt(idx, { transition: { ...t, direction: e.target.value as NonNullable<PrototypeTransition['direction']> } })
                  }
                >
                  {DIRECTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Overlay（FR-42） */}
            {it.action === 'OPEN_OVERLAY' && (
              <>
                <div className="proto-field">
                  <span className="proto-label">定位</span>
                  <div className="proto-grid">
                    {OVERLAY_POSITIONS.map((p) => (
                      <button
                        key={p}
                        className={`proto-pos ${(it.overlayPosition ?? 'CENTER') === p ? 'is-active' : ''}`}
                        title={OVERLAY_LABEL[p]}
                        disabled={p === 'PRESET'}
                        onClick={() => patchAt(idx, { overlayPosition: p })}
                      >
                        {OVERLAY_LABEL[p]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="proto-field">
                  <span className="proto-label">点外关闭</span>
                  <input
                    type="checkbox"
                    checked={it.overlayCloseOnOutside ?? true}
                    onChange={(e) => patchAt(idx, { overlayCloseOnOutside: e.target.checked })}
                  />
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* FR-43 Flow 起点 */}
      <div className="prop-section">
        <div className="prop-heading">Flow</div>
        <label className="proto-flow">
          <input
            type="checkbox"
            checked={flowStart}
            onChange={(e) => dispatch({ type: 'SET_FLOW_START', id: e.target.checked ? node.id : null })}
          />
          <span>设为流程起点</span>
        </label>
      </div>
    </div>
  );
}
