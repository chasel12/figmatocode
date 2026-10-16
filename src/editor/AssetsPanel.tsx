import { useMemo, useState } from 'react';
import { useEditor } from './store';
import { currentVariantProps, variantGroupOf, variantPropertyNames, variantValueNames, variantsInGroup } from './variants';
import type { ComponentDef } from '../schema/types';

/**
 * FR-26 Assets 面板：本地组件列表 + 搜索 + 插入。
 * FR-25 入口：选区→创建组件、选中实例→回写主组件（PUSH_TO_COMPONENT，超出任务书枚举的报备项）。
 */
export function AssetsPanel() {
  const { state, dispatch } = useEditor();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'components' | 'styles'>('components');

  const components = useMemo(() => Object.values(state.components), [state.components]);
  const filtered = useMemo(
    () => (query.trim() ? components.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())) : components),
    [components, query],
  );

  // 当前选中节点：判断是实例（可 push/detach）还是普通节点（可建组件）
  const primaryId = state.selectedIds[state.selectedIds.length - 1] ?? state.page.root.id;
  const findIn = (n: import('../schema/types').UINode): import('../schema/types').UINode | null => {
    if (n.id === primaryId) return n;
    if ('children' in n) {
      for (const c of n.children) {
        const r = findIn(c);
        if (r) return r;
      }
    }
    return null;
  };
  const selected = findIn(state.page.root);
  const isInstance = !!selected?.componentId;
  const isRoot = primaryId === state.page.root.id;

  // 实例数量统计（按 componentId 计数）
  const usageOf = (compId: string): number => {
    let count = 0;
    const walk = (n: import('../schema/types').UINode): void => {
      if (n.componentId === compId) count += 1;
      if ('children' in n) n.children.forEach(walk);
    };
    walk(state.page.root);
    return count;
  };

  return (
    <div className="assets-panel">
      <div className="panel-title">资产</div>

      <div className="assets-tabs">
        <button
          className={`assets-tab ${tab === 'components' ? 'is-active' : ''}`}
          onClick={() => setTab('components')}
        >
          组件 {components.length > 0 && <span className="assets-count">{components.length}</span>}
        </button>
        <button className={`assets-tab ${tab === 'styles' ? 'is-active' : ''}`} onClick={() => setTab('styles')}>
          样式 {state.tokens.length > 0 && <span className="assets-count">{state.tokens.length}</span>}
        </button>
      </div>

      <input
        className="assets-search"
        placeholder="搜索…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {tab === 'components' ? (
        <>
          <div className="assets-actions">
            <button
              className="mini-btn"
              disabled={isRoot}
              title={isRoot ? '选中一个节点以创建组件' : '从选中创建组件'}
              onClick={() => dispatch({ type: 'CREATE_COMPONENT', id: primaryId })}
            >
              ＋ 创建组件
            </button>
            {isInstance && (
              <>
                <button
                  className="mini-btn"
                  title="将当前实例内容回写主组件（所有实例跟随）"
                  onClick={() => dispatch({ type: 'PUSH_TO_COMPONENT', id: primaryId })}
                >
                  ↻ 更新主组件
                </button>
                <button className="mini-btn" title="分离实例" onClick={() => dispatch({ type: 'DETACH_INSTANCE', id: primaryId })}>
                  ⛓ 分离
                </button>
              </>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="assets-empty">{components.length === 0 ? '尚无组件，选中节点后点「创建组件」' : '无匹配结果'}</div>
          ) : (
            <div className="assets-grid">
              {filtered.map((c: ComponentDef) => (
                <div key={c.id} className="assets-card" title={c.name}>
                  <div className="assets-card-icon">◆</div>
                  <div className="assets-card-name">{c.name}</div>
                  <div className="assets-card-meta">×{usageOf(c.id)}</div>
                  <button
                    className="assets-insert"
                    title="插入实例"
                    onClick={() => dispatch({ type: 'INSERT_INSTANCE', componentId: c.id })}
                  >
                    插入
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* FR-29 变体：选中实例所在组 → 属性行 + 组合切换 */}
          {(() => {
            const compId = selected?.componentId;
            if (!compId || !state.components[compId]) return null;
            const group = variantGroupOf(state.components[compId]);
            const members = variantsInGroup(state.components, group);
            const props = variantPropertyNames(members);
            const current = currentVariantProps(state.components, compId);
            return (
              <div className="assets-variant">
                <div className="assets-variant-head">变体 · {group}</div>
                {props.length === 0 ? (
                  <div className="props-note">该组暂无变体属性</div>
                ) : (
                  props.map((p) => (
                    <div key={p} className="assets-variant-row">
                      <span className="assets-variant-label">{p}</span>
                      <select
                        className="assets-variant-select"
                        value={current[p] ?? ''}
                        onChange={(e) =>
                          dispatch({ type: 'SET_VARIANT_PROPS', id: primaryId, props: { ...current, [p]: e.target.value } })
                        }
                      >
                        <option value="">（默认）</option>
                        {variantValueNames(members, p).map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))
                )}
                <div className="assets-actions">
                  <button
                    className="mini-btn"
                    title="以当前实例内容新建一个变体（需先填属性）"
                    onClick={() => {
                      const propName = window.prompt('属性名（如 State）', props[0] ?? 'State');
                      if (!propName) return;
                      const value = window.prompt('属性值（如 hover）', '');
                      if (!value) return;
                      dispatch({ type: 'CREATE_VARIANT', id: primaryId, props: { ...current, [propName]: value } });
                    }}
                  >
                    ＋ 新建变体
                  </button>
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        <>
          <div className="assets-actions">
            <button
              className="mini-btn"
              title="从选中节点的填充创建颜色样式"
              onClick={() =>
                dispatch({
                  type: 'CREATE_TOKEN',
                  kind: 'PAINT',
                  style: { background: selected?.style?.background, fills: selected?.style?.fills },
                  nodeId: isRoot ? undefined : primaryId,
                })
              }
            >
              ＋ 颜色样式
            </button>
            <button
              className="mini-btn"
              title="从选中节点的排版创建文本样式"
              onClick={() =>
                dispatch({
                  type: 'CREATE_TOKEN',
                  kind: 'TEXT',
                  style: {
                    fontFamily: selected?.style?.fontFamily,
                    fontSize: selected?.style?.fontSize,
                    fontWeight: selected?.style?.fontWeight,
                    color: selected?.style?.color,
                    lineHeight: selected?.style?.lineHeight,
                    letterSpacing: selected?.style?.letterSpacing,
                  },
                  nodeId: isRoot ? undefined : primaryId,
                })
              }
            >
              ＋ 文本样式
            </button>
          </div>

          {state.tokens.length === 0 ? (
            <div className="assets-empty">尚无样式</div>
          ) : (
            <div className="assets-token-list">
              {state.tokens
                .filter((t) => (query.trim() ? t.name.toLowerCase().includes(query.trim().toLowerCase()) : true))
                .map((t) => (
                  <div key={t.id} className="assets-token-row" title={t.cssVar}>
                    <span className={`assets-token-kind ${t.kind === 'PAINT' ? 'is-paint' : 'is-text'}`}>
                      {t.kind === 'PAINT' ? '◐' : 'T'}
                    </span>
                    <span className="assets-token-name">{t.name}</span>
                    <button
                      className="mini-btn"
                      title="应用到选中节点"
                      disabled={isRoot}
                      onClick={() => dispatch({ type: 'APPLY_TOKEN', tokenId: t.id, nodeId: primaryId })}
                    >
                      应用
                    </button>
                    <button className="mini-btn" title="删除样式" onClick={() => dispatch({ type: 'DELETE_TOKEN', id: t.id })}>
                      ✕
                    </button>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
