import { beforeEach, describe, expect, it } from 'vitest';
import {
  SESSION_KEY,
  SNAPSHOT_INTERVAL,
  SNAPSHOT_KEEP,
  __resetCrashRecoveryForTest,
  beginSession,
  dropOldestSnapshot,
  endSession,
  heartbeat,
  humanAgo,
  installSessionLifecycle,
  listSnapshots,
  readSessionMark,
  readSnapshot,
  reportSaveResult,
  saveHealth,
  shouldSnapshot,
  snapshotKey,
  subscribeSaveHealth,
  writeSnapshot,
} from '../src/editor/crashRecovery';

/* ---------------- 最小浏览器桩 ---------------- */

class FakeStorage {
  private map = new Map<string, string>();
  /** 剩余可写字节；置为 Infinity 表示不限。用于模拟 5MB 配额打满 */
  budget = Infinity;
  getItem(k: string): string | null {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    const prev = this.map.get(k)?.length ?? 0;
    const delta = v.length - prev;
    if (delta > this.budget) throw new Error('QuotaExceededError');
    this.budget -= delta;
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.budget += this.map.get(k)?.length ?? 0;
    this.map.delete(k);
  }
  clear(): void {
    this.map.clear();
    this.budget = Infinity;
  }
  raw(k: string): string | null {
    return this.getItem(k);
  }
}

type Handler = (e: unknown) => void;
class FakeWindow {
  handlers = new Map<string, Handler[]>();
  addEventListener(t: string, fn: Handler): void {
    const l = this.handlers.get(t) ?? [];
    l.push(fn);
    this.handlers.set(t, l);
  }
  removeEventListener(t: string, fn: Handler): void {
    this.handlers.set(
      t,
      (this.handlers.get(t) ?? []).filter((h) => h !== fn),
    );
  }
  fire(t: string, e: unknown = {}): void {
    (this.handlers.get(t) ?? []).forEach((fn) => fn(e));
  }
}

let storage: FakeStorage;
let win: FakeWindow;

beforeEach(() => {
  __resetCrashRecoveryForTest();
  storage = new FakeStorage();
  win = new FakeWindow();
  (globalThis as unknown as Record<string, unknown>).localStorage = storage;
  (globalThis as unknown as Record<string, unknown>).window = win;
});

/* ---------------- 会话标记 ---------------- */

describe('FR-60 第 4 道防线 · 会话标记', () => {
  it('首次启动没有旧标记 → 不算非正常退出', () => {
    const hint = beginSession('甲工程', 1000);
    expect(hint.unclean).toBe(false);
    expect(hint.lastAt).toBeNull();
    // 但本次标记已经写下了
    expect(readSessionMark()).toEqual({ at: 1000, projectName: '甲工程' });
  });

  it('上次标记没被清 → 判定非正常退出，并带回当时的时间与工程名', () => {
    beginSession('甲工程', 1000);
    // 模拟崩溃：不调 endSession，直接再来一次启动
    const hint = beginSession('乙工程', 90_000);
    expect(hint.unclean).toBe(true);
    expect(hint.lastAt).toBe(1000);
    expect(hint.projectName).toBe('甲工程');
    // 新标记覆盖旧标记
    expect(readSessionMark()).toEqual({ at: 90_000, projectName: '乙工程' });
  });

  it('endSession 清掉标记 → 下次启动不再误报', () => {
    beginSession('甲工程', 1000);
    endSession();
    expect(readSessionMark()).toBeNull();
    expect(beginSession('甲工程', 2000).unclean).toBe(false);
  });

  it('heartbeat 只刷新时间，不改变「是否非正常」的判定基准', () => {
    beginSession('甲工程', 1000);
    heartbeat('甲工程', 61_000);
    expect(readSessionMark()).toEqual({ at: 61_000, projectName: '甲工程' });
  });

  it('标记被写坏（非法 JSON / 缺 at）→ 视为无标记，不抛异常', () => {
    storage.setItem(SESSION_KEY, '{不是 JSON');
    expect(readSessionMark()).toBeNull();
    expect(beginSession('甲', 1).unclean).toBe(false);

    storage.setItem(SESSION_KEY, JSON.stringify({ projectName: 'x' }));
    expect(readSessionMark()).toBeNull();
  });

  it('pagehide 清标记、pageshow(persisted) 重新写回（bfcache 往返）', () => {
    beginSession('甲工程', 1000);
    const dispose = installSessionLifecycle(() => '甲工程');
    win.fire('pagehide');
    expect(readSessionMark()).toBeNull();
    // 从 bfcache 回来：页面没重新挂载，标记得自己补回来
    win.fire('pageshow', { persisted: true });
    expect(readSessionMark()?.projectName).toBe('甲工程');
    // 非 bfcache 的 pageshow（首次加载）不该重复写
    endSession();
    win.fire('pageshow', { persisted: false });
    expect(readSessionMark()).toBeNull();
    dispose();
  });
});

