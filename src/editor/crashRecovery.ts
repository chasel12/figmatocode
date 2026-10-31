/**
 * FR-60 第 4 道防线：崩溃后识别与恢复（HANDOFF §16.4）
 *
 * 前三道防线（编辑即落盘 / 页面隐藏落盘 / 关闭前同步落盘）**全都依赖事件被触发**。
 * 进程被杀、断电、蓝屏时浏览器不保证给任何事件 —— 所以这套防线的最后一块
 * 不是「在退出时更努力地保存」，而是**事后识别 + 有东西可往回退**。
 *
 * ## 三件事
 *
 * 1. **会话标记**：启动写 `{at, projectName}`，每次落盘心跳刷新 `at`，正常关闭清除。
 *    下次启动标记还在 → 上次非正常退出；`at` 是心跳时间，所以能算出「X 分钟前」。
 * 2. **环形快照**：每 60s 另存一份，保留最近 5 份。它的用途**不是**「恢复最新」——
 *    最新那份 autosave 本来就在；而是「最新那份被一次坏编辑写坏时还能往回退」。
 * 3. **写失败可见**：`flushSnapshot` 一直返回 boolean 但从来没人消费，配额满时
 *    静默失败，用户以为一直在保存。这里汇总成可订阅的保存健康度。
 *
 * ## 为什么快照也放 localStorage，不放 IndexedDB
 *
 * HANDOFF §16.4 原写「IndexedDB 冷存」，**没做**，理由三条：
 *
 * - 快照和 autosave 写的是**同一份 JSON**。拆成两个存储 = 两条独立失败路径。
 *   恢复链路上多一个「可能失败」的环节，比少存 5 份历史更危险。
 * - 5 × 151 KB = 755 KB，5 MB 配额够用。真正会撑爆配额的是**单个工程本身就很大**，
 *   那种情况下 autosave 自己先撞墙 —— 那是第 3 件事要解决的，换存储解决不了。
 * - IndexedDB 是异步的。这套防线的全部意义是「事件没触发时还剩什么」，
 *   把异步存储塞进这条链路，正是 HANDOFF §16.3 已经踩过一次的坑。
 *
 * 真到了「单个工程 > 800 KB」再换：`SnapshotStore` 已抽成接口（同步签名），
 * 换实现不动调用方，测试也只需注入一个假 store。
 */

/* ------------------------------------------------------------------ */
/* 存储键                                                              */
/* ------------------------------------------------------------------ */

export const SESSION_KEY = 'ui-compiler.session.v1';
export const SNAPSHOT_PREFIX = 'ui-compiler.snapshot.';
/** 快照索引（key 列表）。**不用 localStorage.key(i) 枚举**：桩与部分隐私模式下不可用 */
export const SNAPSHOT_INDEX_KEY = 'ui-compiler.snapshot.index';
/** 保留份数。151 KB × 5 ≈ 755 KB，留足余量 */
export const SNAPSHOT_KEEP = 5;
/** 快照节奏：比 autosave 稀疏得多——它存的是「里程碑」，不是「最新」 */
export const SNAPSHOT_INTERVAL = 60_000;

/* ------------------------------------------------------------------ */
/* 会话标记                                                            */
/* ------------------------------------------------------------------ */

export interface SessionMark {
  /** 最后一次心跳时间（≈ 崩溃前最后一次落盘） */
  at: number;
  projectName: string;
}

export interface RecoveryHint {
  /** 上次是否非正常退出（标记没被清除） */
  unclean: boolean;
  /** 上次心跳时间；无标记时 null */
  lastAt: number | null;
  projectName: string | null;
}

