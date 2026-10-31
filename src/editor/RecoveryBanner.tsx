import { useEffect, useState } from 'react';
import { humanAgo, listSnapshots, readSnapshot, type SnapshotMeta } from './crashRecovery';

/**
 * 崩溃恢复横幅（FR-60 第 4 道防线）
 *
 * ## 为什么是横幅而不是弹窗
 * 恢复本身**已经自动完成了**（`loadAutosave()` 在挂载时就读了 localStorage 里那份），
 * 弹窗会逼用户为一件已经做好的事点一次按钮。横幅只承担两件事：
 * ① **告知**「上次没正常关闭」，让用户对内容的新鲜度有预期；
 * ② **提供退路**——最新那份被一次坏编辑写坏时，能往回翻历史快照。
 *
 * ## 为什么默认折叠
 * 99% 的情况下用户只想继续干活。展开历史快照是个低频动作，不该占主视野。
 */
export function RecoveryBanner({
  lastAt,
  projectName,
  currentProjectName,
  onRestore,
  onDismiss,
}: {
  /** 上次心跳时间（≈ 崩溃前最后一次落盘） */
  lastAt: number;
  /** 上次会话里的项目名（用于判断「恢复的是不是另一个工程」） */
  projectName: string | null;
  /** 当前恢复出来的工程名 */
  currentProjectName: string;
  /** 用户选了一份更早的快照：交给 Editor 走 LOAD_PROJECT。返回错误文案（null = 成功） */
  onRestore: (json: string) => string | null;
  onDismiss: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SnapshotMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 快照列表只在展开时读：列表读取要扫索引 + 逐条验实体存在，没必要在挂载时做
  useEffect(() => {
    if (!open) return;
    setItems(listSnapshots().filter((m) => m.at < lastAt));
  }, [open, lastAt]);

  const ago = humanAgo(Date.now() - lastAt);
  const sameProject = !projectName || !currentProjectName || projectName === currentProjectName;

  return (
    <div className="recovery-banner" role="status">
      <div className="recovery-main">
        <span className="recovery-icon" aria-hidden="true">
          ⟳
        </span>
        <span className="recovery-text">
          检测到上次未正常关闭（<b>{ago}</b>），已恢复到最近一次自动保存
          {sameProject ? '' : `（当时的工程是「${projectName}」，与当前「${currentProjectName}」不同）`}。
        </span>
        <div className="recovery-actions">
          <button type="button" className="btn btn-sm" onClick={() => setOpen((v) => !v)}>
            {open ? '收起历史快照' : '更早的快照 ▾'}
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={onDismiss}>
            知道了
          </button>
        </div>
      </div>

      {open && (
        <div className="recovery-snapshots">
          {error && <div className="recovery-error">{error}</div>}
          {items.length === 0 ? (
            <div className="recovery-empty">
              没有更早的快照（历史快照每 60 秒存一份、最多 5 份；本次会话还没攒够）。
            </div>
          ) : (
            items
              .slice()
              .reverse()
              .map((m) => (
                <button
                  type="button"
                  key={m.key}
                  className="recovery-snapshot-row"
                  onClick={() => {
                    const json = readSnapshot(m.key);
                    if (!json) {
                      // 索引里有、实体读不出来（被裁或半写）：说清楚，不假装成功
                      setError('这份快照已不可读（可能被配额裁剪过），换一份试试。');
                      return;
                    }
                    const err = onRestore(json);
                    if (err) setError(err);
                  }}
                >
                  <span className="recovery-snapshot-when">{humanAgo(Date.now() - m.at)}</span>
                  <span className="recovery-snapshot-meta">
                    {m.projectName || '未命名项目'} · {(m.bytes / 1024).toFixed(0)} KB
                  </span>
                  <span className="recovery-snapshot-go">恢复</span>
                </button>
              ))
          )}
          <div className="recovery-foot">
            恢复历史快照会<b>替换当前画布且不可撤销</b>（换工程会清空撤销栈）。不确定就先在本地保存一份 JSON。
          </div>
        </div>
      )}
    </div>
  );
}