describe('FR-60 · humanAgo', () => {
  it('分档输出人话', () => {
    expect(humanAgo(5_000)).toBe('刚刚');
    expect(humanAgo(3 * 60_000)).toBe('3 分钟前');
    expect(humanAgo(2 * 3_600_000)).toBe('2 小时前');
    expect(humanAgo(3 * 86_400_000)).toBe('3 天前');
    expect(humanAgo(Number.NaN)).toBe('未知时间');
  });
});

/* ---------------- 环形快照 ---------------- */

describe('FR-60 · 环形快照', () => {
  it('键名定长补零 → 字典序等于时间序', () => {
    const a = snapshotKey(999);
    const b = snapshotKey(1000);
    expect(a < b).toBe(true);
    expect(a.length).toBe(b.length);
  });

  it('超过保留份数时挤掉最旧的，留最新 N 份', () => {
    for (let i = 0; i < SNAPSHOT_KEEP + 2; i += 1) {
      expect(writeSnapshot(`json-${i}`, '甲', 1000 + i)).toBe(true);
    }
    const list = listSnapshots();
    expect(list.length).toBe(SNAPSHOT_KEEP);
    expect(list[0].at).toBe(1000 + 2);
    expect(list[list.length - 1].at).toBe(1000 + SNAPSHOT_KEEP + 1);
    // 被挤掉的那两份实体也删了，不只是从索引里消失
    expect(readSnapshot(snapshotKey(1000))).toBeNull();
    expect(readSnapshot(snapshotKey(1000 + SNAPSHOT_KEEP + 1))).toBe(`json-${SNAPSHOT_KEEP + 1}`);
  });

  it('配额打满时逐份丢最旧再重试，最终仍写得进去', () => {
    // 先正常存 3 份，占住空间
    for (let i = 0; i < 3; i += 1) writeSnapshot('x'.repeat(100), '甲', 1000 + i);
    // 把剩余预算压到装不下下一份
    storage.budget = 50;
    const ok = writeSnapshot('y'.repeat(100), '甲', 2000);
    expect(ok).toBe(true);
    // 新的一份在，最旧的已被牺牲
    expect(readSnapshot(snapshotKey(2000))).toBe('y'.repeat(100));
    expect(readSnapshot(snapshotKey(1000))).toBeNull();
  });

  it('预算连一份都装不下 → 返回 false，不假装成功', () => {
    storage.budget = 10;
    expect(writeSnapshot('z'.repeat(100), '甲', 2000)).toBe(false);
    expect(listSnapshots()).toEqual([]);
  });

  it('dropOldestSnapshot 每次丢一份，空表返回 false', () => {
    writeSnapshot('a', '甲', 1000);
    writeSnapshot('b', '甲', 2000);
    expect(dropOldestSnapshot()).toBe(true);
    expect(listSnapshots().map((m) => m.at)).toEqual([2000]);
    expect(dropOldestSnapshot()).toBe(true);
    expect(dropOldestSnapshot()).toBe(false);
  });

  it('索引里有、实体没了（被外部裁掉）→ list 不返回它', () => {
    writeSnapshot('a', '甲', 1000);
    storage.removeItem(snapshotKey(1000)); // 只删实体，索引留着
    expect(listSnapshots()).toEqual([]);
  });

  it('快照节奏：首次允许，之后要满间隔', () => {
    expect(shouldSnapshot(10_000)).toBe(true);
    writeSnapshot('a', '甲', 10_000);
    expect(shouldSnapshot(10_000 + SNAPSHOT_INTERVAL - 1)).toBe(false);
    expect(shouldSnapshot(10_000 + SNAPSHOT_INTERVAL)).toBe(true);
  });
});

/* ---------------- 保存健康度 ---------------- */

describe('FR-60 · 保存健康度（写失败可见）', () => {
  it('默认 ok；只在翻转时通知订阅者', () => {
    expect(saveHealth()).toBe('ok');
    const seen: string[] = [];
    subscribeSaveHealth((h) => seen.push(h));

    reportSaveResult(true); // 不翻转
    reportSaveResult(true);
    expect(seen).toEqual([]);

    reportSaveResult(false);
    reportSaveResult(false);
    expect(seen).toEqual(['failed']);
    expect(saveHealth()).toBe('failed');

    reportSaveResult(true);
    expect(seen).toEqual(['failed', 'ok']);
  });
});
