import { describe, expect, it } from 'vitest';
import { LUCIDE_ICONS, LUCIDE_LICENSE, LUCIDE_VERSION, LUCIDE_VIEWBOX } from '../src/assets/icons/lucide';
import { searchIcons } from '../src/assets/icons';
import { getPack, isPackColor, packTokens } from '../src/tokens/packs';
import { FONT_FILES, fontFaceCss } from '../src/font';

describe('M7 W2.5 图标资产（lucide-static → VECTOR 路径）', () => {
  const names = Object.keys(LUCIDE_ICONS);

  it('全量导入（≥1500）且许可证为 ISC', () => {
    expect(names.length).toBeGreaterThanOrEqual(1500);
    expect(LUCIDE_LICENSE).toBe('ISC');
    expect(LUCIDE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(LUCIDE_VIEWBOX).toBe(24);
  });

  it('每条路径都是合法的绝对起始路径（M 开头）且无残留 var()', () => {
    let bad = 0;
    for (const [name, entry] of Object.entries(LUCIDE_ICONS)) {
      if (!/^[Mm]/.test(entry.d) || /var\(/.test(entry.d)) bad += 1;
      if (bad > 0) throw new Error(`图标 ${name} 路径异常：${entry.d.slice(0, 60)}`);
    }
    expect(bad).toBe(0);
  });

  it('多子路径图标已合并（house = 2 段 M）', () => {
    const house = LUCIDE_ICONS.house;
    expect(house).toBeTruthy();
    expect(house.d.match(/[Mm]/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('搜索：名称前缀优先，标签可命中，空查询给前 N 个', () => {
    const lib = { version: LUCIDE_VERSION, license: LUCIDE_LICENSE, icons: LUCIDE_ICONS };
    expect(searchIcons(lib, 'house', 10)[0].name).toBe('house');
    expect(searchIcons(lib, 'shopping', 10).some((r) => r.name.includes('shopping'))).toBe(true);
    expect(searchIcons(lib, '', 12)).toHaveLength(12);
    expect(searchIcons(lib, 'zzzz-no-such-icon', 10)).toHaveLength(0);
  });
});

describe('M7 W2.5 风格包 → 样式资产', () => {
  it('packTokens：每个语义色一条 PAINT，每个字号阶一条 TEXT', () => {
    for (const id of ['shadcn', 'openprops', 'daisy-dark']) {
      const pack = getPack(id);
      const tokens = packTokens(pack);
      const paints = tokens.filter((t) => t.kind === 'PAINT');
      const texts = tokens.filter((t) => t.kind === 'TEXT');
      expect(paints).toHaveLength(Object.keys(pack.colors).length);
      expect(texts).toHaveLength(pack.fontSizes.length);
      expect(paints[0].style.background).toMatch(/^#[0-9a-f]{6}$/);
      expect(paints[0].cssVar).toContain('--ai-');
      expect(texts[0].style.fontFamily).toContain('Inter');
    }
  });

  it('isPackColor：包内色通过、包外色拒绝', () => {
    const pack = getPack('shadcn');
    expect(isPackColor(pack, pack.colors.primary)).toBe(true);
    expect(isPackColor(pack, pack.colors.primary.toUpperCase())).toBe(true);
    expect(isPackColor(pack, '#123456')).toBe(false);
    expect(isPackColor(pack, undefined)).toBe(true);
  });

  it('暗色包与亮色包底/字对比方向正确（不出现同色叠同色）', () => {
    const dark = getPack('daisy-dark');
    const light = getPack('shadcn');
    expect(dark.mode).toBe('dark');
    expect(light.mode).toBe('light');
    expect(dark.colors.background).not.toBe(dark.colors.foreground);
    expect(light.colors.background).not.toBe(light.colors.foreground);
  });
});

describe('M7 W2.5 字体分发（FR-48 口径延续）', () => {
  it('Space Grotesk 随字体清单分发（ZIP 不掉字）', () => {
    expect(FONT_FILES).toContain('space-grotesk-latin-wght-normal.woff2');
    expect(FONT_FILES).toContain('space-grotesk-latin-ext-wght-normal.woff2');
  });

  it('@font-face 覆盖两个字体族且都指向本地 fonts/', () => {
    const css = fontFaceCss('/fonts');
    expect(css).toContain("font-family:'Inter'");
    expect(css).toContain("font-family:'Space Grotesk'");
    expect(css).toContain("url('/fonts/space-grotesk-latin-wght-normal.woff2')");
  });
});
