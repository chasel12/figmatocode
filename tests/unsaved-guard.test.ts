import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPage } from '../src/schema/factory';
import { initialState } from '../src/editor/store';
import {
  AUTOSAVE_KEY,
  AUTOSAVE_PREV_KEY,
  __resetGuardForTest,
  autosaveEnvelope,
  consumeCleanRequest,
  flushNow,
  flushSnapshot,
  guard,
  installLifecycleGuard,
  isDirty,
  markSaved,
  readRollback,
  recomputeDirty,
  registerRevalidator,
  registerSnapshotSource,
  requestCleanOnNextChange,
  resolvePending,
  subscribeDirty,
  subscribePending,
} from '../src/editor/unsaved';

/* ---------------- 最小浏览器桩 ---------------- */

class FakeStorage {
  private map = new Map<string, string>();
  /** 置为 true 时下一次 setItem 抛配额错误（模拟 5MB 打满） */
  failNext = false;
  getItem(k: string): string | null {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('QuotaExceededError');
    }
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  clear(): void {
    this.map.clear();
  }
}

type Handler = (e: unknown) => void;

class FakeTarget {
  handlers = new Map<string, Handler[]>();
  addEventListener(type: string, fn: Handler): void {
    const list = this.handlers.get(type) ?? [];
    list.push(fn);
    this.handlers.set(type, list);
  }
  removeEventListener(type: string, fn: Handler): void {
    const list = (this.handlers.get(type) ?? []).filter((h) => h !== fn);
    this.handlers.set(type, list);
  }
  fire(type: string, e: unknown = {}): void {
    (this.handlers.get(type) ?? []).forEach((fn) => fn(e));
  }
  count(type: string): number {
    return (this.handlers.get(type) ?? []).length;
  }
}

let storage: FakeStorage;
let win: FakeTarget;
let doc: FakeTarget & { visibilityState: string };

beforeEach(() => {
  __resetGuardForTest();
  storage = new FakeStorage();
  win = new FakeTarget();
  doc = Object.assign(new FakeTarget(), { visibilityState: 'visible' });
  (globalThis as unknown as Record<string, unknown>).localStorage = storage;
  (globalThis as unknown as Record<string, unknown>).window = win;
  (globalThis as unknown as Record<string, unknown>).document = doc;
});

/** 造两个「不同内容」的状态：改项目名即可，无需构造节点 */
function stateNamed(name: string) {
  return initialState(createPage('P'), name);
}

describe('FR-60 未保存守卫 · 脏标记', () => {
  it('首帧无基准时视为干净（空项目没有可丢的东西）', () => {
    recomputeDirty(autosaveEnvelope(stateNamed('A')));
    expect(isDirty()).toBe(false);
  });

  it('内容变化 → 脏；markSaved 后回干净', () => {
    const a = stateNamed('A');
    recomputeDirty(autosaveEnvelope(a));
    expect(isDirty()).toBe(false);

    recomputeDirty(autosaveEnvelope(stateNamed('B')));
    expect(isDirty()).toBe(true);

    markSaved(autosaveEnvelope(stateNamed('B')));
    expect(isDirty()).toBe(false);
  });

  it('撤销回到保存点 → 干净（逐字节比对，不靠 undo 栈长度）', () => {
    const saved = stateNamed('A');
    markSaved(autosaveEnvelope(saved));
    recomputeDirty(autosaveEnvelope(stateNamed('A改'))); // 编辑
    expect(isDirty()).toBe(true);
    recomputeDirty(autosaveEnvelope(stateNamed('A'))); // 撤销回原状
    expect(isDirty()).toBe(false);
  });

  it('脏状态变化会通知订阅者，且不重复通知', () => {
    const seen: boolean[] = [];
    subscribeDirty((d) => seen.push(d));
    markSaved(autosaveEnvelope(stateNamed('A')));
    recomputeDirty(autosaveEnvelope(stateNamed('B')));
    recomputeDirty(autosaveEnvelope(stateNamed('C'))); // 仍然脏 → 不重复通知
    expect(seen).toEqual([true]);
  });

  it('isDirty() 会先跑 revalidator，避免 effect 滞后一帧', () => {
    markSaved(autosaveEnvelope(stateNamed('A')));
    const latest = stateNamed('B');
    registerRevalidator(() => recomputeDirty(autosaveEnvelope(latest)));
    expect(isDirty()).toBe(true);
  });

  it('requestCleanOnNextChange 是一次性的', () => {
    requestCleanOnNextChange();
    expect(consumeCleanRequest()).toBe(true);
    expect(consumeCleanRequest()).toBe(false);
  });
});

