import { describe, expect, it } from 'vitest';
import { SHORTCUT_TABLE, TOOL_KEYS } from '../src/editor/shortcuts';
import { TOOLS } from '../src/editor/Toolbar';

describe('FR-9 快捷键布局表（数据结构驱动）', () => {
  it('每条含非空 group/keys/desc', () => {
    expect(SHORTCUT_TABLE.length).toBeGreaterThanOrEqual(25);
    for (const e of SHORTCUT_TABLE) {
      expect(e.group.trim().length).toBeGreaterThan(0);
      expect(e.keys.trim().length).toBeGreaterThan(0);
      expect(e.desc.trim().length).toBeGreaterThan(0);
    }
  });

  it('必备分组齐全：工具/文件/编辑/移动/视图', () => {
    const groups = new Set(SHORTCUT_TABLE.map((e) => e.group));
    for (const g of ['工具', '文件', '编辑', '移动', '视图']) expect(groups.has(g)).toBe(true);
  });

  it('工具字母与工具轨 TOOLS 对应（FR-14/16 增 Section/Slice/多边形/星形——Figma 同无字母键，其余 9 键须在表）', () => {
    expect(TOOLS).toHaveLength(13);
    const keys = new Set(SHORTCUT_TABLE.map((e) => e.keys));
    const keyed = TOOLS.filter((t) => TOOL_KEYS[t.id]);
    for (const t of keyed) {
      const k = TOOL_KEYS[t.id];
      expect(keys.has(k), `表中缺工具键 ${k}`).toBe(true);
    }
    expect(keyed).toHaveLength(9);
  });

  it('核心键在表中：Ctrl+Shift+? 面板键 / Tab 导航 / Shift+方向键', () => {
    const all = SHORTCUT_TABLE.map((e) => e.keys).join(' | ');
    expect(all).toContain('Ctrl+Shift+?');
    expect(all).toContain('Tab / Shift+Tab');
    expect(all).toContain('Shift+方向键');
  });
});