function ls(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function readSessionMark(): SessionMark | null {
  const store = ls();
  if (!store) return null;
  try {
    const raw = store.getItem(SESSION_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as Partial<SessionMark>;
    if (typeof m.at !== 'number') return null;
    return { at: m.at, projectName: String(m.projectName ?? '') };
  } catch {
    return null;
  }
}

function writeSessionMark(mark: SessionMark): boolean {
  const store = ls();
  if (!store) return false;
  try {
    store.setItem(SESSION_KEY, JSON.stringify(mark));
    return true;
  } catch {
    return false;
  }
}

export function clearSessionMark(): void {
  try {
    ls()?.removeItem(SESSION_KEY);
  } catch {
    /* 清标记失败不该影响任何流程 */
  }
}

/**
 * 启动时调用一次：读旧标记 → 判定是否非正常退出 → 写入本次标记。
 *
 * **必须在写入新标记之前读**，否则永远判不出崩溃。
 * 注意：只要读到了旧标记就算「非正常」——正常关闭会走 `endSession` 清掉它。
 */
export function beginSession(projectName: string, now: number = Date.now()): RecoveryHint {
  const prev = readSessionMark();
  writeSessionMark({ at: now, projectName });
  return {
    unclean: prev !== null,
    lastAt: prev?.at ?? null,
    projectName: prev?.projectName ?? null,
  };
}

/** 心跳：刷新 `at`，让下次启动能算出「X 分钟前」而不是「会话开始于 X」 */
export function heartbeat(projectName: string, now: number = Date.now()): void {
  writeSessionMark({ at: now, projectName });
}

/** 正常关闭：清标记。只要这个函数跑到了，下次启动就不会误报崩溃 */
export function endSession(): void {
  clearSessionMark();
}

/**
 * 装「正常离开即清标记」的钩子（Editor 挂载一次）。
 *
 * ## 为什么 `beforeunload` 和 `pagehide` 都要挂
 * 只挂 `pagehide` 时，实测在打包产物里出现过「正常刷新后仍然弹横幅」——
 * 处理器没被调用（`pagehide` 本身确实触发了，另一个同窗监听器收到了）。
 * `beforeunload` 这条路径则被 `npm run fr60` 的第 9 步（脏时刷新触发 beforeunload）
 * 长期锁定，是可靠的。两个都挂，谁先到谁清，重复清无害。
 *
 * ## 那「用户在原生弹窗里点留在页面」怎么办
 * `beforeunload` 在弹窗**之前**触发，用户选「留在页面」时页面并没走，标记却已被清。
 * 这一点靠**心跳自愈**：只要用户继续编辑，下一次落盘就会 `heartbeat` 重新写上标记。
 * 真正危险的是「一次编辑都不做就崩溃」，而那种情况下也没什么新内容可丢。
 *
 * ## 为什么补 `pageshow`
 * 从 bfcache 返回时页面是「活过来」而不是重新挂载，标记已被清掉，需要重新写上，
 * 否则这次会话之后的崩溃又检测不到。`heartbeat` 正好干这件事。
 */
export function installSessionLifecycle(projectName: () => string): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onHide = () => endSession();
  const onShow = (e: Event) => {
    if ((e as PageTransitionEvent).persisted) heartbeat(projectName());
  };
  window.addEventListener('beforeunload', onHide);
  window.addEventListener('pagehide', onHide);
  window.addEventListener('pageshow', onShow);
  return () => {
    window.removeEventListener('beforeunload', onHide);
    window.removeEventListener('pagehide', onHide);
    window.removeEventListener('pageshow', onShow);
  };
}

/** 人话时间差：用于横幅文案 */
export function humanAgo(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '未知时间';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return '刚刚';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  return `${Math.floor(hour / 24)} 天前`;
}

/* ------------------------------------------------------------------ */
/* 环形快照                                                            */
/* ------------------------------------------------------------------ */

export interface SnapshotMeta {
  /** 存储键（含时间戳，定长补零 → 字典序 = 时间序） */
  key: string;
  at: number;
  projectName: string;
  bytes: number;
}

/**
 * 快照存储接口。**同步签名是刻意的**：调用方（autosave 那条链路）不 await 任何东西，
 * 将来换 IndexedDB 必须把接口改成 Promise 并同步调整调用方，而不是偷偷变异步。
 */
export interface SnapshotStore {
  put(meta: SnapshotMeta, json: string): boolean;
  list(): SnapshotMeta[];
  read(key: string): string | null;
  remove(key: string): void;
}

/** 键名：时间戳定长 16 位（到 2286 年都够），保证字典序与时间序一致 */
export function snapshotKey(at: number): string {
  return `${SNAPSHOT_PREFIX}${String(at).padStart(16, '0')}`;
}

function readIndex(store: Storage): SnapshotMeta[] {
  try {
    const raw = store.getItem(SNAPSHOT_INDEX_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is SnapshotMeta => !!x && typeof (x as SnapshotMeta).key === 'string')
      .sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
}

function writeIndex(store: Storage, list: SnapshotMeta[]): void {
  store.setItem(SNAPSHOT_INDEX_KEY, JSON.stringify(list));
}

export function localStorageSnapshotStore(): SnapshotStore {
  return {
    put(meta, json) {
      const store = ls();
      if (!store) return false;
      try {
        store.setItem(meta.key, json);
      } catch {
        return false;
      }
      const list = readIndex(store).filter((m) => m.key !== meta.key);
      list.push(meta);
      list.sort((a, b) => a.at - b.at);
      // 超量先裁再写索引：索引写失败说明配额真的满了，此时快照已落盘，索引下次重建
      while (list.length > SNAPSHOT_KEEP) {
        const dead = list.shift();
        if (dead) {
          try {
            store.removeItem(dead.key);
          } catch {
            /* 删不掉就留在索引外，无害 */
          }
        }
      }
      try {
        writeIndex(store, list);
      } catch {
        /* 索引写不进去不影响已落盘的快照被 list() 之外的路径读到 */
      }
      return true;
    },
    list() {
      const store = ls();
      if (!store) return [];
      // 索引与实体对不上（索引被裁、实体残留）时以索引为准，避免读到半个工程
      return readIndex(store).filter((m) => store.getItem(m.key) !== null);
    },
    read(key) {
      try {
        return ls()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    remove(key) {
      const store = ls();
      if (!store) return;
      try {
        store.removeItem(key);
      } catch {
        /* 实体删不掉时 list() 仍会因读不到而排除它 */
      }
      // 索引同步裁掉这一条：否则幽灵条目会占着 SNAPSHOT_KEEP 的名额，
      // 导致活着的快照被提前挤掉（put 里的裁剪只看条数，不看死活）。
      try {
        writeIndex(
          store,
          readIndex(store).filter((m) => m.key !== key),
        );
      } catch {
        /* 索引写不进去，下次 put 会重写 */
      }
    },
  };
}

let store: SnapshotStore | null = null;

/** 取当前 store（懒建；测试用 `configureSnapshotStore` 换掉） */
export function snapshotStore(): SnapshotStore {
  if (!store) store = localStorageSnapshotStore();
  return store;
}

export function configureSnapshotStore(next: SnapshotStore | null): void {
  store = next;
}

let lastSnapshotAt = 0;

/** 距上次快照是否已过节奏（首个快照不必等，但首帧不该写——那时工程还是空的） */
export function shouldSnapshot(now: number = Date.now()): boolean {
  return lastSnapshotAt === 0 || now - lastSnapshotAt >= SNAPSHOT_INTERVAL;
}

/**
 * 写一份快照。返回是否成功。
 *
 * 配额满时的处置：**先裁最旧的一份再重试**（而不是像 `flushSnapshot` 那样直接丢回滚点）。
 * 快照的语义是「保留最近 N 份」，少一份旧的仍然成立；一份都没有才是失败。
 */
export function writeSnapshot(
  json: string,
  projectName: string,
  now: number = Date.now(),
): boolean {
  const s = snapshotStore();
  const meta: SnapshotMeta = { key: snapshotKey(now), at: now, projectName, bytes: json.length };
  if (s.put(meta, json)) {
    lastSnapshotAt = now;
    return true;
  }
  // 配额满：逐份裁最旧的再试（最多清空）
  let list = s.list();
  while (list.length) {
    const oldest = list[0];
    s.remove(oldest.key);
    if (s.put(meta, json)) {
      lastSnapshotAt = now;
      return true;
    }
    list = s.list();
  }
  return false;
}

export function listSnapshots(): SnapshotMeta[] {
  return snapshotStore().list();
}

export function readSnapshot(key: string): string | null {
  return snapshotStore().read(key);
}

/**
 * 丢一份最旧的快照，返回是否真的丢掉了。
 *
 * 用途：**配额告急时给 autosave 腾地方**。优先级是明确的 ——
 * 「当前工程存不下来」比「5 分钟前的历史快照」严重得多，所以宁可牺牲历史。
 * 调用方（Editor 的落盘 effect）在 `flushSnapshot` 失败后循环调用它并重试。
 */
export function dropOldestSnapshot(): boolean {
  const s = snapshotStore();
  const oldest = s.list()[0];
  if (!oldest) return false;
  s.remove(oldest.key);
  return true;
}

/* ------------------------------------------------------------------ */
/* 保存健康度（写失败可见）                                             */
/* ------------------------------------------------------------------ */

export type SaveHealth = 'ok' | 'failed';

let health: SaveHealth = 'ok';
const healthSubs = new Set<(h: SaveHealth) => void>();

/**
 * 汇报一次落盘结果。**只在状态翻转时通知** —— 每次编辑都报一次 ok 会把订阅者刷爆。
 *
 * 为什么需要这个：`flushSnapshot` 早就返回 boolean 了，但**没有任何调用方看它**。
 * 配额满（比如用户放了个 8 MB 的图）之后每一次自动保存都在静默失败，
 * 界面一切正常，直到关闭浏览器才发现什么都没存下来。
 */
export function reportSaveResult(ok: boolean): void {
  const next: SaveHealth = ok ? 'ok' : 'failed';
  if (next === health) return;
  health = next;
  healthSubs.forEach((fn) => fn(next));
}

export function saveHealth(): SaveHealth {
  return health;
}

export function subscribeSaveHealth(fn: (h: SaveHealth) => void): () => void {
  healthSubs.add(fn);
  return () => {
    healthSubs.delete(fn);
  };
}

/** 仅供测试重置模块级状态 */
export function __resetCrashRecoveryForTest(): void {
  store = null;
  lastSnapshotAt = 0;
  health = 'ok';
  healthSubs.clear();
}
