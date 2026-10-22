/**
 * M7 图标资产加载器（W2.5）
 *
 * 1545 个 Lucide 图标的路径数据约 290KB —— 刻意用**动态 import**，
 * 只有用户打开图标面板时才拉取，主包零增量（plan §9「图标批量入包致工程文件膨胀」的缓解项）。
 */
import type { IconEntry } from './lucide';

export interface IconLibrary {
  version: string;
  license: string;
  icons: Record<string, IconEntry>;
}

let cache: IconLibrary | null = null;
let pending: Promise<IconLibrary> | null = null;

export function iconsLoaded(): boolean {
  return cache != null;
}

/** 同步读取（未加载时返回 null）——供渲染路径使用，避免 await 扩散 */
export function peekIcons(): Record<string, IconEntry> | null {
  return cache?.icons ?? null;
}

export async function loadIcons(): Promise<IconLibrary> {
  if (cache) return cache;
  if (!pending) {
    pending = import('./lucide').then((mod) => {
      cache = { version: mod.LUCIDE_VERSION, license: mod.LUCIDE_LICENSE, icons: mod.LUCIDE_ICONS };
      return cache;
    });
  }
  return pending;
}

/** 搜索：精确 > 名称前缀 > 名称包含 > 标签包含（同级保持字典序），空查询返回前 limit 个 */
export function searchIcons(library: IconLibrary, query: string, limit = 60): { name: string; entry: IconEntry }[] {
  const q = query.trim().toLowerCase();
  const all = Object.entries(library.icons);
  if (!q) return all.slice(0, limit).map(([name, entry]) => ({ name, entry }));

  const scored: { name: string; entry: IconEntry; rank: number }[] = [];
  for (const [name, entry] of all) {
    let rank = -1;
    if (name === q) rank = 0;
    else if (name.startsWith(q)) rank = 1;
    else if (name.includes(q)) rank = 2;
    else if (entry.t.includes(q)) rank = 3;
    if (rank >= 0) scored.push({ name, entry, rank });
  }
  scored.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  return scored.slice(0, limit).map(({ name, entry }) => ({ name, entry }));
}
