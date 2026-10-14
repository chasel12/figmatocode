import { useEffect, useState } from 'react';
import { compilePage } from '../compiler';
import { resolveLayout } from '../compiler/layout';
import { createCanvasMeasure } from '../compiler/measure';
import { runPixelDiff, SIMILARITY_TARGET, type DiffResult } from './pixelDiff';
import { useEditor } from './store';

export function DiffModal({ onClose }: { onClose: () => void }) {
  const { state } = useEditor();
  const [result, setResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(true);
  const [view, setView] = useState<'diff' | 'reference' | 'render'>('diff');

  useEffect(() => {
    let cancelled = false;
    setRunning(true);
    setError(null);
    const run = async () => {
      try {
        const compiled = compilePage(state.page);
        const measure = typeof document !== 'undefined' ? createCanvasMeasure() : null;
        if (!measure) throw new Error('需要浏览器环境');
        const geometry = resolveLayout(state.page, measure);
        const res = await runPixelDiff(state.page, compiled, geometry);
        if (!cancelled) setResult(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setRunning(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [state.page]);

  const pct = result ? (result.similarity * 100).toFixed(2) : '—';
  const passed = result?.passed;

  const fmtDelta = (v: number): string => `${v > 0 ? '+' : ''}${Math.round(v * 10) / 10}px`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal diff-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Pixel Diff · reference（设计几何） vs render（编译 CSS）</div>
          <button className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>

        {running && <div className="diff-status">正在渲染并对比像素…</div>}
        {error && <div className="diff-status is-error">失败：{error}</div>}

        {result && (
          <>
            <div className="diff-summary">
              <div className={`diff-score ${passed ? 'is-pass' : 'is-fail'}`}>
                <span className="diff-number">{pct}%</span>
                <span className="diff-label">Pixel Similarity</span>
              </div>
              <div className="diff-meta">
                <div>目标阈值：{(SIMILARITY_TARGET * 100).toFixed(0)}%</div>
                <div>
                  差异像素：{result.diffPixels} / {result.width * result.height}
                </div>
                <div>画布：{result.width} × {result.height}</div>
                <div className={passed ? 'is-pass' : 'is-fail'}>{passed ? 'PASS' : 'NEED FIX'}</div>
              </div>
              <div className="diff-tabs">
                {(['diff', 'reference', 'render'] as const).map((v) => (
                  <button key={v} className={`tab ${view === v ? 'is-active' : ''}`} onClick={() => setView(v)}>
                    {v === 'diff' ? '差异热图' : v === 'reference' ? 'reference' : 'render'}
                  </button>
                ))}
              </div>
            </div>
            <div className="diff-images">
              <img src={result[view === 'diff' ? 'diffUrl' : view === 'reference' ? 'referenceUrl' : 'renderUrl']} alt={view} />
            </div>

            <div className="diff-details">
              <div className="diff-details-title">
                差异明细 · 区域 {result.analysis.regions.length} 个 · 节点定位 {result.analysis.nodeErrors.length} 个
              </div>
              {result.analysis.nodeErrors.length > 0 && (
                <table className="diff-table">
                  <thead>
                    <tr>
                      <th>节点</th>
                      <th>类型</th>
                      <th>分类</th>
                      <th>位置误差</th>
                      <th>尺寸误差</th>
                      <th>差异像素</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.analysis.nodeErrors.map((n) => (
                      <tr key={n.nodeId}>
                        <td>{n.node}</td>
                        <td>{n.type}</td>
                        <td>{n.category}</td>
                        <td>
                          {fmtDelta(n.dx)}, {fmtDelta(n.dy)}
                        </td>
                        <td>
                          {fmtDelta(n.dw)}, {fmtDelta(n.dh)}
                        </td>
                        <td>{n.pixels}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {result.analysis.regions.some((r) => r.node === null) && (
                <table className="diff-table">
                  <thead>
                    <tr>
                      <th>未归属区域</th>
                      <th>分类</th>
                      <th>差异像素</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.analysis.regions
                      .filter((r) => r.node === null)
                      .map((r, i) => (
                        <tr key={`${r.x}-${r.y}-${i}`}>
                          <td>
                            ({r.x}, {r.y}) {r.width}×{r.height}
                          </td>
                          <td>{r.category}</td>
                          <td>{r.pixels}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