describe('FR-60 未保存守卫 · 落盘', () => {
  it('flushSnapshot 写主键', () => {
    expect(flushSnapshot('{"a":1}')).toBe(true);
    expect(storage.getItem(AUTOSAVE_KEY)).toBe('{"a":1}');
  });

  it('配额不足时先丢回滚点再重试（回滚点白占配额）', () => {
    storage.setItem(AUTOSAVE_PREV_KEY, 'old');
    storage.failNext = true;
    expect(flushSnapshot('{"a":2}')).toBe(true);
    expect(storage.getItem(AUTOSAVE_KEY)).toBe('{"a":2}');
    expect(storage.getItem(AUTOSAVE_PREV_KEY)).toBeNull();
  });

  it('两次都失败 → 返回 false，不抛', () => {
    const orig = storage.setItem.bind(storage);
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(flushSnapshot('x')).toBe(false);
    storage.setItem = orig;
  });

  it('flushNow 走注册的取数器（生命周期事件里用的就是它）', () => {
    registerSnapshotSource(() => '{"from":"state"}');
    expect(flushNow()).toBe(true);
    expect(storage.getItem(AUTOSAVE_KEY)).toBe('{"from":"state"}');
  });

  it('无取数器时 flushNow 返回 false 而不是抛', () => {
    expect(flushNow()).toBe(false);
  });
});

describe('FR-60 未保存守卫 · 三按钮意图', () => {
  it('干净时直接执行，不挂起', () => {
    const run = vi.fn();
    const pendingSeen: unknown[] = [];
    subscribePending((p) => pendingSeen.push(p));
    markSaved(autosaveEnvelope(stateNamed('A')));
    guard('新建页面', run);
    expect(run).toHaveBeenCalledTimes(1);
    expect(pendingSeen).toEqual([]);
  });

  it('脏时挂起，选「取消」不执行', () => {
    const run = vi.fn();
    markSaved(autosaveEnvelope(stateNamed('A')));
    recomputeDirty(autosaveEnvelope(stateNamed('B')));
    guard('打开文件', run);
    expect(run).not.toHaveBeenCalled();
    resolvePending('cancel');
    expect(run).not.toHaveBeenCalled();
  });

  it('脏时选「不保存」→ 执行 + 留下回滚点', () => {
    const run = vi.fn();
    markSaved(autosaveEnvelope(stateNamed('A')));
    recomputeDirty(autosaveEnvelope(stateNamed('B')));
    registerSnapshotSource(() => '{"current":1}');
    guard('打开文件', run);
    resolvePending('discard');
    expect(run).toHaveBeenCalledTimes(1);
    expect(readRollback()).toBe('{"current":1}');
  });

  it('脏时选「保存」→ 执行但不写回滚点（已落过盘）', () => {
    const run = vi.fn();
    markSaved(autosaveEnvelope(stateNamed('A')));
    recomputeDirty(autosaveEnvelope(stateNamed('B')));
    registerSnapshotSource(() => '{"current":1}');
    guard('新建页面', run);
    resolvePending('save');
    expect(run).toHaveBeenCalledTimes(1);
    expect(readRollback()).toBeNull();
  });
});

describe('FR-60 未保存守卫 · 生命周期钩子', () => {
  it('脏 → beforeunload 先同步落盘，再 preventDefault 弹原生确认', () => {
    registerSnapshotSource(() => '{"dirty":true}');
    markSaved(autosaveEnvelope(stateNamed('A')));
    recomputeDirty(autosaveEnvelope(stateNamed('B')));
    const dispose = installLifecycleGuard();

    const e = { preventDefault: vi.fn(), returnValue: '' };
    win.fire('beforeunload', e);

    expect(e.preventDefault).toHaveBeenCalledTimes(1);
    // 关键：即使用户在原生弹窗里选「离开」，数据也已经落盘了
    expect(storage.getItem(AUTOSAVE_KEY)).toBe('{"dirty":true}');
    dispose();
  });

  it('干净 → beforeunload 不打扰', () => {
    registerSnapshotSource(() => '{"x":1}');
    markSaved(autosaveEnvelope(stateNamed('A')));
    const dispose = installLifecycleGuard();
    const e = { preventDefault: vi.fn(), returnValue: '' };
    win.fire('beforeunload', e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    dispose();
  });

  it('pagehide / 页面隐藏时落盘但不弹窗（强制关闭场景真正起作用的那道）', () => {
    registerSnapshotSource(() => '{"hidden":1}');
    markSaved(autosaveEnvelope(stateNamed('A')));
    recomputeDirty(autosaveEnvelope(stateNamed('B')));
    const dispose = installLifecycleGuard();

    win.fire('pagehide');
    expect(storage.getItem(AUTOSAVE_KEY)).toBe('{"hidden":1}');

    storage.removeItem(AUTOSAVE_KEY);
    doc.visibilityState = 'hidden';
    doc.fire('visibilitychange');
    expect(storage.getItem(AUTOSAVE_KEY)).toBe('{"hidden":1}');
    dispose();
  });

  it('dispose 后钩子全部摘掉', () => {
    const dispose = installLifecycleGuard();
    expect(win.count('beforeunload')).toBe(1);
    dispose();
    expect(win.count('beforeunload')).toBe(0);
    expect(win.count('pagehide')).toBe(0);
    expect(doc.count('visibilitychange')).toBe(0);
  });
});
